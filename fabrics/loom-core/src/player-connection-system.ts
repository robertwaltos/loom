/**
 * player-connection-system.ts — Player entity lifecycle.
 *
 * Listens for player connection events and coordinates with the
 * SpawnSystem to create/destroy player entities. Tracks active
 * player connections and their entity mappings.
 */

import type { EntityId } from '@loom/entities-contracts';

// ── Ports ────────────────────────────────────────────────────────

interface PlayerConnectionClock {
  readonly nowMicroseconds: () => number;
}

export interface PlayerConnectionDeps {
  readonly clock: PlayerConnectionClock;
}

// ── Types ────────────────────────────────────────────────────────

export interface PlayerConnection {
  readonly connectionId: string;
  readonly playerId: string;
  readonly displayName: string;
  readonly entityId: EntityId | null;
  readonly worldId: string | null;
  readonly connectedAt: number;
  readonly state: PlayerConnectionState;
}

export type PlayerConnectionState = 'pending' | 'spawned' | 'disconnecting' | 'disconnected';

export interface ConnectPlayerParams {
  readonly connectionId: string;
  readonly playerId: string;
  readonly displayName: string;
}

export interface PlayerConnectionStats {
  readonly totalConnections: number;
  readonly activeConnections: number;
  readonly pendingConnections: number;
}

export interface PlayerConnectionSystem {
  readonly connect: (params: ConnectPlayerParams) => boolean;
  readonly markSpawned: (connectionId: string, entityId: EntityId, worldId: string) => boolean;
  readonly disconnect: (connectionId: string) => boolean;
  readonly getConnection: (connectionId: string) => PlayerConnection | undefined;
  readonly getByPlayerId: (playerId: string) => PlayerConnection | undefined;
  readonly getByEntityId: (entityId: EntityId) => PlayerConnection | undefined;
  readonly getActiveConnections: () => ReadonlyArray<PlayerConnection>;
  readonly getStats: () => PlayerConnectionStats;
}

// ── State ────────────────────────────────────────────────────────

interface ConnectionState {
  readonly deps: PlayerConnectionDeps;
  readonly connections: Map<string, MutableConnection>;
  readonly byPlayerId: Map<string, string>;
  readonly byEntityId: Map<string, string>;
}

interface MutableConnection {
  readonly connectionId: string;
  readonly playerId: string;
  readonly displayName: string;
  entityId: EntityId | null;
  worldId: string | null;
  readonly connectedAt: number;
  state: PlayerConnectionState;
}

// ── Helpers ─────────────────────────────────────────────────────

function toSnapshot(c: MutableConnection): PlayerConnection {
  return {
    connectionId: c.connectionId,
    playerId: c.playerId,
    displayName: c.displayName,
    entityId: c.entityId,
    worldId: c.worldId,
    connectedAt: c.connectedAt,
    state: c.state,
  };
}

// ── Operations ──────────────────────────────────────────────────

function connectPlayer(state: ConnectionState, params: ConnectPlayerParams): boolean {
  if (state.connections.has(params.connectionId)) return false;
  if (state.byPlayerId.has(params.playerId)) return false;
  const conn: MutableConnection = {
    connectionId: params.connectionId,
    playerId: params.playerId,
    displayName: params.displayName,
    entityId: null,
    worldId: null,
    connectedAt: state.deps.clock.nowMicroseconds(),
    state: 'pending',
  };
  state.connections.set(params.connectionId, conn);
  state.byPlayerId.set(params.playerId, params.connectionId);
  return true;
}

function markSpawned(
  state: ConnectionState,
  connectionId: string,
  entityId: EntityId,
  worldId: string,
): boolean {
  const conn = state.connections.get(connectionId);
  if (!conn || conn.state !== 'pending') return false;
  conn.entityId = entityId;
  conn.worldId = worldId;
  conn.state = 'spawned';
  state.byEntityId.set(entityId, connectionId);
  return true;
}

function disconnectPlayer(state: ConnectionState, connectionId: string): boolean {
  const conn = state.connections.get(connectionId);
  if (!conn) return false;
  if (conn.state === 'disconnected') return false;
  conn.state = 'disconnected';
  state.byPlayerId.delete(conn.playerId);
  if (conn.entityId) state.byEntityId.delete(conn.entityId);
  return true;
}

function getActiveList(state: ConnectionState): ReadonlyArray<PlayerConnection> {
  const result: PlayerConnection[] = [];
  for (const conn of state.connections.values()) {
    if (conn.state === 'spawned') result.push(toSnapshot(conn));
  }
  return result;
}

function getStats(state: ConnectionState): PlayerConnectionStats {
  let active = 0;
  let pending = 0;
  for (const conn of state.connections.values()) {
    if (conn.state === 'spawned') active++;
    if (conn.state === 'pending') pending++;
  }
  return {
    totalConnections: state.connections.size,
    activeConnections: active,
    pendingConnections: pending,
  };
}

// ── Lookup Helpers ──────────────────────────────────────────────

function lookupByPlayerId(state: ConnectionState, pid: string): PlayerConnection | undefined {
  const cid = state.byPlayerId.get(pid);
  if (cid === undefined) return undefined;
  const c = state.connections.get(cid);
  return c !== undefined ? toSnapshot(c) : undefined;
}

function lookupByEntityId(
  state: ConnectionState,
  entityId: EntityId,
): PlayerConnection | undefined {
  const cid = state.byEntityId.get(entityId);
  if (cid === undefined) return undefined;
  const c = state.connections.get(cid);
  return c !== undefined ? toSnapshot(c) : undefined;
}

function lookupByConnectionId(state: ConnectionState, cid: string): PlayerConnection | undefined {
  const c = state.connections.get(cid);
  return c !== undefined ? toSnapshot(c) : undefined;
}

// ── Factory ─────────────────────────────────────────────────────

function createPlayerConnectionSystem(deps: PlayerConnectionDeps): PlayerConnectionSystem {
  const state: ConnectionState = {
    deps,
    connections: new Map(),
    byPlayerId: new Map(),
    byEntityId: new Map(),
  };
  return {
    connect: (p) => connectPlayer(state, p),
    markSpawned: (cid, eid, wid) => markSpawned(state, cid, eid, wid),
    disconnect: (cid) => disconnectPlayer(state, cid),
    getConnection: (cid) => lookupByConnectionId(state, cid),
    getByPlayerId: (pid) => lookupByPlayerId(state, pid),
    getByEntityId: (eid) => lookupByEntityId(state, eid),
    getActiveConnections: () => getActiveList(state),
    getStats: () => getStats(state),
  };
}

// ── Exports ─────────────────────────────────────────────────────

export { createPlayerConnectionSystem };
