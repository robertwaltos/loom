import { describe, it, expect } from 'vitest';
import { createSessionManager } from '../session-manager.js';

function makeManager(start = 0) {
  let time = start;
  return {
    manager: createSessionManager(
      { clock: { nowMicroseconds: () => time }, config: { idleThresholdUs: 5_000_000 } },
    ),
    advance: (us: number) => { time += us; },
  };
}

describe('Session Manager Simulation', () => {
  it('creates and retrieves sessions', () => {
    const { manager } = makeManager();

    manager.create({ sessionId: 'sess-1', connectionId: 'conn-1', dynastyId: 'dynasty-A' });
    const session = manager.getSession('sess-1');

    expect(session).toBeDefined();
    expect(session!.connectionId).toBe('conn-1');
    expect(session!.dynastyId).toBe('dynasty-A');
  });

  it('updates last-seen on heartbeat', () => {
    const { manager, advance } = makeManager(0);

    manager.create({ sessionId: 'sess-2', connectionId: 'conn-2', dynastyId: 'dynasty-B' });

    advance(2_000_000);
    manager.heartbeat('sess-2');

    const session = manager.getSession('sess-2');
    expect(session!.lastHeartbeatAt).toBe(2_000_000);
  });

  it('terminates sessions on request', () => {
    const { manager } = makeManager();

    manager.create({ sessionId: 'sess-3', connectionId: 'conn-3', dynastyId: 'dynasty-C' });
    manager.terminate('sess-3', 'logout');

    const session = manager.getSession('sess-3');
    expect(session).toBeDefined();
    expect(session!.state).toBe('terminated');
  });

  it('tracks stats across session lifecycle events', () => {
    const { manager } = makeManager();

    manager.create({ sessionId: 'stat-1', connectionId: 'c1', dynastyId: 'd1' });
    manager.create({ sessionId: 'stat-2', connectionId: 'c2', dynastyId: 'd2' });
    manager.terminate('stat-1', 'evicted');

    const stats = manager.getStats();
    expect(stats.activeSessions).toBe(1);
    expect(stats.totalSessions).toBe(2);
    expect(stats.terminatedSessions).toBe(1);
  });

  it('throws on duplicate session creation', () => {
    const { manager } = makeManager();
    manager.create({ sessionId: 'dup-sess', connectionId: 'c', dynastyId: 'd' });
    expect(() => manager.create({ sessionId: 'dup-sess', connectionId: 'c2', dynastyId: 'd2' }))
      .toThrow();
  });
});
