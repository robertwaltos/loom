/**
 * world-atlas.ts — Geographic records for worlds.
 *
 * Stores biome types, territory ownership, resource deposits, hazard zones.
 * Tracks territorial changes over time. Provides world map queries and
 * ownership history.
 */

// ── Ports ────────────────────────────────────────────────────────

interface AtlasClockPort {
  readonly nowMicroseconds: () => number;
}

interface AtlasIdPort {
  readonly generate: () => string;
}

interface AtlasLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
}

interface AtlasDeps {
  readonly clock: AtlasClockPort;
  readonly idGenerator: AtlasIdPort;
  readonly logger: AtlasLoggerPort;
}

// ── Types ────────────────────────────────────────────────────────

type BiomeType = 'FOREST' | 'DESERT' | 'TUNDRA' | 'OCEAN' | 'VOLCANIC' | 'PLAINS' | 'MOUNTAIN';

interface Coordinates {
  readonly latitude: number;
  readonly longitude: number;
}

interface BiomeRegion {
  readonly regionId: string;
  readonly biomeType: BiomeType;
  readonly centerCoords: Coordinates;
  readonly radiusKm: number;
  readonly description: string;
  readonly addedAt: number;
}

interface TerritoryOwnership {
  readonly territoryId: string;
  readonly regionId: string;
  readonly dynastyId: string;
  readonly claimedAt: number;
  readonly description: string;
}

interface ResourceDeposit {
  readonly depositId: string;
  readonly resourceType: string;
  readonly coords: Coordinates;
  readonly quantity: number;
  readonly discovered: boolean;
  readonly discoveredBy?: string;
  readonly discoveredAt?: number;
  readonly addedAt: number;
}

interface HazardZone {
  readonly hazardId: string;
  readonly hazardType: string;
  readonly coords: Coordinates;
  readonly radiusKm: number;
  readonly severity: number;
  readonly description: string;
  readonly addedAt: number;
}

interface WorldRecord {
  readonly worldId: string;
  readonly worldName: string;
  readonly biomes: readonly BiomeRegion[];
  readonly territories: readonly TerritoryOwnership[];
  readonly resources: readonly ResourceDeposit[];
  readonly hazards: readonly HazardZone[];
  readonly createdAt: number;
}

interface RegisterWorldParams {
  readonly worldId: string;
  readonly worldName: string;
}

interface AddBiomeParams {
  readonly worldId: string;
  readonly biomeType: BiomeType;
  readonly centerCoords: Coordinates;
  readonly radiusKm: number;
  readonly description: string;
}

interface SetTerritoryOwnerParams {
  readonly worldId: string;
  readonly regionId: string;
  readonly dynastyId: string;
  readonly description: string;
}

interface AddResourceDepositParams {
  readonly worldId: string;
  readonly resourceType: string;
  readonly coords: Coordinates;
  readonly quantity: number;
}

interface DiscoverResourceParams {
  readonly worldId: string;
  readonly depositId: string;
  readonly dynastyId: string;
}

interface MarkHazardZoneParams {
  readonly worldId: string;
  readonly hazardType: string;
  readonly coords: Coordinates;
  readonly radiusKm: number;
  readonly severity: number;
  readonly description: string;
}

interface OwnershipHistoryEntry {
  readonly territoryId: string;
  readonly dynastyId: string;
  readonly claimedAt: number;
}

interface AtlasStats {
  readonly totalWorlds: number;
  readonly totalBiomes: number;
  readonly totalTerritories: number;
  readonly totalResources: number;
  readonly totalHazards: number;
  readonly biomeDistribution: Record<BiomeType, number>;
}

