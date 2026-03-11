import { describe, it, expect } from 'vitest';
import { createNpcCraftingSystem, MIN_PRIORITY_THRESHOLD } from '../npc-crafting-ai.js';
import type { NpcCraftingDeps, ResourceRequirement } from '../npc-crafting-ai.js';

function createDeps(): NpcCraftingDeps {
  let time = 1000n;
  let id = 0;
  const logs: string[] = [];
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: { next: () => 'craft-' + String(id++) },
    logger: {
      info: (msg: string, ctx: Record<string, unknown>) => {
        logs.push(msg + ':' + JSON.stringify(ctx));
      },
    },
  };
}

describe('NpcCraftingSystem — registerRecipe', () => {
  it('registers a new recipe', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const reqs: ResourceRequirement[] = [
      { resourceId: 'wood', quantity: 5 },
      { resourceId: 'iron', quantity: 2 },
    ];
    const recipe = sys.registerRecipe('Iron Sword', 'sword-iron', 1, reqs, 10, 1_000_000n, 5000n);
    expect(recipe.recipeId).toBe('craft-0');
    expect(recipe.name).toBe('Iron Sword');
    expect(recipe.outputId).toBe('sword-iron');
    expect(recipe.requirements.length).toBe(2);
    expect(recipe.skillRequired).toBe(10);
  });
});

describe('NpcCraftingSystem — evaluateRecipe', () => {
  it('evaluates recipe with sufficient skill', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const reqs: ResourceRequirement[] = [{ resourceId: 'wood', quantity: 3 }];
    const recipe = sys.registerRecipe('Bow', 'bow', 1, reqs, 5, 800_000n, 3000n);
    const evaluation = sys.evaluateRecipe('npc-1', recipe.recipeId, 8, 1.5);
    expect(typeof evaluation).toBe('object');
    if (typeof evaluation === 'object') {
      expect(evaluation.recipeId).toBe(recipe.recipeId);
      expect(evaluation.profitability).toBeGreaterThan(0);
      expect(evaluation.feasibility).toBeGreaterThan(0);
    }
  });

  it('rejects evaluation when skill too low', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const reqs: ResourceRequirement[] = [{ resourceId: 'gold', quantity: 1 }];
    const recipe = sys.registerRecipe('Amulet', 'amulet', 1, reqs, 20, 2_000_000n, 10000n);
    const evaluation = sys.evaluateRecipe('npc-1', recipe.recipeId, 10, 1.0);
    expect(evaluation).toBe('skill_too_low');
  });

  it('returns error for unknown recipe', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const evaluation = sys.evaluateRecipe('npc-1', 'unknown', 5, 1.0);
    expect(evaluation).toBe('recipe_not_found');
  });

  it('identifies missing resources', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const reqs: ResourceRequirement[] = [
      { resourceId: 'steel', quantity: 10 },
      { resourceId: 'leather', quantity: 5 },
    ];
    const recipe = sys.registerRecipe('Armor', 'armor', 1, reqs, 15, 3_000_000n, 20000n);
    const evaluation = sys.evaluateRecipe('npc-1', recipe.recipeId, 20, 1.0);
    if (typeof evaluation === 'object') {
      expect(evaluation.missingResources.length).toBe(2);
      expect(evaluation.missingResources).toContain('steel');
      expect(evaluation.missingResources).toContain('leather');
    }
  });
});

describe('NpcCraftingSystem — decideToCraft', () => {
  it('creates crafting decision with resources', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const reqs: ResourceRequirement[] = [{ resourceId: 'wood', quantity: 2 }];
    const recipe = sys.registerRecipe('Axe', 'axe', 1, reqs, 3, 500_000n, 2000n);
    const gathering = sys.gatherResources('npc-1', 'wood', 10);
    sys.completeGathering(gathering.gatheringId, 10);
    const decision = sys.decideToCraft('npc-1', recipe.recipeId, 5);
    expect(typeof decision).toBe('object');
    if (typeof decision === 'object') {
      expect(decision.decisionId).toBe('craft-2');
      expect(decision.npcId).toBe('npc-1');
      expect(decision.status).toBe('PLANNED');
    }
  });

  it('rejects crafting without sufficient resources', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const reqs: ResourceRequirement[] = [{ resourceId: 'diamond', quantity: 5 }];
    const recipe = sys.registerRecipe('Crown', 'crown', 1, reqs, 25, 5_000_000n, 50000n);
    const decision = sys.decideToCraft('npc-1', recipe.recipeId, 30);
    expect(decision).toBe('insufficient_resources');
  });

  it('returns error for unknown recipe', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const decision = sys.decideToCraft('npc-1', 'fake-recipe', 10);
    expect(decision).toBe('recipe_not_found');
  });
});

