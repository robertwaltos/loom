import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCraftingEngine,
  type CraftingCategory,
  type CraftingEngineDeps,
  type CraftingQuality,
  type CraftingRecipe,
  type MaterialRequirement,
} from '../crafting-engine.js';

describe('crafting-engine simulation', () => {
  let nowUs: number;
  let idCounter: number;
  let hasMaterialsOverrides: Map<string, boolean>;
  let grantedItems: Array<{ dynastyId: string; itemId: string; quantity: number; quality: CraftingQuality }>;
  let consumedByDynasty: Map<string, number>;

  const materialReq = (
    resourceId: string,
    quantity: number,
    minQuality = 0.2,
  ): MaterialRequirement => ({ resourceId, quantity, minQuality });

  const recipe = (
    id: string,
    category: CraftingCategory,
    opts?: Partial<Pick<CraftingRecipe, 'baseSuccessRate' | 'minSkillLevel' | 'outputQuantity'>>,
  ): CraftingRecipe => ({
    id,
    name: id,
    category,
    materials: [materialReq('iron', 2, 0.2), materialReq('wood', 1, 0.1)],
    catalystSlots: 2,
    baseDurationMicroseconds: 90_000,
    baseSuccessRate: opts?.baseSuccessRate ?? 1,
    minSkillLevel: opts?.minSkillLevel ?? 0,
    outputItemId: `${id}-item`,
    outputQuantity: opts?.outputQuantity ?? 1,
    discoveredBy: null,
    discoveredAtMicroseconds: 0,
  });

  const deps = (): CraftingEngineDeps => ({
    clock: { nowMicroseconds: () => nowUs },
    idGenerator: {
      generate: () => {
        idCounter += 1;
        return `sim-craft-${idCounter}`;
      },
    },
    materials: {
      hasMaterials: (dynastyId) => hasMaterialsOverrides.get(dynastyId) ?? true,
      consumeMaterials: (dynastyId, requirements) => {
        consumedByDynasty.set(dynastyId, (consumedByDynasty.get(dynastyId) ?? 0) + 1);
        return requirements.map((req) => ({
          resourceId: req.resourceId,
          quantity: req.quantity,
          quality: 0.9,
        }));
      },
      returnMaterials: () => {
        // No-op in this engine path; included for dependency completeness.
      },
    },
    output: {
      grantItem: (dynastyId, itemId, quantity, quality) => {
        grantedItems.push({ dynastyId, itemId, quantity, quality });
      },
    },
  });

  beforeEach(() => {
    nowUs = 900_000;
    idCounter = 0;
    hasMaterialsOverrides = new Map();
    grantedItems = [];
    consumedByDynasty = new Map();
    vi.restoreAllMocks();
  });

  it('runs a full successful craft and records completed job metadata', () => {
    const engine = createCraftingEngine(deps());
    engine.registerRecipe(recipe('forge-sword', 'weapons', { outputQuantity: 2 }));

    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    const result = engine.startCrafting({
      dynastyId: 'house-a',
      recipeId: 'forge-sword',
      worldId: 'world-a',
    });

    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.success).toBe(true);
      expect(result.itemId).toBe('forge-sword-item');

      const jobs = engine.getJobsByDynasty('house-a');
      expect(jobs).toHaveLength(1);
      expect(jobs[0]?.status).toBe('completed');
      expect(jobs[0]?.worldId).toBe('world-a');
      expect(jobs[0]?.resultQuality).not.toBeNull();
    }

    expect(grantedItems).toHaveLength(1);
    expect(grantedItems[0]?.quantity).toBe(2);
  });

  it('rejects crafting when material check fails and does not consume inputs', () => {
    const engine = createCraftingEngine(deps());
    engine.registerRecipe(recipe('forge-axe', 'tools'));
    hasMaterialsOverrides.set('house-b', false);

    const result = engine.startCrafting({
      dynastyId: 'house-b',
      recipeId: 'forge-axe',
      worldId: 'world-b',
    });

    expect(result).toBe('insufficient_materials');
    expect(consumedByDynasty.get('house-b') ?? 0).toBe(0);
    expect(engine.getJobsByDynasty('house-b')).toHaveLength(0);
    expect(grantedItems).toHaveLength(0);
  });

  it('records failed jobs when success roll misses base success rate', () => {
    const engine = createCraftingEngine(deps());
    engine.registerRecipe(recipe('fragile-mixture', 'consumables', { baseSuccessRate: 0.2 }));

    vi.spyOn(Math, 'random').mockReturnValue(0.8);

    const result = engine.startCrafting({
      dynastyId: 'house-c',
      recipeId: 'fragile-mixture',
      worldId: 'world-c',
    });

    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.success).toBe(false);
      expect(result.quality).toBeNull();
    }

    const stats = engine.getStats();
    expect(stats.totalFailedJobs).toBe(1);
    expect(stats.totalCompletedJobs).toBe(0);
    expect(grantedItems).toHaveLength(0);
  });

  it('enforces skill requirements and leaves crafter state unchanged on rejection', () => {
    const engine = createCraftingEngine(deps());
    engine.registerRecipe(recipe('master-compass', 'tools', { minSkillLevel: 10 }));

    const result = engine.startCrafting({
      dynastyId: 'house-d',
      recipeId: 'master-compass',
      worldId: 'world-d',
    });

    expect(result).toBe('insufficient_skill');
    const profile = engine.getCrafterProfile('house-d');
    expect(profile?.totalItemsCrafted ?? 0).toBe(0);
    expect(profile?.totalFailures ?? 0).toBe(0);
    expect(engine.getJobsByDynasty('house-d')).toHaveLength(0);
  });

  it('allows recipe discovery once and rejects duplicate discoveries', () => {
    const engine = createCraftingEngine(deps());
    engine.registerRecipe(recipe('decoded-scroll', 'artifacts'));

    expect(engine.discoverRecipe('house-e', 'decoded-scroll')).toBe(true);
    expect(engine.discoverRecipe('house-e', 'decoded-scroll')).toBe(false);

    const profile = engine.getCrafterProfile('house-e');
    expect(profile?.discoveredRecipes.has('decoded-scroll')).toBe(true);
  });

  it('keeps jobs and output isolated across dynasties using the same recipe', () => {
    const engine = createCraftingEngine(deps());
    engine.registerRecipe(recipe('shared-hammer', 'tools'));
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    engine.startCrafting({ dynastyId: 'house-f1', recipeId: 'shared-hammer', worldId: 'world-f' });
    engine.startCrafting({ dynastyId: 'house-f2', recipeId: 'shared-hammer', worldId: 'world-f' });

    expect(engine.getJobsByDynasty('house-f1')).toHaveLength(1);
    expect(engine.getJobsByDynasty('house-f2')).toHaveLength(1);
    expect(grantedItems.filter((g) => g.dynastyId === 'house-f1')).toHaveLength(1);
    expect(grantedItems.filter((g) => g.dynastyId === 'house-f2')).toHaveLength(1);
  });

  it('aggregates stats correctly across recipe registration and mixed outcomes', () => {
    const engine = createCraftingEngine(deps());
    engine.registerRecipe(recipe('safe-batch', 'materials', { baseSuccessRate: 1 }));
    engine.registerRecipe(recipe('risky-batch', 'materials', { baseSuccessRate: 0 }));

    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    engine.startCrafting({ dynastyId: 'house-g', recipeId: 'safe-batch', worldId: 'world-g' });
    engine.startCrafting({ dynastyId: 'house-g', recipeId: 'risky-batch', worldId: 'world-g' });

    const stats = engine.getStats();
    expect(stats.totalRecipes).toBe(2);
    expect(stats.crafterCount).toBe(1);
    expect(stats.totalCompletedJobs).toBe(1);
    expect(stats.totalFailedJobs).toBe(1);
    expect(stats.totalActiveJobs).toBe(0);
  });

  it('exposes category-filtered recipe views without leaking other categories', () => {
    const engine = createCraftingEngine(deps());
    engine.registerRecipe(recipe('weapon-a', 'weapons'));
    engine.registerRecipe(recipe('armor-a', 'armor'));
    engine.registerRecipe(recipe('weapon-b', 'weapons'));

    const weapons = engine.getRecipesByCategory('weapons');
    const armor = engine.getRecipesByCategory('armor');

    expect(weapons.map((r) => r.id)).toEqual(['weapon-a', 'weapon-b']);
    expect(armor.map((r) => r.id)).toEqual(['armor-a']);
  });

  it('tracks deterministic job ids in submission order', () => {
    const engine = createCraftingEngine(deps());
    engine.registerRecipe(recipe('id-test', 'tools'));
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    const r1 = engine.startCrafting({ dynastyId: 'house-h', recipeId: 'id-test', worldId: 'world-h' });
    const r2 = engine.startCrafting({ dynastyId: 'house-h', recipeId: 'id-test', worldId: 'world-h' });

    expect(typeof r1).not.toBe('string');
    expect(typeof r2).not.toBe('string');
    if (typeof r1 !== 'string' && typeof r2 !== 'string') {
      expect(r1.jobId).toBe('sim-craft-1');
      expect(r2.jobId).toBe('sim-craft-2');
    }
  });

  it('improves quality tier when catalysts are supplied under identical RNG conditions', () => {
    const baseRecipe = recipe('quality-check', 'artifacts', { baseSuccessRate: 1 });

    const noCatalystEngine = createCraftingEngine(deps());
    noCatalystEngine.registerRecipe(baseRecipe);

    const withCatalystEngine = createCraftingEngine(deps());
    withCatalystEngine.registerRecipe(baseRecipe);

    const rngNoCatalyst = vi.spyOn(Math, 'random').mockReturnValue(0.4);
    const noCatalyst = noCatalystEngine.startCrafting({
      dynastyId: 'house-i',
      recipeId: 'quality-check',
      worldId: 'world-i',
    });
    rngNoCatalyst.mockRestore();

    const rngWithCatalyst = vi.spyOn(Math, 'random').mockReturnValue(0.4);
    const withCatalyst = withCatalystEngine.startCrafting({
      dynastyId: 'house-j',
      recipeId: 'quality-check',
      worldId: 'world-j',
      catalysts: ['cat-1', 'cat-2'],
    });
    rngWithCatalyst.mockRestore();

    expect(typeof noCatalyst).not.toBe('string');
    expect(typeof withCatalyst).not.toBe('string');

    if (typeof noCatalyst !== 'string' && typeof withCatalyst !== 'string') {
      const qualityRank: Record<CraftingQuality, number> = {
        crude: 0,
        common: 1,
        fine: 2,
        superior: 3,
        masterwork: 4,
        legendary: 5,
      };
      expect(noCatalyst.quality).not.toBeNull();
      expect(withCatalyst.quality).not.toBeNull();
      if (noCatalyst.quality !== null && withCatalyst.quality !== null) {
        expect(qualityRank[withCatalyst.quality]).toBeGreaterThanOrEqual(
          qualityRank[noCatalyst.quality],
        );
      }
    }
  });
});
