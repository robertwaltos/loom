/**
 * npc-goal.ts — Hierarchical goal tracking for NPC agents.
 *
 * NPCs pursue goals organized in a priority-ordered stack. Each goal
 * has a status lifecycle (pending → active → completed/failed/abandoned).
 * Goals can have sub-goals, enabling hierarchical decomposition of
 * complex NPC behaviors like "become village elder" → "earn trust" →
 * "help villager with quest".
 */

// ── Ports ────────────────────────────────────────────────────────

interface GoalIdGenerator {
  readonly next: () => string;
}

interface GoalClock {
  readonly nowMicroseconds: () => number;
}

// ── Types ────────────────────────────────────────────────────────

type GoalStatus = 'pending' | 'active' | 'completed' | 'failed' | 'abandoned';

interface Goal {
  readonly goalId: string;
  readonly entityId: string;
  readonly description: string;
  readonly priority: number;
  readonly status: GoalStatus;
  readonly parentGoalId: string | null;
  readonly createdAt: number;
  readonly completedAt: number | null;
  readonly metadata: Readonly<Record<string, string>>;
}

interface AddGoalParams {
  readonly entityId: string;
  readonly description: string;
  readonly priority: number;
  readonly parentGoalId?: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

interface GoalStats {
  readonly totalGoals: number;
  readonly activeGoals: number;
  readonly completedGoals: number;
  readonly failedGoals: number;
  readonly entities: number;
}

// ── Public API ───────────────────────────────────────────────────

interface NpcGoalPlanner {
  readonly addGoal: (params: AddGoalParams) => Goal;
  readonly completeGoal: (goalId: string) => boolean;
  readonly failGoal: (goalId: string) => boolean;
  readonly abandonGoal: (goalId: string) => boolean;
  readonly activateGoal: (goalId: string) => boolean;
  readonly getGoal: (goalId: string) => Goal | undefined;
  readonly getEntityGoals: (entityId: string) => readonly Goal[];
  readonly getActiveGoal: (entityId: string) => Goal | undefined;
  readonly getSubGoals: (goalId: string) => readonly Goal[];
  readonly getStats: () => GoalStats;
}

interface NpcGoalDeps {
  readonly idGenerator: GoalIdGenerator;
  readonly clock: GoalClock;
}

// ── State ────────────────────────────────────────────────────────

interface GoalState {
  readonly goals: Map<string, MutableGoal>;
  readonly entityGoals: Map<string, Set<string>>;
  readonly deps: NpcGoalDeps;
}

interface MutableGoal {
  readonly goalId: string;
  readonly entityId: string;
  readonly description: string;
  readonly priority: number;
  status: GoalStatus;
  readonly parentGoalId: string | null;
  readonly createdAt: number;
  completedAt: number | null;
  readonly metadata: Readonly<Record<string, string>>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toGoal(g: MutableGoal): Goal {
  return { ...g };
}

function addEntityGoal(state: GoalState, entityId: string, goalId: string): void {
  let set = state.entityGoals.get(entityId);
  if (!set) {
    set = new Set();
    state.entityGoals.set(entityId, set);
  }
  set.add(goalId);
}

// ── Operations ───────────────────────────────────────────────────

function addGoalImpl(state: GoalState, params: AddGoalParams): Goal {
  const id = state.deps.idGenerator.next();
  const goal: MutableGoal = {
    goalId: id,
    entityId: params.entityId,
    description: params.description,
    priority: params.priority,
    status: 'pending',
    parentGoalId: params.parentGoalId ?? null,
    createdAt: state.deps.clock.nowMicroseconds(),
    completedAt: null,
    metadata: params.metadata ?? {},
  };
  state.goals.set(id, goal);
  addEntityGoal(state, params.entityId, id);
  return toGoal(goal);
}

function transitionGoal(state: GoalState, goalId: string, target: GoalStatus): boolean {
  const goal = state.goals.get(goalId);
  if (!goal) return false;
  if (goal.status !== 'active' && target !== 'active') return false;
  if (target === 'active' && goal.status !== 'pending') return false;
  goal.status = target;
  if (target === 'completed' || target === 'failed') {
    goal.completedAt = state.deps.clock.nowMicroseconds();
  }
  return true;
}

function getEntityGoalsImpl(state: GoalState, entityId: string): readonly Goal[] {
  const ids = state.entityGoals.get(entityId);
  if (!ids) return [];
  const results: Goal[] = [];
  for (const id of ids) {
    const g = state.goals.get(id);
    if (g) results.push(toGoal(g));
  }
  results.sort((a, b) => b.priority - a.priority);
  return results;
}

function getActiveGoalImpl(state: GoalState, entityId: string): Goal | undefined {
  const ids = state.entityGoals.get(entityId);
  if (!ids) return undefined;
  for (const id of ids) {
    const g = state.goals.get(id);
    if (g?.status === 'active') return toGoal(g);
  }
  return undefined;
}

function getSubGoalsImpl(state: GoalState, goalId: string): readonly Goal[] {
  const results: Goal[] = [];
  for (const g of state.goals.values()) {
    if (g.parentGoalId === goalId) results.push(toGoal(g));
  }
  return results;
}

function getStatsImpl(state: GoalState): GoalStats {
  let active = 0;
  let completed = 0;
  let failed = 0;
  for (const g of state.goals.values()) {
    if (g.status === 'active') active++;
    if (g.status === 'completed') completed++;
    if (g.status === 'failed') failed++;
  }
  return {
    totalGoals: state.goals.size,
    activeGoals: active,
    completedGoals: completed,
    failedGoals: failed,
    entities: state.entityGoals.size,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createNpcGoalPlanner(deps: NpcGoalDeps): NpcGoalPlanner {
  const state: GoalState = {
    goals: new Map(),
    entityGoals: new Map(),
    deps,
  };
  return {
    addGoal: (p) => addGoalImpl(state, p),
    completeGoal: (id) => transitionGoal(state, id, 'completed'),
    failGoal: (id) => transitionGoal(state, id, 'failed'),
    abandonGoal: (id) => transitionGoal(state, id, 'abandoned'),
    activateGoal: (id) => transitionGoal(state, id, 'active'),
    getGoal: (id) => {
      const g = state.goals.get(id);
      return g ? toGoal(g) : undefined;
    },
    getEntityGoals: (eid) => getEntityGoalsImpl(state, eid),
    getActiveGoal: (eid) => getActiveGoalImpl(state, eid),
    getSubGoals: (gid) => getSubGoalsImpl(state, gid),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createNpcGoalPlanner };
export type { NpcGoalPlanner, NpcGoalDeps, Goal, GoalStatus, AddGoalParams, GoalStats };
