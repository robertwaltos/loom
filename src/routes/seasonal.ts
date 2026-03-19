/**
 * Seasonal Content Routes — Real-calendar events + daily rhythm.
 *
 * GET /v1/seasonal/calendar           — Current month/hour/time-of-day state
 * GET /v1/seasonal/monthly-events     — All 12 monthly events
 * GET /v1/seasonal/time-of-day        — Compute time-of-day for a given UTC hour
 * GET /v1/worlds/:worldId/seasonal    — Is this world affected + time-locked content
 * GET /v1/seasonal/time-locked        — All 6 time-locked content definitions
 *
 * Thread: silk/seasonal
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { SeasonalContentPort, Month } from '../../fabrics/loom-core/src/seasonal-content.js';

export interface SeasonalRoutesDeps {
  readonly seasonal: SeasonalContentPort;
}

export function registerSeasonalRoutes(app: FastifyAppLike, deps: SeasonalRoutesDeps): void {
  const { seasonal } = deps;

  // GET /v1/seasonal/calendar — current calendar state (month, hour, time-of-day, active event)
  app.get('/v1/seasonal/calendar', async (_req, reply) => {
    const state = seasonal.computeCalendarState(Date.now());
    return reply.send({ ok: true, calendar: state });
  });

  // GET /v1/seasonal/monthly-events — all 12 monthly events
  app.get('/v1/seasonal/monthly-events', async (_req, reply) => {
    const events = seasonal.getMonthlyEvents();
    return reply.send({ ok: true, events, total: events.length });
  });

  // GET /v1/seasonal/time-of-day?hour=N — time-of-day for a UTC hour (0-23), defaults to now
  app.get('/v1/seasonal/time-of-day', async (req, reply) => {
    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const rawHour = query['hour'];
    let hour: number;
    if (rawHour !== undefined) {
      hour = parseInt(String(rawHour), 10);
      if (isNaN(hour) || hour < 0 || hour > 23) {
        return reply.code(400).send({ ok: false, error: 'hour must be 0-23', code: 'INVALID_INPUT' });
      }
    } else {
      hour = new Date().getUTCHours();
    }
    const timeOfDay = seasonal.computeTimeOfDay(hour);
    return reply.send({ ok: true, hour, timeOfDay });
  });

  // GET /v1/seasonal/time-locked — all time-locked content definitions
  app.get('/v1/seasonal/time-locked', async (_req, reply) => {
    const items = seasonal.getAllTimeLockedContent();
    return reply.send({ ok: true, items, total: items.length });
  });

  // GET /v1/worlds/:worldId/seasonal — seasonal state for a specific world
  app.get('/v1/worlds/:worldId/seasonal', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;
    if (worldId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' });
    }
    const state = seasonal.computeCalendarState(Date.now());
    const affected = seasonal.isWorldAffected(worldId, state.currentMonth as Month);
    const timeLocked = seasonal.getTimeLockedContent(worldId, state.timeOfDay);
    const activeEvent = state.activeEvents[0] ?? null;
    return reply.send({
      ok: true,
      worldId,
      currentMonth: state.currentMonth,
      timeOfDay: state.timeOfDay,
      isAffectedThisMonth: affected,
      activeEvent: affected ? activeEvent : null,
      timeLockedContent: timeLocked,
    });
  });
}
