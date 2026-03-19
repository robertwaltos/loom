/**
 * Loot Table Routes — Item drop tables, rarity tiers, loot pools.
 *
 * POST   /v1/loot-tables                                  — Create table
 * GET    /v1/loot-tables                                  — List all tables
 * GET    /v1/loot-tables/:tableId                         — Get table definition
 * DELETE /v1/loot-tables/:tableId                         — Delete table
 * POST   /v1/loot-tables/:tableId/pools                   — Add pool
 * DELETE /v1/loot-tables/:tableId/pools/:poolId           — Remove pool
 * PATCH  /v1/loot-tables/:tableId/pools/:poolId/rate      — Set drop rate
 * POST   /v1/loot-tables/:tableId/roll                    — Roll loot (optional seed)
 * GET    /v1/loot-tables/:tableId/stats                   — Rarity distribution
 * POST   /v1/loot-tables/:tableId/preview                 — Simulate rolls { iterations }
 *
 * BigInt fields (seed, rolledAtMicros, etc.) are serialized as strings.
 *
 * Thread: silk/items
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { LootTableModule, LootPool, LootEntry, RarityTier } from '../../fabrics/loom-core/src/loot-table.js';

const VALID_RARITIES: ReadonlySet<string> = new Set([
  'COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'ARTIFACT',
]);

/** Recursively replace bigint values with their string representation for JSON. */
function serializeBigInt(v: unknown): unknown {
  if (typeof v === 'bigint') return v.toString();
  if (Array.isArray(v)) return v.map(serializeBigInt);
  if (v !== null && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, serializeBigInt(val)]),
    );
  }
  return v;
}

export interface LootTableRoutesDeps {
  readonly lootTables: LootTableModule;
}

