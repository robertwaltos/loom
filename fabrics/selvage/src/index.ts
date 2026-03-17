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
 * Bandwidth Tracker: Per-connection bandwidth monitoring with quota enforcement.
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

// Bandwidth tracker
export type {
  BandwidthTracker,
  BandwidthTrackerDeps,
  BandwidthConfig,
  BandwidthRecord,
  RecordTrafficParams,
  BandwidthStats,
} from './bandwidth-tracker.js';
export { createBandwidthTracker, DEFAULT_BANDWIDTH_CONFIG } from './bandwidth-tracker.js';

// Connection pool
export type {
  ConnectionPool,
  ConnectionPoolDeps,
  ConnectionPoolConfig,
  PoolEntry,
  PoolEntryStatus,
  AddEntryParams,
  ConnectionPoolStats,
} from './connection-pool.js';
export { createConnectionPool, DEFAULT_POOL_CONFIG } from './connection-pool.js';

// Request pipeline
export type {
  RequestPipeline,
  RequestPipelineDeps,
  PipelineContext,
  StageHandler,
  PipelineStage,
  AddStageParams as PipelineAddStageParams,
  ExecutionResult,
  PipelineStats,
} from './request-pipeline.js';
export { createRequestPipeline } from './request-pipeline.js';

// Rate bucket
export type {
  RateBucketService,
  RateBucketDeps,
  BucketConfig,
  ConsumeResult,
  RateBucketStats,
} from './rate-bucket.js';
export {
  createRateBucketService,
  MICROSECONDS_PER_SECOND as RATE_BUCKET_MICROS_PER_SEC,
} from './rate-bucket.js';

// Message queue
export type {
  MessageQueueService,
  MessageQueueDeps,
  MessageQueueConfig,
  MessageStatus,
  QueueMessage,
  QueueEnqueueParams,
  MessageQueueStats,
} from './message-queue.js';
export { createMessageQueueService, DEFAULT_QUEUE_CONFIG } from './message-queue.js';

// Response cache
export type {
  ResponseCacheService,
  ResponseCacheDeps,
  CacheEntry,
  CacheConfig,
  SetCacheParams,
  ResponseCacheStats,
} from './response-cache.js';
export { createResponseCache, DEFAULT_CACHE_CONFIG } from './response-cache.js';

// Request router
export type {
  RequestRouter,
  RequestRouterDeps,
  RouterClock,
  RequestRouterIdGenerator,
  RouterLogPort,
  RateLimitCheckPort,
  HttpMethod,
  RouteParams,
  RequestContext,
  MiddlewareResult,
  MiddlewareHandler,
  RouteHandler,
  RouteResponse,
  RouteDefinition,
  RegisterRouteParams,
  AddMiddlewareParams,
  IncomingRequest,
  RouteOutcome,
  RouteResult,
  RequestRouterStats,
} from './request-router.js';
export { createRequestRouter } from './request-router.js';

// API versioning
export type {
  ApiVersioningService,
  ApiVersioningDeps,
  VersioningClock,
  VersioningLogPort,
  VersionStatus,
  VersionEntry,
  RegisterVersionParams,
  DeprecateParams,
  MigrationPath,
  RegisterMigrationParams,
  NegotiateOutcome,
  NegotiateResult,
  VersioningStats,
} from './api-versioning.js';
export { createApiVersioningService } from './api-versioning.js';

// Webhook registry
export type {
  WebhookRegistry,
  WebhookRegistryDeps,
  WebhookClock,
  WebhookIdGenerator,
  WebhookLogPort,
  WebhookSubscription,
  RegisterWebhookParams,
  DeliveryStatus,
  DeliveryAttempt,
  DeliveryRecord,
  EnqueueDeliveryParams,
  RecordAttemptParams,
  WebhookSignature,
  DeadLetterEntry,
  WebhookConfig,
  WebhookStats,
} from './webhook-registry.js';
export { createWebhookRegistry, DEFAULT_WEBHOOK_CONFIG } from './webhook-registry.js';

