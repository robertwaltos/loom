/**
 * movement-system.ts — Processes player input into movement.
 *
 * Each tick:
 *   1. Reads PlayerInputComponent for intent
 *   2. Determines MovementComponent state (speed, mode)
 *   3. Updates TransformComponent position via velocity
 *   4. Updates PhysicsBodyComponent velocity
 *
 * Server-authoritative: the Loom is the single source of truth.
 * The rendering fabric interpolates between snapshots.
 */

import type { ComponentStore } from './component-store.js';
import type { SystemFn } from './system-registry.js';
import type { EntityId } from '@loom/entities-contracts';
import type {
  TransformComponent,
  PlayerInputComponent,
  MovementComponent,
  PhysicsBodyComponent,
  Vec3,
  MovementMode,
} from '@loom/entities-contracts';

// ── Ports ────────────────────────────────────────────────────────

export interface MovementSystemDeps {
  readonly componentStore: ComponentStore;
}

// ── Constants ───────────────────────────────────────────────────

/** Speed limits per movement mode (world units per second). */
const MODE_SPEED: Record<MovementMode, number> = {
  walking: 1.4,
  running: 3.5,
  sprinting: 6.0,
  falling: 0,
  swimming: 1.0,
  flying: 5.0,
};

// ── Helpers ─────────────────────────────────────────────────────

function magnitude(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function resolveMode(input: PlayerInputComponent, current: MovementComponent): MovementMode {
  if (!current.isGrounded) return 'falling';
  const hasMoveInput = magnitude(input.moveDirection) > 0.01;
  if (!hasMoveInput) return 'walking';
  if (input.actions.includes('sprint')) return 'sprinting';
  if (input.actions.includes('walk')) return 'walking';
  return 'running';
}

function computeSpeed(input: PlayerInputComponent, mode: MovementMode): number {
  const inputMag = magnitude(input.moveDirection);
  const maxForMode = MODE_SPEED[mode];
  return Math.min(inputMag * maxForMode, maxForMode);
}

function computeVelocity(input: PlayerInputComponent, speed: number): Vec3 {
  const mag = magnitude(input.moveDirection);
  if (mag < 0.001) return { x: 0, y: 0, z: 0 };
  const invMag = 1 / mag;
  return {
    x: input.moveDirection.x * invMag * speed,
    y: input.moveDirection.y * invMag * speed,
    z: input.moveDirection.z * invMag * speed,
  };
}

function integrate(position: Vec3, velocity: Vec3, deltaSec: number): Vec3 {
  return {
    x: position.x + velocity.x * deltaSec,
    y: position.y + velocity.y * deltaSec,
    z: position.z + velocity.z * deltaSec,
  };
}

// ── System Update ───────────────────────────────────────────────

function updateEntity(
  store: ComponentStore,
  entityId: EntityId,
  deltaSec: number,
): void {
  const input = store.tryGet(entityId, 'player-input') as PlayerInputComponent | undefined;
  const movement = store.tryGet(entityId, 'movement') as MovementComponent | undefined;
  const transform = store.tryGet(entityId, 'transform') as TransformComponent | undefined;
  if (!input || !movement || !transform) return;

  const mode = resolveMode(input, movement);
  const speed = computeSpeed(input, mode);
  const velocity = computeVelocity(input, speed);
  const newPosition = integrate(transform.position, velocity, deltaSec);

  writeMovement(store, entityId, speed, mode, movement);
  writeTransform(store, entityId, newPosition, transform);
  writeVelocity(store, entityId, velocity);
}

function writeMovement(
  store: ComponentStore,
  entityId: EntityId,
  speed: number,
  mode: MovementMode,
  current: MovementComponent,
): void {
  const updated: MovementComponent = {
    speed,
    maxSpeed: MODE_SPEED[mode],
    isGrounded: current.isGrounded,
    movementMode: mode,
  };
  store.set(entityId, 'movement', updated);
}

function writeTransform(
  store: ComponentStore,
  entityId: EntityId,
  newPosition: Vec3,
  current: TransformComponent,
): void {
  const updated: TransformComponent = {
    position: newPosition,
    rotation: current.rotation,
    scale: current.scale,
  };
  store.set(entityId, 'transform', updated);
}

function writeVelocity(
  store: ComponentStore,
  entityId: EntityId,
  velocity: Vec3,
): void {
  const existing = store.tryGet(entityId, 'physics-body') as PhysicsBodyComponent | undefined;
  if (!existing) return;
  const updated: PhysicsBodyComponent = {
    mass: existing.mass,
    velocity,
    isKinematic: existing.isKinematic,
    collisionLayer: existing.collisionLayer,
    collisionMask: existing.collisionMask,
  };
  store.set(entityId, 'physics-body', updated);
}

// ── Factory ─────────────────────────────────────────────────────

/** Priority 100: runs after input collection, before rendering. */
const MOVEMENT_SYSTEM_PRIORITY = 100;

function createMovementSystem(deps: MovementSystemDeps): SystemFn {
  return (context) => {
    const entities = deps.componentStore.findEntitiesWith('player-input');
    const deltaSec = context.deltaMs / 1000;
    for (const entityId of entities) {
      updateEntity(deps.componentStore, entityId, deltaSec);
    }
  };
}

// ── Exports ─────────────────────────────────────────────────────

export { createMovementSystem, MOVEMENT_SYSTEM_PRIORITY };
