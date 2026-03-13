import { describe, expect, it } from 'vitest';
import { createInsuranceMarketSystem } from '../insurance-market.js';

describe('insurance-market simulation', () => {
  const make = () => {
    let now = 1_000_000n;
    let ids = 0;

    return createInsuranceMarketSystem({
      clock: {
        nowMicroseconds: () => now,
      },
      idGen: {
        generateId: () => `ins-${++ids}`,
      },
      logger: {
        info: () => undefined,
      },
    });
  };

  it('simulates policy issuance, claims lifecycle, fraud flags, and report aggregation', () => {
    const insurance = make();

    const d1 = insurance.issuePolicy('dyn-1', 'TRANSIT_LOSS', 10_000n * 1_000_000n, 1.2, 30n * 86_400n * 1_000_000n);
    const d2 = insurance.issuePolicy('dyn-2', 'PROPERTY_DAMAGE', 20_000n * 1_000_000n, 0.9, 60n * 86_400n * 1_000_000n);

    expect(d1.success).toBe(true);
    expect(d2.success).toBe(true);
    if (!d1.success || !d2.success) return;

    const c1 = insurance.fileClaim(d1.policy.policyId, 2_000n * 1_000_000n, 'ev-1');
    const c2 = insurance.fileClaim(d1.policy.policyId, 1_000n * 1_000_000n, 'ev-2');
    const c3 = insurance.fileClaim(d2.policy.policyId, 5_000n * 1_000_000n, 'ev-3');

    expect(c1.success && c2.success && c3.success).toBe(true);
    if (!c1.success || !c2.success || !c3.success) return;

    const p1 = insurance.processClaim(c1.claim.claimId, true);
    const p2 = insurance.processClaim(c2.claim.claimId, false);
    const p3 = insurance.processClaim(c3.claim.claimId, true);

    expect(p1.success && p2.success && p3.success).toBe(true);
    expect(p1.success && p1.payout).toBe(2_000n * 1_000_000n);
    expect(p2.success && p2.payout).toBe(0n);

    const fraud = insurance.flagFraud(c2.claim.claimId, 'mismatch-signature');
    expect(fraud.success).toBe(true);

    const report = insurance.getInsuranceReport();
    expect(report.totalPolicies).toBe(2);
    expect(report.totalClaims).toBe(3);
    expect(report.approvedClaims).toBe(2);
    expect(report.deniedClaims).toBe(1);
    expect(report.fraudFlags).toBe(1);
    expect(report.totalPayouts).toBe(7_000n * 1_000_000n);
  });

  it('simulates renewal and dynasty-scoped listing views', () => {
    let now = 1_000_000n;
    let ids = 0;
    const insurance = createInsuranceMarketSystem({
      clock: {
        nowMicroseconds: () => now,
      },
      idGen: {
        generateId: () => `ins-${++ids}`,
      },
      logger: {
        info: () => undefined,
      },
    });

    const policy = insurance.issuePolicy('dyn-1', 'LIFE', 50_000n * 1_000_000n, 1.0, 10n * 86_400n * 1_000_000n);
    expect(policy.success).toBe(true);
    if (!policy.success) return;

    now += 15n * 86_400n * 1_000_000n;
    const expiredClaim = insurance.fileClaim(policy.policy.policyId, 1_000n * 1_000_000n, 'late');
    expect(expiredClaim.success).toBe(false);

    const renewed = insurance.renewPolicy(policy.policy.policyId, 20n * 86_400n * 1_000_000n);
    expect(renewed.success).toBe(true);

    const afterRenew = insurance.fileClaim(policy.policy.policyId, 1_000n * 1_000_000n, 'fresh');
    expect(afterRenew.success).toBe(true);

    insurance.issuePolicy('dyn-2', 'CROP_FAILURE', 5_000n * 1_000_000n, 1.1, 30n * 86_400n * 1_000_000n);

    expect(insurance.listPolicies('dyn-1')).toHaveLength(1);
    expect(insurance.listClaims('dyn-1')).toHaveLength(1);
    expect(insurance.listPolicies('dyn-2')).toHaveLength(1);
    expect(insurance.listClaims('dyn-2')).toHaveLength(0);
  });
});
