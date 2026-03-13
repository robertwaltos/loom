import { describe, expect, it } from 'vitest';
import { createNpcMemoryV2System } from '../npc-memory-v2.js';

describe('npc-memory-v2 simulation', () => {
  it('simulates emotionally tagged memory timeline and targeted recall', () => {
    let now = 1_000_000;
    let id = 0;
    const sys = createNpcMemoryV2System({
      clock: { nowMicroseconds: () => now++ },
      idGenerator: { next: () => `mv2-${++id}` },
    });

    sys.record({
      npcId: 'npc-1',
      memoryType: 'interaction',
      emotionalTag: 'positive',
      subjectEntityId: 'player-1',
      content: 'Shared victory feast',
      importance: 0.7,
    });
    sys.record({
      npcId: 'npc-1',
      memoryType: 'observation',
      emotionalTag: 'negative',
      subjectEntityId: 'enemy-1',
      content: 'Enemy ambush at dusk',
      importance: 0.8,
    });

    expect(sys.recallAbout('npc-1', 'player-1').length).toBe(1);
    expect(sys.recall('npc-1', { emotionalTag: 'negative' }).length).toBe(1);
  });
});
