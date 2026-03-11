/**
 * connection-pool.ts — Connection pool management.
 *
 * Manages a pool of reusable connections with capacity limits,
 * checkout/checkin lifecycle, idle timeout sweeping, and health
 * state tracking. Useful for downstream service connections.
 */

// ── Ports ────────────────────────────────────────────────────────

interface PoolClock {
  readonly nowMicroseconds: () => number;
}

interface PoolIdGenerator {
  readonly next: () => string;
}

interface ConnectionPoolDeps {
  readonly clock: PoolClock;
  readonly idGenerator: PoolIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type PoolEntryStatus = 'idle' | 'in_use' | 'closed';

interface PoolEntry {
  readonly entryId: string;
  readonly label: string;
  readonly status: PoolEntryStatus;
  readonly createdAt: number;
  readonly lastUsedAt: number;
}

interface AddEntryParams {
  readonly label: string;
}

interface ConnectionPoolConfig {
  readonly maxSize: number;
  readonly idleTimeoutUs: number;
}

interface ConnectionPoolStats {
  readonly totalEntries: number;
  readonly idleEntries: number;
  readonly inUseEntries: number;
  readonly closedEntries: number;
  readonly totalCheckouts: number;
  readonly totalCheckins: number;
}

interface ConnectionPool {
  readonly add: (params: AddEntryParams) => PoolEntry | undefined;
  readonly checkout: (entryId: string) => boolean;
  readonly checkin: (entryId: string) => boolean;
  readonly close: (entryId: string) => boolean;
  readonly getEntry: (entryId: string) => PoolEntry | undefined;
  readonly listIdle: () => readonly PoolEntry[];
  readonly listInUse: () => readonly PoolEntry[];
  readonly sweepIdle: () => number;
  readonly getStats: () => ConnectionPoolStats;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_POOL_CONFIG: ConnectionPoolConfig = {
  maxSize: 100,
  idleTimeoutUs: 300_000_000,
};

// ── State ────────────────────────────────────────────────────────

interface MutablePoolEntry {
  readonly entryId: string;
  readonly label: string;
  status: PoolEntryStatus;
  readonly createdAt: number;
  lastUsedAt: number;
}

interface PoolState {
  readonly deps: ConnectionPoolDeps;
  readonly config: ConnectionPoolConfig;
  readonly entries: Map<string, MutablePoolEntry>;
  totalCheckouts: number;
  totalCheckins: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(entry: MutablePoolEntry): PoolEntry {
  return { ...entry };
}

// ── Operations ───────────────────────────────────────────────────

function addImpl(state: PoolState, params: AddEntryParams): PoolEntry | undefined {
  const activeCount = countActive(state);
  if (activeCount >= state.config.maxSize) return undefined;
  const now = state.deps.clock.nowMicroseconds();
  const entry: MutablePoolEntry = {
    entryId: state.deps.idGenerator.next(),
    label: params.label,
    status: 'idle',
    createdAt: now,
    lastUsedAt: now,
  };
  state.entries.set(entry.entryId, entry);
  return toReadonly(entry);
}

function countActive(state: PoolState): number {
  let count = 0;
  for (const e of state.entries.values()) {
    if (e.status !== 'closed') count += 1;
  }
  return count;
}

function checkoutImpl(state: PoolState, entryId: string): boolean {
  const entry = state.entries.get(entryId);
  if (!entry) return false;
  if (entry.status !== 'idle') return false;
  entry.status = 'in_use';
  entry.lastUsedAt = state.deps.clock.nowMicroseconds();
  state.totalCheckouts += 1;
  return true;
}

function checkinImpl(state: PoolState, entryId: string): boolean {
  const entry = state.entries.get(entryId);
  if (!entry) return false;
  if (entry.status !== 'in_use') return false;
  entry.status = 'idle';
  entry.lastUsedAt = state.deps.clock.nowMicroseconds();
  state.totalCheckins += 1;
  return true;
}

function closeImpl(state: PoolState, entryId: string): boolean {
  const entry = state.entries.get(entryId);
  if (!entry) return false;
  if (entry.status === 'closed') return false;
  entry.status = 'closed';
  return true;
}

function listByStatus(state: PoolState, status: PoolEntryStatus): PoolEntry[] {
  const result: PoolEntry[] = [];
  for (const e of state.entries.values()) {
    if (e.status === status) result.push(toReadonly(e));
  }
  return result;
}

function sweepIdleImpl(state: PoolState): number {
  const now = state.deps.clock.nowMicroseconds();
  let count = 0;
  for (const entry of state.entries.values()) {
    if (entry.status !== 'idle') continue;
    if (now - entry.lastUsedAt > state.config.idleTimeoutUs) {
      entry.status = 'closed';
      count += 1;
    }
  }
  return count;
}

function getStatsImpl(state: PoolState): ConnectionPoolStats {
  let idle = 0;
  let inUse = 0;
  let closed = 0;
  for (const e of state.entries.values()) {
    if (e.status === 'idle') idle += 1;
    else if (e.status === 'in_use') inUse += 1;
    else closed += 1;
  }
  return {
    totalEntries: state.entries.size,
    idleEntries: idle,
    inUseEntries: inUse,
    closedEntries: closed,
    totalCheckouts: state.totalCheckouts,
    totalCheckins: state.totalCheckins,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createConnectionPool(
  deps: ConnectionPoolDeps,
  config?: Partial<ConnectionPoolConfig>,
): ConnectionPool {
  const state: PoolState = {
    deps,
    config: { ...DEFAULT_POOL_CONFIG, ...config },
    entries: new Map(),
    totalCheckouts: 0,
    totalCheckins: 0,
  };
  return {
    add: (p) => addImpl(state, p),
    checkout: (id) => checkoutImpl(state, id),
    checkin: (id) => checkinImpl(state, id),
    close: (id) => closeImpl(state, id),
    getEntry: (id) => {
      const e = state.entries.get(id);
      return e ? toReadonly(e) : undefined;
    },
    listIdle: () => listByStatus(state, 'idle'),
    listInUse: () => listByStatus(state, 'in_use'),
    sweepIdle: () => sweepIdleImpl(state),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createConnectionPool, DEFAULT_POOL_CONFIG };
export type {
  ConnectionPool,
  ConnectionPoolDeps,
  ConnectionPoolConfig,
  PoolEntry,
  PoolEntryStatus,
  AddEntryParams,
  ConnectionPoolStats,
};
