import { describe, it, expect } from 'vitest';
import {
  createNpcRelationshipRegistry,
  CHARACTER_RELATIONSHIPS,
} from '../npc-relationship-registry.js';

describe('NpcRelationshipRegistry — simulation', () => {
  const registry = createNpcRelationshipRegistry();

  describe('totalRelationships', () => {
    it('reports 17 canonical relationships', () => {
      expect(registry.totalRelationships).toBe(17);
    });
  });

  describe('getRelationship', () => {
    it('returns the dottie-luna relationship with correct data', () => {
      const rel = registry.getRelationship('dottie-luna');
      expect(rel).toBeDefined();
      expect(rel!.characterA).toBe('Dottie');
      expect(rel!.characterAWorldId).toBe('number-garden');
      expect(rel!.characterB).toBe('Luna');
      expect(rel!.characterBWorldId).toBe('music-meadow');
      expect(rel!.nature).toBe('friendly_rivals');
    });

    it('returns the zara-kofi relationship', () => {
      const rel = registry.getRelationship('zara-kofi');
      expect(rel).toBeDefined();
      expect(rel!.characterA).toBe('Zara');
      expect(rel!.characterAWorldId).toBe('savanna-workshop');
      expect(rel!.characterB).toBe('Kofi');
      expect(rel!.characterBWorldId).toBe('circuit-marsh');
    });

    it('returns the canon-aligned lena-dr-obi and jin-ho-priya world links', () => {
      const lenaDrObi = registry.getRelationship('lena-dr-obi');
      expect(lenaDrObi).toBeDefined();
      expect(lenaDrObi!.characterAWorldId).toBe('magnet-hills');
      expect(lenaDrObi!.characterBWorldId).toBe('body-atlas');

      const jinHoPriya = registry.getRelationship('jin-ho-priya');
      expect(jinHoPriya).toBeDefined();
      expect(jinHoPriya!.characterAWorldId).toBe('investment-greenhouse');
      expect(jinHoPriya!.characterBWorldId).toBe('market-square');
    });

    it('returns undefined for an unknown id', () => {
      expect(registry.getRelationship('no-such-pair')).toBeUndefined();
    });
  });

  describe('getRelationshipsForCharacter', () => {
    it('finds Dottie via her name', () => {
      const results = registry.getRelationshipsForCharacter('Dottie');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some(r => r.characterA === 'Dottie' || r.characterB === 'Dottie')).toBe(true);
    });

    it('finds relationships for Zara', () => {
      const results = registry.getRelationshipsForCharacter('Zara');
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it('returns empty array for a character name not in the registry', () => {
      expect(registry.getRelationshipsForCharacter('Ghost')).toHaveLength(0);
    });
  });

  describe('getRelationshipsForWorld', () => {
    it('returns relationships involving number-garden', () => {
      const results = registry.getRelationshipsForWorld('number-garden');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(
        results.every(
          r => r.characterAWorldId === 'number-garden' || r.characterBWorldId === 'number-garden',
        ),
      ).toBe(true);
    });

    it('returns empty array for an unknown world', () => {
      expect(registry.getRelationshipsForWorld('nonexistent-world')).toHaveLength(0);
    });
  });

  describe('getCrossWorldPairs', () => {
    it('returns an array of [worldId, worldId] pairs', () => {
      const pairs = registry.getCrossWorldPairs();
      expect(pairs.length).toBeGreaterThan(0);
      for (const pair of pairs) {
        expect(Array.isArray(pair)).toBe(true);
        expect(pair).toHaveLength(2);
        expect(typeof pair[0]).toBe('string');
        expect(typeof pair[1]).toBe('string');
      }
    });

    it('pairs come from different worlds', () => {
      const pairs = registry.getCrossWorldPairs();
      for (const [a, b] of pairs) {
        expect(a).not.toBe(b);
      }
    });
  });

  describe('all()', () => {
    it('returns exactly 17 relationships', () => {
      expect(registry.all()).toHaveLength(17);
    });

    it('every relationship has the required fields', () => {
      for (const r of registry.all()) {
        expect(typeof r.characterA).toBe('string');
        expect(typeof r.characterAWorldId).toBe('string');
        expect(typeof r.characterB).toBe('string');
        expect(typeof r.characterBWorldId).toBe('string');
        expect(typeof r.nature).toBe('string');
      }
    });
  });

  describe('CHARACTER_RELATIONSHIPS export', () => {
    it('exported constant has 17 entries', () => {
      expect(CHARACTER_RELATIONSHIPS).toHaveLength(17);
    });

    it('exported constant contains the dottie-luna entry', () => {
      const found = CHARACTER_RELATIONSHIPS.find(r => r.characterA === 'Dottie' && r.characterB === 'Luna');
      expect(found).toBeDefined();
    });
  });
});
