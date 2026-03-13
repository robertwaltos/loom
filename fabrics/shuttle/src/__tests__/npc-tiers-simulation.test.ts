import { describe, expect, it } from 'vitest';
import { createNpcTierRegistry, tierCanMigrate } from '../npc-tiers.js';

describe('npc-tiers simulation', () => {
  it('simulates classification and promotion into chronicle-bearing tier', () => {
    let now = 0;
    const registry = createNpcTierRegistry({
      clock: { nowMicroseconds: () => now },
    });

    registry.classify({ npcId: 'npc-1', worldId: 'earth', tier: 1 });
    registry.promote('npc-1', 2);
    registry.promote('npc-1', 3);

    const cls = registry.getClassification('npc-1');
    expect(cls.tier).toBe(3);
    expect(tierCanMigrate(cls.tier)).toBe(false);
  });
});
