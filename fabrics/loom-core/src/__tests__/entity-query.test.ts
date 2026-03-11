import { describe, it, expect } from 'vitest';
import { createEntityQueryEngine } from '../entity-query.js';
import type { EntityQueryDeps } from '../entity-query.js';

interface MockEntity {
  readonly id: string;
  readonly worldId: string | null;
  readonly components: Map<string, unknown>;
}

function buildDeps(entities: ReadonlyArray<MockEntity>): EntityQueryDeps {
  const entityMap = new Map<string, MockEntity>();
  for (const e of entities) {
    entityMap.set(e.id, e);
  }

  return {
    components: {
      has: (eid, ct) => entityMap.get(eid)?.components.has(ct) ?? false,
      listComponents: (eid) => [...(entityMap.get(eid)?.components.keys() ?? [])],
      findEntitiesWith: (ct) => {
        const result: string[] = [];
        for (const e of entities) {
          if (e.components.has(ct)) result.push(e.id);
        }
        return result;
      },
    },
    entities: {
      getAllEntityIds: () => entities.map((e) => e.id),
    },
    worlds: {
      getEntityWorld: (eid) => entityMap.get(eid)?.worldId ?? null,
    },
  };
}

function entity(id: string, worldId: string | null, components: ReadonlyArray<string>): MockEntity {
  const map = new Map<string, unknown>();
  for (const c of components) {
    map.set(c, {});
  }
  return { id, worldId, components: map };
}

const SAMPLE_ENTITIES: ReadonlyArray<MockEntity> = [
  entity('e1', 'world-1', ['Position', 'Health', 'Inventory']),
  entity('e2', 'world-1', ['Position', 'Health']),
  entity('e3', 'world-2', ['Position', 'AI', 'Inventory']),
  entity('e4', 'world-2', ['Position']),
  entity('e5', null, ['UI', 'Settings']),
];

describe('EntityQueryEngine — withAll queries', () => {
  it('finds entities with all specified components', () => {
    const engine = createEntityQueryEngine(buildDeps(SAMPLE_ENTITIES));
    const results = engine.query({ withAll: ['Position', 'Health'] });
    expect(results).toHaveLength(2);
    const ids = results.map((r) => r.entityId);
    expect(ids).toContain('e1');
    expect(ids).toContain('e2');
  });

  it('returns empty when no entity has all components', () => {
    const engine = createEntityQueryEngine(buildDeps(SAMPLE_ENTITIES));
    const results = engine.query({ withAll: ['Health', 'AI'] });
    expect(results).toHaveLength(0);
  });

  it('single component withAll acts like basic filter', () => {
    const engine = createEntityQueryEngine(buildDeps(SAMPLE_ENTITIES));
    const results = engine.query({ withAll: ['AI'] });
    expect(results).toHaveLength(1);
    expect(results[0]?.entityId).toBe('e3');
  });
});

