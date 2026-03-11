/**
 * Auction Engine — 4-phase estate dispersal for completed dynasties.
 *
 * Bible v1.1 Part 8, v1.4: Legacy Protocols & Inheritance
 *
 * When a dynasty reaches DECEASED state, its assets are auctioned
 * through four time-gated phases:
 *
 *   Phase 1 — HEIRS:       Registered heirs only
 *   Phase 2 — ALLIES:      Alliance members and diplomatic relations
 *   Phase 3 — ASSEMBLY:    All players in the Assembly
 *   Phase 4 — LIQUIDATION: Unsold assets converted to Commons Fund
 *
 * Each phase has a configurable duration. Bids must exceed the previous
 * highest by a minimum increment percentage. The auction resolves when
 * all phases complete or when explicitly cancelled.
 */

// ─── Types ───────────────────────────────────────────────────────────

export type AuctionPhase =
  | 'HEIRS'
  | 'ALLIES'
  | 'ASSEMBLY'
  | 'LIQUIDATION'
  | 'COMPLETED'
  | 'CANCELLED';

export interface AuctionItem {
  readonly itemId: string;
  readonly auctionId: string;
  readonly name: string;
  readonly description: string;
  readonly minimumBidKalon: bigint;
  readonly highestBidKalon: bigint | null;
  readonly highestBidderId: string | null;
  readonly addedAt: number;
}

export interface AuctionBid {
  readonly bidId: string;
  readonly auctionId: string;
  readonly itemId: string;
  readonly bidderId: string;
  readonly bidderRelation: BidderRelation;
  readonly amountKalon: bigint;
  readonly placedAt: number;
  readonly phase: AuctionPhase;
}

export type BidderRelation = 'heir' | 'ally' | 'assembly' | 'public';

export interface AuctionRecord {
  readonly auctionId: string;
  readonly dynastyId: string;
  readonly reason: string;
  readonly phase: AuctionPhase;
  readonly phaseStartedAt: number;
  readonly createdAt: number;
  readonly completedAt: number | null;
  readonly cancelledAt: number | null;
  readonly cancelReason: string | null;
  readonly itemCount: number;
  readonly bidCount: number;
}

export interface AuctionResult {
  readonly auctionId: string;
  readonly dynastyId: string;
  readonly settledItems: readonly SettledItem[];
  readonly unsoldItemIds: readonly string[];
  readonly totalProceeds: bigint;
  readonly resolvedAt: number;
}

export interface SettledItem {
  readonly itemId: string;
  readonly winnerId: string;
  readonly amountKalon: bigint;
}

export interface CreateAuctionParams {
  readonly dynastyId: string;
  readonly items: readonly AddItemParams[];
  readonly reason: string;
}

export interface AddItemParams {
  readonly name: string;
  readonly description: string;
  readonly minimumBidKalon: bigint;
}

export interface PlaceBidParams {
  readonly auctionId: string;
  readonly itemId: string;
  readonly bidderId: string;
  readonly bidderRelation: BidderRelation;
  readonly amountKalon: bigint;
}

export interface AuctionStats {
  readonly totalAuctions: number;
  readonly activeAuctions: number;
  readonly completedAuctions: number;
  readonly cancelledAuctions: number;
  readonly totalBids: number;
  readonly totalItemsSettled: number;
}

// ─── Port Interfaces ─────────────────────────────────────────────────

export interface AuctionClockPort {
  readonly nowMicroseconds: () => number;
}

export interface AuctionIdGeneratorPort {
  readonly next: () => string;
}

export interface AuctionKalonPort {
  readonly verifyBalance: (dynastyId: string, amount: bigint) => boolean;
}

export interface AuctionNotificationPort {
  readonly onPhaseAdvanced: (auctionId: string, from: AuctionPhase, to: AuctionPhase) => void;
  readonly onAuctionResolved: (auctionId: string, result: AuctionResult) => void;
  readonly onAuctionCancelled: (auctionId: string, reason: string) => void;
  readonly onBidPlaced: (bid: AuctionBid) => void;
}

