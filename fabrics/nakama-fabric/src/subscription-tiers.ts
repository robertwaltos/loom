/**
 * Subscription Tier Configuration — The gate for all dynasty capabilities.
 *
 * Bible v1.1 Part 10.1: Four tiers governing dynasty slots, KALON stipends,
 * survey priority, Architect report access, and continuity grace periods.
 *
 * FREE_TOURIST → free (observer-only, 15-day trial, no dynasty)
 * ACCORD       → accord ($15/mo, 1 dynasty, standard survey)
 * PATRON       → patron ($25/mo, 2 dynasties, priority survey)
 * HERALD       → herald ($35/mo, 3 dynasties, priority + observer)
 *
 * This module is pure configuration — no state, no side effects.
 * Other systems import these constants to enforce tier gates.
 */

import type { SubscriptionTier } from './dynasty.js';

// ─── Types ───────────────────────────────────────────────────────────

export type SurveyPriority = 'none' | 'standard' | 'priority' | 'priority_with_observer';

export type ArchitectAccess = 'on_release' | 'early_48h';

export interface TierConfig {
  readonly tier: SubscriptionTier;
  readonly priceUsdMonthly: number;
  readonly maxActiveDynasties: number;
  readonly kalonMonthlyStipendMicro: bigint;
  readonly surveyPriority: SurveyPriority;
  readonly architectReportAccess: ArchitectAccess;
  readonly continuityGraceDays: number;
  readonly trialDays: number | null;
}

// ─── Constants ───────────────────────────────────────────────────────

const MICRO = 1_000_000n;

export const TIER_CONFIGS: Readonly<Record<SubscriptionTier, TierConfig>> = {
  free: {
    tier: 'free',
    priceUsdMonthly: 0,
    maxActiveDynasties: 0,
    kalonMonthlyStipendMicro: 0n,
    surveyPriority: 'none',
    architectReportAccess: 'on_release',
    continuityGraceDays: 0,
    trialDays: 15,
  },
  accord: {
    tier: 'accord',
    priceUsdMonthly: 15,
    maxActiveDynasties: 1,
    kalonMonthlyStipendMicro: 100n * MICRO,
    surveyPriority: 'standard',
    architectReportAccess: 'on_release',
    continuityGraceDays: 30,
    trialDays: null,
  },
  patron: {
    tier: 'patron',
    priceUsdMonthly: 25,
    maxActiveDynasties: 2,
    kalonMonthlyStipendMicro: 175n * MICRO,
    surveyPriority: 'priority',
    architectReportAccess: 'on_release',
    continuityGraceDays: 60,
    trialDays: null,
  },
  herald: {
    tier: 'herald',
    priceUsdMonthly: 35,
    maxActiveDynasties: 3,
    kalonMonthlyStipendMicro: 250n * MICRO,
    surveyPriority: 'priority_with_observer',
    architectReportAccess: 'early_48h',
    continuityGraceDays: 90,
    trialDays: null,
  },
} as const;

// ─── Query Functions ────────────────────────────────────────────────

export function getTierConfig(tier: SubscriptionTier): TierConfig {
  return TIER_CONFIGS[tier];
}

export function canFoundDynasty(tier: SubscriptionTier): boolean {
  return TIER_CONFIGS[tier].maxActiveDynasties > 0;
}

export function canInitiateSurvey(tier: SubscriptionTier): boolean {
  return TIER_CONFIGS[tier].surveyPriority !== 'none';
}

export function surveyPriorityForTier(tier: SubscriptionTier): SurveyPriority {
  return TIER_CONFIGS[tier].surveyPriority;
}

export function monthlyStipendMicro(tier: SubscriptionTier): bigint {
  return TIER_CONFIGS[tier].kalonMonthlyStipendMicro;
}

export function graceDaysForTier(tier: SubscriptionTier): number {
  return TIER_CONFIGS[tier].continuityGraceDays;
}

export function isTrialTier(tier: SubscriptionTier): boolean {
  return TIER_CONFIGS[tier].trialDays !== null;
}

export function hasEarlyArchitectAccess(tier: SubscriptionTier): boolean {
  return TIER_CONFIGS[tier].architectReportAccess === 'early_48h';
}
