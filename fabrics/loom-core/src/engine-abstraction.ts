/**
 * Engine Abstraction System — rendering engine as a replaceable plugin.
 *
 * The Loom treats every rendering engine as a swappable adapter
 * behind the Bridge Loom port contract. This module manages engine
 * registration, capability evaluation, migration planning, backward
 * compatibility, and cross-engine performance benchmarking.
 *
 *   - Engine registry: register / unregister rendering engine adapters
 *   - Capability evaluation: score engines for the 600-world scale
 *   - Migration planner: < 6-month swap for any rendering engine
 *   - Backward compatibility: old client protocol support during transition
 *   - Benchmarking: standardized scene comparison across engines
 *
 * "Technology changes; the world endures."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface EaClockPort {
  readonly now: () => bigint;
}

export interface EaIdPort {
  readonly next: () => string;
}

export interface EaLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface EaEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface EaStorePort {
  readonly saveEngineEntry: (entry: EngineRegistryEntry) => Promise<void>;
  readonly getEngineEntry: (engineId: string) => Promise<EngineRegistryEntry | undefined>;
  readonly listEngineEntries: () => Promise<readonly EngineRegistryEntry[]>;
  readonly saveMigrationPlan: (plan: MigrationPlan) => Promise<void>;
  readonly getMigrationPlan: (planId: string) => Promise<MigrationPlan | undefined>;
  readonly saveBenchmarkResult: (result: BenchmarkResult) => Promise<void>;
  readonly getBenchmarkResult: (engineId: string, sceneId: string) => Promise<BenchmarkResult | undefined>;
}

// ─── Constants ──────────────────────────────────────────────────────

export const ENGINE_STATUSES = ['registered', 'evaluating', 'approved', 'active', 'deprecated', 'retired'] as const;
export type EngineStatus = (typeof ENGINE_STATUSES)[number];

export const CAPABILITY_CATEGORIES = [
  'rendering',
  'networking',
  'audio',
  'physics',
  'animation',
  'ui',
  'streaming',
  'vr',
] as const;
export type CapabilityCategory = (typeof CAPABILITY_CATEGORIES)[number];

export const MIGRATION_PHASES = [
  'assessment',
  'adapter-development',
  'integration-testing',
  'parallel-run',
  'gradual-rollout',
  'decommission',
] as const;
export type MigrationPhase = (typeof MIGRATION_PHASES)[number];

const PHASE_DURATION_WEEKS: Readonly<Record<MigrationPhase, number>> = {
  'assessment': 2,
  'adapter-development': 8,
  'integration-testing': 4,
  'parallel-run': 4,
  'gradual-rollout': 4,
  'decommission': 2,
};

export const MAX_MIGRATION_WEEKS = 24 as const;
export const BRIDGE_LOOM_CONTRACT_VERSION = 1 as const;
export const MIN_CAPABILITY_SCORE = 60 as const;
export const MIN_BENCHMARK_FPS = 30 as const;

const CAPABILITY_WEIGHTS: Readonly<Record<CapabilityCategory, number>> = {
  rendering: 0.25,
  networking: 0.15,
  audio: 0.10,
  physics: 0.10,
  animation: 0.15,
  ui: 0.05,
  streaming: 0.10,
  vr: 0.10,
};

// ─── Types ──────────────────────────────────────────────────────────

export interface CapabilityScore {
  readonly category: CapabilityCategory;
  readonly score: number;        // 0-100
  readonly notes: string;
}

export interface EngineRegistryEntry {
  readonly engineId: string;
  readonly name: string;
  readonly version: string;
  readonly status: EngineStatus;
  readonly bridgeContractVersion: number;
  readonly capabilities: readonly CapabilityScore[];
  readonly overallScore: number;
  readonly registeredAt: bigint;
  readonly lastEvaluatedAt: bigint;
}

export interface MigrationPlan {
  readonly planId: string;
  readonly sourceEngineId: string;
  readonly targetEngineId: string;
  readonly currentPhase: MigrationPhase;
  readonly phases: readonly MigrationPlanPhase[];
  readonly totalWeeks: number;
  readonly withinBudget: boolean;
  readonly compatClientsSupported: readonly number[];
  readonly createdAt: bigint;
}

export interface MigrationPlanPhase {
  readonly phase: MigrationPhase;
  readonly durationWeeks: number;
  readonly description: string;
  readonly complete: boolean;
}

export interface CompatibilityRecord {
  readonly sourceVersion: number;
  readonly targetVersion: number;
  readonly translationSupport: boolean;
  readonly degradationNotes: string;
}

export interface BenchmarkScene {
  readonly sceneId: string;
  readonly name: string;
  readonly entityCount: number;
  readonly lightCount: number;
  readonly particleSystemCount: number;
  readonly triangleBudget: number;
}

export interface BenchmarkResult {
  readonly engineId: string;
  readonly sceneId: string;
  readonly avgFps: number;
  readonly minFps: number;
  readonly maxFps: number;
  readonly frameTimeP99Ms: number;
  readonly memoryUsageMb: number;
  readonly gpuUtilizationPercent: number;
  readonly passesThreshold: boolean;
  readonly measuredAt: bigint;
}

export interface EaEngineDeps {
  readonly clock: EaClockPort;
  readonly ids: EaIdPort;
  readonly log: EaLogPort;
  readonly events: EaEventPort;
  readonly store: EaStorePort;
}

// ─── Pure Functions ─────────────────────────────────────────────────

export function computeOverallScore(
  capabilities: readonly CapabilityScore[],
): number {
  let total = 0;
  let weightSum = 0;
  for (const cap of capabilities) {
    const weight = CAPABILITY_WEIGHTS[cap.category] ?? 0;
    total += cap.score * weight;
    weightSum += weight;
  }
  if (weightSum === 0) return 0;
  return Math.round((total / weightSum) * 100) / 100;
}

export function evaluateEngine(
  engineId: string,
  name: string,
  version: string,
  capabilities: readonly CapabilityScore[],
  clock: EaClockPort,
): EngineRegistryEntry {
  const overall = computeOverallScore(capabilities);
  const now = clock.now();
  const status: EngineStatus = overall >= MIN_CAPABILITY_SCORE ? 'approved' : 'evaluating';
  return {
    engineId,
    name,
    version,
    status,
    bridgeContractVersion: BRIDGE_LOOM_CONTRACT_VERSION,
    capabilities,
    overallScore: overall,
    registeredAt: now,
    lastEvaluatedAt: now,
  };
}

export function createMigrationPlan(
  planId: string,
  sourceEngineId: string,
  targetEngineId: string,
  supportedClientVersions: readonly number[],
  clock: EaClockPort,
): MigrationPlan {
  const phases: MigrationPlanPhase[] = MIGRATION_PHASES.map((phase) => ({
    phase,
    durationWeeks: PHASE_DURATION_WEEKS[phase],
    description: describePhase(phase, sourceEngineId, targetEngineId),
    complete: false,
  }));

  const totalWeeks = phases.reduce((s, p) => s + p.durationWeeks, 0);

  return {
    planId,
    sourceEngineId,
    targetEngineId,
    currentPhase: 'assessment',
    phases,
    totalWeeks,
    withinBudget: totalWeeks <= MAX_MIGRATION_WEEKS,
    compatClientsSupported: [...supportedClientVersions],
    createdAt: clock.now(),
  };
}

function describePhase(
  phase: MigrationPhase,
  src: string,
  tgt: string,
): string {
  const descriptions: Record<MigrationPhase, string> = {
    'assessment': `Evaluate ${tgt} against Bridge Loom contract requirements`,
    'adapter-development': `Build Bridge Loom adapter for ${tgt}`,
    'integration-testing': `Validate all 600+ worlds render correctly on ${tgt}`,
    'parallel-run': `Run ${src} and ${tgt} side-by-side in production`,
    'gradual-rollout': `Shift traffic from ${src} to ${tgt} incrementally`,
    'decommission': `Retire ${src} adapter, archive documentation`,
  };
  return descriptions[phase];
}

export function computeCompatibility(
  sourceVersion: number,
  targetVersion: number,
): CompatibilityRecord {
  const sameVersion = sourceVersion === targetVersion;
  const oneApart = Math.abs(targetVersion - sourceVersion) === 1;
  return {
    sourceVersion,
    targetVersion,
    translationSupport: sameVersion || oneApart,
    degradationNotes: sameVersion
      ? 'Full compatibility'
      : oneApart
        ? 'Minor feature differences, protocol translation supported'
        : `Major version gap (${Math.abs(targetVersion - sourceVersion)}), translation not guaranteed`,
  };
}

export function computeBenchmarkResult(
  engineId: string,
  sceneId: string,
  avgFps: number,
  minFps: number,
  maxFps: number,
  frameTimeP99Ms: number,
  memoryUsageMb: number,
  gpuUtilizationPercent: number,
  clock: EaClockPort,
): BenchmarkResult {
  return {
    engineId,
    sceneId,
    avgFps,
    minFps,
    maxFps,
    frameTimeP99Ms,
    memoryUsageMb,
    gpuUtilizationPercent,
    passesThreshold: avgFps >= MIN_BENCHMARK_FPS && minFps >= MIN_BENCHMARK_FPS * 0.8,
    measuredAt: clock.now(),
  };
}

export function createStandardBenchmarkScene(): BenchmarkScene {
  return {
    sceneId: 'loom-standard-v1',
    name: 'Loom Standard Benchmark',
    entityCount: 10000,
    lightCount: 128,
    particleSystemCount: 64,
    triangleBudget: 5_000_000,
  };
}

// ─── Engine ─────────────────────────────────────────────────────────

export function createEngineAbstractionEngine(deps: EaEngineDeps) {
  return {
    async registerEngine(
      name: string,
      version: string,
      capabilities: readonly CapabilityScore[],
    ): Promise<EngineRegistryEntry> {
      const id = deps.ids.next();
      const entry = evaluateEngine(id, name, version, capabilities, deps.clock);
      await deps.store.saveEngineEntry(entry);
      deps.log.info('engine-registered', { engineId: id, name, overallScore: entry.overallScore });
      return entry;
    },

    async planMigration(
      sourceEngineId: string,
      targetEngineId: string,
      supportedClientVersions: readonly number[],
    ): Promise<MigrationPlan> {
      const planId = deps.ids.next();
      const plan = createMigrationPlan(planId, sourceEngineId, targetEngineId, supportedClientVersions, deps.clock);
      await deps.store.saveMigrationPlan(plan);
      deps.log.info('migration-plan-created', { planId, totalWeeks: plan.totalWeeks, withinBudget: plan.withinBudget });
      return plan;
    },

    async runBenchmark(
      engineId: string,
      sceneId: string,
      avgFps: number,
      minFps: number,
      maxFps: number,
      frameTimeP99Ms: number,
      memoryUsageMb: number,
      gpuUtilizationPercent: number,
    ): Promise<BenchmarkResult> {
      const result = computeBenchmarkResult(
        engineId, sceneId, avgFps, minFps, maxFps,
        frameTimeP99Ms, memoryUsageMb, gpuUtilizationPercent,
        deps.clock,
      );
      await deps.store.saveBenchmarkResult(result);
      deps.log.info('benchmark-completed', { engineId, sceneId, avgFps, passes: result.passesThreshold });
      return result;
    },

    async getEngine(engineId: string): Promise<EngineRegistryEntry | undefined> {
      return deps.store.getEngineEntry(engineId);
    },

    async listEngines(): Promise<readonly EngineRegistryEntry[]> {
      return deps.store.listEngineEntries();
    },
  };
}
