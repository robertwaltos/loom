import { describe, expect, it } from 'vitest';
import { createTraitSystem } from '../npc-traits.js';

describe('npc-traits simulation', () => {
  it('simulates parental trait inheritance into a child profile', () => {
    let now = 1_000_000;
    let id = 0;
    const sys = createTraitSystem({
      clock: { nowMicroseconds: () => (now += 1_000_000) },
      idGenerator: { next: () => `trait-${++id}` },
    });

    sys.assign({ npcId: 'parent-a', name: 'brave', category: 'temperament', intensity: 0.8 });
    sys.assign({ npcId: 'parent-b', name: 'clever', category: 'intellect', intensity: 0.7 });
    const inherited = sys.inherit({ parentAId: 'parent-a', parentBId: 'parent-b', childNpcId: 'child-1' });

    expect(inherited.length).toBeGreaterThan(0);
    expect(sys.getProfile('child-1').traits.length).toBe(inherited.length);
  });
});
