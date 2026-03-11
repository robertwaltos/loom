/**
 * Terrain Engine System Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTerrainEngineSystem,
  type TerrainEngineSystem,
  type Biome,
  type TerrainError,
} from '../terrain-engine.js';

class TestClock {
  private currentUs = 1_000_000_000n;
  nowUs(): bigint {
    return this.currentUs;
  }
  advance(deltaUs: bigint): void {
    this.currentUs = this.currentUs + deltaUs;
  }
}

class TestIdGenerator {
  private counter = 0;
  generate(): string {
    this.counter += 1;
    return 'id-' + String(this.counter);
  }
}

class TestLogger {
  debug(_msg: string): void {}
  info(_msg: string): void {}
  warn(_msg: string): void {}
  error(_msg: string): void {}
}

function makeDeps() {
  return { clock: new TestClock(), idGen: new TestIdGenerator(), logger: new TestLogger() };
}

describe('TerrainEngine — registerWorld', () => {
  let engine: TerrainEngineSystem;

  beforeEach(() => {
    engine = createTerrainEngineSystem(makeDeps());
  });

  it('registers a new world successfully', () => {
    const result = engine.registerWorld('world-1');
    expect(result).toEqual({ success: true });
  });

  it('returns already-exists when registering the same world twice', () => {
    engine.registerWorld('world-1');
    const result = engine.registerWorld('world-1');
    expect(result).toEqual({ success: false, error: 'already-exists' satisfies TerrainError });
  });

  it('can register multiple distinct worlds', () => {
    expect(engine.registerWorld('world-a')).toEqual({ success: true });
    expect(engine.registerWorld('world-b')).toEqual({ success: true });
  });
});

describe('TerrainEngine — generateChunk success cases', () => {
  let engine: TerrainEngineSystem;

  beforeEach(() => {
    engine = createTerrainEngineSystem(makeDeps());
    engine.registerWorld('world-1');
  });

  it('generates a chunk with valid parameters', () => {
    const result = engine.generateChunk(
      'world-1',
      { chunkX: 0, chunkZ: 0 },
      'PLAINS',
      100,
      0.5,
      20,
    );
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.worldId).toBe('world-1');
    expect(result.biome).toBe('PLAINS');
    expect(result.elevation).toBe(100);
  });

  it('computes resourceDensity automatically', () => {
    const result = engine.generateChunk('world-1', { chunkX: 0, chunkZ: 0 }, 'FOREST', 0, 0.8, 0);
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.resourceDensity).toBeGreaterThanOrEqual(0);
    expect(result.resourceDensity).toBeLessThanOrEqual(1);
  });

  it('accepts boundary values: elevation -1000 and 8000', () => {
    const r1 = engine.generateChunk('world-1', { chunkX: 0, chunkZ: 0 }, 'OCEAN', -1000, 0.5, 0);
    const r2 = engine.generateChunk('world-1', { chunkX: 1, chunkZ: 0 }, 'MOUNTAIN', 8000, 0.2, 0);
    expect(typeof r1).not.toBe('string');
    expect(typeof r2).not.toBe('string');
  });
});

describe('TerrainEngine — generateChunk validation', () => {
  let engine: TerrainEngineSystem;

  beforeEach(() => {
    engine = createTerrainEngineSystem(makeDeps());
    engine.registerWorld('world-1');
  });

  it('returns world-not-found for unregistered world', () => {
    const result = engine.generateChunk('ghost', { chunkX: 0, chunkZ: 0 }, 'FOREST', 0, 0.5, 10);
    expect(result).toBe('world-not-found' satisfies TerrainError);
  });

  it('returns invalid-elevation when elevation < -1000', () => {
    const result = engine.generateChunk(
      'world-1',
      { chunkX: 0, chunkZ: 0 },
      'OCEAN',
      -1001,
      0.5,
      0,
    );
    expect(result).toBe('invalid-elevation' satisfies TerrainError);
  });

  it('returns invalid-elevation when elevation > 8000', () => {
    const result = engine.generateChunk(
      'world-1',
      { chunkX: 0, chunkZ: 0 },
      'MOUNTAIN',
      8001,
      0.5,
      0,
    );
    expect(result).toBe('invalid-elevation' satisfies TerrainError);
  });

  it('returns invalid-coordinates when moisture > 1', () => {
    const result = engine.generateChunk('world-1', { chunkX: 0, chunkZ: 0 }, 'FOREST', 100, 1.1, 0);
    expect(result).toBe('invalid-coordinates' satisfies TerrainError);
  });

  it('returns invalid-coordinates when temperature < -60', () => {
    const result = engine.generateChunk('world-1', { chunkX: 0, chunkZ: 0 }, 'TUNDRA', 0, 0.5, -61);
    expect(result).toBe('invalid-coordinates' satisfies TerrainError);
  });

  it('returns invalid-coordinates when temperature > 60', () => {
    const result = engine.generateChunk('world-1', { chunkX: 0, chunkZ: 0 }, 'DESERT', 0, 0.1, 61);
    expect(result).toBe('invalid-coordinates' satisfies TerrainError);
  });

  it('returns already-exists for duplicate coordinates', () => {
    engine.generateChunk('world-1', { chunkX: 5, chunkZ: 5 }, 'PLAINS', 0, 0.5, 10);
    const result = engine.generateChunk('world-1', { chunkX: 5, chunkZ: 5 }, 'FOREST', 0, 0.3, 10);
    expect(result).toBe('already-exists' satisfies TerrainError);
  });
});

describe('TerrainEngine — getChunk and getChunkAt', () => {
  let engine: TerrainEngineSystem;

  beforeEach(() => {
    engine = createTerrainEngineSystem(makeDeps());
    engine.registerWorld('world-1');
  });

  it('getChunk returns chunk by id', () => {
    const chunk = engine.generateChunk('world-1', { chunkX: 0, chunkZ: 0 }, 'PLAINS', 100, 0.5, 10);
    if (typeof chunk === 'string') return;
    expect(engine.getChunk(chunk.chunkId)?.chunkId).toBe(chunk.chunkId);
  });

  it('getChunk returns undefined for unknown id', () => {
    expect(engine.getChunk('nope')).toBeUndefined();
  });

  it('getChunkAt returns chunk by world and coords', () => {
    engine.generateChunk('world-1', { chunkX: 3, chunkZ: 7 }, 'SWAMP', 50, 0.9, 15);
    const found = engine.getChunkAt('world-1', { chunkX: 3, chunkZ: 7 });
    expect(found?.coords.chunkX).toBe(3);
    expect(found?.coords.chunkZ).toBe(7);
  });

  it('getChunkAt returns undefined for missing coords', () => {
    expect(engine.getChunkAt('world-1', { chunkX: 99, chunkZ: 99 })).toBeUndefined();
  });
});

describe('TerrainEngine — updateChunk', () => {
  let engine: TerrainEngineSystem;

  beforeEach(() => {
    engine = createTerrainEngineSystem(makeDeps());
    engine.registerWorld('world-1');
  });

  it('updates moisture on existing chunk', () => {
    const chunk = engine.generateChunk('world-1', { chunkX: 0, chunkZ: 0 }, 'DESERT', 100, 0.1, 30);
    if (typeof chunk === 'string') return;
    engine.updateChunk(chunk.chunkId, { moisture: 0.9 });
    expect(engine.getChunk(chunk.chunkId)?.moisture).toBe(0.9);
  });

  it('returns chunk-not-found for unknown chunkId', () => {
    const result = engine.updateChunk('ghost', { moisture: 0.5 });
    expect(result).toEqual({ success: false, error: 'chunk-not-found' satisfies TerrainError });
  });
});

describe('TerrainEngine — listChunks and getBiomeDistribution', () => {
  let engine: TerrainEngineSystem;

  beforeEach(() => {
    engine = createTerrainEngineSystem(makeDeps());
    engine.registerWorld('world-1');
  });

  it('listChunks returns all chunks for a world', () => {
    engine.generateChunk('world-1', { chunkX: 0, chunkZ: 0 }, 'PLAINS', 0, 0.5, 10);
    engine.generateChunk('world-1', { chunkX: 1, chunkZ: 0 }, 'FOREST', 200, 0.7, 15);
    expect(engine.listChunks('world-1')).toHaveLength(2);
  });

  it('listChunks filters by biome', () => {
    engine.generateChunk('world-1', { chunkX: 0, chunkZ: 0 }, 'PLAINS', 0, 0.5, 10);
    engine.generateChunk('world-1', { chunkX: 1, chunkZ: 0 }, 'FOREST', 200, 0.7, 15);
    const plains = engine.listChunks('world-1', 'PLAINS');
    expect(plains).toHaveLength(1);
    expect(plains[0]?.biome).toBe('PLAINS');
  });

  it('getBiomeDistribution counts correctly', () => {
    engine.generateChunk('world-1', { chunkX: 0, chunkZ: 0 }, 'FOREST', 300, 0.7, 15);
    engine.generateChunk('world-1', { chunkX: 1, chunkZ: 0 }, 'FOREST', 310, 0.6, 14);
    engine.generateChunk('world-1', { chunkX: 2, chunkZ: 0 }, 'DESERT', 50, 0.1, 35);
    const dist = engine.getBiomeDistribution('world-1');
    expect(dist.totalChunks).toBe(3);
    expect(dist.byBiome['FOREST']).toBe(2);
    expect(dist.byBiome['DESERT']).toBe(1);
  });
});

describe('TerrainEngine — getNeighbors', () => {
  let engine: TerrainEngineSystem;

  beforeEach(() => {
    engine = createTerrainEngineSystem(makeDeps());
    engine.registerWorld('world-1');
  });

  it('returns up to 8 neighbors', () => {
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        engine.generateChunk('world-1', { chunkX: x, chunkZ: z }, 'PLAINS', 0, 0.5, 10);
      }
    }
    const center = engine.getChunkAt('world-1', { chunkX: 0, chunkZ: 0 });
    if (center === undefined) return;
    const neighbors = engine.getNeighbors(center.chunkId);
    expect(neighbors).toHaveLength(8);
  });

  it('returns empty array for unknown chunkId', () => {
    expect(engine.getNeighbors('ghost')).toHaveLength(0);
  });

  it('returns only existing neighbors when some are missing', () => {
    engine.generateChunk('world-1', { chunkX: 0, chunkZ: 0 }, 'PLAINS', 0, 0.5, 10);
    engine.generateChunk('world-1', { chunkX: 1, chunkZ: 0 }, 'FOREST', 100, 0.6, 12);
    const center = engine.getChunkAt('world-1', { chunkX: 0, chunkZ: 0 });
    if (center === undefined) return;
    const neighbors = engine.getNeighbors(center.chunkId);
    expect(neighbors.length).toBeGreaterThanOrEqual(1);
    expect(neighbors.length).toBeLessThan(8);
  });

  it('does not include the chunk itself in its neighbors', () => {
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        const biome: Biome = x === 0 && z === 0 ? 'VOLCANIC' : 'PLAINS';
        engine.generateChunk('world-1', { chunkX: x, chunkZ: z }, biome, 0, 0.5, 10);
      }
    }
    const center = engine.getChunkAt('world-1', { chunkX: 0, chunkZ: 0 });
    if (center === undefined) return;
    const neighbors = engine.getNeighbors(center.chunkId);
    const selfInNeighbors = neighbors.find((n) => n.chunkId === center.chunkId);
    expect(selfInNeighbors).toBeUndefined();
  });
});
