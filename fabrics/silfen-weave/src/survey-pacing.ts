/**
 * Survey Pacing — World discovery schedule across the 35-year Concord.
 *
 * Bible v1.3: 580 worlds unlocked over 35 real years (600 total - 20 starting).
 * Average pace: ~22 real days per world, ~66 in-game days per world.
 *
 * Five pacing phases control the unlock cadence.
 */

import { COMPRESSION_RATIO } from '@loom/loom-core';

// ─── Phase Definition ───────────────────────────────────────────────

export interface SurveyPhase {
  readonly realYearStart: number;
  readonly realYearEnd: number;
  readonly worldsTarget: number;
  readonly rationale: string;
}

// ─── Constants ──────────────────────────────────────────────────────

const STARTING_WORLDS = 20;
const TOTAL_WORLDS = 600;
const WORLDS_TO_UNLOCK = TOTAL_WORLDS - STARTING_WORLDS;
const CONCORD_DURATION_REAL_YEARS = 35;
const REAL_DAYS_PER_WORLD_AVG = Math.round(
  (CONCORD_DURATION_REAL_YEARS * 365.25) / WORLDS_TO_UNLOCK,
);
const INGAME_DAYS_PER_WORLD_AVG = REAL_DAYS_PER_WORLD_AVG * COMPRESSION_RATIO;

const PHASE_PACING: ReadonlyArray<SurveyPhase> = [
  { realYearStart: 0, realYearEnd: 3, worldsTarget: 60, rationale: 'Early rush' },
  { realYearStart: 3, realYearEnd: 8, worldsTarget: 150, rationale: 'Steady expansion' },
  { realYearStart: 8, realYearEnd: 15, worldsTarget: 300, rationale: 'Mid expansion' },
  { realYearStart: 15, realYearEnd: 25, worldsTarget: 500, rationale: 'Late expansion' },
  { realYearStart: 25, realYearEnd: 35, worldsTarget: 600, rationale: 'Reckoning' },
] as const;

// ─── Exported Constants ─────────────────────────────────────────────

export const SURVEY_PACING = {
  STARTING_WORLDS,
  TOTAL_WORLDS,
  WORLDS_TO_UNLOCK,
  CONCORD_DURATION_REAL_YEARS,
  REAL_DAYS_PER_WORLD_AVG,
  INGAME_DAYS_PER_WORLD_AVG,
  PHASE_PACING,
} as const;

// ─── Query Helpers ──────────────────────────────────────────────────

export function getPhaseForRealYear(realYear: number): SurveyPhase | undefined {
  return PHASE_PACING.find(
    (p) => realYear >= p.realYearStart && realYear < p.realYearEnd,
  );
}

export function getWorldsTargetAtRealYear(realYear: number): number {
  for (let i = PHASE_PACING.length - 1; i >= 0; i--) {
    if (realYear >= PHASE_PACING[i].realYearEnd) return PHASE_PACING[i].worldsTarget;
  }
  const phase = getPhaseForRealYear(realYear);
  if (phase === undefined) return STARTING_WORLDS;

  const phaseProgress =
    (realYear - phase.realYearStart) / (phase.realYearEnd - phase.realYearStart);
  const prevTarget =
    PHASE_PACING.indexOf(phase) > 0
      ? PHASE_PACING[PHASE_PACING.indexOf(phase) - 1].worldsTarget
      : STARTING_WORLDS;
  return Math.round(prevTarget + (phase.worldsTarget - prevTarget) * phaseProgress);
}
