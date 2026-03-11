import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAuctionHouseSystem,
  type AuctionHouseSystem,
  type AuctionHouseDeps,
} from '../auction-house.js';

function createMockClock() {
  let currentTime = 1_000_000n;
  return {
    nowMicroseconds: () => currentTime,
    advance: (delta: bigint) => {
      currentTime += delta;
    },
  };
}

function createMockIdGen() {
  let counter = 1;
  return {
    generateId: () => {
      const id = 'id-' + String(counter);
      counter += 1;
      return id;
    },
  };
}

function createMockLogger() {
  return {
    info: (_message: string, _meta?: Record<string, unknown>) => undefined,
  };
}

function makeDeps(): AuctionHouseDeps {
  return {
    clock: createMockClock(),
    idGen: createMockIdGen(),
    logger: createMockLogger(),
  };
}

const SELLER = 'seller-1';
const BIDDER_A = 'bidder-a';
const BIDDER_B = 'bidder-b';
const ITEM = 'item-xyz';
const DURATION = 3_600_000_000n; // 1 hour in microseconds

describe('AuctionHouseSystem — auction creation', () => {
  let system: AuctionHouseSystem;

  beforeEach(() => {
    system = createAuctionHouseSystem(makeDeps());
  });

  it('creates an auction and returns it', () => {
    const result = system.createAuction(SELLER, ITEM, 'A fine sword', 100n, DURATION);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.sellerId).toBe(SELLER);
      expect(result.status).toBe('OPEN');
      expect(result.startingBidKalon).toBe(100n);
    }
  });

  it('rejects creation with zero starting bid', () => {
    const result = system.createAuction(SELLER, ITEM, 'Bad auction', 0n, DURATION);
    expect(result).toBe('invalid-amount');
  });

  it('created auction has no bids initially', () => {
    const result = system.createAuction(SELLER, ITEM, 'No bids yet', 50n, DURATION);
    if (typeof result === 'object') {
      expect(result.bids).toHaveLength(0);
      expect(result.currentBidderId).toBeNull();
    }
  });

  it('retrieves a created auction by id', () => {
    const result = system.createAuction(SELLER, ITEM, 'Retrievable', 50n, DURATION);
    if (typeof result === 'object') {
      expect(system.getAuction(result.auctionId)).toBeDefined();
    }
  });

  it('returns undefined for unknown auction id', () => {
    expect(system.getAuction('phantom')).toBeUndefined();
  });
});

