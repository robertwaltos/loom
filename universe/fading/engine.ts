/**
 * Koydo Worlds — The Fading Engine
 *
 * The Fading is the educational premise made literal:
 * knowledge not used is knowledge lost. Children are not fighting
 * a monster — they are keeping the light on.
 *
 * Rules:
 * - Luminance 0.0 (deep fade) → 1.0 (radiant)
 * - Completing lessons restores luminance (+restoreDelta)
 * - Natural decay happens slowly over real time (never punitive)
 * - Returning after absence always feels rewarding, never punishing
 * - No daily login penalties. No FOMO mechanics.
 */

import type { FadingStage, WorldLuminance, WorldLuminanceLogEntry } from '../worlds/types.js';

// ─── Constants ──────────────────────────────────────────────────────

/** Per-lesson luminance restoration — indexed [tier 1, tier 2, tier 3] */
export const LESSON_RESTORE_DELTAS = [0.05, 0.07, 0.10] as const;

/** Collaborative quest bonus (multiplied on top of lesson delta) */
export const COLLABORATIVE_BONUS_MULTIPLIER = 1.5;

/** Deep-fade event: rapid drop below threshold (e.g. many absences) */
export const DEEP_FADE_THRESHOLD = 0.08;

/** Natural decay per real-world hour of inactivity (never punitive) */
export const NATURAL_DECAY_PER_HOUR = 0.001;

/** Minimum luminance — world never goes fully dark (hope always visible) */
export const MIN_LUMINANCE = 0.03;

/** Luminance stage thresholds */
export const STAGE_THRESHOLDS: readonly [FadingStage, number][] = [
  ['radiant',   0.90],
  ['glowing',   0.65],
  ['dimming',   0.40],
  ['fading',    0.15],
  ['deep_fade', 0.00],
] as const;

// ─── Stage Resolution ─────────────────────────────────────────────

export function resolveFadingStage(luminance: number): FadingStage {
  for (const [stage, threshold] of STAGE_THRESHOLDS) {
    if (luminance >= threshold) return stage;
  }
  return 'deep_fade';
}

// ─── Restoration ──────────────────────────────────────────────────

export interface RestorationOptions {
  readonly difficultyTier: 1 | 2 | 3;
  readonly isCollaborative: boolean;
  readonly returnBonus: boolean;
}

export function calculateRestorationDelta(opts: RestorationOptions): number {
  const tierIndex = (opts.difficultyTier - 1) as 0 | 1 | 2;
  let delta: number = LESSON_RESTORE_DELTAS[tierIndex];
  if (opts.isCollaborative) delta *= COLLABORATIVE_BONUS_MULTIPLIER;
  if (opts.returnBonus) delta *= 1.2; // Warmly welcome returning players
  return Math.round(delta * 1000) / 1000;
}

export function applyRestoration(
  current: WorldLuminance,
  delta: number,
  cause: WorldLuminanceLogEntry['cause'],
  _kindlerId: string,
): { updated: WorldLuminance; logEntry: WorldLuminanceLogEntry } {
  const rawNext = Math.min(1.0, current.luminance + delta);
  const next = Math.round(rawNext * 1000) / 1000;
  const stage = resolveFadingStage(next);

  const updated: WorldLuminance = {
    ...current,
    luminance: next,
    stage,
    lastRestoredAt: Date.now(),
    totalKindlersContributed: current.totalKindlersContributed + 1,
  };

  const logEntry: WorldLuminanceLogEntry = {
    id: `log-${current.worldId}-${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}`,
    worldId: current.worldId,
    luminance: next,
    stage,
    delta,
    cause,
    timestamp: Date.now(),
  };

  return { updated, logEntry };
}

// ─── Natural Decay ────────────────────────────────────────────────

/**
 * Compute natural decay for a world based on hours of inactivity.
 * Decay is gentle — this is not a punishment, it's the world dimming
 * while waiting for its Kindlers to return.
 */
