/**
 * Loom Event System Contracts
 *
 * Events are THE communication mechanism in The Loom.
 * No module calls another module directly. Ever.
 * Everything flows through typed events on the event bus.
 *
 * Events can cross:
 * - Module boundaries (loom-core → silfen-weave)
 * - Network boundaries (Server A → Server B)
 * - Engine boundaries (The Loom → UE5)
 * - Time (events are stored, replayed, rewound)
 */

export type { LoomEvent, EventMetadata, EventHandler, EventFilter } from "./event.js";
export type { EventBus } from "./event-bus.js";
export type {
  EntitySpawnedEvent,
  EntityDespawnedEvent,
  EntityMigratedEvent,
  ComponentChangedEvent,
} from "./entity-events.js";
export type {
  WeaveTransitionStartedEvent,
  WeaveTransitionCompletedEvent,
  WeaveTransitionAbortedEvent,
  WorldLoadedEvent,
  WorldUnloadedEvent,
} from "./world-events.js";
export type {
  PlayerConnectedEvent,
  PlayerDisconnectedEvent,
  PlayerInputReceivedEvent,
} from "./player-events.js";
