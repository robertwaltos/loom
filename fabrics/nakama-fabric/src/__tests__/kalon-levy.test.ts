import { describe, it, expect } from 'vitest';
import { calculateLevy } from '../kalon-levy.js';
import { kalonToMicro } from '../kalon-constants.js';

const TOTAL_SUPPLY = kalonToMicro(1_000_000_000n);

describe('KALON levy calculation', () => {
  it('applies minimum levy for zero balance', () => {
    const amount = kalonToMicro(100n);
    const levy = calculateLevy(amount, 0n, TOTAL_SUPPLY);
    expect(levy).toBe((amount * 50n) / 10_000n);
  });

  it('increases levy with higher balance', () => {
    const amount = kalonToMicro(1_000_000n);
    const lowLevy = calculateLevy(amount, kalonToMicro(1_000_000n), TOTAL_SUPPLY);
    const highLevy = calculateLevy(amount, kalonToMicro(100_000_000n), TOTAL_SUPPLY);
    expect(highLevy).toBeGreaterThan(lowLevy);
  });

  it('levy is always less than the amount', () => {
    const amount = kalonToMicro(1000n);
    const levy = calculateLevy(amount, kalonToMicro(500_000_000n), TOTAL_SUPPLY);
    expect(levy).toBeLessThan(amount);
  });

  it('produces zero levy for zero amount', () => {
    expect(calculateLevy(0n, kalonToMicro(1000n), TOTAL_SUPPLY)).toBe(0n);
  });

  it('uses minimum rate when total supply is zero', () => {
    const amount = kalonToMicro(100n);
    const levy = calculateLevy(amount, kalonToMicro(1000n), 0n);
    expect(levy).toBe((amount * 50n) / 10_000n);
  });
});