describe('AuctionHouseSystem — bidding', () => {
  let system: AuctionHouseSystem;
  let auctionId: string;

  beforeEach(() => {
    system = createAuctionHouseSystem(makeDeps());
    const result = system.createAuction(SELLER, ITEM, 'Bid me', 100n, DURATION);
    if (typeof result === 'object') auctionId = result.auctionId;
  });

  it('places a valid first bid at starting price', () => {
    const result = system.placeBid(auctionId, BIDDER_A, 100n);
    expect(result.success).toBe(true);
  });

  it('rejects first bid below starting price', () => {
    const result = system.placeBid(auctionId, BIDDER_A, 50n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('bid-too-low');
  });

  it('rejects bid equal to current highest', () => {
    system.placeBid(auctionId, BIDDER_A, 100n);
    const result = system.placeBid(auctionId, BIDDER_B, 100n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('bid-too-low');
  });

  it('accepts bid strictly higher than current', () => {
    system.placeBid(auctionId, BIDDER_A, 100n);
    const result = system.placeBid(auctionId, BIDDER_B, 101n);
    expect(result.success).toBe(true);
  });

  it('rejects seller bidding on their own auction', () => {
    const result = system.placeBid(auctionId, SELLER, 200n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('seller-cannot-bid');
  });

  it('rejects bid with zero amount', () => {
    const result = system.placeBid(auctionId, BIDDER_A, 0n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-amount');
  });

  it('rejects bid on unknown auction', () => {
    const result = system.placeBid('phantom', BIDDER_A, 100n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('auction-not-found');
  });

  it('bid history grows after each bid', () => {
    system.placeBid(auctionId, BIDDER_A, 100n);
    system.placeBid(auctionId, BIDDER_B, 200n);
    expect(system.getBidHistory(auctionId)).toHaveLength(2);
  });
});

describe('AuctionHouseSystem — close and settle', () => {
  let system: AuctionHouseSystem;
  let auctionId: string;

  beforeEach(() => {
    system = createAuctionHouseSystem(makeDeps());
    const result = system.createAuction(SELLER, ITEM, 'Lifecycle test', 100n, DURATION);
    if (typeof result === 'object') auctionId = result.auctionId;
  });

  it('closes an open auction', () => {
    const result = system.closeAuction(auctionId);
    expect(result.success).toBe(true);
    expect(system.getAuction(auctionId)?.status).toBe('CLOSED');
  });

  it('rejects closing an already-closed auction', () => {
    system.closeAuction(auctionId);
    const result = system.closeAuction(auctionId);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('auction-closed');
  });

  it('settles a closed auction with a winner', () => {
    system.placeBid(auctionId, BIDDER_A, 150n);
    system.closeAuction(auctionId);
    const result = system.settleAuction(auctionId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.settlement.winnerId).toBe(BIDDER_A);
      expect(result.settlement.noWinner).toBe(false);
      expect(result.settlement.finalAmountKalon).toBe(150n);
    }
  });

  it('settles a closed auction with no winner when no bids placed', () => {
    system.closeAuction(auctionId);
    const result = system.settleAuction(auctionId);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.settlement.noWinner).toBe(true);
      expect(result.settlement.winnerId).toBeNull();
    }
  });

  it('rejects settling an open auction', () => {
    const result = system.settleAuction(auctionId);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('auction-closed');
  });
});

describe('AuctionHouseSystem — cancellation', () => {
  let system: AuctionHouseSystem;
  let auctionId: string;

  beforeEach(() => {
    system = createAuctionHouseSystem(makeDeps());
    const result = system.createAuction(SELLER, ITEM, 'Cancel test', 100n, DURATION);
    if (typeof result === 'object') auctionId = result.auctionId;
  });

  it('cancels an open auction', () => {
    const result = system.cancelAuction(auctionId);
    expect(result.success).toBe(true);
    expect(system.getAuction(auctionId)?.status).toBe('CANCELLED');
  });

  it('rejects double-cancellation', () => {
    system.cancelAuction(auctionId);
    const result = system.cancelAuction(auctionId);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('already-cancelled');
  });

  it('rejects bid on closed auction', () => {
    system.closeAuction(auctionId);
    const result = system.placeBid(auctionId, BIDDER_A, 200n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('auction-closed');
  });
});

describe('AuctionHouseSystem — summary', () => {
  let system: AuctionHouseSystem;

  beforeEach(() => {
    system = createAuctionHouseSystem(makeDeps());
  });

  it('starts with zero summary values', () => {
    const summary = system.getAuctionSummary();
    expect(summary.totalAuctions).toBe(0);
    expect(summary.totalVolumeKalon).toBe(0n);
  });

  it('totalVolumeKalon includes only settled auctions with winners', () => {
    const r1 = system.createAuction(SELLER, ITEM, 'A1', 100n, DURATION);
    const r2 = system.createAuction(SELLER, 'item2', 'A2', 100n, DURATION);
    if (typeof r1 !== 'object' || typeof r2 !== 'object') return;

    system.placeBid(r1.auctionId, BIDDER_A, 200n);
    system.closeAuction(r1.auctionId);
    system.settleAuction(r1.auctionId);

    // r2 settled with no winner
    system.closeAuction(r2.auctionId);
    system.settleAuction(r2.auctionId);

    const summary = system.getAuctionSummary();
    expect(summary.settledAuctions).toBe(2);
    expect(summary.totalVolumeKalon).toBe(200n);
  });

  it('tracks open, settled, and cancelled counts', () => {
    const r1 = system.createAuction(SELLER, 'i1', 'Open', 50n, DURATION);
    const r2 = system.createAuction(SELLER, 'i2', 'Cancel', 50n, DURATION);
    if (typeof r1 !== 'object' || typeof r2 !== 'object') return;
    system.cancelAuction(r2.auctionId);

    const summary = system.getAuctionSummary();
    expect(summary.openAuctions).toBe(1);
    expect(summary.cancelledAuctions).toBe(1);
  });
});
