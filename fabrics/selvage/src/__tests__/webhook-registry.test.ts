import { describe, it, expect, beforeEach } from 'vitest';
import { createWebhookRegistry, DEFAULT_WEBHOOK_CONFIG } from '../webhook-registry.js';
import type { WebhookRegistryDeps } from '../webhook-registry.js';

function createDeps(startTime = 0): {
  deps: WebhookRegistryDeps;
  advance: (micro: number) => void;
} {
  let time = startTime;
  let idCounter = 0;
  return {
    deps: {
      clock: { nowMicroseconds: () => time },
      idGenerator: {
        generate: () => {
          idCounter += 1;
          return 'wh-' + String(idCounter);
        },
      },
      log: { info: () => {}, warn: () => {} },
    },
    advance: (micro: number) => {
      time += micro;
    },
  };
}

describe('WebhookRegistry — subscriptions', () => {
  it('subscribes to events', () => {
    const { deps } = createDeps();
    const reg = createWebhookRegistry(deps);
    const sub = reg.subscribe({
      url: 'https://example.com/hook',
      eventTypes: ['player.joined'],
      secret: 'sec123',
    });
    expect(sub.id).toBe('wh-1');
    expect(sub.url).toBe('https://example.com/hook');
    expect(sub.active).toBe(true);
  });

  it('retrieves a subscription by id', () => {
    const { deps } = createDeps();
    const reg = createWebhookRegistry(deps);
    const sub = reg.subscribe({
      url: 'https://example.com/hook',
      eventTypes: ['player.joined'],
      secret: 'sec',
    });
    const found = reg.getSubscription(sub.id);
    expect(found).toBeDefined();
    expect(found?.url).toBe('https://example.com/hook');
  });

  it('returns undefined for unknown subscription', () => {
    const { deps } = createDeps();
    const reg = createWebhookRegistry(deps);
    expect(reg.getSubscription('nope')).toBeUndefined();
  });

  it('unsubscribes by marking inactive', () => {
    const { deps } = createDeps();
    const reg = createWebhookRegistry(deps);
    const sub = reg.subscribe({
      url: 'https://example.com/hook',
      eventTypes: ['player.joined'],
      secret: 'sec',
    });
    expect(reg.unsubscribe(sub.id)).toBe(true);
    expect(reg.getSubscription(sub.id)?.active).toBe(false);
  });

  it('returns false unsubscribing unknown id', () => {
    const { deps } = createDeps();
    const reg = createWebhookRegistry(deps);
    expect(reg.unsubscribe('nope')).toBe(false);
  });

  it('lists all subscriptions', () => {
    const { deps } = createDeps();
    const reg = createWebhookRegistry(deps);
    reg.subscribe({ url: 'https://a.com', eventTypes: ['e1'], secret: 's1' });
    reg.subscribe({ url: 'https://b.com', eventTypes: ['e2'], secret: 's2' });
    expect(reg.listSubscriptions()).toHaveLength(2);
  });

  it('lists subscriptions by event type', () => {
    const { deps } = createDeps();
    const reg = createWebhookRegistry(deps);
    reg.subscribe({ url: 'https://a.com', eventTypes: ['e1', 'e2'], secret: 's1' });
    reg.subscribe({ url: 'https://b.com', eventTypes: ['e2'], secret: 's2' });
    reg.subscribe({ url: 'https://c.com', eventTypes: ['e3'], secret: 's3' });
    const matches = reg.listByEventType('e2');
    expect(matches).toHaveLength(2);
  });

  it('excludes inactive subscriptions from event type listing', () => {
    const { deps } = createDeps();
    const reg = createWebhookRegistry(deps);
    const sub = reg.subscribe({ url: 'https://a.com', eventTypes: ['e1'], secret: 's1' });
    reg.unsubscribe(sub.id);
    expect(reg.listByEventType('e1')).toHaveLength(0);
  });
});

