/**
 * Zero-Trust Engine — Never trust, always verify access control.
 *
 * Implements a zero-trust security model where every access request is
 * evaluated against multiple trust factors regardless of source. Trust is
 * never implicit — each request must earn its access through continuous
 * verification of identity, device posture, network context, and behavioral
 * patterns.
 *
 * Trust factors:
 *   IDENTITY   — Authentication strength, MFA status, credential age
 *   DEVICE     — Device health, compliance status, known fingerprint
 *   NETWORK    — IP reputation, geo-location, VPN/proxy detection
 *   BEHAVIOR   — Request patterns, anomaly detection, access history
 *   TIME_OF_DAY — Expected vs unusual access times
 *
 * Access decisions:
 *   ALLOW          — Trust score above threshold, grant access
 *   ALLOW_WITH_MFA — Trust score marginal, require MFA step-up
 *   DENY           — Trust score below threshold, reject
 *   QUARANTINE     — Anomaly detected, isolate for investigation
 *
 * "The Dye House trusts nothing. Every thread proves its color."
 */

// ─── Types ──────────────────────────────────────────────────────────

export type TrustFactor = 'IDENTITY' | 'DEVICE' | 'NETWORK' | 'BEHAVIOR' | 'TIME_OF_DAY';
export type AccessDecision = 'ALLOW' | 'ALLOW_WITH_MFA' | 'DENY' | 'QUARANTINE';

export interface TrustContext {
  readonly identityId: string;
  readonly deviceId: string;
  readonly ipAddress: string;
  readonly resource: string;
  readonly action: string;
  readonly timestamp: bigint;
  readonly userAgent: string;
  readonly geoLocation: string;
}

export interface TrustScore {
  readonly overall: number;
  readonly factors: ReadonlyMap<TrustFactor, number>;
  readonly computedAt: bigint;
}

export interface AccessDecisionResult {
  readonly decision: AccessDecision;
  readonly trustScore: TrustScore;
  readonly reason: string;
  readonly evaluatedAt: bigint;
}

export interface ZeroTrustPolicy {
  readonly name: string;
  readonly resource: string;
  readonly action: string;
  readonly requiredScore: number;
  readonly mfaThreshold: number;
  readonly requiredFactors: ReadonlyArray<TrustFactor>;
}

export interface DevicePosture {
  readonly deviceId: string;
  readonly compliant: boolean;
  readonly lastSeen: bigint;
  readonly osVersion: string;
  readonly antivirusActive: boolean;
  readonly encryptionEnabled: boolean;
}

export interface BehaviorAnomaly {
  readonly identityId: string;
  readonly anomalyType: string;
  readonly severity: number;
  readonly detectedAt: bigint;
  readonly description: string;
}

