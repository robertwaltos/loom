/**
 * Accessibility System — integration tests
 *
 * Text scaling, high contrast, cognitive accessibility,
 * presets, and timer extensions.
 */

import { describe, it, expect } from 'vitest';
import {
  computeTextScaleProfile,
  computeHighContrastProfile,
  computeCognitiveAccessProfile,
  createDefaultAccessibilityPresets,
  createAccessibilityEngine,
  TEXT_SCALE_MIN,
  TEXT_SCALE_MAX,
  type AccEngineDeps,
} from '../fabrics/loom-core/src/accessibility-system';

// ─── Helpers ────────────────────────────────────────────────────────

let idCounter = 0;
function stubClock(): { readonly now: () => bigint } {
  return { now: () => BigInt(Date.now()) };
}
function stubIds(): { readonly next: () => string } {
  return { next: () => `id-${++idCounter}` };
}

function createDeps(): AccEngineDeps {
  return {
    clock: stubClock(),
    ids: stubIds(),
    log: { info: () => {}, warn: () => {}, error: () => {} },
    events: { emit: () => {} },
    store: {
      saveTextScaleProfile: async () => {},
      getTextScaleProfile: async () => undefined,
      saveHighContrastProfile: async () => {},
      getHighContrastProfile: async () => undefined,
      saveCognitiveProfile: async () => {},
      getCognitiveProfile: async () => undefined,
      saveAccessibilityPreset: async () => {},
      getAccessibilityPreset: async () => undefined,
      listPresets: async () => [],
    },
  };
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('Accessibility System', () => {
  describe('Text Scaling', () => {
    it('default scale produces base font sizes', () => {
      const clock = stubClock();
      const profile = computeTextScaleProfile('player-1', 1.0, clock);
      expect(profile.chatFontSize).toBe(14);
      expect(profile.hudFontSize).toBe(12);
      expect(profile.menuFontSize).toBe(16);
    });

    it('2x scale doubles font sizes', () => {
      const clock = stubClock();
      const profile = computeTextScaleProfile('player-1', 2.0, clock);
      expect(profile.chatFontSize).toBe(28);
      expect(profile.menuFontSize).toBe(32);
    });

    it('0.5x scale halves font sizes', () => {
      const clock = stubClock();
      const profile = computeTextScaleProfile('player-1', 0.5, clock);
      expect(profile.chatFontSize).toBe(7);
      expect(profile.menuFontSize).toBe(8);
    });

    it('scale below minimum is clamped', () => {
      const clock = stubClock();
      const profile = computeTextScaleProfile('player-1', 0.1, clock);
      expect(profile.globalScale).toBe(TEXT_SCALE_MIN);
    });

    it('scale above maximum is clamped', () => {
      const clock = stubClock();
      const profile = computeTextScaleProfile('player-1', 5.0, clock);
      expect(profile.globalScale).toBe(TEXT_SCALE_MAX);
    });
  });

  describe('High Contrast', () => {
    it('off mode has no outlines', () => {
      const clock = stubClock();
      const profile = computeHighContrastProfile('player-1', 'off', clock);
      expect(profile.outlineWidthPx).toBe(0);
      expect(profile.simplifiedBackgrounds).toBe(false);
    });

    it('enhanced mode has 2px outlines', () => {
      const clock = stubClock();
      const profile = computeHighContrastProfile('player-1', 'enhanced', clock);
      expect(profile.outlineWidthPx).toBe(2);
      expect(profile.simplifiedBackgrounds).toBe(true);
    });

    it('maximum mode has 4px outlines and enhanced crosshair', () => {
      const clock = stubClock();
      const profile = computeHighContrastProfile('player-1', 'maximum', clock);
      expect(profile.outlineWidthPx).toBe(4);
      expect(profile.enhancedCrosshair).toBe(true);
      expect(profile.minimapHighContrast).toBe(true);
    });

    it('maximum mode has full UI opacity', () => {
      const clock = stubClock();
      const profile = computeHighContrastProfile('player-1', 'maximum', clock);
      expect(profile.uiBackgroundOpacity).toBe(1.0);
    });

    it('enhanced mode is partial opacity', () => {
      const clock = stubClock();
      const profile = computeHighContrastProfile('player-1', 'enhanced', clock);
      expect(profile.uiBackgroundOpacity).toBe(0.85);
    });
  });

  describe('Cognitive Accessibility', () => {
    it('standard level has no modifications', () => {
      const clock = stubClock();
      const profile = computeCognitiveAccessProfile('player-1', 'standard', clock);
      expect(profile.simplifiedUi).toBe(false);
      expect(profile.timerMultiplier).toBe(1.0);
      expect(profile.questSummariesEnabled).toBe(false);
    });

    it('simplified level extends timers by 1.5x', () => {
      const clock = stubClock();
      const profile = computeCognitiveAccessProfile('player-1', 'simplified', clock);
      expect(profile.timerMultiplier).toBe(1.5);
      expect(profile.simplifiedUi).toBe(true);
      expect(profile.questSummariesEnabled).toBe(true);
    });

    it('minimal level extends timers by 2.5x', () => {
      const clock = stubClock();
      const profile = computeCognitiveAccessProfile('player-1', 'minimal', clock);
      expect(profile.timerMultiplier).toBe(2.5);
      expect(profile.autoNavigationEnabled).toBe(true);
      expect(profile.actionConfirmation).toBe(true);
    });

    it('simplified enables reduced animations', () => {
      const clock = stubClock();
      const profile = computeCognitiveAccessProfile('player-1', 'simplified', clock);
      expect(profile.reducedAnimations).toBe(true);
      expect(profile.focusHighlight).toBe(true);
    });
  });

  describe('Presets', () => {
    it('creates 8 default presets', () => {
      const ids = stubIds();
      const presets = createDefaultAccessibilityPresets(ids);
      expect(presets.length).toBe(8);
    });

    it('presets have unique IDs', () => {
      const ids = stubIds();
      const presets = createDefaultAccessibilityPresets(ids);
      const idSet = new Set(presets.map((p) => p.presetId));
      expect(idSet.size).toBe(presets.length);
    });

    it('default preset has standard settings', () => {
      const ids = stubIds();
      const presets = createDefaultAccessibilityPresets(ids);
      const def = presets.find((p) => p.name === 'Default');
      expect(def?.textScale).toBe(1.0);
      expect(def?.contrastMode).toBe('off');
      expect(def?.cognitiveLevel).toBe('standard');
    });

    it('Vision Assist combines large text and maximum contrast', () => {
      const ids = stubIds();
      const presets = createDefaultAccessibilityPresets(ids);
      const va = presets.find((p) => p.name === 'Vision Assist');
      expect(va?.textScale).toBe(1.8);
      expect(va?.contrastMode).toBe('maximum');
    });
  });

  describe('Accessibility Engine', () => {
    it('setTextScale returns profile', async () => {
      const deps = createDeps();
      const engine = createAccessibilityEngine(deps);
      const profile = await engine.setTextScale('player-1', 1.5);
      expect(profile.globalScale).toBe(1.5);
      expect(profile.chatFontSize).toBe(21);
    });

    it('setContrastMode returns profile', async () => {
      const deps = createDeps();
      const engine = createAccessibilityEngine(deps);
      const profile = await engine.setContrastMode('player-1', 'enhanced');
      expect(profile.outlineWidthPx).toBe(2);
    });

    it('setCognitiveLevel returns profile', async () => {
      const deps = createDeps();
      const engine = createAccessibilityEngine(deps);
      const profile = await engine.setCognitiveLevel('player-1', 'minimal');
      expect(profile.timerMultiplier).toBe(2.5);
    });

    it('applyPreset sets all three profiles', async () => {
      const deps = createDeps();
      const engine = createAccessibilityEngine(deps);
      const presets = engine.getPresets();
      const visionAssist = presets.find((p) => p.name === 'Vision Assist');
      const result = await engine.applyPreset('player-1', visionAssist!.presetId);
      expect(result).toBeDefined();
      expect(result!.text.globalScale).toBe(1.8);
      expect(result!.contrast.mode).toBe('maximum');
      expect(result!.cognitive.level).toBe('standard');
    });

    it('applyPreset returns undefined for unknown preset', async () => {
      const deps = createDeps();
      const engine = createAccessibilityEngine(deps);
      const result = await engine.applyPreset('player-1', 'nonexistent');
      expect(result).toBeUndefined();
    });

    it('getTimerDuration applies cognitive multiplier', async () => {
      const deps = createDeps();
      const engine = createAccessibilityEngine(deps);
      await engine.setCognitiveLevel('player-1', 'simplified');
      const duration = await engine.getTimerDuration(10000, 'player-1');
      expect(duration).toBe(15000);
    });

    it('getTimerDuration uses 1x for unknown player', async () => {
      const deps = createDeps();
      const engine = createAccessibilityEngine(deps);
      const duration = await engine.getTimerDuration(10000, 'unknown');
      expect(duration).toBe(10000);
    });

    it('getPresets returns 8 entries', () => {
      const deps = createDeps();
      const engine = createAccessibilityEngine(deps);
      expect(engine.getPresets().length).toBe(8);
    });
  });
});
