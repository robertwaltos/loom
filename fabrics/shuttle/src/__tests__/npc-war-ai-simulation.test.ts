import { describe, expect, it } from 'vitest';
import {
  assessMilitary,
  createMilitaryState,
  orderBattle,
  recordOutcome,
  registerForce,
} from '../npc-war-ai.js';

describe('npc-war-ai simulation', () => {
  it('simulates two dynasties escalating to battle and recording outcome', () => {
    let now = 1_000_000n;
    const clock = { now: () => (now += 1_000n) };
    let id = 0;
    const idGen = { generate: () => `war-${++id}` };
    const logger = { info: () => undefined, error: () => undefined };
    const state = createMilitaryState();

    const troopsA = new Map([
      ['INFANTRY', 1000],
      ['CAVALRY', 250],
      ['ARCHERS', 200],
      ['SIEGE_ENGINES', 30],
    ] as const);
    const troopsB = new Map([
      ['INFANTRY', 900],
      ['CAVALRY', 180],
      ['ARCHERS', 260],
      ['SIEGE_ENGINES', 20],
    ] as const);

    registerForce(state, 'dyn-a', troopsA, 75, 20, clock);
    registerForce(state, 'dyn-b', troopsB, 70, 25, clock);

    const battle = orderBattle(state, 'dyn-a', 'dyn-b', 'ASSAULT', 'OPEN', idGen, clock, logger);
    if (typeof battle === 'string') throw new Error('battle order failed');
    const outcome = recordOutcome(
      state,
      battle.id,
      'dyn-a',
      120,
      180,
      12,
      4_000n,
      40,
      idGen,
      clock,
      logger,
    );

    expect(typeof outcome).toBe('object');
    expect(assessMilitary(state, 'dyn-a', clock)).toBeDefined();
  });
});
