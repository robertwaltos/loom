/**
 * World Shadow Economy — NPC commodity layer per world.
 *
 * Bible v1.1 Part 7.6: A simplified economy that makes worlds feel
 * alive without competing with player KALON. Tracks four commodity
 * types, labor market, population unrest, and a prosperity index
 * that feeds into world issuance via adjustForProductivity().
 *
 * Each world has its own shadow economy instance. Tick-driven
 * simulation with mean-reverting price dynamics.
 */

// ─── Types ─────────────────────────────────────────────────────────

export type CommodityType = 'food' | 'materials' | 'services' | 'luxury';

export interface CommodityState {
  readonly supply: number;
  readonly demand: number;
  readonly priceIndex: number;
}

export interface UnrestEvent {
  readonly worldId: string;
  readonly unrestLevel: number;
  readonly triggeredAtUs: number;
}

export interface WorldShadowEconomy {
  /** Advance the simulation by deltaUs microseconds. */
  tick(deltaUs: number): UnrestEvent | null;

  /** Record NPC production of a commodity. */
  recordProduction(commodity: CommodityType, amount: number): void;

  /** Record consumption demand for a commodity. */
  recordConsumption(commodity: CommodityType, amount: number): void;

  /** Set labor market levels. Both [0, 1]. */
  setLaborMarket(demand: number, supply: number): void;

  /** Current price index for a commodity. Equilibrium = 1.0. */
  getPriceIndex(commodity: CommodityType): number;

  /** All commodity states. */
  getCommodities(): Readonly<Record<CommodityType, CommodityState>>;

  /** Population unrest level [0, 1]. */
  getUnrestLevel(): number;

  /** Prosperity index [0, 1] for productivity adjustment. */
  getProsperityIndex(): number;

  /**
   * Productivity value (80-120) for WorldIssuanceService.
   * Maps prosperity [0,1] → [80,120].
   */
  getProductivityIndex(): number;

  readonly worldId: string;
}

// ─── Config ────────────────────────────────────────────────────────

export interface ShadowEconomyConfig {
  /** Rate at which supply/demand decay per tick [0, 1]. */
  readonly decayRate: number;
  /** Rate of mean-reversion toward equilibrium price. */
  readonly priceReversionRate: number;
  /** Unrest threshold that triggers Assembly notification. */
  readonly unrestNotifyThreshold: number;
  /** Weight of price scarcity in unrest calculation [0, 1]. */
  readonly scarcityUnrestWeight: number;
  /** Weight of unemployment in unrest calculation [0, 1]. */
  readonly unemploymentUnrestWeight: number;
}

export const DEFAULT_SHADOW_CONFIG: Readonly<ShadowEconomyConfig> = {
  decayRate: 0.02,
  priceReversionRate: 0.05,
  unrestNotifyThreshold: 0.7,
  scarcityUnrestWeight: 0.6,
  unemploymentUnrestWeight: 0.4,
};

// ─── Constants ─────────────────────────────────────────────────────

const COMMODITY_TYPES: ReadonlyArray<CommodityType> = [
  'food', 'materials', 'services', 'luxury',
];

const MIN_PRICE = 0.2;
const MAX_PRICE = 3.0;
const EQUILIBRIUM_PRICE = 1.0;
const INITIAL_POOL = 100;
const BASELINE_FLOW = 1;
const EQUILIBRIUM_PULL = 0.02;

// ─── Internal State ────────────────────────────────────────────────

interface EconomyState {
  readonly worldId: string;
  readonly config: ShadowEconomyConfig;
  readonly commodities: Record<CommodityType, MutableCommodity>;
  laborDemand: number;
  laborSupply: number;
  unrestLevel: number;
  prosperityIndex: number;
  lastUnrestNotify: boolean;
  readonly clock: { nowMicroseconds(): number };
}

interface MutableCommodity {
  supply: number;
  demand: number;
  priceIndex: number;
}

// ─── Factory ───────────────────────────────────────────────────────

export interface ShadowEconomyDeps {
  readonly clock: { nowMicroseconds(): number };
}

export function createWorldShadowEconomy(
  worldId: string,
  deps: ShadowEconomyDeps,
  config: ShadowEconomyConfig = DEFAULT_SHADOW_CONFIG,
): WorldShadowEconomy {
  const state = initState(worldId, deps.clock, config);

  return {
    worldId,
    tick: (dt) => tickEconomy(state, dt),
    recordProduction: (c, a) => { addSupply(state, c, a); },
    recordConsumption: (c, a) => { addDemand(state, c, a); },
    setLaborMarket: (d, s) => { setLabor(state, d, s); },
    getPriceIndex: (c) => state.commodities[c].priceIndex,
    getCommodities: () => snapshotCommodities(state),
    getUnrestLevel: () => state.unrestLevel,
    getProsperityIndex: () => state.prosperityIndex,
    getProductivityIndex: () => prosperityToProductivity(state.prosperityIndex),
  };
}

// ─── Initialization ────────────────────────────────────────────────

