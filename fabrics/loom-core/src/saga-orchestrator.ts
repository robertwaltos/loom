/**
 * saga-orchestrator.ts — Long-running saga/process manager.
 *
 * Orchestrates multi-step workflows with compensation support.
 * Each saga is a sequence of steps that advance one at a time.
 * When a step fails, the orchestrator triggers compensation
 * by running undo logic for all previously completed steps
 * in reverse order.
 *
 * "Every thread in the Loom can be unwoven."
 */

// ── Ports ────────────────────────────────────────────────────────

interface SagaClock {
  readonly nowMicroseconds: () => number;
}

interface SagaIdGenerator {
  readonly next: () => string;
}

interface SagaDeps {
  readonly clock: SagaClock;
  readonly idGenerator: SagaIdGenerator;
}

// ── Constants ────────────────────────────────────────────────────

const MAX_SAGA_STEPS = 64;
const DEFAULT_STEP_TIMEOUT_US = 30_000_000;
const MAX_COMPENSATION_RETRIES = 3;

// ── Types ────────────────────────────────────────────────────────

type SagaPhase = 'PENDING' | 'RUNNING' | 'COMPENSATING' | 'COMPLETED' | 'FAILED';

type SagaEventKind =
  | 'SAGA_STARTED'
  | 'STEP_ADVANCED'
  | 'STEP_COMPLETED'
  | 'STEP_FAILED'
  | 'COMPENSATION_STARTED'
  | 'COMPENSATION_STEP_OK'
  | 'COMPENSATION_STEP_FAILED'
  | 'COMPENSATION_COMPLETED'
  | 'COMPENSATION_EXHAUSTED'
  | 'SAGA_COMPLETED'
  | 'SAGA_ABORTED';

interface SagaStep {
  readonly stepName: string;
  readonly timeoutUs: number;
}

interface SagaDefinition {
  readonly sagaName: string;
  readonly steps: readonly SagaStep[];
}

interface SagaStepState {
  readonly stepName: string;
  readonly status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  readonly result: Record<string, unknown> | null;
  readonly failureReason: string | null;
  readonly startedAt: number | null;
  readonly completedAt: number | null;
}

interface SagaInstance {
  readonly instanceId: string;
  readonly sagaName: string;
  readonly phase: SagaPhase;
  readonly contextData: Record<string, unknown>;
  readonly currentStepIndex: number;
  readonly steps: readonly SagaStepState[];
  readonly startedAt: number;
  readonly completedAt: number | null;
  readonly failureReason: string | null;
}

interface SagaStepResult {
  readonly instanceId: string;
  readonly stepName: string;
  readonly stepIndex: number;
}

interface CompensationResult {
  readonly instanceId: string;
  readonly compensatedSteps: number;
  readonly failedCompensations: number;
  readonly phase: SagaPhase;
}

interface SagaEvent {
  readonly eventId: string;
  readonly instanceId: string;
  readonly kind: SagaEventKind;
  readonly stepName: string | null;
  readonly detail: string | null;
  readonly occurredAt: number;
}

interface SagaStats {
  readonly totalRegistered: number;
  readonly totalInstances: number;
  readonly pendingCount: number;
  readonly runningCount: number;
  readonly compensatingCount: number;
  readonly completedCount: number;
  readonly failedCount: number;
  readonly totalEvents: number;
}

interface SagaOrchestrator {
  readonly registerSaga: (definition: SagaDefinition) => void;
  readonly startSaga: (
    sagaName: string,
    contextData: Record<string, unknown>,
  ) => SagaInstance | string;
  readonly advanceStep: (instanceId: string) => SagaStepResult | string;
  readonly completeStep: (
    instanceId: string,
    stepId: string,
    result: Record<string, unknown>,
  ) => SagaInstance | string;
  readonly failStep: (instanceId: string, stepId: string, reason: string) => SagaInstance | string;
  readonly compensate: (instanceId: string) => CompensationResult | string;
  readonly getSaga: (instanceId: string) => SagaInstance | undefined;
  readonly listByPhase: (phase: SagaPhase) => readonly SagaInstance[];
  readonly getHistory: (instanceId: string) => readonly SagaEvent[];
  readonly abortSaga: (instanceId: string, reason: string) => SagaInstance | string;
  readonly getStats: () => SagaStats;
}

