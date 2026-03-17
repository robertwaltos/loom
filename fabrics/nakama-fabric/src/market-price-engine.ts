/**
 * Market Price Engine ΓÇö Supply/demand price discovery across worlds.
 *
 * Prices fluctuate based on supply and demand levels for each good on
 * each world. Ascendancy disruption adds a 20% surcharge on contested
 * routes. Arbitrage detection surfaces profitable cross-world trades.
 * All values in bigint micro-KALON.
 */

import type { TradeRoute } from './trade-route-registry.js';
import { TRADE_GOODS } from './trade-route-registry.js';

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type SupplyLevel = 'SURPLUS' | 'ADEQUATE' | 'SCARCE' | 'CRITICAL';
export type DemandLevel = 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
export type PriceTrend = 'RISING' | 'STABLE' | 'FALLING';

export interface PricePoint {
  readonly inGameWeek: number;
  readonly price: bigint;
}

export interface MarketPrice {
  readonly goodId: string;
  readonly worldId: string;
  readonly currentPrice: bigint;
  readonly basePrice: bigint;
  readonly supplyLevel: SupplyLevel;
  readonly demandLevel: DemandLevel;
  readonly priceHistory: PricePoint[];
  readonly trend: PriceTrend;
  readonly volatility: number; // 0-100
}

export interface ArbitrageOpportunity {
  readonly route: TradeRoute;
  readonly profitMargin: number; // percentage
  readonly estimatedProfit: bigint;
}

export interface MarketPriceEngineState {
  readonly prices: Map<string, MarketPrice>;
  readonly disrupted: Set<string>; // worldIds with Ascendancy disruption
  readonly currentWeek: number;
}

// ΓöÇΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const SUPPLY_MULTIPLIERS: Record<SupplyLevel, bigint> = {
  SURPLUS: 75n,
  ADEQUATE: 100n,
  SCARCE: 140n,
  CRITICAL: 200n,
};

const DEMAND_MULTIPLIERS: Record<DemandLevel, bigint> = {
  LOW: 85n,
  NORMAL: 100n,
  HIGH: 130n,
  EXTREME: 180n,
};

const ASCENDANCY_DISRUPTION_BPS = 120n; // 120/100 = 20% surcharge
const PRICE_STABILITY_THRESHOLD = 5n; // < 5% change = STABLE
const MIN_HISTORY_FOR_TREND = 2;

// ΓöÇΓöÇΓöÇ Factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function createMarketPriceEngineState(startWeek: number = 1): MarketPriceEngineState {
  return {
    prices: new Map(),
    disrupted: new Set(),
    currentWeek: startWeek,
  };
}

function makePriceKey(worldId: string, goodId: string): string {
  return worldId + ':' + goodId;
}

// ΓöÇΓöÇΓöÇ Price Calculation ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function calculateCurrentPrice(
  basePrice: bigint,
  supply: SupplyLevel,
  demand: DemandLevel,
): bigint {
  const sMultiplier = SUPPLY_MULTIPLIERS[supply];
  const dMultiplier = DEMAND_MULTIPLIERS[demand];
  return (basePrice * sMultiplier * dMultiplier) / 10_000n;
}

function computeVolatility(history: PricePoint[]): number {
  if (history.length < 2) return 0;
  const prices = history.map((p) => Number(p.price));
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((acc, p) => acc + Math.pow(p - avg, 2), 0) / prices.length;
  const stddev = Math.sqrt(variance);
  return Math.min(100, Math.round((stddev / avg) * 100));
}

function getPriceTrendFromHistory(history: PricePoint[]): PriceTrend {
  if (history.length < MIN_HISTORY_FOR_TREND) return 'STABLE';
  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  if (last === undefined || prev === undefined) return 'STABLE';
  if (prev.price === 0n) return 'STABLE';
  const changeBps = ((last.price - prev.price) * 100n) / prev.price;
  if (changeBps > PRICE_STABILITY_THRESHOLD) return 'RISING';
  if (changeBps < -PRICE_STABILITY_THRESHOLD) return 'FALLING';
  return 'STABLE';
}

export function getPriceTrend(priceHistory: PricePoint[]): PriceTrend {
  return getPriceTrendFromHistory(priceHistory);
}

// ΓöÇΓöÇΓöÇ Supply Updates ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function updateSupplyLevel(
  state: MarketPriceEngineState,
  worldId: string,
  goodId: string,
  supply: SupplyLevel,
): MarketPrice {
  const key = makePriceKey(worldId, goodId);
  const good = TRADE_GOODS.get(goodId);
  const basePrice = good?.baseValuePerUnit ?? 100_000_000n;
  const existing = state.prices.get(key);
  const demand = existing?.demandLevel ?? 'NORMAL';
  return upsertPrice(state, worldId, goodId, supply, demand, basePrice);
}

