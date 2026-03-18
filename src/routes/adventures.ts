/**
 * Adventures Routes — Adventure configs per world and entry.
 *
 * GET  /v1/adventures/:worldId          — All adventure configs for a world
 * GET  /v1/adventures/entry/:entryId    — Adventure config for a specific entry
 *
 * Thread: silk/adventures-quiz
 * Tier: 1
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { AdventuresEngine } from '../../universe/adventures/engine.js';
import type { AdventureConfig } from '../../universe/adventures/types.js';
import type { WorldsEngine } from '../../universe/worlds/engine.js';
import type { PgAdventureProgressRepository } from '../../universe/adventures/pg-repository.js';

// ─── Deps ──────────────────────────────────────────────────────────

export interface AdventuresRoutesDeps {
  readonly adventuresEngine: AdventuresEngine;
  readonly worldsEngine: WorldsEngine;
  /** Optional — progress endpoints return 503 if omitted. */
  readonly pgProgressRepo?: PgAdventureProgressRepository;
}

// ─── Response shapes ──────────────────────────────────────────────

interface AdventureConfigSummary {
  readonly entryId: string;
  readonly worldId: string;
  readonly guideId: string;
  readonly type: AdventureConfig['type'];
  readonly difficultyTier: AdventureConfig['difficultyTier'];
  readonly estimatedMinutes: number;
  readonly interactionMode: AdventureConfig['interactionMode'];
}

interface AdventuresListResponse {
  readonly ok: true;
  readonly worldId: string;
  readonly adventures: readonly AdventureConfigSummary[];
  readonly total: number;
  readonly totalEstimatedMinutes: number;
}

interface AdventureDetailResponse {
  readonly ok: true;
  readonly adventure: AdventureConfigSummary;
}

interface ErrorResponse {
  readonly ok: false;
  readonly error: string;
  readonly code: string;
}

// ─── Helpers ──────────────────────────────────────────────────────

function configToSummary(c: AdventureConfig): AdventureConfigSummary {
  return {
    entryId: c.entryId,
    worldId: c.worldId,
    guideId: c.guideId,
    type: c.type,
    difficultyTier: c.difficultyTier,
    estimatedMinutes: c.estimatedMinutes,
    interactionMode: c.interactionMode,
  };
}

// ─── Route Registration ────────────────────────────────────────────

export function registerAdventuresRoutes(app: FastifyAppLike, deps: AdventuresRoutesDeps): void {
  const { adventuresEngine, worldsEngine, pgProgressRepo } = deps;

  // ─── Progress Routes (registered before /:worldId to avoid conflict) ───

  // GET /v1/adventures/kindler/:kindlerId/progress
  app.get('/v1/adventures/kindler/:kindlerId/progress', async (req, reply) => {
    if (pgProgressRepo === undefined) {
      return reply.code(503).send({ ok: false, error: 'Progress tracking unavailable', code: 'UNAVAILABLE' });
    }
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const kindlerId = typeof params['kindlerId'] === 'string' ? params['kindlerId'] : null;
    if (kindlerId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid kindlerId', code: 'INVALID_INPUT' });
    }
    try {
      const progress = await pgProgressRepo.getProgressForKindler(kindlerId);
      return reply.send({ ok: true, kindlerId, progress, total: progress.length });
    } catch (err) {
      return reply.code(500).send({ ok: false, error: String(err), code: 'INTERNAL_ERROR' });
    }
  });

  // POST /v1/adventures/entry/:entryId/start — start an adventure
  // Body: { kindlerId: string }
  app.post('/v1/adventures/entry/:entryId/start', async (req, reply) => {
    if (pgProgressRepo === undefined) {
      return reply.code(503).send({ ok: false, error: 'Progress tracking unavailable', code: 'UNAVAILABLE' });
    }
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: Record<string, unknown> }).body ?? {};
    const entryId = typeof params['entryId'] === 'string' ? params['entryId'] : null;
    const kindlerId = typeof body['kindlerId'] === 'string' ? body['kindlerId'] : null;
    if (entryId === null || kindlerId === null) {
      return reply.code(400).send({ ok: false, error: 'entryId and kindlerId are required', code: 'INVALID_INPUT' });
    }
    try {
      const progress = await pgProgressRepo.startAdventure(kindlerId, entryId, Date.now());
      return reply.code(201).send({ ok: true, progress });
    } catch (err) {
      return reply.code(500).send({ ok: false, error: String(err), code: 'INTERNAL_ERROR' });
    }
  });

  // POST /v1/adventures/entry/:entryId/complete — mark adventure complete
  // Body: { kindlerId: string, interactionCount?: number, luminanceContributed?: number }
  app.post('/v1/adventures/entry/:entryId/complete', async (req, reply) => {
    if (pgProgressRepo === undefined) {
      return reply.code(503).send({ ok: false, error: 'Progress tracking unavailable', code: 'UNAVAILABLE' });
    }
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: Record<string, unknown> }).body ?? {};
    const entryId = typeof params['entryId'] === 'string' ? params['entryId'] : null;
    const kindlerId = typeof body['kindlerId'] === 'string' ? body['kindlerId'] : null;
    if (entryId === null || kindlerId === null) {
      return reply.code(400).send({ ok: false, error: 'entryId and kindlerId are required', code: 'INVALID_INPUT' });
    }
    const interactionCount = typeof body['interactionCount'] === 'number' ? body['interactionCount'] : 0;
    const luminanceContributed = typeof body['luminanceContributed'] === 'number' ? body['luminanceContributed'] : 0;
    try {
      const progress = await pgProgressRepo.completeAdventure(
        kindlerId, entryId, Date.now(), interactionCount, luminanceContributed,
      );
      if (progress === null) {
        return reply.code(404).send({ ok: false, error: 'Adventure not started', code: 'NOT_FOUND' });
      }
      return reply.send({ ok: true, progress });
    } catch (err) {
      return reply.code(500).send({ ok: false, error: String(err), code: 'INTERNAL_ERROR' });
    }
  });

  // GET /v1/adventures/entry/:entryId — must be registered before /:worldId to avoid conflict
  app.get('/v1/adventures/entry/:entryId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const entryId = typeof params['entryId'] === 'string' ? params['entryId'] : null;

    if (entryId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid entryId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const config = adventuresEngine.getConfigForEntry(entryId);
    if (config === undefined) {
      const err: ErrorResponse = {
        ok: false,
        error: `No adventure config for entry '${entryId}'`,
        code: 'NOT_FOUND',
      };
      return reply.code(404).send(err);
    }

    const res: AdventureDetailResponse = { ok: true, adventure: configToSummary(config) };
    return reply.send(res);
  });

  // GET /v1/adventures/:worldId — adventure configs for a world
  app.get('/v1/adventures/:worldId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;

    if (worldId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const world = worldsEngine.getWorldById(worldId);
    if (world === undefined) {
      const err: ErrorResponse = {
        ok: false,
        error: `World '${worldId}' not found`,
        code: 'NOT_FOUND',
      };
      return reply.code(404).send(err);
    }

    const configs = adventuresEngine.getConfigsForWorld(worldId);
    const totalMinutes = adventuresEngine.getTotalEstimatedMinutes(worldId);

    const res: AdventuresListResponse = {
      ok: true,
      worldId,
      adventures: configs.map(configToSummary),
      total: configs.length,
      totalEstimatedMinutes: totalMinutes,
    };
    return reply.send(res);
  });
}
