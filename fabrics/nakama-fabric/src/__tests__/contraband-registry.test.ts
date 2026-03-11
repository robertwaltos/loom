/**
 * contraband-registry.test.ts
 * Tests for contraband registry system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createContrabandRegistry, type ContrabandRegistryDeps } from '../contraband-registry.js';

describe('ContrabandRegistry', () => {
  let mockTime = 1000000n;
  let idCounter = 0;

  const mockDeps: ContrabandRegistryDeps = {
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
  });

  describe('addProhibitionRule', () => {
    it('should add a prohibition rule', () => {
      const module = createContrabandRegistry(mockDeps);
      const result = module.addProhibitionRule({
        worldId: 'world-1',
        itemType: 'weapons',
        reason: 'public safety',
        penaltyMicroKalon: 5_000_000n,
      });

      expect(result.ruleId).toBe('id-0');
      expect(result.rule.itemType).toBe('weapons');
    });

    it('should record timestamp of ban', () => {
      const module = createContrabandRegistry(mockDeps);
      const result = module.addProhibitionRule({
        worldId: 'world-1',
        itemType: 'weapons',
        reason: 'public safety',
        penaltyMicroKalon: 5_000_000n,
      });

      expect(result.rule.bannedAtMicros).toBe(mockTime);
    });

    it('should track prohibited goods per world', () => {
      const module = createContrabandRegistry(mockDeps);
      module.addProhibitionRule({
        worldId: 'world-1',
        itemType: 'weapons',
        reason: 'public safety',
        penaltyMicroKalon: 5_000_000n,
      });

      const isProhibited = module.isProhibited({ worldId: 'world-1', itemType: 'weapons' });
      expect(isProhibited).toBe(true);
    });

    it('should handle multiple prohibitions per world', () => {
      const module = createContrabandRegistry(mockDeps);
      module.addProhibitionRule({
        worldId: 'world-1',
        itemType: 'weapons',
        reason: 'public safety',
        penaltyMicroKalon: 5_000_000n,
      });
      module.addProhibitionRule({
        worldId: 'world-1',
        itemType: 'drugs',
        reason: 'health concerns',
        penaltyMicroKalon: 3_000_000n,
      });

      const prohibited = module.listProhibitedGoods({ worldId: 'world-1' });
      expect(prohibited.length).toBe(2);
    });

    it('should store penalty amount', () => {
      const module = createContrabandRegistry(mockDeps);
      const result = module.addProhibitionRule({
        worldId: 'world-1',
        itemType: 'weapons',
        reason: 'public safety',
        penaltyMicroKalon: 5_000_000n,
      });

      expect(result.rule.penaltyMicroKalon).toBe(5_000_000n);
    });
  });

  describe('recordSmuggleAttempt', () => {
    it('should create new route on first attempt', () => {
      const module = createContrabandRegistry(mockDeps);
      const result = module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: true,
      });

      expect(result.routeId).toBeDefined();
      expect(result.risk).toBeDefined();
    });

    it('should calculate risk for successful route', () => {
      const module = createContrabandRegistry(mockDeps);
      const result = module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: true,
      });

      expect(result.risk).toBe('MODERATE');
    });

    it('should calculate risk for failed route', () => {
      const module = createContrabandRegistry(mockDeps);
      const result = module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: false,
      });

      expect(result.risk).toBe('MODERATE');
    });

    it('should update route on subsequent attempts', () => {
      const module = createContrabandRegistry(mockDeps);
      const result1 = module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: true,
      });

      const result2 = module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: true,
      });

      expect(result1.routeId).toBe(result2.routeId);
    });

    it('should increase risk with more failures', () => {
      const module = createContrabandRegistry(mockDeps);
      module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: false,
      });
      module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: false,
      });
      module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: false,
      });

      const result = module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: false,
      });

      expect(['HIGH', 'EXTREME']).toContain(result.risk);
    });

    it('should decrease risk with more successes', () => {
      const module = createContrabandRegistry(mockDeps);
      module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: true,
      });
      module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: true,
      });
      module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: true,
      });

      const result = module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: true,
      });

      expect(['NEGLIGIBLE', 'LOW', 'MODERATE']).toContain(result.risk);
    });

    it('should track separate routes per item type', () => {
      const module = createContrabandRegistry(mockDeps);
      const result1 = module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: true,
      });
      const result2 = module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'drugs',
        success: true,
      });

      expect(result1.routeId).not.toBe(result2.routeId);
    });
  });

  describe('recordSeizure', () => {
    it('should record a seizure', () => {
      const module = createContrabandRegistry(mockDeps);
      const result = module.recordSeizure({
        worldId: 'world-1',
        dynastyId: 'dynasty-1',
        itemType: 'weapons',
        quantity: 10,
        baseValueMicroKalon: 100_000n,
        routeId: null,
        enforcerDynastyId: 'dynasty-2',
      });

      expect(result.seizureId).toBeDefined();
      expect(result.seizure.quantity).toBe(10);
    });

    it('should calculate estimated value with risk multiplier', () => {
      const module = createContrabandRegistry(mockDeps);
      const routeResult = module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: false,
      });

      for (let i = 0; i < 10; i = i + 1) {
        module.recordSmuggleAttempt({
          fromWorldId: 'world-1',
          toWorldId: 'world-2',
          itemType: 'weapons',
          success: false,
        });
      }

      const result = module.recordSeizure({
        worldId: 'world-1',
        dynastyId: 'dynasty-1',
        itemType: 'weapons',
        quantity: 10,
        baseValueMicroKalon: 100_000n,
        routeId: routeResult.routeId,
        enforcerDynastyId: 'dynasty-2',
      });

      expect(result.seizure.estimatedValueMicroKalon).toBeGreaterThan(1_000_000n);
    });

    it('should use moderate risk if no route provided', () => {
      const module = createContrabandRegistry(mockDeps);
      const result = module.recordSeizure({
        worldId: 'world-1',
        dynastyId: 'dynasty-1',
        itemType: 'weapons',
        quantity: 10,
        baseValueMicroKalon: 100_000n,
        routeId: null,
        enforcerDynastyId: 'dynasty-2',
      });

      expect(result.seizure.estimatedValueMicroKalon).toBe(2_500_000n);
    });

    it('should record timestamp', () => {
      const module = createContrabandRegistry(mockDeps);
      const result = module.recordSeizure({
        worldId: 'world-1',
        dynastyId: 'dynasty-1',
        itemType: 'weapons',
        quantity: 10,
        baseValueMicroKalon: 100_000n,
        routeId: null,
        enforcerDynastyId: 'dynasty-2',
      });

      expect(result.seizure.timestampMicros).toBe(mockTime);
    });

    it('should link to route if provided', () => {
      const module = createContrabandRegistry(mockDeps);
      const routeResult = module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: false,
      });

      const result = module.recordSeizure({
        worldId: 'world-1',
        dynastyId: 'dynasty-1',
        itemType: 'weapons',
        quantity: 10,
        baseValueMicroKalon: 100_000n,
        routeId: routeResult.routeId,
        enforcerDynastyId: 'dynasty-2',
      });

      expect(result.seizure.routeId).toBe(routeResult.routeId);
    });
  });

  describe('getRouteRisk', () => {
    it('should return null if route does not exist', () => {
      const module = createContrabandRegistry(mockDeps);
      const risk = module.getRouteRisk({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
      });

      expect(risk).toBeNull();
    });

    it('should return risk for existing route', () => {
      const module = createContrabandRegistry(mockDeps);
      module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: true,
      });

      const risk = module.getRouteRisk({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
      });

      expect(risk).toBeDefined();
    });

    it('should reflect updated risk', () => {
      const module = createContrabandRegistry(mockDeps);
      module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: false,
      });
      module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: false,
      });

      const risk = module.getRouteRisk({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
      });

      expect(risk).not.toBeNull();
    });
  });

  describe('getSeizureReport', () => {
    it('should return seizures for world', () => {
      const module = createContrabandRegistry(mockDeps);
      module.recordSeizure({
        worldId: 'world-1',
        dynastyId: 'dynasty-1',
        itemType: 'weapons',
        quantity: 10,
        baseValueMicroKalon: 100_000n,
        routeId: null,
        enforcerDynastyId: 'dynasty-2',
      });

      const report = module.getSeizureReport({ worldId: 'world-1', limit: 10 });

      expect(report.length).toBe(1);
    });

    it('should limit results', () => {
      const module = createContrabandRegistry(mockDeps);
      module.recordSeizure({
        worldId: 'world-1',
        dynastyId: 'dynasty-1',
        itemType: 'weapons',
        quantity: 10,
        baseValueMicroKalon: 100_000n,
        routeId: null,
        enforcerDynastyId: 'dynasty-2',
      });
      module.recordSeizure({
        worldId: 'world-1',
        dynastyId: 'dynasty-1',
        itemType: 'drugs',
        quantity: 5,
        baseValueMicroKalon: 50_000n,
        routeId: null,
        enforcerDynastyId: 'dynasty-2',
      });
      module.recordSeizure({
        worldId: 'world-1',
        dynastyId: 'dynasty-1',
        itemType: 'tech',
        quantity: 2,
        baseValueMicroKalon: 200_000n,
        routeId: null,
        enforcerDynastyId: 'dynasty-2',
      });

      const report = module.getSeizureReport({ worldId: 'world-1', limit: 2 });

      expect(report.length).toBe(2);
    });

    it('should return in reverse chronological order', () => {
      const module = createContrabandRegistry(mockDeps);
      module.recordSeizure({
        worldId: 'world-1',
        dynastyId: 'dynasty-1',
        itemType: 'weapons',
        quantity: 10,
        baseValueMicroKalon: 100_000n,
        routeId: null,
        enforcerDynastyId: 'dynasty-2',
      });

      mockTime = 2000000n;
      module.recordSeizure({
        worldId: 'world-1',
        dynastyId: 'dynasty-1',
        itemType: 'drugs',
        quantity: 5,
        baseValueMicroKalon: 50_000n,
        routeId: null,
        enforcerDynastyId: 'dynasty-2',
      });

      const report = module.getSeizureReport({ worldId: 'world-1', limit: 10 });

      expect(report[0]?.timestampMicros).toBeGreaterThanOrEqual(report[1]?.timestampMicros ?? 0n);
    });

    it('should filter by world', () => {
      const module = createContrabandRegistry(mockDeps);
      module.recordSeizure({
        worldId: 'world-1',
        dynastyId: 'dynasty-1',
        itemType: 'weapons',
        quantity: 10,
        baseValueMicroKalon: 100_000n,
        routeId: null,
        enforcerDynastyId: 'dynasty-2',
      });
      module.recordSeizure({
        worldId: 'world-2',
        dynastyId: 'dynasty-1',
        itemType: 'drugs',
        quantity: 5,
        baseValueMicroKalon: 50_000n,
        routeId: null,
        enforcerDynastyId: 'dynasty-2',
      });

      const report = module.getSeizureReport({ worldId: 'world-1', limit: 10 });

      expect(report.length).toBe(1);
      expect(report[0]?.worldId).toBe('world-1');
    });
  });

  describe('listProhibitedGoods', () => {
    it('should return prohibited goods for world', () => {
      const module = createContrabandRegistry(mockDeps);
      module.addProhibitionRule({
        worldId: 'world-1',
        itemType: 'weapons',
        reason: 'public safety',
        penaltyMicroKalon: 5_000_000n,
      });

      const prohibited = module.listProhibitedGoods({ worldId: 'world-1' });

      expect(prohibited.length).toBe(1);
    });

    it('should filter by world', () => {
      const module = createContrabandRegistry(mockDeps);
      module.addProhibitionRule({
        worldId: 'world-1',
        itemType: 'weapons',
        reason: 'public safety',
        penaltyMicroKalon: 5_000_000n,
      });
      module.addProhibitionRule({
        worldId: 'world-2',
        itemType: 'drugs',
        reason: 'health concerns',
        penaltyMicroKalon: 3_000_000n,
      });

      const prohibited = module.listProhibitedGoods({ worldId: 'world-1' });

      expect(prohibited.length).toBe(1);
      expect(prohibited[0]?.worldId).toBe('world-1');
    });

    it('should return empty array if no prohibitions', () => {
      const module = createContrabandRegistry(mockDeps);
      const prohibited = module.listProhibitedGoods({ worldId: 'world-1' });

      expect(prohibited.length).toBe(0);
    });
  });

  describe('registerContrabandItem', () => {
    it('should register a contraband item', () => {
      const module = createContrabandRegistry(mockDeps);
      const result = module.registerContrabandItem({
        itemType: 'weapons',
        description: 'military-grade firearms',
        baseValueMicroKalon: 1_000_000n,
        riskLevel: 'HIGH',
      });

      expect(result.itemId).toBeDefined();
      expect(result.item.itemType).toBe('weapons');
    });

    it('should store item details', () => {
      const module = createContrabandRegistry(mockDeps);
      const result = module.registerContrabandItem({
        itemType: 'weapons',
        description: 'military-grade firearms',
        baseValueMicroKalon: 1_000_000n,
        riskLevel: 'HIGH',
      });

      expect(result.item.description).toBe('military-grade firearms');
      expect(result.item.baseValueMicroKalon).toBe(1_000_000n);
      expect(result.item.riskLevel).toBe('HIGH');
    });

    it('should handle all risk levels', () => {
      const module = createContrabandRegistry(mockDeps);
      const levels = ['NEGLIGIBLE', 'LOW', 'MODERATE', 'HIGH', 'EXTREME'] as const;

      for (const level of levels) {
        const result = module.registerContrabandItem({
          itemType: 'item-' + level,
          description: 'test item',
          baseValueMicroKalon: 1_000_000n,
          riskLevel: level,
        });

        expect(result.item.riskLevel).toBe(level);
      }
    });
  });

  describe('isProhibited', () => {
    it('should return false if not prohibited', () => {
      const module = createContrabandRegistry(mockDeps);
      const result = module.isProhibited({ worldId: 'world-1', itemType: 'weapons' });

      expect(result).toBe(false);
    });

    it('should return true if prohibited', () => {
      const module = createContrabandRegistry(mockDeps);
      module.addProhibitionRule({
        worldId: 'world-1',
        itemType: 'weapons',
        reason: 'public safety',
        penaltyMicroKalon: 5_000_000n,
      });

      const result = module.isProhibited({ worldId: 'world-1', itemType: 'weapons' });

      expect(result).toBe(true);
    });

    it('should be world-specific', () => {
      const module = createContrabandRegistry(mockDeps);
      module.addProhibitionRule({
        worldId: 'world-1',
        itemType: 'weapons',
        reason: 'public safety',
        penaltyMicroKalon: 5_000_000n,
      });

      const result1 = module.isProhibited({ worldId: 'world-1', itemType: 'weapons' });
      const result2 = module.isProhibited({ worldId: 'world-2', itemType: 'weapons' });

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });
  });

  describe('getTotalSeizureValue', () => {
    it('should return zero if no seizures', () => {
      const module = createContrabandRegistry(mockDeps);
      const total = module.getTotalSeizureValue({ worldId: 'world-1' });

      expect(total).toBe(0n);
    });

    it('should sum all seizure values', () => {
      const module = createContrabandRegistry(mockDeps);
      module.recordSeizure({
        worldId: 'world-1',
        dynastyId: 'dynasty-1',
        itemType: 'weapons',
        quantity: 10,
        baseValueMicroKalon: 100_000n,
        routeId: null,
        enforcerDynastyId: 'dynasty-2',
      });
      module.recordSeizure({
        worldId: 'world-1',
        dynastyId: 'dynasty-1',
        itemType: 'drugs',
        quantity: 5,
        baseValueMicroKalon: 50_000n,
        routeId: null,
        enforcerDynastyId: 'dynasty-2',
      });

      const total = module.getTotalSeizureValue({ worldId: 'world-1' });

      expect(total).toBe(3_750_000n);
    });

    it('should filter by world', () => {
      const module = createContrabandRegistry(mockDeps);
      module.recordSeizure({
        worldId: 'world-1',
        dynastyId: 'dynasty-1',
        itemType: 'weapons',
        quantity: 10,
        baseValueMicroKalon: 100_000n,
        routeId: null,
        enforcerDynastyId: 'dynasty-2',
      });
      module.recordSeizure({
        worldId: 'world-2',
        dynastyId: 'dynasty-1',
        itemType: 'drugs',
        quantity: 5,
        baseValueMicroKalon: 50_000n,
        routeId: null,
        enforcerDynastyId: 'dynasty-2',
      });

      const total = module.getTotalSeizureValue({ worldId: 'world-1' });

      expect(total).toBe(2_500_000n);
    });
  });

  describe('getRoutesByRisk', () => {
    it('should return routes by risk level', () => {
      const module = createContrabandRegistry(mockDeps);
      module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: true,
      });

      const routes = module.getRoutesByRisk({ risk: 'MODERATE' });

      expect(routes.length).toBeGreaterThan(0);
    });

    it('should filter by risk level', () => {
      const module = createContrabandRegistry(mockDeps);
      module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: true,
      });

      for (let i = 0; i < 20; i = i + 1) {
        module.recordSmuggleAttempt({
          fromWorldId: 'world-1',
          toWorldId: 'world-2',
          itemType: 'weapons',
          success: true,
        });
      }

      const routes = module.getRoutesByRisk({ risk: 'NEGLIGIBLE' });

      const allMatch = routes.every((r) => r.risk === 'NEGLIGIBLE');
      expect(allMatch).toBe(true);
    });

    it('should return empty array if no matches', () => {
      const module = createContrabandRegistry(mockDeps);
      const routes = module.getRoutesByRisk({ risk: 'EXTREME' });

      expect(routes.length).toBe(0);
    });

    it('should handle multiple routes', () => {
      const module = createContrabandRegistry(mockDeps);
      module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: true,
      });
      module.recordSmuggleAttempt({
        fromWorldId: 'world-3',
        toWorldId: 'world-4',
        itemType: 'drugs',
        success: true,
      });

      const routes = module.getRoutesByRisk({ risk: 'MODERATE' });

      expect(routes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('edge cases', () => {
    it('should handle zero quantity seizures', () => {
      const module = createContrabandRegistry(mockDeps);
      const result = module.recordSeizure({
        worldId: 'world-1',
        dynastyId: 'dynasty-1',
        itemType: 'weapons',
        quantity: 0,
        baseValueMicroKalon: 100_000n,
        routeId: null,
        enforcerDynastyId: 'dynasty-2',
      });

      expect(result.seizure.estimatedValueMicroKalon).toBe(0n);
    });

    it('should handle zero base value', () => {
      const module = createContrabandRegistry(mockDeps);
      const result = module.recordSeizure({
        worldId: 'world-1',
        dynastyId: 'dynasty-1',
        itemType: 'weapons',
        quantity: 10,
        baseValueMicroKalon: 0n,
        routeId: null,
        enforcerDynastyId: 'dynasty-2',
      });

      expect(result.seizure.estimatedValueMicroKalon).toBe(0n);
    });

    it('should handle large quantities', () => {
      const module = createContrabandRegistry(mockDeps);
      const result = module.recordSeizure({
        worldId: 'world-1',
        dynastyId: 'dynasty-1',
        itemType: 'weapons',
        quantity: 1000000,
        baseValueMicroKalon: 100_000n,
        routeId: null,
        enforcerDynastyId: 'dynasty-2',
      });

      expect(result.seizure.estimatedValueMicroKalon).toBeGreaterThan(0n);
    });

    it('should handle multiple worlds independently', () => {
      const module = createContrabandRegistry(mockDeps);
      module.addProhibitionRule({
        worldId: 'world-1',
        itemType: 'weapons',
        reason: 'public safety',
        penaltyMicroKalon: 5_000_000n,
      });
      module.addProhibitionRule({
        worldId: 'world-2',
        itemType: 'drugs',
        reason: 'health concerns',
        penaltyMicroKalon: 3_000_000n,
      });

      const prohibited1 = module.isProhibited({ worldId: 'world-1', itemType: 'weapons' });
      const prohibited2 = module.isProhibited({ worldId: 'world-1', itemType: 'drugs' });

      expect(prohibited1).toBe(true);
      expect(prohibited2).toBe(false);
    });

    it('should handle route direction specificity', () => {
      const module = createContrabandRegistry(mockDeps);
      const result1 = module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: true,
      });
      const result2 = module.recordSmuggleAttempt({
        fromWorldId: 'world-2',
        toWorldId: 'world-1',
        itemType: 'weapons',
        success: true,
      });

      expect(result1.routeId).not.toBe(result2.routeId);
    });

    it('should preserve route data across operations', () => {
      const module = createContrabandRegistry(mockDeps);
      module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: true,
      });

      module.recordSeizure({
        worldId: 'world-1',
        dynastyId: 'dynasty-1',
        itemType: 'weapons',
        quantity: 10,
        baseValueMicroKalon: 100_000n,
        routeId: null,
        enforcerDynastyId: 'dynasty-2',
      });

      const risk = module.getRouteRisk({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
      });

      expect(risk).not.toBeNull();
    });

    it('should handle same item type on different routes', () => {
      const module = createContrabandRegistry(mockDeps);
      const result1 = module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-2',
        itemType: 'weapons',
        success: true,
      });
      const result2 = module.recordSmuggleAttempt({
        fromWorldId: 'world-1',
        toWorldId: 'world-3',
        itemType: 'weapons',
        success: true,
      });

      expect(result1.routeId).not.toBe(result2.routeId);
    });

    it('should handle zero penalty prohibition rules', () => {
      const module = createContrabandRegistry(mockDeps);
      const result = module.addProhibitionRule({
        worldId: 'world-1',
        itemType: 'weapons',
        reason: 'public safety',
        penaltyMicroKalon: 0n,
      });

      expect(result.rule.penaltyMicroKalon).toBe(0n);
    });
  });
});
