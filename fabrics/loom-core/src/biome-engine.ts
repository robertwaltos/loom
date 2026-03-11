/**
 * Biome Engine — Classification and placement of biomes across worlds.
 *
 * Temperature, precipitation, elevation, and latitude combine to
 * determine which biome occupies each terrain cell. Transition zones
 * blend adjacent biomes. Each biome carries resource, habitability,
 * and danger metadata for downstream systems.
 */

// ─── Types ──────────────────────────────────────────────────────────

export type BiomeType =
  | 'OCEAN'
  | 'COAST'
  | 'DESERT'
  | 'GRASSLAND'
  | 'FOREST'
  | 'JUNGLE'
  | 'TUNDRA'
  | 'MOUNTAIN'
  | 'VOLCANIC'
  | 'SWAMP'
  | 'ARCTIC'
  | 'SAVANNA'
  | 'REEF'
  | 'CAVE_SYSTEM'
  | 'CRYSTAL_FORMATION';

export type ClimateZone = 'POLAR' | 'SUBPOLAR' | 'TEMPERATE' | 'SUBTROPICAL' | 'TROPICAL';

export interface BiomeCell {
  readonly biome: BiomeType;
  readonly temperature: number;
  readonly precipitation: number;
  readonly elevation: number;
  readonly latitude: number;
  readonly habitability: number;
  readonly dangerLevel: number;
}

export interface BiomeTransition {
  readonly fromBiome: BiomeType;
  readonly toBiome: BiomeType;
  readonly blendFactor: number;
}

export interface BiomeResourceDeposit {
  readonly biome: BiomeType;
  readonly primaryResources: ReadonlyArray<string>;
  readonly rareResources: ReadonlyArray<string>;
}

export interface BiomeMetadata {
  readonly type: BiomeType;
  readonly habitabilityBase: number;
  readonly dangerBase: number;
  readonly primaryResources: ReadonlyArray<string>;
  readonly rareResources: ReadonlyArray<string>;
}

export interface BiomeMap {
  readonly width: number;
  readonly height: number;
  readonly cells: ReadonlyArray<ReadonlyArray<BiomeCell>>;
  readonly climateZones: ReadonlyArray<ClimateZone>;
}

export interface BiomeClassificationInput {
  readonly temperature: number;
  readonly precipitation: number;
  readonly elevation: number;
  readonly latitude: number;
}

export interface BiomeEngine {
  classifyBiome(input: BiomeClassificationInput): BiomeType;
  getClimateZone(latitude: number, axialTilt: number): ClimateZone;
  getBiomeMetadata(biome: BiomeType): BiomeMetadata;
  computeHabitability(biome: BiomeType, waterAccess: boolean): number;
  computeDangerLevel(biome: BiomeType, stellarActivity: number): number;
  computeTransition(a: BiomeType, b: BiomeType, t: number): BiomeTransition;
  generateBiomeMap(params: BiomeMapParams): BiomeMap;
}

export interface BiomeMapParams {
  readonly width: number;
  readonly height: number;
  readonly temperatures: ReadonlyArray<ReadonlyArray<number>>;
  readonly precipitations: ReadonlyArray<ReadonlyArray<number>>;
  readonly elevations: ReadonlyArray<ReadonlyArray<number>>;
  readonly axialTilt: number;
  readonly oceanLevel: number;
}

// ─── Metadata Table ─────────────────────────────────────────────────

