import { describe, it, expect } from 'vitest';
import {
  createAuctionEngine,
  PHASE_DURATIONS,
  MIN_BID_INCREMENT_PERCENT,
  DEFAULT_AUCTION_CONFIG,
} from '../auction-engine.js';
import type {
  AuctionDeps,
  AuctionEngine,
  AuctionBid,
  AuctionRecord,
  AuctionResult,
  AuctionItem,
} from '../auction-engine.js';

// ─── Test Helpers ────────────────────────────────────────────────────

interface MockDeps extends AuctionDeps {
  readonly phaseAdvanced: Array<{ from: string; to: string }>;
  readonly bidsNotified: AuctionBid[];
  readonly resolved: AuctionResult[];
  readonly cancelled: Array<{ auctionId: string; reason: string }>;
  setTime: (us: number) => void;
}

function createMockDeps(): MockDeps {
  let currentTime = 1_000_000;
  let idCounter = 0;
  const phaseAdvanced: Array<{ from: string; to: string }> = [];
  const bidsNotified: AuctionBid[] = [];
  const resolved: AuctionResult[] = [];
  const cancelled: Array<{ auctionId: string; reason: string }> = [];

  return {
    phaseAdvanced,
    bidsNotified,
    resolved,
    cancelled,
    setTime: (us: number) => {
      currentTime = us;
    },
    clock: { nowMicroseconds: () => currentTime },
    idGenerator: {
      next: () => {
        idCounter += 1;
        return 'id-' + String(idCounter);
      },
    },
    kalonPort: { verifyBalance: () => true },
    notificationPort: {
      onPhaseAdvanced: (_id, from, to) => {
        phaseAdvanced.push({ from, to });
      },
      onAuctionResolved: (_id, result) => {
        resolved.push(result);
      },
      onAuctionCancelled: (auctionId, reason) => {
        cancelled.push({ auctionId, reason });
      },
      onBidPlaced: (bid) => {
        bidsNotified.push(bid);
      },
    },
  };
}

function createTestEngine(): { engine: AuctionEngine; deps: MockDeps } {
  const deps = createMockDeps();
  return { engine: createAuctionEngine(deps), deps };
}

function isRecord(result: AuctionRecord | string): result is AuctionRecord {
  return typeof result !== 'string';
}

function isItem(result: AuctionItem | string): result is AuctionItem {
  return typeof result !== 'string';
}

function isBid(result: AuctionBid | string): result is AuctionBid {
  return typeof result !== 'string';
}

function isResult(result: AuctionResult | string): result is AuctionResult {
  return typeof result !== 'string';
}

function createBasicAuction(engine: AuctionEngine): AuctionRecord {
  return engine.createAuction({
    dynastyId: 'house-atreides',
    items: [
      { name: 'Castle Caladan', description: 'Ancestral fortress', minimumBidKalon: 1000n },
      { name: 'Ducal Sword', description: 'Ceremonial blade', minimumBidKalon: 500n },
    ],
    reason: 'Dynasty death',
  });
}

function advanceToPhase(engine: AuctionEngine, auctionId: string, target: string): void {
  const order = ['HEIRS', 'ALLIES', 'ASSEMBLY', 'LIQUIDATION', 'COMPLETED'];
  const targetIndex = order.indexOf(target);
  for (let i = 0; i < targetIndex; i++) {
    engine.advancePhase(auctionId);
  }
}

// ─── Auction Creation ────────────────────────────────────────────────

describe('AuctionEngine - createAuction', () => {
  it('creates auction in HEIRS phase', () => {
    const { engine } = createTestEngine();
    const record = createBasicAuction(engine);

    expect(record.phase).toBe('HEIRS');
    expect(record.dynastyId).toBe('house-atreides');
    expect(record.reason).toBe('Dynasty death');
    expect(record.itemCount).toBe(2);
    expect(record.completedAt).toBeNull();
    expect(record.cancelledAt).toBeNull();
  });

  it('generates unique auction IDs', () => {
    const { engine } = createTestEngine();
    const a1 = engine.createAuction({ dynastyId: 'd-1', items: [], reason: 'death' });
    const a2 = engine.createAuction({ dynastyId: 'd-2', items: [], reason: 'death' });
    expect(a1.auctionId).not.toBe(a2.auctionId);
  });

  it('creates auction with no initial items', () => {
    const { engine } = createTestEngine();
    const record = engine.createAuction({ dynastyId: 'd-1', items: [], reason: 'death' });
    expect(record.itemCount).toBe(0);
  });
});

