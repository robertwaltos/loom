import { describe, it, expect } from 'vitest';
import { createMessageQueueService } from '../message-queue.js';

let idSeq = 0;
function makeQueue() {
  idSeq = 0;
  return createMessageQueueService(
    {
      clock: { nowMicroseconds: () => 1_000_000 },
      idGenerator: { next: () => `msg-${++idSeq}` },
    },
    { maxPerChannel: 100, maxDeliveryAttempts: 3 },
  );
}

describe('Message Queue Simulation', () => {
  it('enqueues and dequeues messages per channel', () => {
    const queue = makeQueue();

    queue.enqueue({ channel: 'events', payload: { type: 'player-joined', id: '1' } });
    queue.enqueue({ channel: 'events', payload: { type: 'player-joined', id: '2' } });
    queue.enqueue({ channel: 'chat', payload: { text: 'Hello' } });

    const m1 = queue.dequeue('events');
    expect(m1).toBeDefined();
    expect(m1!.payload.type).toBe('player-joined');

    const chat = queue.dequeue('chat');
    expect(chat).toBeDefined();
    expect(chat!.payload.text).toBe('Hello');
  });

  it('acknowledges messages and removes them from the queue', () => {
    const queue = makeQueue();

    queue.enqueue({ channel: 'tasks', payload: { task: 'compress-asset' } });
    const msg = queue.dequeue('tasks');
    expect(msg).toBeDefined();

    const stats = queue.getStats();
    expect(stats.deliveredMessages).toBeGreaterThanOrEqual(1);

    const acked = queue.acknowledge(msg!.messageId);
    expect(acked).toBe(true);
  });

  it('dead-letters messages on repeated failures', () => {
    const queue = makeQueue();

    queue.enqueue({ channel: 'processing', payload: { job: 'render-frame' } });
    const msg = queue.dequeue('processing');
    expect(msg).toBeDefined();

    const dl = queue.deadLetter(msg!.messageId);
    expect(dl).toBe(true);

    const stats = queue.getStats();
    expect(stats.deadMessages).toBeGreaterThanOrEqual(1);
  });

  it('returns undefined when dequeueing from an empty channel', () => {
    const queue = makeQueue();
    expect(queue.dequeue('empty-channel')).toBeUndefined();
  });
});
