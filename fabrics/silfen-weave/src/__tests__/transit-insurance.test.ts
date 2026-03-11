/**
 * transit-insurance.test.ts — Unit tests for transit insurance system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTransitInsurance } from '../transit-insurance.js';
import type { TransitInsurance, TransitInsuranceDeps } from '../transit-insurance.js';

// ── Test Helpers ─────────────────────────────────────────────────

const US_PER_DAY = 86_400_000_000;

function mockClock(start = 1_000_000): {
  nowMicroseconds: () => number;
  advance: (us: number) => void;
  set: (us: number) => void;
} {
  let t = start;
  return {
    nowMicroseconds: () => t,
    advance: (us: number) => {
      t += us;
    },
    set: (us: number) => {
      t = us;
    },
  };
}

function mockIdGen(): { generate: () => string } {
  let counter = 0;
  return {
    generate: () => {
      counter += 1;
      return 'ins-' + String(counter);
    },
  };
}

function makeDeps(clock?: ReturnType<typeof mockClock>): TransitInsuranceDeps {
  return {
    clock: clock ?? mockClock(),
    idGenerator: mockIdGen(),
  };
}

function createDefaultPolicy(service: TransitInsurance): string {
  const policy = service.createPolicy({
    dynastyId: 'dynasty-1',
    corridorId: 'corridor-1',
    corridorStability: 80,
    distanceLY: 5,
    coverageAmount: 10_000n,
    durationUs: US_PER_DAY * 30,
  });
  return policy.policyId;
}

// ── Tests: Policy Creation ───────────────────────────────────────

describe('TransitInsurance — policy creation', () => {
  let service: TransitInsurance;

  beforeEach(() => {
    service = createTransitInsurance(makeDeps());
  });

  it('creates an active policy', () => {
    const policy = service.createPolicy({
      dynastyId: 'dynasty-1',
      corridorId: 'corridor-1',
      corridorStability: 80,
      distanceLY: 5,
      coverageAmount: 10_000n,
      durationUs: US_PER_DAY * 30,
    });
    expect(policy.status).toBe('active');
    expect(policy.dynastyId).toBe('dynasty-1');
    expect(policy.corridorId).toBe('corridor-1');
    expect(policy.premium).toBeGreaterThan(0n);
    expect(policy.claimId).toBeNull();
  });

  it('assigns risk tiers based on stability and distance', () => {
    const safe = service.createPolicy({
      dynastyId: 'd1',
      corridorId: 'c1',
      corridorStability: 95,
      distanceLY: 1,
      coverageAmount: 1000n,
      durationUs: US_PER_DAY,
    });
    const dangerous = service.createPolicy({
      dynastyId: 'd2',
      corridorId: 'c2',
      corridorStability: 5,
      distanceLY: 50,
      coverageAmount: 1000n,
      durationUs: US_PER_DAY,
    });
    expect(safe.riskTier).toBe('minimal');
    expect(dangerous.riskTier).toBe('extreme');
  });
});

describe('TransitInsurance — premium calculation', () => {
  let service: TransitInsurance;

  beforeEach(() => {
    service = createTransitInsurance(makeDeps());
  });

  it('charges higher premium for unstable corridors', () => {
    const stablePolicy = service.createPolicy({
      dynastyId: 'd1',
      corridorId: 'c1',
      corridorStability: 95,
      distanceLY: 1,
      coverageAmount: 10_000n,
      durationUs: US_PER_DAY,
    });
    const unstablePolicy = service.createPolicy({
      dynastyId: 'd2',
      corridorId: 'c2',
      corridorStability: 20,
      distanceLY: 1,
      coverageAmount: 10_000n,
      durationUs: US_PER_DAY,
    });
    expect(unstablePolicy.premium).toBeGreaterThan(stablePolicy.premium);
  });

  it('charges higher premium for longer distances', () => {
    const nearPolicy = service.createPolicy({
      dynastyId: 'd1',
      corridorId: 'c1',
      corridorStability: 80,
      distanceLY: 1,
      coverageAmount: 10_000n,
      durationUs: US_PER_DAY,
    });
    const farPolicy = service.createPolicy({
      dynastyId: 'd2',
      corridorId: 'c2',
      corridorStability: 80,
      distanceLY: 25,
      coverageAmount: 10_000n,
      durationUs: US_PER_DAY,
    });
    expect(farPolicy.premium).toBeGreaterThan(nearPolicy.premium);
  });
});

// ── Tests: Policy Retrieval ──────────────────────────────────────

describe('TransitInsurance — policy retrieval', () => {
  it('retrieves a policy by id', () => {
    const service = createTransitInsurance(makeDeps());
    const policyId = createDefaultPolicy(service);
    const found = service.getPolicy(policyId);
    expect(found).toBeDefined();
    expect(found?.policyId).toBe(policyId);
  });

  it('returns undefined for unknown policy', () => {
    const service = createTransitInsurance(makeDeps());
    expect(service.getPolicy('unknown')).toBeUndefined();
  });

  it('auto-expires policy when time passes', () => {
    const clock = mockClock();
    const service = createTransitInsurance(makeDeps(clock));
    const policyId = createDefaultPolicy(service);
    clock.advance(US_PER_DAY * 31);
    const found = service.getPolicy(policyId);
    expect(found?.status).toBe('expired');
  });
});

// ── Tests: Policy Cancellation ───────────────────────────────────

describe('TransitInsurance — cancellation', () => {
  it('cancels an active policy', () => {
    const service = createTransitInsurance(makeDeps());
    const policyId = createDefaultPolicy(service);
    expect(service.cancelPolicy(policyId)).toBe(true);
    expect(service.getPolicy(policyId)?.status).toBe('cancelled');
  });

  it('returns false for unknown policy', () => {
    const service = createTransitInsurance(makeDeps());
    expect(service.cancelPolicy('unknown')).toBe(false);
  });

  it('returns false for already cancelled policy', () => {
    const service = createTransitInsurance(makeDeps());
    const policyId = createDefaultPolicy(service);
    service.cancelPolicy(policyId);
    expect(service.cancelPolicy(policyId)).toBe(false);
  });
});

// ── Tests: Claims ────────────────────────────────────────────────

describe('TransitInsurance — claims', () => {
  let service: TransitInsurance;
  let policyId: string;

  beforeEach(() => {
    service = createTransitInsurance(makeDeps());
    policyId = createDefaultPolicy(service);
  });

  it('approves a valid claim', () => {
    const result = service.fileClaim({ policyId, reason: 'corridor_collapse' });
    expect(result.outcome).toBe('approved');
    if (result.outcome !== 'approved') return;
    expect(result.claim.approved).toBe(true);
    expect(result.claim.payoutAmount).toBeGreaterThan(0n);
    expect(result.claim.reason).toBe('corridor_collapse');
  });

  it('rejects claim for unknown policy', () => {
    const result = service.fileClaim({ policyId: 'unknown', reason: 'test' });
    expect(result.outcome).toBe('policy_not_found');
  });

  it('rejects duplicate claim', () => {
    service.fileClaim({ policyId, reason: 'first' });
    const result = service.fileClaim({ policyId, reason: 'second' });
    expect(result.outcome).toBe('already_claimed');
  });

  it('rejects claim on expired policy', () => {
    const clock = mockClock();
    const svc = createTransitInsurance(makeDeps(clock));
    const pid = createDefaultPolicy(svc);
    clock.advance(US_PER_DAY * 31);
    const result = svc.fileClaim({ policyId: pid, reason: 'late' });
    expect(result.outcome).toBe('policy_expired');
  });

  it('rejects claim on cancelled policy', () => {
    service.cancelPolicy(policyId);
    const result = service.fileClaim({ policyId, reason: 'cancelled' });
    expect(result.outcome).toBe('policy_not_active');
  });

  it('retrieves a claim by id', () => {
    const result = service.fileClaim({ policyId, reason: 'test' });
    if (result.outcome !== 'approved') return;
    const found = service.getClaim(result.claim.claimId);
    expect(found).toBeDefined();
    expect(found?.claimId).toBe(result.claim.claimId);
  });

  it('returns undefined for unknown claim', () => {
    expect(service.getClaim('unknown')).toBeUndefined();
  });

  it('lists claims for a corridor', () => {
    service.fileClaim({ policyId, reason: 'test' });
    const claims = service.listClaims('corridor-1');
    expect(claims).toHaveLength(1);
  });
});

// ── Tests: Risk Assessment ───────────────────────────────────────

describe('TransitInsurance — risk assessment', () => {
  let service: TransitInsurance;

  beforeEach(() => {
    service = createTransitInsurance(makeDeps());
  });

  it('assesses low risk for stable short corridors', () => {
    const assessment = service.assessRisk('c1', 95, 1, 10_000n);
    expect(assessment.riskTier).toBe('minimal');
    expect(assessment.riskScore).toBeLessThan(20);
  });

  it('assesses high risk for unstable long corridors', () => {
    const assessment = service.assessRisk('c1', 5, 50, 10_000n);
    expect(assessment.riskTier).toBe('extreme');
    expect(assessment.riskScore).toBeGreaterThan(70);
  });

  it('provides a suggested premium', () => {
    const assessment = service.assessRisk('c1', 50, 10, 10_000n);
    expect(assessment.suggestedPremium).toBeGreaterThan(0n);
  });
});

// ── Tests: Policy Renewal ────────────────────────────────────────

describe('TransitInsurance — renewal', () => {
  it('renews an expired policy', () => {
    const clock = mockClock();
    const service = createTransitInsurance(makeDeps(clock));
    const policyId = createDefaultPolicy(service);
    clock.advance(US_PER_DAY * 31);
    const result = service.renewPolicy(policyId, US_PER_DAY * 30);
    expect(result.outcome).toBe('renewed');
    expect(result.policy).toBeDefined();
    expect(result.policy?.status).toBe('active');
  });

  it('rejects renewal of active policy', () => {
    const service = createTransitInsurance(makeDeps());
    const policyId = createDefaultPolicy(service);
    const result = service.renewPolicy(policyId, US_PER_DAY * 30);
    expect(result.outcome).toBe('not_expired');
  });

  it('rejects renewal of unknown policy', () => {
    const service = createTransitInsurance(makeDeps());
    const result = service.renewPolicy('unknown', US_PER_DAY);
    expect(result.outcome).toBe('policy_not_found');
  });
});

// ── Tests: Listing ───────────────────────────────────────────────

describe('TransitInsurance — listing', () => {
  let service: TransitInsurance;

  beforeEach(() => {
    service = createTransitInsurance(makeDeps());
    service.createPolicy({
      dynastyId: 'dynasty-1',
      corridorId: 'c1',
      corridorStability: 80,
      distanceLY: 5,
      coverageAmount: 5000n,
      durationUs: US_PER_DAY * 30,
    });
    service.createPolicy({
      dynastyId: 'dynasty-1',
      corridorId: 'c2',
      corridorStability: 60,
      distanceLY: 10,
      coverageAmount: 8000n,
      durationUs: US_PER_DAY * 30,
    });
    service.createPolicy({
      dynastyId: 'dynasty-2',
      corridorId: 'c1',
      corridorStability: 70,
      distanceLY: 7,
      coverageAmount: 3000n,
      durationUs: US_PER_DAY * 30,
    });
  });

  it('lists policies by dynasty', () => {
    expect(service.listByDynasty('dynasty-1')).toHaveLength(2);
    expect(service.listByDynasty('dynasty-2')).toHaveLength(1);
    expect(service.listByDynasty('dynasty-3')).toHaveLength(0);
  });

  it('lists policies by corridor', () => {
    expect(service.listByCorridor('c1')).toHaveLength(2);
    expect(service.listByCorridor('c2')).toHaveLength(1);
  });
});

// ── Tests: Actuarial Stats ───────────────────────────────────────

describe('TransitInsurance — actuarial stats', () => {
  it('reports zero stats initially', () => {
    const service = createTransitInsurance(makeDeps());
    const stats = service.getActuarialStats();
    expect(stats.totalPolicies).toBe(0);
    expect(stats.totalClaims).toBe(0);
    expect(stats.totalPremiumsCollected).toBe(0n);
    expect(stats.totalPayoutsIssued).toBe(0n);
    expect(stats.lossRatio).toBe(0);
  });

  it('reports aggregate stats after operations', () => {
    const service = createTransitInsurance(makeDeps());
    const p1 = createDefaultPolicy(service);
    createDefaultPolicy(service);
    service.fileClaim({ policyId: p1, reason: 'collapse' });
    const stats = service.getActuarialStats();
    expect(stats.totalPolicies).toBe(2);
    expect(stats.activePolicies).toBe(1);
    expect(stats.totalClaims).toBe(1);
    expect(stats.approvedClaims).toBe(1);
    expect(stats.totalPremiumsCollected).toBeGreaterThan(0n);
    expect(stats.totalPayoutsIssued).toBeGreaterThan(0n);
    expect(stats.lossRatio).toBeGreaterThan(0);
    expect(stats.averagePremium).toBeGreaterThan(0n);
  });

  it('tracks expired policies in stats', () => {
    const clock = mockClock();
    const service = createTransitInsurance(makeDeps(clock));
    createDefaultPolicy(service);
    clock.advance(US_PER_DAY * 31);
    const stats = service.getActuarialStats();
    expect(stats.expiredPolicies).toBe(1);
    expect(stats.activePolicies).toBe(0);
  });
});