export function updateDemandLevel(
  state: MarketPriceEngineState,
  worldId: string,
  goodId: string,
  demand: DemandLevel,
): MarketPrice {
  const key = makePriceKey(worldId, goodId);
  const good = TRADE_GOODS.get(goodId);
  const basePrice = good?.baseValuePerUnit ?? 100_000_000n;
  const existing = state.prices.get(key);
  const supply = existing?.supplyLevel ?? 'ADEQUATE';
  return upsertPrice(state, worldId, goodId, supply, demand, basePrice);
}

function applyDisruption(state: MarketPriceEngineState, worldId: string, price: bigint): bigint {
  if (!state.disrupted.has(worldId)) return price;
  return (price * ASCENDANCY_DISRUPTION_BPS) / 100n;
}

function buildMarketPrice(
  worldId: string,
  goodId: string,
  currentPrice: bigint,
  basePrice: bigint,
  supply: SupplyLevel,
  demand: DemandLevel,
  newHistory: PricePoint[],
): MarketPrice {
  return {
    goodId,
    worldId,
    currentPrice,
    basePrice,
    supplyLevel: supply,
    demandLevel: demand,
    priceHistory: newHistory,
    trend: getPriceTrendFromHistory(newHistory),
    volatility: computeVolatility(newHistory),
  };
}

function upsertPrice(
  state: MarketPriceEngineState,
  worldId: string,
  goodId: string,
  supply: SupplyLevel,
  demand: DemandLevel,
  basePrice: bigint,
): MarketPrice {
  const key = makePriceKey(worldId, goodId);
  const existing = state.prices.get(key);
  const history = existing?.priceHistory ?? [];
  const rawPrice = calculateCurrentPrice(basePrice, supply, demand);
  const currentPrice = applyDisruption(state, worldId, rawPrice);
  const newPoint: PricePoint = { inGameWeek: state.currentWeek, price: currentPrice };
  const newHistory = [...history.slice(-11), newPoint];
  const market = buildMarketPrice(
    worldId,
    goodId,
    currentPrice,
    basePrice,
    supply,
    demand,
    newHistory,
  );
  state.prices.set(key, market);
  return market;
}

// ΓöÇΓöÇΓöÇ Ascendancy Disruption ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function applyAscendancyDisruption(
  state: MarketPriceEngineState,
  worldId: string,
  disruption: boolean,
): void {
  if (disruption) {
    state.disrupted.add(worldId);
  } else {
    state.disrupted.delete(worldId);
  }
  recomputeWorldPrices(state, worldId);
}

function recomputeWorldPrices(state: MarketPriceEngineState, worldId: string): void {
  for (const [key, market] of state.prices.entries()) {
    if (!key.startsWith(worldId + ':')) continue;
    upsertPrice(
      state,
      worldId,
      market.goodId,
      market.supplyLevel,
      market.demandLevel,
      market.basePrice,
    );
  }
}

// ΓöÇΓöÇΓöÇ Market Price Query ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function getMarketPrice(
  state: MarketPriceEngineState,
  worldId: string,
  goodId: string,
): MarketPrice | undefined {
  return state.prices.get(makePriceKey(worldId, goodId));
}

// ΓöÇΓöÇΓöÇ Arbitrage Detection ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function getArbitrageOpportunities(
  state: MarketPriceEngineState,
  routes: TradeRoute[],
): ArbitrageOpportunity[] {
  const results: ArbitrageOpportunity[] = [];
  for (const route of routes) {
    if (route.status === 'BLOCKED') continue;
    const opportunity = evaluateArbitrage(state, route);
    if (opportunity !== undefined) results.push(opportunity);
  }
  return results.sort((a, b) => b.profitMargin - a.profitMargin);
}

function evaluateArbitrage(
  state: MarketPriceEngineState,
  route: TradeRoute,
): ArbitrageOpportunity | undefined {
  const good = TRADE_GOODS.get(route.primaryGood);
  if (good === undefined) return undefined;
  const originPrice = state.prices.get(makePriceKey(route.originWorldId, route.primaryGood));
  const destPrice = state.prices.get(makePriceKey(route.destinationWorldId, route.primaryGood));
  if (originPrice === undefined || destPrice === undefined) return undefined;
  const spread = destPrice.currentPrice - originPrice.currentPrice;
  const netProfit = spread - good.latticeTransitCost;
  if (netProfit <= 0n) return undefined;
  const profitMargin = Number((netProfit * 10000n) / originPrice.currentPrice) / 100;
  return { route, profitMargin, estimatedProfit: netProfit };
}
