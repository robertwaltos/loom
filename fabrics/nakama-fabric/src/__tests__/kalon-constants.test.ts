import { describe, it, expect } from 'vitest';
import {
  KALON_DECIMALS,
  MICRO_KALON_PER_KALON,
  kalonToMicro,
  microToKalonString,
} from '../kalon-constants.js';

describe('KALON constants', () => {
  it('has 6 decimal places', () => {
    expect(KALON_DECIMALS).toBe(6);
    expect(MICRO_KALON_PER_KALON).toBe(1_000_000n);
  });
});

describe('KALON conversions', () => {
  it('converts kalon to micro', () => {
    expect(kalonToMicro(1n)).toBe(1_000_000n);
    expect(kalonToMicro(100n)).toBe(100_000_000n);
  });

  it('formats micro to kalon string', () => {
    expect(microToKalonString(1_500_000n)).toBe('1.500000');
    expect(microToKalonString(0n)).toBe('0.000000');
    expect(microToKalonString(123_456_789n)).toBe('123.456789');
  });

  it('pads fractional part', () => {
    expect(microToKalonString(1n)).toBe('0.000001');
    expect(microToKalonString(10n)).toBe('0.000010');
  });
});
