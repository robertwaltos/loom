/**
 * Event Stream — loom-core fabric
 * Persistent buffer of recent events for replay and catch-up.
 * Consumers can subscribe and replay from a cursor. TTL-based pruning.
 */

// Port interfaces (duplicated, never imported from other fabrics)
interface StreamClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface StreamLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// Core types
export interface StreamEvent {
  readonly eventId: string;
  readonly streamId: string;
  readonly eventType: string;
  readonly payload: Record<string, unknown>;
  readonly publishedAtMicros: bigint;
  readonly expiresAtMicros: bigint;
}

export interface StreamCursor {
  readonly cursorId: string;
  readonly streamId: string;
  position: bigint;
  lastReadMicros: bigint;
}

export type StreamSubscriber = (event: StreamEvent) => void;

export interface StreamSubscription {
  readonly subscriptionId: string;
  readonly streamId: string;
  readonly subscriber: StreamSubscriber;
  readonly subscribedAtMicros: bigint;
  active: boolean;
}

export interface ReplayResult {
  readonly events: readonly StreamEvent[];
  readonly startPosition: bigint;
  readonly endPosition: bigint;
  readonly hasMore: boolean;
}

export interface StreamStats {
  readonly streamId: string;
  readonly totalEvents: number;
  readonly oldestEventMicros: bigint | null;
  readonly newestEventMicros: bigint | null;
  readonly activeSubscriptions: number;
  readonly totalBytesEstimate: number;
}

// State
interface EventStreamState {
  readonly streams: Map<string, StreamEvent[]>;
  readonly cursors: Map<string, StreamCursor>;
  readonly subscriptions: Map<string, StreamSubscription>;
  nextCursorId: number;
  nextSubscriptionId: number;
  nextEventSeq: number;
}

// Dependencies
export interface EventStreamDeps {
  readonly clock: StreamClockPort;
  readonly logger: StreamLoggerPort;
}

// Public API
export interface EventStream {
  readonly publishToStream: (
    streamId: string,
    eventType: string,
    payload: Record<string, unknown>,
    ttlMicros: bigint,
  ) => string;
  readonly createCursor: (streamId: string, position: bigint) => string;
  readonly replayFrom: (cursorId: string, maxEvents: number) => string | ReplayResult;
  readonly subscribe: (streamId: string, subscriber: StreamSubscriber) => string;
  readonly unsubscribe: (subscriptionId: string) => string | 'OK';
  readonly pruneExpired: (streamId: string) => number;
  readonly pruneAllStreams: () => number;
  readonly getStats: (streamId: string) => StreamStats;
  readonly getAllStreams: () => readonly string[];
}

// Factory
export function createEventStream(deps: EventStreamDeps): EventStream {
  const state: EventStreamState = {
    streams: new Map(),
    cursors: new Map(),
    subscriptions: new Map(),
    nextCursorId: 1,
    nextSubscriptionId: 1,
    nextEventSeq: 1,
  };

  return {
    publishToStream: (streamId, eventType, payload, ttlMicros) =>
      publishToStream(state, deps, streamId, eventType, payload, ttlMicros),
    createCursor: (streamId, position) => createCursor(state, deps, streamId, position),
    replayFrom: (cursorId, maxEvents) => replayFrom(state, deps, cursorId, maxEvents),
    subscribe: (streamId, subscriber) => subscribe(state, deps, streamId, subscriber),
    unsubscribe: (subscriptionId) => unsubscribe(state, deps, subscriptionId),
    pruneExpired: (streamId) => pruneExpired(state, deps, streamId),
    pruneAllStreams: () => pruneAllStreams(state, deps),
    getStats: (streamId) => getStats(state, streamId),
    getAllStreams: () => getAllStreams(state),
  };
}

// Implementation functions
function publishToStream(
  state: EventStreamState,
  deps: EventStreamDeps,
  streamId: string,
  eventType: string,
  payload: Record<string, unknown>,
  ttlMicros: bigint,
): string {
  const now = deps.clock.nowMicroseconds();
  const seq = state.nextEventSeq;
  state.nextEventSeq = state.nextEventSeq + 1;
  const eventId = generateEventId(now, streamId, seq);

  const event: StreamEvent = {
    eventId,
    streamId,
    eventType,
    payload,
    publishedAtMicros: now,
    expiresAtMicros: now + ttlMicros,
  };

  let streamEvents = state.streams.get(streamId);
  if (streamEvents === undefined) {
    streamEvents = [];
    state.streams.set(streamId, streamEvents);
  }

  streamEvents.push(event);

  deps.logger.info('event_published', {
    streamId,
    eventType,
    eventId,
  });

  notifySubscribers(state, streamId, event);

  return eventId;
}

function generateEventId(nowMicros: bigint, streamId: string, seq: number): string {
  return streamId + '-' + String(nowMicros) + '-' + String(seq);
}

function notifySubscribers(state: EventStreamState, streamId: string, event: StreamEvent): void {
  for (const subscription of state.subscriptions.values()) {
    if (subscription.streamId === streamId && subscription.active) {
      subscription.subscriber(event);
    }
  }
}

function createCursor(
  state: EventStreamState,
  deps: EventStreamDeps,
  streamId: string,
  position: bigint,
): string {
  const cursorId = 'cursor-' + String(state.nextCursorId);
  state.nextCursorId = state.nextCursorId + 1;

  const cursor: StreamCursor = {
    cursorId,
    streamId,
    position,
    lastReadMicros: deps.clock.nowMicroseconds(),
  };

  state.cursors.set(cursorId, cursor);

  deps.logger.info('cursor_created', {
    cursorId,
    streamId,
    position: String(position),
  });

  return cursorId;
}

