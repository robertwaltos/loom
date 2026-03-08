/**
 * Session Manager — Active client session tracking and lifecycle.
 *
 * Tracks authenticated client sessions with heartbeat monitoring,
 * idle timeout enforcement, and metadata storage. Sits above the
 * connection layer to provide session-level queries and cleanup.
 *
 * Session States:
 *   active     → Receiving heartbeats, fully operational
 *   idle       → No heartbeat within idle threshold
 *   expired    → Past maximum session duration (terminal)
 *   terminated → Explicitly ended (terminal)
 */

// ─── Types ───────────────────────────────────────────────────────────

export type SessionState = 'active' | 'idle' | 'expired' | 'terminated';

export interface Session {
  readonly sessionId: string;
  readonly connectionId: string;
  readonly dynastyId: string;
  readonly state: SessionState;
  readonly createdAt: number;
  readonly lastHeartbeatAt: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface CreateSessionParams {
  readonly sessionId: string;
  readonly connectionId: string;
  readonly dynastyId: string;
  readonly metadata?: Record<string, unknown>;
}

export interface SessionManagerConfig {
  readonly idleThresholdUs: number;
  readonly maxSessionDurationUs: number;
  readonly heartbeatIntervalUs: number;
}

export interface SessionManagerDeps {
  readonly clock: { nowMicroseconds(): number };
  readonly config?: Partial<SessionManagerConfig>;
}

export interface SessionStats {
  readonly totalSessions: number;
  readonly activeSessions: number;
  readonly idleSessions: number;
  readonly expiredSessions: number;
  readonly terminatedSessions: number;
  readonly totalHeartbeats: number;
}

export interface SessionManager {
  create(params: CreateSessionParams): Session;
  heartbeat(sessionId: string): boolean;
  terminate(sessionId: string, reason: string): boolean;
  getSession(sessionId: string): Session | undefined;
  getByConnection(connectionId: string): Session | undefined;
  getByDynasty(dynastyId: string): ReadonlyArray<Session>;
  sweep(): number;
  listActive(): ReadonlyArray<Session>;
  getStats(): SessionStats;
}

// ─── Constants ───────────────────────────────────────────────────────

const SIXTY_SECONDS_US = 60_000_000;
const FOUR_HOURS_US = 14_400_000_000;
const THIRTY_SECONDS_US = 30_000_000;

export const DEFAULT_SESSION_CONFIG: SessionManagerConfig = {
  idleThresholdUs: SIXTY_SECONDS_US,
  maxSessionDurationUs: FOUR_HOURS_US,
  heartbeatIntervalUs: THIRTY_SECONDS_US,
};

const TERMINAL_STATES: ReadonlyArray<SessionState> = ['expired', 'terminated'];

// ─── State ───────────────────────────────────────────────────────────

interface MutableSession {
  readonly sessionId: string;
  readonly connectionId: string;
  readonly dynastyId: string;
  state: SessionState;
  readonly createdAt: number;
  lastHeartbeatAt: number;
  metadata: Record<string, unknown>;
  terminateReason: string | null;
}

interface ManagerState {
  readonly sessions: Map<string, MutableSession>;
  readonly connectionIndex: Map<string, string>;
  readonly clock: { nowMicroseconds(): number };
  readonly config: SessionManagerConfig;
  totalHeartbeats: number;
}

// ─── Factory ─────────────────────────────────────────────────────────

export function createSessionManager(
  deps: SessionManagerDeps,
): SessionManager {
  const config = mergeConfig(deps.config);
  const state: ManagerState = {
    sessions: new Map(),
    connectionIndex: new Map(),
    clock: deps.clock,
    config,
    totalHeartbeats: 0,
  };

  return {
    create: (p) => createImpl(state, p),
    heartbeat: (sid) => heartbeatImpl(state, sid),
    terminate: (sid, r) => terminateImpl(state, sid, r),
    getSession: (sid) => getSessionImpl(state, sid),
    getByConnection: (cid) => getByConnectionImpl(state, cid),
    getByDynasty: (did) => getByDynastyImpl(state, did),
    sweep: () => sweepImpl(state),
    listActive: () => listActiveImpl(state),
    getStats: () => computeStats(state),
  };
}

function mergeConfig(
  overrides?: Partial<SessionManagerConfig>,
): SessionManagerConfig {
  if (overrides === undefined) return DEFAULT_SESSION_CONFIG;
  return {
    idleThresholdUs: overrides.idleThresholdUs
      ?? DEFAULT_SESSION_CONFIG.idleThresholdUs,
    maxSessionDurationUs: overrides.maxSessionDurationUs
      ?? DEFAULT_SESSION_CONFIG.maxSessionDurationUs,
    heartbeatIntervalUs: overrides.heartbeatIntervalUs
      ?? DEFAULT_SESSION_CONFIG.heartbeatIntervalUs,
  };
}

// ─── Create ─────────────────────────────────────────────────────────

function createImpl(
  state: ManagerState,
  params: CreateSessionParams,
): Session {
  if (state.sessions.has(params.sessionId)) {
    throw new Error('Session ' + params.sessionId + ' already exists');
  }
  const now = state.clock.nowMicroseconds();
  const session: MutableSession = {
    sessionId: params.sessionId,
    connectionId: params.connectionId,
    dynastyId: params.dynastyId,
    state: 'active',
    createdAt: now,
    lastHeartbeatAt: now,
    metadata: params.metadata ?? {},
    terminateReason: null,
  };
  state.sessions.set(params.sessionId, session);
  state.connectionIndex.set(params.connectionId, params.sessionId);
  return toReadonly(session);
}

// ─── Heartbeat ──────────────────────────────────────────────────────

function heartbeatImpl(state: ManagerState, sessionId: string): boolean {
  const session = state.sessions.get(sessionId);
  if (session === undefined) return false;
  if (isTerminal(session.state)) return false;
  session.lastHeartbeatAt = state.clock.nowMicroseconds();
  if (session.state === 'idle') {
    session.state = 'active';
  }
  state.totalHeartbeats++;
  return true;
}

// ─── Terminate ──────────────────────────────────────────────────────

function terminateImpl(
  state: ManagerState,
  sessionId: string,
  _reason: string,
): boolean {
  const session = state.sessions.get(sessionId);
  if (session === undefined) return false;
  if (isTerminal(session.state)) return false;
  session.state = 'terminated';
  session.terminateReason = _reason;
  state.connectionIndex.delete(session.connectionId);
  return true;
}

// ─── Queries ────────────────────────────────────────────────────────

function getSessionImpl(
  state: ManagerState,
  sessionId: string,
): Session | undefined {
  const session = state.sessions.get(sessionId);
  if (session === undefined) return undefined;
  refreshState(state, session);
  return toReadonly(session);
}

function getByConnectionImpl(
  state: ManagerState,
  connectionId: string,
): Session | undefined {
  const sessionId = state.connectionIndex.get(connectionId);
  if (sessionId === undefined) return undefined;
  return getSessionImpl(state, sessionId);
}

function getByDynastyImpl(
  state: ManagerState,
  dynastyId: string,
): ReadonlyArray<Session> {
  const results: Session[] = [];
  for (const session of state.sessions.values()) {
    if (session.dynastyId === dynastyId) {
      refreshState(state, session);
      results.push(toReadonly(session));
    }
  }
  return results;
}

function listActiveImpl(state: ManagerState): ReadonlyArray<Session> {
  const results: Session[] = [];
  for (const session of state.sessions.values()) {
    refreshState(state, session);
    if (session.state === 'active') {
      results.push(toReadonly(session));
    }
  }
  return results;
}

// ─── Sweep ──────────────────────────────────────────────────────────

function sweepImpl(state: ManagerState): number {
  let removed = 0;
  const toRemove: string[] = [];
  for (const session of state.sessions.values()) {
    refreshState(state, session);
    if (isTerminal(session.state)) {
      toRemove.push(session.sessionId);
    }
  }
  for (const sid of toRemove) {
    const session = state.sessions.get(sid);
    if (session !== undefined) {
      state.connectionIndex.delete(session.connectionId);
      state.sessions.delete(sid);
      removed++;
    }
  }
  return removed;
}

// ─── State Refresh ──────────────────────────────────────────────────

function refreshState(state: ManagerState, session: MutableSession): void {
  if (isTerminal(session.state)) return;
  const now = state.clock.nowMicroseconds();
  const age = now - session.createdAt;
  if (age >= state.config.maxSessionDurationUs) {
    session.state = 'expired';
    state.connectionIndex.delete(session.connectionId);
    return;
  }
  const sinceBeat = now - session.lastHeartbeatAt;
  if (sinceBeat >= state.config.idleThresholdUs) {
    session.state = 'idle';
  }
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: ManagerState): SessionStats {
  let active = 0;
  let idle = 0;
  let expired = 0;
  let terminated = 0;

  for (const session of state.sessions.values()) {
    refreshState(state, session);
    switch (session.state) {
      case 'active': active++; break;
      case 'idle': idle++; break;
      case 'expired': expired++; break;
      case 'terminated': terminated++; break;
    }
  }

  return {
    totalSessions: state.sessions.size,
    activeSessions: active,
    idleSessions: idle,
    expiredSessions: expired,
    terminatedSessions: terminated,
    totalHeartbeats: state.totalHeartbeats,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function isTerminal(s: SessionState): boolean {
  return TERMINAL_STATES.includes(s);
}

function toReadonly(session: MutableSession): Session {
  return {
    sessionId: session.sessionId,
    connectionId: session.connectionId,
    dynastyId: session.dynastyId,
    state: session.state,
    createdAt: session.createdAt,
    lastHeartbeatAt: session.lastHeartbeatAt,
    metadata: { ...session.metadata },
  };
}
