import { describe, it, expect, vi } from 'vitest';
import {
  createSpectatorCameraSystem,
  DEFAULT_CAMERA_CONFIG,
  type SpectatorCameraDeps,
  type SpectatorCameraConfig,
  type CameraTarget,
} from '../spectator-camera.js';

// ── Test doubles ─────────────────────────────────────────────────────

function makeDeps(): SpectatorCameraDeps {
  let counter = 0;
  return {
    clock: { nowMs: vi.fn(() => 1_000) },
    id: { next: vi.fn(() => `sid-${String(++counter)}`) },
    log: { info: vi.fn(), warn: vi.fn() },
  };
}

function makeCfg(overrides?: Partial<SpectatorCameraConfig>): SpectatorCameraConfig {
  return { ...DEFAULT_CAMERA_CONFIG, ...overrides };
}

function makeTarget(overrides?: Partial<CameraTarget>): CameraTarget {
  return {
    targetId: 'tgt-1',
    entityId: 'entity-42',
    worldId: 'world-1',
    actionScore: 100,
    ...overrides,
  };
}

// ── join ─────────────────────────────────────────────────────────────

describe('join', () => {
  it('creates a session with defaults', () => {
    const sys = createSpectatorCameraSystem(makeDeps());
    const result = sys.join({ spectatorId: 'player-1', matchId: 'match-1' });
    expect(typeof result).toBe('object');
    if (typeof result === 'string') throw new Error('expected session');
    expect(result.spectatorId).toBe('player-1');
    expect(result.matchId).toBe('match-1');
    expect(result.mode).toBe('auto');
    expect(result.delayMs).toBe(DEFAULT_CAMERA_CONFIG.defaultDelayMs);
    expect(result.status).toBe('active');
  });

  it('respects custom mode and delay', () => {
    const sys = createSpectatorCameraSystem(makeDeps());
    const result = sys.join({ spectatorId: 'p2', matchId: 'm1', mode: 'broadcast', delayMs: 5_000 });
    if (typeof result === 'string') throw new Error('expected session');
    expect(result.mode).toBe('broadcast');
    expect(result.delayMs).toBe(5_000);
  });

  it('returns already-in-session when same spectator rejoins', () => {
    const sys = createSpectatorCameraSystem(makeDeps());
    sys.join({ spectatorId: 'p1', matchId: 'm1' });
    const result = sys.join({ spectatorId: 'p1', matchId: 'm1' });
    expect(result).toBe('already-in-session');
  });

  it('returns slot-limit-reached when cap exceeded', () => {
    const sys = createSpectatorCameraSystem(makeDeps(), makeCfg({ maxSlotsPerMatch: 2 }));
    sys.join({ spectatorId: 'p1', matchId: 'm1' });
    sys.join({ spectatorId: 'p2', matchId: 'm1' });
    const result = sys.join({ spectatorId: 'p3', matchId: 'm1' });
    expect(result).toBe('slot-limit-reached');
  });

  it('allows same spectator in different matches', () => {
    const sys = createSpectatorCameraSystem(makeDeps());
    sys.join({ spectatorId: 'p1', matchId: 'm1' });
    const result = sys.join({ spectatorId: 'p1', matchId: 'm2' });
    expect(typeof result).toBe('object');
  });
});

// ── leave ─────────────────────────────────────────────────────────────

describe('leave', () => {
  it('marks session as ended', () => {
    const sys = createSpectatorCameraSystem(makeDeps());
    const joined = sys.join({ spectatorId: 'p1', matchId: 'm1' });
    if (typeof joined === 'string') throw new Error();
    const ok = sys.leave(joined.sessionId);
    expect(ok).toBe(true);
    expect(sys.getSession(joined.sessionId)?.status).toBe('ended');
  });

  it('returns false for unknown sessionId', () => {
    const sys = createSpectatorCameraSystem(makeDeps());
    expect(sys.leave('no-such-id')).toBe(false);
  });
});

// ── setMode ───────────────────────────────────────────────────────────

describe('setMode', () => {
  it('updates mode on active session', () => {
    const sys = createSpectatorCameraSystem(makeDeps());
    const joined = sys.join({ spectatorId: 'p1', matchId: 'm1' });
    if (typeof joined === 'string') throw new Error();
    const updated = sys.setMode(joined.sessionId, 'follow');
    if (typeof updated === 'string') throw new Error();
    expect(updated.mode).toBe('follow');
  });

  it('returns session-not-found for missing session', () => {
    const sys = createSpectatorCameraSystem(makeDeps());
    expect(sys.setMode('ghost', 'pip')).toBe('session-not-found');
  });
});

// ── setTarget / setPip ────────────────────────────────────────────────

describe('setTarget', () => {
  it('assigns a target to the session', () => {
    const sys = createSpectatorCameraSystem(makeDeps());
    const joined = sys.join({ spectatorId: 'p1', matchId: 'm1' });
    if (typeof joined === 'string') throw new Error();
    const t = makeTarget();
    const updated = sys.setTarget({ sessionId: joined.sessionId, target: t });
    if (typeof updated === 'string') throw new Error();
    expect(updated.target?.targetId).toBe('tgt-1');
  });
});

