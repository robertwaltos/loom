import { describe, it, expect, beforeEach } from 'vitest';
import {
  createWorldEventBusSystem,
  type WorldEventBusSystem,
  type WorldEventBusClockPort,
  type WorldEventBusIdGeneratorPort,
  type WorldEventBusLoggerPort,
} from '../world-event-bus.js';

// ── Test Doubles ─────────────────────────────────────────────────

class TestClock implements WorldEventBusClockPort {
  private time = 1_000_000n;
  now(): bigint {
    return this.time;
  }
  advance(by: bigint): void {
    this.time += by;
  }
}

class TestIdGen implements WorldEventBusIdGeneratorPort {
  private counter = 0;
  generate(): string {
    return 'id-' + String(++this.counter);
  }
}

class TestLogger implements WorldEventBusLoggerPort {
  readonly infos: string[] = [];
  readonly warns: string[] = [];
  readonly errors: string[] = [];
  info(m: string): void {
    this.infos.push(m);
  }
  warn(m: string): void {
    this.warns.push(m);
  }
  error(m: string): void {
    this.errors.push(m);
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function makeSystem(): {
  sys: WorldEventBusSystem;
  clock: TestClock;
  logger: TestLogger;
} {
  const clock = new TestClock();
  const logger = new TestLogger();
  const sys = createWorldEventBusSystem({ clock, idGen: new TestIdGen(), logger });
  return { sys, clock, logger };
}

function setupTwoWorlds(sys: WorldEventBusSystem): void {
  sys.registerWorld('world-A');
  sys.registerWorld('world-B');
}

// ── Tests ────────────────────────────────────────────────────────

describe('WorldEventBus — registerWorld', () => {
  let sys: WorldEventBusSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
  });

  it('registers a world successfully', () => {
    const result = sys.registerWorld('world-A');
    expect(result.success).toBe(true);
  });

  it('rejects duplicate world registration', () => {
    sys.registerWorld('world-A');
    const result = sys.registerWorld('world-A');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('already-registered');
  });
});

describe('WorldEventBus — subscribe / unsubscribe', () => {
  let sys: WorldEventBusSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    setupTwoWorlds(sys);
  });

  it('subscribes a subscriber to a specific world', () => {
    const result = sys.subscribe('sub-1', 'world-A', ['player.joined']);
    expect(result.success).toBe(true);
  });

  it('subscribes a subscriber to all worlds (null worldId)', () => {
    const result = sys.subscribe('sub-1', null, ['combat.started']);
    expect(result.success).toBe(true);
  });

  it('rejects duplicate subscription for same subscriber', () => {
    sys.subscribe('sub-1', 'world-A', ['player.joined']);
    const result = sys.subscribe('sub-1', 'world-B', ['combat.started']);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('already-subscribed');
  });

  it('unsubscribes a subscriber successfully', () => {
    sys.subscribe('sub-1', 'world-A', ['player.joined']);
    const result = sys.unsubscribe('sub-1');
    expect(result.success).toBe(true);
  });

  it('rejects unsubscribe for unknown subscriber', () => {
    const result = sys.unsubscribe('ghost-sub');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('subscriber-not-found');
  });

  it('allows re-subscribe after unsubscribe', () => {
    sys.subscribe('sub-1', 'world-A', ['player.joined']);
    sys.unsubscribe('sub-1');
    const result = sys.subscribe('sub-1', 'world-B', ['combat.started']);
    expect(result.success).toBe(true);
  });
});

