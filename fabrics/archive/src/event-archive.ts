/**
 * event-archive.ts — Long-term event storage and retrieval.
 *
 * Archives events by type, world, and entity. Supports time-range
 * queries, event compaction (merging old events), retention policies,
 * and event replay sequencing.
 *
 * "Every thread the Loom has woven is remembered here."
 */

// ── Ports ────────────────────────────────────────────────────────

interface EventArchiveClock {
  readonly nowMicroseconds: () => number;
}

interface EventArchiveIdGenerator {
  readonly generate: () => string;
}

interface EventArchiveDeps {
  readonly clock: EventArchiveClock;
  readonly idGenerator: EventArchiveIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

interface ArchivedEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly worldId: string;
  readonly entityId: string | null;
  readonly payload: string;
  readonly occurredAt: number;
  readonly archivedAt: number;
  readonly sequenceNumber: number;
}

interface ArchiveEventParams {
  readonly eventType: string;
  readonly worldId: string;
  readonly entityId?: string;
  readonly payload: string;
  readonly occurredAt: number;
}

interface TimeRangeQuery {
  readonly eventType?: string;
  readonly worldId?: string;
  readonly entityId?: string;
  readonly startTime?: number;
  readonly endTime?: number;
}

interface RetentionPolicy {
  readonly policyId: string;
  readonly eventType: string;
  readonly maxAgeMs: number;
  readonly createdAt: number;
}

interface CreateRetentionPolicyParams {
  readonly eventType: string;
  readonly maxAgeMs: number;
}

interface CompactionResult {
  readonly eventType: string;
  readonly worldId: string;
  readonly beforeCount: number;
  readonly afterCount: number;
  readonly removedCount: number;
  readonly compactedAt: number;
}

interface ReplaySequence {
  readonly events: ReadonlyArray<ArchivedEvent>;
  readonly startTime: number;
  readonly endTime: number;
  readonly eventCount: number;
}

interface EventArchiveStats {
  readonly totalEvents: number;
  readonly eventTypeCount: number;
  readonly worldCount: number;
  readonly policyCount: number;
  readonly totalCompactions: number;
}

// ── Public Interface ─────────────────────────────────────────────

interface EventArchive {
  readonly archive: (params: ArchiveEventParams) => ArchivedEvent;
  readonly archiveBatch: (
    events: ReadonlyArray<ArchiveEventParams>,
  ) => ReadonlyArray<ArchivedEvent>;
  readonly query: (q: TimeRangeQuery) => ReadonlyArray<ArchivedEvent>;
  readonly getEvent: (eventId: string) => ArchivedEvent | undefined;
  readonly getReplay: (q: TimeRangeQuery) => ReplaySequence;
  readonly compact: (eventType: string, worldId: string, keepCount: number) => CompactionResult;
  readonly addRetentionPolicy: (params: CreateRetentionPolicyParams) => RetentionPolicy;
  readonly getRetentionPolicies: () => ReadonlyArray<RetentionPolicy>;
  readonly applyRetention: () => number;
  readonly countByType: (eventType: string) => number;
  readonly countByWorld: (worldId: string) => number;
  readonly getEventTypes: () => ReadonlyArray<string>;
  readonly getStats: () => EventArchiveStats;
}

// ── State ────────────────────────────────────────────────────────

interface ArchiveState {
  readonly deps: EventArchiveDeps;
  readonly events: Map<string, ArchivedEvent>;
  readonly ordered: ArchivedEvent[];
  readonly typeIndex: Map<string, string[]>;
  readonly worldIndex: Map<string, string[]>;
  readonly entityIndex: Map<string, string[]>;
  readonly policies: RetentionPolicy[];
  nextSequence: number;
  totalCompactions: number;
}

// ── Factory ──────────────────────────────────────────────────────

