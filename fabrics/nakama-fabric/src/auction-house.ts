/**
 * auction-house.ts — Real-time auction system with bid tracking and settlement.
 *
 * Supports open auctions where bidders compete for items. Each auction
 * has a defined duration; bids must exceed the current highest bid.
 * After closing, auctions are settled to determine winners and total volume.
 *
 * All KALON amounts stored as micro-KALON (bigint, 10^6 precision).
 * All timestamps stored as microseconds (bigint).
 */

// ── Types ────────────────────────────────────────────────────────

export type AuctionId = string;
export type BidderId = string;
export type SellerId = string;
export type ItemId = string;

export type AuctionStatus = 'OPEN' | 'CLOSED' | 'SETTLED' | 'CANCELLED';

export type AuctionError =
  | 'auction-not-found'
  | 'auction-closed'
  | 'bid-too-low'
  | 'seller-cannot-bid'
  | 'invalid-amount'
  | 'already-cancelled';

export interface Bid {
  readonly bidId: string;
  readonly auctionId: AuctionId;
  readonly bidderId: BidderId;
  readonly amountKalon: bigint;
  readonly placedAt: bigint;
}

export interface Auction {
  readonly auctionId: AuctionId;
  readonly sellerId: SellerId;
  readonly itemId: ItemId;
  readonly itemDescription: string;
  readonly startingBidKalon: bigint;
  readonly currentBidKalon: bigint;
  readonly currentBidderId: BidderId | null;
  readonly status: AuctionStatus;
  readonly startsAt: bigint;
  readonly endsAt: bigint;
  readonly bids: ReadonlyArray<Bid>;
}

export interface AuctionSettlement {
  readonly settlementId: string;
  readonly auctionId: AuctionId;
  readonly winnerId: BidderId | null;
  readonly finalAmountKalon: bigint;
  readonly settledAt: bigint;
  readonly noWinner: boolean;
}

export interface AuctionSummary {
  readonly totalAuctions: number;
  readonly openAuctions: number;
  readonly settledAuctions: number;
  readonly cancelledAuctions: number;
  readonly totalVolumeKalon: bigint;
}

// ── System Interface ─────────────────────────────────────────────

export interface AuctionHouseSystem {
  createAuction(
    sellerId: SellerId,
    itemId: ItemId,
    itemDescription: string,
    startingBidKalon: bigint,
    durationUs: bigint,
  ): Auction | AuctionError;
  placeBid(
    auctionId: AuctionId,
    bidderId: BidderId,
    amountKalon: bigint,
  ):
    | { readonly success: true; readonly bid: Bid }
    | { readonly success: false; readonly error: AuctionError };
  closeAuction(
    auctionId: AuctionId,
  ): { readonly success: true } | { readonly success: false; readonly error: AuctionError };
  settleAuction(
    auctionId: AuctionId,
  ):
    | { readonly success: true; readonly settlement: AuctionSettlement }
    | { readonly success: false; readonly error: AuctionError };
  cancelAuction(
    auctionId: AuctionId,
  ): { readonly success: true } | { readonly success: false; readonly error: AuctionError };
  getAuction(auctionId: AuctionId): Auction | undefined;
  getBidHistory(auctionId: AuctionId): ReadonlyArray<Bid>;
  getAuctionSummary(): AuctionSummary;
}

// ── Ports ────────────────────────────────────────────────────────

interface AuctionHouseClock {
  nowMicroseconds(): bigint;
}

interface AuctionHouseIdGen {
  generateId(): string;
}

interface AuctionHouseLogger {
  info(message: string, meta?: Record<string, unknown>): void;
}

export interface AuctionHouseDeps {
  readonly clock: AuctionHouseClock;
  readonly idGen: AuctionHouseIdGen;
  readonly logger: AuctionHouseLogger;
}

// ── Internal State ───────────────────────────────────────────────

