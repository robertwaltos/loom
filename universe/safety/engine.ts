/**
 * Koydo Worlds — Safety Engine
 *
 * COPPA-compliant AI session lifecycle, time controls, and content moderation.
 *
 * INVARIANTS:
 * - AI sessions are ephemeral: auto-deleted 24 hours after end
 * - No child PII is retained beyond session lifetime
 * - Time controls are enforced server-side — never trust the client
 * - Content moderation always produces a deterministic result
 */

import type {
  AiConversationSession,
  ContentModerationResult,
  ContentRating,
  ModerationFlag,
  TimeControls,
} from './types.js';

// ─── Constants ─────────────────────────────────────────────────────

export const AI_SESSION_AUTO_DELETE_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Flags that escalate content to blocked (not merely flagged) */
const BLOCKING_FLAGS: ReadonlySet<ModerationFlag> = new Set([
  'age_inappropriate',
  'violence',
  'pii_detected',
  'advertising',
  'external_link',
]);

// ─── Public Interface ──────────────────────────────────────────────

export interface SafetyEngineDeps {
  readonly generateId: () => string;
  readonly now: () => number;
  readonly log: (
    level: 'info' | 'warn' | 'error',
    msg: string,
    meta?: Record<string, unknown>,
  ) => void;
}

export interface SafetyEngineConfig {
  readonly sessionAutoDeleteMs?: number;
}

export interface SafetyEngine {
  createAiSession(
    kindlerId: string,
    characterId: string,
    worldId: string,
  ): AiConversationSession;
  endAiSession(sessionId: string): AiConversationSession;
  incrementTurnCount(sessionId: string): void;
  getSessionsNeedingDeletion(): readonly AiConversationSession[];
  isWithinTimeLimit(dailyMinutesUsed: number, controls: TimeControls): boolean;
  isPastBedtime(controls: TimeControls): boolean;
  buildModerationResult(
    contentId: string,
    contentType: ContentModerationResult['contentType'],
    flags: readonly ModerationFlag[],
  ): ContentModerationResult;
  getStats(): SafetyEngineStats;
}

export interface SafetyEngineStats {
  readonly activeSessions: number;
  readonly totalSessionsCreated: number;
  readonly totalSessionsEnded: number;
  readonly totalModerationResults: number;
}

// ─── Internal Types ────────────────────────────────────────────────

interface ResolvedConfig {
  readonly sessionAutoDeleteMs: number;
}

interface SafetyCounters {
  sessionsCreated: number;
  sessionsEnded: number;
  moderationResults: number;
}

interface SafetyContext {
  readonly deps: SafetyEngineDeps;
  readonly cfg: ResolvedConfig;
  readonly sessions: Map<string, AiConversationSession>;
  readonly counters: SafetyCounters;
}

// ─── Config Resolution ─────────────────────────────────────────────

function resolveConfig(cfg?: SafetyEngineConfig): ResolvedConfig {
  return {
    sessionAutoDeleteMs: cfg?.sessionAutoDeleteMs ?? AI_SESSION_AUTO_DELETE_MS,
  };
}

// ─── Rating Derivation ─────────────────────────────────────────────

function rateFromFlags(flags: readonly ModerationFlag[]): ContentRating {
  if (flags.some((f) => BLOCKING_FLAGS.has(f))) return 'blocked';
  if (flags.length > 0) return 'flagged';
  return 'approved';
}

// ─── Session Operations ────────────────────────────────────────────

function getOrThrowSession(
  ctx: SafetyContext,
  sessionId: string,
): AiConversationSession {
  const session = ctx.sessions.get(sessionId);
  if (session === undefined) {
    throw new Error(`SafetyEngine: session not found — id=${sessionId}`);
  }
  return session;
}

function doCreateSession(
  ctx: SafetyContext,
  kindlerId: string,
  characterId: string,
  worldId: string,
): AiConversationSession {
  const session: AiConversationSession = {
    id: ctx.deps.generateId(),
    kindlerId,
    characterId,
    worldId,
    startedAt: ctx.deps.now(),
    endedAt: null,
    turnCount: 0,
    autoDeleteAt: ctx.deps.now() + ctx.cfg.sessionAutoDeleteMs,
  };
  ctx.sessions.set(session.id, session);
  ctx.counters.sessionsCreated += 1;
  ctx.deps.log('info', 'ai_session_created', { sessionId: session.id, kindlerId });
  return session;
}

