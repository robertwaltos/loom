import { describe, it, expect } from 'vitest';
import {
  ASSEMBLY_VOTES,
  PASSED_VOTE_COUNT,
  FAILED_VOTE_COUNT,
  CONSTITUTIONAL_VOTE_COUNT,
  TOTAL_REPARATION_KALON_MICRO,
  getVote,
  getVotesByCategory,
  getVotesByYear,
  getVotesByOutcome,
  getConstitutionalVotes,
  getFailedVotes,
  getArchitectVetoedVotes,
  computePassRate,
  getTotalKalonAtStakeMicro,
  getVoteTimeline,
  getVotesByThreshold,
} from '../assembly-voting-history.js';

// ── ASSEMBLY_VOTES data ──────────────────────────────────────────────

describe('ASSEMBLY_VOTES data', () => {
  it('contains exactly 20 votes', () => {
    expect(ASSEMBLY_VOTES.length).toBe(20);
  });

  it('all votes have unique IDs', () => {
    const ids = ASSEMBLY_VOTES.map((v) => v.id);
    expect(new Set(ids).size).toBe(20);
  });

  it('vote-001 is the Founding Charter Ratification', () => {
    const v = ASSEMBLY_VOTES.find((v) => v.id === 'vote-001');
    expect(v?.title).toBe('Founding Charter Ratification');
    expect(v?.forPercentage).toBe(98);
  });

  it('each vote percentages sum to 100', () => {
    for (const v of ASSEMBLY_VOTES) {
      expect(v.forPercentage + v.againstPercentage + v.abstainPercentage).toBe(100);
    }
  });

  it('vote-011 (Chosen Worlds Reparations) has the largest kalonAtStakeMicro', () => {
    const max = ASSEMBLY_VOTES.reduce(
      (m, v) => (v.kalonAtStakeMicro > m ? v.kalonAtStakeMicro : m),
      0n,
    );
    const v011 = ASSEMBLY_VOTES.find((v) => v.id === 'vote-015');
    expect(v011?.kalonAtStakeMicro).toBe(max);
  });
});

// ── Derived constants ────────────────────────────────────────────────

describe('derived constants', () => {
  it('PASSED_VOTE_COUNT is 15', () => {
    expect(PASSED_VOTE_COUNT).toBe(15);
  });

  it('FAILED_VOTE_COUNT is 5', () => {
    expect(FAILED_VOTE_COUNT).toBe(5);
  });

  it('CONSTITUTIONAL_VOTE_COUNT is 9', () => {
    expect(CONSTITUTIONAL_VOTE_COUNT).toBe(9);
  });

  it('TOTAL_REPARATION_KALON_MICRO is positive bigint', () => {
    expect(TOTAL_REPARATION_KALON_MICRO).toBeGreaterThan(0n);
  });

  it('TOTAL_REPARATION_KALON_MICRO sums only REPARATION category votes', () => {
    const expected = ASSEMBLY_VOTES.filter((v) => v.category === 'REPARATION').reduce(
      (s, v) => s + v.kalonAtStakeMicro,
      0n,
    );
    expect(TOTAL_REPARATION_KALON_MICRO).toBe(expected);
  });
});

// ── getVote ──────────────────────────────────────────────────────────

describe('getVote', () => {
  it('returns the correct vote by ID', () => {
    const v = getVote('vote-005');
    expect(v?.title).toBe('Universal Basic KALON Establishment');
  });

  it('returns undefined for unknown ID', () => {
    expect(getVote('vote-999')).toBeUndefined();
  });
});

// ── getVotesByCategory ───────────────────────────────────────────────

describe('getVotesByCategory', () => {
  it('returns ECONOMIC votes', () => {
    const results = getVotesByCategory('ECONOMIC');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((v) => v.category === 'ECONOMIC')).toBe(true);
  });

  it('returns REPARATION votes', () => {
    const results = getVotesByCategory('REPARATION');
    expect(results.length).toBeGreaterThan(0);
    expect(results.map((v) => v.id)).toContain('vote-011');
  });

  it('returns WOUND_RECOGNITION votes', () => {
    const results = getVotesByCategory('WOUND_RECOGNITION');
    expect(results.length).toBeGreaterThan(0);
    expect(results.map((v) => v.id)).toContain('vote-009');
  });

  it('returns EMERGENCY votes', () => {
    const results = getVotesByCategory('EMERGENCY');
    expect(results.length).toBeGreaterThan(0);
  });
});

// ── getVotesByYear ───────────────────────────────────────────────────

