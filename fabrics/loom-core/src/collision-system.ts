/**
 * collision-system.ts — AABB collision detection between registered bodies.
 *
 * Bodies are registered with axis-aligned bounding boxes and a layer mask.
 * detectCollisions queries all active bodies overlapping a given query body.
 * checkPair tests two specific bodies for overlap.
 * Cumulative collision count is tracked in stats.
 */

// ── Types ─────────────────────────────────────────────────────────

export type BodyId = string;

export type CollisionError = 'body-not-found' | 'already-registered' | 'invalid-bounds';

export interface AABB {
  readonly minX: number;
  readonly minY: number;
  readonly minZ: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly maxZ: number;
}

export interface CollisionBody {
  readonly bodyId: BodyId;
  readonly label: string;
  readonly aabb: AABB;
  readonly layer: number;
  readonly active: boolean;
  readonly registeredAt: bigint;
}

export interface Collision {
  readonly bodyAId: BodyId;
  readonly bodyBId: BodyId;
  readonly overlapX: number;
  readonly overlapY: number;
  readonly overlapZ: number;
  readonly detectedAt: bigint;
}

export interface CollisionQuery {
  readonly bodyId: BodyId;
  readonly layer?: number;
}

export interface CollisionStats {
  readonly totalBodies: number;
  readonly activeBodies: number;
  readonly collisionsDetected: number;
}

export interface CollisionSystem {
  registerBody(
    bodyId: BodyId,
    label: string,
    aabb: AABB,
    layer: number,
  ): CollisionBody | CollisionError;
  updateBounds(
    bodyId: BodyId,
    newAabb: AABB,
  ): { success: true } | { success: false; error: CollisionError };
  deactivate(bodyId: BodyId): { success: true } | { success: false; error: CollisionError };
  activate(bodyId: BodyId): { success: true } | { success: false; error: CollisionError };
  detectCollisions(query: CollisionQuery): ReadonlyArray<Collision>;
  checkPair(bodyAId: BodyId, bodyBId: BodyId): Collision | null | CollisionError;
  getBody(bodyId: BodyId): CollisionBody | undefined;
  getStats(): CollisionStats;
}

// ── Ports ─────────────────────────────────────────────────────────

interface CollisionClock {
  nowUs(): bigint;
}

interface CollisionIdGenerator {
  generate(): string;
}

interface CollisionLogger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

export interface CollisionSystemDeps {
  readonly clock: CollisionClock;
  readonly idGen: CollisionIdGenerator;
  readonly logger: CollisionLogger;
}

// ── Internal State ────────────────────────────────────────────────

interface MutableBody {
  bodyId: BodyId;
  label: string;
  aabb: AABB;
  layer: number;
  active: boolean;
  registeredAt: bigint;
}

interface CollisionState {
  readonly bodies: Map<BodyId, MutableBody>;
  readonly clock: CollisionClock;
  readonly logger: CollisionLogger;
  collisionsDetected: number;
}

// ── Validation ────────────────────────────────────────────────────

function isValidAabb(aabb: AABB): boolean {
  return aabb.maxX > aabb.minX && aabb.maxY > aabb.minY && aabb.maxZ > aabb.minZ;
}

// ── Overlap Computation ───────────────────────────────────────────

function computeOverlap(a: AABB, b: AABB): { x: number; y: number; z: number } | null {
  const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
  const overlapY = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
  const overlapZ = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);
  if (overlapX <= 0 || overlapY <= 0 || overlapZ <= 0) return null;
  return { x: overlapX, y: overlapY, z: overlapZ };
}

// ── Snapshot ──────────────────────────────────────────────────────

function toReadonly(body: MutableBody): CollisionBody {
  return {
    bodyId: body.bodyId,
    label: body.label,
    aabb: body.aabb,
    layer: body.layer,
    active: body.active,
    registeredAt: body.registeredAt,
  };
}

// ── Operations ────────────────────────────────────────────────────