export interface AuctionDeps {
  readonly clock: AuctionClockPort;
  readonly idGenerator: AuctionIdGeneratorPort;
  readonly kalonPort: AuctionKalonPort;
  readonly notificationPort: AuctionNotificationPort;
}

// ─── Constants ───────────────────────────────────────────────────────

const US_PER_HOUR = 60 * 60 * 1_000_000;

/** Duration of each auction phase in microseconds */
export const PHASE_DURATIONS: Readonly<Record<string, number>> = {
  HEIRS: 48 * US_PER_HOUR,
  ALLIES: 48 * US_PER_HOUR,
  ASSEMBLY: 72 * US_PER_HOUR,
  LIQUIDATION: 24 * US_PER_HOUR,
};

/** Minimum bid increment as a percentage (5%) */
export const MIN_BID_INCREMENT_PERCENT = 5;

/** Default auction configuration */
export const DEFAULT_AUCTION_CONFIG = {
  maxItemsPerAuction: 500,
  maxBidsPerItem: 1000,
} as const;

// ─── Phase Order ─────────────────────────────────────────────────────

const ACTIVE_PHASES: readonly AuctionPhase[] = ['HEIRS', 'ALLIES', 'ASSEMBLY', 'LIQUIDATION'];

const PHASE_ELIGIBLE_RELATIONS: Readonly<Record<string, ReadonlySet<BidderRelation>>> = {
  HEIRS: new Set(['heir']),
  ALLIES: new Set(['heir', 'ally']),
  ASSEMBLY: new Set(['heir', 'ally', 'assembly']),
  LIQUIDATION: new Set(['heir', 'ally', 'assembly', 'public']),
};

// ─── Public Interface ────────────────────────────────────────────────

export interface AuctionEngine {
  readonly createAuction: (params: CreateAuctionParams) => AuctionRecord;
  readonly addItem: (auctionId: string, item: AddItemParams) => AuctionItem | string;
  readonly placeBid: (params: PlaceBidParams) => AuctionBid | string;
  readonly advancePhase: (auctionId: string) => AuctionRecord | string;
  readonly resolveAuction: (auctionId: string) => AuctionResult | string;
  readonly cancelAuction: (auctionId: string, reason: string) => AuctionRecord | string;
  readonly getAuction: (auctionId: string) => AuctionRecord | undefined;
  readonly getBids: (auctionId: string) => readonly AuctionBid[];
  readonly getStats: () => AuctionStats;
}

// ─── Internal State ──────────────────────────────────────────────────

interface MutableItem {
  readonly itemId: string;
  readonly auctionId: string;
  readonly name: string;
  readonly description: string;
  readonly minimumBidKalon: bigint;
  highestBidKalon: bigint | null;
  highestBidderId: string | null;
  readonly addedAt: number;
}

interface MutableAuction {
  readonly auctionId: string;
  readonly dynastyId: string;
  readonly reason: string;
  phase: AuctionPhase;
  phaseStartedAt: number;
  readonly createdAt: number;
  completedAt: number | null;
  cancelledAt: number | null;
  cancelReason: string | null;
  readonly items: MutableItem[];
  readonly bids: AuctionBid[];
}

interface EngineState {
  readonly deps: AuctionDeps;
  readonly auctions: Map<string, MutableAuction>;
  totalItemsSettled: number;
}

// ─── Factory ─────────────────────────────────────────────────────────

