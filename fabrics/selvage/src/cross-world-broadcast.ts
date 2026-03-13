/**
 * Cross-World Broadcast — Foundation Archive event feeds to all worlds.
 *
 * NEXT-STEPS Phase 8.4: "Cross-world event broadcasting via Foundation
 * Archive feeds."
 *
 * Publishes significant game events as broadcast items that are fanned
 * out to subscriber worlds in real time. Use cases:
 *   - Foundation Archive milestone announcements (world deaths, first empires)
 *   - Cross-world tournament results (arena winners, leaderboard shifts)
 *   - Alliance declarations of war / peace treaties
 *   - Economy alerts (market crash, KALON inflation spikes)
 *   - Survey Corps discoveries (new worlds, rare resources)
 *
 * Delivery model:
 *   - Worlds subscribe to categories they care about
 *   - Each broadcast generates a `BroadcastDelivery` per subscribed world
 *   - A tick advances IN_FLIGHT → DELIVERED
 *   - Expired broadcasts are pruned automatically
 *
 * Thread: cotton/selvage/cross-world-broadcast
 * Tier: 1
 */

// ── Types ────────────────────────────────────────────────────────

export type BroadcastCategory =
  | 'FOUNDATION_ARCHIVE'  // world-scale historical events
  | 'TOURNAMENT'          // arena and esports results
  | 'DIPLOMACY'           // war declarations, treaties, alliances
  | 'ECONOMY'             // market-wide alerts, supply shocks
  | 'SURVEY_CORPS'        // new world discoveries, corridor updates
  | 'GOVERNANCE'          // cross-world constitutional changes
  | 'CEREMONY';           // player-driven milestones (dynasty anniversaries)

export type BroadcastPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';

export type DeliveryStatus = 'QUEUED' | 'IN_FLIGHT' | 'DELIVERED' | 'EXPIRED';

export interface BroadcastEvent {
  readonly eventId: string;
  readonly category: BroadcastCategory;
  readonly priority: BroadcastPriority;
  readonly title: string;
  readonly summary: string;
  readonly originWorldId: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly publishedAt: number;
  readonly expiresAt: number;
}

export interface BroadcastDelivery {
  readonly deliveryId: string;
  readonly eventId: string;
  readonly targetWorldId: string;
  readonly status: DeliveryStatus;
  readonly scheduledAt: number;
  readonly deliveredAt: number | null;
}

export interface WorldSubscription {
  readonly worldId: string;
  readonly categories: ReadonlyArray<BroadcastCategory>;
  readonly subscribedAt: number;
}

// ── Params ───────────────────────────────────────────────────────