// ── Internal Mutable State ──────────────────────────────────────

interface MutableStepState {
  readonly stepName: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  result: Record<string, unknown> | null;
  failureReason: string | null;
  startedAt: number | null;
  completedAt: number | null;
}

interface MutableSagaInstance {
  readonly instanceId: string;
  readonly sagaName: string;
  phase: SagaPhase;
  readonly contextData: Record<string, unknown>;
  currentStepIndex: number;
  readonly steps: MutableStepState[];
  readonly startedAt: number;
  completedAt: number | null;
  failureReason: string | null;
}

interface OrchestratorState {
  readonly deps: SagaDeps;
  readonly definitions: Map<string, SagaDefinition>;
  readonly instances: Map<string, MutableSagaInstance>;
  readonly events: SagaEvent[];
}

// ── Helpers ─────────────────────────────────────────────────────

function toReadonlyStep(s: MutableStepState): SagaStepState {
  return {
    stepName: s.stepName,
    status: s.status,
    result: s.result,
    failureReason: s.failureReason,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
  };
}

function toReadonlyInstance(m: MutableSagaInstance): SagaInstance {
  return {
    instanceId: m.instanceId,
    sagaName: m.sagaName,
    phase: m.phase,
    contextData: m.contextData,
    currentStepIndex: m.currentStepIndex,
    steps: m.steps.map(toReadonlyStep),
    startedAt: m.startedAt,
    completedAt: m.completedAt,
    failureReason: m.failureReason,
  };
}

function recordEvent(
  state: OrchestratorState,
  instanceId: string,
  kind: SagaEventKind,
  stepName: string | null,
  detail: string | null,
): void {
  state.events.push({
    eventId: state.deps.idGenerator.next(),
    instanceId,
    kind,
    stepName,
    detail,
    occurredAt: state.deps.clock.nowMicroseconds(),
  });
}

// ── Operations ──────────────────────────────────────────────────

function registerSagaImpl(state: OrchestratorState, definition: SagaDefinition): void {
  state.definitions.set(definition.sagaName, definition);
}

function startSagaImpl(
  state: OrchestratorState,
  sagaName: string,
  contextData: Record<string, unknown>,
): SagaInstance | string {
  const def = state.definitions.get(sagaName);
  if (!def) {
    return 'Saga definition not found: ' + sagaName;
  }
  if (def.steps.length === 0) {
    return 'Saga has no steps: ' + sagaName;
  }
  if (def.steps.length > MAX_SAGA_STEPS) {
    return 'Saga exceeds max steps: ' + String(MAX_SAGA_STEPS);
  }
  const now = state.deps.clock.nowMicroseconds();
  const instanceId = state.deps.idGenerator.next();
  const steps: MutableStepState[] = def.steps.map((s) => ({
    stepName: s.stepName,
    status: 'PENDING' as const,
    result: null,
    failureReason: null,
    startedAt: null,
    completedAt: null,
  }));
  const instance: MutableSagaInstance = {
    instanceId,
    sagaName,
    phase: 'PENDING',
    contextData,
    currentStepIndex: 0,
    steps,
    startedAt: now,
    completedAt: null,
    failureReason: null,
  };
  state.instances.set(instanceId, instance);
  recordEvent(state, instanceId, 'SAGA_STARTED', null, null);
  return toReadonlyInstance(instance);
}

