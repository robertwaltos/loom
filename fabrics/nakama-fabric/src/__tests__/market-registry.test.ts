import { describe, it, expect } from 'vitest';
import { createMarketRegistry } from '../market-registry.js';
import type { MarketRegistryDeps, AddListingParams } from '../market-registry.js';

// ── Test Helpers ───────────────────────────────────────────────────

function makeDeps(): MarketRegistryDeps & { advanceTime: (us: number) => void } {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => time },
    advanceTime: (us: number) => {
      time += us;
    },
  };
}

function makeListing(overrides?: Partial<AddListingParams>): AddListingParams {
  return {
    listingId: 'listing-1',
    sellerId: 'seller-1',
    worldId: 'world-alpha',
    category: 'RESOURCES',
    itemDescription: 'Iron ore from deep mines',
    priceKalon: 5000n,
    expiresAt: 100_000_000_000,
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────

describe('MarketRegistry -- adding listings', () => {
  it('adds a new listing', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    const listing = registry.addListing(makeListing());
    expect(listing.listingId).toBe('listing-1');
    expect(listing.active).toBe(true);
    expect(listing.priceKalon).toBe(5000n);
  });

  it('rejects duplicate listing ID', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    registry.addListing(makeListing());
    expect(() => registry.addListing(makeListing())).toThrow('already exists');
  });

  it('rejects zero price listing', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    expect(() => registry.addListing(makeListing({ priceKalon: 0n }))).toThrow(
      'price must be positive',
    );
  });

  it('rejects negative price listing', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    expect(() => registry.addListing(makeListing({ priceKalon: -1n }))).toThrow(
      'price must be positive',
    );
  });
});

describe('MarketRegistry -- removing listings', () => {
  it('removes an existing listing', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    registry.addListing(makeListing());
    const removed = registry.removeListing('listing-1');
    expect(removed).toBe(true);
  });

  it('returns false for unknown listing', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    expect(registry.removeListing('unknown')).toBe(false);
  });

  it('deactivates listing on removal', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    registry.addListing(makeListing());
    registry.removeListing('listing-1');
    const listing = registry.getListing('listing-1');
    expect(listing?.active).toBe(false);
  });
});

describe('MarketRegistry -- search by field', () => {
  it('searches by world', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    registry.addListing(makeListing({ listingId: 'l1', worldId: 'w1' }));
    registry.addListing(makeListing({ listingId: 'l2', worldId: 'w1' }));
    registry.addListing(makeListing({ listingId: 'l3', worldId: 'w2' }));
    const results = registry.search({ worldId: 'w1' });
    expect(results).toHaveLength(2);
  });

  it('searches by category', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    registry.addListing(makeListing({ listingId: 'l1', category: 'RESOURCES' }));
    registry.addListing(makeListing({ listingId: 'l2', category: 'ARTIFACTS' }));
    const results = registry.search({ category: 'ARTIFACTS' });
    expect(results).toHaveLength(1);
    expect(results[0]?.category).toBe('ARTIFACTS');
  });

  it('searches by seller', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    registry.addListing(makeListing({ listingId: 'l1', sellerId: 'alice' }));
    registry.addListing(makeListing({ listingId: 'l2', sellerId: 'bob' }));
    const results = registry.search({ sellerId: 'alice' });
    expect(results).toHaveLength(1);
  });

  it('searches by price range', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    registry.addListing(makeListing({ listingId: 'l1', priceKalon: 100n }));
    registry.addListing(makeListing({ listingId: 'l2', priceKalon: 500n }));
    registry.addListing(makeListing({ listingId: 'l3', priceKalon: 1000n }));
    const results = registry.search({ minPrice: 200n, maxPrice: 600n });
    expect(results).toHaveLength(1);
    expect(results[0]?.priceKalon).toBe(500n);
  });
});

