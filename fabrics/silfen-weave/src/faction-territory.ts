/**
 * faction-territory.ts — Faction control of world regions with border conflicts.
 *
 * Regions exist within worlds and are claimed, contested, and abandoned by factions.
 * Control flow:
 *   NEUTRAL/ABANDONED → CONTROLLED  (claimRegion)
 *   CONTROLLED        → CONTESTED   (contestRegion by a rival faction)
 *   CONTESTED         → CONTROLLED  (resolveConflict — winner takes control)
 *   CONTROLLED        → ABANDONED   (abandonRegion)
 */

// ── Ports ────────────────────────────────────────────────────────

export interface TerritoryClockPort {
  now(): bigint;
}

export interface TerritoryIdGeneratorPort {
  generate(): string;
}

export interface TerritoryLoggerPort {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// ── Types ────────────────────────────────────────────────────────

export type FactionId = string;
export type RegionId = string;
export type WorldId = string;

export type TerritoryError =
  | 'faction-not-found'
  | 'region-not-found'
  | 'world-not-found'
  | 'already-claimed'
  | 'not-claimed'
  | 'already-registered'
  | 'conflict-not-found';

export type ControlStatus = 'CONTROLLED' | 'CONTESTED' | 'ABANDONED' | 'NEUTRAL';

export interface RegionControl {
  readonly regionId: RegionId;
  readonly worldId: WorldId;
  factionId: FactionId | null;
  status: ControlStatus;
  controlledSince: bigint | null;
  contestedBy: FactionId[];
}

export interface TerritoryConflict {
  readonly conflictId: string;
  readonly regionId: RegionId;
  readonly worldId: WorldId;
  readonly aggressorId: FactionId;
  readonly defenderId: FactionId;
  readonly startedAt: bigint;
  resolvedAt: bigint | null;
  winner: FactionId | null;
}

export interface FactionTerritory {
  readonly factionId: FactionId;
  readonly controlledRegions: number;
  readonly contestedRegions: number;
  readonly totalRegions: number;
}

// ── System Interface ──────────────────────────────────────────────

export interface FactionTerritorySystem {
  readonly registerFaction: (
    factionId: FactionId,
  ) => { success: true } | { success: false; error: TerritoryError };
  readonly registerWorld: (
    worldId: WorldId,
  ) => { success: true } | { success: false; error: TerritoryError };
  readonly addRegion: (
    regionId: RegionId,
    worldId: WorldId,
  ) => { success: true } | { success: false; error: TerritoryError };
  readonly claimRegion: (
    factionId: FactionId,
    regionId: RegionId,
  ) => { success: true } | { success: false; error: TerritoryError };
  readonly contestRegion: (
    factionId: FactionId,
    regionId: RegionId,
  ) => { success: true; conflict: TerritoryConflict } | { success: false; error: TerritoryError };
  readonly resolveConflict: (
    conflictId: string,
    winnerId: FactionId,
  ) => { success: true } | { success: false; error: TerritoryError };
  readonly abandonRegion: (
    factionId: FactionId,
    regionId: RegionId,
  ) => { success: true } | { success: false; error: TerritoryError };
  readonly getFactionTerritory: (factionId: FactionId) => FactionTerritory | undefined;
  readonly listRegions: (worldId: WorldId, factionId?: FactionId) => ReadonlyArray<RegionControl>;
  readonly getConflicts: (worldId: WorldId) => ReadonlyArray<TerritoryConflict>;
}

// ── State ────────────────────────────────────────────────────────

interface FactionTerritoryState {
  readonly factions: Set<FactionId>;
  readonly worlds: Set<WorldId>;
  readonly regions: Map<RegionId, RegionControl>;
  readonly conflicts: Map<string, TerritoryConflict>;
  readonly clock: TerritoryClockPort;
  readonly idGen: TerritoryIdGeneratorPort;
  readonly logger: TerritoryLoggerPort;
}

// ── Helpers ──────────────────────────────────────────────────────

function computeFactionTerritory(
  state: FactionTerritoryState,
  factionId: FactionId,
): FactionTerritory {
  let controlledRegions = 0;
  let contestedRegions = 0;
  for (const r of state.regions.values()) {
    if (r.status === 'CONTROLLED' && r.factionId === factionId) controlledRegions++;
    if (r.status === 'CONTESTED') {
      const isController = r.factionId === factionId;
      const isContestant = r.contestedBy.includes(factionId);
      if (isController || isContestant) contestedRegions++;
    }
  }
  return {
    factionId,
    controlledRegions,
    contestedRegions,
    totalRegions: controlledRegions + contestedRegions,
  };
}

// ── Operations ───────────────────────────────────────────────────

function registerFaction(
  state: FactionTerritoryState,
  factionId: FactionId,
): { success: true } | { success: false; error: TerritoryError } {
  if (state.factions.has(factionId)) {
    state.logger.warn('Faction already registered: ' + factionId);
    return { success: false, error: 'already-registered' };
  }
  state.factions.add(factionId);
  state.logger.info('Faction registered: ' + factionId);
  return { success: true };
}

function registerWorld(
  state: FactionTerritoryState,
  worldId: WorldId,
): { success: true } | { success: false; error: TerritoryError } {
  if (state.worlds.has(worldId)) {
    state.logger.warn('World already registered: ' + worldId);
    return { success: false, error: 'already-registered' };
  }
  state.worlds.add(worldId);
  state.logger.info('World registered: ' + worldId);
  return { success: true };
}

function addRegion(
  state: FactionTerritoryState,
  regionId: RegionId,
  worldId: WorldId,
): { success: true } | { success: false; error: TerritoryError } {
  if (!state.worlds.has(worldId)) {
    state.logger.error('World not found: ' + worldId);
    return { success: false, error: 'world-not-found' };
  }
  if (state.regions.has(regionId)) {
    state.logger.warn('Region already registered: ' + regionId);
    return { success: false, error: 'already-registered' };
  }
  const region: RegionControl = {
    regionId,
    worldId,
    factionId: null,
    status: 'NEUTRAL',
    controlledSince: null,
    contestedBy: [],
  };
  state.regions.set(regionId, region);
  state.logger.info('Region added: ' + regionId + ' in world ' + worldId);
  return { success: true };
}

function claimRegion(
  state: FactionTerritoryState,
  factionId: FactionId,
  regionId: RegionId,
): { success: true } | { success: false; error: TerritoryError } {
  if (!state.factions.has(factionId)) {
    state.logger.error('Faction not found: ' + factionId);
    return { success: false, error: 'faction-not-found' };
  }
  const region = state.regions.get(regionId);
  if (region === undefined) {
    state.logger.error('Region not found: ' + regionId);
    return { success: false, error: 'region-not-found' };
  }
  if (region.status === 'CONTROLLED' || region.status === 'CONTESTED') {
    state.logger.warn('Region already claimed: ' + regionId);
    return { success: false, error: 'already-claimed' };
  }
  region.factionId = factionId;
  region.status = 'CONTROLLED';
  region.controlledSince = state.clock.now();
  region.contestedBy = [];
  state.logger.info('Region claimed by ' + factionId + ': ' + regionId);
  return { success: true };
}

function buildConflict(
  state: FactionTerritoryState,
  aggressorId: FactionId,
  defenderId: FactionId,
  region: RegionControl,
): TerritoryConflict {
  return {
    conflictId: state.idGen.generate(),
    regionId: region.regionId,
    worldId: region.worldId,
    aggressorId,
    defenderId,
    startedAt: state.clock.now(),
    resolvedAt: null,
    winner: null,
  };
}

function contestRegion(
  state: FactionTerritoryState,
  factionId: FactionId,
  regionId: RegionId,
): { success: true; conflict: TerritoryConflict } | { success: false; error: TerritoryError } {
  if (!state.factions.has(factionId)) {
    state.logger.error('Faction not found: ' + factionId);
    return { success: false, error: 'faction-not-found' };
  }
  const region = state.regions.get(regionId);
  if (region === undefined) {
    state.logger.error('Region not found: ' + regionId);
    return { success: false, error: 'region-not-found' };
  }
  if (region.status !== 'CONTROLLED' || region.factionId === factionId) {
    state.logger.warn('Cannot contest region ' + regionId + ' — not controlled by another faction');
    return { success: false, error: 'not-claimed' };
  }
  const conflict = buildConflict(state, factionId, region.factionId as FactionId, region);
  state.conflicts.set(conflict.conflictId, conflict);
  region.contestedBy.push(factionId);
  region.status = 'CONTESTED';
  state.logger.info('Conflict started: ' + conflict.conflictId + ' for region ' + regionId);
  return { success: true, conflict };
}

function resolveConflict(
  state: FactionTerritoryState,
  conflictId: string,
  winnerId: FactionId,
): { success: true } | { success: false; error: TerritoryError } {
  const conflict = state.conflicts.get(conflictId);
  if (conflict === undefined) {
    state.logger.error('Conflict not found: ' + conflictId);
    return { success: false, error: 'conflict-not-found' };
  }
  const region = state.regions.get(conflict.regionId);
  if (region === undefined) {
    return { success: false, error: 'region-not-found' };
  }
  conflict.winner = winnerId;
  conflict.resolvedAt = state.clock.now();
  const defenderWon = winnerId === conflict.defenderId;
  region.factionId = winnerId;
  region.status = 'CONTROLLED';
  region.controlledSince = defenderWon ? region.controlledSince : state.clock.now();
  region.contestedBy = region.contestedBy.filter((f) => f !== conflict.aggressorId);
  state.logger.info('Conflict resolved: ' + conflictId + ' — winner: ' + winnerId);
  return { success: true };
}

function abandonRegion(
  state: FactionTerritoryState,
  factionId: FactionId,
  regionId: RegionId,
): { success: true } | { success: false; error: TerritoryError } {
  if (!state.factions.has(factionId)) {
    state.logger.error('Faction not found: ' + factionId);
    return { success: false, error: 'faction-not-found' };
  }
  const region = state.regions.get(regionId);
  if (region === undefined) {
    state.logger.error('Region not found: ' + regionId);
    return { success: false, error: 'region-not-found' };
  }
  if (region.factionId !== factionId) {
    state.logger.warn('Faction ' + factionId + ' does not control region ' + regionId);
    return { success: false, error: 'not-claimed' };
  }
  region.status = 'ABANDONED';
  region.factionId = null;
  region.controlledSince = null;
  region.contestedBy = [];
  state.logger.info('Region abandoned by ' + factionId + ': ' + regionId);
  return { success: true };
}

function getFactionTerritory(
  state: FactionTerritoryState,
  factionId: FactionId,
): FactionTerritory | undefined {
  if (!state.factions.has(factionId)) return undefined;
  return computeFactionTerritory(state, factionId);
}

function listRegions(
  state: FactionTerritoryState,
  worldId: WorldId,
  factionId?: FactionId,
): ReadonlyArray<RegionControl> {
  const result: RegionControl[] = [];
  for (const r of state.regions.values()) {
    if (r.worldId !== worldId) continue;
    if (factionId !== undefined && r.factionId !== factionId) continue;
    result.push(r);
  }
  return result;
}

function getConflicts(
  state: FactionTerritoryState,
  worldId: WorldId,
): ReadonlyArray<TerritoryConflict> {
  const result: TerritoryConflict[] = [];
  for (const c of state.conflicts.values()) {
    if (c.worldId === worldId) result.push(c);
  }
  return result;
}

// ── Factory ──────────────────────────────────────────────────────

export function createFactionTerritorySystem(deps: {
  clock: TerritoryClockPort;
  idGen: TerritoryIdGeneratorPort;
  logger: TerritoryLoggerPort;
}): FactionTerritorySystem {
  const state: FactionTerritoryState = {
    factions: new Set(),
    worlds: new Set(),
    regions: new Map(),
    conflicts: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };
  return {
    registerFaction: (factionId) => registerFaction(state, factionId),
    registerWorld: (worldId) => registerWorld(state, worldId),
    addRegion: (regionId, worldId) => addRegion(state, regionId, worldId),
    claimRegion: (factionId, regionId) => claimRegion(state, factionId, regionId),
    contestRegion: (factionId, regionId) => contestRegion(state, factionId, regionId),
    resolveConflict: (conflictId, winnerId) => resolveConflict(state, conflictId, winnerId),
    abandonRegion: (factionId, regionId) => abandonRegion(state, factionId, regionId),
    getFactionTerritory: (factionId) => getFactionTerritory(state, factionId),
    listRegions: (worldId, factionId) => listRegions(state, worldId, factionId),
    getConflicts: (worldId) => getConflicts(state, worldId),
  };
}
