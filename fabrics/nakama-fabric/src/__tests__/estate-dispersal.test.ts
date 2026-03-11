import { describe, it, expect } from 'vitest';
import { createEstateAuctionEngine } from '../estate-dispersal.js';
import type { EstateAuctionEngine } from '../estate-dispersal.js';

const US_PER_HOUR = 60 * 60 * 1_000_000;

function createTestClock(initialHours = 0) {
  let time = initialHours * US_PER_HOUR;
  return {
    nowMicroseconds: () => time,
    advanceHours(hours: number) {
      time += hours * US_PER_HOUR;
    },
  };
}

function createTestAuctionEngine(initialHours = 0) {
  const clock = createTestClock(initialHours);
  const engine = createEstateAuctionEngine({ clock });
  return { engine, clock };
}

function createAuctionWithLots(engine: EstateAuctionEngine) {
  engine.createAuction('auction-1', 'house-atreides');
  engine.addLot('auction-1', {
    lotId: 'lot-castle',
    category: 'territory',
    description: 'Castle Caladan',
    minimumBid: 1000n,
  });
  engine.addLot('auction-1', {
    lotId: 'lot-sword',
    category: 'asset',
    description: 'Ducal Sword',
    minimumBid: 500n,
  });
  engine.addLot('auction-1', {
    lotId: 'lot-memorial',
    category: 'memorial',
    description: 'Memorial inscription',
    minimumBid: 100n,
  });
}

function advanceThroughAllPhases(
  engine: EstateAuctionEngine,
  clock: ReturnType<typeof createTestClock>,
  auctionId: string,
) {
  clock.advanceHours(48);
  engine.evaluatePhase(auctionId);
  clock.advanceHours(48);
  engine.evaluatePhase(auctionId);
  clock.advanceHours(72);
  engine.evaluatePhase(auctionId);
  clock.advanceHours(24);
  engine.evaluatePhase(auctionId);
}

// ─── Auction Lifecycle ───────────────────────────────────────────────

describe('EstateAuction creation', () => {
  it('creates auction in heirs phase', () => {
    const { engine } = createTestAuctionEngine();
    const auction = engine.createAuction('auction-1', 'house-atreides');
    expect(auction.currentPhase).toBe('heirs');
    expect(auction.dynastyId).toBe('house-atreides');
    expect(auction.isComplete).toBe(false);
    expect(auction.lots).toEqual([]);
  });

  it('counts auctions', () => {
    const { engine } = createTestAuctionEngine();
    expect(engine.count()).toBe(0);
    engine.createAuction('a1', 'd1');
    engine.createAuction('a2', 'd2');
    expect(engine.count()).toBe(2);
  });

  it('retrieves auction by id', () => {
    const { engine } = createTestAuctionEngine();
    engine.createAuction('auction-1', 'house-atreides');
    expect(engine.getAuction('auction-1').dynastyId).toBe('house-atreides');
  });

  it('tryGet returns undefined for missing auction', () => {
    const { engine } = createTestAuctionEngine();
    expect(engine.tryGetAuction('nope')).toBeUndefined();
  });

  it('throws for missing auction on get', () => {
    const { engine } = createTestAuctionEngine();
    expect(() => engine.getAuction('nope')).toThrow('not found');
  });
});

// ─── Lot Management ──────────────────────────────────────────────────

describe('EstateAuction lot management', () => {
  it('adds lots to auction', () => {
    const { engine } = createTestAuctionEngine();
    engine.createAuction('auction-1', 'house-atreides');
    const lot = engine.addLot('auction-1', {
      lotId: 'lot-1',
      category: 'asset',
      description: 'Ducal Ring',
      minimumBid: 500n,
    });
    expect(lot.lotId).toBe('lot-1');
    expect(lot.status).toBe('active');
    expect(lot.highestBid).toBeNull();
  });

  it('tracks active lots', () => {
    const { engine } = createTestAuctionEngine();
    createAuctionWithLots(engine);
    expect(engine.getActiveLots('auction-1')).toHaveLength(3);
  });

  it('rejects lots on completed auction', () => {
    const { engine, clock } = createTestAuctionEngine();
    engine.createAuction('auction-1', 'house-atreides');
    advanceThroughAllPhases(engine, clock, 'auction-1');

    expect(() =>
      engine.addLot('auction-1', {
        lotId: 'late-lot',
        category: 'asset',
        description: 'Too late',
        minimumBid: 100n,
      }),
    ).toThrow();
  });
});

// ─── Bidding ─────────────────────────────────────────────────────────

