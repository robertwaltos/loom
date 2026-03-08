/**
 * @loom/loom-core — The central nervous system of The Loom.
 *
 * Provides: Event Bus, Entity Registry, World Manager, Event Factory,
 * System Registry, Tick Loop, Entity Query Engine, Event Journal,
 * Resource Pool, Command Bus, Entity Lifecycle Manager.
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
