/**
 * Silfen Weave Network — Dynamic corridor management at galactic scale.
 *
 *   - Dynamic corridor network: new paths open from survey data
 *   - Corridor difficulty tiers: safe trade routes vs dangerous exploration
 *   - Wormhole stabilization: cooperative player missions for permanent links
 *   - Transit marketplace: trade during 3-minute Weave transit
 *   - Weave events: temporal anomalies, creatures, lost artifacts
 *   - Network visualization: galaxy-map connections
 *   - Cross-world economy: arbitrage detection and regulation
 *   - Emergency transit: Alliance rapid deployment corridors
 *
 * "The Paths Between demand respect."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface WeaveNetClockPort {
  readonly now: () => bigint;
}

export interface WeaveNetIdPort {
  readonly next: () => string;
}

export interface WeaveNetLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface WeaveNetEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface CorridorStorePort {
  readonly save: (corridor: WeaveCorridor) => Promise<void>;
  readonly getById: (corridorId: string) => Promise<WeaveCorridor | undefined>;
  readonly getByWorlds: (worldA: string, worldB: string) => Promise<WeaveCorridor | undefined>;
  readonly getAll: () => Promise<readonly WeaveCorridor[]>;
  readonly getConnectedWorlds: (worldId: string) => Promise<readonly WeaveCorridor[]>;
}

export interface TransitStorePort {
  readonly recordTransit: (transit: TransitRecord) => Promise<void>;
  readonly getActiveTransits: () => Promise<readonly TransitRecord[]>;
}

export interface PriceOraclePort {
  readonly getPrice: (worldId: string, commodityId: string) => Promise<number>;
}

// ─── Types ──────────────────────────────────────────────────────────

export type CorridorTier = 'trade-route' | 'standard' | 'hazardous' | 'uncharted' | 'emergency';

export type CorridorStatus = 'undiscovered' | 'unstable' | 'stabilizing' | 'stable' | 'closed';

export type WeaveEventType =
  | 'temporal-anomaly'
  | 'creature-encounter'
  | 'artifact-discovery'
  | 'storm-surge'
  | 'dimensional-rift'
  | 'merchant-caravan';

export interface WeaveCorridor {
  readonly corridorId: string;
  readonly worldIdA: string;
  readonly worldIdB: string;
  readonly tier: CorridorTier;
  readonly status: CorridorStatus;
  readonly stability: number;
  readonly transitDurationMs: number;
  readonly dangerRating: number;
  readonly tollKalon: number;
  readonly discoveredBy: string | undefined;
  readonly stabilizationContributors: readonly string[];
  readonly stabilizationProgress: number;
  readonly activeEvents: readonly WeaveEvent[];
  readonly trafficCount: number;
  readonly createdAt: bigint;
  readonly stabilizedAt: bigint | undefined;
}

export interface WeaveEvent {
  readonly eventId: string;
  readonly corridorId: string;
  readonly type: WeaveEventType;
  readonly severity: number;
  readonly description: string;
  readonly rewardsAvailable: boolean;
  readonly startsAt: bigint;
  readonly endsAt: bigint;
}

export interface TransitRecord {
  readonly transitId: string;
  readonly playerId: string;
  readonly corridorId: string;
  readonly sourceWorldId: string;
  readonly targetWorldId: string;
  readonly embarkedAt: bigint;
  readonly arrivesAt: bigint;
  readonly tradedItems: readonly TransitTrade[];
}

export interface TransitTrade {
  readonly itemId: string;
  readonly commodityId: string;
  readonly quantity: number;
  readonly pricePerUnit: number;
  readonly buyerPlayerId: string;
  readonly sellerPlayerId: string;
}

export interface StabilizationMission {
  readonly missionId: string;
  readonly corridorId: string;
  readonly participants: readonly string[];
  readonly requiredContributions: number;
  readonly currentContributions: number;
  readonly rewardPerPlayer: number;
  readonly startsAt: bigint;
  readonly expiresAt: bigint;
  readonly completed: boolean;
}

export interface ArbitrageOpportunity {
  readonly commodityId: string;
  readonly buyWorldId: string;
  readonly sellWorldId: string;
  readonly buyPrice: number;
  readonly sellPrice: number;
  readonly profitMargin: number;
  readonly corridorId: string;
}

export interface NetworkTopology {
  readonly worldCount: number;
  readonly corridorCount: number;
  readonly avgConnectivity: number;
  readonly isolatedWorlds: readonly string[];
  readonly hubWorlds: readonly string[];
}

export interface EmergencyCorridorRequest {
  readonly requestId: string;
  readonly sourceWorldId: string;
  readonly targetWorldId: string;
  readonly allianceId: string;
  readonly reason: string;
  readonly expiresAt: bigint;
  readonly approved: boolean;
}

// ─── Config ─────────────────────────────────────────────────────────

export interface WeaveNetworkConfig {
  readonly defaultTransitMs: number;
  readonly stabilizationThreshold: number;
  readonly maxEventsPer: number;
  readonly arbitrageAlertThreshold: number;
  readonly emergencyCorridorDurationMs: number;
  readonly tradeRouteMinTraffic: number;
}

// ─── Stats ──────────────────────────────────────────────────────────

export interface WeaveNetworkStats {
  readonly corridorsTotal: number;
  readonly corridorsStable: number;
  readonly transitsCompleted: number;
  readonly eventsGenerated: number;
  readonly stabilizationMissions: number;
  readonly emergencyCorridors: number;
  readonly arbitrageAlerts: number;
  readonly transitTrades: number;
}

// ─── Interface ──────────────────────────────────────────────────────

export interface WeaveNetworkEngine {
  // Corridors
  readonly discoverCorridor: (worldA: string, worldB: string, discoveredBy: string, tier: CorridorTier) => Promise<WeaveCorridor>;
  readonly getCorridor: (corridorId: string) => Promise<WeaveCorridor | undefined>;
  readonly getConnections: (worldId: string) => Promise<readonly WeaveCorridor[]>;
  readonly closeCorridor: (corridorId: string, reason: string) => Promise<void>;

  // Stabilization
  readonly startStabilization: (corridorId: string, playerIds: readonly string[]) => Promise<StabilizationMission>;
  readonly contributeStabilization: (missionId: string, playerId: string) => Promise<StabilizationMission>;

  // Transit
  readonly embarkTransit: (playerId: string, corridorId: string) => Promise<TransitRecord>;
  readonly executeTransitTrade: (transitId: string, trade: Omit<TransitTrade, 'itemId'>) => Promise<TransitTrade>;

  // Events
  readonly generateWeaveEvent: (corridorId: string, type: WeaveEventType) => Promise<WeaveEvent>;
  readonly getActiveWeaveEvents: () => readonly WeaveEvent[];

  // Economy
  readonly detectArbitrage: (commodityId: string) => Promise<readonly ArbitrageOpportunity[]>;

  // Emergency
  readonly requestEmergencyCorridor: (source: string, target: string, allianceId: string, reason: string) => Promise<EmergencyCorridorRequest>;

  // Analysis
  readonly analyzeTopology: () => Promise<NetworkTopology>;

  readonly getStats: () => WeaveNetworkStats;
}

// ─── Deps ───────────────────────────────────────────────────────────

export interface WeaveNetworkDeps {
  readonly clock: WeaveNetClockPort;
  readonly id: WeaveNetIdPort;
  readonly log: WeaveNetLogPort;
  readonly events: WeaveNetEventPort;
  readonly corridors: CorridorStorePort;
  readonly transits: TransitStorePort;
  readonly prices: PriceOraclePort;
}

// ─── Defaults ───────────────────────────────────────────────────────

const DEFAULT_CONFIG: WeaveNetworkConfig = {
  defaultTransitMs: 3 * 60 * 1000,
  stabilizationThreshold: 0.9,
  maxEventsPer: 3,
  arbitrageAlertThreshold: 0.5,
  emergencyCorridorDurationMs: 24 * 60 * 60 * 1000,
  tradeRouteMinTraffic: 100,
};

const TIER_DANGER: Record<CorridorTier, number> = {
  'trade-route': 0.05,
  'standard': 0.2,
  'hazardous': 0.6,
  'uncharted': 0.9,
  'emergency': 0.1,
};

// ─── Factory ────────────────────────────────────────────────────────

export function createWeaveNetworkEngine(
  deps: WeaveNetworkDeps,
  config: Partial<WeaveNetworkConfig> = {},
): WeaveNetworkEngine {
  const cfg: WeaveNetworkConfig = { ...DEFAULT_CONFIG, ...config };

  const missions = new Map<string, StabilizationMission>();
  const activeTransits = new Map<string, TransitRecord>();
  const activeWeaveEvents: WeaveEvent[] = [];

  let corridorsTotal = 0;
  let corridorsStable = 0;
  let transitsCompleted = 0;
  let eventsGenerated = 0;
  let stabilizationMissions = 0;
  let emergencyCorridors = 0;
  let arbitrageAlerts = 0;
  let transitTrades = 0;

  async function discoverCorridor(
    worldA: string,
    worldB: string,
    discoveredBy: string,
    tier: CorridorTier,
  ): Promise<WeaveCorridor> {
    const existing = await deps.corridors.getByWorlds(worldA, worldB);
    if (existing !== undefined) return existing;

    const corridor: WeaveCorridor = {
      corridorId: deps.id.next(),
      worldIdA: worldA,
      worldIdB: worldB,
      tier,
      status: 'unstable',
      stability: 0.1,
      transitDurationMs: cfg.defaultTransitMs,
      dangerRating: TIER_DANGER[tier],
      tollKalon: tier === 'trade-route' ? 50 : tier === 'emergency' ? 0 : 100,
      discoveredBy,
      stabilizationContributors: [],
      stabilizationProgress: 0,
      activeEvents: [],
      trafficCount: 0,
      createdAt: deps.clock.now(),
      stabilizedAt: undefined,
    };

    await deps.corridors.save(corridor);
    corridorsTotal++;
    deps.log.info('corridor-discovered', { corridorId: corridor.corridorId, worldA, worldB, tier });
    return corridor;
  }

  async function getCorridor(corridorId: string): Promise<WeaveCorridor | undefined> {
    return deps.corridors.getById(corridorId);
  }

  async function getConnections(worldId: string): Promise<readonly WeaveCorridor[]> {
    return deps.corridors.getConnectedWorlds(worldId);
  }

  async function closeCorridor(corridorId: string, reason: string): Promise<void> {
    const corridor = await deps.corridors.getById(corridorId);
    if (corridor === undefined) throw new Error(`Corridor ${corridorId} not found`);

    await deps.corridors.save({ ...corridor, status: 'closed' });
    deps.log.warn('corridor-closed', { corridorId, reason });
  }

  async function startStabilization(corridorId: string, playerIds: readonly string[]): Promise<StabilizationMission> {
    const corridor = await deps.corridors.getById(corridorId);
    if (corridor === undefined) throw new Error(`Corridor ${corridorId} not found`);

    const mission: StabilizationMission = {
      missionId: deps.id.next(),
      corridorId,
      participants: playerIds,
      requiredContributions: 10,
      currentContributions: 0,
      rewardPerPlayer: 500,
      startsAt: deps.clock.now(),
      expiresAt: deps.clock.now() + BigInt(cfg.emergencyCorridorDurationMs),
      completed: false,
    };

    missions.set(mission.missionId, mission);
    stabilizationMissions++;
    deps.log.info('stabilization-started', { missionId: mission.missionId, corridorId, participants: playerIds.length });
    return mission;
  }

  async function contributeStabilization(missionId: string, playerId: string): Promise<StabilizationMission> {
    const mission = missions.get(missionId);
    if (mission === undefined) throw new Error(`Mission ${missionId} not found`);
    if (mission.completed) throw new Error('Mission already completed');

    const updated: StabilizationMission = {
      ...mission,
      currentContributions: mission.currentContributions + 1,
      completed: mission.currentContributions + 1 >= mission.requiredContributions,
    };
    missions.set(missionId, updated);

    if (updated.completed) {
      const corridor = await deps.corridors.getById(mission.corridorId);
      if (corridor !== undefined) {
        await deps.corridors.save({
          ...corridor,
          status: 'stable',
          stability: 1.0,
          stabilizationProgress: 1.0,
          stabilizedAt: deps.clock.now(),
        });
        corridorsStable++;
        deps.log.info('corridor-stabilized', { corridorId: mission.corridorId });
      }
    }

    return updated;
  }

  async function embarkTransit(playerId: string, corridorId: string): Promise<TransitRecord> {
    const corridor = await deps.corridors.getById(corridorId);
    if (corridor === undefined) throw new Error(`Corridor ${corridorId} not found`);
    if (corridor.status === 'closed') throw new Error('Corridor is closed');

    const now = deps.clock.now();
    const transit: TransitRecord = {
      transitId: deps.id.next(),
      playerId,
      corridorId,
      sourceWorldId: corridor.worldIdA,
      targetWorldId: corridor.worldIdB,
      embarkedAt: now,
      arrivesAt: now + BigInt(corridor.transitDurationMs),
      tradedItems: [],
    };

    activeTransits.set(transit.transitId, transit);
    await deps.transits.recordTransit(transit);
    await deps.corridors.save({ ...corridor, trafficCount: corridor.trafficCount + 1 });
    transitsCompleted++;

    deps.log.info('transit-embarked', { transitId: transit.transitId, playerId, corridorId });
    return transit;
  }

  async function executeTransitTrade(transitId: string, trade: Omit<TransitTrade, 'itemId'>): Promise<TransitTrade> {
    const transit = activeTransits.get(transitId);
    if (transit === undefined) throw new Error(`Transit ${transitId} not found`);

    const fullTrade: TransitTrade = { ...trade, itemId: deps.id.next() };
    const mutableItems = [...transit.tradedItems, fullTrade];
    activeTransits.set(transitId, { ...transit, tradedItems: mutableItems });
    transitTrades++;

    deps.log.info('transit-trade', { transitId, commodity: trade.commodityId, quantity: trade.quantity });
    return fullTrade;
  }

  async function generateWeaveEvent(corridorId: string, type: WeaveEventType): Promise<WeaveEvent> {
    const now = deps.clock.now();
    const event: WeaveEvent = {
      eventId: deps.id.next(),
      corridorId,
      type,
      severity: Math.random(),
      description: `${type} event in corridor ${corridorId}`,
      rewardsAvailable: type === 'artifact-discovery' || type === 'merchant-caravan',
      startsAt: now,
      endsAt: now + BigInt(60 * 60 * 1000),
    };

    activeWeaveEvents.push(event);
    eventsGenerated++;
    deps.log.info('weave-event-generated', { eventId: event.eventId, type, corridorId });
    return event;
  }

  function getActiveWeaveEvents(): readonly WeaveEvent[] {
    const now = deps.clock.now();
    return activeWeaveEvents.filter(e => e.startsAt <= now && e.endsAt > now);
  }

  async function detectArbitrage(commodityId: string): Promise<readonly ArbitrageOpportunity[]> {
    const allCorridors = await deps.corridors.getAll();
    const worldPrices = new Map<string, number>();

    const worldIds = new Set<string>();
    for (const c of allCorridors) {
      if (c.status === 'stable' || c.status === 'unstable') {
        worldIds.add(c.worldIdA);
        worldIds.add(c.worldIdB);
      }
    }

    for (const worldId of worldIds) {
      worldPrices.set(worldId, await deps.prices.getPrice(worldId, commodityId));
    }

    const opportunities: ArbitrageOpportunity[] = [];
    for (const corridor of allCorridors) {
      if (corridor.status !== 'stable') continue;

      const priceA = worldPrices.get(corridor.worldIdA) ?? 0;
      const priceB = worldPrices.get(corridor.worldIdB) ?? 0;

      if (priceA > 0 && priceB > 0) {
        const margin = Math.abs(priceA - priceB) / Math.min(priceA, priceB);
        if (margin >= cfg.arbitrageAlertThreshold) {
          const buyWorld = priceA < priceB ? corridor.worldIdA : corridor.worldIdB;
          const sellWorld = priceA < priceB ? corridor.worldIdB : corridor.worldIdA;
          opportunities.push({
            commodityId,
            buyWorldId: buyWorld,
            sellWorldId: sellWorld,
            buyPrice: Math.min(priceA, priceB),
            sellPrice: Math.max(priceA, priceB),
            profitMargin: margin,
            corridorId: corridor.corridorId,
          });
          arbitrageAlerts++;
        }
      }
    }

    return opportunities;
  }

  async function requestEmergencyCorridor(
    source: string,
    target: string,
    allianceId: string,
    reason: string,
  ): Promise<EmergencyCorridorRequest> {
    const request: EmergencyCorridorRequest = {
      requestId: deps.id.next(),
      sourceWorldId: source,
      targetWorldId: target,
      allianceId,
      reason,
      expiresAt: deps.clock.now() + BigInt(cfg.emergencyCorridorDurationMs),
      approved: true,
    };

    await discoverCorridor(source, target, `alliance:${allianceId}`, 'emergency');
    emergencyCorridors++;
    deps.log.info('emergency-corridor-opened', { source, target, allianceId });
    return request;
  }

  async function analyzeTopology(): Promise<NetworkTopology> {
    const allCorridors = await deps.corridors.getAll();
    const worldAdj = new Map<string, Set<string>>();

    for (const c of allCorridors) {
      if (c.status === 'closed') continue;
      if (!worldAdj.has(c.worldIdA)) worldAdj.set(c.worldIdA, new Set());
      if (!worldAdj.has(c.worldIdB)) worldAdj.set(c.worldIdB, new Set());
      worldAdj.get(c.worldIdA)!.add(c.worldIdB);
      worldAdj.get(c.worldIdB)!.add(c.worldIdA);
    }

    const worldCount = worldAdj.size;
    const corridorCount = allCorridors.filter(c => c.status !== 'closed').length;
    let totalDegree = 0;
    const isolated: string[] = [];
    const hubs: string[] = [];

    for (const [worldId, neighbors] of worldAdj) {
      totalDegree += neighbors.size;
      if (neighbors.size === 0) isolated.push(worldId);
      if (neighbors.size >= 5) hubs.push(worldId);
    }

    return {
      worldCount,
      corridorCount,
      avgConnectivity: worldCount > 0 ? totalDegree / worldCount : 0,
      isolatedWorlds: isolated,
      hubWorlds: hubs,
    };
  }

  function getStats(): WeaveNetworkStats {
    return {
      corridorsTotal,
      corridorsStable,
      transitsCompleted,
      eventsGenerated,
      stabilizationMissions,
      emergencyCorridors,
      arbitrageAlerts,
      transitTrades,
    };
  }

  deps.log.info('weave-network-engine-created', { defaultTransitMs: cfg.defaultTransitMs });

  return {
    discoverCorridor,
    getCorridor,
    getConnections,
    closeCorridor,
    startStabilization,
    contributeStabilization,
    embarkTransit,
    executeTransitTrade,
    generateWeaveEvent,
    getActiveWeaveEvents,
    detectArbitrage,
    requestEmergencyCorridor,
    analyzeTopology,
    getStats,
  };
}
