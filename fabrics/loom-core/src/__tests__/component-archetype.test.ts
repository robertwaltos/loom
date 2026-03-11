import { describe, it, expect } from 'vitest';
import { createArchetypeStore } from '../component-archetype.js';
import type { ArchetypeStoreDeps, ArchetypeQueryResult } from '../component-archetype.js';

function makeDeps(overrides?: Partial<ArchetypeStoreDeps>): ArchetypeStoreDeps {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    ...overrides,
  };
}

describe('ArchetypeStore — entity management', () => {
  it('adds an entity', () => {
    const store = createArchetypeStore(makeDeps());
    expect(store.addEntity('e-1')).toBe(true);
    expect(store.getStats().totalEntities).toBe(1);
  });

  it('rejects duplicate entity', () => {
    const store = createArchetypeStore(makeDeps());
    store.addEntity('e-1');
    expect(store.addEntity('e-1')).toBe(false);
  });

  it('removes an entity', () => {
    const store = createArchetypeStore(makeDeps());
    store.addEntity('e-1');
    expect(store.removeEntity('e-1')).toBe(true);
    expect(store.getStats().totalEntities).toBe(0);
  });

  it('returns false when removing unknown entity', () => {
    const store = createArchetypeStore(makeDeps());
    expect(store.removeEntity('unknown')).toBe(false);
  });
});

describe('ArchetypeStore — component operations', () => {
  it('sets a component on an entity', () => {
    const store = createArchetypeStore(makeDeps());
    store.addEntity('e-1');
    expect(store.setComponent('e-1', 'position', { x: 1, y: 2 })).toBe(true);
    expect(store.getComponent('e-1', 'position')).toEqual({ x: 1, y: 2 });
  });

  it('returns false setting component on unknown entity', () => {
    const store = createArchetypeStore(makeDeps());
    expect(store.setComponent('unknown', 'position', {})).toBe(false);
  });

  it('checks component existence', () => {
    const store = createArchetypeStore(makeDeps());
    store.addEntity('e-1');
    store.setComponent('e-1', 'health', 100);
    expect(store.hasComponent('e-1', 'health')).toBe(true);
    expect(store.hasComponent('e-1', 'mana')).toBe(false);
  });

  it('removes a component', () => {
    const store = createArchetypeStore(makeDeps());
    store.addEntity('e-1');
    store.setComponent('e-1', 'position', { x: 0 });
    expect(store.removeComponent('e-1', 'position')).toBe(true);
    expect(store.hasComponent('e-1', 'position')).toBe(false);
  });

  it('returns false removing non-existent component', () => {
    const store = createArchetypeStore(makeDeps());
    store.addEntity('e-1');
    expect(store.removeComponent('e-1', 'missing')).toBe(false);
  });

  it('returns undefined for component on unknown entity', () => {
    const store = createArchetypeStore(makeDeps());
    expect(store.getComponent('unknown', 'pos')).toBeUndefined();
  });

  it('returns false for hasComponent on unknown entity', () => {
    const store = createArchetypeStore(makeDeps());
    expect(store.hasComponent('unknown', 'pos')).toBe(false);
  });
});

describe('ArchetypeStore — archetype migration', () => {
  it('migrates entity when component added', () => {
    const store = createArchetypeStore(makeDeps());
    store.addEntity('e-1');
    const before = store.getEntityArchetype('e-1');
    expect(before?.componentTypes).toEqual([]);
    store.setComponent('e-1', 'position', { x: 0 });
    const after = store.getEntityArchetype('e-1');
    expect(after?.componentTypes).toContain('position');
  });

  it('migrates entity when component removed', () => {
    const store = createArchetypeStore(makeDeps());
    store.addEntity('e-1');
    store.setComponent('e-1', 'position', { x: 0 });
    store.setComponent('e-1', 'velocity', { vx: 1 });
    store.removeComponent('e-1', 'velocity');
    const arch = store.getEntityArchetype('e-1');
    expect(arch?.componentTypes).toEqual(['position']);
  });

  it('tracks migration count', () => {
    const store = createArchetypeStore(makeDeps());
    store.addEntity('e-1');
    store.setComponent('e-1', 'position', {});
    store.setComponent('e-1', 'velocity', {});
    expect(store.getStats().totalMigrations).toBe(2);
  });

  it('entities with same components share archetype key', () => {
    const store = createArchetypeStore(makeDeps());
    store.addEntity('e-1');
    store.addEntity('e-2');
    store.setComponent('e-1', 'position', { x: 0 });
    store.setComponent('e-1', 'health', 100);
    store.setComponent('e-2', 'health', 200);
    store.setComponent('e-2', 'position', { x: 5 });
    const a1 = store.getEntityArchetype('e-1');
    const a2 = store.getEntityArchetype('e-2');
    expect(a1?.key).toBe(a2?.key);
  });

  it('does not migrate when updating existing component data', () => {
    const store = createArchetypeStore(makeDeps());
    store.addEntity('e-1');
    store.setComponent('e-1', 'position', { x: 0 });
    const migrationsBefore = store.getStats().totalMigrations;
    store.setComponent('e-1', 'position', { x: 10 });
    expect(store.getStats().totalMigrations).toBe(migrationsBefore);
  });
});

