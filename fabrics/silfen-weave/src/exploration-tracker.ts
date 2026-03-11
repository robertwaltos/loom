/**
 * exploration-tracker.ts — Entity world/region discovery tracking.
 *
 * Records which entities have discovered which worlds and regions.
 * World status follows a strict ascending order:
 *   UNDISCOVERED < SCOUTED < CHARTED < SETTLED
 * Downgrades are rejected. Regions default to SCOUTED on discovery.
 */

// ── Ports ────────────────────────────────────────────────────────

export interface ExplorationClock {
  now(): bigint;
}

export interface ExplorationIdGenerator {
  generate(): string;
}

export interface ExplorationLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// ── Types ────────────────────────────────────────────────────────

export type ExplorationId = string;
export type ExplorationEntityId = string;
export type WorldId = string;
export type RegionId = string;

export type ExplorationStatus = 'UNDISCOVERED' | 'SCOUTED' | 'CHARTED' | 'SETTLED';

export type ExplorationError =
  | 'entity-not-found'
  | 'world-not-found'
  | 'region-not-found'
  | 'already-discovered'
  | 'already-registered';

export interface WorldExploration {
  readonly worldId: WorldId;
  readonly entityId: ExplorationEntityId;
  readonly status: ExplorationStatus;
  readonly discoveredAt: bigint;
  lastVisitedAt: bigint;
  visitCount: number;
}

export interface RegionExploration {
  readonly regionId: RegionId;
  readonly worldId: WorldId;
  readonly entityId: ExplorationEntityId;
  readonly status: ExplorationStatus;
  readonly discoveredAt: bigint;
}

export interface ExplorationProfile {
  readonly entityId: ExplorationEntityId;
  readonly worldsDiscovered: number;
  readonly regionsDiscovered: number;
  readonly settledWorlds: number;
}

export interface ExplorationTrackerSystem {
  readonly registerEntity: (
    entityId: ExplorationEntityId,
  ) => { success: true } | { success: false; error: ExplorationError };
  readonly registerWorld: (
    worldId: WorldId,
  ) => { success: true } | { success: false; error: ExplorationError };
  readonly registerRegion: (
    regionId: RegionId,
    worldId: WorldId,
  ) => { success: true } | { success: false; error: ExplorationError };
  readonly discoverWorld: (
    entityId: ExplorationEntityId,
    worldId: WorldId,
    initialStatus: ExplorationStatus,
  ) => WorldExploration | ExplorationError;
  readonly upgradeWorldStatus: (
    entityId: ExplorationEntityId,
    worldId: WorldId,
    newStatus: ExplorationStatus,
  ) => { success: true } | { success: false; error: ExplorationError };
  readonly visitWorld: (
    entityId: ExplorationEntityId,
    worldId: WorldId,
  ) => { success: true } | { success: false; error: ExplorationError };
  readonly discoverRegion: (
    entityId: ExplorationEntityId,
    regionId: RegionId,
  ) => RegionExploration | ExplorationError;
  readonly getWorldExploration: (
    entityId: ExplorationEntityId,
    worldId: WorldId,
  ) => WorldExploration | undefined;
  readonly getExplorationProfile: (entityId: ExplorationEntityId) => ExplorationProfile | undefined;
  readonly listDiscoveredWorlds: (entityId: ExplorationEntityId) => ReadonlyArray<WorldExploration>;
}

// ── State ────────────────────────────────────────────────────────

interface ExplorationTrackerState {
  readonly entities: Set<ExplorationEntityId>;
  readonly worlds: Set<WorldId>;
  readonly regionToWorld: Map<RegionId, WorldId>;
  readonly worldExplorations: Map<string, WorldExploration>;
  readonly regionExplorations: Map<string, RegionExploration>;
  readonly clock: ExplorationClock;
  readonly idGen: ExplorationIdGenerator;
  readonly logger: ExplorationLogger;
}

// ── Helpers ──────────────────────────────────────────────────────

