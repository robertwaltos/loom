import { describe, expect, it } from 'vitest';
import {
  getAllCharacters,
  getCharacterById,
  getCharactersByTier,
  getMultiWorldCharacters,
} from '../character-bible-registry.js';

describe('character-bible-registry simulation', () => {
  it('simulates canonical character lookup and tier segmentation', () => {
    const all = getAllCharacters();
    const architect = getCharacterById(1);
    const tier4 = getCharactersByTier('TIER_4');
    const multiWorld = getMultiWorldCharacters();

    expect(all.length).toBe(15);
    expect(architect?.displayName).toBe('The Architect');
    expect(tier4.some((c) => c.displayName === 'The Architect')).toBe(true);
    expect(multiWorld.every((c) => c.isMultiWorld)).toBe(true);
  });
});
