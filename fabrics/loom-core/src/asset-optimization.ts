/**
 * Asset Optimization System — texture streaming, mesh LOD pipeline,
 * shader compilation cache, Steam Deck tuning, and cloud streaming
 * certification.
 *
 * The Loom manages asset budgets and optimization profiles.
 * UE5 consumes these configs for runtime streaming, LOD selection,
 * shader pre-compilation, and platform-specific tuning.
 *
 *   - Texture streaming: mip-level budgets, residency tracking
 *   - Mesh LOD pipeline: distance-sorted LOD chain management
 *   - Shader compilation cache: warm-up scheduling, cache persistence
 *   - Steam Deck: 800p target, controller layout, battery mode
 *   - Cloud streaming: GeForce NOW / Xbox Cloud Gaming certification
 *
 * "Performance is the first feature."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface AoClockPort {
  readonly now: () => bigint;
}

export interface AoIdPort {
  readonly next: () => string;
}

export interface AoLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface AoEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface AoStorePort {
  readonly saveTextureStreamConfig: (config: TextureStreamConfig) => Promise<void>;
  readonly getTextureStreamConfig: (worldId: string) => Promise<TextureStreamConfig | undefined>;
  readonly saveMeshLodChain: (chain: MeshLodChain) => Promise<void>;
  readonly getMeshLodChain: (meshId: string) => Promise<MeshLodChain | undefined>;
  readonly saveShaderCacheState: (state: ShaderCacheState) => Promise<void>;
  readonly getShaderCacheState: (platformId: string) => Promise<ShaderCacheState | undefined>;
  readonly saveSteamDeckProfile: (profile: SteamDeckProfile) => Promise<void>;
  readonly getSteamDeckProfile: () => Promise<SteamDeckProfile | undefined>;
  readonly saveCloudCertification: (cert: CloudStreamingCert) => Promise<void>;
  readonly getCloudCertification: (provider: string) => Promise<CloudStreamingCert | undefined>;
}

// ─── Constants ──────────────────────────────────────────────────────

export const QUALITY_TIERS = ['low', 'medium', 'high', 'ultra'] as const;
export type QualityTier = (typeof QUALITY_TIERS)[number];

export const CLOUD_CERT_PROVIDERS = ['geforce-now', 'xbox-cloud'] as const;
export type CloudCertProvider = (typeof CLOUD_CERT_PROVIDERS)[number];

const TEXTURE_POOL_MB: Readonly<Record<QualityTier, number>> = {
  low: 512,
  medium: 1024,
  high: 2048,
  ultra: 4096,
};

const MAX_MIP_LEVEL: Readonly<Record<QualityTier, number>> = {
  low: 6,
  medium: 8,
  high: 10,
  ultra: 12,
};

const LOD_DISTANCE_MULTIPLIERS: Readonly<Record<QualityTier, number>> = {
  low: 0.5,
  medium: 1.0,
  high: 1.5,
  ultra: 2.0,
};

const SHADER_WARMUP_BUDGET_MS = 100;

const STEAM_DECK_RESOLUTION_P = 800;
const STEAM_DECK_TARGET_FPS = 30;
const STEAM_DECK_BATTERY_HOURS = 2;

// ─── Types ──────────────────────────────────────────────────────────

export interface TextureStreamConfig {
  readonly worldId: string;
  readonly qualityTier: QualityTier;
  readonly poolSizeMb: number;
  readonly maxMipLevel: number;
  readonly residencyTargetPercent: number;
  readonly streamingBudgetMbPerSec: number;
  readonly prioritizePlayerView: boolean;
  readonly updatedAtMs: number;
}

export interface MeshLodLevel {
  readonly lodIndex: number;
  readonly triangleCount: number;
  readonly screenSizeThreshold: number;
  readonly distanceThreshold: number;
}

export interface MeshLodChain {
  readonly meshId: string;
  readonly meshName: string;
  readonly levels: readonly MeshLodLevel[];
  readonly qualityTier: QualityTier;
  readonly autoLodEnabled: boolean;
  readonly naniteEnabled: boolean;
  readonly updatedAtMs: number;
}

export interface ShaderCacheState {
  readonly platformId: string;
  readonly totalShaders: number;
  readonly cachedShaders: number;
  readonly cacheHitRate: number;
  readonly warmupBudgetMs: number;
  readonly warmupComplete: boolean;
  readonly pendingCompilations: number;
  readonly cacheSizeMb: number;
  readonly updatedAtMs: number;
}

export interface SteamDeckProfile {
  readonly resolutionP: number;
  readonly targetFps: number;
  readonly batteryTargetHours: number;
  readonly qualityTier: QualityTier;
  readonly fsr2Enabled: boolean;
  readonly fsr2Quality: 'performance' | 'balanced' | 'quality';
  readonly controllerLayoutId: string;
  readonly halfRateShading: boolean;
  readonly textureQuality: QualityTier;
  readonly shadowQuality: QualityTier;
  readonly viewDistance: number;
  readonly verified: boolean;
  readonly updatedAtMs: number;
}

export interface CloudStreamingCert {
  readonly provider: CloudCertProvider;
  readonly certified: boolean;
  readonly minBitrateKbps: number;
  readonly maxLatencyMs: number;
  readonly inputLatencyMs: number;
  readonly resolutionSupported: readonly number[];
  readonly codecSupported: readonly string[];
  readonly testsPassed: number;
  readonly testsTotal: number;
  readonly certifiedAtMs: number;
}

// ─── Helpers ────────────────────────────────────────────────────────

function makeEvent(type: string, payload: unknown, ids: AoIdPort, clock: AoClockPort): LoomEvent {
  return {
    eventId: ids.next(),
    type,
    payload,
    timestamp: Number(clock.now()),
    correlationId: ids.next(),
    causationId: ids.next(),
    sequenceNumber: 0,
    sourceWorldId: '',
    sourceFabricId: 'asset-optimization',
    schemaVersion: 1,
    metadata: {},
  } as LoomEvent;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─── Texture Streaming ──────────────────────────────────────────────

export function computeTextureStreamConfig(
  worldId: string,
  qualityTier: QualityTier,
  bandwidthMbPerSec: number,
  clock: AoClockPort,
): TextureStreamConfig {
  return {
    worldId,
    qualityTier,
    poolSizeMb: TEXTURE_POOL_MB[qualityTier],
    maxMipLevel: MAX_MIP_LEVEL[qualityTier],
    residencyTargetPercent: qualityTier === 'ultra' ? 95 : qualityTier === 'high' ? 90 : 80,
    streamingBudgetMbPerSec: clamp(bandwidthMbPerSec, 10, 500),
    prioritizePlayerView: true,
    updatedAtMs: Number(clock.now()),
  };
}

// ─── Mesh LOD Pipeline ──────────────────────────────────────────────

export function computeMeshLodChain(
  meshId: string,
  meshName: string,
  baseTriangleCount: number,
  qualityTier: QualityTier,
  useNanite: boolean,
  clock: AoClockPort,
): MeshLodChain {
  const distMultiplier = LOD_DISTANCE_MULTIPLIERS[qualityTier];
  const levels: MeshLodLevel[] = [];

  const lodConfigs = [
    { reduction: 1.0, screenSize: 1.0, distance: 0 },
    { reduction: 0.5, screenSize: 0.5, distance: 20 },
    { reduction: 0.25, screenSize: 0.25, distance: 50 },
    { reduction: 0.1, screenSize: 0.1, distance: 100 },
  ];

  for (let i = 0; i < lodConfigs.length; i++) {
    const cfg = lodConfigs[i];
    levels.push({
      lodIndex: i,
      triangleCount: Math.round(baseTriangleCount * cfg.reduction),
      screenSizeThreshold: cfg.screenSize,
      distanceThreshold: cfg.distance * distMultiplier,
    });
  }

  return {
    meshId,
    meshName,
    levels,
    qualityTier,
    autoLodEnabled: !useNanite,
    naniteEnabled: useNanite,
    updatedAtMs: Number(clock.now()),
  };
}

// ─── Shader Cache ───────────────────────────────────────────────────

export function computeShaderCacheState(
  platformId: string,
  totalShaders: number,
  cachedShaders: number,
  pendingCompilations: number,
  cacheSizeMb: number,
  clock: AoClockPort,
): ShaderCacheState {
  const cacheHitRate = totalShaders > 0 ? cachedShaders / totalShaders : 0;
  return {
    platformId,
    totalShaders,
    cachedShaders,
    cacheHitRate,
    warmupBudgetMs: SHADER_WARMUP_BUDGET_MS,
    warmupComplete: pendingCompilations === 0,
    pendingCompilations,
    cacheSizeMb,
    updatedAtMs: Number(clock.now()),
  };
}

// ─── Steam Deck ─────────────────────────────────────────────────────

export function computeSteamDeckProfile(
  controllerLayoutId: string,
  clock: AoClockPort,
): SteamDeckProfile {
  return {
    resolutionP: STEAM_DECK_RESOLUTION_P,
    targetFps: STEAM_DECK_TARGET_FPS,
    batteryTargetHours: STEAM_DECK_BATTERY_HOURS,
    qualityTier: 'low',
    fsr2Enabled: true,
    fsr2Quality: 'performance',
    controllerLayoutId,
    halfRateShading: true,
    textureQuality: 'medium',
    shadowQuality: 'low',
    viewDistance: 5000,
    verified: true,
    updatedAtMs: Number(clock.now()),
  };
}

export function validateSteamDeckVerification(
  measuredFps: number,
  measuredBatteryHours: number,
  bootTimeSec: number,
): { readonly verified: boolean; readonly issues: readonly string[] } {
  const issues: string[] = [];
  if (measuredFps < STEAM_DECK_TARGET_FPS) {
    issues.push(`fps-below-target: ${measuredFps} < ${STEAM_DECK_TARGET_FPS}`);
  }
  if (measuredBatteryHours < STEAM_DECK_BATTERY_HOURS) {
    issues.push(`battery-below-target: ${measuredBatteryHours}h < ${STEAM_DECK_BATTERY_HOURS}h`);
  }
  if (bootTimeSec > 30) {
    issues.push(`boot-time-exceeded: ${bootTimeSec}s > 30s`);
  }
  return { verified: issues.length === 0, issues };
}

// ─── Cloud Streaming Certification ──────────────────────────────────

export function computeCloudStreamingCert(
  provider: CloudCertProvider,
  minBitrateKbps: number,
  maxLatencyMs: number,
  inputLatencyMs: number,
  testsPassed: number,
  testsTotal: number,
  clock: AoClockPort,
): CloudStreamingCert {
  const passRate = testsTotal > 0 ? testsPassed / testsTotal : 0;
  const certified = passRate >= 0.95 && maxLatencyMs <= 100 && inputLatencyMs <= 50;

  const resolutions = provider === 'geforce-now'
    ? [720, 1080, 1440]
    : [720, 1080];

  const codecs = provider === 'geforce-now'
    ? ['h264', 'h265', 'av1']
    : ['h264', 'h265'];

  return {
    provider,
    certified,
    minBitrateKbps,
    maxLatencyMs,
    inputLatencyMs,
    resolutionSupported: resolutions,
    codecSupported: codecs,
    testsPassed,
    testsTotal,
    certifiedAtMs: Number(clock.now()),
  };
}

// ─── Asset Optimization Engine ──────────────────────────────────────

export interface AssetOptimizationEngine {
  readonly configureTextureStreaming: (worldId: string, qualityTier: QualityTier, bandwidthMbPerSec: number) => Promise<TextureStreamConfig>;
  readonly createLodChain: (meshId: string, meshName: string, baseTriangleCount: number, qualityTier: QualityTier, useNanite: boolean) => Promise<MeshLodChain>;
  readonly updateShaderCache: (platformId: string, totalShaders: number, cachedShaders: number, pendingCompilations: number, cacheSizeMb: number) => Promise<ShaderCacheState>;
  readonly getSteamDeckProfile: (controllerLayoutId: string) => Promise<SteamDeckProfile>;
  readonly validateSteamDeck: (measuredFps: number, measuredBatteryHours: number, bootTimeSec: number) => { readonly verified: boolean; readonly issues: readonly string[] };
  readonly certifyCloudStreaming: (provider: CloudCertProvider, minBitrateKbps: number, maxLatencyMs: number, inputLatencyMs: number, testsPassed: number, testsTotal: number) => Promise<CloudStreamingCert>;
}

export interface AoEngineDeps {
  readonly clock: AoClockPort;
  readonly ids: AoIdPort;
  readonly log: AoLogPort;
  readonly events: AoEventPort;
  readonly store: AoStorePort;
}

export function createAssetOptimizationEngine(deps: AoEngineDeps): AssetOptimizationEngine {
  return {
    async configureTextureStreaming(worldId, qualityTier, bandwidthMbPerSec) {
      const config = computeTextureStreamConfig(worldId, qualityTier, bandwidthMbPerSec, deps.clock);
      await deps.store.saveTextureStreamConfig(config);
      deps.events.emit(makeEvent('asset.texture-streaming.configured', config, deps.ids, deps.clock));
      deps.log.info('Texture streaming configured', { worldId, qualityTier, poolSizeMb: config.poolSizeMb });
      return config;
    },

    async createLodChain(meshId, meshName, baseTriangleCount, qualityTier, useNanite) {
      const chain = computeMeshLodChain(meshId, meshName, baseTriangleCount, qualityTier, useNanite, deps.clock);
      await deps.store.saveMeshLodChain(chain);
      deps.events.emit(makeEvent('asset.lod-chain.created', chain, deps.ids, deps.clock));
      deps.log.info('LOD chain created', { meshId, levels: chain.levels.length, nanite: useNanite });
      return chain;
    },

    async updateShaderCache(platformId, totalShaders, cachedShaders, pendingCompilations, cacheSizeMb) {
      const state = computeShaderCacheState(platformId, totalShaders, cachedShaders, pendingCompilations, cacheSizeMb, deps.clock);
      await deps.store.saveShaderCacheState(state);
      if (!state.warmupComplete) {
        deps.log.warn('Shader warmup incomplete', { platformId, pendingCompilations });
      }
      deps.events.emit(makeEvent('asset.shader-cache.updated', state, deps.ids, deps.clock));
      return state;
    },

    async getSteamDeckProfile(controllerLayoutId) {
      const profile = computeSteamDeckProfile(controllerLayoutId, deps.clock);
      await deps.store.saveSteamDeckProfile(profile);
      deps.events.emit(makeEvent('asset.steamdeck.profiled', profile, deps.ids, deps.clock));
      return profile;
    },

    validateSteamDeck(measuredFps, measuredBatteryHours, bootTimeSec) {
      return validateSteamDeckVerification(measuredFps, measuredBatteryHours, bootTimeSec);
    },

    async certifyCloudStreaming(provider, minBitrateKbps, maxLatencyMs, inputLatencyMs, testsPassed, testsTotal) {
      const cert = computeCloudStreamingCert(provider, minBitrateKbps, maxLatencyMs, inputLatencyMs, testsPassed, testsTotal, deps.clock);
      await deps.store.saveCloudCertification(cert);
      deps.events.emit(makeEvent('asset.cloud-streaming.certified', cert, deps.ids, deps.clock));
      deps.log.info('Cloud streaming certification', { provider, certified: cert.certified });
      return cert;
    },
  };
}
