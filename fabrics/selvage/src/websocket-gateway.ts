/**
 * websocket-gateway.ts — WebSocket connection management and routing.
 *
 * WebSocket connection lifecycle: registration, heartbeat ping-pong,
 * message routing by type, graceful disconnect. Per-connection state
 * tracking. Handler registration for message types.
 */

// ── Ports ────────────────────────────────────────────────────────

interface WsClockPort {
  readonly nowMicroseconds: () => number;
}

interface WsIdPort {
  readonly generate: () => string;
}

interface WsLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

interface WsGatewayDeps {
  readonly clock: WsClockPort;
  readonly idGenerator: WsIdPort;
  readonly logger: WsLoggerPort;
}

// ── Types ────────────────────────────────────────────────────────

type WsConnectionState = 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED';

interface WsConnection {
  readonly connectionId: string;
  readonly clientId: string;
  readonly state: WsConnectionState;
  readonly connectedAt: number;
  readonly lastHeartbeatAt: number;
  readonly messagesSent: number;
  readonly messagesReceived: number;
}

interface WsMessage {
  readonly type: string;
  readonly payload: unknown;
  readonly timestamp: number;
}

type WsHandlerResult = string | undefined;

type WsHandler = (connectionId: string, payload: unknown) => WsHandlerResult;

interface WsRoute {
  readonly messageType: string;
  readonly handler: WsHandler;
}

interface RegisterConnectionParams {
  readonly connectionId: string;
  readonly clientId: string;
}

interface SendMessageParams {
  readonly connectionId: string;
  readonly type: string;
  readonly payload: unknown;
}

interface RouteMessageParams {
  readonly connectionId: string;
  readonly type: string;
  readonly payload: unknown;
}

interface RegisterHandlerParams {
  readonly messageType: string;
  readonly handler: WsHandler;
}

interface GatewayStats {
  readonly totalConnections: number;
  readonly openConnections: number;
  readonly closedConnections: number;
  readonly totalMessagesSent: number;
  readonly totalMessagesReceived: number;
  readonly registeredHandlers: number;
}

interface WebSocketGateway {
  readonly registerConnection: (params: RegisterConnectionParams) => WsConnection;
  readonly routeMessage: (params: RouteMessageParams) => WsHandlerResult;
  readonly sendMessage: (params: SendMessageParams) => string | undefined;
  readonly registerHandler: (params: RegisterHandlerParams) => void;
  readonly disconnectClient: (connectionId: string) => boolean;
  readonly heartbeat: (connectionId: string) => boolean;
  readonly getConnection: (connectionId: string) => WsConnection | undefined;
  readonly getStats: () => GatewayStats;
}

// ── State ────────────────────────────────────────────────────────

interface MutableConnection {
  readonly connectionId: string;
  readonly clientId: string;
  state: WsConnectionState;
  readonly connectedAt: number;
  lastHeartbeatAt: number;
  messagesSent: number;
  messagesReceived: number;
}

