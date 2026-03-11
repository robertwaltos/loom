import { describe, it, expect } from 'vitest';
import { createBiomeEngine } from '../biome-engine.js';
import type { BiomeClassificationInput, BiomeType, BiomeMapParams } from '../biome-engine.js';

function makeInput(overrides?: Partial<BiomeClassificationInput>): BiomeClassificationInput {
  return {
    temperature: 0.5,
    precipitation: 0.5,
    elevation: 0.5,
    latitude: 0.5,
    ...overrides,
  };
}

function makeGrid(
  width: number,
  height: number,
  value: number,
): ReadonlyArray<ReadonlyArray<number>> {
  const grid: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      row.push(value);
    }
    grid.push(row);
  }
  return grid;
}

describe('BiomeEngine — classification', () => {
  it('classifies deep ocean at very low elevation', () => {
    const engine = createBiomeEngine();
    const biome = engine.classifyBiome(makeInput({ elevation: 0.02 }));
    expect(biome).toBe('OCEAN');
  });

  it('classifies reef at low-mid elevation', () => {
    const engine = createBiomeEngine();
    const biome = engine.classifyBiome(makeInput({ elevation: 0.07 }));
    expect(biome).toBe('REEF');
  });

  it('classifies coast at shoreline elevation', () => {
    const engine = createBiomeEngine();
    const biome = engine.classifyBiome(makeInput({ elevation: 0.12 }));
    expect(biome).toBe('COAST');
  });

  it('classifies desert for hot dry conditions', () => {
    const engine = createBiomeEngine();
    const biome = engine.classifyBiome(
      makeInput({
        temperature: 0.8,
        precipitation: 0.1,
        elevation: 0.5,
      }),
    );
    expect(biome).toBe('DESERT');
  });

  it('classifies jungle for hot wet conditions', () => {
    const engine = createBiomeEngine();
    const biome = engine.classifyBiome(
      makeInput({
        temperature: 0.8,
        precipitation: 0.8,
        elevation: 0.5,
      }),
    );
    expect(biome).toBe('JUNGLE');
  });

  it('classifies forest for temperate with good precipitation', () => {
    const engine = createBiomeEngine();
    const biome = engine.classifyBiome(
      makeInput({
        temperature: 0.5,
        precipitation: 0.6,
        elevation: 0.5,
      }),
    );
    expect(biome).toBe('FOREST');
  });

  it('classifies mountain at high elevation', () => {
    const engine = createBiomeEngine();
    const biome = engine.classifyBiome(makeInput({ elevation: 0.9 }));
    expect(biome).toBe('MOUNTAIN');
  });

  it('classifies volcanic at high elevation and high temp', () => {
    const engine = createBiomeEngine();
    const biome = engine.classifyBiome(
      makeInput({
        elevation: 0.9,
        temperature: 0.85,
      }),
    );
    expect(biome).toBe('VOLCANIC');
  });

  it('classifies crystal formation at very high elevation', () => {
    const engine = createBiomeEngine();
    const biome = engine.classifyBiome(makeInput({ elevation: 0.97 }));
    expect(biome).toBe('CRYSTAL_FORMATION');
  });

  it('classifies tundra for cold conditions', () => {
    const engine = createBiomeEngine();
    const biome = engine.classifyBiome(
      makeInput({
        temperature: 0.1,
        latitude: 0.5,
      }),
    );
    expect(biome).toBe('TUNDRA');
  });

  it('classifies arctic for cold and high latitude', () => {
    const engine = createBiomeEngine();
    const biome = engine.classifyBiome(
      makeInput({
        temperature: 0.1,
        latitude: 0.85,
      }),
    );
    expect(biome).toBe('ARCTIC');
  });

  it('classifies swamp for wet temperate conditions', () => {
    const engine = createBiomeEngine();
    const biome = engine.classifyBiome(
      makeInput({
        temperature: 0.5,
        precipitation: 0.8,
      }),
    );
    expect(biome).toBe('SWAMP');
  });

  it('classifies savanna for moderately hot and wet', () => {
    const engine = createBiomeEngine();
    const biome = engine.classifyBiome(
      makeInput({
        temperature: 0.8,
        precipitation: 0.4,
      }),
    );
    expect(biome).toBe('SAVANNA');
  });
});

describe('BiomeEngine — climate zones', () => {
  it('returns TROPICAL for equatorial latitude', () => {
    const engine = createBiomeEngine();
    expect(engine.getClimateZone(0.1, 0)).toBe('TROPICAL');
  });

  it('returns POLAR for extreme latitude', () => {
    const engine = createBiomeEngine();
    expect(engine.getClimateZone(0.9, 0)).toBe('POLAR');
  });

  it('returns TEMPERATE for mid-latitude', () => {
    const engine = createBiomeEngine();
    expect(engine.getClimateZone(0.5, 0)).toBe('TEMPERATE');
  });

  it('axial tilt shifts zone boundaries', () => {
    const engine = createBiomeEngine();
    const noTilt = engine.getClimateZone(0.5, 0);
    const highTilt = engine.getClimateZone(0.5, 20);
    expect(noTilt).toBe('TEMPERATE');
    expect(highTilt).toBe('SUBPOLAR');
  });
});

