/**
 * Connection Authenticator — Token-gated connection validation.
 *
 * The Selvage is the outer edge; the Dye House guards the gate.
 * The Connection Authenticator bridges them: when a client connects,
 * the authenticator validates their session token before allowing
 * handshake completion.
 *
 * Responsibilities:
 *   - Validate tokens on connection attempt
 *   - Track authenticated sessions per dynasty
 *   - Reject expired or revoked tokens
 *   - Enforce maximum concurrent connections per dynasty
 *
 * The authenticator does NOT issue tokens — that's the Dye House's
 * job. It only validates and tracks.
 *
 * "The Selvage checks the dye before any thread enters the weave."
 */

// ─── Types ───────────────────────────────────────────────────────────

export type AuthResult = AuthSuccess | AuthFailure;

export interface AuthSuccess {
  readonly authenticated: true;
  readonly dynastyId: string;
  readonly tokenId: string;
  readonly sessionId: string;
}

export interface AuthFailure {
  readonly authenticated: false;
  readonly reason: AuthDenialReason;
}

export type AuthDenialReason =
  | 'token_invalid'
  | 'token_expired'
  | 'token_revoked'
  | 'max_connections_exceeded';

export interface AuthenticatedSession {
  readonly sessionId: string;
  readonly connectionId: string;
  readonly dynastyId: string;
  readonly tokenId: string;
  readonly authenticatedAt: number;
}

export interface ConnectionAuthConfig {
  readonly maxConnectionsPerDynasty: number;
}

// ─── Port Interfaces ────────────────────────────────────────────────

export interface TokenValidationPort {
  validate(tokenId: string): TokenValidationResult;
}

export interface TokenValidationResult {
  readonly valid: boolean;
  readonly reason: string | null;
  readonly dynastyId: string | null;
}

export interface AuthIdGenerator {
  next(): string;
}

export interface ConnectionAuthDeps {
  readonly tokenPort: TokenValidationPort;
  readonly idGenerator: AuthIdGenerator;
  readonly clock: { nowMicroseconds(): number };
  readonly config: ConnectionAuthConfig;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface ConnectionAuthenticator {
  authenticate(connectionId: string, tokenId: string): AuthResult;
  deauthenticate(connectionId: string): boolean;
  getSession(connectionId: string): AuthenticatedSession | undefined;
  getSessionsByDynasty(dynastyId: string): ReadonlyArray<AuthenticatedSession>;
  isAuthenticated(connectionId: string): boolean;
  connectionCountForDynasty(dynastyId: string): number;
  sessionCount(): number;
}

// ─── State ──────────────────────────────────────────────────────────

interface AuthState {
  readonly sessions: Map<string, AuthenticatedSession>;
  readonly dynastySessions: Map<string, Set<string>>;
  readonly deps: ConnectionAuthDeps;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createConnectionAuthenticator(deps: ConnectionAuthDeps): ConnectionAuthenticator {
  const state: AuthState = {
    sessions: new Map(),
    dynastySessions: new Map(),
    deps,
  };

  return {
    authenticate: (cid, tid) => authenticateImpl(state, cid, tid),
    deauthenticate: (cid) => deauthenticateImpl(state, cid),
    getSession: (cid) => state.sessions.get(cid),
    getSessionsByDynasty: (did) => getByDynastyImpl(state, did),
    isAuthenticated: (cid) => state.sessions.has(cid),
    connectionCountForDynasty: (did) => dynastyCountImpl(state, did),
    sessionCount: () => state.sessions.size,
  };
}

// ─── Authentication ─────────────────────────────────────────────────

function authenticateImpl(state: AuthState, connectionId: string, tokenId: string): AuthResult {
  const validation = state.deps.tokenPort.validate(tokenId);

  if (!validation.valid) {
    return mapValidationFailure(validation.reason);
  }

  const dynastyId = validation.dynastyId ?? '';
  if (!canAddConnection(state, dynastyId)) {
    return { authenticated: false, reason: 'max_connections_exceeded' };
  }

  const session = createSession(state, connectionId, dynastyId, tokenId);
  trackSession(state, session);

  return {
    authenticated: true,
    dynastyId,
    tokenId,
    sessionId: session.sessionId,
  };
}

function mapValidationFailure(reason: string | null): AuthFailure {
  if (reason === 'expired') return { authenticated: false, reason: 'token_expired' };
  if (reason === 'revoked') return { authenticated: false, reason: 'token_revoked' };
  return { authenticated: false, reason: 'token_invalid' };
}

function canAddConnection(state: AuthState, dynastyId: string): boolean {
  const max = state.deps.config.maxConnectionsPerDynasty;
  return dynastyCountImpl(state, dynastyId) < max;
}

function createSession(
  state: AuthState,
  connectionId: string,
  dynastyId: string,
  tokenId: string,
): AuthenticatedSession {
  return {
    sessionId: state.deps.idGenerator.next(),
    connectionId,
    dynastyId,
    tokenId,
    authenticatedAt: state.deps.clock.nowMicroseconds(),
  };
}

function trackSession(state: AuthState, session: AuthenticatedSession): void {
  state.sessions.set(session.connectionId, session);
  let set = state.dynastySessions.get(session.dynastyId);
  if (set === undefined) {
    set = new Set();
    state.dynastySessions.set(session.dynastyId, set);
  }
  set.add(session.connectionId);
}

// ─── Deauthentication ───────────────────────────────────────────────

function deauthenticateImpl(state: AuthState, connectionId: string): boolean {
  const session = state.sessions.get(connectionId);
  if (session === undefined) return false;

  state.sessions.delete(connectionId);
  removeFromDynastySet(state, session.dynastyId, connectionId);
  return true;
}

function removeFromDynastySet(state: AuthState, dynastyId: string, connectionId: string): void {
  const set = state.dynastySessions.get(dynastyId);
  if (set === undefined) return;
  set.delete(connectionId);
  if (set.size === 0) {
    state.dynastySessions.delete(dynastyId);
  }
}

// ─── Queries ────────────────────────────────────────────────────────

function getByDynastyImpl(
  state: AuthState,
  dynastyId: string,
): ReadonlyArray<AuthenticatedSession> {
  const connectionIds = state.dynastySessions.get(dynastyId);
  if (connectionIds === undefined) return [];
  const sessions: AuthenticatedSession[] = [];
  for (const cid of connectionIds) {
    const session = state.sessions.get(cid);
    if (session !== undefined) {
      sessions.push(session);
    }
  }
  return sessions;
}

function dynastyCountImpl(state: AuthState, dynastyId: string): number {
  return state.dynastySessions.get(dynastyId)?.size ?? 0;
}