function initState(
  worldId: string,
  clock: { nowMicroseconds(): number },
  config: ShadowEconomyConfig,
): EconomyState {
  const commodities = {} as Record<CommodityType, MutableCommodity>;
  for (const type of COMMODITY_TYPES) {
    commodities[type] = { supply: INITIAL_POOL, demand: INITIAL_POOL, priceIndex: EQUILIBRIUM_PRICE };
  }
  return {
    worldId, config, commodities, clock,
    laborDemand: 0.5, laborSupply: 0.5,
    unrestLevel: 0, prosperityIndex: 1.0,
    lastUnrestNotify: false,
  };
}

// ─── Tick Logic ────────────────────────────────────────────────────

function tickEconomy(state: EconomyState, _deltaUs: number): UnrestEvent | null {
  for (const type of COMMODITY_TYPES) {
    tickCommodity(state.commodities[type], state.config);
  }
  state.unrestLevel = computeUnrest(state);
  state.prosperityIndex = clamp01(1.0 - state.unrestLevel);
  return checkUnrestThreshold(state);
}

function tickCommodity(c: MutableCommodity, config: ShadowEconomyConfig): void {
  // Baseline NPC activity adds equal supply/demand, normalizing ratio over time
  c.supply += BASELINE_FLOW;
  c.demand += BASELINE_FLOW;
  const targetPrice = computeTargetPrice(c.supply, c.demand);
  c.priceIndex += (targetPrice - c.priceIndex) * config.priceReversionRate;
  // Long-term equilibrium pull — markets self-correct
  c.priceIndex += (EQUILIBRIUM_PRICE - c.priceIndex) * EQUILIBRIUM_PULL;
  c.priceIndex = clampPrice(c.priceIndex);
  c.supply = Math.max(0, c.supply * (1 - config.decayRate));
  c.demand = Math.max(0, c.demand * (1 - config.decayRate));
}

function computeTargetPrice(supply: number, demand: number): number {
  if (supply <= 0) return MAX_PRICE;
  return clampPrice(demand / supply);
}

// ─── Unrest & Prosperity ───────────────────────────────────────────

function computeUnrest(state: EconomyState): number {
  const scarcity = computeScarcityFactor(state);
  const unemployment = computeUnemploymentFactor(state);
  const raw =
    scarcity * state.config.scarcityUnrestWeight +
    unemployment * state.config.unemploymentUnrestWeight;
  return clamp01(raw);
}

function computeScarcityFactor(state: EconomyState): number {
  let totalExcess = 0;
  for (const type of COMMODITY_TYPES) {
    const excess = Math.max(0, state.commodities[type].priceIndex - EQUILIBRIUM_PRICE);
    totalExcess += excess / (MAX_PRICE - EQUILIBRIUM_PRICE);
  }
  return clamp01(totalExcess / COMMODITY_TYPES.length);
}

function computeUnemploymentFactor(state: EconomyState): number {
  if (state.laborSupply <= 0) return 0;
  const gap = Math.max(0, state.laborSupply - state.laborDemand);
  return clamp01(gap / state.laborSupply);
}

function checkUnrestThreshold(state: EconomyState): UnrestEvent | null {
  const aboveThreshold = state.unrestLevel >= state.config.unrestNotifyThreshold;
  if (aboveThreshold && !state.lastUnrestNotify) {
    state.lastUnrestNotify = true;
    return {
      worldId: state.worldId,
      unrestLevel: state.unrestLevel,
      triggeredAtUs: state.clock.nowMicroseconds(),
    };
  }
  if (!aboveThreshold) {
    state.lastUnrestNotify = false;
  }
  return null;
}

// ─── Mutations ─────────────────────────────────────────────────────

function addSupply(state: EconomyState, commodity: CommodityType, amount: number): void {
  state.commodities[commodity].supply += Math.max(0, amount);
}

function addDemand(state: EconomyState, commodity: CommodityType, amount: number): void {
  state.commodities[commodity].demand += Math.max(0, amount);
}

function setLabor(state: EconomyState, demand: number, supply: number): void {
  state.laborDemand = clamp01(demand);
  state.laborSupply = clamp01(supply);
}

// ─── Snapshots ─────────────────────────────────────────────────────

function snapshotCommodities(
  state: EconomyState,
): Readonly<Record<CommodityType, CommodityState>> {
  const result = {} as Record<CommodityType, CommodityState>;
  for (const type of COMMODITY_TYPES) {
    const c = state.commodities[type];
    result[type] = { supply: c.supply, demand: c.demand, priceIndex: c.priceIndex };
  }
  return result;
}

// ─── Conversion ────────────────────────────────────────────────────

/** Map prosperity [0, 1] to productivity index [80, 120]. */
function prosperityToProductivity(prosperity: number): number {
  return Math.round(80 + prosperity * 40);
}

// ─── Math Helpers ──────────────────────────────────────────────────

function clampPrice(value: number): number {
  if (value < MIN_PRICE) return MIN_PRICE;
  if (value > MAX_PRICE) return MAX_PRICE;
  return value;
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
