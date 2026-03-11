/**
 * terrain-engine.ts — Procedural terrain chunk management with biome assignment.
 *
 * Chunks are keyed by (worldId, chunkX, chunkZ). Each chunk carries biome,
 * elevation, moisture, temperature, and auto-computed resource density.
 * Neighbors are the 8 chunks surrounding any given chunk coordinate.
 */

// ── Types ─────────────────────────────────────────────────────────

export type ChunkId = string;
export type WorldId = string;

export type Biome =
  | 'DESERT'
  | 'FOREST'
  | 'TUNDRA'
  | 'OCEAN'
  | 'MOUNTAIN'
  | 'PLAINS'
  | 'SWAMP'
  | 'VOLCANIC';

export type TerrainError =
  | 'chunk-not-found'
  | 'world-not-found'
  | 'already-exists'
  | 'invalid-coordinates'
  | 'invalid-elevation';

export interface ChunkCoords {
  readonly chunkX: number;
  readonly chunkZ: number;
}

export interface TerrainChunk {
  readonly chunkId: ChunkId;
  readonly worldId: WorldId;
  readonly coords: ChunkCoords;
  readonly biome: Biome;
  readonly elevation: number;
  readonly moisture: number;
  readonly temperature: number;
  readonly resourceDensity: number;
  readonly generatedAt: bigint;
}

export interface BiomeDistribution {
  readonly worldId: WorldId;
  readonly byBiome: Record<Biome, number>;
  readonly totalChunks: number;
}

export interface TerrainEngineSystem {
  registerWorld(worldId: WorldId): { success: true } | { success: false; error: TerrainError };
  generateChunk(
    worldId: WorldId,
    coords: ChunkCoords,
    biome: Biome,
    elevation: number,
    moisture: number,
    temperature: number,
  ): TerrainChunk | TerrainError;
  updateChunk(
    chunkId: ChunkId,
    updates: Partial<Pick<TerrainChunk, 'moisture' | 'temperature' | 'resourceDensity'>>,
  ): { success: true } | { success: false; error: TerrainError };
  getChunk(chunkId: ChunkId): TerrainChunk | undefined;
  getChunkAt(worldId: WorldId, coords: ChunkCoords): TerrainChunk | undefined;
  listChunks(worldId: WorldId, biome?: Biome): ReadonlyArray<TerrainChunk>;
  getBiomeDistribution(worldId: WorldId): BiomeDistribution;
  getNeighbors(chunkId: ChunkId): ReadonlyArray<TerrainChunk>;
}

// ── Ports ─────────────────────────────────────────────────────────

interface TerrainClock {
  nowUs(): bigint;
}

interface TerrainIdGenerator {
  generate(): string;
}

interface TerrainLogger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

export interface TerrainEngineDeps {
  readonly clock: TerrainClock;
  readonly idGen: TerrainIdGenerator;
  readonly logger: TerrainLogger;
}

// ── Internal State ────────────────────────────────────────────────

interface MutableChunk {
  chunkId: ChunkId;
  worldId: WorldId;
  coords: ChunkCoords;
  biome: Biome;
  elevation: number;
  moisture: number;
  temperature: number;
  resourceDensity: number;
  generatedAt: bigint;
}

interface TerrainState {
  readonly worlds: Set<WorldId>;
  readonly chunks: Map<ChunkId, MutableChunk>;
  readonly coordIndex: Map<string, ChunkId>;
  readonly clock: TerrainClock;
  readonly idGen: TerrainIdGenerator;
  readonly logger: TerrainLogger;
}

// ── Helpers ───────────────────────────────────────────────────────

function coordKey(worldId: WorldId, chunkX: number, chunkZ: number): string {
  return worldId + ':' + String(chunkX) + ':' + String(chunkZ);
}

function computeResourceDensity(elevation: number, moisture: number, temperature: number): number {
  const elevationFactor = elevation > 0 ? (1 - elevation / 8000) * 0.3 : 0.3;
  const moistureFactor = moisture * 0.4;
  const temperatureFactor = (1 - Math.abs(temperature) / 60) * 0.3;
  return Math.min(1, Math.max(0, moistureFactor + temperatureFactor + elevationFactor));
}

function toReadonly(chunk: MutableChunk): TerrainChunk {
  return {
    chunkId: chunk.chunkId,
    worldId: chunk.worldId,
    coords: chunk.coords,
    biome: chunk.biome,
    elevation: chunk.elevation,
    moisture: chunk.moisture,
    temperature: chunk.temperature,
    resourceDensity: chunk.resourceDensity,
    generatedAt: chunk.generatedAt,
  };
}

function validateChunkParams(
  elevation: number,
  moisture: number,
  temperature: number,
): TerrainError | null {
  if (elevation < -1000 || elevation > 8000) return 'invalid-elevation';
  if (moisture < 0 || moisture > 1) return 'invalid-coordinates';
  if (temperature < -60 || temperature > 60) return 'invalid-coordinates';
  return null;
}

// ── Operations ────────────────────────────────────────────────────

function registerWorldImpl(
  state: TerrainState,
  worldId: WorldId,
): { success: true } | { success: false; error: TerrainError } {
  if (state.worlds.has(worldId)) return { success: false, error: 'already-exists' };
  state.worlds.add(worldId);
  state.logger.info('terrain-world-registered worldId=' + worldId);
  return { success: true };
}

