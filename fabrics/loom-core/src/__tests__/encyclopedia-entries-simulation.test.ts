import { describe, it, expect } from 'vitest';
import {
  createEncyclopediaRegistry,
  ENCYCLOPEDIA_ENTRIES,
  TOTAL_ENCYCLOPEDIA_ENTRIES,
} from '../encyclopedia-entries.js';

describe('EncyclopediaRegistry — simulation', () => {
  const registry = createEncyclopediaRegistry();

  describe('TOTAL_ENCYCLOPEDIA_ENTRIES constant', () => {
    it('exported constant is 260', () => {
      expect(TOTAL_ENCYCLOPEDIA_ENTRIES).toBe(260);
    });
  });

  describe('totalEntries', () => {
    it('matches the length of the ENCYCLOPEDIA_ENTRIES export', () => {
      expect(registry.totalEntries).toBe(ENCYCLOPEDIA_ENTRIES.length);
    });
  });

  describe('getEntry', () => {
    it('returns the ng-zero entry with correct data', () => {
      const entry = registry.getEntry('ng-zero');
      expect(entry).toBeDefined();
      expect(entry!.entryId).toBe('ng-zero');
      expect(entry!.worldId).toBe('number-garden');
      expect(entry!.domain).toBe('STEM');
      expect(entry!.type).toBe('event');
    });

    it('ng-zero has Brahmagupta in historicalFigures', () => {
      const entry = registry.getEntry('ng-zero');
      expect(entry!.historicalFigures).toContain('Brahmagupta');
    });

    it('returns the ng-fibonacci entry', () => {
      const entry = registry.getEntry('ng-fibonacci');
      expect(entry).toBeDefined();
      expect(entry!.worldId).toBe('number-garden');
      expect(entry!.type).toBe('invention');
    });

    it('returns undefined for an unknown id', () => {
      expect(registry.getEntry('no-such-entry')).toBeUndefined();
    });
  });

  describe('getEntriesByWorld', () => {
    it('returns only number-garden entries when filtered to number-garden', () => {
      const results = registry.getEntriesByWorld('number-garden');
      expect(results.length).toBeGreaterThan(0);
      for (const e of results) {
        expect(e.worldId).toBe('number-garden');
      }
    });

    it('returns empty array for an unknown world', () => {
      expect(registry.getEntriesByWorld('nonexistent-world')).toHaveLength(0);
    });
  });

  describe('getEntriesByDomain', () => {
    it('returns a non-empty set of STEM entries', () => {
      const results = registry.getEntriesByDomain('STEM');
      expect(results.length).toBeGreaterThan(0);
      for (const e of results) {
        expect(e.domain).toBe('STEM');
      }
    });

    it('returns entries for LANGUAGE_ARTS domain', () => {
      const results = registry.getEntriesByDomain('LANGUAGE_ARTS');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('getEntriesByType', () => {
    it('returns a non-empty list of event-type entries', () => {
      const results = registry.getEntriesByType('event');
      expect(results.length).toBeGreaterThan(0);
      for (const e of results) {
        expect(e.type).toBe('event');
      }
    });

    it('returns entries for person type', () => {
      const results = registry.getEntriesByType('person');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('searchByFigure', () => {
    it('finds entries that include Brahmagupta', () => {
      const results = registry.searchByFigure('Brahmagupta');
      expect(results.length).toBeGreaterThanOrEqual(1);
      for (const e of results) {
        expect(e.historicalFigures).toContain('Brahmagupta');
      }
    });

    it('returns empty array for an unknown figure name', () => {
      expect(registry.searchByFigure('UnknownFigureXYZ')).toHaveLength(0);
    });
  });

  describe('all()', () => {
    it('returns the same number of entries as totalEntries', () => {
      expect(registry.all()).toHaveLength(registry.totalEntries);
    });

    it('every entry has required fields', () => {
      for (const e of registry.all()) {
        expect(typeof e.entryId).toBe('string');
        expect(typeof e.worldId).toBe('string');
        expect(typeof e.domain).toBe('string');
        expect(typeof e.type).toBe('string');
        expect(typeof e.title).toBe('string');
      }
    });

    it('every entry has age-appropriate content fields', () => {
      for (const e of registry.all()) {
        expect(typeof e.content.ages5to7).toBe('string');
        expect(typeof e.content.ages8to10).toBe('string');
      }
    });
  });

  describe('ENCYCLOPEDIA_ENTRIES export', () => {
    it('exported constant length matches registry totalEntries', () => {
      expect(ENCYCLOPEDIA_ENTRIES).toHaveLength(registry.totalEntries);
    });

    it('exported constant contains ng-zero', () => {
      const found = ENCYCLOPEDIA_ENTRIES.find(e => e.entryId === 'ng-zero');
      expect(found).toBeDefined();
    });
  });
});
