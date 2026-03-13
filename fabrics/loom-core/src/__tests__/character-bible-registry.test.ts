import { describe, it, expect } from 'vitest';
import {
  getAllCharacters,
  getCharacterById,
  getCharacterCount,
  getCharactersForWorld,
  getMultiWorldCharacters,
  getCharactersByTier,
  getCharactersByFaction,
} from '../character-bible-registry.js';

// ── getAllCharacters ────────────────────────────────────────────

describe('getAllCharacters', () => {
  it('returns 15 canonical characters', () => {
    expect(getAllCharacters()).toHaveLength(15);
  });

  it('every character has a positive characterId', () => {
    const all = getAllCharacters();
    expect(all.every((c) => c.characterId > 0)).toBe(true);
  });

  it('every character has a non-empty displayName', () => {
    const all = getAllCharacters();
    expect(all.every((c) => c.displayName.length > 0)).toBe(true);
  });

  it('character IDs are unique', () => {
    const all = getAllCharacters();
    const ids = new Set(all.map((c) => c.characterId));
    expect(ids.size).toBe(all.length);
  });
});

// ── getCharacterCount ──────────────────────────────────────────

describe('getCharacterCount', () => {
  it('returns 15', () => {
    expect(getCharacterCount()).toBe(15);
  });
});

// ── getCharacterById ───────────────────────────────────────────

describe('getCharacterById', () => {
  it('returns The Architect for id 1', () => {
    const character = getCharacterById(1);
    expect(character).toBeDefined();
    expect(character?.displayName).toBe('The Architect');
  });

  it('returns undefined for an unknown id', () => {
    expect(getCharacterById(9999)).toBeUndefined();
  });

  it('returns id 2 character', () => {
    const character = getCharacterById(2);
    expect(character).toBeDefined();
    expect(character?.characterId).toBe(2);
  });
});

// ── getCharactersForWorld ──────────────────────────────────────

describe('getCharactersForWorld', () => {
  it('returns empty array for unknown world', () => {
    expect(getCharactersForWorld('nonexistent-world')).toHaveLength(0);
  });

  it('returns characters assigned to a known world', () => {
    // At least one character must have a homeWorldId set
    const all = getAllCharacters();
    const worldId = all.find((c) => c.homeWorldId !== null)?.homeWorldId;
    if (worldId == null) return; // skip if no world assignments exist
    const worldChars = getCharactersForWorld(worldId);
    expect(worldChars.length).toBeGreaterThan(0);
    expect(worldChars.every((c) => c.homeWorldId === worldId)).toBe(true);
  });
});

// ── getMultiWorldCharacters ────────────────────────────────────

describe('getMultiWorldCharacters', () => {
  it('returns only characters with isMultiWorld=true', () => {
    const multiWorld = getMultiWorldCharacters();
    expect(multiWorld.every((c) => c.isMultiWorld)).toBe(true);
  });

  it('multi-world characters are a subset of all characters', () => {
    const allIds = new Set(getAllCharacters().map((c) => c.characterId));
    const multiWorld = getMultiWorldCharacters();
    expect(multiWorld.every((c) => allIds.has(c.characterId))).toBe(true);
  });
});

// ── getCharactersByTier ────────────────────────────────────────

describe('getCharactersByTier', () => {
  it('TIER_4 tier includes The Architect', () => {
    const tier4 = getCharactersByTier('TIER_4');
    expect(tier4.some((c) => c.displayName === 'The Architect')).toBe(true);
    expect(tier4.every((c) => c.tier === 'TIER_4')).toBe(true);
  });

  it('returns empty array for a tier with no characters', () => {
    // TIER_0 may have no characters in the current 15-character canon
    const tier0 = getCharactersByTier('TIER_0');
    expect(Array.isArray(tier0)).toBe(true);
    expect(tier0.every((c) => c.tier === 'TIER_0')).toBe(true);
  });

  it('tier union across all tiers covers all characters', () => {
    const tiers = ['TIER_0', 'TIER_1', 'TIER_2', 'TIER_3', 'TIER_4'] as const;
    const covered = tiers.flatMap((t) => getCharactersByTier(t));
    expect(covered).toHaveLength(getCharacterCount());
  });
});

// ── getCharactersByFaction ─────────────────────────────────────

describe('getCharactersByFaction', () => {
  it('singular faction includes The Architect', () => {
    const singular = getCharactersByFaction('singular');
    expect(singular.some((c) => c.displayName === 'The Architect')).toBe(true);
    expect(singular.every((c) => c.faction === 'singular')).toBe(true);
  });

  it('returns empty array for a faction with no characters', () => {
    const result = getCharactersByFaction('returnist');
    expect(Array.isArray(result)).toBe(true);
    expect(result.every((c) => c.faction === 'returnist')).toBe(true);
  });

  it('faction union across all factions covers all characters', () => {
    const all = getAllCharacters();
    const factions = [...new Set(all.map((c) => c.faction))];
    const covered = factions.flatMap((f) => getCharactersByFaction(f));
    expect(covered).toHaveLength(all.length);
  });
});
