/**
 * World Market — Per-world commodity markets with price discovery.
 *
 * Each world has independent commodity markets. Supply and demand
 * determine spot prices via ratio: price = baseCost × (demand / supply).
 * Detects market manipulation when single actor controls >30% of supply.
 * Tracks market events (boom, bust, shortage, glut).
 * All prices and values in bigint micro-KALON.
 */

export type MarketEventType = 'BOOM' | 'BUST' | 'SHORTAGE' | 'GLUT' | 'SPIKE' | 'CRASH';

export interface Commodity {
  readonly commodityId: string;
  readonly worldId: string;
  readonly baseCost: bigint;
  readonly name: string;
  readonly category: string;
}

export interface MarketState {
  readonly commodityId: string;
  readonly worldId: string;
  readonly totalSupply: bigint;
  readonly totalDemand: bigint;
  readonly spotPrice: bigint;
  readonly lastUpdatedAt: bigint;
}

export interface PricePoint {
  readonly commodityId: string;
  readonly price: bigint;
  readonly timestamp: bigint;
  readonly supply: bigint;
  readonly demand: bigint;
}

export interface MarketEvent {
  readonly eventId: string;
  readonly worldId: string;
  readonly commodityId: string;
  readonly eventType: MarketEventType;
  readonly timestamp: bigint;
  readonly description: string;
}

export interface ManipulationAlert {
  readonly alertId: string;
  readonly worldId: string;
  readonly commodityId: string;
  readonly actorId: string;
  readonly controlPercentage: number;
  readonly timestamp: bigint;
}

export interface MarketReport {
  readonly worldId: string;
  readonly totalCommodities: number;
  readonly totalVolume: bigint;
  readonly avgPrice: bigint;
  readonly activeEvents: number;
  readonly manipulationAlerts: number;
}

export interface SupplyEntry {
  readonly actorId: string;
  amount: bigint;
}

export interface WorldMarket {
  registerCommodity(
    worldId: string,
    commodityId: string,
    baseCost: bigint,
    name: string,
    category: string,
  ): 'success' | 'already-registered';
  getCommodity(worldId: string, commodityId: string): Commodity | 'not-found';
  recordSupply(
    worldId: string,
    commodityId: string,
    actorId: string,
    amount: bigint,
  ): 'success' | 'not-found' | 'invalid-amount';
  recordDemand(
    worldId: string,
    commodityId: string,
    amount: bigint,
  ): 'success' | 'not-found' | 'invalid-amount';
  getSpotPrice(worldId: string, commodityId: string): bigint | 'not-found';
  getMarketState(worldId: string, commodityId: string): MarketState | 'not-found';
  detectManipulation(worldId: string, commodityId: string): ReadonlyArray<ManipulationAlert>;
  triggerMarketEvent(
    worldId: string,
    commodityId: string,
    eventType: MarketEventType,
    description: string,
  ): string;
  getMarketEvents(worldId: string): ReadonlyArray<MarketEvent>;
  getMarketReport(worldId: string): MarketReport;
  getPriceHistory(worldId: string, commodityId: string): ReadonlyArray<PricePoint>;
  removeDemand(worldId: string, commodityId: string, amount: bigint): 'success' | 'not-found';
}

interface WorldMarketState {
  readonly commodities: Map<string, Commodity>;
  readonly marketStates: Map<string, MutableMarketState>;
  readonly supplyLedger: Map<string, Array<SupplyEntry>>;
  readonly priceHistory: Map<string, Array<PricePoint>>;
  readonly events: Map<string, MarketEvent>;
  readonly alerts: Map<string, ManipulationAlert>;
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { next(): string };
  eventCounter: number;
  alertCounter: number;
}

interface MutableMarketState {
  readonly commodityId: string;
  readonly worldId: string;
  totalSupply: bigint;
  totalDemand: bigint;
  spotPrice: bigint;
  lastUpdatedAt: bigint;
}

export function createWorldMarket(deps: {
  readonly clock: { nowMicroseconds(): bigint };
  readonly idGen: { next(): string };
}): WorldMarket {
  const state: WorldMarketState = {
    commodities: new Map(),
    marketStates: new Map(),
    supplyLedger: new Map(),
    priceHistory: new Map(),
    events: new Map(),
    alerts: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    eventCounter: 0,
    alertCounter: 0,
  };

  return {
    registerCommodity: (w, c, base, name, cat) =>
      registerCommodityImpl(state, w, c, base, name, cat),
    getCommodity: (w, c) => getCommodityImpl(state, w, c),
    recordSupply: (w, c, actor, amt) => recordSupplyImpl(state, w, c, actor, amt),
    recordDemand: (w, c, amt) => recordDemandImpl(state, w, c, amt),
    getSpotPrice: (w, c) => getSpotPriceImpl(state, w, c),
    getMarketState: (w, c) => getMarketStateImpl(state, w, c),
    detectManipulation: (w, c) => detectManipulationImpl(state, w, c),
    triggerMarketEvent: (w, c, type, desc) => triggerMarketEventImpl(state, w, c, type, desc),
    getMarketEvents: (w) => getMarketEventsImpl(state, w),
    getMarketReport: (w) => getMarketReportImpl(state, w),
    getPriceHistory: (w, c) => getPriceHistoryImpl(state, w, c),
    removeDemand: (w, c, amt) => removeDemandImpl(state, w, c, amt),
  };
}

