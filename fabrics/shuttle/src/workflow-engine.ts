/**
 * Workflow Engine — Temporal-style workflow orchestration for NPC tasks.
 *
 * Defines workflows as sequences of typed steps with conditions,
 * branching, parallelism, loops, and compensating actions. Workflows
 * transition through: QUEUED -> RUNNING -> PAUSED -> COMPLETED/FAILED/CANCELLED.
 *
 * Step types:
 *   ACTION   — perform a discrete task
 *   WAIT     — pause for a duration
 *   DECISION — branch based on a condition
 *   PARALLEL — run multiple sub-steps concurrently
 *   LOOP     — repeat a step N times or until condition
 *
 * "The Shuttle orchestrates; the threads obey."
 */

// ── Ports ────────────────────────────────────────────────────────

interface WorkflowClock {
  readonly nowMicroseconds: () => number;
}

interface WorkflowIdGenerator {
  readonly next: () => string;
}

interface WorkflowDeps {
  readonly clock: WorkflowClock;
  readonly idGenerator: WorkflowIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type WorkflowStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

type StepType = 'action' | 'wait' | 'decision' | 'parallel' | 'loop';

type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

interface WorkflowStep {
  readonly stepId: string;
  readonly name: string;
  readonly stepType: StepType;
  readonly status: StepStatus;
  readonly executeFn: string;
  readonly compensateFn: string | null;
  readonly config: StepConfig;
}

interface StepConfig {
  readonly waitDurationUs: number;
  readonly maxIterations: number;
  readonly parallelStepIds: ReadonlyArray<string>;
}

interface WorkflowDefinition {
  readonly definitionId: string;
  readonly name: string;
  readonly steps: ReadonlyArray<WorkflowStep>;
  readonly createdAt: number;
}

interface DefineWorkflowParams {
  readonly name: string;
  readonly steps: ReadonlyArray<DefineStepParams>;
}

interface DefineStepParams {
  readonly name: string;
  readonly stepType: StepType;
  readonly executeFn: string;
  readonly compensateFn?: string;
  readonly waitDurationUs?: number;
  readonly maxIterations?: number;
}

interface WorkflowInstance {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly npcId: string;
  readonly status: WorkflowStatus;
  readonly currentStepIndex: number;
  readonly startedAt: number;
  readonly completedAt: number | null;
  readonly priority: number;
  readonly stepStatuses: ReadonlyArray<StepStatus>;
  readonly error: string | null;
}

interface StartWorkflowParams {
  readonly definitionId: string;
  readonly npcId: string;
  readonly priority?: number;
}

type StepExecutor = (npcId: string, stepName: string) => StepStatus;

interface WorkflowTickResult {
  readonly instanceId: string;
  readonly status: WorkflowStatus;
  readonly completedStep: string | null;
  readonly nextStep: string | null;
}

interface WorkflowStats {
  readonly totalDefinitions: number;
  readonly totalInstances: number;
  readonly queuedCount: number;
  readonly runningCount: number;
  readonly completedCount: number;
  readonly failedCount: number;
  readonly cancelledCount: number;
}

interface WorkflowEngine {
  readonly define: (params: DefineWorkflowParams) => WorkflowDefinition;
  readonly getDefinition: (definitionId: string) => WorkflowDefinition | undefined;
  readonly start: (params: StartWorkflowParams) => WorkflowInstance;
  readonly tick: (instanceId: string, executor: StepExecutor) => WorkflowTickResult;
  readonly pause: (instanceId: string) => boolean;
  readonly resume: (instanceId: string) => boolean;
  readonly cancel: (instanceId: string) => boolean;
  readonly compensate: (instanceId: string, executor: StepExecutor) => number;
  readonly getInstance: (instanceId: string) => WorkflowInstance | undefined;
  readonly getInstancesForNpc: (npcId: string) => ReadonlyArray<WorkflowInstance>;
  readonly getQueue: () => ReadonlyArray<WorkflowInstance>;
  readonly getStats: () => WorkflowStats;
}

// ── State ────────────────────────────────────────────────────────

interface MutableStepState {
  readonly stepId: string;
  readonly name: string;
  readonly stepType: StepType;
  status: StepStatus;
  readonly executeFn: string;
  readonly compensateFn: string | null;
  readonly config: StepConfig;
}

interface MutableInstance {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly npcId: string;
  status: WorkflowStatus;
  currentStepIndex: number;
  readonly startedAt: number;
  completedAt: number | null;
  readonly priority: number;
  readonly stepStates: MutableStepState[];
  error: string | null;
  iterationCount: number;
  waitStartedAt: number | null;
}

interface WorkflowState {
  readonly deps: WorkflowDeps;
  readonly definitions: Map<string, WorkflowDefinition>;
  readonly instances: Map<string, MutableInstance>;
}

// ── Operations ───────────────────────────────────────────────────

function defineImpl(state: WorkflowState, params: DefineWorkflowParams): WorkflowDefinition {
  const steps = params.steps.map((s) => buildStep(state, s));
  const definition: WorkflowDefinition = {
    definitionId: state.deps.idGenerator.next(),
    name: params.name,
    steps,
    createdAt: state.deps.clock.nowMicroseconds(),
  };
  state.definitions.set(definition.definitionId, definition);
  return definition;
}

function buildStep(state: WorkflowState, params: DefineStepParams): WorkflowStep {
  return {
    stepId: state.deps.idGenerator.next(),
    name: params.name,
    stepType: params.stepType,
    status: 'pending',
    executeFn: params.executeFn,
    compensateFn: params.compensateFn ?? null,
    config: {
      waitDurationUs: params.waitDurationUs ?? 0,
      maxIterations: params.maxIterations ?? 1,
      parallelStepIds: [],
    },
  };
}

function startImpl(state: WorkflowState, params: StartWorkflowParams): WorkflowInstance {
  const def = state.definitions.get(params.definitionId);
  if (def === undefined) throw new Error('Definition ' + params.definitionId + ' not found');

  const stepStates = def.steps.map((s) => toMutableStep(s));
  const instance: MutableInstance = {
    instanceId: state.deps.idGenerator.next(),
    definitionId: params.definitionId,
    npcId: params.npcId,
    status: 'queued',
    currentStepIndex: 0,
    startedAt: state.deps.clock.nowMicroseconds(),
    completedAt: null,
    priority: params.priority ?? 0,
    stepStates,
    error: null,
    iterationCount: 0,
    waitStartedAt: null,
  };
  state.instances.set(instance.instanceId, instance);
  return toReadonlyInstance(instance);
}

function toMutableStep(step: WorkflowStep): MutableStepState {
  return {
    stepId: step.stepId,
    name: step.name,
    stepType: step.stepType,
    status: 'pending',
    executeFn: step.executeFn,
    compensateFn: step.compensateFn,
    config: step.config,
  };
}

function tickImpl(
  state: WorkflowState,
  instanceId: string,
  executor: StepExecutor,
): WorkflowTickResult {
  const inst = state.instances.get(instanceId);
  if (inst === undefined) {
    return { instanceId, status: 'failed', completedStep: null, nextStep: null };
  }
  if (inst.status === 'queued') inst.status = 'running';
  if (inst.status !== 'running') {
    return { instanceId, status: inst.status, completedStep: null, nextStep: null };
  }
  return executeCurrentStep(state, inst, executor);
}

function executeCurrentStep(
  state: WorkflowState,
  inst: MutableInstance,
  executor: StepExecutor,
): WorkflowTickResult {
  const step = inst.stepStates[inst.currentStepIndex];
  if (step === undefined) return completeWorkflow(state, inst);

  if (step.stepType === 'wait') return handleWaitStep(state, inst, step);
  if (step.stepType === 'loop') return handleLoopStep(state, inst, step, executor);
  return handleActionStep(state, inst, step, executor);
}

function handleWaitStep(
  state: WorkflowState,
  inst: MutableInstance,
  step: MutableStepState,
): WorkflowTickResult {
  const now = state.deps.clock.nowMicroseconds();
  if (inst.waitStartedAt === null) {
    inst.waitStartedAt = now;
    step.status = 'running';
    return buildResult(inst, step.name, getNextStepName(inst));
  }
  const elapsed = now - inst.waitStartedAt;
  if (elapsed < step.config.waitDurationUs) {
    return buildResult(inst, null, step.name);
  }
  step.status = 'completed';
  inst.waitStartedAt = null;
  return advanceStep(state, inst, step.name);
}

function handleLoopStep(
  state: WorkflowState,
  inst: MutableInstance,
  step: MutableStepState,
  executor: StepExecutor,
): WorkflowTickResult {
  const result = executor(inst.npcId, step.name);
  if (result === 'failed') return failWorkflow(state, inst, step, 'Loop step failed');

  inst.iterationCount++;
  if (inst.iterationCount >= step.config.maxIterations) {
    step.status = 'completed';
    inst.iterationCount = 0;
    return advanceStep(state, inst, step.name);
  }
  step.status = 'running';
  return buildResult(inst, null, step.name);
}

function handleActionStep(
  state: WorkflowState,
  inst: MutableInstance,
  step: MutableStepState,
  executor: StepExecutor,
): WorkflowTickResult {
  step.status = 'running';
  const result = executor(inst.npcId, step.name);
  if (result === 'failed') return failWorkflow(state, inst, step, 'Step ' + step.name + ' failed');
  if (result === 'running') return buildResult(inst, null, step.name);
  step.status = 'completed';
  return advanceStep(state, inst, step.name);
}

function advanceStep(
  state: WorkflowState,
  inst: MutableInstance,
  completedStep: string,
): WorkflowTickResult {
  inst.currentStepIndex++;
  if (inst.currentStepIndex >= inst.stepStates.length) {
    return completeWorkflow(state, inst);
  }
  const next = inst.stepStates[inst.currentStepIndex];
  return {
    instanceId: inst.instanceId,
    status: 'running',
    completedStep,
    nextStep: next?.name ?? null,
  };
}

function completeWorkflow(state: WorkflowState, inst: MutableInstance): WorkflowTickResult {
  inst.status = 'completed';
  inst.completedAt = state.deps.clock.nowMicroseconds();
  return { instanceId: inst.instanceId, status: 'completed', completedStep: null, nextStep: null };
}

function failWorkflow(
  state: WorkflowState,
  inst: MutableInstance,
  step: MutableStepState,
  error: string,
): WorkflowTickResult {
  step.status = 'failed';
  inst.status = 'failed';
  inst.error = error;
  inst.completedAt = state.deps.clock.nowMicroseconds();
  return {
    instanceId: inst.instanceId,
    status: 'failed',
    completedStep: step.name,
    nextStep: null,
  };
}

function compensateImpl(state: WorkflowState, instanceId: string, executor: StepExecutor): number {
  const inst = state.instances.get(instanceId);
  if (inst === undefined) return 0;
  let compensated = 0;
  for (let i = inst.currentStepIndex; i >= 0; i--) {
    const step = inst.stepStates[i];
    if (step === undefined) continue;
    if (step.compensateFn === null) continue;
    if (step.status !== 'completed' && step.status !== 'failed') continue;
    executor(inst.npcId, step.compensateFn);
    compensated++;
  }
  return compensated;
}

function getQueueImpl(state: WorkflowState): ReadonlyArray<WorkflowInstance> {
  const queued: WorkflowInstance[] = [];
  for (const inst of state.instances.values()) {
    if (inst.status === 'queued') queued.push(toReadonlyInstance(inst));
  }
  queued.sort((a, b) => b.priority - a.priority);
  return queued;
}

function getStatsImpl(state: WorkflowState): WorkflowStats {
  let queued = 0;
  let running = 0;
  let completed = 0;
  let failed = 0;
  let cancelled = 0;
  for (const inst of state.instances.values()) {
    if (inst.status === 'queued') queued++;
    else if (inst.status === 'running') running++;
    else if (inst.status === 'completed') completed++;
    else if (inst.status === 'failed') failed++;
    else if (inst.status === 'cancelled') cancelled++;
  }
  return {
    totalDefinitions: state.definitions.size,
    totalInstances: state.instances.size,
    queuedCount: queued,
    runningCount: running,
    completedCount: completed,
    failedCount: failed,
    cancelledCount: cancelled,
  };
}

// ── Helpers ──────────────────────────────────────────────────────

function buildResult(
  inst: MutableInstance,
  completedStep: string | null,
  nextStep: string | null,
): WorkflowTickResult {
  return { instanceId: inst.instanceId, status: inst.status, completedStep, nextStep };
}

function getNextStepName(inst: MutableInstance): string | null {
  const next = inst.stepStates[inst.currentStepIndex + 1];
  return next?.name ?? null;
}

function toReadonlyInstance(inst: MutableInstance): WorkflowInstance {
  return {
    instanceId: inst.instanceId,
    definitionId: inst.definitionId,
    npcId: inst.npcId,
    status: inst.status,
    currentStepIndex: inst.currentStepIndex,
    startedAt: inst.startedAt,
    completedAt: inst.completedAt,
    priority: inst.priority,
    stepStatuses: inst.stepStates.map((s) => s.status),
    error: inst.error,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createWorkflowEngine(deps: WorkflowDeps): WorkflowEngine {
  const state: WorkflowState = {
    deps,
    definitions: new Map(),
    instances: new Map(),
  };

  return {
    define: (params) => defineImpl(state, params),
    getDefinition: (id) => state.definitions.get(id),
    start: (params) => startImpl(state, params),
    tick: (id, executor) => tickImpl(state, id, executor),
    pause: (id) => setPaused(state, id, true),
    resume: (id) => setPaused(state, id, false),
    cancel: (id) => cancelImpl(state, id),
    compensate: (id, executor) => compensateImpl(state, id, executor),
    getInstance: (id) => {
      const inst = state.instances.get(id);
      return inst !== undefined ? toReadonlyInstance(inst) : undefined;
    },
    getInstancesForNpc: (npcId) => getForNpcImpl(state, npcId),
    getQueue: () => getQueueImpl(state),
    getStats: () => getStatsImpl(state),
  };
}

function setPaused(state: WorkflowState, instanceId: string, pause: boolean): boolean {
  const inst = state.instances.get(instanceId);
  if (inst === undefined) return false;
  if (pause && inst.status !== 'running') return false;
  if (!pause && inst.status !== 'paused') return false;
  inst.status = pause ? 'paused' : 'running';
  return true;
}

function cancelImpl(state: WorkflowState, instanceId: string): boolean {
  const inst = state.instances.get(instanceId);
  if (inst === undefined) return false;
  if (inst.status === 'completed' || inst.status === 'cancelled') return false;
  inst.status = 'cancelled';
  inst.completedAt = state.deps.clock.nowMicroseconds();
  return true;
}

function getForNpcImpl(state: WorkflowState, npcId: string): ReadonlyArray<WorkflowInstance> {
  const results: WorkflowInstance[] = [];
  for (const inst of state.instances.values()) {
    if (inst.npcId === npcId) results.push(toReadonlyInstance(inst));
  }
  return results;
}

// ── Exports ──────────────────────────────────────────────────────

export { createWorkflowEngine };
export type {
  WorkflowEngine,
  WorkflowDeps,
  WorkflowStatus,
  StepType,
  StepStatus,
  WorkflowStep,
  StepConfig,
  WorkflowDefinition,
  DefineWorkflowParams,
  DefineStepParams,
  WorkflowInstance,
  StartWorkflowParams,
  StepExecutor,
  WorkflowTickResult,
  WorkflowStats,
};