function registerBodyImpl(
  state: CollisionState,
  bodyId: BodyId,
  label: string,
  aabb: AABB,
  layer: number,
): CollisionBody | CollisionError {
  if (state.bodies.has(bodyId)) return 'already-registered';
  if (!isValidAabb(aabb)) return 'invalid-bounds';

  const body: MutableBody = {
    bodyId,
    label,
    aabb,
    layer,
    active: true,
    registeredAt: state.clock.nowUs(),
  };
  state.bodies.set(bodyId, body);
  state.logger.info('collision-body-registered bodyId=' + bodyId);
  return toReadonly(body);
}

function updateBoundsImpl(
  state: CollisionState,
  bodyId: BodyId,
  newAabb: AABB,
): { success: true } | { success: false; error: CollisionError } {
  const body = state.bodies.get(bodyId);
  if (body === undefined) return { success: false, error: 'body-not-found' };
  if (!isValidAabb(newAabb)) return { success: false, error: 'invalid-bounds' };
  body.aabb = newAabb;
  return { success: true };
}

function setActiveImpl(
  state: CollisionState,
  bodyId: BodyId,
  active: boolean,
): { success: true } | { success: false; error: CollisionError } {
  const body = state.bodies.get(bodyId);
  if (body === undefined) return { success: false, error: 'body-not-found' };
  body.active = active;
  return { success: true };
}

function detectCollisionsImpl(
  state: CollisionState,
  query: CollisionQuery,
): ReadonlyArray<Collision> {
  const queryBody = state.bodies.get(query.bodyId);
  if (queryBody === undefined || !queryBody.active) return [];

  const results: Collision[] = [];
  const now = state.clock.nowUs();

  for (const [candidateId, candidate] of state.bodies) {
    if (candidateId === query.bodyId) continue;
    if (!candidate.active) continue;
    if (query.layer !== undefined && candidate.layer !== query.layer) continue;

    const overlap = computeOverlap(queryBody.aabb, candidate.aabb);
    if (overlap === null) continue;

    results.push({
      bodyAId: query.bodyId,
      bodyBId: candidateId,
      overlapX: overlap.x,
      overlapY: overlap.y,
      overlapZ: overlap.z,
      detectedAt: now,
    });
  }

  state.collisionsDetected += results.length;
  return results;
}

function checkPairImpl(
  state: CollisionState,
  bodyAId: BodyId,
  bodyBId: BodyId,
): Collision | null | CollisionError {
  const bodyA = state.bodies.get(bodyAId);
  if (bodyA === undefined) return 'body-not-found';
  const bodyB = state.bodies.get(bodyBId);
  if (bodyB === undefined) return 'body-not-found';
  if (!bodyA.active || !bodyB.active) return null;

  const overlap = computeOverlap(bodyA.aabb, bodyB.aabb);
  if (overlap === null) return null;

  state.collisionsDetected += 1;
  return {
    bodyAId,
    bodyBId,
    overlapX: overlap.x,
    overlapY: overlap.y,
    overlapZ: overlap.z,
    detectedAt: state.clock.nowUs(),
  };
}

function getStatsImpl(state: CollisionState): CollisionStats {
  let activeBodies = 0;
  for (const [, body] of state.bodies) {
    if (body.active) activeBodies += 1;
  }
  return {
    totalBodies: state.bodies.size,
    activeBodies,
    collisionsDetected: state.collisionsDetected,
  };
}

// ── Factory ───────────────────────────────────────────────────────

export function createCollisionSystem(deps: CollisionSystemDeps): CollisionSystem {
  const state: CollisionState = {
    bodies: new Map(),
    clock: deps.clock,
    logger: deps.logger,
    collisionsDetected: 0,
  };

  return {
    registerBody: (bodyId, label, aabb, layer) =>
      registerBodyImpl(state, bodyId, label, aabb, layer),
    updateBounds: (bodyId, newAabb) => updateBoundsImpl(state, bodyId, newAabb),
    deactivate: (bodyId) => setActiveImpl(state, bodyId, false),
    activate: (bodyId) => setActiveImpl(state, bodyId, true),
    detectCollisions: (query) => detectCollisionsImpl(state, query),
    checkPair: (bodyAId, bodyBId) => checkPairImpl(state, bodyAId, bodyBId),
    getBody: (bodyId) => {
      const body = state.bodies.get(bodyId);
      return body !== undefined ? toReadonly(body) : undefined;
    },
    getStats: () => getStatsImpl(state),
  };
}