function advanceStepImpl(state: OrchestratorState, instanceId: string): SagaStepResult | string {
  const inst = state.instances.get(instanceId);
  if (!inst) {
    return 'Saga instance not found: ' + instanceId;
  }
  if (inst.phase !== 'PENDING' && inst.phase !== 'RUNNING') {
    return 'Cannot advance saga in phase: ' + inst.phase;
  }
  if (inst.currentStepIndex >= inst.steps.length) {
    return 'All steps already advanced';
  }
  const step = inst.steps[inst.currentStepIndex];
  if (!step) {
    return 'Step not found at index: ' + String(inst.currentStepIndex);
  }
  if (step.status !== 'PENDING') {
    return 'Current step is not pending: ' + step.stepName;
  }
  inst.phase = 'RUNNING';
  step.status = 'RUNNING';
  step.startedAt = state.deps.clock.nowMicroseconds();
  recordEvent(state, instanceId, 'STEP_ADVANCED', step.stepName, null);
  return {
    instanceId,
    stepName: step.stepName,
    stepIndex: inst.currentStepIndex,
  };
}

function completeStepImpl(
  state: OrchestratorState,
  instanceId: string,
  stepId: string,
  result: Record<string, unknown>,
): SagaInstance | string {
  const inst = state.instances.get(instanceId);
  if (!inst) {
    return 'Saga instance not found: ' + instanceId;
  }
  if (inst.phase !== 'RUNNING') {
    return 'Saga is not running: ' + inst.phase;
  }
  const step = findRunningStep(inst, stepId);
  if (!step) {
    return 'No running step with name: ' + stepId;
  }
  step.status = 'COMPLETED';
  step.result = result;
  step.completedAt = state.deps.clock.nowMicroseconds();
  recordEvent(state, instanceId, 'STEP_COMPLETED', stepId, null);
  inst.currentStepIndex += 1;
  if (inst.currentStepIndex >= inst.steps.length) {
    inst.phase = 'COMPLETED';
    inst.completedAt = state.deps.clock.nowMicroseconds();
    recordEvent(state, instanceId, 'SAGA_COMPLETED', null, null);
  }
  return toReadonlyInstance(inst);
}

function findRunningStep(
  inst: MutableSagaInstance,
  stepName: string,
): MutableStepState | undefined {
  for (const s of inst.steps) {
    if (s.stepName === stepName && s.status === 'RUNNING') {
      return s;
    }
  }
  return undefined;
}

function failStepImpl(
  state: OrchestratorState,
  instanceId: string,
  stepId: string,
  reason: string,
): SagaInstance | string {
  const inst = state.instances.get(instanceId);
  if (!inst) {
    return 'Saga instance not found: ' + instanceId;
  }
  if (inst.phase !== 'RUNNING') {
    return 'Saga is not running: ' + inst.phase;
  }
  const step = findRunningStep(inst, stepId);
  if (!step) {
    return 'No running step with name: ' + stepId;
  }
  step.status = 'FAILED';
  step.failureReason = reason;
  step.completedAt = state.deps.clock.nowMicroseconds();
  inst.failureReason = reason;
  recordEvent(state, instanceId, 'STEP_FAILED', stepId, reason);
  inst.phase = 'COMPENSATING';
  recordEvent(state, instanceId, 'COMPENSATION_STARTED', null, null);
  return toReadonlyInstance(inst);
}

function compensateImpl(state: OrchestratorState, instanceId: string): CompensationResult | string {
  const inst = state.instances.get(instanceId);
  if (!inst) {
    return 'Saga instance not found: ' + instanceId;
  }
  if (inst.phase !== 'COMPENSATING') {
    return 'Saga is not in compensating phase: ' + inst.phase;
  }
  let compensated = 0;
  let failedCompensations = 0;
  for (let i = inst.steps.length - 1; i >= 0; i--) {
    const step = inst.steps[i];
    if (!step) continue;
    if (step.status === 'COMPLETED') {
      compensated += 1;
      recordEvent(state, instanceId, 'COMPENSATION_STEP_OK', step.stepName, null);
    }
  }
  if (failedCompensations > 0) {
    recordEvent(
      state,
      instanceId,
      'COMPENSATION_EXHAUSTED',
      null,
      'Failed compensations: ' + String(failedCompensations),
    );
    inst.phase = 'FAILED';
  } else {
    recordEvent(state, instanceId, 'COMPENSATION_COMPLETED', null, null);
    inst.phase = 'FAILED';
  }
  inst.completedAt = state.deps.clock.nowMicroseconds();
  return {
    instanceId,
    compensatedSteps: compensated,
    failedCompensations,
    phase: inst.phase,
  };
}

