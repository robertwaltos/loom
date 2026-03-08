/**
 * component-registry.ts — Type-safe component access.
 *
 * Maps component type string keys to their data interfaces,
 * enabling compile-time checked component access through
 * the ComponentStore.
 *
 * When adding a new component:
 *   1. Define its interface in components.ts or gameplay-components.ts
 *   2. Add an entry to ComponentType union
 *   3. Add a mapping to ComponentTypeMap
 *   4. Re-export from index.ts
 */

import type {
  TransformComponent,
  IdentityComponent,
  HealthComponent,
  InventoryComponent,
  AIBrainComponent,
  PhysicsBodyComponent,
  WorldMembershipComponent,
} from './components.js';

import type {
  PlayerInputComponent,
  MovementComponent,
  CameraTargetComponent,
  VisualMeshComponent,
  AnimationComponent,
  NetworkReplicationComponent,
  SpawnPointComponent,
  NpcTierComponent,
  InteractionComponent,
} from './gameplay-components.js';

// ── Component Type Keys ─────────────────────────────────────────

/**
 * Canonical string keys for every component in the system.
 * Used by ComponentStore, serialization, and wire protocol.
 */
export type ComponentType =
  // Core components
  | 'transform'
  | 'identity'
  | 'health'
  | 'inventory'
  | 'ai-brain'
  | 'physics-body'
  | 'world-membership'
  // Gameplay components
  | 'player-input'
  | 'movement'
  | 'camera-target'
  | 'visual-mesh'
  | 'animation'
  | 'network-replication'
  | 'spawn-point'
  | 'npc-tier'
  | 'interaction';

// ── Type Map ────────────────────────────────────────────────────

/**
 * Maps component type strings to their data interfaces.
 * Enables typed component access:
 *
 *   const transform = store.get<'transform'>(entityId, 'transform');
 *   // TypeScript knows: typeof transform === TransformComponent
 */
export interface ComponentTypeMap {
  readonly 'transform': TransformComponent;
  readonly 'identity': IdentityComponent;
  readonly 'health': HealthComponent;
  readonly 'inventory': InventoryComponent;
  readonly 'ai-brain': AIBrainComponent;
  readonly 'physics-body': PhysicsBodyComponent;
  readonly 'world-membership': WorldMembershipComponent;
  readonly 'player-input': PlayerInputComponent;
  readonly 'movement': MovementComponent;
  readonly 'camera-target': CameraTargetComponent;
  readonly 'visual-mesh': VisualMeshComponent;
  readonly 'animation': AnimationComponent;
  readonly 'network-replication': NetworkReplicationComponent;
  readonly 'spawn-point': SpawnPointComponent;
  readonly 'npc-tier': NpcTierComponent;
  readonly 'interaction': InteractionComponent;
}

// ── Component Sets ──────────────────────────────────────────────

/** Components required for a player entity. */
export type PlayerRequiredComponents =
  | 'transform'
  | 'identity'
  | 'health'
  | 'world-membership'
  | 'player-input'
  | 'movement'
  | 'camera-target'
  | 'visual-mesh'
  | 'animation'
  | 'network-replication';

/** Components required for a Tier 0 ambient NPC. */
export type AmbientNpcRequiredComponents =
  | 'transform'
  | 'visual-mesh'
  | 'animation'
  | 'npc-tier'
  | 'world-membership';

/** Components required for a Tier 1 inhabitant NPC. */
export type InhabitantNpcRequiredComponents =
  | AmbientNpcRequiredComponents
  | 'identity'
  | 'movement'
  | 'ai-brain';

/** Components required for a Tier 2+ notable NPC. */
export type NotableNpcRequiredComponents =
  | InhabitantNpcRequiredComponents
  | 'health'
  | 'interaction'
  | 'network-replication';

/** Components required for a spawn point entity. */
export type SpawnPointRequiredComponents =
  | 'transform'
  | 'spawn-point'
  | 'world-membership';

// ── All Component Types Array ───────────────────────────────────

/**
 * Runtime array of all registered component type keys.
 * Useful for iteration, validation, and serialization.
 */
export const ALL_COMPONENT_TYPES: ReadonlyArray<ComponentType> = [
  'transform',
  'identity',
  'health',
  'inventory',
  'ai-brain',
  'physics-body',
  'world-membership',
  'player-input',
  'movement',
  'camera-target',
  'visual-mesh',
  'animation',
  'network-replication',
  'spawn-point',
  'npc-tier',
  'interaction',
] as const;
