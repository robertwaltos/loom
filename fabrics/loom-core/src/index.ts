/**
 * @loom/loom-core — The central nervous system of The Loom.
 *
 * Provides: Event Bus, Entity Registry, World Manager, Event Factory,
 * System Registry, Tick Loop, Entity Query Engine, Event Journal,
 * Resource Pool, Command Bus, Entity Lifecycle Manager, Event Replay,
 * World Event Scheduler, Entity Template Registry, Config Registry,
 * Event Correlation Engine, System Dependency Graph, Entity Group Manager,
 * State Snapshot Service, Priority Queue, Service Registry,
 * World Generator, Biome Engine, Resource Distribution,
 * Settlement Engine, Weather System, Navigation Mesh.
 * All inter-module communication flows through here.
 */

export { createLoomCore } from './loom-core.js';
export type { LoomCore, LoomCoreConfig } from './loom-core.js';

export { createInProcessEventBus } from './in-process-event-bus.js';
export { createComponentStore } from './component-store.js';
export type { ComponentStore } from './component-store.js';
export { createEntityRegistry } from './entity-registry.js';
export type { EntityRegistry } from './entity-registry.js';
export { createWorldManager } from './world-manager.js';
export type { WorldManager, WorldInfo, WorldState } from './world-manager.js';
export { createEventFactory } from './event-factory.js';
export type { EventFactory, EventSource, CausationInfo } from './event-factory.js';
export { createSystemRegistry } from './system-registry.js';
export type {
  SystemRegistry,
  SystemContext,
  SystemFn,
  SystemRegistration,
} from './system-registry.js';
export { createTickLoop } from './tick-loop.js';
export type { TickLoop, TickLoopConfig, TickLoopState, TickStats } from './tick-loop.js';

export { createEntityQueryEngine } from './entity-query.js';
export type {
  EntityQueryEngine,
  EntityQueryDeps,
  EntityQueryResult,
  QueryDescriptor,
  QueryStats,
  QueryComponentPort,
  QueryEntityPort,
  QueryWorldPort,
} from './entity-query.js';
export { createEventJournal } from './event-journal.js';
export type {
  EventJournal,
  EventJournalDeps,
  JournalEntry,
  JournalMeta,
  JournalStats,
  JournalQuery,
  RecordableEvent,
} from './event-journal.js';
export { createResourcePool } from './resource-pool.js';
export type {
  ResourcePool,
  PoolConfig,
  PoolStats,
  PoolFactory,
  PoolReset,
} from './resource-pool.js';
export { createCommandBus } from './command-bus.js';
export type {
  CommandBus,
  Command,
  CommandResult,
  CommandHandler,
  CommandMiddleware,
  CommandRegistration,
  CommandBusStats,
} from './command-bus.js';

export { createEntityLifecycleManager } from './entity-lifecycle.js';
export type {
  EntityLifecycleManager,
  EntityLifecycleDeps,
  LifecyclePhase,
  LifecycleRecord,
  LifecycleTransition,
  LifecycleHistory,
  LifecycleStats,
  LifecycleCallback,
} from './entity-lifecycle.js';

export { matchesFilter } from './event-filter-matcher.js';

export { createSystemClock, createFakeClock } from './clock.js';
export type { Clock } from './clock.js';
export { createTimeService, DEFAULT_TIME_CONFIG, COMPRESSION_RATIO } from './time-service.js';
export type { TimeService, TimeServiceConfig, InGameDate } from './time-service.js';
export { createUuidGenerator, createSequentialIdGenerator } from './id-generator.js';
export type { IdGenerator } from './id-generator.js';
export { createSilentLogger } from './logger.js';
export type { Logger } from './logger.js';

export { LoomError } from './errors.js';
export type { LoomErrorCode } from './errors.js';
export {
  entityNotFound,
  entityAlreadyExists,
  componentNotFound,
  worldNotFound,
  worldAlreadyExists,
  eventBusClosed,
  worldCapacityReached,
} from './errors.js';
export { createEventReplayService } from './event-replay.js';
export type {
  EventReplayService,
  EventReplayDeps,
  ReplayEventSourcePort,
  ReplayIdGenerator,
  ReplayEvent,
  ReplayFilter,
  ReplaySession,
  ReplayStatus,
  ReplayHandler,
  ReplayStats,
} from './event-replay.js';
export { createWorldEventScheduler } from './world-event-scheduler.js';
export type {
  WorldEventScheduler,
  WorldEventSchedulerDeps,
  ScheduledEvent,
  ScheduledEventStatus,
  EventRecurrence,
  ScheduleEventParams,
  ScheduledEventCallback,
  TickResult,
  SchedulerStats,
} from './world-event-scheduler.js';
export { createEntityTemplateRegistry } from './entity-template.js';
export type {
  EntityTemplateRegistry,
  EntityTemplateDeps,
  EntityTemplate,
  ComponentTemplate,
  RegisterTemplateParams,
  TemplateFilter,
  TemplateStats,
} from './entity-template.js';
export { createConfigRegistry } from './config-registry.js';
export type {
  ConfigRegistry,
  ConfigRegistryDeps,
  ConfigEntry,
  SetConfigParams,
  ConfigStats,
} from './config-registry.js';
export { createEventCorrelationEngine } from './event-correlation.js';
export type {
  EventCorrelationEngine,
  EventCorrelationDeps,
  CorrelatedEvent,
  AddEventParams,
  CorrelationGroup,
  CorrelationStats,
} from './event-correlation.js';
export { createEntityGroupManager } from './entity-group.js';
export type {
  EntityGroupManager,
  EntityGroupDeps,
  EntityGroup,
  CreateGroupParams,
  GroupStats,
} from './entity-group.js';
export { createSystemDependencyGraph } from './system-dependency.js';
export type {
  SystemDependencyGraph,
  SystemDependencyDeps,
  SystemNode,
  RegisterSystemParams,
  DependencyStats,
} from './system-dependency.js';
export { createSnapshotService, DEFAULT_SNAPSHOT_CONFIG } from './state-snapshot.js';
export type {
  SnapshotService,
  SnapshotServiceDeps,
  SnapshotServiceConfig,
  StateSnapshot,
  CaptureSnapshotParams,
  SnapshotDiff,
  SnapshotServiceStats,
} from './state-snapshot.js';
export { createPriorityQueue, DEFAULT_PRIORITY_QUEUE_CONFIG } from './priority-queue.js';
export type {
  PriorityQueue,
  PriorityQueueDeps,
  PriorityQueueConfig,
  QueuedTask,
  EnqueueParams,
  PriorityQueueStats,
} from './priority-queue.js';
export { createServiceRegistry } from './service-registry.js';
export type {
  ServiceRegistry,
  ServiceRegistryDeps,
  ServiceEntry,
  ServiceStatus,
  RegisterServiceParams,
  ServiceRegistryStats,
} from './service-registry.js';
export { createEventSourcingStore } from './event-sourcing.js';
export type {
  EventSourcingStore,
  EventSourcingDeps,
  StoredEvent,
  AppendEventParams,
  EventReducer,
  AggregateSnapshot,
  EventSourcingStats,
} from './event-sourcing.js';
export { createTaskScheduler } from './task-scheduler.js';
export type {
  TaskScheduler,
  TaskSchedulerDeps,
  ScheduledTaskStatus,
  ScheduledTask,
  ScheduleTaskParams,
  TaskSchedulerStats,
} from './task-scheduler.js';
export { createServiceHealthAggregator } from './service-health.js';
export type {
  ServiceHealthAggregator,
  ServiceHealthDeps,
  HealthLevel,
  ServiceHealthReport,
  ReportHealthParams,
  RegisterHealthServiceParams,
  AggregateHealth,
  ServiceHealthStats,
} from './service-health.js';

