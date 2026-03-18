/**
 * Session Routes — Game session lifecycle.
 *
 * POST /v1/session/start                         — Start a learning session
 * POST /v1/session/:sessionId/complete-entry     — Record an entry completion
 * POST /v1/session/:sessionId/mark-world-restored — Mark a world as restored
 * POST /v1/session/:sessionId/end               — End session and persist
 * GET  /v1/session/:sessionId                   — Get session state
 *
 * This is the core game loop API: enter a world → learn from entries →
 * earn Spark → restore worlds → advance Chapter.
 *
 * Thread: silk/game-characters
 * Tier: 1
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { KindlerRepository } from '../../universe/kindler/repository.js';
import type { KindlerEngine } from '../../universe/kindler/engine.js';
import type { SparkCause, KindlerSession } from '../../universe/kindler/types.js';

// ─── Request shapes ───────────────────────────────────────────────

interface StartSessionRequest {
  readonly kindlerId: string;
}

interface CompleteEntryRequest {
  readonly entryId: string;
  readonly worldId: string;
  readonly adventureType: string;
  readonly score?: number;
}

interface MarkWorldRestoredRequest {
  readonly worldId: string;
}

interface EndSessionRequest {
  readonly worldsVisited: readonly string[];
  readonly guidesInteracted: readonly string[];
  readonly entriesCompleted: readonly string[];
}

// ─── Response shapes ──────────────────────────────────────────────

interface SessionResponse {
  readonly ok: true;
  readonly session: {
    readonly id: string;
    readonly kindlerId: string;
    readonly startedAt: number;
    readonly endedAt: number | null;
    readonly worldsVisited: readonly string[];
    readonly guidesInteracted: readonly string[];
    readonly entriesCompleted: readonly string[];
    readonly sparkDelta: number;
  };
}

interface SparkEventResponse {
  readonly ok: true;
  readonly sparkLevel: number;
  readonly sparkDelta: number;
  readonly cause: SparkCause;
}

interface ErrorResponse {
  readonly ok: false;
  readonly error: string;
  readonly code: string;
}

// ─── Helpers ──────────────────────────────────────────────────────

function sessionToResponse(s: KindlerSession): SessionResponse {
  return {
    ok: true,
    session: {
      id: s.id,
      kindlerId: s.kindlerId,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      worldsVisited: s.worldsVisited,
      guidesInteracted: s.guidesInteracted,
      entriesCompleted: s.entriesCompleted,
      sparkDelta: s.sparkDelta,
    },
  };
}

async function ensureKindlerLoaded(
  repo: KindlerRepository,
  engine: KindlerEngine,
  kindlerId: string,
): Promise<boolean> {
  // Try spark state — throws if kindler not registered
  try {
    engine.getSparkState(kindlerId);
    return true;
  } catch {
    const profile = await repo.findById(kindlerId);
    if (profile === null) return false;
    engine.registerKindler(profile);
    return true;
  }
}

// ─── Route Registration ───────────────────────────────────────────

export interface SessionRoutesDeps {
  readonly repo: KindlerRepository;
  readonly engine: KindlerEngine;
  readonly idGenerator: { generate: () => string };
  /** Optional: called after a Kindler completes an entry to apply world fading restoration. */
  readonly getEntryTier?: (entryId: string) => 1 | 2 | 3 | null;
  /** Optional: notified after entry completion so the caller can update luminance state. */
  readonly onEntryCompleted?: (worldId: string, kindlerId: string, tier: 1 | 2 | 3) => void;
}