interface WorldAtlas {
  readonly registerWorld: (params: RegisterWorldParams) => WorldRecord;
  readonly addBiome: (params: AddBiomeParams) => BiomeRegion | string;
  readonly setTerritoryOwner: (params: SetTerritoryOwnerParams) => TerritoryOwnership | string;
  readonly addResourceDeposit: (params: AddResourceDepositParams) => ResourceDeposit | string;
  readonly discoverResource: (params: DiscoverResourceParams) => ResourceDeposit | string;
  readonly markHazardZone: (params: MarkHazardZoneParams) => HazardZone | string;
  readonly getWorldMap: (worldId: string) => WorldRecord | undefined;
  readonly getOwnershipHistory: (
    worldId: string,
    regionId: string,
  ) => readonly OwnershipHistoryEntry[];
  readonly getStats: () => AtlasStats;
}

// ── State ────────────────────────────────────────────────────────

interface MutableBiomeRegion {
  readonly regionId: string;
  readonly biomeType: BiomeType;
  readonly centerCoords: Coordinates;
  readonly radiusKm: number;
  readonly description: string;
  readonly addedAt: number;
}

interface MutableTerritoryOwnership {
  readonly territoryId: string;
  readonly regionId: string;
  readonly dynastyId: string;
  readonly claimedAt: number;
  readonly description: string;
}

interface MutableResourceDeposit {
  readonly depositId: string;
  readonly resourceType: string;
  readonly coords: Coordinates;
  readonly quantity: number;
  discovered: boolean;
  discoveredBy?: string;
  discoveredAt?: number;
  readonly addedAt: number;
}

interface MutableHazardZone {
  readonly hazardId: string;
  readonly hazardType: string;
  readonly coords: Coordinates;
  readonly radiusKm: number;
  readonly severity: number;
  readonly description: string;
  readonly addedAt: number;
}

interface MutableWorldRecord {
  readonly worldId: string;
  readonly worldName: string;
  readonly biomes: MutableBiomeRegion[];
  readonly territories: MutableTerritoryOwnership[];
  readonly resources: MutableResourceDeposit[];
  readonly hazards: MutableHazardZone[];
  readonly createdAt: number;
}

