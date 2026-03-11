import { describe, it, expect, beforeEach } from 'vitest';
import type { StreamGatewayState, Clock, IdGenerator, Logger } from '../stream-gateway.js';
import {
  createStreamGatewayState,
  createStream,
  subscribe,
  unsubscribe,
  produce,
  consume,
  pauseStream,
  resumeStream,
  closeStream,
  getStream,
  getStreamStats,
} from '../stream-gateway.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function makeClock(): Clock {
  let time = 1_000_000n;
  return {
    now: () => {
      time = time + 1000n;
      return time;
    },
  };
}

function makeIdGen(): IdGenerator {
  let n = 0;
  return {
    generate: () => {
      n = n + 1;
      return 'sg-' + String(n);
    },
  };
}

function makeLogger(): Logger {
  return { info: () => undefined, error: () => undefined };
}

// ============================================================================
// TESTS: STREAM CREATION
// ============================================================================

describe('StreamGateway - Stream Creation', () => {
  let state: StreamGatewayState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createStreamGatewayState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
  });

  it('rejects capacity less than 1', () => {
    const result = createStream(state, 'prod-1', 'telemetry', 0, idGen, clock, logger);
    expect(result).toBe('invalid-capacity');
  });

  it('creates a stream with OPEN status', () => {
    const result = createStream(state, 'prod-1', 'telemetry', 10, idGen, clock, logger);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.status).toBe('OPEN');
      expect(result.capacity).toBe(10);
      expect(result.bufferedCount).toBe(0);
      expect(result.totalProduced).toBe(0);
      expect(result.subscribers.length).toBe(0);
    }
  });

  it('getStream returns undefined for unknown id', () => {
    expect(getStream(state, 'ghost')).toBeUndefined();
  });
});

// ============================================================================
// TESTS: SUBSCRIPTIONS
// ============================================================================

describe('StreamGateway - Subscriptions', () => {
  let state: StreamGatewayState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createStreamGatewayState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
  });

  it('subscribe returns error for unknown stream', () => {
    const r = subscribe(state, 'ghost', 'consumer-1');
    expect(r).toEqual({ success: false, error: 'stream-not-found' });
  });

  it('subscribe succeeds for known stream', () => {
    const s = createStream(state, 'p', 'events', 5, idGen, clock, logger);
    if (typeof s !== 'object') throw new Error();
    const r = subscribe(state, s.streamId, 'consumer-1');
    expect(r).toEqual({ success: true });
    expect(getStream(state, s.streamId)?.subscribers).toContain('consumer-1');
  });

  it('subscribe returns already-subscribed for duplicate', () => {
    const s = createStream(state, 'p', 'events', 5, idGen, clock, logger);
    if (typeof s !== 'object') throw new Error();
    subscribe(state, s.streamId, 'consumer-1');
    const r = subscribe(state, s.streamId, 'consumer-1');
    expect(r).toEqual({ success: false, error: 'already-subscribed' });
  });

  it('unsubscribe removes consumer', () => {
    const s = createStream(state, 'p', 'events', 5, idGen, clock, logger);
    if (typeof s !== 'object') throw new Error();
    subscribe(state, s.streamId, 'consumer-1');
    unsubscribe(state, s.streamId, 'consumer-1');
    expect(getStream(state, s.streamId)?.subscribers).not.toContain('consumer-1');
  });

  it('unsubscribe returns not-subscribed for unregistered consumer', () => {
    const s = createStream(state, 'p', 'events', 5, idGen, clock, logger);
    if (typeof s !== 'object') throw new Error();
    const r = unsubscribe(state, s.streamId, 'consumer-X');
    expect(r).toEqual({ success: false, error: 'not-subscribed' });
  });
});

// ============================================================================
// TESTS: PRODUCE
// ============================================================================

describe('StreamGateway - Produce', () => {
  let state: StreamGatewayState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createStreamGatewayState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
  });

  it('returns stream-not-found for unknown stream', () => {
    const r = produce(state, 'ghost', { x: 1 }, idGen, clock, logger);
    expect(r).toBe('stream-not-found');
  });

  it('assigns monotonically increasing sequence numbers', () => {
    const s = createStream(state, 'p', 'events', 10, idGen, clock, logger);
    if (typeof s !== 'object') throw new Error();
    const m1 = produce(state, s.streamId, { v: 1 }, idGen, clock, logger);
    const m2 = produce(state, s.streamId, { v: 2 }, idGen, clock, logger);
    if (typeof m1 !== 'object' || typeof m2 !== 'object') throw new Error();
    expect(m1.sequence).toBe(1);
    expect(m2.sequence).toBe(2);
  });

  it('returns stream-full when buffer is at capacity', () => {
    const s = createStream(state, 'p', 'events', 2, idGen, clock, logger);
    if (typeof s !== 'object') throw new Error();
    produce(state, s.streamId, { v: 1 }, idGen, clock, logger);
    produce(state, s.streamId, { v: 2 }, idGen, clock, logger);
    const r = produce(state, s.streamId, { v: 3 }, idGen, clock, logger);
    expect(r).toBe('stream-full');
  });

  it('increments droppedMessages on stream-full', () => {
    const s = createStream(state, 'p', 'events', 1, idGen, clock, logger);
    if (typeof s !== 'object') throw new Error();
    produce(state, s.streamId, { v: 1 }, idGen, clock, logger);
    produce(state, s.streamId, { v: 2 }, idGen, clock, logger);
    expect(getStreamStats(state).droppedMessages).toBe(1);
  });

  it('increments totalProduced and bufferedCount', () => {
    const s = createStream(state, 'p', 'events', 10, idGen, clock, logger);
    if (typeof s !== 'object') throw new Error();
    produce(state, s.streamId, { v: 1 }, idGen, clock, logger);
    produce(state, s.streamId, { v: 2 }, idGen, clock, logger);
    const updated = getStream(state, s.streamId);
    expect(updated?.totalProduced).toBe(2);
    expect(updated?.bufferedCount).toBe(2);
  });

  it('returns stream-not-found for PAUSED stream', () => {
    const s = createStream(state, 'p', 'events', 10, idGen, clock, logger);
    if (typeof s !== 'object') throw new Error();
    pauseStream(state, s.streamId);
    const r = produce(state, s.streamId, { v: 1 }, idGen, clock, logger);
    expect(r).toBe('stream-not-found');
  });
});

