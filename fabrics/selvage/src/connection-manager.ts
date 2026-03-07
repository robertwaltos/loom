/**
 * Connection Manager — Client lifecycle orchestration.
 *
 * MVP Target Path T0.1: Manages all connected clients.
 * Handles handshake flow, player entity creation/destruction,
 * and input acknowledgement tracking.
 *
 * Ports pattern: depends on abstract interfaces, not loom-core directly.
 * The application layer wires real implementations.
 */

import type { ClientHello } from './server-protocol.js';
import {
  createConnection,
  connectionToInfo,
  type MutableConnection,
  type ConnectionInfo,
} from './connection.js';
import {
  connectionNotFound,
  duplicateClientId,
  connectionNotActive,
  handshakeAlreadyComplete,
} from './selvage-errors.js';

// ─── Ports (what we need from The Loom) ─────────────────────────

export interface PlayerEntityPort {
  spawnPlayer(connectionId: string, worldId: string): string;
  despawnPlayer(entityId: string): void;
}

export interface ClockPort {
  nowMicroseconds(): number;
}

export interface IdPort {
  generate(): string;
}

export interface LogPort {
  info(context: Record<string, unknown>, message: string): void;
  warn(context: Record<string, unknown>, message: string): void;
}

// ─── Connection Manager Interface ───────────────────────────────

export interface ConnectionManager {
  acceptConnection(): string;
  completeHandshake(connectionId: string, hello: ClientHello): HandshakeResult;
  recordInput(connectionId: string, sequence: number): void;
  disconnect(connectionId: string, reason: string): DisconnectResult;
  getConnection(connectionId: string): ConnectionInfo;
  tryGetConnection(connectionId: string): ConnectionInfo | undefined;
  listActive(): ReadonlyArray<ConnectionInfo>;
  count(): number;
  countActive(): number;
}

export interface HandshakeResult {
  readonly playerEntityId: string;
  readonly worldId: string;
}

export interface DisconnectResult {
  readonly playerEntityId: string | null;
  readonly wasActive: boolean;
}

// ─── State ──────────────────────────────────────────────────────

interface ManagerState {
  readonly connections: Map<string, MutableConnection>;
  readonly clientIdIndex: Map<string, string>;
  readonly playerEntities: PlayerEntityPort;
  readonly clock: ClockPort;
  readonly idGenerator: IdPort;
  readonly logger: LogPort;
  readonly defaultWorldId: string;
}

// ─── Factory ────────────────────────────────────────────────────

export function createConnectionManager(deps: {
  readonly playerEntities: PlayerEntityPort;
  readonly clock: ClockPort;
  readonly idGenerator: IdPort;
  readonly logger: LogPort;
  readonly defaultWorldId: string;
}): ConnectionManager {
  const state: ManagerState = {
    connections: new Map(),
    clientIdIndex: new Map(),
    playerEntities: deps.playerEntities,
    clock: deps.clock,
    idGenerator: deps.idGenerator,
    logger: deps.logger,
    defaultWorldId: deps.defaultWorldId,
  };

  return {
    acceptConnection: () => acceptImpl(state),
    completeHandshake: (id, hello) => handshakeImpl(state, id, hello),
    recordInput: (id, seq) => {
      recordInputImpl(state, id, seq);
    },
    disconnect: (id, reason) => disconnectImpl(state, id, reason),
    getConnection: (id) => getImpl(state, id),
    tryGetConnection: (id) => tryGetImpl(state, id),
    listActive: () => listActiveImpl(state),
    count: () => state.connections.size,
    countActive: () => countActiveImpl(state),
  };
}

// ─── Implementations ────────────────────────────────────────────

function acceptImpl(state: ManagerState): string {
  const connectionId = state.idGenerator.generate();
  const conn = createConnection(connectionId, state.clock.nowMicroseconds());
  conn.state = 'handshaking';
  state.connections.set(connectionId, conn);

  state.logger.info({ connectionId }, 'Connection accepted, awaiting handshake');
  return connectionId;
}

function handshakeImpl(
  state: ManagerState,
  connectionId: string,
  hello: ClientHello,
): HandshakeResult {
  const conn = getMutable(state, connectionId);
  if (conn.state === 'active') throw handshakeAlreadyComplete(connectionId);

  if (state.clientIdIndex.has(hello.clientId)) {
    throw duplicateClientId(hello.clientId);
  }

  conn.clientId = hello.clientId;
  conn.platform = hello.platform;
  conn.renderingTier = hello.renderingTier;
  conn.worldId = state.defaultWorldId;

  const playerEntityId = state.playerEntities.spawnPlayer(connectionId, state.defaultWorldId);
  conn.playerEntityId = playerEntityId;
  conn.state = 'active';

  state.clientIdIndex.set(hello.clientId, connectionId);

  state.logger.info(
    { connectionId, clientId: hello.clientId, playerEntityId },
    'Handshake complete, player spawned',
  );

  return { playerEntityId, worldId: state.defaultWorldId };
}

function recordInputImpl(state: ManagerState, connectionId: string, sequence: number): void {
  const conn = getMutable(state, connectionId);
  if (conn.state !== 'active') throw connectionNotActive(connectionId);
  conn.lastInputSequence = sequence;
  conn.lastInputAt = state.clock.nowMicroseconds();
  conn.messagesReceived += 1;
}

function disconnectImpl(
  state: ManagerState,
  connectionId: string,
  reason: string,
): DisconnectResult {
  const conn = state.connections.get(connectionId);
  if (conn === undefined) throw connectionNotFound(connectionId);

  const wasActive = conn.state === 'active';
  const playerEntityId = conn.playerEntityId;

  if (playerEntityId !== null) {
    state.playerEntities.despawnPlayer(playerEntityId);
  }

  if (conn.clientId !== '') {
    state.clientIdIndex.delete(conn.clientId);
  }

  state.connections.delete(connectionId);

  state.logger.info({ connectionId, reason, wasActive }, 'Connection disconnected');

  return { playerEntityId, wasActive };
}

function getImpl(state: ManagerState, connectionId: string): ConnectionInfo {
  const conn = state.connections.get(connectionId);
  if (conn === undefined) throw connectionNotFound(connectionId);
  return connectionToInfo(conn);
}

function tryGetImpl(state: ManagerState, connectionId: string): ConnectionInfo | undefined {
  const conn = state.connections.get(connectionId);
  if (conn === undefined) return undefined;
  return connectionToInfo(conn);
}

function listActiveImpl(state: ManagerState): ConnectionInfo[] {
  const result: ConnectionInfo[] = [];
  for (const conn of state.connections.values()) {
    if (conn.state === 'active') result.push(connectionToInfo(conn));
  }
  return result;
}

function countActiveImpl(state: ManagerState): number {
  let count = 0;
  for (const conn of state.connections.values()) {
    if (conn.state === 'active') count += 1;
  }
  return count;
}

function getMutable(state: ManagerState, connectionId: string): MutableConnection {
  const conn = state.connections.get(connectionId);
  if (conn === undefined) throw connectionNotFound(connectionId);
  return conn;
}
