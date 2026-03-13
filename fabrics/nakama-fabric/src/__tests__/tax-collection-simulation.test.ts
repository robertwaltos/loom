/**
 * Tax Collection - Simulation Tests
 *
 * Exercises multi-cycle taxation behavior and system-level invariants.
 */

import { describe, expect, it } from 'vitest';
import {
  BRACKET_RATES_BPS,
  BRACKET_THRESHOLDS,
  MICRO_KALON,
  createTaxCollectionEngine,
  type TaxCollectionEngine,
  type TaxCollectionResult,
  type TaxDeps,
} from '../tax-collection.js';

function mk(kalon: bigint): bigint {
  return kalon * MICRO_KALON;
}

function createHarness(): {
  engine: TaxCollectionEngine;
  deps: TaxDeps & { advance: (us: number) => void };
} {
  let now = 1_000_000;
  let id = 0;

  const deps: TaxDeps & { advance: (us: number) => void } = {
    advance: (us: number) => {
      now += us;
    },
    clock: {
      nowMicroseconds: () => now,
    },
    idGenerator: {
      next: () => {
        id += 1;
        return `tax-id-${String(id)}`;
      },
    },
  };

  return {
    engine: createTaxCollectionEngine(deps),
    deps,
  };
}

function isCollection(value: TaxCollectionResult | string): value is TaxCollectionResult {
  return typeof value !== 'string';
}

