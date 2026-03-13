import { describe, it, expect } from 'vitest';
import {
  computeTextureStreamConfig,
  computeMeshLodChain,
  computeShaderCacheState,
  computeSteamDeckProfile,
  validateSteamDeckVerification,
  computeCloudStreamingCert,
  QUALITY_TIERS,
  CLOUD_CERT_PROVIDERS,
} from '../asset-optimization.js';

describe('asset-optimization simulation', () => {
  const mockClock = { now: () => BigInt(1_000_000) };

  // ── constants ─────────────────────────────────────────────────────

  it('QUALITY_TIERS contains low/medium/high/ultra', () => {
    expect(QUALITY_TIERS).toContain('low');
    expect(QUALITY_TIERS).toContain('medium');
    expect(QUALITY_TIERS).toContain('high');
    expect(QUALITY_TIERS).toContain('ultra');
  });

  it('CLOUD_CERT_PROVIDERS contains geforce-now and xbox-cloud', () => {
    expect(CLOUD_CERT_PROVIDERS).toContain('geforce-now');
    expect(CLOUD_CERT_PROVIDERS).toContain('xbox-cloud');
  });

  // ── computeTextureStreamConfig ────────────────────────────────────

  describe('computeTextureStreamConfig', () => {
    it('returns a config with a poolSizeMb field', () => {
      const cfg = computeTextureStreamConfig('world-1', 'medium', 50, mockClock);
      expect(cfg).toHaveProperty('poolSizeMb');
    });

    it('low tier has poolSizeMb = 512', () => {
      const cfg = computeTextureStreamConfig('world-1', 'low', 50, mockClock);
      expect(cfg.poolSizeMb).toBe(512);
    });

    it('medium tier has poolSizeMb = 1024', () => {
      const cfg = computeTextureStreamConfig('world-1', 'medium', 50, mockClock);
      expect(cfg.poolSizeMb).toBe(1024);
    });

    it('high tier has poolSizeMb = 2048', () => {
      const cfg = computeTextureStreamConfig('world-1', 'high', 50, mockClock);
      expect(cfg.poolSizeMb).toBe(2048);
    });

    it('ultra tier has poolSizeMb = 4096', () => {
      const cfg = computeTextureStreamConfig('world-1', 'ultra', 50, mockClock);
      expect(cfg.poolSizeMb).toBe(4096);
    });
  });

  // ── computeMeshLodChain ───────────────────────────────────────────

  describe('computeMeshLodChain', () => {
    it('returns an object with levels array', () => {
      const chain = computeMeshLodChain('mesh-1', 'tree_trunk', 10_000, 'high', false, mockClock);
      expect(chain).toHaveProperty('levels');
      expect(Array.isArray(chain.levels)).toBe(true);
    });

    it('levels has at least one entry', () => {
      const chain = computeMeshLodChain('mesh-1', 'rock', 5_000, 'medium', false, mockClock);
      expect(chain.levels.length).toBeGreaterThan(0);
    });

    it('nanite mode produces a config with naniteEnabled = true', () => {
      const chain = computeMeshLodChain('mesh-1', 'cliff', 100_000, 'ultra', true, mockClock);
      expect(chain.naniteEnabled).toBe(true);
    });
  });

  // ── computeShaderCacheState ───────────────────────────────────────

  describe('computeShaderCacheState', () => {
    it('returns a state with cacheHitRate', () => {
      const state = computeShaderCacheState('pc', 200, 150, 10, 512, mockClock);
      expect(state).toHaveProperty('cacheHitRate');
    });

    it('cacheHitRate = 1 when all shaders are cached', () => {
      const state = computeShaderCacheState('pc', 100, 100, 0, 256, mockClock);
      expect(state.cacheHitRate).toBe(1);
    });

    it('cacheHitRate = 0 when nothing is cached', () => {
      const state = computeShaderCacheState('pc', 100, 0, 100, 256, mockClock);
      expect(state.cacheHitRate).toBe(0);
    });
  });

  // ── computeSteamDeckProfile ───────────────────────────────────────

  describe('computeSteamDeckProfile', () => {
    it('returns a profile with a controllerLayoutId', () => {
      const profile = computeSteamDeckProfile('layout-default', mockClock);
      expect(profile).toHaveProperty('controllerLayoutId');
      expect(profile.controllerLayoutId).toBe('layout-default');
    });
  });

  // ── validateSteamDeckVerification ─────────────────────────────────

  describe('validateSteamDeckVerification', () => {
    it('certified = true when fps>=30, battery>=2, boot<=30', () => {
      const result = validateSteamDeckVerification(30, 2, 30);
      expect(result.verified).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('certified = false when fps < 30', () => {
      const result = validateSteamDeckVerification(25, 3, 20);
      expect(result.verified).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('certified = false when battery < 2', () => {
      const result = validateSteamDeckVerification(60, 1, 20);
      expect(result.verified).toBe(false);
    });

    it('certified = false when boot > 30', () => {
      const result = validateSteamDeckVerification(60, 3, 35);
      expect(result.verified).toBe(false);
    });
  });

  // ── computeCloudStreamingCert ─────────────────────────────────────

  describe('computeCloudStreamingCert', () => {
    it('certified = true when passRate>=0.95, maxLatency<=100, inputLatency<=50', () => {
      const cert = computeCloudStreamingCert('geforce-now', 40_000, 80, 30, 95, 100, mockClock);
      expect(cert.certified).toBe(true);
    });

    it('certified = false when passRate < 0.95', () => {
      const cert = computeCloudStreamingCert('geforce-now', 40_000, 80, 30, 94, 100, mockClock);
      expect(cert.certified).toBe(false);
    });

    it('certified = false when maxLatency > 100', () => {
      const cert = computeCloudStreamingCert('xbox-cloud', 30_000, 110, 30, 100, 100, mockClock);
      expect(cert.certified).toBe(false);
    });

    it('certified = false when inputLatency > 50', () => {
      const cert = computeCloudStreamingCert('xbox-cloud', 30_000, 80, 55, 100, 100, mockClock);
      expect(cert.certified).toBe(false);
    });

    it('includes provider in the cert result', () => {
      const cert = computeCloudStreamingCert('geforce-now', 40_000, 80, 30, 100, 100, mockClock);
      expect(cert.provider).toBe('geforce-now');
    });
  });
});
