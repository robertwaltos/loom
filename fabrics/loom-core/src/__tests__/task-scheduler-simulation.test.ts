import { describe, expect, it } from 'vitest';
import { createTaskScheduler } from '../task-scheduler.js';

describe('task-scheduler simulation', () => {
  it('simulates scheduling, due dispatch, execution marking, and cancellation', () => {
    let now = 0;
    let id = 0;
    const scheduler = createTaskScheduler({
      clock: { nowMicroseconds: () => now },
      idGenerator: { next: () => 'task-' + String(id++) },
    });

    const t1 = scheduler.schedule({ name: 'sync', payload: { shard: 1 }, executeAt: 1_000 });
    const t2 = scheduler.schedule({ name: 'cleanup', payload: null, executeAt: 2_000 });
    const t3 = scheduler.schedule({ name: 'notify', payload: 'done', executeAt: 2_000 });

    scheduler.cancel(t3.taskId);
    now = 1_500;
    const due1 = scheduler.getDue();
    scheduler.markExecuted(t1.taskId);

    now = 2_500;
    const due2 = scheduler.getDue();
    scheduler.markExecuted(t2.taskId);

    const stats = scheduler.getStats();

    expect(due1.map((t) => t.taskId)).toEqual([t1.taskId]);
    expect(due2.map((t) => t.taskId)).toEqual([t2.taskId]);
    expect(stats.executedTasks).toBe(2);
    expect(stats.cancelledTasks).toBe(1);
  });
});