describe('WebhookRegistry — delivery', () => {
  it('enqueues a delivery as pending', () => {
    const { deps } = createDeps();
    const reg = createWebhookRegistry(deps);
    const sub = reg.subscribe({ url: 'https://a.com', eventTypes: ['e1'], secret: 's' });
    const delivery = reg.enqueueDelivery({
      subscriptionId: sub.id,
      eventType: 'e1',
      payload: { data: 'test' },
    });
    expect(delivery.status).toBe('pending');
    expect(delivery.attempts).toHaveLength(0);
  });

  it('retrieves a delivery by id', () => {
    const { deps } = createDeps();
    const reg = createWebhookRegistry(deps);
    const sub = reg.subscribe({ url: 'https://a.com', eventTypes: ['e1'], secret: 's' });
    const delivery = reg.enqueueDelivery({
      subscriptionId: sub.id,
      eventType: 'e1',
      payload: {},
    });
    expect(reg.getDelivery(delivery.id)).toBeDefined();
  });

  it('returns undefined for unknown delivery', () => {
    const { deps } = createDeps();
    const reg = createWebhookRegistry(deps);
    expect(reg.getDelivery('nope')).toBeUndefined();
  });

  it('lists pending deliveries', () => {
    const { deps } = createDeps();
    const reg = createWebhookRegistry(deps);
    const sub = reg.subscribe({ url: 'https://a.com', eventTypes: ['e1'], secret: 's' });
    reg.enqueueDelivery({ subscriptionId: sub.id, eventType: 'e1', payload: {} });
    reg.enqueueDelivery({ subscriptionId: sub.id, eventType: 'e1', payload: {} });
    expect(reg.getPendingDeliveries()).toHaveLength(2);
  });
});

describe('WebhookRegistry — delivery attempts', () => {
  it('marks delivery as delivered on success', () => {
    const { deps } = createDeps();
    const reg = createWebhookRegistry(deps);
    const sub = reg.subscribe({ url: 'https://a.com', eventTypes: ['e1'], secret: 's' });
    const delivery = reg.enqueueDelivery({
      subscriptionId: sub.id,
      eventType: 'e1',
      payload: {},
    });
    const result = reg.recordAttempt({
      deliveryId: delivery.id,
      success: true,
      statusCode: 200,
    });
    expect(result?.status).toBe('delivered');
    expect(result?.attempts).toHaveLength(1);
  });

  it('marks delivery as failed with retry on first failure', () => {
    const { deps } = createDeps(1000);
    const reg = createWebhookRegistry(deps);
    const sub = reg.subscribe({ url: 'https://a.com', eventTypes: ['e1'], secret: 's' });
    const delivery = reg.enqueueDelivery({
      subscriptionId: sub.id,
      eventType: 'e1',
      payload: {},
    });
    const result = reg.recordAttempt({
      deliveryId: delivery.id,
      success: false,
      statusCode: 500,
    });
    expect(result?.status).toBe('failed');
    expect(result?.nextRetryAt).toBeDefined();
    expect(result?.nextRetryAt).toBeGreaterThan(1000);
  });

  it('returns undefined for unknown delivery attempt', () => {
    const { deps } = createDeps();
    const reg = createWebhookRegistry(deps);
    expect(
      reg.recordAttempt({ deliveryId: 'nope', success: true, statusCode: 200 }),
    ).toBeUndefined();
  });

  it('uses exponential backoff for retry delays', () => {
    const { deps, advance } = createDeps(0);
    const config = { maxRetries: 5, baseRetryDelayMicro: 1000, maxRetryDelayMicro: 100_000 };
    const reg = createWebhookRegistry(deps, config);
    const sub = reg.subscribe({ url: 'https://a.com', eventTypes: ['e1'], secret: 's' });
    const delivery = reg.enqueueDelivery({
      subscriptionId: sub.id,
      eventType: 'e1',
      payload: {},
    });

    // First failure: delay = 1000 * 2^0 = 1000
    const r1 = reg.recordAttempt({ deliveryId: delivery.id, success: false, statusCode: 500 });
    expect(r1?.nextRetryAt).toBe(1000);

    advance(1000);

    // Second failure: delay = 1000 * 2^1 = 2000
    const r2 = reg.recordAttempt({ deliveryId: delivery.id, success: false, statusCode: 500 });
    expect(r2?.nextRetryAt).toBe(3000);
  });

  it('caps retry delay at maxRetryDelayMicro', () => {
    const { deps } = createDeps(0);
    const config = { maxRetries: 10, baseRetryDelayMicro: 1000, maxRetryDelayMicro: 5000 };
    const reg = createWebhookRegistry(deps, config);
    const sub = reg.subscribe({ url: 'https://a.com', eventTypes: ['e1'], secret: 's' });
    const delivery = reg.enqueueDelivery({
      subscriptionId: sub.id,
      eventType: 'e1',
      payload: {},
    });

    // Fail several times to exceed max delay
    reg.recordAttempt({ deliveryId: delivery.id, success: false, statusCode: 500 });
    reg.recordAttempt({ deliveryId: delivery.id, success: false, statusCode: 500 });
    reg.recordAttempt({ deliveryId: delivery.id, success: false, statusCode: 500 });
    const r = reg.recordAttempt({ deliveryId: delivery.id, success: false, statusCode: 500 });
    // delay = 1000 * 2^3 = 8000, capped at 5000
    expect(r?.nextRetryAt).toBe(5000);
  });
});

