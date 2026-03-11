/**
 * Adaptive World Systems — self-improving world that responds to player behavior.
 *
 *   - Density-responsive spawning: more content in popular areas
 *   - Resource regeneration tuning: adjusts based on extraction rates
 *   - NPC population dynamics: birth rates, migration, profession shifts
 *   - World event generator: wars, plagues, golden ages from aggregate behavior
 *   - Climate change simulation: player industry affects weather over years
 *   - Trade route emergence: traveled paths become roads, then highways
 *   - Abandoned area decay: unused zones revert to wilderness
 *   - Self-balancing economy: ML-driven parameter adjustment
 *
 * "The world remembers, adapts, and evolves."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface AdaptiveClockPort {
  readonly now: () => bigint;
}

export interface AdaptiveIdPort {
  readonly next: () => string;
}

export interface AdaptiveLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface AdaptiveEventPort {
  readonly emit: (event: LoomEvent) => void;
}

// ─── Event Helper ───────────────────────────────────────────────

function makeEvent(
  type: string,
  payload: unknown,
  ids: AdaptiveIdPort,
  clock: AdaptiveClockPort,
): LoomEvent {
  return {
    type,
    payload,
    metadata: {
      eventId: ids.next(),
      correlationId: ids.next(),
      causationId: null,
      timestamp: Number(clock.now()),
      sequenceNumber: 0,
      sourceWorldId: '',
      sourceFabricId: 'adaptive-world',
      schemaVersion: 1,
    },
  };
}

export interface AdaptiveStorePort {
  readonly saveDensityMap: (zoneId: string, map: ZoneDensityMap) => Promise<void>;
  readonly getDensityMap: (zoneId: string) => Promise<ZoneDensityMap | undefined>;
  readonly saveResourceState: (zoneId: string, state: ResourceRegenState) => Promise<void>;
  readonly getResourceState: (zoneId: string) => Promise<ResourceRegenState | undefined>;
  readonly savePopulationSnapshot: (worldId: string, snap: PopulationSnapshot) => Promise<void>;
  readonly getPopulationSnapshot: (worldId: string) => Promise<PopulationSnapshot | undefined>;
  readonly saveDecayState: (zoneId: string, state: DecayState) => Promise<void>;
  readonly getDecayState: (zoneId: string) => Promise<DecayState | undefined>;
  readonly saveAdaptiveTradeRoute: (route: AdaptiveTradeRoute) => Promise<void>;
  readonly getAdaptiveTradeRoutes: (worldId: string) => Promise<readonly AdaptiveTradeRoute[]>;
  readonly saveEconomySnapshot: (worldId: string, snap: EconomyBalanceSnapshot) => Promise<void>;
  readonly getEconomySnapshot: (worldId: string) => Promise<EconomyBalanceSnapshot | undefined>;
}

export interface AdaptiveMetricsPort {
  readonly getZonePlayerCount: (zoneId: string, windowMs: number) => Promise<number>;
  readonly getZoneActivity: (zoneId: string, windowMs: number) => Promise<ZoneActivityMetrics>;
  readonly getResourceExtractionRate: (zoneId: string, resourceType: string) => Promise<number>;
  readonly getPathTraversals: (fromZoneId: string, toZoneId: string, windowMs: number) => Promise<number>;
  readonly getEconomyMetrics: (worldId: string) => Promise<EconomyMetrics>;
}

export interface EconomyModelPort {
  readonly recommend: (current: EconomyMetrics, history: readonly EconomyMetrics[]) => Promise<EconomyAdjustment>;
}

// ─── Constants ──────────────────────────────────────────────────────

const DENSITY_HIGH_THRESHOLD = 50;
const DENSITY_MEDIUM_THRESHOLD = 20;
const DENSITY_LOW_THRESHOLD = 5;
const MAX_SPAWN_MULTIPLIER = 3.0;
const MIN_SPAWN_MULTIPLIER = 0.3;

const RESOURCE_REGEN_MIN_RATE = 0.1;
const RESOURCE_REGEN_MAX_RATE = 5.0;
const RESOURCE_DEPLETION_THRESHOLD = 0.2;
const RESOURCE_ABUNDANCE_THRESHOLD = 0.8;

const POPULATION_GROWTH_BASE = 0.02;
const MIGRATION_THRESHOLD = 0.3;
const MAX_PROFESSION_SHIFT_RATE = 0.1;

const DECAY_START_DAYS_ABANDONED = 30;
const DECAY_FULL_WILDERNESS_DAYS = 365;
const DECAY_RATE_PER_DAY = 1 / (DECAY_FULL_WILDERNESS_DAYS - DECAY_START_DAYS_ABANDONED);

const TRADE_ROUTE_FOOTPATH_THRESHOLD = 10;
const TRADE_ROUTE_ROAD_THRESHOLD = 50;
const TRADE_ROUTE_HIGHWAY_THRESHOLD = 200;

const CLIMATE_INDUSTRY_IMPACT_RATE = 0.001;
const CLIMATE_RECOVERY_RATE = 0.0002;
const MAX_CLIMATE_SHIFT = 5.0;

const ECONOMY_HISTORY_WINDOW = 30;

// ─── Types ──────────────────────────────────────────────────────────

export type AdaptiveDensityTier = 'empty' | 'low' | 'medium' | 'high' | 'overcrowded';

export interface ZoneDensityMap {
  readonly zoneId: string;
  readonly playerCount: number;
  readonly tier: AdaptiveDensityTier;
  readonly spawnMultiplier: number;
  readonly contentBias: ContentBias;
  readonly lastUpdatedAt: bigint;
}

export interface ContentBias {
  readonly questDensity: number;
  readonly npcDensity: number;
  readonly eventFrequency: number;
  readonly lootQualityBonus: number;
}

export interface ZoneActivityMetrics {
  readonly playerMinutes: number;
  readonly combatEvents: number;
  readonly tradeEvents: number;
  readonly explorationEvents: number;
  readonly buildEvents: number;
}

export interface ResourceRegenState {
  readonly zoneId: string;
  readonly resources: readonly ResourceEntry[];
  readonly lastAdjustedAt: bigint;
}

export interface ResourceEntry {
  readonly resourceType: string;
  readonly currentLevel: number;
  readonly maxLevel: number;
  readonly regenRate: number;
  readonly extractionRate: number;
}

export interface PopulationSnapshot {
  readonly worldId: string;
  readonly totalPopulation: number;
  readonly zones: readonly ZonePopulation[];
  readonly professionDistribution: ReadonlyMap<string, number>;
  readonly birthRate: number;
  readonly deathRate: number;
  readonly migrationEvents: number;
  readonly capturedAt: bigint;
}

export interface ZonePopulation {
  readonly zoneId: string;
  readonly population: number;
  readonly prosperity: number;
  readonly professions: ReadonlyMap<string, number>;
}

export type AdaptiveWorldEventType =
  | 'war'
  | 'plague'
  | 'golden-age'
  | 'famine'
  | 'revolution'
  | 'natural-disaster'
  | 'technological-leap'
  | 'cultural-renaissance';

export interface AdaptiveWorldEvent {
  readonly id: string;
  readonly type: AdaptiveWorldEventType;
  readonly worldId: string;
  readonly affectedZones: readonly string[];
  readonly severity: number;
  readonly trigger: WorldEventTrigger;
  readonly duration: number;
  readonly effects: WorldEventEffects;
  readonly startedAt: bigint;
}

export interface WorldEventTrigger {
  readonly metric: string;
  readonly threshold: number;
  readonly currentValue: number;
  readonly direction: 'above' | 'below';
}

export interface WorldEventEffects {
  readonly populationChange: number;
  readonly economyChange: number;
  readonly resourceChange: number;
  readonly reputationChange: number;
}

export type AdaptiveTradeRouteTier = 'footpath' | 'road' | 'highway';

export interface AdaptiveTradeRoute {
  readonly id: string;
  readonly worldId: string;
  readonly fromZoneId: string;
  readonly toZoneId: string;
  readonly tier: AdaptiveTradeRouteTier;
  readonly traversals: number;
  readonly speedBonus: number;
  readonly establishedAt: bigint;
}

export interface DecayState {
  readonly zoneId: string;
  readonly daysAbandoned: number;
  readonly decayProgress: number;
  readonly stage: DecayStage;
  readonly lastVisitedAt: bigint;
}

export type DecayStage = 'maintained' | 'neglected' | 'deteriorating' | 'ruined' | 'wilderness';

export interface AdaptiveClimateState {
  readonly worldId: string;
  readonly temperatureShift: number;
  readonly pollutionLevel: number;
  readonly industrialActivity: number;
  readonly weatherSeverity: number;
}

export interface EconomyMetrics {
  readonly worldId: string;
  readonly giniCoefficient: number;
  readonly inflation: number;
  readonly averageWealth: number;
  readonly tradeVolume: number;
  readonly unemployment: number;
  readonly capturedAt: bigint;
}

export interface EconomyAdjustment {
  readonly taxRate: number;
  readonly npcPriceMultiplier: number;
  readonly questRewardMultiplier: number;
  readonly dropRateMultiplier: number;
  readonly rationale: string;
}

export interface EconomyBalanceSnapshot {
  readonly worldId: string;
  readonly metrics: EconomyMetrics;
  readonly adjustment: EconomyAdjustment;
  readonly appliedAt: bigint;
}

// ─── Deps & Config ──────────────────────────────────────────────────

export interface AdaptiveWorldDeps {
  readonly clock: AdaptiveClockPort;
  readonly ids: AdaptiveIdPort;
  readonly log: AdaptiveLogPort;
  readonly events: AdaptiveEventPort;
  readonly store: AdaptiveStorePort;
  readonly metrics: AdaptiveMetricsPort;
  readonly economyModel: EconomyModelPort;
}

export interface AdaptiveWorldConfig {
  readonly densityWindowMs: number;
  readonly resourceAdjustIntervalMs: number;
  readonly decayCheckIntervalDays: number;
  readonly economyHistoryWindow: number;
  readonly maxClimateShift: number;
}

const DEFAULT_CONFIG: AdaptiveWorldConfig = {
  densityWindowMs: 3_600_000,
  resourceAdjustIntervalMs: 86_400_000,
  decayCheckIntervalDays: 1,
  economyHistoryWindow: ECONOMY_HISTORY_WINDOW,
  maxClimateShift: MAX_CLIMATE_SHIFT,
};

// ─── Service Interface ──────────────────────────────────────────────

export interface AdaptiveWorldEngine {
  readonly updateZoneDensity: (zoneId: string) => Promise<ZoneDensityMap>;
  readonly adjustResourceRegen: (zoneId: string) => Promise<ResourceRegenState>;
  readonly computePopulationDynamics: (worldId: string, zones: readonly ZonePopulation[]) => Promise<PopulationSnapshot>;
  readonly evaluateWorldEvents: (worldId: string, metrics: ZoneActivityMetrics) => Promise<readonly AdaptiveWorldEvent[]>;
  readonly updateClimate: (worldId: string, industrialActivity: number) => AdaptiveClimateState;
  readonly updateTradeRoutes: (worldId: string, fromZoneId: string, toZoneId: string) => Promise<AdaptiveTradeRoute>;
  readonly processDecay: (zoneId: string, daysSinceVisit: number) => Promise<DecayState>;
  readonly balanceEconomy: (worldId: string) => Promise<EconomyBalanceSnapshot>;
  readonly getAdaptiveStats: () => AdaptiveWorldStats;
}

export interface AdaptiveWorldStats {
  readonly densityUpdates: number;
  readonly resourceAdjustments: number;
  readonly worldEventsGenerated: number;
  readonly tradeRoutesCreated: number;
  readonly economyRebalances: number;
  readonly zonesDecayed: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createAdaptiveWorldEngine(
  deps: AdaptiveWorldDeps,
  config?: Partial<AdaptiveWorldConfig>,
): AdaptiveWorldEngine {
  const cfg: AdaptiveWorldConfig = { ...DEFAULT_CONFIG, ...config };
  const { clock, ids, log, events, store, metrics, economyModel } = deps;

  const climateStates = new Map<string, AdaptiveClimateState>();
  const economyHistory = new Map<string, EconomyMetrics[]>();

  let densityUpdates = 0;
  let resourceAdjustments = 0;
  let worldEventsGenerated = 0;
  let tradeRoutesCreated = 0;
  let economyRebalances = 0;
  let zonesDecayed = 0;

  // ── Density-responsive spawning ─────────────────────────────────

  async function updateZoneDensity(zoneId: string): Promise<ZoneDensityMap> {
    const playerCount = await metrics.getZonePlayerCount(zoneId, cfg.densityWindowMs);
    const tier = classifyDensity(playerCount);
    const spawnMultiplier = computeSpawnMultiplier(tier, playerCount);
    const contentBias = computeContentBias(tier);

    const map: ZoneDensityMap = {
      zoneId,
      playerCount,
      tier,
      spawnMultiplier,
      contentBias,
      lastUpdatedAt: clock.now(),
    };

    await store.saveDensityMap(zoneId, map);
    densityUpdates++;

    events.emit(makeEvent(
      'adaptive.density.updated',
      { zoneId, tier, spawnMultiplier },
      ids, clock,
    ));

    log.info('zone density updated', { zoneId, tier, playerCount });
    return map;
  }

  function classifyDensity(count: number): AdaptiveDensityTier {
    if (count >= DENSITY_HIGH_THRESHOLD * 2) return 'overcrowded';
    if (count >= DENSITY_HIGH_THRESHOLD) return 'high';
    if (count >= DENSITY_MEDIUM_THRESHOLD) return 'medium';
    if (count >= DENSITY_LOW_THRESHOLD) return 'low';
    return 'empty';
  }

  function computeSpawnMultiplier(tier: AdaptiveDensityTier, count: number): number {
    switch (tier) {
      case 'overcrowded': return MAX_SPAWN_MULTIPLIER;
      case 'high': return 1.5 + (count - DENSITY_HIGH_THRESHOLD) / DENSITY_HIGH_THRESHOLD;
      case 'medium': return 1.0 + (count - DENSITY_MEDIUM_THRESHOLD) / (DENSITY_HIGH_THRESHOLD - DENSITY_MEDIUM_THRESHOLD) * 0.5;
      case 'low': return 0.7;
      case 'empty': return MIN_SPAWN_MULTIPLIER;
    }
  }

  function computeContentBias(tier: AdaptiveDensityTier): ContentBias {
    switch (tier) {
      case 'overcrowded':
        return { questDensity: 2.0, npcDensity: 1.5, eventFrequency: 2.5, lootQualityBonus: 0.0 };
      case 'high':
        return { questDensity: 1.5, npcDensity: 1.3, eventFrequency: 1.8, lootQualityBonus: 0.1 };
      case 'medium':
        return { questDensity: 1.0, npcDensity: 1.0, eventFrequency: 1.0, lootQualityBonus: 0.0 };
      case 'low':
        return { questDensity: 0.7, npcDensity: 0.8, eventFrequency: 0.5, lootQualityBonus: 0.2 };
      case 'empty':
        return { questDensity: 0.3, npcDensity: 0.5, eventFrequency: 0.2, lootQualityBonus: 0.5 };
    }
  }

  // ── Resource regeneration tuning ────────────────────────────────

  async function adjustResourceRegen(zoneId: string): Promise<ResourceRegenState> {
    const existing = await store.getResourceState(zoneId);
    const resources: ResourceEntry[] = existing?.resources
      ? await Promise.all([...existing.resources].map(async (r) => {
          const extraction = await metrics.getResourceExtractionRate(zoneId, r.resourceType);
          return tuneResourceEntry(r, extraction);
        }))
      : [];

    const state: ResourceRegenState = {
      zoneId,
      resources,
      lastAdjustedAt: clock.now(),
    };

    await store.saveResourceState(zoneId, state);
    resourceAdjustments++;
    log.info('resource regen adjusted', { zoneId, count: resources.length });
    return state;
  }

  function tuneResourceEntry(entry: ResourceEntry, extractionRate: number): ResourceEntry {
    const ratio = entry.currentLevel / entry.maxLevel;
    let newRate = entry.regenRate;

    if (ratio < RESOURCE_DEPLETION_THRESHOLD) {
      newRate = Math.min(entry.regenRate * 1.5, RESOURCE_REGEN_MAX_RATE);
    } else if (ratio > RESOURCE_ABUNDANCE_THRESHOLD && extractionRate < entry.regenRate * 0.5) {
      newRate = Math.max(entry.regenRate * 0.8, RESOURCE_REGEN_MIN_RATE);
    }

    return { ...entry, regenRate: newRate, extractionRate };
  }

  // ── NPC population dynamics ─────────────────────────────────────

  async function computePopulationDynamics(
    worldId: string,
    zones: readonly ZonePopulation[],
  ): Promise<PopulationSnapshot> {
    let totalPop = 0;
    let totalBirths = 0;
    let totalDeaths = 0;
    let migrations = 0;

    const professionTotals = new Map<string, number>();
    const updatedZones: ZonePopulation[] = [];

    const avgProsperity = zones.reduce((s, z) => s + z.prosperity, 0) / Math.max(zones.length, 1);

    for (const zone of zones) {
      const growthRate = POPULATION_GROWTH_BASE * zone.prosperity;
      const births = Math.floor(zone.population * Math.max(growthRate, 0));
      const deaths = Math.floor(zone.population * POPULATION_GROWTH_BASE * 0.8);
      let pop = zone.population + births - deaths;

      if (zone.prosperity < avgProsperity - MIGRATION_THRESHOLD) {
        const emigrants = Math.floor(pop * 0.05);
        pop -= emigrants;
        migrations += emigrants;
      } else if (zone.prosperity > avgProsperity + MIGRATION_THRESHOLD) {
        const immigrants = Math.floor(pop * 0.03);
        pop += immigrants;
      }

      totalPop += pop;
      totalBirths += births;
      totalDeaths += deaths;

      const newProfs = shiftProfessions(zone.professions, zone.prosperity);
      for (const [prof, count] of newProfs) {
        professionTotals.set(prof, (professionTotals.get(prof) ?? 0) + count);
      }

      updatedZones.push({ ...zone, population: pop, professions: newProfs });
    }

    const snapshot: PopulationSnapshot = {
      worldId,
      totalPopulation: totalPop,
      zones: updatedZones,
      professionDistribution: professionTotals,
      birthRate: totalBirths / Math.max(totalPop, 1),
      deathRate: totalDeaths / Math.max(totalPop, 1),
      migrationEvents: migrations,
      capturedAt: clock.now(),
    };

    await store.savePopulationSnapshot(worldId, snapshot);

    events.emit(makeEvent(
      'adaptive.population.updated',
      { worldId, totalPopulation: totalPop, migrations },
      ids, clock,
    ));

    return snapshot;
  }

  function shiftProfessions(
    current: ReadonlyMap<string, number>,
    prosperity: number,
  ): ReadonlyMap<string, number> {
    const shifted = new Map<string, number>();
    for (const [prof, count] of current) {
      const shift = prosperity > 0.7
        ? (prof === 'artisan' || prof === 'scholar' ? MAX_PROFESSION_SHIFT_RATE : -MAX_PROFESSION_SHIFT_RATE * 0.5)
        : (prof === 'laborer' || prof === 'soldier' ? MAX_PROFESSION_SHIFT_RATE : 0);
      shifted.set(prof, Math.max(0, count + Math.floor(count * shift)));
    }
    return shifted;
  }

  // ── World event generator ───────────────────────────────────────

  async function evaluateWorldEvents(
    worldId: string,
    activity: ZoneActivityMetrics,
  ): Promise<readonly AdaptiveWorldEvent[]> {
    const generated: AdaptiveWorldEvent[] = [];

    const triggers: ReadonlyArray<{
      readonly type: AdaptiveWorldEventType;
      readonly metric: string;
      readonly threshold: number;
      readonly value: number;
      readonly direction: 'above' | 'below';
    }> = [
      { type: 'war', metric: 'combatEvents', threshold: 500, value: activity.combatEvents, direction: 'above' },
      { type: 'golden-age', metric: 'tradeEvents', threshold: 1000, value: activity.tradeEvents, direction: 'above' },
      { type: 'cultural-renaissance', metric: 'buildEvents', threshold: 300, value: activity.buildEvents, direction: 'above' },
      { type: 'famine', metric: 'tradeEvents', threshold: 50, value: activity.tradeEvents, direction: 'below' },
    ];

    for (const t of triggers) {
      const fired = t.direction === 'above'
        ? t.value >= t.threshold
        : t.value <= t.threshold;

      if (fired) {
        const evt: AdaptiveWorldEvent = {
          id: ids.next(),
          type: t.type,
          worldId,
          affectedZones: [],
          severity: Math.min(1.0, t.value / (t.threshold * 2)),
          trigger: {
            metric: t.metric,
            threshold: t.threshold,
            currentValue: t.value,
            direction: t.direction,
          },
          duration: computeEventDuration(t.type),
          effects: computeEventEffects(t.type),
          startedAt: clock.now(),
        };

        generated.push(evt);
        worldEventsGenerated++;

        events.emit(makeEvent(
          'adaptive.world-event.triggered',
          { worldId, eventType: t.type, severity: evt.severity },
          ids, clock,
        ));

        log.info('world event triggered', { worldId, type: t.type });
      }
    }

    return generated;
  }

  function computeEventDuration(type: AdaptiveWorldEventType): number {
    const durations: Record<AdaptiveWorldEventType, number> = {
      'war': 90,
      'plague': 60,
      'golden-age': 120,
      'famine': 45,
      'revolution': 30,
      'natural-disaster': 14,
      'technological-leap': 180,
      'cultural-renaissance': 150,
    };
    return durations[type];
  }

  function computeEventEffects(type: AdaptiveWorldEventType): WorldEventEffects {
    const effects: Record<AdaptiveWorldEventType, WorldEventEffects> = {
      'war': { populationChange: -0.15, economyChange: -0.2, resourceChange: -0.3, reputationChange: 0.1 },
      'plague': { populationChange: -0.25, economyChange: -0.1, resourceChange: 0.05, reputationChange: -0.1 },
      'golden-age': { populationChange: 0.1, economyChange: 0.3, resourceChange: 0.1, reputationChange: 0.2 },
      'famine': { populationChange: -0.1, economyChange: -0.15, resourceChange: -0.4, reputationChange: -0.15 },
      'revolution': { populationChange: -0.05, economyChange: -0.1, resourceChange: -0.05, reputationChange: 0.0 },
      'natural-disaster': { populationChange: -0.08, economyChange: -0.2, resourceChange: -0.25, reputationChange: 0.0 },
      'technological-leap': { populationChange: 0.05, economyChange: 0.2, resourceChange: 0.15, reputationChange: 0.15 },
      'cultural-renaissance': { populationChange: 0.03, economyChange: 0.1, resourceChange: 0.0, reputationChange: 0.25 },
    };
    return effects[type];
  }

  // ── Climate change simulation ───────────────────────────────────

  function updateClimate(worldId: string, industrialActivity: number): AdaptiveClimateState {
    const existing = climateStates.get(worldId);
    const pollution = existing?.pollutionLevel ?? 0;

    const newPollution = Math.max(0, pollution
      + industrialActivity * CLIMATE_INDUSTRY_IMPACT_RATE
      - CLIMATE_RECOVERY_RATE);

    const tempShift = Math.min(cfg.maxClimateShift, newPollution * 2);
    const weatherSeverity = 1 + tempShift * 0.3;

    const state: AdaptiveClimateState = {
      worldId,
      temperatureShift: tempShift,
      pollutionLevel: newPollution,
      industrialActivity,
      weatherSeverity,
    };

    climateStates.set(worldId, state);

    events.emit(makeEvent(
      'adaptive.climate.updated',
      { worldId, temperatureShift: tempShift, pollutionLevel: newPollution },
      ids, clock,
    ));

    return state;
  }

  // ── Trade route emergence ───────────────────────────────────────

  async function updateTradeRoutes(
    worldId: string,
    fromZoneId: string,
    toZoneId: string,
  ): Promise<AdaptiveTradeRoute> {
    const traversals = await metrics.getPathTraversals(fromZoneId, toZoneId, cfg.densityWindowMs);
    const tier = classifyRouteTier(traversals);
    const speedBonus = computeRouteSpeedBonus(tier);

    const existingRoutes = await store.getAdaptiveTradeRoutes(worldId);
    const existing = existingRoutes.find(
      r => r.fromZoneId === fromZoneId && r.toZoneId === toZoneId,
    );

    const route: AdaptiveTradeRoute = {
      id: existing?.id ?? ids.next(),
      worldId,
      fromZoneId,
      toZoneId,
      tier,
      traversals,
      speedBonus,
      establishedAt: existing?.establishedAt ?? clock.now(),
    };

    await store.saveAdaptiveTradeRoute(route);

    if (!existing) {
      tradeRoutesCreated++;
    }

    if (!existing || existing.tier !== tier) {
      events.emit(makeEvent(
        'adaptive.trade-route.evolved',
        { worldId, fromZoneId, toZoneId, tier },
        ids, clock,
      ));
      log.info('trade route evolved', { fromZoneId, toZoneId, tier });
    }

    return route;
  }

  function classifyRouteTier(traversals: number): AdaptiveTradeRouteTier {
    if (traversals >= TRADE_ROUTE_HIGHWAY_THRESHOLD) return 'highway';
    if (traversals >= TRADE_ROUTE_ROAD_THRESHOLD) return 'road';
    return 'footpath';
  }

  function computeRouteSpeedBonus(tier: AdaptiveTradeRouteTier): number {
    switch (tier) {
      case 'highway': return 0.5;
      case 'road': return 0.25;
      case 'footpath': return 0.0;
    }
  }

  // ── Abandoned area decay ────────────────────────────────────────

  async function processDecay(zoneId: string, daysSinceVisit: number): Promise<DecayState> {
    const progress = daysSinceVisit <= DECAY_START_DAYS_ABANDONED
      ? 0
      : Math.min(1.0, (daysSinceVisit - DECAY_START_DAYS_ABANDONED) * DECAY_RATE_PER_DAY);

    const stage = classifyDecayStage(progress);

    const state: DecayState = {
      zoneId,
      daysAbandoned: daysSinceVisit,
      decayProgress: progress,
      stage,
      lastVisitedAt: clock.now() - BigInt(daysSinceVisit * 86_400_000),
    };

    await store.saveDecayState(zoneId, state);

    if (progress > 0) {
      zonesDecayed++;
      events.emit(makeEvent(
        'adaptive.zone.decaying',
        { zoneId, stage, progress },
        ids, clock,
      ));
    }

    return state;
  }

  function classifyDecayStage(progress: number): DecayStage {
    if (progress >= 0.9) return 'wilderness';
    if (progress >= 0.6) return 'ruined';
    if (progress >= 0.3) return 'deteriorating';
    if (progress > 0) return 'neglected';
    return 'maintained';
  }

  // ── Self-balancing economy ──────────────────────────────────────

  async function balanceEconomy(worldId: string): Promise<EconomyBalanceSnapshot> {
    const current = await metrics.getEconomyMetrics(worldId);
    const history = economyHistory.get(worldId) ?? [];

    const adjustment = await economyModel.recommend(current, history);

    history.push(current);
    if (history.length > cfg.economyHistoryWindow) {
      history.splice(0, history.length - cfg.economyHistoryWindow);
    }
    economyHistory.set(worldId, history);

    const snapshot: EconomyBalanceSnapshot = {
      worldId,
      metrics: current,
      adjustment,
      appliedAt: clock.now(),
    };

    await store.saveEconomySnapshot(worldId, snapshot);
    economyRebalances++;

    events.emit(makeEvent(
      'adaptive.economy.rebalanced',
      { worldId, adjustment },
      ids, clock,
    ));

    log.info('economy rebalanced', { worldId, gini: current.giniCoefficient, inflation: current.inflation });
    return snapshot;
  }

  // ── Stats ───────────────────────────────────────────────────────

  function getAdaptiveStats(): AdaptiveWorldStats {
    return {
      densityUpdates,
      resourceAdjustments,
      worldEventsGenerated,
      tradeRoutesCreated,
      economyRebalances,
      zonesDecayed,
    };
  }

  return {
    updateZoneDensity,
    adjustResourceRegen,
    computePopulationDynamics,
    evaluateWorldEvents,
    updateClimate,
    updateTradeRoutes,
    processDecay,
    balanceEconomy,
    getAdaptiveStats,
  };
}
