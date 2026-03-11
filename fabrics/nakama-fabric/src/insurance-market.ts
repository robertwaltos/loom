/**
 * Insurance Market — Risk insurance products and claims processing.
 *
 * Players buy coverage for transit loss, property damage, trade default, etc.
 * Premium calculated as base × risk_multiplier. Claims processed with evidence.
 * Payout capped at coverage limit. Fraud detection flags suspicious claims.
 *
 * All amounts in bigint micro-KALON (10^6 precision).
 * PolicyType: 'TRANSIT_LOSS' | 'PROPERTY_DAMAGE' | 'TRADE_DEFAULT' | 'LIFE' | 'CROP_FAILURE'
 */

export type PolicyType =
  | 'TRANSIT_LOSS'
  | 'PROPERTY_DAMAGE'
  | 'TRADE_DEFAULT'
  | 'LIFE'
  | 'CROP_FAILURE';

export type PolicyId = string;
export type DynastyId = string;
export type ClaimId = string;

export interface InsurancePolicy {
  readonly policyId: PolicyId;
  readonly dynastyId: DynastyId;
  readonly policyType: PolicyType;
  readonly coverageLimit: bigint;
  readonly premium: bigint;
  readonly riskMultiplier: number;
  readonly issuedAt: bigint;
  readonly expiresAt: bigint;
  readonly active: boolean;
}

export interface ClaimRecord {
  readonly claimId: ClaimId;
  readonly policyId: PolicyId;
  readonly dynastyId: DynastyId;
  readonly claimAmount: bigint;
  readonly evidenceHash: string;
  readonly filedAt: bigint;
  readonly processed: boolean;
  readonly approved: boolean;
  readonly payoutAmount: bigint;
  readonly processedAt?: bigint;
}

export interface PremiumCalculation {
  readonly policyType: PolicyType;
  readonly basePremium: bigint;
  readonly riskMultiplier: number;
  readonly finalPremium: bigint;
}

export interface FraudFlag {
  readonly flagId: string;
  readonly claimId: ClaimId;
  readonly dynastyId: DynastyId;
  readonly reason: string;
  readonly flaggedAt: bigint;
}

export interface InsuranceReport {
  readonly totalPolicies: number;
  readonly activePolicies: number;
  readonly totalClaims: number;
  readonly approvedClaims: number;
  readonly deniedClaims: number;
  readonly fraudFlags: number;
  readonly totalPremiumsCollected: bigint;
  readonly totalPayouts: bigint;
  readonly generatedAt: bigint;
}

export interface InsuranceMarketSystem {
  issuePolicy(
    dynastyId: DynastyId,
    policyType: PolicyType,
    coverageLimit: bigint,
    riskMultiplier: number,
    durationMicroseconds: bigint,
  ):
    | { readonly success: true; readonly policy: InsurancePolicy }
    | { readonly success: false; readonly error: string };
  calculatePremium(
    policyType: PolicyType,
    coverageLimit: bigint,
    riskMultiplier: number,
  ): PremiumCalculation;
  fileClaim(
    policyId: PolicyId,
    claimAmount: bigint,
    evidenceHash: string,
  ):
    | { readonly success: true; readonly claim: ClaimRecord }
    | { readonly success: false; readonly error: string };
  processClaim(
    claimId: ClaimId,
    approved: boolean,
  ):
    | { readonly success: true; readonly payout: bigint }
    | { readonly success: false; readonly error: string };
  flagFraud(
    claimId: ClaimId,
    reason: string,
  ):
    | { readonly success: true; readonly flag: FraudFlag }
    | { readonly success: false; readonly error: string };
  getInsuranceReport(): InsuranceReport;
  renewPolicy(
    policyId: PolicyId,
    durationMicroseconds: bigint,
  ):
    | { readonly success: true; readonly policy: InsurancePolicy }
    | { readonly success: false; readonly error: string };
  getPolicy(policyId: PolicyId): InsurancePolicy | undefined;
  getClaim(claimId: ClaimId): ClaimRecord | undefined;
  listPolicies(dynastyId: DynastyId): ReadonlyArray<InsurancePolicy>;
  listClaims(dynastyId: DynastyId): ReadonlyArray<ClaimRecord>;
}

interface InsuranceMarketState {
  readonly policies: Map<PolicyId, MutablePolicy>;
  readonly claims: Map<ClaimId, MutableClaim>;
  readonly fraudFlags: MutableFraudFlag[];
  totalPremiumsCollected: bigint;
  totalPayouts: bigint;
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generateId(): string };
  readonly logger: {
    info(message: string, meta?: Record<string, unknown>): void;
  };
}

interface MutablePolicy {
  readonly policyId: PolicyId;
  readonly dynastyId: DynastyId;
  readonly policyType: PolicyType;
  readonly coverageLimit: bigint;
  readonly premium: bigint;
  readonly riskMultiplier: number;
  readonly issuedAt: bigint;
  expiresAt: bigint;
  active: boolean;
}

