/**
 * Core Entity Definition
 *
 * An entity is just an identity with a type.
 * All data lives in components attached to it.
 * This is the Flecs model mapped to TypeScript types.
 */

/** Globally unique entity identifier */
export type EntityId = string & { readonly __brand: 'EntityId' };

/** Entity type determines which components are required vs optional */
export type EntityType =
  | 'player'
  | 'npc'
  | 'creature'
  | 'item'
  | 'structure'
  | 'vehicle'
  | 'projectile'
  | 'trigger-zone'
  | 'weave-zone'
  | 'ambient';

export interface Entity {
  readonly id: EntityId;
  readonly type: EntityType;
  readonly worldId: string;
  readonly createdAt: number;
  readonly version: number;
}
