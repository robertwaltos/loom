import { beforeEach, describe, expect, it } from 'vitest';
import {
  createCraftingEconomySystem,
  type CraftingEconomyDeps,
  type Recipe,
} from '../crafting-economy.js';

describe('crafting-economy simulation', () => {
  let nowUs: bigint;
  let idCounter: number;
  let logs: Array<{ message: string; meta?: Record<string, unknown> }>;

  const advance = (deltaUs: bigint): void => {
    nowUs += deltaUs;
  };

  const deps = (): CraftingEconomyDeps => ({
    clock: { nowMicroseconds: () => nowUs },
    idGen: {
      generateId: () => {
        idCounter += 1;
        return `sim-craft-econ-${idCounter}`;
      },
    },
    logger: {
      info: (message, meta) => {
        logs.push({ message, meta });
      },
    },
  });

  const registerBasicRecipe = (
    system: ReturnType<typeof createCraftingEconomySystem>,
    name: string,
    outputQuantity = 2n,
    baseCostKalon = 10n,
  ): Recipe =>
    system.registerRecipe(
      name,
      [
        { materialId: 'iron', quantity: 3n },
        { materialId: 'wood', quantity: 1n },
      ],
      outputQuantity,
      baseCostKalon,
      25_000n,
    );

  beforeEach(() => {
    nowUs = 500_000n;
    idCounter = 0;
    logs = [];
  });

  it('runs a full craft cycle and records consumed materials, output, and KALON', () => {
    const system = createCraftingEconomySystem(deps());
    system.registerCrafter('crafter-a', 'world-1', 100n);
    system.addMaterial('crafter-a', 'iron', 20n);
    system.addMaterial('crafter-a', 'wood', 10n);
    const recipe = registerBasicRecipe(system, 'steel-kit', 4n, 7n);

    const crafted = system.craft('crafter-a', recipe.recipeId, 2n);

    expect(crafted.success).toBe(true);
    if (crafted.success) {
      expect(crafted.record.outputQuantity).toBe(8n);
      expect(crafted.record.kalonEarned).toBe(56n);
      expect(crafted.record.materialsConsumed).toEqual([
        { materialId: 'iron', quantity: 6n },
        { materialId: 'wood', quantity: 2n },
      ]);
    }

    const crafter = system.getCrafter('crafter-a');
    expect(crafter?.kalonBalance).toBe(156n);
    expect(crafter?.materials.get('iron')).toBe(14n);
    expect(crafter?.materials.get('wood')).toBe(8n);
  });

  it('rejects invalid quantities and preserves inventory and balances', () => {
    const system = createCraftingEconomySystem(deps());
    system.registerCrafter('crafter-b', 'world-1', 20n);
    system.addMaterial('crafter-b', 'iron', 4n);
    const recipe = registerBasicRecipe(system, 'tool-pack');

    const before = system.getCrafter('crafter-b');
    const crafted = system.craft('crafter-b', recipe.recipeId, 0n);

    expect(crafted.success).toBe(false);
    if (!crafted.success) {
      expect(crafted.error).toBe('invalid-quantity');
    }

    const after = system.getCrafter('crafter-b');
    expect(after?.kalonBalance).toBe(before?.kalonBalance);
    expect(after?.materials.get('iron')).toBe(before?.materials.get('iron'));
  });

  it('rejects crafts with insufficient materials and avoids partial deduction', () => {
    const system = createCraftingEconomySystem(deps());
    system.registerCrafter('crafter-c', 'world-1', 0n);
    system.addMaterial('crafter-c', 'iron', 5n);
    system.addMaterial('crafter-c', 'wood', 1n);
    const recipe = registerBasicRecipe(system, 'heavy-chassis');

    const crafted = system.craft('crafter-c', recipe.recipeId, 2n);

    expect(crafted.success).toBe(false);
    if (!crafted.success) {
      expect(crafted.error).toBe('insufficient-materials');
    }

    const crafter = system.getCrafter('crafter-c');
    expect(crafter?.materials.get('iron')).toBe(5n);
    expect(crafter?.materials.get('wood')).toBe(1n);
    expect(system.getCraftingHistory('crafter-c', 10)).toHaveLength(0);
  });

  it('returns explicit errors for unknown crafters and recipes', () => {
    const system = createCraftingEconomySystem(deps());
    const recipe = registerBasicRecipe(system, 'known-recipe');

    const unknownCrafter = system.craft('ghost', recipe.recipeId, 1n);
    expect(unknownCrafter.success).toBe(false);
    if (!unknownCrafter.success) {
      expect(unknownCrafter.error).toBe('crafter-not-found');
    }

    system.registerCrafter('crafter-d', 'world-2', 0n);
    const unknownRecipe = system.craft('crafter-d', 'missing-recipe', 1n);
    expect(unknownRecipe.success).toBe(false);
    if (!unknownRecipe.success) {
      expect(unknownRecipe.error).toBe('recipe-not-found');
    }
  });

  it('returns per-crafter history in chronological order and applies trailing limits', () => {
    const system = createCraftingEconomySystem(deps());
    system.registerCrafter('crafter-e', 'world-1', 0n);
    system.addMaterial('crafter-e', 'iron', 100n);
    system.addMaterial('crafter-e', 'wood', 100n);
    const recipe = registerBasicRecipe(system, 'batch-item', 1n, 3n);

    for (let i = 0; i < 4; i += 1) {
      advance(10n);
      system.craft('crafter-e', recipe.recipeId, 1n);
    }

    const limited = system.getCraftingHistory('crafter-e', 2);
    expect(limited).toHaveLength(2);
    expect((limited[0]?.craftedAt ?? 0n) <= (limited[1]?.craftedAt ?? 0n)).toBe(true);

    const full = system.getCraftingHistory('crafter-e', 10);
    expect(full).toHaveLength(4);
    expect((full[0]?.craftedAt ?? 0n) < (full[3]?.craftedAt ?? 0n)).toBe(true);
  });

  it('isolates world production statistics even when recipes are shared globally', () => {
    const system = createCraftingEconomySystem(deps());
    const recipe = registerBasicRecipe(system, 'shared-output', 2n, 5n);

    system.registerCrafter('crafter-f1', 'world-a', 0n);
    system.registerCrafter('crafter-f2', 'world-b', 0n);
    for (const crafterId of ['crafter-f1', 'crafter-f2']) {
      system.addMaterial(crafterId, 'iron', 30n);
      system.addMaterial(crafterId, 'wood', 30n);
    }

    system.craft('crafter-f1', recipe.recipeId, 2n);
    system.craft('crafter-f2', recipe.recipeId, 1n);

    const worldA = system.getProductionStats('world-a');
    const worldB = system.getProductionStats('world-b');

    expect(worldA.totalCrafts).toBe(1);
    expect(worldA.totalKalonCirculated).toBe(20n);
    expect(worldB.totalCrafts).toBe(1);
    expect(worldB.totalKalonCirculated).toBe(10n);
    expect(worldA.mostCraftedRecipeId).toBe(recipe.recipeId);
    expect(worldB.mostCraftedRecipeId).toBe(recipe.recipeId);
  });

  it('computes mostCraftedRecipeId by total output quantity rather than craft count', () => {
    const system = createCraftingEconomySystem(deps());
    system.registerCrafter('crafter-g', 'world-z', 0n);
    system.addMaterial('crafter-g', 'iron', 100n);
    system.addMaterial('crafter-g', 'wood', 100n);

    const lowYield = system.registerRecipe('low-yield', [{ materialId: 'iron', quantity: 1n }], 1n, 1n, 0n);
    const highYield = system.registerRecipe('high-yield', [{ materialId: 'wood', quantity: 1n }], 5n, 1n, 0n);

    system.craft('crafter-g', lowYield.recipeId, 3n);
    system.craft('crafter-g', highYield.recipeId, 1n);

    const stats = system.getProductionStats('world-z');
    expect(stats.mostCraftedRecipeId).toBe(highYield.recipeId);
  });

  it('produces deterministic recipe and record ids based on generation order', () => {
    const system = createCraftingEconomySystem(deps());
    system.registerCrafter('crafter-h', 'world-3', 0n);
    system.addMaterial('crafter-h', 'iron', 50n);
    system.addMaterial('crafter-h', 'wood', 50n);

    const recipeA = registerBasicRecipe(system, 'id-recipe-a');
    const recipeB = registerBasicRecipe(system, 'id-recipe-b');

    const firstCraft = system.craft('crafter-h', recipeA.recipeId, 1n);
    const secondCraft = system.craft('crafter-h', recipeB.recipeId, 1n);

    expect(recipeA.recipeId).toBe('sim-craft-econ-1');
    expect(recipeB.recipeId).toBe('sim-craft-econ-2');

    expect(firstCraft.success).toBe(true);
    expect(secondCraft.success).toBe(true);
    if (firstCraft.success && secondCraft.success) {
      expect(firstCraft.record.recordId).toBe('sim-craft-econ-3');
      expect(secondCraft.record.recordId).toBe('sim-craft-econ-4');
    }
  });

  it('rejects duplicate crafter registration and keeps original world assignment', () => {
    const system = createCraftingEconomySystem(deps());

    const first = system.registerCrafter('crafter-i', 'world-primary', 1n);
    const second = system.registerCrafter('crafter-i', 'world-secondary', 999n);

    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
    if (!second.success) {
      expect(second.error).toBe('already-registered');
    }

    const crafter = system.getCrafter('crafter-i');
    expect(crafter?.worldId).toBe('world-primary');
    expect(crafter?.kalonBalance).toBe(1n);
  });

  it('emits expected log channels for registration and successful crafts', () => {
    const system = createCraftingEconomySystem(deps());
    system.registerCrafter('crafter-j', 'world-4', 0n);
    const recipe = registerBasicRecipe(system, 'loggable');
    system.addMaterial('crafter-j', 'iron', 10n);
    system.addMaterial('crafter-j', 'wood', 10n);

    const crafted = system.craft('crafter-j', recipe.recipeId, 1n);
    expect(crafted.success).toBe(true);

    const channels = logs.map((entry) => entry.message);
    expect(channels).toContain('crafter-registered');
    expect(channels).toContain('recipe-registered');
    expect(channels).toContain('craft-completed');

    const craftLog = logs.find((entry) => entry.message === 'craft-completed');
    expect(craftLog?.meta?.crafterId).toBe('crafter-j');
    expect(craftLog?.meta?.recipeId).toBe(recipe.recipeId);
    expect(craftLog?.meta?.kalonEarned).toBe('20');
  });
});