// Cache layer (advanced response caching with LRU eviction)
export type {
  CacheLayerService,
  CacheLayerDeps,
  CacheLayerClock,
  CacheLayerLogPort,
  CacheLayerConfig,
  CacheLayerEntry,
  CacheKeyParams,
  SetCacheLayerParams,
  CacheLayerStats,
  InvalidateByPatternResult,
} from './cache-layer.js';
export { createCacheLayer, DEFAULT_CACHE_LAYER_CONFIG } from './cache-layer.js';
export {
  createRateLimiter,
  DEFAULT_RATE_LIMIT_CONFIG,
  MAX_TOKENS_DEFAULT,
  REFILL_INTERVAL_US,
} from './rate-limiter.js';
export type {
  RateLimiter,
  RateLimitDeps,
  RateLimitConfig,
  RateLimitStrategy,
  RateLimitBucket,
  RateLimitResult,
  RateLimitStats,
  BucketState,
} from './rate-limiter.js';
export {
  createCircuitBreaker,
  DEFAULT_CIRCUIT_CONFIG,
  FAILURE_THRESHOLD_DEFAULT,
  HALF_OPEN_TIMEOUT_US,
} from './circuit-breaker.js';
export type {
  CircuitBreaker,
  CircuitBreakerDeps,
  CircuitBreakerConfig,
  CircuitState,
  CircuitRecord,
  CircuitEvent,
  CircuitBreakerResult,
  FailureMetrics,
  CircuitBreakerStats,
} from './circuit-breaker.js';
export { createLoadBalancer } from './load-balancer.js';
export type {
  LoadStrategy,
  InstanceHealth,
  ServiceInstance,
  RoutingResult,
  LoadStats,
  RegisterResult,
  DeregisterResult,
  SelectResult,
  HealthResult,
  LoadBalancerDeps,
  LoadBalancer,
} from './load-balancer.js';
export { createRequestDeduplicator } from './request-deduplicator.js';
export type {
  IdempotencyKey,
  DeduplicatedRequest,
  DeduplicatorEntry,
  CheckResult,
  RecordRequestResult,
  RecordResultResult,
  GetResultResult,
  DeduplicatorDeps,
  RequestDeduplicator,
} from './request-deduplicator.js';

export { createWebSocketGateway } from './websocket-gateway.js';
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
} from './websocket-gateway.js';
export { createSseStream } from './sse-stream.js';
export type {
  SseStream,
  SseStreamDeps,
  SseClockPort,
  SseIdPort,
  SseLoggerPort,
  SseClient,
  SseChannel,
  SseEvent,
  SseSubscription,
  ReconnectToken,
  CreateChannelParams,
  SubscribeParams,
  PublishParams,
  UnsubscribeParams,
  IssueReconnectTokenParams,
  ReconnectParams,
  SseStats,
} from './sse-stream.js';

// -- Wave 10: gRPC Bridge ----------------------------------------------------
export {
  createGrpcBridge,
  registerService,
  registerMethod,
  callMethod,
  startStream,
  endStream,
  incrementStreamMessageCount,
  getStats as getGrpcStats,
  getMethodLatency,
  listServices as listGrpcServices,
  listMethodsForService,
  getServiceByName,
  getMethodByName,
  getCallHistory,
  clearCallHistory,
  getActiveCallCount,
  getActiveStreamCount,
  getAllLatencyStats,
} from './grpc-bridge.js';
export type {
  ResponseType,
  GrpcService,
  GrpcMethod,
  GrpcCall,
  GrpcResponse,
  StreamHandle,
  MethodHandler,
  BridgeStats,
  MethodLatency,
  BridgeState,
} from './grpc-bridge.js';

// -- Wave 10: API Doc Generator ----------------------------------------------
export {
  createDocGenerator,
  registerEndpoint,
  tagEndpoint,
  deprecateEndpoint,
  generateCatalog,
  getEndpointsByTag,
  getEndpointsByVersion,
  getDeprecatedEndpoints,
  compareVersions,
  deprecateVersion,
  listVersions,
  getLatestVersion,
  searchEndpoints,
  searchByPath,
  searchByMethod,
  getDocReport,
  getTagReport,
  listTags,
  getEndpointById,
  getEndpointByMethodPath,
} from './api-doc-generator.js';
export type {
  HttpMethod as DocHttpMethod,
  ParamLocation,
  EndpointParam,
  ResponseSchema,
  ApiEndpoint,
  DocTag,
  ApiVersion,
  ApiCatalog,
  DocReport,
  DocGenState,
} from './api-doc-generator.js';