describe('BiomeEngine — metadata', () => {
  it('returns metadata for all biome types', () => {
    const engine = createBiomeEngine();
    const biomes: ReadonlyArray<BiomeType> = [
      'OCEAN',
      'COAST',
      'DESERT',
      'GRASSLAND',
      'FOREST',
      'JUNGLE',
      'TUNDRA',
      'MOUNTAIN',
      'VOLCANIC',
      'SWAMP',
      'ARCTIC',
      'SAVANNA',
      'REEF',
      'CAVE_SYSTEM',
      'CRYSTAL_FORMATION',
    ];
    for (const b of biomes) {
      const meta = engine.getBiomeMetadata(b);
      expect(meta.type).toBe(b);
      expect(meta.habitabilityBase).toBeGreaterThanOrEqual(0);
      expect(meta.dangerBase).toBeGreaterThanOrEqual(0);
    }
  });

  it('grassland has high habitability', () => {
    const engine = createBiomeEngine();
    const meta = engine.getBiomeMetadata('GRASSLAND');
    expect(meta.habitabilityBase).toBeGreaterThan(0.7);
  });

  it('volcanic has high danger', () => {
    const engine = createBiomeEngine();
    const meta = engine.getBiomeMetadata('VOLCANIC');
    expect(meta.dangerBase).toBeGreaterThan(0.7);
  });
});

describe('BiomeEngine — habitability and danger', () => {
  it('water access increases habitability', () => {
    const engine = createBiomeEngine();
    const withWater = engine.computeHabitability('DESERT', true);
    const withoutWater = engine.computeHabitability('DESERT', false);
    expect(withWater).toBeGreaterThan(withoutWater);
  });

  it('habitability never exceeds 1.0', () => {
    const engine = createBiomeEngine();
    const hab = engine.computeHabitability('GRASSLAND', true);
    expect(hab).toBeLessThanOrEqual(1.0);
  });

  it('stellar activity increases danger level', () => {
    const engine = createBiomeEngine();
    const calm = engine.computeDangerLevel('FOREST', 0.0);
    const active = engine.computeDangerLevel('FOREST', 1.0);
    expect(active).toBeGreaterThan(calm);
  });

  it('danger level never exceeds 1.0', () => {
    const engine = createBiomeEngine();
    const danger = engine.computeDangerLevel('VOLCANIC', 1.0);
    expect(danger).toBeLessThanOrEqual(1.0);
  });
});

describe('BiomeEngine — transitions', () => {
  it('produces a valid transition', () => {
    const engine = createBiomeEngine();
    const trans = engine.computeTransition('FOREST', 'GRASSLAND', 0.5);
    expect(trans.fromBiome).toBe('FOREST');
    expect(trans.toBiome).toBe('GRASSLAND');
    expect(trans.blendFactor).toBe(0.5);
  });

  it('clamps blend factor to [0,1]', () => {
    const engine = createBiomeEngine();
    const low = engine.computeTransition('OCEAN', 'COAST', -0.5);
    const high = engine.computeTransition('OCEAN', 'COAST', 1.5);
    expect(low.blendFactor).toBe(0);
    expect(high.blendFactor).toBe(1);
  });
});

describe('BiomeEngine — biome map generation', () => {
  it('generates a biome map with correct dimensions', () => {
    const engine = createBiomeEngine();
    const params: BiomeMapParams = {
      width: 4,
      height: 4,
      temperatures: makeGrid(4, 4, 0.5),
      precipitations: makeGrid(4, 4, 0.5),
      elevations: makeGrid(4, 4, 0.5),
      axialTilt: 23,
      oceanLevel: 0.3,
    };
    const biomeMap = engine.generateBiomeMap(params);
    expect(biomeMap.width).toBe(4);
    expect(biomeMap.height).toBe(4);
    expect(biomeMap.cells.length).toBe(4);
    expect(biomeMap.cells[0]!.length).toBe(4);
  });

  it('climate zones match height', () => {
    const engine = createBiomeEngine();
    const params: BiomeMapParams = {
      width: 3,
      height: 5,
      temperatures: makeGrid(3, 5, 0.5),
      precipitations: makeGrid(3, 5, 0.5),
      elevations: makeGrid(3, 5, 0.5),
      axialTilt: 0,
      oceanLevel: 0.3,
    };
    const biomeMap = engine.generateBiomeMap(params);
    expect(biomeMap.climateZones.length).toBe(5);
  });

  it('cells contain valid biome data', () => {
    const engine = createBiomeEngine();
    const params: BiomeMapParams = {
      width: 2,
      height: 2,
      temperatures: makeGrid(2, 2, 0.5),
      precipitations: makeGrid(2, 2, 0.5),
      elevations: makeGrid(2, 2, 0.8),
      axialTilt: 10,
      oceanLevel: 0.3,
    };
    const biomeMap = engine.generateBiomeMap(params);
    for (const row of biomeMap.cells) {
      for (const cell of row) {
        expect(cell.habitability).toBeGreaterThanOrEqual(0);
        expect(cell.dangerLevel).toBeGreaterThanOrEqual(0);
        expect(typeof cell.biome).toBe('string');
      }
    }
  });
});