const STATUS_ORDER: Record<ExplorationStatus, number> = {
  UNDISCOVERED: 0,
  SCOUTED: 1,
  CHARTED: 2,
  SETTLED: 3,
};

function worldExplorationKey(entityId: ExplorationEntityId, worldId: WorldId): string {
  return entityId + '::' + worldId;
}

function regionExplorationKey(entityId: ExplorationEntityId, regionId: RegionId): string {
  return entityId + '::' + regionId;
}

function isUpgrade(current: ExplorationStatus, next: ExplorationStatus): boolean {
  return STATUS_ORDER[next] > STATUS_ORDER[current];
}

// ── Operations ───────────────────────────────────────────────────

function registerEntity(
  state: ExplorationTrackerState,
  entityId: ExplorationEntityId,
): { success: true } | { success: false; error: ExplorationError } {
  if (state.entities.has(entityId)) {
    return { success: false, error: 'already-registered' };
  }
  state.entities.add(entityId);
  state.logger.info('Entity registered: ' + entityId);
  return { success: true };
}

function registerWorld(
  state: ExplorationTrackerState,
  worldId: WorldId,
): { success: true } | { success: false; error: ExplorationError } {
  state.worlds.add(worldId);
  state.logger.info('World registered: ' + worldId);
  return { success: true };
}

function registerRegion(
  state: ExplorationTrackerState,
  regionId: RegionId,
  worldId: WorldId,
): { success: true } | { success: false; error: ExplorationError } {
  if (!state.regionToWorld.has(regionId)) {
    state.regionToWorld.set(regionId, worldId);
    state.logger.info('Region registered: ' + regionId + ' in world ' + worldId);
  }
  return { success: true };
}

function discoverWorld(
  state: ExplorationTrackerState,
  entityId: ExplorationEntityId,
  worldId: WorldId,
  initialStatus: ExplorationStatus,
): WorldExploration | ExplorationError {
  if (!state.entities.has(entityId)) {
    state.logger.error('Entity not found: ' + entityId);
    return 'entity-not-found';
  }

  if (!state.worlds.has(worldId)) {
    state.logger.error('World not found: ' + worldId);
    return 'world-not-found';
  }

  const key = worldExplorationKey(entityId, worldId);
  if (state.worldExplorations.has(key)) {
    state.logger.warn('World already discovered by entity: ' + entityId + ':' + worldId);
    return 'already-discovered';
  }

  const now = state.clock.now();
  const exploration: WorldExploration = {
    worldId,
    entityId,
    status: initialStatus,
    discoveredAt: now,
    lastVisitedAt: now,
    visitCount: 1,
  };
  state.worldExplorations.set(key, exploration);
  state.logger.info('World discovered: ' + worldId + ' by ' + entityId);
  return exploration;
}

function upgradeWorldStatus(
  state: ExplorationTrackerState,
  entityId: ExplorationEntityId,
  worldId: WorldId,
  newStatus: ExplorationStatus,
): { success: true } | { success: false; error: ExplorationError } {
  const key = worldExplorationKey(entityId, worldId);
  const exploration = state.worldExplorations.get(key);

  if (exploration === undefined) {
    return { success: false, error: 'world-not-found' };
  }

  if (!isUpgrade(exploration.status, newStatus)) {
    state.logger.warn('Cannot downgrade world status: ' + exploration.status + ' -> ' + newStatus);
    return { success: false, error: 'world-not-found' };
  }

  const updated: WorldExploration = { ...exploration, status: newStatus };
  state.worldExplorations.set(key, updated);
  state.logger.info('World status upgraded to ' + newStatus + ': ' + worldId);
  return { success: true };
}

function visitWorld(
  state: ExplorationTrackerState,
  entityId: ExplorationEntityId,
  worldId: WorldId,
): { success: true } | { success: false; error: ExplorationError } {
  const key = worldExplorationKey(entityId, worldId);
  const exploration = state.worldExplorations.get(key);

  if (exploration === undefined) {
    return { success: false, error: 'world-not-found' };
  }

  exploration.visitCount += 1;
  exploration.lastVisitedAt = state.clock.now();
  state.logger.info('World visited: ' + worldId + ' by ' + entityId);
  return { success: true };
}

