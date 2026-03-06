/**
 * Entity & Component Contracts
 *
 * Defines the canonical entity model for The Loom.
 * These are the data shapes that exist independent of any rendering engine.
 * Components are pure data — no methods, no side effects.
 *
 * The game bible will expand these significantly.
 * This is the minimal set needed to prove the architecture.
 */

export type { Entity, EntityType } from './entity.js';
export type {
  TransformComponent,
  IdentityComponent,
  HealthComponent,
  InventoryComponent,
  AIBrainComponent,
  PhysicsBodyComponent,
  WorldMembershipComponent,
} from './components.js';
