/**
 * lattice-topology.ts — Advanced topology management for the lattice network.
 *
 * Analyzes the structural properties of the Silfen Weave lattice graph.
 * Provides cluster detection, bridge node identification, network
 * partitioning analysis, redundancy scoring, topology optimization
 * recommendations, and connectivity resilience metrics.
 */

// ── Ports ────────────────────────────────────────────────────────

interface TopologyClock {
  readonly nowMicroseconds: () => number;
}

interface TopologyIdGenerator {
  readonly generate: () => string;
}

// ── Deps ─────────────────────────────────────────────────────────

interface LatticeTopologyDeps {
  readonly clock: TopologyClock;
  readonly idGenerator: TopologyIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

interface TopologyNode {
  readonly nodeId: string;
  readonly worldId: string;
  readonly connections: readonly string[];
}

interface TopologyEdge {
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly weight: number;
}

interface Cluster {
  readonly clusterId: string;
  readonly nodeIds: readonly string[];
  readonly edgeCount: number;
  readonly density: number;
}

interface BridgeNode {
  readonly nodeId: string;
  readonly clustersConnected: readonly string[];
  readonly criticality: number;
}

interface PartitionAnalysis {
  readonly isPartitioned: boolean;
  readonly componentCount: number;
  readonly components: readonly NetworkComponent[];
  readonly isolatedNodes: readonly string[];
}

interface NetworkComponent {
  readonly componentId: string;
  readonly nodeIds: readonly string[];
  readonly size: number;
}

interface RedundancyScore {
  readonly nodeId: string;
  readonly score: number;
  readonly alternatePathCount: number;
  readonly grade: RedundancyGrade;
}

type RedundancyGrade = 'none' | 'minimal' | 'adequate' | 'strong' | 'excellent';

interface OptimizationRecommendation {
  readonly recommendationId: string;
  readonly type: OptimizationType;
  readonly description: string;
  readonly targetNodeIds: readonly string[];
  readonly expectedImprovement: number;
  readonly priority: RecommendationPriority;
}

type OptimizationType =
  | 'add_edge'
  | 'remove_bottleneck'
  | 'rebalance_cluster'
  | 'strengthen_bridge'
  | 'connect_isolated';

type RecommendationPriority = 'low' | 'medium' | 'high' | 'critical';

interface ResilienceMetrics {
  readonly totalNodes: number;
  readonly totalEdges: number;
  readonly averageDegree: number;
  readonly clusterCount: number;
  readonly bridgeNodeCount: number;
  readonly partitionRisk: number;
  readonly overallResilience: number;
  readonly connectivityRatio: number;
}

// ── State ────────────────────────────────────────────────────────

interface MutableNode {
  readonly nodeId: string;
  readonly worldId: string;
  readonly connections: string[];
}

interface TopologyState {
  readonly deps: LatticeTopologyDeps;
  readonly nodes: Map<string, MutableNode>;
  readonly edges: Map<string, TopologyEdge>;
}

// ── Helpers ──────────────────────────────────────────────────────

function edgeKey(from: string, to: string): string {
  return from < to ? from + ':' + to : to + ':' + from;
}

function nodeToReadonly(n: MutableNode): TopologyNode {
  return { nodeId: n.nodeId, worldId: n.worldId, connections: [...n.connections] };
}

// ── Node Operations ──────────────────────────────────────────────

function addNodeImpl(state: TopologyState, nodeId: string, worldId: string): TopologyNode {
  const existing = state.nodes.get(nodeId);
  if (existing !== undefined) return nodeToReadonly(existing);
  const node: MutableNode = { nodeId, worldId, connections: [] };
  state.nodes.set(nodeId, node);
  return nodeToReadonly(node);
}

function removeNodeImpl(state: TopologyState, nodeId: string): boolean {
  const node = state.nodes.get(nodeId);
  if (node === undefined) return false;
  removeNodeEdges(state, node);
  state.nodes.delete(nodeId);
  return true;
}

function removeNodeEdges(state: TopologyState, node: MutableNode): void {
  for (const connId of node.connections) {
    const key = edgeKey(node.nodeId, connId);
    state.edges.delete(key);
    const neighbor = state.nodes.get(connId);
    if (neighbor === undefined) continue;
    const idx = neighbor.connections.indexOf(node.nodeId);
    if (idx !== -1) neighbor.connections.splice(idx, 1);
  }
}

function getNodeImpl(state: TopologyState, nodeId: string): TopologyNode | undefined {
  const n = state.nodes.get(nodeId);
  return n !== undefined ? nodeToReadonly(n) : undefined;
}

// ── Edge Operations ──────────────────────────────────────────────

function addEdgeImpl(
  state: TopologyState,
  fromNodeId: string,
  toNodeId: string,
  weight: number,
): TopologyEdge | string {
  if (!state.nodes.has(fromNodeId)) return 'from_node_not_found';
  if (!state.nodes.has(toNodeId)) return 'to_node_not_found';
  if (fromNodeId === toNodeId) return 'self_loop_not_allowed';
  return createEdge(state, fromNodeId, toNodeId, weight);
}

function createEdge(
  state: TopologyState,
  fromNodeId: string,
  toNodeId: string,
  weight: number,
): TopologyEdge {
  const key = edgeKey(fromNodeId, toNodeId);
  const edge: TopologyEdge = { fromNodeId, toNodeId, weight };
  state.edges.set(key, edge);
  addConnection(state, fromNodeId, toNodeId);
  addConnection(state, toNodeId, fromNodeId);
  return edge;
}

function addConnection(state: TopologyState, nodeId: string, connId: string): void {
  const node = state.nodes.get(nodeId);
  if (node === undefined) return;
  if (!node.connections.includes(connId)) {
    node.connections.push(connId);
  }
}

function removeEdgeImpl(state: TopologyState, fromNodeId: string, toNodeId: string): boolean {
  const key = edgeKey(fromNodeId, toNodeId);
  if (!state.edges.has(key)) return false;
  state.edges.delete(key);
  removeConnection(state, fromNodeId, toNodeId);
  removeConnection(state, toNodeId, fromNodeId);
  return true;
}

function removeConnection(state: TopologyState, nodeId: string, connId: string): void {
  const node = state.nodes.get(nodeId);
  if (node === undefined) return;
  const idx = node.connections.indexOf(connId);
  if (idx !== -1) node.connections.splice(idx, 1);
}

// ── Cluster Detection ────────────────────────────────────────────

function detectClustersImpl(state: TopologyState): readonly Cluster[] {
  const visited = new Set<string>();
  const clusters: Cluster[] = [];
  for (const nodeId of state.nodes.keys()) {
    if (visited.has(nodeId)) continue;
    const component = bfsCollect(state, nodeId, visited);
    if (component.length < 2) continue;
    clusters.push(buildCluster(state, component));
  }
  return clusters;
}

function bfsCollect(state: TopologyState, startId: string, visited: Set<string>): string[] {
  const queue: string[] = [startId];
  const collected: string[] = [];
  visited.add(startId);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    collected.push(current);
    expandNeighbors(state, current, visited, queue);
  }
  return collected;
}

