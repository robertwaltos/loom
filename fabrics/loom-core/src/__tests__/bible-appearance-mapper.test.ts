import { describe, it, expect } from 'vitest';
import {
  mapToCharacterAppearance,
  mapToAppearanceComponent,
} from '../bible-appearance-mapper.js';
import type { CharacterEntry } from '@loom/entities-contracts';

// ── Test Factory ───────────────────────────────────────────────

function makeEntry(overrides: Partial<CharacterEntry> = {}): CharacterEntry {
  return {
    characterId: 1,
    displayName: 'Itoro Adeyemi',
    title: null,
    tier: 'TIER_2',
    faction: 'assembly',
    appearance: {
      apparentSex: 'feminine',
      ageApprox: '43',
      ethnicityInspiration: 'West African',
      build: 'lean',
      height: 'tall',
      hairColor: 'raven black',
      hairStyle: 'cropped',
      eyeColor: 'deep brown',
      skinTone: 'deep ebony',
      distinguishingFeatures: 'faint scar; sharp eyes',
    },
    costume: {
      primary: 'navy trench coat',
      detail: 'well-maintained, formal',
      accessories: 'silver lapel pin; leather bracelet',
    },
    expressions: {
      defaultExpression: 'composed',
      secondaryExpression: 'calculating',
      rareExpression: 'smiled genuinely',
    },
    metaHuman: {
      presetBase: 'F_AfricanAmerican_03',
      ageSlider: 43,
      weightSlider: 45,
      muscleSlider: 50,
      skinComplexity: 'medium_complexity',
    },
    generationPrompts: {
      geminiPrompt: 'woman, lean, forties',
      grokPrompt: 'woman lean forties',
    },
    homeWorldId: 'alkahest',
    isMultiWorld: false,
    hostility: 'neutral',
    interactions: ['talk', 'trade'],
    baseHealth: 100,
    awarenessRadius: 15,
    ...overrides,
  };
}

// ── mapToCharacterAppearance ───────────────────────────────────

describe('mapToCharacterAppearance — entity fields', () => {
  it('passes through entityId and displayName', () => {
    const result = mapToCharacterAppearance(makeEntry(), 'ent-42');
    expect(result.entityId).toBe('ent-42');
    expect(result.displayName).toBe('Itoro Adeyemi');
  });

  it('includes title in displayName when present', () => {
    const result = mapToCharacterAppearance(makeEntry({ title: 'Dr.' }), 'x');
    expect(result.displayName).toBe('Dr. Itoro Adeyemi');
  });

  it('passes through skinTone, culturalStyle, visualMood', () => {
    const result = mapToCharacterAppearance(makeEntry(), 'ent-1');
    expect(result.skinTone).toBe('deep ebony');
    expect(result.culturalStyle).toBe('West African');
    expect(result.visualMood).toBe('composed');
  });
});

describe('mapToCharacterAppearance — body build mapping', () => {
  it('maps lean build', () => {
    const result = mapToCharacterAppearance(makeEntry(), 'e');
    expect(result.bodyBuild).toBe('lean');
  });

  it('maps broad to stocky', () => {
    const e = makeEntry({ appearance: { ...makeEntry().appearance, build: 'broad shoulders' } });
    expect(mapToCharacterAppearance(e, 'e').bodyBuild).toBe('stocky');
  });

  it('defaults to average for unknown build', () => {
    const e = makeEntry({ appearance: { ...makeEntry().appearance, build: 'undefined' } });
    expect(mapToCharacterAppearance(e, 'e').bodyBuild).toBe('average');
  });
});

describe('mapToCharacterAppearance — age range mapping', () => {
  it('maps age 43 to middle-aged', () => {
    expect(mapToCharacterAppearance(makeEntry(), 'e').ageRange).toBe('middle-aged');
  });

  it('maps age 25 to young-adult', () => {
    const e = makeEntry({ appearance: { ...makeEntry().appearance, ageApprox: '25 years' } });
    expect(mapToCharacterAppearance(e, 'e').ageRange).toBe('young-adult');
  });

  it('maps age 70 to elder', () => {
    const e = makeEntry({ appearance: { ...makeEntry().appearance, ageApprox: '70' } });
    expect(mapToCharacterAppearance(e, 'e').ageRange).toBe('elder');
  });

  it('defaults to middle-aged when no numeric', () => {
    const e = makeEntry({ appearance: { ...makeEntry().appearance, ageApprox: 'unknown' } });
    expect(mapToCharacterAppearance(e, 'e').ageRange).toBe('middle-aged');
  });
});

describe('mapToCharacterAppearance — hair mapping', () => {
  it('cropped hair maps to short length', () => {
    const result = mapToCharacterAppearance(makeEntry(), 'e');
    expect(result.hair.length).toBe('short');
  });

  it('flowing hair maps to long length', () => {
    const e = makeEntry({ appearance: { ...makeEntry().appearance, hairStyle: 'flowing waves' } });
    expect(mapToCharacterAppearance(e, 'e').hair.length).toBe('long');
  });

  it('bald maps to bald', () => {
    const e = makeEntry({ appearance: { ...makeEntry().appearance, hairStyle: 'bald' } });
    expect(mapToCharacterAppearance(e, 'e').hair.length).toBe('bald');
  });

  it('passes hairColor through', () => {
    expect(mapToCharacterAppearance(makeEntry(), 'e').hair.color).toBe('raven black');
  });
});

