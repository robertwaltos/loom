/**
 * Corridor Network — Graph of corridor connections with pathfinding.
 *
 * Maintains a weighted directed graph of world nodes connected by
 * corridors. Supports Dijkstra shortest path finding, K-shortest
 * alternate paths (Yen's algorithm), connected component analysis,
 * and reachability queries.
 *
 * Used by the Silfen Weave to plan transit routes across the lattice.
 */

// ── Port Interfaces ─────────────────────────────────────────────

interface NetworkClockPort {
  readonly nowMicroseconds: () => number;
}

interface NetworkIdGeneratorPort {
  readonly next: () => string;
}

// ── Types ────────────────────────────────────────────────────────

interface NetworkNode {
  readonly worldId: string;
  readonly metadata: Readonly<Record<string, string>>;
  readonly addedAt: number;
}

interface NetworkEdge {
  readonly corridorId: string;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly weight: CorridorWeight;
  readonly addedAt: number;
}

interface CorridorWeight {
  readonly distance: number;
  readonly stability: number;
  readonly congestion: number;
}

interface PathRequest {
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly maxHops?: number;
}

interface PathResult {
  readonly path: readonly string[];
  readonly corridorIds: readonly string[];
  readonly totalWeight: number;
  readonly hops: number;
}

interface NetworkDeps {
  readonly clock: NetworkClockPort;
  readonly idGenerator: NetworkIdGeneratorPort;
}

interface NetworkStats {
  readonly totalNodes: number;
  readonly totalEdges: number;
  readonly totalPathQueries: number;
  readonly totalComponents: number;
  readonly averageWeight: number;
}

// ── Constants ────────────────────────────────────────────────────

const MAX_PATH_LENGTH = 20;

const DEFAULT_EDGE_WEIGHT: CorridorWeight = {
  distance: 1.0,
  stability: 1.0,
  congestion: 0,
};

// ── State ────────────────────────────────────────────────────────

interface MutableNode {
  readonly worldId: string;
  readonly metadata: Record<string, string>;
  readonly addedAt: number;
}

interface MutableEdge {
  readonly corridorId: string;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  weight: CorridorWeight;
  readonly addedAt: number;
}

interface NetworkState {
  readonly deps: NetworkDeps;
  readonly nodes: Map<string, MutableNode>;
  readonly adjacency: Map<string, Map<string, MutableEdge>>;
  readonly edgesByCorridor: Map<string, MutableEdge>;
  totalPathQueries: number;
}

// ── Weight Computation ───────────────────────────────────────────

function computeEffectiveWeight(weight: CorridorWeight): number {
  return weight.distance * weight.stability + weight.congestion;
}

// ── Node Operations ──────────────────────────────────────────────

function addNodeImpl(
  state: NetworkState,
  worldId: string,
  metadata: Readonly<Record<string, string>>,
): NetworkNode {
  const existing = state.nodes.get(worldId);
  if (existing !== undefined) return toReadonlyNode(existing);
  const now = state.deps.clock.nowMicroseconds();
  const node: MutableNode = { worldId, metadata: { ...metadata }, addedAt: now };
  state.nodes.set(worldId, node);
  state.adjacency.set(worldId, new Map());
  return toReadonlyNode(node);
}

function removeNodeImpl(state: NetworkState, worldId: string): boolean {
  if (!state.nodes.has(worldId)) return false;
  const outgoing = state.adjacency.get(worldId);
  if (outgoing !== undefined) {
    for (const edge of outgoing.values()) {
      state.edgesByCorridor.delete(edge.corridorId);
    }
  }
  state.adjacency.delete(worldId);
  state.nodes.delete(worldId);
  removeIncomingEdges(state, worldId);
  return true;
}

function removeIncomingEdges(state: NetworkState, worldId: string): void {
  for (const neighbors of state.adjacency.values()) {
    const edge = neighbors.get(worldId);
    if (edge !== undefined) {
      state.edgesByCorridor.delete(edge.corridorId);
      neighbors.delete(worldId);
    }
  }
}

// ── Edge Operations ──────────────────────────────────────────────