function expandNeighbors(
  state: TopologyState,
  nodeId: string,
  visited: Set<string>,
  queue: string[],
): void {
  const node = state.nodes.get(nodeId);
  if (node === undefined) return;
  for (const connId of node.connections) {
    if (visited.has(connId)) continue;
    visited.add(connId);
    queue.push(connId);
  }
}

function buildCluster(state: TopologyState, nodeIds: readonly string[]): Cluster {
  const nodeSet = new Set(nodeIds);
  let edgeCount = 0;
  for (const edge of state.edges.values()) {
    if (nodeSet.has(edge.fromNodeId) && nodeSet.has(edge.toNodeId)) {
      edgeCount += 1;
    }
  }
  const n = nodeIds.length;
  const maxEdges = (n * (n - 1)) / 2;
  const density = maxEdges > 0 ? edgeCount / maxEdges : 0;
  return {
    clusterId: state.deps.idGenerator.generate(),
    nodeIds: [...nodeIds],
    edgeCount,
    density,
  };
}

// ── Bridge Node Detection ────────────────────────────────────────

function detectBridgeNodesImpl(state: TopologyState): readonly BridgeNode[] {
  const clusters = detectClustersImpl(state);
  const nodeClusterMap = buildNodeClusterMap(clusters);
  const bridges: BridgeNode[] = [];
  for (const [nodeId, clusterIds] of nodeClusterMap) {
    if (clusterIds.length < 2) continue;
    const criticality = computeBridgeCriticality(state, nodeId, clusterIds);
    bridges.push({ nodeId, clustersConnected: clusterIds, criticality });
  }
  return bridges;
}

function buildNodeClusterMap(clusters: readonly Cluster[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const cluster of clusters) {
    for (const nodeId of cluster.nodeIds) {
      let list = map.get(nodeId);
      if (list === undefined) {
        list = [];
        map.set(nodeId, list);
      }
      list.push(cluster.clusterId);
    }
  }
  return map;
}

