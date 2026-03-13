import { beforeEach, describe, expect, it } from 'vitest';
import {
  createAuctionHouseSystem,
  type AuctionHouseDeps,
  type AuctionHouseSystem,
} from '../auction-house.js';

describe('auction-house simulation', () => {
  let nowUs: bigint;
  let idCounter: number;
  let logs: Array<{ message: string; meta?: Record<string, unknown> }>;

  const advance = (deltaUs: bigint): void => {
    nowUs += deltaUs;
  };

  const deps = (): AuctionHouseDeps => ({
    clock: { nowMicroseconds: () => nowUs },
    idGen: {
      generateId: () => {
        idCounter += 1;
        return `sim-auction-${idCounter}`;
      },
    },
    logger: {
      info: (message, meta) => {
        logs.push({ message, meta });
      },
    },
  });

  const createAuctionOrThrow = (
    system: AuctionHouseSystem,
    sellerId: string,
    itemId: string,
    description: string,
    startingBidKalon = 100n,
    durationUs = 1_000_000n,
  ) => {
    const created = system.createAuction(
      sellerId,
      itemId,
      description,
      startingBidKalon,
      durationUs,
    );
    if (typeof created !== 'object') {
      throw new Error(`unexpected auction creation error: ${created}`);
    }
    return created;
  };

  beforeEach(() => {
    nowUs = 2_000_000n;
    idCounter = 0;
    logs = [];
  });

  it('runs a full competitive lifecycle and settles to the highest bidder', () => {
    const system = createAuctionHouseSystem(deps());
    const created = createAuctionOrThrow(system, 'seller-a', 'item-a', 'Meteor blade', 50n, 900_000n);

    const firstBid = system.placeBid(created.auctionId, 'bidder-a', 50n);
    const secondBid = system.placeBid(created.auctionId, 'bidder-b', 75n);
    const thirdBid = system.placeBid(created.auctionId, 'bidder-c', 125n);

    expect(firstBid.success).toBe(true);
    expect(secondBid.success).toBe(true);
    expect(thirdBid.success).toBe(true);

    const close = system.closeAuction(created.auctionId);
    expect(close.success).toBe(true);

    advance(10n);
    const settled = system.settleAuction(created.auctionId);
    expect(settled.success).toBe(true);
    if (settled.success) {
      expect(settled.settlement.winnerId).toBe('bidder-c');
      expect(settled.settlement.finalAmountKalon).toBe(125n);
      expect(settled.settlement.noWinner).toBe(false);
    }

    const auction = system.getAuction(created.auctionId);
    expect(auction?.status).toBe('SETTLED');
    expect(auction?.currentBidKalon).toBe(125n);
    expect(auction?.currentBidderId).toBe('bidder-c');
    expect(system.getBidHistory(created.auctionId)).toHaveLength(3);
  });

  it('keeps no-bid auctions settleable with no winner and zero volume impact', () => {
    const system = createAuctionHouseSystem(deps());
    const created = createAuctionOrThrow(system, 'seller-b', 'item-b', 'Ancient map', 80n, 500_000n);

    expect(system.closeAuction(created.auctionId).success).toBe(true);
    const settled = system.settleAuction(created.auctionId);
    expect(settled.success).toBe(true);
    if (settled.success) {
      expect(settled.settlement.noWinner).toBe(true);
      expect(settled.settlement.winnerId).toBeNull();
      expect(settled.settlement.finalAmountKalon).toBe(0n);
    }

    const summary = system.getAuctionSummary();
    expect(summary.totalAuctions).toBe(1);
    expect(summary.settledAuctions).toBe(1);
    expect(summary.totalVolumeKalon).toBe(0n);
  });

  it('rejects invalid bid attempts while preserving highest bid state', () => {
    const system = createAuctionHouseSystem(deps());
    const created = createAuctionOrThrow(system, 'seller-c', 'item-c', 'Clockwork owl', 100n, 600_000n);

    expect(system.placeBid(created.auctionId, 'bidder-a', 100n).success).toBe(true);

    const low = system.placeBid(created.auctionId, 'bidder-b', 99n);
    const equal = system.placeBid(created.auctionId, 'bidder-b', 100n);
    const seller = system.placeBid(created.auctionId, 'seller-c', 200n);
    const zero = system.placeBid(created.auctionId, 'bidder-d', 0n);

    expect(low.success).toBe(false);
    expect(equal.success).toBe(false);
    expect(seller.success).toBe(false);
    expect(zero.success).toBe(false);

    if (!low.success) expect(low.error).toBe('bid-too-low');
    if (!equal.success) expect(equal.error).toBe('bid-too-low');
    if (!seller.success) expect(seller.error).toBe('seller-cannot-bid');
    if (!zero.success) expect(zero.error).toBe('invalid-amount');

    const auction = system.getAuction(created.auctionId);
    expect(auction?.currentBidKalon).toBe(100n);
    expect(auction?.currentBidderId).toBe('bidder-a');
    expect(system.getBidHistory(created.auctionId)).toHaveLength(1);
  });

  it('enforces state transitions for close, bid, settle, and cancel operations', () => {
    const system = createAuctionHouseSystem(deps());
    const created = createAuctionOrThrow(system, 'seller-d', 'item-d', 'Silver compass', 30n, 300_000n);

    expect(system.closeAuction(created.auctionId).success).toBe(true);

    const bidAfterClose = system.placeBid(created.auctionId, 'bidder-a', 40n);
    const closeAgain = system.closeAuction(created.auctionId);
    const cancelClosed = system.cancelAuction(created.auctionId);

    expect(bidAfterClose.success).toBe(false);
    if (!bidAfterClose.success) expect(bidAfterClose.error).toBe('auction-closed');
    expect(closeAgain.success).toBe(false);
    if (!closeAgain.success) expect(closeAgain.error).toBe('auction-closed');

    expect(cancelClosed.success).toBe(true);
    expect(system.getAuction(created.auctionId)?.status).toBe('CANCELLED');

    const settleCancelled = system.settleAuction(created.auctionId);
    expect(settleCancelled.success).toBe(false);
    if (!settleCancelled.success) expect(settleCancelled.error).toBe('auction-closed');
  });

  it('rejects operations on unknown auctions with stable error signals', () => {
    const system = createAuctionHouseSystem(deps());

    const bid = system.placeBid('missing-auction', 'bidder-a', 10n);
    const close = system.closeAuction('missing-auction');
    const settle = system.settleAuction('missing-auction');
    const cancel = system.cancelAuction('missing-auction');

    expect(bid.success).toBe(false);
    if (!bid.success) expect(bid.error).toBe('auction-not-found');
    expect(close.success).toBe(false);
    if (!close.success) expect(close.error).toBe('auction-not-found');
    expect(settle.success).toBe(false);
    if (!settle.success) expect(settle.error).toBe('auction-not-found');
    expect(cancel.success).toBe(false);
    if (!cancel.success) expect(cancel.error).toBe('auction-not-found');
  });

  it('tracks summary counts across open, settled, and cancelled auctions', () => {
    const system = createAuctionHouseSystem(deps());

    const openAuction = createAuctionOrThrow(system, 'seller-e1', 'item-e1', 'Open listing', 10n, 700_000n);
    const settledAuction = createAuctionOrThrow(system, 'seller-e2', 'item-e2', 'Settled listing', 20n, 700_000n);
    const cancelledAuction = createAuctionOrThrow(system, 'seller-e3', 'item-e3', 'Cancelled listing', 30n, 700_000n);

    expect(system.placeBid(settledAuction.auctionId, 'bidder-z', 25n).success).toBe(true);
    expect(system.closeAuction(settledAuction.auctionId).success).toBe(true);
    expect(system.settleAuction(settledAuction.auctionId).success).toBe(true);

    expect(system.cancelAuction(cancelledAuction.auctionId).success).toBe(true);

    const summary = system.getAuctionSummary();
    expect(summary.totalAuctions).toBe(3);
    expect(summary.openAuctions).toBe(1);
    expect(summary.settledAuctions).toBe(1);
    expect(summary.cancelledAuctions).toBe(1);
    expect(summary.totalVolumeKalon).toBe(25n);

    expect(system.getAuction(openAuction.auctionId)?.status).toBe('OPEN');
  });

  it('keeps bid histories isolated across simultaneous auctions', () => {
    const system = createAuctionHouseSystem(deps());

    const a1 = createAuctionOrThrow(system, 'seller-f1', 'item-f1', 'A1', 5n, 100_000n);
    const a2 = createAuctionOrThrow(system, 'seller-f2', 'item-f2', 'A2', 15n, 100_000n);

    expect(system.placeBid(a1.auctionId, 'bidder-a', 5n).success).toBe(true);
    expect(system.placeBid(a1.auctionId, 'bidder-b', 6n).success).toBe(true);
    expect(system.placeBid(a2.auctionId, 'bidder-c', 15n).success).toBe(true);

    const historyA1 = system.getBidHistory(a1.auctionId);
    const historyA2 = system.getBidHistory(a2.auctionId);

    expect(historyA1).toHaveLength(2);
    expect(historyA2).toHaveLength(1);
    expect(historyA1.every((bid) => bid.auctionId === a1.auctionId)).toBe(true);
    expect(historyA2.every((bid) => bid.auctionId === a2.auctionId)).toBe(true);
  });

  it('generates deterministic auction, bid, and settlement ids from operation order', () => {
    const system = createAuctionHouseSystem(deps());

    const auction = createAuctionOrThrow(system, 'seller-g', 'item-g', 'Id order item', 40n, 400_000n);
    expect(auction.auctionId).toBe('sim-auction-1');

    const bid1 = system.placeBid(auction.auctionId, 'bidder-a', 40n);
    const bid2 = system.placeBid(auction.auctionId, 'bidder-b', 45n);
    expect(bid1.success).toBe(true);
    expect(bid2.success).toBe(true);

    if (bid1.success && bid2.success) {
      expect(bid1.bid.bidId).toBe('sim-auction-2');
      expect(bid2.bid.bidId).toBe('sim-auction-3');
    }

    expect(system.closeAuction(auction.auctionId).success).toBe(true);
    const settled = system.settleAuction(auction.auctionId);
    expect(settled.success).toBe(true);
    if (settled.success) {
      expect(settled.settlement.settlementId).toBe('sim-auction-4');
    }
  });

  it('records key lifecycle log channels with identifying metadata', () => {
    const system = createAuctionHouseSystem(deps());
    const created = createAuctionOrThrow(system, 'seller-h', 'item-h', 'Logging item', 12n, 500_000n);

    expect(system.placeBid(created.auctionId, 'bidder-a', 12n).success).toBe(true);
    expect(system.closeAuction(created.auctionId).success).toBe(true);
    expect(system.settleAuction(created.auctionId).success).toBe(true);

    const channels = logs.map((entry) => entry.message);
    expect(channels).toContain('auction-created');
    expect(channels).toContain('bid-placed');
    expect(channels).toContain('auction-closed');
    expect(channels).toContain('auction-settled');

    const createLog = logs.find((entry) => entry.message === 'auction-created');
    expect(createLog?.meta?.auctionId).toBe(created.auctionId);
    expect(createLog?.meta?.sellerId).toBe('seller-h');

    const bidLog = logs.find((entry) => entry.message === 'bid-placed');
    expect(bidLog?.meta?.auctionId).toBe(created.auctionId);
    expect(bidLog?.meta?.bidderId).toBe('bidder-a');
    expect(bidLog?.meta?.amountKalon).toBe('12');
  });

  it('retains explicit start/end timestamps and bid chronology under simulated time', () => {
    const system = createAuctionHouseSystem(deps());

    const created = createAuctionOrThrow(system, 'seller-i', 'item-i', 'Temporal artifact', 60n, 250n);
    expect(created.startsAt).toBe(2_000_000n);
    expect(created.endsAt).toBe(2_000_250n);

    advance(10n);
    const bidA = system.placeBid(created.auctionId, 'bidder-a', 60n);
    advance(15n);
    const bidB = system.placeBid(created.auctionId, 'bidder-b', 65n);
    expect(bidA.success).toBe(true);
    expect(bidB.success).toBe(true);

    const history = system.getBidHistory(created.auctionId);
    expect(history).toHaveLength(2);
    expect((history[0]?.placedAt ?? 0n) < (history[1]?.placedAt ?? 0n)).toBe(true);
    expect(history[0]?.placedAt).toBe(2_000_010n);
    expect(history[1]?.placedAt).toBe(2_000_025n);
  });
});