describe('ArchetypeStore — queries', () => {
  it('queries entities with required components', () => {
    const store = createArchetypeStore(makeDeps());
    store.addEntity('e-1');
    store.addEntity('e-2');
    store.addEntity('e-3');
    store.setComponent('e-1', 'position', { x: 0 });
    store.setComponent('e-1', 'velocity', { vx: 1 });
    store.setComponent('e-2', 'position', { x: 5 });
    store.setComponent('e-3', 'velocity', { vx: 2 });
    const results = store.queryByComponents(['position', 'velocity']);
    expect(results).toHaveLength(1);
    expect(results[0]?.entityId).toBe('e-1');
  });

  it('returns all entities when querying with no required', () => {
    const store = createArchetypeStore(makeDeps());
    store.addEntity('e-1');
    store.addEntity('e-2');
    const results = store.queryByComponents([]);
    expect(results).toHaveLength(2);
  });

  it('returns empty for no matching entities', () => {
    const store = createArchetypeStore(makeDeps());
    store.addEntity('e-1');
    store.setComponent('e-1', 'position', {});
    const results = store.queryByComponents(['health']);
    expect(results).toHaveLength(0);
  });

  it('query results include component data', () => {
    const store = createArchetypeStore(makeDeps());
    store.addEntity('e-1');
    store.setComponent('e-1', 'health', 100);
    const results = store.queryByComponents(['health']);
    expect(results[0]?.components.get('health')).toBe(100);
  });

  it('returns undefined archetype for unknown entity', () => {
    const store = createArchetypeStore(makeDeps());
    expect(store.getEntityArchetype('unknown')).toBeUndefined();
  });
});

describe('ArchetypeStore — iteration', () => {
  it('iterates entities in an archetype', () => {
    const store = createArchetypeStore(makeDeps());
    store.addEntity('e-1');
    store.addEntity('e-2');
    store.setComponent('e-1', 'position', { x: 1 });
    store.setComponent('e-2', 'position', { x: 2 });
    const arch = store.getEntityArchetype('e-1');
    const visited: string[] = [];
    const count = store.iterateArchetype(arch?.key ?? '', (eid) => {
      visited.push(eid);
    });
    expect(count).toBe(2);
    expect(visited).toContain('e-1');
    expect(visited).toContain('e-2');
  });

  it('returns 0 for unknown archetype key', () => {
    const store = createArchetypeStore(makeDeps());
    expect(store.iterateArchetype('nonexistent', () => {})).toBe(0);
  });
});

describe('ArchetypeStore — chunks', () => {
  it('creates chunks with configured capacity', () => {
    const store = createArchetypeStore(makeDeps({ chunkCapacity: 2 }));
    store.addEntity('e-1');
    store.addEntity('e-2');
    store.addEntity('e-3');
    const arch = store.getEntityArchetype('e-1');
    const chunks = store.getArchetypeChunks(arch?.key ?? '');
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0]?.capacity).toBe(2);
  });

  it('returns empty chunks for unknown archetype', () => {
    const store = createArchetypeStore(makeDeps());
    expect(store.getArchetypeChunks('unknown')).toHaveLength(0);
  });

  it('removes empty chunks when entities are removed', () => {
    const store = createArchetypeStore(makeDeps({ chunkCapacity: 1 }));
    store.addEntity('e-1');
    store.addEntity('e-2');
    const archKey = store.getEntityArchetype('e-1')?.key ?? '';
    store.removeEntity('e-1');
    const chunks = store.getArchetypeChunks(archKey);
    const allNonEmpty = chunks.every((c) => c.entityCount > 0);
    expect(allNonEmpty).toBe(true);
  });
});

describe('ArchetypeStore — stats', () => {
  it('starts with zero stats', () => {
    const store = createArchetypeStore(makeDeps());
    const stats = store.getStats();
    expect(stats.totalEntities).toBe(0);
    expect(stats.archetypeCount).toBe(0);
    expect(stats.totalMigrations).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const store = createArchetypeStore(makeDeps({ chunkCapacity: 16 }));
    store.addEntity('e-1');
    store.addEntity('e-2');
    store.setComponent('e-1', 'position', {});
    store.setComponent('e-2', 'position', {});
    const stats = store.getStats();
    expect(stats.totalEntities).toBe(2);
    expect(stats.archetypeCount).toBeGreaterThanOrEqual(1);
    expect(stats.chunkCapacity).toBe(16);
  });

  it('returns archetype info', () => {
    const store = createArchetypeStore(makeDeps());
    store.addEntity('e-1');
    store.setComponent('e-1', 'position', {});
    const arch = store.getEntityArchetype('e-1');
    const info = store.getArchetype(arch?.key ?? '');
    expect(info?.entityCount).toBe(1);
    expect(info?.id.componentTypes).toContain('position');
  });

  it('returns undefined for unknown archetype', () => {
    const store = createArchetypeStore(makeDeps());
    expect(store.getArchetype('unknown')).toBeUndefined();
  });
});
