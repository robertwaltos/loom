import { describe, expect, it } from 'vitest';
import {
  createDiplomacyState,
  evaluateRelationship,
  selectStrategy,
  executeDiplomacy,
  recordBetrayal,
  getDiplomacyHistory,
} from '../npc-diplomacy-ai.js';

describe('npc-diplomacy-ai simulation', () => {
  it('simulates relation assessment to strategy and betrayal consequences', () => {
    let now = 1_000_000n;
    let id = 0;
    const clock = { now: () => (now += 1_000n) };
    const idGen = { generate: () => `da-${++id}` };
    const logger = { info: () => undefined, error: () => undefined };
    const state = createDiplomacyState();

    evaluateRelationship(state, 'dyn-a', 'dyn-b', 70, 1.1, 0.8, clock);
    const strategy = selectStrategy(state, 'dyn-a', 'dyn-b', {
      relationshipWeight: 1,
      powerWeight: 1,
      trustWeight: 1,
      historyWeight: 0,
    });

    const action = executeDiplomacy(state, 'dyn-a', 'dyn-b', strategy, idGen, clock, logger);
    expect(typeof action).toBe('object');
    if (typeof action !== 'object') return;
    expect(typeof action.success).toBe('boolean');

    recordBetrayal(state, 'dyn-b', 'dyn-a', 'Treaty violation', 70, idGen, clock, logger);
    const history = getDiplomacyHistory(state, 'dyn-a');
    expect(typeof history).toBe('object');
  });
});
