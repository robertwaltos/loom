/**
 * UBK - Simulation Tests
 *
 * Exercises long-run issuance transitions and cadence invariants.
 */

import { describe, expect, it } from 'vitest';
import {
  UBK_BASE_ALLOCATION,
  UBK_CADENCE,
  UBK_INACTIVE_ESCROW_MONTHS,
  UBK_INACTIVE_THRESHOLD_DAYS,
  calculateUbkAllocation,
  classifyWorldProsperity,
} from '../ubk.js';

describe('ubk simulation', () => {
  it('keeps allocation exactly aligned with prosperity tier across threshold boundaries', () => {
    const matrix: Array<{ issuance: bigint; tier: string; allocation: bigint }> = [
      { issuance: 4_999_999n, tier: 'frontier', allocation: UBK_BASE_ALLOCATION },
      { issuance: 5_000_000n, tier: 'minor', allocation: UBK_BASE_ALLOCATION * 2n },
      { issuance: 19_999_999n, tier: 'minor', allocation: UBK_BASE_ALLOCATION * 2n },
      { issuance: 20_000_000n, tier: 'standard', allocation: UBK_BASE_ALLOCATION * 3n },
      { issuance: 49_999_999n, tier: 'standard', allocation: UBK_BASE_ALLOCATION * 3n },
      { issuance: 50_000_000n, tier: 'major', allocation: UBK_BASE_ALLOCATION * 5n },
    ];

    for (const row of matrix) {
      expect(classifyWorldProsperity(row.issuance)).toBe(row.tier);
      expect(calculateUbkAllocation(row.issuance)).toBe(row.allocation);
    }
  });

  it('increases allocation stepwise as a world matures over issuance milestones', () => {
    const issuanceTimeline = [1_200_000n, 6_500_000n, 25_000_000n, 80_000_000n];

    const allocations = issuanceTimeline.map((issuance) => calculateUbkAllocation(issuance));
    const tiers = issuanceTimeline.map((issuance) => classifyWorldProsperity(issuance));

    expect(tiers).toEqual(['frontier', 'minor', 'standard', 'major']);
    expect(allocations).toEqual([
      UBK_BASE_ALLOCATION,
      UBK_BASE_ALLOCATION * 2n,
      UBK_BASE_ALLOCATION * 3n,
      UBK_BASE_ALLOCATION * 5n,
    ]);
  });

  it('decreases allocation appropriately when issuance contracts across tiers', () => {
    const issuanceTimeline = [72_000_000n, 40_000_000n, 9_000_000n, 2_000_000n];

    const allocations = issuanceTimeline.map((issuance) => calculateUbkAllocation(issuance));
    const tiers = issuanceTimeline.map((issuance) => classifyWorldProsperity(issuance));

    expect(tiers).toEqual(['major', 'standard', 'minor', 'frontier']);
    expect(allocations).toEqual([
      UBK_BASE_ALLOCATION * 5n,
      UBK_BASE_ALLOCATION * 3n,
      UBK_BASE_ALLOCATION * 2n,
      UBK_BASE_ALLOCATION,
    ]);
  });

  it('keeps allocation monotonic non-decreasing as issuance grows over sampled range', () => {
    const sampledIssuance = [
      0n,
      1_000_000n,
      4_999_999n,
      5_000_000n,
      15_000_000n,
      20_000_000n,
      30_000_000n,
      50_000_000n,
      140_000_000n,
    ];

    const allocations = sampledIssuance.map((issuance) => calculateUbkAllocation(issuance));

    for (let i = 1; i < allocations.length; i += 1) {
      expect(allocations[i]).toBeGreaterThanOrEqual(allocations[i - 1] ?? 0n);
    }
  });

  it('never emits non-tier allocation values', () => {
    const allowed = new Set([
      UBK_BASE_ALLOCATION,
      UBK_BASE_ALLOCATION * 2n,
      UBK_BASE_ALLOCATION * 3n,
      UBK_BASE_ALLOCATION * 5n,
    ]);

    const sampledIssuance = [
      0n,
      1n,
      3_400_000n,
      5_000_001n,
      19_000_000n,
      20_000_001n,
      49_000_000n,
      50_000_001n,
      999_999_999n,
    ];

    for (const issuance of sampledIssuance) {
      expect(allowed.has(calculateUbkAllocation(issuance))).toBe(true);
    }
  });

  it('maps every tier to exactly one deterministic allocation multiplier', () => {
    const frontier = calculateUbkAllocation(100_000n);
    const minor = calculateUbkAllocation(7_000_000n);
    const standard = calculateUbkAllocation(35_000_000n);
    const major = calculateUbkAllocation(120_000_000n);

    expect(frontier / UBK_BASE_ALLOCATION).toBe(1n);
    expect(minor / UBK_BASE_ALLOCATION).toBe(2n);
    expect(standard / UBK_BASE_ALLOCATION).toBe(3n);
    expect(major / UBK_BASE_ALLOCATION).toBe(5n);
  });

  it('maintains cadence identity between interval days and interval milliseconds', () => {
    const msPerDay = 24 * 3600 * 1000;

    expect(UBK_CADENCE.PAYMENT_INTERVAL_MS).toBeCloseTo(
      UBK_CADENCE.PAYMENT_INTERVAL_REAL_DAYS * msPerDay,
      6,
    );
  });

  it('keeps payments-per-year in realistic monthly cadence bounds', () => {
    expect(UBK_CADENCE.PAYMENTS_PER_REAL_YEAR).toBeGreaterThanOrEqual(30);
    expect(UBK_CADENCE.PAYMENTS_PER_REAL_YEAR).toBeLessThanOrEqual(40);
  });

  it('keeps escrow conversion coherent between in-game months and real-day representation', () => {
    // 24 in-game months should resolve to a finite positive real-day window.
    expect(UBK_CADENCE.INACTIVE_ESCROW_INGAME_MONTHS).toBe(UBK_INACTIVE_ESCROW_MONTHS);
    expect(UBK_CADENCE.INACTIVE_ESCROW_REAL_DAYS).toBeGreaterThan(0);
    expect(UBK_CADENCE.INACTIVE_ESCROW_REAL_DAYS).toBeGreaterThan(UBK_INACTIVE_THRESHOLD_DAYS);
  });

  it('keeps inactive threshold below escrow horizon to allow recoverable returns', () => {
    expect(UBK_INACTIVE_THRESHOLD_DAYS).toBeGreaterThan(0);
    expect(UBK_INACTIVE_THRESHOLD_DAYS).toBeLessThan(UBK_CADENCE.INACTIVE_ESCROW_REAL_DAYS);
  });
});
