import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCraftingEconomySystem,
  type CraftingEconomySystem,
  type CraftingEconomyDeps,
} from '../crafting-economy.js';

function createMockClock() {
  let currentTime = 1_000_000n;
  return {
    nowMicroseconds: () => currentTime,
    advance: (delta: bigint) => {
      currentTime += delta;
    },
  };
}

function createMockIdGen() {
  let counter = 1;
  return {
    generateId: () => {
      const id = 'id-' + String(counter);
      counter += 1;
      return id;
    },
  };
}

function createMockLogger() {
  return {
    info: (_message: string, _meta?: Record<string, unknown>) => undefined,
  };
}

function makeDeps(): CraftingEconomyDeps {
  return {
    clock: createMockClock(),
    idGen: createMockIdGen(),
    logger: createMockLogger(),
  };
}

const IRON_ORE = 'mat-iron';
const WOOD = 'mat-wood';

describe('CraftingEconomySystem — recipe management', () => {
  let system: CraftingEconomySystem;

  beforeEach(() => {
    system = createCraftingEconomySystem(makeDeps());
  });

  it('registers a recipe and returns it with an id', () => {
    const recipe = system.registerRecipe(
      'Iron Sword',
      [{ materialId: IRON_ORE, quantity: 5n }],
      1n,
      100n,
      60_000_000n,
    );
    expect(recipe.name).toBe('Iron Sword');
    expect(recipe.recipeId).toBeDefined();
    expect(recipe.baseCostKalon).toBe(100n);
  });

  it('retrieves a registered recipe by id', () => {
    const recipe = system.registerRecipe(
      'Bow',
      [{ materialId: WOOD, quantity: 3n }],
      1n,
      50n,
      30_000_000n,
    );
    expect(system.getRecipe(recipe.recipeId)?.name).toBe('Bow');
  });

  it('returns undefined for unknown recipe id', () => {
    expect(system.getRecipe('missing-recipe')).toBeUndefined();
  });

  it('registers multiple recipes independently', () => {
    const r1 = system.registerRecipe('Sword', [], 1n, 100n, 0n);
    const r2 = system.registerRecipe('Shield', [], 1n, 80n, 0n);
    expect(r1.recipeId).not.toBe(r2.recipeId);
  });
});

