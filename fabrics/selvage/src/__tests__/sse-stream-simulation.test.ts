import { describe, it, expect } from 'vitest';
import { createSseStream } from '../sse-stream.js';

let idSeq = 0;
function makeStream() {
  idSeq = 0;
  return createSseStream({
    clock: { nowMicroseconds: () => 1_000_000 },
    idGenerator: { generate: () => `sse-${++idSeq}` },
    logger: { info: () => {}, warn: () => {} },
  });
}

describe('SSE Stream Simulation', () => {
  it('creates a channel and allows subscription', () => {
    const sse = makeStream();

    const channel = sse.createChannel({ channelName: 'game-events' });
    expect(channel).toBeDefined();

    const sub = sse.subscribe({ clientId: 'client-1', channelId: channel.channelId });
    expect(sub).not.toBe('CHANNEL_NOT_FOUND');
    expect((sub as { clientId: string }).clientId).toBe('client-1');
  });

  it('publishes events to subscribers', () => {
    const sse = makeStream();

    const channel = sse.createChannel({ channelName: 'chat' });
    sse.subscribe({ clientId: 'client-2', channelId: channel.channelId });

    const event = sse.publishToChannel({ channelId: channel.channelId, eventType: 'message', data: { text: 'Hello!' } });
    expect(event).not.toBe('CHANNEL_NOT_FOUND');
    expect((event as { eventType: string }).eventType).toBe('message');
  });

  it('returns CHANNEL_NOT_FOUND for unknown channel', () => {
    const sse = makeStream();

    const sub = sse.subscribe({ clientId: 'client-3', channelId: 'nonexistent' });
    expect(sub).toBe('CHANNEL_NOT_FOUND');

    const pub = sse.publishToChannel({ channelId: 'nonexistent', eventType: 'ping', data: {} });
    expect(pub).toBe('CHANNEL_NOT_FOUND');
  });

  it('retrieves channels and clients by ID', () => {
    const sse = makeStream();

    const channel = sse.createChannel({ channelName: 'announcements' });
    sse.subscribe({ clientId: 'client-4', channelId: channel.channelId });

    expect(sse.getChannel(channel.channelId)).toBeDefined();
    expect(sse.getClient('client-4')).toBeDefined();
  });

  it('tracks stats', () => {
    const sse = makeStream();
    sse.createChannel({ channelName: 'test' });
    const stats = sse.getStats();
    expect(stats.totalChannels).toBeGreaterThanOrEqual(1);
  });
});
