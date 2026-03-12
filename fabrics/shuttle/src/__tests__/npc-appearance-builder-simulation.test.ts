/**
 * NPC Appearance Builder — Simulation Tests
 *
 * Exercises the deterministic personality-to-visual pipeline:
 * seed-based reproducibility, archetype body builds, age ranges,
 * personality-driven moods and attire, and output structure.
 */

import { describe, it, expect } from 'vitest';
import { buildNpcAppearance } from '../npc-appearance-builder.js';
import type { NpcAppearanceInput, PersonalityScores } from '../npc-appearance-builder.js';

// ── Helpers ──────────────────────────────────────────────────────

function makeInput(overrides: Partial<NpcAppearanceInput> = {}): NpcAppearanceInput {
  return {
    entityId: overrides.entityId ?? 'entity-1',
    displayName: overrides.displayName ?? 'Grim Thornwood',
    archetype: overrides.archetype ?? 'warrior',
    npcTier: overrides.npcTier ?? 2,
    personality: overrides.personality ?? {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.5,
    },
    dominantTraitCategory: overrides.dominantTraitCategory,
    factionAffinity: overrides.factionAffinity,
    age: overrides.age,
    seed: overrides.seed,
  };
}

const VALID_SEX = ['masculine', 'feminine', 'androgynous'];
const VALID_AGE = ['child', 'adolescent', 'young-adult', 'middle-aged', 'elder', 'ancient'];
const VALID_BUILD = ['slight', 'lean', 'average', 'athletic', 'stocky', 'heavy', 'towering'];
const VALID_HAIR_LENGTH = ['short', 'medium', 'long', 'bald'];
const VALID_CONDITION = ['pristine', 'well-kept', 'worn', 'battle-worn', 'tattered'];

// ── Tests ────────────────────────────────────────────────────────