describe('setPip', () => {
  it('sets secondary pip target id', () => {
    const sys = createSpectatorCameraSystem(makeDeps());
    const joined = sys.join({ spectatorId: 'p1', matchId: 'm1' });
    if (typeof joined === 'string') throw new Error();
    const updated = sys.setPip({ sessionId: joined.sessionId, secondaryTargetId: 'tgt-pip' });
    if (typeof updated === 'string') throw new Error();
    expect(updated.pipSecondaryTargetId).toBe('tgt-pip');
  });

  it('clears pip when secondaryTargetId is undefined', () => {
    const sys = createSpectatorCameraSystem(makeDeps());
    const joined = sys.join({ spectatorId: 'p1', matchId: 'm1' });
    if (typeof joined === 'string') throw new Error();
    sys.setPip({ sessionId: joined.sessionId, secondaryTargetId: 'pip-a' });
    const cleared = sys.setPip({ sessionId: joined.sessionId, secondaryTargetId: undefined });
    if (typeof cleared === 'string') throw new Error();
    expect(cleared.pipSecondaryTargetId).toBeUndefined();
  });
});

// ── auto-camera ───────────────────────────────────────────────────────

describe('auto-camera', () => {
  it('resolveAutoTarget returns the highest-scoring target', () => {
    const sys = createSpectatorCameraSystem(makeDeps(), makeCfg({ autoSelectTopN: 1 }));
    const joined = sys.join({ spectatorId: 'p1', matchId: 'm1' });
    if (typeof joined === 'string') throw new Error();
    sys.updateAutoTargets('m1', [
      makeTarget({ targetId: 'low', actionScore: 10 }),
      makeTarget({ targetId: 'high', actionScore: 999 }),
    ]);
    const resolved = sys.resolveAutoTarget(joined.sessionId);
    expect(resolved?.targetId).toBe('high');
  });

  it('returns undefined when no targets registered', () => {
    const sys = createSpectatorCameraSystem(makeDeps());
    const joined = sys.join({ spectatorId: 'p1', matchId: 'm1' });
    if (typeof joined === 'string') throw new Error();
    expect(sys.resolveAutoTarget(joined.sessionId)).toBeUndefined();
  });

  it('returns undefined for unknown sessionId', () => {
    const sys = createSpectatorCameraSystem(makeDeps());
    expect(sys.resolveAutoTarget('ghost')).toBeUndefined();
  });
});

// ── getMatchState ─────────────────────────────────────────────────────

describe('getMatchState', () => {
  it('returns only active sessions for the match', () => {
    const sys = createSpectatorCameraSystem(makeDeps());
    const s1 = sys.join({ spectatorId: 'p1', matchId: 'm1' });
    const s2 = sys.join({ spectatorId: 'p2', matchId: 'm1' });
    if (typeof s1 === 'string' || typeof s2 === 'string') throw new Error();
    sys.leave(s1.sessionId);
    const state = sys.getMatchState('m1');
    expect(state?.spectatorCount).toBe(1);
    expect(state?.sessions.at(0)?.spectatorId).toBe('p2');
  });

  it('includes autoTargets', () => {
    const sys = createSpectatorCameraSystem(makeDeps());
    sys.join({ spectatorId: 'p1', matchId: 'm1' });
    sys.updateAutoTargets('m1', [makeTarget()]);
    expect(sys.getMatchState('m1')?.autoTargets.length).toBe(1);
  });

  it('returns an empty state for unknown match', () => {
    const sys = createSpectatorCameraSystem(makeDeps());
    expect(sys.getMatchState('ghost')).toEqual({
      matchId: 'ghost',
      sessions: [],
      autoTargets: [],
      spectatorCount: 0,
    });
  });
});

// ── getStats ──────────────────────────────────────────────────────────

describe('getStats', () => {
  it('tracks totalSessions and activeSessions separately', () => {
    const sys = createSpectatorCameraSystem(makeDeps());
    const s1 = sys.join({ spectatorId: 'p1', matchId: 'm1' });
    const s2 = sys.join({ spectatorId: 'p2', matchId: 'm1' });
    if (typeof s1 === 'string' || typeof s2 === 'string') throw new Error();
    sys.leave(s1.sessionId);
    const stats = sys.getStats();
    expect(stats.totalSessions).toBe(2);
    expect(stats.activeSessions).toBe(1);
  });

  it('computes avgDelayMs from active sessions', () => {
    const sys = createSpectatorCameraSystem(makeDeps());
    sys.join({ spectatorId: 'p1', matchId: 'm1', delayMs: 10_000 });
    sys.join({ spectatorId: 'p2', matchId: 'm1', delayMs: 20_000 });
    expect(sys.getStats().avgDelayMs).toBe(15_000);
  });

  it('reports 0 avgDelayMs when no active sessions', () => {
    const sys = createSpectatorCameraSystem(makeDeps());
    expect(sys.getStats().avgDelayMs).toBe(0);
  });
});

// ── DEFAULT_CAMERA_CONFIG ─────────────────────────────────────────────

describe('DEFAULT_CAMERA_CONFIG', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(DEFAULT_CAMERA_CONFIG)).toBe(true);
  });

  it('has a 30-second default delay', () => {
    expect(DEFAULT_CAMERA_CONFIG.defaultDelayMs).toBe(30_000);
  });
});