describe('EstateAuction bidding', () => {
  it('accepts valid bid above minimum', () => {
    const { engine } = createTestAuctionEngine();
    createAuctionWithLots(engine);
    const bid = engine.placeBid('auction-1', {
      bidId: 'bid-1',
      lotId: 'lot-castle',
      bidderId: 'paul-atreides',
      amount: 1500n,
    });
    expect(bid.amount).toBe(1500n);
  });

  it('rejects bid at or below minimum', () => {
    const { engine } = createTestAuctionEngine();
    createAuctionWithLots(engine);
    expect(() =>
      engine.placeBid('auction-1', {
        bidId: 'bid-1',
        lotId: 'lot-castle',
        bidderId: 'paul-atreides',
        amount: 1000n,
      }),
    ).toThrow();
  });

  it('rejects bid at or below current highest', () => {
    const { engine } = createTestAuctionEngine();
    createAuctionWithLots(engine);
    engine.placeBid('auction-1', {
      bidId: 'bid-1',
      lotId: 'lot-castle',
      bidderId: 'paul-atreides',
      amount: 2000n,
    });
    expect(() =>
      engine.placeBid('auction-1', {
        bidId: 'bid-2',
        lotId: 'lot-castle',
        bidderId: 'feyd-harkonnen',
        amount: 2000n,
      }),
    ).toThrow();
  });

  it('accepts bid above current highest', () => {
    const { engine } = createTestAuctionEngine();
    createAuctionWithLots(engine);
    engine.placeBid('auction-1', {
      bidId: 'bid-1',
      lotId: 'lot-castle',
      bidderId: 'paul-atreides',
      amount: 2000n,
    });
    engine.placeBid('auction-1', {
      bidId: 'bid-2',
      lotId: 'lot-castle',
      bidderId: 'feyd-harkonnen',
      amount: 3000n,
    });
    const castle = engine.getActiveLots('auction-1').find((l) => l.lotId === 'lot-castle');
    expect(castle?.highestBidderId).toBe('feyd-harkonnen');
  });
});

// ─── Memorial Bids ───────────────────────────────────────────────────

describe('EstateAuction memorial bids', () => {
  it('stores memorial text on memorial lots', () => {
    const { engine } = createTestAuctionEngine();
    createAuctionWithLots(engine);
    engine.placeBid('auction-1', {
      bidId: 'bid-1',
      lotId: 'lot-memorial',
      bidderId: 'paul-atreides',
      amount: 200n,
      memorialText: 'The sleeper has awakened.',
    });
    const memorial = engine.getActiveLots('auction-1').find((l) => l.lotId === 'lot-memorial');
    expect(memorial?.memorialText).toBe('The sleeper has awakened.');
  });

  it('ignores memorial text on non-memorial lots', () => {
    const { engine } = createTestAuctionEngine();
    createAuctionWithLots(engine);
    engine.placeBid('auction-1', {
      bidId: 'bid-1',
      lotId: 'lot-sword',
      bidderId: 'paul-atreides',
      amount: 600n,
      memorialText: 'Should be ignored',
    });
    const sword = engine.getActiveLots('auction-1').find((l) => l.lotId === 'lot-sword');
    expect(sword?.memorialText).toBeNull();
  });

  it('returns memorial winner after completion', () => {
    const { engine, clock } = createTestAuctionEngine();
    createAuctionWithLots(engine);
    engine.placeBid('auction-1', {
      bidId: 'bid-1',
      lotId: 'lot-memorial',
      bidderId: 'chani',
      amount: 200n,
      memorialText: 'Tell me of your homeworld, Usul.',
    });
    advanceThroughAllPhases(engine, clock, 'auction-1');
    const winner = engine.getMemorialWinner('auction-1');
    expect(winner?.memorialText).toBe('Tell me of your homeworld, Usul.');
    expect(winner?.highestBidderId).toBe('chani');
  });

  it('returns undefined when no memorial lot sold', () => {
    const { engine, clock } = createTestAuctionEngine();
    engine.createAuction('auction-1', 'house-atreides');
    advanceThroughAllPhases(engine, clock, 'auction-1');
    expect(engine.getMemorialWinner('auction-1')).toBeUndefined();
  });
});

// ─── Phase Progression ───────────────────────────────────────────────

describe('EstateAuction phase progression', () => {
  it('stays in heirs phase before 48h', () => {
    const { engine, clock } = createTestAuctionEngine();
    engine.createAuction('auction-1', 'house-atreides');
    clock.advanceHours(47);
    expect(engine.evaluatePhase('auction-1')).toBeNull();
  });

  it('advances heirs → allies at 48h', () => {
    const { engine, clock } = createTestAuctionEngine();
    engine.createAuction('auction-1', 'house-atreides');
    clock.advanceHours(48);
    const transition = engine.evaluatePhase('auction-1');
    expect(transition?.from).toBe('heirs');
    expect(transition?.to).toBe('allies');
  });

  it('advances allies → assembly at 96h', () => {
    const { engine, clock } = createTestAuctionEngine();
    engine.createAuction('auction-1', 'house-atreides');
    clock.advanceHours(48);
    engine.evaluatePhase('auction-1');
    clock.advanceHours(48);
    expect(engine.evaluatePhase('auction-1')?.to).toBe('assembly');
  });

  it('advances assembly → liquidation at 168h', () => {
    const { engine, clock } = createTestAuctionEngine();
    engine.createAuction('auction-1', 'house-atreides');
    clock.advanceHours(48);
    engine.evaluatePhase('auction-1');
    clock.advanceHours(48);
    engine.evaluatePhase('auction-1');
    clock.advanceHours(72);
    expect(engine.evaluatePhase('auction-1')?.to).toBe('liquidation');
  });
});

