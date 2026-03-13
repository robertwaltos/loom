import { beforeEach, describe, expect, it } from 'vitest';
import { createAuctionEngine, type AuctionBid, type AuctionDeps } from '../auction-engine.js';

describe('auction-engine simulation', () => {
  let nowUs: number;
  let idCounter: number;
  let phaseTransitions: Array<{ from: string; to: string }>;
  let resolvedEvents: string[];
  let cancelledEvents: Array<{ auctionId: string; reason: string }>;
  let bidEvents: AuctionBid[];

  const deps = (balanceOverride?: (dynastyId: string, amount: bigint) => boolean): AuctionDeps => ({
    clock: { nowMicroseconds: () => nowUs },
    idGenerator: {
      next: () => {
        idCounter += 1;
        return `sim-auction-${idCounter}`;
      },
    },
    kalonPort: {
      verifyBalance: (dynastyId, amount) =>
        balanceOverride ? balanceOverride(dynastyId, amount) : true,
    },
    notificationPort: {
      onPhaseAdvanced: (_auctionId, from, to) => {
        phaseTransitions.push({ from, to });
      },
      onAuctionResolved: (auctionId) => {
        resolvedEvents.push(auctionId);
      },
      onAuctionCancelled: (auctionId, reason) => {
        cancelledEvents.push({ auctionId, reason });
      },
      onBidPlaced: (bid) => {
        bidEvents.push(bid);
      },
    },
  });

  const advanceToCompleted = (engine: ReturnType<typeof createAuctionEngine>, auctionId: string): void => {
    engine.advancePhase(auctionId);
    engine.advancePhase(auctionId);
    engine.advancePhase(auctionId);
    engine.advancePhase(auctionId);
  };

  beforeEach(() => {
    nowUs = 8_000_000;
    idCounter = 0;
    phaseTransitions = [];
    resolvedEvents = [];
    cancelledEvents = [];
    bidEvents = [];
  });

  it('runs full four-phase auction with mixed winners and unsold liquidation outcome', () => {
    const engine = createAuctionEngine(deps());
    const auction = engine.createAuction({
      dynastyId: 'house-a',
      reason: 'legacy transfer',
      items: [
        { name: 'Citadel', description: 'Primary estate', minimumBidKalon: 1000n },
        { name: 'Banner', description: 'Dynasty sigil', minimumBidKalon: 200n },
      ],
    });

    engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'sim-auction-2',
      bidderId: 'heir-1',
      bidderRelation: 'heir',
      amountKalon: 1000n,
    });

    engine.advancePhase(auction.auctionId); // ALLIES
    engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'sim-auction-3',
      bidderId: 'ally-1',
      bidderRelation: 'ally',
      amountKalon: 250n,
    });

    advanceToCompleted(engine, auction.auctionId);
    const result = engine.resolveAuction(auction.auctionId);

    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.settledItems).toHaveLength(2);
      expect(result.unsoldItemIds).toHaveLength(0);
      expect(result.totalProceeds).toBe(1250n);
    }
  });

  it('enforces bidder relation eligibility at each phase boundary', () => {
    const engine = createAuctionEngine(deps());
    const auction = engine.createAuction({
      dynastyId: 'house-b',
      reason: 'estate closure',
      items: [{ name: 'Vault Key', description: 'Key', minimumBidKalon: 50n }],
    });

    const heirsOnly = engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'sim-auction-2',
      bidderId: 'outsider',
      bidderRelation: 'public',
      amountKalon: 60n,
    });
    expect(heirsOnly).toBe('NOT_ELIGIBLE_FOR_PHASE');

    engine.advancePhase(auction.auctionId); // ALLIES
    const alliesAccepted = engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'sim-auction-2',
      bidderId: 'ally-1',
      bidderRelation: 'ally',
      amountKalon: 60n,
    });
    expect(typeof alliesAccepted).not.toBe('string');

    engine.advancePhase(auction.auctionId); // ASSEMBLY
    const publicRejected = engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'sim-auction-2',
      bidderId: 'public-1',
      bidderRelation: 'public',
      amountKalon: 70n,
    });
    expect(publicRejected).toBe('NOT_ELIGIBLE_FOR_PHASE');

    engine.advancePhase(auction.auctionId); // LIQUIDATION
    const publicAccepted = engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'sim-auction-2',
      bidderId: 'public-2',
      bidderRelation: 'public',
      amountKalon: 80n,
    });
    expect(typeof publicAccepted).not.toBe('string');
  });

  it('applies minimum increment rule against current highest bid', () => {
    const engine = createAuctionEngine(deps());
    const auction = engine.createAuction({
      dynastyId: 'house-c',
      reason: 'succession',
      items: [{ name: 'Artifact', description: 'Relic', minimumBidKalon: 1000n }],
    });

    engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'sim-auction-2',
      bidderId: 'heir-a',
      bidderRelation: 'heir',
      amountKalon: 1000n,
    });

    const tooLow = engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'sim-auction-2',
      bidderId: 'heir-b',
      bidderRelation: 'heir',
      amountKalon: 1049n,
    });
    expect(tooLow).toBe('BID_INCREMENT_TOO_LOW');

    const threshold = engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'sim-auction-2',
      bidderId: 'heir-b',
      bidderRelation: 'heir',
      amountKalon: 1050n,
    });
    expect(typeof threshold).not.toBe('string');
  });

  it('rejects bids when kalon balance verification fails', () => {
    const engine = createAuctionEngine(
      deps((dynastyId, amount) => !(dynastyId === 'heir-low' && amount > 500n)),
    );

    const auction = engine.createAuction({
      dynastyId: 'house-d',
      reason: 'inheritance split',
      items: [{ name: 'Estate Bond', description: 'Bond', minimumBidKalon: 300n }],
    });

    const insufficient = engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'sim-auction-2',
      bidderId: 'heir-low',
      bidderRelation: 'heir',
      amountKalon: 700n,
    });

    expect(insufficient).toBe('INSUFFICIENT_BALANCE');
  });

  it('emits phase transitions in canonical order through completion', () => {
    const engine = createAuctionEngine(deps());
    const auction = engine.createAuction({
      dynastyId: 'house-e',
      reason: 'retirement',
      items: [],
    });

    advanceToCompleted(engine, auction.auctionId);

    expect(phaseTransitions).toEqual([
      { from: 'HEIRS', to: 'ALLIES' },
      { from: 'ALLIES', to: 'ASSEMBLY' },
      { from: 'ASSEMBLY', to: 'LIQUIDATION' },
      { from: 'LIQUIDATION', to: 'COMPLETED' },
    ]);
  });

  it('enforces completion before resolve and emits resolve notification once', () => {
    const engine = createAuctionEngine(deps());
    const auction = engine.createAuction({
      dynastyId: 'house-f',
      reason: 'estate dispersal',
      items: [{ name: 'Keep', description: 'Stone keep', minimumBidKalon: 100n }],
    });

    const earlyResolve = engine.resolveAuction(auction.auctionId);
    expect(earlyResolve).toBe('AUCTION_NOT_COMPLETED');

    advanceToCompleted(engine, auction.auctionId);
    const finalResolve = engine.resolveAuction(auction.auctionId);
    expect(typeof finalResolve).not.toBe('string');
    expect(resolvedEvents).toEqual([auction.auctionId]);
  });

  it('moves to cancelled state and blocks post-cancel activity', () => {
    const engine = createAuctionEngine(deps());
    const auction = engine.createAuction({
      dynastyId: 'house-g',
      reason: 'legal dispute',
      items: [{ name: 'Coin Press', description: 'Mint tool', minimumBidKalon: 90n }],
    });

    const cancelled = engine.cancelAuction(auction.auctionId, 'court injunction');
    expect(typeof cancelled).not.toBe('string');
    expect(cancelledEvents).toEqual([{ auctionId: auction.auctionId, reason: 'court injunction' }]);

    expect(engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'sim-auction-2',
      bidderId: 'heir-1',
      bidderRelation: 'heir',
      amountKalon: 100n,
    })).toBe('AUCTION_NOT_ACTIVE');

    expect(engine.cancelAuction(auction.auctionId, 'again')).toBe('AUCTION_ALREADY_TERMINAL');
  });

  it('allows addItem only in active phases and rejects after completion', () => {
    const engine = createAuctionEngine(deps());
    const auction = engine.createAuction({ dynastyId: 'house-h', reason: 'closure', items: [] });

    const added = engine.addItem(auction.auctionId, {
      name: 'Sealed Charter',
      description: 'Parchment',
      minimumBidKalon: 10n,
    });
    expect(typeof added).not.toBe('string');

    advanceToCompleted(engine, auction.auctionId);
    expect(
      engine.addItem(auction.auctionId, {
        name: 'Late Item',
        description: 'Should fail',
        minimumBidKalon: 20n,
      }),
    ).toBe('AUCTION_NOT_ACTIVE');
  });

  it('tracks aggregate stats across active, completed, and cancelled auctions', () => {
    const engine = createAuctionEngine(deps());

    const active = engine.createAuction({ dynastyId: 'd1', reason: 'active', items: [] });
    const complete = engine.createAuction({ dynastyId: 'd2', reason: 'complete', items: [] });
    const cancelled = engine.createAuction({ dynastyId: 'd3', reason: 'cancel', items: [] });

    engine.cancelAuction(cancelled.auctionId, 'duplicate filing');
    advanceToCompleted(engine, complete.auctionId);
    engine.resolveAuction(complete.auctionId);

    const stats = engine.getStats();
    expect(stats.totalAuctions).toBe(3);
    expect(stats.activeAuctions).toBe(1);
    expect(stats.completedAuctions).toBe(1);
    expect(stats.cancelledAuctions).toBe(1);
    expect(stats.totalItemsSettled).toBe(0);

    expect(engine.getAuction(active.auctionId)?.phase).toBe('HEIRS');
  });

  it('assigns deterministic ids across auction, items, and bids', () => {
    const engine = createAuctionEngine(deps());
    const auction = engine.createAuction({
      dynastyId: 'house-i',
      reason: 'id test',
      items: [{ name: 'Ledger', description: 'Book', minimumBidKalon: 20n }],
    });

    const bid = engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'sim-auction-2',
      bidderId: 'heir-id',
      bidderRelation: 'heir',
      amountKalon: 20n,
    });

    expect(auction.auctionId).toBe('sim-auction-1');
    expect(typeof bid).not.toBe('string');
    if (typeof bid !== 'string') {
      expect(bid.bidId).toBe('sim-auction-3');
    }
  });
});
