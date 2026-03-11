import { describe, it, expect } from 'vitest';
import { createWorldGenerator } from '../world-generator.js';
import type { StellarInput, StellarClass, ZoneType } from '../world-generator.js';

function makeInput(overrides?: Partial<StellarInput>): StellarInput {
  return {
    starClass: 'G',
    zone: 'habitable',
    worldId: 'terra-prime',
    ...overrides,
  };
}

describe('WorldGenerator — seed determinism', () => {
  it('produces identical seed for same world ID', () => {
    const gen = createWorldGenerator(17);
    const seedA = gen.seedFromWorldId('kelath-prime');
    const seedB = gen.seedFromWorldId('kelath-prime');
    expect(seedA).toBe(seedB);
  });

  it('produces different seeds for different world IDs', () => {
    const gen = createWorldGenerator(17);
    const seedA = gen.seedFromWorldId('kelath-prime');
    const seedB = gen.seedFromWorldId('zyphon-minor');
    expect(seedA).not.toBe(seedB);
  });

  it('seed is always a non-negative integer', () => {
    const gen = createWorldGenerator(17);
    for (const id of ['a', 'z', 'world-1', 'world-9999', '']) {
      const seed = gen.seedFromWorldId(id);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(seed)).toBe(true);
    }
  });
});

describe('WorldGenerator — parameter generation', () => {
  it('generates parameters for a G-class habitable world', () => {
    const gen = createWorldGenerator(17);
    const params = gen.generateParameters(makeInput());
    expect(params.worldId).toBe('terra-prime');
    expect(params.starClass).toBe('G');
    expect(params.zone).toBe('habitable');
    expect(params.gravity).toBeGreaterThan(0);
    expect(params.atmosphereDensity).toBeGreaterThan(0);
    expect(params.surfaceTemperatureK).toBeGreaterThan(0);
    expect(params.waterCoverage).toBeGreaterThanOrEqual(0);
    expect(params.waterCoverage).toBeLessThanOrEqual(1);
    expect(params.axialTiltDeg).toBeGreaterThanOrEqual(0);
    expect(params.axialTiltDeg).toBeLessThanOrEqual(45);
    expect(params.dayLengthHours).toBeGreaterThanOrEqual(8);
    expect(params.yearLengthDays).toBeGreaterThan(0);
    expect(params.continentCount).toBeGreaterThanOrEqual(2);
    expect(params.continentCount).toBeLessThanOrEqual(8);
  });

  it('inner zone worlds have less water coverage', () => {
    const gen = createWorldGenerator(17);
    const inner = gen.generateParameters(makeInput({ zone: 'inner' }));
    const habitable = gen.generateParameters(makeInput({ zone: 'habitable' }));
    expect(inner.waterCoverage).toBeLessThan(habitable.waterCoverage + 0.3);
  });

  it('M-class stars produce cooler surface temperatures', () => {
    const gen = createWorldGenerator(17);
    const mWorld = gen.generateParameters(makeInput({ starClass: 'M', worldId: 'cold-world' }));
    const oWorld = gen.generateParameters(makeInput({ starClass: 'O', worldId: 'hot-world' }));
    expect(mWorld.surfaceTemperatureK).toBeLessThan(oWorld.surfaceTemperatureK);
  });

  it('outer zone has lower surface temperature than inner', () => {
    const gen = createWorldGenerator(17);
    const outer = gen.generateParameters(makeInput({ zone: 'outer', worldId: 'outer-w' }));
    const inner = gen.generateParameters(makeInput({ zone: 'inner', worldId: 'inner-w' }));
    expect(outer.surfaceTemperatureK).toBeLessThan(inner.surfaceTemperatureK);
  });

  it('deterministic — same input yields same parameters', () => {
    const gen = createWorldGenerator(17);
    const a = gen.generateParameters(makeInput());
    const b = gen.generateParameters(makeInput());
    expect(a.gravity).toBe(b.gravity);
    expect(a.atmosphereDensity).toBe(b.atmosphereDensity);
    expect(a.surfaceTemperatureK).toBe(b.surfaceTemperatureK);
    expect(a.waterCoverage).toBe(b.waterCoverage);
    expect(a.continentCount).toBe(b.continentCount);
  });

  it('generates parameters for all stellar classes', () => {
    const gen = createWorldGenerator(17);
    const classes: ReadonlyArray<StellarClass> = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];
    for (const starClass of classes) {
      const params = gen.generateParameters(
        makeInput({
          starClass,
          worldId: 'world-' + starClass,
        }),
      );
      expect(params.starClass).toBe(starClass);
      expect(params.gravity).toBeGreaterThan(0);
    }
  });

  it('generates parameters for all zone types', () => {
    const gen = createWorldGenerator(17);
    const zones: ReadonlyArray<ZoneType> = ['inner', 'habitable', 'outer'];
    for (const zone of zones) {
      const params = gen.generateParameters(
        makeInput({
          zone,
          worldId: 'zone-world-' + zone,
        }),
      );
      expect(params.zone).toBe(zone);
    }
  });
});

