import { describe, it, expect } from 'vitest';
import { createWorldResourceMap } from '../world-resource-map.js';
import type { WorldResourceDeps } from '../world-resource-map.js';

function createDeps(): WorldResourceDeps {
  let time = 1000;
  let id = 0;
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: { next: () => 'res-' + String(id++) },
  };
}

describe('WorldResourceMap — register / getDeposit', () => {
  it('registers a resource deposit', () => {
    const rmap = createWorldResourceMap(createDeps());
    const d = rmap.register({
      worldId: 'terra',
      resourceType: 'mineral',
      name: 'iron-vein',
      quantity: 10000,
    });
    expect(d.depositId).toBe('res-0');
    expect(d.worldId).toBe('terra');
    expect(d.remainingQuantity).toBe(10000);
  });

  it('retrieves a deposit by id', () => {
    const rmap = createWorldResourceMap(createDeps());
    const d = rmap.register({
      worldId: 'terra',
      resourceType: 'energy',
      name: 'solar',
      quantity: 500,
    });
    expect(rmap.getDeposit(d.depositId)).toBeDefined();
  });

  it('returns undefined for unknown deposit', () => {
    const rmap = createWorldResourceMap(createDeps());
    expect(rmap.getDeposit('nope')).toBeUndefined();
  });
});

describe('WorldResourceMap — extract', () => {
  it('extracts resources from a deposit', () => {
    const rmap = createWorldResourceMap(createDeps());
    const d = rmap.register({
      worldId: 'terra',
      resourceType: 'mineral',
      name: 'iron',
      quantity: 100,
    });
    const result = rmap.extract(d.depositId, 30);
    expect(result).toBeDefined();
    expect(result?.extracted).toBe(30);
    expect(result?.remaining).toBe(70);
    expect(result?.depleted).toBe(false);
  });

  it('caps extraction at remaining quantity', () => {
    const rmap = createWorldResourceMap(createDeps());
    const d = rmap.register({
      worldId: 'terra',
      resourceType: 'mineral',
      name: 'iron',
      quantity: 50,
    });
    const result = rmap.extract(d.depositId, 200);
    expect(result?.extracted).toBe(50);
    expect(result?.remaining).toBe(0);
    expect(result?.depleted).toBe(true);
  });

  it('returns undefined for unknown deposit', () => {
    const rmap = createWorldResourceMap(createDeps());
    expect(rmap.extract('nope', 10)).toBeUndefined();
  });
});

describe('WorldResourceMap — getByWorld / getByType / getAvailable', () => {
  it('lists all deposits for a world', () => {
    const rmap = createWorldResourceMap(createDeps());
    rmap.register({ worldId: 'terra', resourceType: 'mineral', name: 'iron', quantity: 100 });
    rmap.register({ worldId: 'terra', resourceType: 'water', name: 'lake', quantity: 500 });
    rmap.register({ worldId: 'mars', resourceType: 'gas', name: 'methane', quantity: 200 });
    expect(rmap.getByWorld('terra')).toHaveLength(2);
  });

  it('filters deposits by type', () => {
    const rmap = createWorldResourceMap(createDeps());
    rmap.register({ worldId: 'terra', resourceType: 'mineral', name: 'iron', quantity: 100 });
    rmap.register({ worldId: 'terra', resourceType: 'mineral', name: 'copper', quantity: 80 });
    rmap.register({ worldId: 'terra', resourceType: 'water', name: 'lake', quantity: 500 });
    expect(rmap.getByType('terra', 'mineral')).toHaveLength(2);
  });

  it('lists only available (non-depleted) deposits', () => {
    const rmap = createWorldResourceMap(createDeps());
    const d1 = rmap.register({
      worldId: 'terra',
      resourceType: 'mineral',
      name: 'iron',
      quantity: 10,
    });
    rmap.register({ worldId: 'terra', resourceType: 'water', name: 'lake', quantity: 500 });
    rmap.extract(d1.depositId, 10);
    expect(rmap.getAvailable('terra')).toHaveLength(1);
  });
});

describe('WorldResourceMap — getStats', () => {
  it('reports resource statistics', () => {
    const rmap = createWorldResourceMap(createDeps());
    const d1 = rmap.register({
      worldId: 'terra',
      resourceType: 'mineral',
      name: 'iron',
      quantity: 10,
    });
    rmap.register({ worldId: 'mars', resourceType: 'gas', name: 'co2', quantity: 300 });
    rmap.extract(d1.depositId, 10);
    const stats = rmap.getStats();
    expect(stats.trackedWorlds).toBe(2);
    expect(stats.totalDeposits).toBe(2);
    expect(stats.depletedDeposits).toBe(1);
  });
});
