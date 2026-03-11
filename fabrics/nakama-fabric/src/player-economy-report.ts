/**
 * Player Economy Report — Comprehensive player economic analytics.
 *
 * Tracks income events (TRADE, CRAFT, QUEST_REWARD, INTEREST, DIVIDEND),
 * spending events (TAX, PURCHASE, INVESTMENT, LOSS), computes net worth
 * trajectory, and calculates market share per commodity.
 * All amounts in bigint micro-KALON.
 */

export type IncomeSource =
  | 'TRADE'
  | 'CRAFT'
  | 'QUEST_REWARD'
  | 'INTEREST'
  | 'DIVIDEND'
  | 'GIFT'
  | 'MINING'
  | 'HARVEST';

export type SpendingCategory =
  | 'TAX'
  | 'PURCHASE'
  | 'INVESTMENT'
  | 'LOSS'
  | 'TRANSFER'
  | 'FEE'
  | 'DONATION';

export interface EconomicEvent {
  readonly eventId: string;
  readonly dynastyId: string;
  readonly timestamp: bigint;
  readonly amount: bigint;
  readonly category: string;
  readonly description: string;
}

export interface WealthSnapshot {
  readonly dynastyId: string;
  readonly timestamp: bigint;
  readonly netWorth: bigint;
  readonly liquidAssets: bigint;
  readonly illiquidAssets: bigint;
}

export interface EconomicReport {
  readonly dynastyId: string;
  readonly periodStart: bigint;
  readonly periodEnd: bigint;
  readonly totalIncome: bigint;
  readonly totalSpending: bigint;
  readonly netChange: bigint;
  readonly topIncomeSource: IncomeSource | null;
  readonly topSpendingCategory: SpendingCategory | null;
  readonly wealthGrowthRate: number;
}

export interface MarketShare {
  readonly dynastyId: string;
  readonly commodityId: string;
  readonly worldId: string;
  readonly playerVolume: bigint;
  readonly totalVolume: bigint;
  readonly sharePercentage: number;
}

export interface IncomeBreakdown {
  readonly source: IncomeSource;
  readonly amount: bigint;
  readonly percentage: number;
}

export interface SpendingBreakdown {
  readonly category: SpendingCategory;
  readonly amount: bigint;
  readonly percentage: number;
}

export interface PlayerEconomyReport {
  recordIncome(
    dynastyId: string,
    source: IncomeSource,
    amount: bigint,
    description: string,
  ): string;
  recordSpending(
    dynastyId: string,
    category: SpendingCategory,
    amount: bigint,
    description: string,
  ): string;
  takeWealthSnapshot(dynastyId: string, liquidAssets: bigint, illiquidAssets: bigint): 'success';
  getWealthTrajectory(dynastyId: string): ReadonlyArray<WealthSnapshot>;
  getMarketShare(
    dynastyId: string,
    worldId: string,
    commodityId: string,
    totalVolume: bigint,
  ): MarketShare;
  generateReport(dynastyId: string, periodStart: bigint, periodEnd: bigint): EconomicReport;
  getTopIncomeSource(
    dynastyId: string,
    periodStart: bigint,
    periodEnd: bigint,
  ): IncomeSource | null;
  getIncomeBreakdown(
    dynastyId: string,
    periodStart: bigint,
    periodEnd: bigint,
  ): ReadonlyArray<IncomeBreakdown>;
  getSpendingBreakdown(
    dynastyId: string,
    periodStart: bigint,
    periodEnd: bigint,
  ): ReadonlyArray<SpendingBreakdown>;
  getTotalIncome(dynastyId: string, periodStart: bigint, periodEnd: bigint): bigint;
  getTotalSpending(dynastyId: string, periodStart: bigint, periodEnd: bigint): bigint;
  getEventHistory(dynastyId: string): ReadonlyArray<EconomicEvent>;
}

interface EconomyReportState {
  readonly incomeEvents: Map<string, EconomicEvent>;
  readonly spendingEvents: Map<string, EconomicEvent>;
  readonly wealthSnapshots: Map<string, Array<WealthSnapshot>>;
  readonly marketShares: Map<string, MutableMarketShare>;
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { next(): string };
  eventCounter: number;
}

interface MutableMarketShare {
  readonly dynastyId: string;
  readonly commodityId: string;
  readonly worldId: string;
  playerVolume: bigint;
}