export interface PublishBroadcastParams {
  readonly category: BroadcastCategory;
  readonly priority: BroadcastPriority;
  readonly title: string;
  readonly summary: string;
  readonly originWorldId: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

// ── Ports ────────────────────────────────────────────────────────

export interface BroadcastDeps {
  readonly clock: { readonly nowMicroseconds: () => number };
  readonly idGenerator: { readonly next: () => string };
  readonly log: {
    readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
  };
}

// ── Config ────────────────────────────────────────────────────────

export interface CrossWorldBroadcastConfig {
  readonly defaultExpiryUs: number;
  readonly criticalExpiryUs: number;
  readonly maxPayloadKeys: number;
}

const ONE_DAY_US = 24 * 60 * 60 * 1_000_000;

export const DEFAULT_BROADCAST_CONFIG: CrossWorldBroadcastConfig = {
  defaultExpiryUs: 7 * ONE_DAY_US,
  criticalExpiryUs: 30 * ONE_DAY_US,
  maxPayloadKeys: 32,
};

// ── Errors ───────────────────────────────────────────────────────

export type BroadcastError =
  | { readonly code: 'event-not-found'; readonly eventId: string }
  | { readonly code: 'delivery-not-found'; readonly deliveryId: string }
  | { readonly code: 'world-not-subscribed'; readonly worldId: string }
  | { readonly code: 'payload-too-large'; readonly keys: number; readonly maxKeys: number };

// ── Stats ────────────────────────────────────────────────────────

export interface BroadcastStats {
  readonly totalEvents: number;
  readonly totalDeliveries: number;
  readonly deliveredCount: number;
  readonly inFlightCount: number;
  readonly expiredCount: number;
  readonly subscribedWorlds: number;
}

// ── Public Interface ─────────────────────────────────────────────

export interface CrossWorldBroadcastSystem {
  readonly subscribe: (worldId: string, categories: ReadonlyArray<BroadcastCategory>) => WorldSubscription;
  readonly unsubscribe: (worldId: string) => boolean;
  readonly publish: (params: PublishBroadcastParams) => BroadcastEvent | BroadcastError;
  readonly tick: () => ReadonlyArray<BroadcastDelivery>;
  readonly getDeliveriesForWorld: (worldId: string) => ReadonlyArray<BroadcastDelivery>;
  readonly getEvent: (eventId: string) => BroadcastEvent | BroadcastError;
  readonly expireStale: () => ReadonlyArray<string>;
  readonly getStats: () => BroadcastStats;
}

// ── Mutable State ────────────────────────────────────────────────

interface MutableDelivery {
  readonly deliveryId: string;
  readonly eventId: string;
  readonly targetWorldId: string;
  status: DeliveryStatus;
  readonly scheduledAt: number;
  deliveredAt: number | null;
}

// ── Factory ──────────────────────────────────────────────────────

export function createCrossWorldBroadcastSystem(
  deps: BroadcastDeps,
  config?: Partial<CrossWorldBroadcastConfig>,
): CrossWorldBroadcastSystem {
  const cfg: CrossWorldBroadcastConfig = { ...DEFAULT_BROADCAST_CONFIG, ...config };
  const events = new Map<string, BroadcastEvent>();
  const deliveries = new Map<string, MutableDelivery>();
  const worldDeliveries = new Map<string, string[]>(); // worldId → deliveryIds
  const subscriptions = new Map<string, WorldSubscription>();

  return {
    subscribe: (wid, cats) => addSubscription(deps, subscriptions, wid, cats),
    unsubscribe: (wid) => removeSubscription(subscriptions, wid),
    publish: (p) => publishEvent(deps, cfg, events, deliveries, worldDeliveries, subscriptions, p),
    tick: () => advanceDeliveries(deps, deliveries),
    getDeliveriesForWorld: (wid) => getWorldDeliveries(deliveries, worldDeliveries, wid),
    getEvent: (id) => getEventById(events, id),
    expireStale: () => expireEvents(deps, events, deliveries),
    getStats: () => computeStats(events, deliveries, subscriptions),
  };
}

// ── Subscribe / Unsubscribe ───────────────────────────────────────

function addSubscription(
  deps: BroadcastDeps,
  subscriptions: Map<string, WorldSubscription>,
  worldId: string,
  categories: ReadonlyArray<BroadcastCategory>,
): WorldSubscription {
  const sub: WorldSubscription = {
    worldId,
    categories,
    subscribedAt: deps.clock.nowMicroseconds(),
  };
  subscriptions.set(worldId, sub);
  deps.log.info({ worldId, categories }, 'World subscribed to broadcast');
  return sub;
}

function removeSubscription(
  subscriptions: Map<string, WorldSubscription>,
  worldId: string,
): boolean {
  return subscriptions.delete(worldId);
}

// ── Publish ──────────────────────────────────────────────────────

function buildEvent(
  deps: BroadcastDeps,
  cfg: CrossWorldBroadcastConfig,
  params: PublishBroadcastParams,
): BroadcastEvent {
  const now = deps.clock.nowMicroseconds();
  const expiryUs = params.priority === 'CRITICAL' ? cfg.criticalExpiryUs : cfg.defaultExpiryUs;
  return Object.freeze({
    eventId: deps.idGenerator.next(),
    category: params.category,
    priority: params.priority,
    title: params.title,
    summary: params.summary,
    originWorldId: params.originWorldId,
    payload: params.payload,
    publishedAt: now,
    expiresAt: now + expiryUs,
  });
}

function fanOutDeliveries(
  deps: BroadcastDeps,
  event: BroadcastEvent,
  deliveries: Map<string, MutableDelivery>,
  worldDeliveries: Map<string, string[]>,
  subscriptions: Map<string, WorldSubscription>,
): void {
  const now = deps.clock.nowMicroseconds();
  for (const sub of subscriptions.values()) {
    if (!sub.categories.includes(event.category)) continue;
    if (sub.worldId === event.originWorldId) continue;

    const delivery: MutableDelivery = {
      deliveryId: deps.idGenerator.next(),
      eventId: event.eventId,
      targetWorldId: sub.worldId,
      status: 'QUEUED',
      scheduledAt: now,
      deliveredAt: null,
    };
    deliveries.set(delivery.deliveryId, delivery);
    const existing = worldDeliveries.get(sub.worldId) ?? [];
    worldDeliveries.set(sub.worldId, [...existing, delivery.deliveryId]);
  }
}

function publishEvent(
  deps: BroadcastDeps,
  cfg: CrossWorldBroadcastConfig,
  events: Map<string, BroadcastEvent>,
  deliveries: Map<string, MutableDelivery>,
  worldDeliveries: Map<string, string[]>,
  subscriptions: Map<string, WorldSubscription>,
  params: PublishBroadcastParams,
): BroadcastEvent | BroadcastError {
  const payloadKeys = Object.keys(params.payload).length;
  if (payloadKeys > cfg.maxPayloadKeys) {
    return { code: 'payload-too-large', keys: payloadKeys, maxKeys: cfg.maxPayloadKeys };
  }

  const event = buildEvent(deps, cfg, params);
  events.set(event.eventId, event);
  fanOutDeliveries(deps, event, deliveries, worldDeliveries, subscriptions);

  deps.log.info({ eventId: event.eventId, category: event.category }, 'Broadcast published');
  return event;
}

// ── Tick ─────────────────────────────────────────────────────────

function advanceDeliveries(
  deps: BroadcastDeps,
  deliveries: Map<string, MutableDelivery>,
): ReadonlyArray<BroadcastDelivery> {
  const now = deps.clock.nowMicroseconds();
  const advanced: BroadcastDelivery[] = [];

  for (const d of deliveries.values()) {
    if (d.status !== 'QUEUED' && d.status !== 'IN_FLIGHT') continue;
    d.status = d.status === 'QUEUED' ? 'IN_FLIGHT' : 'DELIVERED';
    if (d.status === 'DELIVERED') d.deliveredAt = now;
    advanced.push(freezeDelivery(d));
  }

  return advanced;
}

// ── Read Helpers ──────────────────────────────────────────────────

function getWorldDeliveries(
  deliveries: Map<string, MutableDelivery>,
  worldDeliveries: Map<string, string[]>,
  worldId: string,
): ReadonlyArray<BroadcastDelivery> {
  const ids = worldDeliveries.get(worldId) ?? [];
  return ids
    .map((id) => deliveries.get(id))
    .filter((d): d is MutableDelivery => d !== undefined)
    .map(freezeDelivery);
}

function getEventById(
  events: Map<string, BroadcastEvent>,
  eventId: string,
): BroadcastEvent | BroadcastError {
  return events.get(eventId) ?? { code: 'event-not-found', eventId };
}

// ── Expire ────────────────────────────────────────────────────────

function expireEvents(
  deps: BroadcastDeps,
  events: Map<string, BroadcastEvent>,
  deliveries: Map<string, MutableDelivery>,
): ReadonlyArray<string> {
  const now = deps.clock.nowMicroseconds();
  const expired: string[] = [];

  for (const [id, event] of events) {
    if (event.expiresAt <= now) {
      events.delete(id);
      expired.push(id);
    }
  }

  // Mark orphaned deliveries as expired
  for (const d of deliveries.values()) {
    if (!events.has(d.eventId) && d.status !== 'DELIVERED') {
      d.status = 'EXPIRED';
    }
  }

  return expired;
}

// ── Stats ─────────────────────────────────────────────────────────

function computeStats(
  events: Map<string, BroadcastEvent>,
  deliveries: Map<string, MutableDelivery>,
  subscriptions: Map<string, WorldSubscription>,
): BroadcastStats {
  let delivered = 0;
  let inFlight = 0;
  let expired = 0;

  for (const d of deliveries.values()) {
    if (d.status === 'DELIVERED') delivered++;
    else if (d.status === 'IN_FLIGHT' || d.status === 'QUEUED') inFlight++;
    else expired++; // EXPIRED
  }

  return {
    totalEvents: events.size,
    totalDeliveries: deliveries.size,
    deliveredCount: delivered,
    inFlightCount: inFlight,
    expiredCount: expired,
    subscribedWorlds: subscriptions.size,
  };
}

// ── Freeze ────────────────────────────────────────────────────────

function freezeDelivery(d: MutableDelivery): BroadcastDelivery {
  return Object.freeze({ ...d });
}
