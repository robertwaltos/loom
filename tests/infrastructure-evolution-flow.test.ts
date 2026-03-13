/**
 * Infrastructure Evolution — integration tests
 *
 * Multi-cloud, bare-metal, edge, WASM, ARM, green computing,
 * cost optimization, IPv6.
 */

import { describe, it, expect } from 'vitest';
import {
  computeMultiCloudConfig,
  evaluateBaremetal,
  computeEdgeNode,
  computeWasmBackendConfig,
  computeArmServerProfile,
  computeGreenProfile,
  computeCostReport,
  createInfraEvolutionEngine,
  EDGE_LATENCY_TARGET_MS,
  ARM_SAVINGS_PERCENT,
  WASM_MODULE_SIZE_LIMIT_MB,
  CARBON_INTENSITY_THRESHOLD_G_PER_KWH,
  type CloudRegion,
  type InfraEngineDeps,
} from '../fabrics/loom-core/src/infrastructure-evolution';

// ─── Helpers ────────────────────────────────────────────────────────

let idCounter = 0;
function stubClock() {
  return { now: () => BigInt(Date.now()) } as const;
}
function stubIds() {
  return { next: () => `id-${++idCounter}` } as const;
}

function awsRegion(overrides?: Partial<CloudRegion>): CloudRegion {
  return {
    provider: 'aws',
    region: 'us-east-1',
    latencyMs: 15,
    costPerHour: 2.5,
    carbonIntensity: 150,
    renewablePercent: 70,
    ipv6Supported: true,
    ...overrides,
  };
}

function gcpRegion(overrides?: Partial<CloudRegion>): CloudRegion {
  return {
    provider: 'gcp',
    region: 'europe-west1',
    latencyMs: 20,
    costPerHour: 2.3,
    carbonIntensity: 100,
    renewablePercent: 90,
    ipv6Supported: true,
    ...overrides,
  };
}

function azureRegion(overrides?: Partial<CloudRegion>): CloudRegion {
  return {
    provider: 'azure',
    region: 'westus2',
    latencyMs: 18,
    costPerHour: 2.4,
    carbonIntensity: 180,
    renewablePercent: 60,
    ipv6Supported: true,
    ...overrides,
  };
}

