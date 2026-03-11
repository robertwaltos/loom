/**
 * Market Registry — Per-world order book with search and price aggregation.
 *
 * Bible v1.2: Each world maintains a marketplace where dynasties list
 * goods and services for KALON. The registry tracks active listings,
 * provides search/filter capabilities, computes price aggregates,
 * and monitors trade volume for market health indicators.
 *
 * The registry is a read-optimized view over trade offers. It does not
 * own escrow or trade lifecycle — that belongs to the TradeCommerceEngine.
 * The registry indexes listings for fast lookup by category, price range,
 * seller, and world.
 */

// ── Port Types ─────────────────────────────────────────────────────

export interface MarketClock {
  readonly nowMicroseconds: () => number;
}

// ── Types ──────────────────────────────────────────────────────────

export type MarketCategory =
  | 'RESOURCES'
  | 'ARTIFACTS'
  | 'TERRITORY_RIGHTS'
  | 'SERVICES'
  | 'INFORMATION';

export interface MarketListing {
  readonly listingId: string;
  readonly sellerId: string;
  readonly worldId: string;
  readonly category: MarketCategory;
  readonly itemDescription: string;
  readonly priceKalon: bigint;
  readonly listedAt: number;
  readonly expiresAt: number;
  readonly active: boolean;
}

export interface AddListingParams {
  readonly listingId: string;
  readonly sellerId: string;
  readonly worldId: string;
  readonly category: MarketCategory;
  readonly itemDescription: string;
  readonly priceKalon: bigint;
  readonly expiresAt: number;
}

export interface MarketSearchParams {
  readonly worldId?: string;
  readonly category?: MarketCategory;
  readonly sellerId?: string;
  readonly minPrice?: bigint;
  readonly maxPrice?: bigint;
}

export interface PriceAggregate {
  readonly category: MarketCategory;
  readonly worldId: string;
  readonly count: number;
  readonly averagePrice: bigint;
  readonly medianPrice: bigint;
  readonly highPrice: bigint;
  readonly lowPrice: bigint;
}

export interface VolumeRecord {
  readonly worldId: string;
  readonly category: MarketCategory;
  readonly completedAt: number;
  readonly priceKalon: bigint;
}

export interface MarketHealthIndicators {
  readonly worldId: string;
  readonly activeListings: number;
  readonly totalVolumeKalon: bigint;
  readonly tradeCount24h: number;
  readonly uniqueSellers: number;
}

export interface MarketRegistryDeps {
  readonly clock: MarketClock;
}

export interface MarketRegistryStats {
  readonly totalListings: number;
  readonly activeListings: number;
  readonly totalVolume: bigint;
  readonly totalCompletedTrades: number;
}

export interface MarketRegistry {
  readonly addListing: (params: AddListingParams) => MarketListing;
  readonly removeListing: (listingId: string) => boolean;
  readonly recordSale: (worldId: string, category: MarketCategory, priceKalon: bigint) => void;
  readonly search: (params: MarketSearchParams) => ReadonlyArray<MarketListing>;
  readonly getListing: (listingId: string) => MarketListing | undefined;
  readonly getPriceAggregate: (worldId: string, category: MarketCategory) => PriceAggregate;
  readonly getMarketHealth: (worldId: string) => MarketHealthIndicators;
  readonly cleanupExpired: () => number;
  readonly getStats: () => MarketRegistryStats;
}

// ── State ──────────────────────────────────────────────────────────

interface MutableListing {
  readonly listingId: string;
  readonly sellerId: string;
  readonly worldId: string;
  readonly category: MarketCategory;
  readonly itemDescription: string;
  readonly priceKalon: bigint;
  readonly listedAt: number;
  readonly expiresAt: number;
  active: boolean;
}

interface RegistryState {
  readonly listings: Map<string, MutableListing>;
  readonly volumeRecords: VolumeRecord[];
  readonly clock: MarketClock;
  totalCompletedTrades: number;
  totalVolume: bigint;
}

