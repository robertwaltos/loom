/**
 * Weave Event Bus — Cross-world event propagation through the Lattice
 * Events propagate across worlds, filtered by world/type/priority, with TTL
 */

// ============================================================================
// Ports (Duplicated)
// ============================================================================

interface WeaveClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface WeaveLoggerPort {
  readonly info: (message: string, context: Record<string, unknown>) => void;
  readonly warn: (message: string, context: Record<string, unknown>) => void;
  readonly error: (message: string, context: Record<string, unknown>) => void;
}

// ============================================================================
// Types
// ============================================================================

export type EventPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface WeaveEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly originWorldId: string;
  readonly priority: EventPriority;
  readonly payload: Record<string, unknown>;
  readonly timestampMicros: bigint;
  readonly ttlMicros: bigint;
}

export interface EventRelay {
  readonly event: WeaveEvent;
  readonly relayedToWorlds: ReadonlyArray<string>;
  readonly relayTimestampMicros: bigint;
}

export interface WorldFilter {
  readonly worldId: string;
  readonly eventTypes: ReadonlyArray<string>;
  readonly minPriority: EventPriority;
}

export interface RelayResult {
  readonly eventId: string;
  readonly worldsRelayedTo: ReadonlyArray<string>;
  readonly skippedWorlds: ReadonlyArray<string>;
}

interface SubscriptionRecord {
  readonly worldId: string;
  readonly eventTypes: ReadonlyArray<string>;
  readonly minPriority: EventPriority;
}

// ============================================================================
// State
// ============================================================================

interface WeaveEventBusState {
  readonly events: Map<string, WeaveEvent>;
  readonly relays: Map<string, EventRelay>;
  readonly subscriptions: Map<string, SubscriptionRecord>;
}

// ============================================================================
// Dependencies
// ============================================================================

export interface WeaveEventBusDeps {
  readonly clock: WeaveClockPort;
  readonly logger: WeaveLoggerPort;
}

// ============================================================================
// Module Interface
// ============================================================================

export interface WeaveEventBusModule {
  readonly publishEvent: (event: Omit<WeaveEvent, 'timestampMicros'>) => PublishResult;
  readonly relayToWorld: (eventId: string, targetWorldId: string) => RelayToWorldResult;
  readonly subscribeWorld: (
    worldId: string,
    eventTypes: ReadonlyArray<string>,
    minPriority: EventPriority,
  ) => void;
  readonly getEventHistory: (filter: Partial<WorldFilter>) => ReadonlyArray<WeaveEvent>;
  readonly pruneExpired: () => number;
  readonly getEvent: (eventId: string) => GetEventResult;
  readonly unsubscribeWorld: (worldId: string) => void;
}

export type PublishResult =
  | { readonly success: true; readonly eventId: string }
  | { readonly success: false; readonly error: string };
export type RelayToWorldResult =
  | { readonly success: true; readonly relayed: boolean }
  | { readonly success: false; readonly error: string };
export type GetEventResult =
  | { readonly found: true; readonly event: WeaveEvent }
  | { readonly found: false; readonly error: string };

// ============================================================================
// Constants
// ============================================================================

const PRIORITY_RANK: Record<EventPriority, number> = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  CRITICAL: 3,
};

// ============================================================================
// Factory
// ============================================================================

export function createWeaveEventBusModule(deps: WeaveEventBusDeps): WeaveEventBusModule {
  const state: WeaveEventBusState = {
    events: new Map(),
    relays: new Map(),
    subscriptions: new Map(),
  };

  return {
    publishEvent: (event) => publishEvent(state, deps, event),
    relayToWorld: (eventId, targetWorldId) => relayToWorld(state, deps, eventId, targetWorldId),
    subscribeWorld: (worldId, eventTypes, minPriority) =>
      subscribeWorld(state, worldId, eventTypes, minPriority),
    getEventHistory: (filter) => getEventHistory(state, filter),
    pruneExpired: () => pruneExpired(state, deps),
    getEvent: (eventId) => getEvent(state, eventId),
    unsubscribeWorld: (worldId) => unsubscribeWorld(state, worldId),
  };
}

// ============================================================================
// Functions
// ============================================================================

function publishEvent(
  state: WeaveEventBusState,
  deps: WeaveEventBusDeps,
  event: Omit<WeaveEvent, 'timestampMicros'>,
): PublishResult {
  const existing = state.events.get(event.eventId);
  if (existing !== undefined) {
    return { success: false, error: 'Event ID already exists' };
  }

  const nowMicros = deps.clock.nowMicroseconds();
  const fullEvent: WeaveEvent = {
    ...event,
    timestampMicros: nowMicros,
  };

  state.events.set(event.eventId, fullEvent);
  deps.logger.info('Event published', {
    eventId: event.eventId,
    eventType: event.eventType,
    originWorldId: event.originWorldId,
  });
  return { success: true, eventId: event.eventId };
}

