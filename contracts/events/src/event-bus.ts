/**
 * Event Bus Contract
 *
 * The central nervous system of The Loom.
 * All inter-module communication flows through here.
 *
 * Implementations may use in-process queues (development),
 * Redis Streams (single-server), or Kafka (distributed).
 * The contract doesn't care.
 */

import type { LoomEvent, EventHandler, EventFilter } from './event.js';

export interface EventBus {
  /**
   * Publish an event to the bus.
   * Returns immediately — delivery is async.
   */
  publish(event: LoomEvent): void;

  /**
   * Publish a batch of events atomically.
   * Either all are published or none.
   */
  publishBatch(events: ReadonlyArray<LoomEvent>): void;

  /**
   * Subscribe to events matching a filter.
   * Returns an unsubscribe function.
   */
  subscribe<TEvent extends LoomEvent>(
    filter: EventFilter,
    handler: EventHandler<TEvent>,
  ): Unsubscribe;

  /**
   * Replay historical events matching a filter.
   * Used for state reconstruction and debugging.
   */
  replay(filter: EventFilter, fromTimestamp: number, toTimestamp: number): AsyncIterable<LoomEvent>;

  /**
   * Current backlog size (events published but not yet consumed).
   * The Inspector monitors this for health.
   */
  backlogSize(): number;
}

export type Unsubscribe = () => void;