export function createAuctionEngine(deps: AuctionDeps): AuctionEngine {
  const state: EngineState = {
    deps,
    auctions: new Map(),
    totalItemsSettled: 0,
  };

  return {
    createAuction: (params) => createAuctionImpl(state, params),
    addItem: (auctionId, item) => addItemImpl(state, auctionId, item),
    placeBid: (params) => placeBidImpl(state, params),
    advancePhase: (auctionId) => advancePhaseImpl(state, auctionId),
    resolveAuction: (auctionId) => resolveAuctionImpl(state, auctionId),
    cancelAuction: (auctionId, reason) => cancelAuctionImpl(state, auctionId, reason),
    getAuction: (auctionId) => getAuctionImpl(state, auctionId),
    getBids: (auctionId) => getBidsImpl(state, auctionId),
    getStats: () => getStatsImpl(state),
  };
}

// ─── Auction Creation ────────────────────────────────────────────────

function createAuctionImpl(state: EngineState, params: CreateAuctionParams): AuctionRecord {
  const now = state.deps.clock.nowMicroseconds();
  const auctionId = state.deps.idGenerator.next();

  const auction: MutableAuction = {
    auctionId,
    dynastyId: params.dynastyId,
    reason: params.reason,
    phase: 'HEIRS',
    phaseStartedAt: now,
    createdAt: now,
    completedAt: null,
    cancelledAt: null,
    cancelReason: null,
    items: [],
    bids: [],
  };

  state.auctions.set(auctionId, auction);
  addInitialItems(state, auction, params.items);
  return toAuctionRecord(auction);
}

function addInitialItems(
  state: EngineState,
  auction: MutableAuction,
  items: readonly AddItemParams[],
): void {
  const now = state.deps.clock.nowMicroseconds();
  for (const itemParams of items) {
    const item = buildItem(state, auction.auctionId, itemParams, now);
    auction.items.push(item);
  }
}

// ─── Item Management ─────────────────────────────────────────────────

function addItemImpl(
  state: EngineState,
  auctionId: string,
  itemParams: AddItemParams,
): AuctionItem | string {
  const auction = state.auctions.get(auctionId);
  if (auction === undefined) return 'AUCTION_NOT_FOUND';
  if (!isActivePhase(auction.phase)) return 'AUCTION_NOT_ACTIVE';
  if (auction.items.length >= DEFAULT_AUCTION_CONFIG.maxItemsPerAuction) return 'MAX_ITEMS_REACHED';

  const now = state.deps.clock.nowMicroseconds();
  const item = buildItem(state, auctionId, itemParams, now);
  auction.items.push(item);
  return toReadonlyItem(item);
}

function buildItem(
  state: EngineState,
  auctionId: string,
  params: AddItemParams,
  now: number,
): MutableItem {
  return {
    itemId: state.deps.idGenerator.next(),
    auctionId,
    name: params.name,
    description: params.description,
    minimumBidKalon: params.minimumBidKalon,
    highestBidKalon: null,
    highestBidderId: null,
    addedAt: now,
  };
}

// ─── Bidding ─────────────────────────────────────────────────────────

function placeBidImpl(state: EngineState, params: PlaceBidParams): AuctionBid | string {
  const auction = state.auctions.get(params.auctionId);
  if (auction === undefined) return 'AUCTION_NOT_FOUND';
  if (!isActivePhase(auction.phase)) return 'AUCTION_NOT_ACTIVE';

  const eligibilityError = checkEligibility(auction, params.bidderRelation);
  if (eligibilityError !== null) return eligibilityError;

  const item = findItem(auction, params.itemId);
  if (item === undefined) return 'ITEM_NOT_FOUND';

  const bidError = validateBidAmount(item, params.amountKalon);
  if (bidError !== null) return bidError;

  const hasBalance = state.deps.kalonPort.verifyBalance(params.bidderId, params.amountKalon);
  if (!hasBalance) return 'INSUFFICIENT_BALANCE';

  return recordBid(state, auction, item, params);
}

function checkEligibility(auction: MutableAuction, relation: BidderRelation): string | null {
  const eligible = PHASE_ELIGIBLE_RELATIONS[auction.phase];
  if (eligible === undefined) return 'AUCTION_NOT_ACTIVE';
  if (!eligible.has(relation)) return 'NOT_ELIGIBLE_FOR_PHASE';
  return null;
}