const BIOME_TABLE: ReadonlyArray<BiomeMetadata> = [
  {
    type: 'OCEAN',
    habitabilityBase: 0.1,
    dangerBase: 0.3,
    primaryResources: ['WATER', 'ORGANIC'],
    rareResources: ['EXOTIC_MATTER'],
  },
  {
    type: 'COAST',
    habitabilityBase: 0.8,
    dangerBase: 0.15,
    primaryResources: ['WATER', 'ORGANIC'],
    rareResources: ['CRYSTAL'],
  },
  {
    type: 'DESERT',
    habitabilityBase: 0.15,
    dangerBase: 0.5,
    primaryResources: ['MINERALS', 'ENERGY'],
    rareResources: ['RARE_EARTH'],
  },
  {
    type: 'GRASSLAND',
    habitabilityBase: 0.85,
    dangerBase: 0.1,
    primaryResources: ['ORGANIC', 'WATER'],
    rareResources: ['MINERALS'],
  },
  {
    type: 'FOREST',
    habitabilityBase: 0.7,
    dangerBase: 0.2,
    primaryResources: ['ORGANIC', 'WATER'],
    rareResources: ['RARE_EARTH'],
  },
  {
    type: 'JUNGLE',
    habitabilityBase: 0.5,
    dangerBase: 0.45,
    primaryResources: ['ORGANIC', 'WATER'],
    rareResources: ['EXOTIC_MATTER'],
  },
  {
    type: 'TUNDRA',
    habitabilityBase: 0.2,
    dangerBase: 0.35,
    primaryResources: ['MINERALS', 'GAS'],
    rareResources: ['RARE_EARTH'],
  },
  {
    type: 'MOUNTAIN',
    habitabilityBase: 0.25,
    dangerBase: 0.4,
    primaryResources: ['MINERALS', 'CRYSTAL'],
    rareResources: ['RARE_EARTH'],
  },
  {
    type: 'VOLCANIC',
    habitabilityBase: 0.05,
    dangerBase: 0.85,
    primaryResources: ['MINERALS', 'ENERGY'],
    rareResources: ['EXOTIC_MATTER', 'CRYSTAL'],
  },
  {
    type: 'SWAMP',
    habitabilityBase: 0.3,
    dangerBase: 0.4,
    primaryResources: ['ORGANIC', 'GAS'],
    rareResources: ['RARE_EARTH'],
  },
  {
    type: 'ARCTIC',
    habitabilityBase: 0.05,
    dangerBase: 0.6,
    primaryResources: ['WATER', 'GAS'],
    rareResources: ['CRYSTAL'],
  },
  {
    type: 'SAVANNA',
    habitabilityBase: 0.65,
    dangerBase: 0.2,
    primaryResources: ['ORGANIC', 'MINERALS'],
    rareResources: ['ENERGY'],
  },
  {
    type: 'REEF',
    habitabilityBase: 0.15,
    dangerBase: 0.25,
    primaryResources: ['ORGANIC', 'CRYSTAL'],
    rareResources: ['EXOTIC_MATTER'],
  },
  {
    type: 'CAVE_SYSTEM',
    habitabilityBase: 0.2,
    dangerBase: 0.55,
    primaryResources: ['MINERALS', 'CRYSTAL'],
    rareResources: ['EXOTIC_MATTER'],
  },
  {
    type: 'CRYSTAL_FORMATION',
    habitabilityBase: 0.1,
    dangerBase: 0.7,
    primaryResources: ['CRYSTAL', 'ENERGY'],
    rareResources: ['EXOTIC_MATTER', 'RARE_EARTH'],
  },
];

const BIOME_METADATA_MAP = new Map<BiomeType, BiomeMetadata>();
for (const entry of BIOME_TABLE) {
  BIOME_METADATA_MAP.set(entry.type, entry);
}

// ─── Factory ────────────────────────────────────────────────────────

export function createBiomeEngine(): BiomeEngine {
  return {
    classifyBiome: (input) => classifyBiomeImpl(input),
    getClimateZone: (lat, tilt) => computeClimateZone(lat, tilt),
    getBiomeMetadata: (biome) => lookupMetadata(biome),
    computeHabitability: (biome, water) => habitabilityImpl(biome, water),
    computeDangerLevel: (biome, stellar) => dangerLevelImpl(biome, stellar),
    computeTransition: (a, b, t) => transitionImpl(a, b, t),
    generateBiomeMap: (params) => generateBiomeMapImpl(params),
  };
}

// ─── Classification ─────────────────────────────────────────────────

function classifyBiomeImpl(input: BiomeClassificationInput): BiomeType {
  if (input.elevation < 0.15) return classifyLowElevation(input);
  if (input.elevation > 0.85) return classifyHighElevation(input);
  return classifyMidElevation(input);
}

function classifyLowElevation(input: BiomeClassificationInput): BiomeType {
  if (input.elevation < 0.05) return 'OCEAN';
  if (input.elevation < 0.1) return 'REEF';
  return 'COAST';
}

function classifyHighElevation(input: BiomeClassificationInput): BiomeType {
  if (input.temperature > 0.8) return 'VOLCANIC';
  if (input.elevation > 0.95) return 'CRYSTAL_FORMATION';
  return 'MOUNTAIN';
}

function classifyMidElevation(input: BiomeClassificationInput): BiomeType {
  if (input.temperature < 0.15) return classifyCold(input);
  if (input.temperature > 0.75) return classifyHot(input);
  return classifyTemperate(input);
}

function classifyCold(input: BiomeClassificationInput): BiomeType {
  if (input.latitude > 0.8) return 'ARCTIC';
  return 'TUNDRA';
}