// ── Game Systems ─────────────────────────────────────────────────

export { createMovementSystem, MOVEMENT_SYSTEM_PRIORITY } from './movement-system.js';
export { createActionDispatchSystem, ACTION_DISPATCH_PRIORITY } from './action-dispatch-system.js';
export type { ActionDispatchDeps, ActionEventSink, ActionEvent, ActionResult, ActionName, ActionFailReason } from './action-dispatch-system.js';
export { createRespawnSystem, RESPAWN_SYSTEM_PRIORITY } from './respawn-system.js';
export type { RespawnSystemDeps, RespawnEventSink, RespawnEvent } from './respawn-system.js';
export { createNpcAiSystem, NPC_AI_SYSTEM_PRIORITY } from './npc-ai-system.js';
export type { NpcAiSystemDeps, NpcAiEventSink, NpcAiEvent, NpcGoal } from './npc-ai-system.js';
export { createWorldSeedService, createDefaultWorldSeed } from './world-seed-system.js';
export type { WorldSeedDeps, WorldSeedConfig, WorldSeedResult, SpawnPointSeed, NpcSeed, ObjectSeed } from './world-seed-system.js';

export {
  getCharacterById,
  getCharactersForWorld,
  getMultiWorldCharacters,
  getAllCharacters,
  getCharacterCount,
  getCharactersByTier,
  getCharactersByFaction,
} from './character-bible-registry.js';

export {
  getWorldById,
  getAllWorlds,
  getWorldCount,
  getWorldsByStellarClass,
  getWorldsBySovereignty,
  STELLAR_ISSUANCE_MULTIPLIER,
} from './world-bible-registry.js';

export {
  mapToCharacterAppearance,
  mapToAppearanceComponent,
} from './bible-appearance-mapper.js';

export {
  createBibleWorldSeed,
  seedBibleWorld,
  getAvailableBibleWorldIds,
} from './bible-world-seed.js';
export type { BibleWorldSeedResult } from './bible-world-seed.js';

// ── Interaction System ──────────────────────────────────────────

export {
  createInteractionSystem,
  INTERACTION_SYSTEM_PRIORITY,
} from './interaction-system.js';
export type {
  InteractionEvent,
  InteractionEventSink,
  InteractionSystemDeps,
} from './interaction-system.js';

// ── Chronicle Service ───────────────────────────────────────────

export { createChronicleService } from './chronicle-service.js';
export type {
  ChronicleService,
  ChronicleEntry,
  ChronicleSearchResult,
  ChronicleEventSink,
  ChronicleServiceDeps,
  CreateEntryParams,
} from './chronicle-service.js';

// ── Wallet Sync System ──────────────────────────────────────────

export {
  createWalletSyncSystem,
  WALLET_SYNC_PRIORITY,
} from './wallet-sync-system.js';
export type {
  WalletSyncService,
  WalletSyncDeps,
  LedgerPort,
  TransferPortResult,
  WalletEventSink,
  WalletBalanceChange,
} from './wallet-sync-system.js';

// ── Dialogue Bridge ─────────────────────────────────────────────

export {
  createDialogueBridge,
  DIALOGUE_BRIDGE_PRIORITY,
} from './dialogue-bridge.js';
export type {
  DialogueBridgeService,
  DialogueBridgeDeps,
  DialoguePort,
  DialoguePortConversation,
  DialoguePortNode,
  DialoguePortAdvance,
  TreeSelectorPort,
  ChroniclePort,
  ChronicleConversationParams,
  DialogueEventSink,
  DialogueBridgeStartedEvent,
  DialogueBridgeLineEvent,
  DialogueBridgeCompletedEvent,
  DialogueBridgeInteractionComplete,
} from './dialogue-bridge.js';

export type { MovementSystemDeps } from './movement-system.js';

export { createSpawnSystem } from './spawn-system.js';
export type {
  SpawnSystemDeps,
  SpawnSystemService,
  SpawnPlayerParams,
  SpawnNpcParams,
  SpawnResult,
} from './spawn-system.js';

export { createVisualStateMapper, VISUAL_STATE_MAPPER_PRIORITY } from './visual-state-mapper.js';
export type {
  VisualStateMapperDeps,
  VisualStateMapperService,
  VisualStateBuffer,
  MappedVisualState,
  MappedTransform,
  MappedMesh,
  MappedAnimation,
} from './visual-state-mapper.js';

export { createPlayerConnectionSystem } from './player-connection-system.js';
export type {
  PlayerConnectionDeps,
  PlayerConnectionSystem,
  PlayerConnection,
  PlayerConnectionState,
  ConnectPlayerParams,
  PlayerConnectionStats,
} from './player-connection-system.js';

