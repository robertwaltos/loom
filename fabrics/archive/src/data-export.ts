/**
 * Data Export — Structured export of archive data for analytics.
 *
 * Serializes Chronicle entries and State Snapshots into structured
 * export bundles with metadata, filtering, and pagination. Designed
 * for external analytics pipelines and Foundation Archive sync.
 *
 * "Every thread in The Loom can be pulled and examined."
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface ExportBundle {
  readonly exportId: string;
  readonly createdAt: number;
  readonly format: ExportFormat;
  readonly entryCount: number;
  readonly entries: ReadonlyArray<ExportEntry>;
  readonly metadata: ExportMetadata;
}

export type ExportFormat = 'json_lines' | 'structured';

export interface ExportEntry {
  readonly id: string;
  readonly source: ExportSource;
  readonly timestamp: number;
  readonly category: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export type ExportSource = 'chronicle' | 'snapshot';

export interface ExportMetadata {
  readonly sourceFilter: ExportFilter;
  readonly totalAvailable: number;
  readonly exported: number;
  readonly truncated: boolean;
}

export interface ExportFilter {
  readonly source?: ExportSource;
  readonly categories?: ReadonlyArray<string>;
  readonly fromTimestamp?: number;
  readonly toTimestamp?: number;
  readonly worldIds?: ReadonlyArray<string>;
  readonly limit?: number;
  readonly offset?: number;
}

export interface ExportStats {
  readonly totalExports: number;
  readonly totalEntriesExported: number;
  readonly lastExportAt: number | null;
}

// ─── Port Interfaces ────────────────────────────────────────────────

export interface ChronicleExportPort {
  queryEntries(filter: ChroniclePortFilter): ReadonlyArray<ChroniclePortEntry>;
  count(): number;
}

export interface ChroniclePortFilter {
  readonly categories?: ReadonlyArray<string>;
  readonly fromTimestamp?: number;
  readonly toTimestamp?: number;
  readonly worldIds?: ReadonlyArray<string>;
}

export interface ChroniclePortEntry {
  readonly entryId: string;
  readonly timestamp: number;
  readonly category: string;
  readonly worldId: string;
  readonly subjectId: string;
  readonly content: string;
  readonly hash: string;
}

export interface SnapshotExportPort {
  querySnapshots(filter: SnapshotPortFilter): ReadonlyArray<SnapshotPortEntry>;
  count(): number;
}

export interface SnapshotPortFilter {
  readonly fromTimestamp?: number;
  readonly toTimestamp?: number;
  readonly worldIds?: ReadonlyArray<string>;
}

export interface SnapshotPortEntry {
  readonly snapshotId: string;
  readonly timestamp: number;
  readonly worldId: string;
  readonly entityCount: number;
  readonly hash: string;
}

export interface DataExportDeps {
  readonly chronicle: ChronicleExportPort;
  readonly snapshots: SnapshotExportPort;
  readonly clock: { nowMicroseconds(): number };
  readonly idGenerator: { next(): string };
}

// ─── Public Interface ───────────────────────────────────────────────

export interface DataExporter {
  export(filter?: ExportFilter): ExportBundle;
  exportChronicle(filter?: ExportFilter): ExportBundle;
  exportSnapshots(filter?: ExportFilter): ExportBundle;
  getStats(): ExportStats;
}

// ─── State ──────────────────────────────────────────────────────────

interface ExporterState {
  readonly deps: DataExportDeps;
  totalExports: number;
  totalEntriesExported: number;
  lastExportAt: number | null;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createDataExporter(deps: DataExportDeps): DataExporter {
  const state: ExporterState = {
    deps,
    totalExports: 0,
    totalEntriesExported: 0,
    lastExportAt: null,
  };

  return {
    export: (f) => exportAll(state, f),
    exportChronicle: (f) => exportChronicleOnly(state, f),
    exportSnapshots: (f) => exportSnapshotsOnly(state, f),
    getStats: () => buildStats(state),
  };
}

// ─── Export All ─────────────────────────────────────────────────────

function exportAll(state: ExporterState, filter?: ExportFilter): ExportBundle {
  const chronicleEntries = getChronicleEntries(state, filter);
  const snapshotEntries = getSnapshotEntries(state, filter);
  const allEntries = [...chronicleEntries, ...snapshotEntries];
  allEntries.sort((a, b) => a.timestamp - b.timestamp);

  const limited = applyPagination(allEntries, filter);
  const total = state.deps.chronicle.count() + state.deps.snapshots.count();
  return finishExport(state, limited, total, filter);
}

// ─── Export Chronicle ───────────────────────────────────────────────

function exportChronicleOnly(state: ExporterState, filter?: ExportFilter): ExportBundle {
  const entries = getChronicleEntries(state, filter);
  const limited = applyPagination(entries, filter);
  return finishExport(state, limited, state.deps.chronicle.count(), filter);
}

// ─── Export Snapshots ───────────────────────────────────────────────

function exportSnapshotsOnly(state: ExporterState, filter?: ExportFilter): ExportBundle {
  const entries = getSnapshotEntries(state, filter);
  const limited = applyPagination(entries, filter);
  return finishExport(state, limited, state.deps.snapshots.count(), filter);
}

// ─── Chronicle Conversion ──────────────────────────────────────────

function getChronicleEntries(state: ExporterState, filter?: ExportFilter): ExportEntry[] {
  if (filter?.source === 'snapshot') return [];

  const portFilter: ChroniclePortFilter = {
    categories: filter?.categories,
    fromTimestamp: filter?.fromTimestamp,
    toTimestamp: filter?.toTimestamp,
    worldIds: filter?.worldIds,
  };

  const raw = state.deps.chronicle.queryEntries(portFilter);
  return raw.map(toChronicleExportEntry);
}

function toChronicleExportEntry(entry: ChroniclePortEntry): ExportEntry {
  return {
    id: entry.entryId,
    source: 'chronicle',
    timestamp: entry.timestamp,
    category: entry.category,
    data: {
      worldId: entry.worldId,
      subjectId: entry.subjectId,
      content: entry.content,
      hash: entry.hash,
    },
  };
}

// ─── Snapshot Conversion ────────────────────────────────────────────

function getSnapshotEntries(state: ExporterState, filter?: ExportFilter): ExportEntry[] {
  if (filter?.source === 'chronicle') return [];

  const portFilter: SnapshotPortFilter = {
    fromTimestamp: filter?.fromTimestamp,
    toTimestamp: filter?.toTimestamp,
    worldIds: filter?.worldIds,
  };

  const raw = state.deps.snapshots.querySnapshots(portFilter);
  return raw.map(toSnapshotExportEntry);
}

function toSnapshotExportEntry(entry: SnapshotPortEntry): ExportEntry {
  return {
    id: entry.snapshotId,
    source: 'snapshot',
    timestamp: entry.timestamp,
    category: 'state.snapshot',
    data: {
      worldId: entry.worldId,
      entityCount: entry.entityCount,
      hash: entry.hash,
    },
  };
}

// ─── Pagination ─────────────────────────────────────────────────────

function applyPagination(
  entries: ReadonlyArray<ExportEntry>,
  filter?: ExportFilter,
): ReadonlyArray<ExportEntry> {
  const offset = filter?.offset ?? 0;
  const limit = filter?.limit ?? entries.length;
  return entries.slice(offset, offset + limit);
}

// ─── Finalize ───────────────────────────────────────────────────────

function finishExport(
  state: ExporterState,
  entries: ReadonlyArray<ExportEntry>,
  totalAvailable: number,
  filter?: ExportFilter,
): ExportBundle {
  const now = state.deps.clock.nowMicroseconds();
  state.totalExports += 1;
  state.totalEntriesExported += entries.length;
  state.lastExportAt = now;

  return {
    exportId: state.deps.idGenerator.next(),
    createdAt: now,
    format: 'structured',
    entryCount: entries.length,
    entries,
    metadata: {
      sourceFilter: filter ?? {},
      totalAvailable,
      exported: entries.length,
      truncated: entries.length < totalAvailable,
    },
  };
}

// ─── Stats ──────────────────────────────────────────────────────────

function buildStats(state: ExporterState): ExportStats {
  return {
    totalExports: state.totalExports,
    totalEntriesExported: state.totalEntriesExported,
    lastExportAt: state.lastExportAt,
  };
}
