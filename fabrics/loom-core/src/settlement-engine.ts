/**
 * Settlement Engine — Founding, growth, and management of settlements.
 *
 * Settlements form the living nodes of each world. From lone outposts
 * to sprawling capitals, they grow based on resources, population
 * happiness, and infrastructure investment. Trade routes connect them;
 * events shape their destiny.
 */

// ─── Types ──────────────────────────────────────────────────────────

export type SettlementTier = 'OUTPOST' | 'VILLAGE' | 'TOWN' | 'CITY' | 'METROPOLIS' | 'CAPITAL';

export type SettlementEventType =
  | 'DISASTER'
  | 'FESTIVAL'
  | 'PLAGUE'
  | 'PROSPERITY'
  | 'TRADE_BOOM'
  | 'REBELLION';

export interface InfrastructureLevels {
  readonly roads: number;
  readonly power: number;
  readonly defense: number;
  readonly commerce: number;
  readonly culture: number;
}

export interface Settlement {
  readonly settlementId: string;
  readonly name: string;
  readonly worldId: string;
  readonly tier: SettlementTier;
  readonly x: number;
  readonly y: number;
  readonly population: number;
  readonly maxPopulation: number;
  readonly growthRate: number;
  readonly happiness: number;
  readonly infrastructure: InfrastructureLevels;
  readonly buildingSlots: number;
  readonly usedBuildingSlots: number;
  readonly foundedAt: number;
}

export interface TradeRoute {
  readonly routeId: string;
  readonly fromSettlementId: string;
  readonly toSettlementId: string;
  readonly efficiency: number;
  readonly distance: number;
}

export interface SettlementEvent {
  readonly eventType: SettlementEventType;
  readonly settlementId: string;
  readonly magnitude: number;
  readonly description: string;
  readonly timestamp: number;
}

export interface FoundSettlementParams {
  readonly name: string;
  readonly worldId: string;
  readonly x: number;
  readonly y: number;
  readonly biome: string;
  readonly waterAccess: boolean;
  readonly resourceCount: number;
}

export interface SettlementStats {
  readonly totalSettlements: number;
  readonly totalPopulation: number;
  readonly totalTradeRoutes: number;
  readonly byTier: ReadonlyArray<{ readonly tier: SettlementTier; readonly count: number }>;
  readonly averageHappiness: number;
}

export interface SettlementEngine {
  foundSettlement(params: FoundSettlementParams): Settlement;
  getSettlement(settlementId: string): Settlement | undefined;
  listSettlements(worldId: string): ReadonlyArray<Settlement>;
  tickGrowth(settlementId: string, deltaMs: number): Settlement | undefined;
  upgradeInfrastructure(settlementId: string, key: keyof InfrastructureLevels): boolean;
  addTradeRoute(fromId: string, toId: string): TradeRoute | undefined;
  getTradeRoutes(settlementId: string): ReadonlyArray<TradeRoute>;
  triggerEvent(settlementId: string, eventType: SettlementEventType): SettlementEvent | undefined;
  getStats(): SettlementStats;
}

// ─── Constants ──────────────────────────────────────────────────────

const TIER_ORDER: ReadonlyArray<SettlementTier> = [
  'OUTPOST',
  'VILLAGE',
  'TOWN',
  'CITY',
  'METROPOLIS',
  'CAPITAL',
];

const TIER_THRESHOLDS: Record<SettlementTier, number> = {
  OUTPOST: 0,
  VILLAGE: 50,
  TOWN: 500,
  CITY: 5000,
  METROPOLIS: 50000,
  CAPITAL: 200000,
};

const TIER_MAX_POPULATION: Record<SettlementTier, number> = {
  OUTPOST: 100,
  VILLAGE: 1000,
  TOWN: 10000,
  CITY: 100000,
  METROPOLIS: 500000,
  CAPITAL: 2000000,
};

const TIER_BUILDING_SLOTS: Record<SettlementTier, number> = {
  OUTPOST: 5,
  VILLAGE: 15,
  TOWN: 40,
  CITY: 100,
  METROPOLIS: 250,
  CAPITAL: 500,
};

const BIOME_HABITABILITY_BONUS: Record<string, number> = {
  GRASSLAND: 0.3,
  FOREST: 0.2,
  COAST: 0.25,
  SAVANNA: 0.15,
  JUNGLE: 0.05,
  DESERT: -0.2,
  TUNDRA: -0.15,
  MOUNTAIN: -0.1,
  VOLCANIC: -0.3,
  SWAMP: -0.05,
  ARCTIC: -0.25,
};

