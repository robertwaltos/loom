import { describe, it, expect, beforeEach } from 'vitest';
import type { SessionGatewayState, Clock, IdGenerator, Logger } from '../session-gateway.js';
import {
  createSessionGatewayState,
  registerUser,
  createSession,
  validateToken,
  refreshSession,
  revokeSession,
  logoutSession,
  getUserSessions,
  getSession,
  getStats,
} from '../session-gateway.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function makeClock(startUs = 1_000_000n): { clock: Clock; advance: (by: bigint) => void } {
  let t = startUs;
  return {
    clock: { now: () => t },
    advance: (by: bigint) => {
      t += by;
    },
  };
}

function makeIdGen(): IdGenerator {
  let n = 0;
  return { generate: () => 'id-' + String(++n) };
}

function makeLogger(): Logger {
  return { info: () => undefined, warn: () => undefined };
}

// ============================================================================
// USER REGISTRATION
// ============================================================================

describe('SessionGateway — user registration', () => {
  let state: SessionGatewayState;

  beforeEach(() => {
    const { clock } = makeClock();
    state = createSessionGatewayState({ clock, idGen: makeIdGen(), logger: makeLogger() });
  });

  it('registers a user', () => {
    expect(registerUser(state, 'user-1')).toEqual({ success: true });
  });

  it('rejects duplicate registration', () => {
    registerUser(state, 'user-1');
    expect(registerUser(state, 'user-1')).toEqual({ success: false, error: 'already-registered' });
  });
});

// ============================================================================
// SESSION CREATION
// ============================================================================

describe('SessionGateway — createSession', () => {
  let state: SessionGatewayState;

  beforeEach(() => {
    const { clock } = makeClock();
    state = createSessionGatewayState({ clock, idGen: makeIdGen(), logger: makeLogger() });
    registerUser(state, 'user-1');
  });

  it('creates a session for a registered user', () => {
    const result = createSession(state, 'user-1', 60_000_000n);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.status).toBe('ACTIVE');
      expect(result.userId).toBe('user-1');
    }
  });

  it('token has expected format', () => {
    const session = createSession(state, 'user-1', 60_000_000n);
    if (typeof session === 'object') {
      expect(session.token).toContain(session.sessionId);
    }
  });

  it('returns user-not-found for unknown user', () => {
    expect(createSession(state, 'ghost', 60_000_000n)).toBe('user-not-found');
  });

  it('returns invalid-duration for durationUs < 1n', () => {
    expect(createSession(state, 'user-1', 0n)).toBe('invalid-duration');
  });

  it('expiresAt is correctly calculated', () => {
    const dur = 60_000_000n;
    const session = createSession(state, 'user-1', dur);
    if (typeof session === 'object') {
      expect(session.expiresAt).toBe(session.createdAt + dur);
    }
  });

  it('stores metadata on session', () => {
    const session = createSession(state, 'user-1', 60_000_000n, { role: 'admin' });
    if (typeof session === 'object') {
      expect(session.metadata['role']).toBe('admin');
    }
  });
});

// ============================================================================
// TOKEN VALIDATION
// ============================================================================

describe('SessionGateway — validateToken', () => {
  let state: SessionGatewayState;
  let clock: Clock;
  let advance: (by: bigint) => void;

  beforeEach(() => {
    const c = makeClock();
    clock = c.clock;
    advance = c.advance;
    state = createSessionGatewayState({ clock, idGen: makeIdGen(), logger: makeLogger() });
    registerUser(state, 'user-1');
  });

  it('validates a good token', () => {
    const session = createSession(state, 'user-1', 60_000_000n);
    if (typeof session === 'object') {
      const result = validateToken(state, session.token);
      expect(result.valid).toBe(true);
    }
  });

  it('returns token-invalid for unknown token', () => {
    const result = validateToken(state, 'bad-token-xyz');
    expect(result).toEqual({ valid: false, error: 'token-invalid' });
  });

  it('returns session-expired for expired session', () => {
    const session = createSession(state, 'user-1', 1000n);
    if (typeof session === 'object') {
      advance(2000n);
      const result = validateToken(state, session.token);
      expect(result).toEqual({ valid: false, error: 'session-expired' });
      expect(getSession(state, session.sessionId)?.status).toBe('EXPIRED');
    }
  });

  it('returns session-expired for revoked session', () => {
    const session = createSession(state, 'user-1', 60_000_000n);
    if (typeof session === 'object') {
      revokeSession(state, session.sessionId);
      const result = validateToken(state, session.token);
      expect(result).toEqual({ valid: false, error: 'session-expired' });
    }
  });

  it('updates lastAccessedAt on successful validation', () => {
    const session = createSession(state, 'user-1', 60_000_000n);
    if (typeof session === 'object') {
      advance(1000n);
      validateToken(state, session.token);
      const updated = getSession(state, session.sessionId);
      expect(updated?.lastAccessedAt).toBeGreaterThan(session.lastAccessedAt);
    }
  });
});