export function registerLootTableRoutes(app: FastifyAppLike, deps: LootTableRoutesDeps): void {
  const { lootTables } = deps;

  // GET /v1/loot-tables — list all
  app.get('/v1/loot-tables', async (_req, reply) => {
    const tables = lootTables.listTables();
    return reply.send({ ok: true, tables, total: tables.length });
  });

  // POST /v1/loot-tables — create
  app.post('/v1/loot-tables', async (req, reply) => {
    const body = (req as unknown as { body: unknown }).body;
    if (typeof body !== 'object' || body === null) {
      return reply.code(400).send({ ok: false, error: 'Body required', code: 'INVALID_INPUT' });
    }
    const b = body as Record<string, unknown>;
    if (typeof b['name'] !== 'string' || typeof b['context'] !== 'string') {
      return reply.code(400).send({ ok: false, error: 'name and context required', code: 'INVALID_INPUT' });
    }
    const guaranteedItems = Array.isArray(b['guaranteedItems']) ? (b['guaranteedItems'] as string[]) : [];
    const tableId = lootTables.createTable(b['name'], b['context'], guaranteedItems);
    const table = lootTables.getTable(tableId);
    return reply.code(201).send({ ok: true, tableId, table });
  });

  // GET /v1/loot-tables/:tableId — get table (before pools/roll/stats)
  app.get('/v1/loot-tables/:tableId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const tableId = typeof params['tableId'] === 'string' ? params['tableId'] : null;
    if (tableId === null) return reply.code(400).send({ ok: false, error: 'Invalid tableId', code: 'INVALID_INPUT' });
    const table = lootTables.getTable(tableId);
    if ('error' in table) return reply.code(404).send({ ok: false, error: table.error, code: 'NOT_FOUND' });
    return reply.send({ ok: true, table });
  });

  // DELETE /v1/loot-tables/:tableId — delete table
  app.delete('/v1/loot-tables/:tableId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const tableId = typeof params['tableId'] === 'string' ? params['tableId'] : null;
    if (tableId === null) return reply.code(400).send({ ok: false, error: 'Invalid tableId', code: 'INVALID_INPUT' });
    const result = lootTables.deleteTable(tableId);
    if (typeof result === 'object' && 'error' in result) {
      return reply.code(404).send({ ok: false, error: result.error, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, tableId, deleted: true });
  });

  // POST /v1/loot-tables/:tableId/pools — add pool
  app.post('/v1/loot-tables/:tableId/pools', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const tableId = typeof params['tableId'] === 'string' ? params['tableId'] : null;
    if (tableId === null) return reply.code(400).send({ ok: false, error: 'Invalid tableId', code: 'INVALID_INPUT' });
    if (typeof body !== 'object' || body === null) {
      return reply.code(400).send({ ok: false, error: 'Body required', code: 'INVALID_INPUT' });
    }
    const b = body as Record<string, unknown>;
    if (typeof b['poolId'] !== 'string' || typeof b['name'] !== 'string' || !Array.isArray(b['entries'])) {
      return reply.code(400).send({ ok: false, error: 'poolId, name, and entries[] required', code: 'INVALID_INPUT' });
    }
    const entries: LootEntry[] = (b['entries'] as Record<string, unknown>[]).map(e => ({
      itemId: String(e['itemId'] ?? ''),
      itemName: String(e['itemName'] ?? ''),
      rarity: VALID_RARITIES.has(String(e['rarity'])) ? String(e['rarity']) as RarityTier : 'COMMON',
      weight: Number(e['weight'] ?? 1),
      minQuantity: Number(e['minQuantity'] ?? 1),
      maxQuantity: Number(e['maxQuantity'] ?? 1),
    }));
    const pool: LootPool = {
      poolId: b['poolId'],
      name: b['name'],
      entries,
      dropChance: typeof b['dropChance'] === 'number' ? b['dropChance'] : 1.0,
      minDrops: typeof b['minDrops'] === 'number' ? b['minDrops'] : 1,
      maxDrops: typeof b['maxDrops'] === 'number' ? b['maxDrops'] : 1,
    };
    const result = lootTables.addPool(tableId, pool);
    if (typeof result === 'object' && 'error' in result) {
      return reply.code(422).send({ ok: false, error: result.error, code: 'UNPROCESSABLE' });
    }
    return reply.code(201).send({ ok: true, poolId: result });
  });

  // DELETE /v1/loot-tables/:tableId/pools/:poolId
  app.delete('/v1/loot-tables/:tableId/pools/:poolId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const tableId = typeof params['tableId'] === 'string' ? params['tableId'] : null;
    const poolId = typeof params['poolId'] === 'string' ? params['poolId'] : null;
    if (tableId === null || poolId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid tableId or poolId', code: 'INVALID_INPUT' });
    }
    const result = lootTables.removePool(tableId, poolId);
    if (typeof result === 'object' && 'error' in result) {
      return reply.code(404).send({ ok: false, error: result.error, code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, poolId, removed: true });
  });

  // PATCH /v1/loot-tables/:tableId/pools/:poolId/rate
  app.patch('/v1/loot-tables/:tableId/pools/:poolId/rate', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const tableId = typeof params['tableId'] === 'string' ? params['tableId'] : null;
    const poolId = typeof params['poolId'] === 'string' ? params['poolId'] : null;
    if (tableId === null || poolId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid tableId or poolId', code: 'INVALID_INPUT' });
    }
    const rate = typeof body === 'object' && body !== null && 'rate' in body
      ? Number((body as Record<string, unknown>)['rate'])
      : NaN;
    if (isNaN(rate) || rate < 0 || rate > 1) {
      return reply.code(400).send({ ok: false, error: 'rate must be 0.0–1.0', code: 'INVALID_INPUT' });
    }
    const result = lootTables.setDropRate(tableId, poolId, rate);
    if (typeof result === 'object' && 'error' in result) {
      return reply.code(422).send({ ok: false, error: result.error, code: 'UNPROCESSABLE' });
    }
    return reply.send({ ok: true, poolId, rate });
  });

  // POST /v1/loot-tables/:tableId/roll — roll loot
  app.post('/v1/loot-tables/:tableId/roll', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const tableId = typeof params['tableId'] === 'string' ? params['tableId'] : null;
    if (tableId === null) return reply.code(400).send({ ok: false, error: 'Invalid tableId', code: 'INVALID_INPUT' });
    const seed = typeof body === 'object' && body !== null && 'seed' in body
      ? BigInt(String((body as Record<string, unknown>)['seed']))
      : undefined;
    const roll = lootTables.rollLoot(tableId, seed);
    if ('error' in roll) return reply.code(422).send({ ok: false, error: roll.error, code: 'UNPROCESSABLE' });
    return reply.send({ ok: true, roll: serializeBigInt(roll) });
  });

  // GET /v1/loot-tables/:tableId/stats
  app.get('/v1/loot-tables/:tableId/stats', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const tableId = typeof params['tableId'] === 'string' ? params['tableId'] : null;
    if (tableId === null) return reply.code(400).send({ ok: false, error: 'Invalid tableId', code: 'INVALID_INPUT' });
    const stats = lootTables.getTableStats(tableId);
    if ('error' in stats) return reply.code(404).send({ ok: false, error: stats.error, code: 'NOT_FOUND' });
    return reply.send({ ok: true, stats });
  });

  // POST /v1/loot-tables/:tableId/preview — simulate rolls
  app.post('/v1/loot-tables/:tableId/preview', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const tableId = typeof params['tableId'] === 'string' ? params['tableId'] : null;
    if (tableId === null) return reply.code(400).send({ ok: false, error: 'Invalid tableId', code: 'INVALID_INPUT' });
    const iterations = typeof body === 'object' && body !== null && 'iterations' in body
      ? Math.min(Math.max(1, Number((body as Record<string, unknown>)['iterations'])), 10000)
      : 100;
    const preview = lootTables.previewDrops(tableId, iterations);
    return reply.send({ ok: true, preview });
  });
}
