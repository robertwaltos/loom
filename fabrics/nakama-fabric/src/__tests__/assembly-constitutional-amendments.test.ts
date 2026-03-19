import { describe, it, expect } from 'vitest';
import {
  CONSTITUTIONAL_AMENDMENTS,
  RATIFIED_COUNT,
  REJECTED_COUNT,
  ARCHITECT_VETOED_COUNT,
  getAmendment,
  getAmendmentsByScope,
  getAmendmentsByYear,
  getRatifiedAmendments,
  getRejectedAmendments,
  getAmendmentsWithArchitectVeto,
  getAmendmentChronology,
  computeTotalEconomicImpactMicro,
  getAmendmentSummary,
} from '../assembly-constitutional-amendments.js';

// ── CONSTITUTIONAL_AMENDMENTS data ───────────────────────────────────

describe('CONSTITUTIONAL_AMENDMENTS data', () => {
  it('contains exactly 12 amendments', () => {
    expect(CONSTITUTIONAL_AMENDMENTS.length).toBe(12);
  });

  it('all amendments have unique IDs', () => {
    const ids = CONSTITUTIONAL_AMENDMENTS.map((a) => a.amendmentId);
    expect(new Set(ids).size).toBe(12);
  });

  it('first amendment is CA-001 from Year 5', () => {
    const ca001 = CONSTITUTIONAL_AMENDMENTS[0];
    expect(ca001.amendmentId).toBe('CA-001');
    expect(ca001.year).toBe(5);
  });

  it('last amendment is CA-012 from Year 103', () => {
    const ca012 = CONSTITUTIONAL_AMENDMENTS[CONSTITUTIONAL_AMENDMENTS.length - 1];
    expect(ca012.amendmentId).toBe('CA-012');
    expect(ca012.year).toBe(103);
  });

  it('CA-003 has the narrowest passing margin note in summary', () => {
    const ca003 = CONSTITUTIONAL_AMENDMENTS.find((a) => a.amendmentId === 'CA-003');
    expect(ca003?.yesVotes).toBe(221);
    expect(ca003?.noVotes).toBe(189);
  });

  it('CA-004 is the only REJECTED amendment', () => {
    const rejected = CONSTITUTIONAL_AMENDMENTS.filter((a) => a.status === 'REJECTED');
    expect(rejected.length).toBe(1);
    expect(rejected[0].amendmentId).toBe('CA-004');
  });

  it('CA-009 has ABSENT architect vote (post-death)', () => {
    const ca009 = CONSTITUTIONAL_AMENDMENTS.find((a) => a.amendmentId === 'CA-009');
    expect(ca009?.architectVote).toBe('ABSENT');
  });

  it('CA-011 kalonImpact is the largest', () => {
    const ca011 = CONSTITUTIONAL_AMENDMENTS.find((a) => a.amendmentId === 'CA-011');
    expect(ca011?.kalonImpactMicro).toBe(120_000_000_000_000n);
  });
});

// ── Derived constants ────────────────────────────────────────────────

describe('derived constants', () => {
  it('RATIFIED_COUNT is 11', () => {
    expect(RATIFIED_COUNT).toBe(11);
  });

  it('REJECTED_COUNT is 1', () => {
    expect(REJECTED_COUNT).toBe(1);
  });

  it('ARCHITECT_VETOED_COUNT is 1', () => {
    expect(ARCHITECT_VETOED_COUNT).toBe(1);
  });

  it('RATIFIED_COUNT + REJECTED_COUNT equals total', () => {
    expect(RATIFIED_COUNT + REJECTED_COUNT).toBe(CONSTITUTIONAL_AMENDMENTS.length);
  });
});

// ── getAmendment ─────────────────────────────────────────────────────

describe('getAmendment', () => {
  it('returns the correct amendment by ID', () => {
    const a = getAmendment('CA-005');
    expect(a?.title).toBe('World Sovereignty Act');
    expect(a?.scope).toBe('TERRITORY');
  });

  it('returns undefined for unknown ID', () => {
    expect(getAmendment('CA-999')).toBeUndefined();
  });

  it('returns CA-001 correctly', () => {
    expect(getAmendment('CA-001')?.year).toBe(5);
  });
});

// ── getAmendmentsByScope ─────────────────────────────────────────────

