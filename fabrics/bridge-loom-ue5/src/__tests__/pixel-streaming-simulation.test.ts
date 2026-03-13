/**
 * Pixel Streaming Simulation Tests
 *
 * Covers: adaptQuality, createRenderInstancePool, createPixelStreamSessionManager
 * All deps mocked inline — no real network or UE5 bindings.
 */

import { describe, it, expect } from 'vitest';
import {
  adaptQuality,
  createRenderInstancePool,
  createPixelStreamSessionManager,
  DEFAULT_PIXEL_STREAM_CONFIG,
} from '../pixel-streaming.js';
import type {
  PixelStreamConfig,
  QualityMetrics,
  RenderInstance,
  PixelStreamDeps,
} from '../pixel-streaming.js';

// ─── Factory Helpers ─────────────────────────────────────────────────────────

function makeConfig(overrides?: Partial<PixelStreamConfig>): PixelStreamConfig {
  return { ...DEFAULT_PIXEL_STREAM_CONFIG, ...overrides };
}

function makeGoodMetrics(overrides?: Partial<QualityMetrics>): QualityMetrics {
  return {
    frameDropRate: 0.0,
    averageLatencyMs: 30,
    bandwidthMbps: 25,
    ...overrides,
  };
}

function makeInstance(
  id: string,
  overrides?: Partial<RenderInstance>,
): RenderInstance {
  return {
    instanceId: id,
    host: '10.0.0.1',
    port: 9000,
    currentLoad: 10,
    maxStreams: 4,
    activeStreams: 0,
    gpuUtilization: 0.1,
    ...overrides,
  };
}

let _idCounter = 0;

function makeSessionDeps(config?: Partial<PixelStreamConfig>): PixelStreamDeps {
  const pool = createRenderInstancePool();
  pool.addInstance(makeInstance('render-1', { maxStreams: 4, currentLoad: 20 }));
  return {
    pool,
    config: makeConfig(config),
    idGenerator: { next: () => `sess-${++_idCounter}` },
    clock: { nowMs: () => 1_000 },
  };
}

// ─── adaptQuality ────────────────────────────────────────────────────────────

