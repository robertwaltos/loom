/**
 * presence-tracker.ts — Dynasty online presence tracking.
 *
 * Tracks which dynasties are currently online, their active
 * world, and last-seen timestamps. Supports presence queries,
 * world-scoped presence lists, and idle detection.
 */

// ── Ports ────────────────────────────────────────────────────────

interface PresenceClock {
  readonly nowMicroseconds: () => number;
}

interface PresenceTrackerDeps {
  readonly clock: PresenceClock;
}

// ── Types ────────────────────────────────────────────────────────

type PresenceStatus = 'online' | 'idle' | 'offline';

interface PresenceRecord {
  readonly dynastyId: string;
  readonly status: PresenceStatus;
  readonly worldId: string | undefined;
  readonly lastSeenAt: number;
  readonly connectedAt: number;
}

interface ConnectParams {
  readonly dynastyId: string;
  readonly worldId?: string;
}

interface PresenceConfig {
  readonly idleThresholdUs: number;
}

interface PresenceStats {
  readonly totalTracked: number;
  readonly onlineCount: number;
  readonly idleCount: number;
  readonly offlineCount: number;
}

interface PresenceTracker {
  readonly connect: (params: ConnectParams) => boolean;
  readonly disconnect: (dynastyId: string) => boolean;
  readonly heartbeat: (dynastyId: string) => boolean;
  readonly setWorld: (dynastyId: string, worldId: string) => boolean;
  readonly getPresence: (dynastyId: string) => PresenceRecord | undefined;
  readonly getStatus: (dynastyId: string) => PresenceStatus;
  readonly listOnline: () => readonly PresenceRecord[];
  readonly listInWorld: (worldId: string) => readonly PresenceRecord[];
  readonly sweepIdle: () => number;
  readonly getStats: () => PresenceStats;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_PRESENCE_CONFIG: PresenceConfig = {
  idleThresholdUs: 300_000_000,
};

// ── State ────────────────────────────────────────────────────────

interface MutablePresence {
  readonly dynastyId: string;
  status: PresenceStatus;
  worldId: string | undefined;
  lastSeenAt: number;
  readonly connectedAt: number;
}

interface PresenceState {
  readonly deps: PresenceTrackerDeps;
  readonly config: PresenceConfig;
  readonly records: Map<string, MutablePresence>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(record: MutablePresence): PresenceRecord {
  return { ...record };
}

// ── Operations ───────────────────────────────────────────────────

function connectImpl(state: PresenceState, params: ConnectParams): boolean {
  if (state.records.has(params.dynastyId)) return false;
  const now = state.deps.clock.nowMicroseconds();
  state.records.set(params.dynastyId, {
    dynastyId: params.dynastyId,
    status: 'online',
    worldId: params.worldId,
    lastSeenAt: now,
    connectedAt: now,
  });
  return true;
}

function disconnectImpl(state: PresenceState, dynastyId: string): boolean {
  const record = state.records.get(dynastyId);
  if (!record) return false;
  record.status = 'offline';
  record.lastSeenAt = state.deps.clock.nowMicroseconds();
  return true;
}

function heartbeatImpl(state: PresenceState, dynastyId: string): boolean {
  const record = state.records.get(dynastyId);
  if (!record) return false;
  if (record.status === 'offline') return false;
  record.status = 'online';
  record.lastSeenAt = state.deps.clock.nowMicroseconds();
  return true;
}

function setWorldImpl(state: PresenceState, dynastyId: string, worldId: string): boolean {
  const record = state.records.get(dynastyId);
  if (!record) return false;
  record.worldId = worldId;
  return true;
}

function getStatusImpl(state: PresenceState, dynastyId: string): PresenceStatus {
  const record = state.records.get(dynastyId);
  if (!record) return 'offline';
  return record.status;
}

function listOnlineImpl(state: PresenceState): PresenceRecord[] {
  const result: PresenceRecord[] = [];
  for (const record of state.records.values()) {
    if (record.status === 'online') result.push(toReadonly(record));
  }
  return result;
}

function listInWorldImpl(state: PresenceState, worldId: string): PresenceRecord[] {
  const result: PresenceRecord[] = [];
  for (const record of state.records.values()) {
    if (record.worldId === worldId && record.status !== 'offline') {
      result.push(toReadonly(record));
    }
  }
  return result;
}

function sweepIdleImpl(state: PresenceState): number {
  const now = state.deps.clock.nowMicroseconds();
  let count = 0;
  for (const record of state.records.values()) {
    if (record.status !== 'online') continue;
    if (now - record.lastSeenAt > state.config.idleThresholdUs) {
      record.status = 'idle';
      count += 1;
    }
  }
  return count;
}

function getStatsImpl(state: PresenceState): PresenceStats {
  let online = 0;
  let idle = 0;
  let offline = 0;
  for (const record of state.records.values()) {
    if (record.status === 'online') online += 1;
    else if (record.status === 'idle') idle += 1;
    else offline += 1;
  }
  return {
    totalTracked: state.records.size,
    onlineCount: online,
    idleCount: idle,
    offlineCount: offline,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createPresenceTracker(
  deps: PresenceTrackerDeps,
  config?: Partial<PresenceConfig>,
): PresenceTracker {
  const state: PresenceState = {
    deps,
    config: { ...DEFAULT_PRESENCE_CONFIG, ...config },
    records: new Map(),
  };
  return {
    connect: (p) => connectImpl(state, p),
    disconnect: (id) => disconnectImpl(state, id),
    heartbeat: (id) => heartbeatImpl(state, id),
    setWorld: (id, w) => setWorldImpl(state, id, w),
    getPresence: (id) => {
      const r = state.records.get(id);
      return r ? toReadonly(r) : undefined;
    },
    getStatus: (id) => getStatusImpl(state, id),
    listOnline: () => listOnlineImpl(state),
    listInWorld: (w) => listInWorldImpl(state, w),
    sweepIdle: () => sweepIdleImpl(state),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createPresenceTracker, DEFAULT_PRESENCE_CONFIG };
export type {
  PresenceTracker,
  PresenceTrackerDeps,
  PresenceConfig,
  PresenceRecord,
  PresenceStatus,
  ConnectParams,
  PresenceStats,
};
