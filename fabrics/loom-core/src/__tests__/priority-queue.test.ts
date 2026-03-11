import { describe, it, expect } from 'vitest';
import { createPriorityQueue } from '../priority-queue.js';
import type { PriorityQueueDeps } from '../priority-queue.js';

function makeDeps(): PriorityQueueDeps {
  let time = 1_000_000;
  let idCounter = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { next: () => 'task-' + String(++idCounter) },
  };
}

describe('PriorityQueue — enqueue and peek', () => {
  it('enqueues a task', () => {
    const q = createPriorityQueue(makeDeps());
    const task = q.enqueue({ label: 'work', priority: 5, payload: null });
    expect(task?.taskId).toBe('task-1');
    expect(q.size()).toBe(1);
  });

  it('peeks without removing', () => {
    const q = createPriorityQueue(makeDeps());
    q.enqueue({ label: 'work', priority: 5, payload: null });
    expect(q.peek()?.label).toBe('work');
    expect(q.size()).toBe(1);
  });

  it('peek returns undefined on empty queue', () => {
    const q = createPriorityQueue(makeDeps());
    expect(q.peek()).toBeUndefined();
  });

  it('enforces max size', () => {
    const q = createPriorityQueue(makeDeps(), { maxSize: 2 });
    q.enqueue({ label: 'a', priority: 1, payload: null });
    q.enqueue({ label: 'b', priority: 2, payload: null });
    const overflow = q.enqueue({ label: 'c', priority: 3, payload: null });
    expect(overflow).toBeUndefined();
    expect(q.size()).toBe(2);
  });
});

describe('PriorityQueue — ordering', () => {
  it('dequeues by priority (lowest first)', () => {
    const q = createPriorityQueue(makeDeps());
    q.enqueue({ label: 'low', priority: 10, payload: null });
    q.enqueue({ label: 'high', priority: 1, payload: null });
    q.enqueue({ label: 'mid', priority: 5, payload: null });
    expect(q.dequeue()?.label).toBe('high');
    expect(q.dequeue()?.label).toBe('mid');
    expect(q.dequeue()?.label).toBe('low');
  });

  it('dequeue returns undefined on empty queue', () => {
    const q = createPriorityQueue(makeDeps());
    expect(q.dequeue()).toBeUndefined();
  });
});

describe('PriorityQueue — cancel and reprioritise', () => {
  it('cancels a task', () => {
    const q = createPriorityQueue(makeDeps());
    const task = q.enqueue({ label: 'work', priority: 5, payload: null });
    expect(q.cancel(task?.taskId ?? '')).toBe(true);
    expect(q.size()).toBe(0);
  });

  it('cancel returns false for unknown task', () => {
    const q = createPriorityQueue(makeDeps());
    expect(q.cancel('missing')).toBe(false);
  });

  it('reprioritises a task', () => {
    const q = createPriorityQueue(makeDeps());
    q.enqueue({ label: 'a', priority: 10, payload: null });
    const b = q.enqueue({ label: 'b', priority: 20, payload: null });
    q.reprioritise(b?.taskId ?? '', 1);
    expect(q.peek()?.label).toBe('b');
  });

  it('reprioritise returns false for unknown task', () => {
    const q = createPriorityQueue(makeDeps());
    expect(q.reprioritise('missing', 1)).toBe(false);
  });
});

describe('PriorityQueue — stats', () => {
  it('starts with empty stats', () => {
    const q = createPriorityQueue(makeDeps());
    const stats = q.getStats();
    expect(stats.size).toBe(0);
    expect(stats.highestPriority).toBeUndefined();
    expect(stats.lowestPriority).toBeUndefined();
  });

  it('reports priority range', () => {
    const q = createPriorityQueue(makeDeps());
    q.enqueue({ label: 'a', priority: 3, payload: null });
    q.enqueue({ label: 'b', priority: 7, payload: null });
    const stats = q.getStats();
    expect(stats.size).toBe(2);
    expect(stats.highestPriority).toBe(3);
    expect(stats.lowestPriority).toBe(7);
  });
});
