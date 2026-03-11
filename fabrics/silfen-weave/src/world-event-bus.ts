/**
 * world-event-bus.ts — Cross-world event publishing with subscription filtering.
 *
 * Worlds are registered before events can be published from them.
 * Subscribers declare interest in specific event types and optionally pin to a
 * world; a null worldId means "subscribe to all worlds".
 * Delivery is synchronous at publish time — every matching subscriber receives
 * a DeliveryRecord and the event's processedCount increments accordingly.
 */

// ── Ports ────────────────────────────────────────────────────────

export interface WorldEventBusClockPort {
  now(): bigint;
}

export interface WorldEventBusIdGeneratorPort {
  generate(): string;
}

export interface WorldEventBusLoggerPort {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// ── Types ────────────────────────────────────────────────────────

export type EventBusId = string;
export type SubscriberId = string;
export type WorldId = string;

export type EventBusError =
  | 'subscriber-not-found'
  | 'event-not-found'
  | 'world-not-registered'
  | 'already-subscribed'
  | 'already-registered';

export type EventPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface WorldEvent {
  readonly eventId: string;
  readonly sourceWorldId: WorldId;
  readonly targetWorldId: WorldId | null;
  readonly eventType: string;
  readonly payload: Record<string, string | number | boolean>;
  readonly priority: EventPriority;
  readonly publishedAt: bigint;
  processedCount: number;
}

export interface Subscription {
  readonly subscriberId: SubscriberId;
  readonly worldId: WorldId | null;
  readonly eventTypes: ReadonlyArray<string>;
  readonly createdAt: bigint;
}

export interface DeliveryRecord {
  readonly deliveryId: string;
  readonly eventId: string;
  readonly subscriberId: SubscriberId;
  readonly deliveredAt: bigint;
}

// ── System Interface ──────────────────────────────────────────────

export interface WorldEventBusSystem {
  readonly registerWorld: (
    worldId: WorldId,
  ) => { success: true } | { success: false; error: EventBusError };
  readonly subscribe: (
    subscriberId: SubscriberId,
    worldId: WorldId | null,
    eventTypes: ReadonlyArray<string>,
  ) => { success: true } | { success: false; error: EventBusError };
  readonly unsubscribe: (
    subscriberId: SubscriberId,
  ) => { success: true } | { success: false; error: EventBusError };
  readonly publishEvent: (
    sourceWorldId: WorldId,
    targetWorldId: WorldId | null,
    eventType: string,
    payload: Record<string, string | number | boolean>,
    priority: EventPriority,
  ) => WorldEvent | EventBusError;
  readonly getDeliveries: (eventId: string) => ReadonlyArray<DeliveryRecord>;
  readonly getSubscriberEvents: (
    subscriberId: SubscriberId,
    limit: number,
  ) => ReadonlyArray<WorldEvent>;
  readonly getEvent: (eventId: string) => WorldEvent | undefined;
  readonly getStats: () => {
    totalEvents: number;
    totalDeliveries: number;
    byPriority: Record<EventPriority, number>;
  };
}

// ── State ────────────────────────────────────────────────────────

interface WorldEventBusState {
  readonly worlds: Set<WorldId>;
  readonly subscriptions: Map<SubscriberId, Subscription>;
  readonly events: Map<string, WorldEvent>;
  readonly deliveries: DeliveryRecord[];
  readonly clock: WorldEventBusClockPort;
  readonly idGen: WorldEventBusIdGeneratorPort;
  readonly logger: WorldEventBusLoggerPort;
}

// ── Helpers ──────────────────────────────────────────────────────

function matchesSubscription(sub: Subscription, event: WorldEvent): boolean {
  const worldMatch =
    sub.worldId === null ||
    sub.worldId === event.targetWorldId ||
    sub.worldId === event.sourceWorldId;
  const typeMatch = sub.eventTypes.includes(event.eventType);
  return worldMatch && typeMatch;
}

function deliverToSubscribers(state: WorldEventBusState, event: WorldEvent): void {
  const now = state.clock.now();
  for (const sub of state.subscriptions.values()) {
    if (!matchesSubscription(sub, event)) continue;
    const record: DeliveryRecord = {
      deliveryId: state.idGen.generate(),
      eventId: event.eventId,
      subscriberId: sub.subscriberId,
      deliveredAt: now,
    };
    state.deliveries.push(record);
    event.processedCount += 1;
  }
}

// ── Operations ───────────────────────────────────────────────────

function registerWorld(
  state: WorldEventBusState,
  worldId: WorldId,
): { success: true } | { success: false; error: EventBusError } {
  if (state.worlds.has(worldId)) {
    state.logger.warn('World already registered: ' + worldId);
    return { success: false, error: 'already-registered' };
  }
  state.worlds.add(worldId);
  state.logger.info('World registered: ' + worldId);
  return { success: true };
}

function subscribe(
  state: WorldEventBusState,
  subscriberId: SubscriberId,
  worldId: WorldId | null,
  eventTypes: ReadonlyArray<string>,
): { success: true } | { success: false; error: EventBusError } {
  if (state.subscriptions.has(subscriberId)) {
    state.logger.warn('Already subscribed: ' + subscriberId);
    return { success: false, error: 'already-subscribed' };
  }
  const sub: Subscription = {
    subscriberId,
    worldId,
    eventTypes,
    createdAt: state.clock.now(),
  };
  state.subscriptions.set(subscriberId, sub);
  state.logger.info('Subscriber added: ' + subscriberId);
  return { success: true };
}

function unsubscribe(
  state: WorldEventBusState,
  subscriberId: SubscriberId,
): { success: true } | { success: false; error: EventBusError } {
  if (!state.subscriptions.has(subscriberId)) {
    state.logger.warn('Subscriber not found: ' + subscriberId);
    return { success: false, error: 'subscriber-not-found' };
  }
  state.subscriptions.delete(subscriberId);
  state.logger.info('Subscriber removed: ' + subscriberId);
  return { success: true };
}

function publishEvent(
  state: WorldEventBusState,
  sourceWorldId: WorldId,
  targetWorldId: WorldId | null,
  eventType: string,
  payload: Record<string, string | number | boolean>,
  priority: EventPriority,
): WorldEvent | EventBusError {
  if (!state.worlds.has(sourceWorldId)) {
    state.logger.error('Source world not registered: ' + sourceWorldId);
    return 'world-not-registered';
  }
  const event: WorldEvent = {
    eventId: state.idGen.generate(),
    sourceWorldId,
    targetWorldId,
    eventType,
    payload,
    priority,
    publishedAt: state.clock.now(),
    processedCount: 0,
  };
  state.events.set(event.eventId, event);
  deliverToSubscribers(state, event);
  state.logger.info('Event published: ' + event.eventId + ' type=' + eventType);
  return event;
}

function getDeliveries(state: WorldEventBusState, eventId: string): ReadonlyArray<DeliveryRecord> {
  return state.deliveries.filter((d) => d.eventId === eventId);
}

function getSubscriberEvents(
  state: WorldEventBusState,
  subscriberId: SubscriberId,
  limit: number,
): ReadonlyArray<WorldEvent> {
  const delivered = state.deliveries
    .filter((d) => d.subscriberId === subscriberId)
    .map((d) => state.events.get(d.eventId))
    .filter((e): e is WorldEvent => e !== undefined);
  return delivered.slice(-limit);
}

function getStats(state: WorldEventBusState): {
  totalEvents: number;
  totalDeliveries: number;
  byPriority: Record<EventPriority, number>;
} {
  const byPriority: Record<EventPriority, number> = {
    LOW: 0,
    NORMAL: 0,
    HIGH: 0,
    CRITICAL: 0,
  };
  for (const e of state.events.values()) {
    byPriority[e.priority] += 1;
  }
  return {
    totalEvents: state.events.size,
    totalDeliveries: state.deliveries.length,
    byPriority,
  };
}

// ── Factory ──────────────────────────────────────────────────────

export function createWorldEventBusSystem(deps: {
  clock: WorldEventBusClockPort;
  idGen: WorldEventBusIdGeneratorPort;
  logger: WorldEventBusLoggerPort;
}): WorldEventBusSystem {
  const state: WorldEventBusState = {
    worlds: new Set(),
    subscriptions: new Map(),
    events: new Map(),
    deliveries: [],
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };
  return {
    registerWorld: (worldId) => registerWorld(state, worldId),
    subscribe: (subscriberId, worldId, eventTypes) =>
      subscribe(state, subscriberId, worldId, eventTypes),
    unsubscribe: (subscriberId) => unsubscribe(state, subscriberId),
    publishEvent: (src, tgt, type, payload, priority) =>
      publishEvent(state, src, tgt, type, payload, priority),
    getDeliveries: (eventId) => getDeliveries(state, eventId),
    getSubscriberEvents: (subscriberId, limit) => getSubscriberEvents(state, subscriberId, limit),
    getEvent: (eventId) => state.events.get(eventId),
    getStats: () => getStats(state),
  };
}
