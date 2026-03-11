import { describe, it, expect, beforeEach } from 'vitest';
import type { WebhookDispatcherState, Clock, IdGenerator, Logger } from '../webhook-dispatcher.js';
import {
  createWebhookDispatcherState,
  registerWebhook,
  pauseWebhook,
  resumeWebhook,
  dispatchEvent,
  recordDeliveryResult,
  getWebhook,
  getDeliveryHistory,
  getStats,
} from '../webhook-dispatcher.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function makeClock(): Clock {
  let time = 1_000_000n;
  return {
    now: () => {
      time = time + 1000n;
      return time;
    },
  };
}

function makeIdGen(): IdGenerator {
  let n = 0;
  return {
    generate: () => {
      n = n + 1;
      return 'wh-' + String(n);
    },
  };
}

function makeLogger(): Logger {
  return { info: () => undefined, error: () => undefined };
}

// ============================================================================
// TESTS: REGISTRATION
// ============================================================================

describe('WebhookDispatcher - Registration', () => {
  let state: WebhookDispatcherState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createWebhookDispatcherState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
  });

  it('rejects invalid URL (no scheme)', () => {
    const result = registerWebhook(
      state,
      'example.com/hook',
      ['event.created'],
      idGen,
      clock,
      logger,
    );
    expect(result).toBe('invalid-url');
  });

  it('accepts http:// URLs', () => {
    const result = registerWebhook(
      state,
      'http://example.com/hook',
      ['event.created'],
      idGen,
      clock,
      logger,
    );
    expect(typeof result).toBe('object');
  });

  it('accepts https:// URLs', () => {
    const result = registerWebhook(
      state,
      'https://example.com/hook',
      ['event.created'],
      idGen,
      clock,
      logger,
    );
    expect(typeof result).toBe('object');
  });

  it('creates webhook with ACTIVE status', () => {
    const wh = registerWebhook(state, 'https://a.com/hook', ['x'], idGen, clock, logger);
    if (typeof wh !== 'object') throw new Error('expected webhook');
    expect(wh.status).toBe('ACTIVE');
    expect(wh.deliveryCount).toBe(0);
    expect(wh.failureCount).toBe(0);
    expect(wh.lastDeliveredAt).toBeNull();
  });

  it('getWebhook returns undefined for unknown id', () => {
    expect(getWebhook(state, 'ghost')).toBeUndefined();
  });

  it('pauseWebhook returns error for unknown id', () => {
    const r = pauseWebhook(state, 'ghost');
    expect(r).toEqual({ success: false, error: 'webhook-not-found' });
  });
});

describe('WebhookDispatcher - Pause and Resume', () => {
  let state: WebhookDispatcherState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createWebhookDispatcherState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
  });

  it('pauseWebhook sets status to PAUSED', () => {
    const wh = registerWebhook(state, 'https://a.com/hook', ['x'], idGen, clock, logger);
    if (typeof wh !== 'object') throw new Error();
    pauseWebhook(state, wh.webhookId);
    expect(getWebhook(state, wh.webhookId)?.status).toBe('PAUSED');
  });

  it('resumeWebhook restores status to ACTIVE', () => {
    const wh = registerWebhook(state, 'https://a.com/hook', ['x'], idGen, clock, logger);
    if (typeof wh !== 'object') throw new Error();
    pauseWebhook(state, wh.webhookId);
    resumeWebhook(state, wh.webhookId);
    expect(getWebhook(state, wh.webhookId)?.status).toBe('ACTIVE');
  });
});

// ============================================================================
// TESTS: DISPATCH
// ============================================================================