function computeBridgeCriticality(
  state: TopologyState,
  nodeId: string,
  clusterIds: readonly string[],
): number {
  const node = state.nodes.get(nodeId);
  if (node === undefined) return 0;
  const degree = node.connections.length;
  const clusterSpan = clusterIds.length;
  return Math.min(1, (degree * clusterSpan) / (state.nodes.size * 0.5));
}

// ── Partition Analysis ───────────────────────────────────────────

function analyzePartitionsImpl(state: TopologyState): PartitionAnalysis {
  const visited = new Set<string>();
  const components: NetworkComponent[] = [];
  for (const nodeId of state.nodes.keys()) {
    if (visited.has(nodeId)) continue;
    const collected = bfsCollect(state, nodeId, visited);
    components.push({
      componentId: state.deps.idGenerator.generate(),
      nodeIds: collected,
      size: collected.length,
    });
  }
  const isolated = components
    .filter((c) => c.size === 1)
    .map((c) => c.nodeIds[0])
    .filter((id): id is string => id !== undefined);
  return {
    isPartitioned: components.length > 1,
    componentCount: components.length,
    components,
    isolatedNodes: isolated,
  };
}

// ── Redundancy Scoring ───────────────────────────────────────────

function scoreRedundancyImpl(state: TopologyState, nodeId: string): RedundancyScore | undefined {
  const node = state.nodes.get(nodeId);
  if (node === undefined) return undefined;
  const altPaths = countAlternatePaths(state, node);
  const score = Math.min(100, altPaths * 20 + node.connections.length * 10);
  return {
    nodeId,
    score,
    alternatePathCount: altPaths,
    grade: classifyRedundancy(score),
  };
}

function countAlternatePaths(state: TopologyState, node: MutableNode): number {
  let altPaths = 0;
  for (let i = 0; i < node.connections.length; i++) {
    const target = node.connections[i];
    if (target === undefined) continue;
    if (hasAlternatePath(state, node.nodeId, target)) altPaths += 1;
  }
  return altPaths;
}

function hasAlternatePath(state: TopologyState, fromId: string, toId: string): boolean {
  const visited = new Set<string>([fromId]);
  const queue: string[] = [];
  const fromNode = state.nodes.get(fromId);
  if (fromNode === undefined) return false;
  seedAlternateSearch(state, fromNode, toId, visited, queue);
  return bfsSearch(state, toId, visited, queue);
}

function seedAlternateSearch(
  state: TopologyState,
  fromNode: MutableNode,
  toId: string,
  visited: Set<string>,
  queue: string[],
): void {
  for (const connId of fromNode.connections) {
    if (connId === toId) continue;
    if (visited.has(connId)) continue;
    visited.add(connId);
    queue.push(connId);
  }
}

function bfsSearch(
  state: TopologyState,
  targetId: string,
  visited: Set<string>,
  queue: string[],
): boolean {
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    if (current === targetId) return true;
    const node = state.nodes.get(current);
    if (node === undefined) continue;
    for (const connId of node.connections) {
      if (visited.has(connId)) continue;
      visited.add(connId);
      queue.push(connId);
    }
  }
  return false;
}

function classifyRedundancy(score: number): RedundancyGrade {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'strong';
  if (score >= 40) return 'adequate';
  if (score >= 20) return 'minimal';
  return 'none';
}

// ── Optimization Recommendations ─────────────────────────────────

function getRecommendationsImpl(state: TopologyState): readonly OptimizationRecommendation[] {
  const recommendations: OptimizationRecommendation[] = [];
  recommendConnectIsolated(state, recommendations);
  recommendStrengthenBridges(state, recommendations);
  return recommendations;
}

function recommendConnectIsolated(
  state: TopologyState,
  recommendations: OptimizationRecommendation[],
): void {
  for (const node of state.nodes.values()) {
    if (node.connections.length > 0) continue;
    recommendations.push({
      recommendationId: state.deps.idGenerator.generate(),
      type: 'connect_isolated',
      description: 'Connect isolated node ' + node.nodeId + ' to the network',
      targetNodeIds: [node.nodeId],
      expectedImprovement: 0.3,
      priority: 'high',
    });
  }
}

function recommendStrengthenBridges(
  state: TopologyState,
  recommendations: OptimizationRecommendation[],
): void {
  for (const node of state.nodes.values()) {
    if (node.connections.length !== 1) continue;
    if (state.nodes.size < 3) continue;
    recommendations.push({
      recommendationId: state.deps.idGenerator.generate(),
      type: 'strengthen_bridge',
      description: 'Add redundant connection for single-link node ' + node.nodeId,
      targetNodeIds: [node.nodeId],
      expectedImprovement: 0.2,
      priority: 'medium',
    });
  }
}

