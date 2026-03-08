/**
 * @loom/selvage — API Gateway & Network Interface
 *
 * The Selvage is the outer edge of the fabric. It handles all
 * external communication: WebSocket connections, protocol
 * serialization, client lifecycle, and snapshot distribution.
 *
 * Architecture: Ports & Adapters. The selvage defines ports for
 * what it needs from The Loom (entity queries, player spawning)
 * and exposes a NetworkServer that any transport can drive.
 * Heartbeat Monitor: Connection liveness tracking with sweep-based stale detection.
 */

// Protocol types
export type {
  ClientHello,
  ServerWelcome,
  ClientInput,
  InputAction,
  ServerSnapshot,
  EntityUpdate,
  EntitySpawnMessage,
  EntityDespawnMessage,
  SystemMessage,
  ServerDisconnect,
  ClientMessage,
  ServerMessage,
} from './server-protocol.js';
export {
  PROTOCOL_VERSION,
  MAX_INPUT_ACTIONS_PER_MESSAGE,
  MAX_MESSAGE_SIZE_BYTES,
  isClientHello,
  isClientInput,
} from './server-protocol.js';

// Connection types
export type { ConnectionInfo, ConnectionState } from './connection.js';

// Connection manager
export type {
  ConnectionManager,
  PlayerEntityPort,
  ClockPort,
  IdPort,
  LogPort,
  HandshakeResult,
  DisconnectResult,
} from './connection-manager.js';
export { createConnectionManager } from './connection-manager.js';

// Snapshot builder
export type {
  SnapshotBuilder,
  EntityQueryPort,
  ComponentQueryPort,
  SnapshotEntity,
} from './snapshot-builder.js';
export { createSnapshotBuilder } from './snapshot-builder.js';

// Message codec
export type { MessageCodec } from './message-codec.js';
export { createJsonCodec } from './message-codec.js';

// Network server
export type {
  NetworkServer,
  TransportPort,
  ConnectionHandler,
  TransportHandlers,
} from './network-server.js';
export { createNetworkServer } from './network-server.js';

// Errors
export type { SelvageErrorCode } from './selvage-errors.js';
export {
  SelvageError,
  connectionNotFound,
  duplicateClientId,
  connectionNotActive,
  handshakeAlreadyComplete,
  invalidMessage,
  protocolVersionMismatch,
  messageTooLarge,
  rateLimited,
} from './selvage-errors.js';

// Action dispatcher
export type {
  ActionDispatcher,
  ActionDispatcherDeps,
  ActionRequest,
  ActionResult,
  ActionOutcome,
  ActionHandler,
  ActionHandlerResult,
  DispatchStats,
} from './action-dispatcher.js';
export { createActionDispatcher } from './action-dispatcher.js';

// Connection authenticator
export type {
  ConnectionAuthenticator,
  ConnectionAuthDeps,
  ConnectionAuthConfig,
  AuthResult,
  AuthSuccess,
  AuthFailure,
  AuthDenialReason,
  AuthenticatedSession,
  TokenValidationPort,
  TokenValidationResult,
  AuthIdGenerator,
} from './connection-auth.js';
export { createConnectionAuthenticator } from './connection-auth.js';

// Rate guard
export type {
  RateGuard,
  RateGuardDeps,
  RateGuardConfig,
  RateGuardResult,
  RateGuardStats,
  ConnectionViolation,
  RateLimitPort,
  RateLimitPortResult,
} from './rate-guard.js';
export { createRateGuard, DEFAULT_RATE_GUARD_CONFIG } from './rate-guard.js';

// Session manager
export type {
  SessionManager,
  SessionManagerDeps,
  SessionManagerConfig,
  Session,
  SessionState,
  CreateSessionParams,
  SessionStats,
} from './session-manager.js';
export { createSessionManager, DEFAULT_SESSION_CONFIG } from './session-manager.js';

// Message router
export type {
  MessageRouter,
  MessageRouterDeps,
  RouteMode,
  RoutedMessage,
  RouteDirectParams,
  RouteBroadcastParams,
  RouteGroupParams,
  RouteDynastyParams,
  RouterStats,
  MessageDeliveryPort,
  RouterConnectionPort,
  RouterIdGenerator,
} from './message-router.js';
export { createMessageRouter } from './message-router.js';

// Heartbeat monitor
export type {
  HeartbeatMonitor,
  HeartbeatMonitorDeps,
  HeartbeatConfig,
  HeartbeatRecord,
  ConnectionHealth,
  HealthCheck,
  SweepResult,
  HeartbeatStats,
} from './heartbeat-monitor.js';
export { createHeartbeatMonitor, DEFAULT_HEARTBEAT_CONFIG } from './heartbeat-monitor.js';
