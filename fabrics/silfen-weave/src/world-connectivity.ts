/**
 * world-connectivity.ts — World connectivity graph.
 *
 * Maintains a directed graph of connections between worlds
 * (lattice nodes). Supports adding/removing edges, reachability
 * queries, shortest path finding, and connected component analysis.
 * Used by the Silfen Weave to determine which worlds are accessible
 * from a given origin.
 */

// ── Types ────────────────────────────────────────────────────────

interface WorldEdge {
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly weight: number;
  readonly metadata: Readonly<Record<string, string>>;
}

interface AddEdgeParams {
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly weight?: number;
  readonly bidirectional?: boolean;
  readonly metadata?: Readonly<Record<string, string>>;
}

interface PathResult {
  readonly path: readonly string[];
  readonly totalWeight: number;
  readonly hops: number;
}

interface ConnectivityStats {
  readonly totalNodes: number;
  readonly totalEdges: number;
  readonly totalPathQueries: number;
}

// ── Public API ───────────────────────────────────────────────────

interface WorldConnectivityGraph {
  readonly addNode: (worldId: string) => boolean;
  readonly removeNode: (worldId: string) => boolean;
  readonly addEdge: (params: AddEdgeParams) => boolean;
  readonly removeEdge: (from: string, to: string) => boolean;
  readonly getNeighbors: (worldId: string) => readonly string[];
  readonly hasEdge: (from: string, to: string) => boolean;
  readonly isReachable: (from: string, to: string) => boolean;
  readonly findShortestPath: (from: string, to: string) => PathResult | undefined;
  readonly getEdge: (from: string, to: string) => WorldEdge | undefined;
  readonly getNodeCount: () => number;
  readonly getStats: () => ConnectivityStats;
}

// ── State ────────────────────────────────────────────────────────

interface GraphState {
  readonly adjacency: Map<string, Map<string, EdgeData>>;
  totalEdges: number;
  totalPathQueries: number;
}

interface EdgeData {
  readonly weight: number;
  readonly metadata: Readonly<Record<string, string>>;
}

// ── Operations ───────────────────────────────────────────────────

function addNodeImpl(state: GraphState, worldId: string): boolean {
  if (state.adjacency.has(worldId)) return false;
  state.adjacency.set(worldId, new Map());
  return true;
}

function removeNodeImpl(state: GraphState, worldId: string): boolean {
  const edges = state.adjacency.get(worldId);
  if (!edges) return false;
  state.totalEdges -= edges.size;
  state.adjacency.delete(worldId);
  for (const neighbors of state.adjacency.values()) {
    if (neighbors.has(worldId)) {
      neighbors.delete(worldId);
      state.totalEdges--;
    }
  }
  return true;
}

function addEdgeImpl(state: GraphState, params: AddEdgeParams): boolean {
  ensureNode(state, params.fromWorldId);
  ensureNode(state, params.toWorldId);
  const from = state.adjacency.get(params.fromWorldId);
  if (!from || from.has(params.toWorldId)) return false;
  const edge: EdgeData = {
    weight: params.weight ?? 1,
    metadata: params.metadata ?? {},
  };
  from.set(params.toWorldId, edge);
  state.totalEdges++;
  if (params.bidirectional === true) {
    const to = state.adjacency.get(params.toWorldId);
    if (to && !to.has(params.fromWorldId)) {
      to.set(params.fromWorldId, edge);
      state.totalEdges++;
    }
  }
  return true;
}

function ensureNode(state: GraphState, worldId: string): void {
  if (!state.adjacency.has(worldId)) {
    state.adjacency.set(worldId, new Map());
  }
}

function removeEdgeImpl(state: GraphState, from: string, to: string): boolean {
  const edges = state.adjacency.get(from);
  if (!edges || !edges.has(to)) return false;
  edges.delete(to);
  state.totalEdges--;
  return true;
}

function getNeighborsImpl(state: GraphState, worldId: string): readonly string[] {
  const edges = state.adjacency.get(worldId);
  return edges ? [...edges.keys()] : [];
}