// ── Fabric System Adapters ───────────────────────────────────────

export { createNakamaSystem, NAKAMA_SYSTEM_PRIORITY } from './nakama-system.js';
export type {
  NakamaSystemDeps,
  NakamaSystemOrchestrator,
  NakamaSystemTickResult,
} from './nakama-system.js';

export {
  createShuttleSystem,
  createEcsPopulationAdapter,
  SHUTTLE_SYSTEM_PRIORITY,
} from './shuttle-system.js';
export type {
  ShuttleSystemDeps,
  ShuttleSystemOrchestrator,
  ShuttleSystemTickResult,
  ShuttleWorldListPort,
  ShuttleEcsNpcRecord,
} from './shuttle-system.js';

export { createWeaveSystem, WEAVE_SYSTEM_PRIORITY } from './weave-system.js';
export type {
  WeaveSystemDeps,
  WeaveSystemOrchestrator,
  WeaveSystemTickResult,
  WeaveTransitCompletionPort,
  WeaveCompletedTransit,
  WeaveEventPort,
  WeaveTransitEvent,
  WeaveEventMetadata,
  WeaveIdPort,
} from './weave-system.js';

export {
  createEntityQueryAdapter,
  createComponentQueryAdapter,
  createPlayerEntityAdapter,
  createSelvageBroadcastSystem,
  SELVAGE_BROADCAST_PRIORITY,
} from './selvage-adapters.js';
export type {
  SelvageEntityQueryPort,
  SelvageSnapshotEntity,
  SelvageComponentQueryPort,
  SelvagePlayerEntityPort,
  SelvaeBroadcastPort,
  EntityQuerySourcePort,
  PlayerEntityAdapterDeps,
} from './selvage-adapters.js';

export { createPlayerConnectOrchestrator } from './player-connect-orchestrator.js';
export type {
  PlayerConnectOrchestrator,
  PlayerConnectDeps,
  PlayerConnectRequest,
  PlayerConnectResult,
  PlayerConnectSuccess,
  PlayerConnectError,
  PlayerConnectErrorCode,
  ConnectTokenPort,
  ConnectTokenResult,
  ConnectIdentityPort,
  ConnectIdentityInfo,
  ConnectPlayerPort,
  ConnectPlayerInput,
  ConnectSpawnPort,
  ConnectSpawnInput,
  ConnectSpawnResult,
  ConnectSpawnPointPort,
  ConnectLifecyclePort,
} from './player-connect-orchestrator.js';

// ── Inspector Integration ────────────────────────────────────────

export { registerFabricHealthProbes } from './inspector-integration.js';
export type {
  InspectorIntegrationDeps,
  InspectorHealthPort,
  InspectorHealthStatus,
  InspectorProbeResult,
  InspectorProbeRegistration,
  NakamaHealthPort,
  ShuttleHealthPort,
  WeaveHealthPort,
  ConnectionHealthPort,
  BridgeHealthPort,
} from './inspector-integration.js';

// ── Wire Codec ───────────────────────────────────────────────────

export { createJsonPayloadCodec, createMessageFactory } from './wire-codec.js';

// ── Bridge Service ───────────────────────────────────────────────

export { createBridgeService, BRIDGE_SERVICE_PRIORITY } from './bridge-service.js';
export type {
  BridgeService,
  BridgeServiceDeps,
  BridgeRenderingFabric,
  BridgeClock,
  BridgeStats,
} from './bridge-service.js';

// ── Game Orchestrator ───────────────────────────────────────────

export { createGameOrchestrator } from './game-orchestrator.js';
export type {
  GameOrchestrator,
  GameOrchestratorConfig,
  FabricDeps,
  ShuttleFabricDeps,
  WeaveFabricDeps,
  ConnectFabricDeps,
  InspectorFabricDeps,
} from './game-orchestrator.js';

// ── Transit-Weave Queue Adapter ─────────────────────────────────

export {
  createTransitWeaveAdapter,
  DEFAULT_TRANSIT_WEAVE_CONFIG,
} from './transit-weave-adapter.js';
export type {
  TransitWeaveAdapter,
  TransitWeaveAdapterDeps,
  TransitWeaveAdapterConfig,
  TransitQueueWritePort,
  TransitQueueItem,
  WeaveQueueReadPort,
  WeaveQueueReadEntry,
  TransitWeaveStats,
} from './transit-weave-adapter.js';

// ── Mortality-Connect Adapter ───────────────────────────────────

export { createMortalityConnectAdapter } from './mortality-connect-adapter.js';
export type {
  MortalityConnectAdapter,
  MortalityConnectDeps,
  MortalityRecordPort,
  MortalityLoginResult,
  PresenceDisconnectPort,
  ConnectionResolverPort,
  MortalityConnectLifecycle,
  MortalityConnectStats,
} from './mortality-connect-adapter.js';

// ── World Generation & Terrain ──────────────────────────────────

export { createWorldGenerator } from './world-generator.js';
export type {
  WorldGenerator,
  StellarClass,
  ZoneType,
  StellarInput,
  WorldParameters,
  TerrainHeightmap,
  ContinentPlacement,
  GeneratedWorld,
} from './world-generator.js';

export { createBiomeEngine } from './biome-engine.js';
export type {
  BiomeEngine,
  BiomeType,
  ClimateZone,
  BiomeCell,
  BiomeTransition,
  BiomeResourceDeposit,
  BiomeMetadata,
  BiomeMap,
  BiomeMapParams,
  BiomeClassificationInput,
} from './biome-engine.js';

export { createResourceDistribution } from './resource-distribution.js';
export type {
  ResourceDistribution,
  ResourceType,
  RarityTier,
  ResourceDeposit,
  DepositPlacementInput,
  DistributionConfig,
  ExtractionResult,
  DepositFilter,
  DistributionStats,
} from './resource-distribution.js';

export { createSettlementEngine } from './settlement-engine.js';
export type {
  SettlementEngine,
  SettlementTier,
  SettlementEventType,
  InfrastructureLevels,
  Settlement,
  TradeRoute,
  SettlementEvent,
  FoundSettlementParams,
  SettlementStats,
} from './settlement-engine.js';

