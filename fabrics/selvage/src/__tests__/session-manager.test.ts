import { describe, it, expect } from 'vitest';
import { createSessionManager, DEFAULT_SESSION_CONFIG } from '../session-manager.js';
import type { SessionManagerDeps, CreateSessionParams } from '../session-manager.js';

function makeDeps(overrides?: Partial<SessionManagerDeps>): SessionManagerDeps {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    ...overrides,
  };
}

function makeParams(overrides?: Partial<CreateSessionParams>): CreateSessionParams {
  return {
    sessionId: 'sess-1',
    connectionId: 'conn-1',
    dynastyId: 'dyn-1',
    ...overrides,
  };
}

describe('SessionManager — creation', () => {
  it('creates a session', () => {
    const mgr = createSessionManager(makeDeps());
    const session = mgr.create(makeParams());
    expect(session.sessionId).toBe('sess-1');
    expect(session.state).toBe('active');
    expect(session.dynastyId).toBe('dyn-1');
  });

  it('rejects duplicate session id', () => {
    const mgr = createSessionManager(makeDeps());
    mgr.create(makeParams());
    expect(() => mgr.create(makeParams())).toThrow('already exists');
  });

  it('stores metadata', () => {
    const mgr = createSessionManager(makeDeps());
    const session = mgr.create(makeParams({ metadata: { platform: 'pc' } }));
    expect(session.metadata).toEqual({ platform: 'pc' });
  });
});

describe('SessionManager — heartbeat', () => {
  it('updates last heartbeat time', () => {
    const mgr = createSessionManager(makeDeps());
    mgr.create(makeParams());
    const result = mgr.heartbeat('sess-1');
    expect(result).toBe(true);
  });

  it('returns false for unknown session', () => {
    const mgr = createSessionManager(makeDeps());
    expect(mgr.heartbeat('unknown')).toBe(false);
  });

  it('returns false for terminated session', () => {
    const mgr = createSessionManager(makeDeps());
    mgr.create(makeParams());
    mgr.terminate('sess-1', 'logout');
    expect(mgr.heartbeat('sess-1')).toBe(false);
  });

  it('revives idle session back to active', () => {
    let time = 0;
    const mgr = createSessionManager({
      clock: {
        nowMicroseconds: () => {
          time += 1_000_000;
          return time;
        },
      },
      config: { idleThresholdUs: 5_000_000 },
    });
    mgr.create(makeParams());

    // Advance past idle threshold
    time += 10_000_000;
    const session = mgr.getSession('sess-1');
    expect(session?.state).toBe('idle');

    // Heartbeat revives
    mgr.heartbeat('sess-1');
    const refreshed = mgr.getSession('sess-1');
    expect(refreshed?.state).toBe('active');
  });
});

describe('SessionManager — termination', () => {
  it('terminates a session', () => {
    const mgr = createSessionManager(makeDeps());
    mgr.create(makeParams());
    const result = mgr.terminate('sess-1', 'logout');
    expect(result).toBe(true);
    expect(mgr.getSession('sess-1')?.state).toBe('terminated');
  });

  it('returns false for unknown session', () => {
    const mgr = createSessionManager(makeDeps());
    expect(mgr.terminate('unknown', 'logout')).toBe(false);
  });

  it('returns false for already terminated session', () => {
    const mgr = createSessionManager(makeDeps());
    mgr.create(makeParams());
    mgr.terminate('sess-1', 'first');
    expect(mgr.terminate('sess-1', 'second')).toBe(false);
  });
});

