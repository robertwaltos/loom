import { describe, it, expect } from 'vitest';
import { createStateSyncV2 } from '../state-sync-v2.js';

function makeSync() {
  let time = 0;
  return {
    sync: createStateSyncV2({ clock: { nowMs: () => time } }),
    advance: (ms: number) => { time += ms; },
  };
}

describe('State Sync V2 Simulation', () => {
  it('subscribes a client with an interest zone and dispatches in-range entities', () => {
    const { sync } = makeSync();

    sync.subscribe('client-1', { origin: { x: 0, y: 0, z: 0 }, radiusMeters: 100, alwaysInclude: [] }, 10_000);

    sync.enqueue({ entityId: 'entity-near', position: { x: 30, y: 0, z: 0 }, priority: 1, sizeBytes: 100, payload: { hp: 100 } });
    sync.enqueue({ entityId: 'entity-far', position: { x: 500, y: 0, z: 0 }, priority: 1, sizeBytes: 100, payload: { hp: 50 } });

    const result = sync.tick('client-1');
    expect(result).toBeDefined();
    expect(result!.dispatched.find((e: { entityId: string }) => e.entityId === 'entity-near')).toBeDefined();
    expect(result!.dispatched.find((e: { entityId: string }) => e.entityId === 'entity-far')).toBeUndefined();
  });

  it('enforces bandwidth cap and drops excess updates', () => {
    const { sync } = makeSync();

    const bandwidthBytesPerTick = 200;
    sync.subscribe('client-bw', { origin: { x: 0, y: 0, z: 0 }, radiusMeters: 1000, alwaysInclude: [] }, bandwidthBytesPerTick);

    for (let i = 0; i < 10; i++) {
      sync.enqueue({ entityId: `entity-${i}`, position: { x: 10, y: 0, z: 0 }, priority: 1, sizeBytes: 60, payload: {} });
    }

    const result = sync.tick('client-bw');
    expect(result).toBeDefined();
    expect(result!.droppedCount).toBeGreaterThan(0);
  });

  it('always includes entities in the alwaysInclude list regardless of range', () => {
    const { sync } = makeSync();

    sync.subscribe('client-always', { origin: { x: 0, y: 0, z: 0 }, radiusMeters: 10, alwaysInclude: ['critical-entity'] }, 50_000);
    sync.enqueue({ entityId: 'critical-entity', position: { x: 9999, y: 0, z: 0 }, priority: 10, sizeBytes: 50, payload: { important: true } });

    const result = sync.tick('client-always');
    expect(result).toBeDefined();
    expect(result!.dispatched.find((e: { entityId: string }) => e.entityId === 'critical-entity')).toBeDefined();
  });

  it('returns undefined for unsubscribed clients', () => {
    const { sync } = makeSync();
    const result = sync.tick('no-such-client');
    expect(result).toBeUndefined();
  });

  it('unsubscribes clients and stops sending updates', () => {
    const { sync } = makeSync();

    sync.subscribe('leaver', { origin: { x: 0, y: 0, z: 0 }, radiusMeters: 100, alwaysInclude: [] }, 10_000);
    sync.unsubscribe('leaver');

    sync.enqueue({ entityId: 'e1', position: { x: 5, y: 0, z: 0 }, priority: 1, sizeBytes: 50, payload: {} });
    const result = sync.tick('leaver');
    expect(result).toBeUndefined();
  });
});