function addEdgeImpl(
  state: NetworkState,
  fromWorldId: string,
  toWorldId: string,
  corridorId: string,
  weight: CorridorWeight,
): NetworkEdge | string {
  if (fromWorldId === toWorldId) return 'self_loop_not_allowed';
  ensureNode(state, fromWorldId);
  ensureNode(state, toWorldId);
  const neighbors = state.adjacency.get(fromWorldId);
  if (neighbors === undefined) return 'node_not_found';
  if (neighbors.has(toWorldId)) return 'edge_already_exists';
  if (state.edgesByCorridor.has(corridorId)) return 'corridor_id_taken';
  const now = state.deps.clock.nowMicroseconds();
  const edge: MutableEdge = { corridorId, fromWorldId, toWorldId, weight, addedAt: now };
  neighbors.set(toWorldId, edge);
  state.edgesByCorridor.set(corridorId, edge);
  return toReadonlyEdge(edge);
}

function ensureNode(state: NetworkState, worldId: string): void {
  if (!state.nodes.has(worldId)) {
    const now = state.deps.clock.nowMicroseconds();
    state.nodes.set(worldId, { worldId, metadata: {}, addedAt: now });
    state.adjacency.set(worldId, new Map());
  }
}

function removeEdgeImpl(state: NetworkState, corridorId: string): boolean {
  const edge = state.edgesByCorridor.get(corridorId);
  if (edge === undefined) return false;
  const neighbors = state.adjacency.get(edge.fromWorldId);
  if (neighbors !== undefined) {
    neighbors.delete(edge.toWorldId);
  }
  state.edgesByCorridor.delete(corridorId);
  return true;
}

function updateWeightImpl(
  state: NetworkState,
  corridorId: string,
  newWeight: CorridorWeight,
): NetworkEdge | string {
  const edge = state.edgesByCorridor.get(corridorId);
  if (edge === undefined) return 'corridor_not_found';
  edge.weight = newWeight;
  return toReadonlyEdge(edge);
}

// ── Dijkstra Shortest Path ───────────────────────────────────────

function findShortestPathImpl(state: NetworkState, request: PathRequest): PathResult | string {
  state.totalPathQueries += 1;
  const from = request.fromWorldId;
  const to = request.toWorldId;
  const maxHops = request.maxHops ?? MAX_PATH_LENGTH;
  if (from === to) return { path: [from], corridorIds: [], totalWeight: 0, hops: 0 };
  if (!state.adjacency.has(from)) return 'origin_not_found';
  if (!state.adjacency.has(to)) return 'destination_not_found';
  return dijkstra(state, from, to, maxHops);
}

function dijkstra(
  state: NetworkState,
  from: string,
  to: string,
  maxHops: number,
): PathResult | string {
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const prevEdge = new Map<string, string>();
  const visited = new Set<string>();
  dist.set(from, 0);
  for (let i = 0; i < state.nodes.size; i++) {
    const current = findMinUnvisited(dist, visited);
    if (current === undefined) break;
    if (current === to) return buildPathResult(dist, prev, prevEdge, from, to, maxHops);
    visited.add(current);
    relaxNeighbors(state, dist, prev, prevEdge, visited, current);
  }
  return 'no_path_found';
}

function findMinUnvisited(dist: Map<string, number>, visited: Set<string>): string | undefined {
  let minDist = Infinity;
  let minNode: string | undefined;
  for (const [node, d] of dist) {
    if (!visited.has(node) && d < minDist) {
      minDist = d;
      minNode = node;
    }
  }
  return minNode;
}

function relaxNeighbors(
  state: NetworkState,
  dist: Map<string, number>,
  prev: Map<string, string>,
  prevEdge: Map<string, string>,
  visited: Set<string>,
  current: string,
): void {
  const neighbors = state.adjacency.get(current);
  if (neighbors === undefined) return;
  const currentDist = dist.get(current) ?? Infinity;
  for (const [neighbor, edge] of neighbors) {
    if (visited.has(neighbor)) continue;
    const alt = currentDist + computeEffectiveWeight(edge.weight);
    if (alt < (dist.get(neighbor) ?? Infinity)) {
      dist.set(neighbor, alt);
      prev.set(neighbor, current);
      prevEdge.set(neighbor, edge.corridorId);
    }
  }
}