// ─── addItem ─────────────────────────────────────────────────────────

describe('AuctionEngine - addItem success', () => {
  it('adds item to active auction', () => {
    const { engine } = createTestEngine();
    const auction = engine.createAuction({ dynastyId: 'd-1', items: [], reason: 'death' });

    const result = engine.addItem(auction.auctionId, {
      name: 'Shield Generator',
      description: 'Holtzman effect',
      minimumBidKalon: 2000n,
    });

    expect(isItem(result)).toBe(true);
    if (isItem(result)) {
      expect(result.name).toBe('Shield Generator');
      expect(result.minimumBidKalon).toBe(2000n);
      expect(result.highestBidKalon).toBeNull();
    }
  });
});

describe('AuctionEngine - addItem errors', () => {
  it('returns error for unknown auction', () => {
    const { engine } = createTestEngine();
    const result = engine.addItem('unknown', {
      name: 'Item',
      description: 'Desc',
      minimumBidKalon: 100n,
    });
    expect(result).toBe('AUCTION_NOT_FOUND');
  });

  it('returns error for completed auction', () => {
    const { engine } = createTestEngine();
    const auction = engine.createAuction({ dynastyId: 'd-1', items: [], reason: 'death' });
    advanceToPhase(engine, auction.auctionId, 'COMPLETED');

    const result = engine.addItem(auction.auctionId, {
      name: 'Item',
      description: 'Desc',
      minimumBidKalon: 100n,
    });
    expect(result).toBe('AUCTION_NOT_ACTIVE');
  });

  it('returns error for cancelled auction', () => {
    const { engine } = createTestEngine();
    const auction = engine.createAuction({ dynastyId: 'd-1', items: [], reason: 'death' });
    engine.cancelAuction(auction.auctionId, 'changed mind');

    const result = engine.addItem(auction.auctionId, {
      name: 'Item',
      description: 'Desc',
      minimumBidKalon: 100n,
    });
    expect(result).toBe('AUCTION_NOT_ACTIVE');
  });
});

// ─── placeBid — eligibility ──────────────────────────────────────────

describe('AuctionEngine - placeBid HEIRS phase eligibility', () => {
  it('accepts heir bid in HEIRS phase', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);

    const result = engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-2',
      bidderId: 'paul-atreides',
      bidderRelation: 'heir',
      amountKalon: 1500n,
    });

    expect(isBid(result)).toBe(true);
    if (isBid(result)) {
      expect(result.amountKalon).toBe(1500n);
      expect(result.phase).toBe('HEIRS');
    }
  });

  it('rejects non-heir in HEIRS phase', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);

    const result = engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-2',
      bidderId: 'outsider',
      bidderRelation: 'ally',
      amountKalon: 1500n,
    });
    expect(result).toBe('NOT_ELIGIBLE_FOR_PHASE');
  });
});

describe('AuctionEngine - placeBid ALLIES phase eligibility', () => {
  it('accepts heir and ally in ALLIES phase', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);
    engine.advancePhase(auction.auctionId);

    expect(
      isBid(
        engine.placeBid({
          auctionId: auction.auctionId,
          itemId: 'id-2',
          bidderId: 'paul',
          bidderRelation: 'heir',
          amountKalon: 1500n,
        }),
      ),
    ).toBe(true);

    expect(
      isBid(
        engine.placeBid({
          auctionId: auction.auctionId,
          itemId: 'id-3',
          bidderId: 'duncan',
          bidderRelation: 'ally',
          amountKalon: 600n,
        }),
      ),
    ).toBe(true);
  });

  it('rejects assembly member in ALLIES phase', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);
    engine.advancePhase(auction.auctionId);

    const result = engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-2',
      bidderId: 'citizen',
      bidderRelation: 'assembly',
      amountKalon: 1500n,
    });
    expect(result).toBe('NOT_ELIGIBLE_FOR_PHASE');
  });
});