interface MutableAuction {
  readonly auctionId: AuctionId;
  readonly sellerId: SellerId;
  readonly itemId: ItemId;
  readonly itemDescription: string;
  readonly startingBidKalon: bigint;
  currentBidKalon: bigint;
  currentBidderId: BidderId | null;
  status: AuctionStatus;
  readonly startsAt: bigint;
  readonly endsAt: bigint;
  readonly bids: Bid[];
}

interface AuctionHouseState {
  readonly auctions: Map<AuctionId, MutableAuction>;
  readonly settlements: Map<AuctionId, AuctionSettlement>;
  readonly deps: AuctionHouseDeps;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonlyAuction(auction: MutableAuction): Auction {
  return {
    auctionId: auction.auctionId,
    sellerId: auction.sellerId,
    itemId: auction.itemId,
    itemDescription: auction.itemDescription,
    startingBidKalon: auction.startingBidKalon,
    currentBidKalon: auction.currentBidKalon,
    currentBidderId: auction.currentBidderId,
    status: auction.status,
    startsAt: auction.startsAt,
    endsAt: auction.endsAt,
    bids: [...auction.bids],
  };
}

// ── Auction Creation ─────────────────────────────────────────────

function createAuctionImpl(
  state: AuctionHouseState,
  sellerId: SellerId,
  itemId: ItemId,
  itemDescription: string,
  startingBidKalon: bigint,
  durationUs: bigint,
): Auction | AuctionError {
  if (startingBidKalon < 1n) return 'invalid-amount';
  const now = state.deps.clock.nowMicroseconds();
  const auction: MutableAuction = {
    auctionId: state.deps.idGen.generateId(),
    sellerId,
    itemId,
    itemDescription,
    startingBidKalon,
    currentBidKalon: 0n,
    currentBidderId: null,
    status: 'OPEN',
    startsAt: now,
    endsAt: now + durationUs,
    bids: [],
  };
  state.auctions.set(auction.auctionId, auction);
  state.deps.logger.info('auction-created', { auctionId: auction.auctionId, sellerId });
  return toReadonlyAuction(auction);
}

// ── Bid Placement ────────────────────────────────────────────────

function validateBid(
  auction: MutableAuction,
  bidderId: BidderId,
  amountKalon: bigint,
): AuctionError | null {
  if (auction.status !== 'OPEN') return 'auction-closed';
  if (bidderId === auction.sellerId) return 'seller-cannot-bid';
  if (amountKalon < 1n) return 'invalid-amount';
  if (auction.currentBidderId === null && amountKalon < auction.startingBidKalon) {
    return 'bid-too-low';
  }
  if (auction.currentBidderId !== null && amountKalon <= auction.currentBidKalon) {
    return 'bid-too-low';
  }
  return null;
}

function placeBidImpl(
  state: AuctionHouseState,
  auctionId: AuctionId,
  bidderId: BidderId,
  amountKalon: bigint,
):
  | { readonly success: true; readonly bid: Bid }
  | { readonly success: false; readonly error: AuctionError } {
  const auction = state.auctions.get(auctionId);
  if (auction === undefined) return { success: false, error: 'auction-not-found' };
  const error = validateBid(auction, bidderId, amountKalon);
  if (error !== null) return { success: false, error };
  const bid: Bid = {
    bidId: state.deps.idGen.generateId(),
    auctionId,
    bidderId,
    amountKalon,
    placedAt: state.deps.clock.nowMicroseconds(),
  };
  auction.bids.push(bid);
  auction.currentBidKalon = amountKalon;
  auction.currentBidderId = bidderId;
  state.deps.logger.info('bid-placed', { auctionId, bidderId, amountKalon: String(amountKalon) });
  return { success: true, bid };
}

// ── Auction Lifecycle ────────────────────────────────────────────

function closeAuctionImpl(
  state: AuctionHouseState,
  auctionId: AuctionId,
): { readonly success: true } | { readonly success: false; readonly error: AuctionError } {
  const auction = state.auctions.get(auctionId);
  if (auction === undefined) return { success: false, error: 'auction-not-found' };
  if (auction.status !== 'OPEN') return { success: false, error: 'auction-closed' };
  auction.status = 'CLOSED';
  state.deps.logger.info('auction-closed', { auctionId });
  return { success: true };
}

function settleAuctionImpl(
  state: AuctionHouseState,
  auctionId: AuctionId,
):
  | { readonly success: true; readonly settlement: AuctionSettlement }
  | { readonly success: false; readonly error: AuctionError } {
  const auction = state.auctions.get(auctionId);
  if (auction === undefined) return { success: false, error: 'auction-not-found' };
  if (auction.status !== 'CLOSED') return { success: false, error: 'auction-closed' };
  const noWinner = auction.currentBidderId === null;
  const settlement: AuctionSettlement = {
    settlementId: state.deps.idGen.generateId(),
    auctionId,
    winnerId: auction.currentBidderId,
    finalAmountKalon: auction.currentBidKalon,
    settledAt: state.deps.clock.nowMicroseconds(),
    noWinner,
  };
  auction.status = 'SETTLED';
  state.settlements.set(auctionId, settlement);
  state.deps.logger.info('auction-settled', { auctionId, noWinner });
  return { success: true, settlement };
}

function cancelAuctionImpl(
  state: AuctionHouseState,
  auctionId: AuctionId,
): { readonly success: true } | { readonly success: false; readonly error: AuctionError } {
  const auction = state.auctions.get(auctionId);
  if (auction === undefined) return { success: false, error: 'auction-not-found' };
  if (auction.status === 'CANCELLED') return { success: false, error: 'already-cancelled' };
  if (auction.status === 'SETTLED') return { success: false, error: 'auction-closed' };
  auction.status = 'CANCELLED';
  state.deps.logger.info('auction-cancelled', { auctionId });
  return { success: true };
}

// ── Queries ──────────────────────────────────────────────────────

function getAuctionImpl(state: AuctionHouseState, auctionId: AuctionId): Auction | undefined {
  const auction = state.auctions.get(auctionId);
  return auction === undefined ? undefined : toReadonlyAuction(auction);
}

function getBidHistoryImpl(state: AuctionHouseState, auctionId: AuctionId): ReadonlyArray<Bid> {
  return state.auctions.get(auctionId)?.bids ?? [];
}

function getAuctionSummaryImpl(state: AuctionHouseState): AuctionSummary {
  let openAuctions = 0;
  let settledAuctions = 0;
  let cancelledAuctions = 0;
  let totalVolumeKalon = 0n;

  for (const auction of state.auctions.values()) {
    if (auction.status === 'OPEN') openAuctions += 1;
    else if (auction.status === 'SETTLED') settledAuctions += 1;
    else if (auction.status === 'CANCELLED') cancelledAuctions += 1;
  }

  for (const settlement of state.settlements.values()) {
    if (!settlement.noWinner) totalVolumeKalon += settlement.finalAmountKalon;
  }

  return {
    totalAuctions: state.auctions.size,
    openAuctions,
    settledAuctions,
    cancelledAuctions,
    totalVolumeKalon,
  };
}

// ── Factory ──────────────────────────────────────────────────────

export function createAuctionHouseSystem(deps: AuctionHouseDeps): AuctionHouseSystem {
  const state: AuctionHouseState = {
    auctions: new Map(),
    settlements: new Map(),
    deps,
  };

  return {
    createAuction: (sellerId, itemId, itemDescription, startingBidKalon, durationUs) =>
      createAuctionImpl(state, sellerId, itemId, itemDescription, startingBidKalon, durationUs),
    placeBid: (auctionId, bidderId, amountKalon) =>
      placeBidImpl(state, auctionId, bidderId, amountKalon),
    closeAuction: (auctionId) => closeAuctionImpl(state, auctionId),
    settleAuction: (auctionId) => settleAuctionImpl(state, auctionId),
    cancelAuction: (auctionId) => cancelAuctionImpl(state, auctionId),
    getAuction: (auctionId) => getAuctionImpl(state, auctionId),
    getBidHistory: (auctionId) => getBidHistoryImpl(state, auctionId),
    getAuctionSummary: () => getAuctionSummaryImpl(state),
  };
}