// ── Resilience Metrics ───────────────────────────────────────────

function getResilienceMetricsImpl(state: TopologyState): ResilienceMetrics {
  const totalNodes = state.nodes.size;
  const totalEdges = state.edges.size;
  const avgDegree = computeAverageDegree(state);
  const clusters = detectClustersImpl(state);
  const bridges = detectBridgeNodesImpl(state);
  const partitions = analyzePartitionsImpl(state);
  const partitionRisk = computePartitionRisk(partitions, totalNodes);
  const connectivity = computeConnectivityRatio(state);
  const resilience = computeResilience(avgDegree, partitionRisk, connectivity);
  return {
    totalNodes,
    totalEdges,
    averageDegree: avgDegree,
    clusterCount: clusters.length,
    bridgeNodeCount: bridges.length,
    partitionRisk,
    overallResilience: resilience,
    connectivityRatio: connectivity,
  };
}

function computeAverageDegree(state: TopologyState): number {
  if (state.nodes.size === 0) return 0;
  let totalDegree = 0;
  for (const node of state.nodes.values()) {
    totalDegree += node.connections.length;
  }
  return totalDegree / state.nodes.size;
}

function computePartitionRisk(analysis: PartitionAnalysis, totalNodes: number): number {
  if (totalNodes <= 1) return 0;
  if (!analysis.isPartitioned) return 0;
  return Math.min(1, (analysis.componentCount - 1) / totalNodes);
}

function computeConnectivityRatio(state: TopologyState): number {
  const n = state.nodes.size;
  if (n <= 1) return 1;
  const maxEdges = (n * (n - 1)) / 2;
  return maxEdges > 0 ? state.edges.size / maxEdges : 0;
}

function computeResilience(avgDegree: number, partitionRisk: number, connectivity: number): number {
  const degreeScore = Math.min(1, avgDegree / 4);
  const riskPenalty = partitionRisk;
  const connectScore = connectivity;
  return Math.max(0, Math.min(1, (degreeScore + connectScore) / 2 - riskPenalty));
}

// ── Public API ───────────────────────────────────────────────────

interface LatticeTopology {
  readonly addNode: (nodeId: string, worldId: string) => TopologyNode;
  readonly removeNode: (nodeId: string) => boolean;
  readonly getNode: (nodeId: string) => TopologyNode | undefined;
  readonly addEdge: (fromNodeId: string, toNodeId: string, weight: number) => TopologyEdge | string;
  readonly removeEdge: (fromNodeId: string, toNodeId: string) => boolean;
  readonly detectClusters: () => readonly Cluster[];
  readonly detectBridgeNodes: () => readonly BridgeNode[];
  readonly analyzePartitions: () => PartitionAnalysis;
  readonly scoreRedundancy: (nodeId: string) => RedundancyScore | undefined;
  readonly getRecommendations: () => readonly OptimizationRecommendation[];
  readonly getResilienceMetrics: () => ResilienceMetrics;
}

// ── Factory ──────────────────────────────────────────────────────

function createLatticeTopology(deps: LatticeTopologyDeps): LatticeTopology {
  const state: TopologyState = {
    deps,
    nodes: new Map(),
    edges: new Map(),
  };
  return {
    addNode: (id, wId) => addNodeImpl(state, id, wId),
    removeNode: (id) => removeNodeImpl(state, id),
    getNode: (id) => getNodeImpl(state, id),
    addEdge: (f, t, w) => addEdgeImpl(state, f, t, w),
    removeEdge: (f, t) => removeEdgeImpl(state, f, t),
    detectClusters: () => detectClustersImpl(state),
    detectBridgeNodes: () => detectBridgeNodesImpl(state),
    analyzePartitions: () => analyzePartitionsImpl(state),
    scoreRedundancy: (id) => scoreRedundancyImpl(state, id),
    getRecommendations: () => getRecommendationsImpl(state),
    getResilienceMetrics: () => getResilienceMetricsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createLatticeTopology };
export type {
  LatticeTopology,
  LatticeTopologyDeps,
  TopologyClock,
  TopologyIdGenerator,
  TopologyNode,
  TopologyEdge,
  Cluster,
  BridgeNode,
  PartitionAnalysis,
  NetworkComponent,
  RedundancyScore,
  RedundancyGrade,
  OptimizationRecommendation,
  OptimizationType,
  RecommendationPriority,
  ResilienceMetrics,
};
