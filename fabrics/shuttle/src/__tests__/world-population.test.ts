import { describe, it, expect } from 'vitest';
import {
  createWorldPopulationEngine,
  TIER_QUOTAS,
} from '../world-population.js';
import type {
  WorldPopulationEngine,
} from '../world-population.js';

function createTestEngine(): WorldPopulationEngine {
  return createWorldPopulationEngine();
}

// ─── Initialization ─────────────────────────────────────────────────

describe('World population initialization', () => {
  it('initializes world with zero population', () => {
    const engine = createTestEngine();
    const pop = engine.initializeWorld('earth');
    expect(pop.worldId).toBe('earth');
    expect(pop.tier1Count).toBe(0);
    expect(pop.tier2Count).toBe(0);
    expect(pop.tier3Count).toBe(0);
    expect(pop.tier4Count).toBe(0);
    expect(pop.totalPopulation).toBe(0);
  });

  it('starts with zero health', () => {
    const engine = createTestEngine();
    const pop = engine.initializeWorld('earth');
    expect(pop.healthIndex).toBe(0);
  });

  it('starts with minimum productivity', () => {
    const engine = createTestEngine();
    const pop = engine.initializeWorld('earth');
    expect(pop.productivityModifier).toBe(80);
  });

  it('rejects duplicate world initialization', () => {
    const engine = createTestEngine();
    engine.initializeWorld('earth');
    expect(() => engine.initializeWorld('earth')).toThrow('already initialized');
  });
});

// ─── Spawning ───────────────────────────────────────────────────────

describe('World population spawning', () => {
  it('spawns NPCs and increases count', () => {
    const engine = createTestEngine();
    engine.initializeWorld('earth');
    const delta = engine.spawn('earth', 1, 50_000);
    expect(delta.previousCount).toBe(0);
    expect(delta.newCount).toBe(50_000);
  });

  it('caps spawn at tier quota', () => {
    const engine = createTestEngine();
    engine.initializeWorld('earth');
    const delta = engine.spawn('earth', 1, 200_000);
    expect(delta.newCount).toBe(100_000);
  });

  it('accumulates spawns up to quota', () => {
    const engine = createTestEngine();
    engine.initializeWorld('earth');
    engine.spawn('earth', 2, 5_000);
    const delta = engine.spawn('earth', 2, 8_000);
    // 5000 + min(8000, 5000 remaining) = 10000
    expect(delta.newCount).toBe(10_000);
  });

  it('does not cap Tier 4 per world', () => {
    const engine = createTestEngine();
    engine.initializeWorld('earth');
    const delta = engine.spawn('earth', 4, 10);
    expect(delta.newCount).toBe(10);
  });

  it('updates health after spawn', () => {
    const engine = createTestEngine();
    engine.initializeWorld('earth');
    const delta = engine.spawn('earth', 1, 100_000);
    expect(delta.healthBefore).toBe(0);
    expect(delta.healthAfter).toBeGreaterThan(0);
  });
});

// ─── Despawning ─────────────────────────────────────────────────────

describe('World population despawning', () => {
  it('removes NPCs from count', () => {
    const engine = createTestEngine();
    engine.initializeWorld('earth');
    engine.spawn('earth', 1, 50_000);
    const delta = engine.despawn('earth', 1, 10_000);
    expect(delta.previousCount).toBe(50_000);
    expect(delta.newCount).toBe(40_000);
  });

  it('clamps despawn to current count', () => {
    const engine = createTestEngine();
    engine.initializeWorld('earth');
    engine.spawn('earth', 2, 100);
    const delta = engine.despawn('earth', 2, 500);
    expect(delta.newCount).toBe(0);
  });

  it('decreases health after despawn', () => {
    const engine = createTestEngine();
    engine.initializeWorld('earth');
    engine.spawn('earth', 1, 100_000);
    const delta = engine.despawn('earth', 1, 50_000);
    expect(delta.healthAfter).toBeLessThan(delta.healthBefore);
  });
});

// ─── Health Calculation ─────────────────────────────────────────────

