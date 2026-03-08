import { describe, it, expect } from 'vitest';
import { createMessageQueueService } from '../message-queue.js';
import type { MessageQueueDeps } from '../message-queue.js';

function createDeps(): MessageQueueDeps {
  let time = 1000;
  let id = 0;
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: { next: () => 'msg-' + String(id++) },
  };
}

describe('MessageQueueService — enqueue', () => {
  it('enqueues a message and returns it', () => {
    const svc = createMessageQueueService(createDeps());
    const msg = svc.enqueue({ channel: 'ch1', payload: { text: 'hello' } });
    expect(msg).toBeDefined();
    expect(msg?.messageId).toBe('msg-0');
    expect(msg?.channel).toBe('ch1');
    expect(msg?.status).toBe('pending');
  });

  it('returns undefined when channel is at capacity', () => {
    const svc = createMessageQueueService(createDeps(), { maxPerChannel: 2, maxDeliveryAttempts: 3 });
    svc.enqueue({ channel: 'ch1', payload: 1 });
    svc.enqueue({ channel: 'ch1', payload: 2 });
    const result = svc.enqueue({ channel: 'ch1', payload: 3 });
    expect(result).toBeUndefined();
  });

  it('tracks separate channels independently', () => {
    const svc = createMessageQueueService(createDeps(), { maxPerChannel: 1, maxDeliveryAttempts: 3 });
    const a = svc.enqueue({ channel: 'ch1', payload: 'a' });
    const b = svc.enqueue({ channel: 'ch2', payload: 'b' });
    expect(a).toBeDefined();
    expect(b).toBeDefined();
  });
});

describe('MessageQueueService — dequeue', () => {
  it('dequeues the first pending message', () => {
    const svc = createMessageQueueService(createDeps());
    svc.enqueue({ channel: 'ch1', payload: 'first' });
    svc.enqueue({ channel: 'ch1', payload: 'second' });
    const msg = svc.dequeue('ch1');
    expect(msg?.payload).toBe('first');
    expect(msg?.status).toBe('delivered');
  });

  it('returns undefined for empty channel', () => {
    const svc = createMessageQueueService(createDeps());
    expect(svc.dequeue('empty')).toBeUndefined();
  });

  it('skips already delivered messages', () => {
    const svc = createMessageQueueService(createDeps());
    svc.enqueue({ channel: 'ch1', payload: 'first' });
    svc.enqueue({ channel: 'ch1', payload: 'second' });
    svc.dequeue('ch1'); // delivers first
    const msg = svc.dequeue('ch1');
    expect(msg?.payload).toBe('second');
  });
});

describe('MessageQueueService — acknowledge and deadLetter', () => {
  it('acknowledges a delivered message', () => {
    const svc = createMessageQueueService(createDeps());
    svc.enqueue({ channel: 'ch1', payload: 'data' });
    const delivered = svc.dequeue('ch1');
    const acked = svc.acknowledge(delivered?.messageId ?? '');
    expect(acked).toBe(true);
  });

  it('rejects acknowledge for pending message', () => {
    const svc = createMessageQueueService(createDeps());
    const msg = svc.enqueue({ channel: 'ch1', payload: 'data' });
    expect(svc.acknowledge(msg?.messageId ?? '')).toBe(false);
  });

  it('moves a message to dead letter', () => {
    const svc = createMessageQueueService(createDeps());
    const msg = svc.enqueue({ channel: 'ch1', payload: 'data' });
    const result = svc.deadLetter(msg?.messageId ?? '');
    expect(result).toBe(true);
  });

  it('returns false for unknown message id', () => {
    const svc = createMessageQueueService(createDeps());
    expect(svc.deadLetter('nonexistent')).toBe(false);
    expect(svc.acknowledge('nonexistent')).toBe(false);
  });
});

describe('MessageQueueService — peek and channelSize', () => {
  it('peeks without changing message status', () => {
    const svc = createMessageQueueService(createDeps());
    svc.enqueue({ channel: 'ch1', payload: 'peek-me' });
    const peeked = svc.peek('ch1');
    expect(peeked?.payload).toBe('peek-me');
    expect(peeked?.status).toBe('pending');
    const again = svc.peek('ch1');
    expect(again?.messageId).toBe(peeked?.messageId);
  });

  it('returns correct channel size', () => {
    const svc = createMessageQueueService(createDeps());
    expect(svc.channelSize('ch1')).toBe(0);
    svc.enqueue({ channel: 'ch1', payload: 1 });
    svc.enqueue({ channel: 'ch1', payload: 2 });
    expect(svc.channelSize('ch1')).toBe(2);
  });
});

describe('MessageQueueService — getStats', () => {
  it('reports queue statistics', () => {
    const svc = createMessageQueueService(createDeps());
    svc.enqueue({ channel: 'ch1', payload: 'a' });
    svc.enqueue({ channel: 'ch1', payload: 'b' });
    svc.enqueue({ channel: 'ch2', payload: 'c' });
    svc.dequeue('ch1'); // delivered
    const msg = svc.enqueue({ channel: 'ch2', payload: 'd' });
    svc.deadLetter(msg?.messageId ?? '');

    const stats = svc.getStats();
    expect(stats.totalChannels).toBe(2);
    expect(stats.pendingMessages).toBe(2);
    expect(stats.deliveredMessages).toBe(1);
    expect(stats.deadMessages).toBe(1);
  });
});