describe('CraftingEconomySystem — crafter management', () => {
  let system: CraftingEconomySystem;

  beforeEach(() => {
    system = createCraftingEconomySystem(makeDeps());
  });

  it('registers a crafter with initial KALON balance', () => {
    const result = system.registerCrafter('crafter-1', 'world-1', 500n);
    expect(result.success).toBe(true);
    expect(system.getCrafter('crafter-1')?.kalonBalance).toBe(500n);
  });

  it('rejects duplicate crafter registration', () => {
    system.registerCrafter('crafter-1', 'world-1', 0n);
    const result = system.registerCrafter('crafter-1', 'world-1', 0n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('already-registered');
  });

  it('returns undefined for unregistered crafter', () => {
    expect(system.getCrafter('nobody')).toBeUndefined();
  });

  it('adds material to crafter inventory', () => {
    system.registerCrafter('crafter-1', 'world-1', 0n);
    const result = system.addMaterial('crafter-1', IRON_ORE, 10n);
    expect(result.success).toBe(true);
    expect(system.getCrafter('crafter-1')?.materials.get(IRON_ORE)).toBe(10n);
  });

  it('stacks materials when added multiple times', () => {
    system.registerCrafter('crafter-1', 'world-1', 0n);
    system.addMaterial('crafter-1', IRON_ORE, 5n);
    system.addMaterial('crafter-1', IRON_ORE, 3n);
    expect(system.getCrafter('crafter-1')?.materials.get(IRON_ORE)).toBe(8n);
  });

  it('returns error when adding material to unknown crafter', () => {
    const result = system.addMaterial('ghost', IRON_ORE, 5n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('crafter-not-found');
  });
});

describe('CraftingEconomySystem — crafting success', () => {
  let system: CraftingEconomySystem;

  beforeEach(() => {
    system = createCraftingEconomySystem(makeDeps());
    system.registerCrafter('crafter-1', 'world-alpha', 0n);
    system.addMaterial('crafter-1', IRON_ORE, 20n);
    system.addMaterial('crafter-1', WOOD, 10n);
  });

  it('crafts successfully and deducts materials', () => {
    const recipe = system.registerRecipe(
      'Iron Arrow',
      [
        { materialId: IRON_ORE, quantity: 2n },
        { materialId: WOOD, quantity: 1n },
      ],
      5n,
      10n,
      0n,
    );
    const result = system.craft('crafter-1', recipe.recipeId, 2n);
    expect(result.success).toBe(true);
    const crafter = system.getCrafter('crafter-1');
    expect(crafter?.materials.get(IRON_ORE)).toBe(16n);
    expect(crafter?.materials.get(WOOD)).toBe(8n);
  });

  it('kalonEarned = baseCostKalon * outputQuantity * batchQuantity', () => {
    const recipe = system.registerRecipe('Gem', [], 3n, 7n, 0n);
    system.craft('crafter-1', recipe.recipeId, 2n);
    const crafter = system.getCrafter('crafter-1');
    // 7 * (3 * 2) = 42
    expect(crafter?.kalonBalance).toBe(42n);
  });
});

describe('CraftingEconomySystem — crafting errors', () => {
  let system: CraftingEconomySystem;

  beforeEach(() => {
    system = createCraftingEconomySystem(makeDeps());
    system.registerCrafter('crafter-1', 'world-alpha', 0n);
    system.addMaterial('crafter-1', IRON_ORE, 20n);
  });

  it('rejects craft with invalid quantity (0)', () => {
    const recipe = system.registerRecipe('Thing', [], 1n, 1n, 0n);
    const result = system.craft('crafter-1', recipe.recipeId, 0n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-quantity');
  });

  it('rejects craft when crafter not found', () => {
    const recipe = system.registerRecipe('Thing', [], 1n, 1n, 0n);
    const result = system.craft('ghost', recipe.recipeId, 1n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('crafter-not-found');
  });

  it('rejects craft when recipe not found', () => {
    const result = system.craft('crafter-1', 'no-such-recipe', 1n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('recipe-not-found');
  });

  it('rejects craft when insufficient materials', () => {
    const recipe = system.registerRecipe(
      'Heavy Plate',
      [{ materialId: IRON_ORE, quantity: 100n }],
      1n,
      50n,
      0n,
    );
    const result = system.craft('crafter-1', recipe.recipeId, 1n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('insufficient-materials');
  });
});

describe('CraftingEconomySystem — history and stats', () => {
  let system: CraftingEconomySystem;

  beforeEach(() => {
    system = createCraftingEconomySystem(makeDeps());
    system.registerCrafter('crafter-1', 'world-beta', 0n);
    system.registerCrafter('crafter-2', 'world-beta', 0n);
  });

  it('returns crafting history for a crafter', () => {
    const recipe = system.registerRecipe('Potion', [], 1n, 20n, 0n);
    system.craft('crafter-1', recipe.recipeId, 1n);
    system.craft('crafter-1', recipe.recipeId, 1n);
    expect(system.getCraftingHistory('crafter-1', 10)).toHaveLength(2);
  });

  it('respects limit in crafting history', () => {
    const recipe = system.registerRecipe('Potion', [], 1n, 20n, 0n);
    for (let i = 0; i < 5; i++) {
      system.craft('crafter-1', recipe.recipeId, 1n);
    }
    expect(system.getCraftingHistory('crafter-1', 3)).toHaveLength(3);
  });

  it('production stats tracks totalCrafts per world', () => {
    const recipe = system.registerRecipe('Gem', [], 1n, 5n, 0n);
    system.craft('crafter-1', recipe.recipeId, 1n);
    system.craft('crafter-2', recipe.recipeId, 1n);
    const stats = system.getProductionStats('world-beta');
    expect(stats.totalCrafts).toBe(2);
  });

  it('production stats reports totalKalonCirculated', () => {
    const recipe = system.registerRecipe('Gem', [], 2n, 5n, 0n);
    system.craft('crafter-1', recipe.recipeId, 1n);
    // 5 * 2 * 1 = 10
    const stats = system.getProductionStats('world-beta');
    expect(stats.totalKalonCirculated).toBe(10n);
  });

  it('mostCraftedRecipeId points to highest total output', () => {
    const r1 = system.registerRecipe('Common', [], 1n, 1n, 0n);
    const r2 = system.registerRecipe('Rare', [], 5n, 1n, 0n);
    system.craft('crafter-1', r1.recipeId, 2n);
    system.craft('crafter-1', r2.recipeId, 1n);
    const stats = system.getProductionStats('world-beta');
    // r2 produced 5 units vs r1 produced 2 units
    expect(stats.mostCraftedRecipeId).toBe(r2.recipeId);
  });

  it('mostCraftedRecipeId is null for empty world', () => {
    const stats = system.getProductionStats('empty-world');
    expect(stats.mostCraftedRecipeId).toBeNull();
  });
});
