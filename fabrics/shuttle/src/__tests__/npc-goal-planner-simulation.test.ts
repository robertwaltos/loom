import { describe, expect, it } from 'vitest';
import { createNpcGoalPlannerSystem } from '../npc-goal-planner.js';

describe('npc-goal-planner simulation', () => {
  it('simulates task execution pipeline and goal completion', () => {
    let now = 1_000_000n;
    let id = 0;
    const sys = createNpcGoalPlannerSystem({
      clock: { now: () => (now += 1_000n) },
      idGen: { generate: () => `g-${++id}` },
      logger: { info: () => undefined, error: () => undefined },
    });

    sys.registerNpc('npc-1');
    const goal = sys.createGoal('npc-1', 'Secure trade route', 8);
    if (typeof goal === 'string') throw new Error('goal create failed');
    const task = sys.addTask(goal.goalId, 'Negotiate checkpoint rights');
    if (typeof task === 'string') throw new Error('task create failed');

    sys.activateGoal(goal.goalId);
    sys.startTask(task.taskId);
    const done = sys.completeTask(task.taskId);

    expect(done.success).toBe(true);
    expect(sys.getGoal(goal.goalId)?.status).toBe('COMPLETED');
  });
});