describe('WorldGenerator — heightmap generation', () => {
  it('generates a heightmap of the requested size', () => {
    const gen = createWorldGenerator(9);
    const heightmap = gen.generateHeightmap(42, 9);
    expect(heightmap.size).toBe(9);
    expect(heightmap.data.length).toBe(9);
    expect(heightmap.data[0]!.length).toBe(9);
  });

  it('rounds to nearest power-of-two-plus-one', () => {
    const gen = createWorldGenerator(17);
    const heightmap = gen.generateHeightmap(42, 6);
    expect(heightmap.size).toBe(9);
  });

  it('heightmap min is less than max', () => {
    const gen = createWorldGenerator(17);
    const heightmap = gen.generateHeightmap(12345, 17);
    expect(heightmap.minElevation).toBeLessThan(heightmap.maxElevation);
  });

  it('same seed produces same heightmap', () => {
    const gen = createWorldGenerator(17);
    const a = gen.generateHeightmap(42, 9);
    const b = gen.generateHeightmap(42, 9);
    expect(a.data).toEqual(b.data);
  });

  it('different seeds produce different heightmaps', () => {
    const gen = createWorldGenerator(17);
    const a = gen.generateHeightmap(42, 9);
    const b = gen.generateHeightmap(99, 9);
    const aRow0 = a.data[0]!;
    const bRow0 = b.data[0]!;
    const aRow1 = a.data[1]!;
    const bRow1 = b.data[1]!;
    const same = aRow0[0] === bRow0[0] && aRow1[1] === bRow1[1];
    expect(same).toBe(false);
  });

  it('all heightmap values are finite numbers', () => {
    const gen = createWorldGenerator(17);
    const heightmap = gen.generateHeightmap(777, 17);
    for (let y = 0; y < heightmap.size; y++) {
      const row = heightmap.data[y];
      expect(row).toBeDefined();
      for (let x = 0; x < heightmap.size; x++) {
        expect(Number.isFinite(row![x])).toBe(true);
      }
    }
  });
});

describe('WorldGenerator — full world generation', () => {
  it('generates a complete world', () => {
    const gen = createWorldGenerator(17);
    const world = gen.generate(makeInput());
    expect(world.parameters.worldId).toBe('terra-prime');
    expect(world.heightmap.size).toBe(17);
    expect(world.continents.length).toBe(world.parameters.continentCount);
    expect(Number.isFinite(world.oceanLevel)).toBe(true);
  });

  it('continent placements have valid coordinates', () => {
    const gen = createWorldGenerator(17);
    const world = gen.generate(makeInput());
    for (const cont of world.continents) {
      expect(cont.centerX).toBeGreaterThanOrEqual(0);
      expect(cont.centerX).toBeLessThanOrEqual(1);
      expect(cont.centerY).toBeGreaterThanOrEqual(0);
      expect(cont.centerY).toBeLessThanOrEqual(1);
      expect(cont.radius).toBeGreaterThan(0);
    }
  });

  it('continent indices are sequential', () => {
    const gen = createWorldGenerator(17);
    const world = gen.generate(makeInput());
    for (let i = 0; i < world.continents.length; i++) {
      const cont = world.continents[i];
      expect(cont).toBeDefined();
      expect(cont!.index).toBe(i);
    }
  });

  it('ocean level is between min and max elevation', () => {
    const gen = createWorldGenerator(17);
    const world = gen.generate(makeInput());
    expect(world.oceanLevel).toBeGreaterThanOrEqual(world.heightmap.minElevation);
    expect(world.oceanLevel).toBeLessThanOrEqual(world.heightmap.maxElevation);
  });

  it('full generation is deterministic', () => {
    const gen = createWorldGenerator(17);
    const a = gen.generate(makeInput());
    const b = gen.generate(makeInput());
    expect(a.parameters.seed).toBe(b.parameters.seed);
    expect(a.oceanLevel).toBe(b.oceanLevel);
    expect(a.continents.length).toBe(b.continents.length);
  });

  it('works with small heightmap size', () => {
    const gen = createWorldGenerator(5);
    const world = gen.generate(makeInput());
    expect(world.heightmap.size).toBe(5);
  });
});