// -- Wave 12: Webhook Dispatcher ---------------------------------------------
export {
  createWebhookDispatcherState,
  registerWebhook,
  pauseWebhook,
  resumeWebhook,
  dispatchEvent,
  recordDeliveryResult,
  getWebhook,
  getDeliveryHistory,
  getStats as getWebhookDispatcherStats,
} from './webhook-dispatcher.js';
export type {
  Clock as WebhookDispatcherClock,
  IdGenerator as WebhookDispatcherIdGenerator,
  Logger as WebhookDispatcherLogger,
  WebhookId,
  EndpointId,
  WebhookError,
  WebhookStatus,
  Webhook,
  WebhookDelivery,
  WebhookStats as WebhookDispatcherStats,
  WebhookDispatcherState,
} from './webhook-dispatcher.js';

// -- Wave 12: Stream Gateway -------------------------------------------------
export {
  createStreamGatewayState,
  createStream,
  subscribe,
  unsubscribe,
  produce,
  consume,
  pauseStream,
  resumeStream,
  closeStream,
  getStream,
  getStreamStats,
} from './stream-gateway.js';
export type {
  Clock as StreamGatewayClock,
  IdGenerator as StreamGatewayIdGenerator,
  Logger as StreamGatewayLogger,
  StreamId,
  ProducerId,
  ConsumerId,
  StreamError,
  StreamStatus,
  StreamMessage,
  DataStream,
  StreamStats,
  StreamGatewayState,
} from './stream-gateway.js';

// -- Wave 13: HTTP Router ----------------------------------------------------
export {
  createHttpRouterState,
  registerHandler as registerHttpHandler,
  addRoute,
  removeRoute,
  matchRoute,
  addMiddleware as addRouteMiddleware,
  getRoute,
  listRoutes,
  getStats as getHttpRouterStats,
} from './http-router.js';
export type {
  Clock as HttpRouterClock,
  IdGenerator as HttpRouterIdGenerator,
  Logger as HttpRouterLogger,
  RouteId,
  HandlerId,
  RouterError,
  HttpMethod as HttpRouterMethod,
  Route,
  RouteMatch,
  RouterStats as HttpRouterStats,
  HttpRouterState,
} from './http-router.js';

// -- Wave 13: Session Gateway ------------------------------------------------
export {
  createSessionGatewayState,
  registerUser,
  createSession,
  validateToken,
  refreshSession,
  revokeSession,
  logoutSession,
  getUserSessions,
  getSession,
  getStats as getSessionGatewayStats,
} from './session-gateway.js';
export type {
  Clock as SessionGatewayClock,
  IdGenerator as SessionGatewayIdGenerator,
  Logger as SessionGatewayLogger,
  SessionId,
  UserId,
  TokenValue,
  SessionError,
  SessionStatus,
  Session as GatewaySession,
  SessionStats as GatewaySessionStats,
  SessionGatewayState,
} from './session-gateway.js';

// -- Wave 14: Load Balancer System -------------------------------------------
export { createLoadBalancerSystem } from './load-balancer-system.js';
export type {
  Clock as LoadBalancerSystemClock,
  IdGenerator as LoadBalancerSystemIdGenerator,
  Logger as LoadBalancerSystemLogger,
  LoadBalancerSystemDeps,
  InstanceId,
  ServiceName,
  BalancerError,
  InstanceStatus,
  ServiceInstance as LbServiceInstance,
  RoutingDecision,
  BalancerStats,
  LoadBalancerSystem,
} from './load-balancer-system.js';

