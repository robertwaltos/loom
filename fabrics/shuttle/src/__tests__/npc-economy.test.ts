import { describe, it, expect, beforeEach } from 'vitest';
import {
  createNpcEconomyEngine,
  BASE_PRICE,
  SUPPLY_LOW_THRESHOLD,
  SUPPLY_HIGH_THRESHOLD,
  MAX_PRICE_MULTIPLIER,
  MIN_PRICE_MULTIPLIER,
} from '../npc-economy.js';
import type { NpcEconomyEngine, NpcEconomyDeps, TradeRoute } from '../npc-economy.js';

function createDeps(): NpcEconomyDeps {
  let time = 1000;
  let id = 0;
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: { generate: () => 'eco-' + String(id++) },
  };
}

describe('NpcEconomyEngine — merchant registration', () => {
  let engine: NpcEconomyEngine;

  beforeEach(() => {
    engine = createNpcEconomyEngine(createDeps());
  });

  it('registers a merchant with a role', () => {
    const profile = engine.registerMerchant('npc-1', 'merchant');
    expect(profile.npcId).toBe('npc-1');
    expect(profile.role).toBe('merchant');
    expect(profile.tradeRouteId).toBeNull();
  });

  it('retrieves a registered merchant', () => {
    engine.registerMerchant('npc-1', 'farmer');
    const m = engine.getMerchant('npc-1');
    expect(m).toBeDefined();
    expect(m?.role).toBe('farmer');
  });

  it('returns undefined for unknown merchant', () => {
    expect(engine.getMerchant('ghost')).toBeUndefined();
  });

  it('removes a merchant', () => {
    engine.registerMerchant('npc-1', 'miner');
    expect(engine.removeMerchant('npc-1')).toBe(true);
    expect(engine.getMerchant('npc-1')).toBeUndefined();
  });

  it('lists merchants by role', () => {
    engine.registerMerchant('npc-1', 'merchant');
    engine.registerMerchant('npc-2', 'merchant');
    engine.registerMerchant('npc-3', 'farmer');
    expect(engine.getMerchantsByRole('merchant')).toHaveLength(2);
    expect(engine.getMerchantsByRole('farmer')).toHaveLength(1);
  });
});

describe('NpcEconomyEngine — stock management', () => {
  let engine: NpcEconomyEngine;

  beforeEach(() => {
    engine = createNpcEconomyEngine(createDeps());
  });

  it('adds stock to an npc', () => {
    const stock = engine.addStock('npc-1', 'iron', 50);
    expect(stock.quantity).toBe(50);
    expect(stock.resourceName).toBe('iron');
  });

  it('accumulates stock quantities', () => {
    engine.addStock('npc-1', 'iron', 50);
    engine.addStock('npc-1', 'iron', 30);
    expect(engine.getStock('npc-1', 'iron')).toBe(80);
  });

  it('returns zero for unknown stock', () => {
    expect(engine.getStock('npc-1', 'gold')).toBe(0);
  });

  it('removes stock when sufficient quantity', () => {
    engine.addStock('npc-1', 'iron', 50);
    expect(engine.removeStock('npc-1', 'iron', 20)).toBe(true);
    expect(engine.getStock('npc-1', 'iron')).toBe(30);
  });

  it('fails to remove stock when insufficient', () => {
    engine.addStock('npc-1', 'iron', 10);
    expect(engine.removeStock('npc-1', 'iron', 20)).toBe(false);
  });
});

describe('NpcEconomyEngine — market listings', () => {
  let engine: NpcEconomyEngine;

  beforeEach(() => {
    engine = createNpcEconomyEngine(createDeps());
  });

  it('creates a market listing', () => {
    const listing = engine.createListing('npc-1', 'wheat', 100);
    expect(listing.npcId).toBe('npc-1');
    expect(listing.resourceName).toBe('wheat');
    expect(listing.quantity).toBe(100);
    expect(listing.pricePerUnit).toBeGreaterThan(0);
  });

  it('lists all listings for a resource', () => {
    engine.createListing('npc-1', 'wheat', 100);
    engine.createListing('npc-2', 'wheat', 50);
    engine.createListing('npc-3', 'iron', 30);
    expect(engine.getListings('wheat')).toHaveLength(2);
  });

  it('removes a listing', () => {
    const listing = engine.createListing('npc-1', 'wheat', 100);
    expect(engine.removeListing(listing.listingId)).toBe(true);
    expect(engine.getListings('wheat')).toHaveLength(0);
  });
});

describe('NpcEconomyEngine — purchasing', () => {
  let engine: NpcEconomyEngine;

  beforeEach(() => {
    engine = createNpcEconomyEngine(createDeps());
  });

  it('purchases from a listing successfully', () => {
    const listing = engine.createListing('npc-1', 'wheat', 100);
    const result = engine.purchaseFromListing(listing.listingId, 10);
    expect(result.success).toBe(true);
    expect(result.totalCost).toBeGreaterThan(0);
  });

  it('fails when listing not found', () => {
    const result = engine.purchaseFromListing('ghost', 10);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('listing not found');
  });

  it('fails when insufficient quantity', () => {
    const listing = engine.createListing('npc-1', 'wheat', 5);
    const result = engine.purchaseFromListing(listing.listingId, 10);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('insufficient quantity');
  });

  it('removes listing when fully purchased', () => {
    const listing = engine.createListing('npc-1', 'wheat', 10);
    engine.purchaseFromListing(listing.listingId, 10);
    expect(engine.getListings('wheat')).toHaveLength(0);
  });
});

