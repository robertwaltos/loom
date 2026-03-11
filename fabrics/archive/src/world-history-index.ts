/**
 * world-history-index.ts — Searchable index of historical world events.
 *
 * Registers worlds, ingests HistoryRecord entries with category, significance,
 * tags, and timestamps. Supports AND-filtered search across all dimensions
 * and surfaces top-N milestones per world.
 *
 * "The Loom remembers what the worlds have survived."
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
  warn(message: string): void;
};

// ============================================================================
// TYPES
// ============================================================================

export type EventRecordId = string;
export type WorldId = string;

export type HistoryError =
  | 'world-not-found'
  | 'record-not-found'
  | 'already-registered'
  | 'invalid-date';

export type HistoryCategory =
  | 'POLITICAL'
  | 'ECONOMIC'
  | 'MILITARY'
  | 'CULTURAL'
  | 'NATURAL'
  | 'TECHNOLOGICAL';

export type HistoryRecord = {
  readonly recordId: EventRecordId;
  readonly worldId: WorldId;
  readonly category: HistoryCategory;
  readonly title: string;
  readonly summary: string;
  readonly significance: number;
  readonly occurredAt: bigint;
  readonly tags: ReadonlyArray<string>;
};

export type HistorySearch = {
  readonly worldId?: WorldId;
  readonly category?: HistoryCategory;
  readonly minSignificance?: number;
  readonly tags?: ReadonlyArray<string>;
  readonly fromTime?: bigint;
  readonly toTime?: bigint;
};

export type HistoryIndex = {
  readonly worldId: WorldId;
  readonly totalRecords: number;
  readonly byCategory: Record<HistoryCategory, number>;
  readonly averageSignificance: number;
};

// ============================================================================
// STATE
// ============================================================================

type MutableRecord = {
  recordId: EventRecordId;
  worldId: WorldId;
  category: HistoryCategory;
  title: string;
  summary: string;
  significance: number;
  occurredAt: bigint;
  tags: ReadonlyArray<string>;
};

export type WorldHistoryIndexState = {
  readonly deps: { clock: Clock; idGen: IdGenerator; logger: Logger };
  readonly worlds: Set<WorldId>;
  readonly records: Map<EventRecordId, MutableRecord>;
  readonly recordsByWorld: Map<WorldId, Set<EventRecordId>>;
};

// ============================================================================
// FACTORY
// ============================================================================

export function createWorldHistoryIndexState(deps: {
  clock: Clock;
  idGen: IdGenerator;
  logger: Logger;
}): WorldHistoryIndexState {
  return {
    deps,
    worlds: new Set(),
    records: new Map(),
    recordsByWorld: new Map(),
  };
}

// ============================================================================
// WORLD MANAGEMENT
// ============================================================================

export function registerWorld(
  state: WorldHistoryIndexState,
  worldId: WorldId,
): { success: true } | { success: false; error: HistoryError } {
  if (state.worlds.has(worldId)) return { success: false, error: 'already-registered' };
  state.worlds.add(worldId);
  state.recordsByWorld.set(worldId, new Set());
  state.deps.logger.info('World registered: ' + worldId);
  return { success: true };
}

// ============================================================================
// RECORD MANAGEMENT
// ============================================================================

export function addRecord(
  state: WorldHistoryIndexState,
  worldId: WorldId,
  category: HistoryCategory,
  title: string,
  summary: string,
  significance: number,
  occurredAt: bigint,
  tags: ReadonlyArray<string>,
): HistoryRecord | HistoryError {
  if (!state.worlds.has(worldId)) return 'world-not-found';
  if (significance < 1 || significance > 10) return 'invalid-date';
  if (occurredAt < 0n) return 'invalid-date';

  const recordId = state.deps.idGen.generate();
  const rec: MutableRecord = {
    recordId,
    worldId,
    category,
    title,
    summary,
    significance,
    occurredAt,
    tags,
  };
  state.records.set(recordId, rec);
  state.recordsByWorld.get(worldId)?.add(recordId);
  state.deps.logger.info('Record added: ' + recordId + ' world=' + worldId);
  return toHistoryRecord(rec);
}

export function getRecord(
  state: WorldHistoryIndexState,
  recordId: EventRecordId,
): HistoryRecord | undefined {
  const rec = state.records.get(recordId);
  return rec === undefined ? undefined : toHistoryRecord(rec);
}

export function deleteRecord(
  state: WorldHistoryIndexState,
  recordId: EventRecordId,
): { success: true } | { success: false; error: HistoryError } {
  const rec = state.records.get(recordId);
  if (rec === undefined) return { success: false, error: 'record-not-found' };
  state.records.delete(recordId);
  state.recordsByWorld.get(rec.worldId)?.delete(recordId);
  return { success: true };
}

// ============================================================================
// SEARCH
// ============================================================================

export function searchHistory(
  state: WorldHistoryIndexState,
  query: HistorySearch,
  limit: number,
): ReadonlyArray<HistoryRecord> {
  const allRecords = resolveSearchScope(state, query.worldId);
  const filtered = allRecords.filter((r) => matchesSearch(r, query));
  filtered.sort((a, b) => (b.occurredAt > a.occurredAt ? 1 : b.occurredAt < a.occurredAt ? -1 : 0));
  return filtered.slice(0, limit).map(toHistoryRecord);
}

function resolveSearchScope(
  state: WorldHistoryIndexState,
  worldId: WorldId | undefined,
): MutableRecord[] {
  if (worldId === undefined) return [...state.records.values()];
  const ids = state.recordsByWorld.get(worldId);
  if (ids === undefined) return [];
  return [...ids]
    .map((id) => state.records.get(id))
    .filter((r): r is MutableRecord => r !== undefined);
}

function matchesSearch(rec: MutableRecord, q: HistorySearch): boolean {
  if (q.worldId !== undefined && rec.worldId !== q.worldId) return false;
  if (q.category !== undefined && rec.category !== q.category) return false;
  if (q.minSignificance !== undefined && rec.significance < q.minSignificance) return false;
  if (q.fromTime !== undefined && rec.occurredAt < q.fromTime) return false;
  if (q.toTime !== undefined && rec.occurredAt > q.toTime) return false;
  if (q.tags !== undefined && !q.tags.every((t) => rec.tags.includes(t))) return false;
  return true;
}

// ============================================================================
// MILESTONES
// ============================================================================

export function getMilestones(
  state: WorldHistoryIndexState,
  worldId: WorldId,
  topN: number,
): ReadonlyArray<HistoryRecord> {
  const ids = state.recordsByWorld.get(worldId);
  if (ids === undefined) return [];
  const recs = [...ids]
    .map((id) => state.records.get(id))
    .filter((r): r is MutableRecord => r !== undefined);
  recs.sort((a, b) => {
    if (b.significance !== a.significance) return b.significance - a.significance;
    return b.occurredAt > a.occurredAt ? 1 : b.occurredAt < a.occurredAt ? -1 : 0;
  });
  return recs.slice(0, topN).map(toHistoryRecord);
}

// ============================================================================
// INDEX
// ============================================================================

export function getWorldIndex(
  state: WorldHistoryIndexState,
  worldId: WorldId,
): HistoryIndex | undefined {
  if (!state.worlds.has(worldId)) return undefined;
  const ids = state.recordsByWorld.get(worldId) ?? new Set<EventRecordId>();
  const recs = [...ids]
    .map((id) => state.records.get(id))
    .filter((r): r is MutableRecord => r !== undefined);
  return buildIndex(worldId, recs);
}

function buildIndex(worldId: WorldId, recs: MutableRecord[]): HistoryIndex {
  const byCategory: Record<HistoryCategory, number> = {
    POLITICAL: 0,
    ECONOMIC: 0,
    MILITARY: 0,
    CULTURAL: 0,
    NATURAL: 0,
    TECHNOLOGICAL: 0,
  };
  let sigSum = 0;
  for (const r of recs) {
    byCategory[r.category]++;
    sigSum += r.significance;
  }
  const avg = recs.length === 0 ? 0 : sigSum / recs.length;
  return { worldId, totalRecords: recs.length, byCategory, averageSignificance: avg };
}

// ============================================================================
// HELPERS
// ============================================================================

function toHistoryRecord(r: MutableRecord): HistoryRecord {
  return {
    recordId: r.recordId,
    worldId: r.worldId,
    category: r.category,
    title: r.title,
    summary: r.summary,
    significance: r.significance,
    occurredAt: r.occurredAt,
    tags: r.tags,
  };
}
