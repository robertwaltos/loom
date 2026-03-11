import { describe, it, expect } from 'vitest';
import { createSnapshotBuilder } from '../snapshot-builder.js';
import type { EntityQueryPort, ComponentQueryPort, SnapshotEntity } from '../snapshot-builder.js';
import type { ConnectionInfo } from '../connection.js';

function activeConnection(overrides: Partial<ConnectionInfo> = {}): ConnectionInfo {
  return {
    connectionId: 'conn-1',
    clientId: 'client-1',
    state: 'active',
    playerEntityId: 'player-1',
    worldId: 'terra',
    platform: 'test',
    renderingTier: 'high',
    connectedAt: 1000,
    lastInputSequence: 5,
    lastInputAt: 2000,
    messagesReceived: 10,
    messagesSent: 20,
    ...overrides,
  };
}

function fakeEntityQuery(entities: SnapshotEntity[]): EntityQueryPort {
  return {
    queryByWorld: (worldId) => entities.filter((e) => e.worldId === worldId),
  };
}

function fakeComponentQuery(data: Record<string, Record<string, unknown>>): ComponentQueryPort {
  return {
    getComponents: (entityId) => data[entityId] ?? {},
  };
}

describe('SnapshotBuilder empty world', () => {
  it('returns empty snapshot for world with no entities', () => {
    const builder = createSnapshotBuilder({
      entityQuery: fakeEntityQuery([]),
      componentQuery: fakeComponentQuery({}),
    });

    const snapshot = builder.buildSnapshot(activeConnection(), 1, 100);
    expect(snapshot.type).toBe('server-snapshot');
    expect(snapshot.tick).toBe(1);
    expect(snapshot.timestamp).toBe(100);
    expect(snapshot.lastAckedInput).toBe(5);
    expect(snapshot.entities).toHaveLength(0);
  });

  it('returns empty snapshot when connection has no world', () => {
    const builder = createSnapshotBuilder({
      entityQuery: fakeEntityQuery([]),
      componentQuery: fakeComponentQuery({}),
    });

    const conn = activeConnection({ worldId: null });
    const snapshot = builder.buildSnapshot(conn, 1, 100);
    expect(snapshot.entities).toHaveLength(0);
  });
});

describe('SnapshotBuilder with entities', () => {
  it('includes entities from the connection world', () => {
    const entities: SnapshotEntity[] = [
      { id: 'e1', type: 'player', worldId: 'terra' },
      { id: 'e2', type: 'npc', worldId: 'terra' },
      { id: 'e3', type: 'npc', worldId: 'mars' },
    ];

    const components: Record<string, Record<string, unknown>> = {
      e1: { transform: { x: 1, y: 2, z: 3 } },
      e2: { transform: { x: 4, y: 5, z: 6 }, identity: { name: 'Guard' } },
    };

    const builder = createSnapshotBuilder({
      entityQuery: fakeEntityQuery(entities),
      componentQuery: fakeComponentQuery(components),
    });

    const snapshot = builder.buildSnapshot(activeConnection(), 42, 9999);
    expect(snapshot.entities).toHaveLength(2);

    const e1Update = snapshot.entities.find((e) => e.entityId === 'e1');
    expect(e1Update?.entityType).toBe('player');
    expect(e1Update?.components).toEqual({ transform: { x: 1, y: 2, z: 3 } });

    const e2Update = snapshot.entities.find((e) => e.entityId === 'e2');
    expect(e2Update?.entityType).toBe('npc');
    expect(e2Update?.components).toEqual({
      transform: { x: 4, y: 5, z: 6 },
      identity: { name: 'Guard' },
    });
  });

  it('filters entities by world via interest management', () => {
    const entities: SnapshotEntity[] = [
      { id: 'e1', type: 'player', worldId: 'terra' },
      { id: 'e2', type: 'npc', worldId: 'mars' },
    ];

    const builder = createSnapshotBuilder({
      entityQuery: fakeEntityQuery(entities),
      componentQuery: fakeComponentQuery({ e1: {}, e2: {} }),
    });

    const terraConn = activeConnection({ worldId: 'terra' });
    const marsConn = activeConnection({ worldId: 'mars' });

    expect(builder.buildSnapshot(terraConn, 1, 100).entities).toHaveLength(1);
    expect(builder.buildSnapshot(marsConn, 1, 100).entities).toHaveLength(1);
  });
});

describe('SnapshotBuilder buildEntityUpdates', () => {
  it('returns entity updates for a specific world', () => {
    const entities: SnapshotEntity[] = [
      { id: 'e1', type: 'player', worldId: 'terra' },
      { id: 'e2', type: 'npc', worldId: 'terra' },
    ];

    const builder = createSnapshotBuilder({
      entityQuery: fakeEntityQuery(entities),
      componentQuery: fakeComponentQuery({ e1: { hp: 100 }, e2: { hp: 50 } }),
    });

    const updates = builder.buildEntityUpdates('terra');
    expect(updates).toHaveLength(2);
  });
});
