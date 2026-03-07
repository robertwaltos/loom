import { describe, it, expect } from 'vitest';
import {
  createContinuityBondEngine,
  BASE_BONDS,
  MAX_BONDS,
  CHRONICLE_ENTRIES_PER_BOND,
  MAX_GOVERNANCE_BOND_VOTES,
} from '../continuity-bonds.js';
import type { ContinuityState } from '../dynasty-continuity.js';

const US_PER_DAY = 24 * 60 * 60 * 1_000_000;

function createTestClock(initialDays = 0) {
  let time = initialDays * US_PER_DAY;
  return {
    nowMicroseconds: () => time,
    advanceDays(days: number) { time += days * US_PER_DAY; },
  };
}

function createTestEngine(initialDays = 0) {
  const clock = createTestClock(initialDays);
  const engine = createContinuityBondEngine({ clock });
  return { engine, clock };
}

// ─── Initialization ──────────────────────────────────────────────────

describe('ContinuityBondEngine initialization', () => {
  it('creates record with base bond count', () => {
    const { engine } = createTestEngine();
    const record = engine.initializeRecord('house-atreides');
    expect(record.dynastyId).toBe('house-atreides');
    expect(record.bondCount).toBe(BASE_BONDS);
    expect(record.maxBonds).toBe(MAX_BONDS);
    expect(record.totalEarned).toBe(0);
    expect(record.totalSpent).toBe(0);
    expect(record.spendHistory).toEqual([]);
  });

  it('base bonds equals 3', () => {
    expect(BASE_BONDS).toBe(3);
  });

  it('max bonds equals 7', () => {
    expect(MAX_BONDS).toBe(7);
  });

  it('rejects duplicate records', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('house-atreides');
    expect(() => engine.initializeRecord('house-atreides'))
      .toThrow('already exists');
  });

  it('throws for unknown dynasty on get', () => {
    const { engine } = createTestEngine();
    expect(() => engine.getRecord('nope')).toThrow('not found');
  });

  it('returns undefined for unknown dynasty on tryGet', () => {
    const { engine } = createTestEngine();
    expect(engine.tryGetRecord('nope')).toBeUndefined();
  });

  it('counts records', () => {
    const { engine } = createTestEngine();
    expect(engine.count()).toBe(0);
    engine.initializeRecord('d1');
    expect(engine.count()).toBe(1);
    engine.initializeRecord('d2');
    expect(engine.count()).toBe(2);
  });
});

// ─── Earning: individual sources ─────────────────────────────────────

describe('ContinuityBondEngine earning sources', () => {
  it('earns 1 bond per 100 chronicle entries', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    const total = engine.evaluateEarnings('d1', {
      chronicleEntryCount: 200,
      worldTransitions: 0,
      governanceVotes: 0,
    });
    expect(total).toBe(BASE_BONDS + 2);
  });

  it('floors chronicle entries (99 entries = 0 bonds)', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    const total = engine.evaluateEarnings('d1', {
      chronicleEntryCount: 99,
      worldTransitions: 0,
      governanceVotes: 0,
    });
    expect(total).toBe(BASE_BONDS);
  });

  it('earns 1 bond per world transition', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    const total = engine.evaluateEarnings('d1', {
      chronicleEntryCount: 0,
      worldTransitions: 2,
      governanceVotes: 0,
    });
    expect(total).toBe(BASE_BONDS + 2);
  });

  it('earns 1 bond per governance vote up to 50', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    const total = engine.evaluateEarnings('d1', {
      chronicleEntryCount: 0,
      worldTransitions: 0,
      governanceVotes: 50,
    });
    expect(total).toBe(BASE_BONDS + 50 > MAX_BONDS ? MAX_BONDS : BASE_BONDS + 50);
  });

  it('caps governance bond contribution at 50 votes', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    const total = engine.evaluateEarnings('d1', {
      chronicleEntryCount: 0,
      worldTransitions: 0,
      governanceVotes: 100,
    });
    expect(total).toBe(MAX_BONDS);
  });
});

// ─── Earning: caps and combinations ──────────────────────────────────

