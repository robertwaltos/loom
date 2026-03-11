/**
 * Dependency Graph — Track service/module dependencies and detect cycles.
 *
 * Services are registered as nodes. Directed dependency edges connect them.
 * Cycle detection uses DFS before any edge is added so illegal states are
 * rejected up front. Transitive dependencies are computed via BFS. Health
 * state is tracked per node.
 *
 * "Every thread depends on the loom. Map the loom, find the breaks."
 *
 * Fabric: inspector
 * Thread tier: 1
 */

// ─── Port Interfaces ─────────────────────────────────────────────────────────

interface DependencyGraphClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface DependencyGraphIdGenPort {
  readonly next: () => string;
}

interface DependencyGraphLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type ServiceId = string;
export type DependencyId = string;

export type GraphError =
  | 'service-not-found'
  | 'dependency-not-found'
  | 'circular-dependency'
  | 'already-exists'
  | 'self-dependency';

export type ServiceHealth = 'HEALTHY' | 'DEGRADED' | 'DOWN';

export interface ServiceNode {
  readonly serviceId: ServiceId;
  readonly name: string;
  readonly version: string;
  health: ServiceHealth;
  readonly registeredAt: bigint;
}

export interface Dependency {
  readonly dependencyId: DependencyId;
  readonly fromServiceId: ServiceId;
  readonly toServiceId: ServiceId;
  readonly required: boolean;
  readonly addedAt: bigint;
}

export interface DependencyChain {
  readonly path: ReadonlyArray<ServiceId>;
  readonly length: number;
}

export interface GraphStats {
  readonly totalServices: number;
  readonly totalDependencies: number;
  readonly circularDependencies: number;
  readonly avgDependenciesPerService: number;
}

// ─── System Interface ─────────────────────────────────────────────────────────

export interface DependencyGraphSystem {
  registerService(serviceId: ServiceId, name: string, version: string): ServiceNode | GraphError;
  addDependency(
    fromServiceId: ServiceId,
    toServiceId: ServiceId,
    required: boolean,
  ): Dependency | GraphError;
  removeDependency(
    dependencyId: DependencyId,
  ): { success: true } | { success: false; error: GraphError };
  updateHealth(
    serviceId: ServiceId,
    health: ServiceHealth,
  ): { success: true } | { success: false; error: GraphError };
  detectCycles(): ReadonlyArray<DependencyChain>;
  getDependencies(serviceId: ServiceId): ReadonlyArray<Dependency>;
  getDependents(serviceId: ServiceId): ReadonlyArray<Dependency>;
  getTransitiveDependencies(serviceId: ServiceId): ReadonlyArray<ServiceId>;
  getService(serviceId: ServiceId): ServiceNode | undefined;
  getStats(): GraphStats;
}

// ─── Deps ────────────────────────────────────────────────────────────────────

export interface DependencyGraphSystemDeps {
  readonly clock: DependencyGraphClockPort;
  readonly idGen: DependencyGraphIdGenPort;
  readonly logger: DependencyGraphLoggerPort;
}

// ─── State ───────────────────────────────────────────────────────────────────

