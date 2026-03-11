/**
 * Transit-Weave Queue Adapter — Proves bidirectional queue bridge works.
 */

import { describe, it, expect } from 'vitest';
import { createTransitWeaveAdapter } from '../transit-weave-adapter.js';
import type { TransitQueueItem } from '../transit-weave-adapter.js';

function mockClock(start = 1_000_000): {
  readonly nowMicroseconds: () => number;
  advance: (us: number) => void;
} {
  let t = start;
  return {
    nowMicroseconds: () => t,
    advance: (us: number) => {
      t += us;
    },
  };
}

function makeRequest(id: number): TransitQueueItem {
  return {
    requestId: 'req-' + String(id),
    entityId: 'entity-' + String(id),
    dynastyId: 'dynasty-' + String(id),
    sourceWorldId: 'earth',
    destinationWorldId: 'mars',
    requestedAt: 1_000_000,
  };
}

// ── Construction ─────────────────────────────────────────────────

describe('TransitWeaveAdapter — construction', () => {
  it('starts with empty queue', () => {
    const clock = mockClock();
    const adapter = createTransitWeaveAdapter({ clock });
    expect(adapter.writePort.getPendingCount()).toBe(0);
    expect(adapter.readPort.getQueueDepth()).toBe(0);
  });
});

// ── Enqueue/Dequeue ─────────────────────────────────────────────

describe('TransitWeaveAdapter — enqueue and dequeue', () => {
  it('enqueues transit request and dequeues as weave entry', () => {
    const clock = mockClock();
    const adapter = createTransitWeaveAdapter({ clock });

    adapter.writePort.enqueue(makeRequest(1));
    expect(adapter.writePort.getPendingCount()).toBe(1);

    const entry = adapter.readPort.dequeue();
    expect(entry).toBeDefined();
    expect(entry?.requestId).toBe('req-1');
    expect(entry?.entityId).toBe('entity-1');
    expect(entry?.originNodeId).toBe('earth');
    expect(entry?.destinationNodeId).toBe('mars');
    expect(entry?.priority).toBe('normal');
  });

  it('maintains FIFO order', () => {
    const clock = mockClock();
    const adapter = createTransitWeaveAdapter({ clock });

    adapter.writePort.enqueue(makeRequest(1));
    adapter.writePort.enqueue(makeRequest(2));
    adapter.writePort.enqueue(makeRequest(3));

    const first = adapter.readPort.dequeue();
    const second = adapter.readPort.dequeue();
    const third = adapter.readPort.dequeue();

    expect(first?.requestId).toBe('req-1');
    expect(second?.requestId).toBe('req-2');
    expect(third?.requestId).toBe('req-3');
  });

  it('returns undefined when queue is empty', () => {
    const clock = mockClock();
    const adapter = createTransitWeaveAdapter({ clock });
    expect(adapter.readPort.dequeue()).toBeUndefined();
  });

  it('respects max queue depth', () => {
    const clock = mockClock();
    const adapter = createTransitWeaveAdapter({ clock }, { maxQueueDepth: 2 });

    adapter.writePort.enqueue(makeRequest(1));
    adapter.writePort.enqueue(makeRequest(2));
    adapter.writePort.enqueue(makeRequest(3));

    expect(adapter.writePort.getPendingCount()).toBe(2);
  });
});

// ── Expiration ──────────────────────────────────────────────────

describe('TransitWeaveAdapter — expiration sweep', () => {
  it('sweeps expired requests', () => {
    const clock = mockClock();
    const adapter = createTransitWeaveAdapter({ clock }, { requestTtlMicroseconds: 10_000_000 });

    adapter.writePort.enqueue(makeRequest(1));
    clock.advance(15_000_000);

    const swept = adapter.readPort.sweepExpired();
    expect(swept).toBe(1);
    expect(adapter.readPort.getQueueDepth()).toBe(0);
  });

  it('preserves non-expired requests', () => {
    const clock = mockClock();
    const adapter = createTransitWeaveAdapter({ clock }, { requestTtlMicroseconds: 10_000_000 });

    adapter.writePort.enqueue(makeRequest(1));
    clock.advance(5_000_000);
    adapter.writePort.enqueue(makeRequest(2));
    clock.advance(6_000_000);

    const swept = adapter.readPort.sweepExpired();
    expect(swept).toBe(1);
    expect(adapter.readPort.getQueueDepth()).toBe(1);

    const remaining = adapter.readPort.dequeue();
    expect(remaining?.requestId).toBe('req-2');
  });

  it('returns zero when nothing to sweep', () => {
    const clock = mockClock();
    const adapter = createTransitWeaveAdapter({ clock });
    expect(adapter.readPort.sweepExpired()).toBe(0);
  });
});

// ── Stats ───────────────────────────────────────────────────────

describe('TransitWeaveAdapter — stats', () => {
  it('tracks enqueue and dequeue counts', () => {
    const clock = mockClock();
    const adapter = createTransitWeaveAdapter({ clock });

    adapter.writePort.enqueue(makeRequest(1));
    adapter.writePort.enqueue(makeRequest(2));
    adapter.readPort.dequeue();

    const stats = adapter.getStats();
    expect(stats.totalEnqueued).toBe(2);
    expect(stats.totalDequeued).toBe(1);
    expect(stats.totalExpired).toBe(0);
    expect(stats.currentDepth).toBe(1);
  });

  it('tracks expired count', () => {
    const clock = mockClock();
    const adapter = createTransitWeaveAdapter({ clock }, { requestTtlMicroseconds: 5_000_000 });

    adapter.writePort.enqueue(makeRequest(1));
    clock.advance(10_000_000);
    adapter.readPort.sweepExpired();

    const stats = adapter.getStats();
    expect(stats.totalExpired).toBe(1);
  });
});
