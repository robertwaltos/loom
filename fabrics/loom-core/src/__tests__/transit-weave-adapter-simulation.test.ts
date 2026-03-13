import { describe, expect, it } from 'vitest';
import { createTransitWeaveAdapter } from '../transit-weave-adapter.js';

describe('transit-weave-adapter simulation', () => {
  it('simulates queue bridge flow from transit requests to weave dequeue and expiry sweep', () => {
    let now = 1_000_000;
    const adapter = createTransitWeaveAdapter(
      { clock: { nowMicroseconds: () => now } },
      { maxQueueDepth: 5, requestTtlMicroseconds: 5_000 },
    );

    adapter.writePort.enqueue({
      requestId: 'req-1',
      entityId: 'e-1',
      dynastyId: 'd-1',
      sourceWorldId: 'earth',
      destinationWorldId: 'mars',
      requestedAt: now,
    });
    adapter.writePort.enqueue({
      requestId: 'req-2',
      entityId: 'e-2',
      dynastyId: 'd-1',
      sourceWorldId: 'earth',
      destinationWorldId: 'venus',
      requestedAt: now,
    });

    const first = adapter.readPort.dequeue();
    now += 10_000;
    const swept = adapter.readPort.sweepExpired();
    const stats = adapter.getStats();

    expect(first?.requestId).toBe('req-1');
    expect(first?.originNodeId).toBe('earth');
    expect(swept).toBe(1);
    expect(stats.totalEnqueued).toBe(2);
    expect(stats.totalDequeued).toBe(1);
    expect(stats.totalExpired).toBe(1);
  });
});
