import { describe, expect, it } from 'vitest';
import {
  createNpcMemoryState,
  getMemoryProfile,
  recallMemories,
  recordMemory,
  registerNpc,
} from '../npc-memory-system.js';

describe('npc-memory-system simulation', () => {
  it('simulates event recording and selective recall', () => {
    let now = 1_000_000n;
    let id = 0;
    const state = createNpcMemoryState({
      clock: { now: () => (now += 1_000n) },
      idGen: { generate: () => `ms-${++id}` },
      logger: { info: () => undefined, error: () => undefined },
    });

    registerNpc(state, 'npc-1');
    recordMemory(state, 'npc-1', 'TRADE', 'HIGH', 'sold silk at east bazaar', null, 'world-1');
    recordMemory(state, 'npc-1', 'COMBAT', 'LOW', 'sparred with guard', null, 'world-1');
    const recall = recallMemories(state, 'npc-1', 'silk', 5);

    expect(typeof recall).toBe('object');
    if (typeof recall === 'object') {
      expect(recall.matches.length).toBe(1);
    }
    expect(getMemoryProfile(state, 'npc-1')?.totalMemories).toBe(2);
  });
});