describe('tax collection simulation', () => {
  it('routes all collected tax into commons fund across multi-cycle growth', () => {
    const { engine, deps } = createHarness();

    const balances = [mk(800n), mk(1_500n), mk(12_000n), mk(140_000n)];

    let cumulative = 0n;
    for (const balance of balances) {
      const result = engine.collectTax('dyn:atlas', balance);
      expect(isCollection(result)).toBe(true);
      if (!isCollection(result)) return;
      cumulative += result.collectedMicroKalon;
      deps.advance(10_000);
    }

    expect(engine.commonsFundTotal()).toBe(cumulative);
    const roll = engine.getTaxRoll();
    expect(roll.totalCollectedMicroKalon).toBe(cumulative);
    expect(roll.totalDynasties).toBe(1);
  });

  it('applies threshold transitions at exact bracket boundaries', () => {
    const { engine } = createHarness();

    const atT1 = engine.assessTax('d:t1', BRACKET_THRESHOLDS.T1_MAX);
    const atT2 = engine.assessTax('d:t2', BRACKET_THRESHOLDS.T2_MAX);
    const atT3 = engine.assessTax('d:t3', BRACKET_THRESHOLDS.T3_MAX);

    expect(typeof atT1).not.toBe('string');
    expect(typeof atT2).not.toBe('string');
    expect(typeof atT3).not.toBe('string');

    if (typeof atT1 === 'string' || typeof atT2 === 'string' || typeof atT3 === 'string') {
      return;
    }

    expect(atT1.bracketBreakdown).toHaveLength(1);
    expect(atT2.bracketBreakdown).toHaveLength(2);
    expect(atT3.bracketBreakdown).toHaveLength(3);
  });

  it('keeps effective rate monotonic as dynasty wealth increases', () => {
    const { engine } = createHarness();

    const low = engine.getEffectiveRate(mk(500n));
    const mid = engine.getEffectiveRate(mk(5_000n));
    const high = engine.getEffectiveRate(mk(250_000n));

    expect(low).toBeLessThanOrEqual(mid);
    expect(mid).toBeLessThanOrEqual(high);
    expect(high).toBeLessThanOrEqual(BRACKET_RATES_BPS.T4);
  });

  it('tracks roll entries independently for multiple dynasties', () => {
    const { engine } = createHarness();

    engine.collectTax('dyn:a', mk(500n));
    engine.collectTax('dyn:b', mk(5_000n));
    engine.collectTax('dyn:a', mk(1_500n));

    const roll = engine.getTaxRoll();
    const a = roll.entries.find((entry) => entry.dynastyId === 'dyn:a');
    const b = roll.entries.find((entry) => entry.dynastyId === 'dyn:b');

    expect(roll.totalDynasties).toBe(2);
    expect(a?.assessmentCount).toBe(2);
    expect(b?.assessmentCount).toBe(1);
    expect((a?.totalCollectedMicroKalon ?? 0n) + (b?.totalCollectedMicroKalon ?? 0n)).toBe(
      roll.totalCollectedMicroKalon,
    );
  });

  it('keeps history partitioned per dynasty', () => {
    const { engine } = createHarness();

    engine.collectTax('dyn:red', mk(750n));
    engine.collectTax('dyn:blue', mk(800n));
    engine.collectTax('dyn:red', mk(1_000n));

    const redHistory = engine.getCollectionHistory('dyn:red');
    const blueHistory = engine.getCollectionHistory('dyn:blue');

    expect(redHistory).toHaveLength(2);
    expect(blueHistory).toHaveLength(1);
    expect(redHistory.every((entry) => entry.dynastyId === 'dyn:red')).toBe(true);
    expect(blueHistory.every((entry) => entry.dynastyId === 'dyn:blue')).toBe(true);
  });

  it('links each collection to a stored assessment', () => {
    const { engine } = createHarness();

    const c1 = engine.collectTax('dyn:link', mk(2_000n));
    const c2 = engine.collectTax('dyn:link', mk(2_200n));

    expect(isCollection(c1)).toBe(true);
    expect(isCollection(c2)).toBe(true);

    if (!isCollection(c1) || !isCollection(c2)) {
      return;
    }

    const a1 = engine.getAssessment(c1.assessmentId);
    const a2 = engine.getAssessment(c2.assessmentId);

    expect(a1).toBeDefined();
    expect(a2).toBeDefined();
    expect(a1?.assessmentId).not.toBe(a2?.assessmentId);
  });

  it('preserves state on invalid negative collection attempts', () => {
    const { engine } = createHarness();

    const beforeFund = engine.commonsFundTotal();
    const beforeRoll = engine.getTaxRoll();

    const result = engine.collectTax('dyn:invalid', -1n);

    expect(typeof result).toBe('string');
    expect(engine.commonsFundTotal()).toBe(beforeFund);
    expect(engine.getTaxRoll().totalCollectedMicroKalon).toBe(beforeRoll.totalCollectedMicroKalon);
    expect(engine.getCollectionHistory('dyn:invalid')).toHaveLength(0);
  });

  it('handles zero-balance collection as a no-tax event while retaining traceability', () => {
    const { engine } = createHarness();

    const result = engine.collectTax('dyn:zero', 0n);

    expect(isCollection(result)).toBe(true);
    if (!isCollection(result)) return;

    expect(result.collectedMicroKalon).toBe(0n);
    expect(result.newBalanceMicroKalon).toBe(0n);
    expect(engine.getCollectionHistory('dyn:zero')).toHaveLength(1);
    expect(engine.commonsFundTotal()).toBe(0n);
  });

  it('shows effective rate convergence toward top bracket for very large balances', () => {
    const { engine } = createHarness();

    const veryLarge = engine.getEffectiveRate(mk(5_000_000n));
    const larger = engine.getEffectiveRate(mk(15_000_000n));

    expect(veryLarge).toBeGreaterThan(BRACKET_RATES_BPS.T3);
    expect(larger).toBeGreaterThanOrEqual(veryLarge);
    expect(larger).toBeLessThanOrEqual(BRACKET_RATES_BPS.T4);
  });

  it('maintains accounting identity: sum(new balance + collected) equals sum(input balances)', () => {
    const { engine } = createHarness();

    const balances = [mk(100n), mk(2_500n), mk(75_000n), mk(120_000n)];

    let inputTotal = 0n;
    let outputTotal = 0n;

    for (const balance of balances) {
      const result = engine.collectTax('dyn:identity', balance);
      expect(isCollection(result)).toBe(true);
      if (!isCollection(result)) return;
      inputTotal += balance;
      outputTotal += result.newBalanceMicroKalon + result.collectedMicroKalon;
    }

    expect(outputTotal).toBe(inputTotal);
  });
});
