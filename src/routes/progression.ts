/**
 * Kindler Progression Routes — Spark level table, gain rules, level compute.
 *
 * GET /v1/progression/spark-levels        — All 8 spark level definitions
 * GET /v1/progression/spark-rules         — All spark gain rules
 * GET /v1/progression/level?spark=N       — Compute level for a given total spark
 * GET /v1/progression/unlocks/:level      — Unlocks granted at a level (0-7)
 * GET /v1/progression/compute-gain?action=&tier= — Compute spark gain for action+tier
 *
 * All data is read-only, in-memory.
 * Thread: silk/progression
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { KindlerProgressionPort, SparkActionKind } from '../../fabrics/loom-core/src/kindler-progression.js';

export interface ProgressionRoutesDeps {
  readonly progression: KindlerProgressionPort;
}

const VALID_ACTIONS: ReadonlySet<string> = new Set([
  'complete-entry',
  'complete-mini-game',
  'discover-threadway',
  'find-hidden-zone',
  'complete-cross-world-quest',
  'return-after-absence',
  'first-world-visit',
]);

export function registerProgressionRoutes(app: FastifyAppLike, deps: ProgressionRoutesDeps): void {
  const { progression } = deps;

  // GET /v1/progression/spark-levels
  app.get('/v1/progression/spark-levels', async (_req, reply) => {
    const levels = progression.getSparkLevels();
    return reply.send({ ok: true, levels, total: levels.length });
  });

  // GET /v1/progression/spark-rules
  app.get('/v1/progression/spark-rules', async (_req, reply) => {
    const rules = progression.getSparkGainRules();
    return reply.send({ ok: true, rules, total: rules.length });
  });

  // GET /v1/progression/level?spark=N — compute level for total spark
  app.get('/v1/progression/level', async (req, reply) => {
    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const rawSpark = query['spark'];
    if (rawSpark === undefined) {
      return reply.code(400).send({ ok: false, error: 'spark query param required', code: 'INVALID_INPUT' });
    }
    const totalSpark = parseInt(String(rawSpark), 10);
    if (isNaN(totalSpark) || totalSpark < 0) {
      return reply.code(400).send({ ok: false, error: 'spark must be a non-negative integer', code: 'INVALID_INPUT' });
    }
    const level = progression.computeLevel(totalSpark);
    return reply.send({ ok: true, totalSpark, level });
  });

  // GET /v1/progression/unlocks/:level
  app.get('/v1/progression/unlocks/:level', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const rawLevel = typeof params['level'] === 'string' ? parseInt(params['level'], 10) : NaN;
    if (isNaN(rawLevel) || rawLevel < 0 || rawLevel > 7) {
      return reply.code(400).send({ ok: false, error: 'level must be 0-7', code: 'INVALID_INPUT' });
    }
    const unlocks = progression.getUnlocksForLevel(rawLevel);
    return reply.send({ ok: true, level: rawLevel, unlocks });
  });

  // GET /v1/progression/compute-gain?action=&tier= — compute spark gain for an action
  app.get('/v1/progression/compute-gain', async (req, reply) => {
    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const action = typeof query['action'] === 'string' ? query['action'] : null;
    const rawTier = query['tier'] !== undefined ? parseInt(String(query['tier']), 10) : NaN;
    if (action === null || !VALID_ACTIONS.has(action)) {
      return reply.code(400).send({
        ok: false,
        error: `action must be one of: ${[...VALID_ACTIONS].join(', ')}`,
        code: 'INVALID_INPUT',
      });
    }
    const tier = isNaN(rawTier) ? 1 : Math.max(0, Math.min(3, rawTier));
    const sparkGain = progression.computeSparkGain(action as SparkActionKind, tier);
    return reply.send({ ok: true, action, difficultyTier: tier, sparkGain });
  });
}
