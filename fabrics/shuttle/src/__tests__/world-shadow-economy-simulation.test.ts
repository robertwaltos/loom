import { describe, expect, it } from 'vitest';
import { createWorldShadowEconomy } from '../world-shadow-economy.js';

describe('world-shadow-economy simulation', () => {
  it('simulates demand shock, unrest growth, and productivity impact', () => {
    const economy = createWorldShadowEconomy(
      'earth',
      { clock: { nowMicroseconds: () => 1_000_000 } },
      undefined,
    );

    economy.recordConsumption('food', 2000);
    economy.recordConsumption('materials', 1200);
    economy.setLaborMarket(0.2, 0.8);
    const event = economy.tick(1_000_000);

    expect(economy.getPriceIndex('food')).toBeGreaterThan(1);
    expect(economy.getUnrestLevel()).toBeGreaterThanOrEqual(0);
    expect(economy.getProductivityIndex()).toBeLessThanOrEqual(120);
    expect(event === null || event.worldId === 'earth').toBe(true);
  });
});
