/**
 * Wealth Zones — Dynamic classification based on current total supply.
 *
 * Bible v1.2: Wealth zone thresholds are percentages of the
 * current total supply, recalculated quarterly. No hardcoded
 * KALON amounts anywhere in financial code.
 *
 * All thresholds are in parts-per-million (ppm) of total supply:
 *   0.005% = 50 ppm
 *   0.020% = 200 ppm
 *   0.050% = 500 ppm
 */

export type WealthZone = 'active' | 'prosperity' | 'concentration' | 'structural';

export const WEALTH_ZONE_PPM = {
  activeBandMax: 50n,
  prosperityMax: 200n,
  concentrationMax: 500n,
  structuralCap: 500n,
  scale: 1_000_000n,
} as const;

export function classifyWealth(balance: bigint, totalSupply: bigint): WealthZone {
  if (totalSupply <= 0n) return 'active';
  const ppm = (balance * WEALTH_ZONE_PPM.scale) / totalSupply;
  if (ppm < WEALTH_ZONE_PPM.activeBandMax) return 'active';
  if (ppm < WEALTH_ZONE_PPM.prosperityMax) return 'prosperity';
  if (ppm < WEALTH_ZONE_PPM.concentrationMax) return 'concentration';
  return 'structural';
}

export function structuralCapAmount(totalSupply: bigint): bigint {
  return (totalSupply * WEALTH_ZONE_PPM.structuralCap) / WEALTH_ZONE_PPM.scale;
}