describe('NPC Appearance Builder', () => {
  describe('output structure', () => {
    it('returns a complete CharacterAppearance object', () => {
      const result = buildNpcAppearance(makeInput({ seed: 42 }));
      expect(result.entityId).toBe('entity-1');
      expect(result.displayName).toBe('Grim Thornwood');
      expect(result.archetype).toBe('warrior');
      expect(VALID_SEX).toContain(result.apparentSex);
      expect(VALID_AGE).toContain(result.ageRange);
      expect(VALID_BUILD).toContain(result.bodyBuild);
      expect(typeof result.skinTone).toBe('string');
      expect(result.skinTone.length).toBeGreaterThan(0);
      expect(typeof result.culturalStyle).toBe('string');
      expect(typeof result.visualMood).toBe('string');
    });

    it('returns valid hair description', () => {
      const result = buildNpcAppearance(makeInput({ seed: 42 }));
      expect(typeof result.hair.color).toBe('string');
      expect(typeof result.hair.style).toBe('string');
      expect(VALID_HAIR_LENGTH).toContain(result.hair.length);
    });

    it('returns valid facial features', () => {
      const result = buildNpcAppearance(makeInput({ seed: 42 }));
      expect(result.facialFeatures.eyes).toBeTruthy();
      expect(result.facialFeatures.nose).toBeTruthy();
      expect(result.facialFeatures.jaw).toBeTruthy();
      expect(result.facialFeatures.expressionTendency).toBeTruthy();
    });

    it('returns valid attire description', () => {
      const result = buildNpcAppearance(makeInput({ seed: 42 }));
      expect(result.attire.primaryGarment).toBeTruthy();
      expect(Array.isArray(result.attire.accessories)).toBe(true);
      expect(typeof result.attire.colorPalette).toBe('string');
      expect(VALID_CONDITION).toContain(result.attire.condition);
    });

    it('distinguishing marks is an array', () => {
      const result = buildNpcAppearance(makeInput({ seed: 42 }));
      expect(Array.isArray(result.distinguishingMarks)).toBe(true);
    });
  });

  // ── Determinism ───────────────────────────────────────────────

  describe('deterministic seeded output', () => {
    it('produces identical results for the same seed', () => {
      const input = makeInput({ seed: 12345 });
      const a = buildNpcAppearance(input);
      const b = buildNpcAppearance(input);
      expect(a).toEqual(b);
    });

    it('produces different results for different seeds', () => {
      const a = buildNpcAppearance(makeInput({ seed: 1 }));
      const b = buildNpcAppearance(makeInput({ seed: 999999 }));
      // Very unlikely to be identical across all fields
      const aSerialized = JSON.stringify(a);
      const bSerialized = JSON.stringify(b);
      expect(aSerialized).not.toBe(bSerialized);
    });

    it('auto-generates seed from entityId + displayName when unspecified', () => {
      const input = makeInput({ seed: undefined, entityId: 'e1', displayName: 'Bob' });
      const a = buildNpcAppearance(input);
      const b = buildNpcAppearance(input);
      expect(a).toEqual(b);
    });
  });

  // ── Age Mapping ───────────────────────────────────────────────

  describe('age range mapping', () => {
    it('maps age < 13 to child', () => {
      const result = buildNpcAppearance(makeInput({ age: 10, seed: 1 }));
      expect(result.ageRange).toBe('child');
    });

    it('maps age 13-17 to adolescent', () => {
      const result = buildNpcAppearance(makeInput({ age: 15, seed: 1 }));
      expect(result.ageRange).toBe('adolescent');
    });

    it('maps age 18-29 to young-adult', () => {
      const result = buildNpcAppearance(makeInput({ age: 25, seed: 1 }));
      expect(result.ageRange).toBe('young-adult');
    });

    it('maps age 30-54 to middle-aged', () => {
      const result = buildNpcAppearance(makeInput({ age: 45, seed: 1 }));
      expect(result.ageRange).toBe('middle-aged');
    });

    it('maps age 55-79 to elder', () => {
      const result = buildNpcAppearance(makeInput({ age: 70, seed: 1 }));
      expect(result.ageRange).toBe('elder');
    });

    it('maps age >= 80 to ancient', () => {
      const result = buildNpcAppearance(makeInput({ age: 95, seed: 1 }));
      expect(result.ageRange).toBe('ancient');
    });
  });

  // ── Personality Visual Mood ───────────────────────────────────

  describe('personality-driven visual mood', () => {
    it('high neuroticism produces haunted mood', () => {
      const result = buildNpcAppearance(makeInput({
        seed: 42,
        personality: { openness: 0.3, conscientiousness: 0.3, extraversion: 0.3, agreeableness: 0.3, neuroticism: 0.8 },
      }));
      expect(result.visualMood).toBe('haunted');
    });

    it('high extraversion produces jovial mood', () => {
      const result = buildNpcAppearance(makeInput({
        seed: 42,
        personality: { openness: 0.3, conscientiousness: 0.3, extraversion: 0.8, agreeableness: 0.3, neuroticism: 0.3 },
      }));
      expect(result.visualMood).toBe('jovial');
    });

    it('high agreeableness produces warm mood', () => {
      const result = buildNpcAppearance(makeInput({
        seed: 42,
        personality: { openness: 0.3, conscientiousness: 0.3, extraversion: 0.3, agreeableness: 0.8, neuroticism: 0.3 },
      }));
      expect(result.visualMood).toBe('warm');
    });

    it('high conscientiousness produces disciplined mood', () => {
      const result = buildNpcAppearance(makeInput({
        seed: 42,
        personality: { openness: 0.3, conscientiousness: 0.8, extraversion: 0.3, agreeableness: 0.3, neuroticism: 0.3 },
      }));
      expect(result.visualMood).toBe('disciplined');
    });

    it('high openness produces enigmatic mood', () => {
      const result = buildNpcAppearance(makeInput({
        seed: 42,
        personality: { openness: 0.8, conscientiousness: 0.3, extraversion: 0.3, agreeableness: 0.3, neuroticism: 0.3 },
      }));
      expect(result.visualMood).toBe('enigmatic');
    });

    it('balanced personality produces stoic mood', () => {
      const result = buildNpcAppearance(makeInput({
        seed: 42,
        personality: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 },
      }));
      expect(result.visualMood).toBe('stoic');
    });
  });

  // ── Archetype Body Builds ─────────────────────────────────────

  describe('archetype body builds', () => {
    it('warrior gets warrior-appropriate builds', () => {
      const warriorBuilds = ['athletic', 'stocky', 'heavy', 'towering'];
      // Test with many seeds to ensure all results fall within expected range
      for (let seed = 0; seed < 20; seed++) {
        const result = buildNpcAppearance(makeInput({ archetype: 'warrior', seed }));
        expect(warriorBuilds).toContain(result.bodyBuild);
      }
    });

    it('scholar gets scholar-appropriate builds', () => {
      const scholarBuilds = ['slight', 'lean', 'average'];
      for (let seed = 0; seed < 20; seed++) {
        const result = buildNpcAppearance(makeInput({ archetype: 'scholar', seed }));
        expect(scholarBuilds).toContain(result.bodyBuild);
      }
    });

    it('unknown archetype uses full range', () => {
      const allBuilds = ['slight', 'lean', 'average', 'athletic', 'stocky'];
      const result = buildNpcAppearance(makeInput({ archetype: 'custom-type', seed: 42 }));
      expect(allBuilds).toContain(result.bodyBuild);
    });
  });

  // ── Faction Affinity ──────────────────────────────────────────

  describe('faction influence', () => {
    it('includes faction emblem in accessories when faction provided', () => {
      // Run with multiple seeds — faction emblem has 60% chance
      let foundFaction = false;
      for (let seed = 0; seed < 50; seed++) {
        const result = buildNpcAppearance(makeInput({
          factionAffinity: 'Iron Legion',
          seed,
        }));
        if (result.attire.accessories.some(a => a.includes('Iron Legion'))) {
          foundFaction = true;
          break;
        }
      }
      expect(foundFaction).toBe(true);
    });
  });

  // ── Higher Tier NPCs ──────────────────────────────────────────

  describe('NPC tier effects', () => {
    it('higher tier NPCs more likely to have distinguishing marks', () => {
      let tier2Marks = 0;
      let tier4Marks = 0;
      for (let seed = 0; seed < 100; seed++) {
        const t2 = buildNpcAppearance(makeInput({ npcTier: 2, seed }));
        const t4 = buildNpcAppearance(makeInput({ npcTier: 4, seed }));
        tier2Marks += t2.distinguishingMarks.length;
        tier4Marks += t4.distinguishingMarks.length;
      }
      // Tier 4 should generally have more marks due to higher chance
      expect(tier4Marks).toBeGreaterThan(tier2Marks);
    });
  });
});
