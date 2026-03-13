import { describe, expect, it } from 'vitest';
import { createWorldGenerator } from '../world-generator.js';

describe('world-generator simulation', () => {
  it('simulates deterministic generation and compares biome-scale world characteristics', () => {
    const generator = createWorldGenerator(17);

    const earthLike = generator.generate({ starClass: 'G', zone: 'habitable', worldId: 'earth-like' });
    const innerHot = generator.generate({ starClass: 'F', zone: 'inner', worldId: 'inner-hot' });
    const outerCold = generator.generate({ starClass: 'K', zone: 'outer', worldId: 'outer-cold' });
    const repeat = generator.generate({ starClass: 'G', zone: 'habitable', worldId: 'earth-like' });

    expect(earthLike.parameters.seed).toBe(repeat.parameters.seed);
    expect(earthLike.oceanLevel).toBe(repeat.oceanLevel);
    expect(innerHot.parameters.surfaceTemperatureK).toBeGreaterThan(outerCold.parameters.surfaceTemperatureK);
    expect(earthLike.continents.length).toBe(earthLike.parameters.continentCount);
    expect(earthLike.heightmap.size).toBe(17);
  });
});
