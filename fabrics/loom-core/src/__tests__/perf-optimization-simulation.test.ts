import { describe, expect, it, vi } from 'vitest';
import {
  createPerfOptimizationEngine,
  type DeviceProfile,
  type MemorySnapshot,
  type ScalabilityBenchmark,
} from '../perf-optimization.js';

function makeDeps() {
  let id = 0;
  const benches = new Map<string, ScalabilityBenchmark>();
  const profiles = new Map<string, DeviceProfile>();
  const snapshots = new Map<string, MemorySnapshot[]>();

  return {
    events: [] as Array<{ type: string; payload: unknown }>,
    logInfo: vi.fn(),
    logWarn: vi.fn(),
    deps: {
      clock: { now: vi.fn(() => 1234n) },
      ids: { next: vi.fn(() => `bench-${++id}`) },
      log: {
        info: vi.fn((msg: string, ctx?: Record<string, unknown>) => {
          void msg;
          void ctx;
        }),
        warn: vi.fn((msg: string, ctx?: Record<string, unknown>) => {
          void msg;
          void ctx;
        }),
        error: vi.fn((msg: string, ctx?: Record<string, unknown>) => {
          void msg;
          void ctx;
        }),
      },
      events: {
        emit: vi.fn((event: { type: string; payload: unknown }) => {
          void event;
        }),
      },
      store: {
        saveBenchmark: vi.fn(async (b: ScalabilityBenchmark) => {
          benches.set(b.id, b);
          benches.set(b.deviceId, b);
        }),
        getBenchmark: vi.fn(async (idOrDevice: string) => benches.get(idOrDevice)),
        saveDeviceProfile: vi.fn(async (p: DeviceProfile) => {
          profiles.set(p.deviceId, p);
        }),
        getDeviceProfile: vi.fn(async (deviceId: string) => profiles.get(deviceId)),
        saveMemorySnapshot: vi.fn(async (s: MemorySnapshot) => {
          const current = snapshots.get(s.worldId) ?? [];
          snapshots.set(s.worldId, [s, ...current]);
        }),
        getMemorySnapshots: vi.fn(async (worldId: string, limit: number) =>
          (snapshots.get(worldId) ?? []).slice(0, limit),
        ),
      },
    },
  };
}

