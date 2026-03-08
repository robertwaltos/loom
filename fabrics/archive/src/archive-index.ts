/**
 * archive-index.ts — Archive metadata index.
 *
 * Maintains a secondary index over archived records for fast
 * lookups by tag, date range, and category. Supports tagging,
 * multi-tag queries, and date-range filtering.
 */

// ── Ports ────────────────────────────────────────────────────────

interface IndexClock {
  readonly nowMicroseconds: () => number;
}

interface IndexIdGenerator {
  readonly next: () => string;
}

interface ArchiveIndexDeps {
  readonly clock: IndexClock;
  readonly idGenerator: IndexIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

interface IndexRecord {
  readonly recordId: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly indexedAt: number;
  readonly metadata: string;
}

interface AddRecordParams {
  readonly category: string;
  readonly tags: readonly string[];
  readonly metadata: string;
}

interface IndexQuery {
  readonly category?: string;
  readonly tag?: string;
  readonly afterUs?: number;
  readonly beforeUs?: number;
}

interface IndexStats {
  readonly totalRecords: number;
  readonly totalTags: number;
  readonly totalCategories: number;
}

interface ArchiveIndex {
  readonly add: (params: AddRecordParams) => IndexRecord;
  readonly get: (recordId: string) => IndexRecord | undefined;
  readonly remove: (recordId: string) => boolean;
  readonly query: (q: IndexQuery) => readonly IndexRecord[];
  readonly findByTag: (tag: string) => readonly IndexRecord[];
  readonly findByCategory: (category: string) => readonly IndexRecord[];
  readonly getStats: () => IndexStats;
}

// ── State ────────────────────────────────────────────────────────

interface IndexState {
  readonly deps: ArchiveIndexDeps;
  readonly records: Map<string, IndexRecord>;
  readonly tagIndex: Map<string, Set<string>>;
  readonly categoryIndex: Map<string, Set<string>>;
}

// ── Helpers ──────────────────────────────────────────────────────

function addToSetIndex(index: Map<string, Set<string>>, key: string, recordId: string): void {
  let set = index.get(key);
  if (!set) {
    set = new Set();
    index.set(key, set);
  }
  set.add(recordId);
}

function removeFromSetIndex(index: Map<string, Set<string>>, key: string, recordId: string): void {
  const set = index.get(key);
  if (set) {
    set.delete(recordId);
    if (set.size === 0) index.delete(key);
  }
}

// ── Operations ───────────────────────────────────────────────────

function addImpl(state: IndexState, params: AddRecordParams): IndexRecord {
  const record: IndexRecord = {
    recordId: state.deps.idGenerator.next(),
    category: params.category,
    tags: [...params.tags],
    indexedAt: state.deps.clock.nowMicroseconds(),
    metadata: params.metadata,
  };
  state.records.set(record.recordId, record);
  addToSetIndex(state.categoryIndex, params.category, record.recordId);
  for (const tag of params.tags) {
    addToSetIndex(state.tagIndex, tag, record.recordId);
  }
  return record;
}

function removeImpl(state: IndexState, recordId: string): boolean {
  const record = state.records.get(recordId);
  if (!record) return false;
  state.records.delete(recordId);
  removeFromSetIndex(state.categoryIndex, record.category, recordId);
  for (const tag of record.tags) {
    removeFromSetIndex(state.tagIndex, tag, recordId);
  }
  return true;
}

function matchesQuery(record: IndexRecord, q: IndexQuery): boolean {
  if (q.category !== undefined && record.category !== q.category) return false;
  if (q.tag !== undefined && !record.tags.includes(q.tag)) return false;
  if (q.afterUs !== undefined && record.indexedAt < q.afterUs) return false;
  if (q.beforeUs !== undefined && record.indexedAt > q.beforeUs) return false;
  return true;
}

function queryImpl(state: IndexState, q: IndexQuery): IndexRecord[] {
  const result: IndexRecord[] = [];
  for (const record of state.records.values()) {
    if (matchesQuery(record, q)) result.push(record);
  }
  return result;
}

function findByKeyImpl(
  state: IndexState,
  index: Map<string, Set<string>>,
  key: string,
): IndexRecord[] {
  const ids = index.get(key);
  if (!ids) return [];
  const result: IndexRecord[] = [];
  for (const id of ids) {
    const record = state.records.get(id);
    if (record) result.push(record);
  }
  return result;
}

function getStatsImpl(state: IndexState): IndexStats {
  return {
    totalRecords: state.records.size,
    totalTags: state.tagIndex.size,
    totalCategories: state.categoryIndex.size,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createArchiveIndex(deps: ArchiveIndexDeps): ArchiveIndex {
  const state: IndexState = {
    deps,
    records: new Map(),
    tagIndex: new Map(),
    categoryIndex: new Map(),
  };
  return {
    add: (p) => addImpl(state, p),
    get: (id) => state.records.get(id),
    remove: (id) => removeImpl(state, id),
    query: (q) => queryImpl(state, q),
    findByTag: (tag) => findByKeyImpl(state, state.tagIndex, tag),
    findByCategory: (cat) => findByKeyImpl(state, state.categoryIndex, cat),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createArchiveIndex };
export type {
  ArchiveIndex,
  ArchiveIndexDeps,
  IndexRecord,
  AddRecordParams,
  IndexQuery,
  IndexStats,
};
