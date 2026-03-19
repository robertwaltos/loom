/**
 * Fading / Luminance Routes — World restoration state.
 *
 * GET /v1/fading                     — All worlds' current luminance state
 * GET /v1/fading/:worldId            — Single world luminance
 * GET /v1/fading/:worldId/history    — Luminance change log (newest first)
 * GET /v1/fading/stats               — Aggregate restoration stats (most/least lit)
 *
 * In-memory luminanceStore is the source of truth for current state;
 * history comes from the PG repository.
 *
 * Thread: silk/worlds
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { WorldLuminance } from '../../universe/worlds/types.js';
import type { PgLuminanceRepository } from '../../universe/fading/pg-luminance-repository.js';

export interface FadingRoutesDeps {
  readonly luminanceStore: ReadonlyMap<string, WorldLuminance>;
  readonly pgLuminanceRepo: PgLuminanceRepository;
}

export function registerFadingRoutes(app: FastifyAppLike, deps: FadingRoutesDeps): void {
  const { luminanceStore, pgLuminanceRepo } = deps;

  // GET /v1/fading/stats — must register before /:worldId
  app.get('/v1/fading/stats', async (_req, reply) => {
    const worlds = [...luminanceStore.values()];
    const total = worlds.length;
    if (total === 0) return reply.send({ ok: true, stats: null });

    const sorted = [...worlds].sort((a, b) => b.luminance - a.luminance);
    const mostLit = sorted[0];
    const leastLit = sorted[sorted.length - 1];
    const avgLuminance = worlds.reduce((s, w) => s + w.luminance, 0) / total;
    const fullyRestored = worlds.filter(w => w.luminance >= 1.0).length;
    const critical = worlds.filter(w => w.luminance < 0.2).length;

    return reply.send({
      ok: true,
      stats: {
        totalWorlds: total,
        avgLuminance: Math.round(avgLuminance * 1000) / 1000,
        fullyRestored,
        critical,
        mostLit: mostLit ? { worldId: mostLit.worldId, luminance: mostLit.luminance, stage: mostLit.stage } : null,
        leastLit: leastLit ? { worldId: leastLit.worldId, luminance: leastLit.luminance, stage: leastLit.stage } : null,
      },
    });
  });

  // GET /v1/fading — all worlds
  app.get('/v1/fading', async (_req, reply) => {
    const worlds = [...luminanceStore.values()];
    return reply.send({ ok: true, worlds, total: worlds.length });
  });

  // GET /v1/fading/:worldId/history
  app.get('/v1/fading/:worldId/history', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;
    if (worldId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' });
    }
    const limit = typeof query['limit'] === 'string' ? parseInt(query['limit'], 10) : 50;
    const offset = typeof query['offset'] === 'string' ? parseInt(query['offset'], 10) : 0;
    if (isNaN(limit) || limit < 1 || limit > 200) {
      return reply.code(400).send({ ok: false, error: 'limit must be 1–200', code: 'INVALID_INPUT' });
    }
    const history = await pgLuminanceRepo.loadHistory(worldId, limit, offset);
    return reply.send({ ok: true, worldId, history, total: history.length });
  });

  // GET /v1/fading/:worldId
  app.get('/v1/fading/:worldId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;
    if (worldId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' });
    }
    const world = luminanceStore.get(worldId);
    if (world === undefined) {
      return reply.code(404).send({ ok: false, error: `World '${worldId}' not found`, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, world });
  });
}