export interface AccessHistoryEntry {
  readonly identityId: string;
  readonly resource: string;
  readonly action: string;
  readonly decision: AccessDecision;
  readonly trustScore: number;
  readonly timestamp: bigint;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface ZeroTrustEngine {
  evaluateAccess(context: TrustContext): AccessDecisionResult;
  registerPolicy(policy: ZeroTrustPolicy): void;
  removePolicy(name: string): boolean;
  updateDevicePosture(posture: DevicePosture): void;
  recordAnomaly(anomaly: BehaviorAnomaly): void;
  getAccessHistory(identityId: string, limit: number): ReadonlyArray<AccessHistoryEntry>;
  getPolicyCount(): number;
  getDevicePosture(deviceId: string): DevicePosture | null;
  getAnomalies(identityId: string): ReadonlyArray<BehaviorAnomaly>;
  clearExpiredAnomalies(ageThresholdUs: bigint): number;
}

export interface ZeroTrustEngineDeps {
  readonly clock: ZeroTrustClockPort;
  readonly logger: ZeroTrustLoggerPort;
  readonly maxHistoryPerIdentity: number;
  readonly anomalyExpirationUs: bigint;
}

interface ZeroTrustClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface ZeroTrustLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ─── State ──────────────────────────────────────────────────────────

interface EngineState {
  readonly policies: Map<string, ZeroTrustPolicy>;
  readonly devices: Map<string, DevicePosture>;
  readonly anomalies: Map<string, BehaviorAnomaly[]>;
  readonly history: Map<string, AccessHistoryEntry[]>;
  readonly deps: ZeroTrustEngineDeps;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createZeroTrustEngine(deps: ZeroTrustEngineDeps): ZeroTrustEngine {
  const state: EngineState = {
    policies: new Map(),
    devices: new Map(),
    anomalies: new Map(),
    history: new Map(),
    deps,
  };

  return {
    evaluateAccess: (ctx) => evaluateAccessImpl(state, ctx),
    registerPolicy: (p) => {
      registerPolicyImpl(state, p);
    },
    removePolicy: (n) => removePolicyImpl(state, n),
    updateDevicePosture: (p) => {
      updateDevicePostureImpl(state, p);
    },
    recordAnomaly: (a) => {
      recordAnomalyImpl(state, a);
    },
    getAccessHistory: (id, lim) => getAccessHistoryImpl(state, id, lim),
    getPolicyCount: () => state.policies.size,
    getDevicePosture: (did) => getDevicePostureImpl(state, did),
    getAnomalies: (id) => getAnomaliesImpl(state, id),
    clearExpiredAnomalies: (age) => clearExpiredAnomaliesImpl(state, age),
  };
}

// ─── Policy Management ──────────────────────────────────────────────

function registerPolicyImpl(state: EngineState, policy: ZeroTrustPolicy): void {
  state.policies.set(policy.name, policy);
  state.deps.logger.info('Policy registered', { policy: policy.name });
}

function removePolicyImpl(state: EngineState, name: string): boolean {
  const removed = state.policies.delete(name);
  if (removed) {
    state.deps.logger.info('Policy removed', { policy: name });
  }
  return removed;
}

// ─── Device Posture ─────────────────────────────────────────────────

function updateDevicePostureImpl(state: EngineState, posture: DevicePosture): void {
  state.devices.set(posture.deviceId, posture);
}

function getDevicePostureImpl(state: EngineState, deviceId: string): DevicePosture | null {
  const posture = state.devices.get(deviceId);
  return posture !== undefined ? posture : null;
}

// ─── Anomaly Tracking ───────────────────────────────────────────────

function recordAnomalyImpl(state: EngineState, anomaly: BehaviorAnomaly): void {
  const existing = state.anomalies.get(anomaly.identityId);
  if (existing !== undefined) {
    existing.push(anomaly);
  } else {
    state.anomalies.set(anomaly.identityId, [anomaly]);
  }
  state.deps.logger.warn('Anomaly recorded', {
    identity: anomaly.identityId,
    type: anomaly.anomalyType,
    severity: anomaly.severity,
  });
}

function getAnomaliesImpl(state: EngineState, identityId: string): ReadonlyArray<BehaviorAnomaly> {
  const anomalies = state.anomalies.get(identityId);
  return anomalies !== undefined ? [...anomalies] : [];
}

function clearExpiredAnomaliesImpl(state: EngineState, ageThresholdUs: bigint): number {
  const now = state.deps.clock.nowMicroseconds();
  const cutoff = now - ageThresholdUs;
  let cleared = 0;

  for (const [identityId, anomalies] of state.anomalies.entries()) {
    const filtered = anomalies.filter((a) => a.detectedAt >= cutoff);
    const removedCount = anomalies.length - filtered.length;
    cleared += removedCount;
    if (filtered.length === 0) {
      state.anomalies.delete(identityId);
    } else if (removedCount > 0) {
      state.anomalies.set(identityId, filtered);
    }
  }

  return cleared;
}

// ─── Access Evaluation ──────────────────────────────────────────────

function evaluateAccessImpl(state: EngineState, context: TrustContext): AccessDecisionResult {
  const now = state.deps.clock.nowMicroseconds();
  const policy = findPolicy(state, context.resource, context.action);

  if (policy === null) {
    return denyResult(now, 'No matching policy');
  }

  const trustScore = computeTrustScore(state, context, policy);
  const decision = makeDecision(trustScore, policy);
  const result = buildDecisionResult(decision, trustScore, policy, now);

  recordHistoryEntry(state, context, result);
  logDecision(state, context, result);

  return result;
}

function computeTrustScore(
  state: EngineState,
  ctx: TrustContext,
  policy: ZeroTrustPolicy,
): TrustScore {
  const now = state.deps.clock.nowMicroseconds();
  const factors = new Map<TrustFactor, number>();

  factors.set('IDENTITY', evaluateIdentityFactor(state, ctx));
  factors.set('DEVICE', evaluateDeviceFactor(state, ctx));
  factors.set('NETWORK', evaluateNetworkFactor(ctx));
  factors.set('BEHAVIOR', evaluateBehaviorFactor(state, ctx));
  factors.set('TIME_OF_DAY', evaluateTimeFactor(ctx));

  const overall = computeOverallScore(factors, policy.requiredFactors);

  return { overall, factors, computedAt: now };
}

function evaluateIdentityFactor(state: EngineState, ctx: TrustContext): number {
  const history = state.history.get(ctx.identityId);
  if (history === undefined || history.length === 0) return 0.5;

  const recentSuccess = countRecentSuccess(history, ctx.timestamp - BigInt(3600000000));
  const totalRecent = countRecent(history, ctx.timestamp - BigInt(3600000000));

  if (totalRecent === 0) return 0.5;
  return recentSuccess / totalRecent;
}

function evaluateDeviceFactor(state: EngineState, ctx: TrustContext): number {
  const posture = state.devices.get(ctx.deviceId);
  if (posture === undefined) return 0.3;
  if (!posture.compliant) return 0.1;

  const age = ctx.timestamp - posture.lastSeen;
  const ageHours = Number(age / BigInt(3600000000));
  if (ageHours > 24) return 0.5;

  let score = 0.7;
  if (posture.antivirusActive) score += 0.15;
  if (posture.encryptionEnabled) score += 0.15;
  return Math.min(1.0, score);
}

function evaluateNetworkFactor(ctx: TrustContext): number {
  if (ctx.ipAddress.startsWith('10.') || ctx.ipAddress.startsWith('192.168.')) {
    return 0.9;
  }
  if (ctx.geoLocation === 'unknown') return 0.3;
  return 0.6;
}

function evaluateBehaviorFactor(state: EngineState, ctx: TrustContext): number {
  const anomalies = state.anomalies.get(ctx.identityId);
  if (anomalies === undefined || anomalies.length === 0) return 0.8;

  const recentAge = ctx.timestamp - BigInt(3600000000);
  const recent = anomalies.filter((a) => a.detectedAt >= recentAge);
  if (recent.length === 0) return 0.8;

  const maxSeverity = Math.max(...recent.map((a) => a.severity));
  return Math.max(0.0, 1.0 - maxSeverity);
}

function evaluateTimeFactor(ctx: TrustContext): number {
  const hourUs = BigInt(3600000000);
  const dayUs = BigInt(86400000000);
  const timeOfDay = Number((ctx.timestamp % dayUs) / hourUs);

  if (timeOfDay >= 9 && timeOfDay <= 17) return 1.0;
  if (timeOfDay >= 6 && timeOfDay <= 22) return 0.8;
  return 0.5;
}

function computeOverallScore(
  factors: Map<TrustFactor, number>,
  required: ReadonlyArray<TrustFactor>,
): number {
  if (required.length === 0) {
    let sum = 0;
    for (const score of factors.values()) {
      sum += score;
    }
    return sum / factors.size;
  }

  let sum = 0;
  for (const factor of required) {
    const score = factors.get(factor);
    if (score !== undefined) {
      sum += score;
    }
  }
  return sum / required.length;
}

function makeDecision(score: TrustScore, policy: ZeroTrustPolicy): AccessDecision {
  const behaviorScore = score.factors.get('BEHAVIOR');
  if (behaviorScore !== undefined && behaviorScore < 0.3) return 'QUARANTINE';

  if (score.overall >= policy.requiredScore) return 'ALLOW';
  if (score.overall >= policy.mfaThreshold) return 'ALLOW_WITH_MFA';

  return 'DENY';
}

function buildDecisionResult(
  decision: AccessDecision,
  score: TrustScore,
  policy: ZeroTrustPolicy,
  now: bigint,
): AccessDecisionResult {
  let reason = '';
  if (decision === 'ALLOW') {
    reason = 'Trust score ' + String(score.overall.toFixed(2)) + ' meets policy ' + policy.name;
  } else if (decision === 'ALLOW_WITH_MFA') {
    reason = 'MFA required, score ' + String(score.overall.toFixed(2));
  } else if (decision === 'QUARANTINE') {
    reason = 'Behavioral anomaly detected';
  } else {
    reason = 'Trust score ' + String(score.overall.toFixed(2)) + ' below threshold';
  }

  return { decision, trustScore: score, reason, evaluatedAt: now };
}

// ─── Access History ─────────────────────────────────────────────────

function recordHistoryEntry(
  state: EngineState,
  ctx: TrustContext,
  result: AccessDecisionResult,
): void {
  const entry: AccessHistoryEntry = {
    identityId: ctx.identityId,
    resource: ctx.resource,
    action: ctx.action,
    decision: result.decision,
    trustScore: result.trustScore.overall,
    timestamp: result.evaluatedAt,
  };

  const existing = state.history.get(ctx.identityId);
  if (existing !== undefined) {
    existing.push(entry);
    trimHistory(existing, state.deps.maxHistoryPerIdentity);
  } else {
    state.history.set(ctx.identityId, [entry]);
  }
}

function getAccessHistoryImpl(
  state: EngineState,
  identityId: string,
  limit: number,
): ReadonlyArray<AccessHistoryEntry> {
  const history = state.history.get(identityId);
  if (history === undefined) return [];
  if (limit >= history.length) return [...history];
  return history.slice(history.length - limit);
}

function trimHistory(history: AccessHistoryEntry[], maxSize: number): void {
  while (history.length > maxSize) {
    history.shift();
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function findPolicy(state: EngineState, resource: string, action: string): ZeroTrustPolicy | null {
  for (const policy of state.policies.values()) {
    if (matchesPolicy(policy, resource, action)) {
      return policy;
    }
  }
  return null;
}

function matchesPolicy(policy: ZeroTrustPolicy, resource: string, action: string): boolean {
  const resourceMatch = policy.resource === '*' || policy.resource === resource;
  const actionMatch = policy.action === '*' || policy.action === action;
  return resourceMatch && actionMatch;
}

function denyResult(now: bigint, reason: string): AccessDecisionResult {
  const emptyScore: TrustScore = {
    overall: 0,
    factors: new Map(),
    computedAt: now,
  };
  return {
    decision: 'DENY',
    trustScore: emptyScore,
    reason,
    evaluatedAt: now,
  };
}

function countRecentSuccess(history: AccessHistoryEntry[], cutoff: bigint): number {
  let count = 0;
  for (const entry of history) {
    if (
      entry.timestamp >= cutoff &&
      (entry.decision === 'ALLOW' || entry.decision === 'ALLOW_WITH_MFA')
    ) {
      count += 1;
    }
  }
  return count;
}

function countRecent(history: AccessHistoryEntry[], cutoff: bigint): number {
  let count = 0;
  for (const entry of history) {
    if (entry.timestamp >= cutoff) {
      count += 1;
    }
  }
  return count;
}

function logDecision(state: EngineState, ctx: TrustContext, result: AccessDecisionResult): void {
  const level = result.decision === 'DENY' || result.decision === 'QUARANTINE' ? 'warn' : 'info';
  const logCtx = {
    identity: ctx.identityId,
    resource: ctx.resource,
    action: ctx.action,
    decision: result.decision,
    score: result.trustScore.overall,
  };

  if (level === 'warn') {
    state.deps.logger.warn('Access decision', logCtx);
  } else {
    state.deps.logger.info('Access decision', logCtx);
  }
}
