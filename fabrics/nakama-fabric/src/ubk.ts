/**
 * Universal Basic KALON (UBK) — Monthly allocation to every active dynasty.
 *
 * Bible v1.2: Paid from each world's issuance pool, not the Commons Fund.
 * World prosperity determines the multiplier. Inactive dynasties receive
 * UBK into escrow, claimable on return within 24 months.
 *
 * Bible v1.3: Payment interval = 1 in-game month (~10.14 real days).
 * 36 UBK payments per real year. 24-month inactive escrow (~240 real days).
 *
 * All values in whole KALON. Convert with kalonToMicro() for the ledger.
 */

import { COMPRESSION_RATIO } from '@loom/loom-core';

export type UbkTier = 'frontier' | 'minor' | 'standard' | 'major';

export const UBK_BASE_ALLOCATION = 100n;

export const UBK_INACTIVE_ESCROW_MONTHS = 24;

export const UBK_INACTIVE_THRESHOLD_DAYS = 90;

// ─── UBK Cadence (Bible v1.3) ──────────────────────────────────────

const MS_PER_REAL_DAY = 24 * 3600 * 1000;
const REAL_DAYS_PER_INGAME_MONTH = 30 / COMPRESSION_RATIO;

export const UBK_CADENCE = {
  PAYMENT_INTERVAL_REAL_DAYS: REAL_DAYS_PER_INGAME_MONTH,
  PAYMENT_INTERVAL_MS: REAL_DAYS_PER_INGAME_MONTH * MS_PER_REAL_DAY,
  PAYMENTS_PER_REAL_YEAR: Math.floor(365.25 / REAL_DAYS_PER_INGAME_MONTH),
  INACTIVE_ESCROW_INGAME_MONTHS: UBK_INACTIVE_ESCROW_MONTHS,
  INACTIVE_ESCROW_REAL_DAYS: Math.round(
    (UBK_INACTIVE_ESCROW_MONTHS * 30) / COMPRESSION_RATIO,
  ),
} as const;

export function calculateUbkAllocation(worldAnnualIssuance: bigint): bigint {
  const multiplier = prosperityMultiplier(worldAnnualIssuance);
  return UBK_BASE_ALLOCATION * multiplier;
}

export function classifyWorldProsperity(worldAnnualIssuance: bigint): UbkTier {
  if (worldAnnualIssuance >= 50_000_000n) return 'major';
  if (worldAnnualIssuance >= 20_000_000n) return 'standard';
  if (worldAnnualIssuance >= 5_000_000n) return 'minor';
  return 'frontier';
}

function prosperityMultiplier(worldAnnualIssuance: bigint): bigint {
  if (worldAnnualIssuance >= 50_000_000n) return 5n;
  if (worldAnnualIssuance >= 20_000_000n) return 3n;
  if (worldAnnualIssuance >= 5_000_000n) return 2n;
  return 1n;
}
