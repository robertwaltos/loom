import { describe, it, expect } from 'vitest';
import { calculateCivicScore } from '../civic-score.js';
import { kalonToMicro } from '../kalon-constants.js';
import type { CivicScoreInputs } from '../civic-score.js';

const SUPPLY = kalonToMicro(1_000_000_000n);

function emptyInputs(): CivicScoreInputs {
  return {
    remembranceEntryCount: 0,
    kalonBalance: 0n,
    totalKalonSupply: SUPPLY,
    votesParticipated: 0,
    motionsProposed: 0,
  };
}

describe('Civic Score zero inputs', () => {
  it('returns zero score for zero inputs', () => {
    const result = calculateCivicScore(emptyInputs());
    expect(result.totalScore).toBe(0);
    expect(result.remembranceComponent).toBe(0);
    expect(result.economicComponent).toBe(0);
    expect(result.civicComponent).toBe(0);
  });

  it('enforces dignity floor on voting weight', () => {
    const result = calculateCivicScore(emptyInputs());
    expect(result.votingWeight).toBe(0.001);
  });
});

describe('Civic Score remembrance component', () => {
  it('increases score with entries', () => {
    const low = calculateCivicScore({ ...emptyInputs(), remembranceEntryCount: 10 });
    const high = calculateCivicScore({ ...emptyInputs(), remembranceEntryCount: 500 });
    expect(high.remembranceComponent).toBeGreaterThan(low.remembranceComponent);
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
      remembranceEntryCount: 10,
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
      remembranceEntryCount: 1,
      kalonBalance: kalonToMicro(10n),
      votesParticipated: 1,
    });
    const high = calculateCivicScore({
      ...emptyInputs(),
      remembranceEntryCount: 500,
      kalonBalance: kalonToMicro(100_000n),
      votesParticipated: 50,
      motionsProposed: 10,
    });
    expect(high.votingWeight).toBeGreaterThan(low.votingWeight);
  });
});
