/**
 * black-market.ts
 * Underground economy, contraband trading, enforcement evasion
 */

// ============================================================================
// Ports (defined locally per hexagonal architecture)
// ============================================================================

interface BlackMarketClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface BlackMarketIdPort {
  readonly generate: () => string;
}

interface BlackMarketLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ============================================================================
// Types
// ============================================================================

type EnforcementLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRACKDOWN';

interface BlackMarketListing {
  readonly listingId: string;
  readonly sellerId: string;
  readonly worldId: string;
  readonly itemType: string;
  readonly quantity: number;
  readonly basePriceMicroKalon: bigint;
  readonly premiumPercent: number;
  readonly finalPriceMicroKalon: bigint;
  readonly listedAtMicros: bigint;
  readonly expiresAtMicros: bigint;
  readonly active: boolean;
}

interface UndergroundTransaction {
  readonly transactionId: string;
  readonly listingId: string;
  readonly sellerId: string;
  readonly buyerId: string;
  readonly worldId: string;
  readonly itemType: string;
  readonly quantity: number;
  readonly pricePaidMicroKalon: bigint;
  readonly timestampMicros: bigint;
  readonly detected: boolean;
}

interface MarketHeat {
  readonly worldId: string;
  readonly heatLevel: number;
  readonly enforcementLevel: EnforcementLevel;
  readonly lastEnforcementMicros: bigint;
  readonly transactionsToday: number;
}

interface MarketStats {
  readonly worldId: string;
  readonly activeListings: number;
  readonly totalTransactions: number;
  readonly volumeMicroKalon: bigint;
  readonly averagePremium: number;
  readonly detectionRate: number;
}

// ============================================================================
// State
// ============================================================================

interface BlackMarketState {
  readonly listings: Map<string, BlackMarketListing>;
  readonly transactions: Map<string, UndergroundTransaction>;
  readonly heat: Map<string, MarketHeat>;
}

// ============================================================================
// Dependencies
// ============================================================================

interface BlackMarketDeps {
  readonly clock: BlackMarketClockPort;
  readonly idGen: BlackMarketIdPort;
  readonly logger: BlackMarketLoggerPort;
}

// ============================================================================
// Constants
// ============================================================================

const MIN_PREMIUM_PERCENT = 20;
const MAX_PREMIUM_PERCENT = 200;
const DEFAULT_LISTING_DURATION_MICROS = 86_400_000_000n;
const HEAT_DECAY_PER_TICK = 1;
const HEAT_INCREASE_PER_TRANSACTION = 5;
const DETECTION_BASE_LOW = 0.05;
const DETECTION_BASE_MODERATE = 0.15;
const DETECTION_BASE_HIGH = 0.3;
const DETECTION_BASE_CRACKDOWN = 0.6;

// ============================================================================
// Core Functions
// ============================================================================

function calculatePremium(basePrice: bigint, premiumPercent: number): bigint {
  const premium = (basePrice * BigInt(premiumPercent)) / 100n;
  return basePrice + premium;
}

function addListing(
  state: BlackMarketState,
  deps: BlackMarketDeps,
  params: {
    sellerId: string;
    worldId: string;
    itemType: string;
    quantity: number;
    basePriceMicroKalon: bigint;
    premiumPercent: number;
  },
): string | { listingId: string; listing: BlackMarketListing } {
  if (params.premiumPercent < MIN_PREMIUM_PERCENT) {
    return 'PREMIUM_TOO_LOW';
  }

  if (params.premiumPercent > MAX_PREMIUM_PERCENT) {
    return 'PREMIUM_TOO_HIGH';
  }

  const listingId = deps.idGen.generate();
  const nowMicros = deps.clock.nowMicroseconds();
  const expiresAtMicros = nowMicros + DEFAULT_LISTING_DURATION_MICROS;
  const finalPrice = calculatePremium(params.basePriceMicroKalon, params.premiumPercent);

  const listing: BlackMarketListing = {
    listingId,
    sellerId: params.sellerId,
    worldId: params.worldId,
    itemType: params.itemType,
    quantity: params.quantity,
    basePriceMicroKalon: params.basePriceMicroKalon,
    premiumPercent: params.premiumPercent,
    finalPriceMicroKalon: finalPrice,
    listedAtMicros: nowMicros,
    expiresAtMicros,
    active: true,
  };

  state.listings.set(listingId, listing);

  deps.logger.info('Black market listing added', {
    listingId,
    sellerId: params.sellerId,
    worldId: params.worldId,
    itemType: params.itemType,
  });

  return { listingId, listing };
}

