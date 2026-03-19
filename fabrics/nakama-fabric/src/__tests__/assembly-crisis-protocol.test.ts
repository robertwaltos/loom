import { describe, it, expect, beforeEach } from 'vitest';
import {
  CANONICAL_CRISES,
  ONGOING_CRISES_AT_YEAR_105,
  TOTAL_KALON_AT_STAKE,
  EMERGENCY_PROTOCOL_COUNT,
  AssemblyCrisisError,
  createCrisisProtocolService,
} from '../assembly-crisis-protocol.js';
import type {
  CrisisProtocolService,
  CrisisVote,
} from '../assembly-crisis-protocol.js';

// ── Deps mock ────────────────────────────────────────────────────────

const mockDeps = {
  clock: { now: () => new Date('2100-01-01') },
  idGenerator: { generate: () => 'test-id' },
};

function makeService(): CrisisProtocolService {
  return createCrisisProtocolService(mockDeps);
}

function makeVote(dynastyId: string, position: 'FOR' | 'AGAINST' | 'ABSTAIN' = 'FOR'): CrisisVote {
  return {
    crisisId: 'crisis-year-08-kalon-devaluation',
    dynastyId,
    position,
    votingPower: 100n,
    rationale: undefined,
  };
}

// ── CANONICAL_CRISES data ────────────────────────────────────────────

describe('CANONICAL_CRISES', () => {
  it('contains 10 crises', () => {
    expect(CANONICAL_CRISES.length).toBe(10);
  });

  it('all crises have unique IDs', () => {
    const ids = CANONICAL_CRISES.map((c) => c.id);
    expect(new Set(ids).size).toBe(10);
  });

  it('first crisis is from Year 8', () => {
    expect(CANONICAL_CRISES[0].year).toBe(8);
  });

  it('crisis-year-38-kalon-audit has ONGOING resolution', () => {
    const c = CANONICAL_CRISES.find((c) => c.id === 'crisis-year-38-kalon-audit');
    expect(c?.resolutionType).toBe('ONGOING');
    expect(c?.resolvedYear).toBeUndefined();
  });

  it('crisis-year-31-lattice-failure has EMERGENCY severity', () => {
    const c = CANONICAL_CRISES.find((c) => c.id === 'crisis-year-31-lattice-failure');
    expect(c?.severity).toBe('EMERGENCY');
  });
});

// ── Derived constants ────────────────────────────────────────────────

describe('derived constants', () => {
  it('ONGOING_CRISES_AT_YEAR_105 is 3', () => {
    expect(ONGOING_CRISES_AT_YEAR_105).toBe(3);
  });

  it('TOTAL_KALON_AT_STAKE is a positive bigint', () => {
    expect(TOTAL_KALON_AT_STAKE).toBeGreaterThan(0n);
  });

  it('TOTAL_KALON_AT_STAKE matches manual reduction', () => {
    const expected = CANONICAL_CRISES.reduce((s, c) => s + c.kalonAtStake, 0n);
    expect(TOTAL_KALON_AT_STAKE).toBe(expected);
  });

  it('EMERGENCY_PROTOCOL_COUNT equals number of EMERGENCY severity crises', () => {
    const count = CANONICAL_CRISES.filter((c) => c.severity === 'EMERGENCY').length;
    expect(EMERGENCY_PROTOCOL_COUNT).toBe(count);
  });
});

// ── AssemblyCrisisError ──────────────────────────────────────────────

describe('AssemblyCrisisError', () => {
  it('has correct name, code, crisisId', () => {
    const err = new AssemblyCrisisError('TEST_CODE', 'crisis-xyz', 'detail');
    expect(err.name).toBe('AssemblyCrisisError');
    expect(err.code).toBe('TEST_CODE');
    expect(err.crisisId).toBe('crisis-xyz');
  });

  it('message contains code and crisisId', () => {
    const err = new AssemblyCrisisError('C', 'ID', 'd');
    expect(err.message).toContain('C');
    expect(err.message).toContain('ID');
  });
});

// ── createCrisisProtocolService ──────────────────────────────────────

describe('CrisisProtocolService.getCrisis', () => {
  it('returns the crisis for a known ID', () => {
    const svc = makeService();
    const crisis = svc.getCrisis('crisis-year-08-kalon-devaluation');
    expect(crisis?.name).toBe('The Great Devaluation Panic');
  });

  it('returns undefined for unknown ID', () => {
    expect(makeService().getCrisis('does-not-exist')).toBeUndefined();
  });
});

