import { describe, it, expect } from 'vitest';
import {
  createWorldShadowEconomy,
  DEFAULT_SHADOW_CONFIG,
} from '../world-shadow-economy.js';
import type {
  WorldShadowEconomy,
  ShadowEconomyConfig,
  CommodityType,
} from '../world-shadow-economy.js';

const US_PER_TICK = 1_000_000;

function createTestEconomy(
  worldId = 'earth',
  configOverrides?: Partial<ShadowEconomyConfig>,
): WorldShadowEconomy {
  const config = { ...DEFAULT_SHADOW_CONFIG, ...configOverrides };
  return createWorldShadowEconomy(worldId, {
    clock: { nowMicroseconds: () => US_PER_TICK },
  }, config);
}

// ─── Initial State ─────────────────────────────────────────────────

describe('Shadow economy initial state', () => {
  it('starts with equilibrium prices', () => {
    const eco = createTestEconomy();
    const commodities = eco.getCommodities();
    expect(commodities.food.priceIndex).toBe(1.0);
    expect(commodities.materials.priceIndex).toBe(1.0);
    expect(commodities.services.priceIndex).toBe(1.0);
    expect(commodities.luxury.priceIndex).toBe(1.0);
  });

  it('starts with zero unrest', () => {
    expect(createTestEconomy().getUnrestLevel()).toBe(0);
  });

  it('starts with full prosperity', () => {
    expect(createTestEconomy().getProsperityIndex()).toBe(1.0);
  });

  it('initial productivity is 120 (max prosperity)', () => {
    expect(createTestEconomy().getProductivityIndex()).toBe(120);
  });

  it('exposes worldId', () => {
    expect(createTestEconomy('mars').worldId).toBe('mars');
  });
});

// ─── Price Dynamics ────────────────────────────────────────────────

describe('Shadow economy price dynamics', () => {
  it('price rises when demand exceeds supply', () => {
    const eco = createTestEconomy();
    eco.recordConsumption('food', 200);
    eco.tick(US_PER_TICK);
    expect(eco.getPriceIndex('food')).toBeGreaterThan(1.0);
  });

  it('price falls when supply exceeds demand', () => {
    const eco = createTestEconomy();
    eco.recordProduction('food', 200);
    eco.tick(US_PER_TICK);
    expect(eco.getPriceIndex('food')).toBeLessThan(1.0);
  });

  it('price reverts toward equilibrium after demand spike', () => {
    const eco = createTestEconomy();
    eco.recordConsumption('food', 500);
    // Let price react to the demand spike
    for (let i = 0; i < 30; i++) eco.tick(US_PER_TICK);
    const midPrice = eco.getPriceIndex('food');
    expect(midPrice).toBeGreaterThan(1.0);
    // Continue with no new demand — price should revert
    for (let i = 0; i < 200; i++) eco.tick(US_PER_TICK);
    const laterPrice = eco.getPriceIndex('food');
    expect(laterPrice).toBeLessThan(midPrice);
  });

  it('prices stay within bounds', () => {
    const eco = createTestEconomy();
    eco.recordConsumption('food', 100_000);
    eco.tick(US_PER_TICK);
    expect(eco.getPriceIndex('food')).toBeLessThanOrEqual(3.0);
    expect(eco.getPriceIndex('food')).toBeGreaterThanOrEqual(0.2);
  });
});

// ─── Production and Consumption ────────────────────────────────────

describe('Shadow economy production/consumption', () => {
  it('production adds to supply pool', () => {
    const eco = createTestEconomy();
    const before = eco.getCommodities().materials.supply;
    eco.recordProduction('materials', 50);
    const after = eco.getCommodities().materials.supply;
    expect(after).toBe(before + 50);
  });

  it('consumption adds to demand pool', () => {
    const eco = createTestEconomy();
    const before = eco.getCommodities().services.demand;
    eco.recordConsumption('services', 30);
    const after = eco.getCommodities().services.demand;
    expect(after).toBe(before + 30);
  });

  it('negative amounts are clamped to zero', () => {
    const eco = createTestEconomy();
    const before = eco.getCommodities().food.supply;
    eco.recordProduction('food', -50);
    expect(eco.getCommodities().food.supply).toBe(before);
  });
});

// ─── Unrest ────────────────────────────────────────────────────────

describe('Shadow economy unrest', () => {
  it('high prices increase unrest', () => {
    const eco = createTestEconomy();
    eco.recordConsumption('food', 1000);
    eco.recordConsumption('materials', 1000);
    eco.recordConsumption('services', 1000);
    eco.recordConsumption('luxury', 1000);
    eco.tick(US_PER_TICK);
    expect(eco.getUnrestLevel()).toBeGreaterThan(0);
  });

  it('unemployment increases unrest', () => {
    const eco = createTestEconomy();
    eco.setLaborMarket(0.1, 0.9);
    eco.tick(US_PER_TICK);
    expect(eco.getUnrestLevel()).toBeGreaterThan(0);
  });

  it('unrest stays in [0, 1]', () => {
    const eco = createTestEconomy();
    eco.recordConsumption('food', 100_000);
    eco.setLaborMarket(0, 1);
    eco.tick(US_PER_TICK);
    expect(eco.getUnrestLevel()).toBeGreaterThanOrEqual(0);
    expect(eco.getUnrestLevel()).toBeLessThanOrEqual(1);
  });
});