describe('WebhookRegistry — dead letter queue', () => {
  it('moves to dead letter after max retries', () => {
    const { deps } = createDeps();
    const config = { maxRetries: 2, baseRetryDelayMicro: 1000, maxRetryDelayMicro: 10_000 };
    const reg = createWebhookRegistry(deps, config);
    const sub = reg.subscribe({ url: 'https://a.com', eventTypes: ['e1'], secret: 's' });
    const delivery = reg.enqueueDelivery({
      subscriptionId: sub.id,
      eventType: 'e1',
      payload: { data: 'important' },
    });

    reg.recordAttempt({ deliveryId: delivery.id, success: false, statusCode: 500 });
    const result = reg.recordAttempt({ deliveryId: delivery.id, success: false, statusCode: 500 });
    expect(result?.status).toBe('dead_letter');
    expect(result?.nextRetryAt).toBeUndefined();
  });

  it('dead letter queue contains failed deliveries', () => {
    const { deps } = createDeps();
    const config = { maxRetries: 1, baseRetryDelayMicro: 1000, maxRetryDelayMicro: 10_000 };
    const reg = createWebhookRegistry(deps, config);
    const sub = reg.subscribe({ url: 'https://a.com', eventTypes: ['e1'], secret: 's' });
    const delivery = reg.enqueueDelivery({
      subscriptionId: sub.id,
      eventType: 'e1',
      payload: { data: 'lost' },
    });

    reg.recordAttempt({ deliveryId: delivery.id, success: false, statusCode: 500 });
    const dlq = reg.getDeadLetterQueue();
    expect(dlq).toHaveLength(1);
    expect(dlq[0]?.deliveryId).toBe(delivery.id);
    expect(dlq[0]?.totalAttempts).toBe(1);
  });
});

describe('WebhookRegistry — retryable deliveries', () => {
  it('returns failed deliveries past retry time', () => {
    const { deps, advance } = createDeps(0);
    const config = { maxRetries: 5, baseRetryDelayMicro: 1000, maxRetryDelayMicro: 10_000 };
    const reg = createWebhookRegistry(deps, config);
    const sub = reg.subscribe({ url: 'https://a.com', eventTypes: ['e1'], secret: 's' });
    const delivery = reg.enqueueDelivery({
      subscriptionId: sub.id,
      eventType: 'e1',
      payload: {},
    });
    reg.recordAttempt({ deliveryId: delivery.id, success: false, statusCode: 500 });

    // Before retry time
    expect(reg.getRetryableDeliveries()).toHaveLength(0);

    // After retry time
    advance(2000);
    expect(reg.getRetryableDeliveries()).toHaveLength(1);
  });
});

