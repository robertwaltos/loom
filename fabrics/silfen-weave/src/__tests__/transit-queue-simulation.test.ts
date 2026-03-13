import { describe, expect, it } from 'vitest';
import { createTransitQueue } from '../transit-queue.js';

function makeQueue() {
  let i = 0;
  let now = 1_000_000;
  return {
    advance: (delta: number) => {
      now += delta;
    },
    queue: createTransitQueue({
      idGenerator: { next: () => `req-${++i}` },
      clock: { nowMicroseconds: () => now },
    }),
  };
}

describe('transit-queue simulation', () => {
  it('prioritizes emergency entries and sweeps expired backlog', () => {
    const { queue, advance } = makeQueue();
    queue.enqueue({ entityId: 'e1', fromNodeId: 'a', toNodeId: 'b', priority: 'normal' });
    queue.enqueue({ entityId: 'e2', fromNodeId: 'a', toNodeId: 'c', priority: 'emergency' });
    expect(queue.peek()?.entityId).toBe('e2');

    advance(500_000_000);
    const swept = queue.sweepExpired();
    expect(swept).toBeGreaterThanOrEqual(1);
    expect(queue.getQueueDepth()).toBeLessThanOrEqual(1);
  });
});
