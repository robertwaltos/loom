/**
 * World Event Scheduler Routes — Timed world event orchestration.
 *
 * POST /v1/world-events                    — Schedule an event { name, fireAtMs, recurrence?, intervalMs? }
 * GET  /v1/world-events/pending            — List pending events
 * GET  /v1/world-events/stats              — Scheduler stats
 * POST /v1/world-events/tick               — Fire all due events now
 * GET  /v1/world-events/:eventId           — Single event
 * DELETE /v1/world-events/:eventId         — Cancel event
 *
 * fireAtMs — wall-clock unix epoch ms to fire at; server converts to µs.
 * intervalMs — recurrence interval in ms (only for recurring events).
 *
 * Thread: silk/worlds
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { WorldEventScheduler, ScheduleEventParams } from '../../fabrics/loom-core/src/world-event-scheduler.js';

export interface WorldEventRoutesDeps {
  readonly worldEventScheduler: WorldEventScheduler;
}

export function registerWorldEventRoutes(app: FastifyAppLike, deps: WorldEventRoutesDeps): void {
  const { worldEventScheduler } = deps;

  // GET /v1/world-events/pending — before /:eventId
  app.get('/v1/world-events/pending', async (_req, reply) => {
    const events = worldEventScheduler.listPending();
    return reply.send({ ok: true, events, total: events.length });
  });

  // GET /v1/world-events/stats — before /:eventId
  app.get('/v1/world-events/stats', async (_req, reply) => {
    return reply.send({ ok: true, stats: worldEventScheduler.getStats() });
  });

  // POST /v1/world-events/tick — before /:eventId
  app.post('/v1/world-events/tick', async (_req, reply) => {
    const result = worldEventScheduler.tick();
    return reply.send({ ok: true, result });
  });

  // POST /v1/world-events — schedule event
  app.post('/v1/world-events', async (req, reply) => {
    const body = (req as unknown as { body: unknown }).body;
    if (typeof body !== 'object' || body === null) {
      return reply.code(400).send({ ok: false, error: 'Body required', code: 'INVALID_INPUT' });
    }
    const b = body as Record<string, unknown>;
    if (typeof b['name'] !== 'string' || typeof b['fireAtMs'] !== 'number') {
      return reply.code(400).send({ ok: false, error: 'name (string) and fireAtMs (number) required', code: 'INVALID_INPUT' });
    }
    const recurrence = b['recurrence'] === 'recurring' ? 'recurring' : 'once';
    const intervalMs = typeof b['intervalMs'] === 'number' ? b['intervalMs'] : 0;

    const params: ScheduleEventParams = {
      name: b['name'],
      fireAt: b['fireAtMs'] * 1000,  // ms → µs
      ...(recurrence === 'recurring' ? { recurrence, intervalUs: intervalMs * 1000 } : { recurrence }),
    };

    const eventId = worldEventScheduler.schedule(params, (evt) => {
      // callbacks fire during tick; no HTTP action required
      void evt;
    });
    const event = worldEventScheduler.getEvent(eventId);
    return reply.code(201).send({ ok: true, eventId, event });
  });

  // GET /v1/world-events/:eventId
  app.get('/v1/world-events/:eventId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const eventId = typeof params['eventId'] === 'string' ? params['eventId'] : null;
    if (eventId === null) return reply.code(400).send({ ok: false, error: 'Invalid eventId', code: 'INVALID_INPUT' });
    const event = worldEventScheduler.getEvent(eventId);
    if (event === undefined) return reply.code(404).send({ ok: false, error: 'Event not found', code: 'NOT_FOUND' });
    return reply.send({ ok: true, event });
  });

  // DELETE /v1/world-events/:eventId — cancel
  app.delete('/v1/world-events/:eventId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const eventId = typeof params['eventId'] === 'string' ? params['eventId'] : null;
    if (eventId === null) return reply.code(400).send({ ok: false, error: 'Invalid eventId', code: 'INVALID_INPUT' });
    const cancelled = worldEventScheduler.cancel(eventId);
    if (!cancelled) return reply.code(404).send({ ok: false, error: 'Event not found or already fired', code: 'NOT_FOUND' });
    return reply.send({ ok: true, eventId, cancelled: true });
  });
}
