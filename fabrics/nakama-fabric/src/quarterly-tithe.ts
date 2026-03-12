/**
 * Quarterly Tithe — Progressive wealth tax on prosperity-tier holdings.
 *
 * Bible v1, Part 3.3: Dynasties holding KALON above the prosperity
 * threshold pay a quarterly tithe. The base rate is 0.5% of the
 * titheable amount (holdings minus the prosperity threshold).
 * The Architect can adjust the rate quarterly between 0.5% and 2.0%.
 *
 * Tithe proceeds flow into the Commons Fund for redistribution.
 * All arithmetic in BigInt micro-KALON.
 */

import { WEALTH_ZONE_PPM } from './wealth-zones.js';

// ─── Constants ──────────────────────────────────────────────────────

export const TITHE_RATES = {
  base: 5n,
  minimum: 5n,
  maximum: 20n,
  scale: 1_000n,
} as const;

export const TITHE_INTERVAL_DAYS = 90;

// ─── Types ──────────────────────────────────────────────────────────

export interface TitheAssessment {
  readonly dynastyId: string;
  readonly holdings: bigint;
  readonly totalSupply: bigint;
  readonly prosperityThreshold: bigint;
  readonly titheableAmount: bigint;
  readonly titheOwed: bigint;
  readonly rateApplied: bigint;
}

export interface TitheCycleResult {
  readonly cycleId: string;
  readonly worldId: string;
  readonly periodStart: number;
  readonly periodEnd: number;
  readonly assessments: ReadonlyArray<TitheAssessment>;
  readonly totalCollected: bigint;
  readonly dynastiesAssessed: number;
  readonly dynastiesExempt: number;
}

// ─── Ports ──────────────────────────────────────────────────────────

export interface TitheLedgerPort {
  readonly getBalance: (accountId: string) => bigint;
  readonly transfer: (fromId: string, toId: string, amount: bigint) => void;
}

export interface TitheDynastyPort {
  readonly getActiveDynastyAccounts: (worldId: string) => ReadonlyArray<string>;
}

export interface TitheSupplyPort {
  readonly getTotalSupply: (worldId: string) => bigint;
}

export interface TitheClockPort {
  readonly nowMicroseconds: () => number;
}

export interface TitheIdPort {
  readonly generate: () => string;
}

// ─── Engine Interface ───────────────────────────────────────────────

export interface QuarterlyTitheEngine {
  readonly assess: (dynastyId: string, holdings: bigint, totalSupply: bigint) => TitheAssessment;
  readonly collectForWorld: (worldId: string, commonsAccountId: string) => TitheCycleResult;
  readonly setArchitectRate: (rate: bigint) => void;
  readonly getCurrentRate: () => bigint;
}

// ─── Deps ───────────────────────────────────────────────────────────

export interface QuarterlyTitheDeps {
  readonly ledger: TitheLedgerPort;
  readonly dynastyPort: TitheDynastyPort;
  readonly supplyPort: TitheSupplyPort;
  readonly clock: TitheClockPort;
  readonly idGen: TitheIdPort;
}

// ─── State ──────────────────────────────────────────────────────────

interface TitheState {
  currentRate: bigint;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createQuarterlyTitheEngine(deps: QuarterlyTitheDeps): QuarterlyTitheEngine {
  const state: TitheState = { currentRate: TITHE_RATES.base };

  return {
    assess: (dynastyId, holdings, totalSupply) =>
      assessDynasty(state, dynastyId, holdings, totalSupply),
    collectForWorld: (worldId, commonsAccountId) =>
      collectForWorldImpl(state, deps, worldId, commonsAccountId),
    setArchitectRate: (rate) => setRate(state, rate),
    getCurrentRate: () => state.currentRate,
  };
}

// ─── Assessment ─────────────────────────────────────────────────────

function computeProsperityThreshold(totalSupply: bigint): bigint {
  return (totalSupply * WEALTH_ZONE_PPM.prosperityMax) / WEALTH_ZONE_PPM.scale;
}

function assessDynasty(
  state: TitheState,
  dynastyId: string,
  holdings: bigint,
  totalSupply: bigint,
): TitheAssessment {
  if (totalSupply <= 0n) {
    return {
      dynastyId,
      holdings,
      totalSupply,
      prosperityThreshold: 0n,
      titheableAmount: 0n,
      titheOwed: 0n,
      rateApplied: state.currentRate,
    };
  }

  const prosperityThreshold = computeProsperityThreshold(totalSupply);
  const titheableAmount = holdings > prosperityThreshold
    ? holdings - prosperityThreshold
    : 0n;
  const titheOwed = (titheableAmount * state.currentRate) / TITHE_RATES.scale;

  return {
    dynastyId,
    holdings,
    totalSupply,
    prosperityThreshold,
    titheableAmount,
    titheOwed,
    rateApplied: state.currentRate,
  };
}

// ─── Collection ─────────────────────────────────────────────────────

function collectForWorldImpl(
  state: TitheState,
  deps: QuarterlyTitheDeps,
  worldId: string,
  commonsAccountId: string,
): TitheCycleResult {
  const now = deps.clock.nowMicroseconds();
  const cycleId = deps.idGen.generate();
  const totalSupply = deps.supplyPort.getTotalSupply(worldId);
  const accounts = deps.dynastyPort.getActiveDynastyAccounts(worldId);

  const assessments: TitheAssessment[] = [];
  let totalCollected = 0n;
  let dynastiesExempt = 0;

  for (const accountId of accounts) {
    const holdings = deps.ledger.getBalance(accountId);
    const assessment = assessDynasty(state, accountId, holdings, totalSupply);

    if (assessment.titheOwed > 0n) {
      deps.ledger.transfer(accountId, commonsAccountId, assessment.titheOwed);
      totalCollected += assessment.titheOwed;
      assessments.push(assessment);
    } else {
      dynastiesExempt++;
    }
  }

  return {
    cycleId,
    worldId,
    periodStart: now,
    periodEnd: now,
    assessments,
    totalCollected,
    dynastiesAssessed: assessments.length,
    dynastiesExempt,
  };
}

// ─── Architect Controls ─────────────────────────────────────────────

function setRate(state: TitheState, rate: bigint): void {
  if (rate < TITHE_RATES.minimum) {
    state.currentRate = TITHE_RATES.minimum;
    return;
  }
  if (rate > TITHE_RATES.maximum) {
    state.currentRate = TITHE_RATES.maximum;
    return;
  }
  state.currentRate = rate;
}
