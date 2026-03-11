/**
 * Zero Trust Gateway — Continuous verification and policy enforcement for every request.
 *
 * Every principal is continuously evaluated. Access is never implicitly granted —
 * every request verifies trust score, level, and required attributes against policy.
 *
 * "In The Dye House, no thread is trusted by default."
 *
 * Fabric: dye-house
 * Thread tier: 1
 */

// ─── Port Interfaces ─────────────────────────────────────────────────────────

interface ZeroTrustClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface ZeroTrustIdGenPort {
  readonly next: () => string;
}

interface ZeroTrustLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type PrincipalId = string;
export type PolicyId = string;
export type VerificationId = string;

export type ZeroTrustError =
  | 'principal-not-found'
  | 'policy-not-found'
  | 'already-registered'
  | 'invalid-trust-score'
  | 'access-denied';

export type TrustLevel = 'UNTRUSTED' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERIFIED';

export interface TrustPolicy {
  readonly policyId: PolicyId;
  readonly name: string;
  readonly requiredTrustLevel: TrustLevel;
  readonly requiredAttributes: ReadonlyArray<string>;
  readonly active: boolean;
}

export interface PrincipalContext {
  readonly principalId: PrincipalId;
  trustScore: number;
  trustLevel: TrustLevel;
  attributes: ReadonlyArray<string>;
  lastVerifiedAt: bigint | null;
}

export interface VerificationResult {
  readonly verificationId: VerificationId;
  readonly principalId: PrincipalId;
  readonly policyId: PolicyId | null;
  readonly granted: boolean;
  readonly trustLevel: TrustLevel;
  readonly reason: string;
  readonly verifiedAt: bigint;
}

// ─── System Interface ─────────────────────────────────────────────────────────

export interface ZeroTrustGatewaySystem {
  registerPrincipal(
    principalId: PrincipalId,
    initialAttributes?: ReadonlyArray<string>,
  ): { success: true } | { success: false; error: ZeroTrustError };
  updateTrustScore(
    principalId: PrincipalId,
    score: number,
  ): { success: true } | { success: false; error: ZeroTrustError };
  addAttribute(
    principalId: PrincipalId,
    attribute: string,
  ): { success: true } | { success: false; error: ZeroTrustError };
  createPolicy(
    name: string,
    requiredTrustLevel: TrustLevel,
    requiredAttributes: ReadonlyArray<string>,
  ): TrustPolicy | ZeroTrustError;
  verifyAccess(principalId: PrincipalId, policyId: PolicyId | null): VerificationResult;
  getPrincipal(principalId: PrincipalId): PrincipalContext | undefined;
  getPolicy(policyId: PolicyId): TrustPolicy | undefined;
  getVerificationHistory(
    principalId: PrincipalId,
    limit: number,
  ): ReadonlyArray<VerificationResult>;
}

// ─── Deps ────────────────────────────────────────────────────────────────────

export interface ZeroTrustGatewayDeps {
  readonly clock: ZeroTrustClockPort;
  readonly idGen: ZeroTrustIdGenPort;
  readonly logger: ZeroTrustLoggerPort;
}

// ─── State ───────────────────────────────────────────────────────────────────

interface GatewayState {
  readonly principals: Map<PrincipalId, PrincipalContext>;
  readonly policies: Map<PolicyId, TrustPolicy>;
  readonly verificationHistory: Map<PrincipalId, VerificationResult[]>;
  readonly deps: ZeroTrustGatewayDeps;
}

// ─── Trust Level Helpers ──────────────────────────────────────────────────────

const TRUST_LEVEL_ORDER: ReadonlyArray<TrustLevel> = [
  'UNTRUSTED',
  'LOW',
  'MEDIUM',
  'HIGH',
  'VERIFIED',
];

function scoreToTrustLevel(score: number): TrustLevel {
  if (score <= 20) return 'UNTRUSTED';
  if (score <= 40) return 'LOW';
  if (score <= 60) return 'MEDIUM';
  if (score <= 80) return 'HIGH';
  return 'VERIFIED';
}

function trustLevelIndex(level: TrustLevel): number {
  return TRUST_LEVEL_ORDER.indexOf(level);
}

