import { describe, it, expect } from 'vitest';
import { createSettlementEngine } from '../settlement-engine.js';
import { createFakeClock } from '../clock.js';
import type { FoundSettlementParams, InfrastructureLevels } from '../settlement-engine.js';

function makeEngine() {
  const clock = createFakeClock(1_000_000);
  const engine = createSettlementEngine(clock);
  return { engine, clock };
}

function makeFoundParams(overrides?: Partial<FoundSettlementParams>): FoundSettlementParams {
  return {
    name: 'Haven',
    worldId: 'terra-prime',
    x: 10,
    y: 20,
    biome: 'GRASSLAND',
    waterAccess: true,
    resourceCount: 5,
    ...overrides,
  };
}

describe('SettlementEngine — founding', () => {
  it('founds a settlement with a unique ID', () => {
    const { engine } = makeEngine();
    const settlement = engine.foundSettlement(makeFoundParams());
    expect(settlement.settlementId).toBe('stl-1');
    expect(settlement.name).toBe('Haven');
    expect(settlement.worldId).toBe('terra-prime');
    expect(settlement.tier).toBe('OUTPOST');
  });

  it('starts with initial population', () => {
    const { engine } = makeEngine();
    const settlement = engine.foundSettlement(makeFoundParams());
    expect(settlement.population).toBe(10);
  });

  it('favorable biome gives higher happiness', () => {
    const { engine } = makeEngine();
    const grassland = engine.foundSettlement(makeFoundParams({ biome: 'GRASSLAND', name: 'a' }));
    const desert = engine.foundSettlement(makeFoundParams({ biome: 'DESERT', name: 'b' }));
    expect(grassland.happiness).toBeGreaterThan(desert.happiness);
  });

  it('water access boosts happiness', () => {
    const { engine } = makeEngine();
    const withWater = engine.foundSettlement(makeFoundParams({ waterAccess: true, name: 'w' }));
    const noWater = engine.foundSettlement(makeFoundParams({ waterAccess: false, name: 'n' }));
    expect(withWater.happiness).toBeGreaterThan(noWater.happiness);
  });

  it('assigns sequential IDs', () => {
    const { engine } = makeEngine();
    const s1 = engine.foundSettlement(makeFoundParams({ name: 'a' }));
    const s2 = engine.foundSettlement(makeFoundParams({ name: 'b' }));
    expect(s1.settlementId).toBe('stl-1');
    expect(s2.settlementId).toBe('stl-2');
  });

  it('sets founding timestamp', () => {
    const { engine } = makeEngine();
    const settlement = engine.foundSettlement(makeFoundParams());
    expect(settlement.foundedAt).toBe(1_000_000);
  });
});

describe('SettlementEngine — retrieval', () => {
  it('retrieves a settlement by ID', () => {
    const { engine } = makeEngine();
    const s = engine.foundSettlement(makeFoundParams());
    const found = engine.getSettlement(s.settlementId);
    expect(found?.name).toBe('Haven');
  });

  it('returns undefined for non-existent settlement', () => {
    const { engine } = makeEngine();
    expect(engine.getSettlement('stl-999')).toBeUndefined();
  });

  it('lists settlements by world', () => {
    const { engine } = makeEngine();
    engine.foundSettlement(makeFoundParams({ worldId: 'world-a', name: 'a' }));
    engine.foundSettlement(makeFoundParams({ worldId: 'world-a', name: 'b' }));
    engine.foundSettlement(makeFoundParams({ worldId: 'world-b', name: 'c' }));
    expect(engine.listSettlements('world-a').length).toBe(2);
    expect(engine.listSettlements('world-b').length).toBe(1);
  });
});

