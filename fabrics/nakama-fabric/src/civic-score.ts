/**
 * Civic Score — Weighted influence in The Assembly.
 *
 * Bible v1.2: Civic Score determines a dynasty's voting weight.
 * Three factors compose the score:
 *
 *   1. Chronicle Depth (40%) — entries in The Chronicle
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
  readonly chronicleEntryCount: number;
  readonly kalonBalance: bigint;
  readonly totalKalonSupply: bigint;
  readonly votesParticipated: number;
  readonly motionsProposed: number;
  /** Number of MARKS held by the dynasty. Multiplier: 1 + count * 0.15 */
  readonly marksCount: number;
}

export interface CivicScoreResult {
  readonly totalScore: number;
  readonly chronicleComponent: number;
  readonly economicComponent: number;
  readonly civicComponent: number;
  readonly marksMultiplier: number;
  readonly votingWeight: number;
}

/** Maximum score in basis points */
const MAX_SCORE = 10000;

/** Component weights in basis points (must sum to MAX_SCORE) */
const WEIGHTS = {
  chronicle: 4000,
  economic: 3500,
  civic: 2500,
} as const;

/** Scaling factors for logarithmic curves */
const CHRONICLE_SCALE = 1000;
const CIVIC_VOTE_SCALE = 100;
const CIVIC_MOTION_SCALE = 10;

/** Dignity floor: minimum voting weight (1/1000) */
const DIGNITY_FLOOR_WEIGHT = 0.001;

/** Bible v1.1 Part 6: Each MARK adds 15% to civic score. */
const MARKS_MULTIPLIER_PER_MARK = 0.15;

export function calculateCivicScore(inputs: CivicScoreInputs): CivicScoreResult {
  const chronicleComponent = computeChronicleScore(inputs.chronicleEntryCount);
  const economicComponent = computeEconomicScore(inputs.kalonBalance, inputs.totalKalonSupply);
  const civicComponent = computeCivicContribution(inputs.votesParticipated, inputs.motionsProposed);

  const baseScore = weightedSum(chronicleComponent, economicComponent, civicComponent);
  const marksMultiplier = 1 + inputs.marksCount * MARKS_MULTIPLIER_PER_MARK;
  const totalScore = clampScore(Math.floor(baseScore * marksMultiplier));
  const votingWeight = scoreToVotingWeight(totalScore);

  return {
    totalScore,
    chronicleComponent,
    economicComponent,
    civicComponent,
    marksMultiplier,
    votingWeight,
  };
}

/**
 * Chronicle score uses logarithmic scaling — first entries matter most.
 * log10(1 + entries) / log10(1 + SCALE) → normalized to [0, MAX_SCORE].
 */
function computeChronicleScore(entryCount: number): number {
  if (entryCount <= 0) return 0;
  const normalized = Math.log10(1 + entryCount) / Math.log10(1 + CHRONICLE_SCALE);
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

function weightedSum(chronicle: number, economic: number, civic: number): number {
  const weighted =
    chronicle * WEIGHTS.chronicle + economic * WEIGHTS.economic + civic * WEIGHTS.civic;
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
