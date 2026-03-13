import { describe, expect, it } from 'vitest';
import { createSystemScheduler } from '../system-scheduler.js';

describe('system-scheduler simulation', () => {
  it('simulates phased planning plus execution timing accumulation', () => {
    let now = 1_000_000;
    const scheduler = createSystemScheduler({
      clock: { nowMicroseconds: () => (now += 1_000) },
    });

    scheduler.register('input', 'pre-update');
    scheduler.register('physics', 'update', ['input']);
    scheduler.register('ai', 'update', ['input']);
    scheduler.register('post', 'post-update', ['physics', 'ai']);
    scheduler.register('render', 'render', ['post']);

    scheduler.recordExecution('physics', 500);
    scheduler.recordExecution('physics', 700);
    scheduler.recordExecution('render', 300);

    const plan = scheduler.buildPlan();
    const physicsTiming = scheduler.getTiming('physics');
    const stats = scheduler.getStats();

    expect(plan.valid).toBe(true);
    expect(plan.phases.map((p) => p.phase)).toEqual(['pre-update', 'update', 'post-update', 'render']);
    expect(physicsTiming?.executionCount).toBe(2);
    expect(physicsTiming?.averageDurationMicros).toBe(600);
    expect(stats.totalEdges).toBe(5);
  });
});
