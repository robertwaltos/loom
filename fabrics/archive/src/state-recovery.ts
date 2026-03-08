/**
 * State Recovery Service — Coordinated point-in-time recovery.
 *
 * Orchestrates the process of restoring world state from snapshots:
 *   1. Locate candidate snapshots (latest, by tick, by tag)
 *   2. Verify snapshot integrity via content hash
 *   3. Apply state through an injected restoration port
 *   4. Record recovery in an audit trail
 *
 * Recovery is a critical operation — every step is tracked and any
 * failure produces a detailed error record.
 *
 * "The Archive heals what the present has broken."
 */

// ─── Types ──────────────────────────────────────────────────────────

export type RecoveryStatus = 'success' | 'failed' | 'partial';

export interface RecoveryResult {
  readonly recoveryId: string;
  readonly worldId: string;
  readonly snapshotId: string;
  readonly status: RecoveryStatus;
  readonly restoredTick: number;
  readonly startedAt: number;
  readonly completedAt: number;
  readonly error: string | null;
}

export interface RecoveryRequest {
  readonly worldId: string;
  readonly targetSnapshotId?: string;
  readonly targetTick?: number;
  readonly tag?: string;
}

export interface RecoveryCandidate {
  readonly snapshotId: string;
  readonly worldId: string;
  readonly tickNumber: number;
  readonly capturedAt: number;
  readonly sizeBytes: number;
  readonly integrityValid: boolean;
}

export interface RecoveryStats {
  readonly totalRecoveries: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly lastRecoveryAt: number | null;
}

// ─── Ports ──────────────────────────────────────────────────────────

export interface RecoverySnapshotPort {
  getSnapshot(snapshotId: string): {
    readonly snapshotId: string;
    readonly worldId: string;
    readonly tickNumber: number;
    readonly capturedAt: number;
    readonly contentHash: string;
    readonly sizeBytes: number;
  } | undefined;

  getLatest(worldId: string): {
    readonly snapshotId: string;
    readonly worldId: string;
    readonly tickNumber: number;
    readonly capturedAt: number;
    readonly contentHash: string;
    readonly sizeBytes: number;
  } | undefined;

  findByTick(worldId: string, tick: number): {
    readonly snapshotId: string;
    readonly worldId: string;
    readonly tickNumber: number;
    readonly capturedAt: number;
    readonly contentHash: string;
    readonly sizeBytes: number;
  } | undefined;

  restore(snapshotId: string): {
    readonly stateData: Uint8Array;
  };
}

export interface RecoveryHasherPort {
  hash(data: Uint8Array): string;
}

export interface RecoveryApplyPort {
  apply(worldId: string, stateData: Uint8Array, tick: number): boolean;
}

export interface RecoveryIdGenerator {
  next(): string;
}

export interface StateRecoveryDeps {
  readonly snapshotPort: RecoverySnapshotPort;
  readonly hasherPort: RecoveryHasherPort;
  readonly applyPort: RecoveryApplyPort;
  readonly idGenerator: RecoveryIdGenerator;
  readonly clock: { nowMicroseconds(): number };
}

// ─── Public Interface ───────────────────────────────────────────────

export interface StateRecoveryService {
  recover(request: RecoveryRequest): RecoveryResult;
  verifyIntegrity(snapshotId: string): RecoveryCandidate | undefined;
  getHistory(limit: number): ReadonlyArray<RecoveryResult>;
  getLastRecovery(worldId: string): RecoveryResult | undefined;
  getStats(): RecoveryStats;
}

// ─── State ──────────────────────────────────────────────────────────