export function createPlayerEconomyReport(deps: {
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { next(): string };
}): PlayerEconomyReport {
  const state: EconomyReportState = {
    incomeEvents: new Map(),
    spendingEvents: new Map(),
    wealthSnapshots: new Map(),
    marketShares: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    eventCounter: 0,
  };

  return {
    recordIncome: (id, src, amt, desc) => recordIncomeImpl(state, id, src, amt, desc),
    recordSpending: (id, cat, amt, desc) => recordSpendingImpl(state, id, cat, amt, desc),
    takeWealthSnapshot: (id, liq, illiq) => takeWealthSnapshotImpl(state, id, liq, illiq),
    getWealthTrajectory: (id) => getWealthTrajectoryImpl(state, id),
    getMarketShare: (dId, wId, cId, total) => getMarketShareImpl(state, dId, wId, cId, total),
    generateReport: (id, start, end) => generateReportImpl(state, id, start, end),
    getTopIncomeSource: (id, start, end) => getTopIncomeSourceImpl(state, id, start, end),
    getIncomeBreakdown: (id, start, end) => getIncomeBreakdownImpl(state, id, start, end),
    getSpendingBreakdown: (id, start, end) => getSpendingBreakdownImpl(state, id, start, end),
    getTotalIncome: (id, start, end) => getTotalIncomeImpl(state, id, start, end),
    getTotalSpending: (id, start, end) => getTotalSpendingImpl(state, id, start, end),
    getEventHistory: (id) => getEventHistoryImpl(state, id),
  };
}

function recordIncomeImpl(
  state: EconomyReportState,
  dynastyId: string,
  source: IncomeSource,
  amount: bigint,
  description: string,
): string {
  state.eventCounter = state.eventCounter + 1;
  const eventId = 'income-' + String(state.eventCounter);
  const event: EconomicEvent = {
    eventId,
    dynastyId,
    timestamp: state.clock.nowMicroseconds(),
    amount,
    category: source,
    description,
  };
  state.incomeEvents.set(eventId, event);
  return eventId;
}

function recordSpendingImpl(
  state: EconomyReportState,
  dynastyId: string,
  category: SpendingCategory,
  amount: bigint,
  description: string,
): string {
  state.eventCounter = state.eventCounter + 1;
  const eventId = 'spending-' + String(state.eventCounter);
  const event: EconomicEvent = {
    eventId,
    dynastyId,
    timestamp: state.clock.nowMicroseconds(),
    amount,
    category,
    description,
  };
  state.spendingEvents.set(eventId, event);
  return eventId;
}

function takeWealthSnapshotImpl(
  state: EconomyReportState,
  dynastyId: string,
  liquidAssets: bigint,
  illiquidAssets: bigint,
): 'success' {
  const snapshots = state.wealthSnapshots.get(dynastyId);
  const snapshot: WealthSnapshot = {
    dynastyId,
    timestamp: state.clock.nowMicroseconds(),
    netWorth: liquidAssets + illiquidAssets,
    liquidAssets,
    illiquidAssets,
  };
  if (snapshots !== undefined) {
    snapshots.push(snapshot);
  } else {
    state.wealthSnapshots.set(dynastyId, [snapshot]);
  }
  return 'success';
}

function getWealthTrajectoryImpl(
  state: EconomyReportState,
  dynastyId: string,
): ReadonlyArray<WealthSnapshot> {
  const snapshots = state.wealthSnapshots.get(dynastyId);
  return snapshots !== undefined ? snapshots : [];
}

function getMarketShareImpl(
  state: EconomyReportState,
  dynastyId: string,
  worldId: string,
  commodityId: string,
  totalVolume: bigint,
): MarketShare {
  const key = dynastyId + ':' + worldId + ':' + commodityId;
  const share = state.marketShares.get(key);
  const playerVolume = share !== undefined ? share.playerVolume : 0n;
  const sharePercentage =
    totalVolume > 0n ? Number((playerVolume * 10000n) / totalVolume) / 100 : 0;
  return {
    dynastyId,
    commodityId,
    worldId,
    playerVolume,
    totalVolume,
    sharePercentage,
  };
}

function generateReportImpl(
  state: EconomyReportState,
  dynastyId: string,
  periodStart: bigint,
  periodEnd: bigint,
): EconomicReport {
  const totalIncome = getTotalIncomeImpl(state, dynastyId, periodStart, periodEnd);
  const totalSpending = getTotalSpendingImpl(state, dynastyId, periodStart, periodEnd);
  const netChange = totalIncome - totalSpending;
  const topIncome = getTopIncomeSourceImpl(state, dynastyId, periodStart, periodEnd);
  const topSpending = getTopSpendingCategoryImpl(state, dynastyId, periodStart, periodEnd);
  const trajectory = getWealthTrajectoryImpl(state, dynastyId);
  const filtered = trajectory.filter((s) => s.timestamp >= periodStart && s.timestamp <= periodEnd);
  let growthRate = 0;
  if (filtered.length >= 2) {
    const first = filtered[0];
    const last = filtered[filtered.length - 1];
    if (first !== undefined && last !== undefined && first.netWorth > 0n) {
      const change = last.netWorth - first.netWorth;
      growthRate = Number((change * 10000n) / first.netWorth) / 100;
    }
  }
  return {
    dynastyId,
    periodStart,
    periodEnd,
    totalIncome,
    totalSpending,
    netChange,
    topIncomeSource: topIncome,
    topSpendingCategory: topSpending,
    wealthGrowthRate: growthRate,
  };
}

