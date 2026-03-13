import { describe, it, expect } from 'vitest';
import {
  adaptQuality,
  createPixelStreamSessionManager,
  createRenderInstancePool,
  DEFAULT_PIXEL_STREAM_CONFIG,
  type PixelStreamConfig,
  type RenderInstance,
} from '../fabrics/bridge-loom-ue5/src/pixel-streaming.js';

function makeConfig(overrides?: Partial<PixelStreamConfig>): PixelStreamConfig {
  return {
    ...DEFAULT_PIXEL_STREAM_CONFIG,
    ...overrides,
  };
}

function makeInstance(instanceId: string, currentLoad: number, maxStreams = 2): RenderInstance {
  return {
    instanceId,
    host: '127.0.0.1',
    port: 9000,
    currentLoad,
    maxStreams,
    activeStreams: 0,
    gpuUtilization: 0.5,
  };
}

describe('pixel-streaming simulation', () => {
  it('keeps top quality under healthy metrics', () => {
    const decision = adaptQuality(
      { frameDropRate: 0.01, averageLatencyMs: 40, bandwidthMbps: 50 },
      makeConfig(),
    );
    expect(decision.bitrateMbps).toBe(DEFAULT_PIXEL_STREAM_CONFIG.maxBitrateMbps);
    expect(decision.fps).toBe(DEFAULT_PIXEL_STREAM_CONFIG.targetFps);
    expect(decision.resolution).toEqual({ width: 1920, height: 1080 });
  });

  it('reduces bitrate and fps on high frame drops', () => {
    const decision = adaptQuality(
      { frameDropRate: 0.2, averageLatencyMs: 50, bandwidthMbps: 50 },
      makeConfig(),
    );
    expect(decision.bitrateMbps).toBe(14);
    expect(decision.fps).toBe(50);
  });

  it('drops to 720p under bandwidth pressure', () => {
    const decision = adaptQuality(
      { frameDropRate: 0, averageLatencyMs: 60, bandwidthMbps: 2 },
      makeConfig({ minBitrateMbps: 2 }),
    );
    expect(decision.resolution).toEqual({ width: 1280, height: 720 });
    expect(decision.bitrateMbps).toBe(10);
  });

  it('applies additional fps cut for high latency', () => {
    const decision = adaptQuality(
      { frameDropRate: 0, averageLatencyMs: 200, bandwidthMbps: 50 },
      makeConfig(),
    );
    expect(decision.fps).toBe(45);
  });

  it('forces 480p and min bitrate for extreme latency', () => {
    const decision = adaptQuality(
      { frameDropRate: 0.3, averageLatencyMs: 350, bandwidthMbps: 1 },
      makeConfig({ minBitrateMbps: 3 }),
    );
    expect(decision.resolution).toEqual({ width: 854, height: 480 });
    expect(decision.bitrateMbps).toBe(3);
  });

  it('pool allocates least-loaded instance with available capacity', () => {
    const pool = createRenderInstancePool();
    pool.addInstance(makeInstance('a', 60));
    pool.addInstance(makeInstance('b', 10));
    const chosen = pool.allocate('player-1');
    expect(chosen?.instanceId).toBe('b');
  });

  it('pool returns undefined when all instances are full', () => {
    const pool = createRenderInstancePool();
    pool.addInstance(makeInstance('only', 10, 1));
    pool.allocate('p1');
    const second = pool.allocate('p2');
    expect(second).toBeUndefined();
  });

  it('pool release frees capacity for re-allocation', () => {
    const pool = createRenderInstancePool();
    pool.addInstance(makeInstance('only', 10, 1));
    const first = pool.allocate('p1');
    expect(first?.instanceId).toBe('only');
    pool.release('only', 'p1');
    const second = pool.allocate('p2');
    expect(second?.instanceId).toBe('only');
  });

  it('pool stats aggregate instance capacity and active streams', () => {
    const pool = createRenderInstancePool();
    pool.addInstance(makeInstance('a', 20, 2));
    pool.addInstance(makeInstance('b', 40, 3));
    pool.allocate('p1');
    pool.allocate('p2');
    const stats = pool.getStats();
    expect(stats.totalInstances).toBe(2);
    expect(stats.totalCapacity).toBe(5);
    expect(stats.activeStreams).toBe(2);
    expect(stats.averageLoad).toBe(30);
  });

  it('session manager creates session with connecting state', () => {
    const pool = createRenderInstancePool();
    pool.addInstance(makeInstance('r1', 5));
    const manager = createPixelStreamSessionManager({
      pool,
      config: makeConfig(),
      idGenerator: { next: () => 'session-1' },
      clock: { nowMs: () => 1000 },
    });
    const session = manager.createSession('player-1');
    expect(session?.state).toBe('connecting');
    expect(manager.getActiveSessions().length).toBe(1);
  });

  it('session manager returns undefined when no render instance available', () => {
    const pool = createRenderInstancePool();
    const manager = createPixelStreamSessionManager({
      pool,
      config: makeConfig(),
      idGenerator: { next: () => 'session-1' },
      clock: { nowMs: () => 1000 },
    });
    expect(manager.createSession('player-1')).toBeUndefined();
  });

  it('updateMetrics applies quality decision and marks session streaming', () => {
    const pool = createRenderInstancePool();
    pool.addInstance(makeInstance('r1', 5));
    let now = 1000;
    const manager = createPixelStreamSessionManager({
      pool,
      config: makeConfig(),
      idGenerator: { next: () => 'session-1' },
      clock: { nowMs: () => now },
    });
    manager.createSession('player-1');
    now = 1300;
    const decision = manager.updateMetrics('session-1', {
      frameDropRate: 0.2,
      averageLatencyMs: 220,
      bandwidthMbps: 8,
    });
    const updated = manager.getSession('session-1');
    expect(decision).toBeDefined();
    expect(updated?.state).toBe('streaming');
    expect(updated?.lastActivityMs).toBe(1300);
  });

  it('updateMetrics is no-op for unknown session', () => {
    const manager = createPixelStreamSessionManager({
      pool: createRenderInstancePool(),
      config: makeConfig(),
      idGenerator: { next: () => 'session-1' },
      clock: { nowMs: () => 1000 },
    });
    expect(
      manager.updateMetrics('missing', {
        frameDropRate: 0,
        averageLatencyMs: 0,
        bandwidthMbps: 50,
      }),
    ).toBeUndefined();
  });

  it('sweepIdle removes sessions past timeout and releases pool capacity', () => {
    const pool = createRenderInstancePool();
    pool.addInstance(makeInstance('r1', 5, 1));
    const manager = createPixelStreamSessionManager({
      pool,
      config: makeConfig({ idleTimeoutMs: 100 }),
      idGenerator: { next: () => 'session-1' },
      clock: { nowMs: () => 1000 },
    });
    manager.createSession('player-1');
    const swept = manager.sweepIdle(1201);
    expect(swept).toEqual(['session-1']);
    expect(manager.getActiveSessions().length).toBe(0);
    expect(pool.allocate('player-2')?.instanceId).toBe('r1');
  });

  it('terminateSession removes session and ignores unknown ids', () => {
    const pool = createRenderInstancePool();
    pool.addInstance(makeInstance('r1', 5));
    const manager = createPixelStreamSessionManager({
      pool,
      config: makeConfig(),
      idGenerator: { next: () => 'session-1' },
      clock: { nowMs: () => 1000 },
    });
    manager.createSession('player-1');
    manager.terminateSession('session-1');
    manager.terminateSession('missing');
    expect(manager.getActiveSessions().length).toBe(0);
  });

  it('manager stats are delegated from underlying pool', () => {
    const pool = createRenderInstancePool();
    pool.addInstance(makeInstance('r1', 20, 2));
    pool.addInstance(makeInstance('r2', 40, 2));
    let i = 0;
    const manager = createPixelStreamSessionManager({
      pool,
      config: makeConfig(),
      idGenerator: { next: () => `s-${++i}` },
      clock: { nowMs: () => 1000 },
    });
    manager.createSession('p1');
    manager.createSession('p2');
    const stats = manager.getStats();
    expect(stats.totalInstances).toBe(2);
    expect(stats.activeStreams).toBe(2);
  });
});
