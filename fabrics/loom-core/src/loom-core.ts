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
import type { SystemRegistry } from './system-registry.js';
import type { TickLoop } from './tick-loop.js';
import type { Clock } from './clock.js';
import type { IdGenerator } from './id-generator.js';
import type { Logger } from './logger.js';
import { createInProcessEventBus } from './in-process-event-bus.js';
import { createComponentStore } from './component-store.js';
import { createEntityRegistry } from './entity-registry.js';
import { createWorldManager } from './world-manager.js';
import { createEventFactory } from './event-factory.js';
import { createSystemRegistry } from './system-registry.js';
import { createTickLoop } from './tick-loop.js';
import { createSystemClock } from './clock.js';
import { createUuidGenerator } from './id-generator.js';
import { createSilentLogger } from './logger.js';

export interface LoomCore {
  readonly eventBus: EventBus;
  readonly entities: EntityRegistry;
  readonly worlds: WorldManager;
  readonly eventFactory: EventFactory;
  readonly systems: SystemRegistry;
  readonly tickLoop: TickLoop;
  shutdown(): void;
}

export interface LoomCoreConfig {
  readonly clock?: Clock;
  readonly idGenerator?: IdGenerator;
  readonly logger?: Logger;
  readonly eventHistoryCapacity?: number;
  readonly tickRateHz?: number;
  readonly tickBudgetMs?: number;
}

export function createLoomCore(config: LoomCoreConfig = {}): LoomCore {
  const clock = config.clock ?? createSystemClock();
  const idGenerator = config.idGenerator ?? createUuidGenerator();
  const logger = config.logger ?? createSilentLogger();

  const deps = buildDependencies(clock, idGenerator, logger, config);
  return assembleLoomCore(deps, config);
}

interface CoreDependencies {
  readonly eventBusImpl: ReturnType<typeof createInProcessEventBus>;
  readonly eventFactory: EventFactory;
  readonly entities: EntityRegistry;
  readonly worlds: WorldManager;
  readonly systems: SystemRegistry;
  readonly clock: Clock;
  readonly logger: Logger;
}

function buildDependencies(
  clock: Clock,
  idGenerator: IdGenerator,
  logger: Logger,
  config: LoomCoreConfig,
): CoreDependencies {
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

  const systems = createSystemRegistry({ logger });

  return { eventBusImpl, eventFactory, entities, worlds, systems, clock, logger };
}

function assembleLoomCore(deps: CoreDependencies, config: LoomCoreConfig): LoomCore {
  const tickLoop = createTickLoop({
    systems: deps.systems,
    clock: deps.clock,
    logger: deps.logger,
    tickRateHz: config.tickRateHz,
    budgetMs: config.tickBudgetMs,
  });

  return {
    eventBus: deps.eventBusImpl,
    entities: deps.entities,
    worlds: deps.worlds,
    eventFactory: deps.eventFactory,
    systems: deps.systems,
    tickLoop,
    shutdown: () => {
      tickLoop.stop();
      deps.eventBusImpl.close();
    },
  };
}