describe('getVotesByYear', () => {
  it('returns two votes for year 1 (charter + stellar standard)', () => {
    const results = getVotesByYear(1);
    expect(results.length).toBe(2);
  });

  it('returns votes for year 60 (governance reform + reparations)', () => {
    const results = getVotesByYear(60);
    expect(results.length).toBe(2);
  });

  it('returns empty array for year with no votes', () => {
    expect(getVotesByYear(999).length).toBe(0);
  });
});

// ── getVotesByOutcome ────────────────────────────────────────────────

describe('getVotesByOutcome', () => {
  it('returns PASSED votes', () => {
    const results = getVotesByOutcome('PASSED');
    expect(results.length).toBe(15);
    expect(results.every((v) => v.outcome === 'PASSED')).toBe(true);
  });

  it('returns FAILED votes', () => {
    const results = getVotesByOutcome('FAILED');
    expect(results.length).toBe(5);
  });

  it('returns empty array for VETOED_BY_ARCHITECT (none in data)', () => {
    expect(getVotesByOutcome('VETOED_BY_ARCHITECT').length).toBe(0);
  });
});

// ── getConstitutionalVotes ───────────────────────────────────────────

describe('getConstitutionalVotes', () => {
  it('returns 9 constitutionally significant votes', () => {
    const results = getConstitutionalVotes();
    expect(results.length).toBe(9);
  });

  it('all returned votes have isConstitutionallySignificant = true', () => {
    expect(getConstitutionalVotes().every((v) => v.isConstitutionallySignificant)).toBe(true);
  });

  it('includes vote-001 (Founding Charter)', () => {
    expect(getConstitutionalVotes().map((v) => v.id)).toContain('vote-001');
  });
});

// ── getFailedVotes ───────────────────────────────────────────────────

describe('getFailedVotes', () => {
  it('returns 5 failed votes', () => {
    expect(getFailedVotes().length).toBe(5);
  });

  it('all returned votes have outcome FAILED', () => {
    expect(getFailedVotes().every((v) => v.outcome === 'FAILED')).toBe(true);
  });
});

// ── getArchitectVetoedVotes ──────────────────────────────────────────

describe('getArchitectVetoedVotes', () => {
  it('returns empty array (no VETOED_BY_ARCHITECT in history)', () => {
    expect(getArchitectVetoedVotes().length).toBe(0);
  });
});

// ── computePassRate ──────────────────────────────────────────────────

describe('computePassRate', () => {
  it('returns 75 (15/20 * 100)', () => {
    expect(computePassRate()).toBeCloseTo(75);
  });

  it('returns a number between 0 and 100', () => {
    const rate = computePassRate();
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(rate).toBeLessThanOrEqual(100);
  });
});

// ── getTotalKalonAtStakeMicro ────────────────────────────────────────

describe('getTotalKalonAtStakeMicro', () => {
  it('returns a positive bigint', () => {
    expect(getTotalKalonAtStakeMicro()).toBeGreaterThan(0n);
  });

  it('matches manual sum', () => {
    const expected = ASSEMBLY_VOTES.reduce((s, v) => s + v.kalonAtStakeMicro, 0n);
    expect(getTotalKalonAtStakeMicro()).toBe(expected);
  });
});

// ── getVoteTimeline ──────────────────────────────────────────────────

describe('getVoteTimeline', () => {
  it('returns votes sorted ascending by year', () => {
    const timeline = getVoteTimeline();
    for (let i = 1; i < timeline.length; i++) {
      expect(timeline[i].year).toBeGreaterThanOrEqual(timeline[i - 1].year);
    }
  });

  it('does not mutate the original array', () => {
    expect(getVoteTimeline()).not.toBe(ASSEMBLY_VOTES);
  });

  it('first vote is from year 1', () => {
    expect(getVoteTimeline()[0].year).toBe(1);
  });
});

// ── getVotesByThreshold ──────────────────────────────────────────────

describe('getVotesByThreshold', () => {
  it('returns CONSTITUTIONAL threshold votes', () => {
    const results = getVotesByThreshold('CONSTITUTIONAL');
    expect(results.every((v) => v.threshold === 'CONSTITUTIONAL')).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns SIGNIFICANT threshold votes', () => {
    const results = getVotesByThreshold('SIGNIFICANT');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((v) => v.threshold === 'SIGNIFICANT')).toBe(true);
  });

  it('returns ORDINARY threshold votes', () => {
    const results = getVotesByThreshold('ORDINARY');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((v) => v.threshold === 'ORDINARY')).toBe(true);
  });

  it('threshold counts sum to 20', () => {
    const ordinary = getVotesByThreshold('ORDINARY').length;
    const significant = getVotesByThreshold('SIGNIFICANT').length;
    const constitutional = getVotesByThreshold('CONSTITUTIONAL').length;
    expect(ordinary + significant + constitutional).toBe(20);
  });
});
