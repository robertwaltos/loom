/**
 * navigation-graph.ts — World navigation graph for shortest-path routing.
 *
 * Maintains a directed/bidirectional weighted graph of world nodes and
 * portal edges. Dijkstra's algorithm finds least-cost paths through
 * active edges only. BFS provides full reachability sets for a given node.
 */

// ── Ports ────────────────────────────────────────────────────────

export interface NavClock {
  now(): bigint;
}

export interface NavIdGenerator {
  generate(): string;
}

export interface NavLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// ── Types ────────────────────────────────────────────────────────

export type NodeId = string;
export type EdgeId = string;

export type NavigationError = 'node-not-found' | 'edge-not-found' | 'no-path' | 'already-exists';

export interface NavNode {
  readonly nodeId: NodeId;
  readonly label: string;
  readonly addedAt: bigint;
}

export interface NavEdge {
  readonly edgeId: EdgeId;
  readonly fromNodeId: NodeId;
  readonly toNodeId: NodeId;
  readonly weight: number;
  readonly bidirectional: boolean;
  active: boolean;
}

export interface PathResult {
  readonly path: ReadonlyArray<NodeId>;
  readonly totalWeight: number;
  readonly hopCount: number;
}

export interface ConnectivityReport {
  readonly totalNodes: number;
  readonly totalEdges: number;
  readonly activeEdges: number;
  readonly reachableFrom: (nodeId: NodeId) => ReadonlyArray<NodeId>;
}

export interface NavigationGraphSystem {
  readonly addNode: (nodeId: NodeId, label: string) => NavNode | NavigationError;
  readonly addEdge: (
    fromNodeId: NodeId,
    toNodeId: NodeId,
    weight: number,
    bidirectional: boolean,
  ) => NavEdge | NavigationError;
  readonly removeEdge: (
    edgeId: EdgeId,
  ) => { success: true } | { success: false; error: NavigationError };
  readonly deactivateEdge: (
    edgeId: EdgeId,
  ) => { success: true } | { success: false; error: NavigationError };
  readonly findPath: (fromNodeId: NodeId, toNodeId: NodeId) => PathResult | NavigationError;
  readonly getNode: (nodeId: NodeId) => NavNode | undefined;
  readonly getEdge: (edgeId: EdgeId) => NavEdge | undefined;
  readonly listNodes: () => ReadonlyArray<NavNode>;
  readonly listEdges: (active?: boolean) => ReadonlyArray<NavEdge>;
  readonly getConnectivityReport: () => ConnectivityReport;
}

// ── State ────────────────────────────────────────────────────────

interface NavGraphState {
  readonly nodes: Map<NodeId, NavNode>;
  readonly edges: Map<EdgeId, NavEdge>;
  readonly clock: NavClock;
  readonly idGen: NavIdGenerator;
  readonly logger: NavLogger;
}

// ── Dijkstra helpers ─────────────────────────────────────────────

function ensureList(
  adj: Map<NodeId, Array<{ to: NodeId; weight: number }>>,
  key: NodeId,
): Array<{ to: NodeId; weight: number }> {
  const existing = adj.get(key);
  if (existing !== undefined) return existing;
  const list: Array<{ to: NodeId; weight: number }> = [];
  adj.set(key, list);
  return list;
}

function buildAdjacency(
  edges: Map<EdgeId, NavEdge>,
): Map<NodeId, Array<{ to: NodeId; weight: number }>> {
  const adj = new Map<NodeId, Array<{ to: NodeId; weight: number }>>();
  for (const edge of edges.values()) {
    if (!edge.active) continue;
    ensureList(adj, edge.fromNodeId).push({ to: edge.toNodeId, weight: edge.weight });
    if (edge.bidirectional) {
      ensureList(adj, edge.toNodeId).push({ to: edge.fromNodeId, weight: edge.weight });
    }
  }
  return adj;
}

function dijkstra(
  adj: Map<NodeId, Array<{ to: NodeId; weight: number }>>,
  start: NodeId,
  end: NodeId,
): PathResult | 'no-path' {
  const dist = new Map<NodeId, number>();
  const prev = new Map<NodeId, NodeId>();
  const unvisited = new Set<NodeId>();

  for (const nodeId of adj.keys()) unvisited.add(nodeId);
  unvisited.add(start);
  unvisited.add(end);

  dist.set(start, 0);
  while (unvisited.size > 0) {
    const current = pickMinDist(unvisited, dist);
    if (current === undefined || current === end) break;
    unvisited.delete(current);
    const neighbours = adj.get(current) ?? [];
    for (const { to, weight } of neighbours) {
      const alt = (dist.get(current) ?? Infinity) + weight;
      if (alt < (dist.get(to) ?? Infinity)) {
        dist.set(to, alt);
        prev.set(to, current);
      }
    }
  }

  const totalWeight = dist.get(end);
  if (totalWeight === undefined || totalWeight === Infinity) return 'no-path';
  return buildPath(prev, start, end, totalWeight);
}

function pickMinDist(unvisited: Set<NodeId>, dist: Map<NodeId, number>): NodeId | undefined {
  let minNode: NodeId | undefined;
  let minDist = Infinity;
  for (const nodeId of unvisited) {
    const d = dist.get(nodeId) ?? Infinity;
    if (d < minDist) {
      minDist = d;
      minNode = nodeId;
    }
  }
  return minNode;
}

