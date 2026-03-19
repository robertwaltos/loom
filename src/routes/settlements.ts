/**
 * Settlement Engine Routes — Founding and managing world settlements.
 *
 * POST /v1/settlements                                 — Found a new settlement
 * GET  /v1/settlements                                 — List (optional ?worldId=)
 * GET  /v1/settlements/stats                           — Aggregate stats
 * GET  /v1/settlements/:settlementId                   — Single settlement
 * POST /v1/settlements/:settlementId/tick              — Tick growth { deltaMs }
 * PATCH /v1/settlements/:settlementId/infrastructure   — Upgrade infra key
 * GET  /v1/settlements/:settlementId/trade-routes      — List trade routes
 * POST /v1/settlements/:settlementId/trade-routes      — Add trade route { toId }
 * POST /v1/settlements/:settlementId/events            — Trigger event { eventType }
 *
 * Thread: silk/worlds
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import type {
  SettlementEngine,
  SettlementEventType,
  FoundSettlementParams,
} from '../../fabrics/loom-core/src/settlement-engine.js';

const VALID_EVENT_TYPES: ReadonlySet<string> = new Set([
  'DISASTER', 'FESTIVAL', 'PLAGUE', 'PROSPERITY', 'TRADE_BOOM', 'REBELLION',
]);

const VALID_INFRA_KEYS: ReadonlySet<string> = new Set([
  'roads', 'power', 'defense', 'commerce', 'culture',
]);

export interface SettlementRoutesDeps {
  readonly settlementEngine: SettlementEngine;
}

export function registerSettlementRoutes(app: FastifyAppLike, deps: SettlementRoutesDeps): void {
  const { settlementEngine } = deps;

  // GET /v1/settlements/stats — before /:settlementId
  app.get('/v1/settlements/stats', async (_req, reply) => {
    return reply.send({ ok: true, stats: settlementEngine.getStats() });
  });

  // GET /v1/settlements — list, optional ?worldId=
  app.get('/v1/settlements', async (req, reply) => {
    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const worldId = typeof query['worldId'] === 'string' ? query['worldId'] : null;
    if (worldId === null) {
      return reply.code(400).send({ ok: false, error: 'worldId query param required', code: 'INVALID_INPUT' });
    }
    const settlements = settlementEngine.listSettlements(worldId);
    return reply.send({ ok: true, worldId, settlements, total: settlements.length });
  });

  // POST /v1/settlements — found a new settlement
  app.post('/v1/settlements', async (req, reply) => {
    const body = (req as unknown as { body: unknown }).body;
    if (typeof body !== 'object' || body === null) {
      return reply.code(400).send({ ok: false, error: 'Body required', code: 'INVALID_INPUT' });
    }
    const b = body as Record<string, unknown>;
    if (typeof b['name'] !== 'string' || typeof b['worldId'] !== 'string') {
      return reply.code(400).send({ ok: false, error: 'name and worldId required', code: 'INVALID_INPUT' });
    }
    const params: FoundSettlementParams = {
      name: b['name'],
      worldId: b['worldId'],
      x: typeof b['x'] === 'number' ? b['x'] : 0,
      y: typeof b['y'] === 'number' ? b['y'] : 0,
      biome: typeof b['biome'] === 'string' ? b['biome'] : 'GRASSLAND',
      waterAccess: typeof b['waterAccess'] === 'boolean' ? b['waterAccess'] : false,
      resourceCount: typeof b['resourceCount'] === 'number' ? b['resourceCount'] : 1,
    };
    const settlement = settlementEngine.foundSettlement(params);
    return reply.code(201).send({ ok: true, settlement });
  });

  // GET /v1/settlements/:settlementId
  app.get('/v1/settlements/:settlementId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const id = typeof params['settlementId'] === 'string' ? params['settlementId'] : null;
    if (id === null) return reply.code(400).send({ ok: false, error: 'Invalid settlementId', code: 'INVALID_INPUT' });
    const settlement = settlementEngine.getSettlement(id);
    if (settlement === undefined) return reply.code(404).send({ ok: false, error: 'Settlement not found', code: 'NOT_FOUND' });
    return reply.send({ ok: true, settlement });
  });

  // POST /v1/settlements/:settlementId/tick — tick growth
  app.post('/v1/settlements/:settlementId/tick', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const id = typeof params['settlementId'] === 'string' ? params['settlementId'] : null;
    if (id === null) return reply.code(400).send({ ok: false, error: 'Invalid settlementId', code: 'INVALID_INPUT' });
    const deltaMs = typeof body === 'object' && body !== null && 'deltaMs' in body
      ? Number((body as Record<string, unknown>)['deltaMs'])
      : 1000;
    const updated = settlementEngine.tickGrowth(id, deltaMs);
    if (updated === undefined) return reply.code(404).send({ ok: false, error: 'Settlement not found', code: 'NOT_FOUND' });
    return reply.send({ ok: true, settlement: updated });
  });

  // PATCH /v1/settlements/:settlementId/infrastructure — upgrade infra key
  app.patch('/v1/settlements/:settlementId/infrastructure', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const id = typeof params['settlementId'] === 'string' ? params['settlementId'] : null;
    if (id === null) return reply.code(400).send({ ok: false, error: 'Invalid settlementId', code: 'INVALID_INPUT' });
    const key = typeof body === 'object' && body !== null && 'key' in body
      ? (body as Record<string, unknown>)['key']
      : null;
    if (typeof key !== 'string' || !VALID_INFRA_KEYS.has(key)) {
      return reply.code(400).send({ ok: false, error: `key must be one of: ${[...VALID_INFRA_KEYS].join(', ')}`, code: 'INVALID_INPUT' });
    }
    const upgraded = settlementEngine.upgradeInfrastructure(id, key as 'roads' | 'power' | 'defense' | 'commerce' | 'culture');
    if (!upgraded) return reply.code(404).send({ ok: false, error: 'Settlement not found or upgrade failed', code: 'NOT_FOUND' });
    const settlement = settlementEngine.getSettlement(id);
    return reply.send({ ok: true, settlement });
  });

  // GET /v1/settlements/:settlementId/trade-routes
  app.get('/v1/settlements/:settlementId/trade-routes', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const id = typeof params['settlementId'] === 'string' ? params['settlementId'] : null;
    if (id === null) return reply.code(400).send({ ok: false, error: 'Invalid settlementId', code: 'INVALID_INPUT' });
    const routes = settlementEngine.getTradeRoutes(id);
    return reply.send({ ok: true, settlementId: id, routes, total: routes.length });
  });

  // POST /v1/settlements/:settlementId/trade-routes — add route { toId }
  app.post('/v1/settlements/:settlementId/trade-routes', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const fromId = typeof params['settlementId'] === 'string' ? params['settlementId'] : null;
    if (fromId === null) return reply.code(400).send({ ok: false, error: 'Invalid settlementId', code: 'INVALID_INPUT' });
    const toId = typeof body === 'object' && body !== null && 'toId' in body
      ? String((body as Record<string, unknown>)['toId'])
      : null;
    if (toId === null) return reply.code(400).send({ ok: false, error: 'toId required', code: 'INVALID_INPUT' });
    const route = settlementEngine.addTradeRoute(fromId, toId);
    if (route === undefined) return reply.code(422).send({ ok: false, error: 'Cannot add trade route (settlements not found or route exists)', code: 'UNPROCESSABLE' });
    return reply.code(201).send({ ok: true, route });
  });

  // POST /v1/settlements/:settlementId/events — trigger event { eventType }
  app.post('/v1/settlements/:settlementId/events', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const id = typeof params['settlementId'] === 'string' ? params['settlementId'] : null;
    if (id === null) return reply.code(400).send({ ok: false, error: 'Invalid settlementId', code: 'INVALID_INPUT' });
    const eventType = typeof body === 'object' && body !== null && 'eventType' in body
      ? (body as Record<string, unknown>)['eventType']
      : null;
    if (typeof eventType !== 'string' || !VALID_EVENT_TYPES.has(eventType)) {
      return reply.code(400).send({ ok: false, error: `eventType must be one of: ${[...VALID_EVENT_TYPES].join(', ')}`, code: 'INVALID_INPUT' });
    }
    const event = settlementEngine.triggerEvent(id, eventType as SettlementEventType);
    if (event === undefined) return reply.code(404).send({ ok: false, error: 'Settlement not found', code: 'NOT_FOUND' });
    return reply.send({ ok: true, event });
  });
}
