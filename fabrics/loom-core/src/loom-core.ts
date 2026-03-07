/**
 * LoomCore — The factory that wires everything together.
 *
 * Dependency injection: all ports are explicitly provided.
 * No global state. No singletons. Easy to test.
 */

import type { EventBus } from '@loom/events-contracts';
import type { EntityRegistry } from './entity-registry.js';
import type { WorldManager } from './world-manager.js';
import type { EventFactory } from './event-factory.js';
import type { Clock } from './clock.js';
import type { IdGenerator } from './id-generator.js';
import type { Logger } from './logger.js';
import { createInProcessEventBus } from './in-process-event-bus.js';
import { createComponentStore } from './component-store.js';
import { createEntityRegistry } from './entity-registry.js';
import { createWorldManager } from './world-manager.js';
import { createEventFactory } from './event-factory.js';
import { createSystemClock } from './clock.js';
import { createUuidGenerator } from './id-generator.js';
import { createSilentLogger } from './logger.js';

export interface LoomCore {
  readonly eventBus: EventBus;
  readonly entities: EntityRegistry;
  readonly worlds: WorldManager;
  readonly eventFactory: EventFactory;
  shutdown(): void;
}

export interface LoomCoreConfig {
  readonly clock?: Clock;
  readonly idGenerator?: IdGenerator;
  readonly logger?: Logger;
  readonly eventHistoryCapacity?: number;
}

export function createLoomCore(config: LoomCoreConfig = {}): LoomCore {
  const clock = config.clock ?? createSystemClock();
  const idGenerator = config.idGenerator ?? createUuidGenerator();
  const logger = config.logger ?? createSilentLogger();

  const eventBusImpl = createInProcessEventBus({
    logger,
    historyCapacity: config.eventHistoryCapacity,
  });

  const eventFactory = createEventFactory(clock, idGenerator);
  const componentStore = createComponentStore();

  const entities = createEntityRegistry({
    eventBus: eventBusImpl,
    eventFactory,
    componentStore,
    idGenerator,
    clock,
  });

  const worlds = createWorldManager({
    eventBus: eventBusImpl,
    eventFactory,
    clock,
  });

  function shutdown(): void {
    eventBusImpl.close();
  }

  return { eventBus: eventBusImpl, entities, worlds, eventFactory, shutdown };
}