function getDetectionChance(level: EnforcementLevel, heat: number): number {
  let base = DETECTION_BASE_LOW;
  if (level === 'MODERATE') base = DETECTION_BASE_MODERATE;
  if (level === 'HIGH') base = DETECTION_BASE_HIGH;
  if (level === 'CRACKDOWN') base = DETECTION_BASE_CRACKDOWN;

  const heatMultiplier = 1.0 + heat / 100.0;
  return Math.min(base * heatMultiplier, 0.95);
}

function purchaseListing(
  state: BlackMarketState,
  deps: BlackMarketDeps,
  params: { listingId: string; buyerId: string },
): string | { transactionId: string; detected: boolean } {
  const listing = state.listings.get(params.listingId);

  if (listing === undefined) {
    return 'LISTING_NOT_FOUND';
  }

  if (!listing.active) {
    return 'LISTING_INACTIVE';
  }

  const nowMicros = deps.clock.nowMicroseconds();

  if (nowMicros > listing.expiresAtMicros) {
    return 'LISTING_EXPIRED';
  }

  const heatData = state.heat.get(listing.worldId);
  const heatLevel = heatData === undefined ? 0 : heatData.heatLevel;
  const enforcementLevel = heatData === undefined ? 'LOW' : heatData.enforcementLevel;

  const detectionChance = getDetectionChance(enforcementLevel, heatLevel);
  const roll = Math.random();
  const detected = roll < detectionChance;

  const transactionId = deps.idGen.generate();

  const transaction: UndergroundTransaction = {
    transactionId,
    listingId: params.listingId,
    sellerId: listing.sellerId,
    buyerId: params.buyerId,
    worldId: listing.worldId,
    itemType: listing.itemType,
    quantity: listing.quantity,
    pricePaidMicroKalon: listing.finalPriceMicroKalon,
    timestampMicros: nowMicros,
    detected,
  };

  state.transactions.set(transactionId, transaction);

  const updatedListing: BlackMarketListing = {
    ...listing,
    active: false,
  };
  state.listings.set(params.listingId, updatedListing);

  const newHeatLevel = heatLevel + HEAT_INCREASE_PER_TRANSACTION;
  const newTransCount = heatData === undefined ? 1 : heatData.transactionsToday + 1;

  const updatedHeat: MarketHeat = {
    worldId: listing.worldId,
    heatLevel: newHeatLevel,
    enforcementLevel,
    lastEnforcementMicros: heatData === undefined ? nowMicros : heatData.lastEnforcementMicros,
    transactionsToday: newTransCount,
  };
  state.heat.set(listing.worldId, updatedHeat);

  if (detected) {
    deps.logger.warn('Black market transaction detected', {
      transactionId,
      buyerId: params.buyerId,
      sellerId: listing.sellerId,
    });
  } else {
    deps.logger.info('Black market transaction completed', {
      transactionId,
      worldId: listing.worldId,
    });
  }

  return { transactionId, detected };
}

function raiseEnforcement(
  state: BlackMarketState,
  deps: BlackMarketDeps,
  params: { worldId: string; level: EnforcementLevel },
): { updated: true } {
  const nowMicros = deps.clock.nowMicroseconds();
  const existing = state.heat.get(params.worldId);

  if (existing === undefined) {
    const newHeat: MarketHeat = {
      worldId: params.worldId,
      heatLevel: 0,
      enforcementLevel: params.level,
      lastEnforcementMicros: nowMicros,
      transactionsToday: 0,
    };
    state.heat.set(params.worldId, newHeat);
  } else {
    const updated: MarketHeat = {
      ...existing,
      enforcementLevel: params.level,
      lastEnforcementMicros: nowMicros,
    };
    state.heat.set(params.worldId, updated);
  }

  deps.logger.info('Enforcement level raised', {
    worldId: params.worldId,
    level: params.level,
  });

  return { updated: true };
}

function getActiveListings(
  state: BlackMarketState,
  deps: BlackMarketDeps,
  params: { worldId: string },
): BlackMarketListing[] {
  const results: BlackMarketListing[] = [];
  const nowMicros = deps.clock.nowMicroseconds();

  for (const listing of state.listings.values()) {
    if (listing.worldId !== params.worldId) continue;
    if (!listing.active) continue;
    if (nowMicros > listing.expiresAtMicros) continue;
    results.push(listing);
  }

  return results;
}

