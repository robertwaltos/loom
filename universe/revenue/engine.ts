/**
 * Koydo Worlds — Revenue & Epic Royalty Engine
 *
 * Tracks all revenue events and computes quarterly UE5 royalty obligations.
 *
 * UE5 ROYALTY RULES (as of March 2026):
 * - First $1,000,000 USD cumulative royalty-eligible revenue: royalty-free
 * - After $1M: 5% of royalty-eligible revenue (standard rate)
 * - Reduced: 3.5% if Epic Games Store revenue exists in that quarter
 * - Revenue from Epic Games Store sales does NOT count toward royalty base
 * - Quarterly reporting required when >$10,000/quarter after crossing $1M
 */

import type { RevenueEvent, RoyaltyLedgerEntry } from './types.js';

// ─── Constants ─────────────────────────────────────────────────────

export const LIFETIME_ROYALTY_FREE_THRESHOLD = 1_000_000;
export const STANDARD_ROYALTY_RATE = 0.05;
export const EPIC_STORE_ROYALTY_RATE = 0.035;
export const QUARTERLY_REPORTING_THRESHOLD = 10_000;

// ─── Public Interface ──────────────────────────────────────────────

export interface RevenueEngineDeps {
  readonly generateId: () => string;
  readonly now: () => number;
}

export interface RevenueEngineConfig {
  readonly lifetimeThreshold?: number;
  readonly standardRate?: number;
  readonly epicRate?: number;
  readonly reportingThreshold?: number;
}

export interface RevenueEngine {
  recordEvent(event: Omit<RevenueEvent, 'id' | 'createdAt'>): RevenueEvent;
  computeQuarterlyLedger(quarter: string): RoyaltyLedgerEntry;
  getTotalLifetimeGross(): number;
  getEventsForQuarter(quarter: string): readonly RevenueEvent[];
  getStats(): RevenueEngineStats;
}

export interface RevenueEngineStats {
  readonly totalEvents: number;
  readonly lifetimeGrossUsd: number;
  readonly lifetimeRoyaltyEligibleUsd: number;
}

// ─── Internal Types ────────────────────────────────────────────────

interface ResolvedConfig {
  readonly lifetimeThreshold: number;
  readonly standardRate: number;
  readonly epicRate: number;
  readonly reportingThreshold: number;
}

interface RevenueContext {
  readonly deps: RevenueEngineDeps;
  readonly cfg: ResolvedConfig;
  readonly events: RevenueEvent[];
}

// ─── Config Resolution ─────────────────────────────────────────────

function resolveConfig(cfg?: RevenueEngineConfig): ResolvedConfig {
  return {
    lifetimeThreshold: cfg?.lifetimeThreshold ?? LIFETIME_ROYALTY_FREE_THRESHOLD,
    standardRate: cfg?.standardRate ?? STANDARD_ROYALTY_RATE,
    epicRate: cfg?.epicRate ?? EPIC_STORE_ROYALTY_RATE,
    reportingThreshold: cfg?.reportingThreshold ?? QUARTERLY_REPORTING_THRESHOLD,
  };
}

// ─── Quarter Helpers ───────────────────────────────────────────────

function timestampToQuarter(ts: number): string {
  const d = new Date(ts);
  const q = String(Math.floor(d.getUTCMonth() / 3) + 1);
  return `${String(d.getUTCFullYear())}-Q${q}`;
}

function quarterStart(quarter: string): number {
  const year = parseInt(quarter.slice(0, 4), 10);
  const q = parseInt(quarter.slice(6), 10);
  return Date.UTC(year, (q - 1) * 3, 1);
}

function isBeforeQuarter(ts: number, quarter: string): boolean {
  return ts < quarterStart(quarter);
}

// ─── Revenue Aggregation ───────────────────────────────────────────

function eventsForQuarter(
  ctx: RevenueContext,
  quarter: string,
): readonly RevenueEvent[] {
  return ctx.events.filter((e) => timestampToQuarter(e.createdAt) === quarter);
}

function eventsBeforeQuarter(
  ctx: RevenueContext,
  quarter: string,
): readonly RevenueEvent[] {
  return ctx.events.filter((e) => isBeforeQuarter(e.createdAt, quarter));
}

function sumGross(events: readonly RevenueEvent[]): number {
  return events.reduce((acc, e) => acc + e.grossAmountUsd, 0);
}

function sumRoyaltyEligible(events: readonly RevenueEvent[]): number {
  return events
    .filter((e) => e.platform !== 'epic')
    .reduce((acc, e) => acc + e.grossAmountUsd, 0);
}

// ─── Royalty Calculation ───────────────────────────────────────────

function computeRoyaltyOwed(
  cfg: ResolvedConfig,
  eligibleThisQuarter: number,
  cumulativeEligibleBefore: number,
): number {
  const remaining = cfg.lifetimeThreshold - cumulativeEligibleBefore;
  if (remaining >= eligibleThisQuarter) return 0;
  const taxableAmount = eligibleThisQuarter - Math.max(remaining, 0);
  return Math.round(taxableAmount * 1000) / 1000;
}