export { createWeatherSystem } from './weather-system.js';
export type {
  WeatherSystem,
  WeatherType,
  WeatherEffects,
  WeatherDuration,
  WeatherState,
  WeatherTransition,
  SeasonalPattern,
  WeatherInput,
  WeatherSystemStats,
} from './weather-system.js';

export { createNavigationMesh } from './navigation-mesh.js';
export type {
  NavigationMesh,
  NodeType,
  NavigationLayer,
  NavNode,
  NavPath,
  NavObstacle,
  PathRequest,
  NavMeshStats,
} from './navigation-mesh.js';
export { createSpatialIndex } from './spatial-index.js';
export type {
  SpatialIndex,
  SpatialIndexDeps,
  SpatialEntry,
  Vec2,
  RangeQueryResult,
  ZoneBoundary,
  SpatialZone,
  ZoneCrossingCallback,
  SpatialIndexStats,
} from './spatial-index.js';
export { createEntitySpawnLifecycle } from './entity-spawn-lifecycle.js';
export type {
  EntitySpawnLifecycle,
  SpawnLifecycleDeps,
  SpawnRequest,
  DestroyRequest,
  SpawnResult as LifecycleSpawnResult,
  DestroyResult,
  SpawnHook,
  DestroyHook,
  LifecycleEventCallback,
  LifecycleEvent,
  PoolConfig as LifecyclePoolConfig,
  FlushResult,
  SpawnLifecycleStats,
} from './entity-spawn-lifecycle.js';
export { createArchetypeStore } from './component-archetype.js';
export type {
  ArchetypeStore,
  ArchetypeStoreDeps,
  ArchetypeId,
  Archetype,
  ArchetypeChunk,
  ArchetypeQueryResult,
  ArchetypeIterator,
  ArchetypeStoreStats,
} from './component-archetype.js';
export { createSystemScheduler } from './system-scheduler.js';
export type {
  SystemScheduler,
  SystemSchedulerDeps,
  ExecutionPhase,
  SystemDefinition,
  ParallelGroup,
  ExecutionPlan,
  PhasePlan,
  ExecutionTiming,
  SystemSchedulerStats,
} from './system-scheduler.js';
export {
  createSagaOrchestrator,
  MAX_SAGA_STEPS,
  DEFAULT_STEP_TIMEOUT_US,
  MAX_COMPENSATION_RETRIES,
} from './saga-orchestrator.js';
export type {
  SagaOrchestrator,
  SagaDeps,
  SagaPhase,
  SagaDefinition,
  SagaStep,
  SagaInstance,
  SagaStepState,
  SagaStepResult,
  CompensationResult,
  SagaEvent,
  SagaEventKind,
  SagaStats,
} from './saga-orchestrator.js';
export { createCqrsHandler, MAX_EXECUTION_LOG_SIZE, DEFAULT_TIMEOUT_US } from './cqrs-handler.js';
export type {
  CqrsHandler,
  CqrsDeps,
  HandlerType,
  CommandHandlerFn,
  QueryHandlerFn,
  CommandEnvelope,
  QueryEnvelope,
  HandlerRegistration,
  ExecutionResult as CqrsExecutionResult,
  CqrsEvent,
  CqrsEventKind,
  HandlerStats,
  CqrsStats,
} from './cqrs-handler.js';
export { createTerrainErosion } from './terrain-erosion.js';
export type {
  TerrainQuality,
  ErosionFactorType,
  ErosionFactor,
  TerrainCell,
  ErosionRecord,
  RestorationEvent,
  ErosionReport,
  TerrainErosionDeps,
  TerrainErosion,
} from './terrain-erosion.js';
export { createDayNightCycle } from './day-night-cycle.js';
export type {
  DayPhase,
  LightingState,
  TimeOfDay,
  WorldClock,
  PhaseTransition,
  PhaseListener,
  DayNightCycleDeps,
  DayNightCycle,
} from './day-night-cycle.js';
export { createEntityInfluence } from './entity-influence.js';
export type {
  Position,
  InfluenceType,
  InfluenceZone,
  InfluenceConflict,
  InfluenceSynergy,
  InfluenceMap,
  InfluenceAtPosition,
  InfluenceReport,
  EntityInfluenceDeps,
  EntityInfluence,
} from './entity-influence.js';
export { createEventStream } from './event-stream.js';
export type {
  StreamEvent,
  StreamCursor,
  StreamSubscriber,
  StreamSubscription,
  ReplayResult,
  StreamStats,
  EventStreamDeps,
  EventStream,
} from './event-stream.js';

export { createProceduralQuestModule } from './procedural-quest.js';
export type {
  QuestDeps,
  QuestDifficulty,
  QuestTriggerType,
  QuestTrigger,
  QuestReward,
  QuestTemplate,
  GeneratedQuest,
  QuestChain,
  ProceduralQuestModule,
} from './procedural-quest.js';
export { createLootTableModule } from './loot-table.js';
export type {
  LootDeps,
  RarityTier as LootRarityTier,
  LootEntry,
  LootPool,
  LootTable,
  DroppedItem,
  LootRoll,
  LootTableModule,
  TableStats,
  DropPreview,
} from './loot-table.js';

// -- Wave 10: Ability System -------------------------------------------------
export {
  createAbilitySystem,
  registerAbility,
  setEntityResources,
  getEntityResources,
  isOnCooldown,
  validateResources,
  activateAbility,
  applyEffect as applyAbilityEffect,
  resetCooldown,
  getAbilityReport,
  getActiveEffects as getAbilityActiveEffects,
  listAbilities,
  getAbility,
} from './ability-system.js';
export type {
  EffectType as AbilityEffectType,
  ResourceType as AbilityResourceType,
  ResourceCost as AbilityResourceCost,
  Cooldown,
  AbilityEffect,
  Ability,
  EntityResources,
  ActivationResult,
  AbilityReport,
  EffectApplication,
  AbilitySystemError,
} from './ability-system.js';

// -- Wave 10: Status Effects -------------------------------------------------
export {
  createStatusEffectSystem,
  applyEffect as applyStatusEffect,
  removeEffect,
  grantImmunity,
  revokeImmunity,
  tickEffects,
  getActiveEffects as getActiveStatusEffects,
  getStatusReport,
  clearAllEffects,
  clearAllImmunities,
  removeEffectsByType,
} from './status-effect.js';
export type {
  EffectType as StatusEffectType,
  StackBehavior,
  StatusEffect,
  ActiveEffect,
  ImmunityRecord,
  StatusReport,
  TickResult as StatusTickResult,
  StatusEffectError,
} from './status-effect.js';

