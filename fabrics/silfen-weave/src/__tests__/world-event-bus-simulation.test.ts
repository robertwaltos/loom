import { describe, expect, it } from 'vitest';
import { createWorldEventBusSystem } from '../world-event-bus.js';

function makeSystem() {
  let now = 1_000_000n;
  let id = 0;
  return createWorldEventBusSystem({
    clock: { now: () => now++ },
    idGen: { generate: () => `evt-${++id}` },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  });
}

describe('world-event-bus simulation', () => {
  it('publishes cross-world events to scoped and global subscribers', () => {
    const bus = makeSystem();
    bus.registerWorld('world-a');
    bus.registerWorld('world-b');

    bus.subscribe('sub-a', 'world-a', ['combat.started']);
    bus.subscribe('sub-global', null, ['combat.started']);

    const event = bus.publishEvent('world-a', 'world-b', 'combat.started', { region: 'north' }, 'HIGH');
    if (typeof event === 'string') {
      throw new Error('event publish failed');
    }

    expect(event.processedCount).toBe(2);
    expect(bus.getDeliveries(event.eventId)).toHaveLength(2);
    expect(bus.getStats().totalDeliveries).toBe(2);
  });
});
