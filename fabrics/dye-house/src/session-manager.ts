/**
 * session-manager.ts — Authenticated session lifecycle management.
 *
 * Creates, validates, and expires sessions with configurable TTL.
 * Tracks session activity via touch timestamps and supports
 * idle expiry sweeping and aggregate session statistics.
 */

// ── Ports ────────────────────────────────────────────────────────

interface SessionClock {
  readonly nowMicroseconds: () => number;
}

interface SessionIdGenerator {
  readonly next: () => string;
}

interface SessionManagerDeps {
  readonly clock: SessionClock;
  readonly idGenerator: SessionIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

interface Session {
  readonly sessionId: string;
  readonly dynastyId: string;
  readonly createdAt: number;
  readonly lastTouchedAt: number;
  readonly expired: boolean;
}

interface CreateSessionParams {
  readonly dynastyId: string;
}

interface SessionConfig {
  readonly ttlUs: number;
}

interface SessionStats {
  readonly totalSessions: number;
  readonly activeSessions: number;
  readonly expiredSessions: number;
}

interface SessionManager {
  readonly create: (params: CreateSessionParams) => Session;
  readonly touch: (sessionId: string) => boolean;
  readonly expire: (sessionId: string) => boolean;
  readonly validate: (sessionId: string) => boolean;
  readonly getSession: (sessionId: string) => Session | undefined;
  readonly listByDynasty: (dynastyId: string) => readonly Session[];
  readonly sweepExpired: () => number;
  readonly getStats: () => SessionStats;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_SESSION_CONFIG: SessionConfig = {
  ttlUs: 3_600_000_000,
};

// ── State ────────────────────────────────────────────────────────

interface MutableSession {
  readonly sessionId: string;
  readonly dynastyId: string;
  readonly createdAt: number;
  lastTouchedAt: number;
  expired: boolean;
}

interface SessionState {
  readonly deps: SessionManagerDeps;
  readonly config: SessionConfig;
  readonly sessions: Map<string, MutableSession>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(session: MutableSession): Session {
  return { ...session };
}

function isSessionExpired(state: SessionState, session: MutableSession): boolean {
  if (session.expired) return true;
  const now = state.deps.clock.nowMicroseconds();
  return now - session.lastTouchedAt > state.config.ttlUs;
}

// ── Operations ───────────────────────────────────────────────────

function createImpl(state: SessionState, params: CreateSessionParams): Session {
  const now = state.deps.clock.nowMicroseconds();
  const session: MutableSession = {
    sessionId: state.deps.idGenerator.next(),
    dynastyId: params.dynastyId,
    createdAt: now,
    lastTouchedAt: now,
    expired: false,
  };
  state.sessions.set(session.sessionId, session);
  return toReadonly(session);
}

function touchImpl(state: SessionState, sessionId: string): boolean {
  const session = state.sessions.get(sessionId);
  if (!session) return false;
  if (isSessionExpired(state, session)) return false;
  session.lastTouchedAt = state.deps.clock.nowMicroseconds();
  return true;
}

function expireImpl(state: SessionState, sessionId: string): boolean {
  const session = state.sessions.get(sessionId);
  if (!session) return false;
  if (session.expired) return false;
  session.expired = true;
  return true;
}

function validateImpl(state: SessionState, sessionId: string): boolean {
  const session = state.sessions.get(sessionId);
  if (!session) return false;
  return !isSessionExpired(state, session);
}

function listByDynastyImpl(state: SessionState, dynastyId: string): Session[] {
  const result: Session[] = [];
  for (const session of state.sessions.values()) {
    if (session.dynastyId === dynastyId) result.push(toReadonly(session));
  }
  return result;
}

function sweepExpiredImpl(state: SessionState): number {
  let count = 0;
  for (const session of state.sessions.values()) {
    if (session.expired) continue;
    if (isSessionExpired(state, session)) {
      session.expired = true;
      count += 1;
    }
  }
  return count;
}

function getStatsImpl(state: SessionState): SessionStats {
  let active = 0;
  let expired = 0;
  for (const session of state.sessions.values()) {
    if (isSessionExpired(state, session)) {
      expired += 1;
    } else {
      active += 1;
    }
  }
  return {
    totalSessions: state.sessions.size,
    activeSessions: active,
    expiredSessions: expired,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createSessionManager(
  deps: SessionManagerDeps,
  config?: Partial<SessionConfig>,
): SessionManager {
  const state: SessionState = {
    deps,
    config: { ...DEFAULT_SESSION_CONFIG, ...config },
    sessions: new Map(),
  };
  return {
    create: (p) => createImpl(state, p),
    touch: (id) => touchImpl(state, id),
    expire: (id) => expireImpl(state, id),
    validate: (id) => validateImpl(state, id),
    getSession: (id) => {
      const s = state.sessions.get(id);
      return s ? toReadonly(s) : undefined;
    },
    listByDynasty: (did) => listByDynastyImpl(state, did),
    sweepExpired: () => sweepExpiredImpl(state),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createSessionManager, DEFAULT_SESSION_CONFIG };
export type {
  SessionManager,
  SessionManagerDeps,
  Session,
  CreateSessionParams,
  SessionConfig,
  SessionStats,
};
