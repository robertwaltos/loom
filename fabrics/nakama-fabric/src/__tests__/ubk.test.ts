import { describe, it, expect } from 'vitest';
import { calculateUbkAllocation, classifyWorldProsperity, UBK_BASE_ALLOCATION } from '../ubk.js';

describe('UBK allocation', () => {
  it('pays base allocation on frontier worlds', () => {
    expect(calculateUbkAllocation(1_000_000n)).toBe(UBK_BASE_ALLOCATION);
  });

  it('pays 2x on minor worlds (5M+ issuance)', () => {
    expect(calculateUbkAllocation(5_000_000n)).toBe(UBK_BASE_ALLOCATION * 2n);
  });

  it('pays 3x on standard worlds (20M+ issuance)', () => {
    expect(calculateUbkAllocation(20_000_000n)).toBe(UBK_BASE_ALLOCATION * 3n);
  });

  it('pays 5x on major worlds (50M+ issuance)', () => {
    expect(calculateUbkAllocation(50_000_000n)).toBe(UBK_BASE_ALLOCATION * 5n);
  });
});

describe('World prosperity classification', () => {
  it('classifies frontier worlds', () => {
    expect(classifyWorldProsperity(1_000_000n)).toBe('frontier');
    expect(classifyWorldProsperity(4_999_999n)).toBe('frontier');
  });

  it('classifies minor worlds', () => {
    expect(classifyWorldProsperity(5_000_000n)).toBe('minor');
    expect(classifyWorldProsperity(19_999_999n)).toBe('minor');
  });

  it('classifies standard worlds', () => {
    expect(classifyWorldProsperity(20_000_000n)).toBe('standard');
    expect(classifyWorldProsperity(49_999_999n)).toBe('standard');
  });

  it('classifies major worlds', () => {
    expect(classifyWorldProsperity(50_000_000n)).toBe('major');
    expect(classifyWorldProsperity(240_000_000n)).toBe('major');
  });
});
