/**
 * Core Components
 *
 * Minimal component set to prove the architecture.
 * The game bible will drive expansion of these.
 *
 * All components are pure data — serializable, immutable snapshots.
 * No methods. No references to other entities (use entity IDs).
 */

export interface TransformComponent {
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly rotation: { readonly x: number; readonly y: number; readonly z: number; readonly w: number };
  readonly scale: { readonly x: number; readonly y: number; readonly z: number };
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
  readonly hostility: "friendly" | "neutral" | "hostile";
  readonly knownEntities: ReadonlyArray<string>;
}

export interface PhysicsBodyComponent {
  readonly mass: number;
  readonly velocity: { readonly x: number; readonly y: number; readonly z: number };
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
