/**
 * event-sourcing.ts — Event-sourced state rebuilding.
 *
 * Stores domain events per aggregate and rebuilds current state by
 * replaying them through a reducer. Supports snapshots for fast
 * recovery and event stream queries.
 */

// ── Ports ────────────────────────────────────────────────────────

interface SourcingClock {
  readonly nowMicroseconds: () => number;
}

interface SourcingIdGenerator {
  readonly next: () => string;
}

interface EventSourcingDeps {
  readonly clock: SourcingClock;
  readonly idGenerator: SourcingIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

interface StoredEvent {
  readonly eventId: string;
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: unknown;
  readonly version: number;
  readonly recordedAt: number;
}

interface AppendEventParams {
  readonly aggregateId: string;
  readonly eventType: string;
  readonly payload: unknown;
}

type EventReducer<T> = (state: T, event: StoredEvent) => T;

interface AggregateSnapshot<T> {
  readonly aggregateId: string;
  readonly state: T;
  readonly version: number;
  readonly takenAt: number;
}

interface EventSourcingStats {
  readonly totalAggregates: number;
  readonly totalEvents: number;
  readonly totalSnapshots: number;
}

interface EventSourcingStore {
  readonly append: (params: AppendEventParams) => StoredEvent;
  readonly getEvents: (aggregateId: string) => readonly StoredEvent[];
  readonly getVersion: (aggregateId: string) => number;
  readonly rebuild: <T>(aggregateId: string, reducer: EventReducer<T>, initial: T) => T;
  readonly snapshot: <T>(
    aggregateId: string,
    reducer: EventReducer<T>,
    initial: T,
  ) => AggregateSnapshot<T>;
  readonly getSnapshot: <T>(aggregateId: string) => AggregateSnapshot<T> | undefined;
  readonly rebuildFromSnapshot: <T>(aggregateId: string, reducer: EventReducer<T>, initial: T) => T;
  readonly getStats: () => EventSourcingStats;
}

// ── State ────────────────────────────────────────────────────────

interface SourcingState {
  readonly deps: EventSourcingDeps;
  readonly streams: Map<string, StoredEvent[]>;
  readonly versions: Map<string, number>;
  readonly snapshots: Map<string, AggregateSnapshot<unknown>>;
}

// ── Operations ───────────────────────────────────────────────────

function appendImpl(state: SourcingState, params: AppendEventParams): StoredEvent {
  const currentVersion = state.versions.get(params.aggregateId) ?? 0;
  const nextVersion = currentVersion + 1;
  const event: StoredEvent = {
    eventId: state.deps.idGenerator.next(),
    aggregateId: params.aggregateId,
    eventType: params.eventType,
    payload: params.payload,
    version: nextVersion,
    recordedAt: state.deps.clock.nowMicroseconds(),
  };
  let stream = state.streams.get(params.aggregateId);
  if (!stream) {
    stream = [];
    state.streams.set(params.aggregateId, stream);
  }
  stream.push(event);
  state.versions.set(params.aggregateId, nextVersion);
  return event;
}

function rebuildImpl<T>(
  state: SourcingState,
  aggregateId: string,
  reducer: EventReducer<T>,
  initial: T,
): T {
  const events = state.streams.get(aggregateId) ?? [];
  let current = initial;
  for (const event of events) {
    current = reducer(current, event);
  }
  return current;
}

function snapshotImpl<T>(
  state: SourcingState,
  aggregateId: string,
  reducer: EventReducer<T>,
  initial: T,
): AggregateSnapshot<T> {
  const rebuilt = rebuildImpl(state, aggregateId, reducer, initial);
  const version = state.versions.get(aggregateId) ?? 0;
  const snap: AggregateSnapshot<T> = {
    aggregateId,
    state: rebuilt,
    version,
    takenAt: state.deps.clock.nowMicroseconds(),
  };
  state.snapshots.set(aggregateId, snap as AggregateSnapshot<unknown>);
  return snap;
}

function rebuildFromSnapshotImpl<T>(
  state: SourcingState,
  aggregateId: string,
  reducer: EventReducer<T>,
  initial: T,
): T {
  const snap = state.snapshots.get(aggregateId) as AggregateSnapshot<T> | undefined;
  const events = state.streams.get(aggregateId) ?? [];
  if (!snap) return rebuildImpl(state, aggregateId, reducer, initial);
  let current = snap.state;
  for (const event of events) {
    if (event.version > snap.version) {
      current = reducer(current, event);
    }
  }
  return current;
}

function getStatsImpl(state: SourcingState): EventSourcingStats {
  let totalEvents = 0;
  for (const stream of state.streams.values()) {
    totalEvents += stream.length;
  }
  return {
    totalAggregates: state.streams.size,
    totalEvents,
    totalSnapshots: state.snapshots.size,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createEventSourcingStore(deps: EventSourcingDeps): EventSourcingStore {
  const state: SourcingState = {
    deps,
    streams: new Map(),
    versions: new Map(),
    snapshots: new Map(),
  };
  return {
    append: (p) => appendImpl(state, p),
    getEvents: (id) => state.streams.get(id) ?? [],
    getVersion: (id) => state.versions.get(id) ?? 0,
    rebuild: (id, r, i) => rebuildImpl(state, id, r, i),
    snapshot: (id, r, i) => snapshotImpl(state, id, r, i),
    getSnapshot: (id) => state.snapshots.get(id) as never,
    rebuildFromSnapshot: (id, r, i) => rebuildFromSnapshotImpl(state, id, r, i),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createEventSourcingStore };
export type {
  EventSourcingStore,
  EventSourcingDeps,
  StoredEvent,
  AppendEventParams,
  EventReducer,
  AggregateSnapshot,
  EventSourcingStats,
};
