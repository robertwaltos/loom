import { describe, it, expect } from 'vitest';
import {
  createWorldExpansionEngine,
  type GeneratedWorldData,
  type QualityMetrics,
  type PerformanceMetrics,
  type WorldCandidate,
  type WorldExpansionDeps,
  type WorldGeneratorPort,
  type WorldMetricsPort,
  type WorldStorePort,
  type WorldTemplate,
} from '../world-expansion.js';

function makeId() {
  let i = 0;
  return { next: () => `wid-${++i}` };
}

function makeClock(start = 10_000n) {
  return { now: () => start };
}

function makeTemplate(templateId = 'tpl-1'): WorldTemplate {
  return {
    templateId,
    culture: 'nordic',
    biomeDistribution: new Map([
      ['forest', 0.5],
      ['mountain', 0.5],
    ]),
    populationCap: 50_000,
    resourceRichness: 0.7,
    dangerLevel: 0.4,
    aestheticStyle: 'nordic-ice',
    namePattern: 'World-{id}',
    descriptionPattern: 'Ancient realm',
  };
}

function makeStore() {
  const byId = new Map<string, WorldCandidate>();
  const population = new Map<string, number>();

  const store: WorldStorePort = {
    async save(world) {
      byId.set(world.worldId, world);
    },
    async update(worldId, patch) {
      const current = byId.get(worldId);
      if (current === undefined) return;
      byId.set(worldId, { ...current, ...patch });
    },
    async getById(worldId) {
      return byId.get(worldId);
    },
    async getByStatus(status) {
      return Array.from(byId.values()).filter(w => w.status === status);
    },
    async getActive() {
      return Array.from(byId.values()).filter(w => w.status === 'active');
    },
    async getPopulationCount(worldId) {
      return population.get(worldId) ?? 0;
    },
  };

  return {
    store,
    seedPopulation(worldId: string, count: number) {
      population.set(worldId, count);
    },
  };
}

function makeGenerator(): WorldGeneratorPort {
  return {
    async generate(_template): Promise<GeneratedWorldData> {
      return {
        heightmap: 'h',
        biomeMap: 'b',
        resourceMap: 'r',
        landmarkCount: 12,
        generationMs: 35,
      };
    },
  };
}

function makeMetrics(overrides?: Partial<QualityMetrics> & { passesTarget?: boolean }): WorldMetricsPort {
  return {
    async measureQuality(_worldId): Promise<QualityMetrics> {
      return {
        visualDiversity: 0.8,
        gameplayVariety: 0.8,
        biomeBalance: 0.8,
        landmarkDensity: 0.8,
        navigability: 0.8,
        overallScore: overrides?.overallScore ?? 0.8,
      };
    },
    async measurePerformance(_worldId): Promise<PerformanceMetrics> {
      return {
        avgFrameMs: 10,
        avgTickMs: 5,
        memoryMb: 1024,
        entityCount: 2000,
        passesTarget: overrides?.passesTarget ?? true,
      };
    },
  };
}

