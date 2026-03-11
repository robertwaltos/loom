import { describe, it, expect } from 'vitest';
import {
  createTaxCollectionEngine,
  MICRO_KALON,
  BRACKET_THRESHOLDS,
  BRACKET_RATES_BPS,
} from '../tax-collection.js';
import type {
  TaxDeps,
  TaxCollectionEngine,
  TaxAssessment,
  TaxCollectionResult,
} from '../tax-collection.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function makeDeps(): TaxDeps & { advance: (us: number) => void } {
  let now = 1_000_000;
  let counter = 0;
  return {
    advance: (us: number) => {
      now += us;
    },
    clock: { nowMicroseconds: () => now },
    idGenerator: {
      next: () => {
        counter += 1;
        return 'id-' + String(counter);
      },
    },
  };
}

function makeEngine(): { engine: TaxCollectionEngine; deps: ReturnType<typeof makeDeps> } {
  const deps = makeDeps();
  return { engine: createTaxCollectionEngine(deps), deps };
}

function isAssessment(r: TaxAssessment | string): r is TaxAssessment {
  return typeof r !== 'string';
}

function isCollection(r: TaxCollectionResult | string): r is TaxCollectionResult {
  return typeof r !== 'string';
}

// KALON to micro-KALON
function mk(kalon: bigint): bigint {
  return kalon * MICRO_KALON;
}

// ─── assessTax ────────────────────────────────────────────────────────

describe('assessTax', () => {
  it('returns zero tax for zero balance', () => {
    const { engine } = makeEngine();
    const result = engine.assessTax('d1', 0n);
    expect(isAssessment(result)).toBe(true);
    if (!isAssessment(result)) return;
    expect(result.totalTaxMicroKalon).toBe(0n);
    expect(result.bracketBreakdown).toHaveLength(0);
  });

  it('applies 2% rate for subsistence bracket (500 KALON)', () => {
    const { engine } = makeEngine();
    const balance = mk(500n);
    const result = engine.assessTax('d1', balance);
    expect(isAssessment(result)).toBe(true);
    if (!isAssessment(result)) return;
    // 2% of 500 = 10 KALON
    expect(result.totalTaxMicroKalon).toBe(mk(10n));
  });

  it('spans two brackets for 5000 KALON balance', () => {
    const { engine } = makeEngine();
    // First 1000 at 2% = 20, next 4000 at 5% = 200, total = 220
    const result = engine.assessTax('d1', mk(5_000n));
    expect(isAssessment(result)).toBe(true);
    if (!isAssessment(result)) return;
    expect(result.bracketBreakdown).toHaveLength(2);
    expect(result.totalTaxMicroKalon).toBe(mk(220n));
  });

  it('spans all four brackets for 200000 KALON balance', () => {
    const { engine } = makeEngine();
    // T1: 1000 @ 2% = 20
    // T2: 9000 @ 5% = 450
    // T3: 90000 @ 10% = 9000
    // T4: 100000 @ 15% = 15000
    // Total = 24470
    const result = engine.assessTax('d1', mk(200_000n));
    expect(isAssessment(result)).toBe(true);
    if (!isAssessment(result)) return;
    expect(result.bracketBreakdown).toHaveLength(4);
    expect(result.totalTaxMicroKalon).toBe(mk(24_470n));
  });

  it('rejects negative balance', () => {
    const { engine } = makeEngine();
    const result = engine.assessTax('d1', -1n);
    expect(typeof result).toBe('string');
    expect(result as string).toContain('negative');
  });

  it('assigns unique assessmentId', () => {
    const { engine } = makeEngine();
    const r1 = engine.assessTax('d1', mk(100n));
    const r2 = engine.assessTax('d1', mk(100n));
    expect(isAssessment(r1) && isAssessment(r2)).toBe(true);
    if (!isAssessment(r1) || !isAssessment(r2)) return;
    expect(r1.assessmentId).not.toBe(r2.assessmentId);
  });

  it('computes effective rate bps correctly for 500 KALON (2%)', () => {
    const { engine } = makeEngine();
    const result = engine.assessTax('d1', mk(500n));
    expect(isAssessment(result)).toBe(true);
    if (!isAssessment(result)) return;
    // 2% = 200 bps
    expect(result.effectiveRateBps).toBe(BRACKET_RATES_BPS.T1);
  });

  it('stores assessment retrievable by id', () => {
    const { engine } = makeEngine();
    const result = engine.assessTax('d1', mk(100n));
    expect(isAssessment(result)).toBe(true);
    if (!isAssessment(result)) return;
    const stored = engine.getAssessment(result.assessmentId);
    expect(stored).toBeDefined();
    expect(stored?.assessmentId).toBe(result.assessmentId);
  });

  it('handles exactly T1 boundary (1000 KALON)', () => {
    const { engine } = makeEngine();
    const result = engine.assessTax('d1', BRACKET_THRESHOLDS.T1_MAX);
    expect(isAssessment(result)).toBe(true);
    if (!isAssessment(result)) return;
    // Exactly 1 bracket used: 1000 KALON @ 2% = 20 KALON
    expect(result.totalTaxMicroKalon).toBe(mk(20n));
  });
});