const EVENT_EFFECTS: Record<
  SettlementEventType,
  { readonly happinessDelta: number; readonly populationFactor: number }
> = {
  DISASTER: { happinessDelta: -0.2, populationFactor: 0.9 },
  FESTIVAL: { happinessDelta: 0.15, populationFactor: 1.0 },
  PLAGUE: { happinessDelta: -0.3, populationFactor: 0.8 },
  PROSPERITY: { happinessDelta: 0.2, populationFactor: 1.05 },
  TRADE_BOOM: { happinessDelta: 0.1, populationFactor: 1.02 },
  REBELLION: { happinessDelta: -0.25, populationFactor: 0.95 },
};

// ─── Mutable State ──────────────────────────────────────────────────

interface MutableSettlement {
  readonly settlementId: string;
  readonly name: string;
  readonly worldId: string;
  tier: SettlementTier;
  readonly x: number;
  readonly y: number;
  population: number;
  maxPopulation: number;
  growthRate: number;
  happiness: number;
  infrastructure: {
    roads: number;
    power: number;
    defense: number;
    commerce: number;
    culture: number;
  };
  buildingSlots: number;
  usedBuildingSlots: number;
  readonly foundedAt: number;
}

interface EngineState {
  readonly settlements: Map<string, MutableSettlement>;
  readonly tradeRoutes: Map<string, TradeRoute>;
  readonly events: SettlementEvent[];
  nextSettlementId: number;
  nextRouteId: number;
  readonly clock: { nowMicroseconds(): number };
}

// ─── Factory ────────────────────────────────────────────────────────

export function createSettlementEngine(clock: { nowMicroseconds(): number }): SettlementEngine {
  const state: EngineState = {
    settlements: new Map(),
    tradeRoutes: new Map(),
    events: [],
    nextSettlementId: 1,
    nextRouteId: 1,
    clock,
  };

  return {
    foundSettlement: (params) => foundImpl(state, params),
    getSettlement: (id) => state.settlements.get(id),
    listSettlements: (wid) => listByWorld(state, wid),
    tickGrowth: (id, dt) => tickGrowthImpl(state, id, dt),
    upgradeInfrastructure: (id, key) => upgradeImpl(state, id, key),
    addTradeRoute: (from, to) => addRouteImpl(state, from, to),
    getTradeRoutes: (id) => routesForSettlement(state, id),
    triggerEvent: (id, type) => triggerEventImpl(state, id, type),
    getStats: () => buildStats(state),
  };
}

// ─── Found Settlement ───────────────────────────────────────────────

function foundImpl(state: EngineState, params: FoundSettlementParams): Settlement {
  const id = 'stl-' + String(state.nextSettlementId);
  state.nextSettlementId += 1;

  const biomeBonus = BIOME_HABITABILITY_BONUS[params.biome] ?? 0;
  const waterBonus = params.waterAccess ? 0.1 : 0;
  const baseHappiness = Math.max(0.1, Math.min(1.0, 0.5 + biomeBonus + waterBonus));
  const baseGrowth = computeBaseGrowth(params.resourceCount, baseHappiness);

  const settlement: MutableSettlement = {
    settlementId: id,
    name: params.name,
    worldId: params.worldId,
    tier: 'OUTPOST',
    x: params.x,
    y: params.y,
    population: 10,
    maxPopulation: TIER_MAX_POPULATION['OUTPOST'],
    growthRate: baseGrowth,
    happiness: baseHappiness,
    infrastructure: { roads: 0, power: 0, defense: 0, commerce: 0, culture: 0 },
    buildingSlots: TIER_BUILDING_SLOTS['OUTPOST'],
    usedBuildingSlots: 0,
    foundedAt: state.clock.nowMicroseconds(),
  };
  state.settlements.set(id, settlement);
  return settlement;
}

function computeBaseGrowth(resourceCount: number, happiness: number): number {
  return 0.001 + resourceCount * 0.0005 + happiness * 0.002;
}

// ─── List ───────────────────────────────────────────────────────────

function listByWorld(state: EngineState, worldId: string): ReadonlyArray<Settlement> {
  const results: Settlement[] = [];
  for (const s of state.settlements.values()) {
    if (s.worldId === worldId) results.push(s);
  }
  return results;
}

// ─── Growth Tick ────────────────────────────────────────────────────

function tickGrowthImpl(
  state: EngineState,
  settlementId: string,
  deltaMs: number,
): Settlement | undefined {
  const settlement = state.settlements.get(settlementId);
  if (settlement === undefined) return undefined;

  const growth = settlement.population * settlement.growthRate * (deltaMs / 1000);
  settlement.population = Math.min(
    settlement.maxPopulation,
    Math.floor(settlement.population + growth),
  );
  checkTierUpgrade(settlement);
  return settlement;
}

