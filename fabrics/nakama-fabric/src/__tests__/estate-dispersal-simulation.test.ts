import { describe, expect, it } from 'vitest';
import { createEstateAuctionEngine } from '../estate-dispersal.js';

describe('estate-dispersal simulation', () => {
  it('simulates auction lifecycle with contested lot bids', () => {
    let now = 0;
    const perHour = 60 * 60 * 1_000_000;
    const engine = createEstateAuctionEngine({
      clock: { nowMicroseconds: () => now },
    });

    engine.createAuction('auc-1', 'dyn-atreides');
    engine.addLot('auc-1', {
      lotId: 'lot-castle',
      category: 'territory',
      description: 'Castle Caladan',
      minimumBid: 1_000n,
    });

    engine.placeBid('auc-1', {
      bidId: 'bid-1',
      lotId: 'lot-castle',
      bidderId: 'dyn-a',
      amount: 1_500n,
    });
    engine.placeBid('auc-1', {
      bidId: 'bid-2',
      lotId: 'lot-castle',
      bidderId: 'dyn-b',
      amount: 1_800n,
    });

    now += 48 * perHour;
    engine.evaluatePhase('auc-1');
    now += 48 * perHour;
    engine.evaluatePhase('auc-1');
    now += 72 * perHour;
    engine.evaluatePhase('auc-1');
    now += 24 * perHour;
    engine.evaluatePhase('auc-1');
    expect(engine.getAuction('auc-1').isComplete).toBe(true);
  });
});
