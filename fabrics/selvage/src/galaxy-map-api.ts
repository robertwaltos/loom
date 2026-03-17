/**
 * galaxy-map-api.ts ΓÇö Galaxy Map data API for network visualization.
 *
 * Returns the full Concord galaxy graph: world nodes, Silfen Weave corridor
 * edges, cluster groupings, and aggregate statistics. Intended for the
 * in-game galaxy map UI and external community visualization tools.
 *
 * Endpoints (logical, framework-agnostic):
 *   GET /v1/galaxy/nodes            ΓÇö all world nodes (id, name, position, stats)
 *   GET /v1/galaxy/nodes/:worldId   ΓÇö single world node detail
 *   GET /v1/galaxy/edges            ΓÇö all corridor connections
 *   GET /v1/galaxy/clusters         ΓÇö groupings by region/sector
 *   GET /v1/galaxy/stats            ΓÇö aggregate galaxy statistics
 *   GET /v1/galaxy/route            ΓÇö shortest path between two worlds
 *
 * Thread: silk
 * Tier: 1
 */

// ΓöÇΓöÇΓöÇ World Node ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type WorldNodeStatus =
  | 'ACTIVE'
  | 'ABANDONED'
  | 'QUARANTINED'
  | 'CONTESTED'
  | 'UNEXPLORED'
  | 'SEALED';

export type WorldStellarClass =
  | 'TERRESTRIAL'
  | 'OCEAN'
  | 'ARID'
  | 'TUNDRA'
  | 'GAS_GIANT'
  | 'STATION'
  | 'VOID_TOUCHED'
  | 'ANOMALY';

export interface WorldNodePosition {
  readonly sector: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface WorldNode {
  readonly worldId: string;
  readonly displayName: string;
  readonly stellarClass: WorldStellarClass;
  readonly status: WorldNodeStatus;
  readonly position: WorldNodePosition;
  readonly populationEstimate: number | null;
  readonly foundedInGameYear: number | null;
  readonly dynastyCount: number;
  readonly isLaunchWorld: boolean;
  readonly isStoryWorld: boolean;
  readonly chronicleEntryCount: number;
  readonly residentNpcCount: number;
}

// ΓöÇΓöÇΓöÇ Corridor Edge ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type CorridorStatus = 'STABLE' | 'UNSTABLE' | 'DEGRADED' | 'COLLAPSED' | 'RESTRICTED';
export type CorridorClass = 'TRADE_ROUTE' | 'SURVEY_PATH' | 'LATTICE_LINK' | 'EMERGENCY_TRANSIT' | 'ANCIENT';

export interface CorridorEdge {
  readonly corridorId: string;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly class: CorridorClass;
  readonly status: CorridorStatus;
  readonly transitTimeMinutes: number;
  readonly stabilityScore: number;
  readonly discoveredInGameYear: number | null;
  readonly isDirectional: boolean;
}

// ΓöÇΓöÇΓöÇ Cluster ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type ClusterAlignment =
  | 'CONCORD_CORE'
  | 'OUTER_ARC'
  | 'ASCENDANCY_SPHERE'
  | 'SURVEY_FRONTIER'
  | 'NEUTRAL_ZONE'
  | 'QUARANTINE_ZONE';

export interface WorldCluster {
  readonly clusterId: string;
  readonly name: string;
  readonly alignment: ClusterAlignment;
  readonly worldIds: readonly string[];
  readonly dominantFaction: string;
  readonly strategicValue: 'HIGH' | 'MEDIUM' | 'LOW';
  readonly summary: string;
}

// ΓöÇΓöÇΓöÇ Galaxy Stats ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface GalaxyStats {
  readonly totalWorlds: number;
  readonly activeWorlds: number;
  readonly totalCorridors: number;
  readonly stableCorridors: number;
  readonly launchWorldCount: number;
  readonly storyWorldCount: number;
  readonly totalDynasties: number;
  readonly totalChronicleEntries: number;
  readonly averageCorridorsPerWorld: number;
  readonly mostConnectedWorldId: string | null;
  readonly newestWorldId: string | null;
}

// ΓöÇΓöÇΓöÇ Route ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface GalaxyRoute {
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly hops: number;
  readonly corridorIds: readonly string[];
  readonly worldsVisited: readonly string[];
  readonly totalTransitMinutes: number;
  readonly isReachable: boolean;
}

// ΓöÇΓöÇΓöÇ Ports ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface GalaxyNodeStorePort {
  readonly getAllNodes: () => readonly WorldNode[];
  readonly getNodeById: (worldId: string) => WorldNode | undefined;
}

export interface GalaxyEdgeStorePort {
  readonly getAllEdges: () => readonly CorridorEdge[];
  readonly getEdgesForWorld: (worldId: string) => readonly CorridorEdge[];
}

export interface GalaxyClusterStorePort {
  readonly getAllClusters: () => readonly WorldCluster[];
}

export interface GalaxyStatsPort {
  readonly getStats: () => GalaxyStats;
}