describe('SettlementEngine — growth', () => {
  it('population grows on tick', () => {
    const { engine } = makeEngine();
    const s = engine.foundSettlement(makeFoundParams());
    const updated = engine.tickGrowth(s.settlementId, 10000);
    expect(updated).toBeDefined();
    expect(updated!.population).toBeGreaterThanOrEqual(s.population);
  });

  it('population does not exceed max', () => {
    const { engine } = makeEngine();
    const s = engine.foundSettlement(makeFoundParams());
    for (let i = 0; i < 1000; i++) {
      engine.tickGrowth(s.settlementId, 100000);
    }
    const final = engine.getSettlement(s.settlementId);
    expect(final!.population).toBeLessThanOrEqual(final!.maxPopulation);
  });

  it('returns undefined for non-existent settlement', () => {
    const { engine } = makeEngine();
    expect(engine.tickGrowth('stl-999', 1000)).toBeUndefined();
  });

  it('upgrades tier when population threshold is reached', () => {
    const { engine } = makeEngine();
    const s = engine.foundSettlement(makeFoundParams({ resourceCount: 50 }));
    for (let i = 0; i < 2000; i++) {
      engine.tickGrowth(s.settlementId, 50000);
    }
    const final = engine.getSettlement(s.settlementId);
    expect(final).toBeDefined();
    const tierIndex = ['OUTPOST', 'VILLAGE', 'TOWN', 'CITY', 'METROPOLIS', 'CAPITAL'].indexOf(
      final!.tier,
    );
    expect(tierIndex).toBeGreaterThan(0);
  });
});

describe('SettlementEngine — infrastructure', () => {
  it('upgrades a single infrastructure level', () => {
    const { engine } = makeEngine();
    const s = engine.foundSettlement(makeFoundParams());
    const result = engine.upgradeInfrastructure(s.settlementId, 'roads');
    expect(result).toBe(true);
    const updated = engine.getSettlement(s.settlementId);
    expect(updated!.infrastructure.roads).toBe(1);
  });

  it('caps infrastructure at level 10', () => {
    const { engine } = makeEngine();
    const s = engine.foundSettlement(makeFoundParams());
    for (let i = 0; i < 12; i++) {
      engine.upgradeInfrastructure(s.settlementId, 'defense');
    }
    const updated = engine.getSettlement(s.settlementId);
    expect(updated!.infrastructure.defense).toBe(10);
  });

  it('returns false for non-existent settlement', () => {
    const { engine } = makeEngine();
    expect(engine.upgradeInfrastructure('stl-999', 'roads')).toBe(false);
  });

  it('infrastructure affects growth rate', () => {
    const { engine } = makeEngine();
    const s = engine.foundSettlement(makeFoundParams({ resourceCount: 0 }));
    const baseRate = s.growthRate;
    engine.upgradeInfrastructure(s.settlementId, 'roads');
    engine.upgradeInfrastructure(s.settlementId, 'commerce');
    const updated = engine.getSettlement(s.settlementId);
    expect(updated!.growthRate).toBeGreaterThan(baseRate);
  });
});

describe('SettlementEngine — trade routes', () => {
  it('creates a trade route between settlements', () => {
    const { engine } = makeEngine();
    const s1 = engine.foundSettlement(makeFoundParams({ name: 'a', x: 0, y: 0 }));
    const s2 = engine.foundSettlement(makeFoundParams({ name: 'b', x: 10, y: 10 }));
    const route = engine.addTradeRoute(s1.settlementId, s2.settlementId);
    expect(route).toBeDefined();
    expect(route!.fromSettlementId).toBe(s1.settlementId);
    expect(route!.toSettlementId).toBe(s2.settlementId);
    expect(route!.distance).toBeGreaterThan(0);
    expect(route!.efficiency).toBeGreaterThan(0);
  });

  it('returns undefined for non-existent settlements', () => {
    const { engine } = makeEngine();
    expect(engine.addTradeRoute('stl-1', 'stl-2')).toBeUndefined();
  });

  it('lists trade routes for a settlement', () => {
    const { engine } = makeEngine();
    const s1 = engine.foundSettlement(makeFoundParams({ name: 'a' }));
    const s2 = engine.foundSettlement(makeFoundParams({ name: 'b', x: 5, y: 5 }));
    engine.addTradeRoute(s1.settlementId, s2.settlementId);
    expect(engine.getTradeRoutes(s1.settlementId).length).toBe(1);
    expect(engine.getTradeRoutes(s2.settlementId).length).toBe(1);
  });

  it('closer settlements have higher efficiency', () => {
    const { engine } = makeEngine();
    const s1 = engine.foundSettlement(makeFoundParams({ name: 'a', x: 0, y: 0 }));
    const sClose = engine.foundSettlement(makeFoundParams({ name: 'b', x: 1, y: 1 }));
    const sFar = engine.foundSettlement(makeFoundParams({ name: 'c', x: 100, y: 100 }));
    const closeRoute = engine.addTradeRoute(s1.settlementId, sClose.settlementId);
    const farRoute = engine.addTradeRoute(s1.settlementId, sFar.settlementId);
    expect(closeRoute!.efficiency).toBeGreaterThan(farRoute!.efficiency);
  });
});

