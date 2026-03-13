import { describe, expect, it } from 'vitest';
import { createNpcGoalPlanner } from '../npc-goal.js';

describe('npc-goal simulation', () => {
  it('simulates goal tree progression from pending to completed', () => {
    let now = 1_000_000;
    let id = 0;
    const planner = createNpcGoalPlanner({
      idGenerator: { next: () => `goal-${++id}` },
      clock: { nowMicroseconds: () => (now += 1_000_000) },
    });

    const root = planner.addGoal({ entityId: 'npc-1', description: 'Build outpost', priority: 10 });
    const sub = planner.addGoal({ entityId: 'npc-1', description: 'Collect lumber', priority: 6, parentGoalId: root.goalId });

    planner.activateGoal(sub.goalId);
    planner.completeGoal(sub.goalId);
    planner.activateGoal(root.goalId);
    planner.completeGoal(root.goalId);

    expect(planner.getGoal(root.goalId)?.status).toBe('completed');
    expect(planner.getStats().completedGoals).toBe(2);
  });
});
