/**
 * KALON Constants — Fixed parameters of the economy.
 *
 * 1 billion KALON with 6 decimal places = 10^15 micro-KALON.
 * All internal math uses BigInt micro-KALON to avoid floating point.
 */

export const KALON_DECIMALS = 6;

export const MICRO_KALON_PER_KALON = 10n ** BigInt(KALON_DECIMALS);

export const TOTAL_SUPPLY_KALON = 1_000_000_000n;

export const TOTAL_SUPPLY_MICRO = TOTAL_SUPPLY_KALON * MICRO_KALON_PER_KALON;

export const LEVY_RATES = {
  minimum: 50n,
  maximum: 250n,
  scale: 10_000n,
} as const;

export const WEALTH_CAPS = {
  activeBand: 10n,
  prosperity: 30n,
  structural: 50n,
  scale: 10_000n,
} as const;

export function kalonToMicro(kalon: bigint): bigint {
  return kalon * MICRO_KALON_PER_KALON;
}

export function microToKalonString(micro: bigint): string {
  const whole = micro / MICRO_KALON_PER_KALON;
  const fractional = micro % MICRO_KALON_PER_KALON;
  const fractionalStr = fractional.toString().padStart(KALON_DECIMALS, '0');
  return `${whole.toString()}.${fractionalStr}`;
}
