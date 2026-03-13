import { describe, expect, it } from 'vitest';
import { createFamilySystem } from '../npc-family.js';

describe('npc-family simulation', () => {
  it('simulates family formation and child development tracking', () => {
    let now = 1_000_000n;
    let id = 0;
    const system = createFamilySystem({
      clock: { nowMicroseconds: () => now },
      idGenerator: { next: () => `fam-${++id}` },
      logger: { info: () => undefined },
    });

    const familyId = system.formFamily(['npc-a', 'npc-b']);
    if (typeof familyId !== 'string') throw new Error('family create failed');

    expect(system.addChild(familyId, 'npc-c', 80)).toBe('ok');
    const family = system.getFamilyTree(familyId);
    const dev = system.getDevelopmentReport('npc-c');

    expect(family).toBeDefined();
    expect(dev).toBeDefined();
  });
});
