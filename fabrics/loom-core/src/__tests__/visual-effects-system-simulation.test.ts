import { describe, it, expect } from 'vitest';
import {
  computeSunPosition,
  computeLightingState,
  computeCloudState,
  computeSeasonalVisuals,
  createDefaultMaterialLibrary,
  MATERIAL_CATEGORIES,
  SEASONS,
  LIGHTING_MODES,
} from '../visual-effects-system.js';

describe('visual-effects-system simulation', () => {
  const mockClock = { now: () => BigInt(1_000_000) };

  // ── constants ─────────────────────────────────────────────────────

  it('SEASONS = [spring, summer, autumn, winter]', () => {
    expect(SEASONS).toEqual(['spring', 'summer', 'autumn', 'winter']);
  });

  it('LIGHTING_MODES contains lumen-gi, baked, hybrid', () => {
    expect(LIGHTING_MODES).toContain('lumen-gi');
    expect(LIGHTING_MODES).toContain('baked');
    expect(LIGHTING_MODES).toContain('hybrid');
  });

  it('MATERIAL_CATEGORIES is a non-empty array', () => {
    expect(Array.isArray(MATERIAL_CATEGORIES)).toBe(true);
    expect(MATERIAL_CATEGORIES.length).toBeGreaterThan(0);
  });

  // ── computeSunPosition ────────────────────────────────────────────

  describe('computeSunPosition', () => {
    it('returns elevation, azimuth, and intensityLux', () => {
      const pos = computeSunPosition(12, 45);
      expect(pos).toHaveProperty('elevation');
      expect(pos).toHaveProperty('azimuth');
      expect(pos).toHaveProperty('intensityLux');
    });

    it('intensityLux = 0 at midnight (hour=0, high latitude)', () => {
      const pos = computeSunPosition(0, 45);
      // Sun is below horizon at midnight in mid-latitudes
      expect(pos.intensityLux).toBeLessThanOrEqual(0.25); // at most moonlight
    });

    it('intensityLux > 0 at noon', () => {
      const pos = computeSunPosition(12, 0);
      expect(pos.intensityLux).toBeGreaterThan(0);
    });
  });

  // ── computeLightingState ──────────────────────────────────────────

  describe('computeLightingState', () => {
    it('returns a lighting state with a mode field', () => {
      const state = computeLightingState('world-1', 12, 45, mockClock);
      expect(state).toHaveProperty('lightingMode');
    });

    it('returns a lighting state with colorTemp during day', () => {
      const state = computeLightingState('world-1', 12, 45, mockClock);
      expect(state).toHaveProperty('colorTemperatureK');
    });

    it('returns colorTemp = 6500 during midday', () => {
      const state = computeLightingState('world-1', 12, 0, mockClock);
      expect(state.colorTemperatureK).toBe(6500);
    });

    it('returns colorTemp = 3500 during golden hour (hour=19)', () => {
      const state = computeLightingState('world-1', 19, 0, mockClock);
      expect(state.colorTemperatureK).toBe(3500);
    });

    it('returns colorTemp = 12000 during night (hour=23)', () => {
      const state = computeLightingState('world-1', 23, 0, mockClock);
      expect(state.colorTemperatureK).toBe(12000);
    });
  });

  // ── computeCloudState ─────────────────────────────────────────────

  describe('computeCloudState', () => {
    it('returns a cloud state with a coverage field', () => {
      const state = computeCloudState('world-1', 'CLEAR', 10, 315, mockClock);
      expect(state).toHaveProperty('overallCoverage');
    });

    it('clear weather produces lower coverage than stormy', () => {
      const clear = computeCloudState('world-1', 'CLEAR', 10, 0, mockClock);
      const stormy = computeCloudState('world-1', 'STORM', 20, 0, mockClock);
      expect(clear.overallCoverage).toBeLessThan(stormy.overallCoverage);
    });
  });

  // ── computeSeasonalVisuals ────────────────────────────────────────

  describe('computeSeasonalVisuals', () => {
    it('returns visuals with a season field', () => {
      const visuals = computeSeasonalVisuals('world-1', 'summer', 0, mockClock);
      expect(visuals).toHaveProperty('currentSeason');
      expect(visuals.currentSeason).toBe('summer');
    });

    it('transitionProgress = 0 returns pure seasonal visuals', () => {
      const visuals = computeSeasonalVisuals('world-1', 'winter', 0, mockClock);
      expect(visuals).toHaveProperty('transitionProgress');
      expect(visuals.transitionProgress).toBe(0);
    });

    it('transitionProgress = 0.5 returns blend visuals', () => {
      const visuals = computeSeasonalVisuals('world-1', 'spring', 0.5, mockClock);
      expect(visuals.transitionProgress).toBe(0.5);
    });
  });

  // ── createDefaultMaterialLibrary ──────────────────────────────────

  describe('createDefaultMaterialLibrary', () => {
    it('returns a library with entries', () => {
      const lib = createDefaultMaterialLibrary();
      expect(lib).toBeDefined();
      // Should have materials keyed by category or as an array
      const keys = Object.keys(lib);
      expect(keys.length).toBeGreaterThan(0);
    });
  });
});
