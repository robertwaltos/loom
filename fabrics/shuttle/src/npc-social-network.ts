/**
 * NPC Social Network — Social connections, influence, and community detection.
 *
 * Tracks bidirectional connections between NPCs with typed strength levels.
 * Interactions strengthen bonds over time. BFS-based influence computation
 * and community clustering give the world social texture.
 *
 * Connection strength upgrades:
 *   WEAK → MODERATE at 5 interactions
 *   MODERATE → STRONG at 15 interactions
 *   STRONG → BOND at 30 interactions
 *
 * "No thread weaves alone; every node shapes the pattern."
 */

// ============================================================================
// PORTS
// ============================================================================

export type NpcSocialNetworkClock = {
  now(): bigint;
};

export type NpcSocialNetworkIdGen = {
  generate(): string;
};

export type NpcSocialNetworkLogger = {
  info(message: string): void;
  error(message: string): void;
};

export type NpcSocialNetworkDeps = {
  readonly clock: NpcSocialNetworkClock;
  readonly idGen: NpcSocialNetworkIdGen;
  readonly logger: NpcSocialNetworkLogger;
};

// ============================================================================
// TYPES
// ============================================================================

export type NpcId = string;
export type ConnectionId = string;

export type NetworkError =
  | 'npc-not-found'
  | 'already-connected'
  | 'not-connected'
  | 'self-connection'
  | 'already-registered';

export type ConnectionStrength = 'WEAK' | 'MODERATE' | 'STRONG' | 'BOND';

export type Connection = {
  readonly connectionId: ConnectionId;
  readonly npcAId: NpcId;
  readonly npcBId: NpcId;
  readonly strength: ConnectionStrength;
  readonly interactionCount: number;
  readonly lastInteractionAt: bigint;
};

export type InfluenceResult = {
  readonly sourceNpcId: NpcId;
  readonly reachCount: number;
  readonly directConnections: number;
  readonly indirectConnections: number;
};

export type CommunityCluster = {
  readonly clusterId: string;
  readonly memberIds: ReadonlyArray<NpcId>;
  readonly density: number;
};

export type NetworkStats = {
  readonly totalNpcs: number;
  readonly totalConnections: number;
  readonly averageConnectionsPerNpc: number;
  readonly strongBondCount: number;
};

// ============================================================================
// PUBLIC API
// ============================================================================