describe('World population health', () => {
  it('full tier 1 gives 40% health', () => {
    const engine = createTestEngine();
    engine.initializeWorld('earth');
    engine.spawn('earth', 1, 100_000);
    expect(engine.getHealth('earth')).toBeCloseTo(0.4, 5);
  });

  it('full tier 1 + tier 2 gives 70% health', () => {
    const engine = createTestEngine();
    engine.initializeWorld('earth');
    engine.spawn('earth', 1, 100_000);
    engine.spawn('earth', 2, 10_000);
    expect(engine.getHealth('earth')).toBeCloseTo(0.7, 5);
  });

  it('full tiers 1-3 gives 90% health', () => {
    const engine = createTestEngine();
    engine.initializeWorld('earth');
    engine.spawn('earth', 1, 100_000);
    engine.spawn('earth', 2, 10_000);
    engine.spawn('earth', 3, 1_000);
    expect(engine.getHealth('earth')).toBeCloseTo(0.9, 5);
  });

  it('all tiers filled gives 100% health', () => {
    const engine = createTestEngine();
    engine.initializeWorld('earth');
    engine.spawn('earth', 1, 100_000);
    engine.spawn('earth', 2, 10_000);
    engine.spawn('earth', 3, 1_000);
    engine.spawn('earth', 4, 1);
    expect(engine.getHealth('earth')).toBeCloseTo(1.0, 5);
  });

  it('partial fill gives proportional health', () => {
    const engine = createTestEngine();
    engine.initializeWorld('earth');
    engine.spawn('earth', 1, 50_000); // 50% of 100K = 0.5 × 0.40 = 0.20
    expect(engine.getHealth('earth')).toBeCloseTo(0.2, 5);
  });
});

// ─── Productivity ───────────────────────────────────────────────────

describe('World population productivity', () => {
  it('empty world has productivity 80', () => {
    const engine = createTestEngine();
    engine.initializeWorld('earth');
    expect(engine.getProductivityModifier('earth')).toBe(80);
  });

  it('full world has productivity 120', () => {
    const engine = createTestEngine();
    engine.initializeWorld('earth');
    engine.spawn('earth', 1, 100_000);
    engine.spawn('earth', 2, 10_000);
    engine.spawn('earth', 3, 1_000);
    engine.spawn('earth', 4, 1);
    expect(engine.getProductivityModifier('earth')).toBe(120);
  });

  it('half health gives productivity 100', () => {
    const engine = createTestEngine();
    engine.initializeWorld('earth');
    // 50% health: fill tier 1 (40%) + 1/3 of tier 2 (10%)
    engine.spawn('earth', 1, 100_000); // 40%
    engine.spawn('earth', 2, 3333); // ~10%
    // ~50% health → ~100 productivity
    expect(engine.getProductivityModifier('earth')).toBeGreaterThanOrEqual(98);
    expect(engine.getProductivityModifier('earth')).toBeLessThanOrEqual(102);
  });
});

// ─── Queries ────────────────────────────────────────────────────────

describe('World population queries', () => {
  it('getPopulation returns current state', () => {
    const engine = createTestEngine();
    engine.initializeWorld('earth');
    engine.spawn('earth', 1, 5000);
    engine.spawn('earth', 3, 100);
    const pop = engine.getPopulation('earth');
    expect(pop.tier1Count).toBe(5000);
    expect(pop.tier3Count).toBe(100);
    expect(pop.totalPopulation).toBe(5100);
  });

  it('tryGetPopulation returns undefined for unknown world', () => {
    const engine = createTestEngine();
    expect(engine.tryGetPopulation('mars')).toBeUndefined();
  });

  it('getPopulation throws for unknown world', () => {
    const engine = createTestEngine();
    expect(() => engine.getPopulation('mars')).toThrow('not initialized');
  });

  it('listWorlds returns all initialized worlds', () => {
    const engine = createTestEngine();
    engine.initializeWorld('earth');
    engine.initializeWorld('mars');
    const worlds = engine.listWorlds();
    expect(worlds).toContain('earth');
    expect(worlds).toContain('mars');
    expect(worlds).toHaveLength(2);
  });

  it('count returns number of initialized worlds', () => {
    const engine = createTestEngine();
    expect(engine.count()).toBe(0);
    engine.initializeWorld('earth');
    engine.initializeWorld('mars');
    expect(engine.count()).toBe(2);
  });
});

// ─── Tier Quotas ────────────────────────────────────────────────────

describe('World population tier quotas', () => {
  it('exposes correct tier quotas', () => {
    expect(TIER_QUOTAS[1]).toBe(100_000);
    expect(TIER_QUOTAS[2]).toBe(10_000);
    expect(TIER_QUOTAS[3]).toBe(1_000);
    expect(TIER_QUOTAS[4]).toBeNull();
  });
});
