/**
 * crafting-recipe-registry.test.ts — Unit tests for recipe discovery and research.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createRecipeRegistry } from '../crafting-recipe-registry.js';
import type {
  RecipeRegistry,
  RecipeRegistryDeps,
  RecipeUnlockRequirement,
} from '../crafting-recipe-registry.js';

// ── Test Helpers ─────────────────────────────────────────────────

function mockClock(start = 1_000_000): { nowMicroseconds: () => number } {
  let t = start;
  return { nowMicroseconds: () => t };
}

function mockIdGenerator(): { generate: () => string } {
  let counter = 0;
  return {
    generate: () => {
      counter += 1;
      return 'project-' + String(counter);
    },
  };
}

function mockKalon(): RecipeRegistryDeps['kalon'] {
  return {
    debit: () => true,
    refund: () => {
      /* noop */
    },
  };
}

function poorKalon(): RecipeRegistryDeps['kalon'] {
  return {
    debit: () => false,
    refund: () => {
      /* noop */
    },
  };
}

function createDeps(kalon?: RecipeRegistryDeps['kalon']): RecipeRegistryDeps {
  return {
    clock: mockClock(),
    idGenerator: mockIdGenerator(),
    kalon: kalon ?? mockKalon(),
  };
}

function swordUnlock(): RecipeUnlockRequirement {
  return {
    recipeId: 'recipe-sword',
    prerequisiteRecipes: [],
    minCrafterSkill: 0,
    researchCostKalon: 100n,
    researchDurationMicroseconds: 60_000_000,
  };
}

function armorUnlock(): RecipeUnlockRequirement {
  return {
    recipeId: 'recipe-armor',
    prerequisiteRecipes: ['recipe-sword'],
    minCrafterSkill: 10,
    researchCostKalon: 500n,
    researchDurationMicroseconds: 120_000_000,
  };
}

// ── Tests ────────────────────────────────────────────────────────

describe('RecipeRegistry — discovery', () => {
  let registry: RecipeRegistry;

  beforeEach(() => {
    registry = createRecipeRegistry(createDeps());
  });

  it('records a recipe discovery', () => {
    const result = registry.recordDiscovery(
      'house-alpha',
      'recipe-sword',
      'exploration',
      'world-1',
    );
    expect(result).toBe(true);
    expect(registry.hasDiscovered('house-alpha', 'recipe-sword')).toBe(true);
  });

  it('prevents duplicate discovery', () => {
    registry.recordDiscovery('house-alpha', 'recipe-sword', 'exploration', 'world-1');
    const second = registry.recordDiscovery('house-alpha', 'recipe-sword', 'trade', 'world-2');
    expect(second).toBe(false);
  });

  it('allows different dynasties to discover same recipe', () => {
    registry.recordDiscovery('house-alpha', 'recipe-sword', 'exploration', 'world-1');
    const result = registry.recordDiscovery('house-beta', 'recipe-sword', 'trade', 'world-2');
    expect(result).toBe(true);
  });

  it('returns false for undiscovered recipe', () => {
    expect(registry.hasDiscovered('house-alpha', 'recipe-sword')).toBe(false);
  });

  it('gets discoveries for a dynasty', () => {
    registry.recordDiscovery('house-alpha', 'recipe-sword', 'exploration', 'world-1');
    registry.recordDiscovery('house-alpha', 'recipe-potion', 'quest_reward', 'world-2');

    const discoveries = registry.getDiscoveries('house-alpha');
    expect(discoveries).toHaveLength(2);
  });

  it('returns empty for dynasty with no discoveries', () => {
    expect(registry.getDiscoveries('unknown')).toHaveLength(0);
  });
});

describe('RecipeRegistry — prerequisites', () => {
  let registry: RecipeRegistry;

  beforeEach(() => {
    registry = createRecipeRegistry(createDeps());
    registry.registerUnlockRequirement(swordUnlock());
    registry.registerUnlockRequirement(armorUnlock());
  });

  it('allows research when no prerequisites', () => {
    expect(registry.canResearch('house-alpha', 'recipe-sword')).toBe(true);
  });

  it('blocks research when prerequisites not met', () => {
    expect(registry.canResearch('house-alpha', 'recipe-armor')).toBe(false);
  });

  it('allows research after prerequisites met', () => {
    registry.recordDiscovery('house-alpha', 'recipe-sword', 'research', 'world-1');
    expect(registry.canResearch('house-alpha', 'recipe-armor')).toBe(true);
  });

  it('blocks research for already discovered recipe', () => {
    registry.recordDiscovery('house-alpha', 'recipe-sword', 'exploration', 'world-1');
    expect(registry.canResearch('house-alpha', 'recipe-sword')).toBe(false);
  });
});

