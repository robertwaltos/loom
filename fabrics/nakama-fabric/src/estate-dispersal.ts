/**
 * Estate Dispersal Auction — 4-phase asset redistribution for completed dynasties.
 *
 * Bible v1.1 Part 8, v1.4: Legacy Protocols & Inheritance
 *
 * When a dynasty reaches REDISTRIBUTION state, its assets are auctioned
 * through four time-gated phases over 192 hours (8 real days):
 *
 *   Phase 1 — Heirs (48h):    Registered heirs only
 *   Phase 2 — Allies (48h):   Alliance members + diplomatic relations
 *   Phase 3 — Assembly (72h): All players
 *   Phase 4 — Liquidation (24h): Unsold assets → Commons Fund
 *
 * Memorial Bids: Special lot category. Winning bid text is inscribed
 * permanently in The Chronicle as the dynasty's final entry.
 */

import { continuityRecordNotFound, continuityInvalidTransition } from './kalon-errors.js';

// ─── Types ───────────────────────────────────────────────────────────

export type AuctionPhase = 'heirs' | 'allies' | 'assembly' | 'liquidation';

export type LotCategory = 'asset' | 'territory' | 'title' | 'memorial';

export type LotStatus = 'pending' | 'active' | 'sold' | 'unsold' | 'liquidated';

export interface AuctionLot {
  readonly lotId: string;
  readonly auctionId: string;
  readonly category: LotCategory;
  readonly description: string;
  readonly minimumBid: bigint;
  readonly status: LotStatus;
  readonly highestBid: bigint | null;
  readonly highestBidderId: string | null;
  readonly memorialText: string | null;
}

export interface Bid {
  readonly bidId: string;
  readonly lotId: string;
  readonly bidderId: string;
  readonly amount: bigint;
  readonly memorialText: string | null;
  readonly placedAt: number;
}

export interface EstateAuction {
  readonly auctionId: string;
  readonly dynastyId: string;
  readonly currentPhase: AuctionPhase;
  readonly phaseStartedAt: number;
  readonly createdAt: number;
  readonly lots: ReadonlyArray<AuctionLot>;
  readonly isComplete: boolean;
}

export interface PhaseTransition {
  readonly auctionId: string;
  readonly from: AuctionPhase;
  readonly to: AuctionPhase | 'complete';
  readonly at: number;
  readonly unsoldLotCount: number;
}

export interface AddLotParams {
  readonly lotId: string;
  readonly category: LotCategory;
  readonly description: string;
  readonly minimumBid: bigint;
}

export interface PlaceBidParams {
  readonly bidId: string;
  readonly lotId: string;
  readonly bidderId: string;
  readonly amount: bigint;
  readonly memorialText?: string;
}

export interface EstateAuctionEngine {
  createAuction(auctionId: string, dynastyId: string): EstateAuction;
  getAuction(auctionId: string): EstateAuction;
  tryGetAuction(auctionId: string): EstateAuction | undefined;
  addLot(auctionId: string, lot: AddLotParams): AuctionLot;
  placeBid(auctionId: string, bid: PlaceBidParams): Bid;
  evaluatePhase(auctionId: string): PhaseTransition | null;
  getActiveLots(auctionId: string): ReadonlyArray<AuctionLot>;
  getSoldLots(auctionId: string): ReadonlyArray<AuctionLot>;
  getMemorialWinner(auctionId: string): AuctionLot | undefined;
  canBid(
    auctionId: string,
    bidderId: string,
    heirIds: ReadonlyArray<string>,
    allyIds: ReadonlyArray<string>,
  ): boolean;
  count(): number;
}

// ─── Constants ───────────────────────────────────────────────────────

const US_PER_HOUR = 60 * 60 * 1_000_000;

const PHASE_DURATION_HOURS: Readonly<Record<AuctionPhase, number>> = {
  heirs: 48,
  allies: 48,
  assembly: 72,
  liquidation: 24,
};

const PHASE_ORDER: ReadonlyArray<AuctionPhase> = ['heirs', 'allies', 'assembly', 'liquidation'];

// ─── State ───────────────────────────────────────────────────────────

interface MutableLot {
  readonly lotId: string;
  readonly auctionId: string;
  readonly category: LotCategory;
  readonly description: string;
  readonly minimumBid: bigint;
  status: LotStatus;
  highestBid: bigint | null;
  highestBidderId: string | null;
  memorialText: string | null;
}

interface MutableAuction {
  readonly auctionId: string;
  readonly dynastyId: string;
  currentPhase: AuctionPhase;
  phaseStartedAt: number;
  readonly createdAt: number;
  readonly lots: MutableLot[];
  isComplete: boolean;
}

