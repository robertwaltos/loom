import { describe, it, expect } from 'vitest';
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

let idSeq = 0;
function makeState() {
  idSeq = 0;
  const state = createStreamGatewayState();
  const idGen = { generate: () => `sg-${++idSeq}` };
  const clock = { now: () => BigInt(Date.now()) * 1_000n };
  const logger = { info: () => {}, warn: () => {} };
  return { state, idGen, clock, logger };
}

describe('Stream Gateway Simulation', () => {
  it('creates a stream, subscribes consumers, and produces/consumes messages', () => {
    const { state, idGen, clock, logger } = makeState();

    const stream = createStream(state, 'producer-1', 'event-stream', 50, idGen, clock, logger);
    expect(stream).not.toBe('invalid-capacity');
    const streamId = (stream as { streamId: string }).streamId;

    const sub = subscribe(state, streamId, 'consumer-1');
    expect(sub.success).toBe(true);

    produce(state, streamId, { event: 'player-joined', id: 'p1' }, idGen, clock, logger);
    produce(state, streamId, { event: 'player-moved', id: 'p1', x: 10 }, idGen, clock, logger);

    const messages = consume(state, streamId, 'consumer-1', 10);
    expect(messages).toHaveLength(2);
    expect((messages as Array<{ payload: { event: string } }>)[0]!.payload.event).toBe('player-joined');
  });

  it('prevents duplicate subscriptions', () => {
    const { state, idGen, clock, logger } = makeState();

    const stream = createStream(state, 'producer-2', 'chat-stream', 20, idGen, clock, logger) as { streamId: string };
    subscribe(state, stream.streamId, 'consumer-dup');
    const dup = subscribe(state, stream.streamId, 'consumer-dup');
    expect(dup.success).toBe(false);
    expect(dup.error).toBe('already-subscribed');
  });

  it('pauses and resumes a stream', () => {
    const { state, idGen, clock, logger } = makeState();

    const stream = createStream(state, 'producer-3', 'game-stream', 10, idGen, clock, logger) as { streamId: string };
    pauseStream(state, stream.streamId);

    const result = produce(state, stream.streamId, {}, idGen, clock, logger);
    expect(result).toBe('stream-not-found');

    resumeStream(state, stream.streamId);
    const resumed = produce(state, stream.streamId, { data: 'ok' }, idGen, clock, logger);
    expect(resumed).not.toBe('stream-not-found');
  });

  it('closes a stream and rejects further production', () => {
    const { state, idGen, clock, logger } = makeState();

    const stream = createStream(state, 'producer-4', 'closed-stream', 5, idGen, clock, logger) as { streamId: string };
    closeStream(state, stream.streamId);

    const result = produce(state, stream.streamId, {}, idGen, clock, logger);
    expect(result).toBe('stream-not-found');
  });

  it('returns stream-not-found for unknown stream', () => {
    const { state } = makeState();
    const result = subscribe(state, 'no-such-stream', 'consumer');
    expect(result.success).toBe(false);
    expect(result.error).toBe('stream-not-found');
  });

  it('tracks stream stats', () => {
    const { state, idGen, clock, logger } = makeState();
    createStream(state, 'producer-stat', 'stat-stream', 10, idGen, clock, logger);
    const stats = getStreamStats(state);
    expect(stats.totalStreams).toBeGreaterThanOrEqual(1);
  });
});