// -- Wave 10: Dungeon Generator ----------------------------------------------
export {
  createDungeonGeneratorState,
  generateLayout,
  addRoom,
  connectRooms,
  validateConnectivity,
  getLayout,
  scaleDifficulty,
  getRoomsByType,
  getPathBetween,
  getTotalEnemyBudget,
  getRoom,
  getAdjacentRooms,
} from './dungeon-generator.js';
export type {
  RoomType,
  DifficultyTier,
  DungeonRoom,
  RoomConnection,
  DungeonLayout,
  LayoutValidation,
  GenerationParams,
  DungeonGeneratorState,
  DungeonGeneratorError,
} from './dungeon-generator.js';

// -- Wave 10: Spawn Budget ---------------------------------------------------
export {
  createSpawnBudgetState,
  setBudget,
  requestSpawn,
  recordDespawn,
  getBudgetReport,
  getQueueDepth,
  processQueue,
  emergencyPurge,
  refillBudgets,
  getAllReports,
  clearQueue,
  getQueueSnapshot,
  cancelRequest,
  getBudget,
  incrementActiveCount,
  getTotalActiveEntities,
  getTotalMaxEntities,
} from './spawn-budget.js';
export type {
  EntityCategory,
  SpawnPriority,
  SpawnBudget,
  SpawnRequest as BudgetSpawnRequest,
  SpawnQueue,
  BudgetReport,
  SpawnBudgetState,
  SpawnBudgetError,
} from './spawn-budget.js';

// -- Wave 10: Weather Forecast -----------------------------------------------
export {
  createWeatherForecastState,
  setCurrentWeather,
  generateForecast,
  trackStorm,
  setSeasonalPattern,
  getWeatherImpact,
  advanceWeather,
  getWeatherReport,
  getForecast,
  getStorm,
  advanceStorm,
  dissipateStorm,
  getCurrentWeather,
  getSeasonalPattern,
  getActiveStorms,
  isStormAtLocation,
  updateStormIntensity,
  getAllWeatherConditions,
  getForecastByWorld,
  cleanupExpiredForecasts,
  cleanupDissipatedStorms,
} from './weather-forecast.js';
export type {
  WeatherCondition,
  WeatherForecast,
  StormSystem,
  SeasonalPattern as ForecastSeasonalPattern,
  WeatherImpact,
  WeatherReport,
  WeatherForecastState,
  WeatherForecastError,
} from './weather-forecast.js';

// -- Wave 11: Entity Migration -----------------------------------------------
export { createEntityMigrationSystem } from './entity-migration.js';
export type {
  MigrationId,
  EntityId as MigrationEntityId,
  WorldId as MigrationWorldId,
  MigrationType,
  MigrationStatus,
  MigrationError,
  Migration,
  EntityMigrationSystem,
  EntityMigrationDeps,
} from './entity-migration.js';

// -- Wave 11: Performance Profiler -------------------------------------------
export { createPerformanceProfilerSystem } from './performance-profiler.js';
export type {
  ProfilerSessionId,
  SystemName,
  FrameMetric,
  ProfilerSession,
  SystemStats,
  ProfilerError,
  PerformanceProfilerSystem,
  PerformanceProfilerDeps,
} from './performance-profiler.js';

// -- Wave 11: Config Loader --------------------------------------------------
export { createConfigLoaderSystem } from './config-loader.js';
export type {
  ConfigKey,
  ConfigScope,
  ConfigValue,
  ConfigEntry as ConfigLoaderEntry,
  ConfigChange,
  ConfigSnapshot,
  ConfigError,
  ConfigLoaderSystem,
  ConfigLoaderDeps,
} from './config-loader.js';

// -- Wave 10: World Physics --------------------------------------------------
export {
  createWorldPhysicsState,
  registerWorldPhysics,
  updatePhysics,
  getModifiers,
  validatePhysics,
  compareWorlds,
  getPhysicsReport,
  setConstraint,
  getPhysics,
  getConstraint,
  getAllPhysics,
  getWorldsByGravityClass,
  getWorldsByAtmosphere,
  getHabitableWorlds,
  removePhysics,
  removeConstraint,
} from './world-physics.js';
export type {
  AtmosphereType,
  GravityClass,
  WorldPhysics,
  PhysicsModifiers,
  PhysicsReport,
  PhysicsConstraint,
  WorldPhysicsState,
  WorldPhysicsError,
} from './world-physics.js';

// -- Wave 12: Scene Graph ----------------------------------------------------
export { createSceneGraphSystem } from './scene-graph.js';
export type {
  NodeId,
  SceneError,
  Transform,
  SceneNode,
  SceneStats,
  SceneGraphSystem,
  SceneGraphDeps,
} from './scene-graph.js';

// -- Wave 12: Collision System -----------------------------------------------
export { createCollisionSystem } from './collision-system.js';
export type {
  BodyId,
  CollisionError,
  AABB,
  CollisionBody,
  Collision,
  CollisionQuery,
  CollisionStats,
  CollisionSystem,
  CollisionSystemDeps,
} from './collision-system.js';

// -- Wave 12: Input Mapper ---------------------------------------------------
export { createInputMapperSystem } from './input-mapper.js';
export type {
  ActionId,
  InputCode,
  InputMapperError,
  InputAction,
  InputEvent,
  BindingConflict,
  InputMapperSystem,
  InputMapperDeps,
} from './input-mapper.js';

// -- Wave 13: Terrain Engine -------------------------------------------------
export { createTerrainEngineSystem } from './terrain-engine.js';
export type {
  ChunkId,
  WorldId as TerrainWorldId,
  Biome,
  TerrainError,
  ChunkCoords,
  TerrainChunk,
  BiomeDistribution,
  TerrainEngineSystem,
  TerrainEngineDeps,
} from './terrain-engine.js';

