/**
 * Universal Basic KALON (UBK) — Monthly allocation to every active dynasty.
 *
 * Bible v1.2: Paid from each world's issuance pool, not the Commons Fund.
 * World prosperity determines the multiplier. Inactive dynasties receive
 * UBK into escrow, claimable on return within 24 months.
 *
 * All values in whole KALON. Convert with kalonToMicro() for the ledger.
 */

export type UbkTier = 'frontier' | 'minor' | 'standard' | 'major';

export const UBK_BASE_ALLOCATION = 100n;

export const UBK_INACTIVE_ESCROW_MONTHS = 24;

export const UBK_INACTIVE_THRESHOLD_DAYS = 90;

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
