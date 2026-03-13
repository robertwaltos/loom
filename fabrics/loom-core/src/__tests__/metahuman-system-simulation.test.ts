import { describe, it, expect } from 'vitest';
import {
  createDefaultPresetLibrary,
  blendPresets,
  computeBodyAnimation,
  profileGpuPerformance,
  computeStreamingLod,
  computeStreamingPriority,
  computeStreamingState,
  createLiveLinkSource,
  bindLiveLinkToEntity,
  AGE_RANGES,
  BODY_TYPES,
  ETHNICITY_BASES,
  PERSONALITY_IDLES,
  GESTURE_TYPES,
  STREAMING_LODS,
} from '../metahuman-system.js';

describe('metahuman-system simulation', () => {
  const mockClock = { now: () => BigInt(1_000_000) };
  const mockIds = { next: (() => { let i = 0; return () => `mh-${++i}`; })() };

  // ── constants ─────────────────────────────────────────────────────

  it('STREAMING_LODS = [full, head-only, simplified, silhouette]', () => {
    expect(STREAMING_LODS).toEqual(['full', 'head-only', 'simplified', 'silhouette']);
  });

  it('AGE_RANGES is non-empty', () => {
    expect(Array.isArray(AGE_RANGES)).toBe(true);
    expect(AGE_RANGES.length).toBeGreaterThan(0);
  });

  it('BODY_TYPES is non-empty', () => {
    expect(BODY_TYPES.length).toBeGreaterThan(0);
  });

  it('ETHNICITY_BASES is non-empty', () => {
    expect(ETHNICITY_BASES.length).toBeGreaterThan(0);
  });

  it('PERSONALITY_IDLES is non-empty', () => {
    expect(PERSONALITY_IDLES.length).toBeGreaterThan(0);
  });

  it('GESTURE_TYPES is non-empty', () => {
    expect(GESTURE_TYPES.length).toBeGreaterThan(0);
  });

  // ── createDefaultPresetLibrary ────────────────────────────────────

  describe('createDefaultPresetLibrary', () => {
    it('creates 52 default presets', () => {
      const lib = createDefaultPresetLibrary(mockIds);
      expect(lib.length).toBe(52);
    });

    it('each preset has a presetId field', () => {
      const lib = createDefaultPresetLibrary(mockIds);
      expect(lib[0]).toHaveProperty('presetId');
    });

    it('each preset has a name field', () => {
      const lib = createDefaultPresetLibrary(mockIds);
      expect(typeof lib[0].name).toBe('string');
    });
  });

  // ── blendPresets ──────────────────────────────────────────────────

  describe('blendPresets', () => {
    it('returns a MetaHumanInstance with instanceId', () => {
      const lib = createDefaultPresetLibrary(mockIds);
      const blended = blendPresets(lib[0], lib[1], 0.5, mockIds, 'entity-1', mockClock);
      expect(blended).toHaveProperty('instanceId');
    });

    it('weight=0 uses first preset as base', () => {
      const lib = createDefaultPresetLibrary(mockIds);
      const blended = blendPresets(lib[0], lib[1], 0, mockIds, 'entity-1', mockClock);
      expect(blended.basePresetId).toBe(lib[0].presetId);
    });
  });

  // ── computeBodyAnimation ──────────────────────────────────────────

  describe('computeBodyAnimation', () => {
    it('returns an animation state with personalityIdle field', () => {
      const anim = computeBodyAnimation('char-1', 'relaxed', null, 0, [0, 0, 0] as const, 0.5, mockClock);
      expect(anim).toHaveProperty('personalityIdle');
      expect(anim.personalityIdle).toBe('relaxed');
    });
  });

  // ── profileGpuPerformance ─────────────────────────────────────────

  describe('profileGpuPerformance', () => {
    it('low tier budget = 4.0ms', () => {
      const profile = profileGpuPerformance('world-1', 'low', 10, 5, 5, 2.0, mockClock);
      expect(profile.budgetMs).toBeCloseTo(4.0);
    });

    it('medium tier budget = 3.0ms', () => {
      const profile = profileGpuPerformance('world-1', 'medium', 10, 5, 5, 2.0, mockClock);
      expect(profile.budgetMs).toBeCloseTo(3.0);
    });

    it('high tier budget = 2.0ms', () => {
      const profile = profileGpuPerformance('world-1', 'high', 10, 5, 5, 1.5, mockClock);
      expect(profile.budgetMs).toBeCloseTo(2.0);
    });

    it('ultra tier budget = 1.5ms', () => {
      const profile = profileGpuPerformance('world-1', 'ultra', 10, 5, 5, 1.0, mockClock);
      expect(profile.budgetMs).toBeCloseTo(1.5);
    });

    it('withinBudget is true when gpuTimeMs <= budgetMs', () => {
      const profile = profileGpuPerformance('world-1', 'medium', 5, 3, 2, 2.5, mockClock);
      expect(profile.withinBudget).toBe(true);
    });
  });

  // ── computeStreamingLod ───────────────────────────────────────────

  describe('computeStreamingLod', () => {
    it('close distance returns full lod', () => {
      const lod = computeStreamingLod(1);
      expect(lod).toBe('full');
    });

    it('far distance returns silhouette', () => {
      const lod = computeStreamingLod(10_000);
      expect(lod).toBe('silhouette');
    });

    it('returns a value from STREAMING_LODS', () => {
      const lod = computeStreamingLod(500);
      expect(STREAMING_LODS).toContain(lod);
    });
  });

  // ── computeStreamingPriority ──────────────────────────────────────

  describe('computeStreamingPriority', () => {
    it('returns higher priority for closer distance', () => {
      const near = computeStreamingPriority(10, true, false);
      const far = computeStreamingPriority(1000, true, false);
      expect(near).toBeGreaterThan(far);
    });

    it('conversation multiplies priority', () => {
      const base = computeStreamingPriority(10, false, false);
      const inConvo = computeStreamingPriority(10, false, true);
      expect(inConvo).toBeGreaterThan(base);
    });
  });

  // ── computeStreamingState ────────────────────────────────────────

  describe('computeStreamingState', () => {
    it('returns a state with priority and loadProgress', () => {
      const state = computeStreamingState('c1', 100, ['asset-a'], 5, false, false, mockClock);
      expect(state).toHaveProperty('priority');
      expect(state).toHaveProperty('loadProgress');
      expect(state.loadProgress).toBeCloseTo(0.2);
    });

    it('full lod when distance < 10', () => {
      const state = computeStreamingState('c1', 5, [], 0, false, false, mockClock);
      expect(state.currentLod).toBe('full');
    });
  });

  // ── createLiveLinkSource / bindLiveLinkToEntity ───────────────────

  describe('LiveLink', () => {
    it('createLiveLinkSource returns a source with sourceId', () => {
      const source = createLiveLinkSource('MotionCap-Rig', 'facial-capture', '192.168.1.10', 8765, 60, mockIds, mockClock);
      expect(source).toHaveProperty('sourceId');
      expect(source.sourceName).toBe('MotionCap-Rig');
    });

    it('bindLiveLinkToEntity sets targetEntityId', () => {
      const source = createLiveLinkSource('MotionCap-Rig', 'facial-capture', '192.168.1.10', 8765, 60, mockIds, mockClock);
      const binding = bindLiveLinkToEntity(source, 'entity-1');
      expect(binding.targetEntityId).toBe('entity-1');
    });
  });
});