describe('WorldEventBus — publishEvent', () => {
  let sys: WorldEventBusSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    setupTwoWorlds(sys);
  });

  it('rejects publish from unregistered source world', () => {
    const result = sys.publishEvent('unknown-world', null, 'player.joined', {}, 'NORMAL');
    expect(result).toBe('world-not-registered');
  });

  it('publishes an event successfully and returns WorldEvent', () => {
    const result = sys.publishEvent('world-A', null, 'player.joined', { playerId: 'p1' }, 'HIGH');
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.sourceWorldId).toBe('world-A');
    expect(result.eventType).toBe('player.joined');
    expect(result.priority).toBe('HIGH');
  });

  it('delivers event to matching subscriber', () => {
    sys.subscribe('sub-1', 'world-A', ['player.joined']);
    const event = sys.publishEvent('world-A', null, 'player.joined', {}, 'NORMAL');
    if (typeof event === 'string') return;
    expect(event.processedCount).toBe(1);
    const deliveries = sys.getDeliveries(event.eventId);
    expect(deliveries.length).toBe(1);
    expect(deliveries[0]?.subscriberId).toBe('sub-1');
  });

  it('does not deliver event to subscriber with non-matching event type', () => {
    sys.subscribe('sub-1', 'world-A', ['combat.started']);
    const event = sys.publishEvent('world-A', null, 'player.joined', {}, 'NORMAL');
    if (typeof event === 'string') return;
    expect(event.processedCount).toBe(0);
  });

  it('delivers event to null-worldId subscriber (global)', () => {
    sys.subscribe('sub-global', null, ['player.joined']);
    const event = sys.publishEvent('world-A', 'world-B', 'player.joined', {}, 'CRITICAL');
    if (typeof event === 'string') return;
    expect(event.processedCount).toBe(1);
  });

  it('delivers event to subscriber matching targetWorldId', () => {
    sys.subscribe('sub-1', 'world-B', ['player.joined']);
    const event = sys.publishEvent('world-A', 'world-B', 'player.joined', {}, 'NORMAL');
    if (typeof event === 'string') return;
    expect(event.processedCount).toBe(1);
  });

  it('delivers event to subscriber matching sourceWorldId', () => {
    sys.subscribe('sub-1', 'world-A', ['player.joined']);
    const event = sys.publishEvent('world-A', 'world-B', 'player.joined', {}, 'NORMAL');
    if (typeof event === 'string') return;
    expect(event.processedCount).toBe(1);
  });

  it('delivers to multiple matching subscribers', () => {
    sys.subscribe('sub-1', 'world-A', ['player.joined']);
    sys.subscribe('sub-2', null, ['player.joined']);
    const event = sys.publishEvent('world-A', null, 'player.joined', {}, 'LOW');
    if (typeof event === 'string') return;
    expect(event.processedCount).toBe(2);
  });
});

describe('WorldEventBus — queries and stats', () => {
  let sys: WorldEventBusSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
    setupTwoWorlds(sys);
    sys.subscribe('sub-1', null, ['player.joined', 'combat.started']);
  });

  it('getEvent returns the event by id', () => {
    const event = sys.publishEvent('world-A', null, 'player.joined', {}, 'NORMAL');
    if (typeof event === 'string') return;
    const fetched = sys.getEvent(event.eventId);
    expect(fetched?.eventId).toBe(event.eventId);
  });

  it('getEvent returns undefined for unknown id', () => {
    expect(sys.getEvent('no-such-event')).toBeUndefined();
  });

  it('getSubscriberEvents returns events delivered to subscriber', () => {
    sys.publishEvent('world-A', null, 'player.joined', {}, 'NORMAL');
    sys.publishEvent('world-A', null, 'combat.started', {}, 'HIGH');
    const events = sys.getSubscriberEvents('sub-1', 10);
    expect(events.length).toBe(2);
  });

  it('getSubscriberEvents respects limit', () => {
    sys.publishEvent('world-A', null, 'player.joined', {}, 'NORMAL');
    sys.publishEvent('world-A', null, 'combat.started', {}, 'HIGH');
    sys.publishEvent('world-A', null, 'player.joined', {}, 'LOW');
    const events = sys.getSubscriberEvents('sub-1', 2);
    expect(events.length).toBe(2);
  });

  it('getStats reflects published events', () => {
    sys.publishEvent('world-A', null, 'player.joined', {}, 'HIGH');
    sys.publishEvent('world-A', null, 'combat.started', {}, 'CRITICAL');
    const stats = sys.getStats();
    expect(stats.totalEvents).toBe(2);
    expect(stats.byPriority.HIGH).toBe(1);
    expect(stats.byPriority.CRITICAL).toBe(1);
    expect(stats.byPriority.NORMAL).toBe(0);
  });

  it('getStats.totalDeliveries matches sum of deliveries', () => {
    sys.publishEvent('world-A', null, 'player.joined', {}, 'NORMAL');
    sys.publishEvent('world-A', null, 'combat.started', {}, 'LOW');
    const stats = sys.getStats();
    expect(stats.totalDeliveries).toBe(2);
  });
});
