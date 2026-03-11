/**
 * Session Manager — Multi-device session lifecycle management.
 *
 * Features:
 *   - Session creation (dynasty ID + device fingerprint)
 *   - Session states: ACTIVE -> EXPIRED -> REVOKED
 *   - Crypto-safe random token generation (via port)
 *   - Session validation (check expiry, check revocation)
 *   - Multi-device sessions per dynasty
 *   - Session limits (max N active sessions per dynasty)
 *   - Session activity tracking (last active timestamp)
 *   - Configurable session duration
 *
 * "Every thread entering The Loom carries a token from the Dye House."
 */

// ─── Types ──────────────────────────────────────────────────────────

export type SessionMgrState = 'active' | 'expired' | 'revoked';

export interface ManagedSession {
  readonly sessionId: string;
  readonly token: string;
  readonly dynastyId: string;
  readonly deviceFingerprint: string;
  readonly state: SessionMgrState;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly lastActiveAt: number;
}

export interface CreateManagedSessionParams {
  readonly dynastyId: string;
  readonly deviceFingerprint: string;
}

export interface SessionValidation {
  readonly valid: boolean;
  readonly sessionId: string | null;
  readonly reason: string;
}

export interface SessionMgrConfig {
  readonly sessionDurationMs: number;
  readonly maxSessionsPerDynasty: number;
}

export interface SessionMgrStats {
  readonly totalSessions: number;
  readonly activeSessions: number;
  readonly expiredSessions: number;
  readonly revokedSessions: number;
}

// ─── Ports ──────────────────────────────────────────────────────────

export interface SessionMgrDeps {
  readonly clock: { nowMilliseconds(): number };
  readonly idGenerator: { next(): string };
  readonly tokenGenerator: { generateToken(): string };
}

// ─── Public Interface ───────────────────────────────────────────────

export interface SessionMgr {
  readonly create: (params: CreateManagedSessionParams) => ManagedSession;
  readonly validateToken: (token: string) => SessionValidation;
  readonly validateSession: (sessionId: string) => SessionValidation;
  readonly touch: (sessionId: string) => boolean;
  readonly revoke: (sessionId: string) => boolean;
  readonly revokeAllForDynasty: (dynastyId: string) => number;
  readonly getSession: (sessionId: string) => ManagedSession | undefined;
  readonly getSessionByToken: (token: string) => ManagedSession | undefined;
  readonly listByDynasty: (dynastyId: string) => ReadonlyArray<ManagedSession>;
  readonly listByDevice: (deviceFingerprint: string) => ReadonlyArray<ManagedSession>;
  readonly sweepExpired: () => number;
  readonly getStats: () => SessionMgrStats;
}

export const DEFAULT_SESSION_MGR_CONFIG: SessionMgrConfig = {
  sessionDurationMs: 3_600_000,
  maxSessionsPerDynasty: 5,
};

// ─── Internal State ─────────────────────────────────────────────────

interface MutableSession {
  readonly sessionId: string;
  readonly token: string;
  readonly dynastyId: string;
  readonly deviceFingerprint: string;
  state: SessionMgrState;
  readonly createdAt: number;
  readonly expiresAt: number;
  lastActiveAt: number;
}

