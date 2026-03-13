import { describe, expect, it } from 'vitest';
import { createPhilosophySystem } from '../npc-philosophy.js';

describe('npc-philosophy simulation', () => {
  it('simulates worldview shift and resulting decision-weight changes', () => {
    let now = 1_000_000n;
    let id = 0;
    const system = createPhilosophySystem({
      clock: { nowMicroseconds: () => now },
      idGenerator: { next: () => `phil-${++id}` },
      logger: { info: () => undefined },
    });

    system.setWorldview('npc-1', 'PRAGMATIST', 70);
    now += 5_000n;
    system.setWorldview('npc-1', 'IDEALIST', 82);

    const history = system.getWorldviewHistory('npc-1');
    const modifiers = system.getDecisionModifiers('npc-1');

    expect(typeof history).toBe('object');
    if (typeof history === 'object') {
      expect(history.length).toBe(1);
    }
    expect(modifiers.length).toBeGreaterThan(0);
  });
});