function createDeps(): InfraEngineDeps {
  const configs = new Map();
  const edges = new Map();
  const costs = new Map();
  let greenProfile: unknown = undefined;
  return {
    clock: stubClock(),
    ids: stubIds(),
    log: { info: () => {}, warn: () => {}, error: () => {} },
    events: { emit: () => {} },
    store: {
      saveCloudConfig: async (c: unknown) => { configs.set('current', c); },
      getCloudConfig: async () => configs.get('current'),
      saveEdgeNode: async (n: unknown) => { edges.set((n as { nodeId: string }).nodeId, n); },
      getEdgeNode: async (id: string) => edges.get(id),
      saveCostReport: async (r: unknown) => { costs.set((r as { reportId: string }).reportId, r); },
      getCostReport: async (id: string) => costs.get(id),
      saveGreenProfile: async (p: unknown) => { greenProfile = p; },
      getGreenProfile: async () => greenProfile as ReturnType<InfraEngineDeps['store']['getGreenProfile']> extends Promise<infer T> ? T : never,
    },
  };
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('Infrastructure Evolution System', () => {
  describe('Multi-Cloud Deployment', () => {
    it('two providers give 99.99% availability', () => {
      const config = computeMultiCloudConfig(
        [awsRegion(), gcpRegion()], 'dual-stack', stubClock(),
      );
      expect(config.availabilityPercent).toBe(99.99);
    });

    it('single provider gives 99.95% availability', () => {
      const config = computeMultiCloudConfig(
        [awsRegion()], 'dual-stack', stubClock(),
      );
      expect(config.availabilityPercent).toBe(99.95);
    });

    it('first provider is primary', () => {
      const config = computeMultiCloudConfig(
        [awsRegion(), gcpRegion(), azureRegion()], 'ipv6-only', stubClock(),
      );
      expect(config.primaryProvider).toBe('aws');
      expect(config.failoverProviders).toContain('gcp');
      expect(config.failoverProviders).toContain('azure');
    });

    it('respects network mode', () => {
      const config = computeMultiCloudConfig(
        [awsRegion()], 'ipv6-only', stubClock(),
      );
      expect(config.networkMode).toBe('ipv6-only');
    });
  });

  describe('Bare-Metal Evaluation', () => {
    it('recommends bare-metal for high-traffic savings', () => {
      const result = evaluateBaremetal('world-1', 50000, 10000);
      expect(result.recommendation).toBe('bare-metal');
      expect(result.savingsPercent).toBeGreaterThan(30);
    });

    it('recommends cloud for low-traffic', () => {
      const result = evaluateBaremetal('world-2', 100, 2000);
      expect(result.recommendation).toBe('cloud');
    });

    it('calculates savings percent', () => {
      const result = evaluateBaremetal('world-3', 10000, 5000);
      expect(result.savingsPercent).toBeDefined();
      expect(typeof result.savingsPercent).toBe('number');
    });
  });

  describe('Edge Computing', () => {
    it('healthy when latency <= 10ms', () => {
      const node = computeEdgeNode('n1', 'aws', 'us-east-1', 8, true, 'arm64', stubClock());
      expect(node.healthy).toBe(true);
      expect(node.latencyMs).toBe(8);
    });

    it('unhealthy when latency > 10ms', () => {
      const node = computeEdgeNode('n2', 'gcp', 'europe-west1', 15, true, 'x86_64', stubClock());
      expect(node.healthy).toBe(false);
    });

    it('preserves WASM support flag', () => {
      const node = computeEdgeNode('n3', 'aws', 'us-west-2', 5, true, 'wasm', stubClock());
      expect(node.wasmSupported).toBe(true);
      expect(node.architecture).toBe('wasm');
    });

    it('target latency is 10ms', () => {
      expect(EDGE_LATENCY_TARGET_MS).toBe(10);
    });
  });

  describe('WebAssembly Backend', () => {
    it('within size limit for small modules', () => {
      const config = computeWasmBackendConfig('m1', 30, 'wasmtime-15', 50, 1000);
      expect(config.withinSizeLimit).toBe(true);
      expect(config.architecture).toBe('wasm');
    });

    it('exceeds size limit for large modules', () => {
      const config = computeWasmBackendConfig('m2', 60, 'wasmtime-15', 100, 500);
      expect(config.withinSizeLimit).toBe(false);
    });

    it('size limit is 50MB', () => {
      expect(WASM_MODULE_SIZE_LIMIT_MB).toBe(50);
    });
  });

  describe('ARM Server Support', () => {
    it('calculates savings vs x86', () => {
      const profile = computeArmServerProfile('aws', 'c7g.xlarge', 4, 8, 0.65, 1.0);
      expect(profile.savingsPercent).toBe(35);
      expect(profile.architecture).toBe('arm64');
    });

    it('ARM savings target is ~35%', () => {
      expect(ARM_SAVINGS_PERCENT).toBe(35);
    });
  });

  describe('Green Computing', () => {
    it('carbon-aware enabled for lowest-carbon policy', () => {
      const profile = computeGreenProfile(
        [awsRegion(), gcpRegion()], 'lowest-carbon', stubClock(),
      );
      expect(profile.carbonAwareEnabled).toBe(true);
    });

    it('disabled for performance-first policy', () => {
      const profile = computeGreenProfile(
        [awsRegion()], 'performance-first', stubClock(),
      );
      expect(profile.carbonAwareEnabled).toBe(false);
    });

    it('filters regions by carbon intensity threshold', () => {
      const highCarbon: CloudRegion = { ...awsRegion(), carbonIntensity: 500, region: 'dirty-region' };
      const lowCarbon: CloudRegion = { ...gcpRegion(), carbonIntensity: 50, region: 'green-region' };
      const profile = computeGreenProfile([highCarbon, lowCarbon], 'lowest-carbon', stubClock());
      expect(profile.preferredRegions).toContain('green-region');
      expect(profile.preferredRegions).not.toContain('dirty-region');
    });

    it('carbon intensity threshold is 200 g/kWh', () => {
      expect(CARBON_INTENSITY_THRESHOLD_G_PER_KWH).toBe(200);
    });
  });

  describe('Cost Optimization', () => {
    it('sums total cost correctly', () => {
      const report = computeCostReport('r1', 0n, 1000n, 5000, 3000, 500, 1500);
      expect(report.totalCost).toBe(10000);
    });

    it('recommends reserved when on-demand > 40%', () => {
      const report = computeCostReport('r2', 0n, 1000n, 6000, 1000, 500, 500);
      const strategies = report.recommendations.map((r) => r.strategy);
      expect(strategies).toContain('reserved');
    });

    it('recommends spot when spot usage < 10%', () => {
      const report = computeCostReport('r3', 0n, 1000n, 6000, 1000, 100, 500);
      const strategies = report.recommendations.map((r) => r.strategy);
      expect(strategies).toContain('spot');
    });

    it('no recommendations when costs are balanced', () => {
      const report = computeCostReport('r4', 0n, 1000n, 1000, 3000, 3000, 3000);
      expect(report.recommendations.length).toBe(0);
    });
  });

  describe('Infrastructure Engine', () => {
    it('configureMultiCloud persists config', async () => {
      const deps = createDeps();
      const engine = createInfraEvolutionEngine(deps);
      const config = await engine.configureMultiCloud(
        [awsRegion(), gcpRegion()], 'dual-stack',
      );
      expect(config.availabilityPercent).toBe(99.99);
      expect(config.totalRegionCount).toBe(2);
    });

    it('deployEdgeNode returns node', async () => {
      const deps = createDeps();
      const engine = createInfraEvolutionEngine(deps);
      const node = await engine.deployEdgeNode('aws', 'us-east-1', 5, true, 'arm64');
      expect(node.healthy).toBe(true);
    });

    it('evaluateGreenCompute returns profile', async () => {
      const deps = createDeps();
      const engine = createInfraEvolutionEngine(deps);
      const profile = await engine.evaluateGreenCompute(
        [gcpRegion()], 'lowest-carbon',
      );
      expect(profile.carbonAwareEnabled).toBe(true);
    });

    it('generateCostReport returns report', async () => {
      const deps = createDeps();
      const engine = createInfraEvolutionEngine(deps);
      const report = await engine.generateCostReport(0n, 1000n, 5000, 2000, 500, 1000);
      expect(report.totalCost).toBe(8500);
    });
  });
});
