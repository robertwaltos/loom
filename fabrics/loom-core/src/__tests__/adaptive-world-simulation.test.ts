import { describe, expect, it, vi } from 'vitest';
import {
  createAdaptiveWorldEngine,
  type AdaptiveTradeRoute,
  type EconomyBalanceSnapshot,
  type EconomyMetrics,
  type PopulationSnapshot,
  type ResourceRegenState,
  type ZoneDensityMap,
} from '../adaptive-world.js';

function makeEconomyMetrics(worldId = 'world-a'): EconomyMetrics {
  return {
    worldId,
    giniCoefficient: 0.45,
    inflation: 0.03,
    averageWealth: 1200,
    tradeVolume: 50000,
    unemployment: 0.08,
    capturedAt: 1000n,
  };
}

function makeDeps() {
  let seq = 0;
  const density = new Map<string, ZoneDensityMap>();
  const resources = new Map<string, ResourceRegenState>();
  const populations = new Map<string, PopulationSnapshot>();
  const decay = new Map<string, unknown>();
  const routes = new Map<string, AdaptiveTradeRoute[]>();
  const economies = new Map<string, EconomyBalanceSnapshot>();

  return {
    deps: {
      clock: { now: vi.fn(() => 1000n) },
      ids: { next: vi.fn(() => `id-${++seq}`) },
      log: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      events: {
        emit: vi.fn(),
      },
      store: {
        saveDensityMap: vi.fn(async (zoneId: string, m: ZoneDensityMap) => {
          density.set(zoneId, m);
        }),
        getDensityMap: vi.fn(async (zoneId: string) => density.get(zoneId)),
        saveResourceState: vi.fn(async (zoneId: string, state: ResourceRegenState) => {
          resources.set(zoneId, state);
        }),
        getResourceState: vi.fn(async (zoneId: string) => resources.get(zoneId)),
        savePopulationSnapshot: vi.fn(async (worldId: string, snap: PopulationSnapshot) => {
          populations.set(worldId, snap);
        }),
        getPopulationSnapshot: vi.fn(async (worldId: string) => populations.get(worldId)),
        saveDecayState: vi.fn(async (zoneId: string, state: unknown) => {
          decay.set(zoneId, state);
        }),
        getDecayState: vi.fn(async () => undefined),
        saveAdaptiveTradeRoute: vi.fn(async (route: AdaptiveTradeRoute) => {
          const list = routes.get(route.worldId) ?? [];
          const idx = list.findIndex((r) => r.id === route.id);
          if (idx >= 0) list[idx] = route;
          else list.push(route);
          routes.set(route.worldId, list);
        }),
        getAdaptiveTradeRoutes: vi.fn(async (worldId: string) => routes.get(worldId) ?? []),
        saveEconomySnapshot: vi.fn(async (worldId: string, snap: EconomyBalanceSnapshot) => {
          economies.set(worldId, snap);
        }),
        getEconomySnapshot: vi.fn(async (worldId: string) => economies.get(worldId)),
      },
      metrics: {
        getZonePlayerCount: vi.fn(async () => 120),
        getZoneActivity: vi.fn(async () => ({
          playerMinutes: 10000,
          combatEvents: 700,
          tradeEvents: 1200,
          explorationEvents: 150,
          buildEvents: 400,
        })),
        getResourceExtractionRate: vi.fn(async (zoneId: string, resourceType: string) => {
          void zoneId;
          return resourceType === 'iron' ? 3 : 0.2;
        }),
        getPathTraversals: vi.fn(async () => 240),
        getEconomyMetrics: vi.fn(async (worldId: string) => makeEconomyMetrics(worldId)),
      },
      economyModel: {
        recommend: vi.fn(async () => ({
          taxRate: 0.12,
          npcPriceMultiplier: 1.05,
          questRewardMultiplier: 0.98,
          dropRateMultiplier: 1.02,
          rationale: 'inflation above target',
        })),
      },
    },
    resources,
  };
}

