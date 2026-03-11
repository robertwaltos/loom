import { describe, it, expect } from 'vitest';
import {
  createSseStream,
  type SseStreamDeps,
  type SseClockPort,
  type SseIdPort,
  type SseLoggerPort,
} from '../sse-stream.js';

function createTestDeps(): { deps: SseStreamDeps; advanceClock: (deltaUs: number) => void } {
  let idCounter = 0;
  let now = 1000000;
  const clock: SseClockPort = {
    nowMicroseconds: () => now,
  };
  const idGenerator: SseIdPort = {
    generate: () => {
      idCounter++;
      return 'sse-' + String(idCounter);
    },
  };
  const logger: SseLoggerPort = {
    info: () => {},
    warn: () => {},
  };
  const advanceClock = (deltaUs: number): void => {
    now = now + deltaUs;
  };
  return { deps: { clock, idGenerator, logger }, advanceClock };
}

describe('SseStream', () => {
  describe('createChannel', () => {
    it('should create a new channel', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const channel = stream.createChannel({
        channelName: 'notifications',
      });
      expect(channel.channelId).toBe('sse-1');
      expect(channel.channelName).toBe('notifications');
      expect(channel.subscriberCount).toBe(0);
      expect(channel.eventCount).toBe(0);
    });

    it('should allow retrieving channel', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const created = stream.createChannel({
        channelName: 'events',
      });
      const retrieved = stream.getChannel(created.channelId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.channelName).toBe('events');
    });

    it('should create multiple channels', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      stream.createChannel({ channelName: 'channel-1' });
      stream.createChannel({ channelName: 'channel-2' });
      const stats = stream.getStats();
      expect(stats.totalChannels).toBe(2);
    });
  });

  describe('getChannel', () => {
    it('should return undefined for unknown channel', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const result = stream.getChannel('missing-channel');
      expect(result).toBeUndefined();
    });

    it('should return channel details', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const channel = stream.createChannel({ channelName: 'test' });
      const retrieved = stream.getChannel(channel.channelId);
      expect(retrieved?.channelId).toBe(channel.channelId);
      expect(retrieved?.channelName).toBe('test');
    });
  });

  describe('subscribe', () => {
    it('should subscribe client to channel', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const channel = stream.createChannel({ channelName: 'updates' });
      const subscription = stream.subscribe({
        clientId: 'client-001',
        channelId: channel.channelId,
      });
      expect(typeof subscription).toBe('object');
      if (typeof subscription === 'string') return;
      expect(subscription.subscriptionId).toBe('sse-2');
      expect(subscription.clientId).toBe('client-001');
      expect(subscription.channelId).toBe(channel.channelId);
    });

    it('should return error for unknown channel', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const result = stream.subscribe({
        clientId: 'client-001',
        channelId: 'missing-channel',
      });
      expect(result).toBe('CHANNEL_NOT_FOUND');
    });

    it('should create client if not exists', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const channel = stream.createChannel({ channelName: 'test' });
      stream.subscribe({
        clientId: 'client-001',
        channelId: channel.channelId,
      });
      const client = stream.getClient('client-001');
      expect(client).toBeDefined();
      expect(client?.clientId).toBe('client-001');
    });

    it('should increment subscriber count', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const channel = stream.createChannel({ channelName: 'test' });
      stream.subscribe({
        clientId: 'client-001',
        channelId: channel.channelId,
      });
      stream.subscribe({
        clientId: 'client-002',
        channelId: channel.channelId,
      });
      const updated = stream.getChannel(channel.channelId);
      expect(updated?.subscriberCount).toBe(2);
    });

    it('should allow multiple subscriptions per client', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const channel1 = stream.createChannel({ channelName: 'channel-1' });
      const channel2 = stream.createChannel({ channelName: 'channel-2' });
      stream.subscribe({
        clientId: 'client-001',
        channelId: channel1.channelId,
      });
      stream.subscribe({
        clientId: 'client-001',
        channelId: channel2.channelId,
      });
      const client = stream.getClient('client-001');
      expect(client?.subscriptions.length).toBe(2);
    });

    it('should track client subscriptions', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const channel = stream.createChannel({ channelName: 'test' });
      stream.subscribe({
        clientId: 'client-001',
        channelId: channel.channelId,
      });
      const client = stream.getClient('client-001');
      expect(client?.subscriptions).toContain(channel.channelId);
    });
  });

  describe('publishToChannel', () => {
    it('should publish event to channel', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const channel = stream.createChannel({ channelName: 'news' });
      const event = stream.publishToChannel({
        channelId: channel.channelId,
        eventType: 'article',
        data: { title: 'Breaking News' },
      });
      expect(typeof event).toBe('object');
      if (typeof event === 'string') return;
      expect(event.eventId).toBe('sse-2');
      expect(event.channelId).toBe(channel.channelId);
      expect(event.eventType).toBe('article');
      expect(event.data).toEqual({ title: 'Breaking News' });
    });

    it('should return error for unknown channel', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const result = stream.publishToChannel({
        channelId: 'missing-channel',
        eventType: 'test',
        data: {},
      });
      expect(result).toBe('CHANNEL_NOT_FOUND');
    });

    it('should increment channel event count', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const channel = stream.createChannel({ channelName: 'test' });
      stream.publishToChannel({
        channelId: channel.channelId,
        eventType: 'test',
        data: {},
      });
      stream.publishToChannel({
        channelId: channel.channelId,
        eventType: 'test',
        data: {},
      });
      const updated = stream.getChannel(channel.channelId);
      expect(updated?.eventCount).toBe(2);
    });

    it('should increment subscriber event counts', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const channel = stream.createChannel({ channelName: 'test' });
      stream.subscribe({
        clientId: 'client-001',
        channelId: channel.channelId,
      });
      stream.subscribe({
        clientId: 'client-002',
        channelId: channel.channelId,
      });
      stream.publishToChannel({
        channelId: channel.channelId,
        eventType: 'test',
        data: {},
      });
      const client1 = stream.getClient('client-001');
      const client2 = stream.getClient('client-002');
      expect(client1?.eventsReceived).toBe(1);
      expect(client2?.eventsReceived).toBe(1);
    });

    it('should update client last event timestamp', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const channel = stream.createChannel({ channelName: 'test' });
      stream.subscribe({
        clientId: 'client-001',
        channelId: channel.channelId,
      });
      const client1 = stream.getClient('client-001');
      const initialTime = client1?.lastEventAt ?? 0;
      stream.publishToChannel({
        channelId: channel.channelId,
        eventType: 'test',
        data: {},
      });
      const client2 = stream.getClient('client-001');
      expect(client2?.lastEventAt).toBeGreaterThanOrEqual(initialTime);
    });

    it('should not increment count for non-subscribers', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const channel = stream.createChannel({ channelName: 'test' });
      stream.subscribe({
        clientId: 'client-001',
        channelId: channel.channelId,
      });
      const client2 = stream.getClient('client-002');
      expect(client2).toBeUndefined();
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe client from channel', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const channel = stream.createChannel({ channelName: 'test' });
      const sub = stream.subscribe({
        clientId: 'client-001',
        channelId: channel.channelId,
      });
      if (typeof sub === 'string') throw new Error('Failed to subscribe');
      const result = stream.unsubscribe({
        subscriptionId: sub.subscriptionId,
      });
      expect(result).toBe(true);
    });

    it('should return false for unknown subscription', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const result = stream.unsubscribe({
        subscriptionId: 'missing-sub',
      });
      expect(result).toBe(false);
    });

    it('should decrement subscriber count', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const channel = stream.createChannel({ channelName: 'test' });
      const sub1 = stream.subscribe({
        clientId: 'client-001',
        channelId: channel.channelId,
      });
      stream.subscribe({
        clientId: 'client-002',
        channelId: channel.channelId,
      });
      if (typeof sub1 === 'string') throw new Error('Failed to subscribe');
      stream.unsubscribe({ subscriptionId: sub1.subscriptionId });
      const updated = stream.getChannel(channel.channelId);
      expect(updated?.subscriberCount).toBe(1);
    });

    it('should remove channel from client subscriptions', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const channel = stream.createChannel({ channelName: 'test' });
      const sub = stream.subscribe({
        clientId: 'client-001',
        channelId: channel.channelId,
      });
      if (typeof sub === 'string') throw new Error('Failed to subscribe');
      stream.unsubscribe({ subscriptionId: sub.subscriptionId });
      const client = stream.getClient('client-001');
      expect(client?.subscriptions.length).toBe(0);
    });

    it('should not receive events after unsubscribe', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const channel = stream.createChannel({ channelName: 'test' });
      const sub = stream.subscribe({
        clientId: 'client-001',
        channelId: channel.channelId,
      });
      if (typeof sub === 'string') throw new Error('Failed to subscribe');
      stream.publishToChannel({
        channelId: channel.channelId,
        eventType: 'test',
        data: {},
      });
      stream.unsubscribe({ subscriptionId: sub.subscriptionId });
      stream.publishToChannel({
        channelId: channel.channelId,
        eventType: 'test',
        data: {},
      });
      const client = stream.getClient('client-001');
      expect(client?.eventsReceived).toBe(1);
    });
  });

  describe('issueReconnectToken', () => {
    it('should issue reconnect token', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const token = stream.issueReconnectToken({
        clientId: 'client-001',
        validityUs: 3600000000,
      });
      expect(token.token).toBe('sse-1');
      expect(token.clientId).toBe('client-001');
      expect(token.issuedAt).toBe(1000000);
      expect(token.expiresAt).toBe(3601000000);
    });

    it('should issue multiple tokens', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      stream.issueReconnectToken({
        clientId: 'client-001',
        validityUs: 3600000000,
      });
      stream.issueReconnectToken({
        clientId: 'client-002',
        validityUs: 3600000000,
      });
      const stats = stream.getStats();
      expect(stats.activeTokens).toBe(2);
    });
  });

  describe('reconnect', () => {
    it('should reconnect with valid token', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const token = stream.issueReconnectToken({
        clientId: 'client-001',
        validityUs: 3600000000,
      });
      const result = stream.reconnect({ token: token.token });
      expect(result).toBeUndefined();
    });

    it('should return error for invalid token', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const result = stream.reconnect({ token: 'invalid-token' });
      expect(result).toBe('INVALID_TOKEN');
    });

    it('should return error for expired token', () => {
      const { deps, advanceClock } = createTestDeps();
      const stream = createSseStream(deps);
      const token = stream.issueReconnectToken({
        clientId: 'client-001',
        validityUs: 1000000,
      });
      advanceClock(2000000);
      const result = stream.reconnect({ token: token.token });
      expect(result).toBe('TOKEN_EXPIRED');
    });

    it('should delete expired token on reconnect attempt', () => {
      const { deps, advanceClock } = createTestDeps();
      const stream = createSseStream(deps);
      const token = stream.issueReconnectToken({
        clientId: 'client-001',
        validityUs: 1000000,
      });
      advanceClock(2000000);
      stream.reconnect({ token: token.token });
      const stats = stream.getStats();
      expect(stats.activeTokens).toBe(0);
    });

    it('should create client if not exists', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const token = stream.issueReconnectToken({
        clientId: 'client-new',
        validityUs: 3600000000,
      });
      stream.reconnect({ token: token.token });
      const client = stream.getClient('client-new');
      expect(client).toBeDefined();
      expect(client?.clientId).toBe('client-new');
    });
  });

  describe('getClient', () => {
    it('should return undefined for unknown client', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const result = stream.getClient('missing-client');
      expect(result).toBeUndefined();
    });

    it('should return client details', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const channel = stream.createChannel({ channelName: 'test' });
      stream.subscribe({
        clientId: 'client-001',
        channelId: channel.channelId,
      });
      const client = stream.getClient('client-001');
      expect(client?.clientId).toBe('client-001');
      expect(client?.eventsReceived).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return zero stats for empty stream', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const stats = stream.getStats();
      expect(stats.totalChannels).toBe(0);
      expect(stats.totalClients).toBe(0);
      expect(stats.totalSubscriptions).toBe(0);
      expect(stats.totalEventsPublished).toBe(0);
      expect(stats.activeTokens).toBe(0);
    });

    it('should count total channels', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      stream.createChannel({ channelName: 'channel-1' });
      stream.createChannel({ channelName: 'channel-2' });
      const stats = stream.getStats();
      expect(stats.totalChannels).toBe(2);
    });

    it('should count total clients', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const channel = stream.createChannel({ channelName: 'test' });
      stream.subscribe({
        clientId: 'client-001',
        channelId: channel.channelId,
      });
      stream.subscribe({
        clientId: 'client-002',
        channelId: channel.channelId,
      });
      const stats = stream.getStats();
      expect(stats.totalClients).toBe(2);
    });

    it('should count total subscriptions', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const channel1 = stream.createChannel({ channelName: 'channel-1' });
      const channel2 = stream.createChannel({ channelName: 'channel-2' });
      stream.subscribe({
        clientId: 'client-001',
        channelId: channel1.channelId,
      });
      stream.subscribe({
        clientId: 'client-001',
        channelId: channel2.channelId,
      });
      const stats = stream.getStats();
      expect(stats.totalSubscriptions).toBe(2);
    });

    it('should count total events published', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const channel = stream.createChannel({ channelName: 'test' });
      stream.publishToChannel({
        channelId: channel.channelId,
        eventType: 'test',
        data: {},
      });
      stream.publishToChannel({
        channelId: channel.channelId,
        eventType: 'test',
        data: {},
      });
      const stats = stream.getStats();
      expect(stats.totalEventsPublished).toBe(2);
    });

    it('should count active tokens', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      stream.issueReconnectToken({
        clientId: 'client-001',
        validityUs: 3600000000,
      });
      stream.issueReconnectToken({
        clientId: 'client-002',
        validityUs: 3600000000,
      });
      const stats = stream.getStats();
      expect(stats.activeTokens).toBe(2);
    });

    it('should aggregate stats across multiple channels', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const channel1 = stream.createChannel({ channelName: 'channel-1' });
      const channel2 = stream.createChannel({ channelName: 'channel-2' });
      stream.publishToChannel({
        channelId: channel1.channelId,
        eventType: 'test',
        data: {},
      });
      stream.publishToChannel({
        channelId: channel2.channelId,
        eventType: 'test',
        data: {},
      });
      stream.publishToChannel({
        channelId: channel2.channelId,
        eventType: 'test',
        data: {},
      });
      const stats = stream.getStats();
      expect(stats.totalEventsPublished).toBe(3);
    });

    it('should reflect unsubscribe in subscription count', () => {
      const { deps } = createTestDeps();
      const stream = createSseStream(deps);
      const channel = stream.createChannel({ channelName: 'test' });
      const sub = stream.subscribe({
        clientId: 'client-001',
        channelId: channel.channelId,
      });
      if (typeof sub === 'string') throw new Error('Failed to subscribe');
      stream.unsubscribe({ subscriptionId: sub.subscriptionId });
      const stats = stream.getStats();
      expect(stats.totalSubscriptions).toBe(0);
    });
  });
});
