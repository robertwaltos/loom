import { describe, expect, it } from 'vitest';
import { createChronicleService } from '../chronicle-service.js';

describe('chronicle-service simulation', () => {
  it('simulates sequential world chronicles with searchable narrative trail', () => {
    let id = 0;
    const svc = createChronicleService({
      clock: { nowMicroseconds: () => 1_000 },
      idGenerator: { generate: () => `entry-${++id}` },
    });

    const first = svc.createEntry({
      authorEntityId: 'player-1' as never,
      worldId: 'world-a',
      entryType: 'governance',
      summary: 'Election held',
      body: 'House Silfen wins.',
      tags: ['election'],
    });
    const second = svc.createEntry({
      authorEntityId: 'player-2' as never,
      worldId: 'world-a',
      entryType: 'economy',
      summary: 'Market reforms',
      body: 'Trade duties lowered.',
      tags: ['trade'],
    });

    const search = svc.search('world-a', 'trade');
    expect(second.previousHash).toBe(first.entryHash);
    expect(search.totalCount).toBe(1);
    expect(svc.verifyChain('world-a')).toHaveLength(0);
  });
});
