import { describe, it, expect } from 'vitest';
import {
  createSessionGatewayState,
  registerUser,
  createSession,
  validateToken,
  refreshSession,
  revokeSession,
  getUserSessions,
  getStats,
} from '../session-gateway.js';

let idSeq = 0;
function makeGateway() {
  idSeq = 0;
  return createSessionGatewayState({
    clock: { now: () => BigInt(Date.now()) * 1_000n },
    idGen: { generate: () => `sess-${++idSeq}` },
    logger: { info: () => {}, warn: () => {} },
  });
}

describe('Session Gateway Simulation', () => {
  it('registers a user and creates a session', () => {
    const state = makeGateway();

    const ru = registerUser(state, 'user-1');
    expect(ru.success).toBe(true);

    const session = createSession(state, 'user-1', 3_600_000_000_000n);
    expect(session).not.toBe('user-not-found');
    expect((session as { token: string }).token).toBeDefined();
  });

  it('validates a session token', () => {
    const state = makeGateway();

    registerUser(state, 'user-2');
    const session = createSession(state, 'user-2', 3_600_000_000_000n) as { token: string };

    const validated = validateToken(state, session.token);
    expect(validated.valid).toBe(true);
    expect((validated as { valid: true; session: { userId: string } }).session.userId).toBe('user-2');
  });

  it('refreshes a session extending its TTL', () => {
    const state = makeGateway();

    registerUser(state, 'user-3');
    const session = createSession(state, 'user-3', 3_600_000_000_000n) as { token: string; sessionId: string };

    const refreshed = refreshSession(state, session.sessionId, 3_600_000_000_000n);
    expect(refreshed.success).toBe(true);
  });

  it('revokes a session making it invalid', () => {
    const state = makeGateway();

    registerUser(state, 'user-4');
    const session = createSession(state, 'user-4', 3_600_000_000_000n) as { token: string; sessionId: string };

    revokeSession(state, session.sessionId);

    const validated = validateToken(state, session.token);
    expect(validated.valid).toBe(false);
  });

  it('returns user-not-found for unregistered users', () => {
    const state = makeGateway();
    const result = createSession(state, 'ghost-user', 1_000n);
    expect(result).toBe('user-not-found');
  });

  it('prevents duplicate user registration', () => {
    const state = makeGateway();
    registerUser(state, 'dupe-user');
    const dup = registerUser(state, 'dupe-user');
    expect(dup.success).toBe(false);
    expect(dup.error).toBe('already-registered');
  });

  it('lists sessions for a user', () => {
    const state = makeGateway();
    registerUser(state, 'multi-user');
    createSession(state, 'multi-user', 1_000_000n);
    createSession(state, 'multi-user', 2_000_000n);

    const sessions = getUserSessions(state, 'multi-user');
    expect(sessions.length).toBe(2);
  });

  it('tracks stats', () => {
    const state = makeGateway();
    registerUser(state, 'stat-user');
    createSession(state, 'stat-user', 1_000_000n);
    const stats = getStats(state);
    expect(stats.totalSessions).toBeGreaterThanOrEqual(1);
  });
});
