import { describe, it, expect, beforeEach } from 'vitest';
import { createNpcGoalPlannerSystem } from '../npc-goal-planner.js';
import type { NpcGoalPlannerDeps, NpcGoalPlannerSystem } from '../npc-goal-planner.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMockDeps(): NpcGoalPlannerDeps {
  let time = 1_000_000n;
  let counter = 0;
  return {
    clock: {
      now: () => {
        time = time + 1000n;
        return time;
      },
    },
    idGen: { generate: () => 'id-' + String(++counter) },
    logger: { info: () => undefined, error: () => undefined },
  };
}

// ============================================================================
// TESTS: REGISTRATION
// ============================================================================

describe('NpcGoalPlanner - Registration', () => {
  let sys: NpcGoalPlannerSystem;

  beforeEach(() => {
    sys = createNpcGoalPlannerSystem(createMockDeps());
  });

  it('should register a new NPC successfully', () => {
    const result = sys.registerNpc('npc-1');
    expect(result.success).toBe(true);
  });

  it('should return already-registered for duplicate NPC', () => {
    sys.registerNpc('npc-1');
    const result = sys.registerNpc('npc-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('already-registered');
  });
});

// ============================================================================
// TESTS: CREATE GOAL
// ============================================================================

describe('NpcGoalPlanner - Create Goal', () => {
  let sys: NpcGoalPlannerSystem;

  beforeEach(() => {
    sys = createNpcGoalPlannerSystem(createMockDeps());
    sys.registerNpc('npc-1');
  });

  it('should create a goal for a registered NPC', () => {
    const result = sys.createGoal('npc-1', 'Become village elder', 8);
    if (typeof result === 'string') throw new Error('expected goal');
    expect(result.npcId).toBe('npc-1');
    expect(result.description).toBe('Become village elder');
    expect(result.priority).toBe(8);
    expect(result.status).toBe('PENDING');
    expect(result.completedAt).toBeNull();
    expect(result.taskIds).toHaveLength(0);
  });

  it('should return npc-not-found for unregistered NPC', () => {
    const result = sys.createGoal('ghost', 'Haunt someone', 5);
    expect(result).toBe('npc-not-found');
  });

  it('should reject priority below 1', () => {
    const result = sys.createGoal('npc-1', 'Bad goal', 0);
    expect(result).toBe('invalid-priority');
  });

  it('should reject priority above 10', () => {
    const result = sys.createGoal('npc-1', 'Bad goal', 11);
    expect(result).toBe('invalid-priority');
  });

  it('should accept priority at boundary values 1 and 10', () => {
    const r1 = sys.createGoal('npc-1', 'Low priority', 1);
    const r2 = sys.createGoal('npc-1', 'High priority', 10);
    expect(typeof r1).not.toBe('string');
    expect(typeof r2).not.toBe('string');
  });
});

// ============================================================================
// TESTS: ADD TASK
// ============================================================================

describe('NpcGoalPlanner - Add Task', () => {
  let sys: NpcGoalPlannerSystem;

  beforeEach(() => {
    sys = createNpcGoalPlannerSystem(createMockDeps());
    sys.registerNpc('npc-1');
  });

  it('should add a task to an existing goal', () => {
    const goal = sys.createGoal('npc-1', 'Trade run', 5);
    if (typeof goal === 'string') throw new Error('expected goal');
    const task = sys.addTask(goal.goalId, 'Collect goods');
    if (typeof task === 'string') throw new Error('expected task');
    expect(task.goalId).toBe(goal.goalId);
    expect(task.description).toBe('Collect goods');
    expect(task.status).toBe('PENDING');
    expect(task.startedAt).toBeNull();
    expect(task.completedAt).toBeNull();
  });

  it('should return goal-not-found for unknown goal', () => {
    const result = sys.addTask('no-such-goal', 'A task');
    expect(result).toBe('goal-not-found');
  });

  it('should reflect new task in goal taskIds', () => {
    const goal = sys.createGoal('npc-1', 'Multi task goal', 5);
    if (typeof goal === 'string') throw new Error('expected goal');
    const task = sys.addTask(goal.goalId, 'Step one');
    if (typeof task === 'string') throw new Error('expected task');
    const retrieved = sys.getGoal(goal.goalId);
    expect(retrieved?.taskIds).toContain(task.taskId);
  });
});

// ============================================================================
// TESTS: GOAL LIFECYCLE
// ============================================================================

describe('NpcGoalPlanner - Goal Lifecycle', () => {
  let sys: NpcGoalPlannerSystem;

  beforeEach(() => {
    sys = createNpcGoalPlannerSystem(createMockDeps());
    sys.registerNpc('npc-1');
  });

  it('should activate a PENDING goal', () => {
    const goal = sys.createGoal('npc-1', 'Patrol route', 4);
    if (typeof goal === 'string') throw new Error('expected goal');
    const result = sys.activateGoal(goal.goalId);
    expect(result.success).toBe(true);
    expect(sys.getGoal(goal.goalId)?.status).toBe('ACTIVE');
  });

  it('should not activate an already ACTIVE goal', () => {
    const goal = sys.createGoal('npc-1', 'A goal', 5);
    if (typeof goal === 'string') throw new Error('expected goal');
    sys.activateGoal(goal.goalId);
    const result = sys.activateGoal(goal.goalId);
    expect(result.success).toBe(false);
  });

  it('should abandon a PENDING goal', () => {
    const goal = sys.createGoal('npc-1', 'Abandon me', 2);
    if (typeof goal === 'string') throw new Error('expected goal');
    const result = sys.abandonGoal(goal.goalId);
    expect(result.success).toBe(true);
    expect(sys.getGoal(goal.goalId)?.status).toBe('ABANDONED');
  });

  it('should abandon an ACTIVE goal', () => {
    const goal = sys.createGoal('npc-1', 'Abandon active', 3);
    if (typeof goal === 'string') throw new Error('expected goal');
    sys.activateGoal(goal.goalId);
    const result = sys.abandonGoal(goal.goalId);
    expect(result.success).toBe(true);
    expect(sys.getGoal(goal.goalId)?.status).toBe('ABANDONED');
  });

  it('should return goal-not-found for unknown goalId in activateGoal', () => {
    const result = sys.activateGoal('no-such');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('goal-not-found');
  });
});

// ============================================================================
// TESTS: TASK LIFECYCLE
// ============================================================================

describe('NpcGoalPlanner - Task Lifecycle', () => {
  let sys: NpcGoalPlannerSystem;

  beforeEach(() => {
    sys = createNpcGoalPlannerSystem(createMockDeps());
    sys.registerNpc('npc-1');
  });

  it('should start a PENDING task', () => {
    const goal = sys.createGoal('npc-1', 'Goal', 5);
    if (typeof goal === 'string') throw new Error('expected goal');
    const task = sys.addTask(goal.goalId, 'Task one');
    if (typeof task === 'string') throw new Error('expected task');
    const result = sys.startTask(task.taskId);
    expect(result.success).toBe(true);
    expect(sys.getTask(task.taskId)?.status).toBe('IN_PROGRESS');
    expect(sys.getTask(task.taskId)?.startedAt).not.toBeNull();
  });

  it('should complete an IN_PROGRESS task and detect goal completion', () => {
    const goal = sys.createGoal('npc-1', 'One task goal', 5);
    if (typeof goal === 'string') throw new Error('expected goal');
    const task = sys.addTask(goal.goalId, 'The task');
    if (typeof task === 'string') throw new Error('expected task');
    sys.startTask(task.taskId);
    const result = sys.completeTask(task.taskId);
    expect(result.success).toBe(true);
    if (result.success) expect(result.goalCompleted).toBe(true);
    expect(sys.getGoal(goal.goalId)?.status).toBe('COMPLETED');
  });

  it('should not mark goal completed until all tasks are DONE', () => {
    const goal = sys.createGoal('npc-1', 'Two task goal', 5);
    if (typeof goal === 'string') throw new Error('expected goal');
    const t1 = sys.addTask(goal.goalId, 'Task A');
    const t2 = sys.addTask(goal.goalId, 'Task B');
    if (typeof t1 === 'string' || typeof t2 === 'string') throw new Error('expected tasks');
    sys.startTask(t1.taskId);
    const result = sys.completeTask(t1.taskId);
    if (result.success) expect(result.goalCompleted).toBe(false);
    expect(sys.getGoal(goal.goalId)?.status).toBe('PENDING');
  });

  it('should fail a task and mark goal as FAILED', () => {
    const goal = sys.createGoal('npc-1', 'Failable goal', 5);
    if (typeof goal === 'string') throw new Error('expected goal');
    const task = sys.addTask(goal.goalId, 'Risky task');
    if (typeof task === 'string') throw new Error('expected task');
    sys.startTask(task.taskId);
    const result = sys.failTask(task.taskId);
    expect(result.success).toBe(true);
    if (result.success) expect(result.goalFailed).toBe(true);
    expect(sys.getGoal(goal.goalId)?.status).toBe('FAILED');
  });

  it('should return task-not-found for unknown taskId', () => {
    const result = sys.startTask('no-such-task');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('task-not-found');
  });
});

// ============================================================================
// TESTS: LIST GOALS AND STATS
// ============================================================================

describe('NpcGoalPlanner - List Goals & Stats', () => {
  let sys: NpcGoalPlannerSystem;

  beforeEach(() => {
    sys = createNpcGoalPlannerSystem(createMockDeps());
    sys.registerNpc('npc-1');
  });

  it('should list all goals for an NPC', () => {
    sys.createGoal('npc-1', 'Goal A', 5);
    sys.createGoal('npc-1', 'Goal B', 7);
    const goals = sys.listGoals('npc-1');
    expect(goals).toHaveLength(2);
  });

  it('should filter goals by status', () => {
    const g1 = sys.createGoal('npc-1', 'Active goal', 5);
    sys.createGoal('npc-1', 'Pending goal', 3);
    if (typeof g1 === 'string') throw new Error('expected goal');
    sys.activateGoal(g1.goalId);
    const active = sys.listGoals('npc-1', 'ACTIVE');
    expect(active).toHaveLength(1);
    expect(active[0]?.goalId).toBe(g1.goalId);
  });

  it('should return correct planner stats', () => {
    const g1 = sys.createGoal('npc-1', 'Active goal', 5);
    const g2 = sys.createGoal('npc-1', 'Pending goal', 3);
    if (typeof g1 === 'string' || typeof g2 === 'string') throw new Error('expected goals');
    sys.activateGoal(g1.goalId);
    const task = sys.addTask(g2.goalId, 'A task');
    if (typeof task === 'string') throw new Error('expected task');
    const stats = sys.getPlannerStats('npc-1');
    expect(stats?.activeGoals).toBe(1);
    expect(stats?.pendingTasks).toBe(1);
  });

  it('should return undefined stats for unregistered NPC', () => {
    const stats = sys.getPlannerStats('ghost');
    expect(stats).toBeUndefined();
  });
});
