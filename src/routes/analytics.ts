/**
 * Analytics Routes — Game Telemetry Query Interface
 *
 * Ops-facing endpoints for querying game analytics events.
 * All routes require X-Moderation-Secret header.
 * COPPA: player_id is always an opaque kindler UUID — no real PII.
 *
 * GET  /v1/analytics/events                 — recent events (paginated)
 * GET  /v1/analytics/player/:playerId       — events for one player
 * GET  /v1/analytics/stats                  — event counts by type
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { PgAnalyticsRepository } from '../../universe/analytics/pg-repository.js';

type Err = { ok: false; error: string; code: string };

export interface AnalyticsRoutesDeps {
  readonly analyticsRepo: PgAnalyticsRepository;
  readonly moderationSecret: string | undefined;
}

export function registerAnalyticsRoutes(app: FastifyAppLike, deps: AnalyticsRoutesDeps): void {
  const { analyticsRepo, moderationSecret } = deps;

  function guard(
    req: { headers: Record<string, unknown> },
    reply: { code: (n: number) => { send: (v: unknown) => unknown } },
  ): boolean {
    if (!moderationSecret) return true;
    const h = (req.headers as Record<string, string | string[] | undefined>)['x-moderation-secret'];
    if (h !== moderationSecret) {
      reply.code(403).send({ ok: false, error: 'Forbidden', code: 'FORBIDDEN' } satisfies Err);
      return false;
    }
    return true;
  }

  // GET /v1/analytics/events?limit=50&offset=0
  app.get('/v1/analytics/events', async (req, reply) => {
    if (!guard(req as never, reply as never)) return;
    const q = (req as unknown as { query: Record<string, unknown> }).query;
    const limit = typeof q['limit'] === 'string' ? Math.min(parseInt(q['limit'], 10), 500) : 50;
    const offset = typeof q['offset'] === 'string' ? parseInt(q['offset'], 10) : 0;
    try {
      const events = await analyticsRepo.getRecent(limit, offset);
      return reply.send({ ok: true, events, limit, offset, count: events.length });
    } catch (err) {
      return reply.code(500).send({ ok: false, error: String(err), code: 'INTERNAL' } satisfies Err);
    }
  });

  // GET /v1/analytics/player/:playerId?limit=200
  app.get('/v1/analytics/player/:playerId', async (req, reply) => {
    if (!guard(req as never, reply as never)) return;
    const p = (req as unknown as { params: Record<string, unknown> }).params;
    const playerId = typeof p['playerId'] === 'string' ? p['playerId'] : null;
    if (playerId === null) {
      return reply.code(400).send({ ok: false, error: 'playerId required', code: 'INVALID_INPUT' } satisfies Err);
    }
    const q = (req as unknown as { query: Record<string, unknown> }).query;
    const limit = typeof q['limit'] === 'string' ? Math.min(parseInt(q['limit'], 10), 500) : 200;
    try {
      const events = await analyticsRepo.getByPlayer(playerId, limit);
      return reply.send({ ok: true, playerId, events, count: events.length });
    } catch (err) {
      return reply.code(500).send({ ok: false, error: String(err), code: 'INTERNAL' } satisfies Err);
    }
  });

  // GET /v1/analytics/stats
  app.get('/v1/analytics/stats', async (req, reply) => {
    if (!guard(req as never, reply as never)) return;
    try {
      const stats = await analyticsRepo.getStats();
      return reply.send({ ok: true, stats });
    } catch (err) {
      return reply.code(500).send({ ok: false, error: String(err), code: 'INTERNAL' } satisfies Err);
    }
  });
}
