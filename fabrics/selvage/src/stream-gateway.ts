/**
 * stream-gateway.ts — Real-time data stream management with backpressure and buffering.
 *
 * Manages named data streams with configurable capacity limits. Producers push
 * messages into buffered streams; consumers drain messages in FIFO order.
 * Backpressure is enforced at capacity: excess produce attempts are counted as
 * dropped messages.
 *
 * "Data flows like the Silfen Weave: continuous, ordered, never lost without record."
 */

// ============================================================================
// PORTS
// ============================================================================

export type Clock = {
  now(): bigint;
};

export type IdGenerator = {
  generate(): string;
};

export type Logger = {
  info(message: string): void;
  error(message: string): void;
};

// ============================================================================
// TYPES
// ============================================================================

export type StreamId = string;
export type ProducerId = string;
export type ConsumerId = string;

export type StreamError =
  | 'stream-not-found'
  | 'consumer-not-found'
  | 'stream-full'
  | 'already-subscribed'
  | 'not-subscribed'
  | 'invalid-capacity';

export type StreamStatus = 'OPEN' | 'PAUSED' | 'CLOSED' | 'DRAINED';

export type StreamMessage = {
  messageId: string;
  streamId: StreamId;
  payload: Record<string, string | number | boolean | bigint>;
  producedAt: bigint;
  sequence: number;
};

export type DataStream = {
  streamId: StreamId;
  name: string;
  producerId: ProducerId;
  capacity: number;
  bufferedCount: number;
  status: StreamStatus;
  subscribers: ReadonlyArray<ConsumerId>;
  createdAt: bigint;
  totalProduced: number;
};

export type StreamStats = {
  totalStreams: number;
  openStreams: number;
  totalMessages: number;
  droppedMessages: number;
};

// ============================================================================
// STATE
// ============================================================================

export type StreamGatewayState = {
  streams: Map<StreamId, MutableStream>;
  totalMessagesProduced: number;
  droppedMessages: number;
};

type MutableStream = {
  streamId: StreamId;
  name: string;
  producerId: ProducerId;
  capacity: number;
  status: StreamStatus;
  subscribers: Set<ConsumerId>;
  createdAt: bigint;
  totalProduced: number;
  nextSequence: number;
  buffer: MutableMessage[];
};

type MutableMessage = {
  messageId: string;
  streamId: StreamId;
  payload: Record<string, string | number | boolean | bigint>;
  producedAt: bigint;
  sequence: number;
};

// ============================================================================
// FACTORY
// ============================================================================

export function createStreamGatewayState(): StreamGatewayState {
  return {
    streams: new Map(),
    totalMessagesProduced: 0,
    droppedMessages: 0,
  };
}

// ============================================================================
// STREAM LIFECYCLE
// ============================================================================

export function createStream(
  state: StreamGatewayState,
  producerId: ProducerId,
  name: string,
  capacity: number,
  idGen: IdGenerator,
  clock: Clock,
  logger: Logger,
): DataStream | StreamError {
  if (capacity < 1) return 'invalid-capacity';

  const stream: MutableStream = {
    streamId: idGen.generate(),
    name,
    producerId,
    capacity,
    status: 'OPEN',
    subscribers: new Set(),
    createdAt: clock.now(),
    totalProduced: 0,
    nextSequence: 1,
    buffer: [],
  };

  state.streams.set(stream.streamId, stream);
  logger.info('Stream created: ' + stream.streamId + ' cap=' + String(capacity));
  return toDataStream(stream);
}

export function pauseStream(
  state: StreamGatewayState,
  streamId: StreamId,
): { success: true } | { success: false; error: StreamError } {
  const stream = state.streams.get(streamId);
  if (stream === undefined) return { success: false, error: 'stream-not-found' };
  if (stream.status !== 'OPEN') return { success: false, error: 'stream-not-found' };
  stream.status = 'PAUSED';
  return { success: true };
}

export function resumeStream(
  state: StreamGatewayState,
  streamId: StreamId,
): { success: true } | { success: false; error: StreamError } {
  const stream = state.streams.get(streamId);
  if (stream === undefined) return { success: false, error: 'stream-not-found' };
  if (stream.status !== 'PAUSED') return { success: false, error: 'stream-not-found' };
  stream.status = 'OPEN';
  return { success: true };
}

