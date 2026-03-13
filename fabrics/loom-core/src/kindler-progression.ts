/**
 * kindler-progression.ts — The Kindler Progression / Expanded Spark System.
 *
 * From Expansion Bible v5 Part 14. The Spark is the child's cumulative
 * learning energy — NOT a score, it's a glow. Eight levels from
 * New Kindler (tiny flicker) to Constellation (orbiting light points).
 *
 * Spark gains come from entries, mini-games, threadway discovery,
 * hidden zones, cross-world quests, and return bonuses.
 * Spark never decays — but world luminance gently fades for
 * unvisited worlds (max -10, always restorable).
 */

// ── Ports ────────────────────────────────────────────────────────

export interface KindlerClockPort {
  readonly nowMs: () => number;
}

export interface KindlerLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

export interface KindlerEventPort {
  readonly emit: (event: KindlerEvent) => void;
}

// ── Constants ────────────────────────────────────────────────────

export const MAX_SPARK_LEVEL = 7;
export const LUMINANCE_DECAY_PER_DAY = 1;
export const LUMINANCE_DECAY_CAP = 10;
export const ABSENCE_THRESHOLD_DAYS = 7;
export const MS_PER_DAY = 86_400_000;
export const WELCOME_BACK_SPARK = 5;

// ── Types ────────────────────────────────────────────────────────

export type SparkLevelName =
  | 'new-kindler'
  | 'ember'
  | 'flame'
  | 'torch'
  | 'beacon'
  | 'star'
  | 'aurora'
  | 'constellation';

export type SparkVisual =
  | 'tiny-flicker'
  | 'warm-flicker'
  | 'steady-warm-light'
  | 'bright-steady-glow'
  | 'radiating-light'
  | 'brilliant-glow-with-rays'
  | 'shifting-colors-wide-radiance'
  | 'multiple-orbiting-points';

export type SparkActionKind =
  | 'complete-entry'
  | 'complete-mini-game'
  | 'discover-threadway'
  | 'find-hidden-zone'
  | 'complete-cross-world-quest'
  | 'return-after-absence'
  | 'first-world-visit';

export type KindlerEventKind =
  | 'spark-gained'
  | 'level-up'
  | 'luminance-decayed'
  | 'luminance-restored'
  | 'welcome-back';

export interface KindlerEvent {
  readonly kind: KindlerEventKind;
  readonly kindlerId: string;
  readonly timestampMs: number;
  readonly detail: Readonly<Record<string, unknown>>;
}

export interface SparkLevel {
  readonly level: number;
  readonly name: SparkLevelName;
  readonly minSpark: number;
  readonly maxSpark: number;
  readonly visual: SparkVisual;
  readonly unlocks: ReadonlyArray<string>;
}

export interface SparkGainRule {
  readonly action: SparkActionKind;
  readonly minGain: number;
  readonly maxGain: number;
  readonly oneTime: boolean;
}

export interface KindlerProfile {
  readonly kindlerId: string;
  readonly totalSpark: number;
  readonly level: number;
  readonly levelName: SparkLevelName;
  readonly visual: SparkVisual;
  readonly worldLuminance: ReadonlyMap<string, number>;
  readonly lastVisitMs: number;
  readonly visitedWorldIds: ReadonlySet<string>;
  readonly completedEntryCount: number;
}

export interface SparkGainResult {
  readonly previousSpark: number;
  readonly newSpark: number;
  readonly sparkGained: number;
  readonly previousLevel: number;
  readonly newLevel: number;
  readonly leveledUp: boolean;
}

export interface LuminanceDecayResult {
  readonly worldId: string;
  readonly previousLuminance: number;
  readonly newLuminance: number;
  readonly decayAmount: number;
}

export interface WorldLuminanceState {
  readonly worldId: string;
  readonly luminance: number;
  readonly lastVisitMs: number;
  readonly maxLuminance: number;
}

// ── Spark Level Table ────────────────────────────────────────────

const SPARK_LEVELS: ReadonlyArray<SparkLevel> = [
  { level: 0, name: 'new-kindler', minSpark: 0, maxSpark: 0, visual: 'tiny-flicker', unlocks: ['tutorial', 'one-world'] },
  { level: 1, name: 'ember', minSpark: 1, maxSpark: 50, visual: 'warm-flicker', unlocks: ['second-world', 'basic-threadways'] },
  { level: 2, name: 'flame', minSpark: 51, maxSpark: 150, visual: 'steady-warm-light', unlocks: ['three-worlds', 'deeper-conversations'] },
  { level: 3, name: 'torch', minSpark: 151, maxSpark: 300, visual: 'bright-steady-glow', unlocks: ['cross-realm-threadways'] },
  { level: 4, name: 'beacon', minSpark: 301, maxSpark: 500, visual: 'radiating-light', unlocks: ['forgetting-well', 'deeper-quests'] },
  { level: 5, name: 'star', minSpark: 501, maxSpark: 800, visual: 'brilliant-glow-with-rays', unlocks: ['all-worlds', 'seasonal-events'] },
  { level: 6, name: 'aurora', minSpark: 801, maxSpark: 1200, visual: 'shifting-colors-wide-radiance', unlocks: ['mentoring', 'secret-areas'] },
  { level: 7, name: 'constellation', minSpark: 1201, maxSpark: Number.MAX_SAFE_INTEGER, visual: 'multiple-orbiting-points', unlocks: ['compass-origin-quest', 'legacy-content'] },
];

// ── Spark Gain Rules ─────────────────────────────────────────────

