/**
 * Network Server — WebSocket entry point for The Loom.
 *
 * MVP Target Path T0.1: Accepts client connections, routes messages
 * to the ConnectionManager, and pushes snapshots each tick.
 *
 * Architecture: The server itself doesn't touch game state. It
 * delegates to ConnectionManager (lifecycle) and SnapshotBuilder
 * (state queries). It only knows about bytes and connections.
 *
 * This module defines the server interface and message routing logic.
 * The actual WebSocket transport is injected via TransportPort
 * (allowing tests to use in-memory transport).
 */

import type { ConnectionManager, HandshakeResult } from './connection-manager.js';
import type { SnapshotBuilder } from './snapshot-builder.js';
import type { MessageCodec } from './message-codec.js';
import type { ServerMessage, ServerWelcome, ServerSnapshot } from './server-protocol.js';
import { PROTOCOL_VERSION, isClientHello, isClientInput } from './server-protocol.js';
import { protocolVersionMismatch } from './selvage-errors.js';

// ─── Transport Port ─────────────────────────────────────────────

/** Abstract transport — WebSocket in production, in-memory in tests. */
export interface TransportPort {
  onConnection(handler: ConnectionHandler): void;
  send(connectionId: string, data: Uint8Array): void;
  close(connectionId: string, reason: string): void;
  shutdown(): void;
}

export type ConnectionHandler = (connectionId: string, handlers: TransportHandlers) => void;

export interface TransportHandlers {
  onMessage(data: Uint8Array): void;
  onClose(reason: string): void;
  onError(error: Error): void;
}

// ─── Network Server ─────────────────────────────────────────────

export interface NetworkServer {
  start(): void;
  stop(): void;
  broadcastSnapshot(tick: number, timestamp: number): void;
  sendToConnection(connectionId: string, message: ServerMessage): void;
  connectedCount(): number;
}

interface ServerState {
  readonly transport: TransportPort;
  readonly connections: ConnectionManager;
  readonly snapshots: SnapshotBuilder;
  readonly codec: MessageCodec;
  readonly logger: LogPort;
  readonly serverId: string;
  readonly tickRateHz: number;
  running: boolean;
}

interface LogPort {
  info(context: Record<string, unknown>, message: string): void;
  warn(context: Record<string, unknown>, message: string): void;
}

export function createNetworkServer(deps: {
  readonly transport: TransportPort;
  readonly connections: ConnectionManager;
  readonly snapshots: SnapshotBuilder;
  readonly codec: MessageCodec;
  readonly logger: LogPort;
  readonly serverId: string;
  readonly tickRateHz: number;
}): NetworkServer {
  const state: ServerState = { ...deps, running: false };

  return {
    start: () => {
      startServer(state);
    },
    stop: () => {
      stopServer(state);
    },
    broadcastSnapshot: (tick, timestamp) => {
      broadcastImpl(state, tick, timestamp);
    },
    sendToConnection: (connId, msg) => {
      sendImpl(state, connId, msg);
    },
    connectedCount: () => state.connections.count(),
  };
}

// ─── Lifecycle ──────────────────────────────────────────────────

function startServer(state: ServerState): void {
  if (state.running) return;
  state.running = true;

  state.transport.onConnection((connectionId, handlers) => {
    handleNewConnection(state, connectionId, handlers);
  });

  state.logger.info({ serverId: state.serverId }, 'Network server started');
}

function stopServer(state: ServerState): void {
  if (!state.running) return;
  state.running = false;
  state.transport.shutdown();
  state.logger.info({}, 'Network server stopped');
}

// ─── Connection Handling ────────────────────────────────────────

function handleNewConnection(
  state: ServerState,
  rawConnectionId: string,
  handlers: TransportHandlers,
): void {
  const connectionId = state.connections.acceptConnection();

  handlers.onMessage = (data) => {
    handleMessage(state, connectionId, data);
  };

  handlers.onClose = (reason) => {
    handleDisconnect(state, connectionId, reason);
  };

  handlers.onError = (error) => {
    state.logger.warn({ connectionId, error: error.message }, 'Connection error');
    handleDisconnect(state, connectionId, error.message);
  };
}

// ─── Message Routing ────────────────────────────────────────────

function handleMessage(state: ServerState, connectionId: string, data: Uint8Array): void {
  let message: unknown;
  try {
    message = state.codec.decode(data);
  } catch {
    state.logger.warn({ connectionId }, 'Failed to decode message');
    return;
  }

  if (isClientHello(message)) {
    handleHello(state, connectionId, message);
  } else if (isClientInput(message)) {
    handleInput(state, connectionId, message);
  } else {
    state.logger.warn({ connectionId }, 'Unknown message type received');
  }
}

interface HelloPayload {
  readonly protocolVersion: number;
  readonly clientId: string;
  readonly platform: string;
  readonly renderingTier: string;
}

function handleHello(state: ServerState, connectionId: string, hello: HelloPayload): void {
  if (hello.protocolVersion !== PROTOCOL_VERSION) {
    rejectProtocol(state, connectionId, hello.protocolVersion);
    return;
  }

  let result: HandshakeResult;
  try {
    result = state.connections.completeHandshake(connectionId, {
      type: 'client-hello',
      ...hello,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Handshake failed';
    state.logger.warn({ connectionId }, msg);
    state.transport.close(connectionId, msg);
    return;
  }

  sendWelcome(state, connectionId, result);
}

function rejectProtocol(state: ServerState, connectionId: string, clientVersion: number): void {
  const err = protocolVersionMismatch(PROTOCOL_VERSION, clientVersion);
  state.logger.warn({ connectionId, ...err.context }, err.message);
  state.transport.close(connectionId, err.message);
}

function sendWelcome(state: ServerState, connectionId: string, result: HandshakeResult): void {
  const welcome: ServerWelcome = {
    type: 'server-welcome',
    protocolVersion: PROTOCOL_VERSION,
    serverId: state.serverId,
    tickRateHz: state.tickRateHz,
    playerEntityId: result.playerEntityId,
    worldId: result.worldId,
    serverTimestamp: Date.now(),
  };
  sendImpl(state, connectionId, welcome);
}

function handleInput(
  state: ServerState,
  connectionId: string,
  input: { readonly sequence: number },
): void {
  try {
    state.connections.recordInput(connectionId, input.sequence);
  } catch {
    state.logger.warn({ connectionId }, 'Failed to record input');
  }
}

function handleDisconnect(state: ServerState, connectionId: string, reason: string): void {
  try {
    state.connections.disconnect(connectionId, reason);
  } catch {
    // Connection may already be removed
  }
}

// ─── Broadcasting ───────────────────────────────────────────────

function broadcastImpl(state: ServerState, tick: number, timestamp: number): void {
  const activeConnections = state.connections.listActive();

  for (const conn of activeConnections) {
    const snapshot: ServerSnapshot = state.snapshots.buildSnapshot(conn, tick, timestamp);
    sendImpl(state, conn.connectionId, snapshot);
  }
}

// ─── Sending ────────────────────────────────────────────────────

function sendImpl(state: ServerState, connectionId: string, message: ServerMessage): void {
  try {
    const data = state.codec.encode(message);
    state.transport.send(connectionId, data);
  } catch {
    state.logger.warn({ connectionId }, 'Failed to send message');
  }
}
