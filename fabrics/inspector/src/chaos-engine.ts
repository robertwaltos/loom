/**
 * Chaos Engineering Engine — Scheduled fault injection and recovery validation.
 *
 * Provides controlled failure injection for production hardening:
 *   - Pod/process kill simulation
 *   - Network partition simulation
 *   - Database failover drills
 *   - Disk-full / resource exhaustion
 *   - Latency injection (delay spikes)
 *   - Region failure simulation
 *   - Cache eviction storms
 *
 * Experiments follow a lifecycle:
 *   SCHEDULED → PREPARING → INJECTING → OBSERVING → RECOVERING → COMPLETED | ABORTED
 *
 * Safety features:
 *   - Blast radius limits (max affected services)
 *   - Automatic abort on critical metric breach
 *   - Cooldown between experiments
 *   - Manual kill switch via abort
 */

// ── Ports ────────────────────────────────────────────────────────

export interface ChaosClockPort {
  readonly nowMicroseconds: () => number;
}

export interface ChaosIdPort {
  readonly generate: () => string;
}

export interface ChaosLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
  readonly warn: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
  readonly error: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

export interface ChaosMetricsPort {
  readonly getMetric: (metricName: string) => number;
  readonly checkThresholdBreach: (metricName: string, threshold: number) => boolean;
}

export interface ChaosExecutorPort {
  readonly killProcess: (serviceId: string) => Promise<boolean>;
  readonly injectLatency: (serviceId: string, delayMs: number) => Promise<boolean>;
  readonly partitionNetwork: (fromServiceId: string, toServiceId: string) => Promise<boolean>;
  readonly healNetwork: (fromServiceId: string, toServiceId: string) => Promise<boolean>;
  readonly failoverDatabase: (primaryId: string, replicaId: string) => Promise<boolean>;
  readonly evictCache: (cacheId: string, percentage: number) => Promise<boolean>;
  readonly simulateDiskFull: (serviceId: string) => Promise<boolean>;
  readonly restoreService: (serviceId: string) => Promise<boolean>;
}

export interface ChaosNotificationPort {
  readonly notifyExperimentStart: (experiment: ChaosExperiment) => void;
  readonly notifyExperimentComplete: (experiment: ChaosExperiment) => void;
  readonly notifyAutoAbort: (experiment: ChaosExperiment, reason: string) => void;
}

// ── Types ────────────────────────────────────────────────────────

export type ChaosPhase =
  | 'SCHEDULED'
  | 'PREPARING'
  | 'INJECTING'
  | 'OBSERVING'
  | 'RECOVERING'
  | 'COMPLETED'
  | 'ABORTED';

export type FaultType =
  | 'process-kill'
  | 'network-partition'
  | 'latency-injection'
  | 'database-failover'
  | 'disk-full'
  | 'cache-eviction'
  | 'region-failure';

export interface ChaosExperiment {
  readonly experimentId: string;
  readonly name: string;
  readonly description: string;
  readonly faultType: FaultType;
  readonly targetServices: ReadonlyArray<string>;
  readonly phase: ChaosPhase;
  readonly scheduledAt: number;
  readonly startedAt: number;
  readonly completedAt: number;
  readonly injectionDurationMs: number;
  readonly observationDurationMs: number;
  readonly hypothesis: string;
  readonly result: ExperimentResult | null;
  readonly events: ReadonlyArray<ChaosEvent>;
  readonly safetyConfig: SafetyConfig;
}

export interface ExperimentResult {
  readonly passed: boolean;
  readonly recoveryTimeMs: number;
  readonly dataLossDetected: boolean;
  readonly metricsSnapshot: Readonly<Record<string, number>>;
  readonly notes: string;
}

export interface ChaosEvent {
  readonly timestamp: number;
  readonly eventType: string;
  readonly details: Readonly<Record<string, unknown>>;
}

export interface SafetyConfig {
  readonly maxBlastRadiusServices: number;
  readonly autoAbortMetric: string;
  readonly autoAbortThreshold: number;
  readonly cooldownAfterMs: number;
}

export interface ScheduleExperimentParams {
  readonly name: string;
  readonly description: string;
  readonly faultType: FaultType;
  readonly targetServices: ReadonlyArray<string>;
  readonly injectionDurationMs: number;
  readonly observationDurationMs: number;
  readonly hypothesis: string;
  readonly scheduledAt: number;
  readonly safetyConfig?: Partial<SafetyConfig>;
}

// ── Config ───────────────────────────────────────────────────────