// -- Wave 13: Loom Weather ---------------------------------------------------
export { createLoomWeatherSystem } from './loom-weather.js';
export type {
  WeatherId,
  LoomWorldId,
  LoomWeatherType,
  WeatherError,
  WeatherEffectType,
  WeatherCondition as LoomWeatherCondition,
  WeatherEffect as LoomWeatherEffect,
  WeatherReport as LoomWeatherReport,
  LoomWeatherSystem,
  LoomWeatherDeps,
} from './loom-weather.js';

// -- Wave 13: Quest Tracker --------------------------------------------------
export { createQuestTrackerSystem } from './quest-tracker.js';
export type {
  QuestId,
  PlayerId as QuestPlayerId,
  ObjectiveId,
  QuestStatus,
  ObjectiveStatus,
  QuestError,
  QuestObjectiveTemplate,
  QuestTemplate as QuestTrackerTemplate,
  PlayerQuest,
  QuestReward as QuestTrackerReward,
  PlayerQuestStats,
  QuestTrackerSystem,
  QuestTrackerDeps,
} from './quest-tracker.js';

// -- Wave 14: Save Game ------------------------------------------------------
export { createSaveGameSystem } from './save-game.js';
export type {
  SaveId,
  PlayerId as SavePlayerId,
  SlotId,
  SaveError,
  SaveSlot,
  SaveData,
  SaveState,
  SaveSummary,
  SaveGameSystem,
  SaveGameDeps,
} from './save-game.js';

// -- Wave 14: Achievement System ---------------------------------------------
export { createAchievementSystem } from './achievement-system.js';
export type {
  AchievementId,
  PlayerId as AchievementPlayerId,
  AchievementError,
  AchievementRarity,
  Achievement,
  PlayerAchievement,
  ProgressTracker,
  PlayerStats as AchievementPlayerStats,
  AchievementSystem,
  AchievementSystemDeps,
} from './achievement-system.js';

// -- Wave 14: Player Progression ---------------------------------------------
export { createPlayerProgressionSystem } from './player-progression.js';
export type {
  PlayerId as ProgressionPlayerId,
  SkillId,
  ProgressionError,
  PlayerLevel,
  Skill,
  PlayerSkill,
  ProgressionStats,
  PlayerProgressionSystem,
  PlayerProgressionDeps,
} from './player-progression.js';

// ── Phase 1 Infrastructure Adapters ─────────────────────────────

export { createPinoLogger } from './pino-logger.js';
export { createRedisCache, createInMemoryCache } from './redis-cache.js';
export type { CachePort, RedisConfig } from './redis-cache.js';

// ── Phase 8 Player Event Engine ─────────────────────────────────

export { createPlayerEventEngine } from './player-event-engine.js';
export type {
  PlayerEventEngine,
  PlayerEventEngineDeps,
  PlayerEventEngineConfig,
  PlayerEventEngineStats,
  EventClockPort,
  EventIdPort,
  EventLogPort,
  EventWorldPort,
  EventNotificationPort,
  EventRemembrancePort,
  EventNotification,
  PlayerEventType,
  PlayerEventPhase,
  BracketType,
  PlayerEventRecord,
  EventParticipant,
  ProposeEventParams,
  TournamentBracket,
  TournamentRound,
  TournamentMatch,
} from './player-event-engine.js';

export { createAudioEngine } from './audio-engine.js';
export type {
  AudioEngine,
  AudioEngineDeps,
  AudioEngineConfig,
  AudioEngineStats,
  AudioClockPort,
  AudioLogPort,
  MusicMood,
  AudioLayer,
  CueType,
  AudioDirective,
  AudioPosition,
  BiomeSoundscape,
  WeatherSoundMapping,
  MusicTrack,
} from './audio-engine.js';

export { createUiStateEngine } from './ui-state-engine.js';
export type {
  UiStateEngine,
  UiStateEngineDeps,
  UiStateEngineConfig,
  UiStateEngineStats,
  UiClockPort,
  UiIdPort,
  UiLogPort,
  PanelId,
  NotificationPriority,
  InputScheme,
  HudState,
  UiPosition,
  QuestTrackerEntry,
  UiNotification,
  ContextMenuItem,
  ContextMenu,
  ModalDialog,
  ModalButton,
  TooltipData,
  TooltipLine,
  UiSnapshot,
} from './ui-state-engine.js';

// ── Phase 12.3 Estate System ────────────────────────────────────

export { createEstateSystemEngine } from './estate-system.js';
export type {
  EstateClockPort,
  EstateIdPort,
  EstateLogPort,
  EstateEventPort,
  EstateStorePort,
  EstateEconomyPort,
  EstateTier,
  EstateSpecialization,
  ArchitecturalStyle,
  DefenseType,
  ProductionState,
  Estate,
  EstateWorker,
  DefenseInstallation,
  ProductionChain,
  ProductionInput,
  ProductionOutput,
  UpgradeRequirement,
  DynastyEstateNetwork,
  CoordinatedChain,
  SiegeState,
  EstateSystemConfig,
  EstateSystemStats,
  EstateSystemEngine,
  EstateSystemDeps,
} from './estate-system.js';

// Performance optimization
export {
  QUALITY_TIERS,
  createPerfOptimizationEngine,
} from './perf-optimization.js';
export type {
  PerfClockPort,
  PerfIdPort,
  PerfLogPort,
  PerfEventPort,
  PerfMetricsStorePort,
  QualityTier,
  QualityPreset,
  DeviceProfile,
  MinimumSpec,
  ScalabilityBenchmark,
  MemorySnapshot,
  NetworkMetrics,
  AdaptiveTickConfig,
  WorldStreamingBudget,
  BootTimeBenchmark,
  LodConfig,
  PerformanceReport,
  PerfOptimizationStats,
  PerfOptimizationDeps,
  PerfOptimizationConfig,
  PerfOptimizationEngine,
  ConnectionQuality,
  DeviceCapability,
  MemoryPressure,
} from './perf-optimization.js';