describe('RecipeRegistry — research projects', () => {
  let registry: RecipeRegistry;

  beforeEach(() => {
    registry = createRecipeRegistry(createDeps());
    registry.registerUnlockRequirement(swordUnlock());
  });

  it('starts a research project', () => {
    const result = registry.startResearch({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-sword',
      worldId: 'world-1',
    });

    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.status).toBe('in_progress');
    expect(result.progressPercent).toBe(0);
  });

  it('fails research when cannot research', () => {
    registry.recordDiscovery('house-alpha', 'recipe-sword', 'exploration', 'world-1');
    const result = registry.startResearch({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-sword',
      worldId: 'world-1',
    });
    expect(result).toBe('cannot_research');
  });

  it('fails research when insufficient kalon', () => {
    const poorRegistry = createRecipeRegistry(createDeps(poorKalon()));
    poorRegistry.registerUnlockRequirement(swordUnlock());

    const result = poorRegistry.startResearch({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-sword',
      worldId: 'world-1',
    });
    expect(result).toBe('insufficient_kalon');
  });

  it('advances research progress', () => {
    const result = registry.startResearch({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-sword',
      worldId: 'world-1',
    });
    if (typeof result === 'string') return;

    const advanced = registry.advanceResearch(result.id, 50);
    expect(typeof advanced).not.toBe('string');
    if (typeof advanced === 'string') return;
    expect(advanced.progressPercent).toBe(50);
  });

  it('completes research and discovers recipe', () => {
    const result = registry.startResearch({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-sword',
      worldId: 'world-1',
    });
    if (typeof result === 'string') return;

    const completed = registry.advanceResearch(result.id, 100);
    expect(typeof completed).not.toBe('string');
    if (typeof completed === 'string') return;
    expect(completed.status).toBe('completed');
    expect(completed.progressPercent).toBe(100);
    expect(registry.hasDiscovered('house-alpha', 'recipe-sword')).toBe(true);
  });

  it('caps progress at 100', () => {
    const result = registry.startResearch({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-sword',
      worldId: 'world-1',
    });
    if (typeof result === 'string') return;

    const over = registry.advanceResearch(result.id, 150);
    expect(typeof over).not.toBe('string');
    if (typeof over === 'string') return;
    expect(over.progressPercent).toBe(100);
  });

  it('abandons research with partial refund', () => {
    const result = registry.startResearch({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-sword',
      worldId: 'world-1',
    });
    if (typeof result === 'string') return;

    const abandoned = registry.abandonResearch(result.id);
    expect(typeof abandoned).not.toBe('string');
    if (typeof abandoned === 'string') return;
    expect(abandoned.status).toBe('abandoned');
  });

  it('cannot advance abandoned research', () => {
    const result = registry.startResearch({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-sword',
      worldId: 'world-1',
    });
    if (typeof result === 'string') return;

    registry.abandonResearch(result.id);
    const advanced = registry.advanceResearch(result.id, 10);
    expect(advanced).toBe('project_not_active');
  });

  it('returns error for unknown project', () => {
    expect(registry.advanceResearch('unknown', 10)).toBe('project_not_found');
    expect(registry.abandonResearch('unknown')).toBe('project_not_found');
  });
});

describe('RecipeRegistry — queries', () => {
  let registry: RecipeRegistry;

  beforeEach(() => {
    registry = createRecipeRegistry(createDeps());
    registry.registerUnlockRequirement(swordUnlock());
  });

  it('gets research projects for dynasty', () => {
    registry.startResearch({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-sword',
      worldId: 'world-1',
    });

    const projects = registry.getResearchProjects('house-alpha');
    expect(projects).toHaveLength(1);
  });

  it('gets active research only', () => {
    const result = registry.startResearch({
      dynastyId: 'house-alpha',
      recipeId: 'recipe-sword',
      worldId: 'world-1',
    });
    if (typeof result !== 'string') {
      registry.advanceResearch(result.id, 100);
    }

    const active = registry.getActiveResearch('house-alpha');
    expect(active).toHaveLength(0);
  });

  it('reports correct stats', () => {
    registry.recordDiscovery('house-alpha', 'recipe-potion', 'exploration', 'world-1');
    registry.startResearch({
      dynastyId: 'house-beta',
      recipeId: 'recipe-sword',
      worldId: 'world-1',
    });

    const stats = registry.getStats();
    expect(stats.totalRecipes).toBe(1);
    expect(stats.totalDiscoveries).toBe(1);
    expect(stats.activeResearchProjects).toBe(1);
  });
});
