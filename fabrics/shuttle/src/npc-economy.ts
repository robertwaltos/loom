/**
 * npc-economy.ts — NPC economic behavior engine.
 *
 * NPC merchants with inventories, dynamic pricing based on supply
 * and demand, trade route following, resource gathering AI, market
 * participation, and economic role types (merchant, farmer, miner, crafter).
 */

// ── Ports ────────────────────────────────────────────────────────

interface EconomyClock {
  readonly nowMicroseconds: () => number;
}

interface EconomyIdGenerator {
  readonly generate: () => string;
}

interface NpcEconomyDeps {
  readonly clock: EconomyClock;
  readonly idGenerator: EconomyIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type EconomicRole = 'merchant' | 'farmer' | 'miner' | 'crafter';

interface MerchantProfile {
  readonly npcId: string;
  readonly role: EconomicRole;
  readonly registeredAt: number;
  readonly tradeRouteId: string | null;
}

interface MarketListing {
  readonly listingId: string;
  readonly npcId: string;
  readonly resourceName: string;
  readonly quantity: number;
  readonly pricePerUnit: number;
  readonly listedAt: number;
}

interface TradeRoute {
  readonly routeId: string;
  readonly name: string;
  readonly stops: readonly string[];
  readonly resourceTypes: readonly string[];
}

interface ResourceStock {
  readonly npcId: string;
  readonly resourceName: string;
  readonly quantity: number;
  readonly lastUpdatedAt: number;
}

interface GatheringTask {
  readonly taskId: string;
  readonly npcId: string;
  readonly resourceName: string;
  readonly targetQuantity: number;
  readonly gatheredQuantity: number;
  readonly startedAt: number;
  readonly status: GatheringStatus;
}

type GatheringStatus = 'active' | 'completed' | 'cancelled';

interface TradeResult {
  readonly success: boolean;
  readonly reason: string;
  readonly totalCost: number;
}

interface PriceFactors {
  readonly basePrice: number;
  readonly supplyMultiplier: number;
  readonly demandMultiplier: number;
  readonly finalPrice: number;
}

interface NpcEconomyStats {
  readonly totalMerchants: number;
  readonly totalListings: number;
  readonly totalRoutes: number;
  readonly totalGatheringTasks: number;
  readonly merchantsByRole: Readonly<Record<EconomicRole, number>>;
}

// ── Constants ────────────────────────────────────────────────────

const BASE_PRICE = 100;
const SUPPLY_LOW_THRESHOLD = 10;
const SUPPLY_HIGH_THRESHOLD = 100;
const MAX_PRICE_MULTIPLIER = 5.0;
const MIN_PRICE_MULTIPLIER = 0.2;

// ── State ────────────────────────────────────────────────────────

interface MutableMerchant {
  readonly npcId: string;
  readonly role: EconomicRole;
  readonly registeredAt: number;
  tradeRouteId: string | null;
}

interface MutableStock {
  readonly npcId: string;
  readonly resourceName: string;
  quantity: number;
  lastUpdatedAt: number;
}

interface MutableGatheringTask {
  readonly taskId: string;
  readonly npcId: string;
  readonly resourceName: string;
  readonly targetQuantity: number;
  gatheredQuantity: number;
  readonly startedAt: number;
  status: GatheringStatus;
}

interface MutableListing {
  readonly listingId: string;
  readonly npcId: string;
  readonly resourceName: string;
  quantity: number;
  pricePerUnit: number;
  readonly listedAt: number;
}

interface EconomyState {
  readonly deps: NpcEconomyDeps;
  readonly merchants: Map<string, MutableMerchant>;
  readonly stocks: Map<string, MutableStock>;
  readonly listings: Map<string, MutableListing>;
  readonly routes: Map<string, TradeRoute>;
  readonly gatheringTasks: Map<string, MutableGatheringTask>;
  readonly demandCounters: Map<string, number>;
}

// ── Public API ───────────────────────────────────────────────────

interface NpcEconomyEngine {
  readonly registerMerchant: (npcId: string, role: EconomicRole) => MerchantProfile;
  readonly getMerchant: (npcId: string) => MerchantProfile | undefined;
  readonly removeMerchant: (npcId: string) => boolean;
  readonly getMerchantsByRole: (role: EconomicRole) => readonly MerchantProfile[];
  readonly addStock: (npcId: string, resource: string, qty: number) => ResourceStock;
  readonly getStock: (npcId: string, resource: string) => number;
  readonly removeStock: (npcId: string, resource: string, qty: number) => boolean;
  readonly createListing: (npcId: string, resource: string, qty: number) => MarketListing;
  readonly getListings: (resource: string) => readonly MarketListing[];
  readonly removeListing: (listingId: string) => boolean;
  readonly purchaseFromListing: (listingId: string, qty: number) => TradeResult;
  readonly calculatePrice: (resource: string, qty: number) => PriceFactors;
  readonly recordDemand: (resource: string) => void;
  readonly registerRoute: (route: TradeRoute) => boolean;
  readonly getRoute: (routeId: string) => TradeRoute | undefined;
  readonly assignRoute: (npcId: string, routeId: string) => boolean;
  readonly startGathering: (npcId: string, resource: string, target: number) => GatheringTask;
  readonly progressGathering: (taskId: string, amount: number) => GatheringTask | undefined;
  readonly cancelGathering: (taskId: string) => boolean;
  readonly getStats: () => NpcEconomyStats;
}

// ── Helpers ──────────────────────────────────────────────────────

function stockKey(npcId: string, resource: string): string {
  return npcId + ':' + resource;
}

function toMerchantProfile(m: MutableMerchant): MerchantProfile {
  return {
    npcId: m.npcId,
    role: m.role,
    registeredAt: m.registeredAt,
    tradeRouteId: m.tradeRouteId,
  };
}

function toResourceStock(s: MutableStock): ResourceStock {
  return {
    npcId: s.npcId,
    resourceName: s.resourceName,
    quantity: s.quantity,
    lastUpdatedAt: s.lastUpdatedAt,
  };
}

function toGatheringTask(t: MutableGatheringTask): GatheringTask {
  return {
    taskId: t.taskId,
    npcId: t.npcId,
    resourceName: t.resourceName,
    targetQuantity: t.targetQuantity,
    gatheredQuantity: t.gatheredQuantity,
    startedAt: t.startedAt,
    status: t.status,
  };
}

function toListing(l: MutableListing): MarketListing {
  return {
    listingId: l.listingId,
    npcId: l.npcId,
    resourceName: l.resourceName,
    quantity: l.quantity,
    pricePerUnit: l.pricePerUnit,
    listedAt: l.listedAt,
  };
}

function computeSupplyMultiplier(totalSupply: number): number {
  if (totalSupply <= SUPPLY_LOW_THRESHOLD) return MAX_PRICE_MULTIPLIER;
  if (totalSupply >= SUPPLY_HIGH_THRESHOLD) return MIN_PRICE_MULTIPLIER;
  const range = SUPPLY_HIGH_THRESHOLD - SUPPLY_LOW_THRESHOLD;
  const ratio = (totalSupply - SUPPLY_LOW_THRESHOLD) / range;
  const multiplier = MAX_PRICE_MULTIPLIER - ratio * (MAX_PRICE_MULTIPLIER - MIN_PRICE_MULTIPLIER);
  return Math.round(multiplier * 100) / 100;
}

function computeDemandMultiplier(demand: number): number {
  const raw = 1 + demand * 0.1;
  return Math.min(raw, MAX_PRICE_MULTIPLIER);
}

function countTotalSupply(state: EconomyState, resource: string): number {
  let total = 0;
  for (const listing of state.listings.values()) {
    if (listing.resourceName === resource) total += listing.quantity;
  }
  return total;
}

// ── Operations ───────────────────────────────────────────────────

function registerMerchantImpl(
  state: EconomyState,
  npcId: string,
  role: EconomicRole,
): MerchantProfile {
  const merchant: MutableMerchant = {
    npcId,
    role,
    registeredAt: state.deps.clock.nowMicroseconds(),
    tradeRouteId: null,
  };
  state.merchants.set(npcId, merchant);
  return toMerchantProfile(merchant);
}

function getMerchantsByRoleImpl(
  state: EconomyState,
  role: EconomicRole,
): readonly MerchantProfile[] {
  const results: MerchantProfile[] = [];
  for (const m of state.merchants.values()) {
    if (m.role === role) results.push(toMerchantProfile(m));
  }
  return results;
}

function addStockImpl(
  state: EconomyState,
  npcId: string,
  resource: string,
  qty: number,
): ResourceStock {
  const key = stockKey(npcId, resource);
  let stock = state.stocks.get(key);
  if (!stock) {
    stock = { npcId, resourceName: resource, quantity: 0, lastUpdatedAt: 0 };
    state.stocks.set(key, stock);
  }
  stock.quantity += qty;
  stock.lastUpdatedAt = state.deps.clock.nowMicroseconds();
  return toResourceStock(stock);
}

function removeStockImpl(
  state: EconomyState,
  npcId: string,
  resource: string,
  qty: number,
): boolean {
  const key = stockKey(npcId, resource);
  const stock = state.stocks.get(key);
  if (!stock || stock.quantity < qty) return false;
  stock.quantity -= qty;
  stock.lastUpdatedAt = state.deps.clock.nowMicroseconds();
  return true;
}

function createListingImpl(
  state: EconomyState,
  npcId: string,
  resource: string,
  qty: number,
): MarketListing {
  const priceFactors = calculatePriceImpl(state, resource, 1);
  const listing: MutableListing = {
    listingId: state.deps.idGenerator.generate(),
    npcId,
    resourceName: resource,
    quantity: qty,
    pricePerUnit: priceFactors.finalPrice,
    listedAt: state.deps.clock.nowMicroseconds(),
  };
  state.listings.set(listing.listingId, listing);
  return toListing(listing);
}

function getListingsImpl(state: EconomyState, resource: string): readonly MarketListing[] {
  const results: MarketListing[] = [];
  for (const l of state.listings.values()) {
    if (l.resourceName === resource) results.push(toListing(l));
  }
  return results;
}

function purchaseFromListingImpl(state: EconomyState, listingId: string, qty: number): TradeResult {
  const listing = state.listings.get(listingId);
  if (!listing) return { success: false, reason: 'listing not found', totalCost: 0 };
  if (listing.quantity < qty) {
    return { success: false, reason: 'insufficient quantity', totalCost: 0 };
  }
  const totalCost = listing.pricePerUnit * qty;
  listing.quantity -= qty;
  if (listing.quantity === 0) state.listings.delete(listingId);
  const resourceKey = listing.resourceName;
  const current = state.demandCounters.get(resourceKey) ?? 0;
  state.demandCounters.set(resourceKey, current + qty);
  return { success: true, reason: 'purchased', totalCost };
}

function calculatePriceImpl(state: EconomyState, resource: string, qty: number): PriceFactors {
  const totalSupply = countTotalSupply(state, resource);
  const demand = state.demandCounters.get(resource) ?? 0;
  const supplyMult = computeSupplyMultiplier(totalSupply);
  const demandMult = computeDemandMultiplier(demand);
  const finalPrice = Math.round(BASE_PRICE * supplyMult * demandMult * qty);
  return {
    basePrice: BASE_PRICE,
    supplyMultiplier: supplyMult,
    demandMultiplier: demandMult,
    finalPrice,
  };
}

function assignRouteImpl(state: EconomyState, npcId: string, routeId: string): boolean {
  const merchant = state.merchants.get(npcId);
  if (!merchant) return false;
  if (!state.routes.has(routeId)) return false;
  merchant.tradeRouteId = routeId;
  return true;
}

function startGatheringImpl(
  state: EconomyState,
  npcId: string,
  resource: string,
  target: number,
): GatheringTask {
  const task: MutableGatheringTask = {
    taskId: state.deps.idGenerator.generate(),
    npcId,
    resourceName: resource,
    targetQuantity: target,
    gatheredQuantity: 0,
    startedAt: state.deps.clock.nowMicroseconds(),
    status: 'active',
  };
  state.gatheringTasks.set(task.taskId, task);
  return toGatheringTask(task);
}

function progressGatheringImpl(
  state: EconomyState,
  taskId: string,
  amount: number,
): GatheringTask | undefined {
  const task = state.gatheringTasks.get(taskId);
  if (!task || task.status !== 'active') return undefined;
  task.gatheredQuantity += amount;
  if (task.gatheredQuantity >= task.targetQuantity) {
    task.gatheredQuantity = task.targetQuantity;
    task.status = 'completed';
  }
  return toGatheringTask(task);
}

function cancelGatheringImpl(state: EconomyState, taskId: string): boolean {
  const task = state.gatheringTasks.get(taskId);
  if (!task || task.status !== 'active') return false;
  task.status = 'cancelled';
  return true;
}

function getStatsImpl(state: EconomyState): NpcEconomyStats {
  const byRole: Record<EconomicRole, number> = { merchant: 0, farmer: 0, miner: 0, crafter: 0 };
  for (const m of state.merchants.values()) {
    byRole[m.role]++;
  }
  return {
    totalMerchants: state.merchants.size,
    totalListings: state.listings.size,
    totalRoutes: state.routes.size,
    totalGatheringTasks: state.gatheringTasks.size,
    merchantsByRole: byRole,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function initEconomyState(deps: NpcEconomyDeps): EconomyState {
  return {
    deps,
    merchants: new Map(),
    stocks: new Map(),
    listings: new Map(),
    routes: new Map(),
    gatheringTasks: new Map(),
    demandCounters: new Map(),
  };
}

function getMerchantImpl(state: EconomyState, npc: string): MerchantProfile | undefined {
  const m = state.merchants.get(npc);
  return m ? toMerchantProfile(m) : undefined;
}

function recordDemandImpl(state: EconomyState, res: string): void {
  const cur = state.demandCounters.get(res) ?? 0;
  state.demandCounters.set(res, cur + 1);
}

function registerRouteImpl(state: EconomyState, r: TradeRoute): boolean {
  if (state.routes.has(r.routeId)) return false;
  state.routes.set(r.routeId, r);
  return true;
}

function buildEconomyMerchantMethods(
  state: EconomyState,
): Pick<
  NpcEconomyEngine,
  'registerMerchant' | 'getMerchant' | 'removeMerchant' | 'getMerchantsByRole'
> {
  return {
    registerMerchant: (npc, role) => registerMerchantImpl(state, npc, role),
    getMerchant: (npc) => getMerchantImpl(state, npc),
    removeMerchant: (npc) => state.merchants.delete(npc),
    getMerchantsByRole: (role) => getMerchantsByRoleImpl(state, role),
  };
}

function buildEconomyMarketMethods(
  state: EconomyState,
): Pick<
  NpcEconomyEngine,
  | 'createListing'
  | 'getListings'
  | 'removeListing'
  | 'purchaseFromListing'
  | 'calculatePrice'
  | 'recordDemand'
> {
  return {
    createListing: (npc, res, qty) => createListingImpl(state, npc, res, qty),
    getListings: (res) => getListingsImpl(state, res),
    removeListing: (id) => state.listings.delete(id),
    purchaseFromListing: (id, qty) => purchaseFromListingImpl(state, id, qty),
    calculatePrice: (res, qty) => calculatePriceImpl(state, res, qty),
    recordDemand: (res) => {
      recordDemandImpl(state, res);
    },
  };
}

function createNpcEconomyEngine(deps: NpcEconomyDeps): NpcEconomyEngine {
  const state = initEconomyState(deps);
  return {
    ...buildEconomyMerchantMethods(state),
    ...buildEconomyMarketMethods(state),
    addStock: (npc, res, qty) => addStockImpl(state, npc, res, qty),
    getStock: (npc, res) => state.stocks.get(stockKey(npc, res))?.quantity ?? 0,
    removeStock: (npc, res, qty) => removeStockImpl(state, npc, res, qty),
    registerRoute: (r) => registerRouteImpl(state, r),
    getRoute: (id) => state.routes.get(id),
    assignRoute: (npc, rid) => assignRouteImpl(state, npc, rid),
    startGathering: (npc, res, t) => startGatheringImpl(state, npc, res, t),
    progressGathering: (id, a) => progressGatheringImpl(state, id, a),
    cancelGathering: (id) => cancelGatheringImpl(state, id),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export {
  createNpcEconomyEngine,
  BASE_PRICE,
  SUPPLY_LOW_THRESHOLD,
  SUPPLY_HIGH_THRESHOLD,
  MAX_PRICE_MULTIPLIER,
  MIN_PRICE_MULTIPLIER,
};
export type {
  NpcEconomyEngine,
  NpcEconomyDeps,
  EconomicRole,
  MerchantProfile,
  MarketListing,
  TradeRoute,
  ResourceStock,
  GatheringTask,
  GatheringStatus,
  TradeResult,
  PriceFactors,
  NpcEconomyStats,
};
