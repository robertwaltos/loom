import { describe, expect, it } from 'vitest';
import {
  createSpawnBudgetState,
  setBudget,
  requestSpawn,
  processQueue,
  getBudgetReport,
  refillBudgets,
  emergencyPurge,
  getTotalActiveEntities,
} from '../spawn-budget.js';

describe('spawn-budget simulation', () => {
  it('simulates queue prioritization, processing, refill cycles, and emergency purge', () => {
    let now = 1_000_000n;
    let seq = 0;
    const state = createSpawnBudgetState(
      { nowMicros: () => now },
      { nextId: () => 'req-' + String(++seq) },
      { info: () => undefined, warn: () => undefined, error: () => undefined },
    );

    setBudget(state, 'world-1', 5, 10, 10, 10, 10, 1_000_000n);
    requestSpawn(state, 'world-1', 'NPC', 'LOW', 'villager', 3);
    requestSpawn(state, 'world-1', 'NPC', 'CRITICAL', 'guard', 2);

    const processed = processQueue(state, 'world-1', 10);
    const report = getBudgetReport(state, 'world-1', 'NPC');

    now += 3_000_000n;
    refillBudgets(state, 'world-1');
    emergencyPurge(state, 'world-1', 'NPC', 1);
    const total = getTotalActiveEntities(state, 'world-1');

    expect(Array.isArray(processed)).toBe(true);
    if (!Array.isArray(processed)) return;
    expect(processed[0]?.priority).toBe('CRITICAL');
    expect(typeof report).toBe('object');
    if (typeof report === 'string') return;
    expect(report.max).toBe(5);
    expect(total).toBe(1);
  });
});
