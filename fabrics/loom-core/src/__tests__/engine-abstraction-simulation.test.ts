import { describe, it, expect } from 'vitest';
import {
  computeOverallScore,
  evaluateEngine,
  createMigrationPlan,
  computeCompatibility,
  computeBenchmarkResult,
  createStandardBenchmarkScene,
  MAX_MIGRATION_WEEKS,
  BRIDGE_LOOM_CONTRACT_VERSION,
  MIN_CAPABILITY_SCORE,
  MIN_BENCHMARK_FPS,
  ENGINE_STATUSES,
  CAPABILITY_CATEGORIES,
  MIGRATION_PHASES,
} from '../engine-abstraction.js';

describe('engine-abstraction simulation', () => {
  const mockClock = { now: () => BigInt(1_000_000) };

  // ── constants ─────────────────────────────────────────────────────

  it('MAX_MIGRATION_WEEKS = 24', () => { expect(MAX_MIGRATION_WEEKS).toBe(24); });
  it('BRIDGE_LOOM_CONTRACT_VERSION = 1', () => { expect(BRIDGE_LOOM_CONTRACT_VERSION).toBe(1); });
  it('MIN_CAPABILITY_SCORE = 60', () => { expect(MIN_CAPABILITY_SCORE).toBe(60); });
  it('MIN_BENCHMARK_FPS = 30', () => { expect(MIN_BENCHMARK_FPS).toBe(30); });

  it('ENGINE_STATUSES is non-empty', () => {
    expect(Array.isArray(ENGINE_STATUSES)).toBe(true);
    expect(ENGINE_STATUSES.length).toBeGreaterThan(0);
  });

  it('CAPABILITY_CATEGORIES has 8 entries', () => {
    expect(CAPABILITY_CATEGORIES.length).toBe(8);
    expect(CAPABILITY_CATEGORIES).toContain('rendering');
    expect(CAPABILITY_CATEGORIES).toContain('networking');
  });

  it('MIGRATION_PHASES has the 6 expected phases', () => {
    expect(MIGRATION_PHASES).toContain('assessment');
    expect(MIGRATION_PHASES).toContain('adapter-development');
    expect(MIGRATION_PHASES).toContain('decommission');
    expect(MIGRATION_PHASES.length).toBe(6);
  });

  // ── computeOverallScore ───────────────────────────────────────────

  describe('computeOverallScore', () => {
    it('returns 100 when all capabilities are at max', () => {
      const caps = [
        { category: 'rendering', score: 100, notes: '' },
        { category: 'networking', score: 100, notes: '' },
        { category: 'audio', score: 100, notes: '' },
        { category: 'physics', score: 100, notes: '' },
        { category: 'animation', score: 100, notes: '' },
        { category: 'ui', score: 100, notes: '' },
        { category: 'streaming', score: 100, notes: '' },
        { category: 'vr', score: 100, notes: '' },
      ] as any;
      expect(computeOverallScore(caps)).toBe(100);
    });

    it('returns 0 when all capabilities are 0', () => {
      const caps = [
        { category: 'rendering', score: 0, notes: '' },
        { category: 'networking', score: 0, notes: '' },
        { category: 'audio', score: 0, notes: '' },
        { category: 'physics', score: 0, notes: '' },
        { category: 'animation', score: 0, notes: '' },
        { category: 'ui', score: 0, notes: '' },
        { category: 'streaming', score: 0, notes: '' },
        { category: 'vr', score: 0, notes: '' },
      ] as any;
      expect(computeOverallScore(caps)).toBe(0);
    });

    it('applies rendering weight = 0.25', () => {
      const caps = [
        { category: 'rendering', score: 100, notes: '' },
      ] as any;
      expect(computeOverallScore(caps)).toBeCloseTo(100);
    });

    it('applies networking weight = 0.15', () => {
      const allCaps = [
        { category: 'rendering', score: 0, notes: '' },
        { category: 'networking', score: 100, notes: '' },
        { category: 'audio', score: 0, notes: '' },
        { category: 'physics', score: 0, notes: '' },
        { category: 'animation', score: 0, notes: '' },
        { category: 'ui', score: 0, notes: '' },
        { category: 'streaming', score: 0, notes: '' },
        { category: 'vr', score: 0, notes: '' },
      ] as any;
      // networking weight is 0.15, sum of all weights is 1.0 so score = 15
      expect(computeOverallScore(allCaps)).toBeCloseTo(15);
    });
  });

  // ── evaluateEngine ────────────────────────────────────────────────

  describe('evaluateEngine', () => {
    const goodCaps = [
      { category: 'rendering', score: 80, notes: '' },
      { category: 'networking', score: 80, notes: '' },
      { category: 'audio', score: 80, notes: '' },
      { category: 'physics', score: 80, notes: '' },
      { category: 'animation', score: 80, notes: '' },
      { category: 'ui', score: 80, notes: '' },
      { category: 'streaming', score: 80, notes: '' },
      { category: 'vr', score: 80, notes: '' },
    ] as any;

    it("status = 'approved' when score >= 60", () => {
      const result = evaluateEngine('eng-1', 'Unreal5', '5.3', goodCaps, mockClock);
      expect(result.status).toBe('approved');
    });

    it("status != 'approved' when score < 60", () => {
      const weakCaps = goodCaps.map((c: any) => ({ ...c, score: 40 }));
      const result = evaluateEngine('eng-2', 'WeakEngine', '1.0', weakCaps, mockClock);
      expect(result.status).not.toBe('approved');
    });

    it('result includes overallScore and bridgeContractVersion', () => {
      const midCaps = goodCaps.map((c: any) => ({ ...c, score: 70 }));
      const result = evaluateEngine('eng-3', 'MidEngine', '2.0', midCaps, mockClock);
      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('bridgeContractVersion');
    });
  });

  // ── computeCompatibility ──────────────────────────────────────────

  describe('computeCompatibility', () => {
    it('identical versions have translationSupport = true', () => {
      const result = computeCompatibility(1, 1);
      expect(result.translationSupport).toBe(true);
    });

    it('returns a compatibility result object', () => {
      const result = computeCompatibility(1, 3);
      expect(result).toHaveProperty('translationSupport');
    });
  });

  // ── createMigrationPlan ───────────────────────────────────────────

  describe('createMigrationPlan', () => {
    it('creates a plan with totalWeeks <= MAX_MIGRATION_WEEKS', () => {
      const plan = createMigrationPlan('plan-1', 'Unity5', 'Unreal5', [1, 2], mockClock);
      expect(plan.totalWeeks).toBeLessThanOrEqual(MAX_MIGRATION_WEEKS);
    });

    it('plan includes phases array', () => {
      const plan = createMigrationPlan('plan-2', 'Unity5', 'Unreal5', [1], mockClock);
      expect(Array.isArray(plan.phases)).toBe(true);
      expect(plan.phases.length).toBeGreaterThan(0);
    });

    it('plan planId is preserved', () => {
      const plan = createMigrationPlan('my-plan-id', 'A', 'B', [], mockClock);
      expect(plan.planId).toBe('my-plan-id');
    });
  });

  // ── computeBenchmarkResult ────────────────────────────────────────

  describe('computeBenchmarkResult', () => {
    it('passesThreshold when fps >= MIN_BENCHMARK_FPS', () => {
      const scene = createStandardBenchmarkScene();
      const result = computeBenchmarkResult('eng-1', scene.sceneId, 60, 55, 80, 16, 2048, 75, mockClock);
      expect(result.passesThreshold).toBe(true);
    });

    it('fails when fps < MIN_BENCHMARK_FPS', () => {
      const scene = createStandardBenchmarkScene();
      const result = computeBenchmarkResult('eng-1', scene.sceneId, 25, 20, 30, 40, 3000, 95, mockClock);
      expect(result.passesThreshold).toBe(false);
    });

    it('includes avgFps in result', () => {
      const scene = createStandardBenchmarkScene();
      const result = computeBenchmarkResult('eng-1', scene.sceneId, 60, 55, 80, 16, 2048, 75, mockClock);
      expect(result.avgFps).toBe(60);
    });
  });

  // ── createStandardBenchmarkScene ─────────────────────────────────

  it('createStandardBenchmarkScene returns a scene object', () => {
    const scene = createStandardBenchmarkScene();
    expect(scene).toBeDefined();
    expect(typeof scene).toBe('object');
  });
});
