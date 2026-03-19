import { describe, it, expect, beforeEach } from 'vitest';
import {
  computePressureVector,
  buildSilentVector,
  getDominantTheme,
  computeAllPressureVectors,
  isVectorActive,
} from '../historical-pressure-vectors.js';
import type {
  RemembranceEntryInput,
  RemembranceTheme,
  HistoricalPressureVector,
} from '../historical-pressure-vectors.js';

function makeEntry(overrides: Partial<RemembranceEntryInput> = {}): RemembranceEntryInput {
  return {
    entryId: 'e-1',
    worldId: 'world-1',
    dynastyId: 'dynasty-1',
    theme: 'CONFLICT' as RemembranceTheme,
    isBetrayal: false,
    isResolved: true,
    chronicleYear: 50,
    ...overrides,
  };
}

describe('historical-pressure-vectors', () => {
  let now: Date;

  beforeEach(() => {
    now = new Date('2350-01-01T00:00:00Z');
  });

  describe('buildSilentVector', () => {
    it('should return a vector with all weights at zero', () => {
      const result = buildSilentVector('world-5', now);
      expect(result.betrayalWeight).toBe(0);
      expect(result.conflictWeight).toBe(0);
      expect(result.prosperityWeight).toBe(0);
      expect(result.ascendancySignatureWeight).toBe(0);
    });

    it('should set SILENCE as the dominant theme', () => {
      const result = buildSilentVector('world-5', now);
      expect(result.dominantTheme).toBe('SILENCE');
    });

    it('should set sourceEntryCount to zero', () => {
      const result = buildSilentVector('world-5', now);
      expect(result.sourceEntryCount).toBe(0);
    });

    it('should expire 90 days after calculatedAt', () => {
      const result = buildSilentVector('world-5', now);
      const expectedExpiry = new Date(now.getTime() + 90 * 86_400_000);
      expect(result.expiresAt.getTime()).toBe(expectedExpiry.getTime());
    });

    it('should store the correct worldId', () => {
      const result = buildSilentVector('world-99', now);
      expect(result.worldId).toBe('world-99');
    });
  });

  describe('getDominantTheme', () => {
    it('should return SILENCE for an empty array', () => {
      expect(getDominantTheme([])).toBe('SILENCE');
    });

    it('should return the single theme when only one entry exists', () => {
      const entries = [makeEntry({ theme: 'PROSPERITY' })];
      expect(getDominantTheme(entries)).toBe('PROSPERITY');
    });

    it('should return the most frequent theme', () => {
      const entries = [
        makeEntry({ theme: 'BETRAYAL' }),
        makeEntry({ theme: 'CONFLICT' }),
        makeEntry({ theme: 'CONFLICT' }),
        makeEntry({ theme: 'CONFLICT' }),
        makeEntry({ theme: 'BETRAYAL' }),
      ];
      expect(getDominantTheme(entries)).toBe('CONFLICT');
    });

    it('should return the first theme that reaches max count on tie', () => {
      const entries = [
        makeEntry({ theme: 'HERITAGE' }),
        makeEntry({ theme: 'GOVERNANCE' }),
      ];
      const result = getDominantTheme(entries);
      expect(['HERITAGE', 'GOVERNANCE']).toContain(result);
    });
  });

  describe('computePressureVector', () => {
    it('should return silent vector when no entries match worldId', () => {
      const entries = [makeEntry({ worldId: 'world-other' })];
      const result = computePressureVector('world-1', entries, now);
      expect(result.dominantTheme).toBe('SILENCE');
      expect(result.sourceEntryCount).toBe(0);
    });

    it('should calculate betrayalWeight from betrayal entries', () => {
      const entries = [
        makeEntry({ isBetrayal: true, isResolved: true }),
        makeEntry({ isBetrayal: true, isResolved: true }),
      ];
      const result = computePressureVector('world-1', entries, now);
      // 2 betrayals * 4 + 0 unresolved * 8 = 8
      expect(result.betrayalWeight).toBe(8);
    });

    it('should double-weight unresolved betrayals', () => {
      const entries = [
        makeEntry({ isBetrayal: true, isResolved: false }),
      ];
      const result = computePressureVector('world-1', entries, now);
      // 1 * 4 + 1 * 8 = 12
      expect(result.betrayalWeight).toBe(12);
    });

    it('should cap betrayalWeight at 100', () => {
      const entries: RemembranceEntryInput[] = [];
      for (let i = 0; i < 30; i++) {
        entries.push(makeEntry({
          entryId: 'e-' + String(i),
          isBetrayal: true,
          isResolved: false,
        }));
      }
      const result = computePressureVector('world-1', entries, now);
      expect(result.betrayalWeight).toBe(100);
    });

    it('should apply +40% conflict bonus when 3+ unresolved betrayals', () => {
      const entries: RemembranceEntryInput[] = [];
      for (let i = 0; i < 3; i++) {
        entries.push(makeEntry({
          entryId: 'e-' + String(i),
          theme: 'BETRAYAL',
          isBetrayal: true,
          isResolved: false,
        }));
      }
      const result = computePressureVector('world-1', entries, now);
      // conflictCount = 3 (BETRAYAL theme), base = min(100, 3*5) = 15
      // bonus = 40, total = 55
      expect(result.conflictWeight).toBe(55);
    });

    it('should not apply conflict bonus with fewer than 3 unresolved betrayals', () => {
      const entries = [
        makeEntry({ theme: 'CONFLICT', isBetrayal: true, isResolved: false }),
        makeEntry({ theme: 'CONFLICT', isBetrayal: true, isResolved: false }),
      ];
      const result = computePressureVector('world-1', entries, now);
      // base = 2*5=10, bonus=0
      expect(result.conflictWeight).toBe(10);
    });

    it('should calculate prosperityWeight', () => {
      const entries = [
        makeEntry({ theme: 'PROSPERITY' }),
        makeEntry({ theme: 'PROSPERITY' }),
        makeEntry({ theme: 'PROSPERITY' }),
      ];
      const result = computePressureVector('world-1', entries, now);
      expect(result.prosperityWeight).toBe(30);
    });

    it('should calculate ascendancySignatureWeight', () => {
      const entries = [
        makeEntry({ theme: 'ASCENDANCY' }),
        makeEntry({ theme: 'ASCENDANCY' }),
      ];
      const result = computePressureVector('world-1', entries, now);
      expect(result.ascendancySignatureWeight).toBe(16);
    });

    it('should set correct sourceEntryCount', () => {
      const entries = [
        makeEntry({ entryId: 'a' }),
        makeEntry({ entryId: 'b' }),
      ];
      const result = computePressureVector('world-1', entries, now);
      expect(result.sourceEntryCount).toBe(2);
    });
  });

  describe('computeAllPressureVectors', () => {
    it('should return one vector per worldId', () => {
      const worldIds = ['world-1', 'world-2', 'world-3'];
      const entries = [makeEntry({ worldId: 'world-1' })];
      const results = computeAllPressureVectors(worldIds, entries, now);
      expect(results.length).toBe(3);
    });

    it('should return silent vectors for worlds with no entries', () => {
      const worldIds = ['world-empty'];
      const results = computeAllPressureVectors(worldIds, [], now);
      const first = results[0];
      expect(first).toBeDefined();
      if (first) {
        expect(first.dominantTheme).toBe('SILENCE');
      }
    });

    it('should return empty array for empty worldIds', () => {
      const results = computeAllPressureVectors([], [], now);
      expect(results.length).toBe(0);
    });
  });

  describe('isVectorActive', () => {
    it('should return true when vector has not expired', () => {
      const vector = buildSilentVector('world-1', now);
      const checkTime = new Date(now.getTime() + 1000);
      expect(isVectorActive(vector, checkTime)).toBe(true);
    });

    it('should return false when vector has expired', () => {
      const vector = buildSilentVector('world-1', now);
      const afterExpiry = new Date(now.getTime() + 91 * 86_400_000);
      expect(isVectorActive(vector, afterExpiry)).toBe(false);
    });

    it('should return false when checked exactly at expiry time', () => {
      const vector = buildSilentVector('world-1', now);
      expect(isVectorActive(vector, vector.expiresAt)).toBe(false);
    });
  });
});
