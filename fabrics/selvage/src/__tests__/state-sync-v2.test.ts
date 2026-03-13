import { describe, it, expect, beforeEach } from 'vitest';
import {
  createStateSyncV2,
  type ClientId,
  type EntityId,
  type InterestZone,
  type EntityUpdate,
} from '../state-sync-v2.js';

function makeClient(id: string): ClientId { return id as ClientId; }
function makeEntity(id: string): EntityId { return id as EntityId; }

const ORIGIN = { x: 0, y: 0, z: 0 };
const ZONE_100M: InterestZone = { origin: ORIGIN, radiusMeters: 100, alwaysInclude: [] };

function makeUpdate(id: string, pos = ORIGIN, priority = 0.5): EntityUpdate {
  return { entityId: makeEntity(id), position: pos, priority, sizeBytes: 50, payload: new Uint8Array(50) };
}

function makeDeps() {
  return { clock: { nowMs: () => 1000 } };
}

describe('subscribe / unsubscribe', () => {
  it('subscribe returns undefined tick for unknown client', () => {
    const sync = createStateSyncV2(makeDeps());
    expect(sync.tick(makeClient('unknown'))).toBeUndefined();
  });

  it('tick returns a result after subscription', () => {
    const sync = createStateSyncV2(makeDeps());
    sync.subscribe(makeClient('c1'), ZONE_100M, 1000);
    expect(sync.tick(makeClient('c1'))).toBeDefined();
  });

  it('unsubscribe removes client — tick returns undefined', () => {
    const sync = createStateSyncV2(makeDeps());
    sync.subscribe(makeClient('c1'), ZONE_100M, 1000);
    sync.unsubscribe(makeClient('c1'));
    expect(sync.tick(makeClient('c1'))).toBeUndefined();
  });
});

describe('enqueue and interest filtering', () => {
  it('delivers entity inside the interest zone', () => {
    const sync = createStateSyncV2(makeDeps());
    sync.subscribe(makeClient('c1'), ZONE_100M, 10_000);
    sync.enqueue(makeUpdate('e1', { x: 10, y: 0, z: 0 }));
    const result = sync.tick(makeClient('c1'));
    expect(result?.dispatched.length).toBe(1);
    expect(result?.dispatched.at(0)?.entityId).toBe('e1');
  });

  it('drops entity outside the interest zone', () => {
    const sync = createStateSyncV2(makeDeps());
    sync.subscribe(makeClient('c1'), ZONE_100M, 10_000);
    sync.enqueue(makeUpdate('e1', { x: 500, y: 0, z: 0 }));
    const result = sync.tick(makeClient('c1'));
    expect(result?.dispatched.length).toBe(0);
    expect(result?.droppedCount).toBe(0);
  });

  it('always includes entities on the alwaysInclude list even if outside zone', () => {
    const zone: InterestZone = { ...ZONE_100M, alwaysInclude: [makeEntity('vip')] };
    const sync = createStateSyncV2(makeDeps());
    sync.subscribe(makeClient('c1'), zone, 10_000);
    sync.enqueue(makeUpdate('vip', { x: 999, y: 0, z: 0 }));
    const result = sync.tick(makeClient('c1'));
    expect(result?.dispatched.length).toBe(1);
  });
});

describe('bandwidth cap', () => {
  it('drops excess updates when bandwidth cap is exceeded', () => {
    const sync = createStateSyncV2(makeDeps());
    sync.subscribe(makeClient('c1'), ZONE_100M, 60);   // 60 bytes — fits exactly 1 update (50 bytes)
    sync.enqueue(makeUpdate('e1'));
    sync.enqueue(makeUpdate('e2'));
    const result = sync.tick(makeClient('c1'));
    expect(result?.dispatched.length).toBe(1);
    expect(result?.droppedCount).toBe(1);
  });

  it('reports bytesSent correctly', () => {
    const sync = createStateSyncV2(makeDeps());
    sync.subscribe(makeClient('c1'), ZONE_100M, 10_000);
    sync.enqueue(makeUpdate('e1'));
    sync.enqueue(makeUpdate('e2'));
    const result = sync.tick(makeClient('c1'));
    expect(result?.bytesSent).toBe(100);
  });
});

describe('priority ordering', () => {
  it('dispatches higher-priority updates first when bandwidth is limited', () => {
    const sync = createStateSyncV2(makeDeps());
    sync.subscribe(makeClient('c1'), ZONE_100M, 60);
    sync.enqueue(makeUpdate('low', ORIGIN, 0.1));
    sync.enqueue(makeUpdate('high', ORIGIN, 0.9));
    const result = sync.tick(makeClient('c1'));
    expect(result?.dispatched.at(0)?.entityId).toBe('high');
  });
});

describe('getStats', () => {
  let sync: ReturnType<typeof createStateSyncV2>;
  beforeEach(() => { sync = createStateSyncV2(makeDeps()); });

  it('starts at zeros', () => {
    expect(sync.getStats()).toEqual({ totalTicks: 0, totalDispatched: 0, totalDropped: 0 });
  });

  it('accumulates across multiple ticks', () => {
    sync.subscribe(makeClient('c1'), ZONE_100M, 10_000);
    sync.enqueue(makeUpdate('e1'));
    sync.tick(makeClient('c1'));
    sync.enqueue(makeUpdate('e2'));
    sync.tick(makeClient('c1'));
    const stats = sync.getStats();
    expect(stats.totalTicks).toBe(2);
    expect(stats.totalDispatched).toBe(2);
  });
});