export interface ChaosEngineConfig {
  readonly defaultInjectionDurationMs: number;
  readonly defaultObservationDurationMs: number;
  readonly maxConcurrentExperiments: number;
  readonly globalCooldownMs: number;
  readonly defaultBlastRadiusLimit: number;
  readonly defaultAutoAbortMetric: string;
  readonly defaultAutoAbortThreshold: number;
}

const DEFAULT_CONFIG: ChaosEngineConfig = {
  defaultInjectionDurationMs: 30_000,
  defaultObservationDurationMs: 120_000,
  maxConcurrentExperiments: 1,
  globalCooldownMs: 300_000,
  defaultBlastRadiusLimit: 3,
  defaultAutoAbortMetric: 'error_rate_5xx',
  defaultAutoAbortThreshold: 0.25,
};

const DEFAULT_SAFETY: SafetyConfig = {
  maxBlastRadiusServices: 3,
  autoAbortMetric: 'error_rate_5xx',
  autoAbortThreshold: 0.25,
  cooldownAfterMs: 300_000,
};

// ── Stats ────────────────────────────────────────────────────────

export interface ChaosEngineStats {
  readonly totalExperiments: number;
  readonly activeExperiments: number;
  readonly completedExperiments: number;
  readonly abortedExperiments: number;
  readonly passedExperiments: number;
  readonly failedExperiments: number;
  readonly averageRecoveryTimeMs: number;
}

// ── Public API ───────────────────────────────────────────────────

export interface ChaosEngine {
  readonly scheduleExperiment: (params: ScheduleExperimentParams) => ChaosExperiment;
  readonly startExperiment: (experimentId: string) => Promise<ChaosExperiment>;
  readonly abortExperiment: (experimentId: string, reason: string) => Promise<ChaosExperiment>;
  readonly completeExperiment: (
    experimentId: string,
    result: ExperimentResult,
  ) => ChaosExperiment;
  readonly getExperiment: (experimentId: string) => ChaosExperiment | undefined;
  readonly getActiveExperiments: () => ReadonlyArray<ChaosExperiment>;
  readonly getHistory: () => ReadonlyArray<ChaosExperiment>;
  readonly tick: () => Promise<void>;
  readonly getStats: () => ChaosEngineStats;
}

// ── Deps ─────────────────────────────────────────────────────────

export interface ChaosEngineDeps {
  readonly clock: ChaosClockPort;
  readonly idGenerator: ChaosIdPort;
  readonly logger: ChaosLogPort;
  readonly metrics: ChaosMetricsPort;
  readonly executor: ChaosExecutorPort;
  readonly notifications: ChaosNotificationPort;
}

// ── Mutable State ────────────────────────────────────────────────

interface MutableExperiment {
  readonly experimentId: string;
  readonly name: string;
  readonly description: string;
  readonly faultType: FaultType;
  readonly targetServices: ReadonlyArray<string>;
  phase: ChaosPhase;
  readonly scheduledAt: number;
  startedAt: number;
  completedAt: number;
  readonly injectionDurationMs: number;
  readonly observationDurationMs: number;
  readonly hypothesis: string;
  result: ExperimentResult | null;
  readonly events: ChaosEvent[];
  readonly safetyConfig: SafetyConfig;
  injectionStartedAt: number;
  observationStartedAt: number;
}

// ── Factory ──────────────────────────────────────────────────────

