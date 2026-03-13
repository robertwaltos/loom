import { describe, expect, it } from 'vitest';
import { createNpcMemoryService } from '../npc-memory.js';

describe('npc-memory simulation', () => {
  it('simulates long-tail recall and reinforcement around key entities', () => {
    let now = 1_000_000;
    let id = 0;
    const service = createNpcMemoryService({
      clock: { nowMicroseconds: () => now++ },
      idGenerator: { next: () => `mem-${++id}` },
    });

    const memory = service.storeMemory('npc-1', {
      type: 'RELATIONSHIP',
      entityId: 'player-hero',
      content: 'Hero rescued my caravan',
      importance: 'critical',
    });

    service.reinforceMemory('npc-1', memory.memoryId);
    const recalled = service.recallByEntity('npc-1', 'player-hero');

    expect(recalled.length).toBe(1);
    expect(recalled[0]?.reinforcements).toBe(1);
  });
});
