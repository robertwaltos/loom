import { describe, it, expect } from 'vitest';
import {
  TIER_CONFIGS,
  getTierConfig,
  canFoundDynasty,
  canInitiateSurvey,
  surveyPriorityForTier,
  monthlyStipendMicro,
  graceDaysForTier,
  isTrialTier,
  hasEarlyArchitectAccess,
} from '../subscription-tiers.js';

const MICRO = 1_000_000n;

// ─── Tier Configs ───────────────────────────────────────────────────

describe('Subscription tier configs', () => {
  it('free tier is observer-only with 15-day trial', () => {
    const cfg = TIER_CONFIGS.free;
    expect(cfg.priceUsdMonthly).toBe(0);
    expect(cfg.maxActiveDynasties).toBe(0);
    expect(cfg.kalonMonthlyStipendMicro).toBe(0n);
    expect(cfg.surveyPriority).toBe('none');
    expect(cfg.continuityGraceDays).toBe(0);
    expect(cfg.trialDays).toBe(15);
  });

  it('accord tier matches Bible v1.1 ($15, 1 dynasty, standard)', () => {
    const cfg = TIER_CONFIGS.accord;
    expect(cfg.priceUsdMonthly).toBe(15);
    expect(cfg.maxActiveDynasties).toBe(1);
    expect(cfg.kalonMonthlyStipendMicro).toBe(100n * MICRO);
    expect(cfg.surveyPriority).toBe('standard');
    expect(cfg.continuityGraceDays).toBe(30);
    expect(cfg.trialDays).toBeNull();
  });

  it('patron tier matches Bible v1.1 ($25, 2 dynasties, priority)', () => {
    const cfg = TIER_CONFIGS.patron;
    expect(cfg.priceUsdMonthly).toBe(25);
    expect(cfg.maxActiveDynasties).toBe(2);
    expect(cfg.kalonMonthlyStipendMicro).toBe(175n * MICRO);
    expect(cfg.surveyPriority).toBe('priority');
    expect(cfg.continuityGraceDays).toBe(60);
  });

  it('herald tier matches Bible v1.1 ($35, 3 dynasties, priority+obs)', () => {
    const cfg = TIER_CONFIGS.herald;
    expect(cfg.priceUsdMonthly).toBe(35);
    expect(cfg.maxActiveDynasties).toBe(3);
    expect(cfg.kalonMonthlyStipendMicro).toBe(250n * MICRO);
    expect(cfg.surveyPriority).toBe('priority_with_observer');
    expect(cfg.continuityGraceDays).toBe(90);
    expect(cfg.architectReportAccess).toBe('early_48h');
  });
});

// ─── Query Functions ────────────────────────────────────────────────

describe('Subscription tier queries', () => {
  it('getTierConfig returns correct config', () => {
    expect(getTierConfig('accord').priceUsdMonthly).toBe(15);
    expect(getTierConfig('patron').priceUsdMonthly).toBe(25);
  });

  it('canFoundDynasty is false for free, true for paid', () => {
    expect(canFoundDynasty('free')).toBe(false);
    expect(canFoundDynasty('accord')).toBe(true);
    expect(canFoundDynasty('patron')).toBe(true);
    expect(canFoundDynasty('herald')).toBe(true);
  });

  it('canInitiateSurvey is false for free, true for paid', () => {
    expect(canInitiateSurvey('free')).toBe(false);
    expect(canInitiateSurvey('accord')).toBe(true);
    expect(canInitiateSurvey('patron')).toBe(true);
    expect(canInitiateSurvey('herald')).toBe(true);
  });

  it('surveyPriorityForTier returns correct priority', () => {
    expect(surveyPriorityForTier('free')).toBe('none');
    expect(surveyPriorityForTier('accord')).toBe('standard');
    expect(surveyPriorityForTier('patron')).toBe('priority');
    expect(surveyPriorityForTier('herald')).toBe('priority_with_observer');
  });

  it('monthlyStipendMicro returns correct amounts', () => {
    expect(monthlyStipendMicro('free')).toBe(0n);
    expect(monthlyStipendMicro('accord')).toBe(100_000_000n);
    expect(monthlyStipendMicro('patron')).toBe(175_000_000n);
    expect(monthlyStipendMicro('herald')).toBe(250_000_000n);
  });

  it('graceDaysForTier returns correct grace periods', () => {
    expect(graceDaysForTier('free')).toBe(0);
    expect(graceDaysForTier('accord')).toBe(30);
    expect(graceDaysForTier('patron')).toBe(60);
    expect(graceDaysForTier('herald')).toBe(90);
  });

  it('isTrialTier identifies free as trial', () => {
    expect(isTrialTier('free')).toBe(true);
    expect(isTrialTier('accord')).toBe(false);
    expect(isTrialTier('patron')).toBe(false);
    expect(isTrialTier('herald')).toBe(false);
  });

  it('hasEarlyArchitectAccess only for herald', () => {
    expect(hasEarlyArchitectAccess('free')).toBe(false);
    expect(hasEarlyArchitectAccess('accord')).toBe(false);
    expect(hasEarlyArchitectAccess('patron')).toBe(false);
    expect(hasEarlyArchitectAccess('herald')).toBe(true);
  });
});

// ─── Tier Ordering Invariants ───────────────────────────────────────

describe('Subscription tier ordering invariants', () => {
  it('price increases with tier', () => {
    expect(TIER_CONFIGS.accord.priceUsdMonthly).toBeGreaterThan(TIER_CONFIGS.free.priceUsdMonthly);
    expect(TIER_CONFIGS.patron.priceUsdMonthly).toBeGreaterThan(
      TIER_CONFIGS.accord.priceUsdMonthly,
    );
    expect(TIER_CONFIGS.herald.priceUsdMonthly).toBeGreaterThan(
      TIER_CONFIGS.patron.priceUsdMonthly,
    );
  });

  it('dynasty slots increase with tier', () => {
    expect(TIER_CONFIGS.accord.maxActiveDynasties).toBeGreaterThan(
      TIER_CONFIGS.free.maxActiveDynasties,
    );
    expect(TIER_CONFIGS.patron.maxActiveDynasties).toBeGreaterThan(
      TIER_CONFIGS.accord.maxActiveDynasties,
    );
    expect(TIER_CONFIGS.herald.maxActiveDynasties).toBeGreaterThan(
      TIER_CONFIGS.patron.maxActiveDynasties,
    );
  });

  it('stipend increases with tier', () => {
    expect(
      TIER_CONFIGS.accord.kalonMonthlyStipendMicro > TIER_CONFIGS.free.kalonMonthlyStipendMicro,
    ).toBe(true);
    expect(
      TIER_CONFIGS.patron.kalonMonthlyStipendMicro > TIER_CONFIGS.accord.kalonMonthlyStipendMicro,
    ).toBe(true);
    expect(
      TIER_CONFIGS.herald.kalonMonthlyStipendMicro > TIER_CONFIGS.patron.kalonMonthlyStipendMicro,
    ).toBe(true);
  });

  it('grace days increase with tier', () => {
    expect(TIER_CONFIGS.accord.continuityGraceDays).toBeGreaterThan(
      TIER_CONFIGS.free.continuityGraceDays,
    );
    expect(TIER_CONFIGS.patron.continuityGraceDays).toBeGreaterThan(
      TIER_CONFIGS.accord.continuityGraceDays,
    );
    expect(TIER_CONFIGS.herald.continuityGraceDays).toBeGreaterThan(
      TIER_CONFIGS.patron.continuityGraceDays,
    );
  });
});