describe('adaptive-world simulation', () => {
  it('updates zone density and content bias from player count', async () => {
    const ctx = makeDeps();
    const engine = createAdaptiveWorldEngine(ctx.deps);

    const map = await engine.updateZoneDensity('zone-1');

    expect(map.tier).toBe('overcrowded');
    expect(map.spawnMultiplier).toBe(3);
    expect(map.contentBias.eventFrequency).toBe(2.5);
    expect(ctx.deps.events.emit).toHaveBeenCalled();
  });

  it('tunes resource regen rates for depleted and abundant resources', async () => {
    const ctx = makeDeps();
    ctx.resources.set('zone-1', {
      zoneId: 'zone-1',
      resources: [
        { resourceType: 'iron', currentLevel: 10, maxLevel: 100, regenRate: 1, extractionRate: 0 },
        { resourceType: 'wood', currentLevel: 90, maxLevel: 100, regenRate: 1, extractionRate: 0 },
      ],
      lastAdjustedAt: 1n,
    });

    const engine = createAdaptiveWorldEngine(ctx.deps);
    const state = await engine.adjustResourceRegen('zone-1');

    const iron = state.resources.find((r) => r.resourceType === 'iron');
    const wood = state.resources.find((r) => r.resourceType === 'wood');

    expect(iron?.regenRate).toBe(1.5);
    expect(wood?.regenRate).toBe(0.8);
  });

  it('computes population dynamics with migration and profession shifts', async () => {
    const ctx = makeDeps();
    const engine = createAdaptiveWorldEngine(ctx.deps);

    const snapshot = await engine.computePopulationDynamics('world-a', [
      {
        zoneId: 'poor',
        population: 1000,
        prosperity: 0.2,
        professions: new Map([
          ['laborer', 500],
          ['artisan', 100],
        ]),
      },
      {
        zoneId: 'rich',
        population: 1000,
        prosperity: 0.9,
        professions: new Map([
          ['laborer', 200],
          ['artisan', 300],
          ['scholar', 100],
        ]),
      },
    ]);

    expect(snapshot.totalPopulation).toBeGreaterThan(0);
    expect(snapshot.migrationEvents).toBeGreaterThan(0);
    expect(snapshot.professionDistribution.get('artisan')).toBeGreaterThan(0);
  });

  it('generates world events from trigger thresholds', async () => {
    const ctx = makeDeps();
    const engine = createAdaptiveWorldEngine(ctx.deps);

    const events = await engine.evaluateWorldEvents('world-a', {
      playerMinutes: 10_000,
      combatEvents: 800,
      tradeEvents: 40,
      explorationEvents: 100,
      buildEvents: 500,
    });

    expect(events.map((e) => e.type)).toEqual(
      expect.arrayContaining(['war', 'famine', 'cultural-renaissance']),
    );
  });

  it('updates climate state with industrial pressure and event emission', () => {
    const ctx = makeDeps();
    const engine = createAdaptiveWorldEngine(ctx.deps);

    const c1 = engine.updateClimate('world-a', 1000);
    const c2 = engine.updateClimate('world-a', 5000);

    expect(c2.pollutionLevel).toBeGreaterThan(c1.pollutionLevel);
    expect(c2.temperatureShift).toBeLessThanOrEqual(5);
    expect(c2.weatherSeverity).toBeGreaterThanOrEqual(1);
    expect(ctx.deps.events.emit).toHaveBeenCalled();
  });

  it('evolves trade route tiers based on traversals', async () => {
    const ctx = makeDeps();
    const engine = createAdaptiveWorldEngine(ctx.deps, { densityWindowMs: 3600_000 });

    const first = await engine.updateTradeRoutes('world-a', 'a', 'b');
    expect(first.tier).toBe('highway');
    expect(first.speedBonus).toBe(0.5);

    ctx.deps.metrics.getPathTraversals = vi.fn(async () => 20);
    const second = await engine.updateTradeRoutes('world-a', 'a', 'b');
    expect(second.id).toBe(first.id);
    expect(second.tier).toBe('footpath');
  });

  it('processes zone decay stages from abandonment duration', async () => {
    const engine = createAdaptiveWorldEngine(makeDeps().deps);

    const maintained = await engine.processDecay('zone-1', 10);
    const wilderness = await engine.processDecay('zone-2', 400);

    expect(maintained.stage).toBe('maintained');
    expect(maintained.decayProgress).toBe(0);
    expect(wilderness.stage).toBe('wilderness');
    expect(wilderness.decayProgress).toBe(1);
  });

  it('balances economy using model recommendation and keeps bounded history', async () => {
    const ctx = makeDeps();
    const engine = createAdaptiveWorldEngine(ctx.deps, { economyHistoryWindow: 2 });

    const s1 = await engine.balanceEconomy('world-a');
    const s2 = await engine.balanceEconomy('world-a');
    const s3 = await engine.balanceEconomy('world-a');

    expect(s1.adjustment.taxRate).toBe(0.12);
    expect(s3.metrics.worldId).toBe('world-a');
    expect(ctx.deps.economyModel.recommend).toHaveBeenCalledTimes(3);
    expect(ctx.deps.store.saveEconomySnapshot).toHaveBeenCalledTimes(3);
  });

  it('tracks adaptive stats counters across operations', async () => {
    const ctx = makeDeps();
    const engine = createAdaptiveWorldEngine(ctx.deps);

    await engine.updateZoneDensity('zone-1');
    await engine.adjustResourceRegen('zone-1');
    await engine.evaluateWorldEvents('world-a', {
      playerMinutes: 100,
      combatEvents: 600,
      tradeEvents: 1200,
      explorationEvents: 5,
      buildEvents: 10,
    });
    await engine.updateTradeRoutes('world-a', 'a', 'b');
    await engine.processDecay('zone-1', 100);
    await engine.balanceEconomy('world-a');

    const stats = engine.getAdaptiveStats();
    expect(stats.densityUpdates).toBe(1);
    expect(stats.resourceAdjustments).toBe(1);
    expect(stats.worldEventsGenerated).toBeGreaterThan(0);
    expect(stats.tradeRoutesCreated).toBe(1);
    expect(stats.zonesDecayed).toBe(1);
    expect(stats.economyRebalances).toBe(1);
  });
});
