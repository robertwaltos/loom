import { describe, it, expect } from 'vitest';
import { createSpectatorCameraSystem, DEFAULT_CAMERA_CONFIG } from '../spectator-camera.js';

let idSeq = 0;
function makeSystem() {
  idSeq = 0;
  let time = 1_000;
  return {
    system: createSpectatorCameraSystem(
      {
        clock: { nowMs: () => time },
        id: { next: () => `cam-${++idSeq}` },
        log: { info: () => {}, warn: () => {} },
      },
    ),
    advance: (ms: number) => { time += ms; },
  };
}

describe('Spectator Camera System Simulation', () => {
  it('lets a spectator join a match and view it', () => {
    const { system } = makeSystem();

    const result = system.join({ spectatorId: 'viewer-1', matchId: 'match-A', mode: 'follow' });
    expect(result).not.toBe('already-in-session');
    expect(result).not.toBe('slot-limit-reached');
    expect((result as { spectatorId: string }).spectatorId).toBe('viewer-1');

    const session = result as { sessionId: string };
    const view = system.getSession(session.sessionId);
    expect(view).toBeDefined();
  });

  it('sets the target for a spectator camera', () => {
    const { system } = makeSystem();

    const session = system.join({ spectatorId: 'viewer-2', matchId: 'match-B' }) as { sessionId: string };
    system.setTarget({ sessionId: session.sessionId, target: { targetId: 'player-42', entityId: undefined, worldId: 'match-B', actionScore: 1 } });

    const view = system.getSession(session.sessionId) as { target: { targetId: string } };
    expect(view?.target?.targetId).toBe('player-42');
  });

  it('rejects duplicate spectator sessions', () => {
    const { system } = makeSystem();

    system.join({ spectatorId: 'viewer-3', matchId: 'match-C' });
    const dup = system.join({ spectatorId: 'viewer-3', matchId: 'match-C' });
    expect(dup).toBe('already-in-session');
  });

  it('removes spectators on leave', () => {
    const { system } = makeSystem();

    const session = system.join({ spectatorId: 'viewer-4', matchId: 'match-D' }) as { sessionId: string };
    system.leave(session.sessionId);

    const view = system.getSession(session.sessionId) as { status: string } | undefined;
    expect(view?.status).toBe('ended');
  });

  it('tracks stats', () => {
    const { system } = makeSystem();
    system.join({ spectatorId: 'viewer-5', matchId: 'match-E' });
    const stats = system.getStats();
    expect(stats.totalSessions).toBeGreaterThanOrEqual(1);
  });

  it('exposes DEFAULT_CAMERA_CONFIG', () => {
    expect(DEFAULT_CAMERA_CONFIG).toBeDefined();
  });
});
