/**
 * message-queue.ts — Ordered message delivery queue.
 *
 * In-memory FIFO message queue with named channels, message
 * acknowledgement, dead-letter collection, and bounded capacity.
 */

// ── Ports ────────────────────────────────────────────────────────

interface QueueClock {
  readonly nowMicroseconds: () => number;
}

interface QueueIdGenerator {
  readonly next: () => string;
}

interface MessageQueueDeps {
  readonly clock: QueueClock;
  readonly idGenerator: QueueIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type MessageStatus = 'pending' | 'delivered' | 'acknowledged' | 'dead';

interface QueueMessage {
  readonly messageId: string;
  readonly channel: string;
  readonly payload: unknown;
  readonly enqueuedAt: number;
  readonly status: MessageStatus;
}

interface EnqueueParams {
  readonly channel: string;
  readonly payload: unknown;
}

interface MessageQueueConfig {
  readonly maxPerChannel: number;
  readonly maxDeliveryAttempts: number;
}

interface MessageQueueStats {
  readonly totalChannels: number;
  readonly pendingMessages: number;
  readonly deliveredMessages: number;
  readonly deadMessages: number;
}

interface MessageQueueService {
  readonly enqueue: (params: EnqueueParams) => QueueMessage | undefined;
  readonly dequeue: (channel: string) => QueueMessage | undefined;
  readonly acknowledge: (messageId: string) => boolean;
  readonly deadLetter: (messageId: string) => boolean;
  readonly peek: (channel: string) => QueueMessage | undefined;
  readonly channelSize: (channel: string) => number;
  readonly getStats: () => MessageQueueStats;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_QUEUE_CONFIG: MessageQueueConfig = {
  maxPerChannel: 1000,
  maxDeliveryAttempts: 3,
};

// ── State ────────────────────────────────────────────────────────

interface MutableMessage {
  readonly messageId: string;
  readonly channel: string;
  readonly payload: unknown;
  readonly enqueuedAt: number;
  status: MessageStatus;
}

interface QueueState {
  readonly deps: MessageQueueDeps;
  readonly config: MessageQueueConfig;
  readonly channels: Map<string, MutableMessage[]>;
  readonly messages: Map<string, MutableMessage>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(m: MutableMessage): QueueMessage {
  return {
    messageId: m.messageId,
    channel: m.channel,
    payload: m.payload,
    enqueuedAt: m.enqueuedAt,
    status: m.status,
  };
}

// ── Operations ───────────────────────────────────────────────────

function enqueueImpl(state: QueueState, params: EnqueueParams): QueueMessage | undefined {
  let ch = state.channels.get(params.channel);
  if (!ch) {
    ch = [];
    state.channels.set(params.channel, ch);
  }
  if (ch.length >= state.config.maxPerChannel) return undefined;
  const msg: MutableMessage = {
    messageId: state.deps.idGenerator.next(),
    channel: params.channel,
    payload: params.payload,
    enqueuedAt: state.deps.clock.nowMicroseconds(),
    status: 'pending',
  };
  ch.push(msg);
  state.messages.set(msg.messageId, msg);
  return toReadonly(msg);
}

function dequeueImpl(state: QueueState, channel: string): QueueMessage | undefined {
  const ch = state.channels.get(channel);
  if (!ch) return undefined;
  const idx = ch.findIndex((m) => m.status === 'pending');
  if (idx === -1) return undefined;
  const msg = ch[idx];
  if (msg === undefined) return undefined;
  msg.status = 'delivered';
  return toReadonly(msg);
}

function peekImpl(state: QueueState, channel: string): QueueMessage | undefined {
  const ch = state.channels.get(channel);
  if (!ch) return undefined;
  const msg = ch.find((m) => m.status === 'pending');
  return msg ? toReadonly(msg) : undefined;
}

function getStatsImpl(state: QueueState): MessageQueueStats {
  let pending = 0;
  let delivered = 0;
  let dead = 0;
  for (const msg of state.messages.values()) {
    if (msg.status === 'pending') pending++;
    else if (msg.status === 'delivered') delivered++;
    else if (msg.status === 'dead') dead++;
  }
  return {
    totalChannels: state.channels.size,
    pendingMessages: pending,
    deliveredMessages: delivered,
    deadMessages: dead,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createMessageQueueService(
  deps: MessageQueueDeps,
  config: MessageQueueConfig = DEFAULT_QUEUE_CONFIG,
): MessageQueueService {
  const state: QueueState = {
    deps,
    config,
    channels: new Map(),
    messages: new Map(),
  };
  return {
    enqueue: (p) => enqueueImpl(state, p),
    dequeue: (ch) => dequeueImpl(state, ch),
    acknowledge: (id) => {
      const m = state.messages.get(id);
      if (!m || m.status !== 'delivered') return false;
      m.status = 'acknowledged';
      return true;
    },
    deadLetter: (id) => {
      const m = state.messages.get(id);
      if (!m) return false;
      m.status = 'dead';
      return true;
    },
    peek: (ch) => peekImpl(state, ch),
    channelSize: (ch) => (state.channels.get(ch) ?? []).length,
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createMessageQueueService, DEFAULT_QUEUE_CONFIG };
export type {
  MessageQueueService,
  MessageQueueDeps,
  MessageQueueConfig,
  MessageStatus,
  QueueMessage,
  EnqueueParams as QueueEnqueueParams,
  MessageQueueStats,
};
