import { describe, it, expect } from 'vitest';
import {
  buildCharacterImagePrompt,
  buildMetaHumanBrief,
  buildMediaAssetRecord,
  STANDARD_NEGATIVE_PROMPT,
  type CharacterArtRequest,
  type ArtStyleVariant,
} from '../universe/media-pipeline/character-pipeline.js';
import type { CharacterProfile } from '../universe/characters/types.js';

// ─── Test Fixtures ────────────────────────────────────────────────

function makeCharacter(overrides: Partial<CharacterProfile> = {}): CharacterProfile {
  return {
    id: 'char-nimbus-001',
    name: 'Nimbus',
    worldId: 'world-maths-realm',
    gender: 'non_binary',
    culturalOrigin: 'West African',
    age: 'ancient_timeless',
    metahumanClass: 'stylised_human',
    disability: 'none',
    subject: 'Mathematics',
    wound: 'abandoned by students who gave up',
    gift: 'sees the pattern in everything',
    personality: {
      speechStyle: 'gentle and rhythmic',
      emotionalRange: ['warm', 'curious'],
      teachingApproach: 'story-first',
      catchphrase: 'Let the numbers speak',
      quirks: ['hums when thinking'],
    },
    visualDescription: 'tall elder with silver locs, warm amber eyes, draped in deep indigo robes',
    leitmotif: 'flowing river melody',
    ...overrides,
  };
}

function makeRequest(overrides: Partial<CharacterArtRequest> = {}): CharacterArtRequest {
  return {
    character: makeCharacter(),
    artStyle: 'portrait_3_4',
    lightingMood: 'warm golden hour',
    backgroundColor: 'soft gradient earth tones',
    ...overrides,
  };
}

// ─── STANDARD_NEGATIVE_PROMPT ─────────────────────────────────────

describe('STANDARD_NEGATIVE_PROMPT', () => {
  it('is a non-empty string', () => {
    expect(typeof STANDARD_NEGATIVE_PROMPT).toBe('string');
    expect(STANDARD_NEGATIVE_PROMPT.length).toBeGreaterThan(20);
  });

  it('blocks photorealistic content', () => {
    expect(STANDARD_NEGATIVE_PROMPT).toContain('photorealistic');
  });

  it('blocks adult and violence content', () => {
    expect(STANDARD_NEGATIVE_PROMPT).toContain('adult content');
    expect(STANDARD_NEGATIVE_PROMPT).toContain('violence');
  });

  it('blocks stereotypical disability representation', () => {
    expect(STANDARD_NEGATIVE_PROMPT).toContain('stereotypical disability');
  });

  it('blocks watermarks and low quality', () => {
    expect(STANDARD_NEGATIVE_PROMPT).toContain('watermark');
    expect(STANDARD_NEGATIVE_PROMPT).toContain('low quality');
  });
});

// ─── buildCharacterImagePrompt ────────────────────────────────────

describe('buildCharacterImagePrompt — output content', () => {
  it('includes the character name', () => {
    const result = buildCharacterImagePrompt(makeRequest());
    expect(result).toContain('Nimbus');
  });

  it('includes the visual description', () => {
    const result = buildCharacterImagePrompt(makeRequest());
    expect(result).toContain('silver locs');
  });

  it('includes the lighting mood', () => {
    const result = buildCharacterImagePrompt(makeRequest());
    expect(result).toContain('warm golden hour');
  });

  it('includes the background color', () => {
    const result = buildCharacterImagePrompt(makeRequest());
    expect(result).toContain('soft gradient earth tones');
  });

  it('includes the cultural origin', () => {
    const result = buildCharacterImagePrompt(makeRequest());
    expect(result).toContain('West African');
  });

  it('includes the Studio Ghibli art style marker', () => {
    const result = buildCharacterImagePrompt(makeRequest());
    expect(result).toContain('Studio Ghibli');
  });

  it('returns a single string (not multi-line)', () => {
    const result = buildCharacterImagePrompt(makeRequest());
    expect(result).not.toContain('\n');
  });
});

describe('buildCharacterImagePrompt — disability handling', () => {
  it('omits disability note when disability is "none"', () => {
    const result = buildCharacterImagePrompt(makeRequest({ character: makeCharacter({ disability: 'none' }) }));
    // No empty segment — the filter should remove blank lines
    expect(result).not.toMatch(/\.\s+\./);   // no consecutive sentence-terminator gaps
  });

  it('includes prosthetic_hand note when disability is prosthetic_hand', () => {
    const result = buildCharacterImagePrompt(makeRequest({
      character: makeCharacter({ disability: 'prosthetic_hand' }),
    }));
    expect(result).toContain('prosthetic');
  });

  it('includes wheelchair note when disability is wheelchair_user', () => {
    const result = buildCharacterImagePrompt(makeRequest({
      character: makeCharacter({ disability: 'wheelchair_user' }),
    }));
    expect(result).toContain('wheelchair');
  });

  it('includes hearing_aids note when disability is hearing_aids', () => {
    const result = buildCharacterImagePrompt(makeRequest({
      character: makeCharacter({ disability: 'hearing_aids' }),
    }));
    expect(result).toContain('hearing aids');
  });
});