export function registerSessionRoutes(app: FastifyAppLike, deps: SessionRoutesDeps): void {
  const { repo, engine, idGenerator, getEntryTier, onEntryCompleted } = deps;

  // POST /v1/session/start
  app.post('/v1/session/start', async (req, reply) => {
    const body = (req as unknown as { body: unknown }).body;
    if (typeof body !== 'object' || body === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid body', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const b = body as Record<string, unknown>;
    const kindlerId = typeof b['kindlerId'] === 'string' ? b['kindlerId'] : null;
    if (kindlerId === null) {
      const err: ErrorResponse = { ok: false, error: 'kindlerId required', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const loaded = await ensureKindlerLoaded(repo, engine, kindlerId);
    if (!loaded) {
      const err: ErrorResponse = { ok: false, error: 'Kindler not found', code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }

    const session = engine.startSession(kindlerId);
    await repo.saveSession(session);
    return reply.code(201).send(sessionToResponse(session));
  });

  // POST /v1/session/:sessionId/complete-entry
  app.post('/v1/session/:sessionId/complete-entry', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const sessionId = typeof params['sessionId'] === 'string' ? params['sessionId'] : null;
    if (sessionId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid sessionId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const body = (req as unknown as { body: unknown }).body;
    if (typeof body !== 'object' || body === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid body', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const b = body as Record<string, unknown>;
    const entryId = typeof b['entryId'] === 'string' ? b['entryId'] : null;
    const worldId = typeof b['worldId'] === 'string' ? b['worldId'] : null;
    const adventureType = typeof b['adventureType'] === 'string' ? b['adventureType'] : 'default';
    const score = typeof b['score'] === 'number' ? b['score'] : null;

    if (entryId === null || worldId === null) {
      const err: ErrorResponse = { ok: false, error: 'entryId and worldId required', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const savedSession = await repo.loadSession(sessionId);
    if (savedSession === null) {
      const err: ErrorResponse = { ok: false, error: 'Session not found', code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }

    const { kindlerId } = savedSession;
    const loaded = await ensureKindlerLoaded(repo, engine, kindlerId);
    if (!loaded) {
      const err: ErrorResponse = { ok: false, error: 'Kindler not found', code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }

    const progress = engine.recordProgress(kindlerId, entryId, worldId, adventureType, score);
    await repo.saveProgress(progress);

    // Notify fading engine so the world luminance reflects completed lessons
    if (getEntryTier !== undefined && onEntryCompleted !== undefined) {
      const tier = getEntryTier(entryId);
      if (tier !== null) onEntryCompleted(worldId, kindlerId, tier);
    }

    const sparkState = engine.getSparkState(kindlerId);
    const res: SparkEventResponse = {
      ok: true,
      sparkLevel: sparkState.level,
      sparkDelta: progress.score !== null ? 0.05 : 0.04,
      cause: 'lesson_completed',
    };
    return reply.send(res);
  });

  // POST /v1/session/:sessionId/mark-world-restored
  app.post('/v1/session/:sessionId/mark-world-restored', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const sessionId = typeof params['sessionId'] === 'string' ? params['sessionId'] : null;
    if (sessionId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid sessionId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const body = (req as unknown as { body: unknown }).body;
    if (typeof body !== 'object' || body === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid body', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const b = body as Record<string, unknown>;
    const worldId = typeof b['worldId'] === 'string' ? b['worldId'] : null;
    if (worldId === null) {
      const err: ErrorResponse = { ok: false, error: 'worldId required', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const savedSession = await repo.loadSession(sessionId);
    if (savedSession === null) {
      const err: ErrorResponse = { ok: false, error: 'Session not found', code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }

    const { kindlerId } = savedSession;
    const loaded = await ensureKindlerLoaded(repo, engine, kindlerId);
    if (!loaded) {
      const err: ErrorResponse = { ok: false, error: 'Kindler not found', code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }

    engine.markWorldRestored(kindlerId, worldId);

    const sparkState = engine.getSparkState(kindlerId);
    const res: SparkEventResponse = {
      ok: true,
      sparkLevel: sparkState.level,
      sparkDelta: 0.10,
      cause: 'world_restored',
    };
    return reply.send(res);
  });

  // POST /v1/session/:sessionId/end
  app.post('/v1/session/:sessionId/end', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const sessionId = typeof params['sessionId'] === 'string' ? params['sessionId'] : null;
    if (sessionId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid sessionId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const body = (req as unknown as { body: unknown }).body;
    const b = (typeof body === 'object' && body !== null) ? body as Record<string, unknown> : {};
    const worldsVisited = Array.isArray(b['worldsVisited']) ? (b['worldsVisited'] as string[]) : [];
    const guidesInteracted = Array.isArray(b['guidesInteracted']) ? (b['guidesInteracted'] as string[]) : [];
    const entriesCompleted = Array.isArray(b['entriesCompleted']) ? (b['entriesCompleted'] as string[]) : [];

    const savedSession = await repo.loadSession(sessionId);
    if (savedSession === null) {
      const err: ErrorResponse = { ok: false, error: 'Session not found', code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }

    const { kindlerId } = savedSession;
    const loaded = await ensureKindlerLoaded(repo, engine, kindlerId);
    if (!loaded) {
      const err: ErrorResponse = { ok: false, error: 'Kindler not found', code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }

    const completed = engine.endSession(sessionId, worldsVisited, guidesInteracted, entriesCompleted);
    await repo.saveSession(completed);

    // Persist updated kindler profile
    const profile = await repo.findById(kindlerId);
    if (profile !== null) {
      const sparkState = engine.getSparkState(kindlerId);
      const updated: typeof profile = {
        ...profile,
        sparkLevel: sparkState.level,
        worldsVisited: [...new Set([...profile.worldsVisited, ...worldsVisited])],
      };
      await repo.save(updated);
    }

    return reply.send(sessionToResponse(completed));
  });

  // GET /v1/session/:sessionId
  app.get('/v1/session/:sessionId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const sessionId = typeof params['sessionId'] === 'string' ? params['sessionId'] : null;
    if (sessionId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid sessionId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const session = await repo.loadSession(sessionId);
    if (session === null) {
      const err: ErrorResponse = { ok: false, error: 'Session not found', code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }

    return reply.send(sessionToResponse(session));
  });
}
