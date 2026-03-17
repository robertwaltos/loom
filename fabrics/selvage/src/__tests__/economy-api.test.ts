import { describe, it, expect } from 'vitest';
import {
  filterGiniHistory,
  filterLevyRateHistory,
  buildEconomicExport,
  exportToJSONL,
  createRateLimitState,
  checkRateLimit,
  recordRequest,
  ACADEMIC_EXPORT_DAILY_LIMIT,
} from '../economy-api.js';
import type {
  GiniDataPoint,
  AggregateTransactionRecord,
  CommonsFundSnapshot,
  LevyRateRecord,
} from '../economy-api.js';

const GINI_HISTORY: GiniDataPoint[] = [
  { quarter: '2050-Q1', giniCoefficient: 0.35, totalWealthMicro: 1_000_000n, dynastyCount: 50 },
  { quarter: '2050-Q2', giniCoefficient: 0.40, totalWealthMicro: 1_200_000n, dynastyCount: 52 },
  { quarter: '2050-Q3', giniCoefficient: 0.38, totalWealthMicro: 1_100_000n, dynastyCount: 55 },
  { quarter: '2050-Q4', giniCoefficient: 0.42, totalWealthMicro: 1_400_000n, dynastyCount: 58 },
];

const LEVY_HISTORY: LevyRateRecord[] = [
  { year: 2048, rateNumerator: 1, rateDenominator: 100, appliedToWealthOver: 100_000n },
  { year: 2049, rateNumerator: 2, rateDenominator: 100, appliedToWealthOver: 80_000n },
  { year: 2050, rateNumerator: 3, rateDenominator: 100, appliedToWealthOver: 60_000n },
];

const TX_RECORDS: AggregateTransactionRecord[] = [
  { quarter: '2050-Q1', totalVolumeMicro: 500_000n, transactionCount: 200, topSectors: ['crafts'], avgTransactionMicro: 2_500n },
  { quarter: '2050-Q3', totalVolumeMicro: 700_000n, transactionCount: 300, topSectors: ['services'], avgTransactionMicro: 2_333n },
];

const FUND_SNAPSHOTS: CommonsFundSnapshot[] = [
  {
    snapshotAt: new Date('2050-10-01'),
    balanceMicro: 20_000n,
    pendingClaimCount: 3,
    lastDistributionDate: new Date('2050-09-01'),
    nextDistributionDate: new Date('2050-11-01'),
  },
];