describe('SessionManager — queries', () => {
  it('gets session by id', () => {
    const mgr = createSessionManager(makeDeps());
    mgr.create(makeParams());
    const session = mgr.getSession('sess-1');
    expect(session?.sessionId).toBe('sess-1');
  });

  it('gets session by connection id', () => {
    const mgr = createSessionManager(makeDeps());
    mgr.create(makeParams());
    const session = mgr.getByConnection('conn-1');
    expect(session?.sessionId).toBe('sess-1');
  });

  it('returns undefined for unknown connection', () => {
    const mgr = createSessionManager(makeDeps());
    expect(mgr.getByConnection('unknown')).toBeUndefined();
  });

  it('gets sessions by dynasty', () => {
    const mgr = createSessionManager(makeDeps());
    mgr.create(makeParams({ sessionId: 's-1', connectionId: 'c-1', dynastyId: 'dyn-a' }));
    mgr.create(makeParams({ sessionId: 's-2', connectionId: 'c-2', dynastyId: 'dyn-a' }));
    mgr.create(makeParams({ sessionId: 's-3', connectionId: 'c-3', dynastyId: 'dyn-b' }));

    const results = mgr.getByDynasty('dyn-a');
    expect(results).toHaveLength(2);
  });

  it('lists active sessions only', () => {
    const mgr = createSessionManager(makeDeps());
    mgr.create(makeParams({ sessionId: 's-1', connectionId: 'c-1' }));
    mgr.create(makeParams({ sessionId: 's-2', connectionId: 'c-2' }));
    mgr.terminate('s-2', 'logout');

    const active = mgr.listActive();
    expect(active).toHaveLength(1);
    expect(active[0]?.sessionId).toBe('s-1');
  });
});

describe('SessionManager — expiration and idle', () => {
  it('marks session expired after max duration', () => {
    let time = 0;
    const mgr = createSessionManager({
      clock: {
        nowMicroseconds: () => {
          time += 1_000_000;
          return time;
        },
      },
      config: { maxSessionDurationUs: 10_000_000 },
    });
    mgr.create(makeParams());

    time += 20_000_000;
    const session = mgr.getSession('sess-1');
    expect(session?.state).toBe('expired');
  });

  it('marks session idle after no heartbeat', () => {
    let time = 0;
    const mgr = createSessionManager({
      clock: {
        nowMicroseconds: () => {
          time += 1_000_000;
          return time;
        },
      },
      config: { idleThresholdUs: 5_000_000 },
    });
    mgr.create(makeParams());

    time += 10_000_000;
    const session = mgr.getSession('sess-1');
    expect(session?.state).toBe('idle');
  });
});

describe('SessionManager — sweep', () => {
  it('removes terminal sessions', () => {
    const mgr = createSessionManager(makeDeps());
    mgr.create(makeParams({ sessionId: 's-1', connectionId: 'c-1' }));
    mgr.create(makeParams({ sessionId: 's-2', connectionId: 'c-2' }));
    mgr.terminate('s-1', 'logout');

    const removed = mgr.sweep();
    expect(removed).toBe(1);
    expect(mgr.getSession('s-1')).toBeUndefined();
    expect(mgr.getSession('s-2')).toBeDefined();
  });
});

describe('SessionManager — stats', () => {
  it('counts sessions by state', () => {
    const mgr = createSessionManager(makeDeps());
    mgr.create(makeParams({ sessionId: 's-1', connectionId: 'c-1' }));
    mgr.create(makeParams({ sessionId: 's-2', connectionId: 'c-2' }));
    mgr.terminate('s-2', 'logout');

    const stats = mgr.getStats();
    expect(stats.totalSessions).toBe(2);
    expect(stats.activeSessions).toBe(1);
    expect(stats.terminatedSessions).toBe(1);
  });

  it('tracks total heartbeats', () => {
    const mgr = createSessionManager(makeDeps());
    mgr.create(makeParams());
    mgr.heartbeat('sess-1');
    mgr.heartbeat('sess-1');
    mgr.heartbeat('sess-1');

    const stats = mgr.getStats();
    expect(stats.totalHeartbeats).toBe(3);
  });
});

describe('SessionManager — default config export', () => {
  it('exports default session config', () => {
    expect(DEFAULT_SESSION_CONFIG.idleThresholdUs).toBe(60_000_000);
    expect(DEFAULT_SESSION_CONFIG.maxSessionDurationUs).toBe(14_400_000_000);
  });
});