interface MutableClaim {
  readonly claimId: ClaimId;
  readonly policyId: PolicyId;
  readonly dynastyId: DynastyId;
  readonly claimAmount: bigint;
  readonly evidenceHash: string;
  readonly filedAt: bigint;
  processed: boolean;
  approved: boolean;
  payoutAmount: bigint;
  processedAt?: bigint;
}

interface MutableFraudFlag {
  readonly flagId: string;
  readonly claimId: ClaimId;
  readonly dynastyId: DynastyId;
  readonly reason: string;
  readonly flaggedAt: bigint;
}

const BASE_PREMIUM_RATES: Record<PolicyType, bigint> = {
  TRANSIT_LOSS: 50n,
  PROPERTY_DAMAGE: 80n,
  TRADE_DEFAULT: 100n,
  LIFE: 120n,
  CROP_FAILURE: 60n,
} as const;

const MICRO_KALON = 1_000_000n;

export function createInsuranceMarketSystem(deps: {
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { generateId(): string };
  readonly logger: {
    info(message: string, meta?: Record<string, unknown>): void;
  };
}): InsuranceMarketSystem {
  const state: InsuranceMarketState = {
    policies: new Map(),
    claims: new Map(),
    fraudFlags: [],
    totalPremiumsCollected: 0n,
    totalPayouts: 0n,
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };

  return {
    issuePolicy: (did, type, limit, risk, duration) =>
      issuePolicyImpl(state, did, type, limit, risk, duration),
    calculatePremium: (type, limit, risk) => calculatePremiumImpl(type, limit, risk),
    fileClaim: (pid, amount, evidence) => fileClaimImpl(state, pid, amount, evidence),
    processClaim: (cid, approved) => processClaimImpl(state, cid, approved),
    flagFraud: (cid, reason) => flagFraudImpl(state, cid, reason),
    getInsuranceReport: () => getInsuranceReportImpl(state),
    renewPolicy: (pid, duration) => renewPolicyImpl(state, pid, duration),
    getPolicy: (pid) => state.policies.get(pid),
    getClaim: (cid) => state.claims.get(cid),
    listPolicies: (did) => listPoliciesImpl(state, did),
    listClaims: (did) => listClaimsImpl(state, did),
  };
}

function issuePolicyImpl(
  state: InsuranceMarketState,
  dynastyId: DynastyId,
  policyType: PolicyType,
  coverageLimit: bigint,
  riskMultiplier: number,
  durationMicroseconds: bigint,
):
  | { readonly success: true; readonly policy: InsurancePolicy }
  | { readonly success: false; readonly error: string } {
  if (coverageLimit <= 0n) {
    return { success: false, error: 'invalid-coverage-limit' };
  }
  if (riskMultiplier < 0) {
    return { success: false, error: 'invalid-risk-multiplier' };
  }
  if (durationMicroseconds <= 0n) {
    return { success: false, error: 'invalid-duration' };
  }

  const premiumCalc = calculatePremiumImpl(policyType, coverageLimit, riskMultiplier);
  const now = state.clock.nowMicroseconds();
  const policyId = state.idGen.generateId();

  const policy: MutablePolicy = {
    policyId,
    dynastyId,
    policyType,
    coverageLimit,
    premium: premiumCalc.finalPremium,
    riskMultiplier,
    issuedAt: now,
    expiresAt: now + durationMicroseconds,
    active: true,
  };

  state.policies.set(policyId, policy);
  state.totalPremiumsCollected += premiumCalc.finalPremium;

  state.logger.info('Insurance policy issued', {
    policyId,
    dynastyId,
    policyType,
    coverageLimit: String(coverageLimit),
    premium: String(premiumCalc.finalPremium),
  });

  return { success: true, policy };
}

function calculatePremiumImpl(
  policyType: PolicyType,
  coverageLimit: bigint,
  riskMultiplier: number,
): PremiumCalculation {
  const baseRate = BASE_PREMIUM_RATES[policyType];
  const basePremium = (coverageLimit * baseRate) / 10000n;
  const riskAdjustment = BigInt(Math.floor(riskMultiplier * 10000));
  const finalPremium = (basePremium * riskAdjustment) / 10000n;

  return {
    policyType,
    basePremium,
    riskMultiplier,
    finalPremium,
  };
}

function fileClaimImpl(
  state: InsuranceMarketState,
  policyId: PolicyId,
  claimAmount: bigint,
  evidenceHash: string,
):
  | { readonly success: true; readonly claim: ClaimRecord }
  | { readonly success: false; readonly error: string } {
  const policy = state.policies.get(policyId);
  if (!policy) return { success: false, error: 'policy-not-found' };
  if (!policy.active) return { success: false, error: 'policy-inactive' };

  const now = state.clock.nowMicroseconds();
  if (now > policy.expiresAt) {
    return { success: false, error: 'policy-expired' };
  }

  if (claimAmount <= 0n) return { success: false, error: 'invalid-claim-amount' };
  if (claimAmount > policy.coverageLimit) {
    return { success: false, error: 'claim-exceeds-coverage' };
  }

  const claimId = state.idGen.generateId();

  const claim: MutableClaim = {
    claimId,
    policyId,
    dynastyId: policy.dynastyId,
    claimAmount,
    evidenceHash,
    filedAt: now,
    processed: false,
    approved: false,
    payoutAmount: 0n,
  };

  state.claims.set(claimId, claim);

  state.logger.info('Insurance claim filed', {
    claimId,
    policyId,
    claimAmount: String(claimAmount),
    evidenceHash,
  });

  return { success: true, claim };
}