interface GraphState {
  readonly services: Map<ServiceId, ServiceNode>;
  readonly dependencies: Map<DependencyId, Dependency>;
  readonly pairIndex: Map<string, DependencyId>;
  readonly deps: DependencyGraphSystemDeps;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createDependencyGraphSystem(
  deps: DependencyGraphSystemDeps,
): DependencyGraphSystem {
  const state: GraphState = {
    services: new Map(),
    dependencies: new Map(),
    pairIndex: new Map(),
    deps,
  };

  return {
    registerService: (serviceId, name, version) =>
      registerServiceImpl(state, serviceId, name, version),
    addDependency: (from, to, required) => addDependencyImpl(state, from, to, required),
    removeDependency: (depId) => removeDependencyImpl(state, depId),
    updateHealth: (serviceId, health) => updateHealthImpl(state, serviceId, health),
    detectCycles: () => detectCyclesImpl(state),
    getDependencies: (serviceId) => getDependenciesImpl(state, serviceId),
    getDependents: (serviceId) => getDependentsImpl(state, serviceId),
    getTransitiveDependencies: (serviceId) => getTransitiveDepsImpl(state, serviceId),
    getService: (serviceId) => state.services.get(serviceId),
    getStats: () => getStatsImpl(state),
  };
}

// ─── Register Service ─────────────────────────────────────────────────────────

function registerServiceImpl(
  state: GraphState,
  serviceId: ServiceId,
  name: string,
  version: string,
): ServiceNode | GraphError {
  if (state.services.has(serviceId)) return 'already-exists';
  const node: ServiceNode = {
    serviceId,
    name,
    version,
    health: 'HEALTHY',
    registeredAt: state.deps.clock.nowMicroseconds(),
  };
  state.services.set(serviceId, node);
  state.deps.logger.info('service-registered', { serviceId, name, version });
  return node;
}

// ─── Add Dependency ───────────────────────────────────────────────────────────

function addDependencyImpl(
  state: GraphState,
  fromServiceId: ServiceId,
  toServiceId: ServiceId,
  required: boolean,
): Dependency | GraphError {
  if (fromServiceId === toServiceId) return 'self-dependency';
  if (!state.services.has(fromServiceId)) return 'service-not-found';
  if (!state.services.has(toServiceId)) return 'service-not-found';

  const pairKey = depPairKey(fromServiceId, toServiceId);
  if (state.pairIndex.has(pairKey)) return 'already-exists';

  if (wouldCreateCycle(state, fromServiceId, toServiceId)) return 'circular-dependency';

  const dependencyId = state.deps.idGen.next();
  const dep: Dependency = {
    dependencyId,
    fromServiceId,
    toServiceId,
    required,
    addedAt: state.deps.clock.nowMicroseconds(),
  };
  state.dependencies.set(dependencyId, dep);
  state.pairIndex.set(pairKey, dependencyId);
  state.deps.logger.info('dependency-added', { dependencyId, fromServiceId, toServiceId });
  return dep;
}

function wouldCreateCycle(
  state: GraphState,
  fromServiceId: ServiceId,
  toServiceId: ServiceId,
): boolean {
  // If toServiceId can already reach fromServiceId, adding this edge creates a cycle
  const reachable = bfsReachable(state, toServiceId);
  return reachable.has(fromServiceId);
}

// ─── Remove Dependency ────────────────────────────────────────────────────────

function removeDependencyImpl(
  state: GraphState,
  dependencyId: DependencyId,
): { success: true } | { success: false; error: GraphError } {
  const dep = state.dependencies.get(dependencyId);
  if (dep === undefined) return { success: false, error: 'dependency-not-found' };
  state.dependencies.delete(dependencyId);
  state.pairIndex.delete(depPairKey(dep.fromServiceId, dep.toServiceId));
  return { success: true };
}

// ─── Update Health ────────────────────────────────────────────────────────────

function updateHealthImpl(
  state: GraphState,
  serviceId: ServiceId,
  health: ServiceHealth,
): { success: true } | { success: false; error: GraphError } {
  const service = state.services.get(serviceId);
  if (service === undefined) return { success: false, error: 'service-not-found' };
  (service as { health: ServiceHealth }).health = health;
  return { success: true };
}

// ─── Detect Cycles ────────────────────────────────────────────────────────────

function detectCyclesImpl(state: GraphState): ReadonlyArray<DependencyChain> {
  const cycles: DependencyChain[] = [];
  const visited = new Set<ServiceId>();
  const inStack = new Set<ServiceId>();
  const stack: ServiceId[] = [];

  for (const serviceId of state.services.keys()) {
    if (!visited.has(serviceId)) {
      dfsCycleDetect(state, serviceId, visited, inStack, stack, cycles);
    }
  }

  return cycles;
}

function dfsCycleDetect(
  state: GraphState,
  node: ServiceId,
  visited: Set<ServiceId>,
  inStack: Set<ServiceId>,
  stack: ServiceId[],
  cycles: DependencyChain[],
): void {
  visited.add(node);
  inStack.add(node);
  stack.push(node);

  for (const dep of state.dependencies.values()) {
    if (dep.fromServiceId !== node) continue;
    const neighbor = dep.toServiceId;
    if (!visited.has(neighbor)) {
      dfsCycleDetect(state, neighbor, visited, inStack, stack, cycles);
    } else if (inStack.has(neighbor)) {
      const cycleStart = stack.indexOf(neighbor);
      const cyclePath = stack.slice(cycleStart);
      cycles.push({ path: [...cyclePath, neighbor], length: cyclePath.length + 1 });
    }
  }

  stack.pop();
  inStack.delete(node);
}

// ─── Get Dependencies ─────────────────────────────────────────────────────────

function getDependenciesImpl(state: GraphState, serviceId: ServiceId): ReadonlyArray<Dependency> {
  const result: Dependency[] = [];
  for (const dep of state.dependencies.values()) {
    if (dep.fromServiceId === serviceId) result.push(dep);
  }
  return result;
}

// ─── Get Dependents ───────────────────────────────────────────────────────────

function getDependentsImpl(state: GraphState, serviceId: ServiceId): ReadonlyArray<Dependency> {
  const result: Dependency[] = [];
  for (const dep of state.dependencies.values()) {
    if (dep.toServiceId === serviceId) result.push(dep);
  }
  return result;
}

// ─── Transitive Dependencies ──────────────────────────────────────────────────

function getTransitiveDepsImpl(state: GraphState, serviceId: ServiceId): ReadonlyArray<ServiceId> {
  const reachable = bfsReachable(state, serviceId);
  reachable.delete(serviceId);
  return [...reachable];
}

function bfsReachable(state: GraphState, startId: ServiceId): Set<ServiceId> {
  const visited = new Set<ServiceId>([startId]);
  const queue: ServiceId[] = [startId];

  while (queue.length > 0) {
    const current = queue.shift() as ServiceId;
    for (const dep of state.dependencies.values()) {
      if (dep.fromServiceId !== current) continue;
      if (!visited.has(dep.toServiceId)) {
        visited.add(dep.toServiceId);
        queue.push(dep.toServiceId);
      }
    }
  }

  return visited;
}

// ─── Stats ───────────────────────────────────────────────────────────────────

function getStatsImpl(state: GraphState): GraphStats {
  const totalServices = state.services.size;
  const totalDependencies = state.dependencies.size;
  const circularDependencies = detectCyclesImpl(state).length;
  const avgDependenciesPerService = totalServices === 0 ? 0 : totalDependencies / totalServices;

  return {
    totalServices,
    totalDependencies,
    circularDependencies,
    avgDependenciesPerService,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function depPairKey(fromServiceId: ServiceId, toServiceId: ServiceId): string {
  return fromServiceId + '->' + toServiceId;
}