describe('AuctionEngine - placeBid ASSEMBLY and LIQUIDATION eligibility', () => {
  it('accepts assembly member in ASSEMBLY phase', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);
    advanceToPhase(engine, auction.auctionId, 'ASSEMBLY');

    const result = engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-2',
      bidderId: 'citizen',
      bidderRelation: 'assembly',
      amountKalon: 1500n,
    });
    expect(isBid(result)).toBe(true);
  });

  it('rejects public in ASSEMBLY phase', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);
    advanceToPhase(engine, auction.auctionId, 'ASSEMBLY');

    const result = engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-2',
      bidderId: 'stranger',
      bidderRelation: 'public',
      amountKalon: 1500n,
    });
    expect(result).toBe('NOT_ELIGIBLE_FOR_PHASE');
  });

  it('accepts public in LIQUIDATION phase', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);
    advanceToPhase(engine, auction.auctionId, 'LIQUIDATION');

    const result = engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-2',
      bidderId: 'stranger',
      bidderRelation: 'public',
      amountKalon: 1500n,
    });
    expect(isBid(result)).toBe(true);
  });
});

// ─── placeBid — minimum validation ───────────────────────────────────

describe('AuctionEngine - placeBid minimum validation', () => {
  it('rejects bid below minimum', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);

    const result = engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-2',
      bidderId: 'paul',
      bidderRelation: 'heir',
      amountKalon: 500n,
    });
    expect(result).toBe('BID_BELOW_MINIMUM');
  });

  it('rejects zero amount bid', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);

    const result = engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-2',
      bidderId: 'paul',
      bidderRelation: 'heir',
      amountKalon: 0n,
    });
    expect(result).toBe('INVALID_BID_AMOUNT');
  });
});

// ─── placeBid — increment validation ────────────────────────────────

describe('AuctionEngine - placeBid increment validation', () => {
  it('rejects bid with insufficient increment over highest', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);

    engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-2',
      bidderId: 'paul',
      bidderRelation: 'heir',
      amountKalon: 1000n,
    });

    const result = engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-2',
      bidderId: 'feyd',
      bidderRelation: 'heir',
      amountKalon: 1049n,
    });
    expect(result).toBe('BID_INCREMENT_TOO_LOW');
  });

  it('accepts bid at exactly minimum increment', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);

    engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-2',
      bidderId: 'paul',
      bidderRelation: 'heir',
      amountKalon: 1000n,
    });

    const result = engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-2',
      bidderId: 'feyd',
      bidderRelation: 'heir',
      amountKalon: 1050n,
    });
    expect(isBid(result)).toBe(true);
  });
});

// ─── placeBid — error cases ──────────────────────────────────────────

describe('AuctionEngine - placeBid error cases', () => {
  it('returns error for unknown auction', () => {
    const { engine } = createTestEngine();
    const result = engine.placeBid({
      auctionId: 'unknown',
      itemId: 'item-1',
      bidderId: 'paul',
      bidderRelation: 'heir',
      amountKalon: 1000n,
    });
    expect(result).toBe('AUCTION_NOT_FOUND');
  });

  it('returns error for unknown item', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);

    const result = engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'unknown-item',
      bidderId: 'paul',
      bidderRelation: 'heir',
      amountKalon: 1000n,
    });
    expect(result).toBe('ITEM_NOT_FOUND');
  });

  it('returns error when bidder has insufficient balance', () => {
    const deps = createMockDeps();
    const poorDeps: AuctionDeps = {
      ...deps,
      kalonPort: { verifyBalance: () => false },
    };
    const engine = createAuctionEngine(poorDeps);
    const auction = engine.createAuction({
      dynastyId: 'd-1',
      items: [{ name: 'Item', description: 'Desc', minimumBidKalon: 100n }],
      reason: 'death',
    });

    const result = engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-2',
      bidderId: 'poor-bidder',
      bidderRelation: 'heir',
      amountKalon: 100n,
    });
    expect(result).toBe('INSUFFICIENT_BALANCE');
  });

  it('notifies on bid placed', () => {
    const { engine, deps } = createTestEngine();
    const auction = createBasicAuction(engine);

    engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-2',
      bidderId: 'paul',
      bidderRelation: 'heir',
      amountKalon: 1500n,
    });

    expect(deps.bidsNotified).toHaveLength(1);
    expect(deps.bidsNotified[0]?.bidderId).toBe('paul');
  });
});

