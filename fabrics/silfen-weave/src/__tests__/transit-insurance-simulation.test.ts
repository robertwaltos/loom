import { describe, expect, it } from 'vitest';
import { createTransitInsurance } from '../transit-insurance.js';

function makeSystem() {
  let i = 0;
  let now = 1_000_000;
  return {
    advance: (delta: number) => {
      now += delta;
    },
    insurance: createTransitInsurance({
      clock: { nowMicroseconds: () => now },
      idGenerator: { generate: () => `ins-${++i}` },
    }),
  };
}

describe('transit-insurance simulation', () => {
  it('creates risk-tiered policy, approves claim, and updates status', () => {
    const { insurance } = makeSystem();
    const policy = insurance.createPolicy({
      dynastyId: 'd1',
      corridorId: 'c-risky',
      corridorStability: 20,
      distanceLY: 15,
      coverageAmount: 10_000n,
      durationUs: 86_400_000_000,
    });

    expect(policy.riskTier === 'high' || policy.riskTier === 'extreme' || policy.riskTier === 'moderate').toBe(true);
    const claim = insurance.fileClaim({ policyId: policy.policyId, reason: 'corridor_collapse' });
    expect(claim.outcome).toBe('approved');
    expect(insurance.getPolicy(policy.policyId)?.status).toBe('claimed');
  });
});
