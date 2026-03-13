import { describe, expect, it } from 'vitest';
import {
  believeMyth,
  createMyth,
  createNpcMythologyState,
  createTradition,
  getBeliefProfile,
  observeTradition,
  practiceTradition,
  registerNpc,
} from '../npc-mythology.js';

describe('npc-mythology simulation', () => {
  it('simulates myth belief adoption and tradition practice in a community', () => {
    let now = 1_000_000n;
    let id = 0;
    const state = createNpcMythologyState({
      clock: { now: () => (now += 1_000n) },
      idGen: { generate: () => `myth-${++id}` },
      logger: { info: () => undefined, error: () => undefined },
    });

    registerNpc(state, 'npc-1');
    const myth = createMyth(state, 'Song of the First Loom', 'CREATION', 'world-1', 8);
    const tradition = createTradition(state, 'Dawn Weaving Rite', 'DAILY');

    believeMyth(state, 'npc-1', myth.mythId);
    practiceTradition(state, 'npc-1', tradition.traditionId);
    observeTradition(state, tradition.traditionId);

    const profile = getBeliefProfile(state, 'npc-1');
    expect(profile?.myths).toContain(myth.mythId);
    expect(profile?.traditions).toContain(tradition.traditionId);
  });
});
