/**
 * world-census.ts — World population census.
 *
 * Tracks dynasty registration per world: how many dynasties reside
 * in each world, population caps, migration in/out tallies. The
 * census informs issuance calculations and capacity checks.
 */

// ── Ports ────────────────────────────────────────────────────────

interface CensusClock {
  readonly nowMicroseconds: () => number;
}

// ── Types ────────────────────────────────────────────────────────

interface WorldPopulation {
  readonly worldId: string;
  readonly dynastyCount: number;
  readonly populationCap: number;
  readonly lastUpdatedAt: number;
}

interface RegisterResidencyParams {
  readonly dynastyId: string;
  readonly worldId: string;
}

interface MigrationRecord {
  readonly dynastyId: string;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly migratedAt: number;
}

interface CensusStats {
  readonly totalWorlds: number;
  readonly totalResidents: number;
  readonly totalMigrations: number;
}

// ── Public API ───────────────────────────────────────────────────

interface WorldCensusService {
  readonly registerWorld: (worldId: string, populationCap: number) => boolean;
  readonly removeWorld: (worldId: string) => boolean;
  readonly addResident: (params: RegisterResidencyParams) => boolean;
  readonly removeResident: (dynastyId: string) => boolean;
  readonly migrate: (dynastyId: string, toWorldId: string) => MigrationRecord | undefined;
  readonly getPopulation: (worldId: string) => WorldPopulation | undefined;
  readonly getResidentWorld: (dynastyId: string) => string | undefined;
  readonly isWorldFull: (worldId: string) => boolean;
  readonly getStats: () => CensusStats;
}

interface WorldCensusDeps {
  readonly clock: CensusClock;
}

// ── State ────────────────────────────────────────────────────────

interface CensusState {
  readonly worlds: Map<string, MutablePopulation>;
  readonly residentMap: Map<string, string>;
  readonly deps: WorldCensusDeps;
  totalMigrations: number;
}

interface MutablePopulation {
  readonly worldId: string;
  dynastyCount: number;
  readonly populationCap: number;
  lastUpdatedAt: number;
}

// ── Operations ───────────────────────────────────────────────────

function registerWorldImpl(
  state: CensusState,
  worldId: string,
  cap: number,
): boolean {
  if (state.worlds.has(worldId)) return false;
  state.worlds.set(worldId, {
    worldId,
    dynastyCount: 0,
    populationCap: cap,
    lastUpdatedAt: state.deps.clock.nowMicroseconds(),
  });
  return true;
}

function removeWorldImpl(
  state: CensusState,
  worldId: string,
): boolean {
  return state.worlds.delete(worldId);
}

function addResidentImpl(
  state: CensusState,
  params: RegisterResidencyParams,
): boolean {
  if (state.residentMap.has(params.dynastyId)) return false;
  const world = state.worlds.get(params.worldId);
  if (!world) return false;
  if (world.dynastyCount >= world.populationCap) return false;
  state.residentMap.set(params.dynastyId, params.worldId);
  world.dynastyCount++;
  world.lastUpdatedAt = state.deps.clock.nowMicroseconds();
  return true;
}

function removeResidentImpl(
  state: CensusState,
  dynastyId: string,
): boolean {
  const worldId = state.residentMap.get(dynastyId);
  if (worldId === undefined) return false;
  state.residentMap.delete(dynastyId);
  const world = state.worlds.get(worldId);
  if (world) {
    world.dynastyCount--;
    world.lastUpdatedAt = state.deps.clock.nowMicroseconds();
  }
  return true;
}

function migrateImpl(
  state: CensusState,
  dynastyId: string,
  toWorldId: string,
): MigrationRecord | undefined {
  const fromWorldId = state.residentMap.get(dynastyId);
  if (fromWorldId === undefined) return undefined;
  const toWorld = state.worlds.get(toWorldId);
  if (!toWorld) return undefined;
  if (toWorld.dynastyCount >= toWorld.populationCap) return undefined;
  const fromWorld = state.worlds.get(fromWorldId);
  if (fromWorld) {
    fromWorld.dynastyCount--;
    fromWorld.lastUpdatedAt = state.deps.clock.nowMicroseconds();
  }
  toWorld.dynastyCount++;
  toWorld.lastUpdatedAt = state.deps.clock.nowMicroseconds();
  state.residentMap.set(dynastyId, toWorldId);
  state.totalMigrations++;
  return {
    dynastyId,
    fromWorldId,
    toWorldId,
    migratedAt: state.deps.clock.nowMicroseconds(),
  };
}

function getPopulationImpl(
  state: CensusState,
  worldId: string,
): WorldPopulation | undefined {
  const w = state.worlds.get(worldId);
  return w ? { ...w } : undefined;
}

function getStatsImpl(state: CensusState): CensusStats {
  return {
    totalWorlds: state.worlds.size,
    totalResidents: state.residentMap.size,
    totalMigrations: state.totalMigrations,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createWorldCensusService(
  deps: WorldCensusDeps,
): WorldCensusService {
  const state: CensusState = {
    worlds: new Map(),
    residentMap: new Map(),
    deps,
    totalMigrations: 0,
  };
  return {
    registerWorld: (id, cap) => registerWorldImpl(state, id, cap),
    removeWorld: (id) => removeWorldImpl(state, id),
    addResident: (p) => addResidentImpl(state, p),
    removeResident: (id) => removeResidentImpl(state, id),
    migrate: (did, to) => migrateImpl(state, did, to),
    getPopulation: (id) => getPopulationImpl(state, id),
    getResidentWorld: (did) => state.residentMap.get(did),
    isWorldFull: (id) => {
      const w = state.worlds.get(id);
      return w !== undefined && w.dynastyCount >= w.populationCap;
    },
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createWorldCensusService };
export type {
  WorldCensusService,
  WorldCensusDeps,
  WorldPopulation,
  RegisterResidencyParams,
  MigrationRecord,
  CensusStats,
};
