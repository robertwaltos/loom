/**
 * Characters Engine — Simulation Tests
 *
 * Tests for the adaptive character dispatch engine and the prompt
 * builder for Grandmother Anaya (representative of all guide prompts).
 *
 * Thread: silk/universe/characters-engine-sim
 * Tier: 1
 */

import { describe, it, expect } from 'vitest';
import { createCharactersEngine } from '../engine.js';
import type { CharactersEngineDeps, SysPromptBuilder } from '../engine.js';
import type { AdaptivePromptLayer, CharacterSystemPrompt } from '../types.js';
import { buildAnayaSysPrompt } from '../prompts/grandmother-anaya.js';

// ─── Helpers ──────────────────────────────────────────────────────

function makeLayer(overrides?: Partial<AdaptivePromptLayer>): AdaptivePromptLayer {
  return {
    childAge: 7,
    difficultyTier: 2,
    completedEntryIds: [],
    vocabularyLevel: 'intermediate',
    ...overrides,
  };
}

function makeDeps(characterIds: string[]): CharactersEngineDeps {
  const builders = new Map<string, SysPromptBuilder>();
  for (const id of characterIds) {
    const capturedId = id;
    builders.set(capturedId, (layer: AdaptivePromptLayer): CharacterSystemPrompt => ({
      characterId: capturedId,
      basePersonality: `${capturedId} personality`,
      subjectKnowledge: [`${capturedId} knowledge`],
      adaptiveLayer: layer,
    }));
  }
  return { builders };
}

// ─── Engine Registration ──────────────────────────────────────────

describe('supportsCharacter', () => {
  it('returns true for a registered character', () => {
    const engine = createCharactersEngine(makeDeps(['grandmother-anaya']));
    expect(engine.supportsCharacter('grandmother-anaya')).toBe(true);
  });

  it('returns false for an unregistered character', () => {
    const engine = createCharactersEngine(makeDeps([]));
    expect(engine.supportsCharacter('mystery-guide')).toBe(false);
  });

  it('is case-sensitive', () => {
    const engine = createCharactersEngine(makeDeps(['zara-ngozi']));
    expect(engine.supportsCharacter('Zara-Ngozi')).toBe(false);
  });
});

describe('getCharacterIds', () => {
  it('returns all registered character ids', () => {
    const engine = createCharactersEngine(makeDeps(['professor-nimbus', 'baxter', 'riku-osei']));
    const ids = engine.getCharacterIds();
    expect(ids).toContain('professor-nimbus');
    expect(ids).toContain('baxter');
    expect(ids).toContain('riku-osei');
    expect(ids.length).toBe(3);
  });

  it('returns empty array when no characters registered', () => {
    const engine = createCharactersEngine(makeDeps([]));
    expect(engine.getCharacterIds().length).toBe(0);
  });
});

// ─── buildSystemPrompt ────────────────────────────────────────────

describe('buildSystemPrompt', () => {
  it('returns a system prompt for a registered character', () => {
    const engine = createCharactersEngine(makeDeps(['grandmother-anaya']));
    const prompt = engine.buildSystemPrompt('grandmother-anaya', makeLayer());
    expect(prompt.characterId).toBe('grandmother-anaya');
    expect(prompt.adaptiveLayer.difficultyTier).toBe(2);
  });

  it('throws for an unregistered character id', () => {
    const engine = createCharactersEngine(makeDeps([]));
    expect(() => engine.buildSystemPrompt('ghost-guide', makeLayer())).toThrow(
      /No builder registered for character: ghost-guide/,
    );
  });

  it('passes adaptive layer through to the returned prompt', () => {
    const layer = makeLayer({ childAge: 9, difficultyTier: 3, vocabularyLevel: 'advanced' });
    const engine = createCharactersEngine(makeDeps(['pixel']));
    const prompt = engine.buildSystemPrompt('pixel', layer);
    expect(prompt.adaptiveLayer.childAge).toBe(9);
    expect(prompt.adaptiveLayer.vocabularyLevel).toBe('advanced');
  });

  it('multiple characters can be dispatched independently', () => {
    const engine = createCharactersEngine(
      makeDeps(['grandmother-anaya', 'professor-nimbus']),
    );
    const p1 = engine.buildSystemPrompt('grandmother-anaya', makeLayer());
    const p2 = engine.buildSystemPrompt('professor-nimbus', makeLayer());
    expect(p1.characterId).toBe('grandmother-anaya');
    expect(p2.characterId).toBe('professor-nimbus');
  });
});

// ─── Grandmother Anaya Prompt Builder ────────────────────────────

describe('buildAnayaSysPrompt', () => {
  it('returns characterId grandmother-anaya', () => {
    const prompt = buildAnayaSysPrompt(makeLayer());
    expect(prompt.characterId).toBe('grandmother-anaya');
  });

  it('includes her wound in the base personality', () => {
    const prompt = buildAnayaSysPrompt(makeLayer());
    expect(prompt.basePersonality).toContain('house fire');
  });

  it('includes story-specific voice markers', () => {
    const prompt = buildAnayaSysPrompt(makeLayer());
    expect(prompt.basePersonality).toContain('I once knew a child who');
  });

  it('exposes subject knowledge entries', () => {
    const prompt = buildAnayaSysPrompt(makeLayer());
    expect(prompt.subjectKnowledge.length).toBeGreaterThan(0);
    // Gilgamesh should be in there as world's oldest narrative
    expect(prompt.subjectKnowledge.some(k => k.includes('Gilgamesh'))).toBe(true);
  });

  it('adapts for young children (age 5-6)', () => {
    const prompt = buildAnayaSysPrompt(makeLayer({ childAge: 5, difficultyTier: 1 }));
    expect(prompt.basePersonality).toContain('5-6');
  });

  it('adapts for older children (age 9-10)', () => {
    const prompt = buildAnayaSysPrompt(makeLayer({ childAge: 9, difficultyTier: 3 }));
    // Should contain age bracket reference
    expect(prompt.basePersonality).toContain('9');
  });

  it('stores the adaptive layer on the returned prompt', () => {
    const layer = makeLayer({ childAge: 6, completedEntryIds: ['e-gilgamesh'] });
    const prompt = buildAnayaSysPrompt(layer);
    expect(prompt.adaptiveLayer.completedEntryIds).toContain('e-gilgamesh');
  });

  it('includes curriculum standards coverage', () => {
    const prompt = buildAnayaSysPrompt(makeLayer());
    // CCSS ELA should appear in subject knowledge
    expect(prompt.subjectKnowledge.some(k => k.includes('CCSS'))).toBe(true);
  });
});
