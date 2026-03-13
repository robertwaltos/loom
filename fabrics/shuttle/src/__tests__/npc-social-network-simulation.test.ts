import { describe, expect, it } from 'vitest';
import { createNpcSocialNetworkSystem } from '../npc-social-network.js';

describe('npc-social-network simulation', () => {
  it('simulates repeated interactions increasing connection strength', () => {
    let now = 1_000_000n;
    let id = 0;
    const sys = createNpcSocialNetworkSystem({
      clock: { now: () => (now += 1_000n) },
      idGen: { generate: () => `conn-${++id}` },
      logger: { info: () => undefined, error: () => undefined },
    });

    sys.registerNpc('npc-1');
    sys.registerNpc('npc-2');
    sys.connect('npc-1', 'npc-2', 'WEAK');
    for (let i = 0; i < 16; i++) {
      sys.recordInteraction('npc-1', 'npc-2');
    }

    expect(sys.getConnection('npc-1', 'npc-2')?.strength).toBe('STRONG');
  });
});
