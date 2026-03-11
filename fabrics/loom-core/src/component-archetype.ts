/**
 * Component Archetype Store — Archetype-based component storage for ECS.
 *
 * Groups entities by their component composition (archetype). Entities
 * sharing the same set of component types live together, enabling
 * efficient iteration. When components are added or removed, the entity
 * migrates to the matching archetype. Chunk-based storage organizes
 * archetypes into fixed-size chunks for cache-friendly access.
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface ArchetypeId {
  readonly key: string;
  readonly componentTypes: ReadonlyArray<string>;
}

export interface Archetype {
  readonly id: ArchetypeId;
  readonly entityCount: number;
  readonly chunkCount: number;
}

export interface ArchetypeChunk {
  readonly archetypeKey: string;
  readonly chunkIndex: number;
  readonly entityCount: number;
  readonly capacity: number;
}

export interface ArchetypeQueryResult {
  readonly entityId: string;
  readonly components: ReadonlyMap<string, unknown>;
}

export interface ArchetypeStoreStats {
  readonly archetypeCount: number;
  readonly totalEntities: number;
  readonly totalChunks: number;
  readonly totalMigrations: number;
  readonly chunkCapacity: number;
}

export interface ArchetypeStoreDeps {
  readonly clock: { nowMicroseconds(): number };
  readonly chunkCapacity?: number;
}

export interface ArchetypeStore {
  addEntity(entityId: string): boolean;
  removeEntity(entityId: string): boolean;
  setComponent(entityId: string, componentType: string, data: unknown): boolean;
  removeComponent(entityId: string, componentType: string): boolean;
  getComponent(entityId: string, componentType: string): unknown | undefined;
  hasComponent(entityId: string, componentType: string): boolean;
  getEntityArchetype(entityId: string): ArchetypeId | undefined;
  queryByComponents(required: ReadonlyArray<string>): ReadonlyArray<ArchetypeQueryResult>;
  iterateArchetype(archetypeKey: string, callback: ArchetypeIterator): number;
  getArchetype(archetypeKey: string): Archetype | undefined;
  getArchetypeChunks(archetypeKey: string): ReadonlyArray<ArchetypeChunk>;
  getStats(): ArchetypeStoreStats;
}

export type ArchetypeIterator = (
  entityId: string,
  components: ReadonlyMap<string, unknown>,
) => void;

// ─── Constants ──────────────────────────────────────────────────────

const DEFAULT_CHUNK_CAPACITY = 64;

// ─── State ──────────────────────────────────────────────────────────

interface EntityRecord {
  readonly entityId: string;
  archetypeKey: string;
  readonly components: Map<string, unknown>;
}

interface ChunkData {
  readonly entityIds: string[];
  readonly capacity: number;
}

interface ArchetypeData {
  readonly componentTypes: string[];
  readonly key: string;
  readonly chunks: ChunkData[];
  readonly entitySet: Set<string>;
}

interface StoreState {
  readonly entities: Map<string, EntityRecord>;
  readonly archetypes: Map<string, ArchetypeData>;
  readonly clock: { nowMicroseconds(): number };
  readonly chunkCapacity: number;
  totalMigrations: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createArchetypeStore(deps: ArchetypeStoreDeps): ArchetypeStore {
  const state: StoreState = {
    entities: new Map(),
    archetypes: new Map(),
    clock: deps.clock,
    chunkCapacity: deps.chunkCapacity ?? DEFAULT_CHUNK_CAPACITY,
    totalMigrations: 0,
  };

  return {
    addEntity: (eid) => addEntityImpl(state, eid),
    removeEntity: (eid) => removeEntityImpl(state, eid),
    setComponent: (eid, ct, data) => setComponentImpl(state, eid, ct, data),
    removeComponent: (eid, ct) => removeComponentImpl(state, eid, ct),
    getComponent: (eid, ct) => getComponentImpl(state, eid, ct),
    hasComponent: (eid, ct) => hasComponentImpl(state, eid, ct),
    getEntityArchetype: (eid) => getEntityArchetypeImpl(state, eid),
    queryByComponents: (req) => queryByComponentsImpl(state, req),
    iterateArchetype: (key, cb) => iterateArchetypeImpl(state, key, cb),
    getArchetype: (key) => getArchetypeInfo(state, key),
    getArchetypeChunks: (key) => getChunksInfo(state, key),
    getStats: () => computeStats(state),
  };
}

// ─── Archetype Key ──────────────────────────────────────────────────

function buildArchetypeKey(componentTypes: ReadonlyArray<string>): string {
  const sorted = [...componentTypes].sort();
  return sorted.join('+');
}

// ─── Add / Remove Entity ────────────────────────────────────────────

function addEntityImpl(state: StoreState, entityId: string): boolean {
  if (state.entities.has(entityId)) return false;
  const key = buildArchetypeKey([]);
  const record: EntityRecord = { entityId, archetypeKey: key, components: new Map() };
  state.entities.set(entityId, record);
  ensureArchetype(state, key, []);
  addToArchetype(state, key, entityId);
  return true;
}

function removeEntityImpl(state: StoreState, entityId: string): boolean {
  const record = state.entities.get(entityId);
  if (record === undefined) return false;
  removeFromArchetype(state, record.archetypeKey, entityId);
  state.entities.delete(entityId);
  return true;
}

// ─── Archetype Management ───────────────────────────────────────────

function ensureArchetype(state: StoreState, key: string, types: string[]): ArchetypeData {
  const existing = state.archetypes.get(key);
  if (existing !== undefined) return existing;
  const archetype: ArchetypeData = {
    componentTypes: [...types].sort(),
    key,
    chunks: [],
    entitySet: new Set(),
  };
  state.archetypes.set(key, archetype);
  return archetype;
}

function addToArchetype(state: StoreState, key: string, entityId: string): void {
  const archetype = state.archetypes.get(key);
  if (archetype === undefined) return;
  archetype.entitySet.add(entityId);
  addToChunk(archetype, state.chunkCapacity, entityId);
}

function removeFromArchetype(state: StoreState, key: string, entityId: string): void {
  const archetype = state.archetypes.get(key);
  if (archetype === undefined) return;
  archetype.entitySet.delete(entityId);
  removeFromChunks(archetype, entityId);
}

// ─── Chunk Management ───────────────────────────────────────────────

function addToChunk(archetype: ArchetypeData, capacity: number, entityId: string): void {
  const last = archetype.chunks[archetype.chunks.length - 1];
  if (last !== undefined && last.entityIds.length < last.capacity) {
    last.entityIds.push(entityId);
    return;
  }
  const chunk: ChunkData = { entityIds: [entityId], capacity };
  archetype.chunks.push(chunk);
}

function removeFromChunks(archetype: ArchetypeData, entityId: string): void {
  for (let i = 0; i < archetype.chunks.length; i++) {
    const chunk = archetype.chunks[i] as ChunkData;
    const idx = chunk.entityIds.indexOf(entityId);
    if (idx >= 0) {
      chunk.entityIds.splice(idx, 1);
      if (chunk.entityIds.length === 0) archetype.chunks.splice(i, 1);
      return;
    }
  }
}

// ─── Set Component ──────────────────────────────────────────────────

function setComponentImpl(
  state: StoreState,
  entityId: string,
  componentType: string,
  data: unknown,
): boolean {
  const record = state.entities.get(entityId);
  if (record === undefined) return false;
  const hadComponent = record.components.has(componentType);
  record.components.set(componentType, data);
  if (!hadComponent) {
    migrateEntity(state, record);
  }
  return true;
}

// ─── Remove Component ───────────────────────────────────────────────

function removeComponentImpl(state: StoreState, entityId: string, componentType: string): boolean {
  const record = state.entities.get(entityId);
  if (record === undefined) return false;
  if (!record.components.has(componentType)) return false;
  record.components.delete(componentType);
  migrateEntity(state, record);
  return true;
}

// ─── Migration ──────────────────────────────────────────────────────

function migrateEntity(state: StoreState, record: EntityRecord): void {
  const newTypes = [...record.components.keys()];
  const newKey = buildArchetypeKey(newTypes);
  if (newKey === record.archetypeKey) return;
  removeFromArchetype(state, record.archetypeKey, record.entityId);
  ensureArchetype(state, newKey, newTypes);
  addToArchetype(state, newKey, record.entityId);
  record.archetypeKey = newKey;
  state.totalMigrations++;
}

// ─── Get / Has Component ────────────────────────────────────────────

function getComponentImpl(
  state: StoreState,
  entityId: string,
  componentType: string,
): unknown | undefined {
  const record = state.entities.get(entityId);
  if (record === undefined) return undefined;
  return record.components.get(componentType);
}

function hasComponentImpl(state: StoreState, entityId: string, componentType: string): boolean {
  const record = state.entities.get(entityId);
  if (record === undefined) return false;
  return record.components.has(componentType);
}

// ─── Entity Archetype Query ─────────────────────────────────────────

function getEntityArchetypeImpl(state: StoreState, entityId: string): ArchetypeId | undefined {
  const record = state.entities.get(entityId);
  if (record === undefined) return undefined;
  const archetype = state.archetypes.get(record.archetypeKey);
  if (archetype === undefined) return undefined;
  return { key: archetype.key, componentTypes: [...archetype.componentTypes] };
}

// ─── Query By Components ────────────────────────────────────────────

function queryByComponentsImpl(
  state: StoreState,
  required: ReadonlyArray<string>,
): ReadonlyArray<ArchetypeQueryResult> {
  const results: ArchetypeQueryResult[] = [];
  for (const archetype of state.archetypes.values()) {
    if (!containsAll(archetype.componentTypes, required)) continue;
    collectMatchingEntities(state, archetype, results);
  }
  return results;
}

function containsAll(types: ReadonlyArray<string>, required: ReadonlyArray<string>): boolean {
  for (const req of required) {
    if (!types.includes(req)) return false;
  }
  return true;
}

function collectMatchingEntities(
  state: StoreState,
  archetype: ArchetypeData,
  results: ArchetypeQueryResult[],
): void {
  for (const entityId of archetype.entitySet) {
    const record = state.entities.get(entityId);
    if (record === undefined) continue;
    results.push({ entityId, components: new Map(record.components) });
  }
}

// ─── Iterate Archetype ──────────────────────────────────────────────

function iterateArchetypeImpl(
  state: StoreState,
  archetypeKey: string,
  callback: ArchetypeIterator,
): number {
  const archetype = state.archetypes.get(archetypeKey);
  if (archetype === undefined) return 0;
  let count = 0;
  for (const entityId of archetype.entitySet) {
    const record = state.entities.get(entityId);
    if (record === undefined) continue;
    callback(entityId, new Map(record.components));
    count++;
  }
  return count;
}

// ─── Archetype Info ─────────────────────────────────────────────────

function getArchetypeInfo(state: StoreState, key: string): Archetype | undefined {
  const archetype = state.archetypes.get(key);
  if (archetype === undefined) return undefined;
  return {
    id: { key: archetype.key, componentTypes: [...archetype.componentTypes] },
    entityCount: archetype.entitySet.size,
    chunkCount: archetype.chunks.length,
  };
}

function getChunksInfo(state: StoreState, key: string): ReadonlyArray<ArchetypeChunk> {
  const archetype = state.archetypes.get(key);
  if (archetype === undefined) return [];
  return archetype.chunks.map((chunk, idx) => ({
    archetypeKey: key,
    chunkIndex: idx,
    entityCount: chunk.entityIds.length,
    capacity: chunk.capacity,
  }));
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: StoreState): ArchetypeStoreStats {
  let totalChunks = 0;
  for (const archetype of state.archetypes.values()) {
    totalChunks += archetype.chunks.length;
  }
  return {
    archetypeCount: state.archetypes.size,
    totalEntities: state.entities.size,
    totalChunks,
    totalMigrations: state.totalMigrations,
    chunkCapacity: state.chunkCapacity,
  };
}