// ─── collectTax ───────────────────────────────────────────────────────

describe('collectTax', () => {
  it('deducts tax from balance and routes to commons fund', () => {
    const { engine } = makeEngine();
    const balance = mk(500n);
    const result = engine.collectTax('d1', balance);
    expect(isCollection(result)).toBe(true);
    if (!isCollection(result)) return;
    // 2% of 500 = 10 KALON
    expect(result.collectedMicroKalon).toBe(mk(10n));
    expect(result.newBalanceMicroKalon).toBe(mk(490n));
    expect(result.commonsFundMicroKalon).toBe(mk(10n));
  });

  it('accumulates commons fund across multiple collections', () => {
    const { engine } = makeEngine();
    engine.collectTax('d1', mk(500n));
    engine.collectTax('d2', mk(500n));
    expect(engine.commonsFundTotal()).toBe(mk(20n));
  });

  it('rejects negative balance', () => {
    const { engine } = makeEngine();
    const result = engine.collectTax('d1', -1n);
    expect(typeof result).toBe('string');
  });

  it('records collection in history', () => {
    const { engine } = makeEngine();
    engine.collectTax('d1', mk(100n));
    engine.collectTax('d1', mk(200n));
    const history = engine.getCollectionHistory('d1');
    expect(history).toHaveLength(2);
  });

  it('returns empty history for unknown dynasty', () => {
    const { engine } = makeEngine();
    expect(engine.getCollectionHistory('unknown')).toHaveLength(0);
  });

  it('assigns unique collectionId', () => {
    const { engine } = makeEngine();
    const r1 = engine.collectTax('d1', mk(100n));
    const r2 = engine.collectTax('d1', mk(100n));
    expect(isCollection(r1) && isCollection(r2)).toBe(true);
    if (!isCollection(r1) || !isCollection(r2)) return;
    expect(r1.collectionId).not.toBe(r2.collectionId);
  });

  it('links collection to its assessmentId', () => {
    const { engine } = makeEngine();
    const result = engine.collectTax('d1', mk(100n));
    expect(isCollection(result)).toBe(true);
    if (!isCollection(result)) return;
    expect(result.assessmentId).toBeTruthy();
    const assessment = engine.getAssessment(result.assessmentId);
    expect(assessment).toBeDefined();
  });

  it('handles zero balance with zero tax', () => {
    const { engine } = makeEngine();
    const result = engine.collectTax('d1', 0n);
    expect(isCollection(result)).toBe(true);
    if (!isCollection(result)) return;
    expect(result.collectedMicroKalon).toBe(0n);
  });
});

// ─── getTaxRoll ───────────────────────────────────────────────────────

describe('getTaxRoll', () => {
  it('returns empty roll initially', () => {
    const { engine } = makeEngine();
    const roll = engine.getTaxRoll();
    expect(roll.entries).toHaveLength(0);
    expect(roll.totalCollectedMicroKalon).toBe(0n);
    expect(roll.totalDynasties).toBe(0);
  });

  it('builds roll from collections', () => {
    const { engine } = makeEngine();
    engine.collectTax('d1', mk(500n));
    engine.collectTax('d2', mk(1000n));
    const roll = engine.getTaxRoll();
    expect(roll.totalDynasties).toBe(2);
    expect(roll.totalCollectedMicroKalon).toBeGreaterThan(0n);
  });

  it('aggregates multiple collections for same dynasty', () => {
    const { engine } = makeEngine();
    engine.collectTax('d1', mk(500n));
    engine.collectTax('d1', mk(500n));
    const roll = engine.getTaxRoll();
    const entry = roll.entries.find((e) => e.dynastyId === 'd1');
    expect(entry).toBeDefined();
    expect(entry?.assessmentCount).toBe(2);
  });

  it('reports correct total collected matching commons fund', () => {
    const { engine } = makeEngine();
    engine.collectTax('d1', mk(500n));
    engine.collectTax('d2', mk(500n));
    const roll = engine.getTaxRoll();
    expect(roll.totalCollectedMicroKalon).toBe(engine.commonsFundTotal());
  });
});

// ─── getEffectiveRate ─────────────────────────────────────────────────

describe('getEffectiveRate', () => {
  it('returns 0 for zero balance', () => {
    const { engine } = makeEngine();
    expect(engine.getEffectiveRate(0n)).toBe(0n);
  });

  it('returns 200 bps (2%) for balance fully in T1', () => {
    const { engine } = makeEngine();
    expect(engine.getEffectiveRate(mk(500n))).toBe(200n);
  });

  it('returns rate between T1 and T2 for mid-range balance', () => {
    const { engine } = makeEngine();
    // 5000 KALON: 220 tax / 5000 = 4.4% = 440 bps
    const rate = engine.getEffectiveRate(mk(5_000n));
    expect(rate).toBeGreaterThan(200n);
    expect(rate).toBeLessThan(500n);
  });

  it('approaches T4 rate for very large balances', () => {
    const { engine } = makeEngine();
    // For 1,000,000 KALON most falls in T4
    const rate = engine.getEffectiveRate(mk(1_000_000n));
    expect(rate).toBeGreaterThan(1000n);
    expect(rate).toBeLessThanOrEqual(1500n);
  });
});