interface MgrState {
  readonly sessions: Map<string, MutableSession>;
  readonly tokenIndex: Map<string, string>;
  readonly deps: SessionMgrDeps;
  readonly config: SessionMgrConfig;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createSessionMgr(
  deps: SessionMgrDeps,
  config?: Partial<SessionMgrConfig>,
): SessionMgr {
  const state: MgrState = {
    sessions: new Map(),
    tokenIndex: new Map(),
    deps,
    config: { ...DEFAULT_SESSION_MGR_CONFIG, ...config },
  };

  return {
    create: (p) => createImpl(state, p),
    validateToken: (t) => validateTokenImpl(state, t),
    validateSession: (id) => validateSessionImpl(state, id),
    touch: (id) => touchImpl(state, id),
    revoke: (id) => revokeImpl(state, id),
    revokeAllForDynasty: (did) => revokeAllImpl(state, did),
    getSession: (id) => getSessionImpl(state, id),
    getSessionByToken: (t) => getByTokenImpl(state, t),
    listByDynasty: (did) => listByDynastyImpl(state, did),
    listByDevice: (df) => listByDeviceImpl(state, df),
    sweepExpired: () => sweepImpl(state),
    getStats: () => computeStats(state),
  };
}

// ─── Create ─────────────────────────────────────────────────────────

function createImpl(state: MgrState, params: CreateManagedSessionParams): ManagedSession {
  enforceSessionLimit(state, params.dynastyId);
  const now = state.deps.clock.nowMilliseconds();
  const session: MutableSession = {
    sessionId: state.deps.idGenerator.next(),
    token: state.deps.tokenGenerator.generateToken(),
    dynastyId: params.dynastyId,
    deviceFingerprint: params.deviceFingerprint,
    state: 'active',
    createdAt: now,
    expiresAt: now + state.config.sessionDurationMs,
    lastActiveAt: now,
  };
  state.sessions.set(session.sessionId, session);
  state.tokenIndex.set(session.token, session.sessionId);
  return toReadonly(session);
}

function enforceSessionLimit(state: MgrState, dynastyId: string): void {
  const active = getActiveDynastySessions(state, dynastyId);
  if (active.length >= state.config.maxSessionsPerDynasty) {
    let oldest: MutableSession | undefined;
    for (const s of active) {
      if (oldest === undefined || s.createdAt < oldest.createdAt) {
        oldest = s;
      }
    }
    if (oldest !== undefined) {
      oldest.state = 'revoked';
    }
  }
}

function getActiveDynastySessions(state: MgrState, dynastyId: string): MutableSession[] {
  const result: MutableSession[] = [];
  for (const s of state.sessions.values()) {
    if (s.dynastyId === dynastyId && s.state === 'active') {
      if (!isExpired(state, s)) result.push(s);
    }
  }
  return result;
}

// ─── Validation ─────────────────────────────────────────────────────

function validateTokenImpl(state: MgrState, token: string): SessionValidation {
  const sessionId = state.tokenIndex.get(token);
  if (sessionId === undefined) {
    return { valid: false, sessionId: null, reason: 'token_not_found' };
  }
  return validateSessionImpl(state, sessionId);
}

function validateSessionImpl(state: MgrState, sessionId: string): SessionValidation {
  const session = state.sessions.get(sessionId);
  if (session === undefined) {
    return { valid: false, sessionId, reason: 'session_not_found' };
  }
  if (session.state === 'revoked') {
    return { valid: false, sessionId, reason: 'session_revoked' };
  }
  if (isExpired(state, session)) {
    session.state = 'expired';
    return { valid: false, sessionId, reason: 'session_expired' };
  }
  return { valid: true, sessionId, reason: 'valid' };
}

// ─── Touch ──────────────────────────────────────────────────────────

function touchImpl(state: MgrState, sessionId: string): boolean {
  const session = state.sessions.get(sessionId);
  if (session === undefined) return false;
  if (session.state !== 'active') return false;
  if (isExpired(state, session)) {
    session.state = 'expired';
    return false;
  }
  session.lastActiveAt = state.deps.clock.nowMilliseconds();
  return true;
}

// ─── Revoke ─────────────────────────────────────────────────────────

function revokeImpl(state: MgrState, sessionId: string): boolean {
  const session = state.sessions.get(sessionId);
  if (session === undefined) return false;
  if (session.state === 'revoked') return false;
  session.state = 'revoked';
  return true;
}

function revokeAllImpl(state: MgrState, dynastyId: string): number {
  let count = 0;
  for (const s of state.sessions.values()) {
    if (s.dynastyId === dynastyId && s.state === 'active') {
      s.state = 'revoked';
      count += 1;
    }
  }
  return count;
}

// ─── Queries ────────────────────────────────────────────────────────

function getSessionImpl(state: MgrState, sessionId: string): ManagedSession | undefined {
  const s = state.sessions.get(sessionId);
  return s !== undefined ? toReadonly(s) : undefined;
}

function getByTokenImpl(state: MgrState, token: string): ManagedSession | undefined {
  const sessionId = state.tokenIndex.get(token);
  if (sessionId === undefined) return undefined;
  return getSessionImpl(state, sessionId);
}

function listByDynastyImpl(state: MgrState, dynastyId: string): ReadonlyArray<ManagedSession> {
  const result: ManagedSession[] = [];
  for (const s of state.sessions.values()) {
    if (s.dynastyId === dynastyId) result.push(toReadonly(s));
  }
  return result;
}

function listByDeviceImpl(
  state: MgrState,
  deviceFingerprint: string,
): ReadonlyArray<ManagedSession> {
  const result: ManagedSession[] = [];
  for (const s of state.sessions.values()) {
    if (s.deviceFingerprint === deviceFingerprint) result.push(toReadonly(s));
  }
  return result;
}

// ─── Sweep ──────────────────────────────────────────────────────────

function sweepImpl(state: MgrState): number {
  let count = 0;
  for (const s of state.sessions.values()) {
    if (s.state === 'active' && isExpired(state, s)) {
      s.state = 'expired';
      count += 1;
    }
  }
  return count;
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: MgrState): SessionMgrStats {
  let active = 0;
  let expired = 0;
  let revoked = 0;
  for (const s of state.sessions.values()) {
    if (s.state === 'revoked') {
      revoked += 1;
      continue;
    }
    if (s.state === 'expired' || isExpired(state, s)) {
      expired += 1;
      continue;
    }
    active += 1;
  }
  return {
    totalSessions: state.sessions.size,
    activeSessions: active,
    expiredSessions: expired,
    revokedSessions: revoked,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function isExpired(state: MgrState, session: MutableSession): boolean {
  if (session.state === 'expired') return true;
  return state.deps.clock.nowMilliseconds() >= session.expiresAt;
}

function toReadonly(s: MutableSession): ManagedSession {
  return {
    sessionId: s.sessionId,
    token: s.token,
    dynastyId: s.dynastyId,
    deviceFingerprint: s.deviceFingerprint,
    state: s.state,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    lastActiveAt: s.lastActiveAt,
  };
}