describe('WebhookRegistry — signature generation', () => {
  it('generates a signature for a subscription', () => {
    const { deps } = createDeps(5000);
    const reg = createWebhookRegistry(deps);
    const sub = reg.subscribe({ url: 'https://a.com', eventTypes: ['e1'], secret: 'mysecret' });
    const sig = reg.generateSignature(sub.id, '{"data":"test"}');
    expect(sig).toBeDefined();
    expect(sig?.header).toBe('X-Webhook-Signature');
    expect(sig?.signature).toContain('sha256=');
    expect(sig?.timestamp).toBe(5000);
  });

  it('returns undefined for unknown subscription', () => {
    const { deps } = createDeps();
    const reg = createWebhookRegistry(deps);
    expect(reg.generateSignature('nope', 'data')).toBeUndefined();
  });

  it('generates different signatures for different payloads', () => {
    const { deps } = createDeps();
    const reg = createWebhookRegistry(deps);
    const sub = reg.subscribe({ url: 'https://a.com', eventTypes: ['e1'], secret: 'sec' });
    const sig1 = reg.generateSignature(sub.id, 'payload1');
    const sig2 = reg.generateSignature(sub.id, 'payload2');
    expect(sig1?.signature).not.toBe(sig2?.signature);
  });

  it('generates different signatures for different secrets', () => {
    const { deps } = createDeps();
    const reg = createWebhookRegistry(deps);
    const sub1 = reg.subscribe({ url: 'https://a.com', eventTypes: ['e1'], secret: 'secret1' });
    const sub2 = reg.subscribe({ url: 'https://b.com', eventTypes: ['e1'], secret: 'secret2' });
    const sig1 = reg.generateSignature(sub1.id, 'same-payload');
    const sig2 = reg.generateSignature(sub2.id, 'same-payload');
    expect(sig1?.signature).not.toBe(sig2?.signature);
  });
});

describe('WebhookRegistry — stats', () => {
  it('reports zero stats initially', () => {
    const { deps } = createDeps();
    const reg = createWebhookRegistry(deps);
    const stats = reg.getStats();
    expect(stats.totalSubscriptions).toBe(0);
    expect(stats.totalDeliveries).toBe(0);
    expect(stats.deadLetterCount).toBe(0);
  });

  it('tracks subscription and delivery counts', () => {
    const { deps } = createDeps();
    const reg = createWebhookRegistry(deps);
    const sub = reg.subscribe({ url: 'https://a.com', eventTypes: ['e1'], secret: 's' });
    reg.subscribe({ url: 'https://b.com', eventTypes: ['e2'], secret: 's' });
    const delivery = reg.enqueueDelivery({
      subscriptionId: sub.id,
      eventType: 'e1',
      payload: {},
    });
    reg.recordAttempt({ deliveryId: delivery.id, success: true, statusCode: 200 });

    const stats = reg.getStats();
    expect(stats.totalSubscriptions).toBe(2);
    expect(stats.activeSubscriptions).toBe(2);
    expect(stats.totalDeliveries).toBe(1);
    expect(stats.deliveredCount).toBe(1);
    expect(stats.pendingDeliveries).toBe(0);
  });

  it('tracks active vs inactive subscriptions', () => {
    const { deps } = createDeps();
    const reg = createWebhookRegistry(deps);
    const sub = reg.subscribe({ url: 'https://a.com', eventTypes: ['e1'], secret: 's' });
    reg.subscribe({ url: 'https://b.com', eventTypes: ['e2'], secret: 's' });
    reg.unsubscribe(sub.id);
    const stats = reg.getStats();
    expect(stats.totalSubscriptions).toBe(2);
    expect(stats.activeSubscriptions).toBe(1);
  });
});
