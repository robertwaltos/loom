/**
 * Entity Query Engine — Multi-component archetype queries.
 *
 * The Loom's ECS needs efficient queries like "find all entities with
 * Position AND Health components in world-7". The Entity Query Engine
 * provides composable queries over the ComponentStore:
 *
 *   - withAll: Entities that have ALL specified component types
 *   - withAny: Entities that have ANY of the specified component types
 *   - without: Exclude entities that have specified component types
 *   - inWorld: Filter to entities in a specific world
 *   - count: Fast count without materializing results
 *
 * The engine operates on snapshots — it reads current state from the
 * ComponentStore and EntityRegistry ports. Results are not cached;
 * each query reflects the current world state.
 *
 * "The Loom sees every thread. The Query Engine finds the pattern."
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface EntityQueryResult {
  readonly entityId: string;
  readonly components: ReadonlyArray<string>;
  readonly worldId: string | null;
}

export interface QueryDescriptor {
  readonly withAll?: ReadonlyArray<string>;
  readonly withAny?: ReadonlyArray<string>;
  readonly without?: ReadonlyArray<string>;
  readonly inWorld?: string;
  readonly limit?: number;
}

export interface QueryStats {
  readonly totalQueries: number;
  readonly totalResults: number;
  readonly averageResultSize: number;
}

// ─── Port Interfaces ────────────────────────────────────────────────

export interface QueryComponentPort {
  has(entityId: string, componentType: string): boolean;
  listComponents(entityId: string): ReadonlyArray<string>;
  findEntitiesWith(componentType: string): ReadonlyArray<string>;
}

export interface QueryEntityPort {
  getAllEntityIds(): ReadonlyArray<string>;
}

export interface QueryWorldPort {
  getEntityWorld(entityId: string): string | null;
}

export interface EntityQueryDeps {
  readonly components: QueryComponentPort;
  readonly entities: QueryEntityPort;
  readonly worlds: QueryWorldPort;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface EntityQueryEngine {
  query(descriptor: QueryDescriptor): ReadonlyArray<EntityQueryResult>;
  count(descriptor: QueryDescriptor): number;
  getStats(): QueryStats;
}

// ─── State ──────────────────────────────────────────────────────────

interface EngineState {
  readonly deps: EntityQueryDeps;
  totalQueries: number;
  totalResults: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createEntityQueryEngine(deps: EntityQueryDeps): EntityQueryEngine {
  const state: EngineState = {
    deps,
    totalQueries: 0,
    totalResults: 0,
  };

  return {
    query: (d) => queryImpl(state, d),
    count: (d) => countImpl(state, d),
    getStats: () => getStatsImpl(state),
  };
}

// ─── Query Execution ────────────────────────────────────────────────

function queryImpl(
  state: EngineState,
  descriptor: QueryDescriptor,
): ReadonlyArray<EntityQueryResult> {
  const candidates = resolveCandidates(state, descriptor);
  const results: EntityQueryResult[] = [];

  for (const entityId of candidates) {
    if (!matchesDescriptor(state, entityId, descriptor)) continue;

    results.push({
      entityId,
      components: state.deps.components.listComponents(entityId),
      worldId: state.deps.worlds.getEntityWorld(entityId),
    });

    if (descriptor.limit !== undefined && results.length >= descriptor.limit) {
      break;
    }
  }

  trackQuery(state, results.length);
  return results;
}

function countImpl(state: EngineState, descriptor: QueryDescriptor): number {
  const candidates = resolveCandidates(state, descriptor);
  let count = 0;

  for (const entityId of candidates) {
    if (matchesDescriptor(state, entityId, descriptor)) {
      count += 1;
    }
  }

  trackQuery(state, count);
  return count;
}

// ─── Candidate Resolution ───────────────────────────────────────────

function resolveCandidates(state: EngineState, descriptor: QueryDescriptor): ReadonlyArray<string> {
  if (hasWithAll(descriptor)) {
    return narrowestWithAll(state, descriptor.withAll as ReadonlyArray<string>);
  }
  if (hasWithAny(descriptor)) {
    return unionWithAny(state, descriptor.withAny as ReadonlyArray<string>);
  }
  return state.deps.entities.getAllEntityIds();
}

function hasWithAll(descriptor: QueryDescriptor): boolean {
  return descriptor.withAll !== undefined && descriptor.withAll.length > 0;
}

function hasWithAny(descriptor: QueryDescriptor): boolean {
  return descriptor.withAny !== undefined && descriptor.withAny.length > 0;
}

function narrowestWithAll(
  state: EngineState,
  componentTypes: ReadonlyArray<string>,
): ReadonlyArray<string> {
  let smallest: ReadonlyArray<string> = [];
  let smallestSize = Infinity;

  for (const ct of componentTypes) {
    const entities = state.deps.components.findEntitiesWith(ct);
    if (entities.length < smallestSize) {
      smallest = entities;
      smallestSize = entities.length;
    }
  }
  return smallest;
}

function unionWithAny(
  state: EngineState,
  componentTypes: ReadonlyArray<string>,
): ReadonlyArray<string> {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const ct of componentTypes) {
    for (const entityId of state.deps.components.findEntitiesWith(ct)) {
      if (!seen.has(entityId)) {
        seen.add(entityId);
        result.push(entityId);
      }
    }
  }
  return result;
}

// ─── Descriptor Matching ────────────────────────────────────────────

function matchesDescriptor(
  state: EngineState,
  entityId: string,
  descriptor: QueryDescriptor,
): boolean {
  if (!matchesWithAll(state, entityId, descriptor)) return false;
  if (!matchesWithAny(state, entityId, descriptor)) return false;
  if (!matchesWithout(state, entityId, descriptor)) return false;
  if (!matchesWorld(state, entityId, descriptor)) return false;
  return true;
}

function matchesWithAll(
  state: EngineState,
  entityId: string,
  descriptor: QueryDescriptor,
): boolean {
  if (!hasWithAll(descriptor)) return true;
  const types = descriptor.withAll as ReadonlyArray<string>;
  return types.every((ct) => state.deps.components.has(entityId, ct));
}

function matchesWithAny(
  state: EngineState,
  entityId: string,
  descriptor: QueryDescriptor,
): boolean {
  if (!hasWithAny(descriptor)) return true;
  const types = descriptor.withAny as ReadonlyArray<string>;
  return types.some((ct) => state.deps.components.has(entityId, ct));
}

function matchesWithout(
  state: EngineState,
  entityId: string,
  descriptor: QueryDescriptor,
): boolean {
  if (descriptor.without === undefined) return true;
  if (descriptor.without.length === 0) return true;
  return !descriptor.without.some((ct) => state.deps.components.has(entityId, ct));
}

function matchesWorld(state: EngineState, entityId: string, descriptor: QueryDescriptor): boolean {
  if (descriptor.inWorld === undefined) return true;
  const world = state.deps.worlds.getEntityWorld(entityId);
  return world === descriptor.inWorld;
}

// ─── Stats ──────────────────────────────────────────────────────────

function trackQuery(state: EngineState, resultCount: number): void {
  state.totalQueries += 1;
  state.totalResults += resultCount;
}

function getStatsImpl(state: EngineState): QueryStats {
  const avg = state.totalQueries > 0 ? state.totalResults / state.totalQueries : 0;
  return {
    totalQueries: state.totalQueries,
    totalResults: state.totalResults,
    averageResultSize: avg,
  };
}
