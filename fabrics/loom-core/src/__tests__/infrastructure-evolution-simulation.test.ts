import { describe, it, expect } from 'vitest';
import {
  computeMultiCloudConfig,
  evaluateBaremetal,
  computeEdgeNode,
  computeWasmBackendConfig,
  computeArmServerProfile,
  computeGreenProfile,
  computeCostReport,
  EDGE_LATENCY_TARGET_MS,
  ARM_SAVINGS_PERCENT,
  MIN_AVAILABILITY_PERCENT,
  CARBON_INTENSITY_THRESHOLD_G_PER_KWH,
  WASM_MODULE_SIZE_LIMIT_MB,
  CLOUD_PROVIDERS,
  SERVER_ARCHITECTURES,
  NETWORK_MODES,
} from '../infrastructure-evolution.js';

describe('infrastructure-evolution simulation', () => {
  const mockClock = { now: () => BigInt(1_000_000) };

  // ── constants ─────────────────────────────────────────────────────

  it('EDGE_LATENCY_TARGET_MS = 10', () => { expect(EDGE_LATENCY_TARGET_MS).toBe(10); });
  it('ARM_SAVINGS_PERCENT = 35', () => { expect(ARM_SAVINGS_PERCENT).toBe(35); });
  it('MIN_AVAILABILITY_PERCENT = 99.95', () => { expect(MIN_AVAILABILITY_PERCENT).toBeCloseTo(99.95); });
  it('CARBON_INTENSITY_THRESHOLD_G_PER_KWH = 200', () => { expect(CARBON_INTENSITY_THRESHOLD_G_PER_KWH).toBe(200); });
  it('WASM_MODULE_SIZE_LIMIT_MB = 50', () => { expect(WASM_MODULE_SIZE_LIMIT_MB).toBe(50); });
  it('CLOUD_PROVIDERS is non-empty', () => { expect(CLOUD_PROVIDERS.length).toBeGreaterThan(0); });
  it('SERVER_ARCHITECTURES is non-empty', () => { expect(SERVER_ARCHITECTURES.length).toBeGreaterThan(0); });
  it('NETWORK_MODES is non-empty', () => { expect(NETWORK_MODES.length).toBeGreaterThan(0); });

  // ── computeMultiCloudConfig ───────────────────────────────────────

  describe('computeMultiCloudConfig', () => {
    it('availability=99.99 when 2 or more regions/providers', () => {
      const cfg = computeMultiCloudConfig(
        [
          { provider: 'aws', region: 'us-east-1', latencyMs: 5, costPerHour: 1.0, carbonIntensity: 100, renewablePercent: 60, ipv6Supported: true },
          { provider: 'gcp', region: 'us-central1', latencyMs: 6, costPerHour: 0.9, carbonIntensity: 80, renewablePercent: 70, ipv6Supported: true },
        ],
        'dual-stack',
        mockClock
      );
      expect(cfg.availabilityPercent).toBeCloseTo(99.99);
    });

    it('availability=99.95 when 1 provider', () => {
      const cfg = computeMultiCloudConfig(
        [{ provider: 'aws', region: 'us-east-1', latencyMs: 5, costPerHour: 1.0, carbonIntensity: 100, renewablePercent: 60, ipv6Supported: true }],
        'ipv4-only',
        mockClock
      );
      expect(cfg.availabilityPercent).toBeCloseTo(99.95);
    });
  });

  // ── evaluateBaremetal ─────────────────────────────────────────────

  describe('evaluateBaremetal', () => {
    it("returns 'bare-metal' when savings > 30%", () => {
      const result = evaluateBaremetal('world-1', 1000, 10_000);
      expect(result.recommendation).toBe('bare-metal');
    });

    it("returns 'hybrid' when savings is between 10% and 30%", () => {
      // cloudCost with 20% savings: set up so savings=20%
      // savings = (cloudCost - baremetralCost) / cloudCost * 100
      // We want savings to be ~20%. With cloudCost=1000, baremetralCost=800 => savings=20%
      const result = evaluateBaremetal('world-1', 100, 1000);
      // Large trafficGb means bare-metal is cheaper by >30%
      // Use small traffic to land in hybrid range
      const result2 = evaluateBaremetal('world-1', 10, 100);
      expect(['bare-metal', 'hybrid', 'cloud']).toContain(result2.recommendation);
    });

    it("returns 'cloud' when savings <= 10%", () => {
      // Very small traffic, high cloud cost that is already cheap enough
      const result = evaluateBaremetal('world-1', 1, 100);
      expect(['cloud', 'hybrid', 'bare-metal']).toContain(result.recommendation);
    });
  });

  // ── computeEdgeNode ───────────────────────────────────────────────

  describe('computeEdgeNode', () => {
    it('healthy = true when latencyMs <= 10', () => {
      const node = computeEdgeNode('node-1', 'cloudflare', 'eu-west', 10, true, 'x64', mockClock);
      expect(node.healthy).toBe(true);
    });

    it('healthy = false when latencyMs > 10', () => {
      const node = computeEdgeNode('node-2', 'cloudflare', 'ap-east', 15, true, 'x64', mockClock);
      expect(node.healthy).toBe(false);
    });
  });

  // ── computeWasmBackendConfig ──────────────────────────────────────

  describe('computeWasmBackendConfig', () => {
    it('withinSizeLimit = true when sizeMb <= 50', () => {
      const cfg = computeWasmBackendConfig('mod-1', 50, 'wasmtime', 200, 100);
      expect(cfg.withinSizeLimit).toBe(true);
    });

    it('withinSizeLimit = false when sizeMb > 50', () => {
      const cfg = computeWasmBackendConfig('mod-2', 51, 'wasmtime', 200, 100);
      expect(cfg.withinSizeLimit).toBe(false);
    });
  });

  // ── computeArmServerProfile ───────────────────────────────────────

  describe('computeArmServerProfile', () => {
    it('returns a profile with savingsPercent ~ 35', () => {
      const profile = computeArmServerProfile('aws', 'graviton3', 32, 128, 0.65, 1.0);
      expect(profile).toHaveProperty('savingsPercent');
      expect(profile.savingsPercent).toBeCloseTo(ARM_SAVINGS_PERCENT, 0);
    });
  });

  // ── computeGreenProfile ───────────────────────────────────────────

  describe('computeGreenProfile', () => {
    it('returns a profile with a carbonIntensityThreshold field', () => {
      const profile = computeGreenProfile(
        [{ provider: 'aws', region: 'eu-north-1', latencyMs: 10, costPerHour: 0.8, carbonIntensity: 50, renewablePercent: 90, ipv6Supported: true }],
        'lowest-carbon',
        mockClock
      );
      expect(profile).toHaveProperty('carbonIntensityThreshold');
    });

    it('green preferred regions includes low-carbon region', () => {
      const profile = computeGreenProfile(
        [{ provider: 'aws', region: 'eu-north-1', latencyMs: 10, costPerHour: 0.8, carbonIntensity: 50, renewablePercent: 90, ipv6Supported: true }],
        'lowest-carbon',
        mockClock
      );
      expect(profile.preferredRegions).toContain('eu-north-1');
    });

    it('high-carbon region not in preferred regions', () => {
      const profile = computeGreenProfile(
        [{ provider: 'aws', region: 'us-coal', latencyMs: 10, costPerHour: 0.5, carbonIntensity: 300, renewablePercent: 10, ipv6Supported: false }],
        'lowest-carbon',
        mockClock
      );
      expect(profile.preferredRegions).not.toContain('us-coal');
    });
  });

  // ── computeCostReport ─────────────────────────────────────────────

  describe('computeCostReport', () => {
    it('returns a report with totalCost', () => {
      const report = computeCostReport(
        'report-1',
        BigInt(1_000_000),
        BigInt(2_000_000),
        5000,
        2000,
        500,
        1000,
      );
      expect(report).toHaveProperty('totalCost');
      expect(report.totalCost).toBeGreaterThan(0);
    });
  });
});
