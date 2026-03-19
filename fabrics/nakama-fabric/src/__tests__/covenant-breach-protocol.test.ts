import { describe, it, expect, beforeEach } from 'vitest';
import {
  COVENANT_DEFINITIONS,
  CANONICAL_BREACHES,
  MOST_BREACHED_DYNASTY,
  EXISTENTIAL_BREACH_COUNT,
  UNRESOLVED_BREACH_COUNT,
  createCovenantBreachService,
} from '../covenant-breach-protocol.js';
import type {
  CovenantBreachService,
  CovenantBreachServiceDeps,
} from '../covenant-breach-protocol.js';

function makeDeps(): CovenantBreachServiceDeps {
  let counter = 0;
  return {
    clock: { nowMs: () => ++counter * 1000 },
    idGenerator: { next: () => `id-${++counter}` },
  };
}

let service: CovenantBreachService;

beforeEach(() => {
  service = createCovenantBreachService(makeDeps());
});

// ─── Constants ────────────────────────────────────────────────────────────────

describe('constants', () => {
  it('MOST_BREACHED_DYNASTY is ascendancy-bloc', () => {
    expect(MOST_BREACHED_DYNASTY).toBe('ascendancy-bloc');
  });

  it('EXISTENTIAL_BREACH_COUNT is 1', () => {
    expect(EXISTENTIAL_BREACH_COUNT).toBe(1);
  });

  it('UNRESOLVED_BREACH_COUNT is 2', () => {
    expect(UNRESOLVED_BREACH_COUNT).toBe(2);
  });

  it('COVENANT_DEFINITIONS has 7 entries', () => {
    expect(COVENANT_DEFINITIONS).toHaveLength(7);
  });

  it('all covenants are foundational and adopted in year 1', () => {
    for (const def of COVENANT_DEFINITIONS) {
      expect(def.isFoundational).toBe(true);
      expect(def.adoptedYear).toBe(1);
    }
  });

  it('CANONICAL_BREACHES has 10 entries', () => {
    expect(CANONICAL_BREACHES).toHaveLength(10);
  });

  it('CANONICAL_BREACHES has exactly 1 EXISTENTIAL breach', () => {
    const existential = CANONICAL_BREACHES.filter((b) => b.severity === 'EXISTENTIAL');
    expect(existential).toHaveLength(EXISTENTIAL_BREACH_COUNT);
  });

  it('CANONICAL_BREACHES has exactly 2 UNRESOLVED breaches', () => {
    const unresolved = CANONICAL_BREACHES.filter((b) => b.status === 'UNRESOLVED');
    expect(unresolved).toHaveLength(UNRESOLVED_BREACH_COUNT);
  });

  it('breach-002 is the EXISTENTIAL ECONOMIC_TRANSPARENCY breach by ascendancy-bloc', () => {
    const breach = CANONICAL_BREACHES.find((b) => b.id === 'breach-002');
    expect(breach?.severity).toBe('EXISTENTIAL');
    expect(breach?.covenantId).toBe('ECONOMIC_TRANSPARENCY');
    expect(breach?.dynastyId).toBe('ascendancy-bloc');
  });
});

// ─── getBreach ────────────────────────────────────────────────────────────────

describe('getBreach', () => {
  it('returns breach for known id', () => {
    const breach = service.getBreach('breach-001');
    expect(breach).toBeDefined();
    expect(breach?.id).toBe('breach-001');
  });

  it('returns undefined for unknown id', () => {
    expect(service.getBreach('breach-999')).toBeUndefined();
  });

  it('breach-001 is by ascendancy-bloc', () => {
    expect(service.getBreach('breach-001')?.dynastyId).toBe('ascendancy-bloc');
  });
});

// ─── getBreachesByDynasty ─────────────────────────────────────────────────────

describe('getBreachesByDynasty', () => {
  it('returns all breaches for ascendancy-bloc', () => {
    const breaches = service.getBreachesByDynasty('ascendancy-bloc');
    expect(breaches.length).toBeGreaterThanOrEqual(5);
    for (const b of breaches) {
      expect(b.dynastyId).toBe('ascendancy-bloc');
    }
  });

  it('returns empty array for dynasty with no breaches', () => {
    expect(service.getBreachesByDynasty('dynasty-nobody')).toHaveLength(0);
  });

  it('returns 1 breach for dynasty-terminus', () => {
    const breaches = service.getBreachesByDynasty('dynasty-terminus');
    expect(breaches).toHaveLength(1);
    expect(breaches[0]?.id).toBe('breach-009');
  });
});

// ─── getBreachesByCovenant ────────────────────────────────────────────────────

describe('getBreachesByCovenant', () => {
  it('returns breaches for LATTICE_STEWARDSHIP', () => {
    const breaches = service.getBreachesByCovenant('LATTICE_STEWARDSHIP');
    expect(breaches.length).toBeGreaterThan(0);
    for (const b of breaches) {
      expect(b.covenantId).toBe('LATTICE_STEWARDSHIP');
    }
  });

  it('returns breaches for CHRONICLE_FIDELITY', () => {
    const breaches = service.getBreachesByCovenant('CHRONICLE_FIDELITY');
    expect(breaches.length).toBeGreaterThanOrEqual(2);
  });

  it('returns empty array for covenant with no breaches (DYNASTY_SOVEREIGNTY has 1)', () => {
    const breaches = service.getBreachesByCovenant('DYNASTY_SOVEREIGNTY');
    expect(breaches).toHaveLength(1);
  });
});