describe('NpcCraftingSystem — gatherResources', () => {
  it('starts resource gathering', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const gathering = sys.gatherResources('npc-1', 'stone', 20);
    expect(gathering.gatheringId).toBe('craft-0');
    expect(gathering.npcId).toBe('npc-1');
    expect(gathering.resourceId).toBe('stone');
    expect(gathering.targetQuantity).toBe(20);
    expect(gathering.gatheredQuantity).toBe(0);
  });

  it('completes gathering and adds to inventory', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const gathering = sys.gatherResources('npc-1', 'copper', 15);
    const completed = sys.completeGathering(gathering.gatheringId, 15);
    expect(typeof completed).toBe('object');
    if (typeof completed === 'object') {
      expect(completed.gatheredQuantity).toBe(15);
      expect(completed.completedAt).toBeDefined();
    }
  });
});

describe('NpcCraftingSystem — executeCraft', () => {
  it('executes planned craft', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const reqs: ResourceRequirement[] = [{ resourceId: 'clay', quantity: 3 }];
    const recipe = sys.registerRecipe('Pot', 'pot', 1, reqs, 2, 400_000n, 500n);
    const gathering = sys.gatherResources('npc-1', 'clay', 5);
    sys.completeGathering(gathering.gatheringId, 5);
    const decision = sys.decideToCraft('npc-1', recipe.recipeId, 3);
    if (typeof decision === 'object') {
      const executed = sys.executeCraft(decision.decisionId);
      expect(typeof executed).toBe('object');
      if (typeof executed === 'object') {
        expect(executed.status).toBe('CRAFTING');
      }
    }
  });

  it('rejects execution for unknown decision', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const result = sys.executeCraft('fake-decision');
    expect(result).toBe('decision_not_found');
  });
});

describe('NpcCraftingSystem — completeCraft', () => {
  it('completes craft successfully and adds output', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const reqs: ResourceRequirement[] = [{ resourceId: 'wheat', quantity: 2 }];
    const recipe = sys.registerRecipe('Bread', 'bread', 3, reqs, 1, 300_000n, 300n);
    const gathering = sys.gatherResources('npc-1', 'wheat', 5);
    sys.completeGathering(gathering.gatheringId, 5);
    const decision = sys.decideToCraft('npc-1', recipe.recipeId, 2);
    if (typeof decision === 'object') {
      sys.executeCraft(decision.decisionId);
      const completed = sys.completeCraft(decision.decisionId, true);
      expect(typeof completed).toBe('object');
      if (typeof completed === 'object') {
        expect(completed.status).toBe('COMPLETED');
        expect(completed.completedAt).toBeDefined();
      }
    }
  });

  it('marks craft as failed', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const reqs: ResourceRequirement[] = [{ resourceId: 'silk', quantity: 1 }];
    const recipe = sys.registerRecipe('Cloth', 'cloth', 1, reqs, 5, 600_000n, 800n);
    const gathering = sys.gatherResources('npc-1', 'silk', 2);
    sys.completeGathering(gathering.gatheringId, 2);
    const decision = sys.decideToCraft('npc-1', recipe.recipeId, 6);
    if (typeof decision === 'object') {
      sys.executeCraft(decision.decisionId);
      const failed = sys.completeCraft(decision.decisionId, false);
      expect(typeof failed).toBe('object');
      if (typeof failed === 'object') {
        expect(failed.status).toBe('FAILED');
      }
    }
  });
});

describe('NpcCraftingSystem — evaluateRecipes', () => {
  it('evaluates multiple recipes and ranks by priority', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const reqs1: ResourceRequirement[] = [{ resourceId: 'wood', quantity: 1 }];
    const reqs2: ResourceRequirement[] = [{ resourceId: 'stone', quantity: 1 }];
    sys.registerRecipe('Stick', 'stick', 1, reqs1, 1, 100_000n, 100n);
    sys.registerRecipe('Pickaxe', 'pickaxe', 1, reqs2, 3, 500_000n, 2000n);
    const evals = sys.evaluateRecipes('npc-1', 5, 1.5);
    expect(evals.length).toBeGreaterThanOrEqual(0);
    for (const e of evals) {
      expect(e.priority).toBeGreaterThanOrEqual(MIN_PRIORITY_THRESHOLD);
    }
  });

  it('filters out low-priority recipes', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const reqs: ResourceRequirement[] = [{ resourceId: 'rare', quantity: 100 }];
    sys.registerRecipe('Artifact', 'artifact', 1, reqs, 50, 10_000_000n, 1000000n);
    const evals = sys.evaluateRecipes('npc-1', 10, 0.5);
    const artifact = evals.find((e) => e.recipeId.includes('craft'));
    expect(artifact).toBeUndefined();
  });
});

