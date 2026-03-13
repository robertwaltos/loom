import { describe, expect, it } from 'vitest';
import { createNpcEconomyEngine } from '../npc-economy.js';

describe('npc-economy simulation', () => {
  it('simulates merchant listing and market purchase flow', () => {
    let now = 1_000_000;
    let id = 0;
    const engine = createNpcEconomyEngine({
      clock: { nowMicroseconds: () => now++ },
      idGenerator: { generate: () => `eco-${id++}` },
    });

    engine.registerMerchant('npc-a', 'merchant');
    engine.addStock('npc-a', 'wheat', 200);
    const listing = engine.createListing('npc-a', 'wheat', 100);
    const purchase = engine.purchaseFromListing(listing.listingId, 25);

    expect(purchase.success).toBe(true);
    expect(engine.getListings('wheat')[0]?.quantity).toBe(75);
  });
});
