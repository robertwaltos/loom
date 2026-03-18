/**
 * Safety Routes — COPPA-Compliant AI Session & Content Moderation
 *
 * Wraps universe/safety/engine.ts behind Fastify HTTP endpoints.
 *
 * COPPA INVARIANTS:
 * - AI sessions are ephemeral: auto-deleted 24 hours after end
 * - Moderation runs on every AI response before delivery
 * - Session IDs are UUIDs — no child PII embedded
 */

import type { FastifyAppLike } from '@loom/selvage';
import {
  createSafetyEngine,
  type SafetyEngineDeps,
} from '../../universe/safety/engine.js';
import type { PgSafetySessionStore } from '../../universe/safety/pg-session-store.js';
import type { ModerationFlag } from '../../universe/safety/types.js';
import type { AnalyticsEmitter } from '../../universe/analytics/pg-repository.js';

// ─── Deps ──────────────────────────────────────────────────────────

export interface SafetyRoutesDeps {
  readonly generateId: () => string;
  readonly now: () => number;
  readonly log: (level: 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) => void;
  /** Optional PG store — mirrors session lifecycle for COPPA audit. */
  readonly pgSessionStore?: PgSafetySessionStore;
  /** Optional: fire-and-forget analytics emitter. */
  readonly analyticsEmitter?: AnalyticsEmitter;
}

// ─── Route Registration ────────────────────────────────────────────

export function registerSafetyRoutes(
  app: FastifyAppLike,
  deps: SafetyRoutesDeps,
): void {
  const engineDeps: SafetyEngineDeps = {
    generateId: deps.generateId,
    now: deps.now,
    log: deps.log,
  };

  const engine = createSafetyEngine(engineDeps);
  const store = deps.pgSessionStore;
  const analyticsEmitter = deps.analyticsEmitter;

  // POST /v1/safety/ai-session/start
  // Body: { kindlerId, characterId, worldId }
  app.post('/v1/safety/ai-session/start', async (req, reply) => {
    const body = (req as unknown as { body: Record<string, unknown> }).body ?? {};
    const kindlerId = typeof body['kindlerId'] === 'string' ? body['kindlerId'] : null;
    const characterId = typeof body['characterId'] === 'string' ? body['characterId'] : null;
    const worldId = typeof body['worldId'] === 'string' ? body['worldId'] : null;

    if (kindlerId === null || characterId === null || worldId === null) {
      return reply.status(422).send({ ok: false, error: 'kindlerId, characterId, worldId are required' });
    }

    try {
      const session = engine.createAiSession(kindlerId, characterId, worldId);
      if (store !== undefined) {
        store.save(session).catch((err: unknown) => {
          deps.log('warn', 'ai_session_persist_failed', { sessionId: session.id, error: String(err) });
        });
      }
      analyticsEmitter?.emit({
        eventType: 'ai_session_started',
        playerId: kindlerId,
        sessionId: session.id,
        properties: { characterId, worldId },
      });
      return reply.status(201).send({ ok: true, session });
    } catch (err) {
      deps.log('error', 'ai_session_start_failed', { kindlerId, error: String(err) });
      return reply.status(500).send({ ok: false, error: 'Failed to create AI session' });
    }
  });

  // POST /v1/safety/ai-session/:sessionId/end
  app.post('/v1/safety/ai-session/:sessionId/end', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const sessionId = typeof params['sessionId'] === 'string' ? params['sessionId'] : null;
    if (sessionId === null) return reply.status(422).send({ ok: false, error: 'Invalid sessionId' });

    try {
      const session = engine.endAiSession(sessionId);
      if (store !== undefined) {
        store.save(session).catch((err: unknown) => {
          deps.log('warn', 'ai_session_end_persist_failed', { sessionId, error: String(err) });
        });
      }
      analyticsEmitter?.emit({ eventType: 'ai_session_ended', sessionId });
      return reply.send({ ok: true, session });
    } catch (err) {
      deps.log('warn', 'ai_session_end_failed', { sessionId, error: String(err) });
      return reply.status(404).send({ ok: false, error: 'AI session not found' });
    }
  });

  // POST /v1/safety/moderate
  // Body: { contentId, contentType, flags[] }
  app.post('/v1/safety/moderate', (req, reply) => {
    const body = (req as unknown as { body: Record<string, unknown> }).body ?? {};
    const contentId = typeof body['contentId'] === 'string' ? body['contentId'] : null;
    const contentType = body['contentType'];
    const rawFlags = body['flags'];

    if (contentId === null) {
      return reply.status(422).send({ ok: false, error: 'contentId is required' });
    }

    const VALID_TYPES = new Set(['entry', 'ai_response', 'user_input']);
    if (typeof contentType !== 'string' || !VALID_TYPES.has(contentType)) {
      return reply.status(422).send({ ok: false, error: 'contentType must be entry|ai_response|user_input' });
    }

    const flags: ModerationFlag[] = Array.isArray(rawFlags)
      ? (rawFlags.filter((f): f is ModerationFlag => typeof f === 'string'))
      : [];

    const result = engine.buildModerationResult(
      contentId,
      contentType as 'entry' | 'ai_response' | 'user_input',
      flags,
    );

    return reply.send({ ok: true, result });
  });

  // GET /v1/safety/stats — operational visibility (no child data)
  app.get('/v1/safety/stats', (_req, reply) => {
    const stats = engine.getStats();
    return reply.send({ ok: true, stats });
  });

  // GET /v1/safety/pending-deletion — list sessions awaiting auto-delete
  app.get('/v1/safety/pending-deletion', (_req, reply) => {
    const pending = engine.getSessionsNeedingDeletion();
    return reply.send({ ok: true, count: pending.length, sessions: pending });
  });
}
