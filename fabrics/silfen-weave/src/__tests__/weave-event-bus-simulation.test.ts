import { describe, expect, it } from 'vitest';
import { createWeaveEventBusModule } from '../weave-event-bus.js';

function makeBus() {
  let now = 1_000_000n;
  return {
    bus: createWeaveEventBusModule({
      clock: { nowMicroseconds: () => now },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    }),
    setTime: (next: bigint) => {
      now = next;
    },
  };
}

describe('weave-event-bus simulation', () => {
  it('routes prioritized events and prunes expired entries', () => {
    const { bus, setTime } = makeBus();

    bus.subscribeWorld('world-a', ['TRANSIT_COMPLETE'], 'NORMAL');
    bus.subscribeWorld('world-b', [], 'LOW');

    const pub = bus.publishEvent({
      eventId: 'evt-1',
      eventType: 'TRANSIT_COMPLETE',
      originWorldId: 'world-x',
      priority: 'HIGH',
      payload: { entity: 'e-1' },
      ttlMicros: 5_000n,
    });
    expect(pub.success).toBe(true);

    expect(bus.relayToWorld('evt-1', 'world-a').success).toBe(true);
    expect(bus.relayToWorld('evt-1', 'world-b').success).toBe(true);

    setTime(2_000_000n);
    const pruned = bus.pruneExpired();
    expect(pruned).toBe(1);
    expect(bus.getEvent('evt-1').found).toBe(false);
  });
});
