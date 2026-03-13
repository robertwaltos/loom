import { describe, expect, it, vi } from 'vitest';
import { createPlayerAnalyticsEngine } from '../player-analytics.js';
import type {
  CohortMetricSet,
  PlayerAnalyticsDeps,
  SessionRecord,
  SurveyResponse,
} from '../player-analytics.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function makeClock(start = 0n) {
  let nowValue = start;
  return {
    now: () => nowValue,
    set: (next: bigint) => {
      nowValue = next;
    },
  };
}

function makeId(prefix = 'analytics') {
  let idx = 0;
  return {
    next: () => `${prefix}-${++idx}`,
  };
}

function makeDeps() {
  const clock = makeClock();
  const actionCounts = new Map<string, number>();
  const cohortAssignments = new Map<string, string>();
  const surveys = new Map<string, { count: number; avg: number }>();

  const log = {
    info: vi.fn<(msg: string, ctx?: Record<string, unknown>) => void>(),
    warn: vi.fn<(msg: string, ctx?: Record<string, unknown>) => void>(),
    error: vi.fn<(msg: string, ctx?: Record<string, unknown>) => void>(),
  };

  const deps: PlayerAnalyticsDeps = {
    clock,
    id: makeId(),
    log,
    events: {
      emit: () => undefined,
    },
    metrics: {
      getSessionHistory: vi.fn(async () => [] as const),
      getActionCounts: vi.fn(async () => actionCounts),
      getEconomicHistory: vi.fn(async () => [] as const),
    },
    cohorts: {
      assignCohort: vi.fn(async (playerId: string, experimentId: string, variant: string) => {
        cohortAssignments.set(`${playerId}:${experimentId}`, variant);
      }),
      getCohort: vi.fn(async (playerId: string, experimentId: string) => cohortAssignments.get(`${playerId}:${experimentId}`)),
      getCohortMetrics: vi.fn(async (): Promise<CohortMetricSet> => ({
        sampleSize: 0,
        averageMetric: 0,
        standardDeviation: 0,
      })),
    },
    surveys: {
      storeSurveyResponse: vi.fn(async (response: SurveyResponse) => {
        const existing = surveys.get(response.surveyId) ?? { count: 0, avg: 0 };
        const score = response.npsScore ?? 0;
        const count = existing.count + 1;
        const avg = (existing.avg * existing.count + score) / count;
        surveys.set(response.surveyId, { count, avg });
      }),
      getSurveyResults: vi.fn(async (surveyId: string) => {
        const aggregate = surveys.get(surveyId) ?? { count: 0, avg: 0 };
        return {
          surveyId,
          responseCount: aggregate.count,
          averageNps: aggregate.avg,
          npsBreakdown: { promoters: 0, passives: 0, detractors: aggregate.count },
        };
      }),
    },
  };

  return { deps, clock, actionCounts, log };
}

function makeSession(playerId: string, worldId: string, startedAtMs: number, durationMs: number, actionsPerformed: number): SessionRecord {
  return {
    sessionId: `${playerId}-${startedAtMs}`,
    playerId,
    worldId,
    startedAt: BigInt(startedAtMs),
    endedAt: BigInt(startedAtMs + durationMs),
    durationMs,
    actionsPerformed,
    primaryActivity: 'explorer',
  };
}