describe('NpcCraftingSystem — getCraftingHistory', () => {
  it('reports crafting history for npc', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const reqs: ResourceRequirement[] = [{ resourceId: 'iron', quantity: 1 }];
    const recipe = sys.registerRecipe('Nail', 'nail', 10, reqs, 2, 200_000n, 50n);
    const gathering = sys.gatherResources('npc-1', 'iron', 5);
    sys.completeGathering(gathering.gatheringId, 5);
    const decision1 = sys.decideToCraft('npc-1', recipe.recipeId, 3);
    if (typeof decision1 === 'object') {
      sys.executeCraft(decision1.decisionId);
      sys.completeCraft(decision1.decisionId, true);
    }
    const history = sys.getCraftingHistory('npc-1');
    expect(history.npcId).toBe('npc-1');
    expect(history.totalCrafted).toBe(1);
    expect(history.successRate).toBe(1);
  });

  it('identifies favorite recipe', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const reqs: ResourceRequirement[] = [{ resourceId: 'fiber', quantity: 1 }];
    const recipe = sys.registerRecipe('Rope', 'rope', 1, reqs, 1, 150_000n, 200n);
    const gathering = sys.gatherResources('npc-1', 'fiber', 10);
    sys.completeGathering(gathering.gatheringId, 10);
    for (let i = 0; i < 3; i++) {
      const d = sys.decideToCraft('npc-1', recipe.recipeId, 2);
      if (typeof d === 'object') {
        sys.executeCraft(d.decisionId);
        sys.completeCraft(d.decisionId, true);
      }
    }
    const history = sys.getCraftingHistory('npc-1');
    expect(history.favoriteRecipe).toBe(recipe.recipeId);
  });
});

describe('NpcCraftingSystem — computeProfitability', () => {
  it('computes profitability score', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const reqs: ResourceRequirement[] = [
      { resourceId: 'wood', quantity: 2 },
      { resourceId: 'metal', quantity: 1 },
    ];
    const recipe = sys.registerRecipe('Tool', 'tool', 1, reqs, 5, 700_000n, 5000n);
    const prices = new Map<string, bigint>([
      ['wood', 500n],
      ['metal', 1000n],
    ]);
    const score = sys.computeProfitability(recipe.recipeId, prices);
    expect(typeof score).toBe('object');
    if (typeof score === 'object') {
      expect(score.revenue).toBe(5000n);
      expect(score.cost).toBe(2000n);
      expect(score.profit).toBe(3000n);
      expect(score.margin).toBeCloseTo(0.6, 2);
    }
  });

  it('returns error for unknown recipe', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const prices = new Map<string, bigint>();
    const score = sys.computeProfitability('fake', prices);
    expect(score).toBe('recipe_not_found');
  });
});

describe('NpcCraftingSystem — getCraftingDecision', () => {
  it('retrieves decision by id', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const reqs: ResourceRequirement[] = [{ resourceId: 'sand', quantity: 3 }];
    const recipe = sys.registerRecipe('Glass', 'glass', 1, reqs, 4, 900_000n, 1200n);
    const gathering = sys.gatherResources('npc-1', 'sand', 5);
    sys.completeGathering(gathering.gatheringId, 5);
    const decision = sys.decideToCraft('npc-1', recipe.recipeId, 5);
    if (typeof decision === 'object') {
      const retrieved = sys.getCraftingDecision(decision.decisionId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.npcId).toBe('npc-1');
    }
  });

  it('returns undefined for unknown id', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const retrieved = sys.getCraftingDecision('unknown');
    expect(retrieved).toBeUndefined();
  });
});

describe('NpcCraftingSystem — getDecisionsByNpc', () => {
  it('lists all decisions for an npc', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const reqs: ResourceRequirement[] = [{ resourceId: 'ore', quantity: 2 }];
    const recipe = sys.registerRecipe('Ingot', 'ingot', 1, reqs, 3, 800_000n, 1500n);
    const gathering = sys.gatherResources('npc-1', 'ore', 10);
    sys.completeGathering(gathering.gatheringId, 10);
    sys.decideToCraft('npc-1', recipe.recipeId, 4);
    sys.decideToCraft('npc-1', recipe.recipeId, 4);
    const decisions = sys.getDecisionsByNpc('npc-1');
    expect(decisions.length).toBe(2);
  });

  it('returns empty for npc with no decisions', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const decisions = sys.getDecisionsByNpc('ghost');
    expect(decisions.length).toBe(0);
  });
});

describe('NpcCraftingSystem — getStats', () => {
  it('reports crafting statistics', () => {
    const sys = createNpcCraftingSystem(createDeps());
    const reqs: ResourceRequirement[] = [{ resourceId: 'herb', quantity: 1 }];
    const recipe = sys.registerRecipe('Potion', 'potion', 1, reqs, 2, 400_000n, 800n);
    const gathering = sys.gatherResources('npc-1', 'herb', 5);
    sys.completeGathering(gathering.gatheringId, 5);
    const d1 = sys.decideToCraft('npc-1', recipe.recipeId, 3);
    const d2 = sys.decideToCraft('npc-1', recipe.recipeId, 3);
    if (typeof d1 === 'object') {
      sys.executeCraft(d1.decisionId);
      sys.completeCraft(d1.decisionId, true);
    }
    const stats = sys.getStats();
    expect(stats.totalDecisions).toBe(2);
    expect(stats.planned).toBe(1);
    expect(stats.completed).toBe(1);
    expect(stats.totalGatherings).toBe(1);
  });
});
