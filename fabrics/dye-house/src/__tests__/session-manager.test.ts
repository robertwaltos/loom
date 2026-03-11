import { describe, it, expect } from 'vitest';
import { createSessionManager, DEFAULT_SESSION_CONFIG } from '../session-manager.js';
import type { SessionManagerDeps } from '../session-manager.js';

function makeDeps(): SessionManagerDeps & { advance: (us: number) => void } {
  let time = 1_000_000;
  let idCounter = 0;
  return {
    clock: { nowMicroseconds: () => time },
    idGenerator: { next: () => 'sess-' + String(++idCounter) },
    advance: (us: number) => {
      time += us;
    },
  };
}

describe('SessionManager — create and retrieve', () => {
  it('creates a session', () => {
    const mgr = createSessionManager(makeDeps());
    const session = mgr.create({ dynastyId: 'd1' });
    expect(session.dynastyId).toBe('d1');
    expect(session.expired).toBe(false);
  });

  it('retrieves a session by id', () => {
    const mgr = createSessionManager(makeDeps());
    const session = mgr.create({ dynastyId: 'd1' });
    expect(mgr.getSession(session.sessionId)?.dynastyId).toBe('d1');
  });

  it('returns undefined for unknown session', () => {
    const mgr = createSessionManager(makeDeps());
    expect(mgr.getSession('missing')).toBeUndefined();
  });

  it('lists sessions by dynasty', () => {
    const mgr = createSessionManager(makeDeps());
    mgr.create({ dynastyId: 'd1' });
    mgr.create({ dynastyId: 'd1' });
    mgr.create({ dynastyId: 'd2' });
    expect(mgr.listByDynasty('d1')).toHaveLength(2);
  });
});

describe('SessionManager — touch and validate', () => {
  it('touches a session', () => {
    const deps = makeDeps();
    const mgr = createSessionManager(deps);
    const session = mgr.create({ dynastyId: 'd1' });
    deps.advance(1_000_000);
    expect(mgr.touch(session.sessionId)).toBe(true);
    const updated = mgr.getSession(session.sessionId);
    expect(updated?.lastTouchedAt).toBe(2_000_000);
  });

  it('validates active session', () => {
    const mgr = createSessionManager(makeDeps());
    const session = mgr.create({ dynastyId: 'd1' });
    expect(mgr.validate(session.sessionId)).toBe(true);
  });

  it('rejects expired session', () => {
    const deps = makeDeps();
    const mgr = createSessionManager(deps);
    const session = mgr.create({ dynastyId: 'd1' });
    deps.advance(5_000_000_000);
    expect(mgr.validate(session.sessionId)).toBe(false);
  });

  it('rejects touch on expired session', () => {
    const deps = makeDeps();
    const mgr = createSessionManager(deps);
    const session = mgr.create({ dynastyId: 'd1' });
    deps.advance(5_000_000_000);
    expect(mgr.touch(session.sessionId)).toBe(false);
  });
});

describe('SessionManager — expire', () => {
  it('manually expires a session', () => {
    const mgr = createSessionManager(makeDeps());
    const session = mgr.create({ dynastyId: 'd1' });
    expect(mgr.expire(session.sessionId)).toBe(true);
    expect(mgr.validate(session.sessionId)).toBe(false);
  });

  it('returns false when already expired', () => {
    const mgr = createSessionManager(makeDeps());
    const session = mgr.create({ dynastyId: 'd1' });
    mgr.expire(session.sessionId);
    expect(mgr.expire(session.sessionId)).toBe(false);
  });

  it('returns false for unknown session', () => {
    const mgr = createSessionManager(makeDeps());
    expect(mgr.expire('missing')).toBe(false);
  });
});

describe('SessionManager — sweep and config', () => {
  it('sweeps expired sessions', () => {
    const deps = makeDeps();
    const mgr = createSessionManager(deps, { ttlUs: 10_000_000 });
    mgr.create({ dynastyId: 'd1' });
    mgr.create({ dynastyId: 'd2' });
    deps.advance(20_000_000);
    const count = mgr.sweepExpired();
    expect(count).toBe(2);
  });

  it('uses default ttl', () => {
    expect(DEFAULT_SESSION_CONFIG.ttlUs).toBe(3_600_000_000);
  });
});

describe('SessionManager — stats', () => {
  it('starts with zero stats', () => {
    const mgr = createSessionManager(makeDeps());
    const stats = mgr.getStats();
    expect(stats.totalSessions).toBe(0);
    expect(stats.activeSessions).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const deps = makeDeps();
    const mgr = createSessionManager(deps, { ttlUs: 10_000_000 });
    mgr.create({ dynastyId: 'd1' });
    const s2 = mgr.create({ dynastyId: 'd2' });
    mgr.expire(s2.sessionId);
    const stats = mgr.getStats();
    expect(stats.totalSessions).toBe(2);
    expect(stats.activeSessions).toBe(1);
    expect(stats.expiredSessions).toBe(1);
  });
});
