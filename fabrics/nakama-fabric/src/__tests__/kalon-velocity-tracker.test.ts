import { describe, it, expect } from 'vitest';
import {
  VELOCITY_READINGS,
  VELOCITY_SNAPSHOTS,
  VELOCITY_TIER_THRESHOLDS,
  PEAK_VELOCITY_YEAR,
  LOWEST_VELOCITY_YEAR,
  computeVelocityIndex,
  classifyVelocityTier,
  createVelocityTracker,
  type VelocityTier,
  type VelocityCategory,
} from '../kalon-velocity-tracker.js';

// ── Mock deps ─────────────────────────────────────────────────────────────────

const mockDeps = { clock: { nowIso: () => '2027-01-01T00:00:00Z' } };

// ── VELOCITY_TIER_THRESHOLDS ──────────────────────────────────────────────────

describe('VELOCITY_TIER_THRESHOLDS', () => {
  it('STAGNANT starts at 0', () => {
    expect(VELOCITY_TIER_THRESHOLDS.STAGNANT).toBe(0);
  });

  it('SLOW starts at 10', () => {
    expect(VELOCITY_TIER_THRESHOLDS.SLOW).toBe(10);
  });

  it('MODERATE starts at 25', () => {
    expect(VELOCITY_TIER_THRESHOLDS.MODERATE).toBe(25);
  });

  it('ACTIVE starts at 45', () => {
    expect(VELOCITY_TIER_THRESHOLDS.ACTIVE).toBe(45);
  });

  it('ACCELERATED starts at 65', () => {
    expect(VELOCITY_TIER_THRESHOLDS.ACCELERATED).toBe(65);
  });

  it('HYPERACTIVE starts at 85', () => {
    expect(VELOCITY_TIER_THRESHOLDS.HYPERACTIVE).toBe(85);
  });
});

// ── computeVelocityIndex ──────────────────────────────────────────────────────

describe('computeVelocityIndex', () => {
  it('returns 0 when supply is 0', () => {
    expect(computeVelocityIndex(1_000_000n, 0n)).toBe(0);
  });

  it('returns 0 when flow is 0', () => {
    expect(computeVelocityIndex(0n, 1_000_000n)).toBe(0);
  });

  it('caps at 100', () => {
    // extremely high flow relative to supply
    const result = computeVelocityIndex(1_000_000_000_000n, 1n);
    expect(result).toBe(100);
  });

  it('returns a value in [0, 100]', () => {
    const result = computeVelocityIndex(2_000_000n, 1_000_000n);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });

  it('flow equal to supply gives index of 40', () => {
    // ratio = 1, index = round(1 * 40) = 40
    expect(computeVelocityIndex(1_000_000n, 1_000_000n)).toBe(40);
  });

  it('double supply flow gives index of 80', () => {
    // ratio = 2, index = round(2 * 40) = 80
    expect(computeVelocityIndex(2_000_000n, 1_000_000n)).toBe(80);
  });
});

// ── classifyVelocityTier ──────────────────────────────────────────────────────

describe('classifyVelocityTier', () => {
  it('returns STAGNANT for index 0', () => {
    expect(classifyVelocityTier(0)).toBe('STAGNANT');
  });

  it('returns STAGNANT for index 9', () => {
    expect(classifyVelocityTier(9)).toBe('STAGNANT');
  });

  it('returns SLOW for index 10', () => {
    expect(classifyVelocityTier(10)).toBe('SLOW');
  });

  it('returns MODERATE for index 25', () => {
    expect(classifyVelocityTier(25)).toBe('MODERATE');
  });

  it('returns ACTIVE for index 45', () => {
    expect(classifyVelocityTier(45)).toBe('ACTIVE');
  });

  it('returns ACCELERATED for index 65', () => {
    expect(classifyVelocityTier(65)).toBe('ACCELERATED');
  });

  it('returns HYPERACTIVE for index 85', () => {
    expect(classifyVelocityTier(85)).toBe('HYPERACTIVE');
  });

  it('returns HYPERACTIVE for index 100', () => {
    expect(classifyVelocityTier(100)).toBe('HYPERACTIVE');
  });
});

// ── VELOCITY_READINGS data integrity ─────────────────────────────────────────

