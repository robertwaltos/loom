/**
 * NPC Goal Planner — Goal-based AI planning with tasks and status lifecycles.
 *
 * NPCs pursue goals composed of discrete tasks. Goals move through a lifecycle
 * (PENDING → ACTIVE → COMPLETED | FAILED | ABANDONED). Tasks are completed or
 * failed individually; their collective outcome determines the goal outcome.
 *
 * "A goal without tasks is a wish. A task without a goal is noise."
 */

// ============================================================================
// PORTS
// ============================================================================

export type NpcGoalPlannerClock = {
  now(): bigint;
};

export type NpcGoalPlannerIdGen = {
  generate(): string;
};

export type NpcGoalPlannerLogger = {
  info(message: string): void;
  error(message: string): void;
};

export type NpcGoalPlannerDeps = {
  readonly clock: NpcGoalPlannerClock;
  readonly idGen: NpcGoalPlannerIdGen;
  readonly logger: NpcGoalPlannerLogger;
};

// ============================================================================
// TYPES
// ============================================================================

export type NpcId = string;
export type GoalId = string;
export type TaskId = string;

export type PlannerError =
  | 'npc-not-found'
  | 'goal-not-found'
  | 'task-not-found'
  | 'already-registered'
  | 'invalid-priority';

export type GoalStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'ABANDONED';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'FAILED';

export type Goal = {
  readonly goalId: GoalId;
  readonly npcId: NpcId;
  readonly description: string;
  readonly priority: number;
  readonly status: GoalStatus;
  readonly createdAt: bigint;
  readonly completedAt: bigint | null;
  readonly taskIds: ReadonlyArray<TaskId>;
};

export type GoalTask = {
  readonly taskId: TaskId;
  readonly goalId: GoalId;
  readonly npcId: NpcId;
  readonly description: string;
  readonly status: TaskStatus;
  readonly startedAt: bigint | null;
  readonly completedAt: bigint | null;
};

export type PlannerStats = {
  readonly npcId: NpcId;
  readonly activeGoals: number;
  readonly completedGoals: number;
  readonly failedGoals: number;
  readonly pendingTasks: number;
};

// ============================================================================
// PUBLIC API
// ============================================================================

export type NpcGoalPlannerSystem = {
  readonly registerNpc: (
    npcId: NpcId,
  ) => { success: true } | { success: false; error: PlannerError };
  readonly createGoal: (npcId: NpcId, description: string, priority: number) => Goal | PlannerError;
  readonly addTask: (goalId: GoalId, description: string) => GoalTask | PlannerError;
  readonly activateGoal: (
    goalId: GoalId,
  ) => { success: true } | { success: false; error: PlannerError };
  readonly startTask: (
    taskId: TaskId,
  ) => { success: true } | { success: false; error: PlannerError };
  readonly completeTask: (
    taskId: TaskId,
  ) => { success: true; goalCompleted: boolean } | { success: false; error: PlannerError };
  readonly failTask: (
    taskId: TaskId,
  ) => { success: true; goalFailed: boolean } | { success: false; error: PlannerError };
  readonly abandonGoal: (
    goalId: GoalId,
  ) => { success: true } | { success: false; error: PlannerError };
  readonly getGoal: (goalId: GoalId) => Goal | undefined;
  readonly getTask: (taskId: TaskId) => GoalTask | undefined;
  readonly listGoals: (npcId: NpcId, status?: GoalStatus) => ReadonlyArray<Goal>;
  readonly getPlannerStats: (npcId: NpcId) => PlannerStats | undefined;
};

// ============================================================================
// STATE
// ============================================================================

type MutableGoal = {
  goalId: GoalId;
  npcId: NpcId;
  description: string;
  priority: number;
  status: GoalStatus;
  createdAt: bigint;
  completedAt: bigint | null;
  taskIds: TaskId[];
};

type MutableTask = {
  taskId: TaskId;
  goalId: GoalId;
  npcId: NpcId;
  description: string;
  status: TaskStatus;
  startedAt: bigint | null;
  completedAt: bigint | null;
};

type NpcGoalPlannerState = {
  readonly deps: NpcGoalPlannerDeps;
  readonly npcs: Set<NpcId>;
  readonly goals: Map<GoalId, MutableGoal>;
  readonly tasks: Map<TaskId, MutableTask>;
  readonly npcGoalIndex: Map<NpcId, Set<GoalId>>;
};

// ============================================================================
// FACTORY
// ============================================================================

