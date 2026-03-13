/**
 * World Census - Simulation Tests
 *
 * Exercises multi-world residency dynamics and census invariants.
 */

import { describe, expect, it } from 'vitest';
import { createWorldCensusService, type WorldCensusDeps } from '../world-census.js';

function createHarness(): {
  deps: WorldCensusDeps & { advance: (us: number) => void };
  census: ReturnType<typeof createWorldCensusService>;
} {
  let now = 1_000_000;

  const deps: WorldCensusDeps & { advance: (us: number) => void } = {
    advance: (us: number) => {
      now += us;
    },
    clock: {
      nowMicroseconds: () => now,
    },
  };

  return {
    deps,
    census: createWorldCensusService(deps),
  };
}

describe('world census simulation', () => {
  it('tracks staged onboarding across multiple worlds with cap adherence', () => {
    const { census } = createHarness();

    census.registerWorld('w:alpha', 2);
    census.registerWorld('w:beta', 1);

    expect(census.addResident({ dynastyId: 'd1', worldId: 'w:alpha' })).toBe(true);
    expect(census.addResident({ dynastyId: 'd2', worldId: 'w:alpha' })).toBe(true);
    expect(census.addResident({ dynastyId: 'd3', worldId: 'w:alpha' })).toBe(false);

    expect(census.addResident({ dynastyId: 'd3', worldId: 'w:beta' })).toBe(true);
    expect(census.isWorldFull('w:alpha')).toBe(true);
    expect(census.isWorldFull('w:beta')).toBe(true);
  });

  it('preserves resident cardinality through successful migration cycles', () => {
    const { census } = createHarness();

    census.registerWorld('w1', 5);
    census.registerWorld('w2', 5);

    for (const id of ['a', 'b', 'c']) {
      census.addResident({ dynastyId: id, worldId: 'w1' });
    }

    const before = census.getStats();

    expect(census.migrate('a', 'w2')).toBeDefined();
    expect(census.migrate('b', 'w2')).toBeDefined();

    const after = census.getStats();

    expect(after.totalResidents).toBe(before.totalResidents);
    expect(after.totalMigrations).toBe(before.totalMigrations + 2);
    expect(census.getPopulation('w1')?.dynastyCount).toBe(1);
    expect(census.getPopulation('w2')?.dynastyCount).toBe(2);
  });

  it('keeps world occupancy unchanged on failed migration attempts', () => {
    const { census } = createHarness();

    census.registerWorld('origin', 2);
    census.registerWorld('target', 1);

    census.addResident({ dynastyId: 'x', worldId: 'origin' });
    census.addResident({ dynastyId: 'y', worldId: 'target' });

    const beforeOrigin = census.getPopulation('origin')?.dynastyCount;
    const beforeTarget = census.getPopulation('target')?.dynastyCount;

    const result = census.migrate('x', 'target');

    expect(result).toBeUndefined();
    expect(census.getPopulation('origin')?.dynastyCount).toBe(beforeOrigin);
    expect(census.getPopulation('target')?.dynastyCount).toBe(beforeTarget);
  });

  it('supports capacity release and refill after resident removal', () => {
    const { census } = createHarness();

    census.registerWorld('tight', 1);

    expect(census.addResident({ dynastyId: 'd1', worldId: 'tight' })).toBe(true);
    expect(census.addResident({ dynastyId: 'd2', worldId: 'tight' })).toBe(false);

    expect(census.removeResident('d1')).toBe(true);
    expect(census.addResident({ dynastyId: 'd2', worldId: 'tight' })).toBe(true);
    expect(census.getPopulation('tight')?.dynastyCount).toBe(1);
  });

  it('updates lastUpdatedAt monotonically for membership changes', () => {
    const { census, deps } = createHarness();

    census.registerWorld('time-world', 3);

    deps.advance(100);
    census.addResident({ dynastyId: 'd1', worldId: 'time-world' });
    const t1 = census.getPopulation('time-world')?.lastUpdatedAt ?? 0;

    deps.advance(100);
    census.addResident({ dynastyId: 'd2', worldId: 'time-world' });
    const t2 = census.getPopulation('time-world')?.lastUpdatedAt ?? 0;

    deps.advance(100);
    census.removeResident('d2');
    const t3 = census.getPopulation('time-world')?.lastUpdatedAt ?? 0;

    expect(t2).toBeGreaterThanOrEqual(t1);
    expect(t3).toBeGreaterThanOrEqual(t2);
  });

  it('keeps resident mapping coherent through chained migrations', () => {
    const { census } = createHarness();

    census.registerWorld('a', 2);
    census.registerWorld('b', 2);
    census.registerWorld('c', 2);

    census.addResident({ dynastyId: 'dyn', worldId: 'a' });

    expect(census.migrate('dyn', 'b')?.toWorldId).toBe('b');
    expect(census.getResidentWorld('dyn')).toBe('b');

    expect(census.migrate('dyn', 'c')?.toWorldId).toBe('c');
    expect(census.getResidentWorld('dyn')).toBe('c');
  });

  it('counts only successful migrations in aggregate stats', () => {
    const { census } = createHarness();

    census.registerWorld('x', 1);
    census.registerWorld('y', 1);
    census.registerWorld('z', 2);

    census.addResident({ dynastyId: 'd1', worldId: 'x' });
    census.addResident({ dynastyId: 'd2', worldId: 'y' });

    const s0 = census.getStats();

    expect(census.migrate('d1', 'y')).toBeUndefined();
    expect(census.migrate('missing', 'x')).toBeUndefined();
    expect(census.migrate('d1', 'z')).toBeDefined();

    const s1 = census.getStats();
    expect(s1.totalMigrations).toBe(s0.totalMigrations + 1);
  });

  it('keeps totalResidents equal to residentMap-driven occupancy after mixed operations', () => {
    const { census } = createHarness();

    census.registerWorld('wA', 3);
    census.registerWorld('wB', 3);

    census.addResident({ dynastyId: 'r1', worldId: 'wA' });
    census.addResident({ dynastyId: 'r2', worldId: 'wA' });
    census.addResident({ dynastyId: 'r3', worldId: 'wB' });

    census.migrate('r2', 'wB');
    census.removeResident('r1');

    const stats = census.getStats();
    expect(stats.totalResidents).toBe(2);

    const occupancy =
      (census.getPopulation('wA')?.dynastyCount ?? 0) + (census.getPopulation('wB')?.dynastyCount ?? 0);

    expect(occupancy).toBe(stats.totalResidents);
  });

  it('removing unknown resident is a no-op for stats and populations', () => {
    const { census } = createHarness();

    census.registerWorld('noop', 2);
    census.addResident({ dynastyId: 'known', worldId: 'noop' });

    const beforeStats = census.getStats();
    const beforePop = census.getPopulation('noop')?.dynastyCount;

    expect(census.removeResident('unknown')).toBe(false);

    const afterStats = census.getStats();
    const afterPop = census.getPopulation('noop')?.dynastyCount;

    expect(afterStats).toEqual(beforeStats);
    expect(afterPop).toBe(beforePop);
  });

  it('world count reflects registration/removal lifecycle while residents remain trackable', () => {
    const { census } = createHarness();

    census.registerWorld('legacy', 2);
    census.registerWorld('new', 2);
    census.addResident({ dynastyId: 'd-legacy', worldId: 'legacy' });

    const removed = census.removeWorld('legacy');

    expect(removed).toBe(true);
    expect(census.getPopulation('legacy')).toBeUndefined();
    expect(census.getResidentWorld('d-legacy')).toBe('legacy');
    expect(census.getStats().totalWorlds).toBe(1);
  });
});