function doEndSession(
  ctx: SafetyContext,
  sessionId: string,
): AiConversationSession {
  const existing = getOrThrowSession(ctx, sessionId);
  const endedAt = ctx.deps.now();
  const updated: AiConversationSession = {
    ...existing,
    endedAt,
    autoDeleteAt: endedAt + ctx.cfg.sessionAutoDeleteMs,
  };
  ctx.sessions.set(sessionId, updated);
  ctx.counters.sessionsEnded += 1;
  ctx.deps.log('info', 'ai_session_ended', {
    sessionId,
    durationMs: endedAt - existing.startedAt,
    turnsCompleted: existing.turnCount,
  });
  return updated;
}

function doIncrementTurnCount(ctx: SafetyContext, sessionId: string): void {
  const existing = getOrThrowSession(ctx, sessionId);
  const updated: AiConversationSession = {
    ...existing,
    turnCount: existing.turnCount + 1,
  };
  ctx.sessions.set(sessionId, updated);
}

function getPendingDeletion(
  ctx: SafetyContext,
): readonly AiConversationSession[] {
  const now = ctx.deps.now();
  return [...ctx.sessions.values()].filter(
    (s) => s.endedAt !== null && s.autoDeleteAt <= now,
  );
}

// ─── Time Controls ─────────────────────────────────────────────────

function checkTimeLimit(
  dailyMinutesUsed: number,
  controls: TimeControls,
): boolean {
  if (controls.maxDailyMinutes === null) return true;
  return dailyMinutesUsed < controls.maxDailyMinutes;
}

function checkBedtime(ctx: SafetyContext, controls: TimeControls): boolean {
  if (controls.bedtimeCutoff === null) return false;
  const [cutoffHour, cutoffMin] = controls.bedtimeCutoff
    .split(':')
    .map(Number) as [number, number];
  const now = new Date(ctx.deps.now());
  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const cutoffMinutes = cutoffHour * 60 + cutoffMin;
  return currentMinutes >= cutoffMinutes;
}

// ─── Content Moderation ────────────────────────────────────────────

function doBuildModerationResult(
  ctx: SafetyContext,
  contentId: string,
  contentType: ContentModerationResult['contentType'],
  flags: readonly ModerationFlag[],
): ContentModerationResult {
  ctx.counters.moderationResults += 1;
  const result: ContentModerationResult = {
    contentId,
    contentType,
    rating: rateFromFlags(flags),
    flags,
    reviewedAt: ctx.deps.now(),
    reviewedBy: 'automated',
  };
  if (result.rating !== 'approved') {
    ctx.deps.log('warn', 'content_flagged', {
      contentId,
      rating: result.rating,
      flags,
    });
  }
  return result;
}

// ─── Stats ─────────────────────────────────────────────────────────

function getStats(ctx: SafetyContext): SafetyEngineStats {
  return {
    activeSessions: [...ctx.sessions.values()].filter(
      (s) => s.endedAt === null,
    ).length,
    totalSessionsCreated: ctx.counters.sessionsCreated,
    totalSessionsEnded: ctx.counters.sessionsEnded,
    totalModerationResults: ctx.counters.moderationResults,
  };
}

// ─── Factory ──────────────────────────────────────────────────────

export function createSafetyEngine(
  deps: SafetyEngineDeps,
  config?: SafetyEngineConfig,
): SafetyEngine {
  const ctx: SafetyContext = {
    deps,
    cfg: resolveConfig(config),
    sessions: new Map(),
    counters: { sessionsCreated: 0, sessionsEnded: 0, moderationResults: 0 },
  };
  return {
    createAiSession: (kindlerId, characterId, worldId) =>
      doCreateSession(ctx, kindlerId, characterId, worldId),
    endAiSession: (sessionId) => doEndSession(ctx, sessionId),
    incrementTurnCount: (sessionId) => { doIncrementTurnCount(ctx, sessionId); },
    getSessionsNeedingDeletion: () => getPendingDeletion(ctx),
    isWithinTimeLimit: (dailyMinutesUsed, controls) =>
      checkTimeLimit(dailyMinutesUsed, controls),
    isPastBedtime: (controls) => checkBedtime(ctx, controls),
    buildModerationResult: (contentId, contentType, flags) =>
      doBuildModerationResult(ctx, contentId, contentType, flags),
    getStats: () => getStats(ctx),
  };
}
