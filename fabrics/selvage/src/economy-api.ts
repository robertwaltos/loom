/**
 * economy-api.ts — Open Economy API + Transparency Layer.
 *
 * All endpoints from Agent Bible Chapter 6:
 *   GET /api/economy/gini-history
 *   GET /api/economy/transactions/aggregate
 *   GET /api/economy/commons-fund/live
 *   GET /api/economy/wealth-bands
 *   GET /api/economy/levy-rates/history
 *   GET /api/worlds/:id/prosperity-index
 *   GET /api/economy/transactions/my-dynasty  [authenticated]
 *   GET /api/remembrance/search
 *   GET /api/economy/export                   [academic, rate-limited]
 *
 * Academic partnership hook: JSONL aggregate export (never individual data).
 * Rate-limited to 10 req/day per API key. CCP MER model.
 *
 * Thread: steel
 * Tier: 2
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GiniDataPoint {
  readonly quarter: string;
  readonly giniCoefficient: number;
  readonly totalWealthMicro: bigint;
  readonly dynastyCount: number;
}

export interface AggregateTransactionRecord {
  readonly quarter: string;
  readonly totalVolumeMicro: bigint;
  readonly transactionCount: number;
  readonly topSectors: string[];
  readonly avgTransactionMicro: bigint;
}

export interface CommonsFundSnapshot {
  readonly snapshotAt: Date;
  readonly balanceMicro: bigint;
  readonly pendingClaimCount: number;
  readonly lastDistributionDate: Date;
  readonly nextDistributionDate: Date;
}

export interface WealthBand {
  readonly label: string;
  readonly dynastyCount: number;
  readonly wealthSharePercent: number;
  readonly thresholdMicro: bigint;
}

export interface LevyRateRecord {
  readonly year: number;
  readonly rateNumerator: number;
  readonly rateDenominator: number;
  readonly appliedToWealthOver: bigint;
}

export interface DynastyTransactionSummary {
  readonly dynastyId: string;
  readonly quarter: string;
  readonly sentMicro: bigint;
  readonly receivedMicro: bigint;
  readonly levyPaidMicro: bigint;
  readonly commonsFundContributionMicro: bigint;
}

export interface EconomicExportRecord {
  readonly quarter: string;
  readonly giniCoefficient: number;
  readonly totalVolumeMicro: string;
  readonly transactionCount: number;
  readonly dynastyCount: number;
  readonly commonsFundBalanceMicro: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const ACADEMIC_EXPORT_DAILY_LIMIT = 10;

// ─── Query Helpers ────────────────────────────────────────────────────────────

export function filterGiniHistory(
  history: GiniDataPoint[],
  fromQuarter?: string,
  toQuarter?: string,
): GiniDataPoint[] {
  let result = history;
  if (fromQuarter) result = result.filter((d) => d.quarter >= fromQuarter);
  if (toQuarter) result = result.filter((d) => d.quarter <= toQuarter);
  return result;
}

export function filterLevyRateHistory(
  history: LevyRateRecord[],
  fromYear?: number,
  toYear?: number,
): LevyRateRecord[] {
  let result = history;
  if (fromYear !== undefined) result = result.filter((r) => r.year >= fromYear);
  if (toYear !== undefined) result = result.filter((r) => r.year <= toYear);
  return result;
}

export function buildEconomicExport(params: {
  giniHistory: GiniDataPoint[];
  transactions: AggregateTransactionRecord[];
  fundSnapshots: CommonsFundSnapshot[];
}): EconomicExportRecord[] {
  const transactionsByQuarter = new Map(
    params.transactions.map((t) => [t.quarter, t]),
  );
  const fundByDate =
    params.fundSnapshots.length > 0
      ? params.fundSnapshots[params.fundSnapshots.length - 1]
      : null;

  return params.giniHistory.map((g) => {
    const tx = transactionsByQuarter.get(g.quarter);
    return {
      quarter: g.quarter,
      giniCoefficient: g.giniCoefficient,
      totalVolumeMicro: (tx?.totalVolumeMicro ?? 0n).toString(),
      transactionCount: tx?.transactionCount ?? 0,
      dynastyCount: g.dynastyCount,
      commonsFundBalanceMicro: (fundByDate?.balanceMicro ?? 0n).toString(),
    };
  });
}

export function exportToJSONL(records: EconomicExportRecord[]): string {
  return records.map((r) => JSON.stringify(r)).join('\n');
}

// ─── Rate Limiter (simple in-memory) ─────────────────────────────────────────

export interface RateLimitState {
  readonly requestsToday: Map<string, number>;
  readonly resetDate: Date;
}

export function createRateLimitState(now: Date): RateLimitState {
  return {
    requestsToday: new Map(),
    resetDate: nextMidnight(now),
  };
}

function nextMidnight(now: Date): Date {
  const d = new Date(now);
  d.setUTCHours(24, 0, 0, 0);
  return d;
}

export function checkRateLimit(
  state: RateLimitState,
  apiKey: string,
  now: Date,
): { allowed: boolean; remainingToday: number } {
  const isNewDay = now >= state.resetDate;
  const count = isNewDay ? 0 : (state.requestsToday.get(apiKey) ?? 0);
  const allowed = count < ACADEMIC_EXPORT_DAILY_LIMIT;
  return {
    allowed,
    remainingToday: Math.max(0, ACADEMIC_EXPORT_DAILY_LIMIT - count),
  };
}

export function recordRequest(
  state: RateLimitState,
  apiKey: string,
  now: Date,
): RateLimitState {
  const isNewDay = now >= state.resetDate;
  const newMap = new Map(isNewDay ? [] : state.requestsToday);
  const count = isNewDay ? 0 : (state.requestsToday.get(apiKey) ?? 0);
  newMap.set(apiKey, count + 1);
  return {
    requestsToday: newMap,
    resetDate: isNewDay ? nextMidnight(now) : state.resetDate,
  };
}