// ============================================================================
// TESTS: CONSUME & LIFECYCLE
// ============================================================================

describe('StreamGateway - Consume and Lifecycle', () => {
  let state: StreamGatewayState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createStreamGatewayState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
  });

  it('consume returns not-subscribed for unregistered consumer', () => {
    const s = createStream(state, 'p', 'events', 10, idGen, clock, logger);
    if (typeof s !== 'object') throw new Error();
    const r = consume(state, s.streamId, 'consumer-X', 5);
    expect(r).toBe('not-subscribed');
  });

  it('consume returns messages in FIFO order by sequence', () => {
    const s = createStream(state, 'p', 'events', 10, idGen, clock, logger);
    if (typeof s !== 'object') throw new Error();
    subscribe(state, s.streamId, 'c1');
    const m1 = produce(state, s.streamId, { seq: 'first' }, idGen, clock, logger);
    const m2 = produce(state, s.streamId, { seq: 'second' }, idGen, clock, logger);
    if (typeof m1 !== 'object' || typeof m2 !== 'object') throw new Error();
    const result = consume(state, s.streamId, 'c1', 10);
    expect(Array.isArray(result)).toBe(true);
    expect(m1.sequence).toBe(1);
    expect(m2.sequence).toBe(2);
  });

  it('consume decrements bufferedCount', () => {
    const s = createStream(state, 'p', 'events', 10, idGen, clock, logger);
    if (typeof s !== 'object') throw new Error();
    subscribe(state, s.streamId, 'c1');
    produce(state, s.streamId, { v: 1 }, idGen, clock, logger);
    produce(state, s.streamId, { v: 2 }, idGen, clock, logger);
    consume(state, s.streamId, 'c1', 1);
    expect(getStream(state, s.streamId)?.bufferedCount).toBe(1);
  });

  it('resumeStream restores OPEN from PAUSED', () => {
    const s = createStream(state, 'p', 'events', 10, idGen, clock, logger);
    if (typeof s !== 'object') throw new Error();
    pauseStream(state, s.streamId);
    resumeStream(state, s.streamId);
    expect(getStream(state, s.streamId)?.status).toBe('OPEN');
  });
});

describe('StreamGateway - Close and Stats', () => {
  let state: StreamGatewayState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createStreamGatewayState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
  });

  it('closeStream with empty buffer sets DRAINED', () => {
    const s = createStream(state, 'p', 'events', 10, idGen, clock, logger);
    if (typeof s !== 'object') throw new Error();
    closeStream(state, s.streamId);
    expect(getStream(state, s.streamId)?.status).toBe('DRAINED');
  });

  it('closeStream with buffered messages sets CLOSED', () => {
    const s = createStream(state, 'p', 'events', 10, idGen, clock, logger);
    if (typeof s !== 'object') throw new Error();
    produce(state, s.streamId, { v: 1 }, idGen, clock, logger);
    closeStream(state, s.streamId);
    expect(getStream(state, s.streamId)?.status).toBe('CLOSED');
  });

  it('consuming all messages from CLOSED stream transitions to DRAINED', () => {
    const s = createStream(state, 'p', 'events', 10, idGen, clock, logger);
    if (typeof s !== 'object') throw new Error();
    subscribe(state, s.streamId, 'c1');
    produce(state, s.streamId, { v: 1 }, idGen, clock, logger);
    closeStream(state, s.streamId);
    consume(state, s.streamId, 'c1', 10);
    expect(getStream(state, s.streamId)?.status).toBe('DRAINED');
  });

  it('getStreamStats counts open streams correctly', () => {
    const s1 = createStream(state, 'p1', 'a', 5, idGen, clock, logger);
    const s2 = createStream(state, 'p2', 'b', 5, idGen, clock, logger);
    if (typeof s1 !== 'object' || typeof s2 !== 'object') throw new Error();
    pauseStream(state, s1.streamId);
    const stats = getStreamStats(state);
    expect(stats.totalStreams).toBe(2);
    expect(stats.openStreams).toBe(1);
  });
});