// ============================================================================
// SESSION LIFECYCLE
// ============================================================================

describe('SessionGateway — refreshSession', () => {
  let state: SessionGatewayState;

  beforeEach(() => {
    const { clock } = makeClock();
    state = createSessionGatewayState({ clock, idGen: makeIdGen(), logger: makeLogger() });
    registerUser(state, 'user-1');
  });

  it('extends expiresAt', () => {
    const session = createSession(state, 'user-1', 60_000_000n);
    if (typeof session === 'object') {
      const result = refreshSession(state, session.sessionId, 30_000_000n);
      expect(result).toEqual({ success: true });
      expect(getSession(state, session.sessionId)?.expiresAt).toBe(session.expiresAt + 30_000_000n);
    }
  });

  it('returns session-not-found for unknown session', () => {
    expect(refreshSession(state, 'ghost', 1000n)).toEqual({
      success: false,
      error: 'session-not-found',
    });
  });
});

describe('SessionGateway — revokeSession', () => {
  let state: SessionGatewayState;

  beforeEach(() => {
    const { clock } = makeClock();
    state = createSessionGatewayState({ clock, idGen: makeIdGen(), logger: makeLogger() });
    registerUser(state, 'user-1');
  });

  it('moves ACTIVE → REVOKED', () => {
    const session = createSession(state, 'user-1', 60_000_000n);
    if (typeof session === 'object') {
      const result = revokeSession(state, session.sessionId);
      expect(result).toEqual({ success: true });
      expect(getSession(state, session.sessionId)?.status).toBe('REVOKED');
    }
  });

  it('returns session-expired for already-revoked session', () => {
    const session = createSession(state, 'user-1', 60_000_000n);
    if (typeof session === 'object') {
      revokeSession(state, session.sessionId);
      expect(revokeSession(state, session.sessionId)).toEqual({
        success: false,
        error: 'session-expired',
      });
    }
  });
});

describe('SessionGateway — logoutSession', () => {
  let state: SessionGatewayState;

  beforeEach(() => {
    const { clock } = makeClock();
    state = createSessionGatewayState({ clock, idGen: makeIdGen(), logger: makeLogger() });
    registerUser(state, 'user-1');
  });

  it('moves ACTIVE → LOGGED_OUT', () => {
    const session = createSession(state, 'user-1', 60_000_000n);
    if (typeof session === 'object') {
      const result = logoutSession(state, session.sessionId);
      expect(result).toEqual({ success: true });
      expect(getSession(state, session.sessionId)?.status).toBe('LOGGED_OUT');
    }
  });
});

// ============================================================================
// QUERIES & STATS
// ============================================================================

describe('SessionGateway — queries and stats', () => {
  let state: SessionGatewayState;

  beforeEach(() => {
    const { clock } = makeClock();
    state = createSessionGatewayState({ clock, idGen: makeIdGen(), logger: makeLogger() });
    registerUser(state, 'user-1');
    registerUser(state, 'user-2');
  });

  it('getUserSessions returns sessions for user', () => {
    createSession(state, 'user-1', 60_000_000n);
    createSession(state, 'user-1', 60_000_000n);
    expect(getUserSessions(state, 'user-1')).toHaveLength(2);
  });

  it('getUserSessions returns empty for unregistered user', () => {
    expect(getUserSessions(state, 'unknown')).toHaveLength(0);
  });

  it('getStats counts correctly', () => {
    const s1 = createSession(state, 'user-1', 60_000_000n);
    const s2 = createSession(state, 'user-2', 60_000_000n);
    if (typeof s1 === 'object') revokeSession(state, s1.sessionId);
    const stats = getStats(state);
    expect(stats.totalSessions).toBe(2);
    expect(stats.activeSessions).toBe(typeof s2 === 'object' ? 1 : 0);
    expect(stats.revokedSessions).toBe(1);
  });
});