// -- Wave 14: Circuit Breaker System -----------------------------------------
export { createCircuitBreakerSystem } from './circuit-breaker-system.js';
export type {
  Clock as CircuitBreakerSystemClock,
  IdGenerator as CircuitBreakerSystemIdGenerator,
  Logger as CircuitBreakerSystemLogger,
  CircuitBreakerSystemDeps,
  CircuitId,
  ServiceId,
  BreakerError,
  CircuitState as BreakerCircuitState,
  CircuitBreaker as BreakerCircuit,
  CallResult,
  BreakerStats,
  CircuitBreakerSystem,
} from './circuit-breaker-system.js';

// ── Phase 1 Infrastructure Adapters ─────────────────────────────

export { createFastifyTransport } from './fastify-transport.js';
export type { FastifyAppLike, RouteRegistrar } from './fastify-transport.js';

// ── Phase 2 Infrastructure Adapters ─────────────────────────────

export { createGrpcTransport, buildJsonServiceDefinition } from './grpc-transport.js';
export type {
  GrpcTransport,
  GrpcTransportConfig,
  GrpcServiceDefinition,
  GrpcMethodDefinition,
} from './grpc-transport.js';

// ── Bridge gRPC Server (UE5 ↔ Loom) ────────────────────────────

export { createBridgeGrpcServer, DEFAULT_BRIDGE_CONFIG, STALE_CLIENT_TIMEOUT_MS } from './bridge-grpc-server.js';
export type {
  BridgeGrpcServer,
  BridgeGrpcServerDeps,
  BridgeGrpcConfig,
  BridgeGrpcClockPort,
  BridgeGrpcIdPort,
  BridgeGrpcLogPort,
  CapabilityManifest,
  RenderingFeatures,
  RenderingTier,
  ClientStreamMessage,
  ServerStreamMessage,
  ClientMessageType,
  ServerMessageType,
  ConnectedClient,
  BridgeHealthStatus,
  BridgeNegotiateHandler,
  BridgeDisconnectHandler,
  BridgeInputHandler,
  BridgePhysicsHandler,
  BridgeWorldStateProvider,
  WorldCommandRequest,
  WorldCommandResponse,
  WorldCommandType,
} from './bridge-grpc-server.js';

// ── Bridge gRPC Transport (network layer) ───────────────────────

export { createBridgeGrpcTransport, DEFAULT_TRANSPORT_CONFIG } from './bridge-grpc-transport.js';
export type {
  BridgeGrpcTransport,
  BridgeGrpcTransportDeps,
  BridgeTransportConfig,
  BridgeTransportLogPort,
} from './bridge-grpc-transport.js';

// ── Bridge World State Adapter ──────────────────────────────────

export { createBridgeWorldStateAdapter, createWorldStateProvider } from './bridge-world-state-adapter.js';
export type {
  BridgeWorldStateAdapter,
  WorldStateAdapterDeps,
} from './bridge-world-state-adapter.js';

// ── Phase 4 Sync Protocol ───────────────────────────────────────

export {
  FRAME,
  encodeFrame,
  decodeFrame,
  encodeClientInput,
  decodeClientInput,
  computeDelta,
  createSequenceTracker,
  createLatencyEstimator,
} from './sync-protocol.js';
export type {
  FrameType,
  SyncFrame,
  DecodeResult,
  ClientInput as SyncClientInput,
  EntitySnapshot,
  EntityDelta,
  SequenceTracker,
  LatencyEstimator,
} from './sync-protocol.js';

// ── Phase 8 Chat Infrastructure ─────────────────────────────────

export {
  createChatChannelManager,
} from './chat-channel-manager.js';
export type {
  ChatClockPort,
  ChatIdPort,
  ChatLogPort,
  ChatDeliveryPort,
  ChatModerationPort,
  ChatPersistencePort,
  ChatMessage,
  ChatChannel,
  ModerationResult,
  SendMessageParams as ChatSendMessageParams,
  ChatChannelManagerDeps,
  ChatChannelManagerConfig,
  ChatChannelManagerStats,
  ChatChannelManager,
} from './chat-channel-manager.js';