function buildPathResult(
  dist: Map<string, number>,
  prev: Map<string, string>,
  prevEdge: Map<string, string>,
  from: string,
  to: string,
  maxHops: number,
): PathResult | string {
  const path: string[] = [];
  const corridorIds: string[] = [];
  let current: string | undefined = to;
  while (current !== undefined) {
    path.unshift(current);
    if (current === from) break;
    const edgeId = prevEdge.get(current);
    if (edgeId !== undefined) corridorIds.unshift(edgeId);
    current = prev.get(current);
  }
  if (path[0] !== from) return 'no_path_found';
  if (path.length - 1 > maxHops) return 'path_exceeds_max_hops';
  return {
    path,
    corridorIds,
    totalWeight: dist.get(to) ?? 0,
    hops: path.length - 1,
  };
}

// ── K-Shortest Paths (Yen's Algorithm) ───────────────────────────

function findAlternatePathsImpl(
  state: NetworkState,
  request: PathRequest,
  count: number,
): readonly PathResult[] {
  state.totalPathQueries += 1;
  const maxHops = request.maxHops ?? MAX_PATH_LENGTH;
  const shortest = findShortestPathImpl(state, request);
  if (typeof shortest === 'string') return [];
  if (count <= 1) return [shortest];
  return yenKShortest(state, request.fromWorldId, request.toWorldId, maxHops, count);
}

function yenKShortest(
  state: NetworkState,
  from: string,
  to: string,
  maxHops: number,
  k: number,
): PathResult[] {
  const confirmed: PathResult[] = [];
  const firstResult = dijkstra(state, from, to, maxHops);
  if (typeof firstResult === 'string') return [];
  confirmed.push(firstResult);
  const candidates: PathResult[] = [];
  for (let i = 1; i < k; i++) {
    const prevPath = confirmed[i - 1];
    if (prevPath === undefined) break;
    findSpurPaths(state, from, to, maxHops, prevPath, confirmed, candidates);
    if (candidates.length === 0) break;
    candidates.sort((a, b) => a.totalWeight - b.totalWeight);
    const best = candidates.shift();
    if (best !== undefined) confirmed.push(best);
  }
  return confirmed;
}

function findSpurPaths(
  state: NetworkState,
  from: string,
  to: string,
  maxHops: number,
  prevPath: PathResult,
  confirmed: readonly PathResult[],
  candidates: PathResult[],
): void {
  const pathNodes = prevPath.path;
  for (let j = 0; j < pathNodes.length - 1; j++) {
    const spurNode = pathNodes[j];
    if (spurNode === undefined) continue;
    const rootPath = pathNodes.slice(0, j + 1);
    const blocked = collectBlockedEdges(confirmed, rootPath);
    const spurResult = dijkstraWithBlocked(
      state,
      spurNode,
      to,
      maxHops - j,
      blocked,
      new Set(rootPath.slice(0, -1)),
    );
    if (spurResult === undefined) continue;
    const combined = combinePaths(state, rootPath, spurResult, prevPath);
    if (combined !== undefined && !isDuplicate(confirmed, candidates, combined)) {
      candidates.push(combined);
    }
  }
}

function collectBlockedEdges(
  confirmed: readonly PathResult[],
  rootPath: readonly string[],
): Set<string> {
  const blocked = new Set<string>();
  for (const path of confirmed) {
    if (pathStartsWith(path.path, rootPath)) {
      const nextIdx = rootPath.length - 1;
      const corridorId = path.corridorIds[nextIdx];
      if (corridorId !== undefined) blocked.add(corridorId);
    }
  }
  return blocked;
}

function pathStartsWith(path: readonly string[], prefix: readonly string[]): boolean {
  if (path.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (path[i] !== prefix[i]) return false;
  }
  return true;
}

function dijkstraWithBlocked(
  state: NetworkState,
  from: string,
  to: string,
  maxHops: number,
  blockedCorridors: Set<string>,
  blockedNodes: Set<string>,
): PathResult | undefined {
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const prevEdge = new Map<string, string>();
  const visited = new Set<string>(blockedNodes);
  dist.set(from, 0);
  for (let i = 0; i < state.nodes.size; i++) {
    const current = findMinUnvisited(dist, visited);
    if (current === undefined) break;
    if (current === to) {
      const result = buildPathResult(dist, prev, prevEdge, from, to, maxHops);
      return typeof result === 'string' ? undefined : result;
    }
    visited.add(current);
    relaxNeighborsBlocked(state, dist, prev, prevEdge, visited, current, blockedCorridors);
  }
  return undefined;
}

