import { describe, expect, it } from 'vitest';
import { createWorldPopulationEngine } from '../world-population.js';

describe('world-population simulation', () => {
  it('simulates world growth and resulting health/productivity shift', () => {
    const engine = createWorldPopulationEngine();
    engine.initializeWorld('earth');

    engine.spawn('earth', 1, 80_000);
    engine.spawn('earth', 2, 8_000);
    engine.spawn('earth', 3, 500);
    engine.despawn('earth', 1, 10_000);

    const pop = engine.getPopulation('earth');
    expect(pop.totalPopulation).toBeGreaterThan(0);
    expect(engine.getHealth('earth')).toBeGreaterThan(0.5);
    expect(engine.getProductivityModifier('earth')).toBeGreaterThan(95);
  });
});
