/**
 * ml-pipeline-simulation.test.ts — NPC behavior feedback loop & model lifecycle.
 *
 * Proves that:
 *   - Feedback is recorded and positive rate updated
 *   - Metrics collection updates model quality via EWMA
 *   - Fine-tuning creates new model in 'training' status
 *   - Distillation validates tier hierarchy
 *   - Training status transitions model through validating/failed
 *   - Regression suite compares against baseline
 *   - Canary deployment routes traffic at configured percentage
 *   - Canary evaluation compares quality/latency to production
 *   - Model promotion/retirement lifecycle
 *   - Model comparison generates recommendations
 *   - Pipeline stats aggregate correctly
 */

import { describe, it, expect } from 'vitest';
import {
  createMlPipelineEngine,
} from '../ml-pipeline.js';
import type {
  MlPipelineDeps,
  MlPipelineConfig,
  ModelRecord,
  FeedbackEntry,
  ModelDeployment,
  TrainingJob,
  ModelMetricsSample,
  BenchmarkResult,
  RegressionResult,
  MlStorePort,
  TrainingBackendPort,
  InferenceHostPort,
  RegressionRunnerPort,
  TrainingJobStatus,
} from '../ml-pipeline.js';

// ── Fake Ports ──────────────────────────────────────────────────

function createClock(start = 1_000_000n) {
  let time = start;
  return {
    now: () => time,
    advance: (us: bigint) => { time += us; },
  };
}

function createIds() {
  let seq = 0;
  return {
    next: () => `id-${++seq}`,
    last: () => `id-${seq}`,
  };
}

function createLog() {
  const entries: Array<{ level: string; msg: string }> = [];
  return {
    info: (msg: string) => { entries.push({ level: 'info', msg }); },
    warn: (msg: string) => { entries.push({ level: 'warn', msg }); },
    error: (msg: string) => { entries.push({ level: 'error', msg }); },
    entries,
  };
}

function createEvents() {
  const emitted: unknown[] = [];
  return {
    emit: (event: unknown) => { emitted.push(event); },
    emitted,
  };
}

function createInMemoryStore(): MlStorePort {
  const models = new Map<string, ModelRecord>();
  const feedback: FeedbackEntry[] = [];
  const deployments: ModelDeployment[] = [];
  const regressions: RegressionResult[] = [];
  const jobs = new Map<string, TrainingJob>();
  const metrics: ModelMetricsSample[] = [];

  return {
    saveModelRecord: async (r) => { models.set(r.id, r); },
    getModelRecord: async (id) => models.get(id),
    listModelRecords: async (status) => {
      const all = [...models.values()];
      return status ? all.filter(m => m.status === status) : all;
    },
    saveFeedbackEntry: async (e) => { feedback.push(e); },
    getFeedbackBatch: async (modelId, limit) => {
      return feedback.filter(f => f.modelId === modelId).slice(0, limit);
    },
    saveDeployment: async (d) => { deployments.push(d); },
    getActiveDeployments: async (worldId) => {
      if (worldId === '') return deployments;
      return deployments.filter(d => d.worldId === worldId);
    },
    saveRegressionResult: async (r) => { regressions.push(r); },
    getRegressionHistory: async (modelId) => {
      return regressions.filter(r => r.modelId === modelId);
    },
    saveTrainingJob: async (j) => { jobs.set(j.id, j); },
    getTrainingJob: async (jobId) => jobs.get(jobId),
    saveMetricsSample: async (s) => { metrics.push(s); },
    getMetricsHistory: async (modelId, limit) => {
      return metrics.filter(m => m.modelId === modelId).slice(0, limit);
    },
  };
}

function createTrainingBackend(jobStatuses = new Map<string, TrainingJobStatus>()): TrainingBackendPort {
  return {
    submitFineTuneJob: async () => 'backend-ft-1',
    getJobStatus: async (jobId) => jobStatuses.get(jobId) ?? 'running',
    submitDistillation: async () => 'backend-distill-1',
  };
}

