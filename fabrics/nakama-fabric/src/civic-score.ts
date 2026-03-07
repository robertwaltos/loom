/**
 * Civic Score — Weighted influence in The Assembly.
 *
 * Bible v1.2: Civic Score determines a dynasty's voting weight.
 * Three factors compose the score:
 *
 *   1. Remembrance Depth (40%) — entries in The Remembrance
 *   2. Economic Standing (35%) — KALON balance relative to total supply
 *   3. Civic Contribution (25%) — governance participation, voted motions
 *
 * A "dignity floor" guarantees every active dynasty a minimum
 * voting weight of 0.001 (1/1000th) regardless of score.
 *
 * All calculations use integer arithmetic (basis points, 10000 = 100%).
 * Score range: [0, 10000] basis points.
 */

export interface CivicScoreInputs {
  readonly remembranceEntryCount: number;
  readonly kalonBalance: bigint;
  readonly totalKalonSupply: bigint;
  readonly votesParticipated: number;
  readonly motionsProposed: number;
}

export interface CivicScoreResult {
  readonly totalScore: number;
  readonly remembranceComponent: number;
  readonly economicComponent: number;
  readonly civicComponent: number;
  readonly votingWeight: number;
}

/** Maximum score in basis points */
const MAX_SCORE = 10000;

/** Component weights in basis points (must sum to MAX_SCORE) */
const WEIGHTS = {
  remembrance: 4000,
  economic: 3500,
  civic: 2500,
} as const;

/** Scaling factors for logarithmic curves */
const REMEMBRANCE_SCALE = 1000;
const CIVIC_VOTE_SCALE = 100;
const CIVIC_MOTION_SCALE = 10;

/** Dignity floor: minimum voting weight (1/1000) */
const DIGNITY_FLOOR_WEIGHT = 0.001;

export function calculateCivicScore(inputs: CivicScoreInputs): CivicScoreResult {
  const remembranceComponent = computeRemembranceScore(inputs.remembranceEntryCount);
  const economicComponent = computeEconomicScore(inputs.kalonBalance, inputs.totalKalonSupply);
  const civicComponent = computeCivicContribution(inputs.votesParticipated, inputs.motionsProposed);

  const totalScore = weightedSum(remembranceComponent, economicComponent, civicComponent);
  const votingWeight = scoreToVotingWeight(totalScore);

  return {
    totalScore,
    remembranceComponent,
    economicComponent,
    civicComponent,
    votingWeight,
  };
}

/**
 * Remembrance score uses logarithmic scaling — first entries matter most.
 * log10(1 + entries) / log10(1 + SCALE) → normalized to [0, MAX_SCORE].
 */
function computeRemembranceScore(entryCount: number): number {
  if (entryCount <= 0) return 0;
  const normalized = Math.log10(1 + entryCount) / Math.log10(1 + REMEMBRANCE_SCALE);
  return clampScore(Math.floor(normalized * MAX_SCORE));
}

/**
 * Economic score: balance as proportion of total supply (ppm → basis points).
 * Capped at MAX_SCORE to prevent whales from dominating.
 */
function computeEconomicScore(balance: bigint, totalSupply: bigint): number {
  if (totalSupply <= 0n || balance <= 0n) return 0;
  const ppm = (balance * 1_000_000n) / totalSupply;
  const basisPoints = Number(ppm) / 100;
  return clampScore(Math.floor(basisPoints));
}

/**
 * Civic contribution: log-scaled votes + motion bonus.
 * Proposing motions counts 10x more than voting on them.
 */
function computeCivicContribution(votes: number, motions: number): number {
  if (votes <= 0 && motions <= 0) return 0;
  const voteScore = Math.log10(1 + votes) / Math.log10(1 + CIVIC_VOTE_SCALE);
  const motionScore = Math.log10(1 + motions) / Math.log10(1 + CIVIC_MOTION_SCALE);
  const combined = (voteScore + motionScore) / 2;
  return clampScore(Math.floor(combined * MAX_SCORE));
}

function weightedSum(remembrance: number, economic: number, civic: number): number {
  const weighted =
    remembrance * WEIGHTS.remembrance + economic * WEIGHTS.economic + civic * WEIGHTS.civic;
  return clampScore(Math.floor(weighted / MAX_SCORE));
}

/**
 * Convert score to voting weight with dignity floor.
 * Weight = max(score / MAX_SCORE, DIGNITY_FLOOR).
 */
function scoreToVotingWeight(score: number): number {
  const raw = score / MAX_SCORE;
  return Math.max(raw, DIGNITY_FLOOR_WEIGHT);
}

function clampScore(value: number): number {
  if (value < 0) return 0;
  if (value > MAX_SCORE) return MAX_SCORE;
  return value;
}
