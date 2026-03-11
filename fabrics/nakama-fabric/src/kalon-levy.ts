/**
 * KALON Levy Calculator — Progressive transaction tax.
 *
 * Levy rate scales from 0.5% to 2.5% based on
 * the sender's balance relative to the current total supply.
 * All arithmetic in BigInt micro-KALON.
 *
 * Bible v1.2: Total supply is dynamic (Stellar Standard),
 * so totalSupply must be passed in at calculation time.
 */

import { LEVY_RATES } from './kalon-constants.js';

export function calculateLevy(amount: bigint, senderBalance: bigint, totalSupply: bigint): bigint {
  const rate = computeRate(senderBalance, totalSupply);
  return (amount * rate) / LEVY_RATES.scale;
}

function computeRate(senderBalance: bigint, totalSupply: bigint): bigint {
  if (totalSupply <= 0n) return LEVY_RATES.minimum;
  const balanceRatio = (senderBalance * LEVY_RATES.scale) / totalSupply;
  const range = LEVY_RATES.maximum - LEVY_RATES.minimum;
  const scaled = (balanceRatio * range) / LEVY_RATES.scale;
  return LEVY_RATES.minimum + scaled;
}
