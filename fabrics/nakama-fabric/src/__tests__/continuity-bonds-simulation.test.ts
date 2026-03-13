import { beforeEach, describe, expect, it } from 'vitest';
import {
  BASE_BONDS,
  MAX_BONDS,
  MAX_GOVERNANCE_BOND_VOTES,
  createContinuityBondEngine,
} from '../continuity-bonds.js';

describe('continuity-bonds simulation', () => {
  let nowUs: number;

  const clock = {
    nowMicroseconds: (): number => nowUs,
  };

  beforeEach(() => {
    nowUs = 1_000_000;
  });

  it('initializes with base bonds and no spend history', () => {
    const engine = createContinuityBondEngine({ clock });
    const record = engine.initializeRecord('house-a');

    expect(record.bondCount).toBe(BASE_BONDS);
    expect(record.totalEarned).toBe(0);
    expect(record.totalSpent).toBe(0);
    expect(record.spendHistory).toEqual([]);
  });

  it('caps evaluated bond count at max bonds under large activity inputs', () => {
    const engine = createContinuityBondEngine({ clock });
    engine.initializeRecord('house-b');

    const bondCount = engine.evaluateEarnings('house-b', {
      chronicleEntryCount: 2_000,
      worldTransitions: 100,
      governanceVotes: 500,
    });

    expect(bondCount).toBe(MAX_BONDS);
    expect(engine.getRecord('house-b').bondCount).toBe(MAX_BONDS);
  });

  it('recovers continuity_triggered state back to active through sequential spends', () => {
    const engine = createContinuityBondEngine({ clock });
    engine.initializeRecord('house-c');

    // Earn one extra bond so four crisis-step spends are possible in one simulation.
    engine.evaluateEarnings('house-c', {
      chronicleEntryCount: 100,
      worldTransitions: 0,
      governanceVotes: 0,
    });

    const step1 = engine.spendBond('house-c', 'continuity_triggered');
    const step2 = engine.spendBond('house-c', 'grace_window');
    const step3 = engine.spendBond('house-c', 'dormant_60');
    const step4 = engine.spendBond('house-c', 'dormant_30');

    expect(step1.toState).toBe('grace_window');
    expect(step2.toState).toBe('dormant_60');
    expect(step3.toState).toBe('dormant_30');
    expect(step4.toState).toBe('active');
    expect(engine.getRecord('house-c').bondCount).toBe(0);
  });

  it('blocks further spending after bonds are exhausted and canSpend reflects depletion', () => {
    const engine = createContinuityBondEngine({ clock });
    engine.initializeRecord('house-d');

    engine.spendBond('house-d', 'dormant_30');
    engine.spendBond('house-d', 'dormant_30');
    engine.spendBond('house-d', 'dormant_30');

    expect(engine.canSpend('house-d', 'dormant_30')).toBe(false);
    expect(() => engine.spendBond('house-d', 'dormant_30')).toThrow('Invalid continuity transition');
  });

  it('tracks spend history in chronological order with exact clock timestamps', () => {
    const engine = createContinuityBondEngine({ clock });
    engine.initializeRecord('house-e');

    nowUs = 1_100_000;
    engine.spendBond('house-e', 'dormant_60');

    nowUs = 1_300_000;
    engine.spendBond('house-e', 'grace_window');

    const history = engine.getRecord('house-e').spendHistory;
    expect(history).toHaveLength(2);
    expect(history[0]?.at).toBe(1_100_000);
    expect(history[1]?.at).toBe(1_300_000);
    expect(history[0]?.toState).toBe('dormant_30');
    expect(history[1]?.toState).toBe('dormant_60');
  });

  it('treats governance vote contribution as capped at exported governance vote limit', () => {
    const engine = createContinuityBondEngine({ clock });
    engine.initializeRecord('house-f');

    engine.evaluateEarnings('house-f', {
      chronicleEntryCount: 0,
      worldTransitions: 0,
      governanceVotes: MAX_GOVERNANCE_BOND_VOTES,
    });
    const atCap = engine.getRecord('house-f');

    engine.evaluateEarnings('house-f', {
      chronicleEntryCount: 0,
      worldTransitions: 0,
      governanceVotes: MAX_GOVERNANCE_BOND_VOTES + 500,
    });
    const aboveCap = engine.getRecord('house-f');

    expect(aboveCap.totalEarned).toBe(atCap.totalEarned);
    expect(aboveCap.bondCount).toBe(atCap.bondCount);
  });

  it('evaluates earnings as snapshot replacement rather than cumulative accumulation', () => {
    const engine = createContinuityBondEngine({ clock });
    engine.initializeRecord('house-g');

    engine.evaluateEarnings('house-g', {
      chronicleEntryCount: 500,
      worldTransitions: 1,
      governanceVotes: 1,
    });
    const first = engine.getRecord('house-g');

    engine.evaluateEarnings('house-g', {
      chronicleEntryCount: 0,
      worldTransitions: 0,
      governanceVotes: 0,
    });
    const second = engine.getRecord('house-g');

    expect(first.totalEarned).toBeGreaterThan(0);
    expect(second.totalEarned).toBe(0);
    expect(second.bondCount).toBe(BASE_BONDS);
  });

  it('isolates records across dynasties for earning and spending activity', () => {
    const engine = createContinuityBondEngine({ clock });
    engine.initializeRecord('house-h1');
    engine.initializeRecord('house-h2');

    engine.evaluateEarnings('house-h1', {
      chronicleEntryCount: 100,
      worldTransitions: 1,
      governanceVotes: 1,
    });
    engine.spendBond('house-h1', 'dormant_30');

    const one = engine.getRecord('house-h1');
    const two = engine.getRecord('house-h2');

    expect(one.totalSpent).toBe(1);
    expect(two.totalSpent).toBe(0);
    expect(two.bondCount).toBe(BASE_BONDS);
  });

  it('rejects spending from non-crisis states while allowing crisis states', () => {
    const engine = createContinuityBondEngine({ clock });
    engine.initializeRecord('house-i');

    expect(engine.canSpend('house-i', 'active')).toBe(false);
    expect(engine.canSpend('house-i', 'dormant_30')).toBe(true);
    expect(() => engine.spendBond('house-i', 'active')).toThrow('Invalid continuity transition');
  });

  it('handles unknown dynasty lookups consistently across read and spend APIs', () => {
    const engine = createContinuityBondEngine({ clock });

    expect(engine.tryGetRecord('unknown')).toBeUndefined();
    expect(engine.canSpend('unknown', 'dormant_30')).toBe(false);
    expect(() => engine.getRecord('unknown')).toThrow('not found');
    expect(() => engine.spendBond('unknown', 'dormant_30')).toThrow('not found');
  });
});
