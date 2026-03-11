import { describe, it, expect } from 'vitest';
import { createSessionMgr } from '../session-mgr.js';
import type { SessionMgr, SessionMgrDeps } from '../session-mgr.js';

// ─── Helpers ────────────────────────────────────────────────────────

function createTestMgr(config?: { sessionDurationMs?: number; maxSessionsPerDynasty?: number }): {
  mgr: SessionMgr;
  advanceTime: (ms: number) => void;
} {
  let time = 1000;
  let idCounter = 0;
  let tokenCounter = 0;
  const deps: SessionMgrDeps = {
    clock: { nowMilliseconds: () => time },
    idGenerator: {
      next: () => {
        idCounter += 1;
        return 'sess-' + String(idCounter);
      },
    },
    tokenGenerator: {
      generateToken: () => {
        tokenCounter += 1;
        return 'tok-' + String(tokenCounter);
      },
    },
  };
  return {
    mgr: createSessionMgr(deps, config),
    advanceTime: (ms: number) => {
      time += ms;
    },
  };
}

// ─── Session Creation ───────────────────────────────────────────────

describe('SessionMgr creation', () => {
  it('creates a session with dynasty and device', () => {
    const { mgr } = createTestMgr();
    const session = mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-a' });
    expect(session.dynastyId).toBe('dyn-1');
    expect(session.deviceFingerprint).toBe('device-a');
    expect(session.state).toBe('active');
  });

  it('generates unique session ids', () => {
    const { mgr } = createTestMgr();
    const s1 = mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-a' });
    const s2 = mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-b' });
    expect(s1.sessionId).not.toBe(s2.sessionId);
  });

  it('generates unique tokens', () => {
    const { mgr } = createTestMgr();
    const s1 = mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-a' });
    const s2 = mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-b' });
    expect(s1.token).not.toBe(s2.token);
  });

  it('sets expiry based on duration config', () => {
    const { mgr } = createTestMgr({ sessionDurationMs: 5000 });
    const session = mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-a' });
    expect(session.expiresAt).toBe(session.createdAt + 5000);
  });
});

// ─── Validation ─────────────────────────────────────────────────────

describe('SessionMgr validation', () => {
  it('validates active session by token', () => {
    const { mgr } = createTestMgr();
    const session = mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-a' });
    const result = mgr.validateToken(session.token);
    expect(result.valid).toBe(true);
    expect(result.sessionId).toBe(session.sessionId);
  });

  it('rejects unknown token', () => {
    const { mgr } = createTestMgr();
    const result = mgr.validateToken('unknown-token');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('token_not_found');
  });

  it('rejects expired session', () => {
    const { mgr, advanceTime } = createTestMgr({ sessionDurationMs: 1000 });
    const session = mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-a' });
    advanceTime(2000);
    const result = mgr.validateSession(session.sessionId);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('session_expired');
  });

  it('rejects revoked session', () => {
    const { mgr } = createTestMgr();
    const session = mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-a' });
    mgr.revoke(session.sessionId);
    const result = mgr.validateSession(session.sessionId);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('session_revoked');
  });

  it('validates session by session id', () => {
    const { mgr } = createTestMgr();
    const session = mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-a' });
    const result = mgr.validateSession(session.sessionId);
    expect(result.valid).toBe(true);
  });
});

// ─── Touch / Activity ───────────────────────────────────────────────

describe('SessionMgr touch', () => {
  it('updates last active timestamp on touch', () => {
    const { mgr, advanceTime } = createTestMgr();
    const session = mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-a' });
    advanceTime(500);
    expect(mgr.touch(session.sessionId)).toBe(true);
    const updated = mgr.getSession(session.sessionId);
    expect(updated?.lastActiveAt).toBe(1500);
  });

  it('returns false touching nonexistent session', () => {
    const { mgr } = createTestMgr();
    expect(mgr.touch('nonexistent')).toBe(false);
  });

  it('returns false touching expired session', () => {
    const { mgr, advanceTime } = createTestMgr({ sessionDurationMs: 1000 });
    const session = mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-a' });
    advanceTime(2000);
    expect(mgr.touch(session.sessionId)).toBe(false);
  });

  it('returns false touching revoked session', () => {
    const { mgr } = createTestMgr();
    const session = mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-a' });
    mgr.revoke(session.sessionId);
    expect(mgr.touch(session.sessionId)).toBe(false);
  });
});