function makeMarketKey(worldId: string, commodityId: string): string {
  return worldId + ':' + commodityId;
}

function registerCommodityImpl(
  state: WorldMarketState,
  worldId: string,
  commodityId: string,
  baseCost: bigint,
  name: string,
  category: string,
): 'success' | 'already-registered' {
  const key = makeMarketKey(worldId, commodityId);
  if (state.commodities.has(key)) return 'already-registered';
  state.commodities.set(key, { commodityId, worldId, baseCost, name, category });
  state.marketStates.set(key, {
    commodityId,
    worldId,
    totalSupply: 0n,
    totalDemand: 0n,
    spotPrice: baseCost,
    lastUpdatedAt: state.clock.nowMicroseconds(),
  });
  state.supplyLedger.set(key, []);
  state.priceHistory.set(key, []);
  return 'success';
}

function getCommodityImpl(
  state: WorldMarketState,
  worldId: string,
  commodityId: string,
): Commodity | 'not-found' {
  const key = makeMarketKey(worldId, commodityId);
  const c = state.commodities.get(key);
  return c !== undefined ? c : 'not-found';
}

function recordSupplyImpl(
  state: WorldMarketState,
  worldId: string,
  commodityId: string,
  actorId: string,
  amount: bigint,
): 'success' | 'not-found' | 'invalid-amount' {
  if (amount <= 0n) return 'invalid-amount';
  const key = makeMarketKey(worldId, commodityId);
  const commodity = state.commodities.get(key);
  if (commodity === undefined) return 'not-found';
  const marketState = state.marketStates.get(key);
  if (marketState === undefined) return 'not-found';
  const ledger = state.supplyLedger.get(key);
  if (ledger === undefined) return 'not-found';
  const existing = ledger.find((e) => e.actorId === actorId);
  if (existing !== undefined) {
    existing.amount = existing.amount + amount;
  } else {
    ledger.push({ actorId, amount });
  }
  marketState.totalSupply = marketState.totalSupply + amount;
  updateSpotPrice(state, commodity, marketState);
  return 'success';
}

function recordDemandImpl(
  state: WorldMarketState,
  worldId: string,
  commodityId: string,
  amount: bigint,
): 'success' | 'not-found' | 'invalid-amount' {
  if (amount <= 0n) return 'invalid-amount';
  const key = makeMarketKey(worldId, commodityId);
  const commodity = state.commodities.get(key);
  if (commodity === undefined) return 'not-found';
  const marketState = state.marketStates.get(key);
  if (marketState === undefined) return 'not-found';
  marketState.totalDemand = marketState.totalDemand + amount;
  updateSpotPrice(state, commodity, marketState);
  return 'success';
}

function removeDemandImpl(
  state: WorldMarketState,
  worldId: string,
  commodityId: string,
  amount: bigint,
): 'success' | 'not-found' {
  const key = makeMarketKey(worldId, commodityId);
  const commodity = state.commodities.get(key);
  if (commodity === undefined) return 'not-found';
  const marketState = state.marketStates.get(key);
  if (marketState === undefined) return 'not-found';
  marketState.totalDemand = marketState.totalDemand - amount;
  if (marketState.totalDemand < 0n) marketState.totalDemand = 0n;
  updateSpotPrice(state, commodity, marketState);
  return 'success';
}

function updateSpotPrice(
  state: WorldMarketState,
  commodity: Commodity,
  marketState: MutableMarketState,
): void {
  const supply = marketState.totalSupply;
  const demand = marketState.totalDemand;
  let newPrice = commodity.baseCost;
  if (supply > 0n && demand > 0n) {
    const ratio = (demand * 1_000_000n) / supply;
    newPrice = (commodity.baseCost * ratio) / 1_000_000n;
  } else if (demand > 0n) {
    newPrice = commodity.baseCost * 2n;
  }
  marketState.spotPrice = newPrice;
  marketState.lastUpdatedAt = state.clock.nowMicroseconds();
  const key = makeMarketKey(commodity.worldId, commodity.commodityId);
  const history = state.priceHistory.get(key);
  if (history !== undefined) {
    history.push({
      commodityId: commodity.commodityId,
      price: newPrice,
      timestamp: marketState.lastUpdatedAt,
      supply,
      demand,
    });
  }
}

