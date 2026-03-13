import { describe, expect, it } from 'vitest';
import {
  canCommunicate,
  createNpcLanguageState,
  defineLanguage,
  learnLanguage,
  registerNpc,
} from '../npc-language.js';

describe('npc-language simulation', () => {
  it('simulates cross-faction language learning and communication', () => {
    let now = 1_000_000n;
    let id = 0;
    const state = createNpcLanguageState({
      clock: { now: () => (now += 1_000n) },
      idGen: { generate: () => `lang-${++id}` },
      logger: { info: () => undefined, error: () => undefined },
    });

    defineLanguage(state, 'common', 'Common', 'TERRAN', 3, null);
    defineLanguage(state, 'silfen', 'Silfen', 'SILFEN', 8, null);
    registerNpc(state, 'npc-a', 'common');
    registerNpc(state, 'npc-b', 'silfen');
    learnLanguage(state, 'npc-b', 'common', 65);

    expect(canCommunicate(state, 'npc-a', 'npc-b', 60)).toBe(true);
  });
});
