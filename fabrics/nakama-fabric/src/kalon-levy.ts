/**
 * KALON Levy Calculator — Progressive transaction tax.
 *
 * Levy rate scales from 0.5% to 2.5% based on
 * the sender's balance relative to total supply.
 * All arithmetic in BigInt micro-KALON.
 */

import { LEVY_RATES, TOTAL_SUPPLY_MICRO } from './kalon-constants.js';

export function calculateLevy(amount: bigint, senderBalance: bigint): bigint {
  const rate = computeRate(senderBalance);
  return (amount * rate) / LEVY_RATES.scale;
}

function computeRate(senderBalance: bigint): bigint {
  const balanceRatio = (senderBalance * LEVY_RATES.scale) / TOTAL_SUPPLY_MICRO;
  const range = LEVY_RATES.maximum - LEVY_RATES.minimum;
  const scaled = (balanceRatio * range) / LEVY_RATES.scale;
  return LEVY_RATES.minimum + scaled;
}