export type NpcSocialNetworkSystem = {
  readonly registerNpc: (
    npcId: NpcId,
  ) => { success: true } | { success: false; error: NetworkError };
  readonly connect: (
    npcAId: NpcId,
    npcBId: NpcId,
    initialStrength: ConnectionStrength,
  ) => Connection | NetworkError;
  readonly disconnect: (
    npcAId: NpcId,
    npcBId: NpcId,
  ) => { success: true } | { success: false; error: NetworkError };
  readonly recordInteraction: (
    npcAId: NpcId,
    npcBId: NpcId,
  ) => { success: true; newStrength: ConnectionStrength } | { success: false; error: NetworkError };
  readonly computeInfluence: (npcId: NpcId, maxHops: number) => InfluenceResult | NetworkError;
  readonly detectClusters: (minSize: number) => ReadonlyArray<CommunityCluster>;
  readonly getConnection: (npcAId: NpcId, npcBId: NpcId) => Connection | undefined;
  readonly getConnectionsForNpc: (npcId: NpcId) => ReadonlyArray<Connection>;
  readonly getStats: () => NetworkStats;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const MODERATE_THRESHOLD = 5;
const STRONG_THRESHOLD = 15;
const BOND_THRESHOLD = 30;

// ============================================================================
// STATE
// ============================================================================

type MutableConnection = {
  connectionId: ConnectionId;
  npcAId: NpcId;
  npcBId: NpcId;
  strength: ConnectionStrength;
  interactionCount: number;
  lastInteractionAt: bigint;
};

type NpcSocialNetworkState = {
  readonly deps: NpcSocialNetworkDeps;
  readonly npcs: Set<NpcId>;
  readonly connections: Map<string, MutableConnection>;
};

// ============================================================================
// FACTORY
// ============================================================================

export function createNpcSocialNetworkSystem(deps: NpcSocialNetworkDeps): NpcSocialNetworkSystem {
  const state: NpcSocialNetworkState = {
    deps,
    npcs: new Set(),
    connections: new Map(),
  };

  return {
    registerNpc: (npcId) => registerNpcImpl(state, npcId),
    connect: (npcAId, npcBId, initialStrength) =>
      connectImpl(state, npcAId, npcBId, initialStrength),
    disconnect: (npcAId, npcBId) => disconnectImpl(state, npcAId, npcBId),
    recordInteraction: (npcAId, npcBId) => recordInteractionImpl(state, npcAId, npcBId),
    computeInfluence: (npcId, maxHops) => computeInfluenceImpl(state, npcId, maxHops),
    detectClusters: (minSize) => detectClustersImpl(state, minSize),
    getConnection: (npcAId, npcBId) => {
      const conn = state.connections.get(connectionKey(npcAId, npcBId));
      return conn !== undefined ? toReadonlyConnection(conn) : undefined;
    },
    getConnectionsForNpc: (npcId) => getConnectionsForNpcImpl(state, npcId),
    getStats: () => getStatsImpl(state),
  };
}

// ============================================================================
// REGISTRATION
// ============================================================================

function registerNpcImpl(
  state: NpcSocialNetworkState,
  npcId: NpcId,
): { success: true } | { success: false; error: NetworkError } {
  if (state.npcs.has(npcId)) {
    return { success: false, error: 'already-registered' };
  }
  state.npcs.add(npcId);
  state.deps.logger.info('npc-social-network: registered npc ' + npcId);
  return { success: true };
}

// ============================================================================
// CONNECT
// ============================================================================

function connectImpl(
  state: NpcSocialNetworkState,
  npcAId: NpcId,
  npcBId: NpcId,
  initialStrength: ConnectionStrength,
): Connection | NetworkError {
  if (npcAId === npcBId) return 'self-connection';
  if (!state.npcs.has(npcAId) || !state.npcs.has(npcBId)) return 'npc-not-found';
  const key = connectionKey(npcAId, npcBId);
  if (state.connections.has(key)) return 'already-connected';

  const conn: MutableConnection = {
    connectionId: state.deps.idGen.generate(),
    npcAId: canonicalA(npcAId, npcBId),
    npcBId: canonicalB(npcAId, npcBId),
    strength: initialStrength,
    interactionCount: 0,
    lastInteractionAt: state.deps.clock.now(),
  };

  state.connections.set(key, conn);
  state.deps.logger.info('npc-social-network: connected ' + npcAId + ' <-> ' + npcBId);
  return toReadonlyConnection(conn);
}

// ============================================================================
// DISCONNECT
// ============================================================================

function disconnectImpl(
  state: NpcSocialNetworkState,
  npcAId: NpcId,
  npcBId: NpcId,
): { success: true } | { success: false; error: NetworkError } {
  const key = connectionKey(npcAId, npcBId);
  if (!state.connections.has(key)) return { success: false, error: 'not-connected' };
  state.connections.delete(key);
  return { success: true };
}

// ============================================================================
// RECORD INTERACTION
// ============================================================================

function recordInteractionImpl(
  state: NpcSocialNetworkState,
  npcAId: NpcId,
  npcBId: NpcId,
): { success: true; newStrength: ConnectionStrength } | { success: false; error: NetworkError } {
  const key = connectionKey(npcAId, npcBId);
  const conn = state.connections.get(key);
  if (conn === undefined) return { success: false, error: 'not-connected' };

  conn.interactionCount++;
  conn.lastInteractionAt = state.deps.clock.now();
  conn.strength = strengthForCount(conn.interactionCount);
  return { success: true, newStrength: conn.strength };
}

function strengthForCount(count: number): ConnectionStrength {
  if (count >= BOND_THRESHOLD) return 'BOND';
  if (count >= STRONG_THRESHOLD) return 'STRONG';
  if (count >= MODERATE_THRESHOLD) return 'MODERATE';
  return 'WEAK';
}

// ============================================================================
// COMPUTE INFLUENCE
// ============================================================================

function computeInfluenceImpl(
  state: NpcSocialNetworkState,
  npcId: NpcId,
  maxHops: number,
): InfluenceResult | NetworkError {
  if (!state.npcs.has(npcId)) return 'npc-not-found';
  const visited = bfsHops(state, npcId, maxHops);
  visited.delete(npcId);
  return buildInfluenceResult(npcId, visited);
}

function bfsHops(
  state: NpcSocialNetworkState,
  startId: NpcId,
  maxHops: number,
): Map<NpcId, number> {
  const visited = new Map<NpcId, number>();
  const queue: Array<{ npcId: NpcId; hop: number }> = [{ npcId: startId, hop: 0 }];
  visited.set(startId, 0);
  while (queue.length > 0) {
    const item = queue.shift();
    if (item === undefined) break;
    if (item.hop >= maxHops) continue;
    for (const neighbor of getNeighbors(state, item.npcId)) {
      if (!visited.has(neighbor)) {
        visited.set(neighbor, item.hop + 1);
        queue.push({ npcId: neighbor, hop: item.hop + 1 });
      }
    }
  }
  return visited;
}

function buildInfluenceResult(sourceNpcId: NpcId, visited: Map<NpcId, number>): InfluenceResult {
  let directConnections = 0;
  let indirectConnections = 0;
  for (const hop of visited.values()) {
    if (hop === 1) directConnections++;
    else indirectConnections++;
  }
  return {
    sourceNpcId,
    reachCount: directConnections + indirectConnections,
    directConnections,
    indirectConnections,
  };
}

function getNeighbors(state: NpcSocialNetworkState, npcId: NpcId): NpcId[] {
  const neighbors: NpcId[] = [];
  for (const conn of state.connections.values()) {
    if (conn.npcAId === npcId) neighbors.push(conn.npcBId);
    else if (conn.npcBId === npcId) neighbors.push(conn.npcAId);
  }
  return neighbors;
}

// ============================================================================
// DETECT CLUSTERS
// ============================================================================

function detectClustersImpl(
  state: NpcSocialNetworkState,
  minSize: number,
): ReadonlyArray<CommunityCluster> {
  const adjacency = buildAdjacency(state);
  const visited = new Set<NpcId>();
  const clusters: CommunityCluster[] = [];
  let clusterCounter = 0;

  for (const npcId of adjacency.keys()) {
    if (visited.has(npcId)) continue;
    const members = bfsComponent(adjacency, npcId, visited);
    if (members.length < minSize) continue;
    const density = computeDensity(state, members);
    clusters.push({
      clusterId: 'cluster-' + String(++clusterCounter),
      memberIds: members,
      density,
    });
  }

  return clusters;
}

function buildAdjacency(state: NpcSocialNetworkState): Map<NpcId, Set<NpcId>> {
  const adj = new Map<NpcId, Set<NpcId>>();
  for (const conn of state.connections.values()) {
    getOrCreateSet(adj, conn.npcAId).add(conn.npcBId);
    getOrCreateSet(adj, conn.npcBId).add(conn.npcAId);
  }
  return adj;
}

function bfsComponent(
  adjacency: Map<NpcId, Set<NpcId>>,
  start: NpcId,
  visited: Set<NpcId>,
): NpcId[] {
  const members: NpcId[] = [];
  const queue = [start];
  visited.add(start);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    members.push(current);
    const neighbors = adjacency.get(current);
    if (neighbors === undefined) continue;
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return members;
}

function computeDensity(state: NpcSocialNetworkState, members: ReadonlyArray<NpcId>): number {
  const memberSet = new Set(members);
  const n = members.length;
  if (n < 2) return 0;
  let edgeCount = 0;
  for (const conn of state.connections.values()) {
    if (memberSet.has(conn.npcAId) && memberSet.has(conn.npcBId)) edgeCount++;
  }
  const possibleEdges = (n * (n - 1)) / 2;
  return edgeCount / possibleEdges;
}

// ============================================================================
// GET CONNECTIONS FOR NPC
// ============================================================================

function getConnectionsForNpcImpl(
  state: NpcSocialNetworkState,
  npcId: NpcId,
): ReadonlyArray<Connection> {
  const results: Connection[] = [];
  for (const conn of state.connections.values()) {
    if (conn.npcAId === npcId || conn.npcBId === npcId) {
      results.push(toReadonlyConnection(conn));
    }
  }
  return results;
}

// ============================================================================
// STATS
// ============================================================================

function getStatsImpl(state: NpcSocialNetworkState): NetworkStats {
  const totalNpcs = state.npcs.size;
  const totalConnections = state.connections.size;
  const averageConnectionsPerNpc = totalNpcs === 0 ? 0 : (totalConnections * 2) / totalNpcs;
  let strongBondCount = 0;
  for (const conn of state.connections.values()) {
    if (conn.strength === 'BOND') strongBondCount++;
  }
  return { totalNpcs, totalConnections, averageConnectionsPerNpc, strongBondCount };
}

// ============================================================================
// HELPERS
// ============================================================================

function connectionKey(npcAId: NpcId, npcBId: NpcId): string {
  const [a, b] = npcAId < npcBId ? [npcAId, npcBId] : [npcBId, npcAId];
  return a + '::' + b;
}

function canonicalA(npcAId: NpcId, npcBId: NpcId): NpcId {
  return npcAId < npcBId ? npcAId : npcBId;
}

function canonicalB(npcAId: NpcId, npcBId: NpcId): NpcId {
  return npcAId < npcBId ? npcBId : npcAId;
}

function getOrCreateSet(map: Map<NpcId, Set<NpcId>>, key: NpcId): Set<NpcId> {
  let set = map.get(key);
  if (set === undefined) {
    set = new Set();
    map.set(key, set);
  }
  return set;
}

function toReadonlyConnection(c: MutableConnection): Connection {
  return {
    connectionId: c.connectionId,
    npcAId: c.npcAId,
    npcBId: c.npcBId,
    strength: c.strength,
    interactionCount: c.interactionCount,
    lastInteractionAt: c.lastInteractionAt,
  };
}