describe('Player Analytics Simulation', () => {
  it('tracks players, updates funnel stage, and classifies play style from deterministic action counts', async () => {
    const { deps, actionCounts, log } = makeDeps();
    const engine = createPlayerAnalyticsEngine(deps);

    engine.trackPlayer('player-1', 0n);
    engine.updateFunnelStage('player-1', 'first-trade');

    actionCounts.set('trade', 10);
    actionCounts.set('market-order', 2);
    actionCounts.set('chat', 4);
    actionCounts.set('travel', 1);

    const profile = await engine.classifyPlayStyle('player-1');

    expect(profile.funnelStage).toBe('first-trade');
    expect(profile.primaryPlayStyle).toBe('trader');
    expect(profile.secondaryPlayStyle).toBe('socializer');
    expect(profile.playStyleConfidence).toBeCloseTo(12 / 17, 6);
    expect(log.info).toHaveBeenCalledWith('funnel-stage-updated', { playerId: 'player-1', stage: 'first-trade' });
  });

  it('predicts churn using inactivity and session decline signals and reports high-risk players', async () => {
    const { deps, clock } = makeDeps();
    const engine = createPlayerAnalyticsEngine(deps);

    engine.trackPlayer('player-risk', 0n);
    engine.recordSession(makeSession('player-risk', 'world-a', 1_000, 1_000, 10));
    engine.recordSession(makeSession('player-risk', 'world-a', 2_000, 1_000, 8));
    engine.recordSession(makeSession('player-risk', 'world-a', 3_000, 100, 3));
    engine.recordSession(makeSession('player-risk', 'world-a', 4_000, 100, 2));

    clock.set(BigInt(20 * DAY_MS));

    const prediction = await engine.predictChurn('player-risk');

    expect(prediction.risk).toBe('critical');
    expect(prediction.suggestedIntervention).toBe('personal-outreach');
    expect(prediction.signals.map(signal => signal.signal)).toContain('days-inactive');
    expect(prediction.signals.map(signal => signal.signal)).toContain('session-frequency-decline');
    expect(engine.getHighRiskPlayers()).toHaveLength(1);
    expect(engine.getStats().highRiskPlayers).toBe(1);
    expect(engine.getStats().churnPredictionsMade).toBe(1);
  });

  it('builds funnel report metrics and records report generation in stats', () => {
    const { deps } = makeDeps();
    const engine = createPlayerAnalyticsEngine(deps);

    engine.trackPlayer('a', 0n);
    engine.trackPlayer('b', 0n);
    engine.updateFunnelStage('a', 'first-trade');
    engine.updateFunnelStage('b', 'tutorial-completed');

    const report = engine.generateFunnelReport();

    expect(report.stages[0]?.playerCount).toBe(2);
    expect(report.stages[2]?.playerCount).toBe(2);
    expect(report.stages[3]?.playerCount).toBe(1);
    expect(report.biggestDropoff).toBe('first-assembly');
    expect(report.overallConversionRate).toBe(0);
    expect(engine.getStats().funnelReportsGenerated).toBe(1);
  });

  it('computes engagement curve, economy analytics, and difficulty recommendation from recorded data', () => {
    const { deps, clock } = makeDeps();
    clock.set(999n);
    const engine = createPlayerAnalyticsEngine(deps);

    engine.trackPlayer('p-1', 0n);
    engine.trackPlayer('p-2', 0n);

    engine.recordSession(makeSession('p-1', 'loom-world', 2 * 3_600_000, 4_000, 20));
    engine.recordSession(makeSession('p-2', 'loom-world', 2 * 3_600_000 + 200, 2_000, 10));
    engine.recordSession(makeSession('p-1', 'loom-world', 5 * 3_600_000, 3_000, 8));

    const curve = engine.getEngagementCurve('loom-world');
    const economy = engine.computeEconomyAnalytics('loom-world', [10, 20, 100]);
    const difficulty = engine.recommendDifficulty('loom-world', [0.8, 1.2, 2.6, 1.7, 1.0]);

    expect(curve.peakHour).toBe(2);
    expect(curve.hourlyBuckets[2]?.activePlayers).toBe(2);
    expect(curve.hourlyBuckets[2]?.averageActions).toBe(15);
    expect(economy.medianWealth).toBe(20);
    expect(economy.topWealthPercentile).toBe(100);
    expect(economy.measuredAt).toBe(999n);
    expect(difficulty.recommendedDifficulty).toBeGreaterThanOrEqual(0.5);
    expect(difficulty.recommendedDifficulty).toBeLessThanOrEqual(3);
  });

  it('runs A/B assignment deterministically, concludes experiment, and stores survey responses', async () => {
    const { deps } = makeDeps();
    const engine = createPlayerAnalyticsEngine(deps);

    const experiment = engine.createExperiment('new-market-ui', ['control', 'variant-b'], 'retention_d7', DAY_MS);

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.75);
    const firstVariant = await engine.assignVariant('player-ab', experiment.experimentId);
    const secondVariant = await engine.assignVariant('player-ab', experiment.experimentId);
    randomSpy.mockRestore();

    const result = engine.concludeExperiment(experiment.experimentId, [
      { variant: 'control', sampleSize: 120, metricValue: 0.45, confidenceInterval: [0.4, 0.5] },
      { variant: 'variant-b', sampleSize: 120, metricValue: 0.52, confidenceInterval: [0.48, 0.56] },
    ]);

    await engine.submitSurvey({
      surveyId: 's-1',
      playerId: 'player-ab',
      npsScore: 9,
      answers: new Map([['ux', 'good']]),
      submittedAt: 10n,
    });
    const surveys = await engine.getSurveyResults('s-1');

    expect(firstVariant).toBe('variant-b');
    expect(secondVariant).toBe('variant-b');
    expect(result.winner).toBe('variant-b');
    expect(result.statisticalSignificance).toBe(0.95);
    expect(surveys.responseCount).toBe(1);
    expect(engine.getStats().activeExperiments).toBe(0);
    expect(engine.getStats().surveysCollected).toBe(1);
  });
});