export function createNpcGoalPlannerSystem(deps: NpcGoalPlannerDeps): NpcGoalPlannerSystem {
  const state: NpcGoalPlannerState = {
    deps,
    npcs: new Set(),
    goals: new Map(),
    tasks: new Map(),
    npcGoalIndex: new Map(),
  };

  return {
    registerNpc: (npcId) => registerNpcImpl(state, npcId),
    createGoal: (npcId, description, priority) =>
      createGoalImpl(state, npcId, description, priority),
    addTask: (goalId, description) => addTaskImpl(state, goalId, description),
    activateGoal: (goalId) => activateGoalImpl(state, goalId),
    startTask: (taskId) => startTaskImpl(state, taskId),
    completeTask: (taskId) => completeTaskImpl(state, taskId),
    failTask: (taskId) => failTaskImpl(state, taskId),
    abandonGoal: (goalId) => abandonGoalImpl(state, goalId),
    getGoal: (goalId) => {
      const g = state.goals.get(goalId);
      return g !== undefined ? toReadonlyGoal(g) : undefined;
    },
    getTask: (taskId) => {
      const t = state.tasks.get(taskId);
      return t !== undefined ? toReadonlyTask(t) : undefined;
    },
    listGoals: (npcId, status) => listGoalsImpl(state, npcId, status),
    getPlannerStats: (npcId) => getPlannerStatsImpl(state, npcId),
  };
}

// ============================================================================
// REGISTRATION
// ============================================================================

function registerNpcImpl(
  state: NpcGoalPlannerState,
  npcId: NpcId,
): { success: true } | { success: false; error: PlannerError } {
  if (state.npcs.has(npcId)) {
    return { success: false, error: 'already-registered' };
  }
  state.npcs.add(npcId);
  state.npcGoalIndex.set(npcId, new Set());
  state.deps.logger.info('npc-goal-planner: registered npc ' + npcId);
  return { success: true };
}

// ============================================================================
// CREATE GOAL
// ============================================================================

function createGoalImpl(
  state: NpcGoalPlannerState,
  npcId: NpcId,
  description: string,
  priority: number,
): Goal | PlannerError {
  if (!state.npcs.has(npcId)) return 'npc-not-found';
  if (priority < 1 || priority > 10) return 'invalid-priority';

  const goalId = state.deps.idGen.generate();
  const goal: MutableGoal = {
    goalId,
    npcId,
    description,
    priority,
    status: 'PENDING',
    createdAt: state.deps.clock.now(),
    completedAt: null,
    taskIds: [],
  };

  state.goals.set(goalId, goal);
  const goalIndex = state.npcGoalIndex.get(npcId);
  if (goalIndex !== undefined) goalIndex.add(goalId);
  state.deps.logger.info('npc-goal-planner: created goal ' + goalId + ' for ' + npcId);
  return toReadonlyGoal(goal);
}

// ============================================================================
// ADD TASK
// ============================================================================

function addTaskImpl(
  state: NpcGoalPlannerState,
  goalId: GoalId,
  description: string,
): GoalTask | PlannerError {
  const goal = state.goals.get(goalId);
  if (goal === undefined) return 'goal-not-found';

  const taskId = state.deps.idGen.generate();
  const task: MutableTask = {
    taskId,
    goalId,
    npcId: goal.npcId,
    description,
    status: 'PENDING',
    startedAt: null,
    completedAt: null,
  };

  state.tasks.set(taskId, task);
  goal.taskIds.push(taskId);
  return toReadonlyTask(task);
}

// ============================================================================
// ACTIVATE GOAL
// ============================================================================

function activateGoalImpl(
  state: NpcGoalPlannerState,
  goalId: GoalId,
): { success: true } | { success: false; error: PlannerError } {
  const goal = state.goals.get(goalId);
  if (goal === undefined) return { success: false, error: 'goal-not-found' };
  if (goal.status !== 'PENDING') return { success: false, error: 'goal-not-found' };
  goal.status = 'ACTIVE';
  return { success: true };
}

// ============================================================================
// START TASK
// ============================================================================

function startTaskImpl(
  state: NpcGoalPlannerState,
  taskId: TaskId,
): { success: true } | { success: false; error: PlannerError } {
  const task = state.tasks.get(taskId);
  if (task === undefined) return { success: false, error: 'task-not-found' };
  if (task.status !== 'PENDING') return { success: false, error: 'task-not-found' };
  task.status = 'IN_PROGRESS';
  task.startedAt = state.deps.clock.now();
  return { success: true };
}

// ============================================================================
// COMPLETE TASK
// ============================================================================