describe('perf-optimization simulation', () => {
  it('profiles devices and maps capability to recommended tier', async () => {
    const ctx = makeDeps();
    const engine = createPerfOptimizationEngine(ctx.deps);

    const highEnd = await engine.profileDevice('dev-hi', 'GPU-X', 16384, 16, 65536, true);
    const minSpec = await engine.profileDevice('dev-min', 'GPU-M', 4096, 4, 8192, false);
    const below = await engine.profileDevice('dev-low', 'GPU-L', 2048, 2, 4096, false);

    expect(highEnd.capability).toBe('high-end');
    expect(highEnd.recommendedTier).toBe('ultra');
    expect(minSpec.capability).toBe('min-spec');
    expect(minSpec.recommendedTier).toBe('low');
    expect(below.capability).toBe('below-min');
    expect(below.recommendedTier).toBe('low');

    expect(ctx.deps.store.saveDeviceProfile).toHaveBeenCalledTimes(3);
    expect(ctx.deps.events.emit).toHaveBeenCalledTimes(3);
  });

  it('records benchmark pass/fail against tier targets', async () => {
    const ctx = makeDeps();
    const engine = createPerfOptimizationEngine(ctx.deps);

    const pass = await engine.recordBenchmark('dev-a', 'low', [33, 30, 34, 32], 5_000);
    const fail = await engine.recordBenchmark('dev-b', 'ultra', [20, 20, 20, 20], 5_000);

    expect(pass.passed).toBe(true);
    expect(pass.averageFps).toBeGreaterThanOrEqual(30);

    expect(fail.passed).toBe(false);
    expect(fail.averageFps).toBe(50);

    expect(ctx.deps.store.saveBenchmark).toHaveBeenCalledTimes(2);
  });

  it('takes memory snapshot and emits on warning/critical pressure', async () => {
    const ctx = makeDeps();
    const engine = createPerfOptimizationEngine(ctx.deps);

    const warning = await engine.takeMemorySnapshot('world-1', 3700, 500, 400, 200, 180, 300, 'medium');
    const critical = await engine.takeMemorySnapshot('world-1', 4000, 500, 400, 200, 180, 300, 'medium');

    expect(warning.pressure).toBe('warning');
    expect(critical.pressure).toBe('critical');
    expect(ctx.deps.events.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'perf.memory-pressure' }),
    );
  });

  it('adapts tick rate to network quality and constraints', () => {
    const ctx = makeDeps();
    const engine = createPerfOptimizationEngine(ctx.deps);

    const excellent = engine.computeAdaptiveTickRate(20, 2, 0.0, 10_000);
    const poor = engine.computeAdaptiveTickRate(300, 60, 0.2, 128);

    expect(excellent.quality).toBe('excellent');
    expect(excellent.currentHz).toBe(30);

    expect(poor.quality).toBe('poor');
    expect(poor.currentHz).toBe(10);
  });

  it('evaluates network quality buckets', () => {
    const engine = createPerfOptimizationEngine(makeDeps().deps);

    expect(engine.evaluateNetworkQuality(20, 0.0, 2)).toBe('excellent');
    expect(engine.evaluateNetworkQuality(60, 0.02, 10)).toBe('good');
    expect(engine.evaluateNetworkQuality(140, 0.04, 20)).toBe('fair');
    expect(engine.evaluateNetworkQuality(200, 0.1, 80)).toBe('poor');
  });

  it('computes streaming budget from tier memory presets', () => {
    const engine = createPerfOptimizationEngine(makeDeps().deps);

    const budget = engine.computeStreamingBudget('world-a', 'high', 80, 240, 12, 8);
    expect(budget.memoryBudgetMb).toBe(8192);
    expect(budget.textureStreamingMb).toBe(2048);
    expect(budget.meshStreamingMb).toBe(1229);
    expect(budget.activeCellCount).toBe(80);
  });

  it('records boot time and emits only when max boot threshold is exceeded', async () => {
    const ctx = makeDeps();
    const engine = createPerfOptimizationEngine(ctx.deps);

    const pass = await engine.recordBootTime('dev-fast', 5_000, 5_000, 5_000, 5_000);
    const fail = await engine.recordBootTime('dev-slow', 10_000, 10_000, 10_000, 10_000);

    expect(pass.passed).toBe(true);
    expect(pass.totalMs).toBe(20_000);

    expect(fail.passed).toBe(false);
    expect(fail.totalMs).toBe(40_000);
    expect(ctx.deps.events.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'perf.boot-time-exceeded' }),
    );
  });

  it('builds LOD configuration and draw-call budgets by tier', () => {
    const engine = createPerfOptimizationEngine(makeDeps().deps);

    const lod = engine.generateLodConfig('medium');
    expect(lod).toHaveLength(5);
    expect(lod[0]?.level).toBe(0);
    expect(lod[4]?.triangleReduction).toBe(0.8);
    expect(lod[4]?.textureScale).toBeCloseTo(0.2);

    expect(engine.getDrawCallBudget('low')).toBe(1500);
    expect(engine.getDrawCallBudget('ultra')).toBe(8000);
  });

  it('validates minimum spec and reports detailed failures', () => {
    const engine = createPerfOptimizationEngine(makeDeps().deps, {
      minimumSpec: {
        gpuVramMb: 4096,
        cpuCores: 4,
        ramMb: 8192,
        storageSsd: true,
      },
    });

    const fail = engine.validateMinimumSpec(2048, 2, 4096, false);
    expect(fail.meetsSpec).toBe(false);
    expect(fail.failures).toHaveLength(4);

    const pass = engine.validateMinimumSpec(8192, 8, 16384, true);
    expect(pass.meetsSpec).toBe(true);
    expect(pass.failures).toEqual([]);
  });

  it('generates recommendations from profile, benchmark, and memory pressure', async () => {
    const ctx = makeDeps();
    const engine = createPerfOptimizationEngine(ctx.deps);

    await engine.profileDevice('dev-report', 'GPU-Old', 2048, 2, 4096, false);
    await engine.recordBenchmark('dev-report', 'low', [80, 80, 80], 2_000);
    await engine.takeMemorySnapshot('dev-report', 2200, 300, 300, 100, 100, 120, 'low');

    const report = await engine.generateReport('dev-report');

    expect(report.deviceProfile.capability).toBe('below-min');
    expect(report.benchmark?.passed).toBe(false);
    expect(report.memorySnapshot?.pressure).toBe('critical');
    expect(report.recommendations).toEqual(
      expect.arrayContaining([
        'Device below minimum spec — consider cloud streaming',
        'SSD recommended for faster load times',
        'Consider lowering quality from low',
        'Reduce texture quality or view distance to lower memory usage',
      ]),
    );
  });
});
