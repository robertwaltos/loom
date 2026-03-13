import { describe, expect, it } from 'vitest';
import { createRentalMarketSystem } from '../rental-market.js';

describe('rental-market simulation', () => {
  it('simulates listing, lease start, renewal, and release', () => {
    let now = 1_000_000n;
    let id = 0;
    const periodUs = 86_400_000_000n;
    const price = 1_000_000n;
    const system = createRentalMarketSystem({
      clock: { nowMicroseconds: () => now },
      idGen: { generateId: () => `rm-${++id}` },
      logger: { info: () => undefined },
    });

    const listing = system.createListing('landlord-1', 'Prime district lot', price, periodUs, 'world-1');
    if (typeof listing === 'string') throw new Error('listing failed');

    const rental = system.startRental(listing.listingId, 'tenant-1', price * 2n);
    expect(rental.success).toBe(true);
    if (!rental.success) return;

    const payment = system.makePayment(rental.rental.rentalId, 'tenant-1', price);
    expect(payment.success).toBe(true);
    const term = system.terminateRental(rental.rental.rentalId, 'tenant-1');
    expect(term.success).toBe(true);
    expect(system.getListing(listing.listingId)?.available).toBe(true);
  });
});