describe('mapToCharacterAppearance — attire', () => {
  it('maps formal detail to well-kept condition', () => {
    const result = mapToCharacterAppearance(makeEntry(), 'e');
    expect(result.attire.condition).toBe('well-kept');
  });

  it('maps worn detail to worn condition', () => {
    const e = makeEntry({ costume: { ...makeEntry().costume, detail: 'worn through use' } });
    expect(mapToCharacterAppearance(e, 'e').attire.condition).toBe('worn');
  });

  it('maps immaculate detail to pristine condition', () => {
    const e = makeEntry({ costume: { ...makeEntry().costume, detail: 'immaculate finish' } });
    expect(mapToCharacterAppearance(e, 'e').attire.condition).toBe('pristine');
  });

  it('maps battle detail to battle-worn condition', () => {
    const e = makeEntry({ costume: { ...makeEntry().costume, detail: 'battle-scarred' } });
    expect(mapToCharacterAppearance(e, 'e').attire.condition).toBe('battle-worn');
  });

  it('splits accessories on semicolon', () => {
    const result = mapToCharacterAppearance(makeEntry(), 'e');
    expect(result.attire.accessories).toHaveLength(2);
  });
});

describe('mapToCharacterAppearance — tier archetype', () => {
  it('TIER_4 maps to legendary', () => {
    expect(mapToCharacterAppearance(makeEntry({ tier: 'TIER_4' }), 'e').archetype).toBe('legendary');
  });

  it('TIER_3 maps to notable', () => {
    expect(mapToCharacterAppearance(makeEntry({ tier: 'TIER_3' }), 'e').archetype).toBe('notable');
  });

  it('TIER_1 maps to inhabitant', () => {
    expect(mapToCharacterAppearance(makeEntry({ tier: 'TIER_1' }), 'e').archetype).toBe('inhabitant');
  });

  it('TIER_0 maps to ambient', () => {
    expect(mapToCharacterAppearance(makeEntry({ tier: 'TIER_0' }), 'e').archetype).toBe('ambient');
  });
});

describe('mapToCharacterAppearance — distinguishing marks', () => {
  it('splits distinguishingFeatures on semicolon, filters blanks', () => {
    const result = mapToCharacterAppearance(makeEntry(), 'e');
    expect(result.distinguishingMarks).toHaveLength(2);
    expect(result.distinguishingMarks).toContain('faint scar');
  });
});

// ── mapToAppearanceComponent ───────────────────────────────────

describe('mapToAppearanceComponent — core fields', () => {
  it('passes metaHumanPresetId through', () => {
    expect(mapToAppearanceComponent(makeEntry()).metaHumanPresetId).toBe('F_AfricanAmerican_03');
  });

  it('derives outfitAssetId from presetBase in lowercase', () => {
    expect(mapToAppearanceComponent(makeEntry()).outfitAssetId).toBe('outfit_f_africanamerican_03');
  });
});

describe('mapToAppearanceComponent — height scale', () => {
  it('tall height maps to 1.08', () => {
    expect(mapToAppearanceComponent(makeEntry()).heightScale).toBe(1.08);
  });

  it('medium height maps to 1.0', () => {
    const e = makeEntry({ appearance: { ...makeEntry().appearance, height: 'medium' } });
    expect(mapToAppearanceComponent(e).heightScale).toBe(1.0);
  });
});

describe('mapToAppearanceComponent — hair/eye hex', () => {
  it('raven black hair maps to dark hex', () => {
    expect(mapToAppearanceComponent(makeEntry()).hairColor).toBe('#1C1C1C');
  });

  it('silver hair maps to #C0C0C0', () => {
    const e = makeEntry({ appearance: { ...makeEntry().appearance, hairColor: 'silver' } });
    expect(mapToAppearanceComponent(e).hairColor).toBe('#C0C0C0');
  });

  it('blonde hair maps to #D4B87A', () => {
    const e = makeEntry({ appearance: { ...makeEntry().appearance, hairColor: 'golden blonde' } });
    expect(mapToAppearanceComponent(e).hairColor).toBe('#D4B87A');
  });

  it('brown eye color maps to dark hex', () => {
    expect(mapToAppearanceComponent(makeEntry()).eyeColor).toBe('#3B2F2F');
  });

  it('green eye color maps to #5B8C5A', () => {
    const e = makeEntry({ appearance: { ...makeEntry().appearance, eyeColor: 'sharp green' } });
    expect(mapToAppearanceComponent(e).eyeColor).toBe('#5B8C5A');
  });
});

describe('mapToAppearanceComponent — accessories', () => {
  it('splits and slugifies semicolon-separated accessories', () => {
    const result = mapToAppearanceComponent(makeEntry());
    expect(result.accessories).toHaveLength(2);
    expect(result.accessories[0]).toMatch(/^acc_/);
  });

  it('returns empty array when accessories is none', () => {
    const e = makeEntry({ costume: { ...makeEntry().costume, accessories: 'none' } });
    expect(mapToAppearanceComponent(e).accessories).toHaveLength(0);
  });
});

describe('mapToAppearanceComponent — facial overrides', () => {
  it('scales metaHuman sliders to [0,1]', () => {
    const result = mapToAppearanceComponent(makeEntry());
    expect(result.facialOverrides['age_intensity']).toBeCloseTo(0.43);
    expect(result.facialOverrides['weight_intensity']).toBeCloseTo(0.45);
    expect(result.facialOverrides['muscle_definition']).toBeCloseTo(0.5);
  });
});