function relaxNeighborsBlocked(
  state: NetworkState,
  dist: Map<string, number>,
  prev: Map<string, string>,
  prevEdge: Map<string, string>,
  visited: Set<string>,
  current: string,
  blocked: Set<string>,
): void {
  const neighbors = state.adjacency.get(current);
  if (neighbors === undefined) return;
  const currentDist = dist.get(current) ?? Infinity;
  for (const [neighbor, edge] of neighbors) {
    if (visited.has(neighbor)) continue;
    if (blocked.has(edge.corridorId)) continue;
    const alt = currentDist + computeEffectiveWeight(edge.weight);
    if (alt < (dist.get(neighbor) ?? Infinity)) {
      dist.set(neighbor, alt);
      prev.set(neighbor, current);
      prevEdge.set(neighbor, edge.corridorId);
    }
  }
}

function combinePaths(
  state: NetworkState,
  rootPath: readonly string[],
  spurResult: PathResult,
  _prevPath: PathResult,
): PathResult | undefined {
  const fullPath = [...rootPath.slice(0, -1), ...spurResult.path];
  const corridorIds: string[] = [];
  let totalWeight = 0;
  for (let i = 0; i < fullPath.length - 1; i++) {
    const from = fullPath[i];
    const to = fullPath[i + 1];
    if (from === undefined || to === undefined) return undefined;
    const edge = findEdgeBetween(state, from, to);
    if (edge === undefined) return undefined;
    corridorIds.push(edge.corridorId);
    totalWeight += computeEffectiveWeight(edge.weight);
  }
  return { path: fullPath, corridorIds, totalWeight, hops: fullPath.length - 1 };
}

function findEdgeBetween(state: NetworkState, from: string, to: string): MutableEdge | undefined {
  return state.adjacency.get(from)?.get(to);
}

function isDuplicate(
  confirmed: readonly PathResult[],
  candidates: readonly PathResult[],
  candidate: PathResult,
): boolean {
  const key = candidate.path.join(',');
  for (const p of confirmed) {
    if (p.path.join(',') === key) return true;
  }
  for (const p of candidates) {
    if (p.path.join(',') === key) return true;
  }
  return false;
}

// ── Neighbor Queries ─────────────────────────────────────────────

function getNeighborsImpl(state: NetworkState, worldId: string): readonly NetworkNode[] {
  const neighbors = state.adjacency.get(worldId);
  if (neighbors === undefined) return [];
  const result: NetworkNode[] = [];
  for (const neighborId of neighbors.keys()) {
    const node = state.nodes.get(neighborId);
    if (node !== undefined) result.push(toReadonlyNode(node));
  }
  return result;
}

// ── Connected Components ─────────────────────────────────────────

function getConnectedComponentsImpl(state: NetworkState): readonly (readonly string[])[] {
  const visited = new Set<string>();
  const components: string[][] = [];
  for (const worldId of state.nodes.keys()) {
    if (visited.has(worldId)) continue;
    const component = bfsUndirected(state, worldId, visited);
    components.push(component);
  }
  return components;
}

function bfsUndirected(state: NetworkState, start: string, visited: Set<string>): string[] {
  const component: string[] = [];
  const queue: string[] = [start];
  visited.add(start);
  while (queue.length > 0) {
    const current = queue.shift() ?? '';
    component.push(current);
    addUndirectedNeighbors(state, current, visited, queue);
  }
  return component;
}