function classifyHot(input: BiomeClassificationInput): BiomeType {
  if (input.precipitation < 0.2) return 'DESERT';
  if (input.precipitation > 0.7) return 'JUNGLE';
  return 'SAVANNA';
}

function classifyTemperate(input: BiomeClassificationInput): BiomeType {
  if (input.precipitation > 0.7) return 'SWAMP';
  if (input.precipitation > 0.45) return 'FOREST';
  if (input.precipitation < 0.2) return 'DESERT';
  return 'GRASSLAND';
}

// ─── Climate Zones ──────────────────────────────────────────────────

function computeClimateZone(latitude: number, axialTilt: number): ClimateZone {
  const adjustedLat = Math.abs(latitude) + axialTilt * 0.01;
  if (adjustedLat > 0.85) return 'POLAR';
  if (adjustedLat > 0.65) return 'SUBPOLAR';
  if (adjustedLat > 0.4) return 'TEMPERATE';
  if (adjustedLat > 0.2) return 'SUBTROPICAL';
  return 'TROPICAL';
}

// ─── Metadata Lookup ────────────────────────────────────────────────

function lookupMetadata(biome: BiomeType): BiomeMetadata {
  const meta = BIOME_METADATA_MAP.get(biome);
  if (meta === undefined) {
    return {
      type: biome,
      habitabilityBase: 0,
      dangerBase: 0,
      primaryResources: [],
      rareResources: [],
    };
  }
  return meta;
}

// ─── Habitability ───────────────────────────────────────────────────

function habitabilityImpl(biome: BiomeType, waterAccess: boolean): number {
  const meta = lookupMetadata(biome);
  const waterBonus = waterAccess ? 0.15 : 0;
  return Math.min(1.0, meta.habitabilityBase + waterBonus);
}

// ─── Danger Level ───────────────────────────────────────────────────

function dangerLevelImpl(biome: BiomeType, stellarActivity: number): number {
  const meta = lookupMetadata(biome);
  const stellarBonus = stellarActivity * 0.2;
  return Math.min(1.0, meta.dangerBase + stellarBonus);
}

// ─── Transitions ────────────────────────────────────────────────────

function transitionImpl(a: BiomeType, b: BiomeType, t: number): BiomeTransition {
  const clamped = Math.max(0, Math.min(1, t));
  return { fromBiome: a, toBiome: b, blendFactor: clamped };
}

// ─── Biome Map Generation ───────────────────────────────────────────

function generateBiomeMapImpl(params: BiomeMapParams): BiomeMap {
  const cells: BiomeCell[][] = [];
  const zones: ClimateZone[] = [];

  for (let y = 0; y < params.height; y++) {
    const latitude = y / Math.max(1, params.height - 1);
    zones.push(computeClimateZone(latitude, params.axialTilt));
    cells.push(buildRow(params, y, latitude));
  }

  return {
    width: params.width,
    height: params.height,
    cells,
    climateZones: zones,
  };
}

function buildRow(params: BiomeMapParams, y: number, latitude: number): BiomeCell[] {
  const row: BiomeCell[] = [];
  for (let x = 0; x < params.width; x++) {
    row.push(buildCell(params, x, y, latitude));
  }
  return row;
}

function buildCell(params: BiomeMapParams, x: number, y: number, latitude: number): BiomeCell {
  const tempRow = params.temperatures[y] as ReadonlyArray<number>;
  const precipRow = params.precipitations[y] as ReadonlyArray<number>;
  const elevRow = params.elevations[y] as ReadonlyArray<number>;
  const temp = tempRow[x] as number;
  const precip = precipRow[x] as number;
  const elev = normalizeElevation(elevRow[x] as number, params.oceanLevel);

  const input: BiomeClassificationInput = {
    temperature: temp,
    precipitation: precip,
    elevation: elev,
    latitude,
  };
  const biome = classifyBiomeImpl(input);
  const meta = lookupMetadata(biome);

  return {
    biome,
    temperature: temp,
    precipitation: precip,
    elevation: elev,
    latitude,
    habitability: meta.habitabilityBase,
    dangerLevel: meta.dangerBase,
  };
}

function normalizeElevation(rawElevation: number, oceanLevel: number): number {
  if (rawElevation <= oceanLevel) {
    return (rawElevation / Math.max(0.001, oceanLevel)) * 0.15;
  }
  const aboveOcean = rawElevation - oceanLevel;
  const maxAbove = 1.0 - oceanLevel;
  return 0.15 + (aboveOcean / Math.max(0.001, maxAbove)) * 0.85;
}