interface GatewayState {
  readonly deps: WsGatewayDeps;
  readonly connections: Map<string, MutableConnection>;
  readonly handlers: Map<string, WsHandler>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toWsConnection(conn: MutableConnection): WsConnection {
  return {
    connectionId: conn.connectionId,
    clientId: conn.clientId,
    state: conn.state,
    connectedAt: conn.connectedAt,
    lastHeartbeatAt: conn.lastHeartbeatAt,
    messagesSent: conn.messagesSent,
    messagesReceived: conn.messagesReceived,
  };
}

// ── Operations ───────────────────────────────────────────────────

function registerConnectionImpl(
  state: GatewayState,
  params: RegisterConnectionParams,
): WsConnection {
  const now = state.deps.clock.nowMicroseconds();
  const conn: MutableConnection = {
    connectionId: params.connectionId,
    clientId: params.clientId,
    state: 'OPEN',
    connectedAt: now,
    lastHeartbeatAt: now,
    messagesSent: 0,
    messagesReceived: 0,
  };
  state.connections.set(params.connectionId, conn);
  state.deps.logger.info('ws-connection-registered', {
    connectionId: params.connectionId,
    clientId: params.clientId,
  });
  return toWsConnection(conn);
}

function routeMessageImpl(state: GatewayState, params: RouteMessageParams): WsHandlerResult {
  const conn = state.connections.get(params.connectionId);
  if (conn === undefined) {
    return 'CONNECTION_NOT_FOUND';
  }
  if (conn.state !== 'OPEN') {
    return 'CONNECTION_NOT_OPEN';
  }
  conn.messagesReceived++;
  const handler = state.handlers.get(params.type);
  if (handler === undefined) {
    state.deps.logger.warn('ws-no-handler', {
      connectionId: params.connectionId,
      messageType: params.type,
    });
    return 'NO_HANDLER';
  }
  const result = handler(params.connectionId, params.payload);
  return result;
}

function sendMessageImpl(state: GatewayState, params: SendMessageParams): string | undefined {
  const conn = state.connections.get(params.connectionId);
  if (conn === undefined) {
    return 'CONNECTION_NOT_FOUND';
  }
  if (conn.state !== 'OPEN') {
    return 'CONNECTION_NOT_OPEN';
  }
  conn.messagesSent++;
  state.deps.logger.info('ws-message-sent', {
    connectionId: params.connectionId,
    messageType: params.type,
  });
  return undefined;
}

function registerHandlerImpl(state: GatewayState, params: RegisterHandlerParams): void {
  state.handlers.set(params.messageType, params.handler);
  state.deps.logger.info('ws-handler-registered', {
    messageType: params.messageType,
  });
}

function disconnectClientImpl(state: GatewayState, connectionId: string): boolean {
  const conn = state.connections.get(connectionId);
  if (conn === undefined) {
    return false;
  }
  conn.state = 'CLOSED';
  state.deps.logger.info('ws-connection-closed', { connectionId });
  return true;
}

function heartbeatImpl(state: GatewayState, connectionId: string): boolean {
  const conn = state.connections.get(connectionId);
  if (conn === undefined) {
    return false;
  }
  if (conn.state !== 'OPEN') {
    return false;
  }
  const now = state.deps.clock.nowMicroseconds();
  conn.lastHeartbeatAt = now;
  return true;
}

function getStatsImpl(state: GatewayState): GatewayStats {
  let openCount = 0;
  let closedCount = 0;
  let totalSent = 0;
  let totalReceived = 0;
  for (const conn of state.connections.values()) {
    if (conn.state === 'OPEN') {
      openCount++;
    } else if (conn.state === 'CLOSED') {
      closedCount++;
    }
    totalSent = totalSent + conn.messagesSent;
    totalReceived = totalReceived + conn.messagesReceived;
  }
  return {
    totalConnections: state.connections.size,
    openConnections: openCount,
    closedConnections: closedCount,
    totalMessagesSent: totalSent,
    totalMessagesReceived: totalReceived,
    registeredHandlers: state.handlers.size,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createWebSocketGateway(deps: WsGatewayDeps): WebSocketGateway {
  const state: GatewayState = {
    deps,
    connections: new Map(),
    handlers: new Map(),
  };
  return {
    registerConnection: (p) => registerConnectionImpl(state, p),
    routeMessage: (p) => routeMessageImpl(state, p),
    sendMessage: (p) => sendMessageImpl(state, p),
    registerHandler: (p) => registerHandlerImpl(state, p),
    disconnectClient: (id) => disconnectClientImpl(state, id),
    heartbeat: (id) => heartbeatImpl(state, id),
    getConnection: (id) => {
      const c = state.connections.get(id);
      if (c === undefined) return undefined;
      return toWsConnection(c);
    },
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createWebSocketGateway };
export type {
  WebSocketGateway,
  WsGatewayDeps,
  WsClockPort,
  WsIdPort,
  WsLoggerPort,
  WsConnectionState,
  WsConnection,
  WsMessage,
  WsHandler,
  WsHandlerResult,
  WsRoute,
  RegisterConnectionParams,
  SendMessageParams,
  RouteMessageParams,
  RegisterHandlerParams,
  GatewayStats,
};
