import { describe, it, expect } from 'vitest';
import { createCrossWorldBroadcastSystem, DEFAULT_BROADCAST_CONFIG } from '../cross-world-broadcast.js';

let idSeq = 0;
function makeSystem() {
  idSeq = 0;
  return createCrossWorldBroadcastSystem({
    clock: { nowMicroseconds: () => 1_000_000 },
    idGenerator: { next: () => `evt-${++idSeq}` },
    log: { info: () => {} },
  });
}

describe('Cross-World Broadcast Simulation', () => {
  it('subscribes worlds to categories and delivers matching broadcasts', () => {
    const system = makeSystem();

    system.subscribe('world-1', ['economy', 'weather']);
    system.subscribe('world-2', ['combat', 'economy']);

    const result = system.publish({
      category: 'economy',
      priority: 1,
      title: 'Market crash',
      summary: 'Prices drop 50%',
      originWorldId: 'world-admin',
      payload: { delta: -0.5 },
    });
    expect(result).not.toHaveProperty('code');

    const w1Deliveries = system.getDeliveriesForWorld('world-1');
    const w2Deliveries = system.getDeliveriesForWorld('world-2');
    expect(w1Deliveries.length).toBeGreaterThanOrEqual(1);
    expect(w2Deliveries.length).toBeGreaterThanOrEqual(1);
  });

  it('does not deliver events to unsubscribed categories', () => {
    const system = makeSystem();

    system.subscribe('world-3', ['weather']);
    system.publish({
      category: 'combat',
      priority: 2,
      title: 'War declared',
      summary: 'Attack imminent',
      originWorldId: 'world-A',
      payload: {},
    });

    const deliveries = system.getDeliveriesForWorld('world-3');
    expect(deliveries.length).toBe(0);
  });

  it('unsubscribes worlds and stops deliveries', () => {
    const system = makeSystem();

    system.subscribe('world-4', ['economy']);
    system.unsubscribe('world-4');

    system.publish({
      category: 'economy',
      priority: 1,
      title: 'Market update',
      summary: 'Stable',
      originWorldId: 'world-B',
      payload: {},
    });

    const deliveries = system.getDeliveriesForWorld('world-4');
    expect(deliveries.length).toBe(0);
  });

  it('exposes DEFAULT_BROADCAST_CONFIG with valid values', () => {
    expect(DEFAULT_BROADCAST_CONFIG).toBeDefined();
  });

  it('tracks delivery stats', () => {
    const system = makeSystem();
    system.subscribe('world-5', ['weather']);
    system.publish({
      category: 'weather',
      priority: 1,
      title: 'Storm',
      summary: 'Heavy rain',
      originWorldId: 'origin',
      payload: {},
    });
    const stats = system.getStats();
    expect(stats.totalDeliveries).toBeGreaterThanOrEqual(1);
  });
});