describe('adaptQuality', () => {
  describe('ideal conditions', () => {
    it('returns full quality when all metrics are favourable', () => {
      const decision = adaptQuality(makeGoodMetrics(), makeConfig());

      expect(decision.bitrateMbps).toBe(20);
      expect(decision.fps).toBe(60);
      expect(decision.resolution).toEqual({ width: 1920, height: 1080 });
    });

    it('uses custom config maxBitrateMbps and targetFps', () => {
      const cfg = makeConfig({ maxBitrateMbps: 15, targetFps: 30 });
      const decision = adaptQuality(makeGoodMetrics(), cfg);

      expect(decision.bitrateMbps).toBe(15);
      expect(decision.fps).toBe(30);
    });
  });

  describe('frame-drop degradation', () => {
    it('reduces bitrate to 70% and fps by 10 when frameDropRate > 0.10', () => {
      const metrics = makeGoodMetrics({ frameDropRate: 0.15 });
      const decision = adaptQuality(metrics, makeConfig());

      expect(decision.bitrateMbps).toBeCloseTo(14); // 20 * 0.7
      expect(decision.fps).toBe(50); // 60 - 10
    });

    it('does NOT reduce quality when frameDropRate is exactly 0.10', () => {
      const metrics = makeGoodMetrics({ frameDropRate: 0.1 });
      const decision = adaptQuality(metrics, makeConfig());

      // 0.1 is not > 0.1, so no degradation
      expect(decision.bitrateMbps).toBe(20);
      expect(decision.fps).toBe(60);
    });

    it('clamps fps to minimum 30 when targetFps is already 35', () => {
      const cfg = makeConfig({ targetFps: 35 });
      const metrics = makeGoodMetrics({ frameDropRate: 0.5 });
      const decision = adaptQuality(metrics, cfg);

      expect(decision.fps).toBe(30); // 35 - 10 = 25, but min is 30
    });

    it('clamps bitrate to minBitrateMbps when calculated bitrate falls below', () => {
      const cfg = makeConfig({ maxBitrateMbps: 2, minBitrateMbps: 2 });
      const metrics = makeGoodMetrics({ frameDropRate: 0.9 });
      const decision = adaptQuality(metrics, cfg);

      expect(decision.bitrateMbps).toBe(2); // 2 * 0.7 = 1.4, clamped to min 2
    });
  });

  describe('bandwidth degradation', () => {
    it('downgrades to 1280×720 when bandwidth < minBitrateMbps * 2', () => {
      const cfg = makeConfig({ minBitrateMbps: 2 });
      // bandwidth 3 < 4 (2 * 2)
      const metrics = makeGoodMetrics({ bandwidthMbps: 3 });
      const decision = adaptQuality(metrics, cfg);

      expect(decision.resolution).toEqual({ width: 1280, height: 720 });
    });

    it('also halves bitrate when bandwidth is constrained', () => {
      const cfg = makeConfig({ maxBitrateMbps: 10, minBitrateMbps: 2 });
      const metrics = makeGoodMetrics({ bandwidthMbps: 3 });
      const decision = adaptQuality(metrics, cfg);

      expect(decision.bitrateMbps).toBe(5); // 10 * 0.5 = 5
    });

    it('keeps full resolution when bandwidth exactly meets 2× minimum', () => {
      const cfg = makeConfig({ minBitrateMbps: 2 });
      // bandwidth 4 is NOT < 4
      const metrics = makeGoodMetrics({ bandwidthMbps: 4 });
      const decision = adaptQuality(metrics, cfg);

      expect(decision.resolution).toEqual({ width: 1920, height: 1080 });
    });
  });

  describe('latency degradation', () => {
    it('reduces fps by 15 when latency > 150 ms', () => {
      const metrics = makeGoodMetrics({ averageLatencyMs: 200 });
      const decision = adaptQuality(metrics, makeConfig());

      expect(decision.fps).toBe(45); // 60 - 15
    });

    it('downgrades to 854×480 and minBitrate when latency > 300 ms', () => {
      const cfg = makeConfig({ minBitrateMbps: 2 });
      const metrics = makeGoodMetrics({ averageLatencyMs: 350 });
      const decision = adaptQuality(metrics, cfg);

      expect(decision.resolution).toEqual({ width: 854, height: 480 });
      expect(decision.bitrateMbps).toBe(2);
    });

    it('does NOT reduce fps at latency exactly 150 ms', () => {
      const metrics = makeGoodMetrics({ averageLatencyMs: 150 });
      const decision = adaptQuality(metrics, makeConfig());

      expect(decision.fps).toBe(60); // 150 is not > 150
    });
  });

  describe('combined degradation', () => {
    it('applies both frame-drop fps reduction and latency fps reduction', () => {
      // Both > 0.1 drop rate AND > 150 ms latency
      const metrics: QualityMetrics = {
        frameDropRate: 0.2,
        averageLatencyMs: 200,
        bandwidthMbps: 25,
      };
      const decision = adaptQuality(metrics, makeConfig());

      // 60 - 10 (frame drop) - 15 (latency) = 35, but min 30
      expect(decision.fps).toBe(35);
    });

    it('stacks frame-drop bitrate and bandwidth-constraint bitrate reductions', () => {
      const cfg = makeConfig({ maxBitrateMbps: 10, minBitrateMbps: 2 });
      // Frame drops AND low bandwidth
      const metrics: QualityMetrics = {
        frameDropRate: 0.5,
        averageLatencyMs: 30,
        bandwidthMbps: 3, // < 4 (2 * 2)
      };
      const decision = adaptQuality(metrics, cfg);

      // First: 10 * 0.7 = 7 (frame drop), then 7 * 0.5 = 3.5 (bandwidth)
      expect(decision.bitrateMbps).toBeCloseTo(3.5);
      expect(decision.resolution).toEqual({ width: 1280, height: 720 });
    });
  });
});

// ─── RenderInstancePool ──────────────────────────────────────────────────────