// ─── advancePhase ────────────────────────────────────────────────────

describe('AuctionEngine - advancePhase', () => {
  it('advances HEIRS to ALLIES', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);
    const result = engine.advancePhase(auction.auctionId);

    expect(isRecord(result)).toBe(true);
    if (isRecord(result)) {
      expect(result.phase).toBe('ALLIES');
    }
  });

  it('advances through all phases to COMPLETED', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);
    advanceToPhase(engine, auction.auctionId, 'COMPLETED');

    const record = engine.getAuction(auction.auctionId);
    expect(record?.phase).toBe('COMPLETED');
    expect(record?.completedAt).not.toBeNull();
  });

  it('returns error for unknown auction', () => {
    const { engine } = createTestEngine();
    expect(engine.advancePhase('unknown')).toBe('AUCTION_NOT_FOUND');
  });

  it('returns error when already COMPLETED', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);
    advanceToPhase(engine, auction.auctionId, 'COMPLETED');
    expect(engine.advancePhase(auction.auctionId)).toBe('AUCTION_NOT_ACTIVE');
  });

  it('notifies on phase advancement', () => {
    const { engine, deps } = createTestEngine();
    const auction = createBasicAuction(engine);
    engine.advancePhase(auction.auctionId);

    expect(deps.phaseAdvanced).toHaveLength(1);
    expect(deps.phaseAdvanced[0]?.from).toBe('HEIRS');
    expect(deps.phaseAdvanced[0]?.to).toBe('ALLIES');
  });
});

// ─── resolveAuction — settled items ──────────────────────────────────

describe('AuctionEngine - resolveAuction with bids', () => {
  it('resolves with settled items', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);
    engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-2',
      bidderId: 'paul',
      bidderRelation: 'heir',
      amountKalon: 1500n,
    });
    advanceToPhase(engine, auction.auctionId, 'COMPLETED');

    const result = engine.resolveAuction(auction.auctionId);
    expect(isResult(result)).toBe(true);
    if (isResult(result)) {
      expect(result.settledItems).toHaveLength(1);
      expect(result.settledItems[0]?.winnerId).toBe('paul');
      expect(result.unsoldItemIds).toHaveLength(1);
      expect(result.totalProceeds).toBe(1500n);
    }
  });

  it('resolves with all items sold', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);
    engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-2',
      bidderId: 'paul',
      bidderRelation: 'heir',
      amountKalon: 2000n,
    });
    engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-3',
      bidderId: 'alia',
      bidderRelation: 'heir',
      amountKalon: 700n,
    });
    advanceToPhase(engine, auction.auctionId, 'COMPLETED');
    const result = engine.resolveAuction(auction.auctionId);

    expect(isResult(result)).toBe(true);
    if (isResult(result)) {
      expect(result.settledItems).toHaveLength(2);
      expect(result.totalProceeds).toBe(2700n);
    }
  });
});

describe('AuctionEngine - resolveAuction edge cases', () => {
  it('resolves with all items unsold', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);
    advanceToPhase(engine, auction.auctionId, 'COMPLETED');
    const result = engine.resolveAuction(auction.auctionId);

    expect(isResult(result)).toBe(true);
    if (isResult(result)) {
      expect(result.settledItems).toHaveLength(0);
      expect(result.unsoldItemIds).toHaveLength(2);
      expect(result.totalProceeds).toBe(0n);
    }
  });

  it('returns error for non-completed auction', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);
    expect(engine.resolveAuction(auction.auctionId)).toBe('AUCTION_NOT_COMPLETED');
  });

  it('returns error for unknown auction', () => {
    const { engine } = createTestEngine();
    expect(engine.resolveAuction('unknown')).toBe('AUCTION_NOT_FOUND');
  });

  it('notifies on auction resolution', () => {
    const { engine, deps } = createTestEngine();
    const auction = createBasicAuction(engine);
    advanceToPhase(engine, auction.auctionId, 'COMPLETED');
    engine.resolveAuction(auction.auctionId);

    expect(deps.resolved).toHaveLength(1);
    expect(deps.resolved[0]?.auctionId).toBe(auction.auctionId);
  });
});

