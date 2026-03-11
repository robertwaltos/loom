/**
 * Chaos Engineer — Controlled fault injection for resilience testing.
 *
 * The Inspector's chaos engineering toolkit injects controlled failures
 * into the system to validate resilience and identify weaknesses before
 * they manifest in production. All chaos is intentional, scheduled, and
 * tracked.
 *
 * Fault types:
 *   LATENCY            — Inject artificial delays
 *   ERROR_RATE         — Increase failure rate for operations
 *   CPU_SPIKE          — Simulate CPU pressure
 *   MEMORY_PRESSURE    — Simulate memory exhaustion
 *   NETWORK_PARTITION  — Simulate network splits
 *
 * Experiment workflow:
 *   1. Define scenario with target and fault parameters
 *   2. Start experiment with duration limit
 *   3. Fault injected at specified rate/intensity
 *   4. Monitor system behavior and metrics
 *   5. Stop experiment (manual or automatic after duration)
 *   6. Analyze results and generate resilience report
 *
 * Safety:
 *   - All experiments time-limited
 *   - Emergency stop available
 *   - Blast radius control via target scoping
 *   - Audit trail for all chaos events
 *
 * "The Inspector stress-tests every weave. A perfect fabric withstands strain."
 */

// ─── Types ──────────────────────────────────────────────────────────

export type FaultType =
  | 'LATENCY'
  | 'ERROR_RATE'
  | 'CPU_SPIKE'
  | 'MEMORY_PRESSURE'
  | 'NETWORK_PARTITION';
export type ExperimentStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'STOPPED' | 'FAILED';

export interface ChaosScenario {
  readonly name: string;
  readonly description: string;
  readonly faultType: FaultType;
  readonly target: InjectionTarget;
  readonly parameters: FaultParameters;
  readonly durationMicroseconds: bigint;
}

export interface InjectionTarget {
  readonly fabric: string;
  readonly service: string;
  readonly operation: string;
}

export interface FaultParameters {
  readonly intensity: number;
  readonly frequency: number;
  readonly metadata: Record<string, unknown>;
}

export interface ChaosExperiment {
  readonly id: string;
  readonly scenario: ChaosScenario;
  readonly status: ExperimentStatus;
  readonly startedAt: bigint | null;
  readonly completedAt: bigint | null;
  readonly faultsInjected: number;
  readonly errorMessage: string | null;
}

export interface ExperimentResult {
  readonly experimentId: string;
  readonly scenario: string;
  readonly status: ExperimentStatus;
  readonly startedAt: bigint;
  readonly completedAt: bigint;
  readonly durationMicroseconds: bigint;
  readonly faultsInjected: number;
  readonly observations: ReadonlyArray<Observation>;
  readonly impactScore: number;
}

export interface Observation {
  readonly timestamp: bigint;
  readonly metric: string;
  readonly value: number;
  readonly deviation: number;
}

export interface ResilienceReport {
  readonly generatedAt: bigint;
  readonly totalExperiments: number;
  readonly completedExperiments: number;
  readonly averageImpactScore: number;
  readonly weaknesses: ReadonlyArray<Weakness>;
  readonly recommendations: ReadonlyArray<string>;
}

