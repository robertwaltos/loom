import { describe, it, expect, vi } from 'vitest';
import {
  createPerfOptimizationEngine,
  QUALITY_TIERS,
} from '../perf-optimization.js';
import type { PerfOptimizationDeps } from '../perf-optimization.js';

let idSeq = 0;

function makeDeps(): PerfOptimizationDeps {
  idSeq = 0;
  return {
    clock: { now: () => 1_000_000n },
    ids: { next: () => `id-${String(++idSeq)}` },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    events: { emit: vi.fn() },
    store: {
      saveBenchmark: vi.fn().mockResolvedValue(undefined),
      getBenchmark: vi.fn().mockResolvedValue(undefined),
      saveDeviceProfile: vi.fn().mockResolvedValue(undefined),
      getDeviceProfile: vi.fn().mockResolvedValue(undefined),
      saveMemorySnapshot: vi.fn().mockResolvedValue(undefined),
      getMemorySnapshots: vi.fn().mockResolvedValue([]),
    },
  };
}

// ── getQualityPreset ────────────────────────────────────────────────

describe('getQualityPreset — framerate targets', () => {
  it('low = 30 fps', () => {
    expect(createPerfOptimizationEngine(makeDeps()).getQualityPreset('low').framerateTarget).toBe(30);
  });

  it('medium and high = 60 fps', () => {
    const engine = createPerfOptimizationEngine(makeDeps());
    expect(engine.getQualityPreset('medium').framerateTarget).toBe(60);
    expect(engine.getQualityPreset('high').framerateTarget).toBe(60);
  });

  it('ultra = 120 fps', () => {
    expect(createPerfOptimizationEngine(makeDeps()).getQualityPreset('ultra').framerateTarget).toBe(120);
  });
});

describe('getQualityPreset — memory budgets', () => {
  it('returns 2048 / 4096 / 8192 / 16384 MB per tier', () => {
    const engine = createPerfOptimizationEngine(makeDeps());
    expect(engine.getQualityPreset('low').memoryBudgetMb).toBe(2048);
    expect(engine.getQualityPreset('medium').memoryBudgetMb).toBe(4096);
    expect(engine.getQualityPreset('high').memoryBudgetMb).toBe(8192);
    expect(engine.getQualityPreset('ultra').memoryBudgetMb).toBe(16384);
  });

  it('ultra has zero lod bias', () => {
    expect(createPerfOptimizationEngine(makeDeps()).getQualityPreset('ultra').lodBias).toBe(0);
  });

  it('tier field matches request', () => {
    const engine = createPerfOptimizationEngine(makeDeps());
    for (const tier of QUALITY_TIERS) {
      expect(engine.getQualityPreset(tier).tier).toBe(tier);
    }
  });
});

// ── evaluateNetworkQuality ──────────────────────────────────────────

describe('evaluateNetworkQuality', () => {
  it('returns excellent for low latency/jitter/loss', () => {
    const engine = createPerfOptimizationEngine(makeDeps());
    expect(engine.evaluateNetworkQuality(20, 0.005, 3)).toBe('excellent');
  });

  it('returns good for medium conditions', () => {
    const engine = createPerfOptimizationEngine(makeDeps());
    expect(engine.evaluateNetworkQuality(50, 0.02, 10)).toBe('good');
  });

  it('returns fair for moderate latency with low loss', () => {
    const engine = createPerfOptimizationEngine(makeDeps());
    expect(engine.evaluateNetworkQuality(120, 0.04, 20)).toBe('fair');
  });

  it('returns poor for high latency', () => {
    const engine = createPerfOptimizationEngine(makeDeps());
    expect(engine.evaluateNetworkQuality(300, 0.1, 80)).toBe('poor');
  });
});

// ── computeAdaptiveTickRate ─────────────────────────────────────────

describe('computeAdaptiveTickRate', () => {
  it('returns max tick rate (30 Hz) for excellent conditions', () => {
    const engine = createPerfOptimizationEngine(makeDeps());
    const result = engine.computeAdaptiveTickRate(20, 3, 0.005, 10_000);
    expect(result.currentHz).toBe(30);
    expect(result.quality).toBe('excellent');
  });

  it('caps at 15 Hz when bandwidth is under 256 Kbps', () => {
    const engine = createPerfOptimizationEngine(makeDeps());
    const result = engine.computeAdaptiveTickRate(20, 3, 0.005, 100);
    expect(result.currentHz).toBe(15);
  });

  it('reduces by 5 Hz on jitter above 50 ms', () => {
    const engine = createPerfOptimizationEngine(makeDeps());
    const result = engine.computeAdaptiveTickRate(20, 60, 0.005, 10_000);
    expect(result.currentHz).toBe(25); // 30 - 5
  });

  it('returns min tick rate (10 Hz) for terrible conditions', () => {
    const engine = createPerfOptimizationEngine(makeDeps());
    const result = engine.computeAdaptiveTickRate(500, 100, 0.5, 10_000);
    expect(result.currentHz).toBe(10);
    expect(result.quality).toBe('poor');
  });

  it('result always stays within min/max bounds', () => {
    const engine = createPerfOptimizationEngine(makeDeps());
    const result = engine.computeAdaptiveTickRate(500, 200, 0.5, 50);
    expect(result.currentHz).toBeGreaterThanOrEqual(result.minHz);
    expect(result.currentHz).toBeLessThanOrEqual(result.maxHz);
  });

  it('echoes min/max Hz from config', () => {
    const engine = createPerfOptimizationEngine(makeDeps());
    const result = engine.computeAdaptiveTickRate(20, 3, 0.005, 10_000);
    expect(result.minHz).toBe(10);
    expect(result.maxHz).toBe(30);
  });
});

