/**
 * Media Pipeline — Character Pipeline Simulation Tests
 *
 * Tests for the pure prompt/brief/asset builder functions:
 * - buildCharacterImagePrompt — prompt string construction
 * - buildMetaHumanBrief — handoff document structure
 * - buildMediaAssetRecord — asset record id format and fields
 * - STANDARD_NEGATIVE_PROMPT — safety keyword presence
 *
 * Thread: silk/universe/media-pipeline-sim
 * Tier: 1
 */

import { describe, it, expect } from 'vitest';
import {
  buildCharacterImagePrompt,
  buildMetaHumanBrief,
  buildMediaAssetRecord,
  STANDARD_NEGATIVE_PROMPT,
} from '../character-pipeline.js';
import type { CharacterArtRequest } from '../character-pipeline.js';
import type { CharacterProfile } from '../../characters/types.js';

// ─── Fixtures ─────────────────────────────────────────────────────

function makeCharacterProfile(overrides?: Partial<CharacterProfile>): CharacterProfile {
  return {
    id: 'professor-nimbus',
    name: 'Professor Nimbus',
    worldId: 'cloud-kingdom',
    gender: 'male',
    culturalOrigin: 'Scottish',
    age: 'elder',
    metahumanClass: 'standard_metahuman',
    disability: 'none',
    subject: 'Weather Science',
    wound: 'Lost students in a storm and carries that weight.',
    gift: 'Reads the sky like a book',
    personality: {
      speechStyle: 'Gentle rhyming observations',
      emotionalRange: ['warm', 'curious'],
      teachingApproach: 'Collaborative inquiry — asks questions back',
      catchphrase: null,
      quirks: ['Hums when thinking', 'Names every cloud'],
    },
    visualDescription: 'Tall elder with a white beard and storm-grey coat.',
    leitmotif: 'Theremin wind',
    ...overrides,
  } as CharacterProfile;
}

function makeRequest(overrides?: Partial<CharacterArtRequest>): CharacterArtRequest {
  return {
    character: makeCharacterProfile(),
    artStyle: 'portrait_3_4',
    lightingMood: 'soft overcast daylight',
    backgroundColor: 'misty highland sky',
    ...overrides,
  };
}

// ─── STANDARD_NEGATIVE_PROMPT ─────────────────────────────────────

describe('STANDARD_NEGATIVE_PROMPT', () => {
  it('is a non-empty string', () => {
    expect(typeof STANDARD_NEGATIVE_PROMPT).toBe('string');
    expect(STANDARD_NEGATIVE_PROMPT.length).toBeGreaterThan(10);
  });

  it('contains safety-critical rejection terms', () => {
    const prompt = STANDARD_NEGATIVE_PROMPT.toLowerCase();
    expect(prompt).toContain('photorealistic');
    expect(prompt).toContain('violence');
    expect(prompt).toContain('adult content');
    expect(prompt).toContain('watermark');
  });

  it('rejects stereotypical disability framing', () => {
    expect(STANDARD_NEGATIVE_PROMPT.toLowerCase()).toContain('stereotypical disability');
  });
});

// ─── buildCharacterImagePrompt ────────────────────────────────────

describe('buildCharacterImagePrompt', () => {
  it('includes the character name in the prompt', () => {
    const prompt = buildCharacterImagePrompt(makeRequest());
    expect(prompt).toContain('Professor Nimbus');
  });

  it('includes the visual description', () => {
    const prompt = buildCharacterImagePrompt(makeRequest());
    expect(prompt).toContain('Tall elder with a white beard');
  });

  it('includes the Studio Ghibli art direction', () => {
    const prompt = buildCharacterImagePrompt(makeRequest());
    expect(prompt).toContain('Studio Ghibli');
    expect(prompt).toContain('National Geographic');
  });

  it('includes the requested lighting and background', () => {
    const prompt = buildCharacterImagePrompt(makeRequest());
    expect(prompt).toContain('soft overcast daylight');
    expect(prompt).toContain('misty highland sky');
  });

  it('includes cultural authenticity phrase', () => {
    const prompt = buildCharacterImagePrompt(makeRequest());
    expect(prompt).toContain('Culturally authentic representation of Scottish');
  });

  it('includes the art style guide for portrait_3_4', () => {
    const prompt = buildCharacterImagePrompt(makeRequest({ artStyle: 'portrait_3_4' }));
    expect(prompt.toLowerCase()).toContain('three-quarter');
  });

  it('includes the art style guide for portrait_front', () => {
    const prompt = buildCharacterImagePrompt(makeRequest({ artStyle: 'portrait_front' }));
    expect(prompt.toLowerCase()).toContain('front-facing');
  });

  it('does not include a disability note when disability is none', () => {
    const character = makeCharacterProfile({ disability: 'none' });
    const prompt = buildCharacterImagePrompt(makeRequest({ character }));
    // No disability description should be present for 'none'
    expect(prompt).not.toContain('prosthetic');
    expect(prompt).not.toContain('wheelchair');
    expect(prompt).not.toContain('hearing aid');
  });

  it('includes a disability note when character has a prosthetic hand', () => {
    const character = makeCharacterProfile({ disability: 'prosthetic_hand' });
    const prompt = buildCharacterImagePrompt(makeRequest({ character }));
    expect(prompt.toLowerCase()).toContain('prosthetic');
  });

  it('includes a disability note when character uses a wheelchair', () => {
    const character = makeCharacterProfile({ disability: 'wheelchair_user' });
    const prompt = buildCharacterImagePrompt(makeRequest({ character }));
    expect(prompt.toLowerCase()).toContain('wheelchair');
  });

  it('returns a single string with no empty segments', () => {
    const prompt = buildCharacterImagePrompt(makeRequest());
    expect(typeof prompt).toBe('string');
    // Should not have double-spaces from empty filtered lines
    expect(prompt).not.toMatch(/  +/);
  });
});

