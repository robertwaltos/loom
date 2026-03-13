/**
 * Tests — Characters Engine
 */

import { describe, it, expect } from 'vitest';
import { createCharactersEngine } from '../universe/characters/engine.js';
import type { CharactersEngineDeps, SysPromptBuilder } from '../universe/characters/engine.js';
import type { AdaptivePromptLayer, CharacterSystemPrompt } from '../universe/characters/types.js';

// ─── Fixture Helpers ───────────────────────────────────────────────

function makeLayer(overrides: Partial<AdaptivePromptLayer> = {}): AdaptivePromptLayer {
  return {
    childAge: 7,
    difficultyTier: 1,
    completedEntryIds: [],
    vocabularyLevel: 'simple',
    ...overrides,
  };
}

function makeBuilder(characterId: string): SysPromptBuilder {
  return (layer): CharacterSystemPrompt => ({
    characterId,
    basePersonality: `personality:${characterId}:age${String(layer.childAge)}:tier${String(layer.difficultyTier)}`,
    subjectKnowledge: [`knowledge:${characterId}`],
    adaptiveLayer: layer,
  });
}

function makeDeps(characterIds: readonly string[]): CharactersEngineDeps {
  return {
    builders: new Map(characterIds.map(id => [id, makeBuilder(id)])),
  };
}

// ─── Tests ─────────────────────────────────────────────────────────

describe('supportsCharacter', () => {
  const engine = createCharactersEngine(makeDeps(['nimbus', 'anaya']));

  it('returns true for registered character', () => {
    expect(engine.supportsCharacter('nimbus')).toBe(true);
  });

  it('returns false for unknown character', () => {
    expect(engine.supportsCharacter('nobody')).toBe(false);
  });
});

describe('getCharacterIds', () => {
  const engine = createCharactersEngine(makeDeps(['nimbus', 'anaya', 'compass']));

  it('returns all registered character ids', () => {
    expect([...engine.getCharacterIds()].sort()).toEqual(['anaya', 'compass', 'nimbus']);
  });

  it('returns empty array when no builders registered', () => {
    expect(createCharactersEngine(makeDeps([])).getCharacterIds()).toHaveLength(0);
  });
});

describe('buildSystemPrompt — routing', () => {
  const engine = createCharactersEngine(makeDeps(['nimbus', 'anaya']));
  const layer = makeLayer({ childAge: 8, difficultyTier: 2 });

  it('routes to the correct builder by characterId', () => {
    const prompt = engine.buildSystemPrompt('nimbus', layer);
    expect(prompt.characterId).toBe('nimbus');
  });

  it('routes to different builder for different characterId', () => {
    const prompt = engine.buildSystemPrompt('anaya', layer);
    expect(prompt.characterId).toBe('anaya');
  });

  it('throws for unregistered characterId', () => {
    expect(() => engine.buildSystemPrompt('ghost', layer)).toThrow('ghost');
  });
});

describe('buildSystemPrompt — adaptive layer propagation', () => {
  const engine = createCharactersEngine(makeDeps(['nimbus']));

  it('passes childAge through to builder', () => {
    const layer = makeLayer({ childAge: 9 });
    const prompt = engine.buildSystemPrompt('nimbus', layer);
    expect(prompt.adaptiveLayer.childAge).toBe(9);
  });

  it('passes difficultyTier through to builder', () => {
    const layer = makeLayer({ difficultyTier: 3 });
    const prompt = engine.buildSystemPrompt('nimbus', layer);
    expect(prompt.adaptiveLayer.difficultyTier).toBe(3);
  });

  it('passes completedEntryIds through to builder', () => {
    const completed = ['entry-a', 'entry-b'];
    const layer = makeLayer({ completedEntryIds: completed });
    const prompt = engine.buildSystemPrompt('nimbus', layer);
    expect(prompt.adaptiveLayer.completedEntryIds).toEqual(completed);
  });

  it('passes vocabularyLevel through to builder', () => {
    const layer = makeLayer({ vocabularyLevel: 'advanced' });
    const prompt = engine.buildSystemPrompt('nimbus', layer);
    expect(prompt.adaptiveLayer.vocabularyLevel).toBe('advanced');
  });
});

describe('buildSystemPrompt — output shape', () => {
  const engine = createCharactersEngine(makeDeps(['dottie']));
  const layer = makeLayer();
  const prompt = engine.buildSystemPrompt('dottie', layer);

  it('returns a non-empty basePersonality', () => {
    expect(prompt.basePersonality.length).toBeGreaterThan(0);
  });

  it('returns subjectKnowledge as a non-empty array', () => {
    expect(prompt.subjectKnowledge.length).toBeGreaterThan(0);
  });

  it('includes the characterId on the returned prompt', () => {
    expect(prompt.characterId).toBe('dottie');
  });
});

describe('real prompt builders integration', () => {
  // Smoke-test that real builders work through the engine
  it('builds a valid nimbus prompt via real builder', async () => {
    const { buildNimbusSysPrompt } = await import('../universe/characters/prompts/professor-nimbus.js');
    const deps: CharactersEngineDeps = {
      builders: new Map([['professor-nimbus', buildNimbusSysPrompt]]),
    };
    const engine = createCharactersEngine(deps);
    const layer = makeLayer({ childAge: 6, difficultyTier: 1 });
    const prompt = engine.buildSystemPrompt('professor-nimbus', layer);
    expect(prompt.characterId).toBe('professor-nimbus');
    expect(prompt.basePersonality.length).toBeGreaterThan(100);
    expect(prompt.subjectKnowledge.length).toBeGreaterThan(0);
  });

  it('builds a valid compass prompt via real builder', async () => {
    const { buildCompassSysPrompt } = await import('../universe/characters/prompts/compass.js');
    const deps: CharactersEngineDeps = {
      builders: new Map([['compass', buildCompassSysPrompt]]),
    };
    const engine = createCharactersEngine(deps);
    const prompt = engine.buildSystemPrompt('compass', makeLayer({ childAge: 10, difficultyTier: 2 }));
    expect(prompt.characterId).toBe('compass');
    expect(prompt.subjectKnowledge.length).toBeGreaterThan(0);
  });
});
