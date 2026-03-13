import { describe, expect, it } from 'vitest';
import {
  canFoundDynasty,
  canInitiateSurvey,
  getTierConfig,
  graceDaysForTier,
  hasEarlyArchitectAccess,
  isTrialTier,
  monthlyStipendMicro,
  surveyPriorityForTier,
} from '../subscription-tiers.js';
import type { SubscriptionTier } from '../dynasty.js';

describe('subscription-tiers simulation', () => {
  const tiers: readonly SubscriptionTier[] = ['free', 'accord', 'patron', 'herald'];

  it('simulates onboarding and verifies dynasty/survey gates per tier', () => {
    const founded = tiers.filter((tier) => canFoundDynasty(tier));
    const surveyed = tiers.filter((tier) => canInitiateSurvey(tier));

    expect(founded).toEqual(['accord', 'patron', 'herald']);
    expect(surveyed).toEqual(['accord', 'patron', 'herald']);
    expect(isTrialTier('free')).toBe(true);
    expect(isTrialTier('accord')).toBe(false);
  });

  it('simulates monthly stipends and continuity grace progression', () => {
    const stipendTrail = tiers.map((tier) => monthlyStipendMicro(tier));
    const graceTrail = tiers.map((tier) => graceDaysForTier(tier));

    expect(stipendTrail).toEqual([0n, 100_000_000n, 175_000_000n, 250_000_000n]);
    expect(graceTrail).toEqual([0, 30, 60, 90]);
  });

  it('simulates survey and architect-access privilege ladder', () => {
    expect(surveyPriorityForTier('free')).toBe('none');
    expect(surveyPriorityForTier('accord')).toBe('standard');
    expect(surveyPriorityForTier('patron')).toBe('priority');
    expect(surveyPriorityForTier('herald')).toBe('priority_with_observer');

    expect(hasEarlyArchitectAccess('herald')).toBe(true);
    expect(hasEarlyArchitectAccess('patron')).toBe(false);
  });

  it('simulates config lookup integrity for all published tiers', () => {
    for (const tier of tiers) {
      const cfg = getTierConfig(tier);
      expect(cfg.tier).toBe(tier);
      expect(cfg.priceUsdMonthly).toBeGreaterThanOrEqual(0);
      expect(cfg.maxActiveDynasties).toBeGreaterThanOrEqual(0);
    }
  });
});
