/**
 * heartbeat-monitor.ts — Connection liveness tracking.
 *
 * Tracks heartbeat timestamps per connection. Detects stale connections
 * that haven't sent a heartbeat within the configured timeout. The
 * sweep function identifies and returns timed-out connections for the
 * caller to handle (disconnect, warn, etc.).
 */

// ── Ports ────────────────────────────────────────────────────────

interface HeartbeatClock {
  readonly nowMicroseconds: () => number;
}

// ── Types ────────────────────────────────────────────────────────

interface HeartbeatConfig {
  readonly timeoutUs: number;
  readonly warningThresholdUs: number;
}

interface HeartbeatRecord {
  readonly connectionId: string;
  readonly lastHeartbeatAt: number;
  readonly registeredAt: number;
  readonly missedSweeps: number;
}

type ConnectionHealth = 'healthy' | 'warning' | 'stale';

interface HealthCheck {
  readonly connectionId: string;
  readonly health: ConnectionHealth;
  readonly lastHeartbeatAt: number;
  readonly silenceUs: number;
}

interface SweepResult {
  readonly staleConnections: readonly string[];
  readonly warningConnections: readonly string[];
  readonly healthyCount: number;
  readonly sweptAt: number;
}

interface HeartbeatStats {
  readonly totalRegistered: number;
  readonly totalUnregistered: number;
  readonly totalHeartbeats: number;
  readonly totalSweeps: number;
  readonly totalStaleDetected: number;
  readonly activeConnections: number;
}

// ── Public API ───────────────────────────────────────────────────

interface HeartbeatMonitor {
  readonly register: (connectionId: string) => boolean;
  readonly unregister: (connectionId: string) => boolean;
  readonly heartbeat: (connectionId: string) => boolean;
  readonly checkHealth: (connectionId: string) => HealthCheck | undefined;
  readonly sweep: () => SweepResult;
  readonly getRecord: (connectionId: string) => HeartbeatRecord | undefined;
  readonly getActiveCount: () => number;
  readonly getStats: () => HeartbeatStats;
}

interface HeartbeatMonitorDeps {
  readonly clock: HeartbeatClock;
}

// ── State ────────────────────────────────────────────────────────

interface HeartbeatState {
  readonly records: Map<string, MutableRecord>;
  readonly config: HeartbeatConfig;
  readonly deps: HeartbeatMonitorDeps;
  totalRegistered: number;
  totalUnregistered: number;
  totalHeartbeats: number;
  totalSweeps: number;
  totalStaleDetected: number;
}

interface MutableRecord {
  lastHeartbeatAt: number;
  readonly registeredAt: number;
  missedSweeps: number;
}

// ── Defaults ─────────────────────────────────────────────────────

const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = {
  timeoutUs: 30_000_000,
  warningThresholdUs: 20_000_000,
};

// ── Operations ───────────────────────────────────────────────────

function registerImpl(state: HeartbeatState, connectionId: string): boolean {
  if (state.records.has(connectionId)) return false;
  const now = state.deps.clock.nowMicroseconds();
  state.records.set(connectionId, {
    lastHeartbeatAt: now,
    registeredAt: now,
    missedSweeps: 0,
  });
  state.totalRegistered++;
  return true;
}

function unregisterImpl(state: HeartbeatState, connectionId: string): boolean {
  if (!state.records.has(connectionId)) return false;
  state.records.delete(connectionId);
  state.totalUnregistered++;
  return true;
}

function heartbeatImpl(state: HeartbeatState, connectionId: string): boolean {
  const record = state.records.get(connectionId);
  if (!record) return false;
  record.lastHeartbeatAt = state.deps.clock.nowMicroseconds();
  record.missedSweeps = 0;
  state.totalHeartbeats++;
  return true;
}

function classifyHealth(
  silenceUs: number,
  config: HeartbeatConfig,
): ConnectionHealth {
  if (silenceUs >= config.timeoutUs) return 'stale';
  if (silenceUs >= config.warningThresholdUs) return 'warning';
  return 'healthy';
}

function checkHealthImpl(
  state: HeartbeatState,
  connectionId: string,
): HealthCheck | undefined {
  const record = state.records.get(connectionId);
  if (!record) return undefined;
  const now = state.deps.clock.nowMicroseconds();
  const silenceUs = now - record.lastHeartbeatAt;
  return {
    connectionId,
    health: classifyHealth(silenceUs, state.config),
    lastHeartbeatAt: record.lastHeartbeatAt,
    silenceUs,
  };
}

function sweepImpl(state: HeartbeatState): SweepResult {
  const now = state.deps.clock.nowMicroseconds();
  const stale: string[] = [];
  const warning: string[] = [];
  let healthy = 0;

  for (const [connId, record] of state.records) {
    const silence = now - record.lastHeartbeatAt;
    const health = classifyHealth(silence, state.config);
    if (health === 'stale') {
      record.missedSweeps++;
      stale.push(connId);
    } else if (health === 'warning') {
      warning.push(connId);
    } else {
      healthy++;
    }
  }

  state.totalSweeps++;
  state.totalStaleDetected += stale.length;

  return {
    staleConnections: stale,
    warningConnections: warning,
    healthyCount: healthy,
    sweptAt: now,
  };
}

function getRecordImpl(
  state: HeartbeatState,
  connectionId: string,
): HeartbeatRecord | undefined {
  const record = state.records.get(connectionId);
  if (!record) return undefined;
  return {
    connectionId,
    lastHeartbeatAt: record.lastHeartbeatAt,
    registeredAt: record.registeredAt,
    missedSweeps: record.missedSweeps,
  };
}

function getStatsImpl(state: HeartbeatState): HeartbeatStats {
  return {
    totalRegistered: state.totalRegistered,
    totalUnregistered: state.totalUnregistered,
    totalHeartbeats: state.totalHeartbeats,
    totalSweeps: state.totalSweeps,
    totalStaleDetected: state.totalStaleDetected,
    activeConnections: state.records.size,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createHeartbeatMonitor(
  deps: HeartbeatMonitorDeps,
  config?: Partial<HeartbeatConfig>,
): HeartbeatMonitor {
  const merged: HeartbeatConfig = {
    ...DEFAULT_HEARTBEAT_CONFIG,
    ...config,
  };
  const state: HeartbeatState = {
    records: new Map(),
    config: merged,
    deps,
    totalRegistered: 0,
    totalUnregistered: 0,
    totalHeartbeats: 0,
    totalSweeps: 0,
    totalStaleDetected: 0,
  };
  return {
    register: (id) => registerImpl(state, id),
    unregister: (id) => unregisterImpl(state, id),
    heartbeat: (id) => heartbeatImpl(state, id),
    checkHealth: (id) => checkHealthImpl(state, id),
    sweep: () => sweepImpl(state),
    getRecord: (id) => getRecordImpl(state, id),
    getActiveCount: () => state.records.size,
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createHeartbeatMonitor, DEFAULT_HEARTBEAT_CONFIG };
export type {
  HeartbeatMonitor,
  HeartbeatMonitorDeps,
  HeartbeatConfig,
  HeartbeatRecord,
  ConnectionHealth,
  HealthCheck,
  SweepResult,
  HeartbeatStats,
};
