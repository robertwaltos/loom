/**
 * Asset Optimization — integration tests
 *
 * Texture streaming, mesh LOD, shader cache,
 * Steam Deck verification, cloud streaming certification.
 */

import { describe, it, expect } from 'vitest';
import {
  computeTextureStreamConfig,
  computeMeshLodChain,
  computeShaderCacheState,
  computeSteamDeckProfile,
  validateSteamDeckVerification,
  computeCloudStreamingCert,
  createAssetOptimizationEngine,
  type AoEngineDeps,
} from '../fabrics/loom-core/src/asset-optimization';

// ─── Helpers ────────────────────────────────────────────────────────

let idCounter = 0;
function stubClock(): { readonly now: () => bigint } {
  return { now: () => BigInt(Date.now()) };
}
function stubIds(): { readonly next: () => string } {
  return { next: () => `id-${++idCounter}` };
}

function createDeps(): AoEngineDeps {
  return {
    clock: stubClock(),
    ids: stubIds(),
    log: { info: () => {}, warn: () => {}, error: () => {} },
    events: { emit: () => {} },
    store: {
      saveTextureStreamConfig: async () => {},
      getTextureStreamConfig: async () => undefined,
      saveMeshLodChain: async () => {},
      getMeshLodChain: async () => undefined,
      saveShaderCacheState: async () => {},
      getShaderCacheState: async () => undefined,
      saveSteamDeckProfile: async () => {},
      getSteamDeckProfile: async () => undefined,
      saveCloudCertification: async () => {},
      getCloudCertification: async () => undefined,
    },
  };
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('Asset Optimization System', () => {
  describe('Texture Streaming', () => {
    it('low tier gets 512 MB pool', () => {
      const clock = stubClock();
      const config = computeTextureStreamConfig('world-1', 'low', 50, clock);
      expect(config.poolSizeMb).toBe(512);
    });

    it('ultra tier gets 4096 MB pool', () => {
      const clock = stubClock();
      const config = computeTextureStreamConfig('world-1', 'ultra', 200, clock);
      expect(config.poolSizeMb).toBe(4096);
      expect(config.maxMipLevel).toBe(12);
    });

    it('ultra tier has 95% residency target', () => {
      const clock = stubClock();
      const config = computeTextureStreamConfig('world-1', 'ultra', 200, clock);
      expect(config.residencyTargetPercent).toBe(95);
    });

    it('bandwidth is clamped to valid range', () => {
      const clock = stubClock();
      const config = computeTextureStreamConfig('world-1', 'medium', 1000, clock);
      expect(config.streamingBudgetMbPerSec).toBe(500);
    });

    it('player view is always prioritized', () => {
      const clock = stubClock();
      const config = computeTextureStreamConfig('world-1', 'low', 10, clock);
      expect(config.prioritizePlayerView).toBe(true);
    });
  });

  describe('Mesh LOD Pipeline', () => {
    it('creates 4 LOD levels', () => {
      const clock = stubClock();
      const chain = computeMeshLodChain('mesh-1', 'tree_oak', 50000, 'medium', false, clock);
      expect(chain.levels.length).toBe(4);
    });

    it('LOD0 has full triangle count', () => {
      const clock = stubClock();
      const chain = computeMeshLodChain('mesh-1', 'tree_oak', 50000, 'medium', false, clock);
      expect(chain.levels[0].triangleCount).toBe(50000);
    });

    it('LOD3 has 10% triangle count', () => {
      const clock = stubClock();
      const chain = computeMeshLodChain('mesh-1', 'tree_oak', 50000, 'medium', false, clock);
      expect(chain.levels[3].triangleCount).toBe(5000);
    });

    it('low tier has shorter LOD distances', () => {
      const clock = stubClock();
      const low = computeMeshLodChain('m', 'n', 10000, 'low', false, clock);
      const ultra = computeMeshLodChain('m', 'n', 10000, 'ultra', false, clock);
      expect(low.levels[1].distanceThreshold).toBeLessThan(ultra.levels[1].distanceThreshold);
    });

    it('nanite disables auto LOD', () => {
      const clock = stubClock();
      const chain = computeMeshLodChain('mesh-1', 'hero_mesh', 100000, 'ultra', true, clock);
      expect(chain.naniteEnabled).toBe(true);
      expect(chain.autoLodEnabled).toBe(false);
    });
  });

  describe('Shader Cache', () => {
    it('full cache is warmup complete', () => {
      const clock = stubClock();
      const state = computeShaderCacheState('pc-dx12', 1000, 1000, 0, 256, clock);
      expect(state.warmupComplete).toBe(true);
      expect(state.cacheHitRate).toBe(1.0);
    });

    it('pending compilations means warmup incomplete', () => {
      const clock = stubClock();
      const state = computeShaderCacheState('pc-dx12', 1000, 800, 200, 200, clock);
      expect(state.warmupComplete).toBe(false);
      expect(state.cacheHitRate).toBe(0.8);
    });

    it('empty cache has zero hit rate', () => {
      const clock = stubClock();
      const state = computeShaderCacheState('pc-dx12', 0, 0, 0, 0, clock);
      expect(state.cacheHitRate).toBe(0);
    });

    it('warmup budget is 100ms', () => {
      const clock = stubClock();
      const state = computeShaderCacheState('pc-dx12', 1000, 1000, 0, 256, clock);
      expect(state.warmupBudgetMs).toBe(100);
    });
  });

  describe('Steam Deck', () => {
    it('profile targets 800p at 30fps', () => {
      const clock = stubClock();
      const profile = computeSteamDeckProfile('deck-layout-v1', clock);
      expect(profile.resolutionP).toBe(800);
      expect(profile.targetFps).toBe(30);
    });

    it('FSR2 is enabled in performance mode', () => {
      const clock = stubClock();
      const profile = computeSteamDeckProfile('deck-layout-v1', clock);
      expect(profile.fsr2Enabled).toBe(true);
      expect(profile.fsr2Quality).toBe('performance');
    });

    it('battery target is 2 hours', () => {
      const clock = stubClock();
      const profile = computeSteamDeckProfile('deck-layout-v1', clock);
      expect(profile.batteryTargetHours).toBe(2);
    });

    it('verification passes with good metrics', () => {
      const result = validateSteamDeckVerification(35, 2.5, 20);
      expect(result.verified).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it('verification fails on low fps', () => {
      const result = validateSteamDeckVerification(25, 2.5, 20);
      expect(result.verified).toBe(false);
      expect(result.issues[0]).toContain('fps-below-target');
    });

    it('verification fails on low battery', () => {
      const result = validateSteamDeckVerification(35, 1.5, 20);
      expect(result.verified).toBe(false);
      expect(result.issues[0]).toContain('battery-below-target');
    });

    it('verification fails on slow boot', () => {
      const result = validateSteamDeckVerification(35, 2.5, 45);
      expect(result.verified).toBe(false);
      expect(result.issues[0]).toContain('boot-time-exceeded');
    });
  });

  describe('Cloud Streaming Certification', () => {
    it('passes with good metrics', () => {
      const clock = stubClock();
      const cert = computeCloudStreamingCert('geforce-now', 5000, 80, 30, 100, 100, clock);
      expect(cert.certified).toBe(true);
    });

    it('fails with high latency', () => {
      const clock = stubClock();
      const cert = computeCloudStreamingCert('geforce-now', 5000, 150, 30, 100, 100, clock);
      expect(cert.certified).toBe(false);
    });

    it('fails with high input latency', () => {
      const clock = stubClock();
      const cert = computeCloudStreamingCert('xbox-cloud', 5000, 80, 60, 100, 100, clock);
      expect(cert.certified).toBe(false);
    });

    it('fails with low test pass rate', () => {
      const clock = stubClock();
      const cert = computeCloudStreamingCert('geforce-now', 5000, 80, 30, 90, 100, clock);
      expect(cert.certified).toBe(false);
    });

    it('GeForce NOW supports AV1 codec', () => {
      const clock = stubClock();
      const cert = computeCloudStreamingCert('geforce-now', 5000, 80, 30, 100, 100, clock);
      expect(cert.codecSupported).toContain('av1');
    });

    it('Xbox Cloud supports 720p and 1080p', () => {
      const clock = stubClock();
      const cert = computeCloudStreamingCert('xbox-cloud', 5000, 80, 30, 100, 100, clock);
      expect(cert.resolutionSupported).toEqual([720, 1080]);
    });
  });

  describe('Asset Optimization Engine', () => {
    it('configureTextureStreaming returns config', async () => {
      const deps = createDeps();
      const engine = createAssetOptimizationEngine(deps);
      const config = await engine.configureTextureStreaming('world-1', 'high', 100);
      expect(config.poolSizeMb).toBe(2048);
    });

    it('createLodChain returns chain', async () => {
      const deps = createDeps();
      const engine = createAssetOptimizationEngine(deps);
      const chain = await engine.createLodChain('m-1', 'tree', 30000, 'medium', false);
      expect(chain.levels.length).toBe(4);
    });

    it('updateShaderCache returns state', async () => {
      const deps = createDeps();
      const engine = createAssetOptimizationEngine(deps);
      const state = await engine.updateShaderCache('pc-dx12', 500, 498, 2, 128);
      expect(state.warmupComplete).toBe(false);
    });

    it('getSteamDeckProfile returns 800p profile', async () => {
      const deps = createDeps();
      const engine = createAssetOptimizationEngine(deps);
      const profile = await engine.getSteamDeckProfile('deck-v1');
      expect(profile.resolutionP).toBe(800);
    });

    it('certifyCloudStreaming returns cert', async () => {
      const deps = createDeps();
      const engine = createAssetOptimizationEngine(deps);
      const cert = await engine.certifyCloudStreaming('geforce-now', 5000, 80, 30, 100, 100);
      expect(cert.certified).toBe(true);
    });
  });
});
