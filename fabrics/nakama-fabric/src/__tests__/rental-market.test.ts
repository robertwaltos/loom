import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRentalMarketSystem,
  type RentalMarketSystem,
  type RentalListing,
} from '../rental-market.js';

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
  const logs: Array<{ message: string; meta?: Record<string, unknown> }> = [];
  return {
    info: (message: string, meta?: Record<string, unknown>) => {
      logs.push({ message, meta });
    },
    getLogs: () => logs,
    clear: () => {
      logs.length = 0;
    },
  };
}

const PERIOD_US = 86_400_000_000n;
const PRICE = 1_000_000n;

function makeSystem() {
  const clock = createMockClock();
  const idGen = createMockIdGen();
  const logger = createMockLogger();
  const system = createRentalMarketSystem({ clock, idGen, logger });
  return { system, clock, idGen, logger };
}

function makeListing(system: RentalMarketSystem): RentalListing {
  const r = system.createListing('landlord-1', 'Prime plot on Alpha', PRICE, PERIOD_US, 'world-1');
  return r as RentalListing;
}

// ── createListing ─────────────────────────────────────────────────────────────

describe('RentalMarket — createListing', () => {
  it('creates listing with correct fields', () => {
    const { system } = makeSystem();
    const r = system.createListing('landlord-1', 'Plot', PRICE, PERIOD_US, 'world-1');
    const listing = r as RentalListing;
    expect(listing.listingId).toBe('id-1');
    expect(listing.landlordId).toBe('landlord-1');
    expect(listing.available).toBe(true);
  });

  it('returns invalid-amount when price is zero', () => {
    const { system } = makeSystem();
    expect(system.createListing('l', 'P', 0n, PERIOD_US, 'w')).toBe('invalid-amount');
  });

  it('returns invalid-amount when price is negative', () => {
    const { system } = makeSystem();
    expect(system.createListing('l', 'P', -1n, PERIOD_US, 'w')).toBe('invalid-amount');
  });

  it('returns invalid-duration when period is zero', () => {
    const { system } = makeSystem();
    expect(system.createListing('l', 'P', PRICE, 0n, 'w')).toBe('invalid-duration');
  });

  it('returns invalid-duration when period is negative', () => {
    const { system } = makeSystem();
    expect(system.createListing('l', 'P', PRICE, -1n, 'w')).toBe('invalid-duration');
  });

  it('getListing returns listing after creation', () => {
    const { system } = makeSystem();
    const listing = makeListing(system);
    expect(system.getListing(listing.listingId)).toBeDefined();
  });

  it('getListing returns undefined for unknown id', () => {
    const { system } = makeSystem();
    expect(system.getListing('nope')).toBeUndefined();
  });

  it('logs listing creation', () => {
    const { system, logger } = makeSystem();
    logger.clear();
    system.createListing('landlord-1', 'Plot', PRICE, PERIOD_US, 'world-1');
    expect(logger.getLogs().some((l) => l.message === 'Rental listing created')).toBe(true);
  });
});

// ── startRental ───────────────────────────────────────────────────────────────

describe('RentalMarket — startRental', () => {
  let system: RentalMarketSystem;
  let listingId: string;

  beforeEach(() => {
    system = makeSystem().system;
    listingId = makeListing(system).listingId;
  });

  it('starts rental with exact price covering one period', () => {
    const r = system.startRental(listingId, 'tenant-1', PRICE);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.rental.status).toBe('ACTIVE');
      expect(r.payment.periodsCovered).toBe(1);
    }
  });

  it('covers multiple periods when payment exceeds one period', () => {
    const r = system.startRental(listingId, 'tenant-1', PRICE * 3n);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.payment.periodsCovered).toBe(3);
      expect(r.rental.currentPeriodEndsAt).toBe(1_000_000n + 3n * PERIOD_US);
    }
  });

  it('returns listing-not-found for unknown listing', () => {
    const r = system.startRental('bad-id', 'tenant-1', PRICE);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('listing-not-found');
  });

  it('returns invalid-amount when payment is below price', () => {
    const r = system.startRental(listingId, 'tenant-1', PRICE - 1n);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('invalid-amount');
  });

  it('returns already-rented when listing is taken', () => {
    system.startRental(listingId, 'tenant-1', PRICE);
    const r = system.startRental(listingId, 'tenant-2', PRICE);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('already-rented');
  });

  it('marks listing as unavailable after rental starts', () => {
    system.startRental(listingId, 'tenant-1', PRICE);
    expect(system.getListing(listingId)?.available).toBe(false);
  });

  it('tracks total volume after start', () => {
    system.startRental(listingId, 'tenant-1', PRICE * 2n);
    expect(system.getStats().totalVolumeKalon).toBe(PRICE * 2n);
  });
});

// ── makePayment ───────────────────────────────────────────────────────────────

