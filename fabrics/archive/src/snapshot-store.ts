/**
 * snapshot-store.ts — World state snapshot management.
 *
 * Creates snapshots of world state at specific timestamps,
 * diffs between snapshots, restores from snapshots, manages
 * snapshot versioning, and tracks compression metadata.
 *
 * "The Archive remembers every state the world has known."
 */

// ── Ports ────────────────────────────────────────────────────────

interface SnapshotStoreClock {
  readonly nowMicroseconds: () => number;
}

interface SnapshotStoreIdGenerator {
  readonly generate: () => string;
}

interface SnapshotStoreHasher {
  readonly hash: (data: Uint8Array) => string;
}

interface SnapshotStoreDeps {
  readonly clock: SnapshotStoreClock;
  readonly idGenerator: SnapshotStoreIdGenerator;
  readonly hasher: SnapshotStoreHasher;
}

// ── Types ────────────────────────────────────────────────────────

type SnapshotStatus = 'active' | 'superseded' | 'archived';

interface CompressionMeta {
  readonly algorithm: string;
  readonly originalSizeBytes: number;
  readonly compressedSizeBytes: number;
  readonly ratio: number;
}

interface Snapshot {
  readonly snapshotId: string;
  readonly worldId: string;
  readonly version: number;
  readonly createdAt: number;
  readonly contentHash: string;
  readonly sizeBytes: number;
  readonly status: SnapshotStatus;
  readonly label: string;
  readonly parentId: string | null;
  readonly compression: CompressionMeta | null;
}

interface CreateSnapshotParams {
  readonly worldId: string;
  readonly data: Uint8Array;
  readonly label: string;
  readonly parentId?: string;
  readonly compression?: CompressionMeta;
}

interface SnapshotDiff {
  readonly baseSnapshotId: string;
  readonly targetSnapshotId: string;
  readonly baseVersion: number;
  readonly targetVersion: number;
  readonly baseSizeBytes: number;
  readonly targetSizeBytes: number;
  readonly sizeDeltaBytes: number;
  readonly hashesMatch: boolean;
  readonly computedAt: number;
}

interface SnapshotQuery {
  readonly worldId?: string;
  readonly status?: SnapshotStatus;
  readonly minVersion?: number;
  readonly maxVersion?: number;
  readonly label?: string;
}

interface RestoreResult {
  readonly snapshot: Snapshot;
  readonly data: Uint8Array;
}

interface SnapshotStoreStats {
  readonly totalSnapshots: number;
  readonly activeCount: number;
  readonly supersededCount: number;
  readonly archivedCount: number;
  readonly totalSizeBytes: number;
  readonly worldCount: number;
}

// ── Public Interface ─────────────────────────────────────────────

interface SnapshotStore {
  readonly create: (params: CreateSnapshotParams) => Snapshot;
  readonly restore: (snapshotId: string) => RestoreResult;
  readonly get: (snapshotId: string) => Snapshot | undefined;
  readonly getRequired: (snapshotId: string) => Snapshot;
  readonly diff: (baseId: string, targetId: string) => SnapshotDiff;
  readonly find: (query: SnapshotQuery) => ReadonlyArray<Snapshot>;
  readonly getLatest: (worldId: string) => Snapshot | undefined;
  readonly getVersionHistory: (worldId: string) => ReadonlyArray<Snapshot>;
  readonly setStatus: (snapshotId: string, status: SnapshotStatus) => Snapshot;
  readonly prune: (worldId: string, keepCount: number) => number;
  readonly getStats: () => SnapshotStoreStats;
}

// ── State ────────────────────────────────────────────────────────

interface StoredSnapshot {
  meta: Snapshot;
  readonly data: Uint8Array;
}

interface StoreState {
  readonly deps: SnapshotStoreDeps;
  readonly snapshots: Map<string, StoredSnapshot>;
  readonly worldIndex: Map<string, string[]>;
  readonly worldVersionCounters: Map<string, number>;
}

// ── Factory ──────────────────────────────────────────────────────

function createSnapshotStore(deps: SnapshotStoreDeps): SnapshotStore {
  const state: StoreState = {
    deps,
    snapshots: new Map(),
    worldIndex: new Map(),
    worldVersionCounters: new Map(),
  };

  return {
    create: (p) => createImpl(state, p),
    restore: (id) => restoreImpl(state, id),
    get: (id) => state.snapshots.get(id)?.meta,
    getRequired: (id) => getRequiredImpl(state, id),
    diff: (b, t) => diffImpl(state, b, t),
    find: (q) => findImpl(state, q),
    getLatest: (w) => getLatestImpl(state, w),
    getVersionHistory: (w) => getVersionHistoryImpl(state, w),
    setStatus: (id, s) => setStatusImpl(state, id, s),
    prune: (w, k) => pruneImpl(state, w, k),
    getStats: () => getStatsImpl(state),
  };
}

// ── Create ───────────────────────────────────────────────────────

function createImpl(state: StoreState, params: CreateSnapshotParams): Snapshot {
  const snapshotId = state.deps.idGenerator.generate();
  const version = nextVersion(state, params.worldId);
  const contentHash = state.deps.hasher.hash(params.data);
  const now = state.deps.clock.nowMicroseconds();

  const meta: Snapshot = {
    snapshotId,
    worldId: params.worldId,
    version,
    createdAt: now,
    contentHash,
    sizeBytes: params.data.length,
    status: 'active',
    label: params.label,
    parentId: params.parentId ?? null,
    compression: params.compression ?? null,
  };

  state.snapshots.set(snapshotId, { meta, data: params.data });
  appendToWorldIndex(state, params.worldId, snapshotId);
  return meta;
}

