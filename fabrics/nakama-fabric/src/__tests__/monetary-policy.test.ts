import { describe, it, expect } from 'vitest';
import { createMonetaryPolicySystem, type MonetaryPolicySystem } from '../monetary-policy.js';

function makeDeps() {
  let time = 1_000_000n;
  let idSeq = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000n) },
    idGen: { generate: () => `id-${String(++idSeq)}` },
    logger: { info: () => {} },
  };
}

function makeSystem(): { system: MonetaryPolicySystem } {
  const system = createMonetaryPolicySystem(makeDeps());
  return { system };
}

// ── registerWorld ─────────────────────────────────────────────────────────────

describe('registerWorld', () => {
  it('registers a world successfully', () => {
    const { system } = makeSystem();
    const result = system.registerWorld('world-1');
    expect(result.success).toBe(true);
  });

  it('returns already-registered for duplicate world', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1');
    const result = system.registerWorld('world-1');
    expect(result).toEqual({ success: false, error: 'already-registered' });
  });

  it('allows multiple distinct worlds', () => {
    const { system } = makeSystem();
    expect(system.registerWorld('world-1').success).toBe(true);
    expect(system.registerWorld('world-2').success).toBe(true);
  });
});

// ── setPolicy ─────────────────────────────────────────────────────────────────

describe('setPolicy', () => {
  it('creates an INTEREST_RATE policy', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1');
    const result = system.setPolicy('world-1', 'INTEREST_RATE', 5, 'Fight inflation');
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.tool).toBe('INTEREST_RATE');
      expect(result.targetValue).toBe(5);
      expect(result.locked).toBe(false);
    }
  });

  it('returns world-not-found for unregistered world', () => {
    const { system } = makeSystem();
    const result = system.setPolicy('unknown', 'INTEREST_RATE', 5, 'test');
    expect(result).toBe('world-not-found');
  });

  it('rejects INTEREST_RATE above 50', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1');
    expect(system.setPolicy('world-1', 'INTEREST_RATE', 51, 'test')).toBe('invalid-rate');
  });

  it('rejects INTEREST_RATE below 0', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1');
    expect(system.setPolicy('world-1', 'INTEREST_RATE', -1, 'test')).toBe('invalid-rate');
  });

  it('rejects RESERVE_REQUIREMENT above 100', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1');
    expect(system.setPolicy('world-1', 'RESERVE_REQUIREMENT', 101, 'test')).toBe('invalid-target');
  });

  it('accepts RESERVE_REQUIREMENT at boundary 100', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1');
    const result = system.setPolicy('world-1', 'RESERVE_REQUIREMENT', 100, 'max reserve');
    expect(typeof result).toBe('object');
  });

  it('rejects OPEN_MARKET with non-positive value', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1');
    expect(system.setPolicy('world-1', 'OPEN_MARKET', 0, 'test')).toBe('invalid-target');
    expect(system.setPolicy('world-1', 'OPEN_MARKET', -10, 'test')).toBe('invalid-target');
  });

  it('accepts EMERGENCY_FACILITY with positive value', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1');
    const result = system.setPolicy('world-1', 'EMERGENCY_FACILITY', 500000, 'crisis');
    expect(typeof result).toBe('object');
  });
});

// ── lockPolicy ────────────────────────────────────────────────────────────────

describe('lockPolicy', () => {
  it('locks a policy', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1');
    const policy = system.setPolicy('world-1', 'INTEREST_RATE', 5, 'test') as { policyId: string };
    const result = system.lockPolicy(policy.policyId);
    expect(result.success).toBe(true);
    const fetched = system.getPolicy(policy.policyId);
    expect(fetched?.locked).toBe(true);
  });

  it('returns policy-not-found for unknown policyId', () => {
    const { system } = makeSystem();
    const result = system.lockPolicy('ghost');
    expect(result).toEqual({ success: false, error: 'policy-not-found' });
  });

  it('prevents new policy for same tool when existing is locked', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1');
    const policy = system.setPolicy('world-1', 'INTEREST_RATE', 5, 'test') as { policyId: string };
    system.lockPolicy(policy.policyId);
    const result = system.setPolicy('world-1', 'INTEREST_RATE', 10, 'new');
    expect(result).toBe('policy-locked');
  });
});

// ── updateCurrentValue ────────────────────────────────────────────────────────

