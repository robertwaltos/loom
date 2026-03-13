/**
 * KALON Levy - Simulation Tests
 *
 * Exercises progressive levy behavior across realistic wealth and supply scenarios.
 */

import { describe, expect, it } from 'vitest';
import { calculateLevy } from '../kalon-levy.js';
import { kalonToMicro, LEVY_RATES } from '../kalon-constants.js';
import { structuralCapAmount } from '../wealth-zones.js';

const BASE_SUPPLY = kalonToMicro(1_000_000_000n);
const TX_AMOUNT = kalonToMicro(10_000n);

function effectiveBps(amount: bigint, levy: bigint): bigint {
  if (amount <= 0n) return 0n;
  return (levy * LEVY_RATES.scale) / amount;
}

describe('kalon levy simulation', () => {
  it('applies minimum rate for zero-balance sender', () => {
    const levy = calculateLevy(TX_AMOUNT, 0n, BASE_SUPPLY);
    expect(effectiveBps(TX_AMOUNT, levy)).toBe(LEVY_RATES.minimum);
  });

  it('keeps structurally capped wallets near minimum effective rate', () => {
    const capBalance = structuralCapAmount(BASE_SUPPLY);
    const levy = calculateLevy(TX_AMOUNT, capBalance, BASE_SUPPLY);

    // Structural cap is 500 ppm of supply, which keeps the progressive lift minimal.
    expect(effectiveBps(TX_AMOUNT, levy)).toBe(LEVY_RATES.minimum);
  });

  it('raises levy for concentration-scale balances', () => {
    const concentrationWallet = BASE_SUPPLY / 10n;
    const levy = calculateLevy(TX_AMOUNT, concentrationWallet, BASE_SUPPLY);
    expect(effectiveBps(TX_AMOUNT, levy)).toBeGreaterThan(LEVY_RATES.minimum);
  });

  it('reaches maximum rate when sender balance equals total supply', () => {
    const levy = calculateLevy(TX_AMOUNT, BASE_SUPPLY, BASE_SUPPLY);
    expect(effectiveBps(TX_AMOUNT, levy)).toBe(LEVY_RATES.maximum);
  });

  it('reduces effective levy when global supply expands and balance is fixed', () => {
    const senderBalance = kalonToMicro(100_000_000n);
    const smallSupply = kalonToMicro(500_000_000n);
    const largeSupply = kalonToMicro(2_000_000_000n);

    const smallSupplyLevy = calculateLevy(TX_AMOUNT, senderBalance, smallSupply);
    const largeSupplyLevy = calculateLevy(TX_AMOUNT, senderBalance, largeSupply);

    expect(smallSupplyLevy).toBeGreaterThan(largeSupplyLevy);
  });

  it('is monotonic with sender balance for a fixed amount and supply', () => {
    const low = calculateLevy(TX_AMOUNT, kalonToMicro(1_000n), BASE_SUPPLY);
    const mid = calculateLevy(TX_AMOUNT, kalonToMicro(50_000_000n), BASE_SUPPLY);
    const high = calculateLevy(TX_AMOUNT, kalonToMicro(300_000_000n), BASE_SUPPLY);

    expect(low).toBeLessThanOrEqual(mid);
    expect(mid).toBeLessThanOrEqual(high);
  });

  it('scales linearly with transfer amount when sender and supply are fixed', () => {
    const sender = kalonToMicro(75_000_000n);
    const a = kalonToMicro(1_000n);
    const b = kalonToMicro(3_000n);

    const levyA = calculateLevy(a, sender, BASE_SUPPLY);
    const levyB = calculateLevy(b, sender, BASE_SUPPLY);

    expect(levyB).toBe(levyA * 3n);
  });

  it('returns zero levy for zero transfer amount', () => {
    const levy = calculateLevy(0n, kalonToMicro(10_000n), BASE_SUPPLY);
    expect(levy).toBe(0n);
  });

  it('never exceeds gross amount across representative scenarios', () => {
    const scenarios: Array<{ amount: bigint; sender: bigint; supply: bigint }> = [
      { amount: kalonToMicro(1n), sender: 0n, supply: BASE_SUPPLY },
      { amount: kalonToMicro(50n), sender: kalonToMicro(100_000n), supply: BASE_SUPPLY },
      { amount: kalonToMicro(500n), sender: kalonToMicro(200_000_000n), supply: BASE_SUPPLY },
      { amount: kalonToMicro(1_000n), sender: kalonToMicro(400_000_000n), supply: kalonToMicro(800_000_000n) },
      { amount: kalonToMicro(5_000n), sender: kalonToMicro(50_000_000n), supply: kalonToMicro(2_000_000_000n) },
    ];

    for (const scenario of scenarios) {
      const levy = calculateLevy(scenario.amount, scenario.sender, scenario.supply);
      expect(levy).toBeGreaterThanOrEqual(0n);
      expect(levy).toBeLessThanOrEqual(scenario.amount);
    }
  });

  it('falls back to minimum rate when supply is zero', () => {
    const levy = calculateLevy(TX_AMOUNT, kalonToMicro(999_999n), 0n);
    expect(effectiveBps(TX_AMOUNT, levy)).toBe(LEVY_RATES.minimum);
  });
});