// ── Factory ────────────────────────────────────────────────────────

export function createMarketRegistry(deps: MarketRegistryDeps): MarketRegistry {
  const state: RegistryState = {
    listings: new Map(),
    volumeRecords: [],
    clock: deps.clock,
    totalCompletedTrades: 0,
    totalVolume: 0n,
  };

  return {
    addListing: (p) => addListingImpl(state, p),
    removeListing: (lid) => removeListingImpl(state, lid),
    recordSale: (wid, cat, price) => {
      recordSaleImpl(state, wid, cat, price);
    },
    search: (p) => searchImpl(state, p),
    getListing: (lid) => getListingImpl(state, lid),
    getPriceAggregate: (wid, cat) => getPriceAggregateImpl(state, wid, cat),
    getMarketHealth: (wid) => getMarketHealthImpl(state, wid),
    cleanupExpired: () => cleanupExpiredImpl(state),
    getStats: () => computeStats(state),
  };
}

// ── Add Listing ────────────────────────────────────────────────────

function addListingImpl(state: RegistryState, params: AddListingParams): MarketListing {
  if (state.listings.has(params.listingId)) {
    throw new Error('Listing ' + params.listingId + ' already exists');
  }
  if (params.priceKalon <= 0n) {
    throw new Error('Listing price must be positive');
  }
  const listing: MutableListing = {
    listingId: params.listingId,
    sellerId: params.sellerId,
    worldId: params.worldId,
    category: params.category,
    itemDescription: params.itemDescription,
    priceKalon: params.priceKalon,
    listedAt: state.clock.nowMicroseconds(),
    expiresAt: params.expiresAt,
    active: true,
  };
  state.listings.set(params.listingId, listing);
  return toReadonly(listing);
}

// ── Remove Listing ─────────────────────────────────────────────────

function removeListingImpl(state: RegistryState, listingId: string): boolean {
  const listing = state.listings.get(listingId);
  if (listing === undefined) return false;
  listing.active = false;
  return true;
}

// ── Record Sale ────────────────────────────────────────────────────

function recordSaleImpl(
  state: RegistryState,
  worldId: string,
  category: MarketCategory,
  priceKalon: bigint,
): void {
  state.volumeRecords.push({
    worldId,
    category,
    completedAt: state.clock.nowMicroseconds(),
    priceKalon,
  });
  state.totalCompletedTrades++;
  state.totalVolume += priceKalon;
}

// ── Search ─────────────────────────────────────────────────────────

function searchImpl(state: RegistryState, params: MarketSearchParams): MarketListing[] {
  const now = state.clock.nowMicroseconds();
  const results: MarketListing[] = [];
  for (const listing of state.listings.values()) {
    if (!listing.active) continue;
    if (now >= listing.expiresAt) continue;
    if (!matchesSearch(listing, params)) continue;
    results.push(toReadonly(listing));
  }
  return results;
}

function matchesSearch(listing: MutableListing, params: MarketSearchParams): boolean {
  if (params.worldId !== undefined && listing.worldId !== params.worldId) return false;
  if (params.category !== undefined && listing.category !== params.category) return false;
  if (params.sellerId !== undefined && listing.sellerId !== params.sellerId) return false;
  if (params.minPrice !== undefined && listing.priceKalon < params.minPrice) return false;
  if (params.maxPrice !== undefined && listing.priceKalon > params.maxPrice) return false;
  return true;
}

// ── Get Listing ────────────────────────────────────────────────────

function getListingImpl(state: RegistryState, listingId: string): MarketListing | undefined {
  const listing = state.listings.get(listingId);
  if (listing === undefined) return undefined;
  return toReadonly(listing);
}

// ── Price Aggregation ──────────────────────────────────────────────

