/**
 * Transit Queue — Entity transition request management for the Silfen Weave.
 *
 * When entities need to travel between lattice nodes (worlds), they
 * enter the Transit Queue. The queue prioritizes requests and processes
 * them in order. Stale requests expire after a configurable timeout.
 *
 * Priority levels (highest first):
 *   emergency — system/safety relocations
 *   high      — time-sensitive transits (events, quests)
 *   normal    — standard player/NPC travel
 *   low       — background migrations, cargo transfers
 */

// ─── Types ──────────────────────────────────────────────────────────

export type TransitPriority = 'emergency' | 'high' | 'normal' | 'low';

const PRIORITY_ORDER: Record<TransitPriority, number> = {
  emergency: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export interface TransitRequest {
  readonly entityId: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly priority: TransitPriority;
  readonly metadata?: Record<string, unknown>;
}

export interface TransitQueueEntry {
  readonly requestId: string;
  readonly entityId: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly priority: TransitPriority;
  readonly enqueuedAt: number;
  readonly expiresAt: number;
  readonly metadata?: Record<string, unknown>;
}

export interface EnqueueResult {
  readonly requestId: string;
  readonly position: number;
}

export interface TransitQueueStats {
  readonly totalEnqueued: number;
  readonly totalProcessed: number;
  readonly totalExpired: number;
  readonly totalCancelled: number;
  readonly currentDepth: number;
}

// ─── Ports ──────────────────────────────────────────────────────────

export interface TransitQueueDeps {
  readonly idGenerator: { next(): string };
  readonly clock: { nowMicroseconds(): number };
}

export interface TransitQueueConfig {
  readonly defaultTtlUs: number;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface TransitQueue {
  enqueue(request: TransitRequest): EnqueueResult;
  dequeue(): TransitQueueEntry | undefined;
  peek(): TransitQueueEntry | undefined;
  cancel(requestId: string): boolean;
  cancelByEntity(entityId: string): number;
  getPosition(requestId: string): number;
  getQueueDepth(): number;
  sweepExpired(): number;
  getStats(): TransitQueueStats;
}

// ─── Internal State ─────────────────────────────────────────────────

interface QueueState {
  readonly entries: TransitQueueEntry[];
  readonly deps: TransitQueueDeps;
  readonly config: TransitQueueConfig;
  totalEnqueued: number;
  totalProcessed: number;
  totalExpired: number;
  totalCancelled: number;
}

const DEFAULT_TTL_US = 300_000_000; // 5 minutes

// ─── Factory ────────────────────────────────────────────────────────

export function createTransitQueue(
  deps: TransitQueueDeps,
  config?: Partial<TransitQueueConfig>,
): TransitQueue {
  const state: QueueState = {
    entries: [],
    deps,
    config: { defaultTtlUs: config?.defaultTtlUs ?? DEFAULT_TTL_US },
    totalEnqueued: 0,
    totalProcessed: 0,
    totalExpired: 0,
    totalCancelled: 0,
  };

  return {
    enqueue: (req) => enqueueImpl(state, req),
    dequeue: () => dequeueImpl(state),
    peek: () => peekImpl(state),
    cancel: (rid) => cancelImpl(state, rid),
    cancelByEntity: (eid) => cancelByEntityImpl(state, eid),
    getPosition: (rid) => positionImpl(state, rid),
    getQueueDepth: () => state.entries.length,
    sweepExpired: () => sweepImpl(state),
    getStats: () => computeStats(state),
  };
}

// ─── Enqueue ────────────────────────────────────────────────────────

function enqueueImpl(
  state: QueueState,
  request: TransitRequest,
): EnqueueResult {
  const now = state.deps.clock.nowMicroseconds();
  const entry: TransitQueueEntry = {
    requestId: state.deps.idGenerator.next(),
    entityId: request.entityId,
    fromNodeId: request.fromNodeId,
    toNodeId: request.toNodeId,
    priority: request.priority,
    enqueuedAt: now,
    expiresAt: now + state.config.defaultTtlUs,
    metadata: request.metadata,
  };
  insertSorted(state.entries, entry);
  state.totalEnqueued += 1;
  const position = state.entries.indexOf(entry);
  return { requestId: entry.requestId, position };
}

function insertSorted(
  entries: TransitQueueEntry[],
  entry: TransitQueueEntry,
): void {
  const order = PRIORITY_ORDER[entry.priority];
  let idx = 0;
  while (idx < entries.length) {
    const existing = entries[idx];
    if (existing === undefined) break;
    if (PRIORITY_ORDER[existing.priority] > order) break;
    idx += 1;
  }
  entries.splice(idx, 0, entry);
}

// ─── Dequeue ────────────────────────────────────────────────────────

function dequeueImpl(state: QueueState): TransitQueueEntry | undefined {
  if (state.entries.length === 0) return undefined;
  const entry = state.entries.shift();
  if (entry !== undefined) {
    state.totalProcessed += 1;
  }
  return entry;
}

function peekImpl(state: QueueState): TransitQueueEntry | undefined {
  return state.entries.length > 0 ? state.entries[0] : undefined;
}

// ─── Cancel ─────────────────────────────────────────────────────────

function cancelImpl(state: QueueState, requestId: string): boolean {
  const idx = state.entries.findIndex((e) => e.requestId === requestId);
  if (idx === -1) return false;
  state.entries.splice(idx, 1);
  state.totalCancelled += 1;
  return true;
}

function cancelByEntityImpl(
  state: QueueState,
  entityId: string,
): number {
  let removed = 0;
  for (let i = state.entries.length - 1; i >= 0; i--) {
    if (state.entries[i]?.entityId === entityId) {
      state.entries.splice(i, 1);
      removed += 1;
    }
  }
  state.totalCancelled += removed;
  return removed;
}

// ─── Position ───────────────────────────────────────────────────────

function positionImpl(state: QueueState, requestId: string): number {
  const idx = state.entries.findIndex((e) => e.requestId === requestId);
  return idx;
}

// ─── Sweep ──────────────────────────────────────────────────────────

function sweepImpl(state: QueueState): number {
  const now = state.deps.clock.nowMicroseconds();
  let removed = 0;
  for (let i = state.entries.length - 1; i >= 0; i--) {
    if ((state.entries[i]?.expiresAt ?? 0) <= now) {
      state.entries.splice(i, 1);
      removed += 1;
    }
  }
  state.totalExpired += removed;
  return removed;
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: QueueState): TransitQueueStats {
  return {
    totalEnqueued: state.totalEnqueued,
    totalProcessed: state.totalProcessed,
    totalExpired: state.totalExpired,
    totalCancelled: state.totalCancelled,
    currentDepth: state.entries.length,
  };
}
