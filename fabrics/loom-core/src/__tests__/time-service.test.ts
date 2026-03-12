import { describe, it, expect } from 'vitest';
import { createTimeService, DEFAULT_TIME_CONFIG, COMPRESSION_RATIO } from '../time-service.js';
import type { TimeServiceConfig, InGameDate } from '../time-service.js';

const LAUNCH_MS = DEFAULT_TIME_CONFIG.launchDateMs;
const MS_PER_DAY = 24 * 3600 * 1000;
const MS_PER_YEAR = 365.25 * MS_PER_DAY;

function daysAfterLaunch(days: number): number {
  return LAUNCH_MS + days * MS_PER_DAY;
}

function yearsAfterLaunch(years: number): number {
  return LAUNCH_MS + years * MS_PER_YEAR;
}

// ─── Compression Ratio ─────────────────────────────────────────────

describe('TimeService compression ratio', () => {
  const ts = createTimeService();

  it('returns fixed 3:1 ratio', () => {
    expect(ts.getCompressionRatio()).toBe(3);
  });

  it('COMPRESSION_RATIO export matches default config', () => {
    expect(COMPRESSION_RATIO).toBe(3);
    expect(DEFAULT_TIME_CONFIG.compressionRatio).toBe(COMPRESSION_RATIO);
  });

  it('ratio never changes regardless of time', () => {
    expect(ts.getCompressionRatio()).toBe(3);
    expect(ts.getCompressionRatio()).toBe(3);
    expect(ts.getCompressionRatio()).toBe(3);
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

  it('year 4 after 1 real year (3 in-game years elapsed in 360-day calendar)', () => {
    const year = ts.getInGameYear(yearsAfterLaunch(1));
    // 365.25 real days * 3 = 1095.75 in-game days / 360 = 3.04 in-game years
    expect(year).toBe(4);
  });

  it('year 106 at 35 real years', () => {
    // 35 * 365.25 * 3 = 38,351.25 in-game days / 360 = 106.53 → year 107
    const year = ts.getInGameYear(yearsAfterLaunch(35));
    expect(year).toBe(107);
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

  it('linear growth: 3 in-game years per real year (360-day calendar)', () => {
    const elapsed = ts.getInGameYearsElapsed(yearsAfterLaunch(1));
    // 365.25 * 3 / 360 = 3.0437...
    expect(elapsed).toBeCloseTo(365.25 * 3 / 360, 5);
  });

  it('scales linearly at 10 real years', () => {
    const elapsed = ts.getInGameYearsElapsed(yearsAfterLaunch(10));
    const expected = 10 * 365.25 * 3 / 360;
    expect(elapsed).toBeCloseTo(expected, 5);
  });
});

// ─── In-Game Date ──────────────────────────────────────────────────

describe('TimeService in-game date', () => {
  const ts = createTimeService();

  it('year 1, month 1, day 1 at launch', () => {
    const date = ts.getInGameDate(LAUNCH_MS);
    expect(date).toEqual({ year: 1, month: 1, day: 1 });
  });

  it('advances 3 in-game days per real day', () => {
    const date = ts.getInGameDate(daysAfterLaunch(1));
    expect(date).toEqual({ year: 1, month: 1, day: 4 });
  });

  it('month rolls over after 10 real days (30 in-game days)', () => {
    const date = ts.getInGameDate(daysAfterLaunch(10));
    expect(date).toEqual({ year: 1, month: 2, day: 1 });
  });

  it('year rolls over after 120 real days (360 in-game days)', () => {
    const date = ts.getInGameDate(daysAfterLaunch(120));
    expect(date).toEqual({ year: 2, month: 1, day: 1 });
  });

  it('correct date at 1 real year', () => {
    const date = ts.getInGameDate(yearsAfterLaunch(1));
    // 365.25 * 3 = 1095.75 in-game days
    // floor(1095) / 360 = 3 full years = days 1080
    // remaining = 1095 - 1080 = 15 days → month 1, day 16
    expect(date.year).toBe(4);
    expect(date.month).toBe(1);
    expect(date.day).toBe(16);
  });
});

// ─── Duration Conversion ───────────────────────────────────────────

describe('TimeService duration conversion', () => {
  const ts = createTimeService();

  it('1 real day = 3 in-game days', () => {
    const inGame = ts.realMsToInGameMs(MS_PER_DAY);
    expect(inGame).toBe(MS_PER_DAY * 3);
  });

  it('3 in-game days = 1 real day', () => {
    const real = ts.inGameMsToRealMs(MS_PER_DAY * 3);
    expect(real).toBe(MS_PER_DAY);
  });

  it('conversions are exact inverses', () => {
    const realMs = 7 * MS_PER_DAY;
    const inGame = ts.realMsToInGameMs(realMs);
    const backToReal = ts.inGameMsToRealMs(inGame);
    expect(backToReal).toBe(realMs);
  });

  it('realDaysToInGame converts correctly', () => {
    expect(ts.realDaysToInGame(1)).toBe(3);
    expect(ts.realDaysToInGame(10)).toBe(30);
    expect(ts.realDaysToInGame(30)).toBe(90);
  });

  it('inGameDaysToReal converts correctly', () => {
    expect(ts.inGameDaysToReal(3)).toBe(1);
    expect(ts.inGameDaysToReal(30)).toBe(10);
    expect(ts.inGameDaysToReal(91)).toBeCloseTo(30.333, 2);
  });
});

// ─── Custom Config ─────────────────────────────────────────────────

describe('TimeService custom config', () => {
  it('works with custom launch date', () => {
    const config: TimeServiceConfig = {
      launchDateMs: Date.UTC(2030, 0, 1),
      compressionRatio: 3,
    };
    const ts = createTimeService(config);
    expect(ts.getCompressionRatio()).toBe(3);
    expect(ts.getInGameYear(config.launchDateMs)).toBe(1);
  });

  it('works with custom compression ratio', () => {
    const config: TimeServiceConfig = {
      launchDateMs: Date.UTC(2027, 0, 1),
      compressionRatio: 5,
    };
    const ts = createTimeService(config);
    expect(ts.getCompressionRatio()).toBe(5);
    expect(ts.realDaysToInGame(1)).toBe(5);
    expect(ts.inGameDaysToReal(5)).toBe(1);
  });
});
