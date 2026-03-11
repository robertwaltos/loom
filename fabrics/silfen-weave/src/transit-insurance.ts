/**
 * transit-insurance.ts — Transit risk insurance system.
 *
 * Provides insurance policies for entities transiting the Silfen Weave.
 * Calculates premiums based on corridor stability and distance, processes
 * claims on failed transits, tracks actuarial statistics, and supports
 * policy renewal cycles.
 */

// ── Ports ────────────────────────────────────────────────────────

interface InsuranceClock {
  readonly nowMicroseconds: () => number;
}

interface InsuranceIdGenerator {
  readonly generate: () => string;
}

// ── Deps ─────────────────────────────────────────────────────────

interface TransitInsuranceDeps {
  readonly clock: InsuranceClock;
  readonly idGenerator: InsuranceIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type PolicyStatus = 'active' | 'expired' | 'cancelled' | 'claimed';

type RiskTier = 'minimal' | 'low' | 'moderate' | 'high' | 'extreme';

interface InsurancePolicy {
  readonly policyId: string;
  readonly dynastyId: string;
  readonly corridorId: string;
  readonly premium: bigint;
  readonly coverageAmount: bigint;
  readonly riskTier: RiskTier;
  readonly status: PolicyStatus;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly claimId: string | null;
}

interface CreatePolicyParams {
  readonly dynastyId: string;
  readonly corridorId: string;
  readonly corridorStability: number;
  readonly distanceLY: number;
  readonly coverageAmount: bigint;
  readonly durationUs: number;
}

interface InsuranceClaim {
  readonly claimId: string;
  readonly policyId: string;
  readonly dynastyId: string;
  readonly corridorId: string;
  readonly reason: string;
  readonly filedAt: number;
  readonly payoutAmount: bigint;
  readonly approved: boolean;
}

interface FileClaimParams {
  readonly policyId: string;
  readonly reason: string;
}

type ClaimResult =
  | { readonly outcome: 'approved'; readonly claim: InsuranceClaim }
  | { readonly outcome: 'policy_not_found' }
  | { readonly outcome: 'policy_not_active' }
  | { readonly outcome: 'policy_expired' }
  | { readonly outcome: 'already_claimed' };

interface RiskAssessment {
  readonly corridorId: string;
  readonly stability: number;
  readonly distanceLY: number;
  readonly riskTier: RiskTier;
  readonly riskScore: number;
  readonly suggestedPremium: bigint;
}

interface RenewalResult {
  readonly outcome: 'renewed' | 'policy_not_found' | 'not_expired';
  readonly policy?: InsurancePolicy;
}

interface ActuarialStats {
  readonly totalPolicies: number;
  readonly activePolicies: number;
  readonly expiredPolicies: number;
  readonly totalClaims: number;
  readonly approvedClaims: number;
  readonly totalPremiumsCollected: bigint;
  readonly totalPayoutsIssued: bigint;
  readonly lossRatio: number;
  readonly averagePremium: bigint;
}

interface InsuranceConfig {
  readonly basePremiumRate: bigint;
  readonly stabilityPremiumMultiplier: number;
  readonly distancePremiumMultiplier: number;
  readonly payoutPercentage: number;
  readonly minPremium: bigint;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_INSURANCE_CONFIG: InsuranceConfig = {
  basePremiumRate: 100n,
  stabilityPremiumMultiplier: 2.0,
  distancePremiumMultiplier: 1.5,
  payoutPercentage: 0.8,
  minPremium: 50n,
};

// ── State ────────────────────────────────────────────────────────

interface MutablePolicy {
  readonly policyId: string;
  readonly dynastyId: string;
  readonly corridorId: string;
  readonly premium: bigint;
  readonly coverageAmount: bigint;
  readonly riskTier: RiskTier;
  status: PolicyStatus;
  readonly createdAt: number;
  expiresAt: number;
  claimId: string | null;
}

interface InsuranceState {
  readonly deps: TransitInsuranceDeps;
  readonly config: InsuranceConfig;
  readonly policies: Map<string, MutablePolicy>;
  readonly claims: Map<string, InsuranceClaim>;
  totalPremiums: bigint;
  totalPayouts: bigint;
}

// ── Helpers ──────────────────────────────────────────────────────

function policyToReadonly(p: MutablePolicy): InsurancePolicy {
  return { ...p };
}

function classifyRisk(riskScore: number): RiskTier {
  if (riskScore >= 80) return 'extreme';
  if (riskScore >= 60) return 'high';
  if (riskScore >= 40) return 'moderate';
  if (riskScore >= 20) return 'low';
  return 'minimal';
}

function calculateRiskScore(stability: number, distanceLY: number): number {
  const stabilityRisk = Math.max(0, 100 - stability);
  const distanceRisk = Math.min(50, distanceLY * 2);
  return Math.min(100, stabilityRisk * 0.7 + distanceRisk * 0.3);
}

function calculatePremium(
  config: InsuranceConfig,
  riskScore: number,
  coverageAmount: bigint,
): bigint {
  const riskFactor = 1 + riskScore / 100;
  const scaledRate = Number(config.basePremiumRate) * riskFactor;
  const rawPremium = (BigInt(Math.ceil(scaledRate)) * coverageAmount) / 1000n;
  return rawPremium > config.minPremium ? rawPremium : config.minPremium;
}

// ── Policy Operations ────────────────────────────────────────────

function createPolicyImpl(state: InsuranceState, params: CreatePolicyParams): InsurancePolicy {
  const policyId = state.deps.idGenerator.generate();
  const now = state.deps.clock.nowMicroseconds();
  const riskScore = calculateRiskScore(params.corridorStability, params.distanceLY);
  const riskTier = classifyRisk(riskScore);
  const premium = calculatePremium(state.config, riskScore, params.coverageAmount);
  const policy: MutablePolicy = {
    policyId,
    dynastyId: params.dynastyId,
    corridorId: params.corridorId,
    premium,
    coverageAmount: params.coverageAmount,
    riskTier,
    status: 'active',
    createdAt: now,
    expiresAt: now + params.durationUs,
    claimId: null,
  };
  state.policies.set(policyId, policy);
  state.totalPremiums += premium;
  return policyToReadonly(policy);
}

function getPolicyImpl(state: InsuranceState, policyId: string): InsurancePolicy | undefined {
  const p = state.policies.get(policyId);
  if (p === undefined) return undefined;
  refreshPolicyStatus(state, p);
  return policyToReadonly(p);
}

function refreshPolicyStatus(state: InsuranceState, p: MutablePolicy): void {
  if (p.status !== 'active') return;
  const now = state.deps.clock.nowMicroseconds();
  if (now >= p.expiresAt) p.status = 'expired';
}

function cancelPolicyImpl(state: InsuranceState, policyId: string): boolean {
  const p = state.policies.get(policyId);
  if (p === undefined) return false;
  if (p.status !== 'active') return false;
  p.status = 'cancelled';
  return true;
}

// ── Claims ───────────────────────────────────────────────────────

function fileClaimImpl(state: InsuranceState, params: FileClaimParams): ClaimResult {
  const p = state.policies.get(params.policyId);
  if (p === undefined) return { outcome: 'policy_not_found' };
  refreshPolicyStatus(state, p);
  return evaluateClaim(state, p, params.reason);
}

function evaluateClaim(state: InsuranceState, p: MutablePolicy, reason: string): ClaimResult {
  if (p.claimId !== null) return { outcome: 'already_claimed' };
  if (p.status === 'expired') return { outcome: 'policy_expired' };
  if (p.status !== 'active') return { outcome: 'policy_not_active' };
  return approveClaim(state, p, reason);
}

function approveClaim(state: InsuranceState, p: MutablePolicy, reason: string): ClaimResult {
  const claimId = state.deps.idGenerator.generate();
  const payoutRaw = p.coverageAmount * BigInt(Math.floor(state.config.payoutPercentage * 100));
  const payoutAmount = payoutRaw / 100n;
  const claim: InsuranceClaim = {
    claimId,
    policyId: p.policyId,
    dynastyId: p.dynastyId,
    corridorId: p.corridorId,
    reason,
    filedAt: state.deps.clock.nowMicroseconds(),
    payoutAmount,
    approved: true,
  };
  state.claims.set(claimId, claim);
  p.claimId = claimId;
  p.status = 'claimed';
  state.totalPayouts += payoutAmount;
  return { outcome: 'approved', claim };
}

// ── Risk Assessment ──────────────────────────────────────────────

function assessRiskImpl(
  state: InsuranceState,
  corridorId: string,
  stability: number,
  distanceLY: number,
  coverageAmount: bigint,
): RiskAssessment {
  const riskScore = calculateRiskScore(stability, distanceLY);
  return {
    corridorId,
    stability,
    distanceLY,
    riskTier: classifyRisk(riskScore),
    riskScore,
    suggestedPremium: calculatePremium(state.config, riskScore, coverageAmount),
  };
}

// ── Renewal ──────────────────────────────────────────────────────

function renewPolicyImpl(
  state: InsuranceState,
  policyId: string,
  durationUs: number,
): RenewalResult {
  const p = state.policies.get(policyId);
  if (p === undefined) return { outcome: 'policy_not_found' };
  refreshPolicyStatus(state, p);
  if (p.status === 'active') return { outcome: 'not_expired' };
  return performRenewal(state, p, durationUs);
}

function performRenewal(
  state: InsuranceState,
  p: MutablePolicy,
  durationUs: number,
): RenewalResult {
  const now = state.deps.clock.nowMicroseconds();
  p.status = 'active';
  p.expiresAt = now + durationUs;
  p.claimId = null;
  state.totalPremiums += p.premium;
  return { outcome: 'renewed', policy: policyToReadonly(p) };
}

// ── Queries ──────────────────────────────────────────────────────

function listByDynastyImpl(state: InsuranceState, dynastyId: string): readonly InsurancePolicy[] {
  const result: InsurancePolicy[] = [];
  for (const p of state.policies.values()) {
    if (p.dynastyId !== dynastyId) continue;
    refreshPolicyStatus(state, p);
    result.push(policyToReadonly(p));
  }
  return result;
}

function listByCorridorImpl(state: InsuranceState, corridorId: string): readonly InsurancePolicy[] {
  const result: InsurancePolicy[] = [];
  for (const p of state.policies.values()) {
    if (p.corridorId !== corridorId) continue;
    refreshPolicyStatus(state, p);
    result.push(policyToReadonly(p));
  }
  return result;
}

function getClaimImpl(state: InsuranceState, claimId: string): InsuranceClaim | undefined {
  return state.claims.get(claimId);
}

function listClaimsImpl(state: InsuranceState, corridorId: string): readonly InsuranceClaim[] {
  const result: InsuranceClaim[] = [];
  for (const c of state.claims.values()) {
    if (c.corridorId === corridorId) result.push(c);
  }
  return result;
}

// ── Actuarial Stats ──────────────────────────────────────────────

function getActuarialStatsImpl(state: InsuranceState): ActuarialStats {
  let active = 0;
  let expired = 0;
  for (const p of state.policies.values()) {
    refreshPolicyStatus(state, p);
    if (p.status === 'active') active += 1;
    if (p.status === 'expired') expired += 1;
  }
  const approvedClaims = countApprovedClaims(state);
  const totalPolicies = state.policies.size;
  const avgPremium = totalPolicies > 0 ? state.totalPremiums / BigInt(totalPolicies) : 0n;
  const lossRatio =
    state.totalPremiums > 0n ? Number(state.totalPayouts) / Number(state.totalPremiums) : 0;
  return {
    totalPolicies,
    activePolicies: active,
    expiredPolicies: expired,
    totalClaims: state.claims.size,
    approvedClaims,
    totalPremiumsCollected: state.totalPremiums,
    totalPayoutsIssued: state.totalPayouts,
    lossRatio,
    averagePremium: avgPremium,
  };
}

function countApprovedClaims(state: InsuranceState): number {
  let count = 0;
  for (const c of state.claims.values()) {
    if (c.approved) count += 1;
  }
  return count;
}

// ── Public API ───────────────────────────────────────────────────

interface TransitInsurance {
  readonly createPolicy: (params: CreatePolicyParams) => InsurancePolicy;
  readonly getPolicy: (policyId: string) => InsurancePolicy | undefined;
  readonly cancelPolicy: (policyId: string) => boolean;
  readonly fileClaim: (params: FileClaimParams) => ClaimResult;
  readonly assessRisk: (
    corridorId: string,
    stability: number,
    distanceLY: number,
    coverageAmount: bigint,
  ) => RiskAssessment;
  readonly renewPolicy: (policyId: string, durationUs: number) => RenewalResult;
  readonly listByDynasty: (dynastyId: string) => readonly InsurancePolicy[];
  readonly listByCorridor: (corridorId: string) => readonly InsurancePolicy[];
  readonly getClaim: (claimId: string) => InsuranceClaim | undefined;
  readonly listClaims: (corridorId: string) => readonly InsuranceClaim[];
  readonly getActuarialStats: () => ActuarialStats;
}

// ── Factory ──────────────────────────────────────────────────────

function createTransitInsurance(
  deps: TransitInsuranceDeps,
  config?: Partial<InsuranceConfig>,
): TransitInsurance {
  const state: InsuranceState = {
    deps,
    config: { ...DEFAULT_INSURANCE_CONFIG, ...config },
    policies: new Map(),
    claims: new Map(),
    totalPremiums: 0n,
    totalPayouts: 0n,
  };
  return {
    createPolicy: (p) => createPolicyImpl(state, p),
    getPolicy: (id) => getPolicyImpl(state, id),
    cancelPolicy: (id) => cancelPolicyImpl(state, id),
    fileClaim: (p) => fileClaimImpl(state, p),
    assessRisk: (cId, s, d, a) => assessRiskImpl(state, cId, s, d, a),
    renewPolicy: (id, dur) => renewPolicyImpl(state, id, dur),
    listByDynasty: (dId) => listByDynastyImpl(state, dId),
    listByCorridor: (cId) => listByCorridorImpl(state, cId),
    getClaim: (id) => getClaimImpl(state, id),
    listClaims: (cId) => listClaimsImpl(state, cId),
    getActuarialStats: () => getActuarialStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createTransitInsurance, DEFAULT_INSURANCE_CONFIG };
export type {
  TransitInsurance,
  TransitInsuranceDeps,
  InsuranceClock,
  InsuranceIdGenerator,
  InsurancePolicy,
  CreatePolicyParams,
  PolicyStatus,
  RiskTier,
  InsuranceClaim,
  FileClaimParams,
  ClaimResult,
  RiskAssessment,
  RenewalResult,
  ActuarialStats,
  InsuranceConfig,
};
