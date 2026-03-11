/**
 * ML Model Continuous Improvement Pipeline — feedback-driven model lifecycle.
 *
 *   - NPC behavior feedback loop: engagement → training data → improved models
 *   - A/B model deployment: canary rollout of improved NPC models per world
 *   - Model performance monitoring: quality score, latency, cost per interaction
 *   - Fine-tuning pipeline: domain-specific LLM fine-tuning on game dialogue
 *   - Distillation: compress Tier 4 quality into smaller Tier 3 models
 *   - Local model hosting: Ollama/vLLM for latency-sensitive NPC interactions
 *   - Player feedback integration: thumbs up/down → RLHF
 *   - Automated regression testing: NPC behavior quality benchmarks per deploy
 *
 * "The Shuttle's models grow wiser with every conversation."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface MlClockPort {
  readonly now: () => bigint;
}

export interface MlIdPort {
  readonly next: () => string;
}

export interface MlLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface MlEventPort {
  readonly emit: (event: LoomEvent) => void;
}

// ─── Event Helper ───────────────────────────────────────────────

function makeEvent(
  type: string,
  payload: unknown,
  ids: MlIdPort,
  clock: MlClockPort,
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
      sourceFabricId: 'ml-pipeline',
      schemaVersion: 1,
    },
  };
}

export interface MlStorePort {
  readonly saveModelRecord: (record: ModelRecord) => Promise<void>;
  readonly getModelRecord: (modelId: string) => Promise<ModelRecord | undefined>;
  readonly listModelRecords: (status?: ModelStatus) => Promise<readonly ModelRecord[]>;
  readonly saveFeedbackEntry: (entry: FeedbackEntry) => Promise<void>;
  readonly getFeedbackBatch: (modelId: string, limit: number) => Promise<readonly FeedbackEntry[]>;
  readonly saveDeployment: (deployment: ModelDeployment) => Promise<void>;
  readonly getActiveDeployments: (worldId: string) => Promise<readonly ModelDeployment[]>;
  readonly saveRegressionResult: (result: RegressionResult) => Promise<void>;
  readonly getRegressionHistory: (modelId: string) => Promise<readonly RegressionResult[]>;
  readonly saveTrainingJob: (job: TrainingJob) => Promise<void>;
  readonly getTrainingJob: (jobId: string) => Promise<TrainingJob | undefined>;
  readonly saveMetricsSample: (sample: ModelMetricsSample) => Promise<void>;
  readonly getMetricsHistory: (modelId: string, limit: number) => Promise<readonly ModelMetricsSample[]>;
}

export interface TrainingBackendPort {
  readonly submitFineTuneJob: (config: FineTuneConfig) => Promise<string>;
  readonly getJobStatus: (jobId: string) => Promise<TrainingJobStatus>;
  readonly submitDistillation: (config: DistillConfig) => Promise<string>;
}

export interface InferenceHostPort {
  readonly deployModel: (modelId: string, endpoint: string) => Promise<void>;
  readonly undeployModel: (modelId: string, endpoint: string) => Promise<void>;
  readonly getEndpointHealth: (endpoint: string) => Promise<EndpointHealth>;
}

export interface RegressionRunnerPort {
  readonly runBenchmark: (modelId: string, suite: string) => Promise<BenchmarkResult>;
}

// ─── Constants ──────────────────────────────────────────────────────

const FEEDBACK_BATCH_SIZE = 500;
const CANARY_TRAFFIC_PERCENT = 5;
const CANARY_PROMOTION_THRESHOLD = 0.8;
const REGRESSION_PASS_THRESHOLD = 0.95;
const MIN_FEEDBACK_FOR_TRAINING = 1000;
const QUALITY_SCORE_EWMA_ALPHA = 0.3;
const MAX_LATENCY_MS = 200;
const COST_BUDGET_PER_1K = 0.05;

const MODEL_TIERS: ReadonlyArray<ModelTier> = ['tier-1', 'tier-2', 'tier-3', 'tier-4'];

// ─── Types ──────────────────────────────────────────────────────────

export type ModelTier = 'tier-1' | 'tier-2' | 'tier-3' | 'tier-4';
export type ModelStatus = 'training' | 'validating' | 'canary' | 'active' | 'retired' | 'failed';
export type FeedbackSignal = 'positive' | 'negative' | 'neutral';
export type TrainingJobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface ModelRecord {
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly tier: ModelTier;
  readonly status: ModelStatus;
  readonly parentModelId: string | undefined;
  readonly qualityScore: number;
  readonly latencyP50Ms: number;
  readonly latencyP99Ms: number;
  readonly costPer1kTokens: number;
  readonly feedbackCount: number;
  readonly positiveRate: number;
  readonly trainingJobId: string | undefined;
  readonly createdAt: bigint;
  readonly lastUpdatedAt: bigint;
}

export interface FeedbackEntry {
  readonly id: string;
  readonly modelId: string;
  readonly playerId: string;
  readonly npcId: string;
  readonly signal: FeedbackSignal;
  readonly context: FeedbackContext;
  readonly recordedAt: bigint;
}

export interface FeedbackContext {
  readonly prompt: string;
  readonly response: string;
  readonly engagementDurationMs: number;
  readonly conversationLength: number;
}

export interface ModelDeployment {
  readonly id: string;
  readonly modelId: string;
  readonly worldId: string;
  readonly endpoint: string;
  readonly trafficPercent: number;
  readonly isCanary: boolean;
  readonly deployedAt: bigint;
}

export interface ModelMetricsSample {
  readonly modelId: string;
  readonly qualityScore: number;
  readonly latencyP50Ms: number;
  readonly latencyP99Ms: number;
  readonly costPer1kTokens: number;
  readonly requestCount: number;
  readonly errorRate: number;
  readonly capturedAt: bigint;
}

export interface FineTuneConfig {
  readonly baseModelId: string;
  readonly trainingDataPath: string;
  readonly epochs: number;
  readonly learningRate: number;
  readonly batchSize: number;
  readonly validationSplit: number;
}

export interface DistillConfig {
  readonly teacherModelId: string;
  readonly studentTier: ModelTier;
  readonly datasetSize: number;
  readonly compressionRatio: number;
}

export interface TrainingJob {
  readonly id: string;
  readonly modelId: string;
  readonly type: 'fine-tune' | 'distillation';
  readonly status: TrainingJobStatus;
  readonly config: FineTuneConfig | DistillConfig;
  readonly startedAt: bigint;
  readonly completedAt: bigint | undefined;
  readonly resultModelId: string | undefined;
}

export interface BenchmarkResult {
  readonly suite: string;
  readonly scoreOverall: number;
  readonly scores: ReadonlyMap<string, number>;
  readonly passRate: number;
  readonly duration: number;
}

export interface RegressionResult {
  readonly id: string;
  readonly modelId: string;
  readonly benchmark: BenchmarkResult;
  readonly passed: boolean;
  readonly baselineModelId: string;
  readonly baselineScore: number;
  readonly ranAt: bigint;
}

export interface EndpointHealth {
  readonly endpoint: string;
  readonly healthy: boolean;
  readonly loadPercent: number;
  readonly requestsPerSecond: number;
  readonly errorRate: number;
}

export interface CanaryResult {
  readonly modelId: string;
  readonly worldId: string;
  readonly promoted: boolean;
  readonly qualityDelta: number;
  readonly latencyDelta: number;
  readonly rationale: string;
}

export interface LocalHostConfig {
  readonly endpoint: string;
  readonly framework: 'ollama' | 'vllm' | 'triton';
  readonly maxConcurrent: number;
  readonly gpuMemoryMb: number;
}

// ─── Deps & Config ──────────────────────────────────────────────────

export interface MlPipelineDeps {
  readonly clock: MlClockPort;
  readonly ids: MlIdPort;
  readonly log: MlLogPort;
  readonly events: MlEventPort;
  readonly store: MlStorePort;
  readonly training: TrainingBackendPort;
  readonly inference: InferenceHostPort;
  readonly regression: RegressionRunnerPort;
}

export interface MlPipelineConfig {
  readonly canaryTrafficPercent: number;
  readonly canaryPromotionThreshold: number;
  readonly regressionPassThreshold: number;
  readonly minFeedbackForTraining: number;
  readonly maxLatencyMs: number;
  readonly costBudgetPer1k: number;
  readonly feedbackBatchSize: number;
}

const DEFAULT_CONFIG: MlPipelineConfig = {
  canaryTrafficPercent: CANARY_TRAFFIC_PERCENT,
  canaryPromotionThreshold: CANARY_PROMOTION_THRESHOLD,
  regressionPassThreshold: REGRESSION_PASS_THRESHOLD,
  minFeedbackForTraining: MIN_FEEDBACK_FOR_TRAINING,
  maxLatencyMs: MAX_LATENCY_MS,
  costBudgetPer1k: COST_BUDGET_PER_1K,
  feedbackBatchSize: FEEDBACK_BATCH_SIZE,
};

// ─── Service Interface ──────────────────────────────────────────────

export interface MlPipelineEngine {
  readonly recordFeedback: (entry: Omit<FeedbackEntry, 'id' | 'recordedAt'>) => Promise<FeedbackEntry>;
  readonly collectMetrics: (modelId: string, sample: Omit<ModelMetricsSample, 'capturedAt'>) => Promise<void>;
  readonly triggerFineTune: (baseModelId: string, config: Partial<FineTuneConfig>) => Promise<TrainingJob>;
  readonly triggerDistillation: (teacherModelId: string, studentTier: ModelTier) => Promise<TrainingJob>;
  readonly checkTrainingStatus: (jobId: string) => Promise<TrainingJob>;
  readonly runRegressionSuite: (modelId: string, baselineModelId: string) => Promise<RegressionResult>;
  readonly deployCanary: (modelId: string, worldId: string) => Promise<ModelDeployment>;
  readonly evaluateCanary: (deploymentId: string) => Promise<CanaryResult>;
  readonly promoteModel: (modelId: string) => Promise<ModelRecord>;
  readonly retireModel: (modelId: string) => Promise<ModelRecord>;
  readonly registerLocalHost: (modelId: string, config: LocalHostConfig) => Promise<ModelDeployment>;
  readonly compareModels: (modelIdA: string, modelIdB: string) => Promise<ModelComparison>;
  readonly getPipelineStats: () => MlPipelineStats;
}

export interface ModelComparison {
  readonly modelA: ModelRecord;
  readonly modelB: ModelRecord;
  readonly qualityDelta: number;
  readonly latencyDelta: number;
  readonly costDelta: number;
  readonly recommendation: string;
}

export interface MlPipelineStats {
  readonly totalFeedback: number;
  readonly trainingJobsCompleted: number;
  readonly canaryDeployments: number;
  readonly promotions: number;
  readonly retirements: number;
  readonly regressionRuns: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createMlPipelineEngine(
  deps: MlPipelineDeps,
  config?: Partial<MlPipelineConfig>,
): MlPipelineEngine {
  const cfg: MlPipelineConfig = { ...DEFAULT_CONFIG, ...config };
  const { clock, ids, log, events, store, training, inference, regression } = deps;

  let totalFeedback = 0;
  let trainingJobsCompleted = 0;
  let canaryDeployments = 0;
  let promotions = 0;
  let retirements = 0;
  let regressionRuns = 0;

  // ── Feedback collection ─────────────────────────────────────────

  async function recordFeedback(
    entry: Omit<FeedbackEntry, 'id' | 'recordedAt'>,
  ): Promise<FeedbackEntry> {
    const full: FeedbackEntry = {
      ...entry,
      id: ids.next(),
      recordedAt: clock.now(),
    };

    await store.saveFeedbackEntry(full);
    totalFeedback++;

    const model = await store.getModelRecord(entry.modelId);
    if (model) {
      const newCount = model.feedbackCount + 1;
      const positiveDelta = entry.signal === 'positive' ? 1 : 0;
      const newPosRate = (model.positiveRate * model.feedbackCount + positiveDelta) / newCount;

      await store.saveModelRecord({
        ...model,
        feedbackCount: newCount,
        positiveRate: newPosRate,
        lastUpdatedAt: clock.now(),
      });
    }

    return full;
  }

  // ── Metrics collection ──────────────────────────────────────────

  async function collectMetrics(
    modelId: string,
    sample: Omit<ModelMetricsSample, 'capturedAt'>,
  ): Promise<void> {
    const full: ModelMetricsSample = {
      ...sample,
      capturedAt: clock.now(),
    };

    await store.saveMetricsSample(full);

    const model = await store.getModelRecord(modelId);
    if (model) {
      const newQuality = QUALITY_SCORE_EWMA_ALPHA * sample.qualityScore
        + (1 - QUALITY_SCORE_EWMA_ALPHA) * model.qualityScore;

      await store.saveModelRecord({
        ...model,
        qualityScore: newQuality,
        latencyP50Ms: sample.latencyP50Ms,
        latencyP99Ms: sample.latencyP99Ms,
        costPer1kTokens: sample.costPer1kTokens,
        lastUpdatedAt: clock.now(),
      });
    }

    if (sample.latencyP99Ms > cfg.maxLatencyMs) {
      log.warn('model latency exceeds threshold', { modelId, p99: sample.latencyP99Ms });
    }

    if (sample.costPer1kTokens > cfg.costBudgetPer1k) {
      log.warn('model cost exceeds budget', { modelId, cost: sample.costPer1kTokens });
    }
  }

  // ── Fine-tuning pipeline ────────────────────────────────────────

  async function triggerFineTune(
    baseModelId: string,
    partialConfig: Partial<FineTuneConfig>,
  ): Promise<TrainingJob> {
    const base = await store.getModelRecord(baseModelId);
    if (!base) {
      throw new Error(`Base model not found: ${baseModelId}`);
    }

    const fineTuneConfig: FineTuneConfig = {
      baseModelId,
      trainingDataPath: partialConfig.trainingDataPath ?? `/data/feedback/${baseModelId}`,
      epochs: partialConfig.epochs ?? 3,
      learningRate: partialConfig.learningRate ?? 2e-5,
      batchSize: partialConfig.batchSize ?? 32,
      validationSplit: partialConfig.validationSplit ?? 0.1,
    };

    const backendJobId = await training.submitFineTuneJob(fineTuneConfig);
    const newModelId = ids.next();

    const job: TrainingJob = {
      id: ids.next(),
      modelId: newModelId,
      type: 'fine-tune',
      status: 'queued',
      config: fineTuneConfig,
      startedAt: clock.now(),
      completedAt: undefined,
      resultModelId: newModelId,
    };

    await store.saveTrainingJob(job);

    const newModel: ModelRecord = {
      id: newModelId,
      name: `${base.name}-ft-v${base.version + 1}`,
      version: base.version + 1,
      tier: base.tier,
      status: 'training',
      parentModelId: baseModelId,
      qualityScore: 0,
      latencyP50Ms: 0,
      latencyP99Ms: 0,
      costPer1kTokens: 0,
      feedbackCount: 0,
      positiveRate: 0,
      trainingJobId: job.id,
      createdAt: clock.now(),
      lastUpdatedAt: clock.now(),
    };

    await store.saveModelRecord(newModel);

    events.emit(makeEvent(
      'ml.training.started',
      { jobId: job.id, modelId: newModelId, type: 'fine-tune', backendJobId },
      ids, clock,
    ));

    log.info('fine-tune job started', { jobId: job.id, baseModelId });
    return job;
  }

  // ── Distillation ────────────────────────────────────────────────

  async function triggerDistillation(
    teacherModelId: string,
    studentTier: ModelTier,
  ): Promise<TrainingJob> {
    const teacher = await store.getModelRecord(teacherModelId);
    if (!teacher) {
      throw new Error(`Teacher model not found: ${teacherModelId}`);
    }

    const tierIndex = MODEL_TIERS.indexOf(studentTier);
    const teacherTierIndex = MODEL_TIERS.indexOf(teacher.tier);
    if (tierIndex >= teacherTierIndex) {
      throw new Error(`Student tier must be lower than teacher tier`);
    }

    const distillConfig: DistillConfig = {
      teacherModelId,
      studentTier,
      datasetSize: 50_000,
      compressionRatio: teacherTierIndex - tierIndex + 1,
    };

    const backendJobId = await training.submitDistillation(distillConfig);
    const newModelId = ids.next();

    const job: TrainingJob = {
      id: ids.next(),
      modelId: newModelId,
      type: 'distillation',
      status: 'queued',
      config: distillConfig,
      startedAt: clock.now(),
      completedAt: undefined,
      resultModelId: newModelId,
    };

    await store.saveTrainingJob(job);

    const newModel: ModelRecord = {
      id: newModelId,
      name: `${teacher.name}-distilled-${studentTier}`,
      version: 1,
      tier: studentTier,
      status: 'training',
      parentModelId: teacherModelId,
      qualityScore: 0,
      latencyP50Ms: 0,
      latencyP99Ms: 0,
      costPer1kTokens: 0,
      feedbackCount: 0,
      positiveRate: 0,
      trainingJobId: job.id,
      createdAt: clock.now(),
      lastUpdatedAt: clock.now(),
    };

    await store.saveModelRecord(newModel);

    events.emit(makeEvent(
      'ml.distillation.started',
      { jobId: job.id, teacherModelId, studentTier, backendJobId },
      ids, clock,
    ));

    log.info('distillation started', { teacherModelId, studentTier });
    return job;
  }

  // ── Training status ─────────────────────────────────────────────

  async function checkTrainingStatus(jobId: string): Promise<TrainingJob> {
    const job = await store.getTrainingJob(jobId);
    if (!job) {
      throw new Error(`Training job not found: ${jobId}`);
    }

    const backendStatus = await training.getJobStatus(jobId);

    const updated: TrainingJob = {
      ...job,
      status: backendStatus,
      completedAt: backendStatus === 'completed' || backendStatus === 'failed'
        ? clock.now()
        : undefined,
    };

    await store.saveTrainingJob(updated);

    if (backendStatus === 'completed') {
      trainingJobsCompleted++;
      const model = await store.getModelRecord(job.modelId);
      if (model) {
        await store.saveModelRecord({
          ...model,
          status: 'validating',
          lastUpdatedAt: clock.now(),
        });
      }

      events.emit(makeEvent(
        'ml.training.completed',
        { jobId, modelId: job.modelId },
        ids, clock,
      ));
    }

    if (backendStatus === 'failed') {
      const model = await store.getModelRecord(job.modelId);
      if (model) {
        await store.saveModelRecord({
          ...model,
          status: 'failed',
          lastUpdatedAt: clock.now(),
        });
      }

      log.error('training job failed', { jobId, modelId: job.modelId });
    }

    return updated;
  }

  // ── Regression testing ──────────────────────────────────────────

  async function runRegressionSuite(
    modelId: string,
    baselineModelId: string,
  ): Promise<RegressionResult> {
    const benchmark = await regression.runBenchmark(modelId, 'npc-quality');
    const baselineBenchmark = await regression.runBenchmark(baselineModelId, 'npc-quality');

    const passed = benchmark.scoreOverall >= baselineBenchmark.scoreOverall * cfg.regressionPassThreshold;

    const result: RegressionResult = {
      id: ids.next(),
      modelId,
      benchmark,
      passed,
      baselineModelId,
      baselineScore: baselineBenchmark.scoreOverall,
      ranAt: clock.now(),
    };

    await store.saveRegressionResult(result);
    regressionRuns++;

    events.emit(makeEvent(
      'ml.regression.completed',
      { modelId, passed, score: benchmark.scoreOverall, baseline: baselineBenchmark.scoreOverall },
      ids, clock,
    ));

    log.info('regression suite completed', { modelId, passed, score: benchmark.scoreOverall });
    return result;
  }

  // ── Canary deployment ───────────────────────────────────────────

  async function deployCanary(modelId: string, worldId: string): Promise<ModelDeployment> {
    const model = await store.getModelRecord(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const endpoint = `canary-${worldId}-${modelId}`;
    await inference.deployModel(modelId, endpoint);

    const deployment: ModelDeployment = {
      id: ids.next(),
      modelId,
      worldId,
      endpoint,
      trafficPercent: cfg.canaryTrafficPercent,
      isCanary: true,
      deployedAt: clock.now(),
    };

    await store.saveDeployment(deployment);
    canaryDeployments++;

    await store.saveModelRecord({
      ...model,
      status: 'canary',
      lastUpdatedAt: clock.now(),
    });

    events.emit(makeEvent(
      'ml.canary.deployed',
      { modelId, worldId, trafficPercent: cfg.canaryTrafficPercent },
      ids, clock,
    ));

    log.info('canary deployed', { modelId, worldId });
    return deployment;
  }

  // ── Canary evaluation ───────────────────────────────────────────

  async function evaluateCanary(deploymentId: string): Promise<CanaryResult> {
    const deployments = await store.getActiveDeployments('');
    const deployment = deployments.find(d => d.id === deploymentId);
    if (!deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    const canaryModel = await store.getModelRecord(deployment.modelId);
    if (!canaryModel) {
      throw new Error(`Model not found: ${deployment.modelId}`);
    }

    const activeDeployments = await store.getActiveDeployments(deployment.worldId);
    const production = activeDeployments.find(d => !d.isCanary);
    if (!production) {
      return {
        modelId: deployment.modelId,
        worldId: deployment.worldId,
        promoted: true,
        qualityDelta: 0,
        latencyDelta: 0,
        rationale: 'No production model to compare against — promoting by default',
      };
    }

    const prodModel = await store.getModelRecord(production.modelId);
    if (!prodModel) {
      throw new Error(`Production model not found: ${production.modelId}`);
    }

    const qualityDelta = canaryModel.qualityScore - prodModel.qualityScore;
    const latencyDelta = canaryModel.latencyP50Ms - prodModel.latencyP50Ms;
    const promoted = canaryModel.qualityScore >= cfg.canaryPromotionThreshold
      && canaryModel.latencyP99Ms <= cfg.maxLatencyMs;

    const rationale = promoted
      ? `Quality ${canaryModel.qualityScore.toFixed(3)} meets threshold, latency ${canaryModel.latencyP99Ms}ms within budget`
      : `Quality ${canaryModel.qualityScore.toFixed(3)} or latency ${canaryModel.latencyP99Ms}ms outside bounds`;

    return {
      modelId: deployment.modelId,
      worldId: deployment.worldId,
      promoted,
      qualityDelta,
      latencyDelta,
      rationale,
    };
  }

  // ── Model promotion / retirement ────────────────────────────────

  async function promoteModel(modelId: string): Promise<ModelRecord> {
    const model = await store.getModelRecord(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const updated: ModelRecord = {
      ...model,
      status: 'active',
      lastUpdatedAt: clock.now(),
    };

    await store.saveModelRecord(updated);
    promotions++;

    events.emit(makeEvent(
      'ml.model.promoted',
      { modelId, tier: model.tier, qualityScore: model.qualityScore },
      ids, clock,
    ));

    log.info('model promoted to active', { modelId, tier: model.tier });
    return updated;
  }

  async function retireModel(modelId: string): Promise<ModelRecord> {
    const model = await store.getModelRecord(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    const deployments = await store.getActiveDeployments('');
    for (const d of deployments) {
      if (d.modelId === modelId) {
        await inference.undeployModel(modelId, d.endpoint);
      }
    }

    const updated: ModelRecord = {
      ...model,
      status: 'retired',
      lastUpdatedAt: clock.now(),
    };

    await store.saveModelRecord(updated);
    retirements++;

    events.emit(makeEvent(
      'ml.model.retired',
      { modelId },
      ids, clock,
    ));

    log.info('model retired', { modelId });
    return updated;
  }

  // ── Local model hosting ─────────────────────────────────────────

  async function registerLocalHost(
    modelId: string,
    localConfig: LocalHostConfig,
  ): Promise<ModelDeployment> {
    await inference.deployModel(modelId, localConfig.endpoint);

    const deployment: ModelDeployment = {
      id: ids.next(),
      modelId,
      worldId: 'local',
      endpoint: localConfig.endpoint,
      trafficPercent: 100,
      isCanary: false,
      deployedAt: clock.now(),
    };

    await store.saveDeployment(deployment);

    events.emit(makeEvent(
      'ml.local-host.registered',
      { modelId, framework: localConfig.framework, endpoint: localConfig.endpoint },
      ids, clock,
    ));

    log.info('local model host registered', {
      modelId,
      framework: localConfig.framework,
      endpoint: localConfig.endpoint,
    });
    return deployment;
  }

  // ── Model comparison ────────────────────────────────────────────

  async function compareModels(modelIdA: string, modelIdB: string): Promise<ModelComparison> {
    const modelA = await store.getModelRecord(modelIdA);
    const modelB = await store.getModelRecord(modelIdB);
    if (!modelA) throw new Error(`Model not found: ${modelIdA}`);
    if (!modelB) throw new Error(`Model not found: ${modelIdB}`);

    const qualityDelta = modelA.qualityScore - modelB.qualityScore;
    const latencyDelta = modelA.latencyP50Ms - modelB.latencyP50Ms;
    const costDelta = modelA.costPer1kTokens - modelB.costPer1kTokens;

    let recommendation: string;
    if (qualityDelta > 0 && costDelta <= 0) {
      recommendation = `${modelA.name} is strictly better: higher quality, lower cost`;
    } else if (qualityDelta < 0 && costDelta >= 0) {
      recommendation = `${modelB.name} is strictly better: higher quality, lower cost`;
    } else if (qualityDelta > 0) {
      recommendation = `${modelA.name} has better quality (+${qualityDelta.toFixed(3)}) but higher cost (+$${costDelta.toFixed(4)}/1k)`;
    } else {
      recommendation = `${modelB.name} has better quality (+${(-qualityDelta).toFixed(3)}) but higher cost (+$${(-costDelta).toFixed(4)}/1k)`;
    }

    return { modelA, modelB, qualityDelta, latencyDelta, costDelta, recommendation };
  }

  // ── Stats ───────────────────────────────────────────────────────

  function getPipelineStats(): MlPipelineStats {
    return {
      totalFeedback,
      trainingJobsCompleted,
      canaryDeployments,
      promotions,
      retirements,
      regressionRuns,
    };
  }

  return {
    recordFeedback,
    collectMetrics,
    triggerFineTune,
    triggerDistillation,
    checkTrainingStatus,
    runRegressionSuite,
    deployCanary,
    evaluateCanary,
    promoteModel,
    retireModel,
    registerLocalHost,
    compareModels,
    getPipelineStats,
  };
}
