/**
 * Visual Effects System — integration tests
 *
 * Lumen lighting, volumetric clouds, material library,
 * and seasonal visual transitions.
 */

import { describe, it, expect } from 'vitest';
import {
  computeSunPosition,
  computeLightingState,
  computeCloudState,
  computeSeasonalVisuals,
  createDefaultMaterialLibrary,
  createVisualEffectsEngine,
  SEASONS,
  MATERIAL_CATEGORIES,
  type VfxEngineDeps,
  type LightingState,
  type CloudState,
  type SeasonalVisualState,
  type MaterialPalette,
  type PbrMaterial,
  type MaterialCategory,
} from '../fabrics/loom-core/src/visual-effects-system';

// ─── Helpers ────────────────────────────────────────────────────────

let idCounter = 0;
function stubClock(): { readonly now: () => bigint } {
  return { now: () => BigInt(Date.now()) };
}

function stubIds(): { readonly next: () => string } {
  return { next: () => `id-${++idCounter}` };
}

function stubLog(): {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
} {
  return {
    info: () => { /* noop */ },
    warn: () => { /* noop */ },
    error: () => { /* noop */ },
  };
}

function createMockStore(): VfxEngineDeps['store'] {
  const lightingStore = new Map<string, LightingState>();
  const cloudStore = new Map<string, CloudState>();
  const seasonalStore = new Map<string, SeasonalVisualState>();
  const paletteStore = new Map<string, MaterialPalette>();
  const materialLib = createDefaultMaterialLibrary();

  return {
    saveLightingState: async (s) => { lightingStore.set(s.worldId, s); },
    getLightingState: async (wId) => lightingStore.get(wId),
    saveCloudState: async (s) => { cloudStore.set(s.worldId, s); },
    getCloudState: async (wId) => cloudStore.get(wId),
    saveMaterialPalette: async (p) => { paletteStore.set(p.biome, p); },
    getMaterialPalette: async (biome) => paletteStore.get(biome),
    saveSeasonalState: async (s) => { seasonalStore.set(s.worldId, s); },
    getSeasonalState: async (wId) => seasonalStore.get(wId),
    listMaterials: async (cat) => materialLib.filter((m) => m.category === cat),
  };
}

function createDeps(): VfxEngineDeps {
  const emitted: unknown[] = [];
  return {
    clock: stubClock(),
    ids: stubIds(),
    log: stubLog(),
    events: { emit: (e) => emitted.push(e) },
    store: createMockStore(),
  };
}

// ─── Sun Position ───────────────────────────────────────────────────