export function createChaosEngine(
  deps: ChaosEngineDeps,
  config?: Partial<ChaosEngineConfig>,
): ChaosEngine {
  const cfg: ChaosEngineConfig = { ...DEFAULT_CONFIG, ...config };

  const experiments = new Map<string, MutableExperiment>();
  const history: ChaosExperiment[] = [];
  let lastCompletedAt = 0;
  let passedCount = 0;
  let failedCount = 0;
  let totalRecoveryTimeMs = 0;
  let completedCount = 0;

  function toReadonly(e: MutableExperiment): ChaosExperiment {
    return {
      experimentId: e.experimentId,
      name: e.name,
      description: e.description,
      faultType: e.faultType,
      targetServices: e.targetServices,
      phase: e.phase,
      scheduledAt: e.scheduledAt,
      startedAt: e.startedAt,
      completedAt: e.completedAt,
      injectionDurationMs: e.injectionDurationMs,
      observationDurationMs: e.observationDurationMs,
      hypothesis: e.hypothesis,
      result: e.result,
      events: [...e.events],
      safetyConfig: e.safetyConfig,
    };
  }

  function addEvent(e: MutableExperiment, eventType: string, details: Readonly<Record<string, unknown>>): void {
    e.events.push({ timestamp: deps.clock.nowMicroseconds(), eventType, details });
  }

  function scheduleExperiment(params: ScheduleExperimentParams): ChaosExperiment {
    const safety: SafetyConfig = { ...DEFAULT_SAFETY, ...params.safetyConfig };

    if (params.targetServices.length > safety.maxBlastRadiusServices) {
      throw new Error(
        `Blast radius exceeded: ${params.targetServices.length} targets > ${safety.maxBlastRadiusServices} limit`,
      );
    }

    const activeCount = [...experiments.values()].filter(
      e => e.phase !== 'COMPLETED' && e.phase !== 'ABORTED',
    ).length;
    if (activeCount >= cfg.maxConcurrentExperiments) {
      throw new Error(`Max concurrent experiments (${cfg.maxConcurrentExperiments}) reached`);
    }

    const exp: MutableExperiment = {
      experimentId: deps.idGenerator.generate(),
      name: params.name,
      description: params.description,
      faultType: params.faultType,
      targetServices: params.targetServices,
      phase: 'SCHEDULED',
      scheduledAt: params.scheduledAt,
      startedAt: 0,
      completedAt: 0,
      injectionDurationMs: params.injectionDurationMs,
      observationDurationMs: params.observationDurationMs,
      hypothesis: params.hypothesis,
      result: null,
      events: [],
      safetyConfig: safety,
      injectionStartedAt: 0,
      observationStartedAt: 0,
    };

    addEvent(exp, 'SCHEDULED', { name: params.name, faultType: params.faultType });
    experiments.set(exp.experimentId, exp);

    deps.logger.info(
      { experimentId: exp.experimentId, name: exp.name, faultType: exp.faultType },
      'chaos_experiment_scheduled',
    );

    return toReadonly(exp);
  }

  async function startExperiment(experimentId: string): Promise<ChaosExperiment> {
    const exp = experiments.get(experimentId);
    if (!exp) throw new Error(`Experiment ${experimentId} not found`);
    if (exp.phase !== 'SCHEDULED') throw new Error(`Experiment not in SCHEDULED phase: ${exp.phase}`);

    const now = deps.clock.nowMicroseconds();

    // Check global cooldown
    if (lastCompletedAt > 0 && (now - lastCompletedAt) < cfg.globalCooldownMs * 1_000) {
      throw new Error('Global cooldown period has not elapsed');
    }

    exp.phase = 'PREPARING';
    exp.startedAt = now;
    addEvent(exp, 'PREPARING', {});

    deps.notifications.notifyExperimentStart(toReadonly(exp));

    // Inject faults
    exp.phase = 'INJECTING';
    exp.injectionStartedAt = deps.clock.nowMicroseconds();
    addEvent(exp, 'INJECTING', { targets: exp.targetServices });

    try {
      await injectFault(exp);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      exp.phase = 'ABORTED';
      exp.completedAt = deps.clock.nowMicroseconds();
      addEvent(exp, 'INJECTION_FAILED', { error: message });
      deps.logger.error({ experimentId, error: message }, 'chaos_injection_failed');
      return toReadonly(exp);
    }

    addEvent(exp, 'FAULTS_INJECTED', {});
    deps.logger.info({ experimentId, faultType: exp.faultType }, 'chaos_faults_injected');

    exp.phase = 'OBSERVING';
    exp.observationStartedAt = deps.clock.nowMicroseconds();
    addEvent(exp, 'OBSERVING', {});

    return toReadonly(exp);
  }

  async function injectFault(exp: MutableExperiment): Promise<void> {
    for (const service of exp.targetServices) {
      switch (exp.faultType) {
        case 'process-kill':
          await deps.executor.killProcess(service);
          break;
        case 'network-partition':
          // Partition each target from all other targets
          for (const other of exp.targetServices) {
            if (other !== service) {
              await deps.executor.partitionNetwork(service, other);
            }
          }
          break;
        case 'latency-injection':
          await deps.executor.injectLatency(service, exp.injectionDurationMs);
          break;
        case 'database-failover':
          if (exp.targetServices.length >= 2) {
            await deps.executor.failoverDatabase(
              exp.targetServices[0]!,
              exp.targetServices[1]!,
            );
          }
          return; // Only one failover needed
        case 'disk-full':
          await deps.executor.simulateDiskFull(service);
          break;
        case 'cache-eviction':
          await deps.executor.evictCache(service, 0.8);
          break;
        case 'region-failure':
          await deps.executor.killProcess(service);
          break;
      }
    }
  }

  async function abortExperiment(experimentId: string, reason: string): Promise<ChaosExperiment> {
    const exp = experiments.get(experimentId);
    if (!exp) throw new Error(`Experiment ${experimentId} not found`);

    // Attempt to restore services
    for (const service of exp.targetServices) {
      try {
        await deps.executor.restoreService(service);
      } catch {
        deps.logger.error({ experimentId, service }, 'chaos_restore_failed_during_abort');
      }
      if (exp.faultType === 'network-partition') {
        for (const other of exp.targetServices) {
          if (other !== service) {
            try {
              await deps.executor.healNetwork(service, other);
            } catch {
              deps.logger.error({ experimentId, service, other }, 'chaos_heal_network_failed');
            }
          }
        }
      }
    }

    exp.phase = 'ABORTED';
    exp.completedAt = deps.clock.nowMicroseconds();
    addEvent(exp, 'ABORTED', { reason });

    deps.notifications.notifyAutoAbort(toReadonly(exp), reason);
    deps.logger.warn({ experimentId, reason }, 'chaos_experiment_aborted');

    const ro = toReadonly(exp);
    history.push(ro);
    lastCompletedAt = exp.completedAt;
    return ro;
  }

  function completeExperiment(
    experimentId: string,
    result: ExperimentResult,
  ): ChaosExperiment {
    const exp = experiments.get(experimentId);
    if (!exp) throw new Error(`Experiment ${experimentId} not found`);

    exp.phase = 'COMPLETED';
    exp.completedAt = deps.clock.nowMicroseconds();
    exp.result = result;
    addEvent(exp, 'COMPLETED', { passed: result.passed, recoveryTimeMs: result.recoveryTimeMs });

    if (result.passed) passedCount++;
    else failedCount++;
    completedCount++;
    totalRecoveryTimeMs += result.recoveryTimeMs;
    lastCompletedAt = exp.completedAt;

    deps.notifications.notifyExperimentComplete(toReadonly(exp));
    deps.logger.info(
      { experimentId, passed: result.passed, recoveryTimeMs: result.recoveryTimeMs },
      'chaos_experiment_completed',
    );

    const ro = toReadonly(exp);
    history.push(ro);
    return ro;
  }

  async function tick(): Promise<void> {
    const now = deps.clock.nowMicroseconds();

    for (const exp of experiments.values()) {
      if (exp.phase === 'OBSERVING') {
        // Check safety abort
        if (deps.metrics.checkThresholdBreach(
          exp.safetyConfig.autoAbortMetric,
          exp.safetyConfig.autoAbortThreshold,
        )) {
          await abortExperiment(exp.experimentId, `Safety threshold breached: ${exp.safetyConfig.autoAbortMetric}`);
          continue;
        }

        // Check observation window elapsed
        const observedUs = now - exp.observationStartedAt;
        if (observedUs >= exp.observationDurationMs * 1_000) {
          exp.phase = 'RECOVERING';
          addEvent(exp, 'RECOVERING', {});

          // Restore services
          for (const service of exp.targetServices) {
            try {
              await deps.executor.restoreService(service);
            } catch {
              deps.logger.error({ experimentId: exp.experimentId, service }, 'chaos_restore_failed');
            }
          }
        }
      }

      // Auto-start scheduled experiments when their time arrives
      if (exp.phase === 'SCHEDULED' && exp.scheduledAt <= now) {
        await startExperiment(exp.experimentId);
      }
    }
  }

  return {
    scheduleExperiment,
    startExperiment,
    abortExperiment,
    completeExperiment,
    getExperiment: (id: string) => {
      const e = experiments.get(id);
      return e ? toReadonly(e) : undefined;
    },
    getActiveExperiments: () =>
      [...experiments.values()]
        .filter(e => e.phase !== 'COMPLETED' && e.phase !== 'ABORTED')
        .map(toReadonly),
    getHistory: () => [...history],
    tick,
    getStats: (): ChaosEngineStats => ({
      totalExperiments: experiments.size,
      activeExperiments: [...experiments.values()].filter(
        e => e.phase !== 'COMPLETED' && e.phase !== 'ABORTED',
      ).length,
      completedExperiments: completedCount,
      abortedExperiments: [...experiments.values()].filter(e => e.phase === 'ABORTED').length
        + history.filter(e => e.phase === 'ABORTED').length,
      passedExperiments: passedCount,
      failedExperiments: failedCount,
      averageRecoveryTimeMs: completedCount > 0 ? totalRecoveryTimeMs / completedCount : 0,
    }),
  };
}
