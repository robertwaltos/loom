import { describe, it, expect } from 'vitest';
import {
  TREATY_RECORDS,
  TREATY_VIOLATIONS,
  ACTIVE_TREATY_COUNT,
  TOTAL_BOND_MICRO,
  createTreatyService,
} from '../dynasty-alliance-treaties.js';
import type { TreatyService, TreatyDeps } from '../dynasty-alliance-treaties.js';

// ── Mock deps ─────────────────────────────────────────────────────────

const mockDeps: TreatyDeps = {
  clock: { nowIso: () => '2100-01-01T00:00:00Z' },
  idGenerator: { generate: () => 'test-generated-id' },
};

function makeService(): TreatyService {
  return createTreatyService(mockDeps);
}

// ── TREATY_RECORDS data ───────────────────────────────────────────────

describe('TREATY_RECORDS', () => {
  it('contains 15 treaties', () => {
    expect(TREATY_RECORDS.length).toBe(15);
  });

  it('all treaties have unique IDs', () => {
    const ids = TREATY_RECORDS.map((t) => t.treatyId);
    expect(new Set(ids).size).toBe(15);
  });

  it('treaty-001 is the Founding Compact (TRADE_COMPACT, ACTIVE)', () => {
    const t = TREATY_RECORDS.find((t) => t.treatyId === 'treaty-001');
    expect(t?.type).toBe('TRADE_COMPACT');
    expect(t?.status).toBe('ACTIVE');
    expect(t?.assemblyNotified).toBe(true);
  });

  it('treaty-002 is SUSPENDED', () => {
    const t = TREATY_RECORDS.find((t) => t.treatyId === 'treaty-002');
    expect(t?.status).toBe('SUSPENDED');
  });

  it('treaty-003 is EXPIRED', () => {
    const t = TREATY_RECORDS.find((t) => t.treatyId === 'treaty-003');
    expect(t?.status).toBe('EXPIRED');
  });

  it('treaty-005 is DISSOLVED', () => {
    const t = TREATY_RECORDS.find((t) => t.treatyId === 'treaty-005');
    expect(t?.status).toBe('DISSOLVED');
  });

  it('treaty-012 (succession pact) has the largest bond', () => {
    const t = TREATY_RECORDS.find((t) => t.treatyId === 'treaty-012');
    expect(t?.totalKalonBondMicro).toBe(4_000_000_000n);
  });

  it('treaty-014 has all 7 dynasties as signatories', () => {
    const t = TREATY_RECORDS.find((t) => t.treatyId === 'treaty-014');
    expect(t?.signatoryIds.length).toBe(7);
  });
});

// ── TREATY_VIOLATIONS data ────────────────────────────────────────────

describe('TREATY_VIOLATIONS', () => {
  it('contains 8 violations', () => {
    expect(TREATY_VIOLATIONS.length).toBe(8);
  });

  it('all violations have unique IDs', () => {
    const ids = TREATY_VIOLATIONS.map((v) => v.violationId);
    expect(new Set(ids).size).toBe(8);
  });

  it('violation-004 is resolved', () => {
    const v = TREATY_VIOLATIONS.find((v) => v.violationId === 'violation-004');
    expect(v?.wasResolved).toBe(true);
  });

  it('violation-001 is unresolved', () => {
    const v = TREATY_VIOLATIONS.find((v) => v.violationId === 'violation-001');
    expect(v?.wasResolved).toBe(false);
  });
});

// ── Derived constants ─────────────────────────────────────────────────

describe('ACTIVE_TREATY_COUNT', () => {
  it('equals the number of ACTIVE treaties', () => {
    const count = TREATY_RECORDS.filter((t) => t.status === 'ACTIVE').length;
    expect(ACTIVE_TREATY_COUNT).toBe(count);
  });

  it('is greater than 0', () => {
    expect(ACTIVE_TREATY_COUNT).toBeGreaterThan(0);
  });
});

describe('TOTAL_BOND_MICRO', () => {
  it('matches manual sum of all treaties bonds', () => {
    const expected = TREATY_RECORDS.reduce((s, t) => s + t.totalKalonBondMicro, 0n);
    expect(TOTAL_BOND_MICRO).toBe(expected);
  });

  it('is positive', () => {
    expect(TOTAL_BOND_MICRO).toBeGreaterThan(0n);
  });
});

// ── TreatyService.getTreaty ───────────────────────────────────────────