describe('updateCurrentValue', () => {
  it('updates the current value of an unlocked policy', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1');
    const policy = system.setPolicy('world-1', 'INTEREST_RATE', 5, 'test') as { policyId: string };
    const result = system.updateCurrentValue(policy.policyId, 4.5);
    expect(result.success).toBe(true);
    expect(system.getPolicy(policy.policyId)?.currentValue).toBe(4.5);
  });

  it('rejects update on a locked policy', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1');
    const policy = system.setPolicy('world-1', 'INTEREST_RATE', 5, 'test') as { policyId: string };
    system.lockPolicy(policy.policyId);
    const result = system.updateCurrentValue(policy.policyId, 3);
    expect(result).toEqual({ success: false, error: 'policy-locked' });
  });

  it('returns policy-not-found for unknown policy', () => {
    const { system } = makeSystem();
    expect(system.updateCurrentValue('x', 1)).toEqual({
      success: false,
      error: 'policy-not-found',
    });
  });
});

// ── applyPolicy ───────────────────────────────────────────────────────────────

describe('applyPolicy', () => {
  it('returns effects for INTEREST_RATE policy', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1');
    const policy = system.setPolicy('world-1', 'INTEREST_RATE', 5, 'test') as { policyId: string };
    const result = system.applyPolicy(policy.policyId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.effects.length).toBeGreaterThan(0);
      expect(result.effects[0]?.metric).toBeTruthy();
    }
  });

  it('returns policy-not-found for unknown policy', () => {
    const { system } = makeSystem();
    expect(system.applyPolicy('ghost')).toEqual({ success: false, error: 'policy-not-found' });
  });

  it('produces correct metric names for RESERVE_REQUIREMENT', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1');
    const policy = system.setPolicy('world-1', 'RESERVE_REQUIREMENT', 20, 'stability') as {
      policyId: string;
    };
    const result = system.applyPolicy(policy.policyId);
    if (result.success) {
      const metrics = result.effects.map((e) => e.metric);
      expect(metrics).toContain('credit_availability');
    }
  });
});

// ── getReport ─────────────────────────────────────────────────────────────────

describe('getReport', () => {
  it('returns report for registered world', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1');
    const report = system.getReport('world-1');
    expect(report).toBeDefined();
    expect(report?.worldId).toBe('world-1');
    expect(report?.activePolicies).toBe(0);
  });

  it('returns undefined for unknown world', () => {
    const { system } = makeSystem();
    expect(system.getReport('ghost')).toBeUndefined();
  });

  it('averages INTEREST_RATE policies correctly', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1');
    const p1 = system.setPolicy('world-1', 'INTEREST_RATE', 4, 'r1') as { policyId: string };
    system.updateCurrentValue(p1.policyId, 4);
    const p2 = system.setPolicy('world-1', 'INTEREST_RATE', 6, 'r2') as { policyId: string };
    system.updateCurrentValue(p2.policyId, 6);
    const report = system.getReport('world-1');
    expect(report?.averageInterestRate).toBe(5);
  });

  it('computes openMarketBalance correctly', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1');
    system.setPolicy('world-1', 'OPEN_MARKET', 100, 'buy bonds');
    const report = system.getReport('world-1');
    expect(report?.openMarketBalance).toBe(100_000_000n);
  });

  it('uses most recent RESERVE_REQUIREMENT for reserveRequirement', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1');
    const p1 = system.setPolicy('world-1', 'RESERVE_REQUIREMENT', 10, 'r1') as { policyId: string };
    system.updateCurrentValue(p1.policyId, 10);
    const p2 = system.setPolicy('world-1', 'RESERVE_REQUIREMENT', 20, 'r2') as { policyId: string };
    system.updateCurrentValue(p2.policyId, 20);
    const report = system.getReport('world-1');
    expect(report?.reserveRequirement).toBe(20);
  });
});

// ── listPolicies ──────────────────────────────────────────────────────────────

describe('listPolicies', () => {
  it('lists all policies for a world', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1');
    system.setPolicy('world-1', 'INTEREST_RATE', 5, 'test');
    system.setPolicy('world-1', 'OPEN_MARKET', 1000, 'test');
    expect(system.listPolicies('world-1').length).toBe(2);
  });

  it('filters by tool when provided', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1');
    system.setPolicy('world-1', 'INTEREST_RATE', 5, 'test');
    system.setPolicy('world-1', 'OPEN_MARKET', 1000, 'test');
    const filtered = system.listPolicies('world-1', 'INTEREST_RATE');
    expect(filtered.length).toBe(1);
    expect(filtered[0]?.tool).toBe('INTEREST_RATE');
  });

  it('returns empty array for world with no policies', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1');
    expect(system.listPolicies('world-1').length).toBe(0);
  });

  it('returns empty array for unregistered world', () => {
    const { system } = makeSystem();
    expect(system.listPolicies('ghost').length).toBe(0);
  });
});