describe('WebhookDispatcher - Dispatch', () => {
  let state: WebhookDispatcherState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createWebhookDispatcherState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
  });

  it('dispatches to matching ACTIVE webhooks only', () => {
    registerWebhook(state, 'https://a.com', ['player.joined'], idGen, clock, logger);
    registerWebhook(state, 'https://b.com', ['world.updated'], idGen, clock, logger);
    const deliveries = dispatchEvent(
      state,
      'player.joined',
      { name: 'Kira' },
      idGen,
      clock,
      logger,
    );
    expect(deliveries.length).toBe(1);
    expect(deliveries[0]?.eventType).toBe('player.joined');
  });

  it('skips PAUSED webhooks during dispatch', () => {
    const wh = registerWebhook(state, 'https://a.com', ['e'], idGen, clock, logger);
    if (typeof wh !== 'object') throw new Error();
    pauseWebhook(state, wh.webhookId);
    const deliveries = dispatchEvent(state, 'e', { v: 1 }, idGen, clock, logger);
    expect(deliveries.length).toBe(0);
  });

  it('increments webhook deliveryCount per dispatch', () => {
    const wh = registerWebhook(state, 'https://a.com', ['e'], idGen, clock, logger);
    if (typeof wh !== 'object') throw new Error();
    dispatchEvent(state, 'e', { v: 1 }, idGen, clock, logger);
    dispatchEvent(state, 'e', { v: 2 }, idGen, clock, logger);
    expect(getWebhook(state, wh.webhookId)?.deliveryCount).toBe(2);
  });

  it('creates deliveries with success=false initially', () => {
    registerWebhook(state, 'https://a.com', ['e'], idGen, clock, logger);
    const deliveries = dispatchEvent(state, 'e', { x: 1 }, idGen, clock, logger);
    expect(deliveries[0]?.success).toBe(false);
  });
});

// ============================================================================
// TESTS: DELIVERY RESULTS & FAILURE THRESHOLD
// ============================================================================

describe('WebhookDispatcher - Delivery Results', () => {
  let state: WebhookDispatcherState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createWebhookDispatcherState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
  });

  it('recordDeliveryResult updates lastDeliveredAt on success', () => {
    const wh = registerWebhook(state, 'https://a.com', ['e'], idGen, clock, logger);
    if (typeof wh !== 'object') throw new Error();
    const deliveries = dispatchEvent(state, 'e', { v: 1 }, idGen, clock, logger);
    const firstDelivery = deliveries[0];
    if (firstDelivery === undefined) throw new Error('expected delivery');
    recordDeliveryResult(state, firstDelivery.deliveryId, true, clock);
    expect(getWebhook(state, wh.webhookId)?.lastDeliveredAt).not.toBeNull();
  });

  it('webhook moves to FAILED after 5 failures', () => {
    const wh = registerWebhook(state, 'https://a.com', ['e'], idGen, clock, logger);
    if (typeof wh !== 'object') throw new Error();
    for (let i = 0; i < 5; i++) {
      const ds = dispatchEvent(state, 'e', { v: i }, idGen, clock, logger);
      const first = ds[0];
      if (first === undefined) throw new Error('expected delivery');
      recordDeliveryResult(state, first.deliveryId, false, clock);
    }
    expect(getWebhook(state, wh.webhookId)?.status).toBe('FAILED');
  });

  it('getDeliveryHistory respects limit', () => {
    const wh = registerWebhook(state, 'https://a.com', ['e'], idGen, clock, logger);
    if (typeof wh !== 'object') throw new Error();
    dispatchEvent(state, 'e', { v: 1 }, idGen, clock, logger);
    dispatchEvent(state, 'e', { v: 2 }, idGen, clock, logger);
    dispatchEvent(state, 'e', { v: 3 }, idGen, clock, logger);
    const history = getDeliveryHistory(state, wh.webhookId, 2);
    expect(history.length).toBe(2);
  });

  it('getStats successRate is 0 when no deliveries', () => {
    expect(getStats(state).successRate).toBe(0);
  });

  it('getStats successRate calculates correctly', () => {
    const wh = registerWebhook(state, 'https://a.com', ['e'], idGen, clock, logger);
    if (typeof wh !== 'object') throw new Error();
    const d1 = dispatchEvent(state, 'e', { v: 1 }, idGen, clock, logger);
    const d2 = dispatchEvent(state, 'e', { v: 2 }, idGen, clock, logger);
    const del1 = d1[0];
    const del2 = d2[0];
    if (del1 === undefined || del2 === undefined) throw new Error('expected deliveries');
    recordDeliveryResult(state, del1.deliveryId, true, clock);
    recordDeliveryResult(state, del2.deliveryId, false, clock);
    expect(getStats(state).successRate).toBe(0.5);
  });

  it('recordDeliveryResult returns error for unknown delivery', () => {
    const r = recordDeliveryResult(state, 'ghost', true, clock);
    expect(r).toEqual({ success: false, error: 'webhook-not-found' });
  });
});