function discoverRegion(
  state: ExplorationTrackerState,
  entityId: ExplorationEntityId,
  regionId: RegionId,
): RegionExploration | ExplorationError {
  if (!state.entities.has(entityId)) {
    state.logger.error('Entity not found: ' + entityId);
    return 'entity-not-found';
  }

  const worldId = state.regionToWorld.get(regionId);
  if (worldId === undefined) {
    state.logger.error('Region not found: ' + regionId);
    return 'region-not-found';
  }

  const key = regionExplorationKey(entityId, regionId);
  if (state.regionExplorations.has(key)) {
    state.logger.warn('Region already discovered by entity: ' + entityId + ':' + regionId);
    return 'already-discovered';
  }

  const exploration: RegionExploration = {
    regionId,
    worldId,
    entityId,
    status: 'SCOUTED',
    discoveredAt: state.clock.now(),
  };
  state.regionExplorations.set(key, exploration);
  state.logger.info('Region discovered: ' + regionId + ' by ' + entityId);
  return exploration;
}

function getWorldExploration(
  state: ExplorationTrackerState,
  entityId: ExplorationEntityId,
  worldId: WorldId,
): WorldExploration | undefined {
  return state.worldExplorations.get(worldExplorationKey(entityId, worldId));
}

function getExplorationProfile(
  state: ExplorationTrackerState,
  entityId: ExplorationEntityId,
): ExplorationProfile | undefined {
  if (!state.entities.has(entityId)) return undefined;

  let worldsDiscovered = 0;
  let settledWorlds = 0;
  for (const exploration of state.worldExplorations.values()) {
    if (exploration.entityId !== entityId) continue;
    worldsDiscovered++;
    if (exploration.status === 'SETTLED') settledWorlds++;
  }

  let regionsDiscovered = 0;
  for (const exploration of state.regionExplorations.values()) {
    if (exploration.entityId === entityId) regionsDiscovered++;
  }

  return { entityId, worldsDiscovered, regionsDiscovered, settledWorlds };
}

function listDiscoveredWorlds(
  state: ExplorationTrackerState,
  entityId: ExplorationEntityId,
): ReadonlyArray<WorldExploration> {
  const result: WorldExploration[] = [];
  for (const exploration of state.worldExplorations.values()) {
    if (exploration.entityId === entityId) result.push(exploration);
  }
  return result;
}

// ── Factory ──────────────────────────────────────────────────────

export function createExplorationTrackerSystem(deps: {
  clock: ExplorationClock;
  idGen: ExplorationIdGenerator;
  logger: ExplorationLogger;
}): ExplorationTrackerSystem {
  const state: ExplorationTrackerState = {
    entities: new Set(),
    worlds: new Set(),
    regionToWorld: new Map(),
    worldExplorations: new Map(),
    regionExplorations: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };
  return {
    registerEntity: (entityId) => registerEntity(state, entityId),
    registerWorld: (worldId) => registerWorld(state, worldId),
    registerRegion: (regionId, worldId) => registerRegion(state, regionId, worldId),
    discoverWorld: (entityId, worldId, status) => discoverWorld(state, entityId, worldId, status),
    upgradeWorldStatus: (entityId, worldId, newStatus) =>
      upgradeWorldStatus(state, entityId, worldId, newStatus),
    visitWorld: (entityId, worldId) => visitWorld(state, entityId, worldId),
    discoverRegion: (entityId, regionId) => discoverRegion(state, entityId, regionId),
    getWorldExploration: (entityId, worldId) => getWorldExploration(state, entityId, worldId),
    getExplorationProfile: (entityId) => getExplorationProfile(state, entityId),
    listDiscoveredWorlds: (entityId) => listDiscoveredWorlds(state, entityId),
  };
}