describe('TreatyService.getTreaty', () => {
  it('returns treaty for a known ID', () => {
    const svc = makeService();
    const t = svc.getTreaty('treaty-001');
    expect(t?.type).toBe('TRADE_COMPACT');
  });

  it('returns undefined for unknown ID', () => {
    expect(makeService().getTreaty('treaty-999')).toBeUndefined();
  });
});

// ── TreatyService.getTreatiesByDynasty ────────────────────────────────

describe('TreatyService.getTreatiesByDynasty', () => {
  it('returns treaties for dynasty-ironfold', () => {
    const svc = makeService();
    const treaties = svc.getTreatiesByDynasty('dynasty-ironfold');
    expect(treaties.length).toBeGreaterThan(0);
    expect(treaties.every((t) => t.signatoryIds.includes('dynasty-ironfold'))).toBe(true);
  });

  it('returns empty array for unknown dynasty', () => {
    expect(makeService().getTreatiesByDynasty('dynasty-unknown').length).toBe(0);
  });

  it('dynasty-selvaran participates in multiple treaties', () => {
    const treaties = makeService().getTreatiesByDynasty('dynasty-selvaran');
    expect(treaties.length).toBeGreaterThan(1);
  });
});

// ── TreatyService.getActiveTreaties ──────────────────────────────────

describe('TreatyService.getActiveTreaties', () => {
  it('returns only ACTIVE treaties', () => {
    const active = makeService().getActiveTreaties();
    expect(active.every((t) => t.status === 'ACTIVE')).toBe(true);
  });

  it('count matches ACTIVE_TREATY_COUNT', () => {
    expect(makeService().getActiveTreaties().length).toBe(ACTIVE_TREATY_COUNT);
  });
});

// ── TreatyService.getTreatiesByType ───────────────────────────────────

describe('TreatyService.getTreatiesByType', () => {
  it('returns SURVEY_PARTNERSHIP treaties', () => {
    const results = makeService().getTreatiesByType('SURVEY_PARTNERSHIP');
    expect(results.every((t) => t.type === 'SURVEY_PARTNERSHIP')).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns CHRONICLE_COVENANT treaties', () => {
    const results = makeService().getTreatiesByType('CHRONICLE_COVENANT');
    expect(results.length).toBeGreaterThanOrEqual(3);
  });

  it('returns SUCCESSION_PACT treaties', () => {
    const results = makeService().getTreatiesByType('SUCCESSION_PACT');
    expect(results.length).toBe(1);
    expect(results[0].treatyId).toBe('treaty-012');
  });

  it('returns MUTUAL_DEFENSE treaties', () => {
    const results = makeService().getTreatiesByType('MUTUAL_DEFENSE');
    expect(results.length).toBeGreaterThan(0);
  });
});

// ── TreatyService.getViolationsForTreaty ─────────────────────────────

describe('TreatyService.getViolationsForTreaty', () => {
  it('returns violations for treaty-005 (2 violations)', () => {
    const violations = makeService().getViolationsForTreaty('treaty-005');
    expect(violations.length).toBe(2);
    expect(violations.every((v) => v.treatyId === 'treaty-005')).toBe(true);
  });

  it('returns empty array for treaty with no violations', () => {
    expect(makeService().getViolationsForTreaty('treaty-001').length).toBe(0);
  });

  it('returns violation for treaty-004 (Cassivore chronicle breach)', () => {
    const violations = makeService().getViolationsForTreaty('treaty-004');
    expect(violations.length).toBe(1);
    expect(violations[0].type).toBe('CHRONICLE');
  });
});

// ── TreatyService.computeTotalBondsMicro ─────────────────────────────

describe('TreatyService.computeTotalBondsMicro', () => {
  it('matches TOTAL_BOND_MICRO', () => {
    expect(makeService().computeTotalBondsMicro()).toBe(TOTAL_BOND_MICRO);
  });

  it('returns a positive bigint', () => {
    expect(makeService().computeTotalBondsMicro()).toBeGreaterThan(0n);
  });
});

// ── TreatyService.getDissolutionsInYear ───────────────────────────────

describe('TreatyService.getDissolutionsInYear', () => {
  it('returns treaty-005 for year 52 (violation in that year, treaty dissolved)', () => {
    const result = makeService().getDissolutionsInYear(52);
    expect(result.map((t) => t.treatyId)).toContain('treaty-005');
  });

  it('returns empty array for year with no dissolutions', () => {
    expect(makeService().getDissolutionsInYear(999).length).toBe(0);
  });
});
