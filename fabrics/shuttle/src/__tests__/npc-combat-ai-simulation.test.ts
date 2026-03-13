import { describe, expect, it } from 'vitest';
import {
  createNpcCombatAIState,
  registerNpcCombat,
  startCombat,
  makeDecision,
  endCombat,
  getDecisionHistory,
} from '../npc-combat-ai.js';

describe('npc-combat-ai simulation', () => {
  it('simulates encounter lifecycle with stance-driven decisions', () => {
    let now = 1_000_000n;
    let id = 0;
    const state = createNpcCombatAIState({
      clock: { now: () => (now += 1_000n) },
      idGen: { generate: () => `cb-${++id}` },
      logger: { info: () => undefined, error: () => undefined },
    });

    registerNpcCombat(state, 'a', { npcId: 'a', health: 100, attackPower: 10, defense: 6, speed: 8, morale: 90 });
    registerNpcCombat(state, 'b', { npcId: 'b', health: 60, attackPower: 8, defense: 7, speed: 7, morale: 70 });
    const encounter = startCombat(state, ['a', 'b']);
    if (typeof encounter === 'string') throw new Error('start combat failed');

    const d1 = makeDecision(state, 'a', encounter.combatId, 'AGGRESSIVE');
    const d2 = makeDecision(state, 'b', encounter.combatId, 'DEFENSIVE');
    expect(typeof d1).toBe('object');
    expect(typeof d2).toBe('object');

    const ended = endCombat(state, encounter.combatId);
    expect(ended.success).toBe(true);
    expect(getDecisionHistory(state, 'a').length).toBeGreaterThanOrEqual(1);
  });
});