// ─── Liquidation and Completion ──────────────────────────────────────

describe('EstateAuction completion', () => {
  it('completes after liquidation at 192h total', () => {
    const { engine, clock } = createTestAuctionEngine();
    engine.createAuction('auction-1', 'house-atreides');
    advanceThroughAllPhases(engine, clock, 'auction-1');
    expect(engine.getAuction('auction-1').isComplete).toBe(true);
  });

  it('marks lots with bids as sold', () => {
    const { engine, clock } = createTestAuctionEngine();
    createAuctionWithLots(engine);
    engine.placeBid('auction-1', {
      bidId: 'bid-1',
      lotId: 'lot-castle',
      bidderId: 'paul-atreides',
      amount: 2000n,
    });
    advanceThroughAllPhases(engine, clock, 'auction-1');
    expect(engine.getSoldLots('auction-1')).toHaveLength(1);
    expect(engine.getSoldLots('auction-1')[0]?.lotId).toBe('lot-castle');
  });

  it('marks lots without bids as liquidated', () => {
    const { engine, clock } = createTestAuctionEngine();
    createAuctionWithLots(engine);
    advanceThroughAllPhases(engine, clock, 'auction-1');
    const liquidated = engine.getAuction('auction-1').lots.filter((l) => l.status === 'liquidated');
    expect(liquidated).toHaveLength(3);
  });

  it('reports unsold lot count in transition', () => {
    const { engine, clock } = createTestAuctionEngine();
    createAuctionWithLots(engine);
    engine.placeBid('auction-1', {
      bidId: 'bid-1',
      lotId: 'lot-castle',
      bidderId: 'paul-atreides',
      amount: 2000n,
    });
    clock.advanceHours(48);
    expect(engine.evaluatePhase('auction-1')?.unsoldLotCount).toBe(2);
  });

  it('returns null after completion', () => {
    const { engine, clock } = createTestAuctionEngine();
    engine.createAuction('auction-1', 'house-atreides');
    advanceThroughAllPhases(engine, clock, 'auction-1');
    expect(engine.evaluatePhase('auction-1')).toBeNull();
  });
});

// ─── Access Control (heirs and allies) ───────────────────────────────

describe('EstateAuction access heirs and allies', () => {
  it('allows only heirs in heirs phase', () => {
    const { engine } = createTestAuctionEngine();
    engine.createAuction('auction-1', 'house-atreides');
    const heirs = ['paul-atreides'];
    const allies = ['duncan-idaho'];
    expect(engine.canBid('auction-1', 'paul-atreides', heirs, allies)).toBe(true);
    expect(engine.canBid('auction-1', 'duncan-idaho', heirs, allies)).toBe(false);
    expect(engine.canBid('auction-1', 'stranger', heirs, allies)).toBe(false);
  });

  it('allows heirs and allies in allies phase', () => {
    const { engine, clock } = createTestAuctionEngine();
    engine.createAuction('auction-1', 'house-atreides');
    clock.advanceHours(48);
    engine.evaluatePhase('auction-1');
    const heirs = ['paul-atreides'];
    const allies = ['duncan-idaho'];
    expect(engine.canBid('auction-1', 'paul-atreides', heirs, allies)).toBe(true);
    expect(engine.canBid('auction-1', 'duncan-idaho', heirs, allies)).toBe(true);
    expect(engine.canBid('auction-1', 'stranger', heirs, allies)).toBe(false);
  });
});

// ─── Access Control (assembly and completed) ─────────────────────────

describe('EstateAuction access assembly and completed', () => {
  it('allows everyone in assembly phase', () => {
    const { engine, clock } = createTestAuctionEngine();
    engine.createAuction('auction-1', 'house-atreides');
    clock.advanceHours(48);
    engine.evaluatePhase('auction-1');
    clock.advanceHours(48);
    engine.evaluatePhase('auction-1');
    expect(engine.canBid('auction-1', 'stranger', [], [])).toBe(true);
  });

  it('allows everyone in liquidation phase', () => {
    const { engine, clock } = createTestAuctionEngine();
    engine.createAuction('auction-1', 'house-atreides');
    clock.advanceHours(48);
    engine.evaluatePhase('auction-1');
    clock.advanceHours(48);
    engine.evaluatePhase('auction-1');
    clock.advanceHours(72);
    engine.evaluatePhase('auction-1');
    expect(engine.canBid('auction-1', 'anyone', [], [])).toBe(true);
  });

  it('denies all bidding on completed auction', () => {
    const { engine, clock } = createTestAuctionEngine();
    engine.createAuction('auction-1', 'house-atreides');
    advanceThroughAllPhases(engine, clock, 'auction-1');
    expect(engine.canBid('auction-1', 'anyone', [], [])).toBe(false);
  });
});
