/**
 * Bible Appearance Mapper — Simulation Tests
 *
 * Exercises the deterministic mapping from CharacterEntry bible data
 * to CharacterAppearance (T2I) and AppearanceComponent (MetaHuman ECS).
 * Covers body build mapping, age classification, hair/eye hex extraction,
 * attire condition, accessory ID generation, height scaling, and facial overrides.
 */

import { describe, it, expect } from 'vitest';
import { mapToCharacterAppearance, mapToAppearanceComponent } from '../bible-appearance-mapper.js';
import type { CharacterEntry } from '@loom/entities-contracts';

// ── Helpers ──────────────────────────────────────────────────────

function makeEntry(overrides: Partial<CharacterEntry> = {}): CharacterEntry {
  return {
    characterId: overrides.characterId ?? 1,
    displayName: overrides.displayName ?? 'Itoro Adeyemi-Okafor',
    title: 'title' in overrides ? overrides.title! : 'Commodore (Ret.)',
    tier: overrides.tier ?? 'TIER_3',
    faction: overrides.faction ?? 'defence-forces',
    appearance: overrides.appearance ?? {
      apparentSex: 'masculine',
      ageApprox: '52-55',
      ethnicityInspiration: 'West African',
      build: 'powerful, broad-shouldered',
      height: 'tall',
      hairColor: 'salt-and-pepper grey',
      hairStyle: 'short cropped',
      eyeColor: 'dark brown, steady',
      skinTone: 'deep mahogany',
      distinguishingFeatures: 'naval insignia scar on left cheek; cybernetic right eye',
    },
    costume: overrides.costume ?? {
      primary: 'Retired dress uniform, charcoal grey with navy trim',
      detail: 'Well-kept but showing field wear',
      accessories: 'Distinguished Service Medal; tactical wrist display',
    },
    expressions: overrides.expressions ?? {
      defaultExpression: 'measured calm',
      secondaryExpression: 'tactical focus',
      rareExpression: 'quiet grief',
    },
    metaHuman: overrides.metaHuman ?? {
      presetBase: 'M_AfricanAmerican_05',
      ageSlider: 70,
      weightSlider: 55,
      muscleSlider: 60,
      skinComplexity: 'high_complexity',
    },
    generationPrompts: overrides.generationPrompts ?? {
      geminiPrompt: 'test prompt',
      grokPrompt: 'test prompt',
    },
    homeWorldId: overrides.homeWorldId ?? 'alkahest',
    isMultiWorld: overrides.isMultiWorld ?? false,
    hostility: overrides.hostility ?? 'friendly',
    interactions: overrides.interactions ?? ['talk', 'trade'],
    baseHealth: overrides.baseHealth ?? 200,
    awarenessRadius: overrides.awarenessRadius ?? 12,
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe('Bible Appearance Mapper', () => {

  // ── mapToCharacterAppearance ────────────────────────────────

  describe('mapToCharacterAppearance', () => {
    it('produces a complete CharacterAppearance', () => {
      const entry = makeEntry();
      const result = mapToCharacterAppearance(entry, 'ent-itoro');
      expect(result.entityId).toBe('ent-itoro');
      expect(result.displayName).toBe('Commodore (Ret.) Itoro Adeyemi-Okafor');
      expect(result.apparentSex).toBe('masculine');
      expect(result.skinTone).toBe('deep mahogany');
    });

    it('formats display name with title', () => {
      const entry = makeEntry({ title: 'Dr.' });
      const result = mapToCharacterAppearance(entry, 'ent-1');
      expect(result.displayName).toBe('Dr. Itoro Adeyemi-Okafor');
    });

    it('formats display name without title', () => {
      const entry = makeEntry({ title: null });
      const result = mapToCharacterAppearance(entry, 'ent-1');
      expect(result.displayName).toBe('Itoro Adeyemi-Okafor');
    });

    // ── Age Range Mapping ───────────────────────────────────

    it('maps age < 13 to child', () => {
      const entry = makeEntry({ appearance: { ...makeEntry().appearance, ageApprox: '10' } });
      expect(mapToCharacterAppearance(entry, 'e').ageRange).toBe('child');
    });

    it('maps age 13-19 to adolescent', () => {
      const entry = makeEntry({ appearance: { ...makeEntry().appearance, ageApprox: '16' } });
      expect(mapToCharacterAppearance(entry, 'e').ageRange).toBe('adolescent');
    });

    it('maps age 20-34 to young-adult', () => {
      const entry = makeEntry({ appearance: { ...makeEntry().appearance, ageApprox: '28' } });
      expect(mapToCharacterAppearance(entry, 'e').ageRange).toBe('young-adult');
    });

    it('maps age 35-59 to middle-aged', () => {
      const entry = makeEntry({ appearance: { ...makeEntry().appearance, ageApprox: '52-55' } });
      expect(mapToCharacterAppearance(entry, 'e').ageRange).toBe('middle-aged');
    });

    it('maps age 60-99 to elder', () => {
      const entry = makeEntry({ appearance: { ...makeEntry().appearance, ageApprox: '75' } });
      expect(mapToCharacterAppearance(entry, 'e').ageRange).toBe('elder');
    });

    it('maps age 100+ to ancient', () => {
      const entry = makeEntry({ appearance: { ...makeEntry().appearance, ageApprox: '120' } });
      expect(mapToCharacterAppearance(entry, 'e').ageRange).toBe('ancient');
    });

    it('defaults to middle-aged for non-numeric age', () => {
      const entry = makeEntry({ appearance: { ...makeEntry().appearance, ageApprox: 'ageless' } });
      expect(mapToCharacterAppearance(entry, 'e').ageRange).toBe('middle-aged');
    });

    // ── Body Build Mapping ──────────────────────────────────

    it('maps "powerful" to heavy build', () => {
      const entry = makeEntry({ appearance: { ...makeEntry().appearance, build: 'powerful' } });
      expect(mapToCharacterAppearance(entry, 'e').bodyBuild).toBe('heavy');
    });

    it('maps "lean" to lean build', () => {
      const entry = makeEntry({ appearance: { ...makeEntry().appearance, build: 'lean frame' } });
      expect(mapToCharacterAppearance(entry, 'e').bodyBuild).toBe('lean');
    });

    it('defaults to average for unknown build', () => {
      const entry = makeEntry({ appearance: { ...makeEntry().appearance, build: 'indeterminate' } });
      expect(mapToCharacterAppearance(entry, 'e').bodyBuild).toBe('average');
    });

    // ── Hair ────────────────────────────────────────────────

    it('maps short hair style', () => {
      const result = mapToCharacterAppearance(makeEntry(), 'e');
      expect(result.hair.length).toBe('short');
      expect(result.hair.color).toBe('salt-and-pepper grey');
    });

    it('maps bald style', () => {
      const entry = makeEntry({ appearance: { ...makeEntry().appearance, hairStyle: 'bald, smooth' } });
      expect(mapToCharacterAppearance(entry, 'e').hair.length).toBe('bald');
    });

    it('maps long flowing style', () => {
      const entry = makeEntry({ appearance: { ...makeEntry().appearance, hairStyle: 'long flowing braids' } });
      expect(mapToCharacterAppearance(entry, 'e').hair.length).toBe('long');
    });

    // ── Facial Features ─────────────────────────────────────

    it('maps angular build to angular jaw', () => {
      const entry = makeEntry({ appearance: { ...makeEntry().appearance, build: 'angular, thin' } });
      const result = mapToCharacterAppearance(entry, 'e');
      expect(result.facialFeatures.jaw).toBe('angular');
    });

    it('maps non-angular build to proportionate jaw', () => {
      const result = mapToCharacterAppearance(makeEntry(), 'e');
      expect(result.facialFeatures.jaw).toBe('proportionate');
    });

    it('uses defaultExpression for expressionTendency', () => {
      const result = mapToCharacterAppearance(makeEntry(), 'e');
      expect(result.facialFeatures.expressionTendency).toBe('measured calm');
    });

    // ── Attire ──────────────────────────────────────────────

    it('splits accessories by semicolon', () => {
      const result = mapToCharacterAppearance(makeEntry(), 'e');
      expect(result.attire.accessories).toEqual([
        'Distinguished Service Medal',
        'tactical wrist display',
      ]);
    });

    it('maps attire condition from detail', () => {
      const result = mapToCharacterAppearance(makeEntry(), 'e');
      expect(result.attire.condition).toBe('worn'); // "field wear" matches 'wear' before 'field'
    });

    it('extracts color palette from costume', () => {
      const result = mapToCharacterAppearance(makeEntry(), 'e');
      expect(result.attire.colorPalette).toContain('charcoal');
      expect(result.attire.colorPalette).toContain('navy');
    });

    // ── Tier to Archetype ───────────────────────────────────

    it('maps TIER_4 to legendary', () => {
      const entry = makeEntry({ tier: 'TIER_4' });
      expect(mapToCharacterAppearance(entry, 'e').archetype).toBe('legendary');
    });

    it('maps TIER_3 to notable', () => {
      const entry = makeEntry({ tier: 'TIER_3' });
      expect(mapToCharacterAppearance(entry, 'e').archetype).toBe('notable');
    });

    it('maps TIER_1 to inhabitant', () => {
      const entry = makeEntry({ tier: 'TIER_1' });
      expect(mapToCharacterAppearance(entry, 'e').archetype).toBe('inhabitant');
    });

    it('maps TIER_0 to ambient', () => {
      const entry = makeEntry({ tier: 'TIER_0' });
      expect(mapToCharacterAppearance(entry, 'e').archetype).toBe('ambient');
    });

    // ── Distinguishing Marks ────────────────────────────────

    it('splits distinguishing marks by semicolon', () => {
      const result = mapToCharacterAppearance(makeEntry(), 'e');
      expect(result.distinguishingMarks.length).toBe(2);
      expect(result.distinguishingMarks[0]).toContain('naval insignia scar');
    });

    // ── Cultural Style & Visual Mood ────────────────────────

    it('maps ethnicity inspiration to cultural style', () => {
      const result = mapToCharacterAppearance(makeEntry(), 'e');
      expect(result.culturalStyle).toBe('West African');
    });

    it('maps default expression to visual mood', () => {
      const result = mapToCharacterAppearance(makeEntry(), 'e');
      expect(result.visualMood).toBe('measured calm');
    });
  });

  // ── mapToAppearanceComponent ───────────────────────────────

  describe('mapToAppearanceComponent', () => {
    it('produces a complete AppearanceComponent', () => {
      const entry = makeEntry();
      const result = mapToAppearanceComponent(entry);
      expect(result.metaHumanPresetId).toBe('M_AfricanAmerican_05');
      expect(result.bodyBuild).toBe('stocky'); // "powerful, broad-shouldered" matches 'broad' first
      expect(result.ageRange).toBe('middle-aged'); // 52
      expect(result.skinTone).toBe('deep mahogany');
    });

    // ── Hair Hex Extraction ────────────────────────────────

    it('maps silver hair to #C0C0C0', () => {
      const entry = makeEntry({ appearance: { ...makeEntry().appearance, hairColor: 'silver white' } });
      expect(mapToAppearanceComponent(entry).hairColor).toBe('#C0C0C0');
    });

    it('maps blonde hair to #D4B87A', () => {
      const entry = makeEntry({ appearance: { ...makeEntry().appearance, hairColor: 'sandy blonde' } });
      expect(mapToAppearanceComponent(entry).hairColor).toBe('#D4B87A');
    });

    it('maps auburn/red hair to #8B3A3A', () => {
      const entry = makeEntry({ appearance: { ...makeEntry().appearance, hairColor: 'deep auburn' } });
      expect(mapToAppearanceComponent(entry).hairColor).toBe('#8B3A3A');
    });

    it('maps grey/salt hair to #808080', () => {
      const entry = makeEntry();
      expect(mapToAppearanceComponent(entry).hairColor).toBe('#808080'); // "salt-and-pepper grey"
    });

    it('defaults to dark #1C1C1C', () => {
      const entry = makeEntry({ appearance: { ...makeEntry().appearance, hairColor: 'jet black' } });
      expect(mapToAppearanceComponent(entry).hairColor).toBe('#1C1C1C');
    });

    // ── Eye Hex Extraction ─────────────────────────────────

    it('maps green eyes to #5B8C5A', () => {
      const entry = makeEntry({ appearance: { ...makeEntry().appearance, eyeColor: 'vivid green' } });
      expect(mapToAppearanceComponent(entry).eyeColor).toBe('#5B8C5A');
    });

    it('maps blue eyes to #6B8FAF', () => {
      const entry = makeEntry({ appearance: { ...makeEntry().appearance, eyeColor: 'ice blue' } });
      expect(mapToAppearanceComponent(entry).eyeColor).toBe('#6B8FAF');
    });

    it('maps dark/brown eyes to #3B2F2F', () => {
      const entry = makeEntry();
      expect(mapToAppearanceComponent(entry).eyeColor).toBe('#3B2F2F'); // "dark brown"
    });

    // ── Height Scale ────────────────────────────────────────

    it('maps tall to 1.08', () => {
      expect(mapToAppearanceComponent(makeEntry()).heightScale).toBe(1.08);
    });

    it('maps short to 0.9', () => {
      const entry = makeEntry({ appearance: { ...makeEntry().appearance, height: 'short' } });
      expect(mapToAppearanceComponent(entry).heightScale).toBe(0.9);
    });

    it('maps medium to 1.0', () => {
      const entry = makeEntry({ appearance: { ...makeEntry().appearance, height: 'medium' } });
      expect(mapToAppearanceComponent(entry).heightScale).toBe(1.0);
    });

    // ── Outfit Asset ID ─────────────────────────────────────

    it('generates outfit asset ID from preset', () => {
      expect(mapToAppearanceComponent(makeEntry()).outfitAssetId).toBe('outfit_m_africanamerican_05');
    });

    // ── Accessories ─────────────────────────────────────────

    it('generates accessory IDs from semicolon list', () => {
      const result = mapToAppearanceComponent(makeEntry());
      expect(result.accessories.length).toBe(2);
      expect(result.accessories[0]).toMatch(/^acc_/);
    });

    it('returns empty accessories for "None"', () => {
      const entry = makeEntry({ costume: { ...makeEntry().costume, accessories: 'None' } });
      expect(mapToAppearanceComponent(entry).accessories).toEqual([]);
    });

    // ── Facial Overrides ────────────────────────────────────

    it('maps MetaHuman sliders to facial overrides', () => {
      const result = mapToAppearanceComponent(makeEntry());
      expect(result.facialOverrides['age_intensity']).toBeCloseTo(0.7); // 70/100
      expect(result.facialOverrides['weight_intensity']).toBeCloseTo(0.55); // 55/100
      expect(result.facialOverrides['muscle_definition']).toBeCloseTo(0.6); // 60/100
    });
  });

  // ── Determinism ────────────────────────────────────────────

  describe('determinism', () => {
    it('same entry always produces identical CharacterAppearance', () => {
      const entry = makeEntry();
      const a = mapToCharacterAppearance(entry, 'x');
      const b = mapToCharacterAppearance(entry, 'x');
      expect(a).toEqual(b);
    });

    it('same entry always produces identical AppearanceComponent', () => {
      const entry = makeEntry();
      const a = mapToAppearanceComponent(entry);
      const b = mapToAppearanceComponent(entry);
      expect(a).toEqual(b);
    });
  });
});
