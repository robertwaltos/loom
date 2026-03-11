import { describe, it, expect, beforeEach } from 'vitest';
import { createWeaveEventBusModule } from '../weave-event-bus.js';

interface TestClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface TestLoggerPort {
  readonly info: (message: string, context: Record<string, unknown>) => void;
  readonly warn: (message: string, context: Record<string, unknown>) => void;
  readonly error: (message: string, context: Record<string, unknown>) => void;
}

function createTestClock(initialMicros: bigint): {
  clock: TestClockPort;
  setTime: (micros: bigint) => void;
} {
  let currentMicros = initialMicros;
  return {
    clock: { nowMicroseconds: () => currentMicros },
    setTime: (micros: bigint) => {
      currentMicros = micros;
    },
  };
}

function createTestLogger(): TestLoggerPort {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

describe('WeaveEventBusModule', () => {
  let clock: ReturnType<typeof createTestClock>;
  let logger: TestLoggerPort;

  beforeEach(() => {
    clock = createTestClock(1000000n);
    logger = createTestLogger();
  });

  describe('publishEvent', () => {
    it('publishes event successfully', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      const result = module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TRANSIT_COMPLETE',
        originWorldId: 'world-1',
        priority: 'NORMAL',
        payload: { entityId: 'e-1' },
        ttlMicros: 3600000000n,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.eventId).toBe('evt-1');
      }
    });

    it('returns error for duplicate event ID', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TEST',
        originWorldId: 'world-1',
        priority: 'NORMAL',
        payload: {},
        ttlMicros: 1000000n,
      });
      const result = module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TEST',
        originWorldId: 'world-2',
        priority: 'LOW',
        payload: {},
        ttlMicros: 1000000n,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Event ID already exists');
      }
    });

    it('sets timestamp on published event', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      clock.setTime(5000000n);
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TEST',
        originWorldId: 'world-1',
        priority: 'NORMAL',
        payload: {},
        ttlMicros: 1000000n,
      });
      const result = module.getEvent('evt-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.event.timestampMicros).toBe(5000000n);
      }
    });

    it('publishes events with different priorities', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      module.publishEvent({
        eventId: 'evt-low',
        eventType: 'TEST',
        originWorldId: 'world-1',
        priority: 'LOW',
        payload: {},
        ttlMicros: 1000000n,
      });
      module.publishEvent({
        eventId: 'evt-critical',
        eventType: 'TEST',
        originWorldId: 'world-1',
        priority: 'CRITICAL',
        payload: {},
        ttlMicros: 1000000n,
      });
      const events = module.getEventHistory({});
      expect(events.length).toBe(2);
    });
  });

  describe('getEvent', () => {
    it('returns error when event not found', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      const result = module.getEvent('unknown');
      expect(result.found).toBe(false);
      if (!result.found) {
        expect(result.error).toBe('Event not found');
      }
    });

    it('retrieves published event', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TEST',
        originWorldId: 'world-1',
        priority: 'HIGH',
        payload: { key: 'value' },
        ttlMicros: 1000000n,
      });
      const result = module.getEvent('evt-1');
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.event.eventId).toBe('evt-1');
        expect(result.event.eventType).toBe('TEST');
        expect(result.event.priority).toBe('HIGH');
      }
    });
  });

  describe('subscribeWorld', () => {
    it('subscribes world to event types', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      module.subscribeWorld('world-1', ['TRANSIT_COMPLETE', 'RESOURCE_DEPLETED'], 'NORMAL');
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TRANSIT_COMPLETE',
        originWorldId: 'world-2',
        priority: 'NORMAL',
        payload: {},
        ttlMicros: 1000000n,
      });
      const result = module.relayToWorld('evt-1', 'world-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.relayed).toBe(true);
      }
    });

    it('subscribes world to all event types with empty array', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      module.subscribeWorld('world-1', [], 'LOW');
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'ANY_TYPE',
        originWorldId: 'world-2',
        priority: 'NORMAL',
        payload: {},
        ttlMicros: 1000000n,
      });
      const result = module.relayToWorld('evt-1', 'world-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.relayed).toBe(true);
      }
    });

    it('can update subscription', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      module.subscribeWorld('world-1', ['TYPE_A'], 'NORMAL');
      module.subscribeWorld('world-1', ['TYPE_B'], 'HIGH');
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TYPE_B',
        originWorldId: 'world-2',
        priority: 'HIGH',
        payload: {},
        ttlMicros: 1000000n,
      });
      const result = module.relayToWorld('evt-1', 'world-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.relayed).toBe(true);
      }
    });
  });

  describe('unsubscribeWorld', () => {
    it('removes world subscription', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      module.subscribeWorld('world-1', ['TEST'], 'LOW');
      module.unsubscribeWorld('world-1');
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TEST',
        originWorldId: 'world-2',
        priority: 'NORMAL',
        payload: {},
        ttlMicros: 1000000n,
      });
      const result = module.relayToWorld('evt-1', 'world-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.relayed).toBe(false);
      }
    });
  });

  describe('relayToWorld', () => {
    it('returns error when event not found', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      module.subscribeWorld('world-1', [], 'LOW');
      const result = module.relayToWorld('unknown', 'world-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Event not found');
      }
    });

    it('returns error when event expired', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      module.subscribeWorld('world-1', [], 'LOW');
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TEST',
        originWorldId: 'world-2',
        priority: 'NORMAL',
        payload: {},
        ttlMicros: 1000000n,
      });
      clock.setTime(3000000n);
      const result = module.relayToWorld('evt-1', 'world-1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Event expired');
      }
    });

    it('returns false relayed when world not subscribed', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TEST',
        originWorldId: 'world-1',
        priority: 'NORMAL',
        payload: {},
        ttlMicros: 1000000n,
      });
      const result = module.relayToWorld('evt-1', 'world-2');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.relayed).toBe(false);
      }
    });

    it('filters by event type', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      module.subscribeWorld('world-1', ['ALLOWED_TYPE'], 'LOW');
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'OTHER_TYPE',
        originWorldId: 'world-2',
        priority: 'NORMAL',
        payload: {},
        ttlMicros: 1000000n,
      });
      const result = module.relayToWorld('evt-1', 'world-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.relayed).toBe(false);
      }
    });

    it('filters by priority', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      module.subscribeWorld('world-1', [], 'HIGH');
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TEST',
        originWorldId: 'world-2',
        priority: 'NORMAL',
        payload: {},
        ttlMicros: 1000000n,
      });
      const result = module.relayToWorld('evt-1', 'world-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.relayed).toBe(false);
      }
    });

    it('allows events meeting minimum priority', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      module.subscribeWorld('world-1', [], 'NORMAL');
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TEST',
        originWorldId: 'world-2',
        priority: 'CRITICAL',
        payload: {},
        ttlMicros: 1000000n,
      });
      const result = module.relayToWorld('evt-1', 'world-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.relayed).toBe(true);
      }
    });

    it('prevents duplicate relays to same world', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      module.subscribeWorld('world-1', [], 'LOW');
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TEST',
        originWorldId: 'world-2',
        priority: 'NORMAL',
        payload: {},
        ttlMicros: 1000000n,
      });
      module.relayToWorld('evt-1', 'world-1');
      const result = module.relayToWorld('evt-1', 'world-1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.relayed).toBe(false);
      }
    });

    it('tracks multiple relay destinations', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      module.subscribeWorld('world-1', [], 'LOW');
      module.subscribeWorld('world-2', [], 'LOW');
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TEST',
        originWorldId: 'world-3',
        priority: 'NORMAL',
        payload: {},
        ttlMicros: 1000000n,
      });
      const result1 = module.relayToWorld('evt-1', 'world-1');
      const result2 = module.relayToWorld('evt-1', 'world-2');
      expect(result1.success && result1.relayed).toBe(true);
      expect(result2.success && result2.relayed).toBe(true);
    });
  });

  describe('getEventHistory', () => {
    it('returns all events when no filter', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TYPE_A',
        originWorldId: 'world-1',
        priority: 'LOW',
        payload: {},
        ttlMicros: 1000000n,
      });
      module.publishEvent({
        eventId: 'evt-2',
        eventType: 'TYPE_B',
        originWorldId: 'world-2',
        priority: 'HIGH',
        payload: {},
        ttlMicros: 1000000n,
      });
      const events = module.getEventHistory({});
      expect(events.length).toBe(2);
    });

    it('filters by world ID', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TEST',
        originWorldId: 'world-1',
        priority: 'NORMAL',
        payload: {},
        ttlMicros: 1000000n,
      });
      module.publishEvent({
        eventId: 'evt-2',
        eventType: 'TEST',
        originWorldId: 'world-2',
        priority: 'NORMAL',
        payload: {},
        ttlMicros: 1000000n,
      });
      const events = module.getEventHistory({ worldId: 'world-1' });
      expect(events.length).toBe(1);
      const event = events[0];
      expect(event?.originWorldId).toBe('world-1');
    });

    it('filters by event types', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TYPE_A',
        originWorldId: 'world-1',
        priority: 'NORMAL',
        payload: {},
        ttlMicros: 1000000n,
      });
      module.publishEvent({
        eventId: 'evt-2',
        eventType: 'TYPE_B',
        originWorldId: 'world-1',
        priority: 'NORMAL',
        payload: {},
        ttlMicros: 1000000n,
      });
      const events = module.getEventHistory({ eventTypes: ['TYPE_A'] });
      expect(events.length).toBe(1);
      const event = events[0];
      expect(event?.eventType).toBe('TYPE_A');
    });

    it('filters by minimum priority', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TEST',
        originWorldId: 'world-1',
        priority: 'LOW',
        payload: {},
        ttlMicros: 1000000n,
      });
      module.publishEvent({
        eventId: 'evt-2',
        eventType: 'TEST',
        originWorldId: 'world-1',
        priority: 'CRITICAL',
        payload: {},
        ttlMicros: 1000000n,
      });
      const events = module.getEventHistory({ minPriority: 'HIGH' });
      expect(events.length).toBe(1);
      const event = events[0];
      expect(event?.priority).toBe('CRITICAL');
    });

    it('combines multiple filters', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TYPE_A',
        originWorldId: 'world-1',
        priority: 'HIGH',
        payload: {},
        ttlMicros: 1000000n,
      });
      module.publishEvent({
        eventId: 'evt-2',
        eventType: 'TYPE_A',
        originWorldId: 'world-2',
        priority: 'HIGH',
        payload: {},
        ttlMicros: 1000000n,
      });
      module.publishEvent({
        eventId: 'evt-3',
        eventType: 'TYPE_B',
        originWorldId: 'world-1',
        priority: 'HIGH',
        payload: {},
        ttlMicros: 1000000n,
      });
      const events = module.getEventHistory({ worldId: 'world-1', eventTypes: ['TYPE_A'] });
      expect(events.length).toBe(1);
      const event = events[0];
      expect(event?.eventId).toBe('evt-1');
    });

    it('returns empty array when no matches', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TEST',
        originWorldId: 'world-1',
        priority: 'LOW',
        payload: {},
        ttlMicros: 1000000n,
      });
      const events = module.getEventHistory({ worldId: 'world-99' });
      expect(events.length).toBe(0);
    });
  });

  describe('pruneExpired', () => {
    it('returns zero when no events', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      const pruned = module.pruneExpired();
      expect(pruned).toBe(0);
    });

    it('removes expired events', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      clock.setTime(1000000n);
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TEST',
        originWorldId: 'world-1',
        priority: 'NORMAL',
        payload: {},
        ttlMicros: 1000000n,
      });
      clock.setTime(3000000n);
      const pruned = module.pruneExpired();
      expect(pruned).toBe(1);
    });

    it('keeps non-expired events', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      clock.setTime(1000000n);
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TEST',
        originWorldId: 'world-1',
        priority: 'NORMAL',
        payload: {},
        ttlMicros: 5000000n,
      });
      clock.setTime(3000000n);
      const pruned = module.pruneExpired();
      expect(pruned).toBe(0);
      const events = module.getEventHistory({});
      expect(events.length).toBe(1);
    });

    it('handles partial expiration', () => {
      const module = createWeaveEventBusModule({ clock: clock.clock, logger });
      clock.setTime(1000000n);
      module.publishEvent({
        eventId: 'evt-1',
        eventType: 'TEST',
        originWorldId: 'world-1',
        priority: 'NORMAL',
        payload: {},
        ttlMicros: 1000000n,
      });
      clock.setTime(2500000n);
      module.publishEvent({
        eventId: 'evt-2',
        eventType: 'TEST',
        originWorldId: 'world-1',
        priority: 'NORMAL',
        payload: {},
        ttlMicros: 5000000n,
      });
      clock.setTime(5000000n);
      const pruned = module.pruneExpired();
      expect(pruned).toBe(1);
      const events = module.getEventHistory({});
      expect(events.length).toBe(1);
      const event = events[0];
      expect(event?.eventId).toBe('evt-2');
    });
  });
});
