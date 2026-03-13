/**
 * Engine Abstraction — integration tests
 *
 * Engine registration, capability evaluation, migration planning,
 * backward compatibility, performance benchmarks.
 */

import { describe, it, expect } from 'vitest';
import {
  computeOverallScore,
  evaluateEngine,
  createMigrationPlan,
  computeCompatibility,
  computeBenchmarkResult,
  createStandardBenchmarkScene,
  createEngineAbstractionEngine,
  MIN_CAPABILITY_SCORE,
  MIN_BENCHMARK_FPS,
  MAX_MIGRATION_WEEKS,
  MIGRATION_PHASES,
  type CapabilityScore,
  type EaEngineDeps,
} from '../fabrics/loom-core/src/engine-abstraction';

// ─── Helpers ────────────────────────────────────────────────────────

let idCounter = 0;
function stubClock() {
  return { now: () => BigInt(Date.now()) } as const;
}
function stubIds() {
  return { next: () => `id-${++idCounter}` } as const;
}

function highCaps(): readonly CapabilityScore[] {
  return [
    { category: 'rendering', score: 90, notes: '' },
    { category: 'networking', score: 85, notes: '' },
    { category: 'audio', score: 80, notes: '' },
    { category: 'physics', score: 75, notes: '' },
    { category: 'animation', score: 88, notes: '' },
    { category: 'ui', score: 70, notes: '' },
    { category: 'streaming', score: 82, notes: '' },
    { category: 'vr', score: 78, notes: '' },
  ];
}

function lowCaps(): readonly CapabilityScore[] {
  return [
    { category: 'rendering', score: 40, notes: '' },
    { category: 'networking', score: 30, notes: '' },
    { category: 'audio', score: 50, notes: '' },
    { category: 'physics', score: 35, notes: '' },
    { category: 'animation', score: 45, notes: '' },
    { category: 'ui', score: 40, notes: '' },
    { category: 'streaming', score: 30, notes: '' },
    { category: 'vr', score: 20, notes: '' },
  ];
}

