import { describe, it, expect } from 'vitest';
import { createTransitQueue } from '../transit-queue.js';
import type { TransitQueueDeps } from '../transit-queue.js';

function makeDeps(): TransitQueueDeps {
  let id = 0;
  let time = 1_000_000;
  return {
    idGenerator: { next: () => 'req-' + String(++id) },
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('TransitQueue — enqueue', () => {
  it('enqueues a transit request', () => {
    const queue = createTransitQueue(makeDeps());
    const result = queue.enqueue({
      entityId: 'e1',
      fromNodeId: 'earth',
      toNodeId: 'mars',
      priority: 'normal',
    });
    expect(result.requestId).toBe('req-1');
    expect(result.position).toBe(0);
    expect(queue.getQueueDepth()).toBe(1);
  });

  it('enqueues multiple requests in FIFO within same priority', () => {
    const queue = createTransitQueue(makeDeps());
    queue.enqueue({ entityId: 'e1', fromNodeId: 'a', toNodeId: 'b', priority: 'normal' });
    const r2 = queue.enqueue({ entityId: 'e2', fromNodeId: 'a', toNodeId: 'c', priority: 'normal' });
    expect(r2.position).toBe(1);
  });
});

describe('TransitQueue — priority ordering', () => {
  it('orders emergency before normal', () => {
    const queue = createTransitQueue(makeDeps());
    queue.enqueue({ entityId: 'e1', fromNodeId: 'a', toNodeId: 'b', priority: 'normal' });
    queue.enqueue({ entityId: 'e2', fromNodeId: 'a', toNodeId: 'c', priority: 'emergency' });
    const first = queue.peek();
    expect(first?.entityId).toBe('e2');
    expect(first?.priority).toBe('emergency');
  });

  it('orders high before low', () => {
    const queue = createTransitQueue(makeDeps());
    queue.enqueue({ entityId: 'e1', fromNodeId: 'a', toNodeId: 'b', priority: 'low' });
    queue.enqueue({ entityId: 'e2', fromNodeId: 'a', toNodeId: 'c', priority: 'high' });
    expect(queue.peek()?.entityId).toBe('e2');
  });

  it('preserves FIFO within same priority', () => {
    const queue = createTransitQueue(makeDeps());
    queue.enqueue({ entityId: 'e1', fromNodeId: 'a', toNodeId: 'b', priority: 'normal' });
    queue.enqueue({ entityId: 'e2', fromNodeId: 'a', toNodeId: 'c', priority: 'normal' });
    expect(queue.peek()?.entityId).toBe('e1');
  });
});

describe('TransitQueue — dequeue and peek', () => {
  it('dequeues the highest priority entry', () => {
    const queue = createTransitQueue(makeDeps());
    queue.enqueue({ entityId: 'e1', fromNodeId: 'a', toNodeId: 'b', priority: 'low' });
    queue.enqueue({ entityId: 'e2', fromNodeId: 'a', toNodeId: 'c', priority: 'high' });
    const entry = queue.dequeue();
    expect(entry?.entityId).toBe('e2');
    expect(queue.getQueueDepth()).toBe(1);
  });

  it('returns undefined when queue is empty', () => {
    const queue = createTransitQueue(makeDeps());
    expect(queue.dequeue()).toBeUndefined();
    expect(queue.peek()).toBeUndefined();
  });

  it('peek does not remove the entry', () => {
    const queue = createTransitQueue(makeDeps());
    queue.enqueue({ entityId: 'e1', fromNodeId: 'a', toNodeId: 'b', priority: 'normal' });
    queue.peek();
    expect(queue.getQueueDepth()).toBe(1);
  });
});

describe('TransitQueue — cancel', () => {
  it('cancels a request by id', () => {
    const queue = createTransitQueue(makeDeps());
    const result = queue.enqueue({
      entityId: 'e1', fromNodeId: 'a', toNodeId: 'b', priority: 'normal',
    });
    expect(queue.cancel(result.requestId)).toBe(true);
    expect(queue.getQueueDepth()).toBe(0);
  });

  it('returns false for unknown request', () => {
    const queue = createTransitQueue(makeDeps());
    expect(queue.cancel('unknown')).toBe(false);
  });

  it('cancels all requests for an entity', () => {
    const queue = createTransitQueue(makeDeps());
    queue.enqueue({ entityId: 'e1', fromNodeId: 'a', toNodeId: 'b', priority: 'normal' });
    queue.enqueue({ entityId: 'e1', fromNodeId: 'a', toNodeId: 'c', priority: 'high' });
    queue.enqueue({ entityId: 'e2', fromNodeId: 'a', toNodeId: 'd', priority: 'normal' });
    expect(queue.cancelByEntity('e1')).toBe(2);
    expect(queue.getQueueDepth()).toBe(1);
  });
});

describe('TransitQueue — position', () => {
  it('returns position for a queued request', () => {
    const queue = createTransitQueue(makeDeps());
    queue.enqueue({ entityId: 'e1', fromNodeId: 'a', toNodeId: 'b', priority: 'normal' });
    const r2 = queue.enqueue({
      entityId: 'e2', fromNodeId: 'a', toNodeId: 'c', priority: 'normal',
    });
    expect(queue.getPosition(r2.requestId)).toBe(1);
  });

  it('returns -1 for unknown request', () => {
    const queue = createTransitQueue(makeDeps());
    expect(queue.getPosition('unknown')).toBe(-1);
  });
});

describe('TransitQueue — expiration sweep', () => {
  it('removes expired entries', () => {
    let time = 0;
    const deps: TransitQueueDeps = {
      idGenerator: { next: () => 'r-' + String(++time) },
      clock: { nowMicroseconds: () => time },
    };
    time = 1_000_000;
    const queue = createTransitQueue(deps, { defaultTtlUs: 10_000_000 });
    queue.enqueue({ entityId: 'e1', fromNodeId: 'a', toNodeId: 'b', priority: 'normal' });
    time = 50_000_000;
    const removed = queue.sweepExpired();
    expect(removed).toBe(1);
    expect(queue.getQueueDepth()).toBe(0);
  });

  it('keeps non-expired entries', () => {
    let time = 1_000_000;
    const deps: TransitQueueDeps = {
      idGenerator: { next: () => 'r-' + String(++time) },
      clock: { nowMicroseconds: () => time },
    };
    const queue = createTransitQueue(deps, { defaultTtlUs: 100_000_000 });
    queue.enqueue({ entityId: 'e1', fromNodeId: 'a', toNodeId: 'b', priority: 'normal' });
    time += 5_000_000;
    expect(queue.sweepExpired()).toBe(0);
    expect(queue.getQueueDepth()).toBe(1);
  });
});

describe('TransitQueue — stats', () => {
  it('tracks aggregate statistics', () => {
    const queue = createTransitQueue(makeDeps());
    queue.enqueue({ entityId: 'e1', fromNodeId: 'a', toNodeId: 'b', priority: 'normal' });
    queue.enqueue({ entityId: 'e2', fromNodeId: 'a', toNodeId: 'c', priority: 'high' });
    queue.dequeue();
    queue.cancel('req-1');

    const stats = queue.getStats();
    expect(stats.totalEnqueued).toBe(2);
    expect(stats.totalProcessed).toBe(1);
    expect(stats.totalCancelled).toBe(1);
    expect(stats.currentDepth).toBe(0);
  });

  it('starts with zero stats', () => {
    const queue = createTransitQueue(makeDeps());
    const stats = queue.getStats();
    expect(stats.totalEnqueued).toBe(0);
    expect(stats.totalProcessed).toBe(0);
    expect(stats.currentDepth).toBe(0);
  });

  it('preserves metadata on enqueued entries', () => {
    const queue = createTransitQueue(makeDeps());
    queue.enqueue({
      entityId: 'e1', fromNodeId: 'a', toNodeId: 'b',
      priority: 'normal', metadata: { reason: 'quest' },
    });
    const entry = queue.peek();
    expect(entry?.metadata).toEqual({ reason: 'quest' });
  });
});
