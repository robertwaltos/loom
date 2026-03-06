/**
 * Core Event Types
 *
 * Every event in The Loom carries metadata for tracing, ordering,
 * and provenance. Events are immutable after creation.
 */

export interface LoomEvent<TType extends string = string, TPayload = unknown> {
  /** Event type identifier — used for routing and filtering */
  readonly type: TType;

  /** Event payload — specific to each event type */
  readonly payload: TPayload;

  /** Metadata for tracing, ordering, and provenance */
  readonly metadata: EventMetadata;
}

export interface EventMetadata {
  /** Globally unique event ID */
  readonly eventId: string;

  /** Correlation ID — traces a chain of related events */
  readonly correlationId: string;

  /** Causation ID — the event that directly caused this one */
  readonly causationId: string | null;

  /** Unix timestamp in microseconds */
  readonly timestamp: number;

  /** Monotonically increasing sequence number per source */
  readonly sequenceNumber: number;

  /** Which world this event originated in */
  readonly sourceWorldId: string;

  /** Which module/fabric emitted this event */
  readonly sourceFabricId: string;

  /** Schema version for forward/backward compatibility */
  readonly schemaVersion: number;
}

export type EventHandler<TEvent extends LoomEvent> = (event: TEvent) => void | Promise<void>;

export interface EventFilter {
  /** Match specific event types */
  readonly types?: ReadonlyArray<string>;

  /** Match events from specific worlds */
  readonly sourceWorldIds?: ReadonlyArray<string>;

  /** Match events from specific fabrics */
  readonly sourceFabricIds?: ReadonlyArray<string>;

  /** Only events after this sequence number */
  readonly afterSequence?: number;
}
