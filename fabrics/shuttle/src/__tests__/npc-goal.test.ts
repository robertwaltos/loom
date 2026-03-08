import { describe, it, expect } from 'vitest';
import { createNpcGoalPlanner } from '../npc-goal.js';
import type { NpcGoalDeps } from '../npc-goal.js';

function makeDeps(): NpcGoalDeps {
  let id = 0;
  let time = 1_000_000;
  return {
    idGenerator: { next: () => 'goal-' + String(++id) },
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('NpcGoalPlanner — add goals', () => {
  it('adds a goal', () => {
    const planner = createNpcGoalPlanner(makeDeps());
    const goal = planner.addGoal({
      entityId: 'npc-1', description: 'Find treasure', priority: 5,
    });
    expect(goal.goalId).toBe('goal-1');
    expect(goal.status).toBe('pending');
    expect(goal.priority).toBe(5);
  });

  it('adds a sub-goal', () => {
    const planner = createNpcGoalPlanner(makeDeps());
    const parent = planner.addGoal({
      entityId: 'npc-1', description: 'Main quest', priority: 10,
    });
    const sub = planner.addGoal({
      entityId: 'npc-1', description: 'Sub task', priority: 5,
      parentGoalId: parent.goalId,
    });
    expect(sub.parentGoalId).toBe(parent.goalId);
  });

  it('stores metadata', () => {
    const planner = createNpcGoalPlanner(makeDeps());
    const goal = planner.addGoal({
      entityId: 'npc-1', description: 'Trade', priority: 3,
      metadata: { reason: 'profit' },
    });
    expect(goal.metadata).toEqual({ reason: 'profit' });
  });
});

describe('NpcGoalPlanner — lifecycle transitions', () => {
  it('activates a pending goal', () => {
    const planner = createNpcGoalPlanner(makeDeps());
    const goal = planner.addGoal({
      entityId: 'npc-1', description: 'Goal', priority: 5,
    });
    expect(planner.activateGoal(goal.goalId)).toBe(true);
    expect(planner.getGoal(goal.goalId)?.status).toBe('active');
  });

  it('completes an active goal', () => {
    const planner = createNpcGoalPlanner(makeDeps());
    const goal = planner.addGoal({
      entityId: 'npc-1', description: 'Goal', priority: 5,
    });
    planner.activateGoal(goal.goalId);
    expect(planner.completeGoal(goal.goalId)).toBe(true);
    const updated = planner.getGoal(goal.goalId);
    expect(updated?.status).toBe('completed');
    expect(updated?.completedAt).toBeGreaterThan(0);
  });

  it('fails an active goal', () => {
    const planner = createNpcGoalPlanner(makeDeps());
    const goal = planner.addGoal({
      entityId: 'npc-1', description: 'Goal', priority: 5,
    });
    planner.activateGoal(goal.goalId);
    expect(planner.failGoal(goal.goalId)).toBe(true);
    expect(planner.getGoal(goal.goalId)?.status).toBe('failed');
  });

  it('abandons an active goal', () => {
    const planner = createNpcGoalPlanner(makeDeps());
    const goal = planner.addGoal({
      entityId: 'npc-1', description: 'Goal', priority: 5,
    });
    planner.activateGoal(goal.goalId);
    expect(planner.abandonGoal(goal.goalId)).toBe(true);
    expect(planner.getGoal(goal.goalId)?.status).toBe('abandoned');
  });

  it('cannot complete a pending goal', () => {
    const planner = createNpcGoalPlanner(makeDeps());
    const goal = planner.addGoal({
      entityId: 'npc-1', description: 'Goal', priority: 5,
    });
    expect(planner.completeGoal(goal.goalId)).toBe(false);
  });

  it('cannot activate an active goal', () => {
    const planner = createNpcGoalPlanner(makeDeps());
    const goal = planner.addGoal({
      entityId: 'npc-1', description: 'Goal', priority: 5,
    });
    planner.activateGoal(goal.goalId);
    expect(planner.activateGoal(goal.goalId)).toBe(false);
  });
});

describe('NpcGoalPlanner — queries', () => {
  it('gets entity goals sorted by priority', () => {
    const planner = createNpcGoalPlanner(makeDeps());
    planner.addGoal({ entityId: 'npc-1', description: 'Low', priority: 1 });
    planner.addGoal({ entityId: 'npc-1', description: 'High', priority: 10 });
    planner.addGoal({ entityId: 'npc-1', description: 'Mid', priority: 5 });
    const goals = planner.getEntityGoals('npc-1');
    expect(goals).toHaveLength(3);
    expect(goals[0]?.priority).toBe(10);
    expect(goals[2]?.priority).toBe(1);
  });

  it('gets active goal for entity', () => {
    const planner = createNpcGoalPlanner(makeDeps());
    const g1 = planner.addGoal({
      entityId: 'npc-1', description: 'A', priority: 5,
    });
    planner.addGoal({ entityId: 'npc-1', description: 'B', priority: 3 });
    planner.activateGoal(g1.goalId);
    const active = planner.getActiveGoal('npc-1');
    expect(active?.goalId).toBe(g1.goalId);
  });

  it('returns undefined when no active goal', () => {
    const planner = createNpcGoalPlanner(makeDeps());
    planner.addGoal({ entityId: 'npc-1', description: 'A', priority: 5 });
    expect(planner.getActiveGoal('npc-1')).toBeUndefined();
  });

  it('gets sub-goals of a parent', () => {
    const planner = createNpcGoalPlanner(makeDeps());
    const parent = planner.addGoal({
      entityId: 'npc-1', description: 'Main', priority: 10,
    });
    planner.addGoal({
      entityId: 'npc-1', description: 'Sub1', priority: 5,
      parentGoalId: parent.goalId,
    });
    planner.addGoal({
      entityId: 'npc-1', description: 'Sub2', priority: 3,
      parentGoalId: parent.goalId,
    });
    const subs = planner.getSubGoals(parent.goalId);
    expect(subs).toHaveLength(2);
  });

  it('returns empty for no sub-goals', () => {
    const planner = createNpcGoalPlanner(makeDeps());
    expect(planner.getSubGoals('nonexistent')).toHaveLength(0);
  });
});

describe('NpcGoalPlanner — stats', () => {
  it('tracks aggregate statistics', () => {
    const planner = createNpcGoalPlanner(makeDeps());
    const g1 = planner.addGoal({
      entityId: 'npc-1', description: 'A', priority: 5,
    });
    const g2 = planner.addGoal({
      entityId: 'npc-2', description: 'B', priority: 3,
    });
    planner.activateGoal(g1.goalId);
    planner.completeGoal(g1.goalId);
    planner.activateGoal(g2.goalId);
    planner.failGoal(g2.goalId);

    const stats = planner.getStats();
    expect(stats.totalGoals).toBe(2);
    expect(stats.completedGoals).toBe(1);
    expect(stats.failedGoals).toBe(1);
    expect(stats.entities).toBe(2);
  });

  it('starts with zero stats', () => {
    const planner = createNpcGoalPlanner(makeDeps());
    const stats = planner.getStats();
    expect(stats.totalGoals).toBe(0);
    expect(stats.entities).toBe(0);
  });
});