export function applyNaturalDecay(
  current: WorldLuminance,
  inactiveHours: number,
): { updated: WorldLuminance; logEntry: WorldLuminanceLogEntry } {
  const totalDecay = Math.min(
    current.luminance - MIN_LUMINANCE,
    NATURAL_DECAY_PER_HOUR * inactiveHours,
  );
  const delta = -Math.max(0, Math.round(totalDecay * 1000) / 1000);
  const rawNext = Math.max(MIN_LUMINANCE, current.luminance + delta);
  const next = Math.round(rawNext * 1000) / 1000;
  const stage = resolveFadingStage(next);

  const updated: WorldLuminance = {
    ...current,
    luminance: next,
    stage,
  };

  const logEntry: WorldLuminanceLogEntry = {
    id: `log-${current.worldId}-decay-${String(Date.now())}`,
    worldId: current.worldId,
    luminance: next,
    stage,
    delta,
    cause: next < DEEP_FADE_THRESHOLD ? 'deep_fade_event' : 'natural_decay',
    timestamp: Date.now(),
  };

  return { updated, logEntry };
}

// ─── World Restoration Summary ────────────────────────────────────

export interface WorldRestorationEvent {
  readonly worldId: string;
  readonly previousStage: FadingStage;
  readonly newStage: FadingStage;
  readonly luminance: number;
  readonly isFullyRestored: boolean;
  readonly kindlerId: string;
  readonly timestamp: number;
}

/**
 * Check whether a luminance change crossed a stage boundary.
 * Used to trigger UE5 visual/audio restoration events.
 */
export function detectStageTransition(
  previous: WorldLuminance,
  updated: WorldLuminance,
  kindlerId: string,
): WorldRestorationEvent | null {
  if (previous.stage === updated.stage) return null;

  return {
    worldId: updated.worldId,
    previousStage: previous.stage,
    newStage: updated.stage,
    luminance: updated.luminance,
    isFullyRestored: updated.stage === 'radiant',
    kindlerId,
    timestamp: Date.now(),
  };
}

// ─── Fading Material Parameters (UE5 Bridge Contract) ─────────────

/**
 * Material scalar parameters driven by luminance.
 * These values are passed over gRPC to the UE5 plugin,
 * which applies them as MPC (Material Parameter Collection) scalars.
 *
 * At luminance=0: world is grayscale, sparse, silent.
 * At luminance=1: full color, rich orchestration, life everywhere.
 */
export interface FadingMaterialParameters {
  readonly colorSaturation: number;     // 0.0 → 1.0
  readonly foliageDensity: number;      // 0.0 → 1.0
  readonly ambientLightIntensity: number; // 0.2 → 1.0
  readonly musicLayerCount: number;      // 1 → 4 (integer)
  readonly particleDensity: number;      // 0.0 → 1.0
  readonly waterClarity: number;         // 0.0 → 1.0
}

export function luminanceToMaterialParams(luminance: number): FadingMaterialParameters {
  const l = Math.max(0, Math.min(1, luminance));
  return {
    colorSaturation: Math.pow(l, 0.6),           // Boost mid-range saturation
    foliageDensity: l,
    ambientLightIntensity: 0.2 + l * 0.8,
    musicLayerCount: Math.ceil(1 + l * 3),
    particleDensity: Math.max(0, l - 0.15) / 0.85,
    waterClarity: l * 0.9,
  };
}

// ─── Kindler Spark Integration ────────────────────────────────────

/** Spark delta granted for world luminance milestones */
export const SPARK_AWARDS: Record<FadingStage, number> = {
  radiant:   0.15,
  glowing:   0.08,
  dimming:   0.04,
  fading:    0.02,
  deep_fade: 0.00,
};

/**
 * Spark bonus when crossing into a new, brighter stage.
 * Applied once per transition, per Kindler who triggered it.
 */
export function stageTransitionSparkBonus(newStage: FadingStage): number {
  return SPARK_AWARDS[newStage];
}