function makeDeps(opts?: { qualityScore?: number; passesTarget?: boolean }) {
  const { store, seedPopulation } = makeStore();
  const deps: WorldExpansionDeps = {
    clock: makeClock(),
    id: makeId(),
    log: {
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    events: {
      emit: () => {},
    },
    generator: makeGenerator(),
    store,
    metrics: makeMetrics({ overallScore: opts?.qualityScore, passesTarget: opts?.passesTarget }),
  };
  return { deps, seedPopulation };
}

describe('world-expansion simulation', () => {
  it('registers and retrieves templates', () => {
    const { deps } = makeDeps();
    const engine = createWorldExpansionEngine(deps);
    const template = makeTemplate();
    engine.registerTemplate(template);
    expect(engine.getTemplate(template.templateId)?.culture).toBe('nordic');
  });

  it('throws when generating world with unknown template', async () => {
    const { deps } = makeDeps();
    const engine = createWorldExpansionEngine(deps);
    await expect(engine.generateWorld('missing')).rejects.toThrow('not found');
  });

  it('generates world candidate and increments stats', async () => {
    const { deps } = makeDeps();
    const engine = createWorldExpansionEngine(deps);
    engine.registerTemplate(makeTemplate());
    const world = await engine.generateWorld('tpl-1');
    expect(world.status).toBe('generating');
    expect(world.name.startsWith('World-')).toBe(true);
    expect(engine.getStats().worldsGenerated).toBe(1);
  });

  it('moves world to pending-review when quality and performance pass', async () => {
    const { deps } = makeDeps({ qualityScore: 0.9, passesTarget: true });
    const engine = createWorldExpansionEngine(deps);
    engine.registerTemplate(makeTemplate());
    const world = await engine.generateWorld('tpl-1');
    const quality = await engine.scoreQuality(world.worldId);
    expect(quality.overallScore).toBe(0.9);
    const queue = await engine.getReviewQueue();
    expect(queue.some(w => w.worldId === world.worldId)).toBe(true);
  });

  it('keeps world in quality-check when score is below threshold', async () => {
    const { deps } = makeDeps({ qualityScore: 0.5, passesTarget: true });
    const engine = createWorldExpansionEngine(deps, { minQualityScore: 0.7 });
    engine.registerTemplate(makeTemplate());
    const world = await engine.generateWorld('tpl-1');
    await engine.scoreQuality(world.worldId);
    const queue = await engine.getReviewQueue();
    expect(queue.some(w => w.worldId === world.worldId)).toBe(false);
  });

  it('approves a pending world', async () => {
    const { deps } = makeDeps();
    const engine = createWorldExpansionEngine(deps);
    engine.registerTemplate(makeTemplate());
    const world = await engine.generateWorld('tpl-1');
    await engine.scoreQuality(world.worldId);
    const approved = await engine.approveWorld(world.worldId, 'reviewer-1', 'looks good');
    expect(approved.status).toBe('active');
    expect(engine.getStats().worldsApproved).toBe(1);
  });

  it('rejects world and increments rejection stats', async () => {
    const { deps } = makeDeps();
    const engine = createWorldExpansionEngine(deps);
    engine.registerTemplate(makeTemplate());
    const world = await engine.generateWorld('tpl-1');
    await engine.rejectWorld(world.worldId, 'reviewer-2', 'too similar');
    expect(engine.getStats().worldsRejected).toBe(1);
  });

  it('throws when approving unknown world', async () => {
    const { deps } = makeDeps();
    const engine = createWorldExpansionEngine(deps);
    await expect(engine.approveWorld('none', 'r', 'x')).rejects.toThrow('not found');
  });

  it('applies degradation and marks world degraded when below threshold', async () => {
    const { deps } = makeDeps();
    const engine = createWorldExpansionEngine(deps, { degradationThreshold: 0.7 });
    engine.registerTemplate(makeTemplate());
    const world = await engine.generateWorld('tpl-1');
    const updated = await engine.applyDegradation(world.worldId, 'pollution', 0.5);
    expect(updated.healthPercent).toBe(50);
    expect(updated.status).toBe('degraded');
  });

  it('marks world as dying when health crosses death threshold', async () => {
    const { deps } = makeDeps();
    const engine = createWorldExpansionEngine(deps, { deathThreshold: 0.4, degradationThreshold: 0.6 });
    engine.registerTemplate(makeTemplate());
    const world = await engine.generateWorld('tpl-1');
    const updated = await engine.applyDegradation(world.worldId, 'deforestation', 0.8);
    expect(updated.status).toBe('dying');
  });

  it('converts dying world to dead during health check', async () => {
    const { deps } = makeDeps();
    const engine = createWorldExpansionEngine(deps, { deathThreshold: 0.3 });
    engine.registerTemplate(makeTemplate());
    const world = await engine.generateWorld('tpl-1');
    await engine.applyDegradation(world.worldId, 'pollution', 0.9);
    const checked = await engine.checkWorldHealth(world.worldId);
    expect(checked.status).toBe('dead');
    expect(engine.getStats().worldsDead).toBe(1);
  });

  it('initiates evacuation using population count and target worlds', async () => {
    const { deps, seedPopulation } = makeDeps();
    const engine = createWorldExpansionEngine(deps);
    engine.registerTemplate(makeTemplate());
    const world = await engine.generateWorld('tpl-1');
    seedPopulation(world.worldId, 4200);
    const evacuation = await engine.initiateEvacuation(world.worldId, ['safe-1', 'safe-2']);
    expect(evacuation.playerCount).toBe(4200);
    expect(evacuation.targetWorldIds.length).toBe(2);
    expect(engine.getStats().totalEvacuations).toBe(1);
  });

  it('advances season in proper order and wraps around', async () => {
    const { deps } = makeDeps();
    const engine = createWorldExpansionEngine(deps);
    engine.registerTemplate(makeTemplate());
    const world = await engine.generateWorld('tpl-1');
    expect(await engine.advanceSeason(world.worldId)).toBe('summer');
    expect(await engine.advanceSeason(world.worldId)).toBe('autumn');
    expect(await engine.advanceSeason(world.worldId)).toBe('winter');
    expect(await engine.advanceSeason(world.worldId)).toBe('spring');
  });

  it('schedules seasonal events and filters active events', async () => {
    const { deps } = makeDeps();
    const engine = createWorldExpansionEngine(deps);
    const now = 10_000n;
    const event = engine.scheduleSeasonalEvent({
      type: 'harvest-festival',
      worldIds: ['w-1'],
      startsAt: now,
      endsAt: now + 5_000n,
      metadata: { cropBonus: 0.2 },
    });
    expect(event.eventId.startsWith('wid-')).toBe(true);
    expect(engine.getActiveEvents().length).toBe(1);
    expect(engine.getStats().seasonalEventsRun).toBe(1);
  });

  it('launches and completes successful survey mission', async () => {
    const { deps } = makeDeps();
    const engine = createWorldExpansionEngine(deps);
    const mission = await engine.launchSurvey(['p1', 'p2', 'p3'], 'northern-rim');
    const complete = await engine.completeSurvey(mission.missionId, true);
    expect(complete.status).toBe('completed');
    expect(complete.discoveredWorldId).toBeDefined();
    expect(engine.getStats().surveysCompleted).toBe(1);
  });

  it('completes failed survey without discovery id', async () => {
    const { deps } = makeDeps();
    const engine = createWorldExpansionEngine(deps);
    const mission = await engine.launchSurvey(['p1'], 'storm-belt');
    const complete = await engine.completeSurvey(mission.missionId, false);
    expect(complete.status).toBe('failed');
    expect(complete.discoveredWorldId).toBeUndefined();
  });

  it('throws when completing unknown survey', async () => {
    const { deps } = makeDeps();
    const engine = createWorldExpansionEngine(deps);
    await expect(engine.completeSurvey('missing', true)).rejects.toThrow('not found');
  });
});