// ─── cancelAuction ───────────────────────────────────────────────────

describe('AuctionEngine - cancelAuction', () => {
  it('cancels active auction', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);
    const result = engine.cancelAuction(auction.auctionId, 'Administrative');

    expect(isRecord(result)).toBe(true);
    if (isRecord(result)) {
      expect(result.phase).toBe('CANCELLED');
      expect(result.cancelledAt).not.toBeNull();
      expect(result.cancelReason).toBe('Administrative');
    }
  });

  it('returns error for unknown auction', () => {
    const { engine } = createTestEngine();
    expect(engine.cancelAuction('unknown', 'reason')).toBe('AUCTION_NOT_FOUND');
  });

  it('returns error for completed auction', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);
    advanceToPhase(engine, auction.auctionId, 'COMPLETED');
    expect(engine.cancelAuction(auction.auctionId, 'late')).toBe('AUCTION_ALREADY_TERMINAL');
  });

  it('returns error for already cancelled auction', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);
    engine.cancelAuction(auction.auctionId, 'first');
    expect(engine.cancelAuction(auction.auctionId, 'second')).toBe('AUCTION_ALREADY_TERMINAL');
  });
});

describe('AuctionEngine - cancelAuction side effects', () => {
  it('notifies on cancellation', () => {
    const { engine, deps } = createTestEngine();
    const auction = createBasicAuction(engine);
    engine.cancelAuction(auction.auctionId, 'Administrative');

    expect(deps.cancelled).toHaveLength(1);
    expect(deps.cancelled[0]?.reason).toBe('Administrative');
  });

  it('prevents bidding after cancellation', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);
    engine.cancelAuction(auction.auctionId, 'cancelled');

    const result = engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-2',
      bidderId: 'paul',
      bidderRelation: 'heir',
      amountKalon: 1500n,
    });
    expect(result).toBe('AUCTION_NOT_ACTIVE');
  });
});

// ─── getAuction ──────────────────────────────────────────────────────

describe('AuctionEngine - getAuction', () => {
  it('returns auction record', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);
    const record = engine.getAuction(auction.auctionId);

    expect(record).toBeDefined();
    expect(record?.dynastyId).toBe('house-atreides');
  });

  it('returns undefined for unknown auction', () => {
    const { engine } = createTestEngine();
    expect(engine.getAuction('unknown')).toBeUndefined();
  });

  it('reflects current phase after advancement', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);
    engine.advancePhase(auction.auctionId);
    expect(engine.getAuction(auction.auctionId)?.phase).toBe('ALLIES');
  });
});

// ─── getBids ─────────────────────────────────────────────────────────

describe('AuctionEngine - getBids', () => {
  it('returns empty for auction with no bids', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);
    expect(engine.getBids(auction.auctionId)).toHaveLength(0);
  });

  it('returns all bids for auction', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);
    engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-2',
      bidderId: 'paul',
      bidderRelation: 'heir',
      amountKalon: 1500n,
    });
    engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-3',
      bidderId: 'alia',
      bidderRelation: 'heir',
      amountKalon: 600n,
    });
    expect(engine.getBids(auction.auctionId)).toHaveLength(2);
  });

  it('returns empty for unknown auction', () => {
    const { engine } = createTestEngine();
    expect(engine.getBids('unknown')).toHaveLength(0);
  });
});

// ─── getStats ────────────────────────────────────────────────────────

describe('AuctionEngine - getStats initial', () => {
  it('returns zeroed stats initially', () => {
    const { engine } = createTestEngine();
    const stats = engine.getStats();

    expect(stats.totalAuctions).toBe(0);
    expect(stats.activeAuctions).toBe(0);
    expect(stats.completedAuctions).toBe(0);
    expect(stats.cancelledAuctions).toBe(0);
    expect(stats.totalBids).toBe(0);
    expect(stats.totalItemsSettled).toBe(0);
  });
});

