import { beforeEach, describe, expect, it } from 'vitest';
import {
  createRecipeRegistry,
  type RecipeKalonPort,
  type RecipeRegistryDeps,
  type RecipeUnlockRequirement,
} from '../crafting-recipe-registry.js';

describe('crafting-recipe-registry simulation', () => {
  let nowUs: number;
  let idCounter: number;
  let treasury: Map<string, bigint>;
  let debits: Array<{ dynastyId: string; amount: bigint }>;
  let refunds: Array<{ dynastyId: string; amount: bigint }>;

  const advance = (deltaUs = 100): void => {
    nowUs += deltaUs;
  };

  const req = (
    recipeId: string,
    prerequisiteRecipes: string[] = [],
    researchCostKalon = 0n,
  ): RecipeUnlockRequirement => ({
    recipeId,
    prerequisiteRecipes,
    minCrafterSkill: 0,
    researchCostKalon,
    researchDurationMicroseconds: 10_000,
  });

  const kalon: RecipeKalonPort = {
    debit: (dynastyId, amount) => {
      const balance = treasury.get(dynastyId) ?? 0n;
      if (balance < amount) return false;
      treasury.set(dynastyId, balance - amount);
      debits.push({ dynastyId, amount });
      return true;
    },
    refund: (dynastyId, amount) => {
      treasury.set(dynastyId, (treasury.get(dynastyId) ?? 0n) + amount);
      refunds.push({ dynastyId, amount });
    },
  };

  const deps = (): RecipeRegistryDeps => ({
    clock: { nowMicroseconds: () => nowUs },
    idGenerator: {
      generate: () => {
        idCounter += 1;
        return `sim-research-${idCounter}`;
      },
    },
    kalon,
  });

  beforeEach(() => {
    nowUs = 1_000;
    idCounter = 0;
    treasury = new Map();
    debits = [];
    refunds = [];
  });

  it('enforces prerequisite chains before research becomes available', () => {
    const registry = createRecipeRegistry(deps());
    registry.registerUnlockRequirement(req('tier-1', [], 5n));
    registry.registerUnlockRequirement(req('tier-2', ['tier-1'], 10n));

    expect(registry.canResearch('house-a', 'tier-1')).toBe(true);
    expect(registry.canResearch('house-a', 'tier-2')).toBe(false);

    registry.recordDiscovery('house-a', 'tier-1', 'exploration', 'world-a');
    expect(registry.canResearch('house-a', 'tier-2')).toBe(true);
  });

  it('starts research with deterministic project ids and debits required kalon', () => {
    const registry = createRecipeRegistry(deps());
    registry.registerUnlockRequirement(req('ledger-tech', [], 40n));
    treasury.set('house-b', 100n);

    const project = registry.startResearch({
      dynastyId: 'house-b',
      recipeId: 'ledger-tech',
      worldId: 'world-b',
    });

    expect(typeof project).not.toBe('string');
    if (typeof project !== 'string') {
      expect(project.id).toBe('sim-research-1');
      expect(project.investedKalon).toBe(40n);
      expect(project.requiredKalon).toBe(40n);
    }

    expect(treasury.get('house-b')).toBe(60n);
    expect(debits).toEqual([{ dynastyId: 'house-b', amount: 40n }]);
  });

  it('returns insufficient_kalon without creating a project or mutating balance', () => {
    const registry = createRecipeRegistry(deps());
    registry.registerUnlockRequirement(req('expensive-tech', [], 200n));
    treasury.set('house-c', 50n);

    const result = registry.startResearch({
      dynastyId: 'house-c',
      recipeId: 'expensive-tech',
      worldId: 'world-c',
    });

    expect(result).toBe('insufficient_kalon');
    expect(treasury.get('house-c')).toBe(50n);
    expect(registry.getResearchProjects('house-c')).toHaveLength(0);
  });

  it('advances progress cumulatively and completes at 100 with a discovery record', () => {
    const registry = createRecipeRegistry(deps());
    registry.registerUnlockRequirement(req('glyph-craft', [], 0n));

    const started = registry.startResearch({
      dynastyId: 'house-d',
      recipeId: 'glyph-craft',
      worldId: 'world-d',
    });
    expect(typeof started).not.toBe('string');
    if (typeof started === 'string') return;

    const mid = registry.advanceResearch(started.id, 30);
    expect(typeof mid).not.toBe('string');
    if (typeof mid === 'string') return;
    expect(mid.progressPercent).toBe(30);

    advance(50);
    const complete = registry.advanceResearch(started.id, 80);
    expect(typeof complete).not.toBe('string');
    if (typeof complete === 'string') return;

    expect(complete.status).toBe('completed');
    expect(complete.progressPercent).toBe(100);
    expect(complete.completedAtMicroseconds).toBe(nowUs);
    expect(registry.hasDiscovered('house-d', 'glyph-craft')).toBe(true);

    const discoveries = registry.getDiscoveries('house-d');
    expect(discoveries).toHaveLength(1);
    expect(discoveries[0]?.method).toBe('research');
    expect(discoveries[0]?.worldId).toBe('');
  });

  it('abandons active research and refunds half of invested kalon', () => {
    const registry = createRecipeRegistry(deps());
    registry.registerUnlockRequirement(req('charter-law', [], 90n));
    treasury.set('house-e', 100n);

    const started = registry.startResearch({
      dynastyId: 'house-e',
      recipeId: 'charter-law',
      worldId: 'world-e',
    });
    expect(typeof started).not.toBe('string');
    if (typeof started === 'string') return;

    const abandoned = registry.abandonResearch(started.id);
    expect(typeof abandoned).not.toBe('string');
    if (typeof abandoned === 'string') return;

    expect(abandoned.status).toBe('abandoned');
    expect(treasury.get('house-e')).toBe(55n);
    expect(refunds).toEqual([{ dynastyId: 'house-e', amount: 45n }]);
  });

  it('rejects transitions for non-active projects and unknown ids', () => {
    const registry = createRecipeRegistry(deps());
    registry.registerUnlockRequirement(req('nav-tech', [], 0n));

    const started = registry.startResearch({
      dynastyId: 'house-f',
      recipeId: 'nav-tech',
      worldId: 'world-f',
    });
    expect(typeof started).not.toBe('string');
    if (typeof started === 'string') return;

    registry.advanceResearch(started.id, 100);

    expect(registry.advanceResearch(started.id, 5)).toBe('project_not_active');
    expect(registry.abandonResearch(started.id)).toBe('project_not_active');
    expect(registry.advanceResearch('unknown', 1)).toBe('project_not_found');
    expect(registry.abandonResearch('unknown')).toBe('project_not_found');
  });

  it('prevents duplicate discoveries per dynasty while allowing same recipe across dynasties', () => {
    const registry = createRecipeRegistry(deps());

    expect(registry.recordDiscovery('house-g1', 'shared-recipe', 'trade', 'world-g')).toBe(true);
    expect(registry.recordDiscovery('house-g1', 'shared-recipe', 'mentor', 'world-g')).toBe(false);
    expect(registry.recordDiscovery('house-g2', 'shared-recipe', 'mentor', 'world-g')).toBe(true);

    expect(registry.getDiscoveries('house-g1')).toHaveLength(1);
    expect(registry.getDiscoveries('house-g2')).toHaveLength(1);
  });

  it('isolates research project queries by dynasty and active status', () => {
    const registry = createRecipeRegistry(deps());
    registry.registerUnlockRequirement(req('a-tech', [], 0n));
    registry.registerUnlockRequirement(req('b-tech', [], 0n));

    const a = registry.startResearch({ dynastyId: 'house-h1', recipeId: 'a-tech', worldId: 'w1' });
    const b = registry.startResearch({ dynastyId: 'house-h2', recipeId: 'b-tech', worldId: 'w2' });

    expect(typeof a).not.toBe('string');
    expect(typeof b).not.toBe('string');
    if (typeof a === 'string' || typeof b === 'string') return;

    registry.advanceResearch(a.id, 100);

    expect(registry.getResearchProjects('house-h1')).toHaveLength(1);
    expect(registry.getActiveResearch('house-h1')).toHaveLength(0);
    expect(registry.getResearchProjects('house-h2')).toHaveLength(1);
    expect(registry.getActiveResearch('house-h2')).toHaveLength(1);
  });

  it('reports aggregate stats across registered recipes, discoveries, and project states', () => {
    const registry = createRecipeRegistry(deps());
    registry.registerUnlockRequirement(req('alpha', [], 0n));
    registry.registerUnlockRequirement(req('beta', [], 0n));
    registry.registerUnlockRequirement(req('gamma', [], 0n));

    registry.recordDiscovery('house-i', 'legacy', 'ancient_artifact', 'world-i');

    const p1 = registry.startResearch({ dynastyId: 'house-i', recipeId: 'alpha', worldId: 'wi' });
    const p2 = registry.startResearch({ dynastyId: 'house-j', recipeId: 'beta', worldId: 'wj' });

    expect(typeof p1).not.toBe('string');
    expect(typeof p2).not.toBe('string');
    if (typeof p1 === 'string' || typeof p2 === 'string') return;

    registry.advanceResearch(p1.id, 100);

    const stats = registry.getStats();
    expect(stats.totalRecipes).toBe(3);
    expect(stats.totalDiscoveries).toBe(2);
    expect(stats.activeResearchProjects).toBe(1);
    expect(stats.completedResearchProjects).toBe(1);
  });

  it('stores discovery timeline metadata in insertion order', () => {
    const registry = createRecipeRegistry(deps());

    registry.recordDiscovery('house-k', 'r1', 'exploration', 'world-k');
    advance(10);
    registry.recordDiscovery('house-k', 'r2', 'quest_reward', 'world-k');
    advance(10);
    registry.recordDiscovery('house-k', 'r3', 'trade', 'world-k');

    const discoveries = registry.getDiscoveries('house-k');
    expect(discoveries.map((d) => d.recipeId)).toEqual(['r1', 'r2', 'r3']);
    expect(discoveries.map((d) => d.discoveredAtMicroseconds)).toEqual([1_000, 1_010, 1_020]);
    expect(discoveries[1]?.method).toBe('quest_reward');
    expect(discoveries[2]?.worldId).toBe('world-k');
  });
});
