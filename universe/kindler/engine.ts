/**
 * Koydo Worlds — Kindler Progression Engine
 *
 * Every child is a Kindler. Their Spark grows with learning, dims
 * gently with absence — never punitively. Chapter advancement unlocks
 * new realms as worlds are restored.
 *
 * Philosophy:
 * - Returning after absence always feels rewarding, never punishing
 * - No daily login penalties. No streak-loss shame.
 * - Progress is a continuum — every small action matters.
 *
 * Thread: silk/loom-core/kindler-engine
 * Tier: 1
 */

import type {
  KindlerProfile,
  KindlerProgress,
  KindlerSession,
  SparkState,
  SparkLogEntry,
  SparkCause,
  Chapter,
} from './types.js';

// ─── Constants ─────────────────────────────────────────────────────

/** Spark delta per cause — positive values restore, negative values decay */
export const SPARK_DELTAS: Readonly<Record<SparkCause, number>> = {
  lesson_completed:    0.05,
  quiz_passed:         0.04,
  world_restored:      0.10,
  cross_world_quest:   0.06,
  collaborative_quest: 0.08,
  natural_decay:      -0.002,   // Per 24 hours of inactivity — gentle
  return_bonus:        0.05,    // Rewarded when Kindler returns after 7+ days
  item_redeemed:       0.00,    // Variable — cost set by caller at redemption time
};

/** Kindler spark never drops below this floor */
export const MIN_SPARK_LEVEL = 0.01;

/** Absent days before a return bonus is applied */
export const RETURN_BONUS_THRESHOLD_DAYS = 7;

/** Worlds restored required to enter each chapter */
export const CHAPTER_THRESHOLDS: Readonly<Record<Chapter, number>> = {
  first_light:      0,
  threadways_open:  3,
  deep_fade:        10,
  the_source:       25,
  kindlers_legacy:  40,
};

const CHAPTER_ORDER: readonly Chapter[] = [
  'first_light', 'threadways_open', 'deep_fade', 'the_source', 'kindlers_legacy',
];

// ─── Public Types ─────────────────────────────────────────────────

export interface SparkChangeEvent {
  readonly kindlerId: string;
  readonly previousSpark: number;
  readonly newSpark: number;
  readonly delta: number;
  readonly cause: SparkCause;
  readonly timestamp: number;
}

export interface ChapterAdvancedEvent {
  readonly kindlerId: string;
  readonly previousChapter: Chapter;
  readonly newChapter: Chapter;
  readonly worldsRestored: number;
  readonly timestamp: number;
}

export interface KindlerEngineDeps {
  readonly clock: { nowMilliseconds: () => number };
  readonly logger: {
    info: (msg: string, meta?: Record<string, unknown>) => void;
    warn: (msg: string, meta?: Record<string, unknown>) => void;
  };
  readonly idGenerator: { generate: () => string };
  readonly events: {
    onSparkChange: (event: SparkChangeEvent) => void;
    onChapterAdvanced: (event: ChapterAdvancedEvent) => void;
  };
}

export interface KindlerEngineConfig {
  readonly naturalDecayPerDay?: number;
  readonly minSparkLevel?: number;
  readonly returnBonusDays?: number;
}

export interface KindlerEngineStats {
  readonly kindlerCount: number;
  readonly totalSparkUpdates: number;
  readonly totalWorldsRestored: number;
  readonly totalSessions: number;
}

export interface KindlerEngine {
  registerKindler(profile: KindlerProfile): void;
  applySpark(kindlerId: string, cause: SparkCause): SparkLogEntry;
  applyNaturalDecay(kindlerId: string): SparkLogEntry | null;
  recordProgress(
    kindlerId: string,
    entryId: string,
    worldSlug: string,
    adventureType: string,
    score?: number | null,
  ): KindlerProgress;
  markWorldRestored(kindlerId: string, worldId: string): void;
  startSession(kindlerId: string): KindlerSession;
  endSession(
    sessionId: string,
    worldsVisited: readonly string[],
    guidesInteracted: readonly string[],
    entriesCompleted: readonly string[],
  ): KindlerSession;
  getSparkState(kindlerId: string): SparkState;
  getKindlerCount(): number;
  getStats(): KindlerEngineStats;
}

// ─── Internal State ───────────────────────────────────────────────

interface KindlerState {
  readonly kindlerId: string;
  spark: number;
  chapter: Chapter;
  readonly worldsRestored: Set<string>;
  readonly worldsVisited: Set<string>;
  lastActivityAt: number;
  readonly sparkLog: SparkLogEntry[];
}

interface ActiveSession {
  readonly kindlerId: string;
  readonly startedAt: number;
  readonly sparkAtStart: number;
}

// ─── Config Resolution ────────────────────────────────────────────

interface ResolvedConfig {
  readonly decayPerDay: number;
  readonly minSpark: number;
  readonly returnBonusDays: number;
}

function resolveConfig(config?: KindlerEngineConfig): ResolvedConfig {
  return {
    decayPerDay:     config?.naturalDecayPerDay ?? Math.abs(SPARK_DELTAS.natural_decay),
    minSpark:        config?.minSparkLevel ?? MIN_SPARK_LEVEL,
    returnBonusDays: config?.returnBonusDays ?? RETURN_BONUS_THRESHOLD_DAYS,
  };
}