describe('VELOCITY_READINGS', () => {
  it('has at least 15 entries', () => {
    expect(VELOCITY_READINGS.length).toBeGreaterThanOrEqual(15);
  });

  it('all readingIds are unique', () => {
    const ids = VELOCITY_READINGS.map((r) => r.readingId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all totalFlowMicro are BigInt', () => {
    for (const r of VELOCITY_READINGS) {
      expect(typeof r.totalFlowMicro).toBe('bigint');
    }
  });

  it('all tiers are valid VelocityTier values', () => {
    const valid: VelocityTier[] = ['STAGNANT', 'SLOW', 'MODERATE', 'ACTIVE', 'ACCELERATED', 'HYPERACTIVE'];
    for (const r of VELOCITY_READINGS) {
      expect(valid).toContain(r.tier);
    }
  });

  it('all categories are valid VelocityCategory values', () => {
    const valid: VelocityCategory[] = ['TRADE', 'LEVY', 'UBK', 'ISSUANCE', 'REWARDS', 'COMMONS', 'COVENANT'];
    for (const r of VELOCITY_READINGS) {
      expect(valid).toContain(r.category);
    }
  });
});

// ── VELOCITY_SNAPSHOTS data integrity ─────────────────────────────────────────

describe('VELOCITY_SNAPSHOTS', () => {
  it('has at least 10 entries', () => {
    expect(VELOCITY_SNAPSHOTS.length).toBeGreaterThanOrEqual(10);
  });

  it('all velocityIndex are in [0, 100]', () => {
    for (const snap of VELOCITY_SNAPSHOTS) {
      expect(snap.velocityIndex).toBeGreaterThanOrEqual(0);
      expect(snap.velocityIndex).toBeLessThanOrEqual(100);
    }
  });

  it('ascendancyConcentrationPercent is in [0, 100]', () => {
    for (const snap of VELOCITY_SNAPSHOTS) {
      expect(snap.ascendancyConcentrationPercent).toBeGreaterThanOrEqual(0);
      expect(snap.ascendancyConcentrationPercent).toBeLessThanOrEqual(100);
    }
  });

  it('PEAK_VELOCITY_YEAR is 60', () => {
    expect(PEAK_VELOCITY_YEAR).toBe(60);
  });

  it('LOWEST_VELOCITY_YEAR is 31', () => {
    expect(LOWEST_VELOCITY_YEAR).toBe(31);
  });

  it('year 60 snapshot has HYPERACTIVE tier', () => {
    const snap = VELOCITY_SNAPSHOTS.find((s) => s.year === 60);
    expect(snap?.overallTier).toBe('HYPERACTIVE');
  });

  it('year 31 snapshot has SLOW tier (lattice collapse)', () => {
    const snap = VELOCITY_SNAPSHOTS.find((s) => s.year === 31);
    expect(snap?.overallTier).toBe('SLOW');
  });
});

// ── createVelocityTracker service ─────────────────────────────────────────────

describe('createVelocityTracker', () => {
  const tracker = createVelocityTracker(mockDeps);

  it('getReading returns reading for known id', () => {
    const r = tracker.getReading('vr-year1-trade');
    expect(r?.readingId).toBe('vr-year1-trade');
  });

  it('getReading returns undefined for unknown id', () => {
    expect(tracker.getReading('nonexistent')).toBeUndefined();
  });

  it('getReadingsByYear returns all readings for year 1', () => {
    const readings = tracker.getReadingsByYear(1);
    expect(readings.every((r) => r.year === 1)).toBe(true);
    expect(readings.length).toBeGreaterThan(0);
  });

  it('getReadingsByYear returns empty for year with no readings', () => {
    expect(tracker.getReadingsByYear(999)).toHaveLength(0);
  });

  it('getReadingsByCategory filters correctly', () => {
    const tradeReadings = tracker.getReadingsByCategory('TRADE');
    expect(tradeReadings.length).toBeGreaterThan(0);
    expect(tradeReadings.every((r) => r.category === 'TRADE')).toBe(true);
  });

  it('getSnapshot returns correct snapshot for known year', () => {
    const snap = tracker.getSnapshot(60);
    expect(snap?.year).toBe(60);
    expect(snap?.overallTier).toBe('HYPERACTIVE');
  });

  it('getSnapshot returns undefined for unknown year', () => {
    expect(tracker.getSnapshot(999)).toBeUndefined();
  });

  it('getNearestSnapshot returns closest snapshot', () => {
    const snap = tracker.getNearestSnapshot(62);
    expect(snap).toBeDefined();
    expect(snap?.year).toBe(60);
  });

  it('computeTotalFlowBetween sums readings in range', () => {
    const total = tracker.computeTotalFlowBetween(1, 5);
    expect(typeof total).toBe('bigint');
    expect(total).toBeGreaterThan(0n);
  });

  it('computeTotalFlowBetween returns 0 for empty range', () => {
    expect(tracker.computeTotalFlowBetween(500, 501)).toBe(0n);
  });

  it('getHighVelocityPeriods returns only ACCELERATED or HYPERACTIVE', () => {
    const high = tracker.getHighVelocityPeriods();
    expect(high.length).toBeGreaterThan(0);
    for (const snap of high) {
      expect(['ACCELERATED', 'HYPERACTIVE']).toContain(snap.overallTier);
    }
  });

  it('getLowVelocityPeriods returns only STAGNANT or SLOW', () => {
    const low = tracker.getLowVelocityPeriods();
    expect(low.length).toBeGreaterThan(0);
    for (const snap of low) {
      expect(['STAGNANT', 'SLOW']).toContain(snap.overallTier);
    }
  });

  it('getVelocitySummary has correct shape', () => {
    const summary = tracker.getVelocitySummary();
    expect(typeof summary.totalReadings).toBe('number');
    expect(typeof summary.totalSnapshots).toBe('number');
    expect(typeof summary.peakVelocityYear).toBe('number');
    expect(typeof summary.lowestVelocityYear).toBe('number');
    expect(typeof summary.averageVelocityIndex).toBe('number');
  });

  it('getVelocitySummary peakVelocityYear matches PEAK_VELOCITY_YEAR', () => {
    const summary = tracker.getVelocitySummary();
    expect(summary.peakVelocityYear).toBe(PEAK_VELOCITY_YEAR);
  });

  it('getVelocitySummary lowestVelocityYear matches LOWEST_VELOCITY_YEAR', () => {
    const summary = tracker.getVelocitySummary();
    expect(summary.lowestVelocityYear).toBe(LOWEST_VELOCITY_YEAR);
  });
});
