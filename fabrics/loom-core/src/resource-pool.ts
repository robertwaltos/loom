/**
 * Resource Pool — Generic object pool for high-frequency allocations.
 *
 * The Loom creates and destroys entities, components, and events at
 * rates that would overwhelm a naive GC strategy. The Resource Pool
 * provides reusable object reservoirs with warm/cold lifecycle hooks.
 *
 * Features:
 *   - Configurable pre-warming (create objects ahead of demand)
 *   - Acquire/release semantics with reset callback
 *   - High-water mark tracking for capacity planning
 *   - Per-pool statistics (acquires, releases, misses)
 *
 * "The Loom recycles every thread."
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface PoolConfig {
  readonly initialSize: number;
  readonly maxSize: number;
  readonly name: string;
}

export interface PoolStats {
  readonly name: string;
  readonly poolSize: number;
  readonly available: number;
  readonly inUse: number;
  readonly totalAcquires: number;
  readonly totalReleases: number;
  readonly totalCreated: number;
  readonly highWaterMark: number;
  readonly misses: number;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface ResourcePool<T> {
  acquire(): T | undefined;
  release(item: T): boolean;
  drain(): number;
  warm(count: number): number;
  getStats(): PoolStats;
  available(): number;
  inUse(): number;
}

// ─── Factory Functions ──────────────────────────────────────────────

export type PoolFactory<T> = () => T;
export type PoolReset<T> = (item: T) => void;

// ─── State ──────────────────────────────────────────────────────────

interface PoolState<T> {
  readonly config: PoolConfig;
  readonly free: T[];
  readonly active: Set<T>;
  readonly create: PoolFactory<T>;
  readonly reset: PoolReset<T>;
  totalAcquires: number;
  totalReleases: number;
  totalCreated: number;
  highWaterMark: number;
  misses: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createResourcePool<T>(
  config: PoolConfig,
  create: PoolFactory<T>,
  reset: PoolReset<T>,
): ResourcePool<T> {
  const state: PoolState<T> = {
    config,
    free: [],
    active: new Set(),
    create,
    reset,
    totalAcquires: 0,
    totalReleases: 0,
    totalCreated: 0,
    highWaterMark: 0,
    misses: 0,
  };

  prewarm(state, config.initialSize);

  return {
    acquire: () => acquireImpl(state),
    release: (item) => releaseImpl(state, item),
    drain: () => drainImpl(state),
    warm: (count) => prewarm(state, count),
    getStats: () => buildStats(state),
    available: () => state.free.length,
    inUse: () => state.active.size,
  };
}

// ─── Acquire ────────────────────────────────────────────────────────

function acquireImpl<T>(state: PoolState<T>): T | undefined {
  const item = state.free.pop();
  if (item !== undefined) {
    state.active.add(item);
    state.totalAcquires += 1;
    updateHighWaterMark(state);
    return item;
  }

  return acquireWithGrowth(state);
}

function acquireWithGrowth<T>(state: PoolState<T>): T | undefined {
  const totalObjects = state.free.length + state.active.size;
  if (totalObjects >= state.config.maxSize) {
    state.misses += 1;
    return undefined;
  }

  const newItem = state.create();
  state.totalCreated += 1;
  state.active.add(newItem);
  state.totalAcquires += 1;
  updateHighWaterMark(state);
  return newItem;
}

// ─── Release ────────────────────────────────────────────────────────

function releaseImpl<T>(state: PoolState<T>, item: T): boolean {
  if (!state.active.has(item)) return false;
  state.active.delete(item);
  state.reset(item);
  state.free.push(item);
  state.totalReleases += 1;
  return true;
}

// ─── Drain ──────────────────────────────────────────────────────────

function drainImpl<T>(state: PoolState<T>): number {
  const drained = state.free.length;
  state.free.length = 0;
  return drained;
}

// ─── Warm ───────────────────────────────────────────────────────────

function prewarm<T>(state: PoolState<T>, count: number): number {
  let created = 0;
  for (let i = 0; i < count; i++) {
    const totalObjects = state.free.length + state.active.size;
    if (totalObjects >= state.config.maxSize) break;
    state.free.push(state.create());
    state.totalCreated += 1;
    created += 1;
  }
  return created;
}

// ─── Stats ──────────────────────────────────────────────────────────

function updateHighWaterMark<T>(state: PoolState<T>): void {
  if (state.active.size > state.highWaterMark) {
    state.highWaterMark = state.active.size;
  }
}

function buildStats<T>(state: PoolState<T>): PoolStats {
  return {
    name: state.config.name,
    poolSize: state.free.length + state.active.size,
    available: state.free.length,
    inUse: state.active.size,
    totalAcquires: state.totalAcquires,
    totalReleases: state.totalReleases,
    totalCreated: state.totalCreated,
    highWaterMark: state.highWaterMark,
    misses: state.misses,
  };
}
