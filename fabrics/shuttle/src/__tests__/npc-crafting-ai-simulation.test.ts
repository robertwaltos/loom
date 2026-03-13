import { describe, expect, it } from 'vitest';
import { createNpcCraftingSystem } from '../npc-crafting-ai.js';

describe('npc-crafting-ai simulation', () => {
  it('simulates gather-evaluate-craft-complete pipeline', () => {
    let now = 1_000_000n;
    let id = 0;
    const system = createNpcCraftingSystem({
      clock: { nowMicroseconds: () => now++ },
      idGenerator: { next: () => `cr-${id++}` },
      logger: { info: () => undefined },
    });

    const recipe = system.registerRecipe(
      'Iron Dagger',
      'iron-dagger',
      1,
      [{ resourceId: 'iron', quantity: 2 }],
      3,
      200_000n,
      900n,
    );
    const gather = system.gatherResources('npc-1', 'iron', 5);
    system.completeGathering(gather.gatheringId, 5);

    const decision = system.decideToCraft('npc-1', recipe.recipeId, 5);
    expect(typeof decision).toBe('object');
    if (typeof decision !== 'object') return;
    system.executeCraft(decision.decisionId);
    const done = system.completeCraft(decision.decisionId, true);
    expect(typeof done).toBe('object');
    if (typeof done !== 'object') return;
    expect(done.status).toBe('COMPLETED');
    expect(system.getCraftingHistory('npc-1').totalCrafted).toBe(1);
  });
});
