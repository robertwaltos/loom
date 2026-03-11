/**
 * crafting-engine.test.ts — Unit tests for the crafting engine.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCraftingEngine } from '../crafting-engine.js';
import type {
  CraftingEngine,
  CraftingEngineDeps,
  CraftingRecipe,
  MaterialConsumed,
  CraftingCategory,
} from '../crafting-engine.js';

// ── Test Helpers ─────────────────────────────────────────────────

function mockClock(start = 1_000_000): { nowMicroseconds: () => number } {
  return { nowMicroseconds: () => start };
}

function mockIdGenerator(): { generate: () => string } {
  let counter = 0;
  return {
    generate: () => {
      counter += 1;
      return 'job-' + String(counter);
    },
  };
}

function mockMaterials(): CraftingEngineDeps['materials'] {
  return {
    hasMaterials: () => true,
    consumeMaterials: (_dynastyId, materials) =>
      materials.map((m) => ({
        resourceId: m.resourceId,
        quantity: m.quantity,
        quality: 0.7,
      })),
    returnMaterials: () => {
      /* noop */
    },
  };
}

function noMaterials(): CraftingEngineDeps['materials'] {
  return {
    hasMaterials: () => false,
    consumeMaterials: () => [],
    returnMaterials: () => {
      /* noop */
    },
  };
}

function mockOutput(): {
  readonly port: CraftingEngineDeps['output'];
  readonly granted: Array<{ dynastyId: string; itemId: string; quantity: number; quality: string }>;
} {
  const granted: Array<{ dynastyId: string; itemId: string; quantity: number; quality: string }> =
    [];
  return {
    granted,
    port: {
      grantItem: (dynastyId, itemId, quantity, quality) => {
        granted.push({ dynastyId, itemId, quantity, quality });
      },
    },
  };
}

function swordRecipe(): CraftingRecipe {
  return {
    id: 'recipe-sword',
    name: 'Iron Sword',
    category: 'weapons',
    materials: [
      { resourceId: 'iron-ore', quantity: 5, minQuality: 0.3 },
      { resourceId: 'wood', quantity: 2, minQuality: 0.1 },
    ],
    catalystSlots: 1,
    baseDurationMicroseconds: 60_000_000,
    baseSuccessRate: 0.8,
    minSkillLevel: 0,
    outputItemId: 'item-iron-sword',
    outputQuantity: 1,
    discoveredBy: null,
    discoveredAtMicroseconds: 0,
  };
}

function potionRecipe(): CraftingRecipe {
  return {
    id: 'recipe-potion',
    name: 'Health Potion',
    category: 'consumables',
    materials: [{ resourceId: 'herb', quantity: 3, minQuality: 0.2 }],
    catalystSlots: 0,
    baseDurationMicroseconds: 30_000_000,
    baseSuccessRate: 0.9,
    minSkillLevel: 5,
    outputItemId: 'item-health-potion',
    outputQuantity: 3,
    discoveredBy: 'house-alpha',
    discoveredAtMicroseconds: 1000,
  };
}

