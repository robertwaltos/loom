/**
 * @loom/loom-core — The central nervous system of The Loom.
 *
 * Provides: Event Bus, Entity Registry, World Manager, Event Factory.
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

export { matchesFilter } from './event-filter-matcher.js';

export { createSystemClock, createFakeClock } from './clock.js';
export type { Clock } from './clock.js';
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
