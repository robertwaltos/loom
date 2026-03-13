/**
 * MetaHuman System — integration tests
 *
 * Preset library, dynamic creation, body animation,
 * GPU profiling, streaming, and LiveLink.
 */

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
  createMetaHumanEngine,
  AGE_RANGES,
  BODY_TYPES,
  ETHNICITY_BASES,
  PERSONALITY_IDLES,
  type MhEngineDeps,
  type MetaHumanPreset,
  type MetaHumanInstance,
  type BodyAnimationState,
  type GpuPerformanceSnapshot,
  type StreamingState,
  type LiveLinkSource,
} from '../fabrics/loom-core/src/metahuman-system';

// ─── Helpers ────────────────────────────────────────────────────────

let idCounter = 0;
function stubClock(): { readonly now: () => bigint } {
  return { now: () => BigInt(Date.now()) };
}

function stubIds(): { readonly next: () => string } {
  return { next: () => `id-${++idCounter}` };
}

function createMockStore(): MhEngineDeps['store'] {
  return {
    savePreset: async () => { /* noop */ },
    getPreset: async () => undefined,
    listPresets: async () => [],
    saveInstance: async () => { /* noop */ },
    getInstance: async () => undefined,
    saveAnimationState: async () => { /* noop */ },
    getAnimationState: async () => undefined,
    savePerformanceSnapshot: async () => { /* noop */ },
    saveStreamingState: async () => { /* noop */ },
    getStreamingState: async () => undefined,
    saveLiveLinkSource: async () => { /* noop */ },
    getLiveLinkSource: async () => undefined,
    listLiveLinkSources: async () => [],
  };
}

function createDeps(): MhEngineDeps {
  const emitted: unknown[] = [];
  return {
    clock: stubClock(),
    ids: stubIds(),
    log: {
      info: () => { /* noop */ },
      warn: () => { /* noop */ },
      error: () => { /* noop */ },
    },
    events: { emit: (e) => emitted.push(e) },
    store: createMockStore(),
  };
}

// ─── Preset Library ─────────────────────────────────────────────────

