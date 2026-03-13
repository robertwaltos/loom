import { describe, expect, it } from 'vitest';
import { createEventStream } from '../event-stream.js';

describe('event-stream simulation', () => {
  it('simulates publish, cursor replay, subscription, and ttl pruning', () => {
    let now = 1_000_000n;
    const stream = createEventStream({
      clock: { nowMicroseconds: () => now },
      logger: {
        info: () => undefined,
        warn: () => undefined,
      },
    });

    const observed: string[] = [];
    stream.subscribe('world-1', (event) => {
      observed.push(event.eventType);
    });

    stream.publishToStream('world-1', 'entity.spawned', { entityId: 'e-1' }, 10_000n);
    now += 1_000n;
    stream.publishToStream('world-1', 'entity.moved', { entityId: 'e-1', x: 2 }, 10_000n);

    const cursor = stream.createCursor('world-1', 0n);
    const replay = stream.replayFrom(cursor, 10);
    if (typeof replay === 'string') throw new Error('expected replay result');

    now += 20_000n;
    const pruned = stream.pruneExpired('world-1');

    expect(observed).toEqual(['entity.spawned', 'entity.moved']);
    expect(replay.events).toHaveLength(2);
    expect(pruned).toBe(2);
    expect(stream.getStats('world-1').totalEvents).toBe(0);
  });
});