// ─── Spark Helpers ────────────────────────────────────────────────

function computeTrend(log: readonly SparkLogEntry[]): 'growing' | 'stable' | 'dimming' {
  const recent = log.filter((e) => e.cause !== 'natural_decay').slice(-5);
  if (recent.length === 0) return 'stable';
  const netDelta = recent.reduce((sum, e) => sum + e.delta, 0);
  if (netDelta > 0.05) return 'growing';
  if (netDelta < -0.03) return 'dimming';
  return 'stable';
}

function computeStreakDays(log: readonly SparkLogEntry[], nowMs: number): number {
  if (log.length === 0) return 0;
  const MS_PER_DAY = 86_400_000;
  const todayDay = Math.floor(nowMs / MS_PER_DAY);
  const days = new Set(log.map((e) => Math.floor(e.timestamp / MS_PER_DAY)));
  let streak = 0;
  let checkDay = todayDay;
  while (days.has(checkDay)) {
    streak++;
    checkDay--;
  }
  return streak;
}

// ─── Engine Context ───────────────────────────────────────────────

interface EngineCounters {
  totalSparkUpdates: number;
  totalWorldsRestored: number;
  totalSessions: number;
}

interface EngineContext {
  readonly deps: KindlerEngineDeps;
  readonly cfg: ResolvedConfig;
  readonly kindlers: Map<string, KindlerState>;
  readonly activeSessions: Map<string, ActiveSession>;
  readonly counters: EngineCounters;
}

// ─── Context Helpers ──────────────────────────────────────────────

function getOrThrow(ctx: EngineContext, kindlerId: string): KindlerState {
  const state = ctx.kindlers.get(kindlerId);
  if (state === undefined) throw new Error(`Kindler not registered: ${kindlerId}`);
  return state;
}

function buildSparkEntry(
  ctx: EngineContext,
  state: KindlerState,
  delta: number,
  cause: SparkCause,
): SparkLogEntry {
  return {
    id: ctx.deps.idGenerator.generate(),
    kindlerId: state.kindlerId,
    sparkLevel: state.spark,
    delta,
    cause,
    timestamp: ctx.deps.clock.nowMilliseconds(),
  };
}

function doApplySpark(
  ctx: EngineContext,
  state: KindlerState,
  rawDelta: number,
  cause: SparkCause,
): SparkLogEntry {
  const prev = state.spark;
  const clamped = Math.max(ctx.cfg.minSpark, Math.min(1.0, prev + rawDelta));
  const next = Math.round(clamped * 1000) / 1000;
  const delta = Math.round((next - prev) * 1000) / 1000;
  state.spark = next;
  state.lastActivityAt = ctx.deps.clock.nowMilliseconds();
  ctx.counters.totalSparkUpdates++;
  const entry = buildSparkEntry(ctx, state, delta, cause);
  state.sparkLog.push(entry);
  ctx.deps.events.onSparkChange({
    kindlerId: state.kindlerId, previousSpark: prev, newSpark: next, delta, cause,
    timestamp: entry.timestamp,
  });
  ctx.deps.logger.info('kindler.spark', { kindlerId: state.kindlerId, cause, delta });
  return entry;
}

function advanceChapterIfReady(ctx: EngineContext, state: KindlerState): void {
  const currentIdx = CHAPTER_ORDER.indexOf(state.chapter);
  const next = CHAPTER_ORDER[currentIdx + 1];
  if (next === undefined) return;
  if (state.worldsRestored.size < CHAPTER_THRESHOLDS[next]) return;
  const prev = state.chapter;
  state.chapter = next;
  ctx.deps.events.onChapterAdvanced({
    kindlerId: state.kindlerId, previousChapter: prev, newChapter: next,
    worldsRestored: state.worldsRestored.size, timestamp: ctx.deps.clock.nowMilliseconds(),
  });
  ctx.deps.logger.info('kindler.chapter', { kindlerId: state.kindlerId, prev, next });
}

// ─── Engine Methods ───────────────────────────────────────────────

function registerKindler(ctx: EngineContext, profile: KindlerProfile): void {
  if (ctx.kindlers.has(profile.id)) return;
  ctx.kindlers.set(profile.id, {
    kindlerId: profile.id,
    spark: profile.sparkLevel,
    chapter: profile.currentChapter,
    worldsRestored: new Set(profile.worldsRestored),
    worldsVisited: new Set(profile.worldsVisited),
    lastActivityAt: profile.createdAt,
    sparkLog: [],
  });
}

function applySpark(ctx: EngineContext, kindlerId: string, cause: SparkCause): SparkLogEntry {
  const state = getOrThrow(ctx, kindlerId);
  const daysSince = (ctx.deps.clock.nowMilliseconds() - state.lastActivityAt) / 86_400_000;
  if (cause === 'lesson_completed' && daysSince >= ctx.cfg.returnBonusDays) {
    doApplySpark(ctx, state, SPARK_DELTAS.return_bonus, 'return_bonus');
  }
  return doApplySpark(ctx, state, SPARK_DELTAS[cause], cause);
}

