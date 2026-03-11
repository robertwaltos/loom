/**
 * aggregate-snapshot-store.ts — Snapshot storage for aggregate fast-forwarding.
 *
 * Stores point-in-time state snapshots of aggregates, enabling fast-forward
 * reconstruction without replaying the full event stream from version zero.
 * Supports pruning old snapshots while retaining the most recent N.
 *
 * "Capture a moment. Skip the journey. Arrive at the present."
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

export type SnapshotId = string;
export type AggregateId = string;

export type SnapshotError =
  | 'aggregate-not-found'
  | 'snapshot-not-found'
  | 'invalid-version'
  | 'invalid-state';

export type AggregateSnapshot = {
  snapshotId: SnapshotId;
  aggregateId: AggregateId;
  aggregateType: string;
  version: number;
  state: Record<string, string | number | boolean | bigint | null>;
  createdAt: bigint;
};

export type SnapshotMetadata = {
  aggregateId: AggregateId;
  latestVersion: number;
  snapshotCount: number;
  oldestSnapshotAt: bigint | null;
  latestSnapshotAt: bigint | null;
};

// ============================================================================
// STATE
// ============================================================================

export type AggregateSnapshotStoreState = {
  snapshots: Map<SnapshotId, AggregateSnapshot>;
  snapshotsByAggregate: Map<AggregateId, SnapshotId[]>;
};

// ============================================================================
// FACTORY
// ============================================================================

export function createAggregateSnapshotStoreState(): AggregateSnapshotStoreState {
  return {
    snapshots: new Map(),
    snapshotsByAggregate: new Map(),
  };
}

// ============================================================================
// SAVE
// ============================================================================

export function saveSnapshot(
  state: AggregateSnapshotStoreState,
  aggregateId: AggregateId,
  aggregateType: string,
  version: number,
  snapshotState: Record<string, string | number | boolean | bigint | null>,
  idGen: IdGenerator,
  clock: Clock,
  logger: Logger,
): AggregateSnapshot | SnapshotError {
  if (version < 0) return 'invalid-version';
  if (Object.keys(snapshotState).length === 0) return 'invalid-state';

  const snapshot: AggregateSnapshot = {
    snapshotId: idGen.generate(),
    aggregateId,
    aggregateType,
    version,
    state: snapshotState,
    createdAt: clock.now(),
  };

  state.snapshots.set(snapshot.snapshotId, snapshot);
  appendSnapshotToAggregateIndex(state, aggregateId, snapshot.snapshotId);

  logger.info('Snapshot saved: ' + aggregateType + '/' + aggregateId + ' v' + String(version));

  return snapshot;
}

function appendSnapshotToAggregateIndex(
  state: AggregateSnapshotStoreState,
  aggregateId: AggregateId,
  snapshotId: SnapshotId,
): void {
  const existing = state.snapshotsByAggregate.get(aggregateId);
  if (existing !== undefined) {
    existing.push(snapshotId);
  } else {
    state.snapshotsByAggregate.set(aggregateId, [snapshotId]);
  }
}

// ============================================================================
// QUERIES
// ============================================================================

export function getLatestSnapshot(
  state: AggregateSnapshotStoreState,
  aggregateId: AggregateId,
): AggregateSnapshot | undefined {
  const ids = state.snapshotsByAggregate.get(aggregateId);
  if (ids === undefined || ids.length === 0) return undefined;

  let latest: AggregateSnapshot | undefined;
  for (const id of ids) {
    const snap = state.snapshots.get(id);
    if (snap === undefined) continue;
    if (latest === undefined || snap.version > latest.version) {
      latest = snap;
    }
  }
  return latest;
}

export function getSnapshotAtVersion(
  state: AggregateSnapshotStoreState,
  aggregateId: AggregateId,
  version: number,
): AggregateSnapshot | undefined {
  const ids = state.snapshotsByAggregate.get(aggregateId);
  if (ids === undefined) return undefined;

  let best: AggregateSnapshot | undefined;
  for (const id of ids) {
    const snap = state.snapshots.get(id);
    if (snap === undefined || snap.version > version) continue;
    if (best === undefined || snap.version > best.version) {
      best = snap;
    }
  }
  return best;
}

export function listSnapshots(
  state: AggregateSnapshotStoreState,
  aggregateId: AggregateId,
): ReadonlyArray<AggregateSnapshot> {
  const ids = state.snapshotsByAggregate.get(aggregateId);
  if (ids === undefined) return [];

  const snaps: AggregateSnapshot[] = [];
  for (const id of ids) {
    const snap = state.snapshots.get(id);
    if (snap !== undefined) snaps.push(snap);
  }
  return snaps;
}

export function getSnapshotMetadata(
  state: AggregateSnapshotStoreState,
  aggregateId: AggregateId,
): SnapshotMetadata | undefined {
  const ids = state.snapshotsByAggregate.get(aggregateId);
  if (ids === undefined || ids.length === 0) return undefined;

  let latestVersion = -1;
  let oldestAt: bigint | null = null;
  let latestAt: bigint | null = null;
  let count = 0;

  for (const id of ids) {
    const snap = state.snapshots.get(id);
    if (snap === undefined) continue;

    count = count + 1;
    if (snap.version > latestVersion) latestVersion = snap.version;
    if (oldestAt === null || snap.createdAt < oldestAt) oldestAt = snap.createdAt;
    if (latestAt === null || snap.createdAt > latestAt) latestAt = snap.createdAt;
  }

  if (count === 0) return undefined;

  return {
    aggregateId,
    latestVersion,
    snapshotCount: count,
    oldestSnapshotAt: oldestAt,
    latestSnapshotAt: latestAt,
  };
}

// ============================================================================
// PRUNING
// ============================================================================

export function deleteOldSnapshots(
  state: AggregateSnapshotStoreState,
  aggregateId: AggregateId,
  keepCount: number,
): { success: true; deleted: number } {
  const ids = state.snapshotsByAggregate.get(aggregateId);
  if (ids === undefined || ids.length <= keepCount) return { success: true, deleted: 0 };

  const snaps: AggregateSnapshot[] = [];
  for (const id of ids) {
    const snap = state.snapshots.get(id);
    if (snap !== undefined) snaps.push(snap);
  }

  snaps.sort((a, b) => b.version - a.version);

  const toDelete = snaps.slice(keepCount);
  const keepIds = new Set(snaps.slice(0, keepCount).map((s) => s.snapshotId));

  for (const snap of toDelete) {
    state.snapshots.delete(snap.snapshotId);
  }

  const updatedIds = ids.filter((id) => keepIds.has(id));
  state.snapshotsByAggregate.set(aggregateId, updatedIds);

  return { success: true, deleted: toDelete.length };
}

export function purgeAggregate(
  state: AggregateSnapshotStoreState,
  aggregateId: AggregateId,
): { success: true; deleted: number } {
  const ids = state.snapshotsByAggregate.get(aggregateId);
  if (ids === undefined) return { success: true, deleted: 0 };

  const deleted = ids.length;
  for (const id of ids) {
    state.snapshots.delete(id);
  }
  state.snapshotsByAggregate.delete(aggregateId);

  return { success: true, deleted };
}