describe('ContinuityBondEngine earning caps', () => {
  it('enforces maximum bond cap', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    const total = engine.evaluateEarnings('d1', {
      chronicleEntryCount: 500,
      worldTransitions: 3,
      governanceVotes: 2,
    });
    expect(total).toBe(MAX_BONDS);
  });

  it('combines all earning sources', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    const total = engine.evaluateEarnings('d1', {
      chronicleEntryCount: 100,
      worldTransitions: 1,
      governanceVotes: 1,
    });
    expect(total).toBe(6);
  });

  it('returns new bond count after evaluation', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    const total = engine.evaluateEarnings('d1', {
      chronicleEntryCount: 100,
      worldTransitions: 0,
      governanceVotes: 0,
    });
    expect(total).toBe(4);
    const record = engine.getRecord('d1');
    expect(record.bondCount).toBe(4);
    expect(record.totalEarned).toBe(1);
  });

  it('throws for unknown dynasty on evaluateEarnings', () => {
    const { engine } = createTestEngine();
    expect(() => engine.evaluateEarnings('nope', {
      chronicleEntryCount: 0,
      worldTransitions: 0,
      governanceVotes: 0,
    })).toThrow('not found');
  });

  it('exported constants match expected values', () => {
    expect(CHRONICLE_ENTRIES_PER_BOND).toBe(100);
    expect(MAX_GOVERNANCE_BOND_VOTES).toBe(50);
  });
});

// ─── Spending: valid transitions ─────────────────────────────────────

describe('ContinuityBondEngine spending valid transitions', () => {
  it('spends bond from dormant_30 to active', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('d1');
    clock.advanceDays(1);
    const spend = engine.spendBond('d1', 'dormant_30');
    expect(spend.fromState).toBe('dormant_30');
    expect(spend.toState).toBe('active');
    expect(spend.at).toBe(1 * US_PER_DAY);
  });

  it('spends bond from dormant_60 to dormant_30', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    const spend = engine.spendBond('d1', 'dormant_60');
    expect(spend.fromState).toBe('dormant_60');
    expect(spend.toState).toBe('dormant_30');
  });

  it('spends bond from grace_window to dormant_60', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    const spend = engine.spendBond('d1', 'grace_window');
    expect(spend.fromState).toBe('grace_window');
    expect(spend.toState).toBe('dormant_60');
  });

  it('spends bond from continuity_triggered to grace_window', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    const spend = engine.spendBond('d1', 'continuity_triggered');
    expect(spend.fromState).toBe('continuity_triggered');
    expect(spend.toState).toBe('grace_window');
  });

  it('decrements bond count on spend', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    expect(engine.getRecord('d1').bondCount).toBe(3);
    engine.spendBond('d1', 'dormant_30');
    expect(engine.getRecord('d1').bondCount).toBe(2);
    engine.spendBond('d1', 'dormant_30');
    expect(engine.getRecord('d1').bondCount).toBe(1);
  });

  it('increments totalSpent on each spend', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    engine.spendBond('d1', 'dormant_30');
    engine.spendBond('d1', 'dormant_30');
    const record = engine.getRecord('d1');
    expect(record.totalSpent).toBe(2);
  });
});

// ─── Spending: rejections ────────────────────────────────────────────

describe('ContinuityBondEngine spending rejections', () => {
  it('rejects spend when bond count is zero', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    engine.spendBond('d1', 'dormant_30');
    engine.spendBond('d1', 'dormant_30');
    engine.spendBond('d1', 'dormant_30');
    expect(() => engine.spendBond('d1', 'dormant_30'))
      .toThrow('Invalid continuity transition');
  });

  it('rejects spend from active state', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    expect(() => engine.spendBond('d1', 'active'))
      .toThrow('Invalid continuity transition');
  });

  it('rejects spend from redistribution state', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    expect(() => engine.spendBond('d1', 'redistribution'))
      .toThrow('Invalid continuity transition');
  });

  it('rejects spend from completed state', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    expect(() => engine.spendBond('d1', 'completed'))
      .toThrow('Invalid continuity transition');
  });

  it('rejects spend from vigil state', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    expect(() => engine.spendBond('d1', 'vigil'))
      .toThrow('Invalid continuity transition');
  });

  it('rejects spend from heir_activated state', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    expect(() => engine.spendBond('d1', 'heir_activated'))
      .toThrow('Invalid continuity transition');
  });

  it('rejects spend from legacy_npc state', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    expect(() => engine.spendBond('d1', 'legacy_npc'))
      .toThrow('Invalid continuity transition');
  });

  it('throws for unknown dynasty on spendBond', () => {
    const { engine } = createTestEngine();
    expect(() => engine.spendBond('nope', 'dormant_30'))
      .toThrow('not found');
  });
});