function relayToWorld(
  state: WeaveEventBusState,
  deps: WeaveEventBusDeps,
  eventId: string,
  targetWorldId: string,
): RelayToWorldResult {
  const event = state.events.get(eventId);
  if (event === undefined) {
    return { success: false, error: 'Event not found' };
  }

  const nowMicros = deps.clock.nowMicroseconds();
  const expiresAtMicros = event.timestampMicros + event.ttlMicros;
  if (nowMicros > expiresAtMicros) {
    return { success: false, error: 'Event expired' };
  }

  const subscription = state.subscriptions.get(targetWorldId);
  if (subscription === undefined) {
    deps.logger.warn('World not subscribed', { targetWorldId, eventId });
    return { success: true, relayed: false };
  }

  const shouldRelay = checkSubscriptionMatch(event, subscription);
  if (!shouldRelay) {
    deps.logger.info('Event filtered by subscription', {
      targetWorldId,
      eventId,
      eventType: event.eventType,
    });
    return { success: true, relayed: false };
  }

  const existing = state.relays.get(eventId);
  const relayedWorlds = existing === undefined ? [] : Array.from(existing.relayedToWorlds);

  if (relayedWorlds.includes(targetWorldId)) {
    deps.logger.info('Event already relayed to world', { targetWorldId, eventId });
    return { success: true, relayed: false };
  }

  relayedWorlds.push(targetWorldId);
  const relay: EventRelay = {
    event,
    relayedToWorlds: relayedWorlds,
    relayTimestampMicros: nowMicros,
  };
  state.relays.set(eventId, relay);
  deps.logger.info('Event relayed to world', {
    targetWorldId,
    eventId,
    eventType: event.eventType,
  });
  return { success: true, relayed: true };
}

function checkSubscriptionMatch(event: WeaveEvent, subscription: SubscriptionRecord): boolean {
  const priorityMatch = PRIORITY_RANK[event.priority] >= PRIORITY_RANK[subscription.minPriority];
  if (!priorityMatch) {
    return false;
  }

  if (subscription.eventTypes.length === 0) {
    return true;
  }

  const typeMatch = subscription.eventTypes.includes(event.eventType);
  return typeMatch;
}

function subscribeWorld(
  state: WeaveEventBusState,
  worldId: string,
  eventTypes: ReadonlyArray<string>,
  minPriority: EventPriority,
): void {
  const subscription: SubscriptionRecord = {
    worldId,
    eventTypes,
    minPriority,
  };
  state.subscriptions.set(worldId, subscription);
}

function unsubscribeWorld(state: WeaveEventBusState, worldId: string): void {
  state.subscriptions.delete(worldId);
}

function getEventHistory(
  state: WeaveEventBusState,
  filter: Partial<WorldFilter>,
): ReadonlyArray<WeaveEvent> {
  const allEvents = Array.from(state.events.values());

  const filtered = allEvents.filter((event) => {
    if (filter.worldId !== undefined && event.originWorldId !== filter.worldId) {
      return false;
    }

    if (filter.eventTypes !== undefined && filter.eventTypes.length > 0) {
      if (!filter.eventTypes.includes(event.eventType)) {
        return false;
      }
    }

    if (filter.minPriority !== undefined) {
      const eventRank = PRIORITY_RANK[event.priority];
      const minRank = PRIORITY_RANK[filter.minPriority];
      if (eventRank < minRank) {
        return false;
      }
    }

    return true;
  });

  return filtered;
}

function pruneExpired(state: WeaveEventBusState, deps: WeaveEventBusDeps): number {
  const nowMicros = deps.clock.nowMicroseconds();
  let prunedCount = 0;

  const eventIds = Array.from(state.events.keys());
  for (let i = 0; i < eventIds.length; i = i + 1) {
    const eventId = eventIds[i];
    if (eventId === undefined) {
      continue;
    }
    const event = state.events.get(eventId);
    if (event === undefined) {
      continue;
    }
    const expiresAtMicros = event.timestampMicros + event.ttlMicros;
    if (nowMicros > expiresAtMicros) {
      state.events.delete(eventId);
      state.relays.delete(eventId);
      prunedCount = prunedCount + 1;
    }
  }

  if (prunedCount > 0) {
    deps.logger.info('Pruned expired events', { prunedCount, remaining: state.events.size });
  }

  return prunedCount;
}

function getEvent(state: WeaveEventBusState, eventId: string): GetEventResult {
  const event = state.events.get(eventId);
  if (event === undefined) {
    return { found: false, error: 'Event not found' };
  }
  return { found: true, event };
}