export function closeStream(
  state: StreamGatewayState,
  streamId: StreamId,
): { success: true } | { success: false; error: StreamError } {
  const stream = state.streams.get(streamId);
  if (stream === undefined) return { success: false, error: 'stream-not-found' };
  stream.status = stream.buffer.length === 0 ? 'DRAINED' : 'CLOSED';
  return { success: true };
}

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export function subscribe(
  state: StreamGatewayState,
  streamId: StreamId,
  consumerId: ConsumerId,
): { success: true } | { success: false; error: StreamError } {
  const stream = state.streams.get(streamId);
  if (stream === undefined) return { success: false, error: 'stream-not-found' };
  if (stream.subscribers.has(consumerId)) return { success: false, error: 'already-subscribed' };
  stream.subscribers.add(consumerId);
  return { success: true };
}

export function unsubscribe(
  state: StreamGatewayState,
  streamId: StreamId,
  consumerId: ConsumerId,
): { success: true } | { success: false; error: StreamError } {
  const stream = state.streams.get(streamId);
  if (stream === undefined) return { success: false, error: 'stream-not-found' };
  if (!stream.subscribers.has(consumerId)) return { success: false, error: 'not-subscribed' };
  stream.subscribers.delete(consumerId);
  return { success: true };
}

// ============================================================================
// PRODUCE / CONSUME
// ============================================================================

export function produce(
  state: StreamGatewayState,
  streamId: StreamId,
  payload: Record<string, string | number | boolean | bigint>,
  idGen: IdGenerator,
  clock: Clock,
  logger: Logger,
): StreamMessage | StreamError {
  const stream = state.streams.get(streamId);
  if (stream === undefined) return 'stream-not-found';
  if (stream.status !== 'OPEN') return 'stream-not-found';

  if (stream.buffer.length >= stream.capacity) {
    state.droppedMessages = state.droppedMessages + 1;
    logger.error('Stream full: ' + streamId);
    return 'stream-full';
  }

  const message: MutableMessage = {
    messageId: idGen.generate(),
    streamId,
    payload: { ...payload },
    producedAt: clock.now(),
    sequence: stream.nextSequence,
  };

  stream.buffer.push(message);
  stream.nextSequence = stream.nextSequence + 1;
  stream.totalProduced = stream.totalProduced + 1;
  state.totalMessagesProduced = state.totalMessagesProduced + 1;

  return toMessage(message);
}

export function consume(
  state: StreamGatewayState,
  streamId: StreamId,
  consumerId: ConsumerId,
  count: number,
): ReadonlyArray<StreamMessage> | StreamError {
  const stream = state.streams.get(streamId);
  if (stream === undefined) return 'stream-not-found';
  if (!stream.subscribers.has(consumerId)) return 'not-subscribed';

  const take = Math.min(count, stream.buffer.length);
  const drained = stream.buffer.splice(0, take);

  if (stream.status === 'CLOSED' && stream.buffer.length === 0) {
    stream.status = 'DRAINED';
  }

  return drained.map(toMessage);
}

// ============================================================================
// QUERIES
// ============================================================================

export function getStream(state: StreamGatewayState, streamId: StreamId): DataStream | undefined {
  const stream = state.streams.get(streamId);
  return stream !== undefined ? toDataStream(stream) : undefined;
}

export function getStreamStats(state: StreamGatewayState): StreamStats {
  let openStreams = 0;
  for (const stream of state.streams.values()) {
    if (stream.status === 'OPEN') openStreams = openStreams + 1;
  }
  return {
    totalStreams: state.streams.size,
    openStreams,
    totalMessages: state.totalMessagesProduced,
    droppedMessages: state.droppedMessages,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function toDataStream(stream: MutableStream): DataStream {
  return {
    streamId: stream.streamId,
    name: stream.name,
    producerId: stream.producerId,
    capacity: stream.capacity,
    bufferedCount: stream.buffer.length,
    status: stream.status,
    subscribers: [...stream.subscribers],
    createdAt: stream.createdAt,
    totalProduced: stream.totalProduced,
  };
}

function toMessage(msg: MutableMessage): StreamMessage {
  return {
    messageId: msg.messageId,
    streamId: msg.streamId,
    payload: { ...msg.payload },
    producedAt: msg.producedAt,
    sequence: msg.sequence,
  };
}
