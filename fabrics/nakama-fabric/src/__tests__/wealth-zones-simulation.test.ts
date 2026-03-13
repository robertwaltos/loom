/**
 * Wealth Zones - Simulation Tests
 *
 * Exercises dynamic supply transitions and threshold edge behavior.
 */

import { describe, expect, it } from 'vitest';
import { classifyWealth, structuralCapAmount, WEALTH_ZONE_PPM } from '../wealth-zones.js';
import { kalonToMicro } from '../kalon-constants.js';

const SUPPLY = kalonToMicro(1_000_000_000n);

function ppmAmount(totalSupply: bigint, ppm: bigint): bigint {
  return (totalSupply * ppm) / WEALTH_ZONE_PPM.scale;
}

describe('wealth zones simulation', () => {
  it('treats non-positive supply as active regardless of balance', () => {
    expect(classifyWealth(kalonToMicro(1_000n), 0n)).toBe('active');
  });

  it('keeps balances below active threshold in active zone', () => {
    const balance = ppmAmount(SUPPLY, 49n);
    expect(classifyWealth(balance, SUPPLY)).toBe('active');
  });

  it('moves exactly-at-threshold balances into prosperity', () => {
    const balance = ppmAmount(SUPPLY, WEALTH_ZONE_PPM.activeBandMax);
    expect(classifyWealth(balance, SUPPLY)).toBe('prosperity');
  });

  it('moves exactly-at-prosperity-max balances into concentration', () => {
    const balance = ppmAmount(SUPPLY, WEALTH_ZONE_PPM.prosperityMax);
    expect(classifyWealth(balance, SUPPLY)).toBe('concentration');
  });

  it('moves exactly-at-concentration-max balances into structural', () => {
    const balance = ppmAmount(SUPPLY, WEALTH_ZONE_PPM.concentrationMax);
    expect(classifyWealth(balance, SUPPLY)).toBe('structural');
  });

  it('classifies structural cap amount as structural', () => {
    const cap = structuralCapAmount(SUPPLY);
    expect(classifyWealth(cap, SUPPLY)).toBe('structural');
  });

  it('downgrades a fixed balance when global supply increases', () => {
    const fixedBalance = ppmAmount(SUPPLY, 300n);
    const doubledSupply = SUPPLY * 2n;

    expect(classifyWealth(fixedBalance, SUPPLY)).toBe('concentration');
    expect(classifyWealth(fixedBalance, doubledSupply)).toBe('prosperity');
  });

  it('upgrades a fixed balance when global supply decreases', () => {
    const fixedBalance = ppmAmount(SUPPLY, 260n);
    const halvedSupply = SUPPLY / 2n;

    expect(classifyWealth(fixedBalance, SUPPLY)).toBe('concentration');
    expect(classifyWealth(fixedBalance, halvedSupply)).toBe('structural');
  });

  it('scales structural cap proportionally with supply', () => {
    const capA = structuralCapAmount(kalonToMicro(500_000_000n));
    const capB = structuralCapAmount(kalonToMicro(1_500_000_000n));
    expect(capB).toBe(capA * 3n);
  });

  it('returns non-negative cap bounded by supply', () => {
    const zeroCap = structuralCapAmount(0n);
    const cap = structuralCapAmount(SUPPLY);

    expect(zeroCap).toBe(0n);
    expect(cap).toBeGreaterThanOrEqual(0n);
    expect(cap).toBeLessThanOrEqual(SUPPLY);
  });
});
