/**
 * Component Store — Map-based component storage.
 *
 * Stores typed components keyed by (entityId, componentType).
 * Pure data store — no events, no side effects.
 * The EntityRegistry wraps this with event emission.
 */

import type { EntityId } from '@loom/entities-contracts';
import { componentNotFound } from './errors.js';

type ComponentMap = Map<string, unknown>;
type Store = Map<EntityId, ComponentMap>;

export interface ComponentStore {
  set(entityId: EntityId, componentType: string, data: unknown): void;
  get(entityId: EntityId, componentType: string): unknown;
  tryGet(entityId: EntityId, componentType: string): unknown;
  has(entityId: EntityId, componentType: string): boolean;
  remove(entityId: EntityId, componentType: string): boolean;
  removeAll(entityId: EntityId): void;
  listComponents(entityId: EntityId): ReadonlyArray<string>;
  findEntitiesWith(componentType: string): ReadonlyArray<EntityId>;
}

export function createComponentStore(): ComponentStore {
  const store: Store = new Map();

  return {
    set: (eid, ct, data) => {
      ensureMap(store, eid).set(ct, data);
    },
    get: (eid, ct) => getOrThrow(store, eid, ct),
    tryGet: (eid, ct) => store.get(eid)?.get(ct),
    has: (eid, ct) => store.get(eid)?.has(ct) ?? false,
    remove: (eid, ct) => store.get(eid)?.delete(ct) ?? false,
    removeAll: (eid) => {
      store.delete(eid);
    },
    listComponents: (eid) => [...(store.get(eid)?.keys() ?? [])],
    findEntitiesWith: (ct) => findWithComponent(store, ct),
  };
}

function ensureMap(store: Store, entityId: EntityId): ComponentMap {
  let map = store.get(entityId);
  if (map === undefined) {
    map = new Map();
    store.set(entityId, map);
  }
  return map;
}

function getOrThrow(store: Store, entityId: EntityId, componentType: string): unknown {
  const value = store.get(entityId)?.get(componentType);
  if (value === undefined) throw componentNotFound(entityId, componentType);
  return value;
}

function findWithComponent(store: Store, componentType: string): EntityId[] {
  const result: EntityId[] = [];
  for (const [entityId, components] of store) {
    if (components.has(componentType)) result.push(entityId);
  }
  return result;
}