// ΓöÇΓöÇΓöÇ BFS Route Finder ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function findGalaxyRoute(
  fromWorldId: string,
  toWorldId: string,
  edgeStore: GalaxyEdgeStorePort,
): GalaxyRoute {
  if (fromWorldId === toWorldId) {
    return {
      fromWorldId,
      toWorldId,
      hops: 0,
      corridorIds: [],
      worldsVisited: [fromWorldId],
      totalTransitMinutes: 0,
      isReachable: true,
    };
  }

  const allEdges = edgeStore.getAllEdges().filter((e) => e.status !== 'COLLAPSED');

  const adjacency = new Map<string, Array<{ worldId: string; corridorId: string; transitMinutes: number }>>();
  for (const edge of allEdges) {
    if (!adjacency.has(edge.fromWorldId)) adjacency.set(edge.fromWorldId, []);
    adjacency.get(edge.fromWorldId)!.push({
      worldId: edge.toWorldId,
      corridorId: edge.corridorId,
      transitMinutes: edge.transitTimeMinutes,
    });
    if (!edge.isDirectional) {
      if (!adjacency.has(edge.toWorldId)) adjacency.set(edge.toWorldId, []);
      adjacency.get(edge.toWorldId)!.push({
        worldId: edge.fromWorldId,
        corridorId: edge.corridorId,
        transitMinutes: edge.transitTimeMinutes,
      });
    }
  }

  const visited = new Set<string>([fromWorldId]);
  const queue: Array<{
    worldId: string;
    corridorIds: string[];
    worldsVisited: string[];
    totalMinutes: number;
  }> = [{ worldId: fromWorldId, corridorIds: [], worldsVisited: [fromWorldId], totalMinutes: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbours = adjacency.get(current.worldId) ?? [];
    for (const neighbour of neighbours) {
      if (visited.has(neighbour.worldId)) continue;
      visited.add(neighbour.worldId);
      const newCorridors = [...current.corridorIds, neighbour.corridorId];
      const newWorlds = [...current.worldsVisited, neighbour.worldId];
      const newMinutes = current.totalMinutes + neighbour.transitMinutes;
      if (neighbour.worldId === toWorldId) {
        return {
          fromWorldId,
          toWorldId,
          hops: newCorridors.length,
          corridorIds: newCorridors,
          worldsVisited: newWorlds,
          totalTransitMinutes: newMinutes,
          isReachable: true,
        };
      }
      queue.push({ worldId: neighbour.worldId, corridorIds: newCorridors, worldsVisited: newWorlds, totalMinutes: newMinutes });
    }
  }

  return {
    fromWorldId,
    toWorldId,
    hops: 0,
    corridorIds: [],
    worldsVisited: [fromWorldId],
    totalTransitMinutes: 0,
    isReachable: false,
  };
}

// ΓöÇΓöÇΓöÇ Query Functions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface GalaxyMapDeps {
  readonly nodes: GalaxyNodeStorePort;
  readonly edges: GalaxyEdgeStorePort;
  readonly clusters: GalaxyClusterStorePort;
  readonly stats: GalaxyStatsPort;
}

export interface GalaxyMapApi {
  readonly getAllNodes: () => readonly WorldNode[];
  readonly getNode: (worldId: string) => WorldNode | undefined;
  readonly getAllEdges: () => readonly CorridorEdge[];
  readonly getEdgesForWorld: (worldId: string) => readonly CorridorEdge[];
  readonly getAllClusters: () => readonly WorldCluster[];
  readonly getStats: () => GalaxyStats;
  readonly findRoute: (from: string, to: string) => GalaxyRoute;
  readonly getClusterForWorld: (worldId: string) => WorldCluster | undefined;
  readonly getNeighbourWorlds: (worldId: string) => readonly string[];
}

export function createGalaxyMapApi(deps: GalaxyMapDeps): GalaxyMapApi {
  return {
    getAllNodes: () => deps.nodes.getAllNodes(),

    getNode: (worldId) => deps.nodes.getNodeById(worldId),

    getAllEdges: () => deps.edges.getAllEdges(),

    getEdgesForWorld: (worldId) => deps.edges.getEdgesForWorld(worldId),

    getAllClusters: () => deps.clusters.getAllClusters(),

    getStats: () => deps.stats.getStats(),

    findRoute: (from, to) => findGalaxyRoute(from, to, deps.edges),

    getClusterForWorld: (worldId) =>
      deps.clusters.getAllClusters().find((c) => c.worldIds.includes(worldId)),

    getNeighbourWorlds: (worldId) => {
      const edges = deps.edges.getEdgesForWorld(worldId).filter((e) => e.status !== 'COLLAPSED');
      const neighbours = new Set<string>();
      for (const edge of edges) {
        if (edge.fromWorldId !== worldId) neighbours.add(edge.fromWorldId);
        if (edge.toWorldId !== worldId) neighbours.add(edge.toWorldId);
      }
      return [...neighbours];
    },
  };
}
