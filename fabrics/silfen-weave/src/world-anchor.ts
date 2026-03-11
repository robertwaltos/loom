/**
 * world-anchor.ts — Entity anchor tracking for world coordinates.
 *
 * Anchors tether entities to specific coordinates within a world.
 * Each entity may hold up to 50 anchors across all worlds.
 * HOME anchors are unique per entity per world.
 * Nearby search uses Euclidean distance in 3-D space.
 */

// ── Ports ────────────────────────────────────────────────────────

export interface AnchorClock {
  now(): bigint;
}

export interface AnchorIdGenerator {
  generate(): string;
}

export interface AnchorLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// ── Types ────────────────────────────────────────────────────────

export type AnchorId = string;
export type EntityId = string;
export type WorldId = string;

export type AnchorType = 'HOME' | 'CLAIM' | 'WAYPOINT' | 'DANGER' | 'RESOURCE';

export type AnchorError =
  | 'anchor-not-found'
  | 'entity-not-found'
  | 'already-anchored'
  | 'invalid-coordinates'
  | 'anchor-limit-exceeded';

export interface Coordinates {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface WorldAnchor {
  readonly anchorId: AnchorId;
  readonly entityId: EntityId;
  readonly worldId: WorldId;
  readonly type: AnchorType;
  readonly coordinates: Coordinates;
  readonly label: string;
  readonly createdAt: bigint;
  lastVisitedAt: bigint | null;
}

export interface AnchorSummary {
  readonly entityId: EntityId;
  readonly totalAnchors: number;
  readonly byType: Record<AnchorType, number>;
  readonly worlds: ReadonlyArray<WorldId>;
}

export interface WorldAnchorSystem {
  readonly placeAnchor: (
    entityId: EntityId,
    worldId: WorldId,
    type: AnchorType,
    coordinates: Coordinates,
    label: string,
  ) => WorldAnchor | AnchorError;
  readonly removeAnchor: (
    anchorId: AnchorId,
  ) => { success: true } | { success: false; error: AnchorError };
  readonly visitAnchor: (
    anchorId: AnchorId,
  ) => { success: true } | { success: false; error: AnchorError };
  readonly moveAnchor: (
    anchorId: AnchorId,
    newCoordinates: Coordinates,
  ) => { success: true } | { success: false; error: AnchorError };
  readonly getAnchor: (anchorId: AnchorId) => WorldAnchor | undefined;
  readonly listAnchors: (entityId: EntityId, worldId?: WorldId) => ReadonlyArray<WorldAnchor>;
  readonly getAnchorSummary: (entityId: EntityId) => AnchorSummary;
  readonly findNearby: (
    worldId: WorldId,
    center: Coordinates,
    radiusUnits: number,
  ) => ReadonlyArray<WorldAnchor>;
}

// ── State ────────────────────────────────────────────────────────

interface WorldAnchorState {
  readonly anchors: Map<AnchorId, WorldAnchor>;
  readonly clock: AnchorClock;
  readonly idGen: AnchorIdGenerator;
  readonly logger: AnchorLogger;
}

// ── Constants ────────────────────────────────────────────────────

const MAX_ANCHORS_PER_ENTITY = 50;

// ── Helpers ──────────────────────────────────────────────────────

function isValidCoordinates(coords: Coordinates): boolean {
  return (
    isFinite(coords.x) &&
    isFinite(coords.y) &&
    isFinite(coords.z) &&
    !isNaN(coords.x) &&
    !isNaN(coords.y) &&
    !isNaN(coords.z)
  );
}

function euclideanDistance(a: Coordinates, b: Coordinates): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function countAnchorsForEntity(anchors: Map<AnchorId, WorldAnchor>, entityId: EntityId): number {
  let count = 0;
  for (const anchor of anchors.values()) {
    if (anchor.entityId === entityId) count++;
  }
  return count;
}

function hasHomeAnchor(
  anchors: Map<AnchorId, WorldAnchor>,
  entityId: EntityId,
  worldId: WorldId,
): boolean {
  for (const anchor of anchors.values()) {
    if (anchor.entityId === entityId && anchor.worldId === worldId && anchor.type === 'HOME') {
      return true;
    }
  }
  return false;
}

function emptyByType(): Record<AnchorType, number> {
  return { HOME: 0, CLAIM: 0, WAYPOINT: 0, DANGER: 0, RESOURCE: 0 };
}

// ── Operations ───────────────────────────────────────────────────

function placeAnchor(
  state: WorldAnchorState,
  entityId: EntityId,
  worldId: WorldId,
  type: AnchorType,
  coordinates: Coordinates,
  label: string,
): WorldAnchor | AnchorError {
  if (!isValidCoordinates(coordinates)) {
    state.logger.error('Invalid coordinates for anchor placement: ' + entityId);
    return 'invalid-coordinates';
  }

  const total = countAnchorsForEntity(state.anchors, entityId);
  if (total >= MAX_ANCHORS_PER_ENTITY) {
    state.logger.warn('Anchor limit exceeded for entity: ' + entityId);
    return 'anchor-limit-exceeded';
  }

  if (type === 'HOME' && hasHomeAnchor(state.anchors, entityId, worldId)) {
    state.logger.warn('Entity already has HOME anchor in world: ' + entityId + ':' + worldId);
    return 'already-anchored';
  }

  const anchor: WorldAnchor = {
    anchorId: state.idGen.generate(),
    entityId,
    worldId,
    type,
    coordinates,
    label,
    createdAt: state.clock.now(),
    lastVisitedAt: null,
  };
  state.anchors.set(anchor.anchorId, anchor);
  state.logger.info('Anchor placed: ' + anchor.anchorId);
  return anchor;
}

function removeAnchor(
  state: WorldAnchorState,
  anchorId: AnchorId,
): { success: true } | { success: false; error: AnchorError } {
  if (!state.anchors.has(anchorId)) {
    return { success: false, error: 'anchor-not-found' };
  }
  state.anchors.delete(anchorId);
  state.logger.info('Anchor removed: ' + anchorId);
  return { success: true };
}

function visitAnchor(
  state: WorldAnchorState,
  anchorId: AnchorId,
): { success: true } | { success: false; error: AnchorError } {
  const anchor = state.anchors.get(anchorId);
  if (anchor === undefined) return { success: false, error: 'anchor-not-found' };
  anchor.lastVisitedAt = state.clock.now();
  state.logger.info('Anchor visited: ' + anchorId);
  return { success: true };
}

function moveAnchor(
  state: WorldAnchorState,
  anchorId: AnchorId,
  newCoordinates: Coordinates,
): { success: true } | { success: false; error: AnchorError } {
  const anchor = state.anchors.get(anchorId);
  if (anchor === undefined) return { success: false, error: 'anchor-not-found' };
  if (!isValidCoordinates(newCoordinates)) {
    state.logger.error('Invalid coordinates for anchor move: ' + anchorId);
    return { success: false, error: 'invalid-coordinates' };
  }
  const updated: WorldAnchor = { ...anchor, coordinates: newCoordinates };
  state.anchors.set(anchorId, updated);
  state.logger.info('Anchor moved: ' + anchorId);
  return { success: true };
}

function listAnchors(
  state: WorldAnchorState,
  entityId: EntityId,
  worldId?: WorldId,
): ReadonlyArray<WorldAnchor> {
  const result: WorldAnchor[] = [];
  for (const anchor of state.anchors.values()) {
    if (anchor.entityId !== entityId) continue;
    if (worldId !== undefined && anchor.worldId !== worldId) continue;
    result.push(anchor);
  }
  return result;
}

function getAnchorSummary(state: WorldAnchorState, entityId: EntityId): AnchorSummary {
  const byType = emptyByType();
  const worldSet = new Set<WorldId>();
  for (const anchor of state.anchors.values()) {
    if (anchor.entityId !== entityId) continue;
    byType[anchor.type]++;
    worldSet.add(anchor.worldId);
  }
  return {
    entityId,
    totalAnchors: countAnchorsForEntity(state.anchors, entityId),
    byType,
    worlds: Array.from(worldSet),
  };
}

function findNearby(
  state: WorldAnchorState,
  worldId: WorldId,
  center: Coordinates,
  radiusUnits: number,
): ReadonlyArray<WorldAnchor> {
  const result: WorldAnchor[] = [];
  for (const anchor of state.anchors.values()) {
    if (anchor.worldId !== worldId) continue;
    if (euclideanDistance(anchor.coordinates, center) <= radiusUnits) result.push(anchor);
  }
  return result;
}

// ── Factory ──────────────────────────────────────────────────────

export function createWorldAnchorSystem(deps: {
  clock: AnchorClock;
  idGen: AnchorIdGenerator;
  logger: AnchorLogger;
}): WorldAnchorSystem {
  const state: WorldAnchorState = {
    anchors: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };
  return {
    placeAnchor: (entityId, worldId, type, coords, label) =>
      placeAnchor(state, entityId, worldId, type, coords, label),
    removeAnchor: (id) => removeAnchor(state, id),
    visitAnchor: (id) => visitAnchor(state, id),
    moveAnchor: (id, coords) => moveAnchor(state, id, coords),
    getAnchor: (id) => state.anchors.get(id),
    listAnchors: (entityId, worldId) => listAnchors(state, entityId, worldId),
    getAnchorSummary: (entityId) => getAnchorSummary(state, entityId),
    findNearby: (worldId, center, radius) => findNearby(state, worldId, center, radius),
  };
}
