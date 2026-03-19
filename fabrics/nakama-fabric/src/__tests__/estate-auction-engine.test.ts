import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEstateAuctionEngine,
  MINIMUM_BIDS,
  MARKS_AWARD_BASE,
  LOSER_PENALTY_PERCENT,
  COSMETIC_ITEM_PREFIX,
  CHALLENGE_WINDOW_DAYS,
  type EstateAuctionService,
  type BidError,
  type EstateBid,
  type AuctionReward,
  type ChallengeResult,
} from '../estate-auction-engine.js';

// ── Mock deps ─────────────────────────────────────────────────────────────────

let idCounter = 0;

const mockDeps = {
  clock: { nowIso: () => '2027-01-01T00:00:00Z' },
  generateId: () => {
    idCounter += 1;
    return 'bid-' + String(idCounter);
  },
};

const CLOSES_AT = '2027-02-01T00:00:00Z';
const CHALLENGE_DEADLINE = '2027-02-15T00:00:00Z';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isBidError(result: EstateBid | BidError): result is BidError {
  return typeof result === 'string';
}

function isRewardError(result: AuctionReward | BidError): result is BidError {
  return typeof result === 'string';
}

function isChallengeError(result: ChallengeResult | BidError): result is BidError {
  return typeof result === 'string';
}

// ── Bid Validation ────────────────────────────────────────────────────────────

describe('bid validation', () => {
  let engine: EstateAuctionService;

  beforeEach(() => {
    idCounter = 0;
    engine = createEstateAuctionEngine(mockDeps);
  });

  it('rejects bid on nonexistent auction', () => {
    const result = engine.placeBid('no-such-estate', 'player1', 100_000n);
    expect(result).toBe('AUCTION_NOT_FOUND');
  });

  it('rejects bid below Tier 3 minimum', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    const result = engine.placeBid('e1', 'player1', 10_000n);
    expect(result).toBe('BID_BELOW_MINIMUM');
  });

  it('rejects bid below Tier 2 minimum', () => {
    engine.openAuction('e2', 'TIER_2', CLOSES_AT, CHALLENGE_DEADLINE);
    const result = engine.placeBid('e2', 'player1', 100_000n);
    expect(result).toBe('BID_BELOW_MINIMUM');
  });

  it('rejects bid below Tier 2 Chamber minimum', () => {
    engine.openAuction('e3', 'TIER_2_CHAMBER', CLOSES_AT, CHALLENGE_DEADLINE);
    const result = engine.placeBid('e3', 'player1', 1_000_000n);
    expect(result).toBe('BID_BELOW_MINIMUM');
  });

  it('rejects bid not higher than current highest', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    engine.placeBid('e1', 'player1', 100_000n);
    const result = engine.placeBid('e1', 'player2', 100_000n);
    expect(result).toBe('BID_NOT_HIGHER');
  });

  it('accepts bid exactly at Tier 3 minimum', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    const result = engine.placeBid('e1', 'player1', 50_000n);
    expect(isBidError(result)).toBe(false);
  });

  it('rejects bid on closed auction', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    engine.placeBid('e1', 'player1', 50_000n);
    engine.closeAuction('e1');
    const result = engine.placeBid('e1', 'player2', 100_000n);
    expect(result).toBe('AUCTION_NOT_OPEN');
  });
});

// ── KALON Lockup ──────────────────────────────────────────────────────────────

describe('KALON lockup', () => {
  let engine: EstateAuctionService;

  beforeEach(() => {
    idCounter = 0;
    engine = createEstateAuctionEngine(mockDeps);
  });

  it('locks KALON when bid is placed', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    const walletBefore = engine.getWallet('player1');
    const balanceBefore = walletBefore.balanceMicro;
    engine.placeBid('e1', 'player1', 50_000n);
    const walletAfter = engine.getWallet('player1');
    expect(walletAfter.lockedMicro).toBe(50_000n);
    expect(walletAfter.balanceMicro).toBe(balanceBefore - 50_000n);
  });

  it('rejects bid when balance insufficient', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    const result = engine.placeBid('e1', 'player1', 2_000_000_000n);
    expect(result).toBe('INSUFFICIENT_KALON');
  });

  it('unlocks KALON for losing bidders on close', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    engine.placeBid('e1', 'player1', 50_000n);
    engine.placeBid('e1', 'player2', 100_000n);
    engine.closeAuction('e1');
    const loserWallet = engine.getWallet('player1');
    expect(loserWallet.lockedMicro).toBe(0n);
  });

  it('deducts locked KALON from winner on close', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    engine.placeBid('e1', 'player1', 50_000n);
    engine.placeBid('e1', 'player2', 100_000n);
    engine.closeAuction('e1');
    const winnerWallet = engine.getWallet('player2');
    expect(winnerWallet.lockedMicro).toBe(0n);
  });
});