function processClaimImpl(
  state: InsuranceMarketState,
  claimId: ClaimId,
  approved: boolean,
):
  | { readonly success: true; readonly payout: bigint }
  | { readonly success: false; readonly error: string } {
  const claim = state.claims.get(claimId);
  if (!claim) return { success: false, error: 'claim-not-found' };
  if (claim.processed) return { success: false, error: 'claim-already-processed' };

  const now = state.clock.nowMicroseconds();
  claim.processed = true;
  claim.approved = approved;
  claim.processedAt = now;

  if (approved) {
    const policy = state.policies.get(claim.policyId);
    if (!policy) return { success: false, error: 'policy-not-found' };

    const payout =
      claim.claimAmount <= policy.coverageLimit ? claim.claimAmount : policy.coverageLimit;

    claim.payoutAmount = payout;
    state.totalPayouts += payout;

    state.logger.info('Insurance claim approved', {
      claimId,
      payout: String(payout),
    });

    return { success: true, payout };
  } else {
    claim.payoutAmount = 0n;

    state.logger.info('Insurance claim denied', {
      claimId,
    });

    return { success: true, payout: 0n };
  }
}

function flagFraudImpl(
  state: InsuranceMarketState,
  claimId: ClaimId,
  reason: string,
):
  | { readonly success: true; readonly flag: FraudFlag }
  | { readonly success: false; readonly error: string } {
  const claim = state.claims.get(claimId);
  if (!claim) return { success: false, error: 'claim-not-found' };

  const now = state.clock.nowMicroseconds();
  const flagId = state.idGen.generateId();

  const flag: MutableFraudFlag = {
    flagId,
    claimId,
    dynastyId: claim.dynastyId,
    reason,
    flaggedAt: now,
  };

  state.fraudFlags.push(flag);

  state.logger.info('Fraud flag raised', {
    flagId,
    claimId,
    reason,
  });

  return { success: true, flag };
}

function getInsuranceReportImpl(state: InsuranceMarketState): InsuranceReport {
  let totalPolicies = 0;
  let activePolicies = 0;

  for (const policy of state.policies.values()) {
    totalPolicies += 1;
    if (policy.active) activePolicies += 1;
  }

  let totalClaims = 0;
  let approvedClaims = 0;
  let deniedClaims = 0;

  for (const claim of state.claims.values()) {
    totalClaims += 1;
    if (claim.processed) {
      if (claim.approved) {
        approvedClaims += 1;
      } else {
        deniedClaims += 1;
      }
    }
  }

  const fraudFlags = state.fraudFlags.length;
  const generatedAt = state.clock.nowMicroseconds();

  return {
    totalPolicies,
    activePolicies,
    totalClaims,
    approvedClaims,
    deniedClaims,
    fraudFlags,
    totalPremiumsCollected: state.totalPremiumsCollected,
    totalPayouts: state.totalPayouts,
    generatedAt,
  };
}

function renewPolicyImpl(
  state: InsuranceMarketState,
  policyId: PolicyId,
  durationMicroseconds: bigint,
):
  | { readonly success: true; readonly policy: InsurancePolicy }
  | { readonly success: false; readonly error: string } {
  const policy = state.policies.get(policyId);
  if (!policy) return { success: false, error: 'policy-not-found' };
  if (durationMicroseconds <= 0n) {
    return { success: false, error: 'invalid-duration' };
  }

  const now = state.clock.nowMicroseconds();
  policy.expiresAt = now + durationMicroseconds;
  policy.active = true;

  const premiumCalc = calculatePremiumImpl(
    policy.policyType,
    policy.coverageLimit,
    policy.riskMultiplier,
  );
  state.totalPremiumsCollected += premiumCalc.finalPremium;

  state.logger.info('Insurance policy renewed', {
    policyId,
    newExpiresAt: String(policy.expiresAt),
    premium: String(premiumCalc.finalPremium),
  });

  return { success: true, policy };
}

function listPoliciesImpl(
  state: InsuranceMarketState,
  dynastyId: DynastyId,
): ReadonlyArray<InsurancePolicy> {
  const policies: InsurancePolicy[] = [];
  for (const policy of state.policies.values()) {
    if (policy.dynastyId === dynastyId) policies.push(policy);
  }
  return policies;
}

function listClaimsImpl(
  state: InsuranceMarketState,
  dynastyId: DynastyId,
): ReadonlyArray<ClaimRecord> {
  const claims: ClaimRecord[] = [];
  for (const claim of state.claims.values()) {
    if (claim.dynastyId === dynastyId) claims.push(claim);
  }
  return claims;
}