function addUndirectedNeighbors(
  state: NetworkState,
  current: string,
  visited: Set<string>,
  queue: string[],
): void {
  const outgoing = state.adjacency.get(current);
  if (outgoing !== undefined) {
    for (const neighbor of outgoing.keys()) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  for (const [nodeId, neighbors] of state.adjacency) {
    if (nodeId === current) continue;
    if (neighbors.has(current) && !visited.has(nodeId)) {
      visited.add(nodeId);
      queue.push(nodeId);
    }
  }
}

// ── Reachability ─────────────────────────────────────────────────

function isReachableImpl(state: NetworkState, fromWorldId: string, toWorldId: string): boolean {
  if (fromWorldId === toWorldId) return true;
  if (!state.adjacency.has(fromWorldId) || !state.adjacency.has(toWorldId)) return false;
  const visited = new Set<string>();
  const queue = [fromWorldId];
  visited.add(fromWorldId);
  while (queue.length > 0) {
    const current = queue.shift() ?? '';
    const neighbors = state.adjacency.get(current);
    if (neighbors === undefined) continue;
    for (const neighbor of neighbors.keys()) {
      if (neighbor === toWorldId) return true;
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return false;
}

// ── Stats ────────────────────────────────────────────────────────

function getStatsImpl(state: NetworkState): NetworkStats {
  const totalEdges = state.edgesByCorridor.size;
  let totalWeight = 0;
  for (const edge of state.edgesByCorridor.values()) {
    totalWeight += computeEffectiveWeight(edge.weight);
  }
  const components = getConnectedComponentsImpl(state);
  return {
    totalNodes: state.nodes.size,
    totalEdges,
    totalPathQueries: state.totalPathQueries,
    totalComponents: components.length,
    averageWeight: totalEdges > 0 ? totalWeight / totalEdges : 0,
  };
}

// ── Conversion Helpers ───────────────────────────────────────────

function toReadonlyNode(node: MutableNode): NetworkNode {
  return { worldId: node.worldId, metadata: { ...node.metadata }, addedAt: node.addedAt };
}

function toReadonlyEdge(edge: MutableEdge): NetworkEdge {
  return {
    corridorId: edge.corridorId,
    fromWorldId: edge.fromWorldId,
    toWorldId: edge.toWorldId,
    weight: { ...edge.weight },
    addedAt: edge.addedAt,
  };
}

// ── Public API Interface ─────────────────────────────────────────

interface CorridorNetworkService {
  readonly addNode: (worldId: string, metadata: Readonly<Record<string, string>>) => NetworkNode;
  readonly removeNode: (worldId: string) => boolean;
  readonly addEdge: (
    fromWorldId: string,
    toWorldId: string,
    corridorId: string,
    weight: CorridorWeight,
  ) => NetworkEdge | string;
  readonly removeEdge: (corridorId: string) => boolean;
  readonly updateWeight: (corridorId: string, newWeight: CorridorWeight) => NetworkEdge | string;
  readonly findShortestPath: (request: PathRequest) => PathResult | string;
  readonly findAlternatePaths: (request: PathRequest, count: number) => readonly PathResult[];
  readonly getNeighbors: (worldId: string) => readonly NetworkNode[];
  readonly getConnectedComponents: () => readonly (readonly string[])[];
  readonly isReachable: (fromWorldId: string, toWorldId: string) => boolean;
  readonly getStats: () => NetworkStats;
}

// ── Factory ──────────────────────────────────────────────────────

function createCorridorNetworkService(deps: NetworkDeps): CorridorNetworkService {
  const state: NetworkState = {
    deps,
    nodes: new Map(),
    adjacency: new Map(),
    edgesByCorridor: new Map(),
    totalPathQueries: 0,
  };

  return {
    addNode: (id, meta) => addNodeImpl(state, id, meta),
    removeNode: (id) => removeNodeImpl(state, id),
    addEdge: (from, to, cId, w) => addEdgeImpl(state, from, to, cId, w),
    removeEdge: (cId) => removeEdgeImpl(state, cId),
    updateWeight: (cId, w) => updateWeightImpl(state, cId, w),
    findShortestPath: (r) => findShortestPathImpl(state, r),
    findAlternatePaths: (r, c) => findAlternatePathsImpl(state, r, c),
    getNeighbors: (id) => getNeighborsImpl(state, id),
    getConnectedComponents: () => getConnectedComponentsImpl(state),
    isReachable: (from, to) => isReachableImpl(state, from, to),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export {
  createCorridorNetworkService,
  computeEffectiveWeight,
  MAX_PATH_LENGTH,
  DEFAULT_EDGE_WEIGHT,
};

export type {
  CorridorNetworkService,
  NetworkDeps,
  NetworkClockPort,
  NetworkIdGeneratorPort,
  NetworkNode,
  NetworkEdge,
  CorridorWeight,
  PathRequest,
  PathResult,
  NetworkStats,
};
