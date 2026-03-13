import { describe, it, expect } from 'vitest';
import {
  createCrossWorldBroadcastSystem,
  DEFAULT_BROADCAST_CONFIG,
  type BroadcastDeps,
  type PublishBroadcastParams,
} from '../cross-world-broadcast.js';

// ── Test Doubles ──────────────────────────────────────────────────

let seq = 0;
function makeId() { seq++; return `id-${String(seq)}`; }
function resetSeq() { seq = 0; }

function makeClock(us = 1_000_000) {
  let now = us;
  return { nowMicroseconds: () => now, advance: (d: number) => { now += d; } };
}

function makeDeps(us = 1_000_000): BroadcastDeps & { clock: ReturnType<typeof makeClock> } {
  resetSeq();
  const clock = makeClock(us);
  return { clock, idGenerator: { next: makeId }, log: { info: () => undefined } };
}

function publishParams(overrides: Partial<PublishBroadcastParams> = {}): PublishBroadcastParams {
  return {
    category: 'FOUNDATION_ARCHIVE',
    priority: 'HIGH',
    title: 'World Ascension',
    summary: 'World Aethel achieved full civilization.',
    originWorldId: 'world-aethel',
    payload: { worldId: 'world-aethel', population: 1_000_000 },
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────

describe('CrossWorldBroadcastSystem — subscriptions', () => {
  it('registers a world subscription', () => {
    const deps = makeDeps();
    const sys = createCrossWorldBroadcastSystem(deps);
    const sub = sys.subscribe('world-B', ['FOUNDATION_ARCHIVE', 'TOURNAMENT']);
    expect(sub.worldId).toBe('world-B');
    expect(sub.categories).toContain('FOUNDATION_ARCHIVE');
  });

  it('unsubscribes a world', () => {
    const deps = makeDeps();
    const sys = createCrossWorldBroadcastSystem(deps);
    sys.subscribe('world-B', ['DIPLOMACY']);
    expect(sys.unsubscribe('world-B')).toBe(true);
    expect(sys.unsubscribe('no-such-world')).toBe(false);
  });
});

describe('CrossWorldBroadcastSystem — publish + fan-out', () => {
  it('publishes an event and fans out to subscribed worlds', () => {
    const deps = makeDeps();
    const sys = createCrossWorldBroadcastSystem(deps);
    sys.subscribe('world-B', ['FOUNDATION_ARCHIVE']);
    sys.subscribe('world-C', ['FOUNDATION_ARCHIVE']);
    sys.subscribe('world-D', ['TOURNAMENT']); // different category — no delivery

    const event = sys.publish(publishParams());
    expect('code' in event).toBe(false);
    if ('code' in event) return;

    expect(sys.getDeliveriesForWorld('world-B')).toHaveLength(1);
    expect(sys.getDeliveriesForWorld('world-C')).toHaveLength(1);
    expect(sys.getDeliveriesForWorld('world-D')).toHaveLength(0);
  });

  it('does not deliver event back to origin world', () => {
    const deps = makeDeps();
    const sys = createCrossWorldBroadcastSystem(deps);
    sys.subscribe('world-aethel', ['FOUNDATION_ARCHIVE']);

    sys.publish(publishParams());
    expect(sys.getDeliveriesForWorld('world-aethel')).toHaveLength(0);
  });

  it('rejects payloads exceeding maxPayloadKeys', () => {
    const deps = makeDeps();
    const sys = createCrossWorldBroadcastSystem(deps, { maxPayloadKeys: 2 });
    const bigPayload = { a: 1, b: 2, c: 3 };
    const result = sys.publish(publishParams({ payload: bigPayload }));
    expect('code' in result).toBe(true);
    if (!('code' in result)) return;
    expect(result.code).toBe('payload-too-large');
  });
});

describe('CrossWorldBroadcastSystem — tick / delivery', () => {
  it('advances QUEUED deliveries to IN_FLIGHT on first tick', () => {
    const deps = makeDeps();
    const sys = createCrossWorldBroadcastSystem(deps);
    sys.subscribe('world-B', ['ECONOMY']);
    sys.publish(publishParams({ category: 'ECONOMY' }));

    const tick1 = sys.tick();
    expect(tick1.length).toBeGreaterThan(0);
    expect(tick1[0]?.status).toBe('IN_FLIGHT');
  });

  it('advances IN_FLIGHT deliveries to DELIVERED on second tick', () => {
    const deps = makeDeps();
    const sys = createCrossWorldBroadcastSystem(deps);
    sys.subscribe('world-B', ['SURVEY_CORPS']);
    sys.publish(publishParams({ category: 'SURVEY_CORPS' }));

    sys.tick(); // QUEUED → IN_FLIGHT
    deps.clock.advance(1_000);
    const tick2 = sys.tick(); // IN_FLIGHT → DELIVERED

    expect(tick2[0]?.status).toBe('DELIVERED');
    expect(tick2[0]?.deliveredAt).not.toBeNull();
  });

  it('getDeliveriesForWorld reflects current status after ticks', () => {
    const deps = makeDeps();
    const sys = createCrossWorldBroadcastSystem(deps);
    sys.subscribe('world-B', ['DIPLOMACY']);
    sys.publish(publishParams({ category: 'DIPLOMACY' }));

    sys.tick();
    sys.tick();

    const delivered = sys.getDeliveriesForWorld('world-B');
    expect(delivered[0]?.status).toBe('DELIVERED');
  });
});

describe('CrossWorldBroadcastSystem — getEvent', () => {
  it('retrieves an event by id', () => {
    const deps = makeDeps();
    const sys = createCrossWorldBroadcastSystem(deps);
    const event = sys.publish(publishParams());
    if ('code' in event) throw new Error('publish failed');

    const fetched = sys.getEvent(event.eventId);
    expect('code' in fetched).toBe(false);
    if ('code' in fetched) return;
    expect(fetched.title).toBe('World Ascension');
  });

  it('returns event-not-found for unknown id', () => {
    const deps = makeDeps();
    const sys = createCrossWorldBroadcastSystem(deps);
    const result = sys.getEvent('x');
    expect('code' in result).toBe(true);
    if (!('code' in result)) return;
    expect(result.code).toBe('event-not-found');
  });
});

describe('CrossWorldBroadcastSystem — expireStale', () => {
  it('removes events past their expiresAt', () => {
    const deps = makeDeps();
    const ONE_DAY_US = 24 * 60 * 60 * 1_000_000;
    const sys = createCrossWorldBroadcastSystem(deps, { defaultExpiryUs: ONE_DAY_US });
    const event = sys.publish(publishParams());
    if ('code' in event) throw new Error('publish failed');

    // advance past expiry
    deps.clock.advance(ONE_DAY_US + 1);
    const expired = sys.expireStale();

    expect(expired).toContain(event.eventId);
    const fetched = sys.getEvent(event.eventId);
    expect('code' in fetched).toBe(true);
  });
});

describe('CrossWorldBroadcastSystem — stats', () => {
  it('reflects subscribed worlds and delivered counts', () => {
    const deps = makeDeps();
    const sys = createCrossWorldBroadcastSystem(deps);
    sys.subscribe('world-B', ['FOUNDATION_ARCHIVE']);
    sys.publish(publishParams());
    sys.tick();
    sys.tick();

    const stats = sys.getStats();
    expect(stats.totalEvents).toBe(1);
    expect(stats.subscribedWorlds).toBe(1);
    expect(stats.deliveredCount).toBe(1);
    expect(stats.inFlightCount).toBe(0);
  });
});

describe('CrossWorldBroadcastSystem — config defaults', () => {
  it('exports DEFAULT_BROADCAST_CONFIG', () => {
    expect(DEFAULT_BROADCAST_CONFIG.maxPayloadKeys).toBe(32);
    expect(DEFAULT_BROADCAST_CONFIG.defaultExpiryUs).toBeGreaterThan(0);
  });
});