// ─── buildMetaHumanBrief ──────────────────────────────────────────

describe('buildMetaHumanBrief', () => {
  const character = makeCharacterProfile();
  const brief = buildMetaHumanBrief(character, 'https://cdn.koydo.com/art/nimbus-concept.png');

  it('includes characterId and characterName', () => {
    expect(brief.characterId).toBe('professor-nimbus');
    expect(brief.characterName).toBe('Professor Nimbus');
  });

  it('carries the concept art URL through', () => {
    expect(brief.conceptArtUrl).toBe('https://cdn.koydo.com/art/nimbus-concept.png');
  });

  it('sets the metahumanClass from the character profile', () => {
    expect(brief.metahumanClass).toBe('standard_metahuman');
  });

  it('sets physicalNotes from visualDescription', () => {
    expect(brief.physicalNotes).toContain('white beard');
  });

  it('sets culturalAuthenticityNotes from culturalOrigin', () => {
    expect(brief.culturalAuthenticityNotes).toContain('Scottish');
    expect(brief.culturalAuthenticityNotes.toLowerCase()).toContain('cultural advisor');
  });

  it('sets lipsyncRequired to true', () => {
    expect(brief.lipsyncRequired).toBe(true);
  });

  it('sets eyeMovementStyle to natural_engaged', () => {
    expect(brief.eyeMovementStyle).toBe('natural_engaged');
  });

  it('sets status to brief_ready', () => {
    expect(brief.status).toBe('brief_ready');
  });

  it('sets createdAt to a number (timestamp)', () => {
    expect(typeof brief.createdAt).toBe('number');
    expect(brief.createdAt).toBeGreaterThan(0);
  });

  it('includes character emotions in ACE animation priorities', () => {
    expect(brief.aceFacialAnimationPriority).toContain('warm');
    expect(brief.aceFacialAnimationPriority).toContain('curious');
  });

  it('always includes gentle_correction and listening in ACE priorities', () => {
    expect(brief.aceFacialAnimationPriority).toContain('gentle_correction');
    expect(brief.aceFacialAnimationPriority).toContain('listening');
  });

  it('sets disabilityImplementationNotes to empty string when disability is none', () => {
    const noneChar = makeCharacterProfile({ disability: 'none' });
    const noBrief = buildMetaHumanBrief(noneChar, 'https://example.com/art.png');
    expect(noBrief.disabilityImplementationNotes).toBe('');
  });

  it('sets disabilityImplementationNotes when disability is present', () => {
    const proChar = makeCharacterProfile({ disability: 'prosthetic_hand' });
    const proBrief = buildMetaHumanBrief(proChar, 'https://example.com/art.png');
    expect(proBrief.disabilityImplementationNotes.toLowerCase()).toContain('prosthetic');
  });
});

// ─── buildMediaAssetRecord ────────────────────────────────────────

describe('buildMediaAssetRecord', () => {
  const params = {
    characterId: 'grandmother-anaya',
    artStyle: 'portrait_3_4' as const,
    storageUrl: 'https://storage.koydo.com/art/anaya.png',
    generatedAt: 1700000000000,
  };

  it('generates the asset id in the expected format', () => {
    const asset = buildMediaAssetRecord(params);
    expect(asset.id).toBe('asset-grandmother-anaya-portrait_3_4-1700000000000');
  });

  it('sets entryId to the characterId', () => {
    const asset = buildMediaAssetRecord(params);
    expect(asset.entryId).toBe('grandmother-anaya');
  });

  it('sets assetType to artifact_visual', () => {
    const asset = buildMediaAssetRecord(params);
    expect(asset.assetType).toBe('artifact_visual');
  });

  it('sets provider to fal_ai', () => {
    const asset = buildMediaAssetRecord(params);
    expect(asset.provider).toBe('fal_ai');
  });

  it('carries through the storage URL and generatedAt', () => {
    const asset = buildMediaAssetRecord(params);
    expect(asset.url).toBe('https://storage.koydo.com/art/anaya.png');
    expect(asset.generatedAt).toBe(1700000000000);
  });

  it('generates distinct ids for different art styles', () => {
    const front = buildMediaAssetRecord({ ...params, artStyle: 'portrait_front' });
    const full = buildMediaAssetRecord({ ...params, artStyle: 'full_body' });
    expect(front.id).not.toBe(params.artStyle);
    expect(front.id).toContain('portrait_front');
    expect(full.id).toContain('full_body');
  });
});
