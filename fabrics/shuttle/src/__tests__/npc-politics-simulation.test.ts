import { describe, expect, it } from 'vitest';
import {
  castVote,
  contributeInfluence,
  createFaction,
  createNpcPoliticsState,
  getFaction,
  getVoteHistory,
  joinFaction,
  registerNpc,
} from '../npc-politics.js';

describe('npc-politics simulation', () => {
  it('simulates faction membership, influence contribution, and a vote event', () => {
    let now = 1_000_000n;
    let id = 0;
    const state = createNpcPoliticsState({
      clock: { now: () => (now += 1_000n) },
      idGen: { generate: () => `vote-${++id}` },
      logger: { info: () => undefined, error: () => undefined },
    });

    registerNpc(state, 'npc-1', 'LEFT');
    createFaction(state, 'f-left', 'Left Coalition', 'LEFT', 'world-1');
    joinFaction(state, 'npc-1', 'f-left');
    contributeInfluence(state, 'npc-1', 18);
    castVote(state, 'npc-1', 'ordinance-1', 'YES', 0.9);

    expect(getFaction(state, 'f-left')?.influenceScore).toBe(18);
    expect(getVoteHistory(state, 'npc-1').length).toBe(1);
  });
});