// Time Compression
export {
  SEASONS,
  ERA_TYPES,
  createTimeCompressionEngine,
} from './time-compression.js';
export type {
  TimeClockPort,
  TimeIdPort,
  TimeLogPort,
  TimeEventPort,
  TimeStorePort,
  FutureSimulatorPort,
  Season,
  EraType,
  WorldClock as TimeWorldClock,
  WorldClockSnapshot,
  CalendarEvent,
  CalendarEventType,
  RecurrencePattern,
  HistoricalEra,
  FutureProjection,
  ProjectionResult,
  PredictedEvent,
  EnvironmentalChange,
  NpcAging,
  LifeStage,
  CareerPhase,
  VisualAgeGroup,
  TimelapseRecording,
  TimelapseSnapshot,
  TimeCompressionStats,
  TimeCompressionDeps,
  TimeCompressionConfig,
  TimeCompressionEngine,
} from './time-compression.js';

// Adaptive World Systems
export { createAdaptiveWorldEngine } from './adaptive-world.js';
export type {
  AdaptiveClockPort,
  AdaptiveIdPort,
  AdaptiveLogPort,
  AdaptiveEventPort,
  AdaptiveStorePort,
  AdaptiveMetricsPort,
  EconomyModelPort,
  AdaptiveDensityTier,
  ZoneDensityMap,
  ContentBias,
  ZoneActivityMetrics,
  ResourceRegenState,
  ResourceEntry,
  PopulationSnapshot,
  ZonePopulation,
  AdaptiveWorldEventType,
  AdaptiveWorldEvent,
  WorldEventTrigger,
  WorldEventEffects,
  AdaptiveTradeRouteTier,
  AdaptiveTradeRoute,
  DecayState,
  DecayStage,
  AdaptiveClimateState,
  EconomyMetrics,
  EconomyAdjustment,
  EconomyBalanceSnapshot,
  AdaptiveWorldDeps,
  AdaptiveWorldConfig,
  AdaptiveWorldEngine,
  AdaptiveWorldStats,
} from './adaptive-world.js';

// ── Phase 22: Creative canon — Lattice, Ascendancy, Sealed Chambers, Survey, Continuity ──

// Lattice Node
export { createLatticeNodeService } from './lattice-node.js';
export type {
  FrequencySignature,
  LatticeNode,
  LockRequest,
  LockStatus,
  CompromiseType,
  BeaconStatus,
  LatticeNodeDeps,
  LatticeNodeService,
  NetworkStats,
} from './lattice-node.js';
export {
  BASE_LOCK_MS,
  CRITICAL_PRECISION_THRESHOLD,
  DISTANCE_PENALTY_PER_LY,
  FIELD_MULTIPLIER_MIN,
  FIELD_MULTIPLIER_MAX,
  OUTER_ARC_THRESHOLD_LY as LATTICE_OUTER_ARC_THRESHOLD_LY,
} from './lattice-node.js';

// Ascendancy Engine
export { createAscendancyEngine } from './ascendancy-engine.js';
export type {
  FrequencyAnomaly,
  ThreatEvent,
  BeaconIntegrityScore,
  AscendancyChronicleEntry,
  AscendancyEngineDeps,
  AscendancyEngine,
} from './ascendancy-engine.js';
export {
  OUTER_ARC_THRESHOLD_LY as ASCENDANCY_OUTER_ARC_THRESHOLD_LY,
  DETECTION_CONFIDENCE_THRESHOLD,
  FERREIRA_ASANTE_CORRELATION,
} from './ascendancy-engine.js';

// Sealed Chambers
export { createSealedChambersService } from './sealed-chambers.js';
export type {
  ChamberId,
  ChamberState,
  ChamberRecord,
  ChamberConditionEvaluator,
  SealedChambersService,
  SealedChambersDeps,
  UnlockSummary,
} from './sealed-chambers.js';
export {
  CHAMBER_ONE_MIN_SURVEY_WORLDS,
  CHAMBER_THREE_CHRONICLE_TARGET,
  CHAMBER_FIVE_OUTER_ARC_LY,
  CHAMBER_SIX_KALON_ANOMALY_COUNT,
  CHAMBER_SEVEN_UNLOCK_YEAR,
} from './sealed-chambers.js';

// Survey Vessel
export { createSurveyVesselService, computeTransitHours } from './survey-vessel.js';
export type {
  SurveyVessel,
  VesselTransitState,
  VesselClass,
  GalacticCoordinate,
  SurveyMark,
  VesselTransitRecord,
  TransitEstimate,
  SurveyVesselDeps,
  SurveyVesselService,
  FleetStats,
} from './survey-vessel.js';
export {
  SURVEY_VESSEL_MIN_VELOCITY,
  SURVEY_VESSEL_MAX_VELOCITY,
  HOURS_PER_YEAR,
  FUSION_RANGE_MIN_LY,
  FUSION_RANGE_MAX_LY,
} from './survey-vessel.js';

// Continuity Protocol
export { createContinuityProtocolService } from './continuity-protocol.js';
export type {
  ContinuityPhilosophicalStatus,
  VigilState,
  NeuralMap,
  DynastyContinuityRecord,
  ContinuityChronicleEntry,
  ContinuityProtocolDeps,
  ContinuityProtocolService,
  FileNeuralMapParams,
  SubstrateTransferParams,
  ContinuityStats,
} from './continuity-protocol.js';
export {
  DEFAULT_VIGIL_THRESHOLD_DAYS,
  MS_PER_DAY,
  NEURAL_MAP_MIN_FIDELITY,
  MAX_CONTINUITY_BONDS,
} from './continuity-protocol.js';

// World 499: The Threshold
export {
  WORLD_499_SEED,
  WORLD_499_ID,
  WORLD_499_DISPLAY_NAME,
  WORLD_499_DISTANCE_LY,
  FERREIRA_ASANTE_ECHO_MS,
  WORLD_499_LATTICE_PRECISION,
  WORLD_499_LORE_SUMMARY,
} from './world-seeds/world-499-threshold.js';

