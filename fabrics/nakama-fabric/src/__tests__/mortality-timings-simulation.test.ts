/**
 * Mortality Timings - Simulation Tests
 *
 * Verifies dynasty lifecycle timing constants, tier grace windows,
 * and in-game to real-day conversion behavior.
 */

import { describe, it, expect } from 'vitest';
import {
  MORTALITY_TIMINGS,
  TIER_GRACE_INGAME_DAYS,
  inGameDaysToRealDays,
  type SubscriptionTier,
} from '../mortality-timings.js';

function makeOrderedLifecycle() {
  return [
    MORTALITY_TIMINGS.MORTALITY_TRIGGER_INGAME_DAYS,
    MORTALITY_TIMINGS.MORTALITY_REVIEW_INGAME_DAYS,
    MORTALITY_TIMINGS.MORTALITY_FINAL_INGAME_DAYS,
  ];
}

describe('mortality timings', () => {
  describe('exported constants', () => {
    it('exposes expected extinction protection and conversion values', () => {
      expect(MORTALITY_TIMINGS.EXTINCTION_PROTECTION_INGAME_DAYS).toBe(91);
      expect(MORTALITY_TIMINGS.EXTINCTION_PROTECTION_REAL_DAYS).toBeCloseTo(30.3333333333, 6);
    });

    it('exposes expected subscription grace windows', () => {
      expect(MORTALITY_TIMINGS.ACCORD_GRACE_INGAME_DAYS).toBe(30);
      expect(MORTALITY_TIMINGS.PATRON_GRACE_INGAME_DAYS).toBe(60);
      expect(MORTALITY_TIMINGS.HERALD_GRACE_INGAME_DAYS).toBe(90);
    });

    it('exposes expected core mortality transition windows', () => {
      expect(MORTALITY_TIMINGS.MORTALITY_TRIGGER_INGAME_DAYS).toBe(90);
      expect(MORTALITY_TIMINGS.MORTALITY_REVIEW_INGAME_DAYS).toBe(180);
      expect(MORTALITY_TIMINGS.MORTALITY_FINAL_INGAME_DAYS).toBe(360);
    });

    it('exposes expected in-abeyance heir claim window in real years', () => {
      expect(MORTALITY_TIMINGS.IN_ABEYANCE_HEIR_WINDOW_REAL_YEARS).toBe(2);
    });
  });

  describe('lifecycle invariants', () => {
    it('keeps mortality windows strictly increasing', () => {
      const [trigger, review, final] = makeOrderedLifecycle();
      expect(trigger).toBeLessThan(review);
      expect(review).toBeLessThan(final);
    });

    it('keeps review at 2x trigger and final at 4x trigger', () => {
      expect(MORTALITY_TIMINGS.MORTALITY_REVIEW_INGAME_DAYS).toBe(
        MORTALITY_TIMINGS.MORTALITY_TRIGGER_INGAME_DAYS * 2,
      );
      expect(MORTALITY_TIMINGS.MORTALITY_FINAL_INGAME_DAYS).toBe(
        MORTALITY_TIMINGS.MORTALITY_TRIGGER_INGAME_DAYS * 4,
      );
    });

    it('keeps extinction protection separate from inactivity trigger', () => {
      expect(MORTALITY_TIMINGS.EXTINCTION_PROTECTION_INGAME_DAYS).toBeGreaterThan(
        MORTALITY_TIMINGS.MORTALITY_TRIGGER_INGAME_DAYS,
      );
      expect(MORTALITY_TIMINGS.EXTINCTION_PROTECTION_INGAME_DAYS).toBe(
        MORTALITY_TIMINGS.MORTALITY_TRIGGER_INGAME_DAYS + 1,
      );
    });
  });

  describe('tier grace mapping', () => {
    it('maps all subscription tiers to expected grace days', () => {
      expect(TIER_GRACE_INGAME_DAYS.free).toBe(0);
      expect(TIER_GRACE_INGAME_DAYS.accord).toBe(30);
      expect(TIER_GRACE_INGAME_DAYS.patron).toBe(60);
      expect(TIER_GRACE_INGAME_DAYS.herald).toBe(90);
    });

    it('has exactly the supported subscription tier keys', () => {
      const keys = Object.keys(TIER_GRACE_INGAME_DAYS).sort();
      expect(keys).toEqual(['accord', 'free', 'herald', 'patron']);
    });

    it('keeps grace values monotonic by tier rank', () => {
      const valuesInTierOrder: readonly number[] = [
        TIER_GRACE_INGAME_DAYS.free,
        TIER_GRACE_INGAME_DAYS.accord,
        TIER_GRACE_INGAME_DAYS.patron,
        TIER_GRACE_INGAME_DAYS.herald,
      ];

      for (let i = 0; i < valuesInTierOrder.length - 1; i += 1) {
        expect(valuesInTierOrder[i]).toBeLessThan(valuesInTierOrder[i + 1]);
      }
    });

    it('keeps free tier with no grace', () => {
      expect(TIER_GRACE_INGAME_DAYS.free).toBe(0);
      expect(TIER_GRACE_INGAME_DAYS.free).toBeLessThan(TIER_GRACE_INGAME_DAYS.accord);
    });

    it('supports indexed access for all subscription tiers', () => {
      const tiers: readonly SubscriptionTier[] = ['free', 'accord', 'patron', 'herald'];
      const values = tiers.map((tier) => TIER_GRACE_INGAME_DAYS[tier]);
      expect(values).toEqual([0, 30, 60, 90]);
    });
  });

  describe('inGameDaysToRealDays', () => {
    it('converts zero in-game days to zero real days', () => {
      expect(inGameDaysToRealDays(0)).toBe(0);
    });

    it('converts trigger and final windows consistently with exported constants', () => {
      expect(inGameDaysToRealDays(MORTALITY_TIMINGS.MORTALITY_TRIGGER_INGAME_DAYS)).toBeCloseTo(30, 6);
      expect(inGameDaysToRealDays(MORTALITY_TIMINGS.MORTALITY_FINAL_INGAME_DAYS)).toBeCloseTo(120, 6);
    });

    it('converts fractional in-game day values', () => {
      expect(inGameDaysToRealDays(1.5)).toBeCloseTo(0.5, 6);
    });

    it('converts negative in-game days deterministically', () => {
      expect(inGameDaysToRealDays(-9)).toBeCloseTo(-3, 6);
    });

    it('handles large finite values without NaN or infinity', () => {
      const converted = inGameDaysToRealDays(9_000_000);
      expect(Number.isFinite(converted)).toBe(true);
      expect(Number.isNaN(converted)).toBe(false);
      expect(converted).toBeCloseTo(3_000_000, 3);
    });

    it('matches the precomputed extinction protection real-day value', () => {
      expect(inGameDaysToRealDays(MORTALITY_TIMINGS.EXTINCTION_PROTECTION_INGAME_DAYS)).toBeCloseTo(
        MORTALITY_TIMINGS.EXTINCTION_PROTECTION_REAL_DAYS,
        10,
      );
    });
  });
});