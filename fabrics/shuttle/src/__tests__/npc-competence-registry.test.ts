import { describe, it, expect, beforeEach } from 'vitest';
import {
  NPC_COMPETENCES,
  getCompetence,
  getCompetencesByCategory,
  getCompetencesForChar,
  COMPETENCE_COUNT,
  type NpcCompetence,
  type CompetenceCategory,
} from '../npc-competence-registry.js';

describe('npc-competence-registry', () => {
  describe('NPC_COMPETENCES constant', () => {
    it('contains exactly COMPETENCE_COUNT entries', () => {
      expect(NPC_COMPETENCES.length).toBe(COMPETENCE_COUNT);
    });

    it('has COMPETENCE_COUNT equal to 24', () => {
      expect(COMPETENCE_COUNT).toBe(24);
    });

    it('every entry has pillar set to COMPETENCE', () => {
      for (const comp of NPC_COMPETENCES) {
        expect(comp.pillar).toBe('COMPETENCE');
      }
    });

    it('every entry has a non-empty id', () => {
      for (const comp of NPC_COMPETENCES) {
        expect(comp.id.length).toBeGreaterThan(0);
      }
    });

    it('all ids are unique', () => {
      const ids = NPC_COMPETENCES.map((c) => c.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('every entry has a non-empty gameplayValue', () => {
      for (const comp of NPC_COMPETENCES) {
        expect(comp.gameplayValue.length).toBeGreaterThan(0);
      }
    });

    it('every entry has a valid category', () => {
      const validCategories: ReadonlyArray<CompetenceCategory> = [
        'technical',
        'analytical',
        'social',
        'archival',
        'physical',
        'perceptual',
      ];
      for (const comp of NPC_COMPETENCES) {
        expect(validCategories).toContain(comp.category);
      }
    });
  });

  describe('getCompetence', () => {
    it('returns the correct entry for ID_COMP_001', () => {
      const result = getCompetence('ID_COMP_001');
      expect(result).toBeDefined();
      if (result) {
        expect(result.charName).toBe('Sister Ngozi');
        expect(result.category).toBe('perceptual');
      }
    });

    it('returns undefined for an unknown id', () => {
      expect(getCompetence('ID_COMP_MISSING')).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(getCompetence('')).toBeUndefined();
    });

    it('returns correct entry for the last item', () => {
      const result = getCompetence('ID_COMP_024');
      expect(result).toBeDefined();
      if (result) {
        expect(result.charName).toBe('Circuit Keeper Ife');
        expect(result.category).toBe('analytical');
      }
    });
  });

  describe('getCompetencesByCategory', () => {
    it('returns perceptual competences', () => {
      const results = getCompetencesByCategory('perceptual');
      expect(results.length).toBeGreaterThan(0);
      for (const c of results) {
        expect(c.category).toBe('perceptual');
      }
    });

    it('returns technical competences', () => {
      const results = getCompetencesByCategory('technical');
      expect(results.length).toBeGreaterThan(0);
      for (const c of results) {
        expect(c.category).toBe('technical');
      }
    });

    it('returns analytical competences', () => {
      const results = getCompetencesByCategory('analytical');
      expect(results.length).toBeGreaterThan(0);
      for (const c of results) {
        expect(c.category).toBe('analytical');
      }
    });

    it('returns social competences', () => {
      const results = getCompetencesByCategory('social');
      expect(results.length).toBeGreaterThan(0);
      for (const c of results) {
        expect(c.category).toBe('social');
      }
    });

    it('returns archival competences', () => {
      const results = getCompetencesByCategory('archival');
      expect(results.length).toBeGreaterThan(0);
      for (const c of results) {
        expect(c.category).toBe('archival');
      }
    });

    it('all category results sum to COMPETENCE_COUNT', () => {
      const categories: ReadonlyArray<CompetenceCategory> = [
        'technical',
        'analytical',
        'social',
        'archival',
        'physical',
        'perceptual',
      ];
      let total = 0;
      for (const cat of categories) {
        total += getCompetencesByCategory(cat).length;
      }
      expect(total).toBe(COMPETENCE_COUNT);
    });
  });

  describe('getCompetencesForChar', () => {
    it('returns competences for charId 101', () => {
      const results = getCompetencesForChar(101);
      expect(results.length).toBeGreaterThan(0);
      for (const c of results) {
        expect(c.charId).toBe(101);
      }
    });

    it('returns empty array for unknown charId', () => {
      expect(getCompetencesForChar(999999)).toEqual([]);
    });

    it('does not match null charId entries', () => {
      expect(getCompetencesForChar(0)).toEqual([]);
    });

    it('returns correct entry for charId 289', () => {
      const results = getCompetencesForChar(289);
      expect(results.length).toBe(1);
      const first = results[0];
      if (first) {
        expect(first.id).toBe('ID_COMP_024');
      }
    });

    it('returns correct entry for charId 211', () => {
      const results = getCompetencesForChar(211);
      expect(results.length).toBe(1);
      const first = results[0];
      if (first) {
        expect(first.charName).toBe('Defector Yaw');
      }
    });
  });
});
