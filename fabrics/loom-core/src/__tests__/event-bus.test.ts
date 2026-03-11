import { describe, it, expect, vi } from 'vitest';
import { createInProcessEventBus } from '../in-process-event-bus.js';
import { createSilentLogger } from '../logger.js';
import type { LoomEvent, EventMetadata } from '@loom/events-contracts';

function makeEvent(type = 'test.event', seq = 1): LoomEvent {
  const metadata: EventMetadata = {
    eventId: `evt-${String(seq)}`,
    correlationId: `corr-${String(seq)}`,
    causationId: null,
    timestamp: Date.now() * 1000,
    sequenceNumber: seq,
    sourceWorldId: 'world-1',
    sourceFabricId: 'loom-core',
    schemaVersion: 1,
  };
  return { type, payload: { seq }, metadata };
}

function createBus() {
  return createInProcessEventBus({
    logger: createSilentLogger(),
    historyCapacity: 100,
  });
}

describe('InProcessEventBus delivery', () => {
  it('delivers events to subscribers asynchronously', async () => {
    const bus = createBus();
    const received: LoomEvent[] = [];
    bus.subscribe({}, (event) => {
      received.push(event);
    });

    bus.publish(makeEvent());
    expect(received).toHaveLength(0);

    await Promise.resolve();
    expect(received).toHaveLength(1);
    bus.close();
  });

  it('filters by event type', async () => {
    const bus = createBus();
    const received: LoomEvent[] = [];
    bus.subscribe({ types: ['entity.spawned'] }, (event) => {
      received.push(event);
    });

    bus.publish(makeEvent('entity.spawned'));
    bus.publish(makeEvent('entity.despawned'));

    await Promise.resolve();
    expect(received).toHaveLength(1);
    expect(received[0]?.type).toBe('entity.spawned');
    bus.close();
  });

  it('publishes batches atomically', async () => {
    const bus = createBus();
    const received: LoomEvent[] = [];
    bus.subscribe({}, (event) => {
      received.push(event);
    });

    bus.publishBatch([makeEvent('a', 1), makeEvent('b', 2), makeEvent('c', 3)]);

    await Promise.resolve();
    expect(received).toHaveLength(3);
    bus.close();
  });
});

describe('InProcessEventBus lifecycle', () => {
  it('unsubscribe stops delivery', async () => {
    const bus = createBus();
    const received: LoomEvent[] = [];
    const unsub = bus.subscribe({}, (event) => {
      received.push(event);
    });

    unsub();
    bus.publish(makeEvent());

    await Promise.resolve();
    expect(received).toHaveLength(0);
    bus.close();
  });

  it('reports backlog size correctly', () => {
    const bus = createBus();
    expect(bus.backlogSize()).toBe(0);

    bus.publish(makeEvent());
    expect(bus.backlogSize()).toBe(1);
    bus.close();
  });

  it('throws when publishing after close', () => {
    const bus = createBus();
    bus.close();
    expect(() => {
      bus.publish(makeEvent());
    }).toThrow('Event bus is closed');
  });
});

describe('InProcessEventBus error handling', () => {
  it('catches handler errors without breaking delivery', async () => {
    const errorFn = vi.fn();
    const logger = { ...createSilentLogger(), error: errorFn };
    const bus = createInProcessEventBus({ logger });
    const received: LoomEvent[] = [];

    bus.subscribe({}, () => {
      throw new Error('handler broke');
    });
    bus.subscribe({}, (event) => {
      received.push(event);
    });

    bus.publish(makeEvent());
    await Promise.resolve();

    expect(received).toHaveLength(1);
    expect(errorFn).toHaveBeenCalled();
    bus.close();
  });
});

describe('InProcessEventBus replay', () => {
  it('replays events within time range', async () => {
    const bus = createBus();
    const now = Date.now() * 1000;
    bus.publish(makeEvent('a', 1));
    bus.publish(makeEvent('b', 2));

    const replayed: LoomEvent[] = [];
    for await (const event of bus.replay({}, 0, now + 1_000_000)) {
      replayed.push(event);
    }

    expect(replayed).toHaveLength(2);
    bus.close();
  });
});