describe('SettlementEngine — events', () => {
  it('triggers a disaster event', () => {
    const { engine } = makeEngine();
    const s = engine.foundSettlement(makeFoundParams());
    const event = engine.triggerEvent(s.settlementId, 'DISASTER');
    expect(event).toBeDefined();
    expect(event!.eventType).toBe('DISASTER');
    expect(event!.settlementId).toBe(s.settlementId);
  });

  it('disaster reduces happiness', () => {
    const { engine } = makeEngine();
    const s = engine.foundSettlement(makeFoundParams());
    const before = s.happiness;
    engine.triggerEvent(s.settlementId, 'DISASTER');
    const after = engine.getSettlement(s.settlementId)!.happiness;
    expect(after).toBeLessThan(before);
  });

  it('festival increases happiness', () => {
    const { engine } = makeEngine();
    const s = engine.foundSettlement(makeFoundParams({ biome: 'DESERT' }));
    const before = engine.getSettlement(s.settlementId)!.happiness;
    engine.triggerEvent(s.settlementId, 'FESTIVAL');
    const after = engine.getSettlement(s.settlementId)!.happiness;
    expect(after).toBeGreaterThan(before);
  });

  it('plague reduces population', () => {
    const { engine } = makeEngine();
    const s = engine.foundSettlement(makeFoundParams());
    for (let i = 0; i < 50; i++) {
      engine.tickGrowth(s.settlementId, 50000);
    }
    const before = engine.getSettlement(s.settlementId)!.population;
    engine.triggerEvent(s.settlementId, 'PLAGUE');
    const after = engine.getSettlement(s.settlementId)!.population;
    expect(after).toBeLessThan(before);
  });

  it('returns undefined for non-existent settlement', () => {
    const { engine } = makeEngine();
    expect(engine.triggerEvent('stl-999', 'DISASTER')).toBeUndefined();
  });
});

describe('SettlementEngine — stats', () => {
  it('reports correct totals', () => {
    const { engine } = makeEngine();
    engine.foundSettlement(makeFoundParams({ name: 'a' }));
    engine.foundSettlement(makeFoundParams({ name: 'b' }));
    const stats = engine.getStats();
    expect(stats.totalSettlements).toBe(2);
    expect(stats.totalPopulation).toBe(20);
    expect(stats.totalTradeRoutes).toBe(0);
  });

  it('reports by tier', () => {
    const { engine } = makeEngine();
    engine.foundSettlement(makeFoundParams({ name: 'a' }));
    const stats = engine.getStats();
    const outpostCount = stats.byTier.find((t) => t.tier === 'OUTPOST')?.count ?? 0;
    expect(outpostCount).toBe(1);
  });

  it('computes average happiness', () => {
    const { engine } = makeEngine();
    engine.foundSettlement(makeFoundParams({ name: 'a' }));
    engine.foundSettlement(makeFoundParams({ name: 'b' }));
    const stats = engine.getStats();
    expect(stats.averageHappiness).toBeGreaterThan(0);
  });
});
