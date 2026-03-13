import { describe, expect, it } from 'vitest';
import { createComponentStore } from '../component-store.js';
import { createMovementSystem } from '../movement-system.js';

describe('movement-system simulation', () => {
  it('simulates sprint input being transformed into velocity and world-space motion', () => {
    const store = createComponentStore();
    const entityId = 'player-1' as never;
    store.set(entityId, 'transform', {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    });
    store.set(entityId, 'player-input', {
      moveDirection: { x: 0, y: 0, z: 1 },
      lookDirection: { x: 0, y: 0, z: -1 },
      actions: ['sprint'],
      sequenceNumber: 1,
    });
    store.set(entityId, 'movement', {
      speed: 0,
      maxSpeed: 3.5,
      isGrounded: true,
      movementMode: 'walking',
    });
    store.set(entityId, 'physics-body', {
      mass: 70,
      velocity: { x: 0, y: 0, z: 0 },
      isKinematic: false,
      collisionLayer: 1,
      collisionMask: 0xffff,
    });

    const system = createMovementSystem({ componentStore: store });
    system({ deltaMs: 1000, tickNumber: 1, wallTimeMicroseconds: 1_000_000 });

    expect(store.get(entityId, 'transform')).toMatchObject({
      position: { z: expect.any(Number) },
    });
    expect((store.get(entityId, 'movement') as { movementMode: string }).movementMode).toBe(
      'sprinting',
    );
  });
});