describe('AuctionEngine - getStats tracking', () => {
  it('tracks all counters correctly', () => {
    const { engine } = createTestEngine();

    const a1 = createBasicAuction(engine);
    engine.createAuction({
      dynastyId: 'd-2',
      items: [{ name: 'Item', description: 'Desc', minimumBidKalon: 100n }],
      reason: 'death',
    });
    const a3 = engine.createAuction({ dynastyId: 'd-3', items: [], reason: 'death' });

    engine.placeBid({
      auctionId: a1.auctionId,
      itemId: 'id-2',
      bidderId: 'paul',
      bidderRelation: 'heir',
      amountKalon: 1500n,
    });

    advanceToPhase(engine, a1.auctionId, 'COMPLETED');
    engine.resolveAuction(a1.auctionId);
    engine.cancelAuction(a3.auctionId, 'cancelled');

    const stats = engine.getStats();
    expect(stats.totalAuctions).toBe(3);
    expect(stats.activeAuctions).toBe(1);
    expect(stats.completedAuctions).toBe(1);
    expect(stats.cancelledAuctions).toBe(1);
    expect(stats.totalBids).toBe(1);
    expect(stats.totalItemsSettled).toBe(1);
  });
});

// ─── Constants ───────────────────────────────────────────────────────

describe('AuctionEngine - constants', () => {
  it('exports PHASE_DURATIONS with correct values', () => {
    const usPerHour = 60 * 60 * 1_000_000;
    expect(PHASE_DURATIONS['HEIRS']).toBe(48 * usPerHour);
    expect(PHASE_DURATIONS['ALLIES']).toBe(48 * usPerHour);
    expect(PHASE_DURATIONS['ASSEMBLY']).toBe(72 * usPerHour);
    expect(PHASE_DURATIONS['LIQUIDATION']).toBe(24 * usPerHour);
  });

  it('exports MIN_BID_INCREMENT_PERCENT as 5', () => {
    expect(MIN_BID_INCREMENT_PERCENT).toBe(5);
  });

  it('exports DEFAULT_AUCTION_CONFIG', () => {
    expect(DEFAULT_AUCTION_CONFIG.maxItemsPerAuction).toBe(500);
    expect(DEFAULT_AUCTION_CONFIG.maxBidsPerItem).toBe(1000);
  });
});

// ─── Full Lifecycle — creation to resolution ─────────────────────────

describe('AuctionEngine - full auction lifecycle', () => {
  it('runs complete auction from creation to resolution', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);

    engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-2',
      bidderId: 'paul',
      bidderRelation: 'heir',
      amountKalon: 2000n,
    });

    engine.advancePhase(auction.auctionId);

    engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-3',
      bidderId: 'duncan',
      bidderRelation: 'ally',
      amountKalon: 700n,
    });

    advanceToPhase(engine, auction.auctionId, 'COMPLETED');
    const result = engine.resolveAuction(auction.auctionId);

    expect(isResult(result)).toBe(true);
    if (isResult(result)) {
      expect(result.settledItems).toHaveLength(2);
      expect(result.totalProceeds).toBe(2700n);
    }
  });
});

// ─── Full Lifecycle — competitive bidding ────────────────────────────

describe('AuctionEngine - competitive bidding lifecycle', () => {
  it('handles competitive bidding with increment enforcement', () => {
    const { engine } = createTestEngine();
    const auction = createBasicAuction(engine);

    engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-2',
      bidderId: 'paul',
      bidderRelation: 'heir',
      amountKalon: 1000n,
    });
    engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-2',
      bidderId: 'feyd',
      bidderRelation: 'heir',
      amountKalon: 1100n,
    });
    engine.placeBid({
      auctionId: auction.auctionId,
      itemId: 'id-2',
      bidderId: 'paul',
      bidderRelation: 'heir',
      amountKalon: 1200n,
    });

    expect(engine.getBids(auction.auctionId)).toHaveLength(3);

    advanceToPhase(engine, auction.auctionId, 'COMPLETED');
    const result = engine.resolveAuction(auction.auctionId);

    expect(isResult(result)).toBe(true);
    if (isResult(result)) {
      const castle = result.settledItems.find((s) => s.itemId === 'id-2');
      expect(castle?.winnerId).toBe('paul');
      expect(castle?.amountKalon).toBe(1200n);
    }
  });
});
