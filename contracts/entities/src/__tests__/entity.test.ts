/**
 * Entity Contract Smoke Tests
 *
 * Validates entity types, branded IDs, and component data structures.
 */

import { describe, it, expect } from 'vitest';
import type { Entity, EntityId, EntityType } from '../entity.js';
import type {
  TransformComponent,
  HealthComponent,
  IdentityComponent,
  WorldMembershipComponent,
} from '../components.js';

function createEntityId(raw: string): EntityId {
  return raw as EntityId;
}

describe('EntityId (branded type)', () => {
  it('creates a branded EntityId from a string', () => {
    const id = createEntityId('ent-12345');
    const rawString: string = id;

    expect(rawString).toBe('ent-12345');
  });

  it('preserves identity across assignment', () => {
    const id1 = createEntityId('ent-001');
    const id2 = createEntityId('ent-001');

    expect(id1).toBe(id2);
  });
});

describe('Entity', () => {
  it('creates a valid player entity', () => {
    const entity: Entity = {
      id: createEntityId('player-42'),
      type: 'player',
      worldId: 'world-alpha',
      createdAt: Date.now(),
      version: 1,
    };

    expect(entity.type).toBe('player');
    expect(entity.version).toBe(1);
  });

  it('covers all ten entity types', () => {
    const allTypes: ReadonlyArray<EntityType> = [
      'player',
      'npc',
      'creature',
      'item',
      'structure',
      'vehicle',
      'projectile',
      'trigger-zone',
      'weave-zone',
      'ambient',
    ];

    expect(allTypes).toHaveLength(10);
  });
});

describe('Components', () => {
  it('creates a transform at world origin', () => {
    const transform: TransformComponent = {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 },
    };

    expect(transform.rotation.w).toBe(1);
    expect(transform.scale.x).toBe(1);
  });

  it('creates a health component with regeneration', () => {
    const health: HealthComponent = {
      current: 100,
      maximum: 100,
      regenerationRate: 2.5,
      isAlive: true,
    };

    expect(health.current).toBeLessThanOrEqual(health.maximum);
    expect(health.isAlive).toBe(true);
  });

  it('creates an identity for an NPC with faction', () => {
    const identity: IdentityComponent = {
      displayName: 'Elder Thane Rolis',
      playerId: null,
      faction: 'iron-concordat',
      reputation: 750,
    };

    expect(identity.playerId).toBeNull();
    expect(identity.faction).toBe('iron-concordat');
  });

  it('tracks world membership during Silfen Weave transition', () => {
    const membership: WorldMembershipComponent = {
      worldId: 'world-alpha',
      enteredAt: Date.now(),
      isTransitioning: true,
      transitionTargetWorldId: 'world-beta',
    };

    expect(membership.isTransitioning).toBe(true);
    expect(membership.transitionTargetWorldId).toBe('world-beta');
  });
});
