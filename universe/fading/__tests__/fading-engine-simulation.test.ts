/**
 * Fading Engine — Simulation Tests
 *
 * Tests for the pure fading logic: luminance restoration, natural decay,
 * stage resolution, material parameter mapping, and Kindler spark awards.
 *
 * Thread: silk/universe/fading-engine-sim
 * Tier: 1
 */

import { describe, it, expect } from 'vitest';
import {
  resolveFadingStage,
  calculateRestorationDelta,
  applyRestoration,
  applyNaturalDecay,
  detectStageTransition,
  luminanceToMaterialParams,
  stageTransitionSparkBonus,
  LESSON_RESTORE_DELTAS,
  COLLABORATIVE_BONUS_MULTIPLIER,
  DEEP_FADE_THRESHOLD,
  NATURAL_DECAY_PER_HOUR,
  MIN_LUMINANCE,
  STAGE_THRESHOLDS,
  SPARK_AWARDS,
  type WorldRestorationEvent,
} from '../engine.js';
import type { WorldLuminance } from '../../worlds/types.js';

// ─── Helpers ──────────────────────────────────────────────────────

function makeWorldLuminance(overrides?: Partial<WorldLuminance>): WorldLuminance {
  return {
    worldId: 'cloud-kingdom',
    luminance: 0.60,
    stage: 'glowing',
    lastRestoredAt: 1_000_000,
    totalKindlersContributed: 10,
    activeKindlerCount: 3,
    ...overrides,
  };
}

// ─── Stage Resolution ─────────────────────────────────────────────

describe('resolveFadingStage', () => {
  it('returns radiant at 1.0', () => {
    expect(resolveFadingStage(1.0)).toBe('radiant');
  });

  it('returns radiant at the threshold boundary (0.90)', () => {
    expect(resolveFadingStage(0.90)).toBe('radiant');
  });

  it('returns glowing just below radiant (0.89)', () => {
    expect(resolveFadingStage(0.89)).toBe('glowing');
  });

  it('returns glowing at its threshold (0.65)', () => {
    expect(resolveFadingStage(0.65)).toBe('glowing');
  });

  it('returns dimming just below glowing (0.64)', () => {
    expect(resolveFadingStage(0.64)).toBe('dimming');
  });

  it('returns dimming at its threshold (0.40)', () => {
    expect(resolveFadingStage(0.40)).toBe('dimming');
  });

  it('returns fading just below dimming (0.39)', () => {
    expect(resolveFadingStage(0.39)).toBe('fading');
  });

  it('returns fading at its threshold (0.15)', () => {
    expect(resolveFadingStage(0.15)).toBe('fading');
  });

  it('returns deep_fade just below fading (0.14)', () => {
    expect(resolveFadingStage(0.14)).toBe('deep_fade');
  });

  it('returns deep_fade at 0', () => {
    expect(resolveFadingStage(0)).toBe('deep_fade');
  });

  it('covers all five stages via STAGE_THRESHOLDS constants', () => {
    const stages = STAGE_THRESHOLDS.map(([s]) => s);
    expect(stages).toContain('radiant');
    expect(stages).toContain('glowing');
    expect(stages).toContain('dimming');
    expect(stages).toContain('fading');
    expect(stages).toContain('deep_fade');
  });
});

// ─── Restoration Delta Calculation ────────────────────────────────

describe('calculateRestorationDelta', () => {
  it('returns tier-1 base delta for simple lesson', () => {
    const delta = calculateRestorationDelta({
      difficultyTier: 1,
      isCollaborative: false,
      returnBonus: false,
    });
    expect(delta).toBeCloseTo(LESSON_RESTORE_DELTAS[0]);
  });

  it('returns tier-2 base delta for simple lesson', () => {
    const delta = calculateRestorationDelta({
      difficultyTier: 2,
      isCollaborative: false,
      returnBonus: false,
    });
    expect(delta).toBeCloseTo(LESSON_RESTORE_DELTAS[1]);
  });

  it('returns tier-3 base delta for simple lesson', () => {
    const delta = calculateRestorationDelta({
      difficultyTier: 3,
      isCollaborative: false,
      returnBonus: false,
    });
    expect(delta).toBeCloseTo(LESSON_RESTORE_DELTAS[2]);
  });

  it('applies collaborative multiplier', () => {
    const solo = calculateRestorationDelta({
      difficultyTier: 2,
      isCollaborative: false,
      returnBonus: false,
    });
    const collab = calculateRestorationDelta({
      difficultyTier: 2,
      isCollaborative: true,
      returnBonus: false,
    });
    expect(collab / solo).toBeCloseTo(COLLABORATIVE_BONUS_MULTIPLIER);
  });

  it('applies return bonus multiplier (1.2x)', () => {
    const base = calculateRestorationDelta({
      difficultyTier: 1,
      isCollaborative: false,
      returnBonus: false,
    });
    const withBonus = calculateRestorationDelta({
      difficultyTier: 1,
      isCollaborative: false,
      returnBonus: true,
    });
    expect(withBonus / base).toBeCloseTo(1.2);
  });

  it('stacks collaborative and return bonus', () => {
    const base = calculateRestorationDelta({
      difficultyTier: 3,
      isCollaborative: false,
      returnBonus: false,
    });
    const both = calculateRestorationDelta({
      difficultyTier: 3,
      isCollaborative: true,
      returnBonus: true,
    });
    expect(both / base).toBeCloseTo(COLLABORATIVE_BONUS_MULTIPLIER * 1.2);
  });
});

