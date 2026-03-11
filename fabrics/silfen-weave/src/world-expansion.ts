/**
 * World Expansion Pipeline — Scale the galaxy from 60 → 180+ worlds.
 *
 * Coordinates world creation lifecycle:
 *   - Cultural templates: Nordic, Mediterranean, Jungle, Steppe, Archipelago
 *   - Quality scoring: visual diversity, gameplay variety, performance
 *   - Review workflow: auto-generated worlds queued for human approval
 *   - Seasonal events: synchronized across all worlds
 *   - World degradation: environmental consequences of exploitation
 *   - World death: irreversible collapse, evacuation protocols
 *   - Survey Corps: player missions to discover new worlds
 *
 * "The Weave grows ever wider."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface ExpansionClockPort {
  readonly now: () => bigint;
}

export interface ExpansionIdPort {
  readonly next: () => string;
}

export interface ExpansionLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface ExpansionEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface WorldGeneratorPort {
  readonly generate: (template: WorldTemplate) => Promise<GeneratedWorldData>;
}

export interface WorldStorePort {
  readonly save: (world: WorldCandidate) => Promise<void>;
  readonly update: (worldId: string, patch: Partial<WorldCandidate>) => Promise<void>;
  readonly getById: (worldId: string) => Promise<WorldCandidate | undefined>;
  readonly getByStatus: (status: WorldReviewStatus) => Promise<readonly WorldCandidate[]>;
  readonly getActive: () => Promise<readonly WorldCandidate[]>;
  readonly getPopulationCount: (worldId: string) => Promise<number>;
}

export interface WorldMetricsPort {
  readonly measureQuality: (worldId: string) => Promise<QualityMetrics>;
  readonly measurePerformance: (worldId: string) => Promise<PerformanceMetrics>;
}

// ─── Types ──────────────────────────────────────────────────────────

export type CulturalTemplate =
  | 'nordic'
  | 'mediterranean'
  | 'jungle'
  | 'steppe'
  | 'archipelago'
  | 'desert'
  | 'tundra'
  | 'volcanic'
  | 'floating-islands'
  | 'undersea';

export type WorldReviewStatus =
  | 'generating'
  | 'quality-check'
  | 'pending-review'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'degraded'
  | 'dying'
  | 'dead';

export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';

export type SeasonalEventType =
  | 'harvest-festival'
  | 'solstice-ceremony'
  | 'eclipse-trial'
  | 'spring-awakening'
  | 'winter-solstice'
  | 'storm-season'
  | 'trade-fair';

export type DegradationType =
  | 'deforestation'
  | 'pollution'
  | 'overmining'
  | 'overhunting'
  | 'soil-depletion'
  | 'water-contamination';

export interface WorldTemplate {
  readonly templateId: string;
  readonly culture: CulturalTemplate;
  readonly biomeDistribution: ReadonlyMap<string, number>;
  readonly populationCap: number;
  readonly resourceRichness: number;
  readonly dangerLevel: number;
  readonly aestheticStyle: string;
  readonly namePattern: string;
  readonly descriptionPattern: string;
}

export interface GeneratedWorldData {
  readonly heightmap: string;
  readonly biomeMap: string;
  readonly resourceMap: string;
  readonly landmarkCount: number;
  readonly generationMs: number;
}

export interface QualityMetrics {
  readonly visualDiversity: number;
  readonly gameplayVariety: number;
  readonly biomeBalance: number;
  readonly landmarkDensity: number;
  readonly navigability: number;
  readonly overallScore: number;
}

export interface PerformanceMetrics {
  readonly avgFrameMs: number;
  readonly avgTickMs: number;
  readonly memoryMb: number;
  readonly entityCount: number;
  readonly passesTarget: boolean;
}

export interface WorldCandidate {
  readonly worldId: string;
  readonly templateId: string;
  readonly culture: CulturalTemplate;
  readonly name: string;
  readonly status: WorldReviewStatus;
  readonly qualityScore: number | undefined;
  readonly performancePass: boolean | undefined;
  readonly reviewerId: string | undefined;
  readonly reviewNotes: string | undefined;
  readonly degradation: ReadonlyMap<DegradationType, number>;
  readonly healthPercent: number;
  readonly season: SeasonType;
  readonly activeEvents: readonly SeasonalEvent[];
  readonly discoveredBy: string | undefined;
  readonly createdAt: bigint;
  readonly approvedAt: bigint | undefined;
  readonly diedAt: bigint | undefined;
}

export interface SeasonalEvent {
  readonly eventId: string;
  readonly type: SeasonalEventType;
  readonly worldIds: readonly string[];
  readonly startsAt: bigint;
  readonly endsAt: bigint;
  readonly metadata: Record<string, unknown>;
}

export interface SurveyMission {
  readonly missionId: string;
  readonly squadPlayerIds: readonly string[];
  readonly targetRegion: string;
  readonly status: 'briefing' | 'in-progress' | 'completed' | 'failed';
  readonly discoveredWorldId: string | undefined;
  readonly startedAt: bigint;
  readonly completedAt: bigint | undefined;
}

export interface EvacuationState {
  readonly worldId: string;
  readonly phase: 'warning' | 'evacuation' | 'collapsed';
  readonly playerCount: number;
  readonly evacuatedCount: number;
  readonly deadlineAt: bigint;
  readonly targetWorldIds: readonly string[];
}

// ─── Config ─────────────────────────────────────────────────────────

export interface WorldExpansionConfig {
  readonly minQualityScore: number;
  readonly targetWorldCount: number;
  readonly degradationThreshold: number;
  readonly deathThreshold: number;
  readonly evacuationWindowMs: number;
  readonly seasonDurationMs: number;
  readonly surveySquadSize: number;
}

// ─── Stats ──────────────────────────────────────────────────────────

export interface WorldExpansionStats {
  readonly worldsGenerated: number;
  readonly worldsApproved: number;
  readonly worldsRejected: number;
  readonly worldsDead: number;
  readonly activeWorldCount: number;
  readonly surveysCompleted: number;
  readonly totalEvacuations: number;
  readonly seasonalEventsRun: number;
}

// ─── Interface ──────────────────────────────────────────────────────

export interface WorldExpansionEngine {
  // Templates
  readonly registerTemplate: (template: WorldTemplate) => void;
  readonly getTemplate: (templateId: string) => WorldTemplate | undefined;

  // Generation
  readonly generateWorld: (templateId: string) => Promise<WorldCandidate>;
  readonly scoreQuality: (worldId: string) => Promise<QualityMetrics>;

  // Review
  readonly getReviewQueue: () => Promise<readonly WorldCandidate[]>;
  readonly approveWorld: (worldId: string, reviewerId: string, notes: string) => Promise<WorldCandidate>;
  readonly rejectWorld: (worldId: string, reviewerId: string, notes: string) => Promise<void>;

  // World lifecycle
  readonly applyDegradation: (worldId: string, type: DegradationType, amount: number) => Promise<WorldCandidate>;
  readonly checkWorldHealth: (worldId: string) => Promise<WorldCandidate>;
  readonly initiateEvacuation: (worldId: string, targetWorldIds: readonly string[]) => Promise<EvacuationState>;

  // Seasons & events
  readonly advanceSeason: (worldId: string) => Promise<SeasonType>;
  readonly scheduleSeasonalEvent: (event: Omit<SeasonalEvent, 'eventId'>) => SeasonalEvent;
  readonly getActiveEvents: () => readonly SeasonalEvent[];

  // Survey Corps
  readonly launchSurvey: (playerIds: readonly string[], targetRegion: string) => Promise<SurveyMission>;
  readonly completeSurvey: (missionId: string, success: boolean) => Promise<SurveyMission>;

  readonly getStats: () => WorldExpansionStats;
}

// ─── Deps ───────────────────────────────────────────────────────────

export interface WorldExpansionDeps {
  readonly clock: ExpansionClockPort;
  readonly id: ExpansionIdPort;
  readonly log: ExpansionLogPort;
  readonly events: ExpansionEventPort;
  readonly generator: WorldGeneratorPort;
  readonly store: WorldStorePort;
  readonly metrics: WorldMetricsPort;
}

// ─── Defaults ───────────────────────────────────────────────────────

const DEFAULT_CONFIG: WorldExpansionConfig = {
  minQualityScore: 0.7,
  targetWorldCount: 180,
  degradationThreshold: 0.3,
  deathThreshold: 0.1,
  evacuationWindowMs: 7 * 24 * 60 * 60 * 1000,
  seasonDurationMs: 30 * 24 * 60 * 60 * 1000,
  surveySquadSize: 5,
};

const SEASON_ORDER: readonly SeasonType[] = ['spring', 'summer', 'autumn', 'winter'] as const;

// ─── Factory ────────────────────────────────────────────────────────

export function createWorldExpansionEngine(
  deps: WorldExpansionDeps,
  config: Partial<WorldExpansionConfig> = {},
): WorldExpansionEngine {
  const cfg: WorldExpansionConfig = { ...DEFAULT_CONFIG, ...config };

  const templates = new Map<string, WorldTemplate>();
  const events: SeasonalEvent[] = [];
  const surveys = new Map<string, SurveyMission>();

  let worldsGenerated = 0;
  let worldsApproved = 0;
  let worldsRejected = 0;
  let worldsDead = 0;
  let surveysCompleted = 0;
  let totalEvacuations = 0;
  let seasonalEventsRun = 0;

  function registerTemplate(template: WorldTemplate): void {
    templates.set(template.templateId, template);
    deps.log.info('world-template-registered', { templateId: template.templateId, culture: template.culture });
  }

  function getTemplate(templateId: string): WorldTemplate | undefined {
    return templates.get(templateId);
  }

  async function generateWorld(templateId: string): Promise<WorldCandidate> {
    const template = templates.get(templateId);
    if (template === undefined) throw new Error(`Template ${templateId} not found`);

    const data = await deps.generator.generate(template);
    const now = deps.clock.now();

    const candidate: WorldCandidate = {
      worldId: deps.id.next(),
      templateId,
      culture: template.culture,
      name: template.namePattern.replace('{id}', deps.id.next().slice(0, 6)),
      status: 'generating',
      qualityScore: undefined,
      performancePass: undefined,
      reviewerId: undefined,
      reviewNotes: undefined,
      degradation: new Map(),
      healthPercent: 100,
      season: 'spring',
      activeEvents: [],
      discoveredBy: undefined,
      createdAt: now,
      approvedAt: undefined,
      diedAt: undefined,
    };

    await deps.store.save(candidate);
    worldsGenerated++;

    deps.log.info('world-generated', {
      worldId: candidate.worldId,
      culture: template.culture,
      generationMs: data.generationMs,
      landmarks: data.landmarkCount,
    });

    return candidate;
  }

  async function scoreQuality(worldId: string): Promise<QualityMetrics> {
    const quality = await deps.metrics.measureQuality(worldId);
    const performance = await deps.metrics.measurePerformance(worldId);

    const newStatus: WorldReviewStatus = quality.overallScore >= cfg.minQualityScore && performance.passesTarget
      ? 'pending-review'
      : 'quality-check';

    await deps.store.update(worldId, {
      qualityScore: quality.overallScore,
      performancePass: performance.passesTarget,
      status: newStatus,
    } as Partial<WorldCandidate>);

    return quality;
  }

  async function getReviewQueue(): Promise<readonly WorldCandidate[]> {
    return deps.store.getByStatus('pending-review');
  }

  async function approveWorld(worldId: string, reviewerId: string, notes: string): Promise<WorldCandidate> {
    const world = await deps.store.getById(worldId);
    if (world === undefined) throw new Error(`World ${worldId} not found`);

    const approved: WorldCandidate = {
      ...world,
      status: 'active',
      reviewerId,
      reviewNotes: notes,
      approvedAt: deps.clock.now(),
    };

    await deps.store.save(approved);
    worldsApproved++;
    deps.log.info('world-approved', { worldId, reviewerId });
    return approved;
  }

  async function rejectWorld(worldId: string, reviewerId: string, notes: string): Promise<void> {
    await deps.store.update(worldId, {
      status: 'rejected',
      reviewerId,
      reviewNotes: notes,
    } as Partial<WorldCandidate>);
    worldsRejected++;
    deps.log.info('world-rejected', { worldId, reviewerId });
  }

  async function applyDegradation(worldId: string, type: DegradationType, amount: number): Promise<WorldCandidate> {
    const world = await deps.store.getById(worldId);
    if (world === undefined) throw new Error(`World ${worldId} not found`);

    const newDegradation = new Map(world.degradation);
    const current = newDegradation.get(type) ?? 0;
    newDegradation.set(type, Math.min(1, current + amount));

    // Compute overall health
    let totalDeg = 0;
    for (const val of newDegradation.values()) {
      totalDeg += val;
    }
    const maxDeg = newDegradation.size > 0 ? newDegradation.size : 1;
    const avgDeg = totalDeg / maxDeg;
    const healthPercent = Math.max(0, Math.round((1 - avgDeg) * 100));

    let status = world.status;
    if (healthPercent <= cfg.deathThreshold * 100) {
      status = 'dying';
    } else if (healthPercent <= cfg.degradationThreshold * 100) {
      status = 'degraded';
    }

    const updated: WorldCandidate = {
      ...world,
      degradation: newDegradation,
      healthPercent,
      status,
    };

    await deps.store.save(updated);
    deps.log.warn('world-degradation', { worldId, type, amount, healthPercent, status });
    return updated;
  }

  async function checkWorldHealth(worldId: string): Promise<WorldCandidate> {
    const world = await deps.store.getById(worldId);
    if (world === undefined) throw new Error(`World ${worldId} not found`);

    if (world.healthPercent <= cfg.deathThreshold * 100 && world.status !== 'dead') {
      const dead: WorldCandidate = {
        ...world,
        status: 'dead',
        diedAt: deps.clock.now(),
      };
      await deps.store.save(dead);
      worldsDead++;
      deps.log.warn('world-death', { worldId, healthPercent: world.healthPercent });
      return dead;
    }

    return world;
  }

  async function initiateEvacuation(worldId: string, targetWorldIds: readonly string[]): Promise<EvacuationState> {
    const pop = await deps.store.getPopulationCount(worldId);
    totalEvacuations++;

    const state: EvacuationState = {
      worldId,
      phase: 'warning',
      playerCount: pop,
      evacuatedCount: 0,
      deadlineAt: deps.clock.now() + BigInt(cfg.evacuationWindowMs),
      targetWorldIds,
    };

    deps.log.warn('evacuation-initiated', { worldId, playerCount: pop, targetWorlds: targetWorldIds.length });
    return state;
  }

  async function advanceSeason(worldId: string): Promise<SeasonType> {
    const world = await deps.store.getById(worldId);
    if (world === undefined) throw new Error(`World ${worldId} not found`);

    const currentIndex = SEASON_ORDER.indexOf(world.season);
    const nextSeason = SEASON_ORDER[(currentIndex + 1) % SEASON_ORDER.length]!;

    await deps.store.update(worldId, { season: nextSeason } as Partial<WorldCandidate>);
    deps.log.info('season-advanced', { worldId, from: world.season, to: nextSeason });
    return nextSeason;
  }

  function scheduleSeasonalEvent(partial: Omit<SeasonalEvent, 'eventId'>): SeasonalEvent {
    const event: SeasonalEvent = { ...partial, eventId: deps.id.next() };
    events.push(event);
    seasonalEventsRun++;
    deps.log.info('seasonal-event-scheduled', { eventId: event.eventId, type: event.type, worldCount: event.worldIds.length });
    return event;
  }

  function getActiveEvents(): readonly SeasonalEvent[] {
    const now = deps.clock.now();
    return events.filter(e => e.startsAt <= now && e.endsAt > now);
  }

  async function launchSurvey(playerIds: readonly string[], targetRegion: string): Promise<SurveyMission> {
    const mission: SurveyMission = {
      missionId: deps.id.next(),
      squadPlayerIds: playerIds,
      targetRegion,
      status: 'briefing',
      discoveredWorldId: undefined,
      startedAt: deps.clock.now(),
      completedAt: undefined,
    };
    surveys.set(mission.missionId, mission);
    deps.log.info('survey-launched', { missionId: mission.missionId, squad: playerIds.length, region: targetRegion });
    return mission;
  }

  async function completeSurvey(missionId: string, success: boolean): Promise<SurveyMission> {
    const mission = surveys.get(missionId);
    if (mission === undefined) throw new Error(`Survey ${missionId} not found`);

    const completed: SurveyMission = {
      ...mission,
      status: success ? 'completed' : 'failed',
      discoveredWorldId: success ? deps.id.next() : undefined,
      completedAt: deps.clock.now(),
    };

    surveys.set(missionId, completed);
    surveysCompleted++;
    deps.log.info('survey-completed', { missionId, success, discoveredWorldId: completed.discoveredWorldId });
    return completed;
  }

  function getStats(): WorldExpansionStats {
    return {
      worldsGenerated,
      worldsApproved,
      worldsRejected,
      worldsDead,
      activeWorldCount: 0,
      surveysCompleted,
      totalEvacuations,
      seasonalEventsRun,
    };
  }

  deps.log.info('world-expansion-engine-created', { targetWorlds: cfg.targetWorldCount, minQuality: cfg.minQualityScore });

  return {
    registerTemplate,
    getTemplate,
    generateWorld,
    scoreQuality,
    getReviewQueue,
    approveWorld,
    rejectWorld,
    applyDegradation,
    checkWorldHealth,
    initiateEvacuation,
    advanceSeason,
    scheduleSeasonalEvent,
    getActiveEvents,
    launchSurvey,
    completeSurvey,
    getStats,
  };
}
