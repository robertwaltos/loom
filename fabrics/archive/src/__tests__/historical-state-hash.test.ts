import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeHistoricalHash,
  buildHistoricalStateHash,
  buildHashHistoryEntry,
} from '../historical-state-hash.js';
import type {
  HistoricalHashInput,
  HistoricalStateHash,
} from '../historical-state-hash.js';

function makeInput(overrides: Partial<HistoricalHashInput> = {}): HistoricalHashInput {
  return {
    quarter: '2350-Q1',
    giniCoefficient: 0.45,
    topThemeCategories: ['CONFLICT', 'BETRAYAL', 'PROSPERITY'],
    activeConflictCount: 5,
    ascendancySignatureDensity: 0.12,
    ...overrides,
  };
}

describe('historical-state-hash', () => {
  let now: Date;

  beforeEach(() => {
    now = new Date('2350-01-01T00:00:00Z');
  });

  describe('computeHistoricalHash', () => {
    it('should return a 32-character hex string', () => {
      const hash = computeHistoricalHash(makeInput());
      expect(hash.length).toBe(32);
      expect(/^[0-9a-f]{32}$/.test(hash)).toBe(true);
    });

    it('should be deterministic for the same input', () => {
      const input = makeInput();
      const hash1 = computeHistoricalHash(input);
      const hash2 = computeHistoricalHash(input);
      expect(hash1).toBe(hash2);
    });

    it('should change when quarter changes', () => {
      const hash1 = computeHistoricalHash(makeInput({ quarter: '2350-Q1' }));
      const hash2 = computeHistoricalHash(makeInput({ quarter: '2350-Q2' }));
      expect(hash1).not.toBe(hash2);
    });

    it('should change when giniCoefficient changes', () => {
      const hash1 = computeHistoricalHash(makeInput({ giniCoefficient: 0.3 }));
      const hash2 = computeHistoricalHash(makeInput({ giniCoefficient: 0.9 }));
      expect(hash1).not.toBe(hash2);
    });

    it('should change when activeConflictCount changes', () => {
      const hash1 = computeHistoricalHash(makeInput({ activeConflictCount: 0 }));
      const hash2 = computeHistoricalHash(makeInput({ activeConflictCount: 100 }));
      expect(hash1).not.toBe(hash2);
    });

    it('should change when ascendancySignatureDensity changes', () => {
      const hash1 = computeHistoricalHash(makeInput({ ascendancySignatureDensity: 0.0 }));
      const hash2 = computeHistoricalHash(makeInput({ ascendancySignatureDensity: 1.0 }));
      expect(hash1).not.toBe(hash2);
    });

    it('should change when topThemeCategories changes', () => {
      const hash1 = computeHistoricalHash(makeInput({ topThemeCategories: ['CONFLICT'] }));
      const hash2 = computeHistoricalHash(makeInput({ topThemeCategories: ['PROSPERITY'] }));
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty topThemeCategories', () => {
      const hash = computeHistoricalHash(makeInput({ topThemeCategories: [] }));
      expect(hash.length).toBe(32);
    });

    it('should only use the first 10 theme categories', () => {
      const themes12 = Array.from({ length: 12 }, (_, i) => 'T' + String(i));
      const themes12b = [...themes12.slice(0, 10), 'X', 'Y'];
      const hash1 = computeHistoricalHash(makeInput({ topThemeCategories: themes12 }));
      const hash2 = computeHistoricalHash(makeInput({ topThemeCategories: themes12b }));
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for minimally different inputs', () => {
      const hash1 = computeHistoricalHash(makeInput({ giniCoefficient: 0.4500 }));
      const hash2 = computeHistoricalHash(makeInput({ giniCoefficient: 0.4501 }));
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('buildHistoricalStateHash', () => {
    it('should include the correct hashId', () => {
      const result = buildHistoricalStateHash({
        hashId: 'hash-001',
        input: makeInput(),
        now,
      });
      expect(result.hashId).toBe('hash-001');
    });

    it('should include the correct quarter', () => {
      const result = buildHistoricalStateHash({
        hashId: 'hash-002',
        input: makeInput({ quarter: '2351-Q3' }),
        now,
      });
      expect(result.quarter).toBe('2351-Q3');
    });

    it('should compute a valid 32-char hex hash', () => {
      const result = buildHistoricalStateHash({
        hashId: 'hash-003',
        input: makeInput(),
        now,
      });
      expect(result.hash.length).toBe(32);
      expect(/^[0-9a-f]{32}$/.test(result.hash)).toBe(true);
    });

    it('should set calculatedAt to the provided now', () => {
      const result = buildHistoricalStateHash({
        hashId: 'hash-004',
        input: makeInput(),
        now,
      });
      expect(result.calculatedAt.getTime()).toBe(now.getTime());
    });

    it('should build an inputSummary including Gini and conflict count', () => {
      const input = makeInput({ giniCoefficient: 0.55, activeConflictCount: 12 });
      const result = buildHistoricalStateHash({
        hashId: 'hash-005',
        input,
        now,
      });
      expect(result.inputSummary).toContain('0.550');
      expect(result.inputSummary).toContain('12');
    });

    it('should include dominant theme in summary from first category', () => {
      const input = makeInput({ topThemeCategories: ['VIGIL', 'CONFLICT'] });
      const result = buildHistoricalStateHash({
        hashId: 'hash-006',
        input,
        now,
      });
      expect(result.inputSummary).toContain('VIGIL');
    });

    it('should use none when topThemeCategories is empty', () => {
      const input = makeInput({ topThemeCategories: [] });
      const result = buildHistoricalStateHash({
        hashId: 'hash-007',
        input,
        now,
      });
      expect(result.inputSummary).toContain('none');
    });
  });

  describe('buildHashHistoryEntry', () => {
    it('should return the quarter from the record', () => {
      const record: HistoricalStateHash = {
        hashId: 'h-1',
        quarter: '2350-Q2',
        hash: 'a'.repeat(32),
        calculatedAt: now,
        inputSummary: 'test',
      };
      const entry = buildHashHistoryEntry(record);
      expect(entry.quarter).toBe('2350-Q2');
    });

    it('should return the hash from the record', () => {
      const hash = 'b'.repeat(32);
      const record: HistoricalStateHash = {
        hashId: 'h-2',
        quarter: '2350-Q1',
        hash,
        calculatedAt: now,
        inputSummary: 'test',
      };
      const entry = buildHashHistoryEntry(record);
      expect(entry.hash).toBe(hash);
    });

    it('should return calculatedAt as ISO string', () => {
      const record: HistoricalStateHash = {
        hashId: 'h-3',
        quarter: '2350-Q1',
        hash: 'c'.repeat(32),
        calculatedAt: now,
        inputSummary: 'test',
      };
      const entry = buildHashHistoryEntry(record);
      expect(entry.calculatedAt).toBe(now.toISOString());
    });
  });
});
