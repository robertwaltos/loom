/**
 * Player Behavior Analytics — Retention intelligence and play-style insight.
 *
 * Tracks the full player lifecycle funnel and classifies behavior:
 *   - Journey funnel: registration → tutorial → first trade → assembly → 30d retention
 *   - Churn prediction: identify at-risk players, trigger interventions
 *   - Play style clustering: explorer/builder/trader/socializer (dynamic)
 *   - Session analytics: heatmaps, engagement curves, session length
 *   - Economy analytics: KALON velocity, wealth Gini, inflation tracking
 *   - A/B testing: feature flags, cohort assignment, metric comparison
 *   - Satisfaction surveys: in-game NPS, feature feedback
 *   - Dynamic difficulty: adjust world params by player skill distribution
 *
 * "The Inspector sees patterns where players see play."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface AnalyticsClockPort {
  readonly now: () => bigint;
}

export interface AnalyticsIdPort {
  readonly next: () => string;
}

export interface AnalyticsLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface AnalyticsEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface PlayerMetricsPort {
  readonly getSessionHistory: (playerId: string, windowMs: number) => Promise<readonly SessionRecord[]>;
  readonly getActionCounts: (playerId: string, windowMs: number) => Promise<ReadonlyMap<string, number>>;
  readonly getEconomicHistory: (playerId: string, windowMs: number) => Promise<readonly EconomicSnapshot[]>;
}

export interface CohortStorePort {
  readonly assignCohort: (playerId: string, experimentId: string, variant: string) => Promise<void>;
  readonly getCohort: (playerId: string, experimentId: string) => Promise<string | undefined>;
  readonly getCohortMetrics: (experimentId: string, variant: string) => Promise<CohortMetricSet>;
}

export interface SurveyStorePort {
  readonly storeSurveyResponse: (response: SurveyResponse) => Promise<void>;
  readonly getSurveyResults: (surveyId: string) => Promise<SurveyResults>;
}

// ─── Types ──────────────────────────────────────────────────────────

export type PlayStyle = 'explorer' | 'builder' | 'trader' | 'socializer' | 'fighter' | 'crafter' | 'politician';

export type FunnelStage =
  | 'registered'
  | 'tutorial-started'
  | 'tutorial-completed'
  | 'first-trade'
  | 'first-assembly'
  | 'first-dynasty'
  | 'day-7-active'
  | 'day-30-active'
  | 'day-90-active';

export type ChurnRisk = 'low' | 'medium' | 'high' | 'critical';

export interface SessionRecord {
  readonly sessionId: string;
  readonly playerId: string;
  readonly worldId: string;
  readonly startedAt: bigint;
  readonly endedAt: bigint;
  readonly durationMs: number;
  readonly actionsPerformed: number;
  readonly primaryActivity: PlayStyle;
}

export interface EconomicSnapshot {
  readonly timestamp: bigint;
  readonly kalonBalance: number;
  readonly kalonEarned: number;
  readonly kalonSpent: number;
  readonly tradeCount: number;
}

export interface PlayerProfile {
  readonly playerId: string;
  readonly primaryPlayStyle: PlayStyle;
  readonly secondaryPlayStyle: PlayStyle | undefined;
  readonly playStyleConfidence: number;
  readonly funnelStage: FunnelStage;
  readonly churnRisk: ChurnRisk;
  readonly totalSessionsMs: number;
  readonly averageSessionMs: number;
  readonly daysSinceLastSession: number;
  readonly wealthPercentile: number;
  readonly registeredAt: bigint;
  readonly lastActiveAt: bigint;
}

export interface FunnelReport {
  readonly windowMs: number;
  readonly stages: readonly FunnelStageMetric[];
  readonly overallConversionRate: number;
  readonly biggestDropoff: FunnelStage;
}

export interface FunnelStageMetric {
  readonly stage: FunnelStage;
  readonly playerCount: number;
  readonly conversionRate: number;
  readonly medianTimeToReachMs: number;
}

export interface ChurnPrediction {
  readonly playerId: string;
  readonly risk: ChurnRisk;
  readonly confidence: number;
  readonly signals: readonly ChurnSignal[];
  readonly suggestedIntervention: string;
  readonly predictedAt: bigint;
}

export interface ChurnSignal {
  readonly signal: string;
  readonly weight: number;
  readonly value: number;
  readonly threshold: number;
}

export interface HeatmapCell {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly playerMinutes: number;
  readonly actionCount: number;
}

export interface EngagementCurve {
  readonly worldId: string;
  readonly hourlyBuckets: readonly EngagementBucket[];
  readonly peakHour: number;
  readonly troughHour: number;
}

export interface EngagementBucket {
  readonly hour: number;
  readonly activePlayers: number;
  readonly averageActions: number;
}

export interface EconomyAnalytics {
  readonly worldId: string;
  readonly kalonVelocity: number;
  readonly wealthGini: number;
  readonly inflationRate: number;
  readonly tradeVolume: number;
  readonly topWealthPercentile: number;
  readonly medianWealth: number;
  readonly measuredAt: bigint;
}

export interface AbExperiment {
  readonly experimentId: string;
  readonly name: string;
  readonly description: string;
  readonly variants: readonly string[];
  readonly targetMetric: string;
  readonly startedAt: bigint;
  readonly endsAt: bigint;
  readonly status: 'running' | 'concluded' | 'paused';
}

export interface AbResult {
  readonly experimentId: string;
  readonly variants: readonly VariantResult[];
  readonly winner: string | undefined;
  readonly statisticalSignificance: number;
}

export interface VariantResult {
  readonly variant: string;
  readonly sampleSize: number;
  readonly metricValue: number;
  readonly confidenceInterval: readonly [number, number];
}

export interface CohortMetricSet {
  readonly sampleSize: number;
  readonly averageMetric: number;
  readonly standardDeviation: number;
}

export interface SurveyResponse {
  readonly surveyId: string;
  readonly playerId: string;
  readonly npsScore: number | undefined;
  readonly answers: ReadonlyMap<string, string>;
  readonly submittedAt: bigint;
}

export interface SurveyResults {
  readonly surveyId: string;
  readonly responseCount: number;
  readonly averageNps: number;
  readonly npsBreakdown: { readonly promoters: number; readonly passives: number; readonly detractors: number };
}

export interface DifficultyRecommendation {
  readonly worldId: string;
  readonly currentDifficulty: number;
  readonly recommendedDifficulty: number;
  readonly playerSkillMedian: number;
  readonly playerSkillSpread: number;
  readonly reason: string;
}

// ─── Config ─────────────────────────────────────────────────────────

export interface PlayerAnalyticsConfig {
  readonly churnThresholds: {
    readonly daysSinceLastSession: { readonly medium: number; readonly high: number; readonly critical: number };
    readonly sessionFrequencyDecline: number;
    readonly kalonBalanceDecline: number;
  };
  readonly funnelWindowMs: number;
  readonly heatmapResolution: number;
  readonly playStyleReclassificationMs: number;
}

// ─── Stats ──────────────────────────────────────────────────────────

export interface PlayerAnalyticsStats {
  readonly profilesTracked: number;
  readonly churnPredictionsMade: number;
  readonly highRiskPlayers: number;
  readonly activeExperiments: number;
  readonly surveysCollected: number;
  readonly funnelReportsGenerated: number;
}

// ─── Interface ──────────────────────────────────────────────────────

export interface PlayerAnalyticsEngine {
  // Player Profiles
  readonly trackPlayer: (playerId: string, registeredAt: bigint) => void;
  readonly updateFunnelStage: (playerId: string, stage: FunnelStage) => void;
  readonly classifyPlayStyle: (playerId: string) => Promise<PlayerProfile>;
  readonly getPlayerProfile: (playerId: string) => PlayerProfile | undefined;

  // Churn
  readonly predictChurn: (playerId: string) => Promise<ChurnPrediction>;
  readonly getHighRiskPlayers: () => readonly ChurnPrediction[];

  // Funnel
  readonly generateFunnelReport: () => FunnelReport;

  // Engagement
  readonly recordSession: (session: SessionRecord) => void;
  readonly getEngagementCurve: (worldId: string) => EngagementCurve;

  // Economy
  readonly computeEconomyAnalytics: (worldId: string, balances: readonly number[]) => EconomyAnalytics;

  // A/B Testing
  readonly createExperiment: (name: string, variants: readonly string[], targetMetric: string, durationMs: number) => AbExperiment;
  readonly assignVariant: (playerId: string, experimentId: string) => Promise<string>;
  readonly concludeExperiment: (experimentId: string, results: readonly VariantResult[]) => AbResult;

  // Surveys
  readonly submitSurvey: (response: SurveyResponse) => Promise<void>;
  readonly getSurveyResults: (surveyId: string) => Promise<SurveyResults>;

  // Dynamic Difficulty
  readonly recommendDifficulty: (worldId: string, playerSkills: readonly number[]) => DifficultyRecommendation;

  readonly getStats: () => PlayerAnalyticsStats;
}

// ─── Deps ───────────────────────────────────────────────────────────

export interface PlayerAnalyticsDeps {
  readonly clock: AnalyticsClockPort;
  readonly id: AnalyticsIdPort;
  readonly log: AnalyticsLogPort;
  readonly events: AnalyticsEventPort;
  readonly metrics: PlayerMetricsPort;
  readonly cohorts: CohortStorePort;
  readonly surveys: SurveyStorePort;
}

// ─── Defaults ───────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DEFAULT_CONFIG: PlayerAnalyticsConfig = {
  churnThresholds: {
    daysSinceLastSession: { medium: 3, high: 7, critical: 14 },
    sessionFrequencyDecline: 0.5,
    kalonBalanceDecline: 0.3,
  },
  funnelWindowMs: 30 * MS_PER_DAY,
  heatmapResolution: 100,
  playStyleReclassificationMs: 7 * MS_PER_DAY,
};

const PLAY_STYLE_ACTIONS: Record<PlayStyle, readonly string[]> = {
  explorer: ['travel', 'discover', 'survey', 'weave-transit'],
  builder: ['construct', 'upgrade', 'design', 'estate-expand'],
  trader: ['trade', 'market-order', 'auction', 'price-check'],
  socializer: ['chat', 'emote', 'friend', 'assembly-attend'],
  fighter: ['combat', 'duel', 'raid', 'war-participate'],
  crafter: ['craft', 'gather', 'refine', 'recipe-learn'],
  politician: ['vote', 'propose', 'campaign', 'govern'],
};

// ─── Factory ────────────────────────────────────────────────────────

export function createPlayerAnalyticsEngine(
  deps: PlayerAnalyticsDeps,
  config: Partial<PlayerAnalyticsConfig> = {},
): PlayerAnalyticsEngine {
  const cfg: PlayerAnalyticsConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    churnThresholds: { ...DEFAULT_CONFIG.churnThresholds, ...config.churnThresholds },
  };

  const profiles = new Map<string, PlayerProfile>();
  const churnPredictions = new Map<string, ChurnPrediction>();
  const experiments = new Map<string, AbExperiment>();
  const sessions = new Map<string, SessionRecord[]>();

  // Stats
  let churnPredictionsMade = 0;
  let surveysCollected = 0;
  let funnelReportsGenerated = 0;

  function trackPlayer(playerId: string, registeredAt: bigint): void {
    if (profiles.has(playerId)) return;
    const profile: PlayerProfile = {
      playerId,
      primaryPlayStyle: 'explorer',
      secondaryPlayStyle: undefined,
      playStyleConfidence: 0,
      funnelStage: 'registered',
      churnRisk: 'low',
      totalSessionsMs: 0,
      averageSessionMs: 0,
      daysSinceLastSession: 0,
      wealthPercentile: 50,
      registeredAt,
      lastActiveAt: registeredAt,
    };
    profiles.set(playerId, profile);
  }

  function updateFunnelStage(playerId: string, stage: FunnelStage): void {
    const profile = profiles.get(playerId);
    if (profile === undefined) return;
    profiles.set(playerId, { ...profile, funnelStage: stage });
    deps.log.info('funnel-stage-updated', { playerId, stage });
  }

  async function classifyPlayStyle(playerId: string): Promise<PlayerProfile> {
    const profile = profiles.get(playerId);
    if (profile === undefined) throw new Error(`Player ${playerId} not tracked`);

    const actions = await deps.metrics.getActionCounts(playerId, cfg.playStyleReclassificationMs);
    const styleCounts = new Map<PlayStyle, number>();

    for (const [style, keywords] of Object.entries(PLAY_STYLE_ACTIONS)) {
      let count = 0;
      for (const keyword of keywords) {
        count += actions.get(keyword) ?? 0;
      }
      styleCounts.set(style as PlayStyle, count);
    }

    const sorted = [...styleCounts.entries()].sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((sum, [, count]) => sum + count, 0);
    const primary = sorted[0]![0];
    const secondary = sorted.length > 1 && sorted[1]![1] > 0 ? sorted[1]![0] : undefined;
    const confidence = total > 0 ? sorted[0]![1] / total : 0;

    const updated: PlayerProfile = {
      ...profile,
      primaryPlayStyle: primary,
      secondaryPlayStyle: secondary,
      playStyleConfidence: confidence,
    };
    profiles.set(playerId, updated);
    return updated;
  }

  function getPlayerProfile(playerId: string): PlayerProfile | undefined {
    return profiles.get(playerId);
  }

  async function predictChurn(playerId: string): Promise<ChurnPrediction> {
    const profile = profiles.get(playerId);
    if (profile === undefined) throw new Error(`Player ${playerId} not tracked`);

    const now = deps.clock.now();
    const daysSinceLast = Number(now - profile.lastActiveAt) / MS_PER_DAY;

    const signals: ChurnSignal[] = [];
    let riskScore = 0;

    // Days since last session
    if (daysSinceLast >= cfg.churnThresholds.daysSinceLastSession.critical) {
      signals.push({ signal: 'days-inactive', weight: 3, value: daysSinceLast, threshold: cfg.churnThresholds.daysSinceLastSession.critical });
      riskScore += 3;
    } else if (daysSinceLast >= cfg.churnThresholds.daysSinceLastSession.high) {
      signals.push({ signal: 'days-inactive', weight: 2, value: daysSinceLast, threshold: cfg.churnThresholds.daysSinceLastSession.high });
      riskScore += 2;
    } else if (daysSinceLast >= cfg.churnThresholds.daysSinceLastSession.medium) {
      signals.push({ signal: 'days-inactive', weight: 1, value: daysSinceLast, threshold: cfg.churnThresholds.daysSinceLastSession.medium });
      riskScore += 1;
    }

    // Session frequency decline
    const recentSessions = sessions.get(playerId) ?? [];
    if (recentSessions.length >= 2) {
      const midpoint = Math.floor(recentSessions.length / 2);
      const firstHalf = recentSessions.slice(0, midpoint);
      const secondHalf = recentSessions.slice(midpoint);
      const firstAvg = firstHalf.reduce((sum, s) => sum + s.durationMs, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, s) => sum + s.durationMs, 0) / secondHalf.length;

      if (firstAvg > 0 && secondAvg / firstAvg < cfg.churnThresholds.sessionFrequencyDecline) {
        signals.push({ signal: 'session-frequency-decline', weight: 2, value: secondAvg / firstAvg, threshold: cfg.churnThresholds.sessionFrequencyDecline });
        riskScore += 2;
      }
    }

    const risk: ChurnRisk = riskScore >= 5 ? 'critical' : riskScore >= 3 ? 'high' : riskScore >= 1 ? 'medium' : 'low';
    const intervention = risk === 'critical' ? 'personal-outreach'
      : risk === 'high' ? 'targeted-event-invite'
      : risk === 'medium' ? 'reward-bonus'
      : 'none';

    const prediction: ChurnPrediction = {
      playerId,
      risk,
      confidence: Math.min(1, riskScore / 5),
      signals,
      suggestedIntervention: intervention,
      predictedAt: now,
    };

    churnPredictions.set(playerId, prediction);
    churnPredictionsMade++;
    profiles.set(playerId, { ...profile, churnRisk: risk, daysSinceLastSession: daysSinceLast });

    return prediction;
  }

  function getHighRiskPlayers(): readonly ChurnPrediction[] {
    const high: ChurnPrediction[] = [];
    for (const prediction of churnPredictions.values()) {
      if (prediction.risk === 'high' || prediction.risk === 'critical') {
        high.push(prediction);
      }
    }
    return high;
  }

  function generateFunnelReport(): FunnelReport {
    const stageCounts = new Map<FunnelStage, number>();
    const stages: FunnelStage[] = [
      'registered', 'tutorial-started', 'tutorial-completed',
      'first-trade', 'first-assembly', 'first-dynasty',
      'day-7-active', 'day-30-active', 'day-90-active',
    ];

    for (const stage of stages) {
      stageCounts.set(stage, 0);
    }

    for (const profile of profiles.values()) {
      const stageIndex = stages.indexOf(profile.funnelStage);
      for (let i = 0; i <= stageIndex; i++) {
        const count = stageCounts.get(stages[i]!) ?? 0;
        stageCounts.set(stages[i]!, count + 1);
      }
    }

    const totalRegistered = stageCounts.get('registered') ?? 0;
    let biggestDropoff: FunnelStage = 'registered';
    let biggestDropoffRate = 0;

    const stageMetrics: FunnelStageMetric[] = stages.map((stage, i) => {
      const count = stageCounts.get(stage) ?? 0;
      const prevCount = i > 0 ? (stageCounts.get(stages[i - 1]!) ?? 0) : count;
      const conversion = prevCount > 0 ? count / prevCount : 0;

      if (i > 0 && (1 - conversion) > biggestDropoffRate) {
        biggestDropoffRate = 1 - conversion;
        biggestDropoff = stage;
      }

      return {
        stage,
        playerCount: count,
        conversionRate: conversion,
        medianTimeToReachMs: 0,
      };
    });

    funnelReportsGenerated++;
    const overallConversion = totalRegistered > 0
      ? (stageCounts.get('day-30-active') ?? 0) / totalRegistered
      : 0;

    return {
      windowMs: cfg.funnelWindowMs,
      stages: stageMetrics,
      overallConversionRate: overallConversion,
      biggestDropoff,
    };
  }

  function recordSession(session: SessionRecord): void {
    const existing = sessions.get(session.playerId) ?? [];
    existing.push(session);
    sessions.set(session.playerId, existing);

    const profile = profiles.get(session.playerId);
    if (profile !== undefined) {
      const totalMs = profile.totalSessionsMs + session.durationMs;
      const count = existing.length;
      profiles.set(session.playerId, {
        ...profile,
        totalSessionsMs: totalMs,
        averageSessionMs: totalMs / count,
        lastActiveAt: session.endedAt,
        daysSinceLastSession: 0,
      });
    }
  }

  function getEngagementCurve(worldId: string): EngagementCurve {
    const hourBuckets = new Array<{ players: Set<string>; actions: number }>(24);
    for (let i = 0; i < 24; i++) {
      hourBuckets[i] = { players: new Set(), actions: 0 };
    }

    for (const playerSessions of sessions.values()) {
      for (const session of playerSessions) {
        if (session.worldId !== worldId) continue;
        const hour = Number(session.startedAt % 86_400_000n) / 3_600_000;
        const bucketIndex = Math.floor(hour) % 24;
        hourBuckets[bucketIndex]!.players.add(session.playerId);
        hourBuckets[bucketIndex]!.actions += session.actionsPerformed;
      }
    }

    const buckets: EngagementBucket[] = hourBuckets.map((b, i) => ({
      hour: i,
      activePlayers: b.players.size,
      averageActions: b.players.size > 0 ? b.actions / b.players.size : 0,
    }));

    let peakHour = 0;
    let troughHour = 0;
    let maxPlayers = 0;
    let minPlayers = Infinity;

    for (const bucket of buckets) {
      if (bucket.activePlayers > maxPlayers) {
        maxPlayers = bucket.activePlayers;
        peakHour = bucket.hour;
      }
      if (bucket.activePlayers < minPlayers) {
        minPlayers = bucket.activePlayers;
        troughHour = bucket.hour;
      }
    }

    return { worldId, hourlyBuckets: buckets, peakHour, troughHour };
  }

  function computeEconomyAnalytics(worldId: string, balances: readonly number[]): EconomyAnalytics {
    const sorted = [...balances].sort((a, b) => a - b);
    const n = sorted.length;
    const median = n > 0 ? sorted[Math.floor(n / 2)] : 0;
    const totalWealth = sorted.reduce((sum, b) => sum + b, 0);
    const mean = n > 0 ? totalWealth / n : 0;

    // Gini coefficient
    let gini = 0;
    if (n > 0 && totalWealth > 0) {
      let sumOfDiffs = 0;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          sumOfDiffs += Math.abs(sorted[i]! - sorted[j]!);
        }
      }
      gini = sumOfDiffs / (2 * n * totalWealth);
    }

    return {
      worldId,
      kalonVelocity: 0,
      wealthGini: gini,
      inflationRate: 0,
      tradeVolume: 0,
      topWealthPercentile: n > 0 ? sorted[Math.floor(n * 0.99)]! : 0,
      medianWealth: median ?? 0,
      measuredAt: deps.clock.now(),
    };
  }

  function createExperiment(
    name: string,
    variants: readonly string[],
    targetMetric: string,
    durationMs: number,
  ): AbExperiment {
    const now = deps.clock.now();
    const experiment: AbExperiment = {
      experimentId: deps.id.next(),
      name,
      description: `A/B test: ${name}`,
      variants,
      targetMetric,
      startedAt: now,
      endsAt: now + BigInt(durationMs),
      status: 'running',
    };
    experiments.set(experiment.experimentId, experiment);
    deps.log.info('experiment-created', { experimentId: experiment.experimentId, name, variants });
    return experiment;
  }

  async function assignVariant(playerId: string, experimentId: string): Promise<string> {
    const experiment = experiments.get(experimentId);
    if (experiment === undefined) throw new Error(`Experiment ${experimentId} not found`);

    const existing = await deps.cohorts.getCohort(playerId, experimentId);
    if (existing !== undefined) return existing;

    const variantIndex = Math.floor(Math.random() * experiment.variants.length);
    const variant = experiment.variants[variantIndex]!;
    await deps.cohorts.assignCohort(playerId, experimentId, variant);
    return variant;
  }

  function concludeExperiment(experimentId: string, results: readonly VariantResult[]): AbResult {
    const experiment = experiments.get(experimentId);
    if (experiment === undefined) throw new Error(`Experiment ${experimentId} not found`);

    experiments.set(experimentId, { ...experiment, status: 'concluded' });

    let winner: string | undefined = undefined;
    let bestMetric = -Infinity;
    for (const result of results) {
      if (result.metricValue > bestMetric) {
        bestMetric = result.metricValue;
        winner = result.variant;
      }
    }

    // Simplified statistical significance
    const significance = results.length >= 2 && results[0]!.sampleSize >= 100 ? 0.95 : 0.5;

    const abResult: AbResult = {
      experimentId,
      variants: results,
      winner: significance >= 0.95 ? winner : undefined,
      statisticalSignificance: significance,
    };

    deps.log.info('experiment-concluded', { experimentId, winner: abResult.winner, significance });
    return abResult;
  }

  async function submitSurvey(response: SurveyResponse): Promise<void> {
    await deps.surveys.storeSurveyResponse(response);
    surveysCollected++;
  }

  async function getSurveyResults(surveyId: string): Promise<SurveyResults> {
    return deps.surveys.getSurveyResults(surveyId);
  }

  function recommendDifficulty(worldId: string, playerSkills: readonly number[]): DifficultyRecommendation {
    const n = playerSkills.length;
    if (n === 0) {
      return {
        worldId,
        currentDifficulty: 1.0,
        recommendedDifficulty: 1.0,
        playerSkillMedian: 0,
        playerSkillSpread: 0,
        reason: 'No player data available',
      };
    }

    const sorted = [...playerSkills].sort((a, b) => a - b);
    const median = sorted[Math.floor(n / 2)]!;
    const q1 = sorted[Math.floor(n * 0.25)]!;
    const q3 = sorted[Math.floor(n * 0.75)]!;
    const spread = q3 - q1;

    // Target difficulty at 60th percentile for challenge without frustration
    const target = sorted[Math.floor(n * 0.6)]!;
    const recommended = Math.max(0.5, Math.min(3.0, target));

    return {
      worldId,
      currentDifficulty: 1.0,
      recommendedDifficulty: recommended,
      playerSkillMedian: median,
      playerSkillSpread: spread,
      reason: `Median skill ${median.toFixed(2)}, spread ${spread.toFixed(2)}. Targeting 60th percentile.` as string,
    };
  }

  function getStats(): PlayerAnalyticsStats {
    return {
      profilesTracked: profiles.size,
      churnPredictionsMade,
      highRiskPlayers: getHighRiskPlayers().length,
      activeExperiments: [...experiments.values()].filter(e => e.status === 'running').length,
      surveysCollected,
      funnelReportsGenerated,
    };
  }

  deps.log.info('player-analytics-engine-created', {
    churnCriticalDays: cfg.churnThresholds.daysSinceLastSession.critical,
    funnelWindowMs: cfg.funnelWindowMs,
  });

  return {
    trackPlayer,
    updateFunnelStage,
    classifyPlayStyle,
    getPlayerProfile,
    predictChurn,
    getHighRiskPlayers,
    generateFunnelReport,
    recordSession,
    getEngagementCurve,
    computeEconomyAnalytics,
    createExperiment,
    assignVariant,
    concludeExperiment,
    submitSurvey,
    getSurveyResults,
    recommendDifficulty,
    getStats,
  };
}
