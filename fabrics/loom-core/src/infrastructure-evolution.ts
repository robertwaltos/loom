/**
 * Infrastructure Evolution System — multi-cloud, edge compute,
 * WASM backend, ARM support, green computing, cost optimization.
 *
 * The Loom orchestrates infrastructure across providers and
 * architectures to ensure vendor resilience, cost efficiency,
 * and environmental responsibility.
 *
 *   - Multi-cloud deployment: AWS + GCP + Azure strategy
 *   - Bare-metal evaluation: dedicated for highest-traffic worlds
 *   - Edge computing: game logic at CDN edge for < 10ms latency
 *   - WebAssembly backend: Rust → WASM for serverless scaling
 *   - ARM server support: Graviton/Ampere for 30-40% cost savings
 *   - Green computing: carbon-aware scheduling, renewable regions
 *   - Cost optimization: reserved instances, spot fleet, savings plans
 *   - IPv6 native: full dual-stack, IPv6-only option
 *
 * "Design for the ceiling."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface InfraClockPort {
  readonly now: () => bigint;
}

export interface InfraIdPort {
  readonly next: () => string;
}

export interface InfraLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface InfraEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface InfraStorePort {
  readonly saveCloudConfig: (config: MultiCloudConfig) => Promise<void>;
  readonly getCloudConfig: () => Promise<MultiCloudConfig | undefined>;
  readonly saveEdgeNode: (node: EdgeNode) => Promise<void>;
  readonly getEdgeNode: (nodeId: string) => Promise<EdgeNode | undefined>;
  readonly saveCostReport: (report: CostReport) => Promise<void>;
  readonly getCostReport: (reportId: string) => Promise<CostReport | undefined>;
  readonly saveGreenProfile: (profile: GreenComputeProfile) => Promise<void>;
  readonly getGreenProfile: () => Promise<GreenComputeProfile | undefined>;
}

// ─── Constants ──────────────────────────────────────────────────────

export const CLOUD_PROVIDERS = ['aws', 'gcp', 'azure'] as const;
export type CloudProvider = (typeof CLOUD_PROVIDERS)[number];

export const SERVER_ARCHITECTURES = ['x86_64', 'arm64', 'wasm'] as const;
export type ServerArchitecture = (typeof SERVER_ARCHITECTURES)[number];

export const NETWORK_MODES = ['dual-stack', 'ipv4-only', 'ipv6-only'] as const;
export type NetworkMode = (typeof NETWORK_MODES)[number];

export const INSTANCE_STRATEGIES = ['on-demand', 'reserved', 'spot', 'savings-plan'] as const;
export type InstanceStrategy = (typeof INSTANCE_STRATEGIES)[number];

export const EDGE_LATENCY_TARGET_MS = 10 as const;
export const ARM_SAVINGS_PERCENT = 35 as const;
export const MIN_AVAILABILITY_PERCENT = 99.95 as const;
export const CARBON_INTENSITY_THRESHOLD_G_PER_KWH = 200 as const;
export const WASM_MODULE_SIZE_LIMIT_MB = 50 as const;

// ─── Types ──────────────────────────────────────────────────────────

export interface CloudRegion {
  readonly provider: CloudProvider;
  readonly region: string;
  readonly latencyMs: number;
  readonly costPerHour: number;
  readonly carbonIntensity: number;
  readonly renewablePercent: number;
  readonly ipv6Supported: boolean;
}

export interface MultiCloudConfig {
  readonly primaryProvider: CloudProvider;
  readonly failoverProviders: readonly CloudProvider[];
  readonly regions: readonly CloudRegion[];
  readonly networkMode: NetworkMode;
  readonly totalRegionCount: number;
  readonly availabilityPercent: number;
  readonly createdAt: bigint;
}

export interface BaremetalEvaluation {
  readonly worldId: string;
  readonly monthlyTrafficGb: number;
  readonly currentCloudCost: number;
  readonly baremetalEstimate: number;
  readonly savingsPercent: number;
  readonly recommendation: 'cloud' | 'bare-metal' | 'hybrid';
}

export interface EdgeNode {
  readonly nodeId: string;
  readonly provider: CloudProvider;
  readonly region: string;
  readonly latencyMs: number;
  readonly wasmSupported: boolean;
  readonly architecture: ServerArchitecture;
  readonly healthy: boolean;
  readonly lastHealthCheck: bigint;
}

export interface WasmBackendConfig {
  readonly moduleId: string;
  readonly moduleSizeMb: number;
  readonly withinSizeLimit: boolean;
  readonly architecture: 'wasm';
  readonly runtimeVersion: string;
  readonly coldStartMs: number;
  readonly maxConcurrency: number;
}

export interface ArmServerProfile {
  readonly provider: CloudProvider;
  readonly instanceType: string;
  readonly architecture: 'arm64';
  readonly vCpus: number;
  readonly memoryGb: number;
  readonly costPerHour: number;
  readonly x86EquivalentCost: number;
  readonly savingsPercent: number;
}

export interface GreenComputeProfile {
  readonly carbonAwareEnabled: boolean;
  readonly preferredRegions: readonly string[];
  readonly carbonIntensityThreshold: number;
  readonly renewableTargetPercent: number;
  readonly currentCarbonScorePercent: number;
  readonly schedulingPolicy: 'lowest-carbon' | 'balanced' | 'performance-first';
  readonly evaluatedAt: bigint;
}

export interface CostReport {
  readonly reportId: string;
  readonly periodStart: bigint;
  readonly periodEnd: bigint;
  readonly onDemandCost: number;
  readonly reservedCost: number;
  readonly spotCost: number;
  readonly savingsPlanCost: number;
  readonly totalCost: number;
  readonly potentialSavings: number;
  readonly recommendations: readonly CostRecommendation[];
}

export interface CostRecommendation {
  readonly strategy: InstanceStrategy;
  readonly description: string;
  readonly estimatedSavings: number;
}

export interface InfraEngineDeps {
  readonly clock: InfraClockPort;
  readonly ids: InfraIdPort;
  readonly log: InfraLogPort;
  readonly events: InfraEventPort;
  readonly store: InfraStorePort;
}

// ─── Pure Functions ─────────────────────────────────────────────────

export function computeMultiCloudConfig(
  regions: readonly CloudRegion[],
  networkMode: NetworkMode,
  clock: InfraClockPort,
): MultiCloudConfig {
  const providers = [...new Set(regions.map((r) => r.provider))];
  const primary = providers[0] ?? 'aws';
  const failover = providers.filter((p) => p !== primary);

  const availability = providers.length >= 2
    ? 99.99
    : providers.length === 1
      ? 99.95
      : 0;

  return {
    primaryProvider: primary,
    failoverProviders: failover,
    regions,
    networkMode,
    totalRegionCount: regions.length,
    availabilityPercent: availability,
    createdAt: clock.now(),
  };
}

export function evaluateBaremetal(
  worldId: string,
  monthlyTrafficGb: number,
  currentCloudCost: number,
): BaremetalEvaluation {
  const baremetalBase = 2000;
  const perTbCost = 50;
  const baremetalEstimate = baremetalBase + (monthlyTrafficGb / 1000) * perTbCost;
  const savingsPercent = Math.round(((currentCloudCost - baremetalEstimate) / currentCloudCost) * 100);

  let recommendation: 'cloud' | 'bare-metal' | 'hybrid';
  if (savingsPercent > 30) {
    recommendation = 'bare-metal';
  } else if (savingsPercent > 10) {
    recommendation = 'hybrid';
  } else {
    recommendation = 'cloud';
  }

  return {
    worldId,
    monthlyTrafficGb,
    currentCloudCost,
    baremetalEstimate,
    savingsPercent,
    recommendation,
  };
}

export function computeEdgeNode(
  nodeId: string,
  provider: CloudProvider,
  region: string,
  latencyMs: number,
  wasmSupported: boolean,
  architecture: ServerArchitecture,
  clock: InfraClockPort,
): EdgeNode {
  return {
    nodeId,
    provider,
    region,
    latencyMs,
    wasmSupported,
    architecture,
    healthy: latencyMs <= EDGE_LATENCY_TARGET_MS,
    lastHealthCheck: clock.now(),
  };
}

export function computeWasmBackendConfig(
  moduleId: string,
  moduleSizeMb: number,
  runtimeVersion: string,
  coldStartMs: number,
  maxConcurrency: number,
): WasmBackendConfig {
  return {
    moduleId,
    moduleSizeMb,
    withinSizeLimit: moduleSizeMb <= WASM_MODULE_SIZE_LIMIT_MB,
    architecture: 'wasm',
    runtimeVersion,
    coldStartMs,
    maxConcurrency,
  };
}

export function computeArmServerProfile(
  provider: CloudProvider,
  instanceType: string,
  vCpus: number,
  memoryGb: number,
  costPerHour: number,
  x86EquivalentCost: number,
): ArmServerProfile {
  const savingsPercent = Math.round(((x86EquivalentCost - costPerHour) / x86EquivalentCost) * 100);
  return {
    provider,
    instanceType,
    architecture: 'arm64',
    vCpus,
    memoryGb,
    costPerHour,
    x86EquivalentCost,
    savingsPercent,
  };
}

export function computeGreenProfile(
  regions: readonly CloudRegion[],
  schedulingPolicy: 'lowest-carbon' | 'balanced' | 'performance-first',
  clock: InfraClockPort,
): GreenComputeProfile {
  const greenRegions = regions.filter(
    (r) => r.carbonIntensity < CARBON_INTENSITY_THRESHOLD_G_PER_KWH,
  );
  const avgRenewable = regions.length > 0
    ? regions.reduce((s, r) => s + r.renewablePercent, 0) / regions.length
    : 0;

  return {
    carbonAwareEnabled: schedulingPolicy !== 'performance-first',
    preferredRegions: greenRegions.map((r) => r.region),
    carbonIntensityThreshold: CARBON_INTENSITY_THRESHOLD_G_PER_KWH,
    renewableTargetPercent: 80,
    currentCarbonScorePercent: Math.round(avgRenewable),
    schedulingPolicy,
    evaluatedAt: clock.now(),
  };
}

export function computeCostReport(
  reportId: string,
  periodStart: bigint,
  periodEnd: bigint,
  onDemandCost: number,
  reservedCost: number,
  spotCost: number,
  savingsPlanCost: number,
): CostReport {
  const totalCost = onDemandCost + reservedCost + spotCost + savingsPlanCost;

  const recommendations: CostRecommendation[] = [];
  if (onDemandCost > totalCost * 0.4) {
    recommendations.push({
      strategy: 'reserved',
      description: 'Convert high-usage on-demand instances to reserved for predictable workloads',
      estimatedSavings: Math.round(onDemandCost * 0.3),
    });
  }
  if (spotCost < totalCost * 0.1) {
    recommendations.push({
      strategy: 'spot',
      description: 'Increase spot instance usage for load testing and batch processing',
      estimatedSavings: Math.round(onDemandCost * 0.15),
    });
  }

  const potentialSavings = recommendations.reduce((s, r) => s + r.estimatedSavings, 0);

  return {
    reportId,
    periodStart,
    periodEnd,
    onDemandCost,
    reservedCost,
    spotCost,
    savingsPlanCost,
    totalCost,
    potentialSavings,
    recommendations,
  };
}

// ─── Engine ─────────────────────────────────────────────────────────

export function createInfraEvolutionEngine(deps: InfraEngineDeps) {
  return {
    async configureMultiCloud(
      regions: readonly CloudRegion[],
      networkMode: NetworkMode,
    ): Promise<MultiCloudConfig> {
      const config = computeMultiCloudConfig(regions, networkMode, deps.clock);
      await deps.store.saveCloudConfig(config);
      deps.log.info('multi-cloud-configured', { providers: [config.primaryProvider, ...config.failoverProviders], regions: config.totalRegionCount });
      return config;
    },

    async deployEdgeNode(
      provider: CloudProvider,
      region: string,
      latencyMs: number,
      wasmSupported: boolean,
      architecture: ServerArchitecture,
    ): Promise<EdgeNode> {
      const id = deps.ids.next();
      const node = computeEdgeNode(id, provider, region, latencyMs, wasmSupported, architecture, deps.clock);
      await deps.store.saveEdgeNode(node);
      deps.log.info('edge-node-deployed', { nodeId: id, region, healthy: node.healthy });
      return node;
    },

    async evaluateGreenCompute(
      regions: readonly CloudRegion[],
      schedulingPolicy: 'lowest-carbon' | 'balanced' | 'performance-first',
    ): Promise<GreenComputeProfile> {
      const profile = computeGreenProfile(regions, schedulingPolicy, deps.clock);
      await deps.store.saveGreenProfile(profile);
      deps.log.info('green-compute-evaluated', { carbonScore: profile.currentCarbonScorePercent, preferred: profile.preferredRegions.length });
      return profile;
    },

    async generateCostReport(
      periodStart: bigint,
      periodEnd: bigint,
      onDemandCost: number,
      reservedCost: number,
      spotCost: number,
      savingsPlanCost: number,
    ): Promise<CostReport> {
      const id = deps.ids.next();
      const report = computeCostReport(id, periodStart, periodEnd, onDemandCost, reservedCost, spotCost, savingsPlanCost);
      await deps.store.saveCostReport(report);
      deps.log.info('cost-report-generated', { total: report.totalCost, savings: report.potentialSavings });
      return report;
    },
  };
}