describe('CrisisProtocolService.getActiveCrises', () => {
  it('returns only ONGOING crises at or before the given year', () => {
    const svc = makeService();
    const active = svc.getActiveCrises(105);
    expect(active.every((c) => c.resolutionType === 'ONGOING')).toBe(true);
  });

  it('returns 3 active crises at Year 105', () => {
    expect(makeService().getActiveCrises(105).length).toBe(3);
  });

  it('returns 0 active crises before any ONGOING crisis starts', () => {
    expect(makeService().getActiveCrises(1).length).toBe(0);
  });
});

describe('CrisisProtocolService.getCrisesByYear', () => {
  it('returns crises matching the given year', () => {
    const results = makeService().getCrisesByYear(8);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('crisis-year-08-kalon-devaluation');
  });

  it('returns empty array for a year with no crises', () => {
    expect(makeService().getCrisesByYear(999).length).toBe(0);
  });
});

describe('CrisisProtocolService.getCrisesByCategory', () => {
  it('returns CONSTITUTIONAL crises', () => {
    const results = makeService().getCrisesByCategory('CONSTITUTIONAL');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((c) => c.category === 'CONSTITUTIONAL')).toBe(true);
  });

  it('returns ECONOMIC crises', () => {
    const results = makeService().getCrisesByCategory('ECONOMIC');
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('CrisisProtocolService.getCrisesByProtocol', () => {
  it('returns crises by EMERGENCY_SESSION protocol', () => {
    const results = makeService().getCrisesByProtocol('EMERGENCY_SESSION');
    expect(results.every((c) => c.protocolInvoked === 'EMERGENCY_SESSION')).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns crises by FOUNDING_MARK_COUNCIL protocol', () => {
    const results = makeService().getCrisesByProtocol('FOUNDING_MARK_COUNCIL');
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('CrisisProtocolService.castVote and getVoteTally', () => {
  it('records a vote and returns tally', () => {
    const svc = makeService();
    const tally = svc.castVote('crisis-year-08-kalon-devaluation', makeVote('dynasty-alpha'));
    expect(tally.for).toBe(1);
    expect(tally.against).toBe(0);
    expect(tally.totalPower).toBe(100n);
  });

  it('accumulates multiple votes correctly', () => {
    const svc = makeService();
    const id = 'crisis-year-08-kalon-devaluation';
    svc.castVote(id, makeVote('dyn-1', 'FOR'));
    svc.castVote(id, makeVote('dyn-2', 'AGAINST'));
    svc.castVote(id, makeVote('dyn-3', 'ABSTAIN'));
    const tally = svc.getVoteTally(id);
    expect(tally.for).toBe(1);
    expect(tally.against).toBe(1);
    expect(tally.abstain).toBe(1);
    expect(tally.totalPower).toBe(300n);
  });

  it('prevents duplicate votes from same dynasty', () => {
    const svc = makeService();
    const id = 'crisis-year-08-kalon-devaluation';
    svc.castVote(id, makeVote('dyn-dup'));
    expect(() => svc.castVote(id, makeVote('dyn-dup'))).toThrow(AssemblyCrisisError);
  });

  it('throws CRISIS_NOT_FOUND for unknown crisisId', () => {
    expect(() => makeService().castVote('unknown', makeVote('d'))).toThrow(AssemblyCrisisError);
  });

  it('getVoteTally returns zero tally when no votes cast', () => {
    const tally = makeService().getVoteTally('crisis-year-08-kalon-devaluation');
    expect(tally.for).toBe(0);
    expect(tally.against).toBe(0);
    expect(tally.totalPower).toBe(0n);
  });

  it('getVoteTally throws CRISIS_NOT_FOUND for unknown crisisId', () => {
    expect(() => makeService().getVoteTally('nope')).toThrow(AssemblyCrisisError);
  });
});

describe('CrisisProtocolService.resolveCrisis', () => {
  it('resolves a crisis with a new resolution type and year', () => {
    const svc = makeService();
    const updated = svc.resolveCrisis(
      'crisis-year-38-kalon-audit',
      'RESOLVED_BY_VOTE',
      110,
    );
    expect(updated.resolutionType).toBe('RESOLVED_BY_VOTE');
    expect(updated.resolvedYear).toBe(110);
  });

  it('throws CRISIS_NOT_FOUND for unknown crisisId', () => {
    expect(() =>
      makeService().resolveCrisis('nope', 'RESOLVED_BY_VOTE', 100),
    ).toThrow(AssemblyCrisisError);
  });
});

describe('CrisisProtocolService.getCrisisTimeline', () => {
  it('returns crises sorted by year ascending', () => {
    const timeline = makeService().getCrisisTimeline();
    for (let i = 1; i < timeline.length; i++) {
      expect(timeline[i].year).toBeGreaterThanOrEqual(timeline[i - 1].year);
    }
  });

  it('first entry is the Year 8 crisis', () => {
    expect(makeService().getCrisisTimeline()[0].year).toBe(8);
  });
});