function createDeps(): EaEngineDeps {
  const engines = new Map();
  const plans = new Map();
  const benchmarks = new Map();
  return {
    clock: stubClock(),
    ids: stubIds(),
    log: { info: () => {}, warn: () => {}, error: () => {} },
    events: { emit: () => {} },
    store: {
      saveEngineEntry: async (e: unknown) => { engines.set((e as { engineId: string }).engineId, e); },
      getEngineEntry: async (id: string) => engines.get(id),
      listEngineEntries: async () => [...engines.values()],
      saveMigrationPlan: async (p: unknown) => { plans.set((p as { planId: string }).planId, p); },
      getMigrationPlan: async (id: string) => plans.get(id),
      saveBenchmarkResult: async (r: unknown) => { benchmarks.set(`${(r as { engineId: string }).engineId}:${(r as { sceneId: string }).sceneId}`, r); },
      getBenchmarkResult: async (eId: string, sId: string) => benchmarks.get(`${eId}:${sId}`),
    },
  };
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('Engine Abstraction System', () => {
  describe('Capability Scoring', () => {
    it('high caps produce score above threshold', () => {
      const score = computeOverallScore(highCaps());
      expect(score).toBeGreaterThanOrEqual(MIN_CAPABILITY_SCORE);
    });

    it('low caps produce score below threshold', () => {
      const score = computeOverallScore(lowCaps());
      expect(score).toBeLessThan(MIN_CAPABILITY_SCORE);
    });

    it('empty capabilities produce zero', () => {
      expect(computeOverallScore([])).toBe(0);
    });

    it('single category returns that score', () => {
      const score = computeOverallScore([
        { category: 'rendering', score: 80, notes: '' },
      ]);
      expect(score).toBe(80);
    });
  });

  describe('Engine Evaluation', () => {
    it('approved status for high score', () => {
      const entry = evaluateEngine('e1', 'UE5', '5.4', highCaps(), stubClock());
      expect(entry.status).toBe('approved');
      expect(entry.overallScore).toBeGreaterThanOrEqual(MIN_CAPABILITY_SCORE);
    });

    it('evaluating status for low score', () => {
      const entry = evaluateEngine('e2', 'CustomEngine', '0.1', lowCaps(), stubClock());
      expect(entry.status).toBe('evaluating');
    });

    it('sets bridge contract version', () => {
      const entry = evaluateEngine('e3', 'Godot', '4.3', highCaps(), stubClock());
      expect(entry.bridgeContractVersion).toBe(1);
    });
  });

  describe('Migration Planning', () => {
    it('creates plan with all 6 phases', () => {
      const plan = createMigrationPlan('p1', 'ue5', 'godot', [1, 2], stubClock());
      expect(plan.phases.length).toBe(MIGRATION_PHASES.length);
    });

    it('total weeks within 24-week budget', () => {
      const plan = createMigrationPlan('p1', 'ue5', 'godot', [1], stubClock());
      expect(plan.totalWeeks).toBeLessThanOrEqual(MAX_MIGRATION_WEEKS);
      expect(plan.withinBudget).toBe(true);
    });

    it('starts at assessment phase', () => {
      const plan = createMigrationPlan('p1', 'ue5', 'custom', [1], stubClock());
      expect(plan.currentPhase).toBe('assessment');
    });

    it('preserves supported client versions', () => {
      const plan = createMigrationPlan('p1', 'ue5', 'custom', [1, 2, 3], stubClock());
      expect(plan.compatClientsSupported).toEqual([1, 2, 3]);
    });

    it('no phase starts as complete', () => {
      const plan = createMigrationPlan('p1', 'ue5', 'custom', [], stubClock());
      for (const phase of plan.phases) {
        expect(phase.complete).toBe(false);
      }
    });
  });

  describe('Backward Compatibility', () => {
    it('same version is fully compatible', () => {
      const compat = computeCompatibility(1, 1);
      expect(compat.translationSupport).toBe(true);
      expect(compat.degradationNotes).toBe('Full compatibility');
    });

    it('one version apart supports translation', () => {
      const compat = computeCompatibility(1, 2);
      expect(compat.translationSupport).toBe(true);
    });

    it('two versions apart is not guaranteed', () => {
      const compat = computeCompatibility(1, 3);
      expect(compat.translationSupport).toBe(false);
      expect(compat.degradationNotes).toContain('Major version gap');
    });
  });

  describe('Benchmarking', () => {
    it('passes with good fps', () => {
      const result = computeBenchmarkResult(
        'e1', 'scene-1', 60, 45, 90, 16, 2048, 80, stubClock(),
      );
      expect(result.passesThreshold).toBe(true);
    });

    it('fails with low avg fps', () => {
      const result = computeBenchmarkResult(
        'e1', 'scene-1', 20, 15, 30, 50, 2048, 80, stubClock(),
      );
      expect(result.passesThreshold).toBe(false);
    });

    it('fails with low min fps', () => {
      const result = computeBenchmarkResult(
        'e1', 'scene-1', 60, 20, 90, 16, 2048, 80, stubClock(),
      );
      expect(result.passesThreshold).toBe(false);
    });

    it('standard scene has expected parameters', () => {
      const scene = createStandardBenchmarkScene();
      expect(scene.entityCount).toBe(10000);
      expect(scene.lightCount).toBe(128);
      expect(scene.triangleBudget).toBe(5_000_000);
    });

    it('min fps threshold is 80% of target', () => {
      const result = computeBenchmarkResult(
        'e1', 'scene-1', 35, MIN_BENCHMARK_FPS * 0.8, 50, 28, 2048, 80, stubClock(),
      );
      expect(result.passesThreshold).toBe(true);
    });
  });

  describe('Engine Abstraction Engine', () => {
    it('registerEngine persists and returns entry', async () => {
      const deps = createDeps();
      const engine = createEngineAbstractionEngine(deps);
      const entry = await engine.registerEngine('UE5', '5.4', highCaps());
      expect(entry.name).toBe('UE5');
      expect(entry.status).toBe('approved');
      const fetched = await engine.getEngine(entry.engineId);
      expect(fetched).toBeDefined();
    });

    it('planMigration creates valid plan', async () => {
      const deps = createDeps();
      const engine = createEngineAbstractionEngine(deps);
      const plan = await engine.planMigration('ue5', 'godot', [1, 2]);
      expect(plan.withinBudget).toBe(true);
      expect(plan.phases.length).toBe(6);
    });

    it('runBenchmark persists result', async () => {
      const deps = createDeps();
      const engine = createEngineAbstractionEngine(deps);
      const result = await engine.runBenchmark('e1', 'scene-1', 60, 45, 90, 16, 2048, 80);
      expect(result.passesThreshold).toBe(true);
    });

    it('listEngines returns all registered', async () => {
      const deps = createDeps();
      const engine = createEngineAbstractionEngine(deps);
      await engine.registerEngine('UE5', '5.4', highCaps());
      await engine.registerEngine('Godot', '4.3', highCaps());
      const list = await engine.listEngines();
      expect(list.length).toBe(2);
    });
  });
});