describe('MarketRegistry -- search filters', () => {
  it('combines multiple search criteria', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    registry.addListing(
      makeListing({ listingId: 'l1', worldId: 'w1', category: 'RESOURCES', priceKalon: 100n }),
    );
    registry.addListing(
      makeListing({ listingId: 'l2', worldId: 'w1', category: 'ARTIFACTS', priceKalon: 200n }),
    );
    registry.addListing(
      makeListing({ listingId: 'l3', worldId: 'w2', category: 'RESOURCES', priceKalon: 300n }),
    );
    const results = registry.search({ worldId: 'w1', category: 'RESOURCES' });
    expect(results).toHaveLength(1);
  });

  it('excludes inactive listings from search', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    registry.addListing(makeListing({ listingId: 'l1' }));
    registry.removeListing('l1');
    expect(registry.search({})).toHaveLength(0);
  });

  it('excludes expired listings from search', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    registry.addListing(makeListing({ listingId: 'l1', expiresAt: 2_000_000 }));
    deps.advanceTime(5_000_000);
    expect(registry.search({})).toHaveLength(0);
  });
});

describe('MarketRegistry -- price aggregation', () => {
  it('computes price aggregate for active listings', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    registry.addListing(makeListing({ listingId: 'l1', priceKalon: 100n }));
    registry.addListing(makeListing({ listingId: 'l2', priceKalon: 200n }));
    registry.addListing(makeListing({ listingId: 'l3', priceKalon: 300n }));
    const agg = registry.getPriceAggregate('world-alpha', 'RESOURCES');
    expect(agg.count).toBe(3);
    expect(agg.averagePrice).toBe(200n);
    expect(agg.medianPrice).toBe(200n);
    expect(agg.highPrice).toBe(300n);
    expect(agg.lowPrice).toBe(100n);
  });

  it('returns empty aggregate when no listings exist', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    const agg = registry.getPriceAggregate('world-alpha', 'RESOURCES');
    expect(agg.count).toBe(0);
    expect(agg.averagePrice).toBe(0n);
  });

  it('computes median for even number of listings', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    registry.addListing(makeListing({ listingId: 'l1', priceKalon: 100n }));
    registry.addListing(makeListing({ listingId: 'l2', priceKalon: 200n }));
    const agg = registry.getPriceAggregate('world-alpha', 'RESOURCES');
    expect(agg.medianPrice).toBe(150n);
  });
});

describe('MarketRegistry -- volume and market health', () => {
  it('records sales and reports volume', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    registry.recordSale('world-alpha', 'RESOURCES', 5000n);
    registry.recordSale('world-alpha', 'RESOURCES', 3000n);
    const health = registry.getMarketHealth('world-alpha');
    expect(health.totalVolumeKalon).toBe(8000n);
    expect(health.tradeCount24h).toBe(2);
  });

  it('counts unique sellers in health indicators', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    registry.addListing(makeListing({ listingId: 'l1', sellerId: 'alice' }));
    registry.addListing(makeListing({ listingId: 'l2', sellerId: 'alice' }));
    registry.addListing(makeListing({ listingId: 'l3', sellerId: 'bob' }));
    const health = registry.getMarketHealth('world-alpha');
    expect(health.uniqueSellers).toBe(2);
    expect(health.activeListings).toBe(3);
  });

  it('filters volume to 24h window', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    registry.recordSale('world-alpha', 'RESOURCES', 5000n);
    deps.advanceTime(100_000_000_000);
    registry.recordSale('world-alpha', 'RESOURCES', 3000n);
    const health = registry.getMarketHealth('world-alpha');
    expect(health.tradeCount24h).toBe(1);
    expect(health.totalVolumeKalon).toBe(3000n);
  });
});

describe('MarketRegistry -- cleanup and stats', () => {
  it('cleans up expired and inactive listings', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    registry.addListing(makeListing({ listingId: 'l1', expiresAt: 2_000_000 }));
    registry.addListing(makeListing({ listingId: 'l2' }));
    registry.removeListing('l2');
    deps.advanceTime(5_000_000);
    const cleaned = registry.cleanupExpired();
    expect(cleaned).toBe(2);
  });

  it('reports registry stats', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    registry.addListing(makeListing({ listingId: 'l1' }));
    registry.addListing(makeListing({ listingId: 'l2' }));
    registry.recordSale('world-alpha', 'RESOURCES', 5000n);
    const stats = registry.getStats();
    expect(stats.totalListings).toBe(2);
    expect(stats.activeListings).toBe(2);
    expect(stats.totalCompletedTrades).toBe(1);
    expect(stats.totalVolume).toBe(5000n);
  });

  it('returns undefined for unknown listing', () => {
    const deps = makeDeps();
    const registry = createMarketRegistry(deps);
    expect(registry.getListing('unknown')).toBeUndefined();
  });
});