function createDeps(
  materialPort?: CraftingEngineDeps['materials'],
  outputPort?: CraftingEngineDeps['output'],
): CraftingEngineDeps {
  const output = outputPort ?? mockOutput().port;
  return {
    clock: mockClock(),
    idGenerator: mockIdGenerator(),
    materials: materialPort ?? mockMaterials(),
    output,
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe('CraftingEngine — recipe management', () => {
  let engine: CraftingEngine;

  beforeEach(() => {
    engine = createCraftingEngine(createDeps());
  });

  it('registers and retrieves a recipe', () => {
    engine.registerRecipe(swordRecipe());
    const recipe = engine.getRecipe('recipe-sword');
    expect(recipe).toBeDefined();
    expect(recipe?.name).toBe('Iron Sword');
  });

  it('returns undefined for unknown recipe', () => {
    expect(engine.getRecipe('unknown')).toBeUndefined();
  });

  it('gets recipes by category', () => {
    engine.registerRecipe(swordRecipe());
    engine.registerRecipe(potionRecipe());

    const weapons = engine.getRecipesByCategory('weapons');
    expect(weapons).toHaveLength(1);

    const consumables = engine.getRecipesByCategory('consumables');
    expect(consumables).toHaveLength(1);
  });

  it('returns empty array for category with no recipes', () => {
    const result = engine.getRecipesByCategory('armor');
    expect(result).toHaveLength(0);
  });
});

describe('CraftingEngine — recipe discovery', () => {
  let engine: CraftingEngine;

  beforeEach(() => {
    engine = createCraftingEngine(createDeps());
    engine.registerRecipe(swordRecipe());
  });

  it('discovers a recipe for a dynasty', () => {
    const result = engine.discoverRecipe('house-alpha', 'recipe-sword');
    expect(result).toBe(true);
  });

  it('prevents duplicate discovery', () => {
    engine.discoverRecipe('house-alpha', 'recipe-sword');
    const second = engine.discoverRecipe('house-alpha', 'recipe-sword');
    expect(second).toBe(false);
  });

  it('returns false for unknown recipe', () => {
    const result = engine.discoverRecipe('house-alpha', 'unknown');
    expect(result).toBe(false);
  });
});

describe('CraftingEngine — crafting jobs', () => {
  it('starts a crafting job successfully', () => {
    const output = mockOutput();
    const engine = createCraftingEngine(createDeps(undefined, output.port));
    engine.registerRecipe(swordRecipe());

    const result = engine.startCrafting({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-sword',
      worldId: 'world-1',
    });

    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.jobId).toBe('job-1');
  });

  it('fails when recipe not found', () => {
    const engine = createCraftingEngine(createDeps());
    const result = engine.startCrafting({
      dynastyId: 'house-alpha',
      recipeId: 'unknown',
      worldId: 'world-1',
    });
    expect(result).toBe('recipe_not_found');
  });

  it('fails when materials insufficient', () => {
    const engine = createCraftingEngine(createDeps(noMaterials()));
    engine.registerRecipe(swordRecipe());

    const result = engine.startCrafting({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-sword',
      worldId: 'world-1',
    });
    expect(result).toBe('insufficient_materials');
  });

  it('fails when skill is too low', () => {
    const engine = createCraftingEngine(createDeps());
    engine.registerRecipe(potionRecipe());

    const result = engine.startCrafting({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-potion',
      worldId: 'world-1',
    });
    expect(result).toBe('insufficient_skill');
  });

  it('grants item on successful craft', () => {
    const output = mockOutput();
    const engine = createCraftingEngine(createDeps(undefined, output.port));
    engine.registerRecipe(swordRecipe());

    // Run many attempts to get at least one success
    let successCount = 0;
    for (let i = 0; i < 50; i++) {
      const result = engine.startCrafting({
        dynastyId: 'house-alpha',
        recipeId: 'recipe-sword',
        worldId: 'world-1',
      });
      if (typeof result !== 'string' && result.success) {
        successCount += 1;
      }
    }

    expect(successCount).toBeGreaterThan(0);
    expect(output.granted.length).toBe(successCount);
  });
});

describe('CraftingEngine — crafter profiles', () => {
  it('returns undefined for unknown crafter', () => {
    const engine = createCraftingEngine(createDeps());
    expect(engine.getCrafterProfile('unknown')).toBeUndefined();
  });

  it('creates crafter profile on first craft', () => {
    const engine = createCraftingEngine(createDeps());
    engine.registerRecipe(swordRecipe());
    engine.startCrafting({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-sword',
      worldId: 'world-1',
    });

    const profile = engine.getCrafterProfile('house-alpha');
    expect(profile).toBeDefined();
    expect(profile?.dynastyId).toBe('house-alpha');
  });

  it('tracks total items crafted', () => {
    const engine = createCraftingEngine(createDeps());
    engine.registerRecipe(swordRecipe());

    for (let i = 0; i < 20; i++) {
      engine.startCrafting({
        dynastyId: 'house-alpha',
        recipeId: 'recipe-sword',
        worldId: 'world-1',
      });
    }

    const profile = engine.getCrafterProfile('house-alpha');
    expect(profile).toBeDefined();
    if (profile === undefined) return;
    const total = profile.totalItemsCrafted + profile.totalFailures;
    expect(total).toBe(20);
  });
});

describe('CraftingEngine — job queries', () => {
  it('returns jobs by dynasty', () => {
    const engine = createCraftingEngine(createDeps());
    engine.registerRecipe(swordRecipe());
    engine.startCrafting({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-sword',
      worldId: 'world-1',
    });
    engine.startCrafting({
      dynastyId: 'house-beta',
      recipeId: 'recipe-sword',
      worldId: 'world-1',
    });

    const alphaJobs = engine.getJobsByDynasty('house-alpha');
    expect(alphaJobs).toHaveLength(1);

    const betaJobs = engine.getJobsByDynasty('house-beta');
    expect(betaJobs).toHaveLength(1);
  });

  it('returns empty for dynasty with no jobs', () => {
    const engine = createCraftingEngine(createDeps());
    expect(engine.getJobsByDynasty('unknown')).toHaveLength(0);
  });
});

describe('CraftingEngine — statistics', () => {
  it('reports correct stats', () => {
    const engine = createCraftingEngine(createDeps());
    engine.registerRecipe(swordRecipe());
    engine.registerRecipe(potionRecipe());

    engine.startCrafting({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-sword',
      worldId: 'world-1',
    });

    const stats = engine.getStats();
    expect(stats.totalRecipes).toBe(2);
    expect(stats.crafterCount).toBe(1);
    expect(stats.totalCompletedJobs + stats.totalFailedJobs).toBe(1);
  });

  it('starts with empty stats', () => {
    const engine = createCraftingEngine(createDeps());
    const stats = engine.getStats();
    expect(stats.totalRecipes).toBe(0);
    expect(stats.totalActiveJobs).toBe(0);
    expect(stats.crafterCount).toBe(0);
  });
});

describe('CraftingEngine — catalysts', () => {
  it('accepts catalysts with crafting job', () => {
    const engine = createCraftingEngine(createDeps());
    engine.registerRecipe(swordRecipe());

    const result = engine.startCrafting({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-sword',
      worldId: 'world-1',
      catalysts: ['catalyst-fire'],
    });

    expect(typeof result).not.toBe('string');
  });
});
