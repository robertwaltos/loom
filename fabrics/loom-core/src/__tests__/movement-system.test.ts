/**
 * MovementSystem — Validates player input → movement → transform pipeline.
 */

import { describe, it, expect } from 'vitest';
import { createMovementSystem } from '../movement-system.js';
import { createComponentStore } from '../component-store.js';
import type { SystemContext } from '../system-registry.js';
import type {
  TransformComponent,
  PlayerInputComponent,
  MovementComponent,
  PhysicsBodyComponent,
} from '@loom/entities-contracts';
import type { EntityId } from '@loom/entities-contracts';

function eid(raw: string): EntityId {
  return raw as EntityId;
}

function context(deltaMs: number): SystemContext {
  return { deltaMs, tickNumber: 1, wallTimeMicroseconds: 1000 };
}

function setupEntity(
  store: ReturnType<typeof createComponentStore>,
  entityId: EntityId,
  moveDir: { x: number; y: number; z: number } = { x: 0, y: 0, z: 1 },
  actions: string[] = [],
): void {
  const transform: TransformComponent = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 1, y: 1, z: 1 },
  };
  const input: PlayerInputComponent = {
    moveDirection: moveDir,
    lookDirection: { x: 0, y: 0, z: -1 },
    actions,
    sequenceNumber: 1,
  };
  const movement: MovementComponent = {
    speed: 0,
    maxSpeed: 3.5,
    isGrounded: true,
    movementMode: 'walking',
  };
  const physics: PhysicsBodyComponent = {
    mass: 70,
    velocity: { x: 0, y: 0, z: 0 },
    isKinematic: false,
    collisionLayer: 1,
    collisionMask: 0xffff,
  };
  store.set(entityId, 'transform', transform);
  store.set(entityId, 'player-input', input);
  store.set(entityId, 'movement', movement);
  store.set(entityId, 'physics-body', physics);
}

describe('MovementSystem — basic movement', () => {
  it('updates position when player has movement input', () => {
    const store = createComponentStore();
    const system = createMovementSystem({ componentStore: store });
    const id = eid('player-1');
    setupEntity(store, id, { x: 0, y: 0, z: 1 });

    system(context(1000)); // 1 second delta

    const t = store.get(id, 'transform') as TransformComponent;
    expect(t.position.z).toBeGreaterThan(0);
  });

  it('does not move when input is zero', () => {
    const store = createComponentStore();
    const system = createMovementSystem({ componentStore: store });
    const id = eid('player-1');
    setupEntity(store, id, { x: 0, y: 0, z: 0 });

    system(context(1000));

    const t = store.get(id, 'transform') as TransformComponent;
    expect(t.position.x).toBe(0);
    expect(t.position.z).toBe(0);
  });

  it('moves in the direction of input', () => {
    const store = createComponentStore();
    const system = createMovementSystem({ componentStore: store });
    const id = eid('player-1');
    setupEntity(store, id, { x: 1, y: 0, z: 0 });

    system(context(1000));

    const t = store.get(id, 'transform') as TransformComponent;
    expect(t.position.x).toBeGreaterThan(0);
    expect(t.position.z).toBeCloseTo(0, 5);
  });
});

describe('MovementSystem — movement modes', () => {
  it('sprints when sprint action is active', () => {
    const store = createComponentStore();
    const system = createMovementSystem({ componentStore: store });
    const id = eid('player-1');
    setupEntity(store, id, { x: 0, y: 0, z: 1 }, ['sprint']);

    system(context(1000));

    const m = store.get(id, 'movement') as MovementComponent;
    expect(m.movementMode).toBe('sprinting');
    expect(m.speed).toBeGreaterThan(3.5);
  });

  it('defaults to running with move input', () => {
    const store = createComponentStore();
    const system = createMovementSystem({ componentStore: store });
    const id = eid('player-1');
    setupEntity(store, id, { x: 0, y: 0, z: 1 });

    system(context(100));

    const m = store.get(id, 'movement') as MovementComponent;
    expect(m.movementMode).toBe('running');
  });

  it('uses walking mode when walk action active', () => {
    const store = createComponentStore();
    const system = createMovementSystem({ componentStore: store });
    const id = eid('player-1');
    setupEntity(store, id, { x: 0, y: 0, z: 1 }, ['walk']);

    system(context(100));

    const m = store.get(id, 'movement') as MovementComponent;
    expect(m.movementMode).toBe('walking');
  });
});

describe('MovementSystem — physics integration', () => {
  it('updates physics body velocity', () => {
    const store = createComponentStore();
    const system = createMovementSystem({ componentStore: store });
    const id = eid('player-1');
    setupEntity(store, id, { x: 0, y: 0, z: 1 });

    system(context(100));

    const p = store.get(id, 'physics-body') as PhysicsBodyComponent;
    expect(p.velocity.z).toBeGreaterThan(0);
  });

  it('preserves rotation and scale on transform update', () => {
    const store = createComponentStore();
    const system = createMovementSystem({ componentStore: store });
    const id = eid('player-1');
    setupEntity(store, id, { x: 1, y: 0, z: 0 });

    system(context(100));

    const t = store.get(id, 'transform') as TransformComponent;
    expect(t.rotation.w).toBe(1);
    expect(t.scale.x).toBe(1);
  });

  it('skips entities without required components', () => {
    const store = createComponentStore();
    const system = createMovementSystem({ componentStore: store });
    const id = eid('incomplete-entity');
    store.set(id, 'player-input', {
      moveDirection: { x: 1, y: 0, z: 0 },
      lookDirection: { x: 0, y: 0, z: -1 },
      actions: [],
      sequenceNumber: 1,
    });
    // No transform or movement component

    expect(() => { system(context(100)); }).not.toThrow();
  });
});

describe('MovementSystem — multiple entities', () => {
  it('processes all entities with player-input each tick', () => {
    const store = createComponentStore();
    const system = createMovementSystem({ componentStore: store });
    const p1 = eid('player-1');
    const p2 = eid('player-2');
    setupEntity(store, p1, { x: 1, y: 0, z: 0 });
    setupEntity(store, p2, { x: 0, y: 0, z: -1 });

    system(context(1000));

    const t1 = store.get(p1, 'transform') as TransformComponent;
    const t2 = store.get(p2, 'transform') as TransformComponent;
    expect(t1.position.x).toBeGreaterThan(0);
    expect(t2.position.z).toBeLessThan(0);
  });
});