// ─── Unrest Event ──────────────────────────────────────────────────

describe('Shadow economy unrest events', () => {
  it('emits event when crossing threshold', () => {
    const eco = createTestEconomy('crisis-world');
    eco.recordConsumption('food', 100_000);
    eco.recordConsumption('materials', 100_000);
    eco.setLaborMarket(0, 1);
    const event = eco.tick(US_PER_TICK);
    if (eco.getUnrestLevel() >= 0.7) {
      expect(event).not.toBeNull();
      expect(event?.worldId).toBe('crisis-world');
    }
  });

  it('does not re-emit while above threshold', () => {
    const eco = createTestEconomy();
    eco.recordConsumption('food', 100_000);
    eco.recordConsumption('materials', 100_000);
    eco.setLaborMarket(0, 1);
    eco.tick(US_PER_TICK);
    eco.recordConsumption('food', 100_000);
    const second = eco.tick(US_PER_TICK);
    expect(second).toBeNull();
  });

  it('returns null when economy is stable', () => {
    const eco = createTestEconomy();
    const event = eco.tick(US_PER_TICK);
    expect(event).toBeNull();
  });
});

// ─── Prosperity & Productivity ─────────────────────────────────────

describe('Shadow economy prosperity and productivity', () => {
  it('prosperity inversely tracks unrest', () => {
    const eco = createTestEconomy();
    eco.recordConsumption('food', 1000);
    eco.setLaborMarket(0.2, 0.8);
    eco.tick(US_PER_TICK);
    expect(eco.getProsperityIndex()).toBeLessThan(1.0);
    expect(eco.getProsperityIndex() + eco.getUnrestLevel()).toBeCloseTo(1.0, 10);
  });

  it('productivity maps prosperity 0→80, 1→120', () => {
    const eco = createTestEconomy();
    expect(eco.getProductivityIndex()).toBe(120);
    eco.recordConsumption('food', 100_000);
    eco.recordConsumption('materials', 100_000);
    eco.setLaborMarket(0, 1);
    eco.tick(US_PER_TICK);
    expect(eco.getProductivityIndex()).toBeGreaterThanOrEqual(80);
    expect(eco.getProductivityIndex()).toBeLessThanOrEqual(120);
  });

  it('stable economy stays at high productivity', () => {
    const eco = createTestEconomy();
    eco.tick(US_PER_TICK);
    expect(eco.getProductivityIndex()).toBe(120);
  });
});

// ─── Labor Market ──────────────────────────────────────────────────

describe('Shadow economy labor market', () => {
  it('balanced labor keeps low unrest', () => {
    const eco = createTestEconomy();
    eco.setLaborMarket(0.5, 0.5);
    eco.tick(US_PER_TICK);
    expect(eco.getUnrestLevel()).toBe(0);
  });

  it('labor values clamped to [0, 1]', () => {
    const eco = createTestEconomy();
    eco.setLaborMarket(2.0, -0.5);
    eco.tick(US_PER_TICK);
    expect(eco.getUnrestLevel()).toBeLessThanOrEqual(1);
  });
});

// ─── Config Override ───────────────────────────────────────────────

describe('Shadow economy custom config', () => {
  it('custom unrest threshold changes notification', () => {
    const eco = createTestEconomy('custom', { unrestNotifyThreshold: 0.3 });
    eco.recordConsumption('food', 500);
    eco.setLaborMarket(0.1, 0.9);
    const event = eco.tick(US_PER_TICK);
    if (eco.getUnrestLevel() >= 0.3) {
      expect(event).not.toBeNull();
    }
  });
});

// ─── All Commodity Types ───────────────────────────────────────────

describe('Shadow economy all commodity types', () => {
  const types: ReadonlyArray<CommodityType> = [
    'food', 'materials', 'services', 'luxury',
  ];

  it('each commodity tracks independently', () => {
    const eco = createTestEconomy();
    eco.recordConsumption('food', 500);
    eco.tick(US_PER_TICK);
    expect(eco.getPriceIndex('food')).toBeGreaterThan(1.0);
    expect(eco.getPriceIndex('materials')).toBeLessThanOrEqual(1.0);
    expect(eco.getPriceIndex('services')).toBeLessThanOrEqual(1.0);
    expect(eco.getPriceIndex('luxury')).toBeLessThanOrEqual(1.0);
  });

  it('getCommodities returns all four types', () => {
    const eco = createTestEconomy();
    const commodities = eco.getCommodities();
    for (const type of types) {
      expect(commodities[type]).toBeDefined();
      expect(commodities[type].priceIndex).toBe(1.0);
    }
  });
});