interface ServiceState {
  readonly history: RecoveryResult[];
  readonly maxHistory: number;
  readonly deps: StateRecoveryDeps;
  successCount: number;
  failureCount: number;
  lastRecoveryAt: number | null;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createStateRecoveryService(
  deps: StateRecoveryDeps,
  maxHistory?: number,
): StateRecoveryService {
  const state: ServiceState = {
    history: [],
    maxHistory: maxHistory ?? 100,
    deps,
    successCount: 0,
    failureCount: 0,
    lastRecoveryAt: null,
  };

  return {
    recover: (r) => recoverImpl(state, r),
    verifyIntegrity: (id) => verifyImpl(state, id),
    getHistory: (l) => getHistoryImpl(state, l),
    getLastRecovery: (wid) => lastRecoveryImpl(state, wid),
    getStats: () => computeStats(state),
  };
}

// ─── Recovery ───────────────────────────────────────────────────────

function recoverImpl(
  state: ServiceState,
  request: RecoveryRequest,
): RecoveryResult {
  const startedAt = state.deps.clock.nowMicroseconds();
  const snapshot = resolveSnapshot(state.deps, request);

  if (snapshot === undefined) {
    return recordFailure(state, request.worldId, '', 0, startedAt, 'No snapshot found');
  }

  return executeRecovery(state, snapshot, startedAt);
}

function resolveSnapshot(
  deps: StateRecoveryDeps,
  request: RecoveryRequest,
): ReturnType<RecoverySnapshotPort['getSnapshot']> {
  if (request.targetSnapshotId !== undefined) {
    return deps.snapshotPort.getSnapshot(request.targetSnapshotId);
  }
  if (request.targetTick !== undefined) {
    return deps.snapshotPort.findByTick(request.worldId, request.targetTick);
  }
  return deps.snapshotPort.getLatest(request.worldId);
}

function executeRecovery(
  state: ServiceState,
  snapshot: NonNullable<ReturnType<RecoverySnapshotPort['getSnapshot']>>,
  startedAt: number,
): RecoveryResult {
  const restored = state.deps.snapshotPort.restore(snapshot.snapshotId);
  const hash = state.deps.hasherPort.hash(restored.stateData);

  if (hash !== snapshot.contentHash) {
    return recordFailure(
      state, snapshot.worldId, snapshot.snapshotId,
      snapshot.tickNumber, startedAt, 'Integrity check failed',
    );
  }

  return applyAndRecord(state, snapshot, restored.stateData, startedAt);
}

function applyAndRecord(
  state: ServiceState,
  snapshot: NonNullable<ReturnType<RecoverySnapshotPort['getSnapshot']>>,
  stateData: Uint8Array,
  startedAt: number,
): RecoveryResult {
  const applied = state.deps.applyPort.apply(
    snapshot.worldId, stateData, snapshot.tickNumber,
  );

  if (!applied) {
    return recordFailure(
      state, snapshot.worldId, snapshot.snapshotId,
      snapshot.tickNumber, startedAt, 'Apply failed',
    );
  }

  return recordSuccess(state, snapshot, startedAt);
}

// ─── Verify Integrity ───────────────────────────────────────────────

function verifyImpl(
  state: ServiceState,
  snapshotId: string,
): RecoveryCandidate | undefined {
  const snapshot = state.deps.snapshotPort.getSnapshot(snapshotId);
  if (snapshot === undefined) return undefined;

  const restored = state.deps.snapshotPort.restore(snapshotId);
  const hash = state.deps.hasherPort.hash(restored.stateData);

  return {
    snapshotId: snapshot.snapshotId,
    worldId: snapshot.worldId,
    tickNumber: snapshot.tickNumber,
    capturedAt: snapshot.capturedAt,
    sizeBytes: snapshot.sizeBytes,
    integrityValid: hash === snapshot.contentHash,
  };
}

// ─── Recording ──────────────────────────────────────────────────────

function recordSuccess(
  state: ServiceState,
  snapshot: NonNullable<ReturnType<RecoverySnapshotPort['getSnapshot']>>,
  startedAt: number,
): RecoveryResult {
  const result: RecoveryResult = {
    recoveryId: state.deps.idGenerator.next(),
    worldId: snapshot.worldId,
    snapshotId: snapshot.snapshotId,
    status: 'success',
    restoredTick: snapshot.tickNumber,
    startedAt,
    completedAt: state.deps.clock.nowMicroseconds(),
    error: null,
  };
  state.successCount += 1;
  state.lastRecoveryAt = result.completedAt;
  appendHistory(state, result);
  return result;
}

function recordFailure(
  state: ServiceState,
  worldId: string,
  snapshotId: string,
  tick: number,
  startedAt: number,
  error: string,
): RecoveryResult {
  const result: RecoveryResult = {
    recoveryId: state.deps.idGenerator.next(),
    worldId,
    snapshotId,
    status: 'failed',
    restoredTick: tick,
    startedAt,
    completedAt: state.deps.clock.nowMicroseconds(),
    error,
  };
  state.failureCount += 1;
  state.lastRecoveryAt = result.completedAt;
  appendHistory(state, result);
  return result;
}

// ─── History ────────────────────────────────────────────────────────

function appendHistory(state: ServiceState, result: RecoveryResult): void {
  state.history.push(result);
  while (state.history.length > state.maxHistory) {
    state.history.shift();
  }
}

function getHistoryImpl(
  state: ServiceState,
  limit: number,
): ReadonlyArray<RecoveryResult> {
  if (limit >= state.history.length) return [...state.history];
  return state.history.slice(state.history.length - limit);
}

function lastRecoveryImpl(
  state: ServiceState,
  worldId: string,
): RecoveryResult | undefined {
  for (let i = state.history.length - 1; i >= 0; i--) {
    if (state.history[i]?.worldId === worldId) return state.history[i];
  }
  return undefined;
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: ServiceState): RecoveryStats {
  return {
    totalRecoveries: state.successCount + state.failureCount,
    successCount: state.successCount,
    failureCount: state.failureCount,
    lastRecoveryAt: state.lastRecoveryAt,
  };
}
