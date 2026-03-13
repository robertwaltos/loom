import { describe, it, expect } from 'vitest';
import { createWebhookRegistry, DEFAULT_WEBHOOK_CONFIG } from '../webhook-registry.js';

let idSeq = 0;
function makeRegistry() {
  idSeq = 0;
  return createWebhookRegistry(
    {
      clock: { nowMicroseconds: () => 1_000_000 },
      idGenerator: { generate: () => `wreg-${++idSeq}` },
      log: { info: () => {}, warn: () => {} },
    },
  );
}

describe('Webhook Registry Simulation', () => {
  it('subscribes to events and lists subscriptions', () => {
    const registry = makeRegistry();

    const sub = registry.subscribe({ url: 'https://server.example.com/hook', eventTypes: ['order.created', 'order.updated'], secret: 'secret-key' });
    expect(sub).toBeDefined();
    expect((sub as { id: string }).id).toBeTruthy();

    const list = registry.listSubscriptions();
    expect(list.length).toBe(1);
    expect(list[0]!.url).toBe('https://server.example.com/hook');
  });

  it('publishes events and stores deliveries for matching subscribers', () => {
    const registry = makeRegistry();

    const sub = registry.subscribe({ url: 'https://events.example.com/hook', eventTypes: ['user.created'], secret: 'abc' }) as { id: string };

    registry.enqueueDelivery({ subscriptionId: sub.id, eventType: 'user.created', payload: { userId: 'u42' } });

    const pending = registry.getPendingDeliveries();
    expect(pending.length).toBeGreaterThanOrEqual(1);
    expect(pending[0]!.eventType).toBe('user.created');
  });

  it('does not deliver events to unmatched subscriptions', () => {
    const registry = makeRegistry();

    registry.subscribe({ url: 'https://nope.example.com/hook', eventTypes: ['order.shipped'], secret: 'x' });

    // No matching subscriptions for 'user.created'
    const matchingSubs = registry.listByEventType('user.created');
    expect(matchingSubs.length).toBe(0);

    const pending = registry.getPendingDeliveries();
    expect(pending.length).toBe(0);
  });

  it('unsubscribes and stops receiving events', () => {
    const registry = makeRegistry();

    const sub = registry.subscribe({ url: 'https://unsub.example.com/hook', eventTypes: ['ping'], secret: 'y' }) as { id: string };
    registry.unsubscribe(sub.id);

    // Subscription still exists but is inactive
    const found = registry.getSubscription(sub.id);
    expect(found?.active).toBe(false);

    // Active subscriptions for event type should be empty
    const active = registry.listByEventType('ping');
    expect(active.length).toBe(0);
  });

  it('tracks stats', () => {
    const registry = makeRegistry();
    const sub = registry.subscribe({ url: 'https://stat.example.com/hook', eventTypes: ['test'], secret: 'z' }) as { id: string };
    registry.enqueueDelivery({ subscriptionId: sub.id, eventType: 'test', payload: {} });
    const stats = registry.getStats();
    expect(stats.totalSubscriptions).toBeGreaterThanOrEqual(1);
    expect(stats.totalDeliveries).toBeGreaterThanOrEqual(1);
  });

  it('exposes DEFAULT_WEBHOOK_CONFIG', () => {
    expect(DEFAULT_WEBHOOK_CONFIG).toBeDefined();
  });
});