function getMarketStats(
  state: BlackMarketState,
  deps: BlackMarketDeps,
  params: { worldId: string },
): MarketStats {
  let activeCount = 0;
  let totalTransactions = 0;
  let totalVolume = 0n;
  let totalPremium = 0;
  let premiumCount = 0;
  let detectedCount = 0;

  const nowMicros = deps.clock.nowMicroseconds();

  for (const listing of state.listings.values()) {
    if (listing.worldId !== params.worldId) continue;
    if (listing.active && nowMicros <= listing.expiresAtMicros) {
      activeCount = activeCount + 1;
    }
    if (!listing.active) {
      totalPremium = totalPremium + listing.premiumPercent;
      premiumCount = premiumCount + 1;
    }
  }

  for (const transaction of state.transactions.values()) {
    if (transaction.worldId !== params.worldId) continue;
    totalTransactions = totalTransactions + 1;
    totalVolume = totalVolume + transaction.pricePaidMicroKalon;
    if (transaction.detected) {
      detectedCount = detectedCount + 1;
    }
  }

  const averagePremium = premiumCount === 0 ? 0 : totalPremium / premiumCount;
  const detectionRate = totalTransactions === 0 ? 0 : detectedCount / totalTransactions;

  const stats: MarketStats = {
    worldId: params.worldId,
    activeListings: activeCount,
    totalTransactions,
    volumeMicroKalon: totalVolume,
    averagePremium,
    detectionRate,
  };

  return stats;
}

function expireOldListings(
  state: BlackMarketState,
  deps: BlackMarketDeps,
  params: { worldId: string },
): { expiredCount: number } {
  const nowMicros = deps.clock.nowMicroseconds();
  let expiredCount = 0;

  for (const listing of state.listings.values()) {
    if (listing.worldId !== params.worldId) continue;
    if (!listing.active) continue;
    if (nowMicros <= listing.expiresAtMicros) continue;

    const updated: BlackMarketListing = {
      ...listing,
      active: false,
    };
    state.listings.set(listing.listingId, updated);
    expiredCount = expiredCount + 1;
  }

  if (expiredCount > 0) {
    deps.logger.info('Expired old listings', {
      worldId: params.worldId,
      count: expiredCount,
    });
  }

  return { expiredCount };
}

function decayHeat(
  state: BlackMarketState,
  deps: BlackMarketDeps,
  params: { worldId: string },
): { newHeat: number } {
  const existing = state.heat.get(params.worldId);

  if (existing === undefined) {
    return { newHeat: 0 };
  }

  const newHeat = existing.heatLevel - HEAT_DECAY_PER_TICK;
  const clamped = newHeat < 0 ? 0 : newHeat;

  const updated: MarketHeat = {
    ...existing,
    heatLevel: clamped,
  };
  state.heat.set(params.worldId, updated);

  return { newHeat: clamped };
}

function getHeatStatus(
  state: BlackMarketState,
  deps: BlackMarketDeps,
  params: { worldId: string },
): MarketHeat | null {
  const heat = state.heat.get(params.worldId);
  return heat === undefined ? null : heat;
}

// ============================================================================
// Module Factory
// ============================================================================

export interface BlackMarketModule {
  readonly addListing: (params: {
    sellerId: string;
    worldId: string;
    itemType: string;
    quantity: number;
    basePriceMicroKalon: bigint;
    premiumPercent: number;
  }) => string | { listingId: string; listing: BlackMarketListing };
  readonly purchaseListing: (params: {
    listingId: string;
    buyerId: string;
  }) => string | { transactionId: string; detected: boolean };
  readonly raiseEnforcement: (params: { worldId: string; level: EnforcementLevel }) => {
    updated: true;
  };
  readonly getActiveListings: (params: { worldId: string }) => BlackMarketListing[];
  readonly getMarketStats: (params: { worldId: string }) => MarketStats;
  readonly expireOldListings: (params: { worldId: string }) => { expiredCount: number };
  readonly decayHeat: (params: { worldId: string }) => { newHeat: number };
  readonly getHeatStatus: (params: { worldId: string }) => MarketHeat | null;
}

export function createBlackMarket(deps: BlackMarketDeps): BlackMarketModule {
  const state: BlackMarketState = {
    listings: new Map(),
    transactions: new Map(),
    heat: new Map(),
  };

  return {
    addListing: (params) => addListing(state, deps, params),
    purchaseListing: (params) => purchaseListing(state, deps, params),
    raiseEnforcement: (params) => raiseEnforcement(state, deps, params),
    getActiveListings: (params) => getActiveListings(state, deps, params),
    getMarketStats: (params) => getMarketStats(state, deps, params),
    expireOldListings: (params) => expireOldListings(state, deps, params),
    decayHeat: (params) => decayHeat(state, deps, params),
    getHeatStatus: (params) => getHeatStatus(state, deps, params),
  };
}

export type {
  BlackMarketListing,
  UndergroundTransaction,
  EnforcementLevel,
  MarketHeat,
  MarketStats,
  BlackMarketDeps,
};