describe('EntityQueryEngine — withAny queries', () => {
  it('finds entities with any specified component', () => {
    const engine = createEntityQueryEngine(buildDeps(SAMPLE_ENTITIES));
    const results = engine.query({ withAny: ['AI', 'UI'] });
    expect(results).toHaveLength(2);
    const ids = results.map((r) => r.entityId);
    expect(ids).toContain('e3');
    expect(ids).toContain('e5');
  });

  it('does not duplicate entities matching multiple', () => {
    const engine = createEntityQueryEngine(buildDeps(SAMPLE_ENTITIES));
    const results = engine.query({ withAny: ['Position', 'Health'] });
    const ids = results.map((r) => r.entityId);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

describe('EntityQueryEngine — without filter', () => {
  it('excludes entities with specified components', () => {
    const engine = createEntityQueryEngine(buildDeps(SAMPLE_ENTITIES));
    const results = engine.query({
      withAll: ['Position'],
      without: ['AI'],
    });
    const ids = results.map((r) => r.entityId);
    expect(ids).not.toContain('e3');
    expect(ids).toContain('e1');
    expect(ids).toContain('e2');
    expect(ids).toContain('e4');
  });

  it('empty without array does not filter', () => {
    const engine = createEntityQueryEngine(buildDeps(SAMPLE_ENTITIES));
    const all = engine.query({ withAll: ['Position'] });
    const withEmpty = engine.query({ withAll: ['Position'], without: [] });
    expect(withEmpty).toHaveLength(all.length);
  });
});

describe('EntityQueryEngine — world filter', () => {
  it('filters to a specific world', () => {
    const engine = createEntityQueryEngine(buildDeps(SAMPLE_ENTITIES));
    const results = engine.query({
      withAll: ['Position'],
      inWorld: 'world-1',
    });
    expect(results).toHaveLength(2);
    expect(results[0]?.worldId).toBe('world-1');
    expect(results[1]?.worldId).toBe('world-1');
  });

  it('world filter excludes null-world entities', () => {
    const engine = createEntityQueryEngine(buildDeps(SAMPLE_ENTITIES));
    const results = engine.query({ inWorld: 'world-1' });
    const ids = results.map((r) => r.entityId);
    expect(ids).not.toContain('e5');
  });
});

describe('EntityQueryEngine — limit', () => {
  it('respects limit on query results', () => {
    const engine = createEntityQueryEngine(buildDeps(SAMPLE_ENTITIES));
    const results = engine.query({ withAll: ['Position'], limit: 2 });
    expect(results).toHaveLength(2);
  });

  it('returns fewer than limit when not enough matches', () => {
    const engine = createEntityQueryEngine(buildDeps(SAMPLE_ENTITIES));
    const results = engine.query({ withAll: ['AI'], limit: 100 });
    expect(results).toHaveLength(1);
  });
});

describe('EntityQueryEngine — count', () => {
  it('counts matching entities without materializing', () => {
    const engine = createEntityQueryEngine(buildDeps(SAMPLE_ENTITIES));
    expect(engine.count({ withAll: ['Position'] })).toBe(4);
    expect(engine.count({ withAll: ['Health'] })).toBe(2);
    expect(engine.count({ withAny: ['UI', 'AI'] })).toBe(2);
  });

  it('count respects world filter', () => {
    const engine = createEntityQueryEngine(buildDeps(SAMPLE_ENTITIES));
    expect(engine.count({ withAll: ['Position'], inWorld: 'world-2' })).toBe(2);
  });
});

describe('EntityQueryEngine — result metadata', () => {
  it('includes component list in results', () => {
    const engine = createEntityQueryEngine(buildDeps(SAMPLE_ENTITIES));
    const results = engine.query({ withAll: ['Position', 'Inventory'] });
    const e1Result = results.find((r) => r.entityId === 'e1');
    expect(e1Result?.components).toContain('Position');
    expect(e1Result?.components).toContain('Health');
    expect(e1Result?.components).toContain('Inventory');
  });

  it('includes worldId in results', () => {
    const engine = createEntityQueryEngine(buildDeps(SAMPLE_ENTITIES));
    const results = engine.query({ withAll: ['UI'] });
    expect(results[0]?.worldId).toBeNull();
  });
});

describe('EntityQueryEngine — stats', () => {
  it('starts with zero stats', () => {
    const engine = createEntityQueryEngine(buildDeps(SAMPLE_ENTITIES));
    const stats = engine.getStats();
    expect(stats.totalQueries).toBe(0);
    expect(stats.totalResults).toBe(0);
    expect(stats.averageResultSize).toBe(0);
  });

  it('tracks query count and results', () => {
    const engine = createEntityQueryEngine(buildDeps(SAMPLE_ENTITIES));
    engine.query({ withAll: ['Position'] });
    engine.query({ withAll: ['Health'] });

    const stats = engine.getStats();
    expect(stats.totalQueries).toBe(2);
    expect(stats.totalResults).toBe(6);
    expect(stats.averageResultSize).toBe(3);
  });

  it('tracks count() calls as queries', () => {
    const engine = createEntityQueryEngine(buildDeps(SAMPLE_ENTITIES));
    engine.count({ withAll: ['Position'] });

    const stats = engine.getStats();
    expect(stats.totalQueries).toBe(1);
    expect(stats.totalResults).toBe(4);
  });
});

describe('EntityQueryEngine — empty queries', () => {
  it('returns all entities with empty descriptor', () => {
    const engine = createEntityQueryEngine(buildDeps(SAMPLE_ENTITIES));
    const results = engine.query({});
    expect(results).toHaveLength(5);
  });

  it('handles empty entity set', () => {
    const engine = createEntityQueryEngine(buildDeps([]));
    const results = engine.query({ withAll: ['Position'] });
    expect(results).toHaveLength(0);
  });
});