function completeTaskImpl(
  state: NpcGoalPlannerState,
  taskId: TaskId,
): { success: true; goalCompleted: boolean } | { success: false; error: PlannerError } {
  const task = state.tasks.get(taskId);
  if (task === undefined) return { success: false, error: 'task-not-found' };
  if (task.status !== 'IN_PROGRESS') return { success: false, error: 'task-not-found' };
  task.status = 'DONE';
  task.completedAt = state.deps.clock.now();

  const goalCompleted = checkAllTasksDone(state, task.goalId);
  if (goalCompleted) markGoalCompleted(state, task.goalId);
  return { success: true, goalCompleted };
}

function checkAllTasksDone(state: NpcGoalPlannerState, goalId: GoalId): boolean {
  const goal = state.goals.get(goalId);
  if (goal === undefined || goal.taskIds.length === 0) return false;
  return goal.taskIds.every((tid) => state.tasks.get(tid)?.status === 'DONE');
}

function markGoalCompleted(state: NpcGoalPlannerState, goalId: GoalId): void {
  const goal = state.goals.get(goalId);
  if (goal === undefined) return;
  goal.status = 'COMPLETED';
  goal.completedAt = state.deps.clock.now();
}

// ============================================================================
// FAIL TASK
// ============================================================================

function failTaskImpl(
  state: NpcGoalPlannerState,
  taskId: TaskId,
): { success: true; goalFailed: boolean } | { success: false; error: PlannerError } {
  const task = state.tasks.get(taskId);
  if (task === undefined) return { success: false, error: 'task-not-found' };
  if (task.status !== 'IN_PROGRESS') return { success: false, error: 'task-not-found' };
  task.status = 'FAILED';
  task.completedAt = state.deps.clock.now();

  markGoalFailed(state, task.goalId);
  return { success: true, goalFailed: true };
}

function markGoalFailed(state: NpcGoalPlannerState, goalId: GoalId): void {
  const goal = state.goals.get(goalId);
  if (goal === undefined) return;
  goal.status = 'FAILED';
  goal.completedAt = state.deps.clock.now();
}

// ============================================================================
// ABANDON GOAL
// ============================================================================

function abandonGoalImpl(
  state: NpcGoalPlannerState,
  goalId: GoalId,
): { success: true } | { success: false; error: PlannerError } {
  const goal = state.goals.get(goalId);
  if (goal === undefined) return { success: false, error: 'goal-not-found' };
  if (goal.status !== 'PENDING' && goal.status !== 'ACTIVE') {
    return { success: false, error: 'goal-not-found' };
  }
  goal.status = 'ABANDONED';
  return { success: true };
}

// ============================================================================
// LIST GOALS
// ============================================================================

function listGoalsImpl(
  state: NpcGoalPlannerState,
  npcId: NpcId,
  status?: GoalStatus,
): ReadonlyArray<Goal> {
  const index = state.npcGoalIndex.get(npcId);
  if (index === undefined) return [];
  const results: Goal[] = [];
  for (const goalId of index) {
    const goal = state.goals.get(goalId);
    if (goal === undefined) continue;
    if (status !== undefined && goal.status !== status) continue;
    results.push(toReadonlyGoal(goal));
  }
  return results;
}

// ============================================================================
// PLANNER STATS
// ============================================================================

function getPlannerStatsImpl(state: NpcGoalPlannerState, npcId: NpcId): PlannerStats | undefined {
  if (!state.npcs.has(npcId)) return undefined;

  const index = state.npcGoalIndex.get(npcId) ?? new Set();
  let activeGoals = 0;
  let completedGoals = 0;
  let failedGoals = 0;
  let pendingTasks = 0;

  for (const goalId of index) {
    const goal = state.goals.get(goalId);
    if (goal === undefined) continue;
    if (goal.status === 'ACTIVE') activeGoals++;
    if (goal.status === 'COMPLETED') completedGoals++;
    if (goal.status === 'FAILED') failedGoals++;
    for (const taskId of goal.taskIds) {
      if (state.tasks.get(taskId)?.status === 'PENDING') pendingTasks++;
    }
  }

  return { npcId, activeGoals, completedGoals, failedGoals, pendingTasks };
}

// ============================================================================
// HELPERS
// ============================================================================

function toReadonlyGoal(g: MutableGoal): Goal {
  return {
    goalId: g.goalId,
    npcId: g.npcId,
    description: g.description,
    priority: g.priority,
    status: g.status,
    createdAt: g.createdAt,
    completedAt: g.completedAt,
    taskIds: [...g.taskIds],
  };
}

function toReadonlyTask(t: MutableTask): GoalTask {
  return {
    taskId: t.taskId,
    goalId: t.goalId,
    npcId: t.npcId,
    description: t.description,
    status: t.status,
    startedAt: t.startedAt,
    completedAt: t.completedAt,
  };
}
