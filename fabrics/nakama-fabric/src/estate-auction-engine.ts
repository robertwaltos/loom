/**
 * Estate Auction Engine — Active bidding system for NPC estate auctions.
 *
 * POST /estates/:id/bid — place a bid (KALON lockup)
 * GET /estates/:id/bids — current bid ladder
 * GET /estates/active — all open auctions
 * POST /estates/:id/challenge — kinship challenge (14-day window)
 *
 * All KALON values are bigint (micro-KALON). 1 KALON = 1_000_000n micro-KALON.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type EstateTier = 'TIER_3' | 'TIER_2' | 'TIER_2_CHAMBER';

export type AuctionStatus =
  | 'OPEN'
  | 'CLOSED'
  | 'CONTESTED'
  | 'FAILED'
  | 'RESOLVED';

export type BidError =
  | 'AUCTION_NOT_FOUND'
  | 'AUCTION_NOT_OPEN'
  | 'BID_BELOW_MINIMUM'
  | 'BID_NOT_HIGHER'
  | 'INSUFFICIENT_KALON'
  | 'BIDDER_ALREADY_LOCKED'
  | 'CHALLENGE_WINDOW_EXPIRED'
  | 'CHALLENGE_NOT_ALLOWED'
  | 'AUCTION_ALREADY_CONTESTED'
  | 'NO_BIDS';

export type ChallengeVerdict = 'CHALLENGER_WINS' | 'WINNER_WINS';

export interface EstateAuction {
  readonly estateId: string;
  readonly tier: EstateTier;
  readonly status: AuctionStatus;
  readonly openedAt: string;
  readonly closesAt: string;
  readonly challengeDeadline: string;
}

export interface EstateBid {
  readonly bidId: string;
  readonly estateId: string;
  readonly bidderId: string;
  readonly amountMicro: bigint;
  readonly placedAt: string;
  readonly locked: boolean;
}

export interface AuctionReward {
  readonly estateId: string;
  readonly winnerId: string;
  readonly estateRights: boolean;
  readonly marksAward: bigint;
  readonly sealedChronicleAccess: boolean;
  readonly cosmeticItemId: string;
}

export interface ChallengeResult {
  readonly estateId: string;
  readonly challengerId: string;
  readonly defenderId: string;
  readonly verdict: ChallengeVerdict;
  readonly loserPenaltyMicro: bigint;
}

export interface KalonWallet {
  balanceMicro: bigint;
  lockedMicro: bigint;
}

export interface EstateAuctionDeps {
  clock: { nowIso(): string };
  generateId: () => string;
}

export interface EstateAuctionService {
  openAuction(estateId: string, tier: EstateTier, closesAt: string, challengeDeadline: string): EstateAuction;
  placeBid(estateId: string, bidderId: string, amountMicro: bigint): EstateBid | BidError;
  getBidLadder(estateId: string): ReadonlyArray<EstateBid> | BidError;
  getActiveAuctions(): ReadonlyArray<EstateAuction>;
  closeAuction(estateId: string): AuctionReward | BidError;
  submitChallenge(estateId: string, challengerId: string): ChallengeResult | BidError;
  resolveChallenge(estateId: string, verdict: ChallengeVerdict): ChallengeResult | BidError;
  getAuction(estateId: string): EstateAuction | undefined;
  getWallet(playerId: string): KalonWallet;
  archiveFailedEstate(estateId: string): EstateAuction | BidError;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const MINIMUM_BIDS: Record<EstateTier, bigint> = {
  TIER_3: 50_000n,
  TIER_2: 500_000n,
  TIER_2_CHAMBER: 5_000_000n,
} as const;

export const MARKS_AWARD_BASE: bigint = 10_000n;

export const CHALLENGE_WINDOW_DAYS = 14;

export const LOSER_PENALTY_PERCENT = 30;

export const COSMETIC_ITEM_PREFIX = 'cosmetic-estate-';

// ─── State ───────────────────────────────────────────────────────────────────

interface AuctionState {
  readonly auctions: Map<string, EstateAuction>;
  readonly bids: Map<string, Array<EstateBid>>;
  readonly wallets: Map<string, KalonWallet>;
  readonly challenges: Map<string, ChallengeResult>;
}

function makeAuctionState(): AuctionState {
  return {
    auctions: new Map(),
    bids: new Map(),
    wallets: new Map(),
    challenges: new Map(),
  };
}

// ─── Pure Helpers ────────────────────────────────────────────────────────────

function getMinimumBid(tier: EstateTier): bigint {
  return MINIMUM_BIDS[tier];
}

function computePenalty(amountMicro: bigint): bigint {
  return (amountMicro * BigInt(LOSER_PENALTY_PERCENT)) / 100n;
}

function ensureWallet(state: AuctionState, playerId: string): KalonWallet {
  const existing = state.wallets.get(playerId);
  if (existing !== undefined) return existing;
  const wallet: KalonWallet = { balanceMicro: 1_000_000_000n, lockedMicro: 0n };
  state.wallets.set(playerId, wallet);
  return wallet;
}

function getHighestBid(bids: ReadonlyArray<EstateBid>): EstateBid | undefined {
  if (bids.length === 0) return undefined;
  const sorted = [...bids].sort((a, b) => {
    if (a.amountMicro > b.amountMicro) return -1;
    if (a.amountMicro < b.amountMicro) return 1;
    return 0;
  });
  const first = sorted[0];
  if (first === undefined) return undefined;
  return first;
}

function sortBidLadder(bids: Array<EstateBid>): Array<EstateBid> {
  return [...bids].sort((a, b) => {
    if (a.amountMicro > b.amountMicro) return -1;
    if (a.amountMicro < b.amountMicro) return 1;
    return 0;
  });
}

function lockKalon(wallet: KalonWallet, amount: bigint): void {
  wallet.balanceMicro = wallet.balanceMicro - amount;
  wallet.lockedMicro = wallet.lockedMicro + amount;
}

function unlockKalon(wallet: KalonWallet, amount: bigint): void {
  wallet.lockedMicro = wallet.lockedMicro - amount;
  wallet.balanceMicro = wallet.balanceMicro + amount;
}

function deductLockedKalon(wallet: KalonWallet, amount: bigint): void {
  wallet.lockedMicro = wallet.lockedMicro - amount;
}

// ─── State Operations ────────────────────────────────────────────────────────

function addAuction(
  state: AuctionState,
  auction: EstateAuction,
): void {
  state.auctions.set(auction.estateId, auction);
  state.bids.set(auction.estateId, []);
}

function updateAuctionStatus(
  state: AuctionState,
  estateId: string,
  status: AuctionStatus,
): EstateAuction | undefined {
  const auction = state.auctions.get(estateId);
  if (auction === undefined) return undefined;
  const updated: EstateAuction = {
    estateId: auction.estateId,
    tier: auction.tier,
    status: status,
    openedAt: auction.openedAt,
    closesAt: auction.closesAt,
    challengeDeadline: auction.challengeDeadline,
  };
  state.auctions.set(estateId, updated);
  return updated;
}

function validateBid(
  state: AuctionState,
  estateId: string,
  amountMicro: bigint,
  bidderId: string,
): BidError | null {
  const auction = state.auctions.get(estateId);
  if (auction === undefined) return 'AUCTION_NOT_FOUND';
  if (auction.status !== 'OPEN') return 'AUCTION_NOT_OPEN';
  const minimum = getMinimumBid(auction.tier);
  if (amountMicro < minimum) return 'BID_BELOW_MINIMUM';
  const existingBids = state.bids.get(estateId);
  if (existingBids !== undefined) {
    const highest = getHighestBid(existingBids);
    if (highest !== undefined && amountMicro <= highest.amountMicro) {
      return 'BID_NOT_HIGHER';
    }
  }
  const wallet = ensureWallet(state, bidderId);
  if (wallet.balanceMicro < amountMicro) return 'INSUFFICIENT_KALON';
  return null;
}

function buildReward(
  estateId: string,
  winnerId: string,
  tier: EstateTier,
): AuctionReward {
  return {
    estateId: estateId,
    winnerId: winnerId,
    estateRights: true,
    marksAward: MARKS_AWARD_BASE * getMinimumBid(tier),
    sealedChronicleAccess: true,
    cosmeticItemId: COSMETIC_ITEM_PREFIX + estateId,
  };
}

function unlockAllBiddersExceptWinner(
  state: AuctionState,
  estateId: string,
  winnerId: string,
): void {
  const bids = state.bids.get(estateId);
  if (bids === undefined) return;
  for (const bid of bids) {
    if (bid.bidderId === winnerId) continue;
    if (!bid.locked) continue;
    const wallet = ensureWallet(state, bid.bidderId);
    unlockKalon(wallet, bid.amountMicro);
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createEstateAuctionEngine(deps: EstateAuctionDeps): EstateAuctionService {
  const state = makeAuctionState();

  function openAuction(
    estateId: string,
    tier: EstateTier,
    closesAt: string,
    challengeDeadline: string,
  ): EstateAuction {
    const auction: EstateAuction = {
      estateId: estateId,
      tier: tier,
      status: 'OPEN',
      openedAt: deps.clock.nowIso(),
      closesAt: closesAt,
      challengeDeadline: challengeDeadline,
    };
    addAuction(state, auction);
    return auction;
  }

  function placeBid(
    estateId: string,
    bidderId: string,
    amountMicro: bigint,
  ): EstateBid | BidError {
    const error = validateBid(state, estateId, amountMicro, bidderId);
    if (error !== null) return error;
    const wallet = ensureWallet(state, bidderId);
    lockKalon(wallet, amountMicro);
    const bid: EstateBid = {
      bidId: deps.generateId(),
      estateId: estateId,
      bidderId: bidderId,
      amountMicro: amountMicro,
      placedAt: deps.clock.nowIso(),
      locked: true,
    };
    const bids = state.bids.get(estateId);
    if (bids !== undefined) bids.push(bid);
    return bid;
  }

  function getBidLadder(
    estateId: string,
  ): ReadonlyArray<EstateBid> | BidError {
    const auction = state.auctions.get(estateId);
    if (auction === undefined) return 'AUCTION_NOT_FOUND';
    const bids = state.bids.get(estateId);
    if (bids === undefined) return [];
    return sortBidLadder(bids);
  }

  function getActiveAuctions(): ReadonlyArray<EstateAuction> {
    const result: Array<EstateAuction> = [];
    for (const auction of state.auctions.values()) {
      if (auction.status === 'OPEN') result.push(auction);
    }
    return result;
  }

  function closeAuction(estateId: string): AuctionReward | BidError {
    const auction = state.auctions.get(estateId);
    if (auction === undefined) return 'AUCTION_NOT_FOUND';
    if (auction.status !== 'OPEN') return 'AUCTION_NOT_OPEN';
    const bids = state.bids.get(estateId);
    if (bids === undefined || bids.length === 0) return 'NO_BIDS';
    const highest = getHighestBid(bids);
    if (highest === undefined) return 'NO_BIDS';
    updateAuctionStatus(state, estateId, 'CLOSED');
    unlockAllBiddersExceptWinner(state, estateId, highest.bidderId);
    deductLockedKalon(
      ensureWallet(state, highest.bidderId),
      highest.amountMicro,
    );
    return buildReward(estateId, highest.bidderId, auction.tier);
  }

  function submitChallenge(
    estateId: string,
    challengerId: string,
  ): ChallengeResult | BidError {
    const auction = state.auctions.get(estateId);
    if (auction === undefined) return 'AUCTION_NOT_FOUND';
    const existing = state.challenges.get(estateId);
    if (existing !== undefined) return 'AUCTION_ALREADY_CONTESTED';
    if (auction.status !== 'CLOSED') return 'CHALLENGE_NOT_ALLOWED';
    const bids = state.bids.get(estateId);
    if (bids === undefined || bids.length === 0) return 'NO_BIDS';
    const highest = getHighestBid(bids);
    if (highest === undefined) return 'NO_BIDS';
    updateAuctionStatus(state, estateId, 'CONTESTED');
    const challenge: ChallengeResult = {
      estateId: estateId,
      challengerId: challengerId,
      defenderId: highest.bidderId,
      verdict: 'WINNER_WINS',
      loserPenaltyMicro: 0n,
    };
    state.challenges.set(estateId, challenge);
    return challenge;
  }

  function resolveChallenge(
    estateId: string,
    verdict: ChallengeVerdict,
  ): ChallengeResult | BidError {
    const auction = state.auctions.get(estateId);
    if (auction === undefined) return 'AUCTION_NOT_FOUND';
    if (auction.status !== 'CONTESTED') return 'CHALLENGE_NOT_ALLOWED';
    const challenge = state.challenges.get(estateId);
    if (challenge === undefined) return 'CHALLENGE_NOT_ALLOWED';
    const bids = state.bids.get(estateId);
    if (bids === undefined || bids.length === 0) return 'NO_BIDS';
    const highest = getHighestBid(bids);
    if (highest === undefined) return 'NO_BIDS';
    const penalty = computePenalty(highest.amountMicro);
    const resolved: ChallengeResult = {
      estateId: estateId,
      challengerId: challenge.challengerId,
      defenderId: challenge.defenderId,
      verdict: verdict,
      loserPenaltyMicro: penalty,
    };
    state.challenges.set(estateId, resolved);
    updateAuctionStatus(state, estateId, 'RESOLVED');
    return resolved;
  }

  function getAuction(estateId: string): EstateAuction | undefined {
    return state.auctions.get(estateId);
  }

  function getWallet(playerId: string): KalonWallet {
    return ensureWallet(state, playerId);
  }

  function archiveFailedEstate(estateId: string): EstateAuction | BidError {
    const auction = state.auctions.get(estateId);
    if (auction === undefined) return 'AUCTION_NOT_FOUND';
    if (auction.status !== 'OPEN') return 'AUCTION_NOT_OPEN';
    const bids = state.bids.get(estateId);
    if (bids !== undefined && bids.length > 0) return 'CHALLENGE_NOT_ALLOWED';
    const updated = updateAuctionStatus(state, estateId, 'FAILED');
    if (updated === undefined) return 'AUCTION_NOT_FOUND';
    return updated;
  }

  return {
    openAuction: openAuction,
    placeBid: placeBid,
    getBidLadder: getBidLadder,
    getActiveAuctions: getActiveAuctions,
    closeAuction: closeAuction,
    submitChallenge: submitChallenge,
    resolveChallenge: resolveChallenge,
    getAuction: getAuction,
    getWallet: getWallet,
    archiveFailedEstate: archiveFailedEstate,
  };
}