function buildPath(
  prev: Map<NodeId, NodeId>,
  start: NodeId,
  end: NodeId,
  totalWeight: number,
): PathResult {
  const path: NodeId[] = [];
  let current: NodeId | undefined = end;
  while (current !== undefined) {
    path.unshift(current);
    current = prev.get(current);
  }
  if (path[0] !== start) return { path: [], totalWeight: 0, hopCount: 0 };
  return { path, totalWeight, hopCount: path.length - 1 };
}

function bfsReachable(
  adj: Map<NodeId, Array<{ to: NodeId; weight: number }>>,
  start: NodeId,
): ReadonlyArray<NodeId> {
  const visited = new Set<NodeId>();
  const queue = [start];
  visited.add(start);
  while (queue.length > 0) {
    const node = queue.shift();
    if (node === undefined) break;
    for (const { to } of adj.get(node) ?? []) {
      if (!visited.has(to)) {
        visited.add(to);
        queue.push(to);
      }
    }
  }
  visited.delete(start);
  return Array.from(visited);
}

// ── Operations ───────────────────────────────────────────────────

function addNode(state: NavGraphState, nodeId: NodeId, label: string): NavNode | NavigationError {
  if (state.nodes.has(nodeId)) {
    state.logger.warn('Node already exists: ' + nodeId);
    return 'already-exists';
  }
  const node: NavNode = { nodeId, label, addedAt: state.clock.now() };
  state.nodes.set(nodeId, node);
  state.logger.info('Node added: ' + nodeId);
  return node;
}

function addEdge(
  state: NavGraphState,
  fromNodeId: NodeId,
  toNodeId: NodeId,
  weight: number,
  bidirectional: boolean,
): NavEdge | NavigationError {
  if (!state.nodes.has(fromNodeId) || !state.nodes.has(toNodeId)) {
    state.logger.error('Node not found for edge: ' + fromNodeId + ' -> ' + toNodeId);
    return 'node-not-found';
  }
  const resolvedWeight = weight > 0 ? weight : 1;
  const edge: NavEdge = {
    edgeId: state.idGen.generate(),
    fromNodeId,
    toNodeId,
    weight: resolvedWeight,
    bidirectional,
    active: true,
  };
  state.edges.set(edge.edgeId, edge);
  state.logger.info('Edge added: ' + edge.edgeId);
  return edge;
}

function removeEdge(
  state: NavGraphState,
  edgeId: EdgeId,
): { success: true } | { success: false; error: NavigationError } {
  if (!state.edges.has(edgeId)) return { success: false, error: 'edge-not-found' };
  state.edges.delete(edgeId);
  state.logger.info('Edge removed: ' + edgeId);
  return { success: true };
}

function deactivateEdge(
  state: NavGraphState,
  edgeId: EdgeId,
): { success: true } | { success: false; error: NavigationError } {
  const edge = state.edges.get(edgeId);
  if (edge === undefined) return { success: false, error: 'edge-not-found' };
  edge.active = false;
  state.logger.info('Edge deactivated: ' + edgeId);
  return { success: true };
}

function findPath(
  state: NavGraphState,
  fromNodeId: NodeId,
  toNodeId: NodeId,
): PathResult | NavigationError {
  if (!state.nodes.has(fromNodeId) || !state.nodes.has(toNodeId)) return 'node-not-found';
  const adj = buildAdjacency(state.edges);
  const result = dijkstra(adj, fromNodeId, toNodeId);
  return result === 'no-path' ? 'no-path' : result;
}

function getConnectivityReport(state: NavGraphState): ConnectivityReport {
  const activeEdges = Array.from(state.edges.values()).filter((e) => e.active).length;
  return {
    totalNodes: state.nodes.size,
    totalEdges: state.edges.size,
    activeEdges,
    reachableFrom: (nodeId: NodeId) => {
      if (!state.nodes.has(nodeId)) return [];
      const adj = buildAdjacency(state.edges);
      return bfsReachable(adj, nodeId);
    },
  };
}

// ── Factory ──────────────────────────────────────────────────────

export function createNavigationGraphSystem(deps: {
  clock: NavClock;
  idGen: NavIdGenerator;
  logger: NavLogger;
}): NavigationGraphSystem {
  const state: NavGraphState = {
    nodes: new Map(),
    edges: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };
  return {
    addNode: (nodeId, label) => addNode(state, nodeId, label),
    addEdge: (from, to, weight, bidir) => addEdge(state, from, to, weight, bidir),
    removeEdge: (edgeId) => removeEdge(state, edgeId),
    deactivateEdge: (edgeId) => deactivateEdge(state, edgeId),
    findPath: (from, to) => findPath(state, from, to),
    getNode: (nodeId) => state.nodes.get(nodeId),
    getEdge: (edgeId) => state.edges.get(edgeId),
    listNodes: () => Array.from(state.nodes.values()),
    listEdges: (active) => {
      const all = Array.from(state.edges.values());
      return active === undefined ? all : all.filter((e) => e.active === active);
    },
    getConnectivityReport: () => getConnectivityReport(state),
  };
}