function isReachableImpl(state: GraphState, from: string, to: string): boolean {
  if (from === to) return true;
  if (!state.adjacency.has(from) || !state.adjacency.has(to)) {
    return false;
  }
  const visited = new Set<string>();
  const queue = [from];
  visited.add(from);
  while (queue.length > 0) {
    const current = queue.shift() ?? '';
    const neighbors = state.adjacency.get(current);
    if (!neighbors) continue;
    for (const neighbor of neighbors.keys()) {
      if (neighbor === to) return true;
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return false;
}

function findShortestPathImpl(state: GraphState, from: string, to: string): PathResult | undefined {
  state.totalPathQueries++;
  if (from === to) return { path: [from], totalWeight: 0, hops: 0 };
  if (!state.adjacency.has(from) || !state.adjacency.has(to)) {
    return undefined;
  }
  return dijkstra(state, from, to);
}

function dijkstra(state: GraphState, from: string, to: string): PathResult | undefined {
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const unvisited = new Set<string>(state.adjacency.keys());
  dist.set(from, 0);
  while (unvisited.size > 0) {
    const current = findMinDist(dist, unvisited);
    if (current === undefined) break;
    if (current === to) return buildPath(dist, prev, from, to);
    unvisited.delete(current);
    visitNeighbors(state, dist, prev, unvisited, current);
  }
  return undefined;
}

function findMinDist(dist: Map<string, number>, unvisited: Set<string>): string | undefined {
  let minDist = Infinity;
  let minNode: string | undefined;
  for (const node of unvisited) {
    const d = dist.get(node) ?? Infinity;
    if (d < minDist) {
      minDist = d;
      minNode = node;
    }
  }
  return minNode;
}

function visitNeighbors(
  state: GraphState,
  dist: Map<string, number>,
  prev: Map<string, string>,
  unvisited: Set<string>,
  current: string,
): void {
  const edges = state.adjacency.get(current);
  if (!edges) return;
  const currentDist = dist.get(current) ?? Infinity;
  for (const [neighbor, edge] of edges) {
    if (!unvisited.has(neighbor)) continue;
    const alt = currentDist + edge.weight;
    if (alt < (dist.get(neighbor) ?? Infinity)) {
      dist.set(neighbor, alt);
      prev.set(neighbor, current);
    }
  }
}

function buildPath(
  dist: Map<string, number>,
  prev: Map<string, string>,
  from: string,
  to: string,
): PathResult {
  const path: string[] = [];
  let current: string | undefined = to;
  while (current !== undefined) {
    path.unshift(current);
    if (current === from) break;
    current = prev.get(current);
  }
  return {
    path,
    totalWeight: dist.get(to) ?? 0,
    hops: path.length - 1,
  };
}

function getEdgeImpl(state: GraphState, from: string, to: string): WorldEdge | undefined {
  const edges = state.adjacency.get(from);
  const data = edges?.get(to);
  if (!data) return undefined;
  return { fromWorldId: from, toWorldId: to, ...data };
}

function getStatsImpl(state: GraphState): ConnectivityStats {
  return {
    totalNodes: state.adjacency.size,
    totalEdges: state.totalEdges,
    totalPathQueries: state.totalPathQueries,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createWorldConnectivityGraph(): WorldConnectivityGraph {
  const state: GraphState = {
    adjacency: new Map(),
    totalEdges: 0,
    totalPathQueries: 0,
  };
  return {
    addNode: (id) => addNodeImpl(state, id),
    removeNode: (id) => removeNodeImpl(state, id),
    addEdge: (p) => addEdgeImpl(state, p),
    removeEdge: (f, t) => removeEdgeImpl(state, f, t),
    getNeighbors: (id) => getNeighborsImpl(state, id),
    hasEdge: (f, t) => state.adjacency.get(f)?.has(t) === true,
    isReachable: (f, t) => isReachableImpl(state, f, t),
    findShortestPath: (f, t) => findShortestPathImpl(state, f, t),
    getEdge: (f, t) => getEdgeImpl(state, f, t),
    getNodeCount: () => state.adjacency.size,
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createWorldConnectivityGraph };
export type { WorldConnectivityGraph, WorldEdge, AddEdgeParams, PathResult, ConnectivityStats };