const SPARK_GAIN_RULES: ReadonlyArray<SparkGainRule> = [
  { action: 'complete-entry', minGain: 5, maxGain: 15, oneTime: false },
  { action: 'complete-mini-game', minGain: 3, maxGain: 8, oneTime: false },
  { action: 'discover-threadway', minGain: 10, maxGain: 10, oneTime: true },
  { action: 'find-hidden-zone', minGain: 15, maxGain: 15, oneTime: true },
  { action: 'complete-cross-world-quest', minGain: 25, maxGain: 50, oneTime: false },
  { action: 'return-after-absence', minGain: 5, maxGain: 5, oneTime: false },
  { action: 'first-world-visit', minGain: 10, maxGain: 10, oneTime: true },
];

// ── Port ─────────────────────────────────────────────────────────

export interface KindlerProgressionPort {
  readonly getSparkLevels: () => ReadonlyArray<SparkLevel>;
  readonly getSparkGainRules: () => ReadonlyArray<SparkGainRule>;
  readonly computeLevel: (totalSpark: number) => SparkLevel;
  readonly computeSparkGain: (action: SparkActionKind, difficultyTier: number) => number;
  readonly applySparkGain: (profile: KindlerProfile, gain: number) => SparkGainResult;
  readonly computeLuminanceDecay: (state: WorldLuminanceState, nowMs: number) => LuminanceDecayResult;
  readonly computeWelcomeBack: (profile: KindlerProfile, nowMs: number) => SparkGainResult | null;
  readonly getUnlocksForLevel: (level: number) => ReadonlyArray<string>;
  readonly isWorldAccessible: (worldCount: number, level: number) => boolean;
}

// ── Implementation ───────────────────────────────────────────────

function computeLevel(totalSpark: number): SparkLevel {
  for (let i = SPARK_LEVELS.length - 1; i >= 0; i--) {
    if (totalSpark >= SPARK_LEVELS[i].minSpark) return SPARK_LEVELS[i];
  }
  return SPARK_LEVELS[0];
}

function computeSparkGain(action: SparkActionKind, difficultyTier: number): number {
  const rule = SPARK_GAIN_RULES.find(r => r.action === action);
  if (!rule) return 0;
  if (rule.minGain === rule.maxGain) return rule.minGain;
  const range = rule.maxGain - rule.minGain;
  const tierFactor = Math.min(1, Math.max(0, difficultyTier / 3));
  return Math.round(rule.minGain + range * tierFactor);
}

function applySparkGain(profile: KindlerProfile, gain: number): SparkGainResult {
  const previousSpark = profile.totalSpark;
  const newSpark = previousSpark + gain;
  const previousLevel = computeLevel(previousSpark).level;
  const newLevel = computeLevel(newSpark).level;
  return {
    previousSpark,
    newSpark,
    sparkGained: gain,
    previousLevel,
    newLevel,
    leveledUp: newLevel > previousLevel,
  };
}

function computeLuminanceDecay(
  state: WorldLuminanceState,
  nowMs: number,
): LuminanceDecayResult {
  const daysSinceVisit = Math.floor((nowMs - state.lastVisitMs) / MS_PER_DAY);
  const daysOverThreshold = Math.max(0, daysSinceVisit - ABSENCE_THRESHOLD_DAYS);
  const rawDecay = daysOverThreshold * LUMINANCE_DECAY_PER_DAY;
  const cappedDecay = Math.min(rawDecay, LUMINANCE_DECAY_CAP);
  const newLuminance = Math.max(0, state.luminance - cappedDecay);
  return {
    worldId: state.worldId,
    previousLuminance: state.luminance,
    newLuminance,
    decayAmount: state.luminance - newLuminance,
  };
}

function computeWelcomeBack(
  profile: KindlerProfile,
  nowMs: number,
): SparkGainResult | null {
  const daysSince = Math.floor((nowMs - profile.lastVisitMs) / MS_PER_DAY);
  if (daysSince < ABSENCE_THRESHOLD_DAYS) return null;
  return applySparkGain(profile, WELCOME_BACK_SPARK);
}

function getUnlocksForLevel(level: number): ReadonlyArray<string> {
  const clamped = Math.min(level, MAX_SPARK_LEVEL);
  const sparkLevel = SPARK_LEVELS[clamped];
  return sparkLevel ? sparkLevel.unlocks : [];
}

function isWorldAccessible(worldCount: number, level: number): boolean {
  if (level >= 5) return true;
  if (level === 0) return worldCount <= 1;
  if (level === 1) return worldCount <= 2;
  if (level === 2) return worldCount <= 3;
  return true;
}

// ── Factory ──────────────────────────────────────────────────────

export function createKindlerProgression(): KindlerProgressionPort {
  return {
    getSparkLevels: () => SPARK_LEVELS,
    getSparkGainRules: () => SPARK_GAIN_RULES,
    computeLevel,
    computeSparkGain,
    applySparkGain,
    computeLuminanceDecay,
    computeWelcomeBack,
    getUnlocksForLevel,
    isWorldAccessible,
  };
}

// ── Engine Integration ───────────────────────────────────────────

export interface KindlerProgressionEngine {
  readonly kind: 'kindler-progression';
  readonly progression: KindlerProgressionPort;
}

export function createKindlerProgressionEngine(
  deps: { readonly clock: KindlerClockPort; readonly log: KindlerLogPort; readonly events: KindlerEventPort },
): KindlerProgressionEngine {
  const progression = createKindlerProgression();
  deps.log.info({ levelCount: progression.getSparkLevels().length }, 'Kindler progression initialized');
  return { kind: 'kindler-progression', progression };
}
