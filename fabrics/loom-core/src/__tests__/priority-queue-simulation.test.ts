import { describe, expect, it } from 'vitest';
import { createPriorityQueue } from '../priority-queue.js';

describe('priority-queue simulation', () => {
  it('simulates scheduling, reprioritisation, cancellation, and dequeue ordering', () => {
    let now = 1_000_000;
    let id = 0;
    const queue = createPriorityQueue({
      clock: { nowMicroseconds: () => now++ },
      idGenerator: { next: () => `task-${++id}` },
    });

    const a = queue.enqueue({ label: 'low', priority: 10, payload: null });
    const b = queue.enqueue({ label: 'mid', priority: 5, payload: null });
    const c = queue.enqueue({ label: 'high', priority: 1, payload: null });
    if (!a || !b || !c) throw new Error('expected tasks');

    queue.reprioritise(b.taskId, 0);
    queue.cancel(a.taskId);

    expect(queue.dequeue()?.label).toBe('mid');
    expect(queue.dequeue()?.label).toBe('high');
    expect(queue.size()).toBe(0);
  });
});
