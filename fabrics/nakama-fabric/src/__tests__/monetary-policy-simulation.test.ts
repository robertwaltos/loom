import { describe, expect, it } from 'vitest';
import { createMonetaryPolicySystem } from '../monetary-policy.js';

describe('monetary-policy simulation', () => {
  const make = () => {
    let now = 1_000_000n;
    let id = 0;
    return createMonetaryPolicySystem({
      clock: { nowMicroseconds: () => (now += 1_000n) },
      idGen: { generate: () => `mp-${++id}` },
      logger: { info: () => undefined },
    });
  };

  it('simulates multi-tool policy stack and resulting world-level monetary report', () => {
    const policy = make();

    policy.registerWorld('earth');

    const ir = policy.setPolicy('earth', 'INTEREST_RATE', 6, 'cool inflation');
    const rr = policy.setPolicy('earth', 'RESERVE_REQUIREMENT', 18, 'tighten reserves');
    const om = policy.setPolicy('earth', 'OPEN_MARKET', 250, 'bond operations');

    expect(typeof ir === 'object' && typeof rr === 'object' && typeof om === 'object').toBe(true);
    if (typeof ir !== 'object' || typeof rr !== 'object' || typeof om !== 'object') return;

    policy.updateCurrentValue(ir.policyId, 5.5);
    policy.updateCurrentValue(rr.policyId, 19);

    const applied = policy.applyPolicy(ir.policyId);
    expect(applied.success).toBe(true);

    const report = policy.getReport('earth');
    expect(report?.activePolicies).toBe(3);
    expect(report?.averageInterestRate).toBe(5.5);
    expect(report?.reserveRequirement).toBe(19);
    expect(report?.openMarketBalance).toBe(250_000_000n);
  });

  it('simulates locked policy governance preventing mutable overrides', () => {
    const policy = make();
    policy.registerWorld('mars');

    const base = policy.setPolicy('mars', 'INTEREST_RATE', 4, 'baseline');
    expect(typeof base).toBe('object');
    if (typeof base !== 'object') return;

    const locked = policy.lockPolicy(base.policyId);
    expect(locked.success).toBe(true);

    const update = policy.updateCurrentValue(base.policyId, 3.5);
    expect(update.success).toBe(false);

    const duplicateTool = policy.setPolicy('mars', 'INTEREST_RATE', 7, 'override attempt');
    expect(duplicateTool).toBe('policy-locked');
  });
});
