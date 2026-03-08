/**
 * Event Journal — Ordered event recording and replay for debugging.
 *
 * Records events into named journals (sessions), supports seeking
 * by timestamp or sequence, forward iteration, and statistics.
 * Each journal is append-only once recording and read-only for replay.
 *
 * "The Loom remembers every thread that passes through it."
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface JournalEntry {
  readonly index: number;
  readonly type: string;
  readonly eventId: string;
  readonly timestamp: number;
  readonly sequenceNumber: number;
  readonly sourceWorldId: string;
  readonly sourceFabricId: string;
  readonly payload: unknown;
}

export interface JournalMeta {
  readonly name: string;
  readonly entryCount: number;
  readonly startedAt: number;
  readonly lastEntryAt: number | null;
  readonly sealed: boolean;
}

export interface JournalStats {
  readonly totalJournals: number;
  readonly totalEntries: number;
  readonly sealedJournals: number;
  readonly activeJournals: number;
}

export interface JournalQuery {
  readonly fromTimestamp?: number;
  readonly toTimestamp?: number;
  readonly types?: ReadonlyArray<string>;
  readonly sourceWorldIds?: ReadonlyArray<string>;
  readonly limit?: number;
}

// ─── Port Interfaces ────────────────────────────────────────────────

export interface EventJournalDeps {
  readonly clock: { nowMicroseconds(): number };
}

// ─── Recorded Event Port ────────────────────────────────────────────

export interface RecordableEvent {
  readonly type: string;
  readonly payload: unknown;
  readonly metadata: {
    readonly eventId: string;
    readonly timestamp: number;
    readonly sequenceNumber: number;
    readonly sourceWorldId: string;
    readonly sourceFabricId: string;
  };
}

// ─── Public Interface ───────────────────────────────────────────────

export interface EventJournal {
  createJournal(name: string): boolean;
  record(journalName: string, event: RecordableEvent): boolean;
  seal(journalName: string): boolean;
  getEntries(journalName: string, query?: JournalQuery): ReadonlyArray<JournalEntry>;
  getEntry(journalName: string, index: number): JournalEntry | undefined;
  getMeta(journalName: string): JournalMeta | undefined;
  listJournals(): ReadonlyArray<JournalMeta>;
  deleteJournal(journalName: string): boolean;
  getStats(): JournalStats;
}

// ─── State ──────────────────────────────────────────────────────────

interface JournalData {
  readonly name: string;
  readonly entries: JournalEntry[];
  readonly startedAt: number;
  lastEntryAt: number | null;
  sealed: boolean;
}

interface JournalState {
  readonly journals: Map<string, JournalData>;
  readonly deps: EventJournalDeps;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createEventJournal(
  deps: EventJournalDeps,
): EventJournal {
  const state: JournalState = {
    journals: new Map(),
    deps,
  };

  return {
    createJournal: (n) => createJournalImpl(state, n),
    record: (n, e) => recordImpl(state, n, e),
    seal: (n) => sealImpl(state, n),
    getEntries: (n, q) => getEntriesImpl(state, n, q),
    getEntry: (n, i) => getEntryImpl(state, n, i),
    getMeta: (n) => getMetaImpl(state, n),
    listJournals: () => listJournalsImpl(state),
    deleteJournal: (n) => deleteJournalImpl(state, n),
    getStats: () => getStatsImpl(state),
  };
}

// ─── Journal Lifecycle ──────────────────────────────────────────────

function createJournalImpl(state: JournalState, name: string): boolean {
  if (state.journals.has(name)) return false;
  const now = state.deps.clock.nowMicroseconds();
  state.journals.set(name, {
    name,
    entries: [],
    startedAt: now,
    lastEntryAt: null,
    sealed: false,
  });
  return true;
}

function sealImpl(state: JournalState, name: string): boolean {
  const journal = state.journals.get(name);
  if (journal === undefined) return false;
  if (journal.sealed) return false;
  journal.sealed = true;
  return true;
}

function deleteJournalImpl(state: JournalState, name: string): boolean {
  return state.journals.delete(name);
}

// ─── Recording ──────────────────────────────────────────────────────

function recordImpl(
  state: JournalState,
  journalName: string,
  event: RecordableEvent,
): boolean {
  const journal = state.journals.get(journalName);
  if (journal === undefined) return false;
  if (journal.sealed) return false;

  const entry = buildEntry(journal.entries.length, event);
  journal.entries.push(entry);
  journal.lastEntryAt = entry.timestamp;
  return true;
}

function buildEntry(index: number, event: RecordableEvent): JournalEntry {
  return {
    index,
    type: event.type,
    eventId: event.metadata.eventId,
    timestamp: event.metadata.timestamp,
    sequenceNumber: event.metadata.sequenceNumber,
    sourceWorldId: event.metadata.sourceWorldId,
    sourceFabricId: event.metadata.sourceFabricId,
    payload: event.payload,
  };
}

// ─── Queries ────────────────────────────────────────────────────────

function getEntriesImpl(
  state: JournalState,
  journalName: string,
  query?: JournalQuery,
): ReadonlyArray<JournalEntry> {
  const journal = state.journals.get(journalName);
  if (journal === undefined) return [];
  if (query === undefined) return journal.entries;
  return filterEntries(journal.entries, query);
}

function filterEntries(
  entries: ReadonlyArray<JournalEntry>,
  query: JournalQuery,
): ReadonlyArray<JournalEntry> {
  const results: JournalEntry[] = [];
  const limit = query.limit ?? Infinity;

  for (const entry of entries) {
    if (results.length >= limit) break;
    if (matchesQuery(entry, query)) {
      results.push(entry);
    }
  }

  return results;
}

function matchesQuery(entry: JournalEntry, query: JournalQuery): boolean {
  if (query.fromTimestamp !== undefined && entry.timestamp < query.fromTimestamp) {
    return false;
  }
  if (query.toTimestamp !== undefined && entry.timestamp > query.toTimestamp) {
    return false;
  }
  if (query.types !== undefined && !query.types.includes(entry.type)) {
    return false;
  }
  if (query.sourceWorldIds !== undefined) {
    return query.sourceWorldIds.includes(entry.sourceWorldId);
  }
  return true;
}

function getEntryImpl(
  state: JournalState,
  journalName: string,
  index: number,
): JournalEntry | undefined {
  const journal = state.journals.get(journalName);
  if (journal === undefined) return undefined;
  return journal.entries[index];
}

// ─── Metadata ───────────────────────────────────────────────────────

function getMetaImpl(
  state: JournalState,
  name: string,
): JournalMeta | undefined {
  const journal = state.journals.get(name);
  if (journal === undefined) return undefined;
  return toMeta(journal);
}

function listJournalsImpl(state: JournalState): ReadonlyArray<JournalMeta> {
  const metas: JournalMeta[] = [];
  for (const journal of state.journals.values()) {
    metas.push(toMeta(journal));
  }
  return metas;
}

function toMeta(journal: JournalData): JournalMeta {
  return {
    name: journal.name,
    entryCount: journal.entries.length,
    startedAt: journal.startedAt,
    lastEntryAt: journal.lastEntryAt,
    sealed: journal.sealed,
  };
}

// ─── Stats ──────────────────────────────────────────────────────────

function getStatsImpl(state: JournalState): JournalStats {
  let totalEntries = 0;
  let sealedCount = 0;

  for (const journal of state.journals.values()) {
    totalEntries += journal.entries.length;
    if (journal.sealed) sealedCount += 1;
  }

  return {
    totalJournals: state.journals.size,
    totalEntries,
    sealedJournals: sealedCount,
    activeJournals: state.journals.size - sealedCount,
  };
}
