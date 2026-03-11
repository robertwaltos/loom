/**
 * KALON Constants — Fixed parameters of the economy.
 *
 * The Stellar Standard (Bible v1.2) replaces the fixed 1B supply
 * with world-based dynamic issuance. Total supply grows as worlds
 * are unlocked. All internal math uses BigInt micro-KALON.
 */

export const KALON_DECIMALS = 6;

export const MICRO_KALON_PER_KALON = 10n ** BigInt(KALON_DECIMALS);

export const LEVY_RATES = {
  minimum: 50n,
  maximum: 250n,
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