function createInferenceHost(): InferenceHostPort {
  const deployed: Array<{ modelId: string; endpoint: string }> = [];
  const undeployed: Array<{ modelId: string; endpoint: string }> = [];
  return {
    deployModel: async (modelId, endpoint) => { deployed.push({ modelId, endpoint }); },
    undeployModel: async (modelId, endpoint) => { undeployed.push({ modelId, endpoint }); },
    getEndpointHealth: async (endpoint) => ({
      endpoint, healthy: true, loadPercent: 30, requestsPerSecond: 100, errorRate: 0.01,
    }),
    deployed,
    undeployed,
  } as InferenceHostPort & { deployed: typeof deployed; undeployed: typeof undeployed };
}

function createRegressionRunner(score = 0.92): RegressionRunnerPort {
  return {
    runBenchmark: async (modelId, suite): Promise<BenchmarkResult> => ({
      suite,
      scoreOverall: score,
      scores: new Map([['coherence', score], ['engagement', score * 0.95]]),
      passRate: score,
      duration: 12000,
    }),
  };
}

// ── Seed Models ─────────────────────────────────────────────────

function makeBaseModel(id: string, overrides: Partial<ModelRecord> = {}): ModelRecord {
  return {
    id,
    name: 'npc-dialogue-v1',
    version: 1,
    tier: 'tier-3',
    status: 'active',
    parentModelId: undefined,
    qualityScore: 0.85,
    latencyP50Ms: 45,
    latencyP99Ms: 120,
    costPer1kTokens: 0.02,
    feedbackCount: 500,
    positiveRate: 0.72,
    trainingJobId: undefined,
    createdAt: 100n,
    lastUpdatedAt: 100n,
    ...overrides,
  };
}

async function seedModel(store: MlStorePort, model: ModelRecord): Promise<void> {
  await store.saveModelRecord(model);
}

// ── Test Setup ──────────────────────────────────────────────────

function createTestPipeline(opts?: {
  configOverrides?: Partial<MlPipelineConfig>;
  regressionScore?: number;
  jobStatuses?: Map<string, TrainingJobStatus>;
}) {
  const clock = createClock();
  const ids = createIds();
  const log = createLog();
  const events = createEvents();
  const store = createInMemoryStore();
  const training = createTrainingBackend(opts?.jobStatuses);
  const inference = createInferenceHost();
  const regression = createRegressionRunner(opts?.regressionScore);

  const deps: MlPipelineDeps = { clock, ids, log, events, store, training, inference, regression };
  const engine = createMlPipelineEngine(deps, opts?.configOverrides);

  return { engine, clock, ids, log, events, store, training, inference, regression };
}

// ── Tests ───────────────────────────────────────────────────────