function trustLevelAtLeast(actual: TrustLevel, required: TrustLevel): boolean {
  return trustLevelIndex(actual) >= trustLevelIndex(required);
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createZeroTrustGatewaySystem(deps: ZeroTrustGatewayDeps): ZeroTrustGatewaySystem {
  const state: GatewayState = {
    principals: new Map(),
    policies: new Map(),
    verificationHistory: new Map(),
    deps,
  };

  return {
    registerPrincipal: (principalId, initialAttributes) =>
      registerPrincipalImpl(state, principalId, initialAttributes ?? []),
    updateTrustScore: (principalId, score) => updateTrustScoreImpl(state, principalId, score),
    addAttribute: (principalId, attribute) => addAttributeImpl(state, principalId, attribute),
    createPolicy: (name, requiredTrustLevel, requiredAttributes) =>
      createPolicyImpl(state, name, requiredTrustLevel, requiredAttributes),
    verifyAccess: (principalId, policyId) => verifyAccessImpl(state, principalId, policyId),
    getPrincipal: (principalId) => state.principals.get(principalId),
    getPolicy: (policyId) => state.policies.get(policyId),
    getVerificationHistory: (principalId, limit) =>
      getVerificationHistoryImpl(state, principalId, limit),
  };
}

// ─── Register Principal ───────────────────────────────────────────────────────

function registerPrincipalImpl(
  state: GatewayState,
  principalId: PrincipalId,
  initialAttributes: ReadonlyArray<string>,
): { success: true } | { success: false; error: ZeroTrustError } {
  if (state.principals.has(principalId)) {
    return { success: false, error: 'already-registered' };
  }

  const principal: PrincipalContext = {
    principalId,
    trustScore: 0,
    trustLevel: 'UNTRUSTED',
    attributes: initialAttributes,
    lastVerifiedAt: null,
  };

  state.principals.set(principalId, principal);
  state.deps.logger.info('principal-registered', { principalId });
  return { success: true };
}

// ─── Update Trust Score ───────────────────────────────────────────────────────

function updateTrustScoreImpl(
  state: GatewayState,
  principalId: PrincipalId,
  score: number,
): { success: true } | { success: false; error: ZeroTrustError } {
  if (score < 0 || score > 100) return { success: false, error: 'invalid-trust-score' };

  const principal = state.principals.get(principalId);
  if (principal === undefined) return { success: false, error: 'principal-not-found' };

  principal.trustScore = score;
  principal.trustLevel = scoreToTrustLevel(score);
  state.deps.logger.info('trust-score-updated', {
    principalId,
    score,
    level: principal.trustLevel,
  });
  return { success: true };
}

// ─── Add Attribute ────────────────────────────────────────────────────────────

function addAttributeImpl(
  state: GatewayState,
  principalId: PrincipalId,
  attribute: string,
): { success: true } | { success: false; error: ZeroTrustError } {
  const principal = state.principals.get(principalId);
  if (principal === undefined) return { success: false, error: 'principal-not-found' };

  if (!principal.attributes.includes(attribute)) {
    principal.attributes = [...principal.attributes, attribute];
  }

  return { success: true };
}

// ─── Create Policy ────────────────────────────────────────────────────────────

function createPolicyImpl(
  state: GatewayState,
  name: string,
  requiredTrustLevel: TrustLevel,
  requiredAttributes: ReadonlyArray<string>,
): TrustPolicy | ZeroTrustError {
  const policyId = state.deps.idGen.next();
  const policy: TrustPolicy = {
    policyId,
    name,
    requiredTrustLevel,
    requiredAttributes,
    active: true,
  };

  state.policies.set(policyId, policy);
  state.deps.logger.info('policy-created', { policyId, name, requiredTrustLevel });
  return policy;
}

// ─── Verify Access ────────────────────────────────────────────────────────────

function verifyAccessImpl(
  state: GatewayState,
  principalId: PrincipalId,
  policyId: PolicyId | null,
): VerificationResult {
  const now = state.deps.clock.nowMicroseconds();
  const verificationId = state.deps.idGen.next();

  const principal = state.principals.get(principalId);
  if (principal === undefined) {
    return buildResult(
      verificationId,
      principalId,
      policyId,
      false,
      'UNTRUSTED',
      'principal-not-found',
      now,
    );
  }

  principal.lastVerifiedAt = now;

  if (policyId === null) {
    return verifyWithoutPolicy(verificationId, principalId, principal, now);
  }

  return verifyWithPolicy(state, verificationId, principalId, principal, policyId, now);
}

function verifyWithoutPolicy(
  verificationId: VerificationId,
  principalId: PrincipalId,
  principal: PrincipalContext,
  now: bigint,
): VerificationResult {
  const granted = principal.trustLevel !== 'UNTRUSTED';
  const reason = granted ? 'trust-level-sufficient' : 'access-denied-untrusted';
  return buildResult(verificationId, principalId, null, granted, principal.trustLevel, reason, now);
}

function verifyWithPolicy(
  state: GatewayState,
  verificationId: VerificationId,
  principalId: PrincipalId,
  principal: PrincipalContext,
  policyId: PolicyId,
  now: bigint,
): VerificationResult {
  const policy = state.policies.get(policyId);
  if (policy === undefined) {
    return buildResult(
      verificationId,
      principalId,
      policyId,
      false,
      principal.trustLevel,
      'policy-not-found',
      now,
    );
  }

  const { granted, reason } = evaluatePolicy(principal, policy);
  const result = buildResult(
    verificationId,
    principalId,
    policyId,
    granted,
    principal.trustLevel,
    reason,
    now,
  );
  recordVerification(state, principalId, result);
  return result;
}

function evaluatePolicy(
  principal: PrincipalContext,
  policy: TrustPolicy,
): { granted: boolean; reason: string } {
  if (!trustLevelAtLeast(principal.trustLevel, policy.requiredTrustLevel)) {
    return { granted: false, reason: 'insufficient-trust-level' };
  }

  const missingAttr = policy.requiredAttributes.find(
    (attr) => !principal.attributes.includes(attr),
  );
  if (missingAttr !== undefined) {
    return { granted: false, reason: 'missing-attribute:' + missingAttr };
  }

  return { granted: true, reason: 'policy-satisfied' };
}

function buildResult(
  verificationId: VerificationId,
  principalId: PrincipalId,
  policyId: PolicyId | null,
  granted: boolean,
  trustLevel: TrustLevel,
  reason: string,
  verifiedAt: bigint,
): VerificationResult {
  return { verificationId, principalId, policyId, granted, trustLevel, reason, verifiedAt };
}

function recordVerification(
  state: GatewayState,
  principalId: PrincipalId,
  result: VerificationResult,
): void {
  let history = state.verificationHistory.get(principalId);
  if (history === undefined) {
    history = [];
    state.verificationHistory.set(principalId, history);
  }
  history.push(result);
}

// ─── Verification History ─────────────────────────────────────────────────────

function getVerificationHistoryImpl(
  state: GatewayState,
  principalId: PrincipalId,
  limit: number,
): ReadonlyArray<VerificationResult> {
  const history = state.verificationHistory.get(principalId) ?? [];
  return history.slice(-limit);
}