// ── computeStreamingBudget ──────────────────────────────────────────

describe('computeStreamingBudget', () => {
  it('returns correct budgets for high tier', () => {
    const engine = createPerfOptimizationEngine(makeDeps());
    const b = engine.computeStreamingBudget('world-1', 'high', 10, 50, 3, 5);
    expect(b.memoryBudgetMb).toBe(8192);
    expect(b.textureStreamingMb).toBe(2048);
    expect(b.meshStreamingMb).toBe(1229); // Math.round(8192 * 0.15)
  });

  it('echoes cell counts and world ID', () => {
    const engine = createPerfOptimizationEngine(makeDeps());
    const b = engine.computeStreamingBudget('world-2', 'low', 5, 20, 1, 2);
    expect(b.worldId).toBe('world-2');
    expect(b.activeCellCount).toBe(5);
    expect(b.maxCellCount).toBe(20);
    expect(b.loadQueueDepth).toBe(1);
    expect(b.unloadCandidates).toBe(2);
  });
});

// ── generateLodConfig ───────────────────────────────────────────────

describe('generateLodConfig', () => {
  it('returns 5 levels (default lodLevels)', () => {
    expect(createPerfOptimizationEngine(makeDeps()).generateLodConfig('low')).toHaveLength(5);
  });

  it('level 0 has zero triangle reduction and full texture scale', () => {
    const lods = createPerfOptimizationEngine(makeDeps()).generateLodConfig('low');
    expect(lods[0]?.triangleReduction).toBe(0);
    expect(lods[0]?.textureScale).toBe(1.0);
  });

  it('higher levels have increasing triangle reduction', () => {
    const lods = createPerfOptimizationEngine(makeDeps()).generateLodConfig('high');
    for (let i = 1; i < lods.length; i++) {
      expect(lods[i]?.triangleReduction ?? 0).toBeGreaterThan(lods[i - 1]?.triangleReduction ?? -1);
    }
  });

  it('higher levels have decreasing texture scale', () => {
    const lods = createPerfOptimizationEngine(makeDeps()).generateLodConfig('ultra');
    for (let i = 1; i < lods.length; i++) {
      expect(lods[i]?.textureScale ?? 1).toBeLessThan(lods[i - 1]?.textureScale ?? 2);
    }
  });
});

// ── validateMinimumSpec ─────────────────────────────────────────────

