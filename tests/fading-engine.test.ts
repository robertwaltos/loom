/**
 * fading-engine.test.ts — Unit tests for The Fading Engine + Persistence Adapter.
 *
 * Covers all exported pure functions:
 *   engine.ts   — resolveFadingStage, calculateRestorationDelta, applyRestoration,
 *                 applyNaturalDecay, detectStageTransition, luminanceToMaterialParams,
 *                 stageTransitionSparkBonus
 *   persistence.ts — luminanceToDb, luminanceFromDb, worldLuminanceFromRow,
 *                    worldLuminanceToUpdatePayload
 *
 * Thread: silk/loom-core/fading-engine
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
  STAGE_THRESHOLDS,
  NATURAL_DECAY_PER_HOUR,
  MIN_LUMINANCE,
  DEEP_FADE_THRESHOLD,
  COLLABORATIVE_BONUS_MULTIPLIER,
} from '../universe/fading/engine.js';
import {
  luminanceToDb,
  luminanceFromDb,
  worldLuminanceFromRow,
  worldLuminanceToUpdatePayload,
} from '../universe/fading/persistence.js';
import type { WorldLuminance } from '../universe/worlds/types.js';
import type { WorldLuminanceDbRow } from '../universe/fading/persistence.js';

// ─── Fixtures ─────────────────────────────────────────────────────

function makeWorld(luminance: number, worldId = 'cloud-kingdom'): WorldLuminance {
  return {
    worldId,
    luminance,
    stage: resolveFadingStage(luminance),
    lastRestoredAt: 1_000_000,
    totalKindlersContributed: 5,
    activeKindlerCount: 2,
  };
}

function makeRow(luminanceInt: number): WorldLuminanceDbRow {
  return {
    id: 'row-1',
    world_slug: 'cloud-kingdom',
    world_name: 'Cloud Kingdom',
    realm: 'discovery',
    luminance: luminanceInt,
    guide_name: 'Professor Nimbus',
    guide_subject: 'Earth Science',
    updated_at: '2026-03-12T00:00:00.000Z',
  };
}

// ─── resolveFadingStage ────────────────────────────────────────────

describe('resolveFadingStage', () => {
  it('returns radiant at 1.0', () => {
    expect(resolveFadingStage(1.0)).toBe('radiant');
  });

  it('returns radiant at the 0.90 threshold', () => {
    expect(resolveFadingStage(0.90)).toBe('radiant');
  });

  it('returns glowing just below radiant threshold (0.89)', () => {
    expect(resolveFadingStage(0.89)).toBe('glowing');
  });

  it('returns glowing at the 0.65 threshold', () => {
    expect(resolveFadingStage(0.65)).toBe('glowing');
  });

  it('returns dimming at 0.64', () => {
    expect(resolveFadingStage(0.64)).toBe('dimming');
  });

  it('returns dimming at the 0.40 threshold', () => {
    expect(resolveFadingStage(0.40)).toBe('dimming');
  });

  it('returns fading at 0.39', () => {
    expect(resolveFadingStage(0.39)).toBe('fading');
  });

  it('returns fading at the 0.15 threshold', () => {
    expect(resolveFadingStage(0.15)).toBe('fading');
  });

  it('returns deep_fade below 0.15', () => {
    expect(resolveFadingStage(0.14)).toBe('deep_fade');
  });

  it('returns deep_fade at 0.0', () => {
    expect(resolveFadingStage(0.0)).toBe('deep_fade');
  });

  it('stage thresholds array covers all five stages', () => {
    const stages = STAGE_THRESHOLDS.map(([s]) => s);
    expect(stages).toContain('radiant');
    expect(stages).toContain('glowing');
    expect(stages).toContain('dimming');
    expect(stages).toContain('fading');
    expect(stages).toContain('deep_fade');
  });
});

// ─── calculateRestorationDelta ────────────────────────────────────

describe('calculateRestorationDelta', () => {
  it('tier 1 solo lesson gives 0.05', () => {
    const delta = calculateRestorationDelta({ difficultyTier: 1, isCollaborative: false, returnBonus: false });
    expect(delta).toBe(0.05);
  });

  it('tier 2 solo lesson gives 0.07', () => {
    const delta = calculateRestorationDelta({ difficultyTier: 2, isCollaborative: false, returnBonus: false });
    expect(delta).toBe(0.07);
  });

  it('tier 3 solo lesson gives 0.10', () => {
    const delta = calculateRestorationDelta({ difficultyTier: 3, isCollaborative: false, returnBonus: false });
    expect(delta).toBe(0.10);
  });

  it('collaborative multiplier is applied', () => {
    const solo = calculateRestorationDelta({ difficultyTier: 2, isCollaborative: false, returnBonus: false });
    const collab = calculateRestorationDelta({ difficultyTier: 2, isCollaborative: true, returnBonus: false });
    expect(collab).toBeCloseTo(solo * COLLABORATIVE_BONUS_MULTIPLIER, 3);
  });

  it('return bonus stacks on top of tier delta', () => {
    const base = calculateRestorationDelta({ difficultyTier: 1, isCollaborative: false, returnBonus: false });
    const withBonus = calculateRestorationDelta({ difficultyTier: 1, isCollaborative: false, returnBonus: true });
    expect(withBonus).toBeGreaterThan(base);
    expect(withBonus).toBeCloseTo(base * 1.2, 3);
  });

  it('collaborative + return bonus both apply', () => {
    const delta = calculateRestorationDelta({ difficultyTier: 3, isCollaborative: true, returnBonus: true });
    expect(delta).toBeCloseTo(0.10 * COLLABORATIVE_BONUS_MULTIPLIER * 1.2, 3);
  });
});

// ─── applyRestoration ─────────────────────────────────────────────

describe('applyRestoration', () => {
  it('increases luminance by delta', () => {
    const world = makeWorld(0.5);
    const { updated } = applyRestoration(world, 0.1, 'kindler_progress', 'k1');
    expect(updated.luminance).toBeCloseTo(0.6, 3);
  });

  it('stage is recalculated after restoration', () => {
    const world = makeWorld(0.62);            // dimming
    const { updated } = applyRestoration(world, 0.05, 'kindler_progress', 'k1');
    expect(updated.stage).toBe('glowing');    // cross 0.65 → glowing
  });

  it('luminance is clamped at 1.0', () => {
    const world = makeWorld(0.98);
    const { updated } = applyRestoration(world, 0.1, 'kindler_progress', 'k1');
    expect(updated.luminance).toBe(1.0);
    expect(updated.stage).toBe('radiant');
  });

  it('totalKindlersContributed increments by 1', () => {
    const world = makeWorld(0.5);
    const { updated } = applyRestoration(world, 0.05, 'kindler_progress', 'k1');
    expect(updated.totalKindlersContributed).toBe(world.totalKindlersContributed + 1);
  });

  it('log entry captures correct delta and cause', () => {
    const world = makeWorld(0.5);
    const { logEntry } = applyRestoration(world, 0.07, 'collaborative_quest', 'k2');
    expect(logEntry.delta).toBe(0.07);
    expect(logEntry.cause).toBe('collaborative_quest');
    expect(logEntry.worldId).toBe('cloud-kingdom');
  });

  it('preserves worldId through restoration', () => {
    const world = makeWorld(0.4, 'tideline-bay');
    const { updated } = applyRestoration(world, 0.05, 'kindler_progress', 'k1');
    expect(updated.worldId).toBe('tideline-bay');
  });
});

// ─── applyNaturalDecay ────────────────────────────────────────────

describe('applyNaturalDecay', () => {
  it('decays luminance proportional to inactive hours', () => {
    const world = makeWorld(0.5);
    const { updated } = applyNaturalDecay(world, 10);
    const expected = Math.round((0.5 - NATURAL_DECAY_PER_HOUR * 10) * 1000) / 1000;
    expect(updated.luminance).toBeCloseTo(expected, 3);
  });

  it('luminance never drops below MIN_LUMINANCE', () => {
    const world = makeWorld(MIN_LUMINANCE + 0.001);
    const { updated } = applyNaturalDecay(world, 10_000);
    expect(updated.luminance).toBeGreaterThanOrEqual(MIN_LUMINANCE);
  });

  it('luminance at MIN_LUMINANCE stays at MIN_LUMINANCE', () => {
    const world = makeWorld(MIN_LUMINANCE);
    const { updated } = applyNaturalDecay(world, 48);
    expect(updated.luminance).toBe(MIN_LUMINANCE);
  });

  it('stage reflects new luminance after decay', () => {
    const world = makeWorld(0.17);           // fading
    const { updated } = applyNaturalDecay(world, 20);
    expect(['fading', 'deep_fade']).toContain(updated.stage);
  });

  it('log entry cause is deep_fade_event when below DEEP_FADE_THRESHOLD', () => {
    const world = makeWorld(DEEP_FADE_THRESHOLD + 0.001);
    const { logEntry } = applyNaturalDecay(world, 5);
    expect(logEntry.cause).toBe('deep_fade_event');
  });

  it('log entry cause is natural_decay when above DEEP_FADE_THRESHOLD', () => {
    const world = makeWorld(0.5);
    const { logEntry } = applyNaturalDecay(world, 5);
    expect(logEntry.cause).toBe('natural_decay');
  });

  it('log entry delta is negative', () => {
    const world = makeWorld(0.5);
    const { logEntry } = applyNaturalDecay(world, 10);
    expect(logEntry.delta).toBeLessThanOrEqual(0);
  });
});

// ─── detectStageTransition ────────────────────────────────────────

describe('detectStageTransition', () => {
  it('returns null when stage does not change', () => {
    const prev = makeWorld(0.5);     // dimming
    const next = makeWorld(0.45);    // still dimming
    expect(detectStageTransition(prev, next, 'k1')).toBeNull();
  });

  it('detects a positive transition (dimming → glowing)', () => {
    const prev = makeWorld(0.64);    // dimming
    const next = makeWorld(0.66);    // glowing
    const event = detectStageTransition(prev, next, 'k1');
    expect(event).not.toBeNull();
    expect(event?.previousStage).toBe('dimming');
    expect(event?.newStage).toBe('glowing');
    expect(event?.isFullyRestored).toBe(false);
  });

  it('isFullyRestored is true when new stage is radiant', () => {
    const prev = makeWorld(0.88);    // glowing
    const next = makeWorld(0.92);    // radiant
    const event = detectStageTransition(prev, next, 'k1');
    expect(event?.isFullyRestored).toBe(true);
  });

  it('captures kindlerId and worldId', () => {
    const prev = makeWorld(0.39, 'number-garden');
    const next = makeWorld(0.41, 'number-garden');
    const event = detectStageTransition(prev, next, 'kindler-xyz');
    expect(event?.kindlerId).toBe('kindler-xyz');
    expect(event?.worldId).toBe('number-garden');
  });

  it('detects decay transition (glowing → dimming)', () => {
    const prev = makeWorld(0.66);    // glowing
    const next = makeWorld(0.63);    // dimming
    const event = detectStageTransition(prev, next, 'k1');
    expect(event?.previousStage).toBe('glowing');
    expect(event?.newStage).toBe('dimming');
  });
});

// ─── luminanceToMaterialParams ────────────────────────────────────

describe('luminanceToMaterialParams', () => {
  it('at luminance 0 all params are at their minimum', () => {
    const params = luminanceToMaterialParams(0);
    expect(params.colorSaturation).toBe(0);
    expect(params.foliageDensity).toBe(0);
    expect(params.particleDensity).toBe(0);
    expect(params.musicLayerCount).toBe(1);
  });

  it('at luminance 1 all params are at their maximum', () => {
    const params = luminanceToMaterialParams(1.0);
    expect(params.colorSaturation).toBeCloseTo(1, 3);
    expect(params.foliageDensity).toBe(1);
    expect(params.ambientLightIntensity).toBeCloseTo(1.0, 3);
    expect(params.musicLayerCount).toBe(4);
    expect(params.waterClarity).toBeCloseTo(0.9, 3);
  });

  it('ambientLightIntensity is never below 0.2', () => {
    const params = luminanceToMaterialParams(0);
    expect(params.ambientLightIntensity).toBeGreaterThanOrEqual(0.2);
  });

  it('clamps out-of-range values below 0', () => {
    const params = luminanceToMaterialParams(-5);
    expect(params.foliageDensity).toBe(0);
  });

  it('clamps out-of-range values above 1', () => {
    const params = luminanceToMaterialParams(2);
    expect(params.foliageDensity).toBe(1);
  });

  it('musicLayerCount increases linearly with luminance', () => {
    const low = luminanceToMaterialParams(0.01);
    const high = luminanceToMaterialParams(0.99);
    expect(high.musicLayerCount).toBeGreaterThanOrEqual(low.musicLayerCount);
  });
});

// ─── stageTransitionSparkBonus ────────────────────────────────────

describe('stageTransitionSparkBonus', () => {
  it('radiant gives the highest bonus', () => {
    const bonus = stageTransitionSparkBonus('radiant');
    expect(bonus).toBe(0.15);
  });

  it('deep_fade gives 0', () => {
    expect(stageTransitionSparkBonus('deep_fade')).toBe(0);
  });

  it('bonus increases with each brighter stage', () => {
    const deepFade  = stageTransitionSparkBonus('deep_fade');
    const fading    = stageTransitionSparkBonus('fading');
    const dimming   = stageTransitionSparkBonus('dimming');
    const glowing   = stageTransitionSparkBonus('glowing');
    const radiant   = stageTransitionSparkBonus('radiant');
    expect(fading).toBeGreaterThan(deepFade);
    expect(dimming).toBeGreaterThan(fading);
    expect(glowing).toBeGreaterThan(dimming);
    expect(radiant).toBeGreaterThan(glowing);
  });
});

// ─── luminanceToDb ────────────────────────────────────────────────

describe('luminanceToDb', () => {
  it('0.0 → 0', () => { expect(luminanceToDb(0.0)).toBe(0); });
  it('1.0 → 100', () => { expect(luminanceToDb(1.0)).toBe(100); });
  it('0.5 → 50', () => { expect(luminanceToDb(0.5)).toBe(50); });
  it('0.07 → 7', () => { expect(luminanceToDb(0.07)).toBe(7); });
  it('0.999 → 100 (rounds)', () => { expect(luminanceToDb(0.999)).toBe(100); });
  it('clamps values above 1.0', () => { expect(luminanceToDb(1.5)).toBe(100); });
  it('clamps negative values to 0', () => { expect(luminanceToDb(-0.5)).toBe(0); });
});

// ─── luminanceFromDb ──────────────────────────────────────────────

describe('luminanceFromDb', () => {
  it('0 → 0.0', () => { expect(luminanceFromDb(0)).toBe(0); });
  it('100 → 1.0', () => { expect(luminanceFromDb(100)).toBe(1.0); });
  it('50 → 0.5', () => { expect(luminanceFromDb(50)).toBe(0.5); });
  it('7 → 0.07', () => { expect(luminanceFromDb(7)).toBe(0.07); });
  it('clamps values above 100', () => { expect(luminanceFromDb(150)).toBe(1.0); });
  it('clamps negative values to 0', () => { expect(luminanceFromDb(-10)).toBe(0); });

  it('round-trips with luminanceToDb', () => {
    const original = 0.37;
    const db = luminanceToDb(original);
    const restored = luminanceFromDb(db);
    expect(restored).toBeCloseTo(original, 2);
  });
});

// ─── worldLuminanceFromRow ────────────────────────────────────────

describe('worldLuminanceFromRow', () => {
  it('hydrates worldId from world_slug', () => {
    const world = worldLuminanceFromRow(makeRow(65));
    expect(world.worldId).toBe('cloud-kingdom');
  });

  it('converts integer luminance to float', () => {
    const world = worldLuminanceFromRow(makeRow(65));
    expect(world.luminance).toBe(0.65);
  });

  it('stage is derived from converted luminance', () => {
    const world = worldLuminanceFromRow(makeRow(65));
    expect(world.stage).toBe('glowing');    // 0.65 is right at glowing threshold
  });

  it('uses counters when provided', () => {
    const world = worldLuminanceFromRow(makeRow(50), { totalKindlersContributed: 12, activeKindlerCount: 3 });
    expect(world.totalKindlersContributed).toBe(12);
    expect(world.activeKindlerCount).toBe(3);
  });

  it('defaults counters to 0 when omitted', () => {
    const world = worldLuminanceFromRow(makeRow(50));
    expect(world.totalKindlersContributed).toBe(0);
    expect(world.activeKindlerCount).toBe(0);
  });

  it('parses lastRestoredAt from ISO updated_at', () => {
    const row = makeRow(50);                // updated_at: '2026-03-12T00:00:00.000Z'
    const world = worldLuminanceFromRow(row);
    expect(world.lastRestoredAt).toBe(new Date('2026-03-12T00:00:00.000Z').getTime());
  });
});

// ─── worldLuminanceToUpdatePayload ────────────────────────────────

describe('worldLuminanceToUpdatePayload', () => {
  it('converts float luminance to DB integer', () => {
    const world = makeWorld(0.65);
    const payload = worldLuminanceToUpdatePayload(world);
    expect(payload.luminance).toBe(65);
  });

  it('updated_at is a valid ISO 8601 string', () => {
    const world = makeWorld(0.5);
    const payload = worldLuminanceToUpdatePayload(world);
    expect(() => new Date(payload.updated_at)).not.toThrow();
    expect(new Date(payload.updated_at).getTime()).toBe(world.lastRestoredAt);
  });

  it('round-trips through row hydration', () => {
    const original = makeWorld(0.73);
    const payload = worldLuminanceToUpdatePayload(original);

    // Simulate what Supabase returns after the update
    const row: WorldLuminanceDbRow = {
      id: 'row-1',
      world_slug: original.worldId,
      world_name: 'Cloud Kingdom',
      realm: 'discovery',
      luminance: payload.luminance,
      guide_name: 'Professor Nimbus',
      guide_subject: 'Earth Science',
      updated_at: payload.updated_at,
    };
    const hydrated = worldLuminanceFromRow(row);
    expect(hydrated.luminance).toBeCloseTo(original.luminance, 2);
  });
});
