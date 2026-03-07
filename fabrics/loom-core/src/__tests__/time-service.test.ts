import { describe, it, expect } from 'vitest';
import {
  createTimeService,
  DEFAULT_TIME_CONFIG,
} from '../time-service.js';
import type { TimeServiceConfig } from '../time-service.js';

const LAUNCH_MS = DEFAULT_TIME_CONFIG.launchDateMs;
const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

function yearsAfterLaunch(years: number): number {
  return LAUNCH_MS + years * MS_PER_YEAR;
}

// ─── Compression Ratio ─────────────────────────────────────────────

describe('TimeService compression ratio', () => {
  const ts = createTimeService();

  it('returns initial ratio at launch', () => {
    expect(ts.getCompressionRatio(LAUNCH_MS)).toBeCloseTo(10.0, 10);
  });

  it('returns initial ratio before launch', () => {
    expect(ts.getCompressionRatio(LAUNCH_MS - 1_000_000)).toBeCloseTo(10.0, 10);
  });

  it('halves after one half-life (12 years)', () => {
    expect(ts.getCompressionRatio(yearsAfterLaunch(12))).toBeCloseTo(5.0, 5);
  });

  it('quarters after two half-lives (24 years)', () => {
    expect(ts.getCompressionRatio(yearsAfterLaunch(24))).toBeCloseTo(2.5, 5);
  });

  it('floors at finalRatio (1.0) for very large T', () => {
    expect(ts.getCompressionRatio(yearsAfterLaunch(200))).toBe(1.0);
  });

  it('decays smoothly at 1 year', () => {
    const ratio = ts.getCompressionRatio(yearsAfterLaunch(1));
    const expected = 10.0 * Math.pow(2, -1 / 12);
    expect(ratio).toBeCloseTo(expected, 10);
  });
});

// ─── In-Game Year ──────────────────────────────────────────────────

describe('TimeService in-game year', () => {
  const ts = createTimeService();

  it('year 1 at launch', () => {
    expect(ts.getInGameYear(LAUNCH_MS)).toBe(1);
  });

  it('year 1 before launch', () => {
    expect(ts.getInGameYear(LAUNCH_MS - 1_000_000)).toBe(1);
  });

  it('advances roughly 10 years in first real year', () => {
    const year = ts.getInGameYear(yearsAfterLaunch(1));
    expect(year).toBeGreaterThanOrEqual(10);
    expect(year).toBeLessThanOrEqual(11);
  });

  it('advances roughly 87 years after 12 real years', () => {
    const coefficient = (10.0 * 12.0) / Math.LN2;
    const expected = coefficient * (1 - Math.pow(2, -1));
    const year = ts.getInGameYear(yearsAfterLaunch(12));
    expect(year).toBe(Math.floor(1 + expected));
  });

  it('years always increase over time', () => {
    let prev = ts.getInGameYear(LAUNCH_MS);
    for (let y = 1; y <= 50; y += 5) {
      const current = ts.getInGameYear(yearsAfterLaunch(y));
      expect(current).toBeGreaterThanOrEqual(prev);
      prev = current;
    }
  });
});

// ─── In-Game Years Elapsed ─────────────────────────────────────────

describe('TimeService in-game years elapsed', () => {
  const ts = createTimeService();

  it('zero at launch', () => {
    expect(ts.getInGameYearsElapsed(LAUNCH_MS)).toBe(0);
  });

  it('zero before launch', () => {
    expect(ts.getInGameYearsElapsed(LAUNCH_MS - 999_999)).toBe(0);
  });

  it('matches integral formula at 12 years', () => {
    const elapsed = ts.getInGameYearsElapsed(yearsAfterLaunch(12));
    const expected = (10.0 * 12.0 / Math.LN2) * (1 - Math.pow(2, -1));
    expect(elapsed).toBeCloseTo(expected, 10);
  });

  it('asymptotically approaches k*h/ln2', () => {
    const maxInGameYears = (10.0 * 12.0) / Math.LN2;
    const elapsed = ts.getInGameYearsElapsed(yearsAfterLaunch(500));
    expect(elapsed).toBeCloseTo(maxInGameYears, 1);
  });
});

// ─── Duration Conversion ───────────────────────────────────────────

describe('TimeService duration conversion', () => {
  const ts = createTimeService();

  it('1 real day = 10 in-game days at launch', () => {
    const oneRealDay = 24 * 3600 * 1000;
    const inGame = ts.realMsToInGameMs(oneRealDay, LAUNCH_MS);
    expect(inGame).toBeCloseTo(oneRealDay * 10, 5);
  });

  it('10 in-game days = 1 real day at launch', () => {
    const oneRealDay = 24 * 3600 * 1000;
    const real = ts.inGameMsToRealMs(oneRealDay * 10, LAUNCH_MS);
    expect(real).toBeCloseTo(oneRealDay, 5);
  });

  it('conversions are inverse at same timestamp', () => {
    const realMs = 7 * 24 * 3600 * 1000;
    const now = yearsAfterLaunch(5);
    const inGame = ts.realMsToInGameMs(realMs, now);
    const backToReal = ts.inGameMsToRealMs(inGame, now);
    expect(backToReal).toBeCloseTo(realMs, 5);
  });
});

// ─── Custom Config ─────────────────────────────────────────────────

describe('TimeService custom config', () => {
  it('works with custom launch date and ratios', () => {
    const config: TimeServiceConfig = {
      launchDateMs: Date.UTC(2030, 0, 1),
      initialRatio: 5.0,
      finalRatio: 2.0,
      halfLifeRealYears: 6.0,
    };
    const ts = createTimeService(config);
    const launch = config.launchDateMs;

    expect(ts.getCompressionRatio(launch)).toBeCloseTo(5.0, 10);
    const after6 = launch + 6 * MS_PER_YEAR;
    expect(ts.getCompressionRatio(after6)).toBeCloseTo(2.5, 5);
  });

  it('respects higher finalRatio floor', () => {
    const config: TimeServiceConfig = {
      launchDateMs: Date.UTC(2030, 0, 1),
      initialRatio: 5.0,
      finalRatio: 3.0,
      halfLifeRealYears: 6.0,
    };
    const ts = createTimeService(config);
    const farFuture = config.launchDateMs + 200 * MS_PER_YEAR;
    expect(ts.getCompressionRatio(farFuture)).toBe(3.0);
  });
});