// ─── Revocation ─────────────────────────────────────────────────────

describe('SessionMgr revocation', () => {
  it('revokes a session', () => {
    const { mgr } = createTestMgr();
    const session = mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-a' });
    expect(mgr.revoke(session.sessionId)).toBe(true);
    expect(mgr.getSession(session.sessionId)?.state).toBe('revoked');
  });

  it('returns false revoking already revoked session', () => {
    const { mgr } = createTestMgr();
    const session = mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-a' });
    mgr.revoke(session.sessionId);
    expect(mgr.revoke(session.sessionId)).toBe(false);
  });

  it('revokes all sessions for dynasty', () => {
    const { mgr } = createTestMgr();
    mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-a' });
    mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-b' });
    mgr.create({ dynastyId: 'dyn-2', deviceFingerprint: 'device-c' });
    const count = mgr.revokeAllForDynasty('dyn-1');
    expect(count).toBe(2);
  });
});

// ─── Session Limits ─────────────────────────────────────────────────

describe('SessionMgr session limits', () => {
  it('auto-revokes oldest session when limit exceeded', () => {
    const { mgr, advanceTime } = createTestMgr({ maxSessionsPerDynasty: 2 });
    const s1 = mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-a' });
    advanceTime(10);
    mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-b' });
    advanceTime(10);
    mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-c' });
    expect(mgr.getSession(s1.sessionId)?.state).toBe('revoked');
  });

  it('does not affect other dynasties', () => {
    const { mgr, advanceTime } = createTestMgr({ maxSessionsPerDynasty: 1 });
    const s1 = mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-a' });
    advanceTime(10);
    mgr.create({ dynastyId: 'dyn-2', deviceFingerprint: 'device-b' });
    expect(mgr.getSession(s1.sessionId)?.state).toBe('active');
  });
});

// ─── Queries ────────────────────────────────────────────────────────

describe('SessionMgr queries', () => {
  it('lists sessions by dynasty', () => {
    const { mgr } = createTestMgr();
    mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-a' });
    mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-b' });
    mgr.create({ dynastyId: 'dyn-2', deviceFingerprint: 'device-c' });
    expect(mgr.listByDynasty('dyn-1')).toHaveLength(2);
  });

  it('lists sessions by device fingerprint', () => {
    const { mgr } = createTestMgr();
    mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-a' });
    mgr.create({ dynastyId: 'dyn-2', deviceFingerprint: 'device-a' });
    expect(mgr.listByDevice('device-a')).toHaveLength(2);
  });

  it('gets session by token', () => {
    const { mgr } = createTestMgr();
    const session = mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-a' });
    const found = mgr.getSessionByToken(session.token);
    expect(found?.sessionId).toBe(session.sessionId);
  });

  it('returns undefined for unknown session', () => {
    const { mgr } = createTestMgr();
    expect(mgr.getSession('nonexistent')).toBeUndefined();
  });
});

// ─── Sweep & Stats ──────────────────────────────────────────────────

describe('SessionMgr sweep and stats', () => {
  it('sweeps expired sessions', () => {
    const { mgr, advanceTime } = createTestMgr({ sessionDurationMs: 1000 });
    mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-a' });
    advanceTime(2000);
    const swept = mgr.sweepExpired();
    expect(swept).toBe(1);
  });

  it('computes stats correctly', () => {
    const { mgr } = createTestMgr();
    mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-a' });
    mgr.create({ dynastyId: 'dyn-1', deviceFingerprint: 'device-b' });
    const s3 = mgr.create({ dynastyId: 'dyn-2', deviceFingerprint: 'device-c' });
    mgr.revoke(s3.sessionId);
    const stats = mgr.getStats();
    expect(stats.totalSessions).toBe(3);
    expect(stats.activeSessions).toBe(2);
    expect(stats.revokedSessions).toBe(1);
  });
});
