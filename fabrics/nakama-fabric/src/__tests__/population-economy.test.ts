import { describe, it, expect } from 'vitest';
import { createPopulationEconomySystem, type PopulationTier } from '../population-economy.js';

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
      const id = 'snap-' + String(counter);
      counter += 1;
      return id;
    },
  };
}

function createMockLogger() {
  const logs: Array<{ message: string; meta?: Record<string, unknown> }> = [];
  return {
    info: (message: string, meta?: Record<string, unknown>) => {
      logs.push({ message, meta });
    },
    getLogs: () => logs,
  };
}

function makeSystem() {
  const clock = createMockClock();
  const idGen = createMockIdGen();
  const logger = createMockLogger();
  const system = createPopulationEconomySystem({ clock, idGen, logger });
  return { system, clock, idGen, logger };
}

function makeWorldSystem(worldId = 'world-1', population = 500_000n, growthBps = 200) {
  const ctx = makeSystem();
  ctx.system.registerWorld(worldId, population, growthBps);
  return ctx;
}

// ── registerWorld ─────────────────────────────────────────────────────────────

describe('registerWorld', () => {
  it('registers a world successfully', () => {
    const { system } = makeSystem();
    const result = system.registerWorld('world-1', 500_000n, 200);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.worldId).toBe('world-1');
      expect(result.totalPopulation).toBe(500_000n);
      expect(result.growthRateBps).toBe(200);
      expect(result.productivityIndex).toBe(1.0);
    }
  });

  it('returns already-registered for duplicate world', () => {
    const { system } = makeSystem();
    system.registerWorld('world-1', 100n, 100);
    expect(system.registerWorld('world-1', 200n, 100)).toBe('already-registered');
  });

  it('returns invalid-population for negative population', () => {
    const { system } = makeSystem();
    expect(system.registerWorld('world-1', -1n, 100)).toBe('invalid-population');
  });

  it('returns invalid-rate for growth rate above max', () => {
    const { system } = makeSystem();
    expect(system.registerWorld('world-1', 1000n, 10001)).toBe('invalid-rate');
  });

  it('returns invalid-rate for growth rate below min', () => {
    const { system } = makeSystem();
    expect(system.registerWorld('world-1', 1000n, -5001)).toBe('invalid-rate');
  });

  it('allows zero population', () => {
    const { system } = makeSystem();
    expect(typeof system.registerWorld('world-1', 0n, 100)).toBe('object');
  });
});

// ── tier classification ───────────────────────────────────────────────────────

describe('tier classification', () => {
  const tierCases: Array<[bigint, PopulationTier]> = [
    [0n, 'SUBSISTENCE'],
    [9_999n, 'SUBSISTENCE'],
    [10_000n, 'DEVELOPING'],
    [100_000n, 'ESTABLISHED'],
    [1_000_000n, 'PROSPEROUS'],
    [10_000_000n, 'DOMINANT'],
  ];

  for (const [pop, expectedTier] of tierCases) {
    it(`classifies ${String(pop)} population as ${expectedTier}`, () => {
      const { system } = makeSystem();
      system.registerWorld('world-x', pop, 0);
      expect(system.getRecord('world-x')?.tier).toBe(expectedTier);
    });
  }
});

// ── updatePopulation ──────────────────────────────────────────────────────────