// ─── canSpend ────────────────────────────────────────────────────────

describe('ContinuityBondEngine canSpend', () => {
  it('returns true for valid crisis states with bonds available', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    expect(engine.canSpend('d1', 'dormant_30')).toBe(true);
    expect(engine.canSpend('d1', 'dormant_60')).toBe(true);
    expect(engine.canSpend('d1', 'grace_window')).toBe(true);
    expect(engine.canSpend('d1', 'continuity_triggered')).toBe(true);
  });

  it('returns false for non-crisis states', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    const invalidStates: ContinuityState[] = [
      'active', 'redistribution', 'completed', 'vigil', 'heir_activated', 'legacy_npc',
    ];
    for (const state of invalidStates) {
      expect(engine.canSpend('d1', state)).toBe(false);
    }
  });

  it('returns false when bond count is zero', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    engine.spendBond('d1', 'dormant_30');
    engine.spendBond('d1', 'dormant_30');
    engine.spendBond('d1', 'dormant_30');
    expect(engine.canSpend('d1', 'dormant_30')).toBe(false);
  });

  it('returns false for unknown dynasty', () => {
    const { engine } = createTestEngine();
    expect(engine.canSpend('nope', 'dormant_30')).toBe(false);
  });
});

// ─── Spend History ───────────────────────────────────────────────────

describe('ContinuityBondEngine spend history', () => {
  it('records spend history with timestamps', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('d1');

    clock.advanceDays(10);
    engine.spendBond('d1', 'dormant_30');

    clock.advanceDays(5);
    engine.spendBond('d1', 'dormant_60');

    const record = engine.getRecord('d1');
    expect(record.spendHistory).toHaveLength(2);

    expect(record.spendHistory[0]?.fromState).toBe('dormant_30');
    expect(record.spendHistory[0]?.toState).toBe('active');
    expect(record.spendHistory[0]?.at).toBe(10 * US_PER_DAY);

    expect(record.spendHistory[1]?.fromState).toBe('dormant_60');
    expect(record.spendHistory[1]?.toState).toBe('dormant_30');
    expect(record.spendHistory[1]?.at).toBe(15 * US_PER_DAY);
  });

  it('spend history is immutable on returned record', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');
    engine.spendBond('d1', 'dormant_30');

    const record1 = engine.getRecord('d1');
    expect(record1.spendHistory).toHaveLength(1);

    engine.spendBond('d1', 'dormant_60');
    // record1 should still show 1 entry (snapshot)
    expect(record1.spendHistory).toHaveLength(1);

    const record2 = engine.getRecord('d1');
    expect(record2.spendHistory).toHaveLength(2);
  });
});

// ─── Integration ─────────────────────────────────────────────────────

describe('ContinuityBondEngine integration', () => {
  it('earn then spend lifecycle', () => {
    const { engine, clock } = createTestEngine();
    engine.initializeRecord('d1');

    // Earn 1 bond from chronicle entries
    engine.evaluateEarnings('d1', {
      chronicleEntryCount: 100,
      worldTransitions: 0,
      governanceVotes: 0,
    });
    expect(engine.getRecord('d1').bondCount).toBe(4);

    // Spend all 4 bonds
    clock.advanceDays(1);
    engine.spendBond('d1', 'continuity_triggered');
    engine.spendBond('d1', 'dormant_30');
    engine.spendBond('d1', 'grace_window');
    engine.spendBond('d1', 'dormant_60');

    const record = engine.getRecord('d1');
    expect(record.bondCount).toBe(0);
    expect(record.totalSpent).toBe(4);
    expect(record.totalEarned).toBe(1);
    expect(record.spendHistory).toHaveLength(4);
  });

  it('earning after spending restores bond count correctly', () => {
    const { engine } = createTestEngine();
    engine.initializeRecord('d1');

    // Spend 2 bonds
    engine.spendBond('d1', 'dormant_30');
    engine.spendBond('d1', 'dormant_30');
    expect(engine.getRecord('d1').bondCount).toBe(1);

    // Re-evaluate earnings with 200 entries = 2 earned bonds
    // base 3 + 2 earned = 5
    engine.evaluateEarnings('d1', {
      chronicleEntryCount: 200,
      worldTransitions: 0,
      governanceVotes: 0,
    });
    expect(engine.getRecord('d1').bondCount).toBe(5);
  });
});