function validateBidAmount(item: MutableItem, amount: bigint): string | null {
  if (amount <= 0n) return 'INVALID_BID_AMOUNT';

  if (item.highestBidKalon === null) {
    if (amount < item.minimumBidKalon) return 'BID_BELOW_MINIMUM';
    return null;
  }

  const minIncrement = (item.highestBidKalon * BigInt(MIN_BID_INCREMENT_PERCENT)) / 100n;
  const requiredMinimum = item.highestBidKalon + minIncrement;
  if (amount < requiredMinimum) return 'BID_INCREMENT_TOO_LOW';
  return null;
}

function recordBid(
  state: EngineState,
  auction: MutableAuction,
  item: MutableItem,
  params: PlaceBidParams,
): AuctionBid {
  const now = state.deps.clock.nowMicroseconds();
  const bid: AuctionBid = {
    bidId: state.deps.idGenerator.next(),
    auctionId: auction.auctionId,
    itemId: params.itemId,
    bidderId: params.bidderId,
    bidderRelation: params.bidderRelation,
    amountKalon: params.amountKalon,
    placedAt: now,
    phase: auction.phase,
  };

  item.highestBidKalon = params.amountKalon;
  item.highestBidderId = params.bidderId;
  auction.bids.push(bid);
  state.deps.notificationPort.onBidPlaced(bid);
  return bid;
}

// ─── Phase Advancement ──────────────────────────────────────────────

function advancePhaseImpl(state: EngineState, auctionId: string): AuctionRecord | string {
  const auction = state.auctions.get(auctionId);
  if (auction === undefined) return 'AUCTION_NOT_FOUND';
  if (!isActivePhase(auction.phase)) return 'AUCTION_NOT_ACTIVE';

  const currentIndex = ACTIVE_PHASES.indexOf(auction.phase);
  if (currentIndex === -1) return 'AUCTION_NOT_ACTIVE';

  const nextIndex = currentIndex + 1;
  const now = state.deps.clock.nowMicroseconds();
  const fromPhase = auction.phase;

  if (nextIndex >= ACTIVE_PHASES.length) {
    auction.phase = 'COMPLETED';
    auction.completedAt = now;
    state.deps.notificationPort.onPhaseAdvanced(auctionId, fromPhase, 'COMPLETED');
    return toAuctionRecord(auction);
  }

  const nextPhase = ACTIVE_PHASES[nextIndex];
  if (nextPhase === undefined) return 'AUCTION_NOT_ACTIVE';

  auction.phase = nextPhase;
  auction.phaseStartedAt = now;
  state.deps.notificationPort.onPhaseAdvanced(auctionId, fromPhase, nextPhase);
  return toAuctionRecord(auction);
}

// ─── Auction Resolution ─────────────────────────────────────────────

function resolveAuctionImpl(state: EngineState, auctionId: string): AuctionResult | string {
  const auction = state.auctions.get(auctionId);
  if (auction === undefined) return 'AUCTION_NOT_FOUND';
  if (auction.phase !== 'COMPLETED') return 'AUCTION_NOT_COMPLETED';

  const now = state.deps.clock.nowMicroseconds();
  const settled = settleItems(auction);
  const unsoldIds = findUnsoldItemIds(auction);

  state.totalItemsSettled += settled.length;

  const result: AuctionResult = {
    auctionId: auction.auctionId,
    dynastyId: auction.dynastyId,
    settledItems: settled,
    unsoldItemIds: unsoldIds,
    totalProceeds: sumProceeds(settled),
    resolvedAt: now,
  };

  state.deps.notificationPort.onAuctionResolved(auctionId, result);
  return result;
}