function buildChunk(
  state: TerrainState,
  worldId: WorldId,
  coords: ChunkCoords,
  biome: Biome,
  elevation: number,
  moisture: number,
  temperature: number,
): MutableChunk {
  return {
    chunkId: state.idGen.generate(),
    worldId,
    coords,
    biome,
    elevation,
    moisture,
    temperature,
    resourceDensity: computeResourceDensity(elevation, moisture, temperature),
    generatedAt: state.clock.nowUs(),
  };
}

function generateChunkImpl(
  state: TerrainState,
  worldId: WorldId,
  coords: ChunkCoords,
  biome: Biome,
  elevation: number,
  moisture: number,
  temperature: number,
): TerrainChunk | TerrainError {
  if (!state.worlds.has(worldId)) return 'world-not-found';
  const validationError = validateChunkParams(elevation, moisture, temperature);
  if (validationError !== null) return validationError;
  const key = coordKey(worldId, coords.chunkX, coords.chunkZ);
  if (state.coordIndex.has(key)) return 'already-exists';
  const chunk = buildChunk(state, worldId, coords, biome, elevation, moisture, temperature);
  state.chunks.set(chunk.chunkId, chunk);
  state.coordIndex.set(key, chunk.chunkId);
  state.logger.info('terrain-chunk-generated chunkId=' + chunk.chunkId + ' worldId=' + worldId);
  return toReadonly(chunk);
}

function updateChunkImpl(
  state: TerrainState,
  chunkId: ChunkId,
  updates: Partial<Pick<TerrainChunk, 'moisture' | 'temperature' | 'resourceDensity'>>,
): { success: true } | { success: false; error: TerrainError } {
  const chunk = state.chunks.get(chunkId);
  if (chunk === undefined) return { success: false, error: 'chunk-not-found' };
  if (updates.moisture !== undefined) chunk.moisture = updates.moisture;
  if (updates.temperature !== undefined) chunk.temperature = updates.temperature;
  if (updates.resourceDensity !== undefined) chunk.resourceDensity = updates.resourceDensity;
  return { success: true };
}

function listChunksImpl(
  state: TerrainState,
  worldId: WorldId,
  biome?: Biome,
): ReadonlyArray<TerrainChunk> {
  const result: TerrainChunk[] = [];
  for (const [, chunk] of state.chunks) {
    if (chunk.worldId !== worldId) continue;
    if (biome !== undefined && chunk.biome !== biome) continue;
    result.push(toReadonly(chunk));
  }
  return result;
}

const ALL_BIOMES: ReadonlyArray<Biome> = [
  'DESERT',
  'FOREST',
  'TUNDRA',
  'OCEAN',
  'MOUNTAIN',
  'PLAINS',
  'SWAMP',
  'VOLCANIC',
];

function getBiomeDistributionImpl(state: TerrainState, worldId: WorldId): BiomeDistribution {
  const byBiome = Object.fromEntries(ALL_BIOMES.map((b) => [b, 0])) as Record<Biome, number>;
  let totalChunks = 0;
  for (const [, chunk] of state.chunks) {
    if (chunk.worldId !== worldId) continue;
    byBiome[chunk.biome] += 1;
    totalChunks += 1;
  }
  return { worldId, byBiome, totalChunks };
}

function getNeighborsImpl(state: TerrainState, chunkId: ChunkId): ReadonlyArray<TerrainChunk> {
  const chunk = state.chunks.get(chunkId);
  if (chunk === undefined) return [];
  const { worldId, coords } = chunk;
  const neighbors: TerrainChunk[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      if (dx === 0 && dz === 0) continue;
      const key = coordKey(worldId, coords.chunkX + dx, coords.chunkZ + dz);
      const neighborId = state.coordIndex.get(key);
      if (neighborId === undefined) continue;
      const neighbor = state.chunks.get(neighborId);
      if (neighbor !== undefined) neighbors.push(toReadonly(neighbor));
    }
  }
  return neighbors;
}

// ── Factory ───────────────────────────────────────────────────────

export function createTerrainEngineSystem(deps: TerrainEngineDeps): TerrainEngineSystem {
  const state: TerrainState = {
    worlds: new Set(),
    chunks: new Map(),
    coordIndex: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };

  return {
    registerWorld: (worldId) => registerWorldImpl(state, worldId),
    generateChunk: (worldId, coords, biome, elevation, moisture, temperature) =>
      generateChunkImpl(state, worldId, coords, biome, elevation, moisture, temperature),
    updateChunk: (chunkId, updates) => updateChunkImpl(state, chunkId, updates),
    getChunk: (chunkId) => {
      const chunk = state.chunks.get(chunkId);
      return chunk !== undefined ? toReadonly(chunk) : undefined;
    },
    getChunkAt: (worldId, coords) => {
      const key = coordKey(worldId, coords.chunkX, coords.chunkZ);
      const chunkId = state.coordIndex.get(key);
      if (chunkId === undefined) return undefined;
      const chunk = state.chunks.get(chunkId);
      return chunk !== undefined ? toReadonly(chunk) : undefined;
    },
    listChunks: (worldId, biome) => listChunksImpl(state, worldId, biome),
    getBiomeDistribution: (worldId) => getBiomeDistributionImpl(state, worldId),
    getNeighbors: (chunkId) => getNeighborsImpl(state, chunkId),
  };
}
