/**
 * State Snapshot Engine — Point-in-time world state capture and restoration.
 *
 * The Foundation Archive preserves world state at critical moments:
 *   - Periodic checkpoints (every N ticks or M seconds)
 *   - Before major events (world transitions, economy resets)
 *   - On demand (admin commands, debugging)
 *
 * Each snapshot captures a serialized state blob with metadata:
 *   - World ID, tick number, wall clock time
 *   - Content hash for integrity verification
 *   - Optional parent snapshot for delta chains
 *
 * "The Archive remembers what the living forget."
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface StateSnapshot {
  readonly snapshotId: string;
  readonly worldId: string;
  readonly tickNumber: number;
  readonly capturedAt: number;
  readonly contentHash: string;
  readonly sizeBytes: number;
  readonly parentSnapshotId: string | null;
  readonly tags: ReadonlyArray<string>;
}

export interface CaptureParams {
  readonly worldId: string;
  readonly tickNumber: number;
  readonly stateData: Uint8Array;
  readonly tags?: ReadonlyArray<string>;
  readonly parentSnapshotId?: string;
}

export interface SnapshotFilter {
  readonly worldId?: string;
  readonly minTick?: number;
  readonly maxTick?: number;
  readonly tag?: string;
}

export interface SnapshotRestoreResult {
  readonly snapshot: StateSnapshot;
  readonly stateData: Uint8Array;
}

// ─── Port Interfaces ────────────────────────────────────────────────

export interface SnapshotHasher {
  hash(data: Uint8Array): string;
}

export interface SnapshotIdGenerator {
  next(): string;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface StateSnapshotEngine {
  capture(params: CaptureParams): StateSnapshot;
  restore(snapshotId: string): SnapshotRestoreResult;
  getSnapshot(snapshotId: string): StateSnapshot;
  tryGetSnapshot(snapshotId: string): StateSnapshot | undefined;
  findSnapshots(filter: SnapshotFilter): ReadonlyArray<StateSnapshot>;
  getLatest(worldId: string): StateSnapshot | undefined;
  getHistory(worldId: string, limit: number): ReadonlyArray<StateSnapshot>;
  prune(worldId: string, keepCount: number): number;
  count(): number;
  countByWorld(worldId: string): number;
}

export interface StateSnapshotDeps {
  readonly hasher: SnapshotHasher;
  readonly idGenerator: SnapshotIdGenerator;
  readonly clock: { nowMicroseconds(): number };
}

// ─── State ──────────────────────────────────────────────────────────

interface StoredSnapshot {
  readonly meta: StateSnapshot;
  readonly data: Uint8Array;
}

interface EngineState {
  readonly snapshots: Map<string, StoredSnapshot>;
  readonly worldIndex: Map<string, string[]>; // worldId → snapshotIds (ordered)
  readonly deps: StateSnapshotDeps;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createStateSnapshotEngine(
  deps: StateSnapshotDeps,
): StateSnapshotEngine {
  const state: EngineState = {
    snapshots: new Map(),
    worldIndex: new Map(),
    deps,
  };

  return {
    capture: (p) => captureImpl(state, p),
    restore: (id) => restoreImpl(state, id),
    getSnapshot: (id) => getSnapshotImpl(state, id),
    tryGetSnapshot: (id) => state.snapshots.get(id)?.meta,
    findSnapshots: (f) => findSnapshotsImpl(state, f),
    getLatest: (w) => getLatestImpl(state, w),
    getHistory: (w, l) => getHistoryImpl(state, w, l),
    prune: (w, k) => pruneImpl(state, w, k),
    count: () => state.snapshots.size,
    countByWorld: (w) => countByWorldImpl(state, w),
  };
}

// ─── Capture ────────────────────────────────────────────────────────

function captureImpl(state: EngineState, params: CaptureParams): StateSnapshot {
  const snapshotId = state.deps.idGenerator.next();
  const contentHash = state.deps.hasher.hash(params.stateData);
  const now = state.deps.clock.nowMicroseconds();

  const meta: StateSnapshot = {
    snapshotId,
    worldId: params.worldId,
    tickNumber: params.tickNumber,
    capturedAt: now,
    contentHash,
    sizeBytes: params.stateData.length,
    parentSnapshotId: params.parentSnapshotId ?? null,
    tags: params.tags ?? [],
  };

  state.snapshots.set(snapshotId, { meta, data: params.stateData });
  addToWorldIndex(state, params.worldId, snapshotId);
  return meta;
}

function addToWorldIndex(
  state: EngineState,
  worldId: string,
  snapshotId: string,
): void {
  const existing = state.worldIndex.get(worldId);
  if (existing !== undefined) {
    existing.push(snapshotId);
  } else {
    state.worldIndex.set(worldId, [snapshotId]);
  }
}

// ─── Restore ────────────────────────────────────────────────────────

function restoreImpl(state: EngineState, snapshotId: string): SnapshotRestoreResult {
  const stored = state.snapshots.get(snapshotId);
  if (stored === undefined) {
    throw new Error('Snapshot ' + snapshotId + ' not found');
  }
  return { snapshot: stored.meta, stateData: stored.data };
}

// ─── Queries ────────────────────────────────────────────────────────

function getSnapshotImpl(state: EngineState, snapshotId: string): StateSnapshot {
  const stored = state.snapshots.get(snapshotId);
  if (stored === undefined) {
    throw new Error('Snapshot ' + snapshotId + ' not found');
  }
  return stored.meta;
}

function findSnapshotsImpl(
  state: EngineState,
  filter: SnapshotFilter,
): ReadonlyArray<StateSnapshot> {
  const results: StateSnapshot[] = [];
  for (const stored of state.snapshots.values()) {
    if (matchesFilter(stored.meta, filter)) {
      results.push(stored.meta);
    }
  }
  return results;
}

function matchesFilter(snap: StateSnapshot, filter: SnapshotFilter): boolean {
  if (filter.worldId !== undefined && snap.worldId !== filter.worldId) return false;
  if (filter.minTick !== undefined && snap.tickNumber < filter.minTick) return false;
  if (filter.maxTick !== undefined && snap.tickNumber > filter.maxTick) return false;
  if (filter.tag !== undefined && !snap.tags.includes(filter.tag)) return false;
  return true;
}

function getLatestImpl(state: EngineState, worldId: string): StateSnapshot | undefined {
  const ids = state.worldIndex.get(worldId);
  if (ids === undefined || ids.length === 0) return undefined;
  const lastId = ids[ids.length - 1];
  if (lastId === undefined) return undefined;
  return state.snapshots.get(lastId)?.meta;
}

function getHistoryImpl(
  state: EngineState,
  worldId: string,
  limit: number,
): ReadonlyArray<StateSnapshot> {
  const ids = state.worldIndex.get(worldId);
  if (ids === undefined) return [];
  const recent = ids.slice(-limit);
  return recent
    .map((id) => state.snapshots.get(id)?.meta)
    .filter((m): m is StateSnapshot => m !== undefined)
    .reverse();
}

// ─── Pruning ────────────────────────────────────────────────────────

function pruneImpl(state: EngineState, worldId: string, keepCount: number): number {
  const ids = state.worldIndex.get(worldId);
  if (ids === undefined) return 0;
  if (ids.length <= keepCount) return 0;

  const removeCount = ids.length - keepCount;
  const toRemove = ids.splice(0, removeCount);
  for (const id of toRemove) {
    state.snapshots.delete(id);
  }
  return removeCount;
}

function countByWorldImpl(state: EngineState, worldId: string): number {
  return state.worldIndex.get(worldId)?.length ?? 0;
}