export {
  createChatModerationPipeline,
} from './chat-moderation.js';
export type {
  ToxicityClassifierPort,
  ModerationLogPort,
  ModerationClockPort,
  ModerationReviewPort,
  ChatModerationConfig,
  ChatModerationDeps,
} from './chat-moderation.js';

// ── Phase 13.2 E-Sports ─────────────────────────────────────────

export { createEsportsEngine } from './esports-engine.js';
export type {
  EsportsClockPort,
  EsportsIdPort,
  EsportsLogPort,
  EsportsEventPort,
  TournamentStorePort,
  LeagueStorePort,
  EscrowPort,
  TournamentFormat,
  TournamentStatus,
  BracketSide,
  LeagueDivision,
  BroadcastStatus,
  Tournament,
  BracketMatch,
  League,
  LeagueDivisionState,
  LeagueMember,
  BroadcastSession,
  VodRecord,
  VodHighlight,
  PlayerStatsPublic,
  PrizeDistribution,
  PrizePlacement,
  EsportsConfig,
  EsportsStats,
  EsportsEngine,
  EsportsDeps,
} from './esports-engine.js';

// Localization engine
export {
  SUPPORTED_LOCALES,
  RTL_LOCALES,
  DEFAULT_LOCALE,
  createLocalizationEngine,
} from './localization-engine.js';
export type {
  LocalizationClockPort,
  LocalizationIdPort,
  LocalizationLogPort,
  LocalizationEventPort,
  TranslationStorePort,
  LlmTranslationPort,
  SupportedLocale,
  PluralCategory,
  TextDirection,
  SubmissionStatus,
  TranslationNamespace,
  TranslationEntry,
  IcuFormatOptions,
  FormattedMessage,
  CommunitySubmission,
  CulturalProfile,
  NumberFormatConfig,
  VoiceLocalization,
  TranslationCoverage,
  LocalizationStats,
  LocalizationEngineDeps,
  LocalizationEngineConfig,
  LocalizationEngine,
} from './localization-engine.js';

// ── Voice Chat Rooms ────────────────────────────────────────────

export { createVoiceChatRoomManager, ROOM_CAPACITY, INACTIVE_TIMEOUT_MS } from './voice-chat-rooms.js';

// ── Network Condition Simulator (Phase 17.3) ─────────────────────────────────
export {
  createNetworkConditionSim,
  PROFILE_PERFECT,
  PROFILE_BROADBAND,
  PROFILE_4G,
  PROFILE_3G,
  PROFILE_SATELLITE,
  PROFILE_BAD,
} from './network-condition-sim.js';
export type { NetworkProfile, NetworkPacket, NetworkSimStats, NetworkConditionSimulator } from './network-condition-sim.js';

// ── Protocol Evolution (Phase 17.3) ──────────────────────────────────────────
export {
  createProtocolRegistry,
  parseVersion,
  formatVersion,
  compareVersions as compareProtocolVersions,
} from './protocol-evolution.js';
export type { ProtocolVersion, MessageSchema, MigrationFn, ValidationResult, ProtocolRegistry } from './protocol-evolution.js';

// ── Economy API (Open Economy Transparency Layer) ────────────────────────────
export {
  filterGiniHistory,
  filterLevyRateHistory,
  buildEconomicExport,
  exportToJSONL,
  createRateLimitState,
  checkRateLimit,
  recordRequest,
  ACADEMIC_EXPORT_DAILY_LIMIT,
} from './economy-api.js';
export type {
  GiniDataPoint,
  AggregateTransactionRecord,
  CommonsFundSnapshot,
  WealthBand,
  LevyRateRecord,
  DynastyTransactionSummary,
  EconomicExportRecord,
  RateLimitState,
} from './economy-api.js';
export type {
  VoiceClockPort,
  VoiceIdPort,
  VoiceLogPort,
  VoiceSignalingPort,
  VoiceRoomType,
  ParticipantState,
  VoiceParticipant,
  VoiceRoom,
  VoiceRoomStats,
  VoiceError,
  VoiceChatRoomManager,
  VoiceChatDeps,
} from './voice-chat-rooms.js';
