/**
 * World Generator — Procedural world creation from stellar parameters.
 *
 * Each of The Loom's 600 worlds is deterministically generated from
 * a seed derived from its world ID and stellar classification.
 * Diamond-square heightmaps, continent placement, and orbital
 * mechanics flow from the seed — same input, same world, always.
 */

// ─── Types ──────────────────────────────────────────────────────────

export type StellarClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';

export type ZoneType = 'inner' | 'habitable' | 'outer';

export interface StellarInput {
  readonly starClass: StellarClass;
  readonly zone: ZoneType;
  readonly worldId: string;
}

export interface WorldParameters {
  readonly worldId: string;
  readonly seed: number;
  readonly starClass: StellarClass;
  readonly zone: ZoneType;
  readonly gravity: number;
  readonly atmosphereDensity: number;
  readonly surfaceTemperatureK: number;
  readonly waterCoverage: number;
  readonly axialTiltDeg: number;
  readonly dayLengthHours: number;
  readonly yearLengthDays: number;
  readonly continentCount: number;
}

export interface TerrainHeightmap {
  readonly size: number;
  readonly data: ReadonlyArray<ReadonlyArray<number>>;
  readonly minElevation: number;
  readonly maxElevation: number;
}

export interface ContinentPlacement {
  readonly centerX: number;
  readonly centerY: number;
  readonly radius: number;
  readonly index: number;
}

export interface GeneratedWorld {
  readonly parameters: WorldParameters;
  readonly heightmap: TerrainHeightmap;
  readonly continents: ReadonlyArray<ContinentPlacement>;
  readonly oceanLevel: number;
}

export interface WorldGenerator {
  generate(input: StellarInput): GeneratedWorld;
  generateParameters(input: StellarInput): WorldParameters;
  generateHeightmap(seed: number, size: number): TerrainHeightmap;
  seedFromWorldId(worldId: string): number;
}

// ─── Constants ──────────────────────────────────────────────────────

const STELLAR_TEMPERATURE_K: Record<StellarClass, number> = {
  O: 40000,
  B: 20000,
  A: 8500,
  F: 6500,
  G: 5500,
  K: 4500,
  M: 3200,
};

const ZONE_TEMP_MULTIPLIER: Record<ZoneType, number> = {
  inner: 1.8,
  habitable: 1.0,
  outer: 0.4,
};

const STELLAR_LUMINOSITY: Record<StellarClass, number> = {
  O: 500000,
  B: 20000,
  A: 25,
  F: 3.0,
  G: 1.0,
  K: 0.4,
  M: 0.04,
};

const DEFAULT_HEIGHTMAP_SIZE = 65;

// ─── Factory ────────────────────────────────────────────────────────

interface GeneratorState {
  readonly heightmapSize: number;
}

export function createWorldGenerator(
  heightmapSize: number = DEFAULT_HEIGHTMAP_SIZE,
): WorldGenerator {
  const state: GeneratorState = { heightmapSize };

  return {
    generate: (input) => generateWorldImpl(state, input),
    generateParameters: (input) => buildWorldParameters(input),
    generateHeightmap: (seed, size) => buildHeightmap(seed, size),
    seedFromWorldId: (worldId) => hashWorldId(worldId),
  };
}

// ─── Seed Generation ────────────────────────────────────────────────

function hashWorldId(worldId: string): number {
  let hash = 5381;
  for (let i = 0; i < worldId.length; i++) {
    hash = ((hash << 5) + hash + worldId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// ─── Seeded Random ──────────────────────────────────────────────────

function createSeededRandom(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state * 1103515245 + 12345) | 0;
    return Math.abs(state) / 2147483647;
  };
}

// ─── World Parameters ───────────────────────────────────────────────

function buildWorldParameters(input: StellarInput): WorldParameters {
  const seed = hashWorldId(input.worldId);
  const rng = createSeededRandom(seed);
  const baseTemp = STELLAR_TEMPERATURE_K[input.starClass];
  const zoneMult = ZONE_TEMP_MULTIPLIER[input.zone];

  return {
    worldId: input.worldId,
    seed,
    starClass: input.starClass,
    zone: input.zone,
    gravity: computeGravity(rng, input.starClass),
    atmosphereDensity: computeAtmosphere(rng, input.zone),
    surfaceTemperatureK: computeSurfaceTemp(baseTemp, zoneMult, rng),
    waterCoverage: computeWaterCoverage(rng, input.zone),
    axialTiltDeg: rng() * 45,
    dayLengthHours: 8 + rng() * 60,
    yearLengthDays: computeYearLength(rng, input.starClass),
    continentCount: computeContinentCount(rng),
  };
}

function computeGravity(rng: () => number, starClass: StellarClass): number {
  const luminosity = STELLAR_LUMINOSITY[starClass];
  const base = 0.3 + luminosity * 0.001;
  const clamped = Math.min(base, 2.5);
  return clamped + (rng() - 0.5) * 0.4;
}

function computeAtmosphere(rng: () => number, zone: ZoneType): number {
  if (zone === 'inner') return rng() * 0.5;
  if (zone === 'outer') return 0.2 + rng() * 1.5;
  return 0.5 + rng() * 1.0;
}

function computeSurfaceTemp(baseTemp: number, zoneMult: number, rng: () => number): number {
  const surfaceBase = (baseTemp * zoneMult) / 140;
  const variance = (rng() - 0.5) * 40;
  return Math.max(50, surfaceBase + variance);
}

function computeWaterCoverage(rng: () => number, zone: ZoneType): number {
  if (zone === 'inner') return rng() * 0.15;
  if (zone === 'outer') return rng() * 0.3;
  return 0.2 + rng() * 0.6;
}

function computeYearLength(rng: () => number, starClass: StellarClass): number {
  const luminosity = STELLAR_LUMINOSITY[starClass];
  const base = 100 + Math.sqrt(luminosity) * 50;
  return base + rng() * 300;
}

function computeContinentCount(rng: () => number): number {
  return 2 + Math.floor(rng() * 7);
}

// ─── Grid Access Helper ─────────────────────────────────────────────

function gridAt(grid: number[][], y: number, x: number): number {
  return (grid[y] as number[])[x] as number;
}

function gridSet(grid: number[][], y: number, x: number, v: number): void {
  (grid[y] as number[])[x] = v;
}

// ─── Heightmap Generation (Diamond-Square) ──────────────────────────

function buildHeightmap(seed: number, size: number): TerrainHeightmap {
  const validSize = nearestPowerOfTwoPlusOne(size);
  const rng = createSeededRandom(seed);
  const grid = initializeGrid(validSize);

  seedCorners(grid, validSize, rng);
  diamondSquareFill(grid, validSize, rng);
  const bounds = findBounds(grid, validSize);

  return {
    size: validSize,
    data: grid,
    minElevation: bounds.min,
    maxElevation: bounds.max,
  };
}

function nearestPowerOfTwoPlusOne(size: number): number {
  let power = 2;
  while (power + 1 < size) power *= 2;
  return power + 1;
}

function initializeGrid(size: number): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < size; y++) {
    grid.push(new Array<number>(size).fill(0));
  }
  return grid;
}