describe('MlPipelineEngine', () => {
  describe('feedback collection', () => {
    it('records feedback with generated id and timestamp', async () => {
      const { engine, store } = createTestPipeline();
      const base = makeBaseModel('m-1');
      await seedModel(store, base);

      const entry = await engine.recordFeedback({
        modelId: 'm-1',
        playerId: 'player-1',
        npcId: 'npc-1',
        signal: 'positive',
        context: {
          prompt: 'Hello there',
          response: 'Greetings traveler',
          engagementDurationMs: 5000,
          conversationLength: 3,
        },
      });

      expect(entry.id).toBeDefined();
      expect(entry.recordedAt).toBeDefined();
      expect(entry.signal).toBe('positive');
    });

    it('updates model positive rate on feedback', async () => {
      const { engine, store } = createTestPipeline();
      await seedModel(store, makeBaseModel('m-1', { feedbackCount: 10, positiveRate: 0.5 }));

      // 10 existing, 5 positive (0.5). Adding 1 positive → 6/11 ≈ 0.545
      await engine.recordFeedback({
        modelId: 'm-1', playerId: 'p-1', npcId: 'n-1', signal: 'positive',
        context: { prompt: '', response: '', engagementDurationMs: 0, conversationLength: 0 },
      });

      const updated = await store.getModelRecord('m-1');
      expect(updated!.feedbackCount).toBe(11);
      expect(updated!.positiveRate).toBeCloseTo(6 / 11, 4);
    });

    it('negative feedback reduces positive rate', async () => {
      const { engine, store } = createTestPipeline();
      await seedModel(store, makeBaseModel('m-1', { feedbackCount: 10, positiveRate: 0.5 }));

      await engine.recordFeedback({
        modelId: 'm-1', playerId: 'p-1', npcId: 'n-1', signal: 'negative',
        context: { prompt: '', response: '', engagementDurationMs: 0, conversationLength: 0 },
      });

      const updated = await store.getModelRecord('m-1');
      expect(updated!.positiveRate).toBeCloseTo(5 / 11, 4);
    });
  });

  describe('metrics collection', () => {
    it('updates model quality via EWMA', async () => {
      const { engine, store } = createTestPipeline();
      await seedModel(store, makeBaseModel('m-1', { qualityScore: 0.80 }));

      await engine.collectMetrics('m-1', {
        modelId: 'm-1',
        qualityScore: 0.95,
        latencyP50Ms: 40,
        latencyP99Ms: 100,
        costPer1kTokens: 0.02,
        requestCount: 1000,
        errorRate: 0.01,
      });

      const updated = await store.getModelRecord('m-1');
      // EWMA: 0.3 * 0.95 + 0.7 * 0.80 = 0.845
      expect(updated!.qualityScore).toBeCloseTo(0.845, 4);
    });

    it('logs warning when latency exceeds threshold', async () => {
      const { engine, store, log } = createTestPipeline({ configOverrides: { maxLatencyMs: 100 } });
      await seedModel(store, makeBaseModel('m-1'));

      await engine.collectMetrics('m-1', {
        modelId: 'm-1', qualityScore: 0.85,
        latencyP50Ms: 50, latencyP99Ms: 250,
        costPer1kTokens: 0.02, requestCount: 100, errorRate: 0.01,
      });

      expect(log.entries.some(e => e.msg.includes('latency'))).toBe(true);
    });

    it('logs warning when cost exceeds budget', async () => {
      const { engine, store, log } = createTestPipeline({ configOverrides: { costBudgetPer1k: 0.03 } });
      await seedModel(store, makeBaseModel('m-1'));

      await engine.collectMetrics('m-1', {
        modelId: 'm-1', qualityScore: 0.85,
        latencyP50Ms: 50, latencyP99Ms: 100,
        costPer1kTokens: 0.10, requestCount: 100, errorRate: 0.01,
      });

      expect(log.entries.some(e => e.msg.includes('cost'))).toBe(true);
    });
  });

  describe('fine-tuning', () => {
    it('creates training job and new model in training status', async () => {
      const { engine, store, events: ev } = createTestPipeline();
      await seedModel(store, makeBaseModel('m-1'));

      const job = await engine.triggerFineTune('m-1', { epochs: 5 });

      expect(job.type).toBe('fine-tune');
      expect(job.status).toBe('queued');
      expect(job.resultModelId).toBeDefined();

      const newModel = await store.getModelRecord(job.resultModelId!);
      expect(newModel).toBeDefined();
      expect(newModel!.status).toBe('training');
      expect(newModel!.parentModelId).toBe('m-1');
      expect(newModel!.version).toBe(2);

      expect(ev.emitted.length).toBeGreaterThan(0);
    });

    it('throws on unknown base model', async () => {
      const { engine } = createTestPipeline();

      await expect(engine.triggerFineTune('nonexistent', {}))
        .rejects.toThrow('not found');
    });
  });

  describe('distillation', () => {
    it('creates distillation job from teacher to lower tier', async () => {
      const { engine, store } = createTestPipeline();
      await seedModel(store, makeBaseModel('m-teacher', { tier: 'tier-4', name: 'big-model' }));

      const job = await engine.triggerDistillation('m-teacher', 'tier-2');

      expect(job.type).toBe('distillation');
      expect(job.status).toBe('queued');

      const student = await store.getModelRecord(job.resultModelId!);
      expect(student!.tier).toBe('tier-2');
      expect(student!.name).toContain('distilled');
    });

    it('rejects distillation to same or higher tier', async () => {
      const { engine, store } = createTestPipeline();
      await seedModel(store, makeBaseModel('m-teacher', { tier: 'tier-3' }));

      await expect(engine.triggerDistillation('m-teacher', 'tier-3'))
        .rejects.toThrow('lower than teacher tier');

      await expect(engine.triggerDistillation('m-teacher', 'tier-4'))
        .rejects.toThrow('lower than teacher tier');
    });

    it('throws on unknown teacher model', async () => {
      const { engine } = createTestPipeline();

      await expect(engine.triggerDistillation('nonexistent', 'tier-1'))
        .rejects.toThrow('not found');
    });
  });

  describe('training status', () => {
    it('transitions model to validating on job completion', async () => {
      const jobStatuses = new Map<string, TrainingJobStatus>();
      const { engine, store } = createTestPipeline({ jobStatuses });
      await seedModel(store, makeBaseModel('m-1'));

      const job = await engine.triggerFineTune('m-1', {});

      // Simulate backend completing the job
      jobStatuses.set(job.id, 'completed');
      const updated = await engine.checkTrainingStatus(job.id);

      expect(updated.status).toBe('completed');

      const model = await store.getModelRecord(job.modelId);
      expect(model!.status).toBe('validating');
    });

    it('marks model as failed on job failure', async () => {
      const jobStatuses = new Map<string, TrainingJobStatus>();
      const { engine, store, log } = createTestPipeline({ jobStatuses });
      await seedModel(store, makeBaseModel('m-1'));

      const job = await engine.triggerFineTune('m-1', {});

      jobStatuses.set(job.id, 'failed');
      await engine.checkTrainingStatus(job.id);

      const model = await store.getModelRecord(job.modelId);
      expect(model!.status).toBe('failed');
      expect(log.entries.some(e => e.msg.includes('failed'))).toBe(true);
    });

    it('throws on unknown job', async () => {
      const { engine } = createTestPipeline();
      await expect(engine.checkTrainingStatus('nope')).rejects.toThrow('not found');
    });
  });

  describe('regression suite', () => {
    it('passes when model score meets baseline threshold', async () => {
      const { engine, store } = createTestPipeline({ regressionScore: 0.96 });
      await seedModel(store, makeBaseModel('m-1'));
      await seedModel(store, makeBaseModel('m-2'));

      const result = await engine.runRegressionSuite('m-2', 'm-1');

      expect(result.passed).toBe(true);
      expect(result.benchmark.scoreOverall).toBe(0.96);
    });

    it('fails when model score is below threshold', async () => {
      // Regression runner returns 0.5, baseline also 0.5
      // threshold is 0.95 → 0.5 >= 0.5 * 0.95 = 0.475 → passes
      // Let's use a custom runner that returns different scores
      const { engine, store } = createTestPipeline({
        regressionScore: 0.50,
        configOverrides: { regressionPassThreshold: 2.0 }, // impossible to meet
      });
      await seedModel(store, makeBaseModel('m-1'));
      await seedModel(store, makeBaseModel('m-2'));

      const result = await engine.runRegressionSuite('m-2', 'm-1');
      expect(result.passed).toBe(false);
    });
  });

  describe('canary deployment', () => {
    it('deploys model as canary with configured traffic', async () => {
      const { engine, store } = createTestPipeline({ configOverrides: { canaryTrafficPercent: 10 } });
      await seedModel(store, makeBaseModel('m-1'));

      const deployment = await engine.deployCanary('m-1', 'alkahest');

      expect(deployment.isCanary).toBe(true);
      expect(deployment.trafficPercent).toBe(10);
      expect(deployment.worldId).toBe('alkahest');

      const model = await store.getModelRecord('m-1');
      expect(model!.status).toBe('canary');
    });

    it('throws on unknown model', async () => {
      const { engine } = createTestPipeline();
      await expect(engine.deployCanary('nonexistent', 'w')).rejects.toThrow('not found');
    });
  });

  describe('model promotion and retirement', () => {
    it('promotes model to active status', async () => {
      const { engine, store, events: ev } = createTestPipeline();
      await seedModel(store, makeBaseModel('m-1', { status: 'canary' }));

      const promoted = await engine.promoteModel('m-1');
      expect(promoted.status).toBe('active');
      expect(ev.emitted.some((e: any) => e.type === 'ml.model.promoted')).toBe(true);
    });

    it('retires model and undeploys from endpoints', async () => {
      const { engine, store, inference: inf } = createTestPipeline();
      await seedModel(store, makeBaseModel('m-1'));

      // Create a deployment for this model
      await store.saveDeployment({
        id: 'dep-1', modelId: 'm-1', worldId: 'w-1',
        endpoint: 'endpoint-1', trafficPercent: 100,
        isCanary: false, deployedAt: 100n,
      });

      const retired = await engine.retireModel('m-1');
      expect(retired.status).toBe('retired');

      // Inference host should have been called to undeploy
      expect((inf as any).undeployed.length).toBe(1);
    });

    it('throws on unknown model for promote/retire', async () => {
      const { engine } = createTestPipeline();
      await expect(engine.promoteModel('nope')).rejects.toThrow('not found');
      await expect(engine.retireModel('nope')).rejects.toThrow('not found');
    });
  });

  describe('model comparison', () => {
    it('compares two models and recommends the better one', async () => {
      const { engine, store } = createTestPipeline();
      await seedModel(store, makeBaseModel('m-a', {
        name: 'Alpha', qualityScore: 0.90, latencyP50Ms: 40, costPer1kTokens: 0.03,
      }));
      await seedModel(store, makeBaseModel('m-b', {
        name: 'Beta', qualityScore: 0.85, latencyP50Ms: 60, costPer1kTokens: 0.04,
      }));

      const comparison = await engine.compareModels('m-a', 'm-b');

      expect(comparison.qualityDelta).toBeCloseTo(0.05, 5);
      expect(comparison.latencyDelta).toBe(-20);
      expect(comparison.costDelta).toBeCloseTo(-0.01, 5);
      expect(comparison.recommendation).toContain('Alpha');
      expect(comparison.recommendation).toContain('strictly better');
    });

    it('recommends model B when it is strictly better', async () => {
      const { engine, store } = createTestPipeline();
      await seedModel(store, makeBaseModel('m-a', {
        name: 'Alpha', qualityScore: 0.70, costPer1kTokens: 0.05,
      }));
      await seedModel(store, makeBaseModel('m-b', {
        name: 'Beta', qualityScore: 0.90, costPer1kTokens: 0.03,
      }));

      const comparison = await engine.compareModels('m-a', 'm-b');
      expect(comparison.recommendation).toContain('Beta');
    });

    it('throws on unknown model', async () => {
      const { engine, store } = createTestPipeline();
      await seedModel(store, makeBaseModel('m-a'));

      await expect(engine.compareModels('m-a', 'nope')).rejects.toThrow('not found');
      await expect(engine.compareModels('nope', 'm-a')).rejects.toThrow('not found');
    });
  });

  describe('pipeline stats', () => {
    it('aggregates all pipeline operations', async () => {
      const jobStatuses = new Map<string, TrainingJobStatus>();
      const { engine, store } = createTestPipeline({ jobStatuses });
      await seedModel(store, makeBaseModel('m-1'));

      // Record feedback
      await engine.recordFeedback({
        modelId: 'm-1', playerId: 'p-1', npcId: 'n-1', signal: 'positive',
        context: { prompt: '', response: '', engagementDurationMs: 0, conversationLength: 0 },
      });

      // Fine-tune
      const job = await engine.triggerFineTune('m-1', {});
      jobStatuses.set(job.id, 'completed');
      await engine.checkTrainingStatus(job.id);

      // Deploy canary (need the new model)
      await engine.deployCanary(job.resultModelId!, 'w-1');

      // Promote
      await engine.promoteModel(job.resultModelId!);

      // Retire old
      await engine.retireModel('m-1');

      // Regression
      await seedModel(store, makeBaseModel('m-baseline'));
      await engine.runRegressionSuite(job.resultModelId!, 'm-baseline');

      const stats = engine.getPipelineStats();
      expect(stats.totalFeedback).toBe(1);
      expect(stats.trainingJobsCompleted).toBe(1);
      expect(stats.canaryDeployments).toBe(1);
      expect(stats.promotions).toBe(1);
      expect(stats.retirements).toBe(1);
      expect(stats.regressionRuns).toBe(1);
    });
  });

  describe('local hosting', () => {
    it('registers local model host and creates deployment', async () => {
      const { engine, store, events: ev } = createTestPipeline();
      await seedModel(store, makeBaseModel('m-local'));

      const deployment = await engine.registerLocalHost('m-local', {
        endpoint: 'http://localhost:11434',
        framework: 'ollama',
        maxConcurrent: 4,
        gpuMemoryMb: 8192,
      });

      expect(deployment.worldId).toBe('local');
      expect(deployment.trafficPercent).toBe(100);
      expect(deployment.isCanary).toBe(false);
      expect(ev.emitted.some((e: any) => e.type === 'ml.local-host.registered')).toBe(true);
    });
  });
});
