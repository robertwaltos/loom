/**
 * Entity Spawn Lifecycle — Creation and destruction queue management.
 *
 * Manages entity spawning and destruction through deferred queues,
 * lifecycle hooks (onCreate, onDestroy), entity pooling for recycling
 * destroyed entities, and lifecycle event emission. Entities flow:
 *
 *   spawn queue → onCreate hooks → active → destroy queue → onDestroy hooks → pool/disposed
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface SpawnRequest {
  readonly entityId: string;
  readonly entityType: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly queuedAt: number;
}

export interface DestroyRequest {
  readonly entityId: string;
  readonly reason: string;
  readonly queuedAt: number;
}

export interface SpawnResult {
  readonly entityId: string;
  readonly entityType: string;
  readonly recycled: boolean;
  readonly createdAt: number;
}

export interface DestroyResult {
  readonly entityId: string;
  readonly reason: string;
  readonly pooled: boolean;
  readonly destroyedAt: number;
}

export type SpawnHook = (entityId: string, entityType: string) => void;
export type DestroyHook = (entityId: string, reason: string) => void;
export type LifecycleEventCallback = (event: LifecycleEvent) => void;

export interface LifecycleEvent {
  readonly kind: 'spawned' | 'destroyed';
  readonly entityId: string;
  readonly entityType: string;
  readonly at: number;
}

export interface PoolConfig {
  readonly enabled: boolean;
  readonly maxPooledPerType: number;
}

export interface FlushResult {
  readonly spawned: ReadonlyArray<SpawnResult>;
  readonly destroyed: ReadonlyArray<DestroyResult>;
}

export interface SpawnLifecycleStats {
  readonly spawnQueueSize: number;
  readonly destroyQueueSize: number;
  readonly totalSpawned: number;
  readonly totalDestroyed: number;
  readonly totalRecycled: number;
  readonly pooledEntityCount: number;
  readonly activeEntityCount: number;
}

export interface SpawnLifecycleDeps {
  readonly clock: { nowMicroseconds(): number };
  readonly idGenerator: { generate(): string };
  readonly poolConfig?: Partial<PoolConfig>;
}

export interface EntitySpawnLifecycle {
  enqueueSpawn(entityType: string, metadata?: Record<string, unknown>): SpawnRequest;
  enqueueSpawnWithId(
    entityId: string,
    entityType: string,
    metadata?: Record<string, unknown>,
  ): SpawnRequest;
  enqueueDestroy(entityId: string, reason: string): DestroyRequest | undefined;
  flushSpawns(): ReadonlyArray<SpawnResult>;
  flushDestroys(): ReadonlyArray<DestroyResult>;
  flush(): FlushResult;
  isActive(entityId: string): boolean;
  getEntityType(entityId: string): string | undefined;
  onSpawn(hook: SpawnHook): void;
  onDestroy(hook: DestroyHook): void;
  onLifecycleEvent(callback: LifecycleEventCallback): void;
  getStats(): SpawnLifecycleStats;
}

// ─── Constants ──────────────────────────────────────────────────────

const DEFAULT_MAX_POOLED = 32;

// ─── State ──────────────────────────────────────────────────────────

interface ActiveEntity {
  readonly entityId: string;
  readonly entityType: string;
}

interface ManagerState {
  readonly spawnQueue: SpawnRequest[];
  readonly destroyQueue: DestroyRequest[];
  readonly activeEntities: Map<string, ActiveEntity>;
  readonly pool: Map<string, string[]>;
  readonly spawnHooks: SpawnHook[];
  readonly destroyHooks: DestroyHook[];
  readonly eventCallbacks: LifecycleEventCallback[];
  readonly clock: { nowMicroseconds(): number };
  readonly idGenerator: { generate(): string };
  readonly poolEnabled: boolean;
  readonly maxPooledPerType: number;
  totalSpawned: number;
  totalDestroyed: number;
  totalRecycled: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createEntitySpawnLifecycle(deps: SpawnLifecycleDeps): EntitySpawnLifecycle {
  const state: ManagerState = {
    spawnQueue: [],
    destroyQueue: [],
    activeEntities: new Map(),
    pool: new Map(),
    spawnHooks: [],
    destroyHooks: [],
    eventCallbacks: [],
    clock: deps.clock,
    idGenerator: deps.idGenerator,
    poolEnabled: deps.poolConfig?.enabled ?? true,
    maxPooledPerType: deps.poolConfig?.maxPooledPerType ?? DEFAULT_MAX_POOLED,
    totalSpawned: 0,
    totalDestroyed: 0,
    totalRecycled: 0,
  };

  return {
    enqueueSpawn: (type, meta) => enqueueSpawnImpl(state, type, meta),
    enqueueSpawnWithId: (eid, type, meta) => enqueueSpawnWithIdImpl(state, eid, type, meta),
    enqueueDestroy: (eid, reason) => enqueueDestroyImpl(state, eid, reason),
    flushSpawns: () => flushSpawnsImpl(state),
    flushDestroys: () => flushDestroysImpl(state),
    flush: () => flushImpl(state),
    isActive: (eid) => state.activeEntities.has(eid),
    getEntityType: (eid) => state.activeEntities.get(eid)?.entityType,
    onSpawn: (hook) => {
      state.spawnHooks.push(hook);
    },
    onDestroy: (hook) => {
      state.destroyHooks.push(hook);
    },
    onLifecycleEvent: (cb) => {
      state.eventCallbacks.push(cb);
    },
    getStats: () => computeStats(state),
  };
}

// ─── Enqueue Spawn ──────────────────────────────────────────────────

function enqueueSpawnImpl(
  state: ManagerState,
  entityType: string,
  metadata?: Record<string, unknown>,
): SpawnRequest {
  const entityId = state.idGenerator.generate();
  return enqueueSpawnWithIdImpl(state, entityId, entityType, metadata);
}

function enqueueSpawnWithIdImpl(
  state: ManagerState,
  entityId: string,
  entityType: string,
  metadata?: Record<string, unknown>,
): SpawnRequest {
  const request: SpawnRequest = {
    entityId,
    entityType,
    metadata: metadata ?? {},
    queuedAt: state.clock.nowMicroseconds(),
  };
  state.spawnQueue.push(request);
  return request;
}

// ─── Enqueue Destroy ────────────────────────────────────────────────

function enqueueDestroyImpl(
  state: ManagerState,
  entityId: string,
  reason: string,
): DestroyRequest | undefined {
  if (!state.activeEntities.has(entityId)) return undefined;
  const request: DestroyRequest = {
    entityId,
    reason,
    queuedAt: state.clock.nowMicroseconds(),
  };
  state.destroyQueue.push(request);
  return request;
}

// ─── Flush Spawns ───────────────────────────────────────────────────

function flushSpawnsImpl(state: ManagerState): ReadonlyArray<SpawnResult> {
  const results: SpawnResult[] = [];
  const pending = state.spawnQueue.splice(0, state.spawnQueue.length);
  for (const req of pending) {
    results.push(processSpawn(state, req));
  }
  return results;
}

function processSpawn(state: ManagerState, req: SpawnRequest): SpawnResult {
  const recycledId = tryRecycleFromPool(state, req.entityType);
  const entityId = recycledId ?? req.entityId;
  const recycled = recycledId !== undefined;
  const now = state.clock.nowMicroseconds();
  state.activeEntities.set(entityId, { entityId, entityType: req.entityType });
  state.totalSpawned++;
  if (recycled) state.totalRecycled++;
  invokeSpawnHooks(state, entityId, req.entityType);
  emitLifecycleEvent(state, { kind: 'spawned', entityId, entityType: req.entityType, at: now });
  return { entityId, entityType: req.entityType, recycled, createdAt: now };
}

function tryRecycleFromPool(state: ManagerState, entityType: string): string | undefined {
  if (!state.poolEnabled) return undefined;
  const pooled = state.pool.get(entityType);
  if (pooled === undefined || pooled.length === 0) return undefined;
  return pooled.pop();
}

// ─── Flush Destroys ─────────────────────────────────────────────────

function flushDestroysImpl(state: ManagerState): ReadonlyArray<DestroyResult> {
  const results: DestroyResult[] = [];
  const pending = state.destroyQueue.splice(0, state.destroyQueue.length);
  for (const req of pending) {
    results.push(processDestroy(state, req));
  }
  return results;
}

function processDestroy(state: ManagerState, req: DestroyRequest): DestroyResult {
  const entity = state.activeEntities.get(req.entityId);
  const entityType = entity?.entityType ?? 'unknown';
  const now = state.clock.nowMicroseconds();
  state.activeEntities.delete(req.entityId);
  state.totalDestroyed++;
  invokeDestroyHooks(state, req.entityId, req.reason);
  emitLifecycleEvent(state, { kind: 'destroyed', entityId: req.entityId, entityType, at: now });
  const pooled = returnToPool(state, req.entityId, entityType);
  return { entityId: req.entityId, reason: req.reason, pooled, destroyedAt: now };
}

function returnToPool(state: ManagerState, entityId: string, entityType: string): boolean {
  if (!state.poolEnabled) return false;
  const pooled = state.pool.get(entityType);
  if (pooled !== undefined) {
    if (pooled.length >= state.maxPooledPerType) return false;
    pooled.push(entityId);
    return true;
  }
  state.pool.set(entityType, [entityId]);
  return true;
}

// ─── Flush Both ─────────────────────────────────────────────────────

function flushImpl(state: ManagerState): FlushResult {
  const destroyed = flushDestroysImpl(state);
  const spawned = flushSpawnsImpl(state);
  return { spawned, destroyed };
}

// ─── Hooks ──────────────────────────────────────────────────────────

function invokeSpawnHooks(state: ManagerState, entityId: string, entityType: string): void {
  for (const hook of state.spawnHooks) {
    hook(entityId, entityType);
  }
}

function invokeDestroyHooks(state: ManagerState, entityId: string, reason: string): void {
  for (const hook of state.destroyHooks) {
    hook(entityId, reason);
  }
}

function emitLifecycleEvent(state: ManagerState, event: LifecycleEvent): void {
  for (const cb of state.eventCallbacks) {
    cb(event);
  }
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: ManagerState): SpawnLifecycleStats {
  let pooledCount = 0;
  for (const entries of state.pool.values()) {
    pooledCount += entries.length;
  }
  return {
    spawnQueueSize: state.spawnQueue.length,
    destroyQueueSize: state.destroyQueue.length,
    totalSpawned: state.totalSpawned,
    totalDestroyed: state.totalDestroyed,
    totalRecycled: state.totalRecycled,
    pooledEntityCount: pooledCount,
    activeEntityCount: state.activeEntities.size,
  };
}
