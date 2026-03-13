import { describe, expect, it } from 'vitest';
import { createEntityQueryEngine } from '../entity-query.js';
import type { EntityQueryDeps } from '../entity-query.js';

interface SimEntity {
  readonly id: string;
  readonly worldId: string | null;
  readonly components: Map<string, unknown>;
}

function makeEntity(id: string, worldId: string | null, componentTypes: ReadonlyArray<string>): SimEntity {
  const components = new Map<string, unknown>();
  for (const type of componentTypes) components.set(type, {});
  return { id, worldId, components };
}

function makeDeps(entities: ReadonlyArray<SimEntity>): EntityQueryDeps {
  const byId = new Map<string, SimEntity>();
  for (const entity of entities) byId.set(entity.id, entity);

  return {
    components: {
      has: (entityId, componentType) => byId.get(entityId)?.components.has(componentType) ?? false,
      listComponents: (entityId) => [...(byId.get(entityId)?.components.keys() ?? [])],
      findEntitiesWith: (componentType) =>
        entities.filter((entity) => entity.components.has(componentType)).map((entity) => entity.id),
    },
    entities: {
      getAllEntityIds: () => entities.map((entity) => entity.id),
    },
    worlds: {
      getEntityWorld: (entityId) => byId.get(entityId)?.worldId ?? null,
    },
  };
}

describe('entity-query simulation', () => {
  it('simulates world-scoped archetype querying and count telemetry', () => {
    const entities = [
      makeEntity('e1', 'w1', ['Position', 'Health', 'Inventory']),
      makeEntity('e2', 'w1', ['Position', 'Health']),
      makeEntity('e3', 'w2', ['Position', 'AI']),
      makeEntity('e4', null, ['UI']),
    ];
    const engine = createEntityQueryEngine(makeDeps(entities));

    const worldOneCombatants = engine.query({
      withAll: ['Position', 'Health'],
      without: ['AI'],
      inWorld: 'w1',
    });
    const thinkingThings = engine.count({ withAny: ['AI', 'UI'] });

    expect(worldOneCombatants).toHaveLength(2);
    expect(worldOneCombatants[0]?.components).toContain('Position');
    expect(thinkingThings).toBe(2);
    expect(engine.getStats().totalQueries).toBe(2);
  });
});
