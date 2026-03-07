import { describe, it, expect } from 'vitest';
import { classifyWealth, structuralCapAmount } from '../wealth-zones.js';
import { kalonToMicro } from '../kalon-constants.js';

const SUPPLY = kalonToMicro(1_000_000_000n);

describe('Wealth zone classification', () => {
  it('classifies zero balance as active', () => {
    expect(classifyWealth(0n, SUPPLY)).toBe('active');
  });

  it('classifies small balance as active (below 0.005%)', () => {
    const balance = (SUPPLY * 40n) / 1_000_000n;
    expect(classifyWealth(balance, SUPPLY)).toBe('active');
  });

  it('classifies 0.01% as prosperity', () => {
    const balance = (SUPPLY * 100n) / 1_000_000n;
    expect(classifyWealth(balance, SUPPLY)).toBe('prosperity');
  });

  it('classifies 0.03% as concentration', () => {
    const balance = (SUPPLY * 300n) / 1_000_000n;
    expect(classifyWealth(balance, SUPPLY)).toBe('concentration');
  });

  it('classifies 0.05% as structural', () => {
    const balance = (SUPPLY * 500n) / 1_000_000n;
    expect(classifyWealth(balance, SUPPLY)).toBe('structural');
  });

  it('returns active when total supply is zero', () => {
    expect(classifyWealth(1000n, 0n)).toBe('active');
  });
});

describe('Structural cap calculation', () => {
  it('computes 0.050% of total supply', () => {
    const cap = structuralCapAmount(SUPPLY);
    expect(cap).toBe((SUPPLY * 500n) / 1_000_000n);
  });

  it('scales with supply growth', () => {
    const smallCap = structuralCapAmount(kalonToMicro(1_000_000n));
    const largeCap = structuralCapAmount(kalonToMicro(1_000_000_000n));
    expect(largeCap).toBeGreaterThan(smallCap);
    expect(largeCap / smallCap).toBe(1000n);
  });
});
