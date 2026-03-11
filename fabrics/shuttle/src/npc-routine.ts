/**
 * npc-routine.ts — NPC daily routine execution.
 *
 * Assigns named routines (sequences of timed activities) to NPCs
 * and ticks them forward through time. Each routine step has a
 * start time, duration, and activity type. Supports interruption
 * and resumption.
 */

// ── Ports ────────────────────────────────────────────────────────

interface RoutineClock {
  readonly nowMicroseconds: () => number;
}

interface RoutineIdGenerator {
  readonly next: () => string;
}

interface NpcRoutineDeps {
  readonly clock: RoutineClock;
  readonly idGenerator: RoutineIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type RoutineActivity = 'idle' | 'patrol' | 'work' | 'rest' | 'socialise' | 'trade' | 'travel';

interface RoutineStep {
  readonly startOffsetMicro: number;
  readonly durationMicro: number;
  readonly activity: RoutineActivity;
  readonly location: string;
}

interface Routine {
  readonly routineId: string;
  readonly name: string;
  readonly steps: readonly RoutineStep[];
  readonly cycleDurationMicro: number;
}

interface CreateRoutineParams {
  readonly name: string;
  readonly steps: readonly RoutineStep[];
  readonly cycleDurationMicro: number;
}

type AssignmentStatus = 'running' | 'interrupted' | 'completed';

interface RoutineAssignment {
  readonly npcId: string;
  readonly routineId: string;
  readonly status: AssignmentStatus;
  readonly currentStepIndex: number;
  readonly currentActivity: RoutineActivity;
  readonly assignedAt: number;
}

interface NpcRoutineStats {
  readonly totalRoutines: number;
  readonly activeAssignments: number;
  readonly interruptedAssignments: number;
}

interface NpcRoutineEngine {
  readonly createRoutine: (params: CreateRoutineParams) => Routine;
  readonly getRoutine: (routineId: string) => Routine | undefined;
  readonly assign: (npcId: string, routineId: string) => boolean;
  readonly unassign: (npcId: string) => boolean;
  readonly interrupt: (npcId: string) => boolean;
  readonly resume: (npcId: string) => boolean;
  readonly tick: (npcId: string) => RoutineAssignment | undefined;
  readonly getAssignment: (npcId: string) => RoutineAssignment | undefined;
  readonly getStats: () => NpcRoutineStats;
}

// ── State ────────────────────────────────────────────────────────

interface MutableAssignment {
  readonly npcId: string;
  readonly routineId: string;
  status: AssignmentStatus;
  currentStepIndex: number;
  currentActivity: RoutineActivity;
  readonly assignedAt: number;
}

interface RoutineState {
  readonly deps: NpcRoutineDeps;
  readonly routines: Map<string, Routine>;
  readonly assignments: Map<string, MutableAssignment>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(a: MutableAssignment): RoutineAssignment {
  return {
    npcId: a.npcId,
    routineId: a.routineId,
    status: a.status,
    currentStepIndex: a.currentStepIndex,
    currentActivity: a.currentActivity,
    assignedAt: a.assignedAt,
  };
}

function resolveStep(routine: Routine, now: number, assignedAt: number): number {
  const elapsed = now - assignedAt;
  const cycleOffset = elapsed % routine.cycleDurationMicro;
  for (let i = routine.steps.length - 1; i >= 0; i--) {
    const step = routine.steps[i];
    if (step !== undefined && cycleOffset >= step.startOffsetMicro) return i;
  }
  return 0;
}

// ── Operations ───────────────────────────────────────────────────

function createRoutineImpl(state: RoutineState, params: CreateRoutineParams): Routine {
  const routine: Routine = {
    routineId: state.deps.idGenerator.next(),
    name: params.name,
    steps: [...params.steps],
    cycleDurationMicro: params.cycleDurationMicro,
  };
  state.routines.set(routine.routineId, routine);
  return routine;
}

function assignImpl(state: RoutineState, npcId: string, routineId: string): boolean {
  if (!state.routines.has(routineId)) return false;
  if (state.assignments.has(npcId)) return false;
  const routine = state.routines.get(routineId);
  if (!routine || routine.steps.length === 0) return false;
  const firstStep = routine.steps[0];
  const assignment: MutableAssignment = {
    npcId,
    routineId,
    status: 'running',
    currentStepIndex: 0,
    currentActivity: firstStep?.activity ?? 'idle',
    assignedAt: state.deps.clock.nowMicroseconds(),
  };
  state.assignments.set(npcId, assignment);
  return true;
}

function tickImpl(state: RoutineState, npcId: string): RoutineAssignment | undefined {
  const assignment = state.assignments.get(npcId);
  if (!assignment || assignment.status !== 'running') return undefined;
  const routine = state.routines.get(assignment.routineId);
  if (!routine) return undefined;
  const now = state.deps.clock.nowMicroseconds();
  const stepIdx = resolveStep(routine, now, assignment.assignedAt);
  assignment.currentStepIndex = stepIdx;
  const step = routine.steps[stepIdx];
  assignment.currentActivity = step?.activity ?? 'idle';
  return toReadonly(assignment);
}

function getStatsImpl(state: RoutineState): NpcRoutineStats {
  let active = 0;
  let interrupted = 0;
  for (const a of state.assignments.values()) {
    if (a.status === 'running') active++;
    else if (a.status === 'interrupted') interrupted++;
  }
  return {
    totalRoutines: state.routines.size,
    activeAssignments: active,
    interruptedAssignments: interrupted,
  };
}

function interruptImpl(state: RoutineState, npcId: string): boolean {
  const a = state.assignments.get(npcId);
  if (!a || a.status !== 'running') return false;
  a.status = 'interrupted';
  return true;
}

function resumeImpl(state: RoutineState, npcId: string): boolean {
  const a = state.assignments.get(npcId);
  if (!a || a.status !== 'interrupted') return false;
  a.status = 'running';
  return true;
}

function getAssignmentImpl(state: RoutineState, npcId: string): RoutineAssignment | undefined {
  const a = state.assignments.get(npcId);
  return a ? toReadonly(a) : undefined;
}

// ── Factory ──────────────────────────────────────────────────────

function createNpcRoutineEngine(deps: NpcRoutineDeps): NpcRoutineEngine {
  const state: RoutineState = {
    deps,
    routines: new Map(),
    assignments: new Map(),
  };
  return {
    createRoutine: (p) => createRoutineImpl(state, p),
    getRoutine: (id) => state.routines.get(id),
    assign: (npcId, rid) => assignImpl(state, npcId, rid),
    unassign: (npcId) => state.assignments.delete(npcId),
    interrupt: (npcId) => interruptImpl(state, npcId),
    resume: (npcId) => resumeImpl(state, npcId),
    tick: (npcId) => tickImpl(state, npcId),
    getAssignment: (npcId) => getAssignmentImpl(state, npcId),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createNpcRoutineEngine };
export type {
  NpcRoutineEngine,
  NpcRoutineDeps,
  RoutineActivity,
  RoutineStep,
  Routine,
  CreateRoutineParams,
  AssignmentStatus,
  RoutineAssignment,
  NpcRoutineStats,
};
