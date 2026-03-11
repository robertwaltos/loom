import { describe, it, expect } from 'vitest';
import { createDynastyNotificationService } from '../dynasty-notification.js';
import type { DynastyNotificationDeps } from '../dynasty-notification.js';

function createDeps(): DynastyNotificationDeps {
  let time = 1000;
  let id = 0;
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: { next: () => 'notif-' + String(id++) },
  };
}

describe('DynastyNotificationService — send', () => {
  it('sends a notification and returns snapshot', () => {
    const svc = createDynastyNotificationService(createDeps());
    const snap = svc.send({
      dynastyId: 'd1',
      type: 'info',
      title: 'Welcome',
      body: 'Hello dynasty',
    });
    expect(snap.notificationId).toBe('notif-0');
    expect(snap.dynastyId).toBe('d1');
    expect(snap.type).toBe('info');
    expect(snap.read).toBe(false);
  });
});

describe('DynastyNotificationService — markRead', () => {
  it('marks a notification as read', () => {
    const svc = createDynastyNotificationService(createDeps());
    const snap = svc.send({ dynastyId: 'd1', type: 'warning', title: 'Alert', body: '' });
    expect(svc.markRead(snap.notificationId)).toBe(true);
    const fetched = svc.getForDynasty('d1');
    expect(fetched[0]?.read).toBe(true);
  });

  it('returns false for already read notification', () => {
    const svc = createDynastyNotificationService(createDeps());
    const snap = svc.send({ dynastyId: 'd1', type: 'info', title: 'Test', body: '' });
    svc.markRead(snap.notificationId);
    expect(svc.markRead(snap.notificationId)).toBe(false);
  });

  it('returns false for unknown notification', () => {
    const svc = createDynastyNotificationService(createDeps());
    expect(svc.markRead('nonexistent')).toBe(false);
  });
});

describe('DynastyNotificationService — getForDynasty', () => {
  it('returns all notifications for a dynasty', () => {
    const svc = createDynastyNotificationService(createDeps());
    svc.send({ dynastyId: 'd1', type: 'info', title: 'A', body: '' });
    svc.send({ dynastyId: 'd1', type: 'economy', title: 'B', body: '' });
    svc.send({ dynastyId: 'd2', type: 'info', title: 'C', body: '' });
    expect(svc.getForDynasty('d1')).toHaveLength(2);
  });

  it('filters by type', () => {
    const svc = createDynastyNotificationService(createDeps());
    svc.send({ dynastyId: 'd1', type: 'info', title: 'A', body: '' });
    svc.send({ dynastyId: 'd1', type: 'economy', title: 'B', body: '' });
    const filtered = svc.getForDynasty('d1', { type: 'economy' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.type).toBe('economy');
  });

  it('filters unread only', () => {
    const svc = createDynastyNotificationService(createDeps());
    const a = svc.send({ dynastyId: 'd1', type: 'info', title: 'A', body: '' });
    svc.send({ dynastyId: 'd1', type: 'info', title: 'B', body: '' });
    svc.markRead(a.notificationId);
    const unread = svc.getForDynasty('d1', { unreadOnly: true });
    expect(unread).toHaveLength(1);
    expect(unread[0]?.title).toBe('B');
  });

  it('returns empty for unknown dynasty', () => {
    const svc = createDynastyNotificationService(createDeps());
    expect(svc.getForDynasty('unknown')).toHaveLength(0);
  });
});

describe('DynastyNotificationService — getUnreadCount and stats', () => {
  it('returns unread count for dynasty', () => {
    const svc = createDynastyNotificationService(createDeps());
    svc.send({ dynastyId: 'd1', type: 'info', title: 'A', body: '' });
    svc.send({ dynastyId: 'd1', type: 'info', title: 'B', body: '' });
    const a = svc.send({ dynastyId: 'd1', type: 'info', title: 'C', body: '' });
    svc.markRead(a.notificationId);
    expect(svc.getUnreadCount('d1')).toBe(2);
  });

  it('returns zero for unknown dynasty', () => {
    const svc = createDynastyNotificationService(createDeps());
    expect(svc.getUnreadCount('unknown')).toBe(0);
  });

  it('reports global stats', () => {
    const svc = createDynastyNotificationService(createDeps());
    svc.send({ dynastyId: 'd1', type: 'info', title: 'A', body: '' });
    const b = svc.send({ dynastyId: 'd2', type: 'warning', title: 'B', body: '' });
    svc.markRead(b.notificationId);
    const stats = svc.getStats();
    expect(stats.totalNotifications).toBe(2);
    expect(stats.unreadCount).toBe(1);
  });
});
