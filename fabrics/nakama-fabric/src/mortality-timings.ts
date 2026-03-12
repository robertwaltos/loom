/**
 * Mortality Timings — In-game-day constants for dynasty continuity lifecycle.
 *
 * Bible v1.3: All mortality windows expressed in in-game days.
 * Real-day approximations use COMPRESSION_RATIO from TimeService (3:1).
 * Never hardcode the ratio here — derive from the single source of truth.
 */

import { COMPRESSION_RATIO } from '@loom/loom-core';

// ─── Extinction Protection ──────────────────────────────────────────

/**
 * Absolute protection window for newly founded dynasties.
 * 91 in-game days ≈ 30.3 real days at 3:1 compression.
 */
const EXTINCTION_PROTECTION_INGAME_DAYS = 91;

// ─── Subscription Tier Grace Periods ────────────────────────────────

/**
 * Grace periods by subscription tier, in in-game days.
 * These delay the DORMANT → DECEASED transition.
 */
const ACCORD_GRACE_INGAME_DAYS = 30;
const PATRON_GRACE_INGAME_DAYS = 60;
const HERALD_GRACE_INGAME_DAYS = 90;

// ─── Mortality State Transitions ────────────────────────────────────

/**
 * Inactivity trigger: dynasty enters DORMANT after this many in-game days.
 * 90 IGD ≈ 30 real days.
 */
const MORTALITY_TRIGGER_INGAME_DAYS = 90;

/**
 * Reversible window: DORMANT can be reversed within this many in-game days.
 * 180 IGD ≈ 60 real days.
 */
const MORTALITY_REVIEW_INGAME_DAYS = 180;

/**
 * Irrevocable death: dynasty is permanently DECEASED after this many in-game days.
 * 360 IGD ≈ 120 real days.
 */
const MORTALITY_FINAL_INGAME_DAYS = 360;

// ─── Heir Claim Window ──────────────────────────────────────────────

const IN_ABEYANCE_HEIR_WINDOW_REAL_YEARS = 2;

// ─── Exported Constants ─────────────────────────────────────────────

export const MORTALITY_TIMINGS = {
  EXTINCTION_PROTECTION_INGAME_DAYS,
  EXTINCTION_PROTECTION_REAL_DAYS: EXTINCTION_PROTECTION_INGAME_DAYS / COMPRESSION_RATIO,

  ACCORD_GRACE_INGAME_DAYS,
  PATRON_GRACE_INGAME_DAYS,
  HERALD_GRACE_INGAME_DAYS,

  MORTALITY_TRIGGER_INGAME_DAYS,
  MORTALITY_REVIEW_INGAME_DAYS,
  MORTALITY_FINAL_INGAME_DAYS,

  IN_ABEYANCE_HEIR_WINDOW_REAL_YEARS,
} as const;

export type SubscriptionTier = 'free' | 'accord' | 'patron' | 'herald';

export const TIER_GRACE_INGAME_DAYS: Readonly<Record<SubscriptionTier, number>> = {
  free: 0,
  accord: ACCORD_GRACE_INGAME_DAYS,
  patron: PATRON_GRACE_INGAME_DAYS,
  herald: HERALD_GRACE_INGAME_DAYS,
} as const;

export function inGameDaysToRealDays(inGameDays: number): number {
  return inGameDays / COMPRESSION_RATIO;
}