describe('MetaHuman System', () => {
  describe('Preset Library', () => {
    it('creates 50+ base presets', () => {
      const ids = stubIds();
      const presets = createDefaultPresetLibrary(ids);
      expect(presets.length).toBeGreaterThanOrEqual(50);
    });

    it('every preset has a unique ID', () => {
      const ids = stubIds();
      const presets = createDefaultPresetLibrary(ids);
      const idSet = new Set(presets.map((p) => p.presetId));
      expect(idSet.size).toBe(presets.length);
    });

    it('covers all age ranges', () => {
      const ids = stubIds();
      const presets = createDefaultPresetLibrary(ids);
      const ages = new Set(presets.map((p) => p.ageRange));
      for (const age of AGE_RANGES) {
        expect(ages.has(age)).toBe(true);
      }
    });

    it('covers all ethnicity bases', () => {
      const ids = stubIds();
      const presets = createDefaultPresetLibrary(ids);
      const eths = new Set(presets.map((p) => p.ethnicityBase));
      for (const eth of ETHNICITY_BASES) {
        expect(eths.has(eth)).toBe(true);
      }
    });

    it('covers all body types', () => {
      const ids = stubIds();
      const presets = createDefaultPresetLibrary(ids);
      const bts = new Set(presets.map((p) => p.bodyType));
      for (const bt of BODY_TYPES) {
        expect(bts.has(bt)).toBe(true);
      }
    });

    it('covers all genders', () => {
      const ids = stubIds();
      const presets = createDefaultPresetLibrary(ids);
      const genders = new Set(presets.map((p) => p.gender));
      expect(genders.has('male')).toBe(true);
      expect(genders.has('female')).toBe(true);
      expect(genders.has('non-binary')).toBe(true);
    });

    it('facial parameters are in valid range', () => {
      const ids = stubIds();
      const presets = createDefaultPresetLibrary(ids);
      for (const p of presets) {
        const face = p.facialStructure;
        expect(face.jawWidth).toBeGreaterThan(0);
        expect(face.jawWidth).toBeLessThan(1);
        expect(face.eyeSize).toBeGreaterThan(0);
        expect(face.eyeSize).toBeLessThan(1);
      }
    });

    it('voice pitch varies by gender', () => {
      const ids = stubIds();
      const presets = createDefaultPresetLibrary(ids);
      const males = presets.filter((p) => p.gender === 'male');
      const females = presets.filter((p) => p.gender === 'female');
      const avgMale = males.reduce((s, p) => s + p.voicePitchHz, 0) / males.length;
      const avgFemale = females.reduce((s, p) => s + p.voicePitchHz, 0) / females.length;
      expect(avgFemale).toBeGreaterThan(avgMale);
    });
  });

  // ─── Dynamic Creation ───────────────────────────────────────────

  describe('Dynamic Creation', () => {
    it('blends two presets at factor 0.5', () => {
      const ids = stubIds();
      const clock = stubClock();
      const presets = createDefaultPresetLibrary(ids);
      const instance = blendPresets(presets[0], presets[1], 0.5, ids, 'npc-1', clock);
      expect(instance.entityId).toBe('npc-1');
      expect(instance.blendedParameters.length).toBeGreaterThan(0);
      expect(Object.keys(instance.overrides).length).toBeGreaterThan(0);
    });

    it('factor 0 keeps preset A values', () => {
      const ids = stubIds();
      const clock = stubClock();
      const presets = createDefaultPresetLibrary(ids);
      const instance = blendPresets(presets[0], presets[1], 0, ids, 'npc-2', clock);
      expect(instance.overrides['face.jawWidth']).toBeCloseTo(presets[0].facialStructure.jawWidth, 5);
    });

    it('factor 1 keeps preset B values', () => {
      const ids = stubIds();
      const clock = stubClock();
      const presets = createDefaultPresetLibrary(ids);
      const instance = blendPresets(presets[0], presets[1], 1.0, ids, 'npc-3', clock);
      expect(instance.overrides['face.jawWidth']).toBeCloseTo(presets[1].facialStructure.jawWidth, 5);
    });

    it('clamps factor outside [0,1]', () => {
      const ids = stubIds();
      const clock = stubClock();
      const presets = createDefaultPresetLibrary(ids);
      const instance = blendPresets(presets[0], presets[1], 2.0, ids, 'npc-4', clock);
      expect(instance.overrides['face.jawWidth']).toBeCloseTo(presets[1].facialStructure.jawWidth, 5);
    });

    it('blended instance has voice pitch override', () => {
      const ids = stubIds();
      const clock = stubClock();
      const presets = createDefaultPresetLibrary(ids);
      const instance = blendPresets(presets[0], presets[1], 0.5, ids, 'npc-5', clock);
      expect(instance.overrides['voice.pitchHz']).toBeDefined();
    });
  });

  // ─── Body Animation ────────────────────────────────────────────

  describe('Body Animation', () => {
    it('produces idle animation state', () => {
      const clock = stubClock();
      const state = computeBodyAnimation('npc-1', 'relaxed', null, 0, [0, 0, 0], 0.5, clock);
      expect(state.entityId).toBe('npc-1');
      expect(state.personalityIdle).toBe('relaxed');
      expect(state.activeGesture).toBeNull();
    });

    it('nervous personality has higher breathing rate', () => {
      const clock = stubClock();
      const nervous = computeBodyAnimation('npc-2', 'nervous', null, 0, [0, 0, 0], 0.5, clock);
      const relaxed = computeBodyAnimation('npc-3', 'relaxed', null, 0, [0, 0, 0], 0.5, clock);
      expect(nervous.breathingRate).toBeGreaterThan(relaxed.breathingRate);
    });

    it('point gesture creates IK target', () => {
      const clock = stubClock();
      const state = computeBodyAnimation('npc-4', 'confident', 'point', 0.8, [5, 2, 1], 0.5, clock);
      expect(state.activeGesture).toBe('point');
      expect(state.ikTargets.length).toBeGreaterThan(0);
      expect(state.ikTargets[0].boneName).toBe('hand_r');
    });

    it('wave gesture creates IK target', () => {
      const clock = stubClock();
      const state = computeBodyAnimation('npc-5', 'relaxed', 'wave', 0.5, [0, 0, 0], 0.3, clock);
      expect(state.ikTargets.length).toBeGreaterThan(0);
    });

    it('emotion intensity is clamped to [0,1]', () => {
      const clock = stubClock();
      const state = computeBodyAnimation('npc-6', 'stoic', null, 0, [0, 0, 0], 1.5, clock);
      expect(state.emotionIntensity).toBe(1.0);
    });

    it('look-at target is stored', () => {
      const clock = stubClock();
      const state = computeBodyAnimation('npc-7', 'curious', null, 0, [10, 20, 30], 0.5, clock);
      expect(state.lookAtX).toBe(10);
      expect(state.lookAtY).toBe(20);
      expect(state.lookAtZ).toBe(30);
    });
  });

  // ─── GPU Performance Profiling ──────────────────────────────────

  describe('Performance Profiling', () => {
    it('within budget produces positive result', () => {
      const clock = stubClock();
      const snap = profileGpuPerformance('world-1', 'medium', 10, 8, 2, 2.5, clock);
      expect(snap.withinBudget).toBe(true);
      expect(snap.recommendation).toBe('within-budget');
    });

    it('over budget flags recommendation', () => {
      const clock = stubClock();
      const snap = profileGpuPerformance('world-1', 'medium', 20, 18, 2, 4.5, clock);
      expect(snap.withinBudget).toBe(false);
      expect(snap.recommendation).toContain('reduce-full-lod');
    });

    it('low tier has highest budget', () => {
      const clock = stubClock();
      const snap = profileGpuPerformance('world-1', 'low', 3, 3, 0, 3.5, clock);
      expect(snap.budgetMs).toBe(4.0);
      expect(snap.withinBudget).toBe(true);
    });

    it('ultra tier has tightest budget', () => {
      const clock = stubClock();
      const snap = profileGpuPerformance('world-1', 'ultra', 50, 50, 0, 2.0, clock);
      expect(snap.budgetMs).toBe(1.5);
      expect(snap.withinBudget).toBe(false);
    });
  });

  // ─── Streaming ──────────────────────────────────────────────────

  describe('MetaHuman Streaming', () => {
    it('full LOD under 10m', () => {
      expect(computeStreamingLod(5)).toBe('full');
    });

    it('head-only LOD 10-50m', () => {
      expect(computeStreamingLod(30)).toBe('head-only');
    });

    it('simplified LOD 50-200m', () => {
      expect(computeStreamingLod(100)).toBe('simplified');
    });

    it('silhouette LOD over 200m', () => {
      expect(computeStreamingLod(300)).toBe('silhouette');
    });

    it('conversation boosts priority 5x', () => {
      const base = computeStreamingPriority(20, false, false);
      const conv = computeStreamingPriority(20, false, true);
      expect(conv).toBeCloseTo(base * 5, 0);
    });

    it('player-facing doubles priority', () => {
      const base = computeStreamingPriority(20, false, false);
      const facing = computeStreamingPriority(20, true, false);
      expect(facing).toBeCloseTo(base * 2, 0);
    });

    it('load progress is computed from assets', () => {
      const clock = stubClock();
      const state = computeStreamingState('npc-1', 15, ['head', 'body'], 5, true, false, clock);
      expect(state.loadProgress).toBeCloseTo(0.4, 5);
      expect(state.currentLod).toBe('head-only');
    });
  });

  // ─── LiveLink ───────────────────────────────────────────────────

  describe('LiveLink', () => {
    it('creates source with correct properties', () => {
      const ids = stubIds();
      const clock = stubClock();
      const source = createLiveLinkSource('Suit-A', 'full-body', '192.168.1.10', 11111, 120, ids, clock);
      expect(source.sourceName).toBe('Suit-A');
      expect(source.sourceType).toBe('full-body');
      expect(source.active).toBe(true);
      expect(source.targetEntityId).toBeNull();
    });

    it('binds to entity', () => {
      const ids = stubIds();
      const clock = stubClock();
      const source = createLiveLinkSource('FaceCam', 'facial-capture', '192.168.1.20', 22222, 60, ids, clock);
      const bound = bindLiveLinkToEntity(source, 'npc-actor-1');
      expect(bound.targetEntityId).toBe('npc-actor-1');
      expect(bound.sourceName).toBe('FaceCam');
    });
  });

  // ─── Engine Integration ─────────────────────────────────────────

  describe('MetaHuman Engine', () => {
    it('getPresets returns 50+ presets', () => {
      const deps = createDeps();
      const engine = createMetaHumanEngine(deps);
      expect(engine.getPresets().length).toBeGreaterThanOrEqual(50);
    });

    it('getPreset returns preset by ID', () => {
      const deps = createDeps();
      const engine = createMetaHumanEngine(deps);
      const presets = engine.getPresets();
      const found = engine.getPreset(presets[0].presetId);
      expect(found).toBeDefined();
      expect(found?.name).toBe(presets[0].name);
    });

    it('createInstance blends two presets', async () => {
      const deps = createDeps();
      const engine = createMetaHumanEngine(deps);
      const presets = engine.getPresets();
      const inst = await engine.createInstance('ent-1', presets[0].presetId, presets[5].presetId, 0.3);
      expect(inst).toBeDefined();
      expect(inst?.entityId).toBe('ent-1');
    });

    it('createInstance returns undefined for unknown preset', async () => {
      const deps = createDeps();
      const engine = createMetaHumanEngine(deps);
      const inst = await engine.createInstance('ent-2', 'bad-id', 'also-bad', 0.5);
      expect(inst).toBeUndefined();
    });

    it('updateAnimation returns animation state', async () => {
      const deps = createDeps();
      const engine = createMetaHumanEngine(deps);
      const state = await engine.updateAnimation('ent-3', 'wave', 0.6, [1, 2, 3], 0.5);
      expect(state.entityId).toBe('ent-3');
      expect(state.activeGesture).toBe('wave');
    });

    it('profilePerformance returns snapshot', async () => {
      const deps = createDeps();
      const engine = createMetaHumanEngine(deps);
      const snap = await engine.profilePerformance('world-1', 'high', 20, 18, 2, 1.8);
      expect(snap.withinBudget).toBe(true);
    });

    it('registerLiveLink and bindLiveLink work end-to-end', async () => {
      const deps = createDeps();
      const engine = createMetaHumanEngine(deps);
      const source = await engine.registerLiveLink('BodySuit', 'full-body', '10.0.0.1', 33333, 120);
      expect(source.active).toBe(true);
      const bound = await engine.bindLiveLink(source.sourceId, 'npc-actor-1');
      expect(bound).toBeDefined();
      expect(bound?.targetEntityId).toBe('npc-actor-1');
    });

    it('bindLiveLink returns undefined for unknown source', async () => {
      const deps = createDeps();
      const engine = createMetaHumanEngine(deps);
      const result = await engine.bindLiveLink('nonexistent', 'ent-1');
      expect(result).toBeUndefined();
    });
  });
});