interface AtlasState {
  readonly deps: AtlasDeps;
  readonly worlds: Map<string, MutableWorldRecord>;
  readonly regionIndex: Map<string, string>;
  readonly depositIndex: Map<string, string>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toWorldRecord(world: MutableWorldRecord): WorldRecord {
  return {
    worldId: world.worldId,
    worldName: world.worldName,
    biomes: world.biomes.slice(),
    territories: world.territories.slice(),
    resources: world.resources.map((r) => ({
      depositId: r.depositId,
      resourceType: r.resourceType,
      coords: r.coords,
      quantity: r.quantity,
      discovered: r.discovered,
      discoveredBy: r.discoveredBy,
      discoveredAt: r.discoveredAt,
      addedAt: r.addedAt,
    })),
    hazards: world.hazards.slice(),
    createdAt: world.createdAt,
  };
}

function toBiomeRegion(biome: MutableBiomeRegion): BiomeRegion {
  return {
    regionId: biome.regionId,
    biomeType: biome.biomeType,
    centerCoords: biome.centerCoords,
    radiusKm: biome.radiusKm,
    description: biome.description,
    addedAt: biome.addedAt,
  };
}

function toTerritoryOwnership(territory: MutableTerritoryOwnership): TerritoryOwnership {
  return {
    territoryId: territory.territoryId,
    regionId: territory.regionId,
    dynastyId: territory.dynastyId,
    claimedAt: territory.claimedAt,
    description: territory.description,
  };
}

function toResourceDeposit(resource: MutableResourceDeposit): ResourceDeposit {
  return {
    depositId: resource.depositId,
    resourceType: resource.resourceType,
    coords: resource.coords,
    quantity: resource.quantity,
    discovered: resource.discovered,
    discoveredBy: resource.discoveredBy,
    discoveredAt: resource.discoveredAt,
    addedAt: resource.addedAt,
  };
}

function toHazardZone(hazard: MutableHazardZone): HazardZone {
  return {
    hazardId: hazard.hazardId,
    hazardType: hazard.hazardType,
    coords: hazard.coords,
    radiusKm: hazard.radiusKm,
    severity: hazard.severity,
    description: hazard.description,
    addedAt: hazard.addedAt,
  };
}

// ── Operations ───────────────────────────────────────────────────

function registerWorldImpl(state: AtlasState, params: RegisterWorldParams): WorldRecord {
  const now = state.deps.clock.nowMicroseconds();
  const worldRecord: MutableWorldRecord = {
    worldId: params.worldId,
    worldName: params.worldName,
    biomes: [],
    territories: [],
    resources: [],
    hazards: [],
    createdAt: now,
  };
  state.worlds.set(params.worldId, worldRecord);
  state.deps.logger.info('world-registered', {
    worldId: params.worldId,
    worldName: params.worldName,
  });
  return toWorldRecord(worldRecord);
}

function addBiomeImpl(state: AtlasState, params: AddBiomeParams): BiomeRegion | string {
  const world = state.worlds.get(params.worldId);
  if (world === undefined) {
    return 'WORLD_NOT_FOUND';
  }
  const now = state.deps.clock.nowMicroseconds();
  const regionId = state.deps.idGenerator.generate();
  const biome: MutableBiomeRegion = {
    regionId,
    biomeType: params.biomeType,
    centerCoords: params.centerCoords,
    radiusKm: params.radiusKm,
    description: params.description,
    addedAt: now,
  };
  world.biomes.push(biome);
  state.regionIndex.set(regionId, params.worldId);
  state.deps.logger.info('biome-added', {
    worldId: params.worldId,
    regionId,
    biomeType: params.biomeType,
  });
  return toBiomeRegion(biome);
}

function setTerritoryOwnerImpl(
  state: AtlasState,
  params: SetTerritoryOwnerParams,
): TerritoryOwnership | string {
  const world = state.worlds.get(params.worldId);
  if (world === undefined) {
    return 'WORLD_NOT_FOUND';
  }
  const regionExists = world.biomes.some((b) => b.regionId === params.regionId);
  if (!regionExists) {
    return 'REGION_NOT_FOUND';
  }
  const now = state.deps.clock.nowMicroseconds();
  const territoryId = state.deps.idGenerator.generate();
  const territory: MutableTerritoryOwnership = {
    territoryId,
    regionId: params.regionId,
    dynastyId: params.dynastyId,
    claimedAt: now,
    description: params.description,
  };
  world.territories.push(territory);
  state.deps.logger.info('territory-claimed', {
    worldId: params.worldId,
    territoryId,
    dynastyId: params.dynastyId,
  });
  return toTerritoryOwnership(territory);
}

function addResourceDepositImpl(
  state: AtlasState,
  params: AddResourceDepositParams,
): ResourceDeposit | string {
  const world = state.worlds.get(params.worldId);
  if (world === undefined) {
    return 'WORLD_NOT_FOUND';
  }
  const now = state.deps.clock.nowMicroseconds();
  const depositId = state.deps.idGenerator.generate();
  const deposit: MutableResourceDeposit = {
    depositId,
    resourceType: params.resourceType,
    coords: params.coords,
    quantity: params.quantity,
    discovered: false,
    addedAt: now,
  };
  world.resources.push(deposit);
  state.depositIndex.set(depositId, params.worldId);
  state.deps.logger.info('resource-deposit-added', {
    worldId: params.worldId,
    depositId,
    resourceType: params.resourceType,
  });
  return toResourceDeposit(deposit);
}

function discoverResourceImpl(
  state: AtlasState,
  params: DiscoverResourceParams,
): ResourceDeposit | string {
  const world = state.worlds.get(params.worldId);
  if (world === undefined) {
    return 'WORLD_NOT_FOUND';
  }
  const deposit = world.resources.find((r) => r.depositId === params.depositId);
  if (deposit === undefined) {
    return 'DEPOSIT_NOT_FOUND';
  }
  if (deposit.discovered) {
    return 'ALREADY_DISCOVERED';
  }
  const now = state.deps.clock.nowMicroseconds();
  deposit.discovered = true;
  deposit.discoveredBy = params.dynastyId;
  deposit.discoveredAt = now;
  state.deps.logger.info('resource-discovered', {
    worldId: params.worldId,
    depositId: params.depositId,
    dynastyId: params.dynastyId,
  });
  return toResourceDeposit(deposit);
}

function markHazardZoneImpl(state: AtlasState, params: MarkHazardZoneParams): HazardZone | string {
  const world = state.worlds.get(params.worldId);
  if (world === undefined) {
    return 'WORLD_NOT_FOUND';
  }
  const now = state.deps.clock.nowMicroseconds();
  const hazardId = state.deps.idGenerator.generate();
  const hazard: MutableHazardZone = {
    hazardId,
    hazardType: params.hazardType,
    coords: params.coords,
    radiusKm: params.radiusKm,
    severity: params.severity,
    description: params.description,
    addedAt: now,
  };
  world.hazards.push(hazard);
  state.deps.logger.info('hazard-zone-marked', {
    worldId: params.worldId,
    hazardId,
    hazardType: params.hazardType,
  });
  return toHazardZone(hazard);
}

function getOwnershipHistoryImpl(
  state: AtlasState,
  worldId: string,
  regionId: string,
): readonly OwnershipHistoryEntry[] {
  const world = state.worlds.get(worldId);
  if (world === undefined) return [];
  const history: OwnershipHistoryEntry[] = [];
  for (const territory of world.territories) {
    if (territory.regionId === regionId) {
      history.push({
        territoryId: territory.territoryId,
        dynastyId: territory.dynastyId,
        claimedAt: territory.claimedAt,
      });
    }
  }
  history.sort((a, b) => a.claimedAt - b.claimedAt);
  return history;
}

function getStatsImpl(state: AtlasState): AtlasStats {
  let totalBiomes = 0;
  let totalTerritories = 0;
  let totalResources = 0;
  let totalHazards = 0;
  const biomeDistribution: Record<BiomeType, number> = {
    FOREST: 0,
    DESERT: 0,
    TUNDRA: 0,
    OCEAN: 0,
    VOLCANIC: 0,
    PLAINS: 0,
    MOUNTAIN: 0,
  };
  for (const world of state.worlds.values()) {
    totalBiomes = totalBiomes + world.biomes.length;
    totalTerritories = totalTerritories + world.territories.length;
    totalResources = totalResources + world.resources.length;
    totalHazards = totalHazards + world.hazards.length;
    for (const biome of world.biomes) {
      biomeDistribution[biome.biomeType]++;
    }
  }
  return {
    totalWorlds: state.worlds.size,
    totalBiomes,
    totalTerritories,
    totalResources,
    totalHazards,
    biomeDistribution,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createWorldAtlas(deps: AtlasDeps): WorldAtlas {
  const state: AtlasState = {
    deps,
    worlds: new Map(),
    regionIndex: new Map(),
    depositIndex: new Map(),
  };
  return {
    registerWorld: (p) => registerWorldImpl(state, p),
    addBiome: (p) => addBiomeImpl(state, p),
    setTerritoryOwner: (p) => setTerritoryOwnerImpl(state, p),
    addResourceDeposit: (p) => addResourceDepositImpl(state, p),
    discoverResource: (p) => discoverResourceImpl(state, p),
    markHazardZone: (p) => markHazardZoneImpl(state, p),
    getWorldMap: (id) => {
      const w = state.worlds.get(id);
      if (w === undefined) return undefined;
      return toWorldRecord(w);
    },
    getOwnershipHistory: (wId, rId) => getOwnershipHistoryImpl(state, wId, rId),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createWorldAtlas };
export type {
  WorldAtlas,
  AtlasDeps,
  AtlasClockPort,
  AtlasIdPort,
  AtlasLoggerPort,
  BiomeType,
  Coordinates,
  BiomeRegion,
  TerritoryOwnership,
  ResourceDeposit,
  HazardZone,
  WorldRecord,
  RegisterWorldParams,
  AddBiomeParams,
  SetTerritoryOwnerParams,
  AddResourceDepositParams,
  DiscoverResourceParams,
  MarkHazardZoneParams,
  OwnershipHistoryEntry,
  AtlasStats,
};
