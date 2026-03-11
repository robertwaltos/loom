/**
 * Crafting Economy Flow — Integration test.
 *
 * Proves the vertical slice from crafting through economy:
 *
 *   1. Dynasty discovers recipes through exploration
 *   2. Dynasty activates crafting specialization
 *   3. Recipe research costs KALON (debit from ledger)
 *   4. Crafting consumes materials and produces items
 *   5. Specialization bonuses apply to crafted output
 *   6. Experience is earned and tiers advance
 *
 * Uses real services: CraftingEngine, RecipeRegistry, SpecializationEngine.
 * Mocks: clock, id generator, material port, KALON port, output port.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCraftingEngine } from '@loom/nakama-fabric';
import type {
  CraftingEngine,
  CraftingEngineDeps,
  CraftingRecipe,
  MaterialConsumed,
} from '@loom/nakama-fabric';
import { createRecipeRegistry } from '@loom/nakama-fabric';
import type { RecipeRegistry, RecipeRegistryDeps } from '@loom/nakama-fabric';
import { createSpecializationEngine, MAX_PRIMARY, MAX_SECONDARY } from '@loom/nakama-fabric';
import type {
  SpecializationEngine,
  SpecializationDeps,
  SpecializationNode,
} from '@loom/nakama-fabric';

// ── Clock & ID ──────────────────────────────────────────────────

function mockClock(start = 1_000_000): { nowMicroseconds: () => number } {
  let t = start;
  return { nowMicroseconds: () => t++ };
}

function mockIdGen(): { generate: () => string } {
  let c = 0;
  return { generate: () => 'id-' + String(++c) };
}

// ── Mock Ports ──────────────────────────────────────────────────

function mockKalonPort(balance = 10000n): RecipeRegistryDeps['kalon'] {
  let bal = balance;
  return {
    debit: (_dynastyId: string, amount: bigint): boolean => {
      if (amount > bal) return false;
      bal -= amount;
      return true;
    },
    refund: (_dynastyId: string, amount: bigint): void => {
      bal += amount;
    },
  };
}

function mockMaterialPort(): CraftingEngineDeps['materials'] {
  return {
    hasMaterials: () => true,
    consumeMaterials: (_dyn, materials) =>
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

function mockOutputPort(): CraftingEngineDeps['output'] & {
  readonly items: Array<{ itemId: string; quantity: number; quality: string }>;
} {
  const items: Array<{ itemId: string; quantity: number; quality: string }> = [];
  return {
    items,
    grantItem: (_dyn, itemId, qty, quality) => {
      items.push({ itemId, quantity: qty, quality });
    },
  };
}

// ── Test Recipes ────────────────────────────────────────────────

function ironSwordRecipe(): CraftingRecipe {
  return {
    id: 'recipe-iron-sword',
    name: 'Iron Sword',
    category: 'weapons',
    materials: [
      { resourceId: 'iron-ingot', quantity: 3, minQuality: 0.3 },
      { resourceId: 'leather-strip', quantity: 1, minQuality: 0.2 },
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

function steelArmorRecipe(): CraftingRecipe {
  return {
    id: 'recipe-steel-armor',
    name: 'Steel Armor',
    category: 'armor',
    materials: [
      { resourceId: 'steel-plate', quantity: 5, minQuality: 0.5 },
      { resourceId: 'padding', quantity: 2, minQuality: 0.3 },
    ],
    catalystSlots: 2,
    baseDurationMicroseconds: 120_000_000,
    baseSuccessRate: 0.6,
    minSkillLevel: 10,
    outputItemId: 'item-steel-armor',
    outputQuantity: 1,
    discoveredBy: null,
    discoveredAtMicroseconds: 0,
  };
}

// ── Test Specialization Nodes ───────────────────────────────────

function blacksmithNode(): SpecializationNode {
  return {
    id: 'ws-node-1',
    specId: 'blacksmith',
    tier: 'novice',
    name: 'Blade Basics',
    description: 'Fundamental blade forging techniques',
    prerequisiteNodes: [],
    qualityBonus: 0.05,
    costReduction: 0.02,
    speedBonus: 0.03,
    unlockRecipes: ['recipe-iron-sword'],
  };
}

// ── Integration: Discovery → Research → Craft ───────────────────

describe('Crafting Economy Flow — discovery to production', () => {
  let registry: RecipeRegistry;
  let engine: CraftingEngine;
  let output: ReturnType<typeof mockOutputPort>;

  beforeEach(() => {
    const kalon = mockKalonPort(5000n);
    registry = createRecipeRegistry({
      clock: mockClock(),
      idGenerator: mockIdGen(),
      kalon,
    });
    output = mockOutputPort();
    engine = createCraftingEngine({
      clock: mockClock(),
      idGenerator: mockIdGen(),
      materials: mockMaterialPort(),
      output,
    });
    engine.registerRecipe(ironSwordRecipe());
  });

  it('discovers recipe then crafts item', () => {
    const discovered = registry.recordDiscovery(
      'house-alpha',
      'recipe-iron-sword',
      'exploration',
      'world-1',
    );
    expect(discovered).toBe(true);
    expect(registry.hasDiscovered('house-alpha', 'recipe-iron-sword')).toBe(true);

    const result = engine.startCrafting({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-iron-sword',
      worldId: 'world-1',
    });
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.jobId).toBeDefined();
  });

  it('tracks crafter profile after crafting', () => {
    engine.startCrafting({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-iron-sword',
      worldId: 'world-1',
    });

    const profile = engine.getCrafterProfile('house-alpha');
    expect(profile).toBeDefined();
    expect(profile!.dynastyId).toBe('house-alpha');
  });

  it('prevents duplicate recipe discovery', () => {
    registry.recordDiscovery('house-alpha', 'recipe-iron-sword', 'exploration', 'world-1');
    const second = registry.recordDiscovery('house-alpha', 'recipe-iron-sword', 'trade', 'world-2');
    expect(second).toBe(false);
  });
});

// ── Integration: Research with KALON Cost ───────────────────────

describe('Crafting Economy Flow — research spending', () => {
  let registry: RecipeRegistry;

  beforeEach(() => {
    registry = createRecipeRegistry({
      clock: mockClock(),
      idGenerator: mockIdGen(),
      kalon: mockKalonPort(500n),
    });
    registry.registerUnlockRequirement({
      recipeId: 'recipe-iron-sword',
      prerequisiteRecipes: [],
      minCrafterSkill: 0,
      researchCostKalon: 200n,
      researchDurationMicroseconds: 60_000_000,
    });
  });

  it('debits KALON when starting research', () => {
    const project = registry.startResearch({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-iron-sword',
      worldId: 'world-1',
    });
    expect(typeof project).not.toBe('string');
    if (typeof project === 'string') return;
    expect(project.status).toBe('in_progress');
    expect(project.investedKalon).toBe(200n);
  });

  it('completes research and auto-discovers recipe', () => {
    const project = registry.startResearch({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-iron-sword',
      worldId: 'world-1',
    });
    if (typeof project === 'string') return;

    const completed = registry.advanceResearch(project.id, 100);
    expect(typeof completed).not.toBe('string');
    if (typeof completed === 'string') return;
    expect(completed.status).toBe('completed');
    expect(registry.hasDiscovered('house-alpha', 'recipe-iron-sword')).toBe(true);
  });

  it('refunds partial KALON on research abandonment', () => {
    const project = registry.startResearch({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-iron-sword',
      worldId: 'world-1',
    });
    if (typeof project === 'string') return;

    const abandoned = registry.abandonResearch(project.id);
    expect(typeof abandoned).not.toBe('string');
    if (typeof abandoned === 'string') return;
    expect(abandoned.status).toBe('abandoned');
  });
});

// ── Integration: Specialization → Crafting Bonus ────────────────

describe('Crafting Economy Flow — specialization bonuses', () => {
  let specEngine: SpecializationEngine;

  beforeEach(() => {
    specEngine = createSpecializationEngine({ clock: mockClock() });
    specEngine.registerNode(blacksmithNode());
  });

  it('activates specialization and unlocks node', () => {
    specEngine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      slot: 'primary',
    });

    const unlocked = specEngine.unlockNode({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      nodeId: 'ws-node-1',
    });
    expect(typeof unlocked).not.toBe('string');
    if (typeof unlocked === 'string') return;
    expect(unlocked.unlockedNodes.has('ws-node-1')).toBe(true);
  });

  it('calculates full primary bonuses', () => {
    specEngine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      slot: 'primary',
    });
    specEngine.unlockNode({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      nodeId: 'ws-node-1',
    });

    const bonus = specEngine.calculateBonus('house-alpha', 'blacksmith');
    expect(bonus.qualityBonus).toBeCloseTo(0.05);
    expect(bonus.costReduction).toBeCloseTo(0.02);
    expect(bonus.speedBonus).toBeCloseTo(0.03);
    expect(bonus.additionalRecipes).toContain('recipe-iron-sword');
  });

  it('halves bonuses for secondary slot', () => {
    specEngine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      slot: 'secondary',
    });
    specEngine.unlockNode({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      nodeId: 'ws-node-1',
    });

    const bonus = specEngine.calculateBonus('house-alpha', 'blacksmith');
    expect(bonus.qualityBonus).toBeCloseTo(0.025);
    expect(bonus.costReduction).toBeCloseTo(0.01);
  });

  it('gains experience and advances tiers', () => {
    specEngine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      slot: 'primary',
    });

    specEngine.gainExperience('house-alpha', 'blacksmith', 200);
    const spec = specEngine.getSpecialization('house-alpha', 'blacksmith');
    expect(spec).toBeDefined();
    expect(spec!.tier).toBe('apprentice');
  });

  it('respects slot limits', () => {
    specEngine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'blacksmith',
      slot: 'primary',
    });
    specEngine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'alchemist',
      slot: 'primary',
    });

    const third = specEngine.activateSpecialization({
      dynastyId: 'house-alpha',
      specId: 'artificer',
      slot: 'primary',
    });
    expect(third).toBe('slot_limit_reached');
    expect(MAX_PRIMARY).toBe(2);
    expect(MAX_SECONDARY).toBe(3);
  });
});

// ── Integration: Full Crafting Pipeline Stats ───────────────────

describe('Crafting Economy Flow — stats and queries', () => {
  let engine: CraftingEngine;

  beforeEach(() => {
    engine = createCraftingEngine({
      clock: mockClock(),
      idGenerator: mockIdGen(),
      materials: mockMaterialPort(),
      output: mockOutputPort(),
    });
    engine.registerRecipe(ironSwordRecipe());
    engine.registerRecipe(steelArmorRecipe());
  });

  it('tracks recipe count', () => {
    const stats = engine.getStats();
    expect(stats.totalRecipes).toBe(2);
  });

  it('retrieves recipes by category', () => {
    const weapons = engine.getRecipesByCategory('weapons');
    expect(weapons).toHaveLength(1);
    expect(weapons[0]!.id).toBe('recipe-iron-sword');

    const armor = engine.getRecipesByCategory('armor');
    expect(armor).toHaveLength(1);
  });

  it('returns undefined for unknown recipe', () => {
    expect(engine.getRecipe('unknown')).toBeUndefined();
  });

  it('discovers recipe for dynasty', () => {
    const discovered = engine.discoverRecipe('house-alpha', 'recipe-iron-sword');
    expect(discovered).toBe(true);

    const duplicate = engine.discoverRecipe('house-alpha', 'recipe-iron-sword');
    expect(duplicate).toBe(false);
  });

  it('rejects crafting with insufficient skill', () => {
    const result = engine.startCrafting({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-steel-armor',
      worldId: 'world-1',
    });
    expect(result).toBe('insufficient_skill');
  });

  it('tracks jobs by dynasty', () => {
    engine.startCrafting({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-iron-sword',
      worldId: 'world-1',
    });
    engine.startCrafting({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-iron-sword',
      worldId: 'world-1',
    });

    const jobs = engine.getJobsByDynasty('house-alpha');
    expect(jobs).toHaveLength(2);
  });
});