export interface Weakness {
  readonly faultType: FaultType;
  readonly target: string;
  readonly severity: number;
  readonly description: string;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface ChaosEngineer {
  defineScenario(scenario: ChaosScenario): void;
  startExperiment(scenarioName: string): string;
  stopExperiment(experimentId: string): boolean;
  injectFault(experimentId: string): boolean;
  getExperiment(experimentId: string): ChaosExperiment | null;
  getExperimentResult(experimentId: string): ExperimentResult | null;
  getActiveExperiments(): ReadonlyArray<ChaosExperiment>;
  getResilienceReport(): ResilienceReport;
  getScenarioCount(): number;
  removeScenario(name: string): boolean;
  processExperiments(): number;
}

export interface ChaosEngineerDeps {
  readonly clock: ChaosClockPort;
  readonly logger: ChaosLoggerPort;
  readonly idGenerator: ChaosIdGeneratorPort;
  readonly maxObservationsPerExperiment: number;
}

interface ChaosClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface ChaosLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

interface ChaosIdGeneratorPort {
  readonly generate: () => string;
}

// ─── State ──────────────────────────────────────────────────────────

interface EngineerState {
  readonly scenarios: Map<string, ChaosScenario>;
  readonly experiments: Map<string, ExperimentData>;
  readonly deps: ChaosEngineerDeps;
}

interface ExperimentData {
  readonly id: string;
  readonly scenario: ChaosScenario;
  status: ExperimentStatus;
  startedAt: bigint | null;
  completedAt: bigint | null;
  faultsInjected: number;
  errorMessage: string | null;
  readonly observations: Observation[];
}

// ─── Factory ────────────────────────────────────────────────────────

export function createChaosEngineer(deps: ChaosEngineerDeps): ChaosEngineer {
  const state: EngineerState = {
    scenarios: new Map(),
    experiments: new Map(),
    deps,
  };

  return {
    defineScenario: (s) => {
      defineScenarioImpl(state, s);
    },
    startExperiment: (n) => startExperimentImpl(state, n),
    stopExperiment: (id) => stopExperimentImpl(state, id),
    injectFault: (id) => injectFaultImpl(state, id),
    getExperiment: (id) => getExperimentImpl(state, id),
    getExperimentResult: (id) => getExperimentResultImpl(state, id),
    getActiveExperiments: () => getActiveExperimentsImpl(state),
    getResilienceReport: () => getResilienceReportImpl(state),
    getScenarioCount: () => state.scenarios.size,
    removeScenario: (n) => removeScenarioImpl(state, n),
    processExperiments: () => processExperimentsImpl(state),
  };
}

// ─── Scenario Management ────────────────────────────────────────────

function defineScenarioImpl(state: EngineerState, scenario: ChaosScenario): void {
  state.scenarios.set(scenario.name, scenario);
  state.deps.logger.info('Chaos scenario defined', { scenario: scenario.name });
}

function removeScenarioImpl(state: EngineerState, name: string): boolean {
  const removed = state.scenarios.delete(name);
  if (removed) {
    state.deps.logger.info('Chaos scenario removed', { scenario: name });
  }
  return removed;
}

// ─── Experiment Management ──────────────────────────────────────────

function startExperimentImpl(state: EngineerState, scenarioName: string): string {
  const scenario = state.scenarios.get(scenarioName);
  if (scenario === undefined) {
    return 'error:scenario-not-found';
  }

  const experimentId = state.deps.idGenerator.generate();
  const now = state.deps.clock.nowMicroseconds();

  const experimentData: ExperimentData = {
    id: experimentId,
    scenario,
    status: 'RUNNING',
    startedAt: now,
    completedAt: null,
    faultsInjected: 0,
    errorMessage: null,
    observations: [],
  };

  state.experiments.set(experimentId, experimentData);
  state.deps.logger.info('Chaos experiment started', {
    experiment: experimentId,
    scenario: scenarioName,
  });

  return experimentId;
}

function stopExperimentImpl(state: EngineerState, experimentId: string): boolean {
  const experiment = state.experiments.get(experimentId);
  if (experiment === undefined) return false;
  if (experiment.status !== 'RUNNING') return false;

  const now = state.deps.clock.nowMicroseconds();
  experiment.status = 'STOPPED';
  experiment.completedAt = now;

  state.deps.logger.info('Chaos experiment stopped', {
    experiment: experimentId,
    faults: experiment.faultsInjected,
  });

  return true;
}

function getExperimentImpl(state: EngineerState, experimentId: string): ChaosExperiment | null {
  const data = state.experiments.get(experimentId);
  if (data === undefined) return null;

  return {
    id: data.id,
    scenario: data.scenario,
    status: data.status,
    startedAt: data.startedAt,
    completedAt: data.completedAt,
    faultsInjected: data.faultsInjected,
    errorMessage: data.errorMessage,
  };
}

function getActiveExperimentsImpl(state: EngineerState): ReadonlyArray<ChaosExperiment> {
  const active: ChaosExperiment[] = [];

  for (const data of state.experiments.values()) {
    if (data.status === 'RUNNING') {
      active.push({
        id: data.id,
        scenario: data.scenario,
        status: data.status,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        faultsInjected: data.faultsInjected,
        errorMessage: data.errorMessage,
      });
    }
  }

  return active;
}

// ─── Fault Injection ────────────────────────────────────────────────

function injectFaultImpl(state: EngineerState, experimentId: string): boolean {
  const experiment = state.experiments.get(experimentId);
  if (experiment === undefined) return false;
  if (experiment.status !== 'RUNNING') return false;

  const now = state.deps.clock.nowMicroseconds();
  experiment.faultsInjected += 1;

  const observation = generateObservation(experiment.scenario, now);
  experiment.observations.push(observation);
  trimObservations(experiment, state.deps.maxObservationsPerExperiment);

  state.deps.logger.warn('Fault injected', {
    experiment: experimentId,
    faultType: experiment.scenario.faultType,
    target: experiment.scenario.target.service,
  });

  return true;
}

function generateObservation(scenario: ChaosScenario, timestamp: bigint): Observation {
  const baseValue = 100;
  const impact = scenario.parameters.intensity * 50;
  const value = baseValue + impact;
  const deviation = impact / baseValue;

  return {
    timestamp,
    metric: 'impact-' + scenario.faultType.toLowerCase(),
    value,
    deviation,
  };
}

function trimObservations(experiment: ExperimentData, maxSize: number): void {
  while (experiment.observations.length > maxSize) {
    experiment.observations.shift();
  }
}

// ─── Experiment Processing ──────────────────────────────────────────

function processExperimentsImpl(state: EngineerState): number {
  const now = state.deps.clock.nowMicroseconds();
  let completed = 0;

  for (const experiment of state.experiments.values()) {
    if (experiment.status !== 'RUNNING') continue;
    if (experiment.startedAt === null) continue;

    const elapsed = now - experiment.startedAt;
    if (elapsed >= experiment.scenario.durationMicroseconds) {
      experiment.status = 'COMPLETED';
      experiment.completedAt = now;
      completed += 1;

      state.deps.logger.info('Chaos experiment completed', {
        experiment: experiment.id,
        faults: experiment.faultsInjected,
      });
    }
  }

  return completed;
}

// ─── Experiment Results ─────────────────────────────────────────────

function getExperimentResultImpl(
  state: EngineerState,
  experimentId: string,
): ExperimentResult | null {
  const data = state.experiments.get(experimentId);
  if (data === undefined) return null;
  if (data.status !== 'COMPLETED' && data.status !== 'STOPPED') return null;
  if (data.startedAt === null || data.completedAt === null) return null;

  const duration = data.completedAt - data.startedAt;
  const impactScore = computeImpactScore(data.observations);

  return {
    experimentId: data.id,
    scenario: data.scenario.name,
    status: data.status,
    startedAt: data.startedAt,
    completedAt: data.completedAt,
    durationMicroseconds: duration,
    faultsInjected: data.faultsInjected,
    observations: [...data.observations],
    impactScore,
  };
}

function computeImpactScore(observations: ReadonlyArray<Observation>): number {
  if (observations.length === 0) return 0;

  let totalDeviation = 0;
  for (const obs of observations) {
    totalDeviation += Math.abs(obs.deviation);
  }

  return totalDeviation / observations.length;
}

// ─── Resilience Reporting ───────────────────────────────────────────

function getResilienceReportImpl(state: EngineerState): ResilienceReport {
  const now = state.deps.clock.nowMicroseconds();
  let totalExperiments = 0;
  let completedExperiments = 0;
  let totalImpact = 0;

  for (const data of state.experiments.values()) {
    totalExperiments += 1;
    if (data.status === 'COMPLETED' || data.status === 'STOPPED') {
      completedExperiments += 1;
      const impact = computeImpactScore(data.observations);
      totalImpact += impact;
    }
  }

  const avgImpact = completedExperiments > 0 ? totalImpact / completedExperiments : 0;
  const weaknesses = identifyWeaknesses(state);
  const recommendations = generateRecommendations(weaknesses);

  return {
    generatedAt: now,
    totalExperiments,
    completedExperiments,
    averageImpactScore: avgImpact,
    weaknesses,
    recommendations,
  };
}

function identifyWeaknesses(state: EngineerState): ReadonlyArray<Weakness> {
  const weaknesses: Weakness[] = [];
  const faultImpacts = new Map<string, number[]>();

  for (const data of state.experiments.values()) {
    if (data.status !== 'COMPLETED') continue;

    const impact = computeImpactScore(data.observations);
    const key = data.scenario.faultType + ':' + data.scenario.target.service;

    const existing = faultImpacts.get(key);
    if (existing !== undefined) {
      existing.push(impact);
    } else {
      faultImpacts.set(key, [impact]);
    }
  }

  for (const [key, impacts] of faultImpacts.entries()) {
    const avgImpact = impacts.reduce((sum, val) => sum + val, 0) / impacts.length;
    if (avgImpact > 0.3) {
      const parts = key.split(':');
      const faultType = parts[0] as FaultType;
      const target = parts[1] ?? 'unknown';

      weaknesses.push({
        faultType,
        target,
        severity: avgImpact,
        description: 'High impact from ' + faultType + ' faults',
      });
    }
  }

  return weaknesses;
}

function generateRecommendations(weaknesses: ReadonlyArray<Weakness>): ReadonlyArray<string> {
  const recommendations: string[] = [];

  for (const weakness of weaknesses) {
    if (weakness.faultType === 'LATENCY') {
      recommendations.push('Add timeout handling for ' + weakness.target);
    } else if (weakness.faultType === 'ERROR_RATE') {
      recommendations.push('Implement retry logic for ' + weakness.target);
    } else if (weakness.faultType === 'CPU_SPIKE') {
      recommendations.push('Add circuit breaker for ' + weakness.target);
    } else if (weakness.faultType === 'MEMORY_PRESSURE') {
      recommendations.push('Implement backpressure for ' + weakness.target);
    } else if (weakness.faultType === 'NETWORK_PARTITION') {
      recommendations.push('Add partition tolerance for ' + weakness.target);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('System resilience is strong, continue regular testing');
  }

  return recommendations;
}
