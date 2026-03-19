/**
 * Day-Night Cycle Routes — World time tracking and phase management.
 *
 * POST /v1/day-night/worlds/:worldId             — Register a world clock
 * GET  /v1/day-night/worlds                      — List all registered world clocks
 * GET  /v1/day-night/worlds/:worldId/phase       — Current day phase
 * GET  /v1/day-night/worlds/:worldId/time        — Current time of day (h/m/s)
 * GET  /v1/day-night/worlds/:worldId/lighting    — Current lighting state
 * GET  /v1/day-night/worlds/:worldId/transitions — Phase transition history
 * POST /v1/day-night/worlds/:worldId/advance     — Advance this world's clock
 * POST /v1/day-night/advance-all                 — Advance all world clocks
 *
 * timezoneOffsetHours — optional offset in hours (default 0); server converts to µs.
 *
 * Thread: silk/worlds
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { DayNightCycle } from '../../fabrics/loom-core/src/day-night-cycle.js';

const HOURS_TO_MICROS = BigInt(60 * 60 * 1_000_000);

/** Serialise bigint values to strings for JSON. */
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

export interface DayNightRoutesDeps {
  readonly dayNightCycle: DayNightCycle;
}

export function registerDayNightRoutes(app: FastifyAppLike, deps: DayNightRoutesDeps): void {
  const { dayNightCycle } = deps;

  // GET /v1/day-night/worlds — before /:worldId
  app.get('/v1/day-night/worlds', async (_req, reply) => {
    const worlds = dayNightCycle.getAllWorlds();
    return reply.send({ ok: true, worlds: serializeBigInt(worlds), total: worlds.length });
  });

  // POST /v1/day-night/advance-all — before /:worldId
  app.post('/v1/day-night/advance-all', async (_req, reply) => {
    const advanced = dayNightCycle.advanceAllClocks();
    return reply.send({ ok: true, worldsAdvanced: advanced });
  });

  // POST /v1/day-night/worlds/:worldId — register
  app.post('/v1/day-night/worlds/:worldId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;
    if (worldId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' });
    }
    const offsetHours = typeof body === 'object' && body !== null && 'timezoneOffsetHours' in body
      ? Number((body as Record<string, unknown>)['timezoneOffsetHours'])
      : 0;
    const offsetMicros = BigInt(Math.round(offsetHours)) * HOURS_TO_MICROS;
    const result = dayNightCycle.registerWorld(worldId, offsetMicros);
    if (result !== 'OK') {
      return reply.code(409).send({ ok: false, error: result, code: 'CONFLICT' });
    }
    return reply.code(201).send({ ok: true, worldId, registered: true });
  });

  // GET /v1/day-night/worlds/:worldId/phase
  app.get('/v1/day-night/worlds/:worldId/phase', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;
    if (worldId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' });
    }
    const phase = dayNightCycle.getCurrentPhase(worldId);
    if (phase === 'WORLD_NOT_FOUND') {
      return reply.code(404).send({ ok: false, error: 'World not registered', code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, worldId, phase });
  });

  // GET /v1/day-night/worlds/:worldId/time
  app.get('/v1/day-night/worlds/:worldId/time', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;
    if (worldId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' });
    }
    const time = dayNightCycle.getWorldTime(worldId);
    if (typeof time === 'string') {
      return reply.code(404).send({ ok: false, error: 'World not registered', code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, worldId, time: serializeBigInt(time) });
  });

  // GET /v1/day-night/worlds/:worldId/lighting
  app.get('/v1/day-night/worlds/:worldId/lighting', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;
    if (worldId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' });
    }
    const lighting = dayNightCycle.getLightingState(worldId);
    if (typeof lighting === 'string') {
      return reply.code(404).send({ ok: false, error: 'World not registered', code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, worldId, lighting });
  });

  // GET /v1/day-night/worlds/:worldId/transitions
  app.get('/v1/day-night/worlds/:worldId/transitions', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;
    if (worldId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' });
    }
    const history = dayNightCycle.getTransitionHistory(worldId);
    return reply.send({ ok: true, worldId, transitions: serializeBigInt(history), total: history.length });
  });

  // POST /v1/day-night/worlds/:worldId/advance
  app.post('/v1/day-night/worlds/:worldId/advance', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;
    if (worldId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' });
    }
    const result = dayNightCycle.advanceClock(worldId);
    if (result !== 'OK') {
      return reply.code(404).send({ ok: false, error: result, code: 'NOT_FOUND' });
    }
    const phase = dayNightCycle.getCurrentPhase(worldId);
    return reply.send({ ok: true, worldId, phase });
  });
}
