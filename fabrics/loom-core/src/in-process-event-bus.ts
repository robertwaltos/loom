/**
 * In-Process EventBus Implementation
 *
 * Development and single-server implementation.
 * Uses a circular buffer for history (replay) and
 * queueMicrotask for async delivery.
 *
 * Swap to Redis Streams or Kafka via the same EventBus interface.
 */

import type { EventBus, Unsubscribe } from '@loom/events-contracts';
import type { LoomEvent, EventHandler, EventFilter } from '@loom/events-contracts';
import type { Logger } from './logger.js';
import { matchesFilter } from './event-filter-matcher.js';
import { eventBusClosed } from './errors.js';

interface Subscription {
  readonly id: number;
  readonly filter: EventFilter;
  readonly handler: EventHandler<LoomEvent>;
}

interface BusState {
  readonly subscriptions: Map<number, Subscription>;
  readonly history: LoomEvent[];
  readonly capacity: number;
  readonly pendingEvents: LoomEvent[];
  readonly logger: Logger;
  nextSubscriptionId: number;
  drainScheduled: boolean;
  closed: boolean;
}

export function createInProcessEventBus(deps: {
  readonly logger: Logger;
  readonly historyCapacity?: number;
}): EventBus & { close(): void } {
  const state: BusState = {
    subscriptions: new Map(),
    history: [],
    capacity: deps.historyCapacity ?? 10_000,
    pendingEvents: [],
    logger: deps.logger,
    nextSubscriptionId: 1,
    drainScheduled: false,
    closed: false,
  };

  return {
    publish: (event) => {
      enqueueEvent(state, event);
    },
    publishBatch: (events) => {
      enqueueBatch(state, events);
    },
    subscribe: (filter, handler) => addSubscription(state, filter, handler),
    replay: (filter, from, to) => replayHistory(state, filter, from, to),
    backlogSize: () => state.pendingEvents.length,
    close: () => {
      closeBus(state);
    },
  };
}

function enqueueEvent(state: BusState, event: LoomEvent): void {
  if (state.closed) throw eventBusClosed();
  state.pendingEvents.push(event);
  addToHistory(state, event);
  scheduleDrain(state);
}

function enqueueBatch(state: BusState, events: ReadonlyArray<LoomEvent>): void {
  if (state.closed) throw eventBusClosed();
  for (const event of events) {
    state.pendingEvents.push(event);
    addToHistory(state, event);
  }
  scheduleDrain(state);
}

function addSubscription<TEvent extends LoomEvent>(
  state: BusState,
  filter: EventFilter,
  handler: EventHandler<TEvent>,
): Unsubscribe {
  const id = state.nextSubscriptionId;
  state.nextSubscriptionId += 1;
  state.subscriptions.set(id, { id, filter, handler: handler as EventHandler<LoomEvent> });
  return () => {
    state.subscriptions.delete(id);
  };
}

// eslint-disable-next-line @typescript-eslint/require-await -- Contract requires AsyncIterable; in-process impl is sync
async function* replayHistory(
  state: BusState,
  filter: EventFilter,
  fromTimestamp: number,
  toTimestamp: number,
): AsyncGenerator<LoomEvent> {
  for (const event of state.history) {
    const inRange =
      event.metadata.timestamp >= fromTimestamp && event.metadata.timestamp <= toTimestamp;
    if (inRange && matchesFilter(event, filter)) yield event;
  }
}

function addToHistory(state: BusState, event: LoomEvent): void {
  if (state.history.length >= state.capacity) state.history.shift();
  state.history.push(event);
}

function scheduleDrain(state: BusState): void {
  if (state.drainScheduled) return;
  state.drainScheduled = true;
  queueMicrotask(() => {
    drainQueue(state);
  });
}

function drainQueue(state: BusState): void {
  state.drainScheduled = false;
  const batch = state.pendingEvents.splice(0, state.pendingEvents.length);
  for (const event of batch) {
    deliverToSubscribers(state, event);
  }
}

function deliverToSubscribers(state: BusState, event: LoomEvent): void {
  for (const sub of state.subscriptions.values()) {
    if (!matchesFilter(event, sub.filter)) continue;
    try {
      void sub.handler(event);
    } catch (err: unknown) {
      state.logger.error(
        { eventType: event.type, subscriptionId: sub.id, error: String(err) },
        'Event handler threw an error',
      );
    }
  }
}

function closeBus(state: BusState): void {
  state.closed = true;
  state.subscriptions.clear();
  state.pendingEvents.length = 0;
}
