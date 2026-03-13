import { describe, expect, it } from 'vitest';
import {
  activateAbility,
  createAbilitySystem,
  getEntityResources,
  registerAbility,
  setEntityResources,
} from '../ability-system.js';

describe('ability-system simulation', () => {
  it('simulates registering and casting a mana ability with resource consumption', () => {
    let now = 1_000_000n;
    let id = 0;
    const state = createAbilitySystem({
      clock: { nowUs: () => now++ },
      idGen: { generate: () => `ab-${++id}` },
      logger: { debug: () => undefined, info: () => undefined, warn: () => undefined, error: () => undefined },
    });

    const ability = registerAbility(
      state,
      'Arc Bolt',
      [{ resourceType: 'MANA', amount: 25n }],
      1_000_000n,
      'DAMAGE',
      80n,
      0n,
      1_000n,
    );
    if (typeof ability === 'string') throw new Error('ability register failed');

    setEntityResources(state, 'mage-1', new Map([['MANA', 100n]]));
    const cast = activateAbility(state, 'mage-1', ability.abilityId, 'target-1');
    const remaining = getEntityResources(state, 'mage-1');

    expect(typeof cast).toBe('object');
    if (typeof remaining === 'object') {
      expect(remaining.resources.get('MANA')).toBe(75n);
    }
  });
});
