/**
 * Feature Flags Routes
 *
 * GET  /v1/flags           — list all flags
 * GET  /v1/flags/:name     — get one flag + isEnabled check for playerId
 * POST /v1/flags           — upsert a flag (moderation secret guarded)
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { PgFeatureFlagsRepository } from '../../universe/feature-flags/pg-repository.js';

type ErrorResponse = { ok: false; error: string; code: string };

export interface FeatureFlagRoutesDeps {
  readonly flagsRepo: PgFeatureFlagsRepository;
  readonly moderationSecret: string | undefined;
}

export function registerFeatureFlagRoutes(app: FastifyAppLike, deps: FeatureFlagRoutesDeps): void {
  const { flagsRepo, moderationSecret } = deps;

  function requireSecret(req: { headers: Record<string, unknown> }, reply: { code: (n: number) => { send: (v: unknown) => unknown } }): boolean {
    if (!moderationSecret) return true;
    const provided = (req.headers as Record<string, string | string[] | undefined>)['x-moderation-secret'];
    if (provided !== moderationSecret) {
      const err: ErrorResponse = { ok: false, error: 'Forbidden', code: 'FORBIDDEN' };
      reply.code(403).send(err);
      return false;
    }
    return true;
  }

  // GET /v1/flags
  app.get('/v1/flags', async (_req, reply) => {
    try {
      const flags = await flagsRepo.getAllFlags();
      return reply.send({ ok: true, flags });
    } catch (err) {
      const e: ErrorResponse = { ok: false, error: String(err), code: 'INTERNAL' };
      return reply.code(500).send(e);
    }
  });

  // GET /v1/flags/:name
  app.get('/v1/flags/:name', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const name = typeof params['name'] === 'string' ? params['name'] : null;
    if (name === null) {
      const err: ErrorResponse = { ok: false, error: 'Flag name required', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const playerId = typeof query['playerId'] === 'string' ? query['playerId'] : undefined;

    try {
      const flag = await flagsRepo.getFlag(name);
      if (flag === null) {
        const err: ErrorResponse = { ok: false, error: 'Flag not found', code: 'NOT_FOUND' };
        return reply.code(404).send(err);
      }
      const enabled = await flagsRepo.isEnabled(name, playerId);
      return reply.send({ ok: true, flag, enabled });
    } catch (err) {
      const e: ErrorResponse = { ok: false, error: String(err), code: 'INTERNAL' };
      return reply.code(500).send(e);
    }
  });

  // POST /v1/flags  (secret guarded)
  app.post('/v1/flags', async (req, reply) => {
    if (!requireSecret(req as unknown as { headers: Record<string, unknown> }, reply as never)) return;

    const body = (req as unknown as { body: unknown }).body;
    if (typeof body !== 'object' || body === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid body', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const b = body as Record<string, unknown>;
    const flagName = typeof b['flagName'] === 'string' ? b['flagName'] : null;
    const enabled = typeof b['enabled'] === 'boolean' ? b['enabled'] : null;
    const rolloutPct = typeof b['rolloutPct'] === 'number' ? b['rolloutPct'] : 100;

    if (flagName === null || enabled === null) {
      const err: ErrorResponse = { ok: false, error: 'flagName and enabled are required', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    if (rolloutPct < 0 || rolloutPct > 100) {
      const err: ErrorResponse = { ok: false, error: 'rolloutPct must be 0-100', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const allowedPlayers = Array.isArray(b['allowedPlayers'])
      ? (b['allowedPlayers'] as string[]).filter((x): x is string => typeof x === 'string')
      : null;
    const description = typeof b['description'] === 'string' ? b['description'] : null;

    try {
      const flag = await flagsRepo.upsertFlag({ flagName, enabled, rolloutPct, allowedPlayers, description });
      return reply.send({ ok: true, flag });
    } catch (err) {
      const e: ErrorResponse = { ok: false, error: String(err), code: 'INTERNAL' };
      return reply.code(500).send(e);
    }
  });
}