// ─── Apply Restoration ────────────────────────────────────────────

describe('applyRestoration', () => {
  it('increases luminance by the given delta', () => {
    const current = makeWorldLuminance({ luminance: 0.50, stage: 'dimming' });
    const { updated } = applyRestoration(current, 0.10, 'kindler_progress', 'k1');
    expect(updated.luminance).toBeCloseTo(0.60);
  });

  it('does not exceed luminance 1.0', () => {
    const current = makeWorldLuminance({ luminance: 0.97, stage: 'radiant' });
    const { updated } = applyRestoration(current, 0.10, 'kindler_progress', 'k1');
    expect(updated.luminance).toBeLessThanOrEqual(1.0);
  });

  it('advances stage when crossing threshold', () => {
    // From dimming (0.40) cross into glowing (0.65)
    const current = makeWorldLuminance({ luminance: 0.60, stage: 'dimming' });
    const { updated } = applyRestoration(current, 0.10, 'kindler_progress', 'k1');
    expect(updated.stage).toBe('glowing');
  });

  it('returns a log entry with the correct worldId', () => {
    const current = makeWorldLuminance({ worldId: 'savanna-workshop', luminance: 0.50 });
    const { logEntry } = applyRestoration(current, 0.05, 'kindler_progress', 'k2');
    expect(logEntry.worldId).toBe('savanna-workshop');
    expect(logEntry.delta).toBeCloseTo(0.05);
  });

  it('increments totalKindlersContributed by 1', () => {
    const current = makeWorldLuminance({ totalKindlersContributed: 5 });
    const { updated } = applyRestoration(current, 0.05, 'kindler_progress', 'k1');
    expect(updated.totalKindlersContributed).toBe(6);
  });
});

// ─── Natural Decay ────────────────────────────────────────────────

describe('applyNaturalDecay', () => {
  it('reduces luminance proportionally to inactive hours', () => {
    const current = makeWorldLuminance({ luminance: 0.50 });
    const { updated } = applyNaturalDecay(current, 10);
    const expectedDecay = NATURAL_DECAY_PER_HOUR * 10;
    expect(updated.luminance).toBeCloseTo(0.50 - expectedDecay, 2);
  });

  it('never drops below MIN_LUMINANCE', () => {
    const current = makeWorldLuminance({ luminance: MIN_LUMINANCE + 0.001 });
    const { updated } = applyNaturalDecay(current, 1000);
    expect(updated.luminance).toBeGreaterThanOrEqual(MIN_LUMINANCE);
  });

  it('returns a negative delta in the log entry', () => {
    const current = makeWorldLuminance({ luminance: 0.50 });
    const { logEntry } = applyNaturalDecay(current, 24);
    expect(logEntry.delta).toBeLessThanOrEqual(0);
  });

  it('sets deep_fade_event cause when result is below DEEP_FADE_THRESHOLD', () => {
    const current = makeWorldLuminance({ luminance: DEEP_FADE_THRESHOLD + 0.001 });
    const { logEntry } = applyNaturalDecay(current, 10_000);
    expect(logEntry.cause).toBe('deep_fade_event');
  });

  it('sets natural_decay cause when result stays above DEEP_FADE_THRESHOLD', () => {
    const current = makeWorldLuminance({ luminance: 0.50 });
    const { logEntry } = applyNaturalDecay(current, 1);
    expect(logEntry.cause).toBe('natural_decay');
  });
});

// ─── Stage Transition Detection ───────────────────────────────────

