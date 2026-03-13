import { describe, it, expect } from 'vitest';
import {
  createWebhookDispatcherState,
  registerWebhook,
  dispatchEvent,
  pauseWebhook,
  resumeWebhook,
  recordDeliveryResult,
  getWebhook,
  getDeliveryHistory,
  getStats,
} from '../webhook-dispatcher.js';

let idSeq = 0;
function makeState() {
  idSeq = 0;
  const state = createWebhookDispatcherState();
  const idGen = { generate: () => `wh-${++idSeq}` };
  const clock = { now: () => BigInt(Date.now()) * 1_000n };
  const logger = { info: () => {}, warn: () => {} };
  return { state, idGen, clock, logger };
}

describe('Webhook Dispatcher Simulation', () => {
  it('registers webhooks and dispatches matching events', () => {
    const { state, idGen, clock, logger } = makeState();

    const wh = registerWebhook(state, 'https://example.com/hooks', ['player.joined', 'player.left'], idGen, clock, logger);
    expect(wh).not.toBe('invalid-url');
    const webhookId = (wh as { webhookId: string }).webhookId;

    const deliveries = dispatchEvent(state, 'player.joined', { playerId: 'p1' }, idGen, clock, logger);
    expect((deliveries as unknown[]).length).toBeGreaterThanOrEqual(1);

    const history = getDeliveryHistory(state, webhookId, 100);
    expect(history.length).toBeGreaterThanOrEqual(1);
  });

  it('does not dispatch to webhooks not subscribed to the event', () => {
    const { state, idGen, clock, logger } = makeState();

    const wh = registerWebhook(state, 'https://example.com/chat', ['chat.message'], idGen, clock, logger) as { webhookId: string };
    const deliveries = dispatchEvent(state, 'player.joined', { playerId: 'p2' }, idGen, clock, logger);
    expect((deliveries as unknown[]).length).toBe(0);
  });

  it('pauses and resumes webhooks', () => {
    const { state, idGen, clock, logger } = makeState();

    const wh = registerWebhook(state, 'https://example.com/pause', ['world.event'], idGen, clock, logger) as { webhookId: string };
    pauseWebhook(state, wh.webhookId);

    const paused = dispatchEvent(state, 'world.event', {}, idGen, clock, logger);
    expect((paused as unknown[]).length).toBe(0);

    resumeWebhook(state, wh.webhookId);
    const resumed = dispatchEvent(state, 'world.event', {}, idGen, clock, logger);
    expect((resumed as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  it('records delivery results', () => {
    const { state, idGen, clock, logger } = makeState();

    const wh = registerWebhook(state, 'https://example.com/result', ['ping'], idGen, clock, logger) as { webhookId: string };
    dispatchEvent(state, 'ping', {}, idGen, clock, logger);

    const history = getDeliveryHistory(state, wh.webhookId, 100);
    const deliveryId = history[0]?.deliveryId;
    expect(deliveryId).toBeDefined();

    recordDeliveryResult(state, deliveryId!, true, clock);
    const updated = getDeliveryHistory(state, wh.webhookId, 100);
    expect(updated[0]?.success).toBe(true);
  });

  it('rejects invalid URLs', () => {
    const { state, idGen, clock, logger } = makeState();
    const result = registerWebhook(state, 'not-a-url', ['event'], idGen, clock, logger);
    expect(result).toBe('invalid-url');
  });

  it('tracks stats', () => {
    const { state, idGen, clock, logger } = makeState();
    registerWebhook(state, 'https://example.com/stat', ['stat.event'], idGen, clock, logger);
    dispatchEvent(state, 'stat.event', {}, idGen, clock, logger);
    const stats = getStats(state);
    expect(stats.totalWebhooks).toBeGreaterThanOrEqual(1);
  });
});