describe('buildCharacterImagePrompt — art style variants', () => {
  const styles: ArtStyleVariant[] = ['portrait_3_4', 'portrait_front', 'full_body', 'expression_sheet'];

  for (const artStyle of styles) {
    it(`produces a non-empty prompt for artStyle "${artStyle}"`, () => {
      const result = buildCharacterImagePrompt(makeRequest({ artStyle }));
      expect(result.length).toBeGreaterThan(50);
    });
  }

  it('expression_sheet prompt includes 6-panel reference', () => {
    const result = buildCharacterImagePrompt(makeRequest({ artStyle: 'expression_sheet' }));
    expect(result).toContain('6-panel');
  });

  it('portrait_front prompt mentions avatar crop', () => {
    const result = buildCharacterImagePrompt(makeRequest({ artStyle: 'portrait_front' }));
    expect(result).toContain('avatar');
  });

  it('full_body prompt mentions full body', () => {
    const result = buildCharacterImagePrompt(makeRequest({ artStyle: 'full_body' }));
    expect(result).toContain('Full body');
  });
});

// ─── buildMetaHumanBrief ──────────────────────────────────────────

describe('buildMetaHumanBrief — output shape', () => {
  const conceptArtUrl = 'https://storage.koydo.io/char-nimbus-001/portrait_3_4.webp';

  it('returns the correct characterId and name', () => {
    const brief = buildMetaHumanBrief(makeCharacter(), conceptArtUrl);
    expect(brief.characterId).toBe('char-nimbus-001');
    expect(brief.characterName).toBe('Nimbus');
  });

  it('stores the concept art URL', () => {
    const brief = buildMetaHumanBrief(makeCharacter(), conceptArtUrl);
    expect(brief.conceptArtUrl).toBe(conceptArtUrl);
  });

  it('status is brief_ready on creation', () => {
    const brief = buildMetaHumanBrief(makeCharacter(), conceptArtUrl);
    expect(brief.status).toBe('brief_ready');
  });

  it('lipsyncRequired is true', () => {
    const brief = buildMetaHumanBrief(makeCharacter(), conceptArtUrl);
    expect(brief.lipsyncRequired).toBe(true);
  });

  it('includes physical notes from visual description', () => {
    const brief = buildMetaHumanBrief(makeCharacter(), conceptArtUrl);
    expect(brief.physicalNotes).toContain('silver locs');
  });

  it('cultural authenticity notes mention the culturalOrigin', () => {
    const brief = buildMetaHumanBrief(makeCharacter(), conceptArtUrl);
    expect(brief.culturalAuthenticityNotes).toContain('West African');
  });

  it('disability implementation notes are empty string when disability is none', () => {
    const brief = buildMetaHumanBrief(makeCharacter({ disability: 'none' }), conceptArtUrl);
    expect(brief.disabilityImplementationNotes).toBe('');
  });

  it('disability implementation notes are populated when disability is set', () => {
    const brief = buildMetaHumanBrief(makeCharacter({ disability: 'blindness' }), conceptArtUrl);
    expect(brief.disabilityImplementationNotes.length).toBeGreaterThan(0);
    expect(brief.disabilityImplementationNotes).toContain('blind');
  });

  it('ACE facial animation priority includes personality emotions and required constants', () => {
    const brief = buildMetaHumanBrief(makeCharacter(), conceptArtUrl);
    expect(brief.aceFacialAnimationPriority).toContain('gentle_correction');
    expect(brief.aceFacialAnimationPriority).toContain('listening');
  });

  it('createdAt is a recent epoch timestamp', () => {
    const before = Date.now();
    const brief = buildMetaHumanBrief(makeCharacter(), conceptArtUrl);
    const after = Date.now();
    expect(brief.createdAt).toBeGreaterThanOrEqual(before);
    expect(brief.createdAt).toBeLessThanOrEqual(after);
  });
});

// ─── buildMediaAssetRecord ────────────────────────────────────────

describe('buildMediaAssetRecord — output shape', () => {
  const BASE_PARAMS = {
    characterId: 'char-nimbus-001',
    artStyle: 'portrait_3_4' as ArtStyleVariant,
    storageUrl: 'https://storage.koydo.io/char-nimbus-001/portrait_3_4.webp',
    generatedAt: 1_700_000_000_000,
  };

  it('id contains characterId', () => {
    const record = buildMediaAssetRecord(BASE_PARAMS);
    expect(record.id).toContain('char-nimbus-001');
  });

  it('id contains artStyle', () => {
    const record = buildMediaAssetRecord(BASE_PARAMS);
    expect(record.id).toContain('portrait_3_4');
  });

  it('entryId is the characterId', () => {
    const record = buildMediaAssetRecord(BASE_PARAMS);
    expect(record.entryId).toBe('char-nimbus-001');
  });

  it('assetType is artifact_visual', () => {
    const record = buildMediaAssetRecord(BASE_PARAMS);
    expect(record.assetType).toBe('artifact_visual');
  });

  it('url is the storageUrl', () => {
    const record = buildMediaAssetRecord(BASE_PARAMS);
    expect(record.url).toBe(BASE_PARAMS.storageUrl);
  });

  it('provider is fal_ai', () => {
    const record = buildMediaAssetRecord(BASE_PARAMS);
    expect(record.provider).toBe('fal_ai');
  });

  it('generatedAt matches input', () => {
    const record = buildMediaAssetRecord(BASE_PARAMS);
    expect(record.generatedAt).toBe(BASE_PARAMS.generatedAt);
  });
});