describe('RentalMarket — makePayment', () => {
  let system: RentalMarketSystem;
  let rentalId: string;

  beforeEach(() => {
    system = makeSystem().system;
    const listing = makeListing(system);
    const r = system.startRental(listing.listingId, 'tenant-1', PRICE);
    if (r.success) rentalId = r.rental.rentalId;
  });

  it('extends rental period on payment', () => {
    const before = system.getRental(rentalId)?.currentPeriodEndsAt ?? 0n;
    const r = system.makePayment(rentalId, 'tenant-1', PRICE);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(system.getRental(rentalId)?.currentPeriodEndsAt).toBe(before + PERIOD_US);
      expect(r.periodsExtended).toBe(1);
    }
  });

  it('extends by multiple periods', () => {
    const r = system.makePayment(rentalId, 'tenant-1', PRICE * 4n);
    expect(r.success).toBe(true);
    if (r.success) expect(r.periodsExtended).toBe(4);
  });

  it('returns rental-not-found for unknown rental', () => {
    const r = system.makePayment('nope', 'tenant-1', PRICE);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('rental-not-found');
  });

  it('returns not-tenant for wrong tenant', () => {
    const r = system.makePayment(rentalId, 'other', PRICE);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('not-tenant');
  });

  it('returns invalid-amount for zero payment', () => {
    const r = system.makePayment(rentalId, 'tenant-1', 0n);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('invalid-amount');
  });

  it('returns rental-ended after termination', () => {
    system.terminateRental(rentalId, 'tenant-1');
    const r = system.makePayment(rentalId, 'tenant-1', PRICE);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('rental-ended');
  });

  it('appends to payment history', () => {
    system.makePayment(rentalId, 'tenant-1', PRICE);
    expect(system.getPaymentHistory(rentalId).length).toBe(2);
  });
});

// ── terminateRental & defaultRental ──────────────────────────────────────────

describe('RentalMarket — terminateRental', () => {
  let system: RentalMarketSystem;
  let listingId: string;
  let rentalId: string;

  beforeEach(() => {
    system = makeSystem().system;
    const listing = makeListing(system);
    listingId = listing.listingId;
    const r = system.startRental(listingId, 'tenant-1', PRICE);
    if (r.success) rentalId = r.rental.rentalId;
  });

  it('terminates rental and frees listing', () => {
    expect(system.terminateRental(rentalId, 'tenant-1').success).toBe(true);
    expect(system.getRental(rentalId)?.status).toBe('TERMINATED');
    expect(system.getListing(listingId)?.available).toBe(true);
  });

  it('returns not-tenant for wrong caller', () => {
    const r = system.terminateRental(rentalId, 'other');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('not-tenant');
  });

  it('returns rental-not-found for unknown id', () => {
    const r = system.terminateRental('nope', 'tenant-1');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('rental-not-found');
  });

  it('returns rental-ended when already terminated', () => {
    system.terminateRental(rentalId, 'tenant-1');
    const r = system.terminateRental(rentalId, 'tenant-1');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('rental-ended');
  });
});

describe('RentalMarket — defaultRental', () => {
  let system: RentalMarketSystem;
  let listingId: string;
  let rentalId: string;

  beforeEach(() => {
    system = makeSystem().system;
    const listing = makeListing(system);
    listingId = listing.listingId;
    const r = system.startRental(listingId, 'tenant-1', PRICE);
    if (r.success) rentalId = r.rental.rentalId;
  });

  it('marks rental as DEFAULTED and frees listing', () => {
    expect(system.defaultRental(rentalId).success).toBe(true);
    expect(system.getRental(rentalId)?.status).toBe('DEFAULTED');
    expect(system.getListing(listingId)?.available).toBe(true);
  });

  it('returns rental-not-found for unknown id', () => {
    const r = system.defaultRental('nope');
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('rental-not-found');
  });

  it('returns rental-ended when already defaulted', () => {
    system.defaultRental(rentalId);
    const r = system.defaultRental(rentalId);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toBe('rental-ended');
  });
});

// ── getStats ──────────────────────────────────────────────────────────────────

describe('RentalMarket — getStats', () => {
  it('returns zeroed stats initially', () => {
    const { system } = makeSystem();
    const stats = system.getStats();
    expect(stats.totalListings).toBe(0);
    expect(stats.availableListings).toBe(0);
    expect(stats.activeRentals).toBe(0);
    expect(stats.totalVolumeKalon).toBe(0n);
  });

  it('counts listings and active rentals', () => {
    const { system } = makeSystem();
    const l1 = makeListing(system);
    system.createListing('landlord-1', 'B', PRICE, PERIOD_US, 'w1');
    system.startRental(l1.listingId, 'tenant-1', PRICE);
    const stats = system.getStats();
    expect(stats.totalListings).toBe(2);
    expect(stats.availableListings).toBe(1);
    expect(stats.activeRentals).toBe(1);
  });

  it('accumulates volume across payments', () => {
    const { system } = makeSystem();
    const l1 = makeListing(system);
    const r = system.startRental(l1.listingId, 'tenant-1', PRICE);
    if (r.success) system.makePayment(r.rental.rentalId, 'tenant-1', PRICE * 2n);
    expect(system.getStats().totalVolumeKalon).toBe(PRICE * 3n);
  });

  it('getPaymentHistory returns empty array for unknown rental', () => {
    const { system } = makeSystem();
    expect(system.getPaymentHistory('nope')).toHaveLength(0);
  });

  it('getRental returns undefined for unknown rental', () => {
    const { system } = makeSystem();
    expect(system.getRental('nope')).toBeUndefined();
  });
});