describe('createRenderInstancePool', () => {
  it('returns undefined when pool is empty', () => {
    const pool = createRenderInstancePool();
    expect(pool.allocate('player-1')).toBeUndefined();
  });

  it('allocates the only available instance', () => {
    const pool = createRenderInstancePool();
    pool.addInstance(makeInstance('r-1'));

    const result = pool.allocate('player-1');
    expect(result?.instanceId).toBe('r-1');
  });

  it('picks instance with lowest current load', () => {
    const pool = createRenderInstancePool();
    pool.addInstance(makeInstance('heavy', { currentLoad: 80 }));
    pool.addInstance(makeInstance('light', { currentLoad: 10 }));

    const result = pool.allocate('player-1');
    expect(result?.instanceId).toBe('light');
  });

  it('skips instances at full capacity', () => {
    const pool = createRenderInstancePool();
    pool.addInstance(makeInstance('full', { maxStreams: 1 }));
    const instance = pool.allocate('p1');
    // first allocation succeeds
    expect(instance?.instanceId).toBe('full');
    // second allocation fails — instance is now full
    const second = pool.allocate('p2');
    expect(second).toBeUndefined();
  });

  it('release frees capacity so another player can be allocated', () => {
    const pool = createRenderInstancePool();
    pool.addInstance(makeInstance('r-1', { maxStreams: 1 }));

    pool.allocate('player-a');
    // At capacity; next allocation returns undefined
    expect(pool.allocate('player-b')).toBeUndefined();

    pool.release('r-1', 'player-a');
    expect(pool.allocate('player-b')?.instanceId).toBe('r-1');
  });

  it('removeInstance makes it unavailable for future allocations', () => {
    const pool = createRenderInstancePool();
    pool.addInstance(makeInstance('gone'));
    pool.removeInstance('gone');

    expect(pool.allocate('player-1')).toBeUndefined();
  });

  it('getStats returns zeros for empty pool', () => {
    const pool = createRenderInstancePool();
    expect(pool.getStats()).toEqual({
      totalInstances: 0,
      totalCapacity: 0,
      activeStreams: 0,
      averageLoad: 0,
    });
  });

  it('getStats sums capacity and load across instances', () => {
    const pool = createRenderInstancePool();
    pool.addInstance(makeInstance('a', { maxStreams: 4, currentLoad: 20 }));
    pool.addInstance(makeInstance('b', { maxStreams: 6, currentLoad: 60 }));

    pool.allocate('p1');
    pool.allocate('p2');

    const stats = pool.getStats();
    expect(stats.totalInstances).toBe(2);
    expect(stats.totalCapacity).toBe(10); // 4 + 6
    expect(stats.activeStreams).toBe(2); // p1 on 'a', p2 on 'a' (lower load)
    expect(stats.averageLoad).toBe(40); // (20 + 60) / 2
  });
});

// ─── PixelStreamSessionManager ───────────────────────────────────────────────