// ── Auction Lifecycle ─────────────────────────────────────────────────────────

describe('auction lifecycle', () => {
  let engine: EstateAuctionService;

  beforeEach(() => {
    idCounter = 0;
    engine = createEstateAuctionEngine(mockDeps);
  });

  it('creates an auction with OPEN status', () => {
    const auction = engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    expect(auction.status).toBe('OPEN');
    expect(auction.estateId).toBe('e1');
    expect(auction.tier).toBe('TIER_3');
  });

  it('lists active auctions', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    engine.openAuction('e2', 'TIER_2', CLOSES_AT, CHALLENGE_DEADLINE);
    const active = engine.getActiveAuctions();
    expect(active.length).toBe(2);
  });

  it('closed auction does not appear in active list', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    engine.placeBid('e1', 'player1', 50_000n);
    engine.closeAuction('e1');
    const active = engine.getActiveAuctions();
    expect(active.length).toBe(0);
  });

  it('close returns reward with estate rights', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    engine.placeBid('e1', 'player1', 50_000n);
    const result = engine.closeAuction('e1');
    if (isRewardError(result)) throw new Error('expected reward');
    expect(result.estateRights).toBe(true);
    expect(result.winnerId).toBe('player1');
  });

  it('close returns MARKS award', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    engine.placeBid('e1', 'player1', 50_000n);
    const result = engine.closeAuction('e1');
    if (isRewardError(result)) throw new Error('expected reward');
    expect(result.marksAward).toBe(MARKS_AWARD_BASE * MINIMUM_BIDS.TIER_3);
  });

  it('close returns sealed Chronicle access', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    engine.placeBid('e1', 'player1', 50_000n);
    const result = engine.closeAuction('e1');
    if (isRewardError(result)) throw new Error('expected reward');
    expect(result.sealedChronicleAccess).toBe(true);
  });

  it('close returns cosmetic item', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    engine.placeBid('e1', 'player1', 50_000n);
    const result = engine.closeAuction('e1');
    if (isRewardError(result)) throw new Error('expected reward');
    expect(result.cosmeticItemId).toBe(COSMETIC_ITEM_PREFIX + 'e1');
  });

  it('cannot close auction with no bids', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    const result = engine.closeAuction('e1');
    expect(result).toBe('NO_BIDS');
  });
});

// ── Kinship Challenge ─────────────────────────────────────────────────────────

describe('kinship challenge', () => {
  let engine: EstateAuctionService;

  beforeEach(() => {
    idCounter = 0;
    engine = createEstateAuctionEngine(mockDeps);
  });

  it('allows challenge on closed auction', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    engine.placeBid('e1', 'player1', 50_000n);
    engine.closeAuction('e1');
    const result = engine.submitChallenge('e1', 'challenger1');
    expect(isChallengeError(result)).toBe(false);
  });

  it('rejects challenge on open auction', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    const result = engine.submitChallenge('e1', 'challenger1');
    expect(result).toBe('CHALLENGE_NOT_ALLOWED');
  });

  it('sets auction status to CONTESTED', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    engine.placeBid('e1', 'player1', 50_000n);
    engine.closeAuction('e1');
    engine.submitChallenge('e1', 'challenger1');
    const auction = engine.getAuction('e1');
    expect(auction?.status).toBe('CONTESTED');
  });

  it('rejects duplicate challenge', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    engine.placeBid('e1', 'player1', 50_000n);
    engine.closeAuction('e1');
    engine.submitChallenge('e1', 'challenger1');
    const result = engine.submitChallenge('e1', 'challenger2');
    expect(result).toBe('AUCTION_ALREADY_CONTESTED');
  });

  it('challenge identifies defender as highest bidder', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    engine.placeBid('e1', 'player1', 50_000n);
    engine.placeBid('e1', 'player2', 100_000n);
    engine.closeAuction('e1');
    const result = engine.submitChallenge('e1', 'challenger1');
    if (isChallengeError(result)) throw new Error('expected challenge result');
    expect(result.defenderId).toBe('player2');
    expect(result.challengerId).toBe('challenger1');
  });
});

// ── Contested Estate Resolution ───────────────────────────────────────────────