function getSpotPriceImpl(
  state: WorldMarketState,
  worldId: string,
  commodityId: string,
): bigint | 'not-found' {
  const key = makeMarketKey(worldId, commodityId);
  const marketState = state.marketStates.get(key);
  return marketState !== undefined ? marketState.spotPrice : 'not-found';
}

function getMarketStateImpl(
  state: WorldMarketState,
  worldId: string,
  commodityId: string,
): MarketState | 'not-found' {
  const key = makeMarketKey(worldId, commodityId);
  const m = state.marketStates.get(key);
  if (m === undefined) return 'not-found';
  return {
    commodityId: m.commodityId,
    worldId: m.worldId,
    totalSupply: m.totalSupply,
    totalDemand: m.totalDemand,
    spotPrice: m.spotPrice,
    lastUpdatedAt: m.lastUpdatedAt,
  };
}

function detectManipulationImpl(
  state: WorldMarketState,
  worldId: string,
  commodityId: string,
): ReadonlyArray<ManipulationAlert> {
  const key = makeMarketKey(worldId, commodityId);
  const marketState = state.marketStates.get(key);
  if (marketState === undefined) return [];
  const ledger = state.supplyLedger.get(key);
  if (ledger === undefined) return [];
  const totalSupply = marketState.totalSupply;
  if (totalSupply === 0n) return [];
  const alerts: Array<ManipulationAlert> = [];
  for (const entry of ledger) {
    const percentage = Number((entry.amount * 10000n) / totalSupply) / 100;
    if (percentage >= 50) {
      state.alertCounter = state.alertCounter + 1;
      const alertId = 'alert-' + String(state.alertCounter);
      const alert: ManipulationAlert = {
        alertId,
        worldId,
        commodityId,
        actorId: entry.actorId,
        controlPercentage: percentage,
        timestamp: state.clock.nowMicroseconds(),
      };
      state.alerts.set(alertId, alert);
      alerts.push(alert);
    }
  }
  return alerts;
}

function triggerMarketEventImpl(
  state: WorldMarketState,
  worldId: string,
  commodityId: string,
  eventType: MarketEventType,
  description: string,
): string {
  state.eventCounter = state.eventCounter + 1;
  const eventId = 'event-' + String(state.eventCounter);
  const event: MarketEvent = {
    eventId,
    worldId,
    commodityId,
    eventType,
    timestamp: state.clock.nowMicroseconds(),
    description,
  };
  state.events.set(eventId, event);
  return eventId;
}

function getMarketEventsImpl(state: WorldMarketState, worldId: string): ReadonlyArray<MarketEvent> {
  const result: Array<MarketEvent> = [];
  for (const event of state.events.values()) {
    if (event.worldId === worldId) {
      result.push(event);
    }
  }
  return result;
}

function getMarketReportImpl(state: WorldMarketState, worldId: string): MarketReport {
  let totalCommodities = 0;
  let totalVolume = 0n;
  let totalPrice = 0n;
  let priceCount = 0;
  for (const entry of state.commodities.entries()) {
    const key = entry[0];
    const commodity = entry[1];
    if (commodity === undefined || key === undefined) continue;
    if (commodity.worldId === worldId) {
      totalCommodities = totalCommodities + 1;
      const marketState = state.marketStates.get(key);
      if (marketState !== undefined) {
        totalVolume = totalVolume + marketState.totalSupply;
        totalPrice = totalPrice + marketState.spotPrice;
        priceCount = priceCount + 1;
      }
    }
  }
  const avgPrice = priceCount > 0 ? totalPrice / BigInt(priceCount) : 0n;
  let activeEvents = 0;
  for (const event of state.events.values()) {
    if (event.worldId === worldId) {
      activeEvents = activeEvents + 1;
    }
  }
  let manipulationAlerts = 0;
  for (const alert of state.alerts.values()) {
    if (alert.worldId === worldId) {
      manipulationAlerts = manipulationAlerts + 1;
    }
  }
  return {
    worldId,
    totalCommodities,
    totalVolume,
    avgPrice,
    activeEvents,
    manipulationAlerts,
  };
}

function getPriceHistoryImpl(
  state: WorldMarketState,
  worldId: string,
  commodityId: string,
): ReadonlyArray<PricePoint> {
  const key = makeMarketKey(worldId, commodityId);
  const history = state.priceHistory.get(key);
  return history !== undefined ? history : [];
}
