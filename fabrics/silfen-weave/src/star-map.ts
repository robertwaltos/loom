/**
 * star-map.ts — Coordinate-based star/world positioning and distance calculations.
 *
 * Stars are plotted in 3D space using light-year coordinates. Worlds orbit stars.
 * Distance calculations use Euclidean 3D geometry.
 */

// ── Ports ────────────────────────────────────────────────────────

export interface StarMapClockPort {
  now(): bigint;
}

export interface StarMapIdGeneratorPort {
  generate(): string;
}

export interface StarMapLoggerPort {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// ── Types ────────────────────────────────────────────────────────

export type StarId = string;
export type WorldId = string;

export type StarError =
  | 'star-not-found'
  | 'world-not-found'
  | 'already-registered'
  | 'invalid-coordinates';

export type StarClass = 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';

export interface StarCoordinates {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface Star {
  readonly starId: StarId;
  readonly name: string;
  readonly starClass: StarClass;
  readonly luminosity: number;
  readonly coordinates: StarCoordinates;
  readonly orbitingWorldIds: WorldId[];
  readonly registeredAt: bigint;
}

export interface DistanceResult {
  readonly fromStarId: StarId;
  readonly toStarId: StarId;
  readonly distanceLY: number;
}

export interface SectorSummary {
  readonly totalStars: number;
  readonly byClass: Record<StarClass, number>;
  readonly avgLuminosity: number;
}

// ── System Interface ──────────────────────────────────────────────

export interface StarMapSystem {
  readonly registerStar: (
    starId: StarId,
    name: string,
    starClass: StarClass,
    luminosity: number,
    coordinates: StarCoordinates,
  ) => Star | StarError;
  readonly registerWorld: (
    worldId: WorldId,
    starId: StarId,
  ) => { success: true } | { success: false; error: StarError };
  readonly calculateDistance: (starAId: StarId, starBId: StarId) => DistanceResult | StarError;
  readonly findNearestStars: (starId: StarId, count: number) => ReadonlyArray<DistanceResult>;
  readonly listStarsInRadius: (center: StarCoordinates, radiusLY: number) => ReadonlyArray<Star>;
  readonly getStar: (starId: StarId) => Star | undefined;
  readonly getSectorSummary: () => SectorSummary;
  readonly getWorldStar: (worldId: WorldId) => Star | undefined;
}

// ── State ────────────────────────────────────────────────────────

interface StarMapState {
  readonly stars: Map<StarId, Star>;
  readonly worldToStar: Map<WorldId, StarId>;
  readonly clock: StarMapClockPort;
  readonly logger: StarMapLoggerPort;
}

// ── Helpers ──────────────────────────────────────────────────────

function euclideanDistance(a: StarCoordinates, b: StarCoordinates): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function areCoordinatesValid(coords: StarCoordinates): boolean {
  return isFinite(coords.x) && isFinite(coords.y) && isFinite(coords.z);
}

function isLuminosityValid(luminosity: number): boolean {
  return luminosity >= 0.0001 && luminosity <= 1_000_000;
}

function buildSectorSummary(stars: Map<StarId, Star>): SectorSummary {
  const byClass: Record<StarClass, number> = { O: 0, B: 0, A: 0, F: 0, G: 0, K: 0, M: 0 };
  let totalLuminosity = 0;
  for (const star of stars.values()) {
    byClass[star.starClass]++;
    totalLuminosity += star.luminosity;
  }
  const totalStars = stars.size;
  return {
    totalStars,
    byClass,
    avgLuminosity: totalStars > 0 ? totalLuminosity / totalStars : 0,
  };
}

// ── Operations ───────────────────────────────────────────────────

function registerStar(
  state: StarMapState,
  starId: StarId,
  name: string,
  starClass: StarClass,
  luminosity: number,
  coordinates: StarCoordinates,
): Star | StarError {
  if (state.stars.has(starId)) {
    state.logger.warn('Star already registered: ' + starId);
    return 'already-registered';
  }
  if (!areCoordinatesValid(coordinates) || !isLuminosityValid(luminosity)) {
    state.logger.error('Invalid coordinates or luminosity for star: ' + starId);
    return 'invalid-coordinates';
  }
  const star: Star = {
    starId,
    name,
    starClass,
    luminosity,
    coordinates,
    orbitingWorldIds: [],
    registeredAt: state.clock.now(),
  };
  state.stars.set(starId, star);
  state.logger.info('Star registered: ' + starId + ' class=' + starClass);
  return star;
}

function registerWorld(
  state: StarMapState,
  worldId: WorldId,
  starId: StarId,
): { success: true } | { success: false; error: StarError } {
  const star = state.stars.get(starId);
  if (star === undefined) {
    state.logger.error('Star not found: ' + starId);
    return { success: false, error: 'star-not-found' };
  }
  star.orbitingWorldIds.push(worldId);
  state.worldToStar.set(worldId, starId);
  state.logger.info('World ' + worldId + ' registered to star ' + starId);
  return { success: true };
}

function calculateDistance(
  state: StarMapState,
  starAId: StarId,
  starBId: StarId,
): DistanceResult | StarError {
  const starA = state.stars.get(starAId);
  if (starA === undefined) {
    state.logger.error('Star not found: ' + starAId);
    return 'star-not-found';
  }
  const starB = state.stars.get(starBId);
  if (starB === undefined) {
    state.logger.error('Star not found: ' + starBId);
    return 'star-not-found';
  }
  return {
    fromStarId: starAId,
    toStarId: starBId,
    distanceLY: euclideanDistance(starA.coordinates, starB.coordinates),
  };
}

function findNearestStars(
  state: StarMapState,
  starId: StarId,
  count: number,
): ReadonlyArray<DistanceResult> {
  const source = state.stars.get(starId);
  if (source === undefined) return [];
  const distances: DistanceResult[] = [];
  for (const [otherId, other] of state.stars) {
    if (otherId === starId) continue;
    distances.push({
      fromStarId: starId,
      toStarId: otherId,
      distanceLY: euclideanDistance(source.coordinates, other.coordinates),
    });
  }
  distances.sort((a, b) => a.distanceLY - b.distanceLY);
  return distances.slice(0, count);
}

function listStarsInRadius(
  state: StarMapState,
  center: StarCoordinates,
  radiusLY: number,
): ReadonlyArray<Star> {
  const result: Star[] = [];
  for (const star of state.stars.values()) {
    if (euclideanDistance(center, star.coordinates) <= radiusLY) {
      result.push(star);
    }
  }
  return result;
}

function getStar(state: StarMapState, starId: StarId): Star | undefined {
  return state.stars.get(starId);
}

function getSectorSummary(state: StarMapState): SectorSummary {
  return buildSectorSummary(state.stars);
}

function getWorldStar(state: StarMapState, worldId: WorldId): Star | undefined {
  const starId = state.worldToStar.get(worldId);
  if (starId === undefined) return undefined;
  return state.stars.get(starId);
}

// ── Factory ──────────────────────────────────────────────────────

export function createStarMapSystem(deps: {
  clock: StarMapClockPort;
  idGen: StarMapIdGeneratorPort;
  logger: StarMapLoggerPort;
}): StarMapSystem {
  const state: StarMapState = {
    stars: new Map(),
    worldToStar: new Map(),
    clock: deps.clock,
    logger: deps.logger,
  };
  return {
    registerStar: (starId, name, starClass, luminosity, coordinates) =>
      registerStar(state, starId, name, starClass, luminosity, coordinates),
    registerWorld: (worldId, starId) => registerWorld(state, worldId, starId),
    calculateDistance: (starAId, starBId) => calculateDistance(state, starAId, starBId),
    findNearestStars: (starId, count) => findNearestStars(state, starId, count),
    listStarsInRadius: (center, radiusLY) => listStarsInRadius(state, center, radiusLY),
    getStar: (starId) => getStar(state, starId),
    getSectorSummary: () => getSectorSummary(state),
    getWorldStar: (worldId) => getWorldStar(state, worldId),
  };
}