function getTotalIncomeImpl(
  state: EconomyReportState,
  dynastyId: string,
  periodStart: bigint,
  periodEnd: bigint,
): bigint {
  let total = 0n;
  for (const event of state.incomeEvents.values()) {
    if (
      event.dynastyId === dynastyId &&
      event.timestamp >= periodStart &&
      event.timestamp <= periodEnd
    ) {
      total = total + event.amount;
    }
  }
  return total;
}

function getTotalSpendingImpl(
  state: EconomyReportState,
  dynastyId: string,
  periodStart: bigint,
  periodEnd: bigint,
): bigint {
  let total = 0n;
  for (const event of state.spendingEvents.values()) {
    if (
      event.dynastyId === dynastyId &&
      event.timestamp >= periodStart &&
      event.timestamp <= periodEnd
    ) {
      total = total + event.amount;
    }
  }
  return total;
}

function getTopIncomeSourceImpl(
  state: EconomyReportState,
  dynastyId: string,
  periodStart: bigint,
  periodEnd: bigint,
): IncomeSource | null {
  const breakdown = getIncomeBreakdownImpl(state, dynastyId, periodStart, periodEnd);
  if (breakdown.length === 0) return null;
  const top = breakdown[0];
  return top !== undefined ? (top.source as IncomeSource) : null;
}

function getTopSpendingCategoryImpl(
  state: EconomyReportState,
  dynastyId: string,
  periodStart: bigint,
  periodEnd: bigint,
): SpendingCategory | null {
  const breakdown = getSpendingBreakdownImpl(state, dynastyId, periodStart, periodEnd);
  if (breakdown.length === 0) return null;
  const top = breakdown[0];
  return top !== undefined ? (top.category as SpendingCategory) : null;
}

function getIncomeBreakdownImpl(
  state: EconomyReportState,
  dynastyId: string,
  periodStart: bigint,
  periodEnd: bigint,
): ReadonlyArray<IncomeBreakdown> {
  const totals = new Map<IncomeSource, bigint>();
  let grandTotal = 0n;
  for (const event of state.incomeEvents.values()) {
    if (
      event.dynastyId === dynastyId &&
      event.timestamp >= periodStart &&
      event.timestamp <= periodEnd
    ) {
      const src = event.category as IncomeSource;
      const current = totals.get(src) ?? 0n;
      totals.set(src, current + event.amount);
      grandTotal = grandTotal + event.amount;
    }
  }
  const result: Array<IncomeBreakdown> = [];
  for (const entry of totals.entries()) {
    const source = entry[0];
    const amount = entry[1];
    if (source === undefined || amount === undefined) continue;
    const percentage = grandTotal > 0n ? Number((amount * 10000n) / grandTotal) / 100 : 0;
    result.push({ source, amount, percentage });
  }
  result.sort((a, b) => Number(b.amount - a.amount));
  return result;
}

function getSpendingBreakdownImpl(
  state: EconomyReportState,
  dynastyId: string,
  periodStart: bigint,
  periodEnd: bigint,
): ReadonlyArray<SpendingBreakdown> {
  const totals = new Map<SpendingCategory, bigint>();
  let grandTotal = 0n;
  for (const event of state.spendingEvents.values()) {
    if (
      event.dynastyId === dynastyId &&
      event.timestamp >= periodStart &&
      event.timestamp <= periodEnd
    ) {
      const cat = event.category as SpendingCategory;
      const current = totals.get(cat) ?? 0n;
      totals.set(cat, current + event.amount);
      grandTotal = grandTotal + event.amount;
    }
  }
  const result: Array<SpendingBreakdown> = [];
  for (const entry of totals.entries()) {
    const category = entry[0];
    const amount = entry[1];
    if (category === undefined || amount === undefined) continue;
    const percentage = grandTotal > 0n ? Number((amount * 10000n) / grandTotal) / 100 : 0;
    result.push({ category, amount, percentage });
  }
  result.sort((a, b) => Number(b.amount - a.amount));
  return result;
}

function getEventHistoryImpl(
  state: EconomyReportState,
  dynastyId: string,
): ReadonlyArray<EconomicEvent> {
  const result: Array<EconomicEvent> = [];
  for (const event of state.incomeEvents.values()) {
    if (event.dynastyId === dynastyId) {
      result.push(event);
    }
  }
  for (const event of state.spendingEvents.values()) {
    if (event.dynastyId === dynastyId) {
      result.push(event);
    }
  }
  result.sort((a, b) => Number(a.timestamp - b.timestamp));
  return result;
}
