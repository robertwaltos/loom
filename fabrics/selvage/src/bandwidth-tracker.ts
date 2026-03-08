/**
 * bandwidth-tracker.ts — Per-connection bandwidth tracking.
 *
 * Monitors bytes sent/received per connection over time windows.
 * Supports per-connection quotas, bandwidth rate calculation,
 * and quota violation detection.
 */

// ── Ports ────────────────────────────────────────────────────────

interface BandwidthClock {
  readonly nowMicroseconds: () => number;
}

// ── Types ────────────────────────────────────────────────────────

interface BandwidthRecord {
  readonly connectionId: string;
  readonly bytesSent: number;
  readonly bytesReceived: number;
  readonly windowStartUs: number;
  readonly lastActivityUs: number;
}

interface BandwidthConfig {
  readonly windowUs: number;
  readonly maxBytesPerWindow: number;
}

interface RecordTrafficParams {
  readonly connectionId: string;
  readonly bytesSent: number;
  readonly bytesReceived: number;
}

interface BandwidthStats {
  readonly trackedConnections: number;
  readonly totalBytesSent: number;
  readonly totalBytesReceived: number;
  readonly totalViolations: number;
}

// ── Public API ───────────────────────────────────────────────────

interface BandwidthTracker {
  readonly register: (connectionId: string) => boolean;
  readonly unregister: (connectionId: string) => boolean;
  readonly recordTraffic: (params: RecordTrafficParams) => boolean;
  readonly getRecord: (connectionId: string) => BandwidthRecord | undefined;
  readonly isOverQuota: (connectionId: string) => boolean;
  readonly resetWindow: (connectionId: string) => boolean;
  readonly getStats: () => BandwidthStats;
}

interface BandwidthTrackerDeps {
  readonly clock: BandwidthClock;
}

// ── State ────────────────────────────────────────────────────────

interface TrackerState {
  readonly connections: Map<string, MutableRecord>;
  readonly config: BandwidthConfig;
  readonly deps: BandwidthTrackerDeps;
  totalBytesSent: number;
  totalBytesReceived: number;
  totalViolations: number;
}

interface MutableRecord {
  readonly connectionId: string;
  bytesSent: number;
  bytesReceived: number;
  windowStartUs: number;
  lastActivityUs: number;
}

// ── Defaults ─────────────────────────────────────────────────────

const DEFAULT_BANDWIDTH_CONFIG: BandwidthConfig = {
  windowUs: 60_000_000,
  maxBytesPerWindow: 10_485_760,
};

// ── Operations ───────────────────────────────────────────────────

function registerImpl(
  state: TrackerState,
  connectionId: string,
): boolean {
  if (state.connections.has(connectionId)) return false;
  const now = state.deps.clock.nowMicroseconds();
  state.connections.set(connectionId, {
    connectionId,
    bytesSent: 0,
    bytesReceived: 0,
    windowStartUs: now,
    lastActivityUs: now,
  });
  return true;
}

function unregisterImpl(
  state: TrackerState,
  connectionId: string,
): boolean {
  return state.connections.delete(connectionId);
}

function maybeResetWindow(
  state: TrackerState,
  record: MutableRecord,
  now: number,
): void {
  if (now - record.windowStartUs >= state.config.windowUs) {
    record.bytesSent = 0;
    record.bytesReceived = 0;
    record.windowStartUs = now;
  }
}

function recordTrafficImpl(
  state: TrackerState,
  params: RecordTrafficParams,
): boolean {
  const record = state.connections.get(params.connectionId);
  if (!record) return false;
  const now = state.deps.clock.nowMicroseconds();
  maybeResetWindow(state, record, now);
  record.bytesSent += params.bytesSent;
  record.bytesReceived += params.bytesReceived;
  record.lastActivityUs = now;
  state.totalBytesSent += params.bytesSent;
  state.totalBytesReceived += params.bytesReceived;
  const total = record.bytesSent + record.bytesReceived;
  if (total > state.config.maxBytesPerWindow) {
    state.totalViolations++;
  }
  return true;
}

function isOverQuotaImpl(
  state: TrackerState,
  connectionId: string,
): boolean {
  const record = state.connections.get(connectionId);
  if (!record) return false;
  const total = record.bytesSent + record.bytesReceived;
  return total > state.config.maxBytesPerWindow;
}

function resetWindowImpl(
  state: TrackerState,
  connectionId: string,
): boolean {
  const record = state.connections.get(connectionId);
  if (!record) return false;
  record.bytesSent = 0;
  record.bytesReceived = 0;
  record.windowStartUs = state.deps.clock.nowMicroseconds();
  return true;
}

function getStatsImpl(state: TrackerState): BandwidthStats {
  return {
    trackedConnections: state.connections.size,
    totalBytesSent: state.totalBytesSent,
    totalBytesReceived: state.totalBytesReceived,
    totalViolations: state.totalViolations,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createBandwidthTracker(
  deps: BandwidthTrackerDeps,
  config?: Partial<BandwidthConfig>,
): BandwidthTracker {
  const merged = { ...DEFAULT_BANDWIDTH_CONFIG, ...config };
  const state: TrackerState = {
    connections: new Map(),
    config: merged,
    deps,
    totalBytesSent: 0,
    totalBytesReceived: 0,
    totalViolations: 0,
  };
  return {
    register: (id) => registerImpl(state, id),
    unregister: (id) => unregisterImpl(state, id),
    recordTraffic: (p) => recordTrafficImpl(state, p),
    getRecord: (id) => {
      const r = state.connections.get(id);
      return r ? { ...r } : undefined;
    },
    isOverQuota: (id) => isOverQuotaImpl(state, id),
    resetWindow: (id) => resetWindowImpl(state, id),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createBandwidthTracker, DEFAULT_BANDWIDTH_CONFIG };
export type {
  BandwidthTracker,
  BandwidthTrackerDeps,
  BandwidthConfig,
  BandwidthRecord,
  RecordTrafficParams,
  BandwidthStats,
};
