/**
 * Event Replay Service — Replays stored events for state reconstruction.
 *
 * Reads from an event source (journal, archive) and replays events
 * through registered handlers in chronological order. Supports
 * time-range filtering, event type filtering, and speed control.
 *
 * Use cases:
 *   - State reconstruction after crash recovery
 *   - Debugging by replaying a time window
 *   - Testing by replaying production event sequences
 */

// ─── Types ──────────────────────────────────────────────────────────

export type ReplayStatus = 'idle' | 'replaying' | 'paused' | 'completed';

export interface ReplayEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly payload: string;
  readonly timestamp: number;
  readonly correlationId: string | null;
}

export interface ReplayFilter {
  readonly fromTimestamp?: number;
  readonly toTimestamp?: number;
  readonly eventTypes?: ReadonlyArray<string>;
  readonly limit?: number;
}

export interface ReplaySession {
  readonly sessionId: string;
  readonly status: ReplayStatus;
  readonly filter: ReplayFilter;
  readonly eventsReplayed: number;
  readonly eventsSkipped: number;
  readonly startedAt: number;
  readonly completedAt: number | null;
}

export type ReplayHandler = (event: ReplayEvent) => void;

export interface ReplayStats {
  readonly totalSessions: number;
  readonly totalEventsReplayed: number;
  readonly activeHandlers: number;
}

// ─── Ports ──────────────────────────────────────────────────────────

export interface ReplayEventSourcePort {
  fetch(filter: ReplayFilter): ReadonlyArray<ReplayEvent>;
}

export interface ReplayIdGenerator {
  next(): string;
}

export interface EventReplayDeps {
  readonly eventSource: ReplayEventSourcePort;
  readonly idGenerator: ReplayIdGenerator;
  readonly clock: { nowMicroseconds(): number };
}

// ─── Public Interface ───────────────────────────────────────────────

export interface EventReplayService {
  registerHandler(eventType: string, handler: ReplayHandler): boolean;
  removeHandler(eventType: string): boolean;
  replay(filter: ReplayFilter): ReplaySession;
  getSession(sessionId: string): ReplaySession | undefined;
  getLastSession(): ReplaySession | undefined;
  getStats(): ReplayStats;
}

// ─── Internal State ─────────────────────────────────────────────────

interface ServiceState {
  readonly handlers: Map<string, ReplayHandler>;
  readonly sessions: ReplaySession[];
  readonly deps: EventReplayDeps;
  totalEventsReplayed: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createEventReplayService(deps: EventReplayDeps): EventReplayService {
  const state: ServiceState = {
    handlers: new Map(),
    sessions: [],
    deps,
    totalEventsReplayed: 0,
  };

  return {
    registerHandler: (t, h) => registerImpl(state, t, h),
    removeHandler: (t) => state.handlers.delete(t),
    replay: (f) => replayImpl(state, f),
    getSession: (sid) => findSession(state, sid),
    getLastSession: () => lastSession(state),
    getStats: () => computeStats(state),
  };
}

// ─── Handler Registration ───────────────────────────────────────────

function registerImpl(state: ServiceState, eventType: string, handler: ReplayHandler): boolean {
  if (state.handlers.has(eventType)) return false;
  state.handlers.set(eventType, handler);
  return true;
}

// ─── Replay ─────────────────────────────────────────────────────────

function replayImpl(state: ServiceState, filter: ReplayFilter): ReplaySession {
  const sessionId = state.deps.idGenerator.next();
  const startedAt = state.deps.clock.nowMicroseconds();
  const events = state.deps.eventSource.fetch(filter);
  const result = dispatchEvents(state, events);
  const session: ReplaySession = {
    sessionId,
    status: 'completed',
    filter,
    eventsReplayed: result.replayed,
    eventsSkipped: result.skipped,
    startedAt,
    completedAt: state.deps.clock.nowMicroseconds(),
  };
  state.sessions.push(session);
  state.totalEventsReplayed += result.replayed;
  return session;
}

interface DispatchResult {
  readonly replayed: number;
  readonly skipped: number;
}

function dispatchEvents(state: ServiceState, events: ReadonlyArray<ReplayEvent>): DispatchResult {
  let replayed = 0;
  let skipped = 0;
  for (const event of events) {
    const handler = state.handlers.get(event.eventType);
    if (handler !== undefined) {
      handler(event);
      replayed += 1;
    } else {
      skipped += 1;
    }
  }
  return { replayed, skipped };
}

// ─── Queries ────────────────────────────────────────────────────────

function findSession(state: ServiceState, sessionId: string): ReplaySession | undefined {
  return state.sessions.find((s) => s.sessionId === sessionId);
}

function lastSession(state: ServiceState): ReplaySession | undefined {
  if (state.sessions.length === 0) return undefined;
  return state.sessions[state.sessions.length - 1];
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: ServiceState): ReplayStats {
  return {
    totalSessions: state.sessions.length,
    totalEventsReplayed: state.totalEventsReplayed,
    activeHandlers: state.handlers.size,
  };
}
