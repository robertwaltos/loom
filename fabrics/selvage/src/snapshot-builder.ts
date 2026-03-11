/**
 * Snapshot Builder — Builds per-client state snapshots from ECS data.
 *
 * MVP Target Path T0.1: Each tick, the server builds a snapshot for
 * every connected client containing only the entities they should see
 * (interest management).
 *
 * Interest filtering: clients receive entities in the same world.
 * Locale-level filtering comes in T1.1.
 */

import type { EntityUpdate, ServerSnapshot } from './server-protocol.js';
import type { ConnectionInfo } from './connection.js';

// ─── Ports ──────────────────────────────────────────────────────

export interface EntityQueryPort {
  queryByWorld(worldId: string): ReadonlyArray<SnapshotEntity>;
}

export interface ComponentQueryPort {
  getComponents(entityId: string): Record<string, unknown>;
}

export interface SnapshotEntity {
  readonly id: string;
  readonly type: string;
  readonly worldId: string;
}

// ─── Snapshot Builder ───────────────────────────────────────────

export interface SnapshotBuilder {
  buildSnapshot(connection: ConnectionInfo, tick: number, timestamp: number): ServerSnapshot;
  buildEntityUpdates(worldId: string): ReadonlyArray<EntityUpdate>;
}

export function createSnapshotBuilder(deps: {
  readonly entityQuery: EntityQueryPort;
  readonly componentQuery: ComponentQueryPort;
}): SnapshotBuilder {
  return {
    buildSnapshot: (conn, tick, timestamp) => buildSnapshotImpl(deps, conn, tick, timestamp),
    buildEntityUpdates: (worldId) => buildUpdatesImpl(deps, worldId),
  };
}

function buildSnapshotImpl(
  deps: {
    readonly entityQuery: EntityQueryPort;
    readonly componentQuery: ComponentQueryPort;
  },
  connection: ConnectionInfo,
  tick: number,
  timestamp: number,
): ServerSnapshot {
  const worldId = connection.worldId;
  if (worldId === null) {
    return emptySnapshot(tick, timestamp, connection.lastInputSequence);
  }

  const entities = buildUpdatesImpl(deps, worldId);

  return {
    type: 'server-snapshot',
    tick,
    timestamp,
    lastAckedInput: connection.lastInputSequence,
    entities,
  };
}

function buildUpdatesImpl(
  deps: {
    readonly entityQuery: EntityQueryPort;
    readonly componentQuery: ComponentQueryPort;
  },
  worldId: string,
): EntityUpdate[] {
  const worldEntities = deps.entityQuery.queryByWorld(worldId);
  const updates: EntityUpdate[] = [];

  for (const entity of worldEntities) {
    const components = deps.componentQuery.getComponents(entity.id);
    updates.push({
      entityId: entity.id,
      entityType: entity.type,
      components,
    });
  }

  return updates;
}

function emptySnapshot(tick: number, timestamp: number, lastAckedInput: number): ServerSnapshot {
  return {
    type: 'server-snapshot',
    tick,
    timestamp,
    lastAckedInput,
    entities: [],
  };
}