describe('validateMinimumSpec', () => {
  it('passes for exact minimum spec device', () => {
    const result = createPerfOptimizationEngine(makeDeps()).validateMinimumSpec(4096, 4, 8192, false);
    expect(result.meetsSpec).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('fails on insufficient GPU VRAM', () => {
    const result = createPerfOptimizationEngine(makeDeps()).validateMinimumSpec(2048, 4, 8192, false);
    expect(result.meetsSpec).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
  });

  it('fails on insufficient CPU cores', () => {
    const result = createPerfOptimizationEngine(makeDeps()).validateMinimumSpec(4096, 2, 8192, false);
    expect(result.meetsSpec).toBe(false);
  });

  it('accumulates failures for multiple shortcomings', () => {
    const result = createPerfOptimizationEngine(makeDeps()).validateMinimumSpec(1024, 2, 4096, false);
    expect(result.failures.length).toBeGreaterThanOrEqual(3);
  });
});

// ── getMemoryPressure ───────────────────────────────────────────────

describe('getMemoryPressure', () => {
  it('returns normal below 85%', () => {
    expect(createPerfOptimizationEngine(makeDeps()).getMemoryPressure(800, 1000)).toBe('normal');
  });

  it('returns warning at 85%', () => {
    expect(createPerfOptimizationEngine(makeDeps()).getMemoryPressure(850, 1000)).toBe('warning');
  });

  it('returns critical at 95%', () => {
    expect(createPerfOptimizationEngine(makeDeps()).getMemoryPressure(950, 1000)).toBe('critical');
  });
});

// ── getDrawCallBudget ───────────────────────────────────────────────

describe('getDrawCallBudget', () => {
  it('returns 1500 for low', () => {
    expect(createPerfOptimizationEngine(makeDeps()).getDrawCallBudget('low')).toBe(1500);
  });

  it('returns 8000 for ultra', () => {
    expect(createPerfOptimizationEngine(makeDeps()).getDrawCallBudget('ultra')).toBe(8000);
  });

  it('budgets increase monotonically across tiers', () => {
    const engine = createPerfOptimizationEngine(makeDeps());
    const budgets = [...QUALITY_TIERS].map(t => engine.getDrawCallBudget(t));
    for (let i = 1; i < budgets.length; i++) {
      expect(budgets[i] ?? 0).toBeGreaterThan(budgets[i - 1] ?? 0);
    }
  });
});

// ── profileDevice (async) ───────────────────────────────────────────

describe('profileDevice', () => {
  it('classifies a high-end device as high-end → ultra tier', async () => {
    const deps = makeDeps();
    const profile = await createPerfOptimizationEngine(deps).profileDevice('dev-1', 'RTX4090', 24576, 16, 65536, true);
    expect(profile.capability).toBe('high-end');
    expect(profile.recommendedTier).toBe('ultra');
    expect(profile.deviceId).toBe('dev-1');
  });

  it('classifies a min-spec device correctly', async () => {
    const profile = await createPerfOptimizationEngine(makeDeps()).profileDevice('dev-2', 'GTX1060', 6144, 6, 12288, false);
    expect(profile.capability).toBe('min-spec');
    expect(profile.recommendedTier).toBe('low');
  });

  it('classifies a below-min device correctly', async () => {
    const profile = await createPerfOptimizationEngine(makeDeps()).profileDevice('dev-3', 'Intel HD', 2048, 2, 4096, false);
    expect(profile.capability).toBe('below-min');
  });

  it('classifies a recommended device correctly', async () => {
    const profile = await createPerfOptimizationEngine(makeDeps()).profileDevice('dev-4', 'RTX3070', 8192, 8, 16384, true);
    expect(profile.capability).toBe('recommended');
    expect(profile.recommendedTier).toBe('high');
  });

  it('saves the device profile to the store', async () => {
    const deps = makeDeps();
    await createPerfOptimizationEngine(deps).profileDevice('dev-5', 'GPU', 4096, 4, 8192, false);
    expect(deps.store.saveDeviceProfile).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: 'dev-5' }),
    );
  });

  it('emits a device-profiled event', async () => {
    const deps = makeDeps();
    await createPerfOptimizationEngine(deps).profileDevice('dev-6', 'GPU', 4096, 4, 8192, false);
    expect(deps.events.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'perf.device-profiled' }),
    );
  });
});

// ── recordBootTime (async) ──────────────────────────────────────────

describe('recordBootTime', () => {
  it('sums components into totalMs', async () => {
    const result = await createPerfOptimizationEngine(makeDeps()).recordBootTime('d-1', 5000, 8000, 3000, 2000);
    expect(result.totalMs).toBe(18000);
    expect(result.passed).toBe(true);
  });

  it('fails when total exceeds 30 s', async () => {
    const result = await createPerfOptimizationEngine(makeDeps()).recordBootTime('d-1', 10000, 12000, 8000, 5000);
    expect(result.passed).toBe(false);
    expect(result.totalMs).toBeGreaterThan(30_000);
  });

  it('emits boot-time-exceeded when total exceeds limit', async () => {
    const deps = makeDeps();
    await createPerfOptimizationEngine(deps).recordBootTime('d-1', 10000, 12000, 8000, 5000);
    expect(deps.events.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'perf.boot-time-exceeded' }),
    );
  });

  it('does not emit on successful boot', async () => {
    const deps = makeDeps();
    await createPerfOptimizationEngine(deps).recordBootTime('d-1', 5000, 8000, 3000, 2000);
    const emitted = (deps.events.emit as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: unknown[]) => (c[0] as { type: string }).type,
    );
    expect(emitted).not.toContain('perf.boot-time-exceeded');
  });
});

// ── takeMemorySnapshot (async) ──────────────────────────────────────

describe('takeMemorySnapshot', () => {
  it('computes budget from tier and sets pressure', async () => {
    const deps = makeDeps();
    const snap = await createPerfOptimizationEngine(deps).takeMemorySnapshot(
      'world-1', 1500, 512, 300, 100, 80, 200, 'low',
    );
    expect(snap.worldId).toBe('world-1');
    expect(snap.budgetMb).toBe(2048); // low tier
    expect(snap.pressure).toBe('normal'); // 1500/2048 ≈ 73%
  });

  it('emits memory-pressure when usage is high', async () => {
    const deps = makeDeps();
    await createPerfOptimizationEngine(deps).takeMemorySnapshot(
      'world-1', 1900, 512, 300, 100, 80, 200, 'low',
    );
    expect(deps.events.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'perf.memory-pressure' }),
    );
  });
});