function replayFrom(
  state: EventStreamState,
  deps: EventStreamDeps,
  cursorId: string,
  maxEvents: number,
): string | ReplayResult {
  const cursor = state.cursors.get(cursorId);
  if (cursor === undefined) {
    return 'CURSOR_NOT_FOUND';
  }

  const streamEvents = state.streams.get(cursor.streamId);
  if (streamEvents === undefined) {
    return {
      events: [],
      startPosition: cursor.position,
      endPosition: cursor.position,
      hasMore: false,
    };
  }

  const matchingEvents: StreamEvent[] = [];
  let endPosition = cursor.position;

  for (const event of streamEvents) {
    if (event.publishedAtMicros <= cursor.position) {
      continue;
    }

    matchingEvents.push(event);
    endPosition = event.publishedAtMicros;

    if (matchingEvents.length >= maxEvents) {
      break;
    }
  }

  const hasMore = checkHasMoreEvents(streamEvents, endPosition);

  cursor.position = endPosition;
  cursor.lastReadMicros = deps.clock.nowMicroseconds();

  return {
    events: matchingEvents,
    startPosition: cursor.position,
    endPosition,
    hasMore,
  };
}

function checkHasMoreEvents(streamEvents: StreamEvent[], position: bigint): boolean {
  for (const event of streamEvents) {
    if (event.publishedAtMicros > position) {
      return true;
    }
  }
  return false;
}

function subscribe(
  state: EventStreamState,
  deps: EventStreamDeps,
  streamId: string,
  subscriber: StreamSubscriber,
): string {
  const subscriptionId = 'sub-' + String(state.nextSubscriptionId);
  state.nextSubscriptionId = state.nextSubscriptionId + 1;

  const subscription: StreamSubscription = {
    subscriptionId,
    streamId,
    subscriber,
    subscribedAtMicros: deps.clock.nowMicroseconds(),
    active: true,
  };

  state.subscriptions.set(subscriptionId, subscription);

  deps.logger.info('subscription_created', {
    subscriptionId,
    streamId,
  });

  return subscriptionId;
}

function unsubscribe(
  state: EventStreamState,
  deps: EventStreamDeps,
  subscriptionId: string,
): string | 'OK' {
  const subscription = state.subscriptions.get(subscriptionId);
  if (subscription === undefined) {
    return 'SUBSCRIPTION_NOT_FOUND';
  }

  subscription.active = false;

  deps.logger.info('subscription_cancelled', {
    subscriptionId,
  });

  return 'OK';
}

function pruneExpired(state: EventStreamState, deps: EventStreamDeps, streamId: string): number {
  const streamEvents = state.streams.get(streamId);
  if (streamEvents === undefined) {
    return 0;
  }

  const now = deps.clock.nowMicroseconds();
  const remaining: StreamEvent[] = [];
  let prunedCount = 0;

  for (const event of streamEvents) {
    if (event.expiresAtMicros > now) {
      remaining.push(event);
    } else {
      prunedCount = prunedCount + 1;
    }
  }

  streamEvents.length = 0;
  streamEvents.push(...remaining);

  if (prunedCount > 0) {
    deps.logger.info('events_pruned', {
      streamId,
      count: prunedCount,
    });
  }

  return prunedCount;
}

function pruneAllStreams(state: EventStreamState, deps: EventStreamDeps): number {
  let totalPruned = 0;

  for (const streamId of state.streams.keys()) {
    const pruned = pruneExpired(state, deps, streamId);
    totalPruned = totalPruned + pruned;
  }

  return totalPruned;
}

function getStats(state: EventStreamState, streamId: string): StreamStats {
  const streamEvents = state.streams.get(streamId);

  if (streamEvents === undefined || streamEvents.length === 0) {
    return {
      streamId,
      totalEvents: 0,
      oldestEventMicros: null,
      newestEventMicros: null,
      activeSubscriptions: countActiveSubscriptions(state, streamId),
      totalBytesEstimate: 0,
    };
  }

  let oldestMicros: bigint | null = null;
  let newestMicros: bigint | null = null;

  for (const event of streamEvents) {
    if (oldestMicros === null || event.publishedAtMicros < oldestMicros) {
      oldestMicros = event.publishedAtMicros;
    }
    if (newestMicros === null || event.publishedAtMicros > newestMicros) {
      newestMicros = event.publishedAtMicros;
    }
  }

  const activeSubscriptions = countActiveSubscriptions(state, streamId);
  const bytesEstimate = estimateStreamBytes(streamEvents);

  return {
    streamId,
    totalEvents: streamEvents.length,
    oldestEventMicros: oldestMicros,
    newestEventMicros: newestMicros,
    activeSubscriptions,
    totalBytesEstimate: bytesEstimate,
  };
}

function countActiveSubscriptions(state: EventStreamState, streamId: string): number {
  let count = 0;

  for (const subscription of state.subscriptions.values()) {
    if (subscription.streamId === streamId && subscription.active) {
      count = count + 1;
    }
  }

  return count;
}

function estimateStreamBytes(events: StreamEvent[]): number {
  let total = 0;

  for (const event of events) {
    const payloadSize = JSON.stringify(event.payload).length;
    total = total + payloadSize + 200;
  }

  return total;
}

function getAllStreams(state: EventStreamState): readonly string[] {
  return Array.from(state.streams.keys());
}
