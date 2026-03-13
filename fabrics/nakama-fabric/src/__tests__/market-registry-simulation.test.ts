import { beforeEach, describe, expect, it } from 'vitest';
import {
  createMarketRegistry,
  type AddListingParams,
  type MarketCategory,
  type MarketRegistry,
} from '../market-registry.js';

describe('market-registry simulation', () => {
  let nowUs: number;

  const advance = (deltaUs: number): void => {
    nowUs += deltaUs;
  };

  const createSim = (): MarketRegistry =>
    createMarketRegistry({
      clock: {
        nowMicroseconds: () => nowUs,
      },
    });

  const add = (
    registry: MarketRegistry,
    overrides?: Partial<AddListingParams>,
  ): AddListingParams => {
    const payload: AddListingParams = {
      listingId: 'listing-default',
      sellerId: 'seller-default',
      worldId: 'world-a',
      category: 'RESOURCES',
      itemDescription: 'default listing',
      priceKalon: 100n,
      expiresAt: nowUs + 1_000_000,
      ...overrides,
    };
    registry.addListing(payload);
    return payload;
  };

  beforeEach(() => {
    nowUs = 1_000_000;
  });

  it('runs full listing lifecycle across add, search, remove, and cleanup', () => {
    const registry = createSim();

    add(registry, {
      listingId: 'l1',
      sellerId: 'seller-1',
      itemDescription: 'iron lot',
      expiresAt: nowUs + 50,
    });
    add(registry, {
      listingId: 'l2',
      sellerId: 'seller-2',
      itemDescription: 'grain lot',
      expiresAt: nowUs + 1_000,
    });

    expect(registry.search({ worldId: 'world-a' })).toHaveLength(2);

    expect(registry.removeListing('l2')).toBe(true);
    expect(registry.search({ worldId: 'world-a' })).toHaveLength(1);

    advance(100);
    expect(registry.search({ worldId: 'world-a' })).toHaveLength(0);

    const cleaned = registry.cleanupExpired();
    expect(cleaned).toBe(2);
    expect(registry.getStats().totalListings).toBe(0);
  });

  it('enforces strict validation and duplicate id protection', () => {
    const registry = createSim();

    add(registry, { listingId: 'dup-id', priceKalon: 1n });

    expect(() => add(registry, { listingId: 'dup-id' })).toThrow('already exists');
    expect(() => add(registry, { listingId: 'zero', priceKalon: 0n })).toThrow(
      'price must be positive',
    );
    expect(() => add(registry, { listingId: 'neg', priceKalon: -5n })).toThrow(
      'price must be positive',
    );
  });

  it('supports multi-filter search with exact inclusion and exclusion behavior', () => {
    const registry = createSim();

    add(registry, {
      listingId: 'a1',
      worldId: 'world-a',
      category: 'RESOURCES',
      sellerId: 's1',
      priceKalon: 100n,
    });
    add(registry, {
      listingId: 'a2',
      worldId: 'world-a',
      category: 'ARTIFACTS',
      sellerId: 's1',
      priceKalon: 600n,
    });
    add(registry, {
      listingId: 'b1',
      worldId: 'world-b',
      category: 'RESOURCES',
      sellerId: 's2',
      priceKalon: 400n,
    });

    const filtered = registry.search({
      worldId: 'world-a',
      category: 'RESOURCES',
      sellerId: 's1',
      minPrice: 90n,
      maxPrice: 120n,
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.listingId).toBe('a1');

    expect(registry.search({ worldId: 'world-c' })).toHaveLength(0);
    expect(registry.search({ minPrice: 700n })).toHaveLength(0);
  });

  it('calculates odd and even median price aggregates and ignores inactive entries', () => {
    const registry = createSim();

    add(registry, { listingId: 'm1', category: 'SERVICES', priceKalon: 10n });
    add(registry, { listingId: 'm2', category: 'SERVICES', priceKalon: 20n });
    add(registry, { listingId: 'm3', category: 'SERVICES', priceKalon: 30n });

    const odd = registry.getPriceAggregate('world-a', 'SERVICES');
    expect(odd.count).toBe(3);
    expect(odd.averagePrice).toBe(20n);
    expect(odd.medianPrice).toBe(20n);
    expect(odd.lowPrice).toBe(10n);
    expect(odd.highPrice).toBe(30n);

    add(registry, { listingId: 'm4', category: 'SERVICES', priceKalon: 50n });
    const even = registry.getPriceAggregate('world-a', 'SERVICES');
    expect(even.count).toBe(4);
    expect(even.medianPrice).toBe(25n);

    registry.removeListing('m4');
    const afterRemove = registry.getPriceAggregate('world-a', 'SERVICES');
    expect(afterRemove.count).toBe(3);
    expect(afterRemove.medianPrice).toBe(20n);
  });

  it('returns empty aggregates for categories/worlds without active listings', () => {
    const registry = createSim();

    add(registry, { listingId: 'x1', worldId: 'world-a', category: 'ARTIFACTS', priceKalon: 999n });

    const noCategory = registry.getPriceAggregate('world-a', 'SERVICES');
    expect(noCategory.count).toBe(0);
    expect(noCategory.averagePrice).toBe(0n);
    expect(noCategory.medianPrice).toBe(0n);

    const noWorld = registry.getPriceAggregate('world-z', 'ARTIFACTS');
    expect(noWorld.count).toBe(0);
    expect(noWorld.highPrice).toBe(0n);
    expect(noWorld.lowPrice).toBe(0n);
  });

  it('tracks health metrics with 24h volume windows and unique sellers', () => {
    const registry = createSim();

    add(registry, {
      listingId: 'h1',
      worldId: 'world-h',
      sellerId: 'u1',
      category: 'RESOURCES',
      expiresAt: nowUs + 200_000_000_000,
    });
    add(registry, {
      listingId: 'h2',
      worldId: 'world-h',
      sellerId: 'u1',
      category: 'ARTIFACTS',
      expiresAt: nowUs + 200_000_000_000,
    });
    add(registry, {
      listingId: 'h3',
      worldId: 'world-h',
      sellerId: 'u2',
      category: 'SERVICES',
      expiresAt: nowUs + 200_000_000_000,
    });

    registry.recordSale('world-h', 'RESOURCES', 300n);
    advance(86_500_000_000);
    registry.recordSale('world-h', 'SERVICES', 700n);

    const health = registry.getMarketHealth('world-h');
    expect(health.activeListings).toBe(3);
    expect(health.uniqueSellers).toBe(2);
    expect(health.tradeCount24h).toBe(1);
    expect(health.totalVolumeKalon).toBe(700n);
  });

  it('preserves per-world isolation for search, health, and recorded volume', () => {
    const registry = createSim();

    add(registry, { listingId: 'wa', worldId: 'world-a', sellerId: 'sa', category: 'RESOURCES', priceKalon: 50n });
    add(registry, { listingId: 'wb', worldId: 'world-b', sellerId: 'sb', category: 'RESOURCES', priceKalon: 500n });

    registry.recordSale('world-a', 'RESOURCES', 100n);
    registry.recordSale('world-b', 'RESOURCES', 900n);

    const searchA = registry.search({ worldId: 'world-a' });
    const searchB = registry.search({ worldId: 'world-b' });
    expect(searchA).toHaveLength(1);
    expect(searchB).toHaveLength(1);

    const healthA = registry.getMarketHealth('world-a');
    const healthB = registry.getMarketHealth('world-b');
    expect(healthA.totalVolumeKalon).toBe(100n);
    expect(healthB.totalVolumeKalon).toBe(900n);
    expect(healthA.uniqueSellers).toBe(1);
    expect(healthB.uniqueSellers).toBe(1);
  });

  it('removes expired listings in bulk and keeps unexpired listings searchable', () => {
    const registry = createSim();

    add(registry, { listingId: 'e1', expiresAt: nowUs + 10 });
    add(registry, { listingId: 'e2', expiresAt: nowUs + 20 });
    add(registry, { listingId: 'alive', expiresAt: nowUs + 10_000 });

    advance(25);
    const removedCount = registry.cleanupExpired();

    expect(removedCount).toBe(2);
    const remaining = registry.search({ worldId: 'world-a' });
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.listingId).toBe('alive');
  });

  it('returns immutable snapshots instead of leaking live state references', () => {
    const registry = createSim();

    add(registry, { listingId: 'immut-1', itemDescription: 'before' });
    const listing = registry.getListing('immut-1');
    expect(listing?.itemDescription).toBe('before');

    registry.removeListing('immut-1');

    expect(listing?.active).toBe(true);
    const after = registry.getListing('immut-1');
    expect(after?.active).toBe(false);
  });

  it('keeps global stats consistent across listing and sale activity', () => {
    const registry = createSim();

    add(registry, { listingId: 's1', worldId: 'world-a' });
    add(registry, { listingId: 's2', worldId: 'world-a' });
    add(registry, { listingId: 's3', worldId: 'world-b' });

    registry.removeListing('s2');

    registry.recordSale('world-a', 'RESOURCES', 1_000n);
    registry.recordSale('world-b', 'ARTIFACTS', 2_500n);

    const stats = registry.getStats();
    expect(stats.totalListings).toBe(3);
    expect(stats.activeListings).toBe(2);
    expect(stats.totalCompletedTrades).toBe(2);
    expect(stats.totalVolume).toBe(3_500n);
  });

  it('supports full category coverage in volume records and category-scoped aggregates', () => {
    const registry = createSim();
    const categories: MarketCategory[] = [
      'RESOURCES',
      'ARTIFACTS',
      'TERRITORY_RIGHTS',
      'SERVICES',
      'INFORMATION',
    ];

    categories.forEach((category, index) => {
      add(registry, {
        listingId: `cat-${index}`,
        worldId: 'world-c',
        category,
        priceKalon: BigInt((index + 1) * 100),
      });
      registry.recordSale('world-c', category, BigInt((index + 1) * 50));
    });

    for (let i = 0; i < categories.length; i += 1) {
      const category = categories[i];
      const aggregate = registry.getPriceAggregate('world-c', category);
      expect(aggregate.count).toBe(1);
      expect(aggregate.averagePrice).toBe(BigInt((i + 1) * 100));
      expect(aggregate.medianPrice).toBe(BigInt((i + 1) * 100));
    }

    const health = registry.getMarketHealth('world-c');
    expect(health.tradeCount24h).toBe(5);
    expect(health.totalVolumeKalon).toBe(750n);
  });
});