describe('NpcEconomyEngine — pricing', () => {
  let engine: NpcEconomyEngine;

  beforeEach(() => {
    engine = createNpcEconomyEngine(createDeps());
  });

  it('calculates price with no supply or demand', () => {
    const factors = engine.calculatePrice('wheat', 1);
    expect(factors.basePrice).toBe(BASE_PRICE);
    expect(factors.supplyMultiplier).toBe(MAX_PRICE_MULTIPLIER);
    expect(factors.demandMultiplier).toBe(1);
  });

  it('increases price with demand', () => {
    for (let i = 0; i < 10; i++) {
      engine.recordDemand('wheat');
    }
    const factors = engine.calculatePrice('wheat', 1);
    expect(factors.demandMultiplier).toBeGreaterThan(1);
  });

  it('caps demand multiplier at MAX_PRICE_MULTIPLIER', () => {
    for (let i = 0; i < 1000; i++) {
      engine.recordDemand('wheat');
    }
    const factors = engine.calculatePrice('wheat', 1);
    expect(factors.demandMultiplier).toBeLessThanOrEqual(MAX_PRICE_MULTIPLIER);
  });
});

describe('NpcEconomyEngine — trade routes', () => {
  let engine: NpcEconomyEngine;

  beforeEach(() => {
    engine = createNpcEconomyEngine(createDeps());
  });

  it('registers a trade route', () => {
    const route: TradeRoute = {
      routeId: 'r1',
      name: 'Silk Road',
      stops: ['town-a', 'town-b', 'town-c'],
      resourceTypes: ['silk', 'spice'],
    };
    expect(engine.registerRoute(route)).toBe(true);
    expect(engine.getRoute('r1')).toBeDefined();
  });

  it('rejects duplicate route ids', () => {
    const route: TradeRoute = { routeId: 'r1', name: 'Route A', stops: [], resourceTypes: [] };
    engine.registerRoute(route);
    expect(engine.registerRoute(route)).toBe(false);
  });

  it('assigns a route to a merchant', () => {
    engine.registerMerchant('npc-1', 'merchant');
    engine.registerRoute({ routeId: 'r1', name: 'Route A', stops: ['a', 'b'], resourceTypes: [] });
    expect(engine.assignRoute('npc-1', 'r1')).toBe(true);
    const m = engine.getMerchant('npc-1');
    expect(m?.tradeRouteId).toBe('r1');
  });

  it('fails to assign route to non-merchant', () => {
    engine.registerRoute({ routeId: 'r1', name: 'Route A', stops: [], resourceTypes: [] });
    expect(engine.assignRoute('ghost', 'r1')).toBe(false);
  });
});

describe('NpcEconomyEngine — gathering', () => {
  let engine: NpcEconomyEngine;

  beforeEach(() => {
    engine = createNpcEconomyEngine(createDeps());
  });

  it('starts a gathering task', () => {
    const task = engine.startGathering('npc-1', 'ore', 100);
    expect(task.npcId).toBe('npc-1');
    expect(task.resourceName).toBe('ore');
    expect(task.targetQuantity).toBe(100);
    expect(task.status).toBe('active');
  });

  it('progresses gathering', () => {
    const task = engine.startGathering('npc-1', 'ore', 100);
    const updated = engine.progressGathering(task.taskId, 30);
    expect(updated?.gatheredQuantity).toBe(30);
    expect(updated?.status).toBe('active');
  });

  it('completes gathering when target reached', () => {
    const task = engine.startGathering('npc-1', 'ore', 50);
    const updated = engine.progressGathering(task.taskId, 50);
    expect(updated?.status).toBe('completed');
    expect(updated?.gatheredQuantity).toBe(50);
  });

  it('cancels a gathering task', () => {
    const task = engine.startGathering('npc-1', 'ore', 100);
    expect(engine.cancelGathering(task.taskId)).toBe(true);
  });

  it('fails to cancel completed task', () => {
    const task = engine.startGathering('npc-1', 'ore', 10);
    engine.progressGathering(task.taskId, 10);
    expect(engine.cancelGathering(task.taskId)).toBe(false);
  });
});

describe('NpcEconomyEngine — stats and constants', () => {
  it('reports engine statistics', () => {
    const engine = createNpcEconomyEngine(createDeps());
    engine.registerMerchant('npc-1', 'merchant');
    engine.registerMerchant('npc-2', 'farmer');
    engine.createListing('npc-1', 'wheat', 50);
    engine.startGathering('npc-2', 'corn', 100);
    const stats = engine.getStats();
    expect(stats.totalMerchants).toBe(2);
    expect(stats.totalListings).toBe(1);
    expect(stats.totalGatheringTasks).toBe(1);
    expect(stats.merchantsByRole.merchant).toBe(1);
    expect(stats.merchantsByRole.farmer).toBe(1);
  });

  it('exports pricing constants', () => {
    expect(BASE_PRICE).toBe(100);
    expect(SUPPLY_LOW_THRESHOLD).toBe(10);
    expect(SUPPLY_HIGH_THRESHOLD).toBe(100);
    expect(MAX_PRICE_MULTIPLIER).toBe(5.0);
    expect(MIN_PRICE_MULTIPLIER).toBe(0.2);
  });
});
