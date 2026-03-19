import { describe, it, expect } from 'vitest';
import {
  COMMONS_SNAPSHOTS,
  COMMONS_ALLOCATIONS,
  COMMONS_INFLOWS,
  PEAK_BALANCE_YEAR,
  TOTAL_UBK_DISTRIBUTED_MICRO,
  REPARATIONS_ALLOCATED_MICRO,
  createCommonsFundService,
  type CommonsAllocationCategory,
  type CommonsInflowSource,
} from '../kalon-commons-fund.js';

// ── COMMONS_SNAPSHOTS data integrity ─────────────────────────────────────────

describe('COMMONS_SNAPSHOTS', () => {
  it('has at least 15 entries', () => {
    expect(COMMONS_SNAPSHOTS.length).toBeGreaterThanOrEqual(15);
  });

  it('all snapshotIds are unique', () => {
    const ids = COMMONS_SNAPSHOTS.map((s) => s.snapshotId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all balanceMicro are BigInt and positive', () => {
    for (const snap of COMMONS_SNAPSHOTS) {
      expect(typeof snap.balanceMicro).toBe('bigint');
      expect(snap.balanceMicro).toBeGreaterThan(0n);
    }
  });

  it('all years are positive integers', () => {
    for (const snap of COMMONS_SNAPSHOTS) {
      expect(snap.year).toBeGreaterThan(0);
      expect(Number.isInteger(snap.year)).toBe(true);
    }
  });

  it('balances grow over time (year 1 < year 105)', () => {
    const yr1 = COMMONS_SNAPSHOTS.find((s) => s.year === 1);
    const yr105 = COMMONS_SNAPSHOTS.find((s) => s.year === 105);
    expect(yr1).toBeDefined();
    expect(yr105).toBeDefined();
    expect(yr105!.balanceMicro).toBeGreaterThan(yr1!.balanceMicro);
  });

  it('activeDynastyCount grows over time', () => {
    const yr1 = COMMONS_SNAPSHOTS.find((s) => s.year === 1);
    const yr105 = COMMONS_SNAPSHOTS.find((s) => s.year === 105);
    expect(yr105!.activeDynastyCount).toBeGreaterThan(yr1!.activeDynastyCount);
  });

  it('ubkPerDynastyMicro at year 105 is 500_000_000n', () => {
    const yr105 = COMMONS_SNAPSHOTS.find((s) => s.year === 105);
    expect(yr105?.ubkPerDynastyMicro).toBe(500_000_000n);
  });
});

// ── COMMONS_ALLOCATIONS data integrity ───────────────────────────────────────

describe('COMMONS_ALLOCATIONS', () => {
  it('has at least 20 entries', () => {
    expect(COMMONS_ALLOCATIONS.length).toBeGreaterThanOrEqual(20);
  });

  it('all allocationIds are unique', () => {
    const ids = COMMONS_ALLOCATIONS.map((a) => a.allocationId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all amountMicro are BigInt and positive', () => {
    for (const alloc of COMMONS_ALLOCATIONS) {
      expect(typeof alloc.amountMicro).toBe('bigint');
      expect(alloc.amountMicro).toBeGreaterThan(0n);
    }
  });

  it('all categories are valid', () => {
    const valid: CommonsAllocationCategory[] = [
      'UBK_PAYOUT',
      'INFRASTRUCTURE',
      'SURVEY_SUBSIDY',
      'EMERGENCY_RELIEF',
      'REPARATIONS',
      'SCIENTIFIC_GRANT',
      'CULTURAL_PRESERVATION',
    ];
    for (const alloc of COMMONS_ALLOCATIONS) {
      expect(valid).toContain(alloc.category);
    }
  });

  it('has at least one UBK_PAYOUT allocation', () => {
    expect(COMMONS_ALLOCATIONS.some((a) => a.category === 'UBK_PAYOUT')).toBe(true);
  });

  it('has at least one REPARATIONS allocation', () => {
    expect(COMMONS_ALLOCATIONS.some((a) => a.category === 'REPARATIONS')).toBe(true);
  });
});

// ── COMMONS_INFLOWS data integrity ────────────────────────────────────────────

describe('COMMONS_INFLOWS', () => {
  it('has at least 15 entries', () => {
    expect(COMMONS_INFLOWS.length).toBeGreaterThanOrEqual(15);
  });

  it('all inflowIds are unique', () => {
    const ids = COMMONS_INFLOWS.map((i) => i.inflowId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all sources are valid CommonsInflowSource values', () => {
    const valid: CommonsInflowSource[] = [
      'LEVY_COLLECTION',
      'WORLD_CLAIM_STAKE',
      'TREATY_FORFEIT',
      'EXTINCTION_INHERITANCE',
      'ASSEMBLY_APPROPRIATION',
    ];
    for (const inflow of COMMONS_INFLOWS) {
      expect(valid).toContain(inflow.source);
    }
  });

  it('all amountMicro are BigInt and positive', () => {
    for (const inflow of COMMONS_INFLOWS) {
      expect(typeof inflow.amountMicro).toBe('bigint');
      expect(inflow.amountMicro).toBeGreaterThan(0n);
    }
  });
});

// ── Derived Constants ─────────────────────────────────────────────────────────

describe('PEAK_BALANCE_YEAR', () => {
  it('is a positive integer', () => {
    expect(PEAK_BALANCE_YEAR).toBeGreaterThan(0);
    expect(Number.isInteger(PEAK_BALANCE_YEAR)).toBe(true);
  });

  it('corresponds to the snapshot with highest balance', () => {
    const peak = COMMONS_SNAPSHOTS.reduce((best, s) =>
      s.balanceMicro > best.balanceMicro ? s : best,
    );
    expect(PEAK_BALANCE_YEAR).toBe(peak.year);
  });
});

describe('TOTAL_UBK_DISTRIBUTED_MICRO', () => {
  it('is a BigInt and positive', () => {
    expect(typeof TOTAL_UBK_DISTRIBUTED_MICRO).toBe('bigint');
    expect(TOTAL_UBK_DISTRIBUTED_MICRO).toBeGreaterThan(0n);
  });

  it('matches sum of all UBK_PAYOUT allocations', () => {
    const expected = COMMONS_ALLOCATIONS.filter((a) => a.category === 'UBK_PAYOUT').reduce(
      (sum, a) => sum + a.amountMicro,
      0n,
    );
    expect(TOTAL_UBK_DISTRIBUTED_MICRO).toBe(expected);
  });
});

describe('REPARATIONS_ALLOCATED_MICRO', () => {
  it('is a BigInt and positive', () => {
    expect(typeof REPARATIONS_ALLOCATED_MICRO).toBe('bigint');
    expect(REPARATIONS_ALLOCATED_MICRO).toBeGreaterThan(0n);
  });

  it('matches sum of all REPARATIONS allocations', () => {
    const expected = COMMONS_ALLOCATIONS.filter((a) => a.category === 'REPARATIONS').reduce(
      (sum, a) => sum + a.amountMicro,
      0n,
    );
    expect(REPARATIONS_ALLOCATED_MICRO).toBe(expected);
  });
});

// ── createCommonsFundService ───────────────────────────────────────────────────

describe('createCommonsFundService', () => {
  const svc = createCommonsFundService();

  it('getSnapshot returns correct snapshot for exact year', () => {
    const snap = svc.getSnapshot(1);
    expect(snap?.year).toBe(1);
    expect(snap?.snapshotId).toBe('snap-yr001');
  });

  it('getSnapshot returns undefined for year not in data', () => {
    expect(svc.getSnapshot(999)).toBeUndefined();
  });

  it('getNearestSnapshot returns exact snapshot when year matches', () => {
    const snap = svc.getNearestSnapshot(10);
    expect(snap?.year).toBe(10);
  });

  it('getNearestSnapshot returns nearest for interpolated year', () => {
    const snap = svc.getNearestSnapshot(11);
    expect(snap).toBeDefined();
    // Year 10 is the nearest snapshot
    expect(snap?.year).toBe(10);
  });

  it('getAllocationsByYear returns correct allocations', () => {
    const allocs = svc.getAllocationsByYear(1);
    expect(allocs.every((a) => a.year === 1)).toBe(true);
    expect(allocs.length).toBeGreaterThan(0);
  });

  it('getAllocationsByYear returns empty for year with no allocations', () => {
    expect(svc.getAllocationsByYear(999)).toHaveLength(0);
  });

  it('getAllocationsByCategory returns only UBK_PAYOUT entries', () => {
    const ubk = svc.getAllocationsByCategory('UBK_PAYOUT');
    expect(ubk.every((a) => a.category === 'UBK_PAYOUT')).toBe(true);
    expect(ubk.length).toBeGreaterThan(0);
  });

  it('getAllocationsByCategory returns only REPARATIONS entries', () => {
    const reps = svc.getAllocationsByCategory('REPARATIONS');
    expect(reps.every((a) => a.category === 'REPARATIONS')).toBe(true);
  });

  it('getInflowsByYear returns correct inflows', () => {
    const inflows = svc.getInflowsByYear(1);
    expect(inflows.every((i) => i.year === 1)).toBe(true);
    expect(inflows.length).toBeGreaterThan(0);
  });

  it('getInflowsByYear returns empty for year with no inflows', () => {
    expect(svc.getInflowsByYear(999)).toHaveLength(0);
  });

  it('computeTotalAllocatedMicro is BigInt and positive', () => {
    const total = svc.computeTotalAllocatedMicro();
    expect(typeof total).toBe('bigint');
    expect(total).toBeGreaterThan(0n);
  });

  it('computeTotalInflowMicro is BigInt and positive', () => {
    const total = svc.computeTotalInflowMicro();
    expect(typeof total).toBe('bigint');
    expect(total).toBeGreaterThan(0n);
  });

  it('getUbkHistorySummary returns one entry per snapshot', () => {
    const history = svc.getUbkHistorySummary();
    expect(history.length).toBe(COMMONS_SNAPSHOTS.length);
  });

  it('getUbkHistorySummary entries have year and perDynastyMicro fields', () => {
    const history = svc.getUbkHistorySummary();
    for (const entry of history) {
      expect(typeof entry.year).toBe('number');
      expect(typeof entry.perDynastyMicro).toBe('bigint');
    }
  });

  it('UBK per dynasty increases over time (year 1 < year 105)', () => {
    const history = svc.getUbkHistorySummary();
    const yr1 = history.find((h) => h.year === 1);
    const yr105 = history.find((h) => h.year === 105);
    expect(yr105!.perDynastyMicro).toBeGreaterThan(yr1!.perDynastyMicro);
  });
});
