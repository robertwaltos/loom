/**
 * event-sourcing.ts — Append-only event log with aggregate reconstruction.
 *
 * Maintains a stream of domain events per aggregate, supports optimistic
 * locking via version numbers, and enables aggregate state reconstruction
 * by replaying event streams from any version.
 *
 * "Every state the world has ever been is a sequence of events."
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

export type AggregateId = string;
export type AggregateType = string;
export type EventType = string;

export type EventError =
  | 'aggregate-not-found'
  | 'invalid-event'
  | 'version-conflict'
  | 'empty-payload';

export type DomainEvent = {
  eventId: string;
  aggregateId: AggregateId;
  aggregateType: AggregateType;
  eventType: EventType;
  version: number;
  payload: Record<string, string | number | boolean | bigint | null>;
  occurredAt: bigint;
};

export type AggregateState = {
  aggregateId: AggregateId;
  aggregateType: AggregateType;
  currentVersion: number;
  eventCount: number;
  lastUpdated: bigint;
};

export type EventStream = {
  aggregateId: AggregateId;
  aggregateType: AggregateType;
  events: ReadonlyArray<DomainEvent>;
  version: number;
};

// ============================================================================
// STATE
// ============================================================================

export type EventSourcingState = {
  aggregates: Map<AggregateId, AggregateState>;
  events: Map<string, DomainEvent>;
  streamsByAggregate: Map<AggregateId, string[]>;
};

// ============================================================================
// FACTORY
// ============================================================================

export function createEventSourcingState(): EventSourcingState {
  return {
    aggregates: new Map(),
    events: new Map(),
    streamsByAggregate: new Map(),
  };
}

// ============================================================================
// AGGREGATE MANAGEMENT
// ============================================================================

export function createAggregate(
  state: EventSourcingState,
  aggregateId: AggregateId,
  aggregateType: AggregateType,
  clock: Clock,
  logger: Logger,
): AggregateState | EventError {
  if (state.aggregates.has(aggregateId)) return 'version-conflict';

  const aggregate: AggregateState = {
    aggregateId,
    aggregateType,
    currentVersion: 0,
    eventCount: 0,
    lastUpdated: clock.now(),
  };

  state.aggregates.set(aggregateId, aggregate);
  state.streamsByAggregate.set(aggregateId, []);

  logger.info('Aggregate created: ' + aggregateType + '/' + aggregateId);

  return aggregate;
}

export function getAggregate(
  state: EventSourcingState,
  aggregateId: AggregateId,
): AggregateState | undefined {
  return state.aggregates.get(aggregateId);
}

export function listAggregates(
  state: EventSourcingState,
  aggregateType?: AggregateType,
): ReadonlyArray<AggregateState> {
  const results: AggregateState[] = [];
  for (const aggregate of state.aggregates.values()) {
    if (aggregateType === undefined || aggregate.aggregateType === aggregateType) {
      results.push(aggregate);
    }
  }
  return results;
}

// ============================================================================
// EVENT APPENDING
// ============================================================================

export function appendEvent(
  state: EventSourcingState,
  aggregateId: AggregateId,
  eventType: EventType,
  payload: Record<string, string | number | boolean | bigint | null>,
  idGen: IdGenerator,
  clock: Clock,
  logger: Logger,
  expectedVersion?: number,
): DomainEvent | EventError {
  const aggregate = state.aggregates.get(aggregateId);
  if (aggregate === undefined) return 'aggregate-not-found';

  const validationError = validateAppend(aggregate, payload, expectedVersion);
  if (validationError !== null) return validationError;

  const event = buildDomainEvent(aggregate, aggregateId, eventType, payload, idGen, clock);

  state.events.set(event.eventId, event);
  appendToStream(state, aggregateId, event.eventId);
  updateAggregate(aggregate, event.version, event.occurredAt);

  logger.info('Event appended: ' + eventType + ' v' + String(event.version) + ' to ' + aggregateId);

  return event;
}

function validateAppend(
  aggregate: AggregateState,
  payload: Record<string, string | number | boolean | bigint | null>,
  expectedVersion: number | undefined,
): EventError | null {
  if (Object.keys(payload).length === 0) return 'empty-payload';
  if (expectedVersion !== undefined && expectedVersion !== aggregate.currentVersion) {
    return 'version-conflict';
  }
  return null;
}

function buildDomainEvent(
  aggregate: AggregateState,
  aggregateId: AggregateId,
  eventType: EventType,
  payload: Record<string, string | number | boolean | bigint | null>,
  idGen: IdGenerator,
  clock: Clock,
): DomainEvent {
  const nextVersion = aggregate.currentVersion + 1;
  return {
    eventId: idGen.generate(),
    aggregateId,
    aggregateType: aggregate.aggregateType,
    eventType,
    version: nextVersion,
    payload,
    occurredAt: clock.now(),
  };
}

function appendToStream(
  state: EventSourcingState,
  aggregateId: AggregateId,
  eventId: string,
): void {
  const stream = state.streamsByAggregate.get(aggregateId);
  if (stream !== undefined) {
    stream.push(eventId);
  }
}

function updateAggregate(aggregate: AggregateState, nextVersion: number, now: bigint): void {
  aggregate.currentVersion = nextVersion;
  aggregate.eventCount = aggregate.eventCount + 1;
  aggregate.lastUpdated = now;
}

// ============================================================================
// EVENT STREAM QUERIES
// ============================================================================

export function getEventStream(
  state: EventSourcingState,
  aggregateId: AggregateId,
  fromVersion?: number,
): EventStream | EventError {
  const aggregate = state.aggregates.get(aggregateId);
  if (aggregate === undefined) return 'aggregate-not-found';

  const from = fromVersion ?? 0;
  const eventIds = state.streamsByAggregate.get(aggregateId) ?? [];
  const events: DomainEvent[] = [];

  for (const eventId of eventIds) {
    const event = state.events.get(eventId);
    if (event !== undefined && event.version >= from) {
      events.push(event);
    }
  }

  return {
    aggregateId,
    aggregateType: aggregate.aggregateType,
    events,
    version: aggregate.currentVersion,
  };
}

export function getEvent(state: EventSourcingState, eventId: string): DomainEvent | undefined {
  return state.events.get(eventId);
}

export function countEvents(
  state: EventSourcingState,
  aggregateId: AggregateId,
): number | EventError {
  const aggregate = state.aggregates.get(aggregateId);
  if (aggregate === undefined) return 'aggregate-not-found';
  return aggregate.eventCount;
}
