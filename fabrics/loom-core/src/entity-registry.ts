/**
 * Entity Registry — Entity lifecycle management.
 *
 * Creates, queries, and destroys entities.
 * Every mutation emits events through the EventBus.
 * Component data is delegated to the ComponentStore.
 */

import type { Entity, EntityId, EntityType } from '@loom/entities-contracts';
import type { EventBus } from '@loom/events-contracts';
import type { ComponentStore } from './component-store.js';
import type { EventFactory, EventSource } from './event-factory.js';
import type { IdGenerator } from './id-generator.js';
import type { Clock } from './clock.js';
import { entityNotFound, entityAlreadyExists } from './errors.js';

export interface EntityRegistry {
  spawn(type: EntityType, worldId: string, components?: Record<string, unknown>): EntityId;
  despawn(entityId: EntityId, reason: 'destroyed' | 'migrated' | 'expired'): void;
  get(entityId: EntityId): Entity;
  tryGet(entityId: EntityId): Entity | undefined;
  exists(entityId: EntityId): boolean;
  queryByWorld(worldId: string): ReadonlyArray<Entity>;
  queryByType(type: EntityType): ReadonlyArray<Entity>;
  count(): number;
  readonly components: ComponentStore;
}

interface RegistryState {
  readonly entities: Map<EntityId, Entity>;
  readonly eventBus: EventBus;
  readonly eventFactory: EventFactory;
  readonly componentStore: ComponentStore;
  readonly idGenerator: IdGenerator;
  readonly clock: Clock;
}

const FABRIC_ID = 'loom-core';

export function createEntityRegistry(deps: Omit<RegistryState, 'entities'>): EntityRegistry {
  const state: RegistryState = { ...deps, entities: new Map() };

  return {
    spawn: (type, worldId, comps) => spawnEntity(state, type, worldId, comps),
    despawn: (eid, reason) => {
      despawnEntity(state, eid, reason);
    },
    get: (eid) => getEntity(state, eid),
    tryGet: (eid) => state.entities.get(eid),
    exists: (eid) => state.entities.has(eid),
    queryByWorld: (wid) => filterEntities(state, (e) => e.worldId === wid),
    queryByType: (t) => filterEntities(state, (e) => e.type === t),
    count: () => state.entities.size,
    components: deps.componentStore,
  };
}

function spawnEntity(
  state: RegistryState,
  type: EntityType,
  worldId: string,
  components?: Record<string, unknown>,
): EntityId {
  const id = state.idGenerator.generate() as EntityId;
  if (state.entities.has(id)) throw entityAlreadyExists(id);

  state.entities.set(id, {
    id,
    type,
    worldId,
    createdAt: state.clock.nowMicroseconds(),
    version: 1,
  });
  attachComponents(state, id, components);
  emitSpawn(state, id, worldId, type);
  return id;
}

function attachComponents(
  state: RegistryState,
  id: EntityId,
  components?: Record<string, unknown>,
): void {
  if (!components) return;
  for (const [componentType, data] of Object.entries(components)) {
    state.componentStore.set(id, componentType, data);
  }
}

function emitSpawn(
  state: RegistryState,
  entityId: EntityId,
  worldId: string,
  entityType: EntityType,
): void {
  const source: EventSource = { worldId, fabricId: FABRIC_ID };
  const event = state.eventFactory.create(
    'entity.spawned',
    { entityId, worldId, entityType, initialComponents: [] },
    source,
  );
  state.eventBus.publish(event);
}

function despawnEntity(
  state: RegistryState,
  entityId: EntityId,
  reason: 'destroyed' | 'migrated' | 'expired',
): void {
  const entity = getEntity(state, entityId);
  state.componentStore.removeAll(entityId);
  state.entities.delete(entityId);
  emitDespawn(state, entityId, entity.worldId, reason);
}

function emitDespawn(
  state: RegistryState,
  entityId: EntityId,
  worldId: string,
  reason: string,
): void {
  const source: EventSource = { worldId, fabricId: FABRIC_ID };
  const event = state.eventFactory.create(
    'entity.despawned',
    { entityId, worldId, reason },
    source,
  );
  state.eventBus.publish(event);
}

function getEntity(state: RegistryState, entityId: EntityId): Entity {
  const entity = state.entities.get(entityId);
  if (entity === undefined) throw entityNotFound(entityId);
  return entity;
}

function filterEntities(state: RegistryState, predicate: (e: Entity) => boolean): Entity[] {
  const result: Entity[] = [];
  for (const entity of state.entities.values()) {
    if (predicate(entity)) result.push(entity);
  }
  return result;
}