describe('detectStageTransition', () => {
  it('returns null when stage has not changed', () => {
    const prev = makeWorldLuminance({ luminance: 0.70, stage: 'glowing' });
    const updated = makeWorldLuminance({ luminance: 0.75, stage: 'glowing' });
    expect(detectStageTransition(prev, updated, 'k1')).toBeNull();
  });

  it('returns an event when stage advances', () => {
    const prev = makeWorldLuminance({ luminance: 0.60, stage: 'dimming' });
    const updated = makeWorldLuminance({ luminance: 0.70, stage: 'glowing' });
    const event = detectStageTransition(prev, updated, 'kindler-1');
    expect(event).not.toBeNull();
    expect((event as WorldRestorationEvent).previousStage).toBe('dimming');
    expect((event as WorldRestorationEvent).newStage).toBe('glowing');
    expect((event as WorldRestorationEvent).kindlerId).toBe('kindler-1');
  });

  it('marks isFullyRestored when new stage is radiant', () => {
    const prev = makeWorldLuminance({ luminance: 0.85, stage: 'glowing' });
    const updated = makeWorldLuminance({ luminance: 0.92, stage: 'radiant' });
    const event = detectStageTransition(prev, updated, 'k5') as WorldRestorationEvent;
    expect(event.isFullyRestored).toBe(true);
  });

  it('does not mark isFullyRestored for intermediate stages', () => {
    const prev = makeWorldLuminance({ luminance: 0.35, stage: 'fading' });
    const updated = makeWorldLuminance({ luminance: 0.45, stage: 'dimming' });
    const event = detectStageTransition(prev, updated, 'k3') as WorldRestorationEvent;
    expect(event.isFullyRestored).toBe(false);
  });
});

// ─── Material Parameters ──────────────────────────────────────────

describe('luminanceToMaterialParams', () => {
  it('returns all zeros/min values at luminance 0', () => {
    const params = luminanceToMaterialParams(0);
    expect(params.colorSaturation).toBeCloseTo(0);
    expect(params.foliageDensity).toBeCloseTo(0);
    expect(params.ambientLightIntensity).toBeCloseTo(0.2);
    expect(params.musicLayerCount).toBe(1);
    expect(params.particleDensity).toBe(0);
    expect(params.waterClarity).toBeCloseTo(0);
  });

  it('returns full values at luminance 1', () => {
    const params = luminanceToMaterialParams(1.0);
    expect(params.colorSaturation).toBeCloseTo(1.0);
    expect(params.foliageDensity).toBeCloseTo(1.0);
    expect(params.ambientLightIntensity).toBeCloseTo(1.0);
    expect(params.musicLayerCount).toBe(4);
    expect(params.particleDensity).toBeGreaterThan(0.5);
    expect(params.waterClarity).toBeCloseTo(0.9);
  });

  it('music layer count is always an integer', () => {
    for (const l of [0, 0.25, 0.5, 0.75, 1.0]) {
      const params = luminanceToMaterialParams(l);
      expect(Number.isInteger(params.musicLayerCount)).toBe(true);
    }
  });

  it('clamps luminance above 1.0', () => {
    const params = luminanceToMaterialParams(1.5);
    const normal = luminanceToMaterialParams(1.0);
    expect(params.colorSaturation).toBeCloseTo(normal.colorSaturation);
  });

  it('clamps luminance below 0', () => {
    const params = luminanceToMaterialParams(-0.5);
    const zero = luminanceToMaterialParams(0);
    expect(params.colorSaturation).toBeCloseTo(zero.colorSaturation);
  });

  it('ambientLight is always >= 0.2 (minimum light floor)', () => {
    for (const l of [0, 0.1, 0.5, 1.0]) {
      const params = luminanceToMaterialParams(l);
      expect(params.ambientLightIntensity).toBeGreaterThanOrEqual(0.2);
    }
  });
});

// ─── Spark Awards ─────────────────────────────────────────────────

describe('stageTransitionSparkBonus', () => {
  it('returns positive bonus for all stages except deep_fade', () => {
    const stages = ['radiant', 'glowing', 'dimming', 'fading', 'deep_fade'] as const;
    for (const stage of stages) {
      const bonus = stageTransitionSparkBonus(stage);
      if (stage === 'deep_fade') {
        expect(bonus).toBe(0);
      } else {
        expect(bonus).toBeGreaterThan(0);
      }
    }
  });

  it('radiant gives the highest bonus', () => {
    expect(stageTransitionSparkBonus('radiant')).toBeGreaterThan(
      stageTransitionSparkBonus('glowing'),
    );
    expect(stageTransitionSparkBonus('glowing')).toBeGreaterThan(
      stageTransitionSparkBonus('dimming'),
    );
  });

  it('matches SPARK_AWARDS constants', () => {
    expect(stageTransitionSparkBonus('radiant')).toBe(SPARK_AWARDS['radiant']);
    expect(stageTransitionSparkBonus('fading')).toBe(SPARK_AWARDS['fading']);
    expect(stageTransitionSparkBonus('deep_fade')).toBe(SPARK_AWARDS['deep_fade']);
  });
});
