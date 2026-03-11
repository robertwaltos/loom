/**
 * Transit-Weave Queue Adapter — Bridges transit requests to weave queue.
 *
 * The TransitRequestService (nakama-fabric) validates and enqueues transit
 * requests. The WeaveOrchestrator (silfen-weave) dequeues them for corridor
 * processing. This adapter sits between the two, providing:
 *
 *   - A TransitQueuePort for the TransitRequestService to write into
 *   - A WeaveQueuePort for the WeaveOrchestrator to read from
 *
 * Both ports operate on the same underlying FIFO queue, with type mapping
 * between QueuedTransitRequest and WeaveQueueEntry formats.
 *
 * The adapter also tracks queue depth and provides stats for monitoring.
 */

// ── Write Port (for TransitRequestService) ──────────────────────

export interface TransitQueueWritePort {
  readonly enqueue: (request: TransitQueueItem) => void;
  readonly getPendingCount: () => number;
}

export interface TransitQueueItem {
  readonly requestId: string;
  readonly entityId: string;
  readonly dynastyId: string;
  readonly sourceWorldId: string;
  readonly destinationWorldId: string;
  readonly requestedAt: number;
}

// ── Read Port (for WeaveOrchestrator) ───────────────────────────

export interface WeaveQueueReadPort {
  readonly dequeue: () => WeaveQueueReadEntry | undefined;
  readonly sweepExpired: () => number;
  readonly getQueueDepth: () => number;
}

export interface WeaveQueueReadEntry {
  readonly requestId: string;
  readonly entityId: string;
  readonly originNodeId: string;
  readonly destinationNodeId: string;
  readonly priority: string;
}

// ── Config ──────────────────────────────────────────────────────

export interface TransitWeaveAdapterConfig {
  readonly maxQueueDepth: number;
  readonly requestTtlMicroseconds: number;
}

export const DEFAULT_TRANSIT_WEAVE_CONFIG: TransitWeaveAdapterConfig = {
  maxQueueDepth: 100,
  requestTtlMicroseconds: 30_000_000,
};

// ── Deps ────────────────────────────────────────────────────────

export interface TransitWeaveAdapterDeps {
  readonly clock: { readonly nowMicroseconds: () => number };
}

// ── Public Interface ────────────────────────────────────────────

export interface TransitWeaveAdapter {
  readonly writePort: TransitQueueWritePort;
  readonly readPort: WeaveQueueReadPort;
  readonly getStats: () => TransitWeaveStats;
}

export interface TransitWeaveStats {
  readonly totalEnqueued: number;
  readonly totalDequeued: number;
  readonly totalExpired: number;
  readonly currentDepth: number;
}

// ── State ───────────────────────────────────────────────────────

interface QueueEntry {
  readonly item: TransitQueueItem;
  readonly enqueuedAt: number;
}

interface AdapterState {
  readonly deps: TransitWeaveAdapterDeps;
  readonly config: TransitWeaveAdapterConfig;
  readonly queue: QueueEntry[];
  totalEnqueued: number;
  totalDequeued: number;
  totalExpired: number;
}

// ── Factory ─────────────────────────────────────────────────────

function createTransitWeaveAdapter(
  deps: TransitWeaveAdapterDeps,
  config?: Partial<TransitWeaveAdapterConfig>,
): TransitWeaveAdapter {
  const state: AdapterState = {
    deps,
    config: { ...DEFAULT_TRANSIT_WEAVE_CONFIG, ...config },
    queue: [],
    totalEnqueued: 0,
    totalDequeued: 0,
    totalExpired: 0,
  };

  return {
    writePort: buildWritePort(state),
    readPort: buildReadPort(state),
    getStats: () => buildAdapterStats(state),
  };
}

// ── Write Port Implementation ───────────────────────────────────

function buildWritePort(state: AdapterState): TransitQueueWritePort {
  return {
    enqueue: (request) => {
      enqueueImpl(state, request);
    },
    getPendingCount: () => state.queue.length,
  };
}

function enqueueImpl(state: AdapterState, request: TransitQueueItem): void {
  if (state.queue.length >= state.config.maxQueueDepth) return;
  state.queue.push({
    item: request,
    enqueuedAt: state.deps.clock.nowMicroseconds(),
  });
  state.totalEnqueued += 1;
}

// ── Read Port Implementation ────────────────────────────────────

function buildReadPort(state: AdapterState): WeaveQueueReadPort {
  return {
    dequeue: () => dequeueImpl(state),
    sweepExpired: () => sweepExpiredImpl(state),
    getQueueDepth: () => state.queue.length,
  };
}

function dequeueImpl(state: AdapterState): WeaveQueueReadEntry | undefined {
  const entry = state.queue.shift();
  if (entry === undefined) return undefined;

  state.totalDequeued += 1;
  return mapToWeaveEntry(entry.item);
}

function mapToWeaveEntry(item: TransitQueueItem): WeaveQueueReadEntry {
  return {
    requestId: item.requestId,
    entityId: item.entityId,
    originNodeId: item.sourceWorldId,
    destinationNodeId: item.destinationWorldId,
    priority: 'normal',
  };
}

function sweepExpiredImpl(state: AdapterState): number {
  const now = state.deps.clock.nowMicroseconds();
  const ttl = state.config.requestTtlMicroseconds;
  const before = state.queue.length;

  const remaining = state.queue.filter((e) => now - e.enqueuedAt < ttl);
  state.queue.length = 0;
  for (const entry of remaining) {
    state.queue.push(entry);
  }

  const swept = before - state.queue.length;
  state.totalExpired += swept;
  return swept;
}

// ── Stats ───────────────────────────────────────────────────────

function buildAdapterStats(state: AdapterState): TransitWeaveStats {
  return {
    totalEnqueued: state.totalEnqueued,
    totalDequeued: state.totalDequeued,
    totalExpired: state.totalExpired,
    currentDepth: state.queue.length,
  };
}

// ── Exports ─────────────────────────────────────────────────────

export { createTransitWeaveAdapter };
