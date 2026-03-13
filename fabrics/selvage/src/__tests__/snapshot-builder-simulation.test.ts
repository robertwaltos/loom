import { describe, it, expect } from 'vitest';
import { createSnapshotBuilder } from '../snapshot-builder.js';

type MockEntity = { id: string; worldId: string };

function makeBuilder(entities: MockEntity[]) {
  return createSnapshotBuilder({
    entityQuery: {
      queryByWorld: (worldId: string) =>
        entities
          .filter(e => e.worldId === worldId)
          .map(e => ({ id: e.id, worldId: e.worldId })),
    },
    componentQuery: {
      getComponents: (entityId: string) => ({
        transform: { x: 10, y: 20, z: 0 },
        health: { current: 100, max: 100 },
        owner: entityId,
      }),
    },
  });
}

describe('Snapshot Builder Simulation', () => {
  it('builds a snapshot for a connection with entities in the same world', () => {
    const builder = makeBuilder([
      { id: 'entity-1', worldId: 'world-A' },
      { id: 'entity-2', worldId: 'world-A' },
      { id: 'entity-3', worldId: 'world-B' },
    ]);

    const connection = { connectionId: 'conn-1', worldId: 'world-A' };
    const snapshot = builder.buildSnapshot(connection, 42, 1_000_000);

    expect(snapshot).toBeDefined();
    expect(snapshot.tick).toBe(42);
    expect(snapshot.timestamp).toBe(1_000_000);
    expect(snapshot.entities.length).toBe(2);

    const entity1 = snapshot.entities.find((e: { entityId: string }) => e.entityId === 'entity-1');
    expect(entity1).toBeDefined();
    expect((entity1 as any)?.components?.transform).toBeDefined();
  });

  it('builds an empty snapshot when no entities exist in the world', () => {
    const builder = makeBuilder([]);

    const connection = { connectionId: 'conn-solo', worldId: 'world-empty' };
    const snapshot = builder.buildSnapshot(connection, 1, 0);

    expect(snapshot.entities).toHaveLength(0);
    expect(snapshot.tick).toBe(1);
  });

  it('includes components for each entity', () => {
    const builder = makeBuilder([{ id: 'hero', worldId: 'world-C' }]);

    const connection = { connectionId: 'conn-hero', worldId: 'world-C' };
    const snapshot = builder.buildSnapshot(connection, 100, 5_000);

    const heroEntity = snapshot.entities.find((e: { entityId: string }) => e.entityId === 'hero');
    expect((heroEntity as any)?.components?.health).toEqual({ current: 100, max: 100 });
  });
});