function createEventArchive(deps: EventArchiveDeps): EventArchive {
  const state: ArchiveState = {
    deps,
    events: new Map(),
    ordered: [],
    typeIndex: new Map(),
    worldIndex: new Map(),
    entityIndex: new Map(),
    policies: [],
    nextSequence: 0,
    totalCompactions: 0,
  };

  return {
    archive: (p) => archiveImpl(state, p),
    archiveBatch: (es) => es.map((e) => archiveImpl(state, e)),
    query: (q) => queryImpl(state, q),
    getEvent: (id) => state.events.get(id),
    getReplay: (q) => getReplayImpl(state, q),
    compact: (t, w, k) => compactImpl(state, t, w, k),
    addRetentionPolicy: (p) => addRetentionPolicyImpl(state, p),
    getRetentionPolicies: () => [...state.policies],
    applyRetention: () => applyRetentionImpl(state),
    countByType: (t) => state.typeIndex.get(t)?.length ?? 0,
    countByWorld: (w) => state.worldIndex.get(w)?.length ?? 0,
    getEventTypes: () => [...state.typeIndex.keys()],
    getStats: () => getStatsImpl(state),
  };
}

// ── Archive ──────────────────────────────────────────────────────

function archiveImpl(state: ArchiveState, params: ArchiveEventParams): ArchivedEvent {
  const eventId = state.deps.idGenerator.generate();
  const now = state.deps.clock.nowMicroseconds();

  const event: ArchivedEvent = {
    eventId,
    eventType: params.eventType,
    worldId: params.worldId,
    entityId: params.entityId ?? null,
    payload: params.payload,
    occurredAt: params.occurredAt,
    archivedAt: now,
    sequenceNumber: state.nextSequence,
  };

  state.nextSequence++;
  state.events.set(eventId, event);
  state.ordered.push(event);
  appendToIndex(state.typeIndex, params.eventType, eventId);
  appendToIndex(state.worldIndex, params.worldId, eventId);
  if (params.entityId !== undefined) {
    appendToIndex(state.entityIndex, params.entityId, eventId);
  }
  return event;
}

function appendToIndex(index: Map<string, string[]>, key: string, eventId: string): void {
  const existing = index.get(key);
  if (existing !== undefined) {
    existing.push(eventId);
  } else {
    index.set(key, [eventId]);
  }
}

// ── Query ────────────────────────────────────────────────────────

function queryImpl(state: ArchiveState, q: TimeRangeQuery): ReadonlyArray<ArchivedEvent> {
  const results: ArchivedEvent[] = [];
  for (const event of state.ordered) {
    if (matchesTimeRangeQuery(event, q)) {
      results.push(event);
    }
  }
  return results;
}

function matchesTimeRangeQuery(event: ArchivedEvent, q: TimeRangeQuery): boolean {
  if (q.eventType !== undefined && event.eventType !== q.eventType) return false;
  if (q.worldId !== undefined && event.worldId !== q.worldId) return false;
  if (q.entityId !== undefined && event.entityId !== q.entityId) return false;
  if (q.startTime !== undefined && event.occurredAt < q.startTime) return false;
  if (q.endTime !== undefined && event.occurredAt > q.endTime) return false;
  return true;
}

// ── Replay ───────────────────────────────────────────────────────

function getReplayImpl(state: ArchiveState, q: TimeRangeQuery): ReplaySequence {
  const events = queryImpl(state, q);
  const sorted = [...events].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

  if (sorted.length === 0) {
    return { events: sorted, startTime: 0, endTime: 0, eventCount: 0 };
  }
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  return {
    events: sorted,
    startTime: first !== undefined ? first.occurredAt : 0,
    endTime: last !== undefined ? last.occurredAt : 0,
    eventCount: sorted.length,
  };
}

// ── Compaction ────────────────────────────────────────────────────