describe('updatePopulation', () => {
  it('updates population and recalculates tier', () => {
    const { system } = makeWorldSystem();
    system.updatePopulation('world-1', 2_000_000n);
    const record = system.getRecord('world-1');
    expect(record?.totalPopulation).toBe(2_000_000n);
    expect(record?.tier).toBe('PROSPEROUS');
  });

  it('returns world-not-found for unknown world', () => {
    const { system } = makeSystem();
    const result = system.updatePopulation('ghost', 100n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('world-not-found');
  });

  it('returns invalid-population for negative population', () => {
    const { system } = makeWorldSystem();
    const result = system.updatePopulation('world-1', -1n);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-population');
  });
});

// ── setGrowthRate ─────────────────────────────────────────────────────────────

describe('setGrowthRate', () => {
  it('sets a valid growth rate', () => {
    const { system } = makeWorldSystem();
    system.setGrowthRate('world-1', -200);
    expect(system.getRecord('world-1')?.growthRateBps).toBe(-200);
  });

  it('returns world-not-found for unknown world', () => {
    const { system } = makeSystem();
    const result = system.setGrowthRate('ghost', 100);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('world-not-found');
  });

  it('returns invalid-rate for out-of-range value', () => {
    const { system } = makeWorldSystem();
    const result = system.setGrowthRate('world-1', 20000);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-rate');
  });
});

// ── setProductivityIndex ──────────────────────────────────────────────────────

describe('setProductivityIndex', () => {
  it('sets a valid productivity index', () => {
    const { system } = makeWorldSystem();
    system.setProductivityIndex('world-1', 1.5);
    expect(system.getRecord('world-1')?.productivityIndex).toBe(1.5);
  });

  it('returns invalid-rate for index below 0.5', () => {
    const { system } = makeWorldSystem();
    const result = system.setProductivityIndex('world-1', 0.4);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-rate');
  });

  it('returns invalid-rate for index above 2.0', () => {
    const { system } = makeWorldSystem();
    const result = system.setProductivityIndex('world-1', 2.1);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-rate');
  });

  it('returns world-not-found for unknown world', () => {
    const { system } = makeSystem();
    const result = system.setProductivityIndex('ghost', 1.0);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('world-not-found');
  });
});

// ── takeSnapshot ──────────────────────────────────────────────────────────────

describe('takeSnapshot', () => {
  it('takes a snapshot of current population state', () => {
    const { system } = makeWorldSystem('world-1', 200_000n);
    const result = system.takeSnapshot('world-1');
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.worldId).toBe('world-1');
      expect(result.population).toBe(200_000n);
      expect(result.tier).toBe('ESTABLISHED');
    }
  });

  it('returns world-not-found for unknown world', () => {
    const { system } = makeSystem();
    expect(system.takeSnapshot('ghost')).toBe('world-not-found');
  });

  it('appends to snapshot history', () => {
    const { system } = makeWorldSystem();
    system.takeSnapshot('world-1');
    system.takeSnapshot('world-1');
    expect(system.listSnapshots('world-1').length).toBe(2);
  });
});

// ── simulateGrowth ────────────────────────────────────────────────────────────

describe('simulateGrowth', () => {
  it('simulates zero years with no change', () => {
    const { system } = makeWorldSystem('world-1', 1_000_000n, 200);
    const result = system.simulateGrowth('world-1', 0);
    expect(result.success).toBe(true);
    if (result.success) expect(result.projectedPopulation).toBe(1_000_000n);
  });

  it('simulates positive growth', () => {
    const { system } = makeWorldSystem('world-1', 1_000_000n, 200);
    const result = system.simulateGrowth('world-1', 1);
    expect(result.success).toBe(true);
    if (result.success) expect(result.projectedPopulation).toBeGreaterThan(1_000_000n);
  });

  it('simulates decline with negative growth rate', () => {
    const { system } = makeWorldSystem('world-1', 1_000_000n, -500);
    const result = system.simulateGrowth('world-1', 1);
    expect(result.success).toBe(true);
    if (result.success) expect(result.projectedPopulation).toBeLessThan(1_000_000n);
  });

  it('returns world-not-found for unknown world', () => {
    const { system } = makeSystem();
    const result = system.simulateGrowth('ghost', 5);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('world-not-found');
  });

  it('returns invalid-rate for negative years', () => {
    const { system } = makeWorldSystem();
    const result = system.simulateGrowth('world-1', -1);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('invalid-rate');
  });
});

// ── computeEconomicOutput ─────────────────────────────────────────────────────

describe('computeEconomicOutput', () => {
  it('computes output with default productivity', () => {
    const { system } = makeWorldSystem('world-1', 1_000_000n);
    const result = system.computeEconomicOutput('world-1', 1_000_000n);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.baseOutput).toBe(1_000_000n);
      expect(result.adjustedOutput).toBeGreaterThan(0n);
      expect(result.productivityMultiplier).toBe(1.0);
    }
  });

  it('returns world-not-found for unknown world', () => {
    const { system } = makeSystem();
    expect(system.computeEconomicOutput('ghost', 1_000_000n)).toBe('world-not-found');
  });

  it('includes population multiplier clamped to [0.5, 2.0]', () => {
    const { system } = makeWorldSystem('world-1', 10_000_000n);
    const result = system.computeEconomicOutput('world-1', 1_000_000n);
    if (typeof result === 'object') {
      expect(result.populationMultiplier).toBeGreaterThanOrEqual(0.5);
      expect(result.populationMultiplier).toBeLessThanOrEqual(2.0);
    }
  });

  it('higher productivity increases output', () => {
    const { system } = makeWorldSystem('world-1', 1_000_000n);
    const before = system.computeEconomicOutput('world-1', 1_000_000n);
    system.setProductivityIndex('world-1', 2.0);
    const after = system.computeEconomicOutput('world-1', 1_000_000n);
    if (typeof before === 'object' && typeof after === 'object') {
      expect(after.adjustedOutput).toBeGreaterThanOrEqual(before.adjustedOutput);
    }
  });
});
