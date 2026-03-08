/**
 * @loom/loom-core — The central nervous system of The Loom.
 *
 * Provides: Event Bus, Entity Registry, World Manager, Event Factory,
 * System Registry, Tick Loop, Entity Query Engine, Event Journal,
 * Resource Pool, Command Bus, Entity Lifecycle Manager, Event Replay,
 * World Event Scheduler, Entity Template Registry, Config Registry,
 * Event Correlation Engine, System Dependency Graph, Entity Group Manager,
 * State Snapshot Service, Priority Queue, Service Registry.
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
export { createTimeService, DEFAULT_TIME_CONFIG } from './time-service.js';
export type { TimeService, TimeServiceConfig } from './time-service.js';
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