function nextVersion(state: StoreState, worldId: string): number {
  const current = state.worldVersionCounters.get(worldId) ?? 0;
  const next = current + 1;
  state.worldVersionCounters.set(worldId, next);
  return next;
}

function appendToWorldIndex(state: StoreState, worldId: string, snapshotId: string): void {
  const existing = state.worldIndex.get(worldId);
  if (existing !== undefined) {
    existing.push(snapshotId);
  } else {
    state.worldIndex.set(worldId, [snapshotId]);
  }
}

// ── Restore ──────────────────────────────────────────────────────

function restoreImpl(state: StoreState, snapshotId: string): RestoreResult {
  const stored = state.snapshots.get(snapshotId);
  if (stored === undefined) {
    throw new Error('Snapshot not found: ' + snapshotId);
  }
  return { snapshot: stored.meta, data: stored.data };
}

// ── Queries ──────────────────────────────────────────────────────

function getRequiredImpl(state: StoreState, snapshotId: string): Snapshot {
  const stored = state.snapshots.get(snapshotId);
  if (stored === undefined) {
    throw new Error('Snapshot not found: ' + snapshotId);
  }
  return stored.meta;
}

function diffImpl(state: StoreState, baseId: string, targetId: string): SnapshotDiff {
  const base = getRequiredImpl(state, baseId);
  const target = getRequiredImpl(state, targetId);
  return {
    baseSnapshotId: baseId,
    targetSnapshotId: targetId,
    baseVersion: base.version,
    targetVersion: target.version,
    baseSizeBytes: base.sizeBytes,
    targetSizeBytes: target.sizeBytes,
    sizeDeltaBytes: target.sizeBytes - base.sizeBytes,
    hashesMatch: base.contentHash === target.contentHash,
    computedAt: state.deps.clock.nowMicroseconds(),
  };
}

function findImpl(state: StoreState, query: SnapshotQuery): ReadonlyArray<Snapshot> {
  const results: Snapshot[] = [];
  for (const stored of state.snapshots.values()) {
    if (matchesQuery(stored.meta, query)) {
      results.push(stored.meta);
    }
  }
  return results;
}

function matchesQuery(snap: Snapshot, query: SnapshotQuery): boolean {
  if (query.worldId !== undefined && snap.worldId !== query.worldId) return false;
  if (query.status !== undefined && snap.status !== query.status) return false;
  if (query.minVersion !== undefined && snap.version < query.minVersion) return false;
  if (query.maxVersion !== undefined && snap.version > query.maxVersion) return false;
  if (query.label !== undefined && snap.label !== query.label) return false;
  return true;
}

function getLatestImpl(state: StoreState, worldId: string): Snapshot | undefined {
  const ids = state.worldIndex.get(worldId);
  if (ids === undefined || ids.length === 0) return undefined;
  const lastId = ids[ids.length - 1];
  if (lastId === undefined) return undefined;
  return state.snapshots.get(lastId)?.meta;
}

function getVersionHistoryImpl(state: StoreState, worldId: string): ReadonlyArray<Snapshot> {
  const ids = state.worldIndex.get(worldId);
  if (ids === undefined) return [];
  return ids
    .map((id) => state.snapshots.get(id)?.meta)
    .filter((m): m is Snapshot => m !== undefined);
}

// ── Status Management ────────────────────────────────────────────

function setStatusImpl(state: StoreState, snapshotId: string, status: SnapshotStatus): Snapshot {
  const stored = state.snapshots.get(snapshotId);
  if (stored === undefined) {
    throw new Error('Snapshot not found: ' + snapshotId);
  }
  const updated: Snapshot = { ...stored.meta, status };
  stored.meta = updated;
  return updated;
}

// ── Pruning ──────────────────────────────────────────────────────

function pruneImpl(state: StoreState, worldId: string, keepCount: number): number {
  const ids = state.worldIndex.get(worldId);
  if (ids === undefined || ids.length <= keepCount) return 0;

  const removeCount = ids.length - keepCount;
  const toRemove = ids.splice(0, removeCount);
  for (const id of toRemove) {
    state.snapshots.delete(id);
  }
  return removeCount;
}

// ── Stats ────────────────────────────────────────────────────────

function getStatsImpl(state: StoreState): SnapshotStoreStats {
  let activeCount = 0;
  let supersededCount = 0;
  let archivedCount = 0;
  let totalSizeBytes = 0;

  for (const stored of state.snapshots.values()) {
    totalSizeBytes += stored.meta.sizeBytes;
    if (stored.meta.status === 'active') activeCount++;
    else if (stored.meta.status === 'superseded') supersededCount++;
    else archivedCount++;
  }

  return {
    totalSnapshots: state.snapshots.size,
    activeCount,
    supersededCount,
    archivedCount,
    totalSizeBytes,
    worldCount: state.worldIndex.size,
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createSnapshotStore };
export type {
  SnapshotStore,
  SnapshotStoreDeps,
  SnapshotStoreClock,
  SnapshotStoreIdGenerator,
  SnapshotStoreHasher,
  Snapshot,
  SnapshotStatus,
  CreateSnapshotParams,
  SnapshotDiff,
  SnapshotQuery,
  RestoreResult,
  CompressionMeta,
  SnapshotStoreStats,
};