describe('contested estate resolution', () => {
  let engine: EstateAuctionService;

  beforeEach(() => {
    idCounter = 0;
    engine = createEstateAuctionEngine(mockDeps);
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    engine.placeBid('e1', 'player1', 50_000n);
    engine.placeBid('e1', 'player2', 100_000n);
    engine.closeAuction('e1');
    engine.submitChallenge('e1', 'challenger1');
  });

  it('resolves in favor of winner', () => {
    const result = engine.resolveChallenge('e1', 'WINNER_WINS');
    if (isChallengeError(result)) throw new Error('expected result');
    expect(result.verdict).toBe('WINNER_WINS');
  });

  it('resolves in favor of challenger', () => {
    const result = engine.resolveChallenge('e1', 'CHALLENGER_WINS');
    if (isChallengeError(result)) throw new Error('expected result');
    expect(result.verdict).toBe('CHALLENGER_WINS');
  });

  it('loser penalty is 30 percent of highest bid', () => {
    const result = engine.resolveChallenge('e1', 'WINNER_WINS');
    if (isChallengeError(result)) throw new Error('expected result');
    expect(result.loserPenaltyMicro).toBe(30_000n);
  });

  it('sets auction to RESOLVED status', () => {
    engine.resolveChallenge('e1', 'WINNER_WINS');
    const auction = engine.getAuction('e1');
    expect(auction?.status).toBe('RESOLVED');
  });

  it('rejects resolve on non-contested auction', () => {
    engine.openAuction('e2', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    engine.placeBid('e2', 'player1', 50_000n);
    engine.closeAuction('e2');
    const result = engine.resolveChallenge('e2', 'WINNER_WINS');
    expect(result).toBe('CHALLENGE_NOT_ALLOWED');
  });
});

// ── Failed Estate ─────────────────────────────────────────────────────────────

describe('failed estate (no bidders)', () => {
  let engine: EstateAuctionService;

  beforeEach(() => {
    idCounter = 0;
    engine = createEstateAuctionEngine(mockDeps);
  });

  it('archives auction with no bids as FAILED', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    const result = engine.archiveFailedEstate('e1');
    if (typeof result === 'string') throw new Error('expected auction');
    expect(result.status).toBe('FAILED');
  });

  it('failed estate not in active auctions', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    engine.archiveFailedEstate('e1');
    const active = engine.getActiveAuctions();
    expect(active.length).toBe(0);
  });

  it('cannot archive estate that has bids', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    engine.placeBid('e1', 'player1', 50_000n);
    const result = engine.archiveFailedEstate('e1');
    expect(result).toBe('CHALLENGE_NOT_ALLOWED');
  });
});

// ── Bid Ladder Ordering ───────────────────────────────────────────────────────

describe('bid ladder ordering', () => {
  let engine: EstateAuctionService;

  beforeEach(() => {
    idCounter = 0;
    engine = createEstateAuctionEngine(mockDeps);
  });

  it('returns bids sorted highest first', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    engine.placeBid('e1', 'player1', 50_000n);
    engine.placeBid('e1', 'player2', 100_000n);
    engine.placeBid('e1', 'player3', 200_000n);
    const ladder = engine.getBidLadder('e1');
    if (typeof ladder === 'string') throw new Error('expected array');
    expect(ladder.length).toBe(3);
    const first = ladder[0];
    const second = ladder[1];
    const third = ladder[2];
    if (first === undefined || second === undefined || third === undefined) {
      throw new Error('missing bid');
    }
    expect(first.amountMicro).toBe(200_000n);
    expect(second.amountMicro).toBe(100_000n);
    expect(third.amountMicro).toBe(50_000n);
  });

  it('returns error for nonexistent estate', () => {
    const result = engine.getBidLadder('no-such');
    expect(result).toBe('AUCTION_NOT_FOUND');
  });

  it('returns empty array for auction with no bids', () => {
    engine.openAuction('e1', 'TIER_3', CLOSES_AT, CHALLENGE_DEADLINE);
    const ladder = engine.getBidLadder('e1');
    if (typeof ladder === 'string') throw new Error('expected array');
    expect(ladder.length).toBe(0);
  });
});

// ── Constants ─────────────────────────────────────────────────────────────────

describe('constants', () => {
  it('TIER_3 minimum bid is 50_000n', () => {
    expect(MINIMUM_BIDS.TIER_3).toBe(50_000n);
  });

  it('TIER_2 minimum bid is 500_000n', () => {
    expect(MINIMUM_BIDS.TIER_2).toBe(500_000n);
  });

  it('TIER_2_CHAMBER minimum bid is 5_000_000n', () => {
    expect(MINIMUM_BIDS.TIER_2_CHAMBER).toBe(5_000_000n);
  });

  it('CHALLENGE_WINDOW_DAYS is 14', () => {
    expect(CHALLENGE_WINDOW_DAYS).toBe(14);
  });

  it('LOSER_PENALTY_PERCENT is 30', () => {
    expect(LOSER_PENALTY_PERCENT).toBe(30);
  });

  it('MARKS_AWARD_BASE is bigint', () => {
    expect(typeof MARKS_AWARD_BASE).toBe('bigint');
  });
});
