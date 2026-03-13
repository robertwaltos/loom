import { describe, it, expect } from 'vitest';
import {
  computeTextScaleProfile,
  computeHighContrastProfile,
  computeCognitiveAccessProfile,
  createDefaultAccessibilityPresets,
  TEXT_SCALE_MIN,
  TEXT_SCALE_MAX,
  TEXT_SCALE_DEFAULT,
  TEXT_SCALE_STEP,
  CONTRAST_MODES,
  COGNITIVE_LEVELS,
} from '../accessibility-system.js';

describe('accessibility-system simulation', () => {
  const mockClock = { now: () => BigInt(1_000_000) };
  const mockIds = { next: (() => { let i = 0; return () => `id-${++i}`; })() };

  // ── constants ─────────────────────────────────────────────────────

  it('TEXT_SCALE_MIN = 0.5', () => { expect(TEXT_SCALE_MIN).toBe(0.5); });
  it('TEXT_SCALE_MAX = 2.0', () => { expect(TEXT_SCALE_MAX).toBe(2.0); });
  it('TEXT_SCALE_DEFAULT = 1.0', () => { expect(TEXT_SCALE_DEFAULT).toBe(1.0); });
  it('TEXT_SCALE_STEP = 0.1', () => { expect(TEXT_SCALE_STEP).toBeCloseTo(0.1); });
  it('CONTRAST_MODES has 3 entries', () => { expect(CONTRAST_MODES.length).toBe(3); });
  it('COGNITIVE_LEVELS has 3 entries', () => { expect(COGNITIVE_LEVELS.length).toBe(3); });

  // ── computeTextScaleProfile ───────────────────────────────────────

  describe('computeTextScaleProfile', () => {
    it('clamps scale to TEXT_SCALE_MIN when below minimum', () => {
      const profile = computeTextScaleProfile('p1', 0.1, mockClock);
      expect(profile.globalScale).toBe(TEXT_SCALE_MIN);
    });

    it('clamps scale to TEXT_SCALE_MAX when above maximum', () => {
      const profile = computeTextScaleProfile('p1', 5.0, mockClock);
      expect(profile.globalScale).toBe(TEXT_SCALE_MAX);
    });

    it('preserves scale when within range', () => {
      const profile = computeTextScaleProfile('p1', 1.5, mockClock);
      expect(profile.globalScale).toBe(1.5);
    });

    it('scales chat font size from base 14', () => {
      const profile = computeTextScaleProfile('p1', 2.0, mockClock);
      expect(profile.chatFontSize).toBe(28); // 14 * 2.0 = 28
    });

    it('scales hud font size from base 12', () => {
      const profile = computeTextScaleProfile('p1', 1.0, mockClock);
      expect(profile.hudFontSize).toBe(12); // 12 * 1.0 = 12
    });

    it('includes playerId in profile', () => {
      const profile = computeTextScaleProfile('player-99', 1.0, mockClock);
      expect(profile.playerId).toBe('player-99');
    });
  });

  // ── computeHighContrastProfile ────────────────────────────────────

  describe('computeHighContrastProfile', () => {
    it('returns uiBackgroundOpacity=0.7 for mode off', () => {
      const profile = computeHighContrastProfile('p1', 'off', mockClock);
      expect(profile.uiBackgroundOpacity).toBeCloseTo(0.7);
    });

    it('returns uiBackgroundOpacity=0.85 for mode enhanced', () => {
      const profile = computeHighContrastProfile('p1', 'enhanced', mockClock);
      expect(profile.uiBackgroundOpacity).toBeCloseTo(0.85);
    });

    it('returns uiBackgroundOpacity=1.0 for mode maximum', () => {
      const profile = computeHighContrastProfile('p1', 'maximum', mockClock);
      expect(profile.uiBackgroundOpacity).toBe(1.0);
    });

    it('includes the mode in the returned profile', () => {
      const profile = computeHighContrastProfile('p1', 'enhanced', mockClock);
      expect(profile.mode).toBe('enhanced');
    });
  });

  // ── computeCognitiveAccessProfile ────────────────────────────────

  describe('computeCognitiveAccessProfile', () => {
    it('returns timerMultiplier=1.0 for standard level', () => {
      const profile = computeCognitiveAccessProfile('p1', 'standard', mockClock);
      expect(profile.timerMultiplier).toBe(1.0);
    });

    it('returns timerMultiplier=1.5 for simplified level', () => {
      const profile = computeCognitiveAccessProfile('p1', 'simplified', mockClock);
      expect(profile.timerMultiplier).toBe(1.5);
    });

    it('returns timerMultiplier=2.5 for minimal level', () => {
      const profile = computeCognitiveAccessProfile('p1', 'minimal', mockClock);
      expect(profile.timerMultiplier).toBe(2.5);
    });
  });

  // ── createDefaultAccessibilityPresets ────────────────────────────

  describe('createDefaultAccessibilityPresets', () => {
    it('returns an array of presets', () => {
      const presets = createDefaultAccessibilityPresets(mockIds);
      expect(Array.isArray(presets)).toBe(true);
      expect(presets.length).toBeGreaterThan(0);
    });

    it('each preset has textScale = TEXT_SCALE_DEFAULT for the Default preset', () => {
      const presets = createDefaultAccessibilityPresets(mockIds);
      const defaultPreset = presets.find(p => p.name === 'Default');
      expect(defaultPreset).toBeDefined();
      expect(defaultPreset!.textScale).toBe(TEXT_SCALE_DEFAULT);
    });

    it('each preset has a presetId', () => {
      const presets = createDefaultAccessibilityPresets(mockIds);
      for (const preset of presets) {
        expect(typeof preset.presetId).toBe('string');
      }
    });
  });
});
