/**
 * state-snapshot.ts — World state snapshots for persistence and rollback.
 *
 * Captures a frozen representation of world state at a point in time.
 * Snapshots are immutable once created, support comparison, and maintain
 * a bounded history per world for efficient storage.
 */

// ── Ports ────────────────────────────────────────────────────────

interface SnapshotClock {
  readonly nowMicroseconds: () => number;
}

interface SnapshotIdGenerator {
  readonly next: () => string;
}

interface SnapshotServiceDeps {
  readonly clock: SnapshotClock;
  readonly idGenerator: SnapshotIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

interface StateSnapshot {
  readonly snapshotId: string;
  readonly worldId: string;
  readonly createdAt: number;
  readonly entityCount: number;
  readonly label: string;
  readonly data: ReadonlyMap<string, unknown>;
}

interface CaptureSnapshotParams {
  readonly worldId: string;
  readonly label: string;
  readonly data: ReadonlyMap<string, unknown>;
  readonly entityCount: number;
}

interface SnapshotDiff {
  readonly addedKeys: readonly string[];
  readonly removedKeys: readonly string[];
  readonly changedKeys: readonly string[];
}

interface SnapshotServiceConfig {
  readonly maxSnapshotsPerWorld: number;
}

interface SnapshotServiceStats {
  readonly totalSnapshots: number;
  readonly trackedWorlds: number;
  readonly oldestSnapshotAge: number;
}

interface SnapshotService {
  readonly capture: (params: CaptureSnapshotParams) => StateSnapshot;
  readonly getSnapshot: (snapshotId: string) => StateSnapshot | undefined;
  readonly listByWorld: (worldId: string) => readonly StateSnapshot[];
  readonly getLatest: (worldId: string) => StateSnapshot | undefined;
  readonly diff: (aId: string, bId: string) => SnapshotDiff | undefined;
  readonly remove: (snapshotId: string) => boolean;
  readonly getStats: () => SnapshotServiceStats;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_SNAPSHOT_CONFIG: SnapshotServiceConfig = {
  maxSnapshotsPerWorld: 20,
};

// ── State ────────────────────────────────────────────────────────

interface SnapshotState {
  readonly deps: SnapshotServiceDeps;
  readonly config: SnapshotServiceConfig;
  readonly snapshots: Map<string, StateSnapshot>;
  readonly worldHistory: Map<string, string[]>;
}

// ── Helpers ──────────────────────────────────────────────────────

function enforceLimit(state: SnapshotState, worldId: string): void {
  const history = state.worldHistory.get(worldId);
  if (!history) return;
  while (history.length > state.config.maxSnapshotsPerWorld) {
    const oldest = history.shift();
    if (oldest !== undefined) state.snapshots.delete(oldest);
  }
}

function computeDiff(a: StateSnapshot, b: StateSnapshot): SnapshotDiff {
  const addedKeys: string[] = [];
  const removedKeys: string[] = [];
  const changedKeys: string[] = [];
  for (const key of b.data.keys()) {
    if (!a.data.has(key)) {
      addedKeys.push(key);
    } else if (a.data.get(key) !== b.data.get(key)) {
      changedKeys.push(key);
    }
  }
  for (const key of a.data.keys()) {
    if (!b.data.has(key)) removedKeys.push(key);
  }
  return { addedKeys, removedKeys, changedKeys };
}

// ── Operations ───────────────────────────────────────────────────

function captureImpl(state: SnapshotState, params: CaptureSnapshotParams): StateSnapshot {
  const snapshot: StateSnapshot = {
    snapshotId: state.deps.idGenerator.next(),
    worldId: params.worldId,
    createdAt: state.deps.clock.nowMicroseconds(),
    entityCount: params.entityCount,
    label: params.label,
    data: new Map(params.data),
  };
  state.snapshots.set(snapshot.snapshotId, snapshot);
  let history = state.worldHistory.get(params.worldId);
  if (!history) {
    history = [];
    state.worldHistory.set(params.worldId, history);
  }
  history.push(snapshot.snapshotId);
  enforceLimit(state, params.worldId);
  return snapshot;
}

function removeImpl(state: SnapshotState, snapshotId: string): boolean {
  const snap = state.snapshots.get(snapshotId);
  if (!snap) return false;
  state.snapshots.delete(snapshotId);
  const history = state.worldHistory.get(snap.worldId);
  if (history) {
    const idx = history.indexOf(snapshotId);
    if (idx >= 0) history.splice(idx, 1);
  }
  return true;
}

function getStatsImpl(state: SnapshotState): SnapshotServiceStats {
  const now = state.deps.clock.nowMicroseconds();
  let oldest = 0;
  for (const snap of state.snapshots.values()) {
    const age = now - snap.createdAt;
    if (age > oldest) oldest = age;
  }
  return {
    totalSnapshots: state.snapshots.size,
    trackedWorlds: state.worldHistory.size,
    oldestSnapshotAge: oldest,
  };
}

// ── Query helpers ────────────────────────────────────────────────

function listByWorldImpl(state: SnapshotState, worldId: string): StateSnapshot[] {
  const ids = state.worldHistory.get(worldId) ?? [];
  return ids.flatMap((id) => {
    const s = state.snapshots.get(id);
    return s ? [s] : [];
  });
}

function getLatestImpl(state: SnapshotState, worldId: string): StateSnapshot | undefined {
  const ids = state.worldHistory.get(worldId);
  if (!ids || ids.length === 0) return undefined;
  const lastId = ids[ids.length - 1];
  return lastId !== undefined ? state.snapshots.get(lastId) : undefined;
}

function diffImpl(state: SnapshotState, aId: string, bId: string): SnapshotDiff | undefined {
  const a = state.snapshots.get(aId);
  const b = state.snapshots.get(bId);
  if (!a || !b) return undefined;
  return computeDiff(a, b);
}

// ── Factory ──────────────────────────────────────────────────────

function createSnapshotService(
  deps: SnapshotServiceDeps,
  config?: Partial<SnapshotServiceConfig>,
): SnapshotService {
  const state: SnapshotState = {
    deps,
    config: { ...DEFAULT_SNAPSHOT_CONFIG, ...config },
    snapshots: new Map(),
    worldHistory: new Map(),
  };
  return {
    capture: (p) => captureImpl(state, p),
    getSnapshot: (id) => state.snapshots.get(id),
    listByWorld: (wid) => listByWorldImpl(state, wid),
    getLatest: (wid) => getLatestImpl(state, wid),
    diff: (aId, bId) => diffImpl(state, aId, bId),
    remove: (id) => removeImpl(state, id),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createSnapshotService, DEFAULT_SNAPSHOT_CONFIG };
export type {
  SnapshotService,
  SnapshotServiceDeps,
  SnapshotServiceConfig,
  StateSnapshot,
  CaptureSnapshotParams,
  SnapshotDiff,
  SnapshotServiceStats,
};
