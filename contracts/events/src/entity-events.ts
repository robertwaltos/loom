/**
 * Entity Lifecycle Events
 */

import type { LoomEvent } from './event.js';

export type EntitySpawnedEvent = LoomEvent<
  'entity.spawned',
  {
    readonly entityId: string;
    readonly worldId: string;
    readonly entityType: string;
    readonly initialComponents: ReadonlyArray<ComponentSnapshot>;
  }
>;

export type EntityDespawnedEvent = LoomEvent<
  'entity.despawned',
  {
    readonly entityId: string;
    readonly worldId: string;
    readonly reason: 'destroyed' | 'migrated' | 'expired';
  }
>;

export type EntityMigratedEvent = LoomEvent<
  'entity.migrated',
  {
    readonly entityId: string;
    readonly sourceWorldId: string;
    readonly destinationWorldId: string;
    readonly components: ReadonlyArray<ComponentSnapshot>;
    readonly migrationPhase: 'prepare' | 'transfer' | 'confirm';
  }
>;

export type ComponentChangedEvent = LoomEvent<
  'entity.component.changed',
  {
    readonly entityId: string;
    readonly worldId: string;
    readonly componentType: string;
    readonly previousValue: Uint8Array | null;
    readonly newValue: Uint8Array;
  }
>;

export interface ComponentSnapshot {
  readonly componentType: string;
  readonly data: Uint8Array;
}
