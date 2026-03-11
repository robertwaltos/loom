/**
 * session-gateway.ts — HTTP session management with token issuance and validation.
 *
 * Issues opaque tokens, validates them against live session state, handles
 * expiry via clock comparison, and supports revoke/logout lifecycle transitions.
 *
 * "Access to the Loom is earned and expires."
 */

// ============================================================================
// PORTS
// ============================================================================

export type Clock = {
  now(): bigint;
};

export type IdGenerator = {
  generate(): string;
};

export type Logger = {
  info(message: string): void;
  warn(message: string): void;
};

// ============================================================================
// TYPES
// ============================================================================

export type SessionId = string;
export type UserId = string;
export type TokenValue = string;

export type SessionError =
  | 'session-not-found'
  | 'token-invalid'
  | 'session-expired'
  | 'user-not-found'
  | 'already-registered'
  | 'invalid-duration';

export type SessionStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'LOGGED_OUT';

export type Session = {
  readonly sessionId: SessionId;
  readonly userId: UserId;
  readonly token: TokenValue;
  readonly status: SessionStatus;
  readonly createdAt: bigint;
  readonly expiresAt: bigint;
  readonly lastAccessedAt: bigint;
  readonly metadata: Record<string, string>;
};

export type SessionStats = {
  readonly totalSessions: number;
  readonly activeSessions: number;
  readonly expiredSessions: number;
  readonly revokedSessions: number;
};

// ============================================================================
// STATE
// ============================================================================

type MutableSession = {
  sessionId: SessionId;
  userId: UserId;
  token: TokenValue;
  status: SessionStatus;
  createdAt: bigint;
  expiresAt: bigint;
  lastAccessedAt: bigint;
  metadata: Record<string, string>;
};

export type SessionGatewayState = {
  readonly deps: { clock: Clock; idGen: IdGenerator; logger: Logger };
  readonly users: Set<UserId>;
  readonly sessions: Map<SessionId, MutableSession>;
  readonly tokenIndex: Map<TokenValue, SessionId>;
  readonly sessionsByUser: Map<UserId, Set<SessionId>>;
};

// ============================================================================
// FACTORY
// ============================================================================

export function createSessionGatewayState(deps: {
  clock: Clock;
  idGen: IdGenerator;
  logger: Logger;
}): SessionGatewayState {
  return {
    deps,
    users: new Set(),
    sessions: new Map(),
    tokenIndex: new Map(),
    sessionsByUser: new Map(),
  };
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export function registerUser(
  state: SessionGatewayState,
  userId: UserId,
): { success: true } | { success: false; error: SessionError } {
  if (state.users.has(userId)) return { success: false, error: 'already-registered' };
  state.users.add(userId);
  state.sessionsByUser.set(userId, new Set());
  state.deps.logger.info('User registered: ' + userId);
  return { success: true };
}

// ============================================================================
// SESSION CREATION
// ============================================================================

export function createSession(
  state: SessionGatewayState,
  userId: UserId,
  durationUs: bigint,
  metadata: Record<string, string> = {},
): Session | SessionError {
  if (!state.users.has(userId)) return 'user-not-found';
  if (durationUs < 1n) return 'invalid-duration';
  const now = state.deps.clock.now();
  const sessionId = state.deps.idGen.generate();
  const token: TokenValue = sessionId + '-' + state.deps.idGen.generate();
  const session: MutableSession = {
    sessionId,
    userId,
    token,
    status: 'ACTIVE',
    createdAt: now,
    expiresAt: now + durationUs,
    lastAccessedAt: now,
    metadata: { ...metadata },
  };
  state.sessions.set(sessionId, session);
  state.tokenIndex.set(token, sessionId);
  state.sessionsByUser.get(userId)?.add(sessionId);
  state.deps.logger.info('Session created: ' + sessionId + ' user=' + userId);
  return toSession(session);
}

// ============================================================================
// TOKEN VALIDATION
// ============================================================================

export function validateToken(
  state: SessionGatewayState,
  token: TokenValue,
): { valid: true; session: Session } | { valid: false; error: SessionError } {
  const sessionId = state.tokenIndex.get(token);
  if (sessionId === undefined) return { valid: false, error: 'token-invalid' };
  const session = state.sessions.get(sessionId);
  if (session === undefined) return { valid: false, error: 'token-invalid' };

  const now = state.deps.clock.now();
  if (session.status === 'REVOKED' || session.status === 'LOGGED_OUT') {
    return { valid: false, error: 'session-expired' };
  }
  if (now > session.expiresAt) {
    session.status = 'EXPIRED';
    return { valid: false, error: 'session-expired' };
  }

  session.lastAccessedAt = now;
  return { valid: true, session: toSession(session) };
}

// ============================================================================
// SESSION LIFECYCLE
// ============================================================================

export function refreshSession(
  state: SessionGatewayState,
  sessionId: SessionId,
  additionalDurationUs: bigint,
): { success: true } | { success: false; error: SessionError } {
  const session = state.sessions.get(sessionId);
  if (session === undefined) return { success: false, error: 'session-not-found' };
  if (session.status !== 'ACTIVE') return { success: false, error: 'session-expired' };
  session.expiresAt = session.expiresAt + additionalDurationUs;
  return { success: true };
}

export function revokeSession(
  state: SessionGatewayState,
  sessionId: SessionId,
): { success: true } | { success: false; error: SessionError } {
  const session = state.sessions.get(sessionId);
  if (session === undefined) return { success: false, error: 'session-not-found' };
  if (session.status !== 'ACTIVE') return { success: false, error: 'session-expired' };
  session.status = 'REVOKED';
  state.deps.logger.info('Session revoked: ' + sessionId);
  return { success: true };
}

export function logoutSession(
  state: SessionGatewayState,
  sessionId: SessionId,
): { success: true } | { success: false; error: SessionError } {
  const session = state.sessions.get(sessionId);
  if (session === undefined) return { success: false, error: 'session-not-found' };
  if (session.status !== 'ACTIVE') return { success: false, error: 'session-expired' };
  session.status = 'LOGGED_OUT';
  state.deps.logger.info('Session logged out: ' + sessionId);
  return { success: true };
}

// ============================================================================
// QUERIES
// ============================================================================

export function getUserSessions(
  state: SessionGatewayState,
  userId: UserId,
): ReadonlyArray<Session> {
  const ids = state.sessionsByUser.get(userId);
  if (ids === undefined) return [];
  return [...ids]
    .map((id) => state.sessions.get(id))
    .filter((s): s is MutableSession => s !== undefined)
    .map(toSession);
}

export function getSession(state: SessionGatewayState, sessionId: SessionId): Session | undefined {
  const s = state.sessions.get(sessionId);
  return s === undefined ? undefined : toSession(s);
}

export function getStats(state: SessionGatewayState): SessionStats {
  let activeSessions = 0;
  let expiredSessions = 0;
  let revokedSessions = 0;
  for (const s of state.sessions.values()) {
    if (s.status === 'ACTIVE') activeSessions++;
    else if (s.status === 'EXPIRED') expiredSessions++;
    else if (s.status === 'REVOKED') revokedSessions++;
  }
  return {
    totalSessions: state.sessions.size,
    activeSessions,
    expiredSessions,
    revokedSessions,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function toSession(s: MutableSession): Session {
  return {
    sessionId: s.sessionId,
    userId: s.userId,
    token: s.token,
    status: s.status,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    lastAccessedAt: s.lastAccessedAt,
    metadata: { ...s.metadata },
  };
}
