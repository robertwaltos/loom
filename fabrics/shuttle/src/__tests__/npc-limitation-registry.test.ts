import { describe, it, expect, beforeEach } from 'vitest';
import {
  NPC_LIMITATIONS,
  getLimitation,
  getLimitationsByCategory,
  getLimitationsForChar,
  LIMITATION_COUNT,
  type NpcLimitation,
  type LimitationCategory,
} from '../npc-limitation-registry.js';

describe('npc-limitation-registry', () => {
  describe('NPC_LIMITATIONS constant', () => {
    it('contains exactly LIMITATION_COUNT entries', () => {
      expect(NPC_LIMITATIONS.length).toBe(LIMITATION_COUNT);
    });

    it('has LIMITATION_COUNT equal to 24', () => {
      expect(LIMITATION_COUNT).toBe(24);
    });

    it('every entry has pillar set to LIMITATION', () => {
      for (const lim of NPC_LIMITATIONS) {
        expect(lim.pillar).toBe('LIMITATION');
      }
    });

    it('every entry has a non-empty id', () => {
      for (const lim of NPC_LIMITATIONS) {
        expect(lim.id.length).toBeGreaterThan(0);
      }
    });

    it('all ids are unique', () => {
      const ids = NPC_LIMITATIONS.map((l) => l.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('every entry has a non-empty charName', () => {
      for (const lim of NPC_LIMITATIONS) {
        expect(lim.charName.length).toBeGreaterThan(0);
      }
    });

    it('every entry has a valid category', () => {
      const validCategories: ReadonlyArray<LimitationCategory> = [
        'cognitive',
        'social',
        'physical',
        'emotional',
        'institutional',
      ];
      for (const lim of NPC_LIMITATIONS) {
        expect(validCategories).toContain(lim.category);
      }
    });
  });

  describe('getLimitation', () => {
    it('returns the correct entry for a known id', () => {
      const result = getLimitation('ID_LIM_001');
      expect(result).toBeDefined();
      if (result) {
        expect(result.charName).toBe('Sister Ngozi');
        expect(result.category).toBe('social');
      }
    });

    it('returns undefined for an unknown id', () => {
      const result = getLimitation('ID_LIM_NONEXISTENT');
      expect(result).toBeUndefined();
    });

    it('returns undefined for empty string id', () => {
      expect(getLimitation('')).toBeUndefined();
    });

    it('returns correct entry for last item', () => {
      const result = getLimitation('ID_LIM_024');
      expect(result).toBeDefined();
      if (result) {
        expect(result.charName).toBe('Circuit Keeper Ife');
      }
    });
  });

  describe('getLimitationsByCategory', () => {
    it('returns social limitations', () => {
      const social = getLimitationsByCategory('social');
      expect(social.length).toBeGreaterThan(0);
      for (const lim of social) {
        expect(lim.category).toBe('social');
      }
    });

    it('returns cognitive limitations', () => {
      const cognitive = getLimitationsByCategory('cognitive');
      expect(cognitive.length).toBeGreaterThan(0);
      for (const lim of cognitive) {
        expect(lim.category).toBe('cognitive');
      }
    });

    it('returns physical limitations', () => {
      const physical = getLimitationsByCategory('physical');
      expect(physical.length).toBeGreaterThan(0);
      for (const lim of physical) {
        expect(lim.category).toBe('physical');
      }
    });

    it('returns emotional limitations', () => {
      const emotional = getLimitationsByCategory('emotional');
      expect(emotional.length).toBeGreaterThan(0);
      for (const lim of emotional) {
        expect(lim.category).toBe('emotional');
      }
    });

    it('returns institutional limitations', () => {
      const inst = getLimitationsByCategory('institutional');
      expect(inst.length).toBeGreaterThan(0);
      for (const lim of inst) {
        expect(lim.category).toBe('institutional');
      }
    });

    it('all category results sum to LIMITATION_COUNT', () => {
      const categories: ReadonlyArray<LimitationCategory> = [
        'cognitive',
        'social',
        'physical',
        'emotional',
        'institutional',
      ];
      let total = 0;
      for (const cat of categories) {
        total += getLimitationsByCategory(cat).length;
      }
      expect(total).toBe(LIMITATION_COUNT);
    });
  });

  describe('getLimitationsForChar', () => {
    it('returns limitations for charId 101', () => {
      const results = getLimitationsForChar(101);
      expect(results.length).toBeGreaterThan(0);
      for (const lim of results) {
        expect(lim.charId).toBe(101);
      }
    });

    it('returns empty array for unknown charId', () => {
      const results = getLimitationsForChar(999999);
      expect(results).toEqual([]);
    });

    it('does not match null charId entries', () => {
      const results = getLimitationsForChar(0);
      expect(results).toEqual([]);
    });

    it('returns correct entry for charId 289', () => {
      const results = getLimitationsForChar(289);
      expect(results.length).toBe(1);
      const first = results[0];
      if (first) {
        expect(first.id).toBe('ID_LIM_024');
      }
    });
  });
});
