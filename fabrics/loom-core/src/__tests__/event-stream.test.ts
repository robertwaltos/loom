import { describe, it, expect, beforeEach } from 'vitest';
import { createEventStream, type EventStreamDeps, type StreamEvent } from '../event-stream.js';

function createMockDeps(): EventStreamDeps & { setTime: (t: bigint) => void } {
  let currentTime = BigInt(1000000);
  const logs: Array<{ level: string; msg: string; ctx: Record<string, unknown> }> = [];

  return {
    clock: {
      nowMicroseconds: () => currentTime,
    },
    logger: {
      info: (msg, ctx) => {
        logs.push({ level: 'info', msg, ctx });
      },
      warn: (msg, ctx) => {
        logs.push({ level: 'warn', msg, ctx });
      },
    },
    setTime: (t: bigint) => {
      currentTime = t;
    },
  };
}

const SECOND = BigInt(1000000);
const MINUTE = BigInt(60 * 1000000);
const HOUR = BigInt(60 * 60 * 1000000);

describe('EventStream', () => {
  let deps: EventStreamDeps & { setTime: (t: bigint) => void };

  beforeEach(() => {
    deps = createMockDeps();
  });

  describe('publishToStream', () => {
    it('publishes event to stream', () => {
      const stream = createEventStream(deps);
      const payload = { action: 'test', value: 42 };

      const eventId = stream.publishToStream('stream-1', 'TEST_EVENT', payload, HOUR);

      expect(eventId).toBeTruthy();
    });

    it('generates unique event IDs', () => {
      const stream = createEventStream(deps);
      const payload = { action: 'test' };

      const id1 = stream.publishToStream('stream-1', 'TEST', payload, HOUR);
      const id2 = stream.publishToStream('stream-1', 'TEST', payload, HOUR);

      expect(id1).not.toBe(id2);
    });

    it('stores events in stream', () => {
      const stream = createEventStream(deps);
      const payload = { action: 'test' };

      stream.publishToStream('stream-1', 'TEST', payload, HOUR);

      const stats = stream.getStats('stream-1');
      expect(stats.totalEvents).toBe(1);
    });

    it('publishes multiple events to same stream', () => {
      const stream = createEventStream(deps);

      stream.publishToStream('stream-1', 'EVENT_A', {}, HOUR);
      stream.publishToStream('stream-1', 'EVENT_B', {}, HOUR);
      stream.publishToStream('stream-1', 'EVENT_C', {}, HOUR);

      const stats = stream.getStats('stream-1');
      expect(stats.totalEvents).toBe(3);
    });

    it('publishes to multiple streams independently', () => {
      const stream = createEventStream(deps);

      stream.publishToStream('stream-1', 'EVENT_A', {}, HOUR);
      stream.publishToStream('stream-2', 'EVENT_B', {}, HOUR);

      const stats1 = stream.getStats('stream-1');
      const stats2 = stream.getStats('stream-2');

      expect(stats1.totalEvents).toBe(1);
      expect(stats2.totalEvents).toBe(1);
    });

    it('sets expiration time based on TTL', () => {
      const stream = createEventStream(deps);
      deps.setTime(BigInt(1000000));

      stream.publishToStream('stream-1', 'TEST', {}, HOUR);

      const cursor = stream.createCursor('stream-1', BigInt(0));
      const result = stream.replayFrom(cursor, 10);

      if (typeof result === 'string') {
        throw new Error('Expected replay result');
      }

      const event = result.events[0];
      if (event === undefined) {
        throw new Error('Expected event');
      }

      const expectedExpiry = BigInt(1000000) + HOUR;
      expect(event.expiresAtMicros).toBe(expectedExpiry);
    });
  });

  describe('createCursor', () => {
    it('creates cursor for stream', () => {
      const stream = createEventStream(deps);
      const cursorId = stream.createCursor('stream-1', BigInt(0));
      expect(cursorId).toBeTruthy();
    });

    it('creates multiple cursors', () => {
      const stream = createEventStream(deps);
      const cursor1 = stream.createCursor('stream-1', BigInt(0));
      const cursor2 = stream.createCursor('stream-1', BigInt(100));
      const cursor3 = stream.createCursor('stream-2', BigInt(0));

      expect(cursor1).not.toBe(cursor2);
      expect(cursor2).not.toBe(cursor3);
    });

    it('creates cursor at specified position', () => {
      const stream = createEventStream(deps);

      stream.publishToStream('stream-1', 'EVENT_1', {}, HOUR);
      deps.setTime(BigInt(2000000));
      stream.publishToStream('stream-1', 'EVENT_2', {}, HOUR);

      const cursor = stream.createCursor('stream-1', BigInt(1500000));
      const result = stream.replayFrom(cursor, 10);

      if (typeof result === 'string') {
        throw new Error('Expected replay result');
      }

      expect(result.events).toHaveLength(1);
    });
  });

  describe('replayFrom', () => {
    it('returns error if cursor not found', () => {
      const stream = createEventStream(deps);
      const result = stream.replayFrom('nonexistent', 10);
      expect(result).toBe('CURSOR_NOT_FOUND');
    });

    it('returns empty result for empty stream', () => {
      const stream = createEventStream(deps);
      const cursor = stream.createCursor('stream-1', BigInt(0));
      const result = stream.replayFrom(cursor, 10);

      if (typeof result === 'string') {
        throw new Error('Expected replay result');
      }

      expect(result.events).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });

    it('replays events after cursor position', () => {
      const stream = createEventStream(deps);

      deps.setTime(BigInt(1000000));
      stream.publishToStream('stream-1', 'EVENT_1', { num: 1 }, HOUR);

      deps.setTime(BigInt(2000000));
      stream.publishToStream('stream-1', 'EVENT_2', { num: 2 }, HOUR);

      const cursor = stream.createCursor('stream-1', BigInt(1500000));
      const result = stream.replayFrom(cursor, 10);

      if (typeof result === 'string') {
        throw new Error('Expected replay result');
      }

      expect(result.events).toHaveLength(1);
      const event = result.events[0];
      if (event === undefined) {
        throw new Error('Expected event');
      }
      expect(event.eventType).toBe('EVENT_2');
    });

    it('respects maxEvents limit', () => {
      const stream = createEventStream(deps);

      for (let i = 0; i < 10; i = i + 1) {
        deps.setTime(BigInt(1000000 + i * 1000));
        stream.publishToStream('stream-1', 'EVENT', { i }, HOUR);
      }

      const cursor = stream.createCursor('stream-1', BigInt(0));
      const result = stream.replayFrom(cursor, 5);

      if (typeof result === 'string') {
        throw new Error('Expected replay result');
      }

      expect(result.events).toHaveLength(5);
      expect(result.hasMore).toBe(true);
    });

    it('indicates hasMore correctly when more events exist', () => {
      const stream = createEventStream(deps);

      for (let i = 0; i < 10; i = i + 1) {
        deps.setTime(BigInt(1000000 + i * 1000));
        stream.publishToStream('stream-1', 'EVENT', { i }, HOUR);
      }

      const cursor = stream.createCursor('stream-1', BigInt(0));
      const result = stream.replayFrom(cursor, 5);

      if (typeof result === 'string') {
        throw new Error('Expected replay result');
      }

      expect(result.hasMore).toBe(true);
    });

    it('indicates hasMore false when no more events', () => {
      const stream = createEventStream(deps);

      for (let i = 0; i < 5; i = i + 1) {
        deps.setTime(BigInt(1000000 + i * 1000));
        stream.publishToStream('stream-1', 'EVENT', { i }, HOUR);
      }

      const cursor = stream.createCursor('stream-1', BigInt(0));
      const result = stream.replayFrom(cursor, 10);

      if (typeof result === 'string') {
        throw new Error('Expected replay result');
      }

      expect(result.hasMore).toBe(false);
    });

    it('updates cursor position after replay', () => {
      const stream = createEventStream(deps);

      deps.setTime(BigInt(1000000));
      stream.publishToStream('stream-1', 'EVENT_1', {}, HOUR);

      deps.setTime(BigInt(2000000));
      stream.publishToStream('stream-1', 'EVENT_2', {}, HOUR);

      const cursor = stream.createCursor('stream-1', BigInt(0));
      stream.replayFrom(cursor, 1);

      const result2 = stream.replayFrom(cursor, 1);

      if (typeof result2 === 'string') {
        throw new Error('Expected replay result');
      }

      expect(result2.events).toHaveLength(1);
      const event = result2.events[0];
      if (event === undefined) {
        throw new Error('Expected event');
      }
      expect(event.eventType).toBe('EVENT_2');
    });

    it('allows replay from beginning', () => {
      const stream = createEventStream(deps);

      stream.publishToStream('stream-1', 'EVENT_1', {}, HOUR);
      stream.publishToStream('stream-1', 'EVENT_2', {}, HOUR);

      const cursor = stream.createCursor('stream-1', BigInt(0));
      const result = stream.replayFrom(cursor, 10);

      if (typeof result === 'string') {
        throw new Error('Expected replay result');
      }

      expect(result.events).toHaveLength(2);
    });
  });

  describe('subscribe', () => {
    it('creates subscription to stream', () => {
      const stream = createEventStream(deps);
      const subscriptionId = stream.subscribe('stream-1', () => {});
      expect(subscriptionId).toBeTruthy();
    });

    it('notifies subscriber on new event', () => {
      const stream = createEventStream(deps);

      let received: StreamEvent | null = null;
      stream.subscribe('stream-1', (event) => {
        received = event;
      });

      stream.publishToStream('stream-1', 'TEST', { value: 42 }, HOUR);

      expect(received).not.toBe(null);
      const event = received as unknown as StreamEvent;
      expect(event.eventType).toBe('TEST');
    });

    it('notifies all subscribers', () => {
      const stream = createEventStream(deps);

      let count = 0;
      stream.subscribe('stream-1', () => {
        count = count + 1;
      });
      stream.subscribe('stream-1', () => {
        count = count + 1;
      });
      stream.subscribe('stream-1', () => {
        count = count + 1;
      });

      stream.publishToStream('stream-1', 'TEST', {}, HOUR);

      expect(count).toBe(3);
    });

    it('does not notify subscribers of other streams', () => {
      const stream = createEventStream(deps);

      let notified = false;
      stream.subscribe('stream-1', () => {
        notified = true;
      });

      stream.publishToStream('stream-2', 'TEST', {}, HOUR);

      expect(notified).toBe(false);
    });

    it('provides event payload to subscriber', () => {
      const stream = createEventStream(deps);

      let receivedPayload: Record<string, unknown> | null = null;
      stream.subscribe('stream-1', (event) => {
        receivedPayload = event.payload;
      });

      const payload = { action: 'test', value: 42 };
      stream.publishToStream('stream-1', 'TEST', payload, HOUR);

      expect(receivedPayload).toEqual(payload);
    });
  });

  describe('unsubscribe', () => {
    it('unsubscribes active subscription', () => {
      const stream = createEventStream(deps);
      const subId = stream.subscribe('stream-1', () => {});

      const result = stream.unsubscribe(subId);
      expect(result).toBe('OK');
    });

    it('returns error if subscription not found', () => {
      const stream = createEventStream(deps);
      const result = stream.unsubscribe('nonexistent');
      expect(result).toBe('SUBSCRIPTION_NOT_FOUND');
    });

    it('stops notifying unsubscribed subscriber', () => {
      const stream = createEventStream(deps);

      let notified = false;
      const subId = stream.subscribe('stream-1', () => {
        notified = true;
      });

      stream.unsubscribe(subId);
      stream.publishToStream('stream-1', 'TEST', {}, HOUR);

      expect(notified).toBe(false);
    });

    it('does not affect other subscribers', () => {
      const stream = createEventStream(deps);

      let count = 0;
      const sub1 = stream.subscribe('stream-1', () => {
        count = count + 1;
      });
      stream.subscribe('stream-1', () => {
        count = count + 1;
      });

      stream.unsubscribe(sub1);
      stream.publishToStream('stream-1', 'TEST', {}, HOUR);

      expect(count).toBe(1);
    });
  });

  describe('pruneExpired', () => {
    it('returns zero for empty stream', () => {
      const stream = createEventStream(deps);
      const count = stream.pruneExpired('stream-1');
      expect(count).toBe(0);
    });

    it('does not prune unexpired events', () => {
      const stream = createEventStream(deps);

      deps.setTime(BigInt(1000000));
      stream.publishToStream('stream-1', 'EVENT', {}, HOUR);

      deps.setTime(BigInt(2000000));
      const count = stream.pruneExpired('stream-1');

      expect(count).toBe(0);
    });

    it('prunes expired events', () => {
      const stream = createEventStream(deps);

      deps.setTime(BigInt(1000000));
      stream.publishToStream('stream-1', 'EVENT', {}, MINUTE);

      deps.setTime(BigInt(1000000) + MINUTE + SECOND);
      const count = stream.pruneExpired('stream-1');

      expect(count).toBe(1);
    });

    it('removes expired events from stream', () => {
      const stream = createEventStream(deps);

      deps.setTime(BigInt(1000000));
      stream.publishToStream('stream-1', 'EVENT', {}, MINUTE);

      deps.setTime(BigInt(1000000) + MINUTE + SECOND);
      stream.pruneExpired('stream-1');

      const stats = stream.getStats('stream-1');
      expect(stats.totalEvents).toBe(0);
    });

    it('keeps unexpired events while pruning expired ones', () => {
      const stream = createEventStream(deps);

      deps.setTime(BigInt(1000000));
      stream.publishToStream('stream-1', 'EVENT_1', {}, MINUTE);

      deps.setTime(BigInt(2000000));
      stream.publishToStream('stream-1', 'EVENT_2', {}, HOUR);

      deps.setTime(BigInt(1000000) + MINUTE + SECOND);
      const count = stream.pruneExpired('stream-1');

      expect(count).toBe(1);

      const stats = stream.getStats('stream-1');
      expect(stats.totalEvents).toBe(1);
    });

    it('prunes multiple expired events', () => {
      const stream = createEventStream(deps);

      deps.setTime(BigInt(1000000));
      stream.publishToStream('stream-1', 'EVENT_1', {}, MINUTE);
      stream.publishToStream('stream-1', 'EVENT_2', {}, MINUTE);
      stream.publishToStream('stream-1', 'EVENT_3', {}, MINUTE);

      deps.setTime(BigInt(1000000) + MINUTE + SECOND);
      const count = stream.pruneExpired('stream-1');

      expect(count).toBe(3);
    });
  });

  describe('pruneAllStreams', () => {
    it('returns zero when no streams exist', () => {
      const stream = createEventStream(deps);
      const count = stream.pruneAllStreams();
      expect(count).toBe(0);
    });

    it('prunes expired events from all streams', () => {
      const stream = createEventStream(deps);

      deps.setTime(BigInt(1000000));
      stream.publishToStream('stream-1', 'EVENT', {}, MINUTE);
      stream.publishToStream('stream-2', 'EVENT', {}, MINUTE);
      stream.publishToStream('stream-3', 'EVENT', {}, MINUTE);

      deps.setTime(BigInt(1000000) + MINUTE + SECOND);
      const count = stream.pruneAllStreams();

      expect(count).toBe(3);
    });

    it('prunes selectively across multiple streams', () => {
      const stream = createEventStream(deps);

      deps.setTime(BigInt(1000000));
      stream.publishToStream('stream-1', 'EVENT', {}, MINUTE);

      deps.setTime(BigInt(2000000));
      stream.publishToStream('stream-2', 'EVENT', {}, HOUR);

      deps.setTime(BigInt(1000000) + MINUTE + SECOND);
      const count = stream.pruneAllStreams();

      expect(count).toBe(1);
    });
  });

  describe('getStats', () => {
    it('returns empty stats for nonexistent stream', () => {
      const stream = createEventStream(deps);
      const stats = stream.getStats('stream-1');

      expect(stats.totalEvents).toBe(0);
      expect(stats.oldestEventMicros).toBe(null);
      expect(stats.newestEventMicros).toBe(null);
    });

    it('returns correct event count', () => {
      const stream = createEventStream(deps);

      stream.publishToStream('stream-1', 'EVENT_1', {}, HOUR);
      stream.publishToStream('stream-1', 'EVENT_2', {}, HOUR);
      stream.publishToStream('stream-1', 'EVENT_3', {}, HOUR);

      const stats = stream.getStats('stream-1');
      expect(stats.totalEvents).toBe(3);
    });

    it('tracks oldest event timestamp', () => {
      const stream = createEventStream(deps);

      deps.setTime(BigInt(1000000));
      stream.publishToStream('stream-1', 'EVENT_1', {}, HOUR);

      deps.setTime(BigInt(2000000));
      stream.publishToStream('stream-1', 'EVENT_2', {}, HOUR);

      const stats = stream.getStats('stream-1');
      expect(stats.oldestEventMicros).toBe(BigInt(1000000));
    });

    it('tracks newest event timestamp', () => {
      const stream = createEventStream(deps);

      deps.setTime(BigInt(1000000));
      stream.publishToStream('stream-1', 'EVENT_1', {}, HOUR);

      deps.setTime(BigInt(2000000));
      stream.publishToStream('stream-1', 'EVENT_2', {}, HOUR);

      const stats = stream.getStats('stream-1');
      expect(stats.newestEventMicros).toBe(BigInt(2000000));
    });

    it('counts active subscriptions', () => {
      const stream = createEventStream(deps);

      stream.subscribe('stream-1', () => {});
      stream.subscribe('stream-1', () => {});
      const sub3 = stream.subscribe('stream-1', () => {});

      stream.unsubscribe(sub3);

      const stats = stream.getStats('stream-1');
      expect(stats.activeSubscriptions).toBe(2);
    });

    it('estimates total bytes', () => {
      const stream = createEventStream(deps);

      stream.publishToStream('stream-1', 'EVENT', { value: 42 }, HOUR);

      const stats = stream.getStats('stream-1');
      expect(stats.totalBytesEstimate).toBeGreaterThan(0);
    });
  });

  describe('getAllStreams', () => {
    it('returns empty array when no streams exist', () => {
      const stream = createEventStream(deps);
      const streams = stream.getAllStreams();
      expect(streams).toHaveLength(0);
    });

    it('returns all stream IDs', () => {
      const stream = createEventStream(deps);

      stream.publishToStream('stream-1', 'EVENT', {}, HOUR);
      stream.publishToStream('stream-2', 'EVENT', {}, HOUR);
      stream.publishToStream('stream-3', 'EVENT', {}, HOUR);

      const streams = stream.getAllStreams();
      expect(streams).toHaveLength(3);
      expect(streams).toContain('stream-1');
      expect(streams).toContain('stream-2');
      expect(streams).toContain('stream-3');
    });

    it('does not duplicate stream IDs', () => {
      const stream = createEventStream(deps);

      stream.publishToStream('stream-1', 'EVENT_1', {}, HOUR);
      stream.publishToStream('stream-1', 'EVENT_2', {}, HOUR);
      stream.publishToStream('stream-1', 'EVENT_3', {}, HOUR);

      const streams = stream.getAllStreams();
      expect(streams).toHaveLength(1);
    });
  });

  describe('full workflow', () => {
    it('supports publish-subscribe-replay workflow', () => {
      const stream = createEventStream(deps);

      let liveEvent: StreamEvent | null = null;
      stream.subscribe('stream-1', (event) => {
        liveEvent = event;
      });

      deps.setTime(BigInt(1000000));
      stream.publishToStream('stream-1', 'EVENT_1', { num: 1 }, HOUR);

      deps.setTime(BigInt(2000000));
      stream.publishToStream('stream-1', 'EVENT_2', { num: 2 }, HOUR);

      expect(liveEvent).not.toBe(null);

      const cursor = stream.createCursor('stream-1', BigInt(0));
      const replay = stream.replayFrom(cursor, 10);

      if (typeof replay === 'string') {
        throw new Error('Expected replay result');
      }

      expect(replay.events).toHaveLength(2);
    });

    it('handles event expiration in active stream', () => {
      const stream = createEventStream(deps);

      deps.setTime(BigInt(1000000));
      stream.publishToStream('stream-1', 'OLD_EVENT', {}, MINUTE);

      deps.setTime(BigInt(2000000));
      stream.publishToStream('stream-1', 'NEW_EVENT', {}, HOUR);

      deps.setTime(BigInt(1000000) + MINUTE + SECOND);
      stream.pruneExpired('stream-1');

      const cursor = stream.createCursor('stream-1', BigInt(0));
      const replay = stream.replayFrom(cursor, 10);

      if (typeof replay === 'string') {
        throw new Error('Expected replay result');
      }

      expect(replay.events).toHaveLength(1);
      const event = replay.events[0];
      if (event === undefined) {
        throw new Error('Expected event');
      }
      expect(event.eventType).toBe('NEW_EVENT');
    });
  });
});