interface EngineState {
  readonly auctions: Map<string, MutableAuction>;
  readonly clock: { nowMicroseconds(): number };
}

// ─── Factory ─────────────────────────────────────────────────────────

export function createEstateAuctionEngine(deps: {
  readonly clock: { nowMicroseconds(): number };
}): EstateAuctionEngine {
  const state: EngineState = {
    auctions: new Map(),
    clock: deps.clock,
  };

  return {
    createAuction: (id, dynastyId) => createAuctionImpl(state, id, dynastyId),
    getAuction: (id) => getAuctionImpl(state, id),
    tryGetAuction: (id) => tryGetAuctionImpl(state, id),
    addLot: (id, lot) => addLotImpl(state, id, lot),
    placeBid: (id, bid) => placeBidImpl(state, id, bid),
    evaluatePhase: (id) => evaluatePhaseImpl(state, id),
    getActiveLots: (id) => getActiveLotsImpl(state, id),
    getSoldLots: (id) => getSoldLotsImpl(state, id),
    getMemorialWinner: (id) => getMemorialWinnerImpl(state, id),
    canBid: (id, bidderId, heirIds, allyIds) => canBidImpl(state, id, bidderId, heirIds, allyIds),
    count: () => state.auctions.size,
  };
}

// ─── Auction Lifecycle ───────────────────────────────────────────────

function createAuctionImpl(
  state: EngineState,
  auctionId: string,
  dynastyId: string,
): EstateAuction {
  if (state.auctions.has(auctionId)) {
    throw continuityRecordNotFound(auctionId);
  }
  const now = state.clock.nowMicroseconds();
  const auction: MutableAuction = {
    auctionId,
    dynastyId,
    currentPhase: 'heirs',
    phaseStartedAt: now,
    createdAt: now,
    lots: [],
    isComplete: false,
  };
  state.auctions.set(auctionId, auction);
  return toReadonlyAuction(auction);
}

function getAuctionImpl(state: EngineState, auctionId: string): EstateAuction {
  const auction = state.auctions.get(auctionId);
  if (!auction) throw continuityRecordNotFound(auctionId);
  return toReadonlyAuction(auction);
}

function tryGetAuctionImpl(state: EngineState, auctionId: string): EstateAuction | undefined {
  const auction = state.auctions.get(auctionId);
  return auction ? toReadonlyAuction(auction) : undefined;
}

// ─── Lot Management ──────────────────────────────────────────────────

function addLotImpl(state: EngineState, auctionId: string, params: AddLotParams): AuctionLot {
  const auction = getMutableAuction(state, auctionId);
  assertNotComplete(auction);
  const lot: MutableLot = {
    lotId: params.lotId,
    auctionId,
    category: params.category,
    description: params.description,
    minimumBid: params.minimumBid,
    status: 'active',
    highestBid: null,
    highestBidderId: null,
    memorialText: null,
  };
  auction.lots.push(lot);
  return toReadonlyLot(lot);
}

// ─── Bidding ─────────────────────────────────────────────────────────

function placeBidImpl(state: EngineState, auctionId: string, params: PlaceBidParams): Bid {
  const auction = getMutableAuction(state, auctionId);
  assertNotComplete(auction);
  const lot = findLot(auction, params.lotId);
  validateBid(lot, params.amount);

  lot.highestBid = params.amount;
  lot.highestBidderId = params.bidderId;
  if (params.memorialText !== undefined && lot.category === 'memorial') {
    lot.memorialText = params.memorialText;
  }

  return {
    bidId: params.bidId,
    lotId: params.lotId,
    bidderId: params.bidderId,
    amount: params.amount,
    memorialText: params.memorialText ?? null,
    placedAt: state.clock.nowMicroseconds(),
  };
}

function validateBid(lot: MutableLot, amount: bigint): void {
  if (lot.status !== 'active') {
    throw continuityInvalidTransition(lot.lotId, lot.status, 'bid');
  }
  const minRequired = lot.highestBid ?? lot.minimumBid;
  if (amount <= minRequired) {
    throw continuityInvalidTransition(lot.lotId, 'bid_too_low', 'bid');
  }
}

// ─── Phase Evaluation ────────────────────────────────────────────────

function evaluatePhaseImpl(state: EngineState, auctionId: string): PhaseTransition | null {
  const auction = getMutableAuction(state, auctionId);
  if (auction.isComplete) return null;

  const now = state.clock.nowMicroseconds();
  const elapsed = now - auction.phaseStartedAt;
  const durationUs = PHASE_DURATION_HOURS[auction.currentPhase] * US_PER_HOUR;

  if (elapsed < durationUs) return null;
  return advancePhase(auction, now);
}