describe('Visual Effects System', () => {
  describe('Sun Position', () => {
    it('computes high sun at noon', () => {
      const sun = computeSunPosition(12, 45);
      expect(sun.elevation).toBeGreaterThan(0);
      expect(sun.intensityLux).toBeGreaterThan(0);
    });

    it('computes low/negative elevation at midnight', () => {
      const sun = computeSunPosition(0, 45);
      expect(sun.elevation).toBeLessThanOrEqual(0);
    });

    it('returns moonlight intensity at night', () => {
      const sun = computeSunPosition(2, 45);
      if (sun.elevation <= 0) {
        expect(sun.intensityLux).toBeLessThanOrEqual(1);
      }
    });

    it('azimuth stays in 0-360 range', () => {
      for (let h = 0; h < 24; h++) {
        const sun = computeSunPosition(h, 30);
        expect(sun.azimuth).toBeGreaterThanOrEqual(0);
        expect(sun.azimuth).toBeLessThan(360);
      }
    });
  });

  // ─── Lighting State ─────────────────────────────────────────────

  describe('Lumen Lighting', () => {
    it('produces lumen-gi mode by default', () => {
      const clock = stubClock();
      const state = computeLightingState('earth', 12, 40, clock);
      expect(state.lightingMode).toBe('lumen-gi');
      expect(state.worldId).toBe('earth');
    });

    it('golden hour has warm color temperature', () => {
      const clock = stubClock();
      const dawn = computeLightingState('earth', 5.75, 40, clock);
      expect(dawn.colorTemperatureK).toBe(3500);
    });

    it('midday has neutral color temperature', () => {
      const clock = stubClock();
      const noon = computeLightingState('earth', 12, 40, clock);
      expect(noon.colorTemperatureK).toBe(6500);
    });

    it('midnight has cool color temperature', () => {
      const clock = stubClock();
      const night = computeLightingState('earth', 0, 40, clock);
      expect(night.colorTemperatureK).toBe(12000);
    });

    it('shadow softness is high during golden hour', () => {
      const clock = stubClock();
      const state = computeLightingState('earth', 5.75, 40, clock);
      expect(state.shadowSoftness).toBe(0.8);
    });

    it('moonPhase illumination is between 0 and 1', () => {
      const clock = stubClock();
      const state = computeLightingState('earth', 0, 40, clock);
      expect(state.moonPhase.illumination).toBeGreaterThanOrEqual(0);
      expect(state.moonPhase.illumination).toBeLessThanOrEqual(1);
    });

    it('GI bounce factor is lower at night', () => {
      const clock = stubClock();
      const day = computeLightingState('earth', 12, 40, clock);
      const night = computeLightingState('earth', 0, 40, clock);
      expect(day.giBounceFactor).toBeGreaterThan(night.giBounceFactor);
    });
  });

  // ─── Volumetric Clouds ──────────────────────────────────────────

  describe('Volumetric Clouds', () => {
    it('clear weather has low cloud density', () => {
      const clock = stubClock();
      const state = computeCloudState('earth', 'CLEAR', 5, 180, clock);
      expect(state.overallCoverage).toBeLessThan(0.3);
      expect(state.volumetricEnabled).toBe(true);
    });

    it('storm weather has high cloud density and cumulonimbus', () => {
      const clock = stubClock();
      const state = computeCloudState('earth', 'STORM', 20, 90, clock);
      expect(state.overallCoverage).toBe(1.0);
      expect(state.layers[0].typeId).toBe('cumulonimbus');
      expect(state.precipitationProbability).toBeGreaterThan(0.8);
    });

    it('rain weather uses nimbostratus', () => {
      const clock = stubClock();
      const state = computeCloudState('earth', 'RAIN', 10, 270, clock);
      expect(state.layers[0].typeId).toBe('nimbostratus');
    });

    it('produces two cloud layers', () => {
      const clock = stubClock();
      const state = computeCloudState('earth', 'CLOUDY', 8, 45, clock);
      expect(state.layers).toHaveLength(2);
      expect(state.layers[1].altitudeM).toBeGreaterThan(state.layers[0].altitudeM);
    });

    it('high layer wind is faster than base', () => {
      const clock = stubClock();
      const state = computeCloudState('earth', 'CLOUDY', 10, 0, clock);
      expect(state.layers[1].windSpeedMs).toBeGreaterThan(state.layers[0].windSpeedMs);
    });

    it('snow weather has precipitation probability', () => {
      const clock = stubClock();
      const state = computeCloudState('earth', 'SNOW', 5, 200, clock);
      expect(state.precipitationProbability).toBe(0.75);
    });
  });

  // ─── Seasonal Visual Transitions ────────────────────────────────

  describe('Seasonal Visuals', () => {
    it('spring at t=0 has full spring preset', () => {
      const clock = stubClock();
      const state = computeSeasonalVisuals('earth', 'spring', 0, clock);
      expect(state.currentSeason).toBe('spring');
      expect(state.bloom.flowerDensity).toBe(0.8);
      expect(state.bloom.pollenParticles).toBe(true);
    });

    it('winter at t=0 has snow coverage', () => {
      const clock = stubClock();
      const state = computeSeasonalVisuals('earth', 'winter', 0, clock);
      expect(state.snow.coverage).toBe(0.8);
      expect(state.foliage.leafDensity).toBe(0.1);
    });

    it('transition blends between seasons', () => {
      const clock = stubClock();
      const mid = computeSeasonalVisuals('earth', 'autumn', 0.5, clock);
      // Mid transition between autumn and winter
      expect(mid.snow.coverage).toBeGreaterThan(0);
      expect(mid.foliage.leafDensity).toBeLessThan(0.5);
      expect(mid.foliage.leafDensity).toBeGreaterThan(0.05);
    });

    it('transition at t=1 is fully next season', () => {
      const clock = stubClock();
      const end = computeSeasonalVisuals('earth', 'spring', 1.0, clock);
      // Should be fully summer
      expect(end.foliage.leafDensity).toBe(1.0);
      expect(end.bloom.flowerDensity).toBe(0.4);
    });

    it('clamps transition progress to [0,1]', () => {
      const clock = stubClock();
      const over = computeSeasonalVisuals('earth', 'summer', 1.5, clock);
      expect(over.transitionProgress).toBe(1.0);
    });

    it('wraps from winter to spring', () => {
      const clock = stubClock();
      const wrapEnd = computeSeasonalVisuals('earth', 'winter', 1.0, clock);
      // Should be fully spring (wraps around)
      expect(wrapEnd.bloom.pollenParticles).toBe(true);
      expect(wrapEnd.foliage.leafDensity).toBe(0.7);
    });
  });

  // ─── Material Library ───────────────────────────────────────────

  describe('Material Library', () => {
    it('creates 200+ PBR materials', () => {
      const lib = createDefaultMaterialLibrary();
      expect(lib.length).toBeGreaterThanOrEqual(200);
    });

    it('every material has a unique ID', () => {
      const lib = createDefaultMaterialLibrary();
      const ids = new Set(lib.map((m) => m.materialId));
      expect(ids.size).toBe(lib.length);
    });

    it('covers all material categories', () => {
      const lib = createDefaultMaterialLibrary();
      const cats = new Set(lib.map((m) => m.category));
      for (const cat of MATERIAL_CATEGORIES) {
        expect(cats.has(cat)).toBe(true);
      }
    });

    it('roughness is between 0 and 1', () => {
      const lib = createDefaultMaterialLibrary();
      for (const m of lib) {
        expect(m.roughness).toBeGreaterThanOrEqual(0);
        expect(m.roughness).toBeLessThanOrEqual(1);
      }
    });

    it('metallic is between 0 and 1', () => {
      const lib = createDefaultMaterialLibrary();
      for (const m of lib) {
        expect(m.metallic).toBeGreaterThanOrEqual(0);
        expect(m.metallic).toBeLessThanOrEqual(1);
      }
    });

    it('albedo hex codes are valid', () => {
      const lib = createDefaultMaterialLibrary();
      const hexPattern = /^#[0-9A-Fa-f]{6}$/;
      for (const m of lib) {
        expect(m.albedoHex).toMatch(hexPattern);
      }
    });

    it('every material has at least one biome', () => {
      const lib = createDefaultMaterialLibrary();
      for (const m of lib) {
        expect(m.biomes.length).toBeGreaterThan(0);
      }
    });

    it('filters by biome correctly', () => {
      const deps = createDeps();
      const engine = createVisualEffectsEngine(deps);
      const tropical = engine.getMaterialsForBiome('tropical');
      expect(tropical.length).toBeGreaterThan(0);
      for (const m of tropical) {
        expect(m.biomes).toContain('tropical');
      }
    });

    it('filters by category correctly', () => {
      const deps = createDeps();
      const engine = createVisualEffectsEngine(deps);
      const terrain = engine.getMaterialsByCategory('terrain');
      expect(terrain.length).toBeGreaterThanOrEqual(25);
      for (const m of terrain) {
        expect(m.category).toBe('terrain');
      }
    });
  });

  // ─── VFX Engine Integration ─────────────────────────────────────

  describe('VFX Engine', () => {
    it('updateLighting persists and returns state', async () => {
      const deps = createDeps();
      const engine = createVisualEffectsEngine(deps);
      const result = await engine.updateLighting('world-1', 14, 35);
      expect(result.worldId).toBe('world-1');
      expect(result.gameHour).toBe(14);
      expect(result.lightingMode).toBe('lumen-gi');
    });

    it('updateClouds persists and returns state', async () => {
      const deps = createDeps();
      const engine = createVisualEffectsEngine(deps);
      const result = await engine.updateClouds('world-2', 'STORM', 25, 90);
      expect(result.worldId).toBe('world-2');
      expect(result.overallCoverage).toBe(1.0);
    });

    it('updateSeasonalVisuals persists and returns state', async () => {
      const deps = createDeps();
      const engine = createVisualEffectsEngine(deps);
      const result = await engine.updateSeasonalVisuals('world-3', 'autumn', 0.3);
      expect(result.worldId).toBe('world-3');
      expect(result.currentSeason).toBe('autumn');
    });

    it('getMaterialLibrary returns full library', () => {
      const deps = createDeps();
      const engine = createVisualEffectsEngine(deps);
      const lib = engine.getMaterialLibrary();
      expect(lib.length).toBeGreaterThanOrEqual(200);
    });
  });
});
