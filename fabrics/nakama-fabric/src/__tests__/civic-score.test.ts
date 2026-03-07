import { describe, it, expect } from 'vitest';
import { calculateCivicScore } from '../civic-score.js';
import { kalonToMicro } from '../kalon-constants.js';
import type { CivicScoreInputs } from '../civic-score.js';

const SUPPLY = kalonToMicro(1_000_000_000n);

function emptyInputs(): CivicScoreInputs {
  return {
    chronicleEntryCount: 0,
    kalonBalance: 0n,
    totalKalonSupply: SUPPLY,
    votesParticipated: 0,
    motionsProposed: 0,
    marksCount: 0,
  };
}

describe('Civic Score zero inputs', () => {
  it('returns zero score for zero inputs', () => {
    const result = calculateCivicScore(emptyInputs());
    expect(result.totalScore).toBe(0);
    expect(result.chronicleComponent).toBe(0);
    expect(result.economicComponent).toBe(0);
    expect(result.civicComponent).toBe(0);
  });

  it('enforces dignity floor on voting weight', () => {
    const result = calculateCivicScore(emptyInputs());
    expect(result.votingWeight).toBe(0.001);
  });
});

describe('Civic Score chronicle component', () => {
  it('increases score with entries', () => {
    const low = calculateCivicScore({ ...emptyInputs(), chronicleEntryCount: 10 });
    const high = calculateCivicScore({ ...emptyInputs(), chronicleEntryCount: 500 });
    expect(high.chronicleComponent).toBeGreaterThan(low.chronicleComponent);
    expect(high.totalScore).toBeGreaterThan(low.totalScore);
  });
});

describe('Civic Score economic component', () => {
  it('increases score with KALON balance', () => {
    const poor = calculateCivicScore({ ...emptyInputs(), kalonBalance: kalonToMicro(100n) });
    const rich = calculateCivicScore({ ...emptyInputs(), kalonBalance: kalonToMicro(100_000n) });
    expect(rich.economicComponent).toBeGreaterThan(poor.economicComponent);
  });

  it('handles zero total supply gracefully', () => {
    const result = calculateCivicScore({
      ...emptyInputs(),
      kalonBalance: kalonToMicro(100n),
      totalKalonSupply: 0n,
      chronicleEntryCount: 10,
    });
    expect(result.economicComponent).toBe(0);
    expect(result.totalScore).toBeGreaterThan(0);
  });
});

describe('Civic Score civic component', () => {
  it('increases score with participation', () => {
    const passive = calculateCivicScore(emptyInputs());
    const active = calculateCivicScore({
      ...emptyInputs(),
      votesParticipated: 50,
      motionsProposed: 5,
    });
    expect(active.civicComponent).toBeGreaterThan(passive.civicComponent);
  });
});

describe('Civic Score voting weight', () => {
  it('produces higher weight for higher score', () => {
    const low = calculateCivicScore({
      ...emptyInputs(),
      chronicleEntryCount: 1,
      kalonBalance: kalonToMicro(10n),
      votesParticipated: 1,
    });
    const high = calculateCivicScore({
      ...emptyInputs(),
      chronicleEntryCount: 500,
      kalonBalance: kalonToMicro(100_000n),
      votesParticipated: 50,
      motionsProposed: 10,
    });
    expect(high.votingWeight).toBeGreaterThan(low.votingWeight);
  });
});

describe('Civic Score MARKS multiplier', () => {
  it('returns 1.0 multiplier with zero marks', () => {
    const result = calculateCivicScore(emptyInputs());
    expect(result.marksMultiplier).toBe(1.0);
  });

  it('applies 15% per mark to total score', () => {
    const base = calculateCivicScore({
      ...emptyInputs(),
      chronicleEntryCount: 100,
      marksCount: 0,
    });
    const withMarks = calculateCivicScore({
      ...emptyInputs(),
      chronicleEntryCount: 100,
      marksCount: 2,
    });
    expect(withMarks.marksMultiplier).toBeCloseTo(1.3, 10);
    expect(withMarks.totalScore).toBeGreaterThan(base.totalScore);
  });

  it('marks boost voting weight', () => {
    const base = calculateCivicScore({
      ...emptyInputs(),
      chronicleEntryCount: 50,
      kalonBalance: kalonToMicro(1000n),
      votesParticipated: 10,
      marksCount: 0,
    });
    const boosted = calculateCivicScore({
      ...emptyInputs(),
      chronicleEntryCount: 50,
      kalonBalance: kalonToMicro(1000n),
      votesParticipated: 10,
      marksCount: 5,
    });
    expect(boosted.marksMultiplier).toBeCloseTo(1.75, 10);
    expect(boosted.votingWeight).toBeGreaterThan(base.votingWeight);
  });

  it('total score clamped at MAX_SCORE even with many marks', () => {
    const result = calculateCivicScore({
      ...emptyInputs(),
      chronicleEntryCount: 1000,
      kalonBalance: kalonToMicro(100_000_000n),
      votesParticipated: 100,
      motionsProposed: 10,
      marksCount: 20,
    });
    expect(result.totalScore).toBeLessThanOrEqual(10000);
  });
});
