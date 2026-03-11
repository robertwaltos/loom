/**
 * Performance Optimization Engine — Scalability, budgets, network tuning.
 *
 *   - Scalability benchmarking: framerate targets per quality tier
 *   - Memory profiling: per-world memory budgets, streaming pool optimization
 *   - Network optimization: adaptive tick rate (10-30Hz based on connection)
 *   - Asset budgets: texture streaming budgets, mesh LOD tiers
 *   - Boot time tracking: cold start benchmarks
 *   - Device profiling: spec validation against minimum requirements
 *   - Streaming optimization: world streaming budget management
 *   - Quality tier management: Low/Medium/High/Ultra presets
 *
 * "The Loom is invisible to the frame budget."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface PerfClockPort {
  readonly now: () => bigint;
}

export interface PerfIdPort {
  readonly next: () => string;
}

export interface PerfLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface PerfEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface PerfMetricsStorePort {
  readonly saveBenchmark: (benchmark: ScalabilityBenchmark) => Promise<void>;
  readonly getBenchmark: (benchmarkId: string) => Promise<ScalabilityBenchmark | undefined>;
  readonly saveDeviceProfile: (profile: DeviceProfile) => Promise<void>;
  readonly getDeviceProfile: (deviceId: string) => Promise<DeviceProfile | undefined>;
  readonly saveMemorySnapshot: (snapshot: MemorySnapshot) => Promise<void>;
  readonly getMemorySnapshots: (worldId: string, limit: number) => Promise<readonly MemorySnapshot[]>;
}

// ─── Constants ──────────────────────────────────────────────────────

export const QUALITY_TIERS = ['low', 'medium', 'high', 'ultra'] as const;
export type QualityTier = typeof QUALITY_TIERS[number];

const FRAMERATE_TARGETS: Readonly<Record<QualityTier, number>> = {
  low: 30,
  medium: 60,
  high: 60,
  ultra: 120,
};

const MEMORY_BUDGETS_MB: Readonly<Record<QualityTier, number>> = {
  low: 2048,
  medium: 4096,
  high: 8192,
  ultra: 16384,
};

const TEXTURE_POOL_MB: Readonly<Record<QualityTier, number>> = {
  low: 512,
  medium: 1024,
  high: 2048,
  ultra: 4096,
};

const MIN_TICK_RATE_HZ = 10;
const MAX_TICK_RATE_HZ = 30;
const DEFAULT_TICK_RATE_HZ = 20;
const LATENCY_THRESHOLD_MS = 150;
const PACKET_LOSS_THRESHOLD = 0.05;
const MAX_BOOT_TIME_MS = 30_000;
const MEMORY_WARNING_PERCENT = 85;
const MEMORY_CRITICAL_PERCENT = 95;
const LOD_LEVELS = 5;
const MAX_DRAW_CALLS_LOW = 1500;
const MAX_DRAW_CALLS_MEDIUM = 3000;
const MAX_DRAW_CALLS_HIGH = 5000;
const MAX_DRAW_CALLS_ULTRA = 8000;

// ─── Types ──────────────────────────────────────────────────────────

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor';

export type DeviceCapability = 'below-min' | 'min-spec' | 'recommended' | 'high-end';

export type MemoryPressure = 'normal' | 'warning' | 'critical';

export interface QualityPreset {
  readonly tier: QualityTier;
  readonly framerateTarget: number;
  readonly memoryBudgetMb: number;
  readonly texturePoolMb: number;
  readonly maxDrawCalls: number;
  readonly lodBias: number;
  readonly shadowQuality: number;
  readonly viewDistance: number;
  readonly foliageDensity: number;
  readonly particleBudget: number;
}

export interface DeviceProfile {
  readonly deviceId: string;
  readonly gpuName: string;
  readonly gpuVramMb: number;
  readonly cpuCores: number;
  readonly ramMb: number;
  readonly storageSsd: boolean;
  readonly capability: DeviceCapability;
  readonly recommendedTier: QualityTier;
  readonly benchmarkedAt: bigint;
}

export interface MinimumSpec {
  readonly gpuVramMb: number;
  readonly cpuCores: number;
  readonly ramMb: number;
  readonly storageSsd: boolean;
}

export interface ScalabilityBenchmark {
  readonly id: string;
  readonly deviceId: string;
  readonly tier: QualityTier;
  readonly averageFps: number;
  readonly minFps: number;
  readonly maxFps: number;
  readonly p1Fps: number;
  readonly frameTimes: readonly number[];
  readonly stutterCount: number;
  readonly durationMs: number;
  readonly passed: boolean;
  readonly benchmarkedAt: bigint;
}

export interface MemorySnapshot {
  readonly worldId: string;
  readonly totalUsedMb: number;
  readonly budgetMb: number;
  readonly texturePoolMb: number;
  readonly meshPoolMb: number;
  readonly audioPoolMb: number;
  readonly scriptHeapMb: number;
  readonly streamingPoolMb: number;
  readonly pressure: MemoryPressure;
  readonly takenAt: bigint;
}

export interface NetworkMetrics {
  readonly connectionId: string;
  readonly latencyMs: number;
  readonly jitterMs: number;
  readonly packetLoss: number;
  readonly bandwidthKbps: number;
  readonly quality: ConnectionQuality;
  readonly adaptedTickRate: number;
}

export interface AdaptiveTickConfig {
  readonly minHz: number;
  readonly maxHz: number;
  readonly currentHz: number;
  readonly latencyMs: number;
  readonly packetLoss: number;
  readonly quality: ConnectionQuality;
}

export interface WorldStreamingBudget {
  readonly worldId: string;
  readonly tier: QualityTier;
  readonly memoryBudgetMb: number;
  readonly textureStreamingMb: number;
  readonly meshStreamingMb: number;
  readonly activeCellCount: number;
  readonly maxCellCount: number;
  readonly loadQueueDepth: number;
  readonly unloadCandidates: number;
}

export interface BootTimeBenchmark {
  readonly deviceId: string;
  readonly totalMs: number;
  readonly shaderCompileMs: number;
  readonly assetLoadMs: number;
  readonly worldInitMs: number;
  readonly networkConnectMs: number;
  readonly passed: boolean;
  readonly measuredAt: bigint;
}

export interface LodConfig {
  readonly level: number;
  readonly distanceThreshold: number;
  readonly triangleReduction: number;
  readonly textureScale: number;
}

export interface PerformanceReport {
  readonly deviceProfile: DeviceProfile;
  readonly qualityTier: QualityTier;
  readonly benchmark: ScalabilityBenchmark | undefined;
  readonly memorySnapshot: MemorySnapshot | undefined;
  readonly bootTime: BootTimeBenchmark | undefined;
  readonly recommendations: readonly string[];
}

export interface PerfOptimizationStats {
  readonly totalDevicesProfiled: number;
  readonly averageFpsByTier: Readonly<Record<QualityTier, number>>;
  readonly memoryPressureDistribution: Readonly<Record<MemoryPressure, number>>;
  readonly networkQualityDistribution: Readonly<Record<ConnectionQuality, number>>;
  readonly bootTimeAvgMs: number;
}

// ─── Deps & Config ──────────────────────────────────────────────────

export interface PerfOptimizationDeps {
  readonly clock: PerfClockPort;
  readonly ids: PerfIdPort;
  readonly log: PerfLogPort;
  readonly events: PerfEventPort;
  readonly store: PerfMetricsStorePort;
}

export interface PerfOptimizationConfig {
  readonly minTickRateHz: number;
  readonly maxTickRateHz: number;
  readonly defaultTickRateHz: number;
  readonly latencyThresholdMs: number;
  readonly packetLossThreshold: number;
  readonly maxBootTimeMs: number;
  readonly memoryWarningPercent: number;
  readonly memoryCriticalPercent: number;
  readonly lodLevels: number;
  readonly minimumSpec: MinimumSpec;
}

const DEFAULT_CONFIG: PerfOptimizationConfig = {
  minTickRateHz: MIN_TICK_RATE_HZ,
  maxTickRateHz: MAX_TICK_RATE_HZ,
  defaultTickRateHz: DEFAULT_TICK_RATE_HZ,
  latencyThresholdMs: LATENCY_THRESHOLD_MS,
  packetLossThreshold: PACKET_LOSS_THRESHOLD,
  maxBootTimeMs: MAX_BOOT_TIME_MS,
  memoryWarningPercent: MEMORY_WARNING_PERCENT,
  memoryCriticalPercent: MEMORY_CRITICAL_PERCENT,
  lodLevels: LOD_LEVELS,
  minimumSpec: {
    gpuVramMb: 4096,
    cpuCores: 4,
    ramMb: 8192,
    storageSsd: false,
  },
};

// ─── Quality Presets ────────────────────────────────────────────────

const QUALITY_PRESETS: ReadonlyMap<QualityTier, QualityPreset> = new Map([
  ['low', {
    tier: 'low',
    framerateTarget: FRAMERATE_TARGETS.low,
    memoryBudgetMb: MEMORY_BUDGETS_MB.low,
    texturePoolMb: TEXTURE_POOL_MB.low,
    maxDrawCalls: MAX_DRAW_CALLS_LOW,
    lodBias: 2.0,
    shadowQuality: 0,
    viewDistance: 5000,
    foliageDensity: 0.3,
    particleBudget: 500,
  }],
  ['medium', {
    tier: 'medium',
    framerateTarget: FRAMERATE_TARGETS.medium,
    memoryBudgetMb: MEMORY_BUDGETS_MB.medium,
    texturePoolMb: TEXTURE_POOL_MB.medium,
    maxDrawCalls: MAX_DRAW_CALLS_MEDIUM,
    lodBias: 1.0,
    shadowQuality: 1,
    viewDistance: 10000,
    foliageDensity: 0.6,
    particleBudget: 2000,
  }],
  ['high', {
    tier: 'high',
    framerateTarget: FRAMERATE_TARGETS.high,
    memoryBudgetMb: MEMORY_BUDGETS_MB.high,
    texturePoolMb: TEXTURE_POOL_MB.high,
    maxDrawCalls: MAX_DRAW_CALLS_HIGH,
    lodBias: 0.5,
    shadowQuality: 2,
    viewDistance: 20000,
    foliageDensity: 0.85,
    particleBudget: 5000,
  }],
  ['ultra', {
    tier: 'ultra',
    framerateTarget: FRAMERATE_TARGETS.ultra,
    memoryBudgetMb: MEMORY_BUDGETS_MB.ultra,
    texturePoolMb: TEXTURE_POOL_MB.ultra,
    maxDrawCalls: MAX_DRAW_CALLS_ULTRA,
    lodBias: 0.0,
    shadowQuality: 3,
    viewDistance: 50000,
    foliageDensity: 1.0,
    particleBudget: 10000,
  }],
]);

// ─── Engine ─────────────────────────────────────────────────────────

export interface PerfOptimizationEngine {
  /** Profile a device and determine its capability tier. */
  readonly profileDevice: (
    deviceId: string,
    gpuName: string,
    gpuVramMb: number,
    cpuCores: number,
    ramMb: number,
    storageSsd: boolean,
  ) => Promise<DeviceProfile>;

  /** Get quality preset for a tier. */
  readonly getQualityPreset: (tier: QualityTier) => QualityPreset;

  /** Record a scalability benchmark result. */
  readonly recordBenchmark: (
    deviceId: string,
    tier: QualityTier,
    frameTimes: readonly number[],
    durationMs: number,
  ) => Promise<ScalabilityBenchmark>;

  /** Take a memory snapshot for a world. */
  readonly takeMemorySnapshot: (
    worldId: string,
    totalUsedMb: number,
    texturePoolMb: number,
    meshPoolMb: number,
    audioPoolMb: number,
    scriptHeapMb: number,
    streamingPoolMb: number,
    tier: QualityTier,
  ) => Promise<MemorySnapshot>;

  /** Compute adaptive tick rate based on network conditions. */
  readonly computeAdaptiveTickRate: (
    latencyMs: number,
    jitterMs: number,
    packetLoss: number,
    bandwidthKbps: number,
  ) => AdaptiveTickConfig;

  /** Evaluate network quality from metrics. */
  readonly evaluateNetworkQuality: (
    latencyMs: number,
    packetLoss: number,
    jitterMs: number,
  ) => ConnectionQuality;

  /** Compute world streaming budget. */
  readonly computeStreamingBudget: (
    worldId: string,
    tier: QualityTier,
    activeCellCount: number,
    maxCellCount: number,
    loadQueueDepth: number,
    unloadCandidates: number,
  ) => WorldStreamingBudget;

  /** Record boot time benchmark. */
  readonly recordBootTime: (
    deviceId: string,
    shaderCompileMs: number,
    assetLoadMs: number,
    worldInitMs: number,
    networkConnectMs: number,
  ) => Promise<BootTimeBenchmark>;

  /** Generate LOD configuration for a given tier. */
  readonly generateLodConfig: (tier: QualityTier) => readonly LodConfig[];

  /** Validate a device against minimum spec. */
  readonly validateMinimumSpec: (
    gpuVramMb: number,
    cpuCores: number,
    ramMb: number,
    storageSsd: boolean,
  ) => { readonly meetsSpec: boolean; readonly failures: readonly string[] };

  /** Generate a full performance report for a device. */
  readonly generateReport: (deviceId: string) => Promise<PerformanceReport>;

  /** Get memory pressure level from a snapshot. */
  readonly getMemoryPressure: (usedMb: number, budgetMb: number) => MemoryPressure;

  /** Get draw call budget for a quality tier. */
  readonly getDrawCallBudget: (tier: QualityTier) => number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createPerfOptimizationEngine(
  deps: PerfOptimizationDeps,
  config?: Partial<PerfOptimizationConfig>,
): PerfOptimizationEngine {
  const cfg: PerfOptimizationConfig = { ...DEFAULT_CONFIG, ...config };
  const { clock, ids, log, events, store } = deps;

  function classifyDevice(
    gpuVramMb: number,
    cpuCores: number,
    ramMb: number,
  ): DeviceCapability {
    const { minimumSpec: min } = cfg;
    if (gpuVramMb < min.gpuVramMb || cpuCores < min.cpuCores || ramMb < min.ramMb) {
      return 'below-min';
    }
    if (gpuVramMb >= 12288 && cpuCores >= 12 && ramMb >= 32768) {
      return 'high-end';
    }
    if (gpuVramMb >= 8192 && cpuCores >= 8 && ramMb >= 16384) {
      return 'recommended';
    }
    return 'min-spec';
  }

  function recommendTier(capability: DeviceCapability): QualityTier {
    switch (capability) {
      case 'below-min': return 'low';
      case 'min-spec': return 'low';
      case 'recommended': return 'high';
      case 'high-end': return 'ultra';
    }
  }

  function computePressure(usedMb: number, budgetMb: number): MemoryPressure {
    const percent = (usedMb / budgetMb) * 100;
    if (percent >= cfg.memoryCriticalPercent) return 'critical';
    if (percent >= cfg.memoryWarningPercent) return 'warning';
    return 'normal';
  }

  function computeQuality(
    latencyMs: number,
    packetLoss: number,
    jitterMs: number,
  ): ConnectionQuality {
    if (latencyMs < 30 && packetLoss < 0.01 && jitterMs < 5) return 'excellent';
    if (latencyMs < 80 && packetLoss < 0.03 && jitterMs < 15) return 'good';
    if (latencyMs < cfg.latencyThresholdMs && packetLoss < cfg.packetLossThreshold) return 'fair';
    return 'poor';
  }

  function computeTickRate(
    latencyMs: number,
    packetLoss: number,
  ): number {
    if (latencyMs < 30 && packetLoss < 0.01) return cfg.maxTickRateHz;
    if (latencyMs < 80 && packetLoss < 0.03) return 25;
    if (latencyMs < cfg.latencyThresholdMs) return 20;
    if (latencyMs < 250) return 15;
    return cfg.minTickRateHz;
  }

  function computeFpsStats(frameTimes: readonly number[]): {
    readonly averageFps: number;
    readonly minFps: number;
    readonly maxFps: number;
    readonly p1Fps: number;
    readonly stutterCount: number;
  } {
    if (frameTimes.length === 0) {
      return { averageFps: 0, minFps: 0, maxFps: 0, p1Fps: 0, stutterCount: 0 };
    }

    const sorted = [...frameTimes].sort((a, b) => a - b);
    const avgMs = frameTimes.reduce((sum, t) => sum + t, 0) / frameTimes.length;

    const minMs = sorted[sorted.length - 1]!;
    const maxMs = sorted[0]!;
    const p1Index = Math.max(0, Math.floor(sorted.length * 0.99) - 1);
    const p1Ms = sorted[p1Index]!;

    const targetMs = 1000 / 30;
    let stutters = 0;
    for (const t of frameTimes) {
      if (t > targetMs * 2) stutters++;
    }

    return {
      averageFps: avgMs > 0 ? Math.round(1000 / avgMs) : 0,
      minFps: minMs > 0 ? Math.round(1000 / minMs) : 0,
      maxFps: maxMs > 0 ? Math.round(1000 / maxMs) : 0,
      p1Fps: p1Ms > 0 ? Math.round(1000 / p1Ms) : 0,
      stutterCount: stutters,
    };
  }

  const engine: PerfOptimizationEngine = {
    async profileDevice(deviceId, gpuName, gpuVramMb, cpuCores, ramMb, storageSsd) {
      const capability = classifyDevice(gpuVramMb, cpuCores, ramMb);
      const recommendedTier = recommendTier(capability);

      const profile: DeviceProfile = {
        deviceId,
        gpuName,
        gpuVramMb,
        cpuCores,
        ramMb,
        storageSsd,
        capability,
        recommendedTier,
        benchmarkedAt: clock.now(),
      };

      await store.saveDeviceProfile(profile);
      log.info('Device profiled', {
        deviceId,
        capability,
        recommendedTier,
      });

      events.emit({
        type: 'perf.device-profiled',
        payload: { deviceId, capability, recommendedTier },
      } as LoomEvent);

      return profile;
    },

    getQualityPreset(tier) {
      const preset = QUALITY_PRESETS.get(tier);
      return preset!;
    },

    async recordBenchmark(deviceId, tier, frameTimes, durationMs) {
      const stats = computeFpsStats(frameTimes);
      const target = FRAMERATE_TARGETS[tier];
      const passed = stats.averageFps >= target && stats.p1Fps >= target * 0.5;

      const benchmark: ScalabilityBenchmark = {
        id: ids.next(),
        deviceId,
        tier,
        ...stats,
        frameTimes,
        durationMs,
        passed,
        benchmarkedAt: clock.now(),
      };

      await store.saveBenchmark(benchmark);
      log.info('Benchmark recorded', {
        deviceId,
        tier,
        avgFps: stats.averageFps,
        passed,
      });

      events.emit({
        type: 'perf.benchmark-recorded',
        payload: { benchmarkId: benchmark.id, tier, passed },
      } as LoomEvent);

      return benchmark;
    },

    async takeMemorySnapshot(
      worldId, totalUsedMb, texturePoolMb, meshPoolMb,
      audioPoolMb, scriptHeapMb, streamingPoolMb, tier,
    ) {
      const budgetMb = MEMORY_BUDGETS_MB[tier];
      const pressure = computePressure(totalUsedMb, budgetMb);

      const snapshot: MemorySnapshot = {
        worldId,
        totalUsedMb,
        budgetMb,
        texturePoolMb,
        meshPoolMb,
        audioPoolMb,
        scriptHeapMb,
        streamingPoolMb,
        pressure,
        takenAt: clock.now(),
      };

      await store.saveMemorySnapshot(snapshot);

      if (pressure !== 'normal') {
        log.warn('Memory pressure detected', {
          worldId,
          pressure,
          usedMb: totalUsedMb,
          budgetMb,
        });

        events.emit({
          type: 'perf.memory-pressure',
          payload: { worldId, pressure, usedMb: totalUsedMb, budgetMb },
        } as LoomEvent);
      }

      return snapshot;
    },

    computeAdaptiveTickRate(latencyMs, jitterMs, packetLoss, bandwidthKbps) {
      const quality = computeQuality(latencyMs, packetLoss, jitterMs);
      let currentHz = computeTickRate(latencyMs, packetLoss);

      if (bandwidthKbps < 256) {
        currentHz = Math.min(currentHz, 15);
      }
      if (jitterMs > 50) {
        currentHz = Math.max(cfg.minTickRateHz, currentHz - 5);
      }

      currentHz = Math.max(cfg.minTickRateHz, Math.min(cfg.maxTickRateHz, currentHz));

      return {
        minHz: cfg.minTickRateHz,
        maxHz: cfg.maxTickRateHz,
        currentHz,
        latencyMs,
        packetLoss,
        quality,
      };
    },

    evaluateNetworkQuality(latencyMs, packetLoss, jitterMs) {
      return computeQuality(latencyMs, packetLoss, jitterMs);
    },

    computeStreamingBudget(worldId, tier, activeCellCount, maxCellCount, loadQueueDepth, unloadCandidates) {
      const memBudget = MEMORY_BUDGETS_MB[tier];
      const texBudget = TEXTURE_POOL_MB[tier];
      const meshStreamingMb = Math.round(memBudget * 0.15);

      return {
        worldId,
        tier,
        memoryBudgetMb: memBudget,
        textureStreamingMb: texBudget,
        meshStreamingMb,
        activeCellCount,
        maxCellCount,
        loadQueueDepth,
        unloadCandidates,
      };
    },

    async recordBootTime(deviceId, shaderCompileMs, assetLoadMs, worldInitMs, networkConnectMs) {
      const totalMs = shaderCompileMs + assetLoadMs + worldInitMs + networkConnectMs;
      const passed = totalMs <= cfg.maxBootTimeMs;

      const benchmark: BootTimeBenchmark = {
        deviceId,
        totalMs,
        shaderCompileMs,
        assetLoadMs,
        worldInitMs,
        networkConnectMs,
        passed,
        measuredAt: clock.now(),
      };

      log.info('Boot time recorded', {
        deviceId,
        totalMs,
        passed,
      });

      if (!passed) {
        events.emit({
          type: 'perf.boot-time-exceeded',
          payload: { deviceId, totalMs, maxMs: cfg.maxBootTimeMs },
        } as LoomEvent);
      }

      return benchmark;
    },

    generateLodConfig(tier) {
      const preset = QUALITY_PRESETS.get(tier);
      if (!preset) return [];

      const lods: LodConfig[] = [];
      for (let level = 0; level < cfg.lodLevels; level++) {
        const baseDist = preset.viewDistance / cfg.lodLevels;
        lods.push({
          level,
          distanceThreshold: baseDist * (level + 1) + preset.lodBias * 500,
          triangleReduction: Math.min(0.95, level * 0.2),
          textureScale: Math.max(0.125, 1.0 - level * 0.2),
        });
      }
      return lods;
    },

    validateMinimumSpec(gpuVramMb, cpuCores, ramMb, storageSsd) {
      const { minimumSpec: min } = cfg;
      const failures: string[] = [];

      if (gpuVramMb < min.gpuVramMb) {
        failures.push(`GPU VRAM ${gpuVramMb}MB below minimum ${min.gpuVramMb}MB`);
      }
      if (cpuCores < min.cpuCores) {
        failures.push(`CPU cores ${cpuCores} below minimum ${min.cpuCores}`);
      }
      if (ramMb < min.ramMb) {
        failures.push(`RAM ${ramMb}MB below minimum ${min.ramMb}MB`);
      }
      if (min.storageSsd && !storageSsd) {
        failures.push('SSD required but not detected');
      }

      return { meetsSpec: failures.length === 0, failures };
    },

    async generateReport(deviceId) {
      const deviceProfile = await store.getDeviceProfile(deviceId);
      if (!deviceProfile) {
        throw new Error(`Device ${deviceId} not profiled`);
      }

      const tier = deviceProfile.recommendedTier;
      const benchmark = await store.getBenchmark(deviceId);
      const snapshots = await store.getMemorySnapshots(deviceId, 1);
      const memorySnapshot = snapshots[0];

      const recommendations: string[] = [];

      if (deviceProfile.capability === 'below-min') {
        recommendations.push('Device below minimum spec — consider cloud streaming');
      }
      if (!deviceProfile.storageSsd) {
        recommendations.push('SSD recommended for faster load times');
      }
      if (benchmark && !benchmark.passed) {
        recommendations.push(`Consider lowering quality from ${tier}`);
      }
      if (memorySnapshot && memorySnapshot.pressure === 'critical') {
        recommendations.push('Reduce texture quality or view distance to lower memory usage');
      }
      if (memorySnapshot && memorySnapshot.pressure === 'warning') {
        recommendations.push('Memory usage high — monitor for stuttering');
      }

      return {
        deviceProfile,
        qualityTier: tier,
        benchmark,
        memorySnapshot,
        bootTime: undefined,
        recommendations,
      };
    },

    getMemoryPressure(usedMb, budgetMb) {
      return computePressure(usedMb, budgetMb);
    },

    getDrawCallBudget(tier) {
      const preset = QUALITY_PRESETS.get(tier);
      return preset ? preset.maxDrawCalls : MAX_DRAW_CALLS_LOW;
    },
  };

  log.info('Perf optimization engine initialized', {
    tickRange: `${cfg.minTickRateHz}-${cfg.maxTickRateHz}Hz`,
    lodLevels: cfg.lodLevels,
    maxBootTimeMs: cfg.maxBootTimeMs,
  });

  return engine;
}