describe('economy-api', () => {
  describe('ACADEMIC_EXPORT_DAILY_LIMIT', () => {
    it('is 10', () => {
      expect(ACADEMIC_EXPORT_DAILY_LIMIT).toBe(10);
    });
  });

  describe('filterGiniHistory', () => {
    it('returns all records when no filters given', () => {
      expect(filterGiniHistory(GINI_HISTORY)).toHaveLength(4);
    });

    it('filters from quarter inclusive', () => {
      const result = filterGiniHistory(GINI_HISTORY, '2050-Q2');
      expect(result.map((d) => d.quarter)).toEqual(['2050-Q2', '2050-Q3', '2050-Q4']);
    });

    it('filters to quarter inclusive', () => {
      const result = filterGiniHistory(GINI_HISTORY, undefined, '2050-Q2');
      expect(result.map((d) => d.quarter)).toEqual(['2050-Q1', '2050-Q2']);
    });

    it('filters between quarters inclusive', () => {
      const result = filterGiniHistory(GINI_HISTORY, '2050-Q2', '2050-Q3');
      expect(result).toHaveLength(2);
    });

    it('returns empty array when range excludes all', () => {
      const result = filterGiniHistory(GINI_HISTORY, '2060-Q1');
      expect(result).toHaveLength(0);
    });
  });

  describe('filterLevyRateHistory', () => {
    it('returns all when no filter given', () => {
      expect(filterLevyRateHistory(LEVY_HISTORY)).toHaveLength(3);
    });

    it('filters fromYear inclusive', () => {
      const result = filterLevyRateHistory(LEVY_HISTORY, 2049);
      expect(result.map((r) => r.year)).toEqual([2049, 2050]);
    });

    it('filters toYear inclusive', () => {
      const result = filterLevyRateHistory(LEVY_HISTORY, undefined, 2049);
      expect(result.map((r) => r.year)).toEqual([2048, 2049]);
    });

    it('single year range returns one record', () => {
      const result = filterLevyRateHistory(LEVY_HISTORY, 2049, 2049);
      expect(result).toHaveLength(1);
      expect(result[0]!.year).toBe(2049);
    });

    it('returns empty when fromYear > toYear', () => {
      const result = filterLevyRateHistory(LEVY_HISTORY, 2060, 2055);
      expect(result).toHaveLength(0);
    });
  });

  describe('buildEconomicExport', () => {
    it('produces one record per gini entry', () => {
      const records = buildEconomicExport({ giniHistory: GINI_HISTORY, transactions: TX_RECORDS, fundSnapshots: FUND_SNAPSHOTS });
      expect(records).toHaveLength(4);
    });

    it('joins transaction volume by quarter', () => {
      const records = buildEconomicExport({ giniHistory: GINI_HISTORY, transactions: TX_RECORDS, fundSnapshots: FUND_SNAPSHOTS });
      const q1 = records.find((r) => r.quarter === '2050-Q1')!;
      expect(q1.totalVolumeMicro).toBe('500000');
      expect(q1.transactionCount).toBe(200);
    });

    it('uses zero for missing transaction quarters', () => {
      const records = buildEconomicExport({ giniHistory: GINI_HISTORY, transactions: TX_RECORDS, fundSnapshots: FUND_SNAPSHOTS });
      const q2 = records.find((r) => r.quarter === '2050-Q2')!;
      expect(q2.totalVolumeMicro).toBe('0');
      expect(q2.transactionCount).toBe(0);
    });

    it('includes commons fund balance from last snapshot', () => {
      const records = buildEconomicExport({ giniHistory: GINI_HISTORY, transactions: TX_RECORDS, fundSnapshots: FUND_SNAPSHOTS });
      expect(records[0]!.commonsFundBalanceMicro).toBe('20000');
    });

    it('serializes bigint amounts as strings', () => {
      const records = buildEconomicExport({ giniHistory: GINI_HISTORY, transactions: TX_RECORDS, fundSnapshots: FUND_SNAPSHOTS });
      expect(typeof records[0]!.totalVolumeMicro).toBe('string');
    });

    it('handles empty fund snapshots', () => {
      const records = buildEconomicExport({ giniHistory: GINI_HISTORY, transactions: TX_RECORDS, fundSnapshots: [] });
      expect(records[0]!.commonsFundBalanceMicro).toBe('0');
    });
  });

  describe('exportToJSONL', () => {
    it('produces one JSON line per record', () => {
      const records = buildEconomicExport({ giniHistory: GINI_HISTORY, transactions: TX_RECORDS, fundSnapshots: FUND_SNAPSHOTS });
      const jsonl = exportToJSONL(records);
      const lines = jsonl.split('\n');
      expect(lines).toHaveLength(4);
    });

    it('each line is valid JSON', () => {
      const records = buildEconomicExport({ giniHistory: GINI_HISTORY, transactions: TX_RECORDS, fundSnapshots: FUND_SNAPSHOTS });
      const jsonl = exportToJSONL(records);
      for (const line of jsonl.split('\n')) {
        expect(() => JSON.parse(line)).not.toThrow();
      }
    });

    it('returns empty string for empty records', () => {
      expect(exportToJSONL([])).toBe('');
    });
  });

  describe('rate limiter', () => {
    const t0 = new Date('2050-06-01T10:00:00Z');
    const API_KEY = 'key-alpha';

    it('createRateLimitState initialises empty', () => {
      const state = createRateLimitState(t0);
      expect(state.requestsToday.size).toBe(0);
    });

    it('checkRateLimit allows first request', () => {
      const state = createRateLimitState(t0);
      const { allowed, remainingToday } = checkRateLimit(state, API_KEY, t0);
      expect(allowed).toBe(true);
      expect(remainingToday).toBe(10);
    });

    it('recordRequest increments counter', () => {
      let state = createRateLimitState(t0);
      state = recordRequest(state, API_KEY, t0);
      const { remainingToday } = checkRateLimit(state, API_KEY, t0);
      expect(remainingToday).toBe(9);
    });

    it('blocks after 10 requests', () => {
      let state = createRateLimitState(t0);
      for (let i = 0; i < ACADEMIC_EXPORT_DAILY_LIMIT; i++) {
        state = recordRequest(state, API_KEY, t0);
      }
      const { allowed, remainingToday } = checkRateLimit(state, API_KEY, t0);
      expect(allowed).toBe(false);
      expect(remainingToday).toBe(0);
    });

    it('resets after midnight', () => {
      let state = createRateLimitState(t0);
      for (let i = 0; i < ACADEMIC_EXPORT_DAILY_LIMIT; i++) {
        state = recordRequest(state, API_KEY, t0);
      }
      // advance to next day
      const tomorrow = new Date('2050-06-02T10:00:00Z');
      const { allowed, remainingToday } = checkRateLimit(state, API_KEY, tomorrow);
      expect(allowed).toBe(true);
      expect(remainingToday).toBe(10);
    });

    it('tracks separate keys independently', () => {
      let state = createRateLimitState(t0);
      state = recordRequest(state, 'key-A', t0);
      state = recordRequest(state, 'key-A', t0);
      const rA = checkRateLimit(state, 'key-A', t0);
      const rB = checkRateLimit(state, 'key-B', t0);
      expect(rA.remainingToday).toBe(8);
      expect(rB.remainingToday).toBe(10);
    });
  });
});