function applyNaturalDecay(ctx: EngineContext, kindlerId: string): SparkLogEntry | null {
  const state = getOrThrow(ctx, kindlerId);
  const hoursSince = (ctx.deps.clock.nowMilliseconds() - state.lastActivityAt) / 3_600_000;
  if (hoursSince < 24) return null;
  const daysDecay = ctx.cfg.decayPerDay * (hoursSince / 24);
  const rawDelta = -Math.min(state.spark - ctx.cfg.minSpark, daysDecay);
  if (rawDelta === 0) return null;
  return doApplySpark(ctx, state, rawDelta, 'natural_decay');
}

function recordProgress(
  ctx: EngineContext,
  kindlerId: string,
  entryId: string,
  worldSlug: string,
  adventureType: string,
  score?: number | null,
): KindlerProgress {
  const state = getOrThrow(ctx, kindlerId);
  state.worldsVisited.add(worldSlug);
  applySpark(ctx, kindlerId, 'lesson_completed');
  return {
    id: ctx.deps.idGenerator.generate(),
    kindlerId,
    entryId,
    completedAt: ctx.deps.clock.nowMilliseconds(),
    adventureType,
    score: score ?? null,
  };
}

function markWorldRestored(ctx: EngineContext, kindlerId: string, worldId: string): void {
  const state = getOrThrow(ctx, kindlerId);
  if (state.worldsRestored.has(worldId)) return;
  state.worldsRestored.add(worldId);
  ctx.counters.totalWorldsRestored++;
  doApplySpark(ctx, state, SPARK_DELTAS.world_restored, 'world_restored');
  advanceChapterIfReady(ctx, state);
}

function startSession(ctx: EngineContext, kindlerId: string): KindlerSession {
  const state = getOrThrow(ctx, kindlerId);
  const id = ctx.deps.idGenerator.generate();
  const startedAt = ctx.deps.clock.nowMilliseconds();
  ctx.activeSessions.set(id, { kindlerId, startedAt, sparkAtStart: state.spark });
  ctx.counters.totalSessions++;
  return {
    id, kindlerId, startedAt, endedAt: null,
    worldsVisited: [], guidesInteracted: [], entriesCompleted: [], sparkDelta: 0,
  };
}

function endSession(
  ctx: EngineContext,
  sessionId: string,
  worldsVisited: readonly string[],
  guidesInteracted: readonly string[],
  entriesCompleted: readonly string[],
): KindlerSession {
  const active = ctx.activeSessions.get(sessionId);
  if (active === undefined) throw new Error(`No active session: ${sessionId}`);
  const state = getOrThrow(ctx, active.kindlerId);
  ctx.activeSessions.delete(sessionId);
  const sparkDelta = Math.round((state.spark - active.sparkAtStart) * 1000) / 1000;
  return {
    id: sessionId, kindlerId: active.kindlerId, startedAt: active.startedAt,
    endedAt: ctx.deps.clock.nowMilliseconds(), worldsVisited, guidesInteracted,
    entriesCompleted, sparkDelta,
  };
}

function getSparkState(ctx: EngineContext, kindlerId: string): SparkState {
  const state = getOrThrow(ctx, kindlerId);
  return {
    kindlerId,
    level: state.spark,
    trend: computeTrend(state.sparkLog),
    lastActivityAt: state.lastActivityAt,
    streakDays: computeStreakDays(state.sparkLog, ctx.deps.clock.nowMilliseconds()),
  };
}

// ─── Engine Factory ───────────────────────────────────────────────

export function createKindlerEngine(
  deps: KindlerEngineDeps,
  config?: KindlerEngineConfig,
): KindlerEngine {
  const ctx: EngineContext = {
    deps,
    cfg: resolveConfig(config),
    kindlers: new Map(),
    activeSessions: new Map(),
    counters: { totalSparkUpdates: 0, totalWorldsRestored: 0, totalSessions: 0 },
  };
  return {
    registerKindler:   (p)                  => { registerKindler(ctx, p); },
    applySpark:        (id, cause)          => applySpark(ctx, id, cause),
    applyNaturalDecay: (id)                 => applyNaturalDecay(ctx, id),
    recordProgress:    (id, eid, ws, at, sc) => recordProgress(ctx, id, eid, ws, at, sc),
    markWorldRestored: (id, wid)            => { markWorldRestored(ctx, id, wid); },
    startSession:      (id)                 => startSession(ctx, id),
    endSession:        (sid, wv, gi, ec)    => endSession(ctx, sid, wv, gi, ec),
    getSparkState:     (id)                 => getSparkState(ctx, id),
    getKindlerCount:   ()                   => ctx.kindlers.size,
    getStats: () => ({
      kindlerCount:        ctx.kindlers.size,
      totalSparkUpdates:   ctx.counters.totalSparkUpdates,
      totalWorldsRestored: ctx.counters.totalWorldsRestored,
      totalSessions:       ctx.counters.totalSessions,
    }),
  };
}
