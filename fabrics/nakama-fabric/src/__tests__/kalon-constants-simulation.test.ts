import { describe, expect, it } from 'vitest';
import {
  KALON_DECIMALS,
  LEVY_RATES,
  MICRO_KALON_PER_KALON,
  kalonToMicro,
  microToKalonString,
} from '../kalon-constants.js';

describe('kalon-constants simulation', () => {
  it('simulates mint, transfer display, and treasury levy basis points', () => {
    const minted = kalonToMicro(12_500n);
    const transfer = kalonToMicro(3_250n);
    const remaining = minted - transfer;

    expect(KALON_DECIMALS).toBe(6);
    expect(minted).toBe(12_500n * MICRO_KALON_PER_KALON);
    expect(microToKalonString(remaining)).toBe('9250.000000');

    const levyAtMax = (remaining * LEVY_RATES.maximum) / LEVY_RATES.scale;
    const levyAtMin = (remaining * LEVY_RATES.minimum) / LEVY_RATES.scale;
    expect(levyAtMax > levyAtMin).toBe(true);
  });

  it('simulates fractional formatting for micro-kalon precision edges', () => {
    const fragments = [1n, 12n, 1200n, 120_345n, 1_200_345n];
    const rendered = fragments.map((v) => microToKalonString(v));

    expect(rendered).toEqual([
      '0.000001',
      '0.000012',
      '0.001200',
      '0.120345',
      '1.200345',
    ]);
  });

  it('simulates whole-kalon round trips without losing value', () => {
    const portfolio = [0n, 1n, 25n, 500n, 999_999n];

    for (const amount of portfolio) {
      const micro = kalonToMicro(amount);
      const asString = microToKalonString(micro);
      expect(asString.endsWith('.000000')).toBe(true);
      expect(asString.startsWith(amount.toString())).toBe(true);
    }
  });
});