function settleItems(auction: MutableAuction): readonly SettledItem[] {
  const settled: SettledItem[] = [];
  for (const item of auction.items) {
    if (item.highestBidderId !== null && item.highestBidKalon !== null) {
      settled.push({
        itemId: item.itemId,
        winnerId: item.highestBidderId,
        amountKalon: item.highestBidKalon,
      });
    }
  }
  return settled;
}

function findUnsoldItemIds(auction: MutableAuction): readonly string[] {
  const unsold: string[] = [];
  for (const item of auction.items) {
    if (item.highestBidderId === null) {
      unsold.push(item.itemId);
    }
  }
  return unsold;
}

function sumProceeds(settled: readonly SettledItem[]): bigint {
  let total = 0n;
  for (const item of settled) {
    total += item.amountKalon;
  }
  return total;
}

// ─── Cancellation ────────────────────────────────────────────────────

function cancelAuctionImpl(
  state: EngineState,
  auctionId: string,
  reason: string,
): AuctionRecord | string {
  const auction = state.auctions.get(auctionId);
  if (auction === undefined) return 'AUCTION_NOT_FOUND';
  if (auction.phase === 'COMPLETED' || auction.phase === 'CANCELLED') {
    return 'AUCTION_ALREADY_TERMINAL';
  }

  const now = state.deps.clock.nowMicroseconds();
  auction.phase = 'CANCELLED';
  auction.cancelledAt = now;
  auction.cancelReason = reason;
  state.deps.notificationPort.onAuctionCancelled(auctionId, reason);
  return toAuctionRecord(auction);
}

// ─── Queries ─────────────────────────────────────────────────────────

function getAuctionImpl(state: EngineState, auctionId: string): AuctionRecord | undefined {
  const auction = state.auctions.get(auctionId);
  if (auction === undefined) return undefined;
  return toAuctionRecord(auction);
}

function getBidsImpl(state: EngineState, auctionId: string): readonly AuctionBid[] {
  const auction = state.auctions.get(auctionId);
  if (auction === undefined) return [];
  return [...auction.bids];
}

function getStatsImpl(state: EngineState): AuctionStats {
  let activeAuctions = 0;
  let completedAuctions = 0;
  let cancelledAuctions = 0;
  let totalBids = 0;

  for (const auction of state.auctions.values()) {
    totalBids += auction.bids.length;
    if (auction.phase === 'COMPLETED') {
      completedAuctions += 1;
    } else if (auction.phase === 'CANCELLED') {
      cancelledAuctions += 1;
    } else {
      activeAuctions += 1;
    }
  }

  return {
    totalAuctions: state.auctions.size,
    activeAuctions,
    completedAuctions,
    cancelledAuctions,
    totalBids,
    totalItemsSettled: state.totalItemsSettled,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function isActivePhase(phase: AuctionPhase): boolean {
  return ACTIVE_PHASES.includes(phase);
}

function findItem(auction: MutableAuction, itemId: string): MutableItem | undefined {
  return auction.items.find((i) => i.itemId === itemId);
}

function toAuctionRecord(auction: MutableAuction): AuctionRecord {
  return {
    auctionId: auction.auctionId,
    dynastyId: auction.dynastyId,
    reason: auction.reason,
    phase: auction.phase,
    phaseStartedAt: auction.phaseStartedAt,
    createdAt: auction.createdAt,
    completedAt: auction.completedAt,
    cancelledAt: auction.cancelledAt,
    cancelReason: auction.cancelReason,
    itemCount: auction.items.length,
    bidCount: auction.bids.length,
  };
}

function toReadonlyItem(item: MutableItem): AuctionItem {
  return {
    itemId: item.itemId,
    auctionId: item.auctionId,
    name: item.name,
    description: item.description,
    minimumBidKalon: item.minimumBidKalon,
    highestBidKalon: item.highestBidKalon,
    highestBidderId: item.highestBidderId,
    addedAt: item.addedAt,
  };
}