describe('createPixelStreamSessionManager', () => {
  beforeEach(() => { _idCounter = 0; });

  it('createSession returns a session when pool has capacity', () => {
    const deps = makeSessionDeps();
    const manager = createPixelStreamSessionManager(deps);

    const session = manager.createSession('player-1');
    expect(session).not.toBeUndefined();
    expect(session?.playerId).toBe('player-1');
    expect(session?.renderInstanceId).toBe('render-1');
  });

  it('createSession returns undefined when pool is full', () => {
    const deps = makeSessionDeps();
    const manager = createPixelStreamSessionManager(deps);

    // Fill all 4 slots
    manager.createSession('p1');
    manager.createSession('p2');
    manager.createSession('p3');
    manager.createSession('p4');

    expect(manager.createSession('p5')).toBeUndefined();
  });

  it('createSession sets initial state to connecting', () => {
    const deps = makeSessionDeps();
    const manager = createPixelStreamSessionManager(deps);

    const session = manager.createSession('player-1');
    expect(session?.state).toBe('connecting');
  });

  it('createSession sets initial bitrate and fps from config', () => {
    const deps = makeSessionDeps({ maxBitrateMbps: 15, targetFps: 30 });
    const manager = createPixelStreamSessionManager(deps);

    const session = manager.createSession('player-1');
    expect(session?.currentBitrateMbps).toBe(15);
    expect(session?.currentFps).toBe(30);
  });

  it('terminateSession removes session from active list', () => {
    const deps = makeSessionDeps();
    const manager = createPixelStreamSessionManager(deps);

    const session = manager.createSession('player-1');
    expect(session).not.toBeUndefined();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    manager.terminateSession(session!.sessionId);
    expect(manager.getActiveSessions()).toHaveLength(0);
  });

  it('terminateSession releases pool capacity', () => {
    const deps = makeSessionDeps();
    // Max 4 slots on instance
    const manager = createPixelStreamSessionManager(deps);

    const sessions = ['p1', 'p2', 'p3', 'p4'].map((p) =>
      manager.createSession(p),
    );
    expect(manager.createSession('p5')).toBeUndefined();

    // Release one
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    manager.terminateSession(sessions[0]!.sessionId);
    expect(manager.createSession('p5')).not.toBeUndefined();
  });

  it('terminateSession on unknown id is a no-op', () => {
    const deps = makeSessionDeps();
    const manager = createPixelStreamSessionManager(deps);

    expect(() => manager.terminateSession('unknown-id')).not.toThrow();
  });

  it('updateMetrics returns a quality decision', () => {
    const deps = makeSessionDeps();
    const manager = createPixelStreamSessionManager(deps);

    const session = manager.createSession('player-1');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const decision = manager.updateMetrics(session!.sessionId, makeGoodMetrics());

    expect(decision).not.toBeUndefined();
    expect(decision?.bitrateMbps).toBe(20);
    expect(decision?.fps).toBe(60);
  });

  it('updateMetrics transitions session state to streaming', () => {
    const deps = makeSessionDeps();
    const manager = createPixelStreamSessionManager(deps);

    const session = manager.createSession('player-1');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    manager.updateMetrics(session!.sessionId, makeGoodMetrics());

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const updated = manager.getSession(session!.sessionId);
    expect(updated?.state).toBe('streaming');
  });

  it('updateMetrics returns undefined for unknown session', () => {
    const deps = makeSessionDeps();
    const manager = createPixelStreamSessionManager(deps);

    expect(manager.updateMetrics('ghost-id', makeGoodMetrics())).toBeUndefined();
  });

  it('updateMetrics applies degraded quality for poor metrics', () => {
    const deps = makeSessionDeps({ maxBitrateMbps: 20, minBitrateMbps: 2 });
    const manager = createPixelStreamSessionManager(deps);

    const session = manager.createSession('player-1');
    const decision = manager.updateMetrics(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      session!.sessionId,
      { frameDropRate: 0.5, averageLatencyMs: 400, bandwidthMbps: 1 },
    );

    expect(decision?.resolution).toEqual({ width: 854, height: 480 });
    expect(decision?.bitrateMbps).toBe(2);
  });

  it('sweepIdle removes sessions idle beyond idleTimeoutMs', () => {
    let now = 0;
    const deps: PixelStreamDeps = {
      pool: (() => {
        const p = createRenderInstancePool();
        p.addInstance(makeInstance('r-sweep', { maxStreams: 4 }));
        return p;
      })(),
      config: makeConfig({ idleTimeoutMs: 1_000 }),
      idGenerator: { next: () => `sweep-sess-${++_idCounter}` },
      clock: { nowMs: () => now },
    };

    const manager = createPixelStreamSessionManager(deps);

    now = 0;
    const s1 = manager.createSession('player-a');
    now = 500;
    const s2 = manager.createSession('player-b');

    // Advance clock past idleTimeoutMs for s1 but not s2
    now = 1_100;
    const swept = manager.sweepIdle(now);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(swept).toContain(s1!.sessionId);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(swept).not.toContain(s2!.sessionId);
  });

  it('sweepIdle returns empty array when no sessions are stale', () => {
    const deps = makeSessionDeps({ idleTimeoutMs: 60_000 });
    const manager = createPixelStreamSessionManager(deps);

    manager.createSession('player-1');
    const swept = manager.sweepIdle(1_000);

    expect(swept).toHaveLength(0);
  });

  it('getActiveSessions returns all live sessions', () => {
    const deps = makeSessionDeps();
    const manager = createPixelStreamSessionManager(deps);

    manager.createSession('p1');
    manager.createSession('p2');
    manager.createSession('p3');

    expect(manager.getActiveSessions()).toHaveLength(3);
  });

  it('getSession retrieves a session by id', () => {
    const deps = makeSessionDeps();
    const manager = createPixelStreamSessionManager(deps);

    const session = manager.createSession('player-x');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const fetched = manager.getSession(session!.sessionId);

    expect(fetched?.playerId).toBe('player-x');
  });

  it('getSession returns undefined for unknown id', () => {
    const deps = makeSessionDeps();
    const manager = createPixelStreamSessionManager(deps);

    expect(manager.getSession('no-such-session')).toBeUndefined();
  });

  it('getStats reflects pool capacity', () => {
    const deps = makeSessionDeps();
    const manager = createPixelStreamSessionManager(deps);

    manager.createSession('p1');
    manager.createSession('p2');

    const stats = manager.getStats();
    expect(stats.totalInstances).toBe(1);
    expect(stats.totalCapacity).toBe(4);
    expect(stats.activeStreams).toBe(2);
  });
});
