import type { FastifyAppLike } from '@loom/selvage';
import type {
  SpawnBudgetState,
  EntityCategory,
  SpawnPriority,
} from '../../fabrics/loom-core/src/spawn-budget.js';
import {
  setBudget,
  requestSpawn,
  recordDespawn,
  getBudgetReport,
  getQueueDepth,
  processQueue,
  emergencyPurge,
  refillBudgets,
  getAllReports,
  clearQueue,
  getQueueSnapshot,
  cancelRequest,
  getBudget,
  getTotalActiveEntities,
  getTotalMaxEntities,
} from '../../fabrics/loom-core/src/spawn-budget.js';

interface Deps {
  spawnBudgetState: SpawnBudgetState;
}

function serializeBigInt(v: unknown): unknown {
  if (typeof v === 'bigint') return v.toString();
  if (v instanceof Map) {
    return Object.fromEntries(Array.from(v.entries()).map(([k, val]) => [k, serializeBigInt(val)]));
  }
  if (Array.isArray(v)) return v.map(serializeBigInt);
  if (v !== null && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, serializeBigInt(val)]),
    );
  }
  return v;
}


function r(req: unknown): { body: Record<string, unknown>; params: Record<string, any>; query: Record<string, string | undefined> } {
  return req as never;
}

export function registerSpawnBudgetRoutes(app: FastifyAppLike, deps: Deps): void {
  const { spawnBudgetState: state } = deps;

  // Set budget for a world
  app.patch('/v1/spawn-budget/worlds/:worldId', (req, reply) => {
    const { worldId } = r(req).params;
    const b = r(req).body;
    const result = setBudget(
      state,
      worldId,
      Number(b['maxNpc'] ?? 50),
      Number(b['maxMonster'] ?? 30),
      Number(b['maxCreature'] ?? 40),
      Number(b['maxItem'] ?? 100),
      Number(b['maxStructure'] ?? 20),
      BigInt(String(b['refillRateMicros'] ?? '60000000')),
    );
    if (typeof result === 'string') {
      return reply.code(422).send({ ok: false, error: result, code: 'UNPROCESSABLE' });
    }
    return reply.send({ ok: true, budget: serializeBigInt(result) });
  });

  // Get budget for a world
  app.get('/v1/spawn-budget/worlds/:worldId', (req, reply) => {
    const { worldId } = r(req).params;
    const result = getBudget(state, worldId);
    if (typeof result === 'string') {
      return reply.code(404).send({ ok: false, error: result, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, budget: serializeBigInt(result) });
  });

  // Get all budget reports for a world
  app.get('/v1/spawn-budget/worlds/:worldId/reports', (req, reply) => {
    const { worldId } = r(req).params;
    const result = getAllReports(state, worldId);
    if (typeof result === 'string') {
      return reply.code(404).send({ ok: false, error: result, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, reports: result });
  });

  // Get budget report for a category
  app.get('/v1/spawn-budget/worlds/:worldId/categories/:category', (req, reply) => {
    const { worldId, category } = r(req).params;
    const result = getBudgetReport(state, worldId, category as EntityCategory);
    if (typeof result === 'string') {
      return reply.code(result === 'world-not-found' || result === 'budget-not-found' ? 404 : 422).send({
        ok: false, error: result, code: 'UNPROCESSABLE',
      });
    }
    return reply.send({ ok: true, report: result });
  });

  // Request a spawn
  app.post('/v1/spawn-budget/worlds/:worldId/requests', (req, reply) => {
    const { worldId } = r(req).params;
    const b = r(req).body;
    const result = requestSpawn(
      state,
      worldId,
      (b['category'] ?? 'NPC') as EntityCategory,
      (b['priority'] ?? 'NORMAL') as SpawnPriority,
      String(b['entityType'] ?? 'generic'),
      Number(b['count'] ?? 1),
    );
    if (typeof result === 'string') {
      const code = result === 'world-not-found' ? 404 : result === 'budget-exceeded' ? 429 : 422;
      return reply.code(code).send({ ok: false, error: result, code: 'UNPROCESSABLE' });
    }
    return reply.code(201).send({ ok: true, request: serializeBigInt(result) });
  });

  // Cancel a spawn request
  app.delete('/v1/spawn-budget/worlds/:worldId/requests/:requestId', (req, reply) => {
    const { worldId, requestId } = r(req).params;
    const result = cancelRequest(state, worldId, requestId);
    if (result !== 'ok') {
      return reply.code(404).send({ ok: false, error: result, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, cancelled: true, requestId });
  });

  // Record a despawn
  app.post('/v1/spawn-budget/worlds/:worldId/despawn', (req, reply) => {
    const { worldId } = r(req).params;
    const b = r(req).body;
    const count = typeof b['count'] === 'number' ? b['count'] : 1;
    const result = recordDespawn(state, worldId, (b['category'] ?? 'NPC') as EntityCategory, count);
    if (result !== 'ok') {
      return reply.code(result === 'world-not-found' || result === 'budget-not-found' ? 404 : 422).send({
        ok: false, error: result, code: 'UNPROCESSABLE',
      });
    }
    return reply.send({ ok: true, despawned: true });
  });

  // Process spawn queue
  app.post('/v1/spawn-budget/worlds/:worldId/queue/process', (req, reply) => {
    const { worldId } = r(req).params;
    const b = r(req).body;
    const limit = typeof b['limit'] === 'number' ? b['limit'] : 10;
    const result = processQueue(state, worldId, limit);
    if (typeof result === 'string') {
      return reply.code(result === 'world-not-found' ? 404 : 422).send({
        ok: false, error: result, code: 'UNPROCESSABLE',
      });
    }
    return reply.send({ ok: true, processed: serializeBigInt(result) });
  });

  // Get queue depth
  app.get('/v1/spawn-budget/worlds/:worldId/queue/depth', (req, reply) => {
    const { worldId } = r(req).params;
    const result = getQueueDepth(state, worldId);
    if (typeof result === 'string') {
      return reply.code(404).send({ ok: false, error: result, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, worldId, queueDepth: result });
  });

  // Get queue snapshot
  app.get('/v1/spawn-budget/worlds/:worldId/queue', (req, reply) => {
    const { worldId } = r(req).params;
    const result = getQueueSnapshot(state, worldId);
    if (typeof result === 'string') {
      return reply.code(404).send({ ok: false, error: result, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, queue: serializeBigInt(result) });
  });

  // Clear queue
  app.delete('/v1/spawn-budget/worlds/:worldId/queue', (req, reply) => {
    const { worldId } = r(req).params;
    const result = clearQueue(state, worldId);
    if (result !== 'ok') {
      return reply.code(404).send({ ok: false, error: result, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, cleared: true, worldId });
  });

  // Emergency purge
  app.post('/v1/spawn-budget/worlds/:worldId/emergency-purge', (req, reply) => {
    const { worldId } = r(req).params;
    const b = r(req).body;
    const category = (b['category'] ?? 'NPC') as EntityCategory;
    const targetCount = typeof b['targetCount'] === 'number' ? b['targetCount'] : 0;
    const result = emergencyPurge(state, worldId, category, targetCount);
    if (typeof result === 'string') {
      return reply.code(result === 'world-not-found' ? 404 : 422).send({
        ok: false, error: result, code: 'UNPROCESSABLE',
      });
    }
    return reply.send({ ok: true, purged: result });
  });

  // Refill budgets
  app.post('/v1/spawn-budget/worlds/:worldId/refill', (req, reply) => {
    const { worldId } = r(req).params;
    const result = refillBudgets(state, worldId);
    if (result !== 'ok') {
      return reply.code(result === 'world-not-found' ? 404 : 422).send({
        ok: false, error: result, code: 'UNPROCESSABLE',
      });
    }
    return reply.send({ ok: true, refilled: true, worldId });
  });

  // Total active entities across all categories
  app.get('/v1/spawn-budget/worlds/:worldId/totals', (req, reply) => {
    const { worldId } = r(req).params;
    const activeResult = getTotalActiveEntities(state, worldId);
    const maxResult = getTotalMaxEntities(state, worldId);
    if (typeof activeResult === 'string') {
      return reply.code(404).send({ ok: false, error: activeResult, code: 'NOT_FOUND' });
    }
    return reply.send({
      ok: true,
      worldId,
      totalActive: activeResult,
      totalMax: typeof maxResult === 'string' ? null : maxResult,
    });
  });
}
