import { describe, expect, it } from 'vitest';
import { createTerrainEngineSystem } from '../terrain-engine.js';

describe('terrain-engine simulation', () => {
  it('simulates world registration, chunk generation, neighborhood lookup, and biome distribution', () => {
    let now = 1_000_000n;
    let id = 0;
    const terrain = createTerrainEngineSystem({
      clock: { nowUs: () => now++ },
      idGen: { generate: () => 'chunk-' + String(++id) },
      logger: {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    });

    terrain.registerWorld('earth');
    const center = terrain.generateChunk('earth', { chunkX: 0, chunkZ: 0 }, 'PLAINS', 100, 0.5, 15);
    terrain.generateChunk('earth', { chunkX: 1, chunkZ: 0 }, 'FOREST', 200, 0.7, 12);
    terrain.generateChunk('earth', { chunkX: 0, chunkZ: 1 }, 'FOREST', 180, 0.8, 10);

    if (typeof center === 'string') throw new Error('expected center chunk');
    const neighbors = terrain.getNeighbors(center.chunkId);
    const dist = terrain.getBiomeDistribution('earth');

    expect(neighbors.length).toBe(2);
    expect(dist.totalChunks).toBe(3);
    expect(dist.byBiome['FOREST']).toBe(2);
    expect(terrain.getChunkAt('earth', { chunkX: 1, chunkZ: 0 })?.biome).toBe('FOREST');
  });
});