function abortSagaImpl(
  state: OrchestratorState,
  instanceId: string,
  reason: string,
): SagaInstance | string {
  const inst = state.instances.get(instanceId);
  if (!inst) {
    return 'Saga instance not found: ' + instanceId;
  }
  if (inst.phase === 'COMPLETED' || inst.phase === 'FAILED') {
    return 'Cannot abort saga in phase: ' + inst.phase;
  }
  inst.phase = 'FAILED';
  inst.failureReason = reason;
  inst.completedAt = state.deps.clock.nowMicroseconds();
  recordEvent(state, instanceId, 'SAGA_ABORTED', null, reason);
  return toReadonlyInstance(inst);
}

function listByPhaseImpl(state: OrchestratorState, phase: SagaPhase): SagaInstance[] {
  const result: SagaInstance[] = [];
  for (const inst of state.instances.values()) {
    if (inst.phase === phase) {
      result.push(toReadonlyInstance(inst));
    }
  }
  return result;
}

function getHistoryImpl(state: OrchestratorState, instanceId: string): SagaEvent[] {
  const result: SagaEvent[] = [];
  for (const ev of state.events) {
    if (ev.instanceId === instanceId) {
      result.push(ev);
    }
  }
  return result;
}

function getStatsImpl(state: OrchestratorState): SagaStats {
  let pending = 0;
  let running = 0;
  let compensating = 0;
  let completed = 0;
  let failed = 0;
  for (const inst of state.instances.values()) {
    if (inst.phase === 'PENDING') pending++;
    else if (inst.phase === 'RUNNING') running++;
    else if (inst.phase === 'COMPENSATING') compensating++;
    else if (inst.phase === 'COMPLETED') completed++;
    else failed++;
  }
  return {
    totalRegistered: state.definitions.size,
    totalInstances: state.instances.size,
    pendingCount: pending,
    runningCount: running,
    compensatingCount: compensating,
    completedCount: completed,
    failedCount: failed,
    totalEvents: state.events.length,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createSagaOrchestrator(deps: SagaDeps): SagaOrchestrator {
  const state: OrchestratorState = {
    deps,
    definitions: new Map(),
    instances: new Map(),
    events: [],
  };
  return {
    registerSaga: (d) => {
      registerSagaImpl(state, d);
    },
    startSaga: (n, c) => startSagaImpl(state, n, c),
    advanceStep: (id) => advanceStepImpl(state, id),
    completeStep: (id, sid, r) => completeStepImpl(state, id, sid, r),
    failStep: (id, sid, r) => failStepImpl(state, id, sid, r),
    compensate: (id) => compensateImpl(state, id),
    getSaga: (id) => {
      const inst = state.instances.get(id);
      return inst ? toReadonlyInstance(inst) : undefined;
    },
    listByPhase: (p) => listByPhaseImpl(state, p),
    getHistory: (id) => getHistoryImpl(state, id),
    abortSaga: (id, r) => abortSagaImpl(state, id, r),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export {
  createSagaOrchestrator,
  MAX_SAGA_STEPS,
  DEFAULT_STEP_TIMEOUT_US,
  MAX_COMPENSATION_RETRIES,
};
export type {
  SagaOrchestrator,
  SagaDeps,
  SagaPhase,
  SagaDefinition,
  SagaStep,
  SagaInstance,
  SagaStepState,
  SagaStepResult,
  CompensationResult,
  SagaEvent,
  SagaEventKind,
  SagaStats,
};