function compactImpl(
  state: ArchiveState,
  eventType: string,
  worldId: string,
  keepCount: number,
): CompactionResult {
  const matching = state.ordered.filter((e) => e.eventType === eventType && e.worldId === worldId);
  const beforeCount = matching.length;

  if (matching.length <= keepCount) {
    return buildCompactionResult(eventType, worldId, beforeCount, beforeCount, state);
  }

  const toRemoveCount = matching.length - keepCount;
  const toRemove = matching.slice(0, toRemoveCount);
  removeEvents(state, toRemove);
  state.totalCompactions++;

  return buildCompactionResult(eventType, worldId, beforeCount, keepCount, state);
}

function buildCompactionResult(
  eventType: string,
  worldId: string,
  beforeCount: number,
  afterCount: number,
  state: ArchiveState,
): CompactionResult {
  return {
    eventType,
    worldId,
    beforeCount,
    afterCount,
    removedCount: beforeCount - afterCount,
    compactedAt: state.deps.clock.nowMicroseconds(),
  };
}

function removeEvents(state: ArchiveState, toRemove: ReadonlyArray<ArchivedEvent>): void {
  const removeIds = new Set(toRemove.map((e) => e.eventId));
  for (const id of removeIds) {
    state.events.delete(id);
  }
  removeFromOrdered(state, removeIds);
  removeFromAllIndices(state, removeIds);
}

function removeFromOrdered(state: ArchiveState, removeIds: Set<string>): void {
  let writeIdx = 0;
  for (let readIdx = 0; readIdx < state.ordered.length; readIdx++) {
    const event = state.ordered[readIdx];
    if (event !== undefined && !removeIds.has(event.eventId)) {
      state.ordered[writeIdx] = event;
      writeIdx++;
    }
  }
  state.ordered.length = writeIdx;
}

function removeFromAllIndices(state: ArchiveState, removeIds: Set<string>): void {
  pruneIndex(state.typeIndex, removeIds);
  pruneIndex(state.worldIndex, removeIds);
  pruneIndex(state.entityIndex, removeIds);
}

function pruneIndex(index: Map<string, string[]>, removeIds: Set<string>): void {
  for (const [key, ids] of index) {
    const filtered = ids.filter((id) => !removeIds.has(id));
    if (filtered.length === 0) {
      index.delete(key);
    } else {
      index.set(key, filtered);
    }
  }
}

// ── Retention ────────────────────────────────────────────────────

function addRetentionPolicyImpl(
  state: ArchiveState,
  params: CreateRetentionPolicyParams,
): RetentionPolicy {
  const policy: RetentionPolicy = {
    policyId: state.deps.idGenerator.generate(),
    eventType: params.eventType,
    maxAgeMs: params.maxAgeMs,
    createdAt: state.deps.clock.nowMicroseconds(),
  };
  state.policies.push(policy);
  return policy;
}

function applyRetentionImpl(state: ArchiveState): number {
  const now = state.deps.clock.nowMicroseconds();
  let totalRemoved = 0;

  for (const policy of state.policies) {
    const cutoff = now - policy.maxAgeMs;
    const expired = state.ordered.filter(
      (e) => e.eventType === policy.eventType && e.occurredAt < cutoff,
    );
    if (expired.length > 0) {
      removeEvents(state, expired);
      totalRemoved += expired.length;
    }
  }
  return totalRemoved;
}

// ── Stats ────────────────────────────────────────────────────────

function getStatsImpl(state: ArchiveState): EventArchiveStats {
  return {
    totalEvents: state.events.size,
    eventTypeCount: state.typeIndex.size,
    worldCount: state.worldIndex.size,
    policyCount: state.policies.length,
    totalCompactions: state.totalCompactions,
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createEventArchive };
export type {
  EventArchive,
  EventArchiveDeps,
  EventArchiveClock,
  EventArchiveIdGenerator,
  ArchivedEvent,
  ArchiveEventParams,
  TimeRangeQuery,
  RetentionPolicy,
  CreateRetentionPolicyParams,
  CompactionResult,
  ReplaySequence,
  EventArchiveStats,
};