function checkTierUpgrade(settlement: MutableSettlement): void {
  const currentIdx = TIER_ORDER.indexOf(settlement.tier);
  const nextIdx = currentIdx + 1;
  if (nextIdx >= TIER_ORDER.length) return;

  const nextTier = TIER_ORDER[nextIdx] as SettlementTier;
  if (settlement.population >= TIER_THRESHOLDS[nextTier]) {
    settlement.tier = nextTier;
    settlement.maxPopulation = TIER_MAX_POPULATION[nextTier];
    settlement.buildingSlots = TIER_BUILDING_SLOTS[nextTier];
  }
}

// ─── Infrastructure ─────────────────────────────────────────────────

function upgradeImpl(
  state: EngineState,
  settlementId: string,
  key: keyof InfrastructureLevels,
): boolean {
  const settlement = state.settlements.get(settlementId);
  if (settlement === undefined) return false;
  if (settlement.infrastructure[key] >= 10) return false;

  settlement.infrastructure[key] += 1;
  recalculateGrowthRate(settlement);
  return true;
}

function recalculateGrowthRate(settlement: MutableSettlement): void {
  const infra = settlement.infrastructure;
  const infraBonus = (infra.roads + infra.power + infra.commerce) * 0.0003;
  const cultureBonus = infra.culture * 0.001;
  settlement.growthRate = 0.001 + infraBonus + cultureBonus + settlement.happiness * 0.002;
}

// ─── Trade Routes ───────────────────────────────────────────────────

function addRouteImpl(state: EngineState, fromId: string, toId: string): TradeRoute | undefined {
  const from = state.settlements.get(fromId);
  const to = state.settlements.get(toId);
  if (from === undefined || to === undefined) return undefined;

  const routeId = 'route-' + String(state.nextRouteId);
  state.nextRouteId += 1;
  const distance = computeDistance(from.x, from.y, to.x, to.y);
  const efficiency = Math.max(0.1, 1.0 - distance * 0.5);

  const route: TradeRoute = {
    routeId,
    fromSettlementId: fromId,
    toSettlementId: toId,
    efficiency,
    distance,
  };
  state.tradeRoutes.set(routeId, route);
  return route;
}

function computeDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function routesForSettlement(state: EngineState, settlementId: string): ReadonlyArray<TradeRoute> {
  const routes: TradeRoute[] = [];
  for (const r of state.tradeRoutes.values()) {
    if (r.fromSettlementId === settlementId || r.toSettlementId === settlementId) {
      routes.push(r);
    }
  }
  return routes;
}

// ─── Events ─────────────────────────────────────────────────────────

function triggerEventImpl(
  state: EngineState,
  settlementId: string,
  eventType: SettlementEventType,
): SettlementEvent | undefined {
  const settlement = state.settlements.get(settlementId);
  if (settlement === undefined) return undefined;

  const effects = EVENT_EFFECTS[eventType];
  applyEventEffects(settlement, effects);

  const event: SettlementEvent = {
    eventType,
    settlementId,
    magnitude: Math.abs(effects.happinessDelta),
    description: eventType + ' struck ' + settlement.name,
    timestamp: state.clock.nowMicroseconds(),
  };
  state.events.push(event);
  return event;
}

function applyEventEffects(
  settlement: MutableSettlement,
  effects: { readonly happinessDelta: number; readonly populationFactor: number },
): void {
  settlement.happiness = clamp(settlement.happiness + effects.happinessDelta, 0, 1);
  settlement.population = Math.max(1, Math.floor(settlement.population * effects.populationFactor));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─── Stats ──────────────────────────────────────────────────────────

function buildStats(state: EngineState): SettlementStats {
  const tierCounts = new Map<SettlementTier, number>();
  let totalPop = 0;
  let totalHappiness = 0;
  let count = 0;

  for (const s of state.settlements.values()) {
    tierCounts.set(s.tier, (tierCounts.get(s.tier) ?? 0) + 1);
    totalPop += s.population;
    totalHappiness += s.happiness;
    count++;
  }

  return {
    totalSettlements: count,
    totalPopulation: totalPop,
    totalTradeRoutes: state.tradeRoutes.size,
    byTier: TIER_ORDER.map((t) => ({ tier: t, count: tierCounts.get(t) ?? 0 })),
    averageHappiness: count > 0 ? totalHappiness / count : 0,
  };
}
