/**
 * notification-channel.ts — Event notification dispatch.
 *
 * Provides a pub/sub notification channel for archive events.
 * Subscribers register for specific topics and receive typed
 * notifications. Supports topic filtering, subscriber lifecycle,
 * and delivery tracking.
 */

// ── Ports ────────────────────────────────────────────────────────

interface NotificationClock {
  readonly nowMicroseconds: () => number;
}

interface NotificationIdGenerator {
  readonly next: () => string;
}

interface NotificationChannelDeps {
  readonly clock: NotificationClock;
  readonly idGenerator: NotificationIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

interface Notification {
  readonly notificationId: string;
  readonly topic: string;
  readonly payload: string;
  readonly createdAt: number;
}

interface Subscriber {
  readonly subscriberId: string;
  readonly topics: readonly string[];
  readonly registeredAt: number;
}

interface SubscribeParams {
  readonly subscriberId: string;
  readonly topics: readonly string[];
}

type NotificationCallback = (notification: Notification) => void;

interface PublishParams {
  readonly topic: string;
  readonly payload: string;
}

interface PublishResult {
  readonly notificationId: string;
  readonly deliveredTo: number;
}

interface NotificationStats {
  readonly totalSubscribers: number;
  readonly totalTopics: number;
  readonly totalPublished: number;
  readonly totalDeliveries: number;
}

interface NotificationChannel {
  readonly subscribe: (params: SubscribeParams, callback: NotificationCallback) => boolean;
  readonly unsubscribe: (subscriberId: string) => boolean;
  readonly publish: (params: PublishParams) => PublishResult;
  readonly getSubscriber: (subscriberId: string) => Subscriber | undefined;
  readonly listSubscribers: (topic?: string) => readonly Subscriber[];
  readonly getHistory: (topic?: string) => readonly Notification[];
  readonly getStats: () => NotificationStats;
}

// ── State ────────────────────────────────────────────────────────

interface SubscriberEntry {
  readonly subscriberId: string;
  readonly topics: readonly string[];
  readonly registeredAt: number;
  readonly callback: NotificationCallback;
}

interface NotificationState {
  readonly deps: NotificationChannelDeps;
  readonly subscribers: Map<string, SubscriberEntry>;
  readonly history: Notification[];
  totalDeliveries: number;
}

// ── Operations ───────────────────────────────────────────────────

function subscribeImpl(
  state: NotificationState,
  params: SubscribeParams,
  callback: NotificationCallback,
): boolean {
  if (state.subscribers.has(params.subscriberId)) return false;
  state.subscribers.set(params.subscriberId, {
    subscriberId: params.subscriberId,
    topics: [...params.topics],
    registeredAt: state.deps.clock.nowMicroseconds(),
    callback,
  });
  return true;
}

function unsubscribeImpl(state: NotificationState, subscriberId: string): boolean {
  return state.subscribers.delete(subscriberId);
}

function publishImpl(state: NotificationState, params: PublishParams): PublishResult {
  const notification: Notification = {
    notificationId: state.deps.idGenerator.next(),
    topic: params.topic,
    payload: params.payload,
    createdAt: state.deps.clock.nowMicroseconds(),
  };
  state.history.push(notification);
  let delivered = 0;
  for (const entry of state.subscribers.values()) {
    if (entry.topics.includes(params.topic)) {
      entry.callback(notification);
      delivered += 1;
    }
  }
  state.totalDeliveries += delivered;
  return { notificationId: notification.notificationId, deliveredTo: delivered };
}

function getSubscriberImpl(state: NotificationState, subscriberId: string): Subscriber | undefined {
  const entry = state.subscribers.get(subscriberId);
  if (!entry) return undefined;
  return {
    subscriberId: entry.subscriberId,
    topics: entry.topics,
    registeredAt: entry.registeredAt,
  };
}

function listSubscribersImpl(state: NotificationState, topic?: string): Subscriber[] {
  const result: Subscriber[] = [];
  for (const entry of state.subscribers.values()) {
    if (topic === undefined || entry.topics.includes(topic)) {
      result.push({
        subscriberId: entry.subscriberId,
        topics: entry.topics,
        registeredAt: entry.registeredAt,
      });
    }
  }
  return result;
}

function getHistoryImpl(state: NotificationState, topic?: string): Notification[] {
  if (topic === undefined) return [...state.history];
  return state.history.filter((n) => n.topic === topic);
}

function collectTopics(state: NotificationState): number {
  const topics = new Set<string>();
  for (const entry of state.subscribers.values()) {
    for (const t of entry.topics) {
      topics.add(t);
    }
  }
  return topics.size;
}

function getStatsImpl(state: NotificationState): NotificationStats {
  return {
    totalSubscribers: state.subscribers.size,
    totalTopics: collectTopics(state),
    totalPublished: state.history.length,
    totalDeliveries: state.totalDeliveries,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createNotificationChannel(deps: NotificationChannelDeps): NotificationChannel {
  const state: NotificationState = {
    deps,
    subscribers: new Map(),
    history: [],
    totalDeliveries: 0,
  };
  return {
    subscribe: (p, cb) => subscribeImpl(state, p, cb),
    unsubscribe: (id) => unsubscribeImpl(state, id),
    publish: (p) => publishImpl(state, p),
    getSubscriber: (id) => getSubscriberImpl(state, id),
    listSubscribers: (topic) => listSubscribersImpl(state, topic),
    getHistory: (topic) => getHistoryImpl(state, topic),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createNotificationChannel };
export type {
  NotificationChannel,
  NotificationChannelDeps,
  Notification,
  Subscriber,
  SubscribeParams,
  NotificationCallback,
  PublishParams,
  PublishResult,
  NotificationStats,
};
