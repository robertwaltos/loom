/**
 * system-dependency.ts — System dependency graph.
 *
 * Tracks dependencies between registered ECS systems to determine
 * valid execution order. Detects cycles and computes topological
 * sort for system scheduling.
 */

// ── Types ────────────────────────────────────────────────────────

interface SystemNode {
  readonly systemId: string;
  readonly dependsOn: readonly string[];
  readonly registeredAt: number;
}

interface RegisterSystemParams {
  readonly systemId: string;
  readonly dependsOn?: readonly string[];
}

interface DependencyStats {
  readonly totalSystems: number;
  readonly totalEdges: number;
  readonly maxDepth: number;
}

interface SystemDependencyGraph {
  readonly register: (params: RegisterSystemParams) => boolean;
  readonly unregister: (systemId: string) => boolean;
  readonly getDependencies: (systemId: string) => readonly string[];
  readonly getDependents: (systemId: string) => readonly string[];
  readonly getExecutionOrder: () => readonly string[] | undefined;
  readonly hasCycle: () => boolean;
  readonly getNode: (systemId: string) => SystemNode | undefined;
  readonly getStats: () => DependencyStats;
}

// ── Ports ────────────────────────────────────────────────────────

interface DependencyClock {
  readonly nowMicroseconds: () => number;
}

interface SystemDependencyDeps {
  readonly clock: DependencyClock;
}

// ── State ────────────────────────────────────────────────────────

interface DepState {
  readonly deps: SystemDependencyDeps;
  readonly nodes: Map<string, SystemNode>;
  readonly edges: Map<string, string[]>;
  readonly reverseEdges: Map<string, string[]>;
}

// ── Helpers ──────────────────────────────────────────────────────

function addEdge(edges: Map<string, string[]>, from: string, to: string): void {
  const list = edges.get(from);
  if (list) {
    list.push(to);
  } else {
    edges.set(from, [to]);
  }
}

function removeEdges(edges: Map<string, string[]>, id: string): void {
  edges.delete(id);
  for (const list of edges.values()) {
    const idx = list.indexOf(id);
    if (idx >= 0) list.splice(idx, 1);
  }
}

function topologicalSort(state: DepState): string[] | undefined {
  const depCount = new Map<string, number>();
  for (const id of state.nodes.keys()) {
    const deps = state.edges.get(id) ?? [];
    depCount.set(id, deps.length);
  }
  const queue: string[] = [];
  for (const [id, count] of depCount) {
    if (count === 0) queue.push(id);
  }
  const result: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    result.push(current);
    const dependents = state.reverseEdges.get(current) ?? [];
    for (const dep of dependents) {
      const newCount = (depCount.get(dep) ?? 1) - 1;
      depCount.set(dep, newCount);
      if (newCount === 0) queue.push(dep);
    }
  }
  if (result.length !== state.nodes.size) return undefined;
  return result;
}

function computeMaxDepth(state: DepState): number {
  let max = 0;
  for (const id of state.nodes.keys()) {
    const depth = computeNodeDepth(state, id, new Set());
    if (depth > max) max = depth;
  }
  return max;
}

function computeNodeDepth(state: DepState, id: string, visited: Set<string>): number {
  if (visited.has(id)) return 0;
  visited.add(id);
  const deps = state.edges.get(id) ?? [];
  let max = 0;
  for (const dep of deps) {
    const d = computeNodeDepth(state, dep, visited) + 1;
    if (d > max) max = d;
  }
  return max;
}

// ── Operations ───────────────────────────────────────────────────

function registerImpl(state: DepState, params: RegisterSystemParams): boolean {
  if (state.nodes.has(params.systemId)) return false;
  const node: SystemNode = {
    systemId: params.systemId,
    dependsOn: params.dependsOn ? [...params.dependsOn] : [],
    registeredAt: state.deps.clock.nowMicroseconds(),
  };
  state.nodes.set(params.systemId, node);
  for (const dep of node.dependsOn) {
    addEdge(state.edges, params.systemId, dep);
    addEdge(state.reverseEdges, dep, params.systemId);
  }
  return true;
}

function unregisterImpl(state: DepState, systemId: string): boolean {
  if (!state.nodes.has(systemId)) return false;
  state.nodes.delete(systemId);
  removeEdges(state.edges, systemId);
  removeEdges(state.reverseEdges, systemId);
  return true;
}

function countEdges(state: DepState): number {
  let total = 0;
  for (const list of state.edges.values()) {
    total += list.length;
  }
  return total;
}

function getStatsImpl(state: DepState): DependencyStats {
  return {
    totalSystems: state.nodes.size,
    totalEdges: countEdges(state),
    maxDepth: computeMaxDepth(state),
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createSystemDependencyGraph(deps: SystemDependencyDeps): SystemDependencyGraph {
  const state: DepState = {
    deps,
    nodes: new Map(),
    edges: new Map(),
    reverseEdges: new Map(),
  };
  return {
    register: (p) => registerImpl(state, p),
    unregister: (id) => unregisterImpl(state, id),
    getDependencies: (id) => [...(state.edges.get(id) ?? [])],
    getDependents: (id) => [...(state.reverseEdges.get(id) ?? [])],
    getExecutionOrder: () => topologicalSort(state),
    hasCycle: () => topologicalSort(state) === undefined,
    getNode: (id) => state.nodes.get(id),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createSystemDependencyGraph };
export type {
  SystemDependencyGraph,
  SystemDependencyDeps,
  SystemNode,
  RegisterSystemParams,
  DependencyStats,
};
