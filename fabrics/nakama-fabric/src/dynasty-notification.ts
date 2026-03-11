/**
 * dynasty-notification.ts — Dynasty notification service.
 *
 * Sends notifications to dynasties with type classification,
 * read/unread tracking, and filtered retrieval.
 */

// ── Ports ────────────────────────────────────────────────────────

interface NotifClock {
  readonly nowMicroseconds: () => number;
}

interface NotifIdGenerator {
  readonly next: () => string;
}

interface DynastyNotificationDeps {
  readonly clock: NotifClock;
  readonly idGenerator: NotifIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type NotificationType = 'info' | 'warning' | 'economy' | 'governance' | 'social';

interface DynastyNotification {
  readonly notificationId: string;
  readonly dynastyId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly sentAt: number;
  read: boolean;
}

interface SendNotificationParams {
  readonly dynastyId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
}

interface NotificationFilter {
  readonly type?: NotificationType;
  readonly unreadOnly?: boolean;
}

interface NotificationSnapshot {
  readonly notificationId: string;
  readonly dynastyId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly sentAt: number;
  readonly read: boolean;
}

interface DynastyNotificationStats {
  readonly totalNotifications: number;
  readonly unreadCount: number;
}

interface DynastyNotificationService {
  readonly send: (params: SendNotificationParams) => NotificationSnapshot;
  readonly markRead: (notificationId: string) => boolean;
  readonly getForDynasty: (
    dynastyId: string,
    filter?: NotificationFilter,
  ) => readonly NotificationSnapshot[];
  readonly getUnreadCount: (dynastyId: string) => number;
  readonly getStats: () => DynastyNotificationStats;
}

// ── State ────────────────────────────────────────────────────────

interface NotifState {
  readonly deps: DynastyNotificationDeps;
  readonly notifications: Map<string, DynastyNotification>;
  readonly byDynasty: Map<string, string[]>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toSnapshot(n: DynastyNotification): NotificationSnapshot {
  return {
    notificationId: n.notificationId,
    dynastyId: n.dynastyId,
    type: n.type,
    title: n.title,
    body: n.body,
    sentAt: n.sentAt,
    read: n.read,
  };
}

// ── Operations ───────────────────────────────────────────────────

function sendImpl(state: NotifState, params: SendNotificationParams): NotificationSnapshot {
  const notif: DynastyNotification = {
    notificationId: state.deps.idGenerator.next(),
    dynastyId: params.dynastyId,
    type: params.type,
    title: params.title,
    body: params.body,
    sentAt: state.deps.clock.nowMicroseconds(),
    read: false,
  };
  state.notifications.set(notif.notificationId, notif);
  let list = state.byDynasty.get(params.dynastyId);
  if (!list) {
    list = [];
    state.byDynasty.set(params.dynastyId, list);
  }
  list.push(notif.notificationId);
  return toSnapshot(notif);
}

function matchesFilter(n: DynastyNotification, filter: NotificationFilter): boolean {
  if (filter.type !== undefined && n.type !== filter.type) return false;
  if (filter.unreadOnly === true && n.read) return false;
  return true;
}

function getForDynastyImpl(
  state: NotifState,
  dynastyId: string,
  filter: NotificationFilter,
): readonly NotificationSnapshot[] {
  const ids = state.byDynasty.get(dynastyId);
  if (!ids) return [];
  const results: NotificationSnapshot[] = [];
  for (const id of ids) {
    const n = state.notifications.get(id);
    if (n && matchesFilter(n, filter)) results.push(toSnapshot(n));
  }
  return results;
}

// ── Factory ──────────────────────────────────────────────────────

function createDynastyNotificationService(
  deps: DynastyNotificationDeps,
): DynastyNotificationService {
  const state: NotifState = { deps, notifications: new Map(), byDynasty: new Map() };
  return {
    send: (p) => sendImpl(state, p),
    markRead: (id) => {
      const n = state.notifications.get(id);
      if (!n || n.read) return false;
      n.read = true;
      return true;
    },
    getForDynasty: (dId, f) => getForDynastyImpl(state, dId, f ?? {}),
    getUnreadCount: (dId) => {
      const ids = state.byDynasty.get(dId);
      if (!ids) return 0;
      let count = 0;
      for (const id of ids) {
        const n = state.notifications.get(id);
        if (n && !n.read) count++;
      }
      return count;
    },
    getStats: () => {
      let unread = 0;
      for (const n of state.notifications.values()) {
        if (!n.read) unread++;
      }
      return { totalNotifications: state.notifications.size, unreadCount: unread };
    },
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createDynastyNotificationService };
export type {
  DynastyNotificationService,
  DynastyNotificationDeps,
  NotificationType,
  NotificationSnapshot,
  SendNotificationParams,
  NotificationFilter,
  DynastyNotificationStats,
};