function seedCorners(grid: number[][], size: number, rng: () => number): void {
  const last = size - 1;
  gridSet(grid, 0, 0, rng());
  gridSet(grid, 0, last, rng());
  gridSet(grid, last, 0, rng());
  gridSet(grid, last, last, rng());
}

function diamondSquareFill(grid: number[][], size: number, rng: () => number): void {
  let step = size - 1;
  let scale = 1.0;

  while (step > 1) {
    const half = step >> 1;
    diamondStep(grid, size, step, half, scale, rng);
    squareStep(grid, size, step, half, scale, rng);
    step = half;
    scale *= 0.5;
  }
}

function diamondStep(
  grid: number[][],
  size: number,
  step: number,
  half: number,
  scale: number,
  rng: () => number,
): void {
  for (let y = 0; y + step < size; y += step) {
    for (let x = 0; x + step < size; x += step) {
      const avg = averageFour(
        gridAt(grid, y, x),
        gridAt(grid, y, x + step),
        gridAt(grid, y + step, x),
        gridAt(grid, y + step, x + step),
      );
      gridSet(grid, y + half, x + half, avg + (rng() - 0.5) * scale);
    }
  }
}

function squareStep(
  grid: number[][],
  size: number,
  step: number,
  half: number,
  scale: number,
  rng: () => number,
): void {
  for (let y = 0; y < size; y += half) {
    const xStart = (y / half) % 2 === 0 ? half : 0;
    for (let x = xStart; x < size; x += step) {
      const avg = averageNeighbors(grid, x, y, half, size);
      gridSet(grid, y, x, avg + (rng() - 0.5) * scale);
    }
  }
}

function averageFour(a: number, b: number, c: number, d: number): number {
  return (a + b + c + d) / 4;
}

function averageNeighbors(
  grid: number[][],
  x: number,
  y: number,
  half: number,
  size: number,
): number {
  let sum = 0;
  let count = 0;
  if (y - half >= 0) {
    sum += gridAt(grid, y - half, x);
    count++;
  }
  if (y + half < size) {
    sum += gridAt(grid, y + half, x);
    count++;
  }
  if (x - half >= 0) {
    sum += gridAt(grid, y, x - half);
    count++;
  }
  if (x + half < size) {
    sum += gridAt(grid, y, x + half);
    count++;
  }
  return count > 0 ? sum / count : 0;
}

function findBounds(
  grid: number[][],
  size: number,
): { readonly min: number; readonly max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const val = gridAt(grid, y, x);
      if (val < min) min = val;
      if (val > max) max = val;
    }
  }
  return { min, max };
}

// ─── Continent Placement ────────────────────────────────────────────

function placeContinents(params: WorldParameters): ReadonlyArray<ContinentPlacement> {
  const rng = createSeededRandom(params.seed + 7919);
  const placements: ContinentPlacement[] = [];

  for (let i = 0; i < params.continentCount; i++) {
    placements.push({
      centerX: rng(),
      centerY: 0.1 + rng() * 0.8,
      radius: 0.08 + rng() * 0.18,
      index: i,
    });
  }
  return placements;
}

// ─── Full Generation ────────────────────────────────────────────────

function generateWorldImpl(state: GeneratorState, input: StellarInput): GeneratedWorld {
  const parameters = buildWorldParameters(input);
  const heightmap = buildHeightmap(parameters.seed, state.heightmapSize);
  const continents = placeContinents(parameters);
  const oceanLevel = computeOceanLevel(parameters.waterCoverage, heightmap);

  return { parameters, heightmap, continents, oceanLevel };
}

function computeOceanLevel(waterCoverage: number, heightmap: TerrainHeightmap): number {
  const range = heightmap.maxElevation - heightmap.minElevation;
  return heightmap.minElevation + range * waterCoverage;
}