function buildThresholdNote(
  cfg: ResolvedConfig,
  royaltyOwed: number,
  eligibleThisQuarter: number,
  cumulativeEligible: number,
): string {
  if (cumulativeEligible <= cfg.lifetimeThreshold) {
    return 'Under $1M lifetime royalty-eligible revenue';
  }
  if (eligibleThisQuarter < cfg.reportingThreshold) {
    return `Under $${cfg.reportingThreshold.toLocaleString()} quarter — reporting not required`;
  }
  return `$${royaltyOwed.toFixed(2)} owed — report due within 45 days of quarter end`;
}

// ─── Ledger Computation ────────────────────────────────────────────

interface LedgerAmounts {
  totalGross: number;
  epicRevenue: number;
  eligibleThisQuarter: number;
  cumulativeEligibleBefore: number;
  cumulativeLifetime: number;
  royaltyRate: number;
  royaltyOwed: number;
}

function computeLedgerAmounts(
  ctx: RevenueContext,
  quarter: string,
): LedgerAmounts {
  const quarterEvents = eventsForQuarter(ctx, quarter);
  const priorEvents = eventsBeforeQuarter(ctx, quarter);
  const totalGross = sumGross(quarterEvents);
  const epicRevenue = sumGross(quarterEvents.filter((e) => e.platform === 'epic'));
  const eligibleThisQuarter = totalGross - epicRevenue;
  const cumulativeEligibleBefore = sumRoyaltyEligible(priorEvents);
  const cumulativeLifetime = sumGross([...priorEvents, ...quarterEvents]);
  const royaltyRate = epicRevenue > 0 ? ctx.cfg.epicRate : ctx.cfg.standardRate;
  const baseOwed = computeRoyaltyOwed(ctx.cfg, eligibleThisQuarter, cumulativeEligibleBefore);
  const royaltyOwed = Math.round(baseOwed * royaltyRate * 1000) / 1000;
  return { totalGross, epicRevenue, eligibleThisQuarter, cumulativeEligibleBefore, cumulativeLifetime, royaltyRate, royaltyOwed };
}

function doComputeLedger(
  ctx: RevenueContext,
  quarter: string,
): RoyaltyLedgerEntry {
  const a = computeLedgerAmounts(ctx, quarter);
  const cumulativeEligible = a.cumulativeEligibleBefore + a.eligibleThisQuarter;
  return {
    id: ctx.deps.generateId(),
    quarter,
    totalGrossRevenue: Math.round(a.totalGross * 100) / 100,
    epicStoreRevenue: Math.round(a.epicRevenue * 100) / 100,
    royaltyEligibleRevenue: Math.round(a.eligibleThisQuarter * 100) / 100,
    cumulativeLifetimeGross: Math.round(a.cumulativeLifetime * 100) / 100,
    royaltyRate: a.royaltyRate,
    royaltyOwed: a.royaltyOwed,
    thresholdNote: buildThresholdNote(ctx.cfg, a.royaltyOwed, a.eligibleThisQuarter, cumulativeEligible),
    reportSubmitted: false,
    reportSubmittedAt: null,
    paymentStatus: a.royaltyOwed > 0 ? 'pending' : 'not_due',
    createdAt: ctx.deps.now(),
  };
}

// ─── Event Recording ───────────────────────────────────────────────

function doRecordEvent(
  ctx: RevenueContext,
  event: Omit<RevenueEvent, 'id' | 'createdAt'>,
): RevenueEvent {
  const full: RevenueEvent = {
    ...event,
    id: ctx.deps.generateId(),
    createdAt: ctx.deps.now(),
  };
  ctx.events.push(full);
  return full;
}

// ─── Stats ─────────────────────────────────────────────────────────

function getStats(ctx: RevenueContext): RevenueEngineStats {
  return {
    totalEvents: ctx.events.length,
    lifetimeGrossUsd: Math.round(sumGross(ctx.events) * 100) / 100,
    lifetimeRoyaltyEligibleUsd:
      Math.round(sumRoyaltyEligible(ctx.events) * 100) / 100,
  };
}

// ─── Factory ──────────────────────────────────────────────────────

export function createRevenueEngine(
  deps: RevenueEngineDeps,
  config?: RevenueEngineConfig,
): RevenueEngine {
  const ctx: RevenueContext = {
    deps,
    cfg: resolveConfig(config),
    events: [],
  };
  return {
    recordEvent: (event) => doRecordEvent(ctx, event),
    computeQuarterlyLedger: (quarter) => doComputeLedger(ctx, quarter),
    getTotalLifetimeGross: () =>
      Math.round(sumGross(ctx.events) * 100) / 100,
    getEventsForQuarter: (quarter) => eventsForQuarter(ctx, quarter),
    getStats: () => getStats(ctx),
  };
}