// Launch World Seeds (Worlds 1-8)
export {
  WORLD_ALKAHEST_ID,
  WORLD_ALKAHEST_DISPLAY_NAME,
  WORLD_ALKAHEST_DISTANCE_LY,
  WORLD_ALKAHEST_NODE_DENSITY,
  WORLD_ALKAHEST_ASSEMBLY_SEAT_COUNT,
  WORLD_ALKAHEST_SEED,
  WORLD_ALKAHEST_LORE_SUMMARY,
} from './world-seeds/world-alkahest.js';
export {
  WORLD_MERIDIANS_REST_ID,
  WORLD_MERIDIANS_REST_DISPLAY_NAME,
  WORLD_MERIDIANS_REST_DISTANCE_LY,
  WORLD_MERIDIANS_REST_NODE_DENSITY,
  WORLD_MERIDIANS_REST_FOUNDING_REGISTRATION_YEAR,
  WORLD_MERIDIANS_REST_SEED,
  WORLD_MERIDIANS_REST_LORE_SUMMARY,
} from './world-seeds/world-meridians-rest.js';
export {
  WORLD_AMBER_REACH_ID,
  WORLD_AMBER_REACH_DISPLAY_NAME,
  WORLD_AMBER_REACH_DISTANCE_LY,
  WORLD_AMBER_REACH_NODE_DENSITY,
  WORLD_AMBER_REACH_PENDING_REFERENDUMS,
  WORLD_AMBER_REACH_SEED,
  WORLD_AMBER_REACH_LORE_SUMMARY,
} from './world-seeds/world-amber-reach.js';
export {
  WORLD_IRON_MERIDIAN_ID,
  WORLD_IRON_MERIDIAN_DISPLAY_NAME,
  WORLD_IRON_MERIDIAN_DISTANCE_LY,
  WORLD_IRON_MERIDIAN_NODE_DENSITY,
  WORLD_IRON_MERIDIAN_UCHENNA_CERTIFICATIONS,
  WORLD_IRON_MERIDIAN_SEED,
  WORLD_IRON_MERIDIAN_LORE_SUMMARY,
} from './world-seeds/world-iron-meridian.js';
export {
  WORLD_SELENES_CRADLE_ID,
  WORLD_SELENES_CRADLE_DISPLAY_NAME,
  WORLD_SELENES_CRADLE_DISTANCE_LY,
  WORLD_SELENES_CRADLE_NODE_DENSITY,
  WORLD_SELENES_CRADLE_LATTICE_INTEGRITY,
  WORLD_SELENES_CRADLE_DEGRADATION_EVENTS,
  WORLD_SELENES_CRADLE_SEED,
  WORLD_SELENES_CRADLE_LORE_SUMMARY,
} from './world-seeds/world-selenes-cradle.js';
export {
  WORLD_VEIL_OF_KASS_ID,
  WORLD_VEIL_OF_KASS_DISPLAY_NAME,
  WORLD_VEIL_OF_KASS_DISTANCE_LY,
  WORLD_VEIL_OF_KASS_NODE_DENSITY,
  WORLD_VEIL_OF_KASS_SOVEREIGNTY_TRANSITIONS,
  WORLD_VEIL_OF_KASS_KALON_ISSUANCE_MILLIONS,
  WORLD_VEIL_OF_KASS_SEED,
  WORLD_VEIL_OF_KASS_LORE_SUMMARY,
} from './world-seeds/world-veil-of-kass.js';
export {
  WORLD_DEEP_TIDAL_ID,
  WORLD_DEEP_TIDAL_DISPLAY_NAME,
  WORLD_DEEP_TIDAL_DISTANCE_LY,
  WORLD_DEEP_TIDAL_NODE_DENSITY,
  WORLD_DEEP_TIDAL_TIDAL_ZONE_COUNT,
  WORLD_DEEP_TIDAL_TWILIGHT_BELT_POPULATION,
  WORLD_DEEP_TIDAL_SEED,
  WORLD_DEEP_TIDAL_LORE_SUMMARY,
} from './world-seeds/world-deep-tidal.js';
export {
  WORLD_VARANTHA_STATION_ID,
  WORLD_VARANTHA_STATION_DISPLAY_NAME,
  WORLD_VARANTHA_STATION_DISTANCE_LY,
  WORLD_VARANTHA_STATION_NODE_DENSITY,
  WORLD_VARANTHA_STATION_POPULATION,
  WORLD_VARANTHA_STATION_TRANSIENT_POPULATION,
  WORLD_VARANTHA_STATION_SEED,
  WORLD_VARANTHA_STATION_LORE_SUMMARY,
} from './world-seeds/world-varantha-station.js';

// ── World Soundscape Profiles ────────────────────────────────────

export {
  createWorldSoundscapeProfiles,
  WORLD_SOUNDSCAPE_PROFILES,
  TOTAL_SOUNDSCAPE_PROFILES,
} from './world-soundscape-profiles.js';
export type {
  WorldSoundscapeProfile,
  WorldSoundscapeProfilesPort,
  MusicalPalette,
  FadingResponse,
  ThreadwayCrossfade,
} from './world-soundscape-profiles.js';

// ── World Design Atlas ───────────────────────────────────────────

export {
  createWorldDesignAtlas,
  WORLD_DESIGN_ATLAS,
  TOTAL_WORLD_DESIGN_PROFILES,
} from './world-design-atlas.js';
export type {
  WorldZone,
  WorldDesignProfile,
  WorldDesignAtlasPort,
} from './world-design-atlas.js';

// ── World Ambient Atlas ──────────────────────────────────────────

export {
  createWorldAmbientAtlas,
  WORLD_AMBIENT_ATLAS,
  TOTAL_WORLD_AMBIENT_PROFILES,
} from './world-ambient-atlas.js';
export type {
  AmbientProfileSource,
  AmbientElement,
  WorldAmbientProfile,
  WorldAmbientAtlasPort,
} from './world-ambient-atlas.js';

// Plugin System
export { createPluginSystem } from './plugin-system.js';
export type {
  PluginClockPort,
  PluginIdPort,
  PluginLogPort,
  PluginEventPort,
  PluginStorePort,
  PluginSignaturePort,
  PluginSandboxPort,
  PluginStatus,
  PluginCategory,
  PluginManifest,
  PluginDependency,
  PluginPermission,
  ResourceLimits,
  PluginRegistration,
  SandboxHandle,
  SandboxUsage,
  MarketplaceEntry,
  PluginTelemetrySample,
  PluginApiDoc,
  ApiEndpointDoc,
  ApiEventDoc,
  ParameterDoc,
  HotReloadResult,
  DependencyResolution,
  DependencyConflict,
  PluginSystemDeps,
  PluginSystemConfig,
  PluginSystem,
  ApiCompatibilityResult,
  PluginSystemStats,
} from './plugin-system.js';