function advancePhase(auction: MutableAuction, now: number): PhaseTransition {
  const fromPhase = auction.currentPhase;
  const currentIndex = PHASE_ORDER.indexOf(fromPhase);
  const unsoldCount = countUnsoldLots(auction);

  if (fromPhase === 'liquidation') {
    return completeLiquidation(auction, now, unsoldCount);
  }

  const nextPhase = PHASE_ORDER[currentIndex + 1];
  if (!nextPhase) {
    return completeLiquidation(auction, now, unsoldCount);
  }

  auction.currentPhase = nextPhase;
  auction.phaseStartedAt = now;

  return {
    auctionId: auction.auctionId,
    from: fromPhase,
    to: nextPhase,
    at: now,
    unsoldLotCount: unsoldCount,
  };
}

function completeLiquidation(
  auction: MutableAuction,
  now: number,
  unsoldCount: number,
): PhaseTransition {
  for (const lot of auction.lots) {
    if (lot.status === 'active' && lot.highestBidderId !== null) {
      lot.status = 'sold';
    } else if (lot.status === 'active') {
      lot.status = 'liquidated';
    }
  }
  auction.isComplete = true;

  return {
    auctionId: auction.auctionId,
    from: 'liquidation',
    to: 'complete',
    at: now,
    unsoldLotCount: unsoldCount,
  };
}

// ─── Access Control ──────────────────────────────────────────────────

function canBidImpl(
  state: EngineState,
  auctionId: string,
  bidderId: string,
  heirIds: ReadonlyArray<string>,
  allyIds: ReadonlyArray<string>,
): boolean {
  const auction = getMutableAuction(state, auctionId);
  if (auction.isComplete) return false;

  switch (auction.currentPhase) {
    case 'heirs':
      return heirIds.includes(bidderId);
    case 'allies':
      return heirIds.includes(bidderId) || allyIds.includes(bidderId);
    case 'assembly':
    case 'liquidation':
      return true;
    default:
      return false;
  }
}

// ─── Queries ─────────────────────────────────────────────────────────

function getActiveLotsImpl(state: EngineState, auctionId: string): ReadonlyArray<AuctionLot> {
  const auction = getMutableAuction(state, auctionId);
  return auction.lots.filter((l) => l.status === 'active').map(toReadonlyLot);
}

function getSoldLotsImpl(state: EngineState, auctionId: string): ReadonlyArray<AuctionLot> {
  const auction = getMutableAuction(state, auctionId);
  return auction.lots.filter((l) => l.status === 'sold').map(toReadonlyLot);
}

function getMemorialWinnerImpl(state: EngineState, auctionId: string): AuctionLot | undefined {
  const auction = getMutableAuction(state, auctionId);
  const memorial = auction.lots.find((l) => l.category === 'memorial' && l.status === 'sold');
  return memorial ? toReadonlyLot(memorial) : undefined;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getMutableAuction(state: EngineState, auctionId: string): MutableAuction {
  const auction = state.auctions.get(auctionId);
  if (!auction) throw continuityRecordNotFound(auctionId);
  return auction;
}

function findLot(auction: MutableAuction, lotId: string): MutableLot {
  const lot = auction.lots.find((l) => l.lotId === lotId);
  if (!lot) throw continuityRecordNotFound(lotId);
  return lot;
}

function assertNotComplete(auction: MutableAuction): void {
  if (auction.isComplete) {
    throw continuityInvalidTransition(auction.auctionId, 'complete', 'active');
  }
}

function countUnsoldLots(auction: MutableAuction): number {
  return auction.lots.filter((l) => l.status === 'active' && l.highestBidderId === null).length;
}

function toReadonlyAuction(auction: MutableAuction): EstateAuction {
  return {
    auctionId: auction.auctionId,
    dynastyId: auction.dynastyId,
    currentPhase: auction.currentPhase,
    phaseStartedAt: auction.phaseStartedAt,
    createdAt: auction.createdAt,
    lots: auction.lots.map(toReadonlyLot),
    isComplete: auction.isComplete,
  };
}

function toReadonlyLot(lot: MutableLot): AuctionLot {
  return {
    lotId: lot.lotId,
    auctionId: lot.auctionId,
    category: lot.category,
    description: lot.description,
    minimumBid: lot.minimumBid,
    status: lot.status,
    highestBid: lot.highestBid,
    highestBidderId: lot.highestBidderId,
    memorialText: lot.memorialText,
  };
}
