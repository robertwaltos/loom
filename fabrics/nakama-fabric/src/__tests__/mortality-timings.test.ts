import { describe, it, expect } from 'vitest';
import {
  MORTALITY_TIMINGS,
  TIER_GRACE_INGAME_DAYS,
  inGameDaysToRealDays,
  type SubscriptionTier,
} from '../mortality-timings.js';

describe('MORTALITY_TIMINGS constants', () => {
  it('has correct extinction protection window (91 IGD)', () => {
    expect(MORTALITY_TIMINGS.EXTINCTION_PROTECTION_INGAME_DAYS).toBe(91);
  });

  it('has correct mortality trigger window (90 IGD)', () => {
    expect(MORTALITY_TIMINGS.MORTALITY_TRIGGER_INGAME_DAYS).toBe(90);
  });

  it('has correct mortality review window (180 IGD)', () => {
    expect(MORTALITY_TIMINGS.MORTALITY_REVIEW_INGAME_DAYS).toBe(180);
  });

  it('has correct final mortality window (360 IGD)', () => {
    expect(MORTALITY_TIMINGS.MORTALITY_FINAL_INGAME_DAYS).toBe(360);
  });

  it('extinction protection real days is IGD / compression ratio', () => {
    const ratio = MORTALITY_TIMINGS.EXTINCTION_PROTECTION_INGAME_DAYS /
      MORTALITY_TIMINGS.EXTINCTION_PROTECTION_REAL_DAYS;
    expect(ratio).toBeGreaterThan(0);
    // Confirm it's consistent with inGameDaysToRealDays
    expect(MORTALITY_TIMINGS.EXTINCTION_PROTECTION_REAL_DAYS).toBeCloseTo(
      inGameDaysToRealDays(MORTALITY_TIMINGS.EXTINCTION_PROTECTION_INGAME_DAYS), 5,
    );
  });

  it('has 2 real years for heir abeyance window', () => {
    expect(MORTALITY_TIMINGS.IN_ABEYANCE_HEIR_WINDOW_REAL_YEARS).toBe(2);
  });
});

describe('TIER_GRACE_INGAME_DAYS', () => {
  it('free tier has 0 grace days', () => {
    expect(TIER_GRACE_INGAME_DAYS['free']).toBe(0);
  });

  it('accord tier has 30 IGD grace', () => {
    expect(TIER_GRACE_INGAME_DAYS['accord']).toBe(30);
  });

  it('patron tier has 60 IGD grace', () => {
    expect(TIER_GRACE_INGAME_DAYS['patron']).toBe(60);
  });

  it('herald tier has 90 IGD grace (highest)', () => {
    expect(TIER_GRACE_INGAME_DAYS['herald']).toBe(90);
  });

  it('grace days are monotonically non-decreasing by tier', () => {
    const tiers: SubscriptionTier[] = ['free', 'accord', 'patron', 'herald'];
    const values = tiers.map((t) => TIER_GRACE_INGAME_DAYS[t]);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    }
  });
});

describe('inGameDaysToRealDays', () => {
  it('returns a positive number for positive input', () => {
    expect(inGameDaysToRealDays(90)).toBeGreaterThan(0);
  });

  it('returns less days than input (compression ratio > 1)', () => {
    expect(inGameDaysToRealDays(90)).toBeLessThan(90);
  });

  it('is consistent with the COMPRESSION_RATIO', () => {
    const result = inGameDaysToRealDays(300);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(300);
  });

  it('returns 0 for 0 input', () => {
    expect(inGameDaysToRealDays(0)).toBe(0);
  });
});
