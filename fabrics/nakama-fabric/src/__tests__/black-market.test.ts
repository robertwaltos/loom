/**
 * black-market.test.ts
 * Tests for black market system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createBlackMarket, type BlackMarketDeps } from '../black-market.js';

describe('BlackMarket', () => {
  let mockTime = 1000000n;
  let idCounter = 0;

  const mockDeps: BlackMarketDeps = {
    clock: { nowMicroseconds: () => mockTime },
    idGen: { generate: () => 'id-' + String(idCounter++) },
    logger: {
      info: () => {},
      warn: () => {},
    },
  };

  beforeEach(() => {
    mockTime = 1000000n;
    idCounter = 0;
    vi.restoreAllMocks();
  });

  describe('addListing', () => {
    it('should create a black market listing', () => {
      const module = createBlackMarket(mockDeps);
      const result = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.listingId).toBe('id-0');
        expect(result.listing.active).toBe(true);
      }
    });

    it('should reject premium below minimum', () => {
      const module = createBlackMarket(mockDeps);
      const result = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 10,
      });

      expect(result).toBe('PREMIUM_TOO_LOW');
    });

    it('should reject premium above maximum', () => {
      const module = createBlackMarket(mockDeps);
      const result = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 250,
      });

      expect(result).toBe('PREMIUM_TOO_HIGH');
    });

    it('should calculate final price with premium', () => {
      const module = createBlackMarket(mockDeps);
      const result = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.listing.finalPriceMicroKalon).toBe(1_500_000n);
      }
    });

    it('should set expiration time', () => {
      const module = createBlackMarket(mockDeps);
      const result = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.listing.expiresAtMicros).toBeGreaterThan(mockTime);
      }
    });

    it('should handle minimum premium', () => {
      const module = createBlackMarket(mockDeps);
      const result = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 20,
      });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.listing.finalPriceMicroKalon).toBe(1_200_000n);
      }
    });

    it('should handle maximum premium', () => {
      const module = createBlackMarket(mockDeps);
      const result = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 200,
      });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.listing.finalPriceMicroKalon).toBe(3_000_000n);
      }
    });
  });

  describe('purchaseListing', () => {
    it('should return error if listing not found', () => {
      const module = createBlackMarket(mockDeps);
      const result = module.purchaseListing({
        listingId: 'nonexistent',
        buyerId: 'buyer-1',
      });

      expect(result).toBe('LISTING_NOT_FOUND');
    });

    it('should return error if listing inactive', () => {
      const module = createBlackMarket(mockDeps);
      const addResult = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      if (typeof addResult === 'object') {
        module.purchaseListing({ listingId: addResult.listingId, buyerId: 'buyer-1' });
        const result = module.purchaseListing({
          listingId: addResult.listingId,
          buyerId: 'buyer-2',
        });

        expect(result).toBe('LISTING_INACTIVE');
      }
    });

    it('should return error if listing expired', () => {
      const module = createBlackMarket(mockDeps);
      const addResult = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      mockTime = mockTime + 90_000_000_000n;

      if (typeof addResult === 'object') {
        const result = module.purchaseListing({
          listingId: addResult.listingId,
          buyerId: 'buyer-1',
        });

        expect(result).toBe('LISTING_EXPIRED');
      }
    });

    it('should complete purchase successfully', () => {
      const module = createBlackMarket(mockDeps);
      const addResult = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      if (typeof addResult === 'object') {
        const result = module.purchaseListing({
          listingId: addResult.listingId,
          buyerId: 'buyer-1',
        });

        expect(typeof result).toBe('object');
        if (typeof result === 'object') {
          expect(result.transactionId).toBeDefined();
          expect(typeof result.detected).toBe('boolean');
        }
      }
    });

    it('should deactivate listing after purchase', () => {
      const module = createBlackMarket(mockDeps);
      const addResult = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      if (typeof addResult === 'object') {
        module.purchaseListing({ listingId: addResult.listingId, buyerId: 'buyer-1' });

        const active = module.getActiveListings({ worldId: 'world-1' });
        expect(active.length).toBe(0);
      }
    });

    it('should increase market heat on purchase', () => {
      const module = createBlackMarket(mockDeps);
      const addResult = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      if (typeof addResult === 'object') {
        module.purchaseListing({ listingId: addResult.listingId, buyerId: 'buyer-1' });

        const heat = module.getHeatStatus({ worldId: 'world-1' });
        expect(heat).not.toBeNull();
        if (heat !== null) {
          expect(heat.heatLevel).toBeGreaterThan(0);
        }
      }
    });

    it('should detect transactions based on enforcement level', () => {
      const module = createBlackMarket(mockDeps);
      vi.spyOn(Math, 'random').mockReturnValue(0.01);

      module.raiseEnforcement({ worldId: 'world-1', level: 'CRACKDOWN' });

      const addResult = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      if (typeof addResult === 'object') {
        const result = module.purchaseListing({
          listingId: addResult.listingId,
          buyerId: 'buyer-1',
        });

        expect(typeof result).toBe('object');
        if (typeof result === 'object') {
          expect(result.detected).toBe(true);
        }
      }
    });

    it('should track transaction count', () => {
      const module = createBlackMarket(mockDeps);
      const addResult = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      if (typeof addResult === 'object') {
        module.purchaseListing({ listingId: addResult.listingId, buyerId: 'buyer-1' });

        const stats = module.getMarketStats({ worldId: 'world-1' });
        expect(stats.totalTransactions).toBe(1);
      }
    });
  });

  describe('raiseEnforcement', () => {
    it('should set enforcement level', () => {
      const module = createBlackMarket(mockDeps);
      const result = module.raiseEnforcement({ worldId: 'world-1', level: 'HIGH' });

      expect(result.updated).toBe(true);
    });

    it('should handle all enforcement levels', () => {
      const module = createBlackMarket(mockDeps);
      const levels = ['LOW', 'MODERATE', 'HIGH', 'CRACKDOWN'] as const;

      for (const level of levels) {
        const result = module.raiseEnforcement({ worldId: 'world-1', level });
        expect(result.updated).toBe(true);
      }
    });

    it('should create heat record if none exists', () => {
      const module = createBlackMarket(mockDeps);
      module.raiseEnforcement({ worldId: 'world-1', level: 'MODERATE' });

      const heat = module.getHeatStatus({ worldId: 'world-1' });
      expect(heat).not.toBeNull();
      if (heat !== null) {
        expect(heat.enforcementLevel).toBe('MODERATE');
      }
    });

    it('should update existing enforcement level', () => {
      const module = createBlackMarket(mockDeps);
      module.raiseEnforcement({ worldId: 'world-1', level: 'LOW' });
      module.raiseEnforcement({ worldId: 'world-1', level: 'HIGH' });

      const heat = module.getHeatStatus({ worldId: 'world-1' });
      expect(heat).not.toBeNull();
      if (heat !== null) {
        expect(heat.enforcementLevel).toBe('HIGH');
      }
    });
  });

  describe('getActiveListings', () => {
    it('should return active listings for world', () => {
      const module = createBlackMarket(mockDeps);
      module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      const listings = module.getActiveListings({ worldId: 'world-1' });
      expect(listings.length).toBe(1);
    });

    it('should exclude inactive listings', () => {
      const module = createBlackMarket(mockDeps);
      const addResult = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      if (typeof addResult === 'object') {
        module.purchaseListing({ listingId: addResult.listingId, buyerId: 'buyer-1' });
      }

      const listings = module.getActiveListings({ worldId: 'world-1' });
      expect(listings.length).toBe(0);
    });

    it('should exclude expired listings', () => {
      const module = createBlackMarket(mockDeps);
      module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      mockTime = mockTime + 90_000_000_000n;

      const listings = module.getActiveListings({ worldId: 'world-1' });
      expect(listings.length).toBe(0);
    });

    it('should filter by world ID', () => {
      const module = createBlackMarket(mockDeps);
      module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });
      module.addListing({
        sellerId: 'seller-2',
        worldId: 'world-2',
        itemType: 'contraband-weapons',
        quantity: 5,
        basePriceMicroKalon: 500_000n,
        premiumPercent: 60,
      });

      const listings = module.getActiveListings({ worldId: 'world-1' });
      expect(listings.length).toBe(1);
      expect(listings[0]?.worldId).toBe('world-1');
    });

    it('should return empty array if no active listings', () => {
      const module = createBlackMarket(mockDeps);
      const listings = module.getActiveListings({ worldId: 'world-1' });

      expect(listings.length).toBe(0);
    });
  });

  describe('getMarketStats', () => {
    it('should return stats for world', () => {
      const module = createBlackMarket(mockDeps);
      const stats = module.getMarketStats({ worldId: 'world-1' });

      expect(stats.worldId).toBe('world-1');
      expect(stats.activeListings).toBe(0);
      expect(stats.totalTransactions).toBe(0);
    });

    it('should count active listings', () => {
      const module = createBlackMarket(mockDeps);
      module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });
      module.addListing({
        sellerId: 'seller-2',
        worldId: 'world-1',
        itemType: 'contraband-drugs',
        quantity: 5,
        basePriceMicroKalon: 500_000n,
        premiumPercent: 60,
      });

      const stats = module.getMarketStats({ worldId: 'world-1' });
      expect(stats.activeListings).toBe(2);
    });

    it('should track total volume', () => {
      const module = createBlackMarket(mockDeps);
      const addResult = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      if (typeof addResult === 'object') {
        module.purchaseListing({ listingId: addResult.listingId, buyerId: 'buyer-1' });
      }

      const stats = module.getMarketStats({ worldId: 'world-1' });
      expect(stats.volumeMicroKalon).toBe(1_500_000n);
    });

    it('should calculate average premium', () => {
      const module = createBlackMarket(mockDeps);
      const add1 = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });
      const add2 = module.addListing({
        sellerId: 'seller-2',
        worldId: 'world-1',
        itemType: 'contraband-drugs',
        quantity: 5,
        basePriceMicroKalon: 500_000n,
        premiumPercent: 100,
      });

      if (typeof add1 === 'object') {
        module.purchaseListing({ listingId: add1.listingId, buyerId: 'buyer-1' });
      }
      if (typeof add2 === 'object') {
        module.purchaseListing({ listingId: add2.listingId, buyerId: 'buyer-2' });
      }

      const stats = module.getMarketStats({ worldId: 'world-1' });
      expect(stats.averagePremium).toBe(75);
    });

    it('should calculate detection rate', () => {
      const module = createBlackMarket(mockDeps);
      vi.spyOn(Math, 'random').mockReturnValue(0.01);

      module.raiseEnforcement({ worldId: 'world-1', level: 'CRACKDOWN' });

      const add1 = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      if (typeof add1 === 'object') {
        module.purchaseListing({ listingId: add1.listingId, buyerId: 'buyer-1' });
      }

      const stats = module.getMarketStats({ worldId: 'world-1' });
      expect(stats.detectionRate).toBeGreaterThan(0);
    });
  });

  describe('expireOldListings', () => {
    it('should expire listings past expiration time', () => {
      const module = createBlackMarket(mockDeps);
      module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      mockTime = mockTime + 90_000_000_000n;

      const result = module.expireOldListings({ worldId: 'world-1' });
      expect(result.expiredCount).toBe(1);
    });

    it('should not expire active listings within time', () => {
      const module = createBlackMarket(mockDeps);
      module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      const result = module.expireOldListings({ worldId: 'world-1' });
      expect(result.expiredCount).toBe(0);
    });

    it('should not expire already inactive listings', () => {
      const module = createBlackMarket(mockDeps);
      const addResult = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      if (typeof addResult === 'object') {
        module.purchaseListing({ listingId: addResult.listingId, buyerId: 'buyer-1' });
      }

      mockTime = mockTime + 90_000_000_000n;

      const result = module.expireOldListings({ worldId: 'world-1' });
      expect(result.expiredCount).toBe(0);
    });

    it('should filter by world ID', () => {
      const module = createBlackMarket(mockDeps);
      module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });
      module.addListing({
        sellerId: 'seller-2',
        worldId: 'world-2',
        itemType: 'contraband-drugs',
        quantity: 5,
        basePriceMicroKalon: 500_000n,
        premiumPercent: 60,
      });

      mockTime = mockTime + 90_000_000_000n;

      const result = module.expireOldListings({ worldId: 'world-1' });
      expect(result.expiredCount).toBe(1);
    });
  });

  describe('decayHeat', () => {
    it('should decay heat by decay rate', () => {
      const module = createBlackMarket(mockDeps);
      const addResult = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      if (typeof addResult === 'object') {
        module.purchaseListing({ listingId: addResult.listingId, buyerId: 'buyer-1' });
      }

      const heatBefore = module.getHeatStatus({ worldId: 'world-1' });
      module.decayHeat({ worldId: 'world-1' });
      const heatAfter = module.getHeatStatus({ worldId: 'world-1' });

      if (heatBefore !== null && heatAfter !== null) {
        expect(heatAfter.heatLevel).toBeLessThan(heatBefore.heatLevel);
      }
    });

    it('should not decay below zero', () => {
      const module = createBlackMarket(mockDeps);
      module.raiseEnforcement({ worldId: 'world-1', level: 'LOW' });

      module.decayHeat({ worldId: 'world-1' });
      module.decayHeat({ worldId: 'world-1' });

      const heat = module.getHeatStatus({ worldId: 'world-1' });
      expect(heat).not.toBeNull();
      if (heat !== null) {
        expect(heat.heatLevel).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return zero if no heat record', () => {
      const module = createBlackMarket(mockDeps);
      const result = module.decayHeat({ worldId: 'world-1' });

      expect(result.newHeat).toBe(0);
    });
  });

  describe('getHeatStatus', () => {
    it('should return null if no heat record', () => {
      const module = createBlackMarket(mockDeps);
      const heat = module.getHeatStatus({ worldId: 'world-1' });

      expect(heat).toBeNull();
    });

    it('should return heat status', () => {
      const module = createBlackMarket(mockDeps);
      module.raiseEnforcement({ worldId: 'world-1', level: 'MODERATE' });

      const heat = module.getHeatStatus({ worldId: 'world-1' });

      expect(heat).not.toBeNull();
      if (heat !== null) {
        expect(heat.worldId).toBe('world-1');
        expect(heat.enforcementLevel).toBe('MODERATE');
      }
    });

    it('should reflect current heat level', () => {
      const module = createBlackMarket(mockDeps);
      const addResult = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      if (typeof addResult === 'object') {
        module.purchaseListing({ listingId: addResult.listingId, buyerId: 'buyer-1' });
      }

      const heat = module.getHeatStatus({ worldId: 'world-1' });

      expect(heat).not.toBeNull();
      if (heat !== null) {
        expect(heat.heatLevel).toBeGreaterThan(0);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle zero quantity listings', () => {
      const module = createBlackMarket(mockDeps);
      const result = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 0,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      expect(typeof result).toBe('object');
    });

    it('should handle multiple worlds independently', () => {
      const module = createBlackMarket(mockDeps);
      module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });
      module.addListing({
        sellerId: 'seller-2',
        worldId: 'world-2',
        itemType: 'contraband-drugs',
        quantity: 5,
        basePriceMicroKalon: 500_000n,
        premiumPercent: 60,
      });

      const listings1 = module.getActiveListings({ worldId: 'world-1' });
      const listings2 = module.getActiveListings({ worldId: 'world-2' });

      expect(listings1.length).toBe(1);
      expect(listings2.length).toBe(1);
    });

    it('should handle large price values', () => {
      const module = createBlackMarket(mockDeps);
      const result = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 100,
        basePriceMicroKalon: 1_000_000_000n,
        premiumPercent: 100,
      });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.listing.finalPriceMicroKalon).toBe(2_000_000_000n);
      }
    });

    it('should handle rapid transactions', () => {
      const module = createBlackMarket(mockDeps);
      const ids = [];

      for (let i = 0; i < 5; i = i + 1) {
        const addResult = module.addListing({
          sellerId: 'seller-' + String(i),
          worldId: 'world-1',
          itemType: 'contraband-weapons',
          quantity: 10,
          basePriceMicroKalon: 1_000_000n,
          premiumPercent: 50,
        });

        if (typeof addResult === 'object') {
          ids.push(addResult.listingId);
        }
      }

      for (const id of ids) {
        module.purchaseListing({ listingId: id, buyerId: 'buyer-1' });
      }

      const stats = module.getMarketStats({ worldId: 'world-1' });
      expect(stats.totalTransactions).toBe(5);
    });

    it('should preserve listing data after expiration check', () => {
      const module = createBlackMarket(mockDeps);
      module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      module.expireOldListings({ worldId: 'world-1' });

      const listings = module.getActiveListings({ worldId: 'world-1' });
      expect(listings.length).toBe(1);
      expect(listings[0]?.quantity).toBe(10);
    });

    it('should handle enforcement level changes during active listings', () => {
      const module = createBlackMarket(mockDeps);
      module.raiseEnforcement({ worldId: 'world-1', level: 'LOW' });

      module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 1_000_000n,
        premiumPercent: 50,
      });

      module.raiseEnforcement({ worldId: 'world-1', level: 'CRACKDOWN' });

      const listings = module.getActiveListings({ worldId: 'world-1' });
      expect(listings.length).toBe(1);
    });

    it('should handle zero base price', () => {
      const module = createBlackMarket(mockDeps);
      const result = module.addListing({
        sellerId: 'seller-1',
        worldId: 'world-1',
        itemType: 'contraband-weapons',
        quantity: 10,
        basePriceMicroKalon: 0n,
        premiumPercent: 50,
      });

      expect(typeof result).toBe('object');
      if (typeof result === 'object') {
        expect(result.listing.finalPriceMicroKalon).toBe(0n);
      }
    });
  });
});
