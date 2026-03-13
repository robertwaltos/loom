import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBlackMarket, type BlackMarketDeps } from '../black-market.js';

describe('black-market simulation', () => {
  let nowUs: bigint;
  let idCounter: number;
  let infoLogs: Array<{ msg: string; ctx: Record<string, unknown> }>;
  let warnLogs: Array<{ msg: string; ctx: Record<string, unknown> }>;

  const deps = (): BlackMarketDeps => ({
    clock: { nowMicroseconds: () => nowUs },
    idGen: {
      generate: () => {
        idCounter += 1;
        return `sim-black-${idCounter}`;
      },
    },
    logger: {
      info: (msg, ctx) => {
        infoLogs.push({ msg, ctx });
      },
      warn: (msg, ctx) => {
        warnLogs.push({ msg, ctx });
      },
    },
  });

  beforeEach(() => {
    nowUs = 3_000_000n;
    idCounter = 0;
    infoLogs = [];
    warnLogs = [];
    vi.restoreAllMocks();
  });

  it('runs listing to purchase lifecycle and updates aggregate market stats', () => {
    const market = createBlackMarket(deps());
    const listingResult = market.addListing({
      sellerId: 'seller-a',
      worldId: 'world-a',
      itemType: 'artifact',
      quantity: 3,
      basePriceMicroKalon: 1_000_000n,
      premiumPercent: 50,
    });

    expect(typeof listingResult).not.toBe('string');
    if (typeof listingResult !== 'string') {
      const purchase = market.purchaseListing({ listingId: listingResult.listingId, buyerId: 'buyer-a' });
      expect(typeof purchase).not.toBe('string');

      const stats = market.getMarketStats({ worldId: 'world-a' });
      expect(stats.activeListings).toBe(0);
      expect(stats.totalTransactions).toBe(1);
      expect(stats.volumeMicroKalon).toBe(1_500_000n);
      expect(stats.averagePremium).toBe(50);
    }
  });

  it('enforces premium range boundaries and keeps listing pool unchanged on rejection', () => {
    const market = createBlackMarket(deps());

    expect(
      market.addListing({
        sellerId: 'seller-a',
        worldId: 'world-a',
        itemType: 'artifact',
        quantity: 1,
        basePriceMicroKalon: 100n,
        premiumPercent: 19,
      }),
    ).toBe('PREMIUM_TOO_LOW');

    expect(
      market.addListing({
        sellerId: 'seller-a',
        worldId: 'world-a',
        itemType: 'artifact',
        quantity: 1,
        basePriceMicroKalon: 100n,
        premiumPercent: 201,
      }),
    ).toBe('PREMIUM_TOO_HIGH');

    expect(market.getActiveListings({ worldId: 'world-a' })).toHaveLength(0);
  });

  it('transitions listings to expired state and blocks purchases past expiration', () => {
    const market = createBlackMarket(deps());
    const listingResult = market.addListing({
      sellerId: 'seller-b',
      worldId: 'world-b',
      itemType: 'blueprint',
      quantity: 2,
      basePriceMicroKalon: 500_000n,
      premiumPercent: 60,
    });

    expect(typeof listingResult).not.toBe('string');
    if (typeof listingResult !== 'string') {
      nowUs += 90_000_000_000n;
      expect(market.expireOldListings({ worldId: 'world-b' }).expiredCount).toBe(1);
      expect(market.purchaseListing({ listingId: listingResult.listingId, buyerId: 'late-buyer' })).toBe(
        'LISTING_INACTIVE',
      );
      expect(market.getActiveListings({ worldId: 'world-b' })).toHaveLength(0);
    }
  });

  it('applies enforcement and heat multiplier to increase detection chance over time', () => {
    const market = createBlackMarket(deps());
    market.raiseEnforcement({ worldId: 'world-c', level: 'CRACKDOWN' });

    const createListing = (sellerId: string) =>
      market.addListing({
        sellerId,
        worldId: 'world-c',
        itemType: 'contraband',
        quantity: 1,
        basePriceMicroKalon: 1_000n,
        premiumPercent: 20,
      });

    vi.spyOn(Math, 'random').mockReturnValue(0.8);
    const first = createListing('seller-1');
    expect(typeof first).not.toBe('string');
    if (typeof first !== 'string') {
      const firstPurchase = market.purchaseListing({ listingId: first.listingId, buyerId: 'buyer-1' });
      expect(typeof firstPurchase).not.toBe('string');
      if (typeof firstPurchase !== 'string') {
        expect(firstPurchase.detected).toBe(false);
      }
    }

    vi.spyOn(Math, 'random').mockReturnValue(0.62);
    const second = createListing('seller-2');
    expect(typeof second).not.toBe('string');
    if (typeof second !== 'string') {
      const secondPurchase = market.purchaseListing({ listingId: second.listingId, buyerId: 'buyer-2' });
      expect(typeof secondPurchase).not.toBe('string');
      if (typeof secondPurchase !== 'string') {
        expect(secondPurchase.detected).toBe(true);
      }
    }

    const heat = market.getHeatStatus({ worldId: 'world-c' });
    expect(heat?.heatLevel).toBe(10);
  });

  it('keeps world markets isolated for listings, heat, and stats', () => {
    const market = createBlackMarket(deps());

    const worldOneListing = market.addListing({
      sellerId: 'seller-w1',
      worldId: 'world-1',
      itemType: 'ore',
      quantity: 1,
      basePriceMicroKalon: 200n,
      premiumPercent: 40,
    });

    const worldTwoListing = market.addListing({
      sellerId: 'seller-w2',
      worldId: 'world-2',
      itemType: 'fuel',
      quantity: 1,
      basePriceMicroKalon: 300n,
      premiumPercent: 50,
    });

    expect(typeof worldOneListing).not.toBe('string');
    expect(typeof worldTwoListing).not.toBe('string');
    if (typeof worldOneListing !== 'string' && typeof worldTwoListing !== 'string') {
      market.purchaseListing({ listingId: worldOneListing.listingId, buyerId: 'buyer-1' });

      expect(market.getActiveListings({ worldId: 'world-1' })).toHaveLength(0);
      expect(market.getActiveListings({ worldId: 'world-2' })).toHaveLength(1);

      expect(market.getMarketStats({ worldId: 'world-1' }).totalTransactions).toBe(1);
      expect(market.getMarketStats({ worldId: 'world-2' }).totalTransactions).toBe(0);
      expect(market.getHeatStatus({ worldId: 'world-2' })).toBeNull();
    }
  });

  it('updates enforcement level without resetting accumulated heat', () => {
    const market = createBlackMarket(deps());
    const listingResult = market.addListing({
      sellerId: 'seller-d',
      worldId: 'world-d',
      itemType: 'chips',
      quantity: 1,
      basePriceMicroKalon: 100n,
      premiumPercent: 20,
    });

    expect(typeof listingResult).not.toBe('string');
    if (typeof listingResult !== 'string') {
      market.purchaseListing({ listingId: listingResult.listingId, buyerId: 'buyer-d' });
      const before = market.getHeatStatus({ worldId: 'world-d' });

      market.raiseEnforcement({ worldId: 'world-d', level: 'HIGH' });
      const after = market.getHeatStatus({ worldId: 'world-d' });

      expect(before?.heatLevel).toBe(5);
      expect(after?.heatLevel).toBe(5);
      expect(after?.enforcementLevel).toBe('HIGH');
    }
  });

  it('decays heat stepwise and clamps at zero for repeated ticks', () => {
    const market = createBlackMarket(deps());

    market.raiseEnforcement({ worldId: 'world-e', level: 'LOW' });
    expect(market.decayHeat({ worldId: 'world-e' }).newHeat).toBe(0);

    const listingResult = market.addListing({
      sellerId: 'seller-e',
      worldId: 'world-e',
      itemType: 'map',
      quantity: 1,
      basePriceMicroKalon: 100n,
      premiumPercent: 20,
    });

    expect(typeof listingResult).not.toBe('string');
    if (typeof listingResult !== 'string') {
      market.purchaseListing({ listingId: listingResult.listingId, buyerId: 'buyer-e' });
      expect(market.decayHeat({ worldId: 'world-e' }).newHeat).toBe(4);
      expect(market.decayHeat({ worldId: 'world-e' }).newHeat).toBe(3);
      expect(market.decayHeat({ worldId: 'world-e' }).newHeat).toBe(2);
      expect(market.decayHeat({ worldId: 'world-e' }).newHeat).toBe(1);
      expect(market.decayHeat({ worldId: 'world-e' }).newHeat).toBe(0);
      expect(market.decayHeat({ worldId: 'world-e' }).newHeat).toBe(0);
    }
  });

  it('records detection and clean-completion logs in the expected logger channels', () => {
    const market = createBlackMarket(deps());
    market.raiseEnforcement({ worldId: 'world-f', level: 'CRACKDOWN' });

    const detectedListing = market.addListing({
      sellerId: 'seller-f1',
      worldId: 'world-f',
      itemType: 'shard',
      quantity: 1,
      basePriceMicroKalon: 100n,
      premiumPercent: 20,
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.01);
    expect(typeof detectedListing).not.toBe('string');
    if (typeof detectedListing !== 'string') {
      market.purchaseListing({ listingId: detectedListing.listingId, buyerId: 'buyer-f1' });
    }

    const cleanListing = market.addListing({
      sellerId: 'seller-f2',
      worldId: 'world-g',
      itemType: 'fiber',
      quantity: 1,
      basePriceMicroKalon: 100n,
      premiumPercent: 20,
    });

    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(typeof cleanListing).not.toBe('string');
    if (typeof cleanListing !== 'string') {
      market.purchaseListing({ listingId: cleanListing.listingId, buyerId: 'buyer-f2' });
    }

    expect(warnLogs.some((entry) => entry.msg.includes('detected'))).toBe(true);
    expect(infoLogs.some((entry) => entry.msg.includes('completed'))).toBe(true);
  });

  it('computes average premium from sold listings only', () => {
    const market = createBlackMarket(deps());
    const sold = market.addListing({
      sellerId: 'seller-g1',
      worldId: 'world-h',
      itemType: 'ore',
      quantity: 1,
      basePriceMicroKalon: 100n,
      premiumPercent: 40,
    });

    const active = market.addListing({
      sellerId: 'seller-g2',
      worldId: 'world-h',
      itemType: 'ore',
      quantity: 1,
      basePriceMicroKalon: 100n,
      premiumPercent: 100,
    });

    expect(typeof sold).not.toBe('string');
    expect(typeof active).not.toBe('string');
    if (typeof sold !== 'string') {
      market.purchaseListing({ listingId: sold.listingId, buyerId: 'buyer-g' });
      const stats = market.getMarketStats({ worldId: 'world-h' });
      expect(stats.averagePremium).toBe(40);
      expect(stats.activeListings).toBe(1);
    }
  });

  it('generates deterministic ids for listings and transactions', () => {
    const market = createBlackMarket(deps());
    const listing = market.addListing({
      sellerId: 'seller-id',
      worldId: 'world-id',
      itemType: 'cache',
      quantity: 1,
      basePriceMicroKalon: 10n,
      premiumPercent: 20,
    });

    expect(typeof listing).not.toBe('string');
    if (typeof listing !== 'string') {
      const purchase = market.purchaseListing({ listingId: listing.listingId, buyerId: 'buyer-id' });
      expect(listing.listingId).toBe('sim-black-1');
      expect(typeof purchase).not.toBe('string');
      if (typeof purchase !== 'string') {
        expect(purchase.transactionId).toBe('sim-black-2');
      }
    }
  });
});
