/**
 * world-event-log.ts — Per-world event logging.
 *
 * Records timestamped events scoped to specific worlds.
 * Supports chronological queries, world-scoped listings,
 * severity filtering, and log rotation via entry limits.
 */

// ── Ports ────────────────────────────────────────────────────────

interface EventLogClock {
  readonly nowMicroseconds: () => number;
}

interface EventLogIdGenerator {
  readonly next: () => string;
}

interface WorldEventLogDeps {
  readonly clock: EventLogClock;
  readonly idGenerator: EventLogIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type EventSeverity = 'info' | 'warn' | 'error';

interface WorldEvent {
  readonly eventId: string;
  readonly worldId: string;
  readonly severity: EventSeverity;
  readonly message: string;
  readonly timestamp: number;
}

interface LogEventParams {
  readonly worldId: string;
  readonly severity: EventSeverity;
  readonly message: string;
}

interface EventLogConfig {
  readonly maxEntriesPerWorld: number;
}

interface EventLogStats {
  readonly totalEvents: number;
  readonly totalWorlds: number;
  readonly infoCount: number;
  readonly warnCount: number;
  readonly errorCount: number;
}

interface WorldEventLog {
  readonly log: (params: LogEventParams) => WorldEvent;
  readonly getEvent: (eventId: string) => WorldEvent | undefined;
  readonly listByWorld: (worldId: string) => readonly WorldEvent[];
  readonly listBySeverity: (severity: EventSeverity) => readonly WorldEvent[];
  readonly getRecent: (count: number) => readonly WorldEvent[];
  readonly clearWorld: (worldId: string) => number;
  readonly getStats: () => EventLogStats;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_EVENT_LOG_CONFIG: EventLogConfig = {
  maxEntriesPerWorld: 1000,
};

// ── State ────────────────────────────────────────────────────────

interface EventLogState {
  readonly deps: WorldEventLogDeps;
  readonly config: EventLogConfig;
  readonly eventsById: Map<string, WorldEvent>;
  readonly eventsByWorld: Map<string, WorldEvent[]>;
  readonly allEvents: WorldEvent[];
}

// ── Operations ───────────────────────────────────────────────────

function logImpl(state: EventLogState, params: LogEventParams): WorldEvent {
  const event: WorldEvent = {
    eventId: state.deps.idGenerator.next(),
    worldId: params.worldId,
    severity: params.severity,
    message: params.message,
    timestamp: state.deps.clock.nowMicroseconds(),
  };
  state.eventsById.set(event.eventId, event);
  state.allEvents.push(event);
  let worldList = state.eventsByWorld.get(params.worldId);
  if (!worldList) {
    worldList = [];
    state.eventsByWorld.set(params.worldId, worldList);
  }
  worldList.push(event);
  trimWorldList(state, params.worldId, worldList);
  return event;
}

function trimWorldList(state: EventLogState, _worldId: string, list: WorldEvent[]): void {
  while (list.length > state.config.maxEntriesPerWorld) {
    const removed = list.shift();
    if (removed) state.eventsById.delete(removed.eventId);
  }
}

function listBySeverityImpl(state: EventLogState, severity: EventSeverity): WorldEvent[] {
  return state.allEvents.filter((e) => e.severity === severity);
}

function getRecentImpl(state: EventLogState, count: number): WorldEvent[] {
  const start = Math.max(0, state.allEvents.length - count);
  return state.allEvents.slice(start);
}

function clearWorldImpl(state: EventLogState, worldId: string): number {
  const list = state.eventsByWorld.get(worldId);
  if (!list) return 0;
  const count = list.length;
  for (const event of list) {
    state.eventsById.delete(event.eventId);
  }
  state.eventsByWorld.delete(worldId);
  return count;
}

function getStatsImpl(state: EventLogState): EventLogStats {
  let info = 0;
  let warn = 0;
  let error = 0;
  for (const event of state.eventsById.values()) {
    if (event.severity === 'info') info += 1;
    else if (event.severity === 'warn') warn += 1;
    else error += 1;
  }
  return {
    totalEvents: state.eventsById.size,
    totalWorlds: state.eventsByWorld.size,
    infoCount: info,
    warnCount: warn,
    errorCount: error,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createWorldEventLog(
  deps: WorldEventLogDeps,
  config?: Partial<EventLogConfig>,
): WorldEventLog {
  const state: EventLogState = {
    deps,
    config: { ...DEFAULT_EVENT_LOG_CONFIG, ...config },
    eventsById: new Map(),
    eventsByWorld: new Map(),
    allEvents: [],
  };
  return {
    log: (p) => logImpl(state, p),
    getEvent: (id) => state.eventsById.get(id),
    listByWorld: (wid) => [...(state.eventsByWorld.get(wid) ?? [])],
    listBySeverity: (sev) => listBySeverityImpl(state, sev),
    getRecent: (n) => getRecentImpl(state, n),
    clearWorld: (wid) => clearWorldImpl(state, wid),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createWorldEventLog, DEFAULT_EVENT_LOG_CONFIG };
export type {
  WorldEventLog,
  WorldEventLogDeps,
  WorldEvent,
  LogEventParams,
  EventSeverity,
  EventLogConfig,
  EventLogStats,
};
