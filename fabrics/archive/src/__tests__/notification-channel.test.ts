import { describe, it, expect, vi } from 'vitest';
import { createNotificationChannel } from '../notification-channel.js';
import type { NotificationChannelDeps, Notification } from '../notification-channel.js';

function makeDeps(): NotificationChannelDeps {
  let id = 0;
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { next: () => 'notif-' + String(++id) },
  };
}

describe('NotificationChannel — subscribe', () => {
  it('subscribes a listener', () => {
    const channel = createNotificationChannel(makeDeps());
    const result = channel.subscribe(
      { subscriberId: 'sub-1', topics: ['chronicle.entry'] },
      () => { /* noop */ },
    );
    expect(result).toBe(true);
    expect(channel.getStats().totalSubscribers).toBe(1);
  });

  it('rejects duplicate subscriber', () => {
    const channel = createNotificationChannel(makeDeps());
    channel.subscribe({ subscriberId: 'sub-1', topics: ['a'] }, () => { /* noop */ });
    expect(channel.subscribe({ subscriberId: 'sub-1', topics: ['b'] }, () => { /* noop */ })).toBe(false);
  });

  it('unsubscribes a listener', () => {
    const channel = createNotificationChannel(makeDeps());
    channel.subscribe({ subscriberId: 'sub-1', topics: ['a'] }, () => { /* noop */ });
    expect(channel.unsubscribe('sub-1')).toBe(true);
    expect(channel.getStats().totalSubscribers).toBe(0);
  });

  it('returns false for unknown unsubscribe', () => {
    const channel = createNotificationChannel(makeDeps());
    expect(channel.unsubscribe('unknown')).toBe(false);
  });
});

describe('NotificationChannel — publish', () => {
  it('publishes and delivers to matching subscriber', () => {
    const channel = createNotificationChannel(makeDeps());
    const received: Notification[] = [];
    channel.subscribe(
      { subscriberId: 'sub-1', topics: ['event.created'] },
      (n) => { received.push(n); },
    );
    const result = channel.publish({ topic: 'event.created', payload: '{"id":"e1"}' });
    expect(result.deliveredTo).toBe(1);
    expect(received).toHaveLength(1);
    expect(received[0]?.topic).toBe('event.created');
  });

  it('does not deliver to non-matching subscriber', () => {
    const channel = createNotificationChannel(makeDeps());
    const received: Notification[] = [];
    channel.subscribe(
      { subscriberId: 'sub-1', topics: ['event.created'] },
      (n) => { received.push(n); },
    );
    const result = channel.publish({ topic: 'event.deleted', payload: '{}' });
    expect(result.deliveredTo).toBe(0);
    expect(received).toHaveLength(0);
  });

  it('delivers to multiple subscribers', () => {
    const channel = createNotificationChannel(makeDeps());
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    channel.subscribe({ subscriberId: 'sub-1', topics: ['alert'] }, cb1);
    channel.subscribe({ subscriberId: 'sub-2', topics: ['alert'] }, cb2);
    const result = channel.publish({ topic: 'alert', payload: 'high' });
    expect(result.deliveredTo).toBe(2);
    expect(cb1).toHaveBeenCalledOnce();
    expect(cb2).toHaveBeenCalledOnce();
  });

  it('assigns unique notification IDs', () => {
    const channel = createNotificationChannel(makeDeps());
    channel.subscribe({ subscriberId: 'sub-1', topics: ['a'] }, () => { /* noop */ });
    const r1 = channel.publish({ topic: 'a', payload: '1' });
    const r2 = channel.publish({ topic: 'a', payload: '2' });
    expect(r1.notificationId).not.toBe(r2.notificationId);
  });
});

describe('NotificationChannel — subscriber queries', () => {
  it('gets subscriber by id', () => {
    const channel = createNotificationChannel(makeDeps());
    channel.subscribe({ subscriberId: 'sub-1', topics: ['a', 'b'] }, () => { /* noop */ });
    const sub = channel.getSubscriber('sub-1');
    expect(sub?.subscriberId).toBe('sub-1');
    expect(sub?.topics).toEqual(['a', 'b']);
  });

  it('returns undefined for unknown subscriber', () => {
    const channel = createNotificationChannel(makeDeps());
    expect(channel.getSubscriber('unknown')).toBeUndefined();
  });

  it('lists all subscribers', () => {
    const channel = createNotificationChannel(makeDeps());
    channel.subscribe({ subscriberId: 'sub-1', topics: ['a'] }, () => { /* noop */ });
    channel.subscribe({ subscriberId: 'sub-2', topics: ['b'] }, () => { /* noop */ });
    expect(channel.listSubscribers()).toHaveLength(2);
  });

  it('lists subscribers by topic', () => {
    const channel = createNotificationChannel(makeDeps());
    channel.subscribe({ subscriberId: 'sub-1', topics: ['a', 'b'] }, () => { /* noop */ });
    channel.subscribe({ subscriberId: 'sub-2', topics: ['b', 'c'] }, () => { /* noop */ });
    channel.subscribe({ subscriberId: 'sub-3', topics: ['c'] }, () => { /* noop */ });
    expect(channel.listSubscribers('b')).toHaveLength(2);
    expect(channel.listSubscribers('a')).toHaveLength(1);
  });
});

describe('NotificationChannel — history', () => {
  it('returns full history', () => {
    const channel = createNotificationChannel(makeDeps());
    channel.subscribe({ subscriberId: 'sub-1', topics: ['a'] }, () => { /* noop */ });
    channel.publish({ topic: 'a', payload: '1' });
    channel.publish({ topic: 'b', payload: '2' });
    expect(channel.getHistory()).toHaveLength(2);
  });

  it('filters history by topic', () => {
    const channel = createNotificationChannel(makeDeps());
    channel.publish({ topic: 'a', payload: '1' });
    channel.publish({ topic: 'b', payload: '2' });
    channel.publish({ topic: 'a', payload: '3' });
    expect(channel.getHistory('a')).toHaveLength(2);
    expect(channel.getHistory('b')).toHaveLength(1);
  });
});

describe('NotificationChannel — stats', () => {
  it('starts with zero stats', () => {
    const channel = createNotificationChannel(makeDeps());
    const stats = channel.getStats();
    expect(stats.totalSubscribers).toBe(0);
    expect(stats.totalPublished).toBe(0);
    expect(stats.totalDeliveries).toBe(0);
  });

  it('tracks aggregate stats', () => {
    const channel = createNotificationChannel(makeDeps());
    channel.subscribe({ subscriberId: 'sub-1', topics: ['a', 'b'] }, () => { /* noop */ });
    channel.subscribe({ subscriberId: 'sub-2', topics: ['a'] }, () => { /* noop */ });
    channel.publish({ topic: 'a', payload: '1' });
    channel.publish({ topic: 'b', payload: '2' });
    const stats = channel.getStats();
    expect(stats.totalSubscribers).toBe(2);
    expect(stats.totalTopics).toBe(2);
    expect(stats.totalPublished).toBe(2);
    expect(stats.totalDeliveries).toBe(3);
  });
});
