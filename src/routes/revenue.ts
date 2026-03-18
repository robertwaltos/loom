/**
 * Revenue Routes — Epic Royalty Tracking
 *
 * Records revenue events and computes UE5 Epic royalty obligations.
 * Admin-facing; internal tooling only (not exposed to game clients).
 *
 * UE5 Royalty: $0 on first $1M lifetime, then 5% (3.5% w/ Epic Store).
 */

import type { FastifyAppLike } from '@loom/selvage';
import {
  createRevenueEngine,
  type RevenueEngineDeps,
} from '../../universe/revenue/engine.js';
import type { PgRevenueRepository } from '../../universe/revenue/pg-repository.js';
import type { RevenueEvent } from '../../universe/revenue/types.js';

// ─── Deps ──────────────────────────────────────────────────────────

export interface RevenueRoutesDeps {
  readonly generateId: () => string;
  readonly now: () => number;
  readonly log: (level: 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) => void;
  readonly pgRepo: PgRevenueRepository;
}

// ─── Route Registration ────────────────────────────────────────────

export function registerRevenueRoutes(
  app: FastifyAppLike,
  deps: RevenueRoutesDeps,
): void {
  const engineDeps: RevenueEngineDeps = {
    generateId: deps.generateId,
    now: deps.now,
  };

  const engine = createRevenueEngine(engineDeps);

  // POST /v1/revenue/events
  // Body: { eventType, grossAmountUsd, netAmountUsd, platform, paymentProcessor, userId, transactionId }
  app.post('/v1/revenue/events', async (req, reply) => {
    const body = (req as unknown as { body: Record<string, unknown> }).body ?? {};

    const eventType = body['eventType'];
    const grossAmountUsd = body['grossAmountUsd'];
    const netAmountUsd = body['netAmountUsd'];
    const platform = body['platform'];
    const paymentProcessor = body['paymentProcessor'];
    const userId = body['userId'];
    const transactionId = body['transactionId'];

    const VALID_EVENT_TYPES = new Set(['subscription', 'iap', 'other']);
    const VALID_PLATFORMS = new Set(['ios', 'android', 'epic', 'console', 'web']);
    const VALID_PROCESSORS = new Set(['apple', 'google', 'stripe', 'epic', 'other']);

    if (typeof eventType !== 'string' || !VALID_EVENT_TYPES.has(eventType)) {
      return reply.status(422).send({ ok: false, error: 'eventType must be subscription|iap|other' });
    }
    if (typeof grossAmountUsd !== 'number' || grossAmountUsd < 0) {
      return reply.status(422).send({ ok: false, error: 'grossAmountUsd must be a non-negative number' });
    }
    if (typeof netAmountUsd !== 'number' || netAmountUsd < 0) {
      return reply.status(422).send({ ok: false, error: 'netAmountUsd must be a non-negative number' });
    }
    if (typeof platform !== 'string' || !VALID_PLATFORMS.has(platform)) {
      return reply.status(422).send({ ok: false, error: 'platform must be ios|android|epic|console|web' });
    }
    if (typeof paymentProcessor !== 'string' || !VALID_PROCESSORS.has(paymentProcessor)) {
      return reply.status(422).send({ ok: false, error: 'paymentProcessor must be apple|google|stripe|epic|other' });
    }
    if (typeof userId !== 'string' || userId.length === 0) {
      return reply.status(422).send({ ok: false, error: 'userId is required' });
    }
    if (typeof transactionId !== 'string' || transactionId.length === 0) {
      return reply.status(422).send({ ok: false, error: 'transactionId is required' });
    }

    const event = engine.recordEvent({
      eventType: eventType as RevenueEvent['eventType'],
      grossAmountUsd,
      netAmountUsd,
      platform: platform as RevenueEvent['platform'],
      paymentProcessor: paymentProcessor as RevenueEvent['paymentProcessor'],
      userId,
      transactionId,
    });

    try {
      await deps.pgRepo.saveEvent(event);
    } catch (err) {
      deps.log('warn', 'revenue:persist_failed', { transactionId, error: String(err) });
    }

    deps.log('info', 'revenue:event_recorded', {
      id: event.id,
      eventType: event.eventType,
      grossAmountUsd: event.grossAmountUsd,
      platform: event.platform,
    });

    return reply.status(201).send({ ok: true, event });
  });

  // GET /v1/revenue/stats
  app.get('/v1/revenue/stats', (_req, reply) => {
    const stats = engine.getStats();
    return reply.send({ ok: true, stats });
  });

  // GET /v1/revenue/quarter/:quarter
  // e.g. /v1/revenue/quarter/2027-Q2
  app.get('/v1/revenue/quarter/:quarter', (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const quarter = typeof params['quarter'] === 'string' ? params['quarter'] : null;

    if (quarter === null || !/^\d{4}-Q[1-4]$/.test(quarter)) {
      return reply.status(422).send({ ok: false, error: 'quarter must match YYYY-Q[1-4]' });
    }

    const events = engine.getEventsForQuarter(quarter);
    return reply.send({ ok: true, quarter, eventCount: events.length, events });
  });

  // POST /v1/revenue/quarter/:quarter/ledger
  // Computes and persists a royalty ledger snapshot for the given quarter.
  app.post('/v1/revenue/quarter/:quarter/ledger', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const quarter = typeof params['quarter'] === 'string' ? params['quarter'] : null;

    if (quarter === null || !/^\d{4}-Q[1-4]$/.test(quarter)) {
      return reply.status(422).send({ ok: false, error: 'quarter must match YYYY-Q[1-4]' });
    }

    const ledger = engine.computeQuarterlyLedger(quarter);

    try {
      await deps.pgRepo.saveLedger(ledger);
    } catch (err) {
      deps.log('warn', 'revenue:ledger_persist_failed', { quarter, error: String(err) });
    }

    deps.log('info', 'revenue:ledger_computed', {
      quarter,
      royaltyOwed: ledger.royaltyOwed,
      paymentStatus: ledger.paymentStatus,
    });

    return reply.status(201).send({ ok: true, ledger });
  });
}
