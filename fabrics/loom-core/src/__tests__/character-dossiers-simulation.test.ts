import { describe, it, expect } from 'vitest';
import {
  createCharacterDossierRegistry,
  CHARACTER_DOSSIERS,
} from '../character-dossiers.js';

describe('CharacterDossierRegistry — simulation', () => {
  const registry = createCharacterDossierRegistry();

  describe('totalDossiers', () => {
    it('reports 20 dossiers', () => {
      expect(registry.totalDossiers).toBe(20);
    });
  });

  describe('getById', () => {
    it('returns the nimbus dossier with correct fields', () => {
      const dossier = registry.getById('nimbus');
      expect(dossier).toBeDefined();
      expect(dossier!.characterId).toBe('nimbus');
      expect(dossier!.primaryWorld).toBe('starfall-observatory');
      expect(dossier!.role).toBe('stem_environment');
      expect(dossier!.voiceRegister).toBe('quiet');
    });

    it('returns a dossier with all required fields', () => {
      const dossier = registry.getById('nimbus');
      expect(dossier).toBeDefined();
      expect(typeof dossier!.fullName).toBe('string');
      expect(typeof dossier!.ageAppearance).toBe('string');
      expect(typeof dossier!.voiceNotes).toBe('string');
      expect(typeof dossier!.origin).toBe('string');
      expect(typeof dossier!.shadow).toBe('string');
      expect(typeof dossier!.growthMoment).toBe('string');
    });

    it('returns undefined for an unknown characterId', () => {
      expect(registry.getById('no-such-guide')).toBeUndefined();
    });
  });

  describe('getByWorld', () => {
    it('returns dossiers assigned to starfall-observatory', () => {
      const results = registry.getByWorld('starfall-observatory');
      expect(results.length).toBeGreaterThanOrEqual(1);
      for (const d of results) {
        expect(d.primaryWorld).toBe('starfall-observatory');
      }
    });

    it('returns empty array for an unknown world', () => {
      expect(registry.getByWorld('nonexistent-world')).toHaveLength(0);
    });
  });

  describe('getByRole', () => {
    it('returns guides with the stem_environment role', () => {
      const results = registry.getByRole('stem_environment');
      expect(results.length).toBeGreaterThanOrEqual(1);
      for (const d of results) {
        expect(d.role).toBe('stem_environment');
      }
    });

    it('returns guides for every core role type', () => {
      const roles = [
        'stem_science',
        'stem_math',
        'stem_technology',
        'stem_environment',
        'language_arts',
        'financial',
      ] as const;
      for (const role of roles) {
        const results = registry.getByRole(role);
        // Each role must have at least one assigned guide
        expect(results.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('allDossiers()', () => {
    it('returns exactly 20 dossiers', () => {
      expect(registry.allDossiers()).toHaveLength(20);
    });

    it('every dossier has a unique characterId', () => {
      const ids = registry.allDossiers().map(d => d.characterId);
      expect(new Set(ids).size).toBe(20);
    });
  });

  describe('CHARACTER_DOSSIERS export', () => {
    it('exported constant has 20 entries', () => {
      expect(CHARACTER_DOSSIERS).toHaveLength(20);
    });

    it('exported constant contains the nimbus entry', () => {
      const found = CHARACTER_DOSSIERS.find(d => d.characterId === 'nimbus');
      expect(found).toBeDefined();
    });
  });
});