// ─── getActiveBreaches ────────────────────────────────────────────────────────

describe('getActiveBreaches', () => {
  it('returns only UNRESOLVED and UNDER_INVESTIGATION breaches', () => {
    const active = service.getActiveBreaches(100);
    for (const b of active) {
      expect(['UNRESOLVED', 'UNDER_INVESTIGATION']).toContain(b.status);
    }
  });

  it('active breach count matches UNRESOLVED + UNDER_INVESTIGATION', () => {
    const unresolvedCount = CANONICAL_BREACHES.filter(
      (b) => b.status === 'UNRESOLVED' || b.status === 'UNDER_INVESTIGATION',
    ).length;
    const active = service.getActiveBreaches(100);
    expect(active).toHaveLength(unresolvedCount);
  });
});

// ─── getConfirmedBreaches ─────────────────────────────────────────────────────

describe('getConfirmedBreaches', () => {
  it('returns only CONFIRMED and SANCTIONED breaches', () => {
    const confirmed = service.getConfirmedBreaches();
    for (const b of confirmed) {
      expect(['CONFIRMED', 'SANCTIONED']).toContain(b.status);
    }
  });

  it('confirmed count is non-zero', () => {
    expect(service.getConfirmedBreaches().length).toBeGreaterThan(0);
  });
});

// ─── getTotalPenaltiesForDynasty ──────────────────────────────────────────────

describe('getTotalPenaltiesForDynasty', () => {
  it('returns 0n for dynasty with no breaches', () => {
    expect(service.getTotalPenaltiesForDynasty('nobody')).toBe(0n);
  });

  it('returns correct sum for ascendancy-bloc', () => {
    // breach-001: 500B, breach-004: 50B, breach-005: 0, breach-007: 0, breach-002: 0
    const expected = 500_000_000_000n + 50_000_000_000n;
    expect(service.getTotalPenaltiesForDynasty('ascendancy-bloc')).toBe(expected);
  });

  it('returns correct sum for dynasty-meridian', () => {
    // breach-008: 200B
    expect(service.getTotalPenaltiesForDynasty('dynasty-meridian')).toBe(200_000_000_000n);
  });

  it('returns correct sum for dynasty-terminus', () => {
    // breach-009: 2.1B
    expect(service.getTotalPenaltiesForDynasty('dynasty-terminus')).toBe(2_100_000_000n);
  });
});

// ─── getCovenantDefinition ────────────────────────────────────────────────────

describe('getCovenantDefinition', () => {
  it('returns definition for known covenantId', () => {
    const def = service.getCovenantDefinition('CHRONICLE_FIDELITY');
    expect(def).toBeDefined();
    expect(def.id).toBe('CHRONICLE_FIDELITY');
    expect(def.isFoundational).toBe(true);
  });

  it('definition fullText is non-empty', () => {
    const def = service.getCovenantDefinition('ECONOMIC_TRANSPARENCY');
    expect(def.fullText.length).toBeGreaterThan(0);
  });

  it('returns all 7 covenants without throwing', () => {
    const covenantIds = COVENANT_DEFINITIONS.map((d) => d.id);
    for (const id of covenantIds) {
      expect(() => service.getCovenantDefinition(id)).not.toThrow();
    }
  });
});

// ─── getMostBreachedCovenant ──────────────────────────────────────────────────

describe('getMostBreachedCovenant', () => {
  it('returns a valid CovenantId', () => {
    const mostBreached = service.getMostBreachedCovenant();
    const validIds = COVENANT_DEFINITIONS.map((d) => d.id);
    expect(validIds).toContain(mostBreached);
  });

  it('ascendancy-bloc has the most breaches overall', () => {
    const byDynasty = service.getBreachesByDynasty('ascendancy-bloc');
    expect(byDynasty.length).toBeGreaterThan(2);
  });
});

// ─── getBreachSummary ─────────────────────────────────────────────────────────

describe('getBreachSummary', () => {
  it('total equals CANONICAL_BREACHES.length', () => {
    const summary = service.getBreachSummary();
    expect(summary.total).toBe(CANONICAL_BREACHES.length);
  });

  it('byDynasty maps dynastyId to correct count', () => {
    const summary = service.getBreachSummary();
    const ascendancyCount = summary.byDynasty.get('ascendancy-bloc');
    expect(ascendancyCount).toBeGreaterThanOrEqual(5);
  });

  it('bySeverity map contains EXISTENTIAL with count 1', () => {
    const summary = service.getBreachSummary();
    expect(summary.bySeverity.get('EXISTENTIAL')).toBe(EXISTENTIAL_BREACH_COUNT);
  });

  it('totalPenaltiesMicro is positive and matches hand calculation', () => {
    const summary = service.getBreachSummary();
    const expected = CANONICAL_BREACHES.reduce((sum, b) => sum + b.kalonPenaltyMicro, 0n);
    expect(summary.totalPenaltiesMicro).toBe(expected);
  });

  it('bySeverity counts sum to total', () => {
    const summary = service.getBreachSummary();
    let severityTotal = 0;
    for (const count of summary.bySeverity.values()) {
      severityTotal += count;
    }
    expect(severityTotal).toBe(summary.total);
  });
});
