import { describe, it, expect } from 'vitest';
import { calculateCivicScore } from '../civic-score.js';
import { kalonToMicro } from '../kalon-constants.js';
import type { CivicScoreInputs } from '../civic-score.js';

const TOTAL_SUPPLY = kalonToMicro(1_000_000_000n);

function baseInputs(): CivicScoreInputs {
  return {
    chronicleEntryCount: 0,
    kalonBalance: 0n,
    totalKalonSupply: TOTAL_SUPPLY,
    votesParticipated: 0,
    motionsProposed: 0,
    marksCount: 0,
  };
}

describe('Civic Score simulation scenarios', () => {
  it('keeps low-engagement dynasties at dignity floor', () => {
    const cohorts: CivicScoreInputs[] = [
      baseInputs(),
      { ...baseInputs(), chronicleEntryCount: 1 },
      { ...baseInputs(), votesParticipated: 1 },
      { ...baseInputs(), kalonBalance: 1n },
    ];

    for (const input of cohorts) {
      const result = calculateCivicScore(input);
      expect(result.votingWeight).toBeGreaterThanOrEqual(0.001);
    }
  });

  it('orders archetypes by expected influence strength', () => {
    const archivist = calculateCivicScore({
      ...baseInputs(),
      chronicleEntryCount: 900,
      votesParticipated: 60,
      motionsProposed: 8,
      kalonBalance: kalonToMicro(5_000n),
    });
    const trader = calculateCivicScore({
      ...baseInputs(),
      chronicleEntryCount: 120,
      votesParticipated: 35,
      motionsProposed: 3,
      kalonBalance: kalonToMicro(500_000n),
    });
    const newcomer = calculateCivicScore({
      ...baseInputs(),
      chronicleEntryCount: 5,
      votesParticipated: 2,
      motionsProposed: 0,
      kalonBalance: kalonToMicro(50n),
    });

    expect(archivist.totalScore).toBeGreaterThan(newcomer.totalScore);
    expect(trader.totalScore).toBeGreaterThan(newcomer.totalScore);
    expect(archivist.votingWeight).toBeGreaterThan(newcomer.votingWeight);
    expect(trader.votingWeight).toBeGreaterThan(newcomer.votingWeight);
  });

  it('shows diminishing returns in chronicle depth at high entry counts', () => {
    const low = calculateCivicScore({ ...baseInputs(), chronicleEntryCount: 10 });
    const lowPlusOne = calculateCivicScore({ ...baseInputs(), chronicleEntryCount: 11 });
    const high = calculateCivicScore({ ...baseInputs(), chronicleEntryCount: 900 });
    const highPlusOne = calculateCivicScore({ ...baseInputs(), chronicleEntryCount: 901 });

    const lowMarginalGain = lowPlusOne.chronicleComponent - low.chronicleComponent;
    const highMarginalGain = highPlusOne.chronicleComponent - high.chronicleComponent;

    expect(lowMarginalGain).toBeGreaterThanOrEqual(highMarginalGain);
  });

  it('keeps score stable when total supply is invalid', () => {
    const regular = calculateCivicScore({
      ...baseInputs(),
      chronicleEntryCount: 200,
      votesParticipated: 25,
      motionsProposed: 4,
      kalonBalance: kalonToMicro(100_000n),
    });
    const brokenSupply = calculateCivicScore({
      ...baseInputs(),
      totalKalonSupply: 0n,
      chronicleEntryCount: 200,
      votesParticipated: 25,
      motionsProposed: 4,
      kalonBalance: kalonToMicro(100_000n),
    });

    expect(brokenSupply.economicComponent).toBe(0);
    expect(brokenSupply.totalScore).toBeLessThan(regular.totalScore);
    expect(brokenSupply.totalScore).toBeGreaterThan(0);
  });

  it('applies mark multipliers proportionally before clamping', () => {
    const base = calculateCivicScore({
      ...baseInputs(),
      chronicleEntryCount: 250,
      votesParticipated: 40,
      motionsProposed: 6,
      kalonBalance: kalonToMicro(40_000n),
      marksCount: 0,
    });
    const marked = calculateCivicScore({
      ...baseInputs(),
      chronicleEntryCount: 250,
      votesParticipated: 40,
      motionsProposed: 6,
      kalonBalance: kalonToMicro(40_000n),
      marksCount: 4,
    });

    expect(marked.marksMultiplier).toBeCloseTo(1.6, 10);
    expect(marked.totalScore).toBeGreaterThan(base.totalScore);
  });

  it('clamps very strong dynasties to max score and full weight', () => {
    const dominant = calculateCivicScore({
      ...baseInputs(),
      chronicleEntryCount: 10_000,
      votesParticipated: 1000,
      motionsProposed: 100,
      kalonBalance: TOTAL_SUPPLY,
      marksCount: 50,
    });

    expect(dominant.totalScore).toBe(10_000);
    expect(dominant.votingWeight).toBe(1);
  });

  it('never decreases score when adding positive contributions', () => {
    const checkpoints: CivicScoreInputs[] = [
      baseInputs(),
      { ...baseInputs(), chronicleEntryCount: 20 },
      { ...baseInputs(), chronicleEntryCount: 20, votesParticipated: 5 },
      { ...baseInputs(), chronicleEntryCount: 20, votesParticipated: 5, motionsProposed: 1 },
      { ...baseInputs(), chronicleEntryCount: 20, votesParticipated: 5, motionsProposed: 1, kalonBalance: kalonToMicro(500n) },
      { ...baseInputs(), chronicleEntryCount: 20, votesParticipated: 5, motionsProposed: 1, kalonBalance: kalonToMicro(500n), marksCount: 1 },
    ];

    let previous = -1;
    for (const state of checkpoints) {
      const score = calculateCivicScore(state).totalScore;
      expect(score).toBeGreaterThanOrEqual(previous);
      previous = score;
    }
  });

  it('reflects economic dilution when supply grows faster than balance', () => {
    const before = calculateCivicScore({
      ...baseInputs(),
      kalonBalance: kalonToMicro(20_000n),
      totalKalonSupply: kalonToMicro(1_000_000n),
    });
    const afterDilution = calculateCivicScore({
      ...baseInputs(),
      kalonBalance: kalonToMicro(20_000n),
      totalKalonSupply: kalonToMicro(10_000_000n),
    });

    expect(afterDilution.economicComponent).toBeLessThan(before.economicComponent);
    expect(afterDilution.totalScore).toBeLessThan(before.totalScore);
  });

  it('keeps voting weight bounded in [0.001, 1]', () => {
    const scenarios: CivicScoreInputs[] = [
      baseInputs(),
      { ...baseInputs(), chronicleEntryCount: 40, votesParticipated: 4 },
      {
        ...baseInputs(),
        chronicleEntryCount: 400,
        votesParticipated: 80,
        motionsProposed: 12,
        kalonBalance: kalonToMicro(300_000n),
        marksCount: 8,
      },
    ];

    for (const input of scenarios) {
      const weight = calculateCivicScore(input).votingWeight;
      expect(weight).toBeGreaterThanOrEqual(0.001);
      expect(weight).toBeLessThanOrEqual(1);
    }
  });

  it('produces deterministic outputs for identical snapshots', () => {
    const snapshot = {
      ...baseInputs(),
      chronicleEntryCount: 175,
      votesParticipated: 27,
      motionsProposed: 5,
      kalonBalance: kalonToMicro(77_000n),
      marksCount: 3,
    };

    const first = calculateCivicScore(snapshot);
    const second = calculateCivicScore(snapshot);
    expect(second).toEqual(first);
  });
});