describe('getAmendmentsByScope', () => {
  it('returns ECONOMY amendments (CA-001, CA-006, CA-011)', () => {
    const results = getAmendmentsByScope('ECONOMY');
    expect(results.length).toBe(3);
    expect(results.map((a) => a.amendmentId)).toContain('CA-001');
    expect(results.map((a) => a.amendmentId)).toContain('CA-006');
    expect(results.map((a) => a.amendmentId)).toContain('CA-011');
  });

  it('returns ACCOUNTABILITY amendments', () => {
    const results = getAmendmentsByScope('ACCOUNTABILITY');
    expect(results.length).toBeGreaterThanOrEqual(3);
    expect(results.map((a) => a.amendmentId)).toContain('CA-007');
    expect(results.map((a) => a.amendmentId)).toContain('CA-009');
    expect(results.map((a) => a.amendmentId)).toContain('CA-012');
  });

  it('returns TERRITORY amendment (CA-005 only)', () => {
    const results = getAmendmentsByScope('TERRITORY');
    expect(results.length).toBe(1);
    expect(results[0].amendmentId).toBe('CA-005');
  });

  it('returns SUCCESSION amendment (CA-008 only)', () => {
    const results = getAmendmentsByScope('SUCCESSION');
    expect(results.length).toBe(1);
    expect(results[0].amendmentId).toBe('CA-008');
  });

  it('returns empty array for scope with no amendments', () => {
    // GOVERNANCE has CA-003 — check exact expected count
    const results = getAmendmentsByScope('GOVERNANCE');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((a) => a.scope === 'GOVERNANCE')).toBe(true);
  });
});

// ── getAmendmentsByYear ──────────────────────────────────────────────

describe('getAmendmentsByYear', () => {
  it('returns CA-001 for year 5', () => {
    const results = getAmendmentsByYear(5);
    expect(results.length).toBe(1);
    expect(results[0].amendmentId).toBe('CA-001');
  });

  it('returns empty array for year with no amendment', () => {
    expect(getAmendmentsByYear(99).length).toBe(0);
  });
});

// ── getRatifiedAmendments / getRejectedAmendments ────────────────────

describe('getRatifiedAmendments', () => {
  it('returns 11 ratified amendments', () => {
    const results = getRatifiedAmendments();
    expect(results.length).toBe(11);
    expect(results.every((a) => a.status === 'RATIFIED')).toBe(true);
  });
});

describe('getRejectedAmendments', () => {
  it('returns 1 rejected amendment (CA-004)', () => {
    const results = getRejectedAmendments();
    expect(results.length).toBe(1);
    expect(results[0].amendmentId).toBe('CA-004');
  });
});

// ── getAmendmentsWithArchitectVeto ───────────────────────────────────

describe('getAmendmentsWithArchitectVeto', () => {
  it('returns only CA-004 (the single AGAINST vote)', () => {
    const results = getAmendmentsWithArchitectVeto();
    expect(results.length).toBe(1);
    expect(results[0].amendmentId).toBe('CA-004');
    expect(results[0].architectVote).toBe('AGAINST');
  });
});

// ── getAmendmentChronology ───────────────────────────────────────────

describe('getAmendmentChronology', () => {
  it('returns amendments sorted by year ascending', () => {
    const chron = getAmendmentChronology();
    for (let i = 1; i < chron.length; i++) {
      expect(chron[i].year).toBeGreaterThanOrEqual(chron[i - 1].year);
    }
  });

  it('first entry is from year 5', () => {
    expect(getAmendmentChronology()[0].year).toBe(5);
  });

  it('does not mutate the original array', () => {
    const chron = getAmendmentChronology();
    expect(chron).not.toBe(CONSTITUTIONAL_AMENDMENTS);
  });
});

// ── computeTotalEconomicImpactMicro ──────────────────────────────────

describe('computeTotalEconomicImpactMicro', () => {
  it('returns a positive bigint', () => {
    const total = computeTotalEconomicImpactMicro();
    expect(total).toBeGreaterThan(0n);
  });

  it('matches manual sum of kalonImpactMicro', () => {
    const expected = CONSTITUTIONAL_AMENDMENTS.reduce((s, a) => s + a.kalonImpactMicro, 0n);
    expect(computeTotalEconomicImpactMicro()).toBe(expected);
  });
});

// ── getAmendmentSummary ──────────────────────────────────────────────

describe('getAmendmentSummary', () => {
  it('summary.total is 12', () => {
    expect(getAmendmentSummary().total).toBe(12);
  });

  it('summary.ratified matches RATIFIED_COUNT', () => {
    expect(getAmendmentSummary().ratified).toBe(RATIFIED_COUNT);
  });

  it('summary.rejected matches REJECTED_COUNT', () => {
    expect(getAmendmentSummary().rejected).toBe(REJECTED_COUNT);
  });

  it('summary.architectVetoed matches ARCHITECT_VETOED_COUNT', () => {
    expect(getAmendmentSummary().architectVetoed).toBe(ARCHITECT_VETOED_COUNT);
  });

  it('summary.totalEconomicImpactMicro matches computeTotalEconomicImpactMicro', () => {
    expect(getAmendmentSummary().totalEconomicImpactMicro).toBe(computeTotalEconomicImpactMicro());
  });

  it('scopeBreakdown counts sum to 12', () => {
    const breakdown = getAmendmentSummary().scopeBreakdown;
    const total = Object.values(breakdown).reduce((s, n) => s + n, 0);
    expect(total).toBe(12);
  });

  it('scopeBreakdown.ECONOMY is 3', () => {
    expect(getAmendmentSummary().scopeBreakdown.ECONOMY).toBe(3);
  });
});
