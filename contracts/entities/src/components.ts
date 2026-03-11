/**
 * Core Components
 *
 * Minimal component set that forms the foundation.
 * Extended by gameplay-components.ts for the vertical slice.
 *
 * All components are pure data — serializable, immutable snapshots.
 * No methods. No references to other entities (use entity IDs).
 */

import type { Vec3, Quat } from './shared-types.js';

export interface TransformComponent {
  readonly position: Vec3;
  readonly rotation: Quat;
  readonly scale: Vec3;
}

export interface IdentityComponent {
  readonly displayName: string;
  readonly playerId: string | null;
  readonly faction: string | null;
  readonly reputation: number;
}

export interface HealthComponent {
  readonly current: number;
  readonly maximum: number;
  readonly regenerationRate: number;
  readonly isAlive: boolean;
}

export interface InventoryComponent {
  readonly slots: ReadonlyArray<InventorySlot>;
  readonly maxSlots: number;
  readonly weightCurrent: number;
  readonly weightMax: number;
}

export interface InventorySlot {
  readonly slotIndex: number;
  readonly itemEntityId: string | null;
  readonly quantity: number;
}

export interface AIBrainComponent {
  readonly behaviorTreeId: string;
  readonly currentGoal: string | null;
  readonly awarenessRadius: number;
  readonly hostility: 'friendly' | 'neutral' | 'hostile';
  readonly knownEntities: ReadonlyArray<string>;
}

export interface PhysicsBodyComponent {
  readonly mass: number;
  readonly velocity: Vec3;
  readonly isKinematic: boolean;
  readonly collisionLayer: number;
  readonly collisionMask: number;
}

export interface WorldMembershipComponent {
  readonly worldId: string;
  readonly enteredAt: number;
  readonly isTransitioning: boolean;
  readonly transitionTargetWorldId: string | null;
}