function getPriceAggregateImpl(
  state: RegistryState,
  worldId: string,
  category: MarketCategory,
): PriceAggregate {
  const prices = collectActivePrices(state, worldId, category);
  if (prices.length === 0) {
    return emptyAggregate(category, worldId);
  }
  const sorted = [...prices].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return {
    category,
    worldId,
    count: sorted.length,
    averagePrice: computeAverage(sorted),
    medianPrice: computeMedian(sorted),
    highPrice: sorted[sorted.length - 1] as bigint,
    lowPrice: sorted[0] as bigint,
  };
}

function collectActivePrices(
  state: RegistryState,
  worldId: string,
  category: MarketCategory,
): bigint[] {
  const now = state.clock.nowMicroseconds();
  const prices: bigint[] = [];
  for (const listing of state.listings.values()) {
    if (!listing.active) continue;
    if (now >= listing.expiresAt) continue;
    if (listing.worldId !== worldId) continue;
    if (listing.category !== category) continue;
    prices.push(listing.priceKalon);
  }
  return prices;
}

function computeAverage(sorted: bigint[]): bigint {
  let sum = 0n;
  for (const p of sorted) {
    sum += p;
  }
  return sum / BigInt(sorted.length);
}

function computeMedian(sorted: bigint[]): bigint {
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] as bigint) + (sorted[mid] as bigint)) / 2n;
  }
  return sorted[mid] as bigint;
}

function emptyAggregate(category: MarketCategory, worldId: string): PriceAggregate {
  return {
    category,
    worldId,
    count: 0,
    averagePrice: 0n,
    medianPrice: 0n,
    highPrice: 0n,
    lowPrice: 0n,
  };
}

// ── Market Health ──────────────────────────────────────────────────

function getMarketHealthImpl(state: RegistryState, worldId: string): MarketHealthIndicators {
  const now = state.clock.nowMicroseconds();
  const oneDayAgo = now - 86_400_000_000;
  let activeCount = 0;
  const sellers = new Set<string>();
  for (const listing of state.listings.values()) {
    if (!listing.active) continue;
    if (now >= listing.expiresAt) continue;
    if (listing.worldId !== worldId) continue;
    activeCount++;
    sellers.add(listing.sellerId);
  }
  let totalVolume = 0n;
  let tradeCount24h = 0;
  for (const record of state.volumeRecords) {
    if (record.worldId !== worldId) continue;
    if (record.completedAt >= oneDayAgo) {
      totalVolume += record.priceKalon;
      tradeCount24h++;
    }
  }
  return {
    worldId,
    activeListings: activeCount,
    totalVolumeKalon: totalVolume,
    tradeCount24h,
    uniqueSellers: sellers.size,
  };
}

// ── Cleanup ────────────────────────────────────────────────────────

function cleanupExpiredImpl(state: RegistryState): number {
  const now = state.clock.nowMicroseconds();
  const toRemove: string[] = [];
  for (const listing of state.listings.values()) {
    if (!listing.active) {
      toRemove.push(listing.listingId);
      continue;
    }
    if (now >= listing.expiresAt) {
      toRemove.push(listing.listingId);
    }
  }
  for (const lid of toRemove) {
    state.listings.delete(lid);
  }
  return toRemove.length;
}

// ── Stats ──────────────────────────────────────────────────────────

function computeStats(state: RegistryState): MarketRegistryStats {
  const now = state.clock.nowMicroseconds();
  let activeCount = 0;
  for (const listing of state.listings.values()) {
    if (listing.active && now < listing.expiresAt) activeCount++;
  }
  return {
    totalListings: state.listings.size,
    activeListings: activeCount,
    totalVolume: state.totalVolume,
    totalCompletedTrades: state.totalCompletedTrades,
  };
}

// ── Helpers ────────────────────────────────────────────────────────

function toReadonly(listing: MutableListing): MarketListing {
  return {
    listingId: listing.listingId,
    sellerId: listing.sellerId,
    worldId: listing.worldId,
    category: listing.category,
    itemDescription: listing.itemDescription,
    priceKalon: listing.priceKalon,
    listedAt: listing.listedAt,
    expiresAt: listing.expiresAt,
    active: listing.active,
  };
}
