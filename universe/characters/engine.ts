/**
 * Characters Engine — Koydo Worlds
 *
 * Dispatch engine for adaptive character system prompts.
 * Injected with a registry of builder functions so it stays testable
 * and independent of any specific character implementation.
 */

import type { AdaptivePromptLayer, CharacterSystemPrompt } from './types.js';

// ─── Public Types ──────────────────────────────────────────────────

export type SysPromptBuilder = (layer: AdaptivePromptLayer) => CharacterSystemPrompt;

export interface CharactersEngineDeps {
  readonly builders: ReadonlyMap<string, SysPromptBuilder>;
}

export interface CharactersEngine {
  buildSystemPrompt(characterId: string, layer: AdaptivePromptLayer): CharacterSystemPrompt;
  supportsCharacter(characterId: string): boolean;
  getCharacterIds(): readonly string[];
}

// ─── Internal Context ──────────────────────────────────────────────

interface CharactersContext {
  readonly deps: CharactersEngineDeps;
}

// ─── Implementations ───────────────────────────────────────────────

function buildPrompt(
  ctx: CharactersContext,
  characterId: string,
  layer: AdaptivePromptLayer,
): CharacterSystemPrompt {
  const builder = ctx.deps.builders.get(characterId);
  if (builder === undefined) {
    throw new Error(`No builder registered for character: ${characterId}`);
  }
  return builder(layer);
}

// ─── Factory ───────────────────────────────────────────────────────

export function createCharactersEngine(deps: CharactersEngineDeps): CharactersEngine {
  const ctx: CharactersContext = { deps };
  return {
    buildSystemPrompt: (id, layer) => buildPrompt(ctx, id, layer),
    supportsCharacter: (id) => ctx.deps.builders.has(id),
    getCharacterIds: () => [...ctx.deps.builders.keys()],
  };
}
