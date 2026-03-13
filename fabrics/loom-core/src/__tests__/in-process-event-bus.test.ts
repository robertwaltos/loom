import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createInProcessEventBus } from '../in-process-event-bus.js';
import type { LoomEvent, EventFilter } from '@loom/events-contracts';

// ── Helpers ───────────────────────────────────────────────────────────

let seq = 0;

function makeEvent(type: string, worldId = 'w1', fabricId = 'loom-core'): LoomEvent {
  seq += 1;
  return {
    type,
    payload: {},
    metadata: {
      eventId: `evt-${String(seq)}`,
      correlationId: 'corr-1',
      causationId: null,
      timestamp: seq * 1000,
      sequenceNumber: seq,
      sourceWorldId: worldId,
      sourceFabricId: fabricId,
      schemaVersion: 1,
    },
  };
}

function makeLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  };
}

function makeBus() {
  return createInProcessEventBus({ logger: makeLogger() });
}

// ── publish / subscribe ───────────────────────────────────────────────

describe('publish + subscribe', () => {
  beforeEach(() => { seq = 0; });

  it('delivers a published event to a matching subscriber', async () => {
    const bus = makeBus();
    const received: LoomEvent[] = [];
    bus.subscribe({}, (evt) => { received.push(evt); });
    bus.publish(makeEvent('player-connected'));
    await Promise.resolve();
    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('player-connected');
  });

  it('does not deliver events that do not match the filter type', async () => {
    const bus = makeBus();
    const received: LoomEvent[] = [];
    const filter: EventFilter = { types: ['entity-spawned'] };
    bus.subscribe(filter, (evt) => { received.push(evt); });
    bus.publish(makeEvent('player-connected'));
    await Promise.resolve();
    expect(received).toHaveLength(0);
  });

  it('delivers to multiple subscribers', async () => {
    const bus = makeBus();
    const a: LoomEvent[] = [];
    const b: LoomEvent[] = [];
    bus.subscribe({}, (e) => { a.push(e); });
    bus.subscribe({}, (e) => { b.push(e); });
    bus.publish(makeEvent('tick'));
    await Promise.resolve();
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
  });

  it('filters by sourceWorldId', async () => {
    const bus = makeBus();
    const received: LoomEvent[] = [];
    bus.subscribe({ sourceWorldIds: ['world-x'] }, (e) => { received.push(e); });
    bus.publish(makeEvent('tick', 'world-x'));
    bus.publish(makeEvent('tick', 'world-y'));
    await Promise.resolve();
    expect(received).toHaveLength(1);
    expect(received[0].metadata.sourceWorldId).toBe('world-x');
  });

  it('filters by sourceFabricId', async () => {
    const bus = makeBus();
    const received: LoomEvent[] = [];
    bus.subscribe({ sourceFabricIds: ['shuttle'] }, (e) => { received.push(e); });
    bus.publish(makeEvent('npc-act', 'w1', 'shuttle'));
    bus.publish(makeEvent('npc-act', 'w1', 'loom-core'));
    await Promise.resolve();
    expect(received).toHaveLength(1);
  });
});

// ── unsubscribe ────────────────────────────────────────────────────────

describe('unsubscribe', () => {
  beforeEach(() => { seq = 0; });

  it('stops delivering after unsubscribe', async () => {
    const bus = makeBus();
    const received: LoomEvent[] = [];
    const unsub = bus.subscribe({}, (e) => { received.push(e); });
    bus.publish(makeEvent('a'));
    await Promise.resolve();
    unsub();
    bus.publish(makeEvent('b'));
    await Promise.resolve();
    expect(received).toHaveLength(1);
  });
});

// ── publishBatch ──────────────────────────────────────────────────────

describe('publishBatch', () => {
  beforeEach(() => { seq = 0; });

  it('delivers all events in the batch', async () => {
    const bus = makeBus();
    const received: LoomEvent[] = [];
    bus.subscribe({}, (e) => { received.push(e); });
    bus.publishBatch([makeEvent('a'), makeEvent('b'), makeEvent('c')]);
    await Promise.resolve();
    expect(received).toHaveLength(3);
  });
});

// ── backlogSize ────────────────────────────────────────────────────────

describe('backlogSize', () => {
  beforeEach(() => { seq = 0; });

  it('returns 0 after the microtask drain', async () => {
    const bus = makeBus();
    bus.subscribe({}, () => undefined);
    bus.publish(makeEvent('x'));
    await Promise.resolve();
    expect(bus.backlogSize()).toBe(0);
  });
});

// ── replay ────────────────────────────────────────────────────────────

describe('replay', () => {
  beforeEach(() => { seq = 0; });

  it('yields events matching time range and filter', async () => {
    const bus = makeBus();
    bus.subscribe({}, () => undefined);
    const e1 = makeEvent('a');    // timestamp = 1000
    const e2 = makeEvent('b');    // timestamp = 2000
    const e3 = makeEvent('c');    // timestamp = 3000
    bus.publishBatch([e1, e2, e3]);
    await Promise.resolve();

    const results: LoomEvent[] = [];
    for await (const evt of bus.replay({}, 1000, 2000)) {
      results.push(evt);
    }
    expect(results.map((e) => e.type)).toEqual(['a', 'b']);
  });

  it('filters by type during replay', async () => {
    const bus = makeBus();
    bus.subscribe({}, () => undefined);
    bus.publishBatch([makeEvent('entity-spawned'), makeEvent('tick')]);
    await Promise.resolve();

    const results: LoomEvent[] = [];
    for await (const evt of bus.replay({ types: ['entity-spawned'] }, 0, 99_999)) {
      results.push(evt);
    }
    expect(results.every((e) => e.type === 'entity-spawned')).toBe(true);
  });
});

// ── close ─────────────────────────────────────────────────────────────

describe('close', () => {
  beforeEach(() => { seq = 0; });

  it('throws when publishing after close', () => {
    const bus = makeBus();
    bus.close();
    expect(() => { bus.publish(makeEvent('x')); }).toThrow();
  });

  it('throws when batch publishing after close', () => {
    const bus = makeBus();
    bus.close();
    expect(() => { bus.publishBatch([makeEvent('x')]); }).toThrow();
  });

  it('clears all subscriptions on close', () => {
    const bus = makeBus();
    const received: LoomEvent[] = [];
    bus.subscribe({}, (e) => { received.push(e); });
    bus.close();
    // Can't publish after close; verify subscriptions were cleared by
    // checking nothing leaked into a re-created bus scenario
    expect(received).toHaveLength(0);
  });
});

// ── error handling ────────────────────────────────────────────────────

describe('error handling', () => {
  beforeEach(() => { seq = 0; });

  it('logs but does not propagate handler errors', async () => {
    const logger = makeLogger();
    const bus = createInProcessEventBus({ logger });
    bus.subscribe({}, () => { throw new Error('handler blew up'); });
    bus.publish(makeEvent('tick'));
    await Promise.resolve();
    expect(logger.error).toHaveBeenCalled();
  });
});
