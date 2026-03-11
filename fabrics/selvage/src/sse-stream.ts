/**
 * sse-stream.ts — Server-Sent Events streaming.
 *
 * Clients subscribe to named channels, server pushes events.
 * Channel-level filtering, reconnect token support, per-client
 * rate limiting. Handles subscription lifecycle and event delivery.
 */

// ── Ports ────────────────────────────────────────────────────────

interface SseClockPort {
  readonly nowMicroseconds: () => number;
}

interface SseIdPort {
  readonly generate: () => string;
}

interface SseLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

interface SseStreamDeps {
  readonly clock: SseClockPort;
  readonly idGenerator: SseIdPort;
  readonly logger: SseLoggerPort;
}

// ── Types ────────────────────────────────────────────────────────

interface SseClient {
  readonly clientId: string;
  readonly connectedAt: number;
  readonly lastEventAt: number;
  readonly eventsReceived: number;
  readonly subscriptions: readonly string[];
}

interface SseChannel {
  readonly channelId: string;
  readonly channelName: string;
  readonly subscriberCount: number;
  readonly createdAt: number;
  readonly eventCount: number;
}

interface SseEvent {
  readonly eventId: string;
  readonly channelId: string;
  readonly eventType: string;
  readonly data: unknown;
  readonly timestamp: number;
}

interface SseSubscription {
  readonly subscriptionId: string;
  readonly clientId: string;
  readonly channelId: string;
  readonly subscribedAt: number;
}

interface ReconnectToken {
  readonly token: string;
  readonly clientId: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
}

interface CreateChannelParams {
  readonly channelName: string;
}

interface SubscribeParams {
  readonly clientId: string;
  readonly channelId: string;
}

interface PublishParams {
  readonly channelId: string;
  readonly eventType: string;
  readonly data: unknown;
}

interface UnsubscribeParams {
  readonly subscriptionId: string;
}

interface IssueReconnectTokenParams {
  readonly clientId: string;
  readonly validityUs: number;
}

interface ReconnectParams {
  readonly token: string;
}

interface SseStats {
  readonly totalChannels: number;
  readonly totalClients: number;
  readonly totalSubscriptions: number;
  readonly totalEventsPublished: number;
  readonly activeTokens: number;
}

interface SseStream {
  readonly createChannel: (params: CreateChannelParams) => SseChannel;
  readonly subscribe: (params: SubscribeParams) => SseSubscription | string;
  readonly publishToChannel: (params: PublishParams) => SseEvent | string;
  readonly unsubscribe: (params: UnsubscribeParams) => boolean;
  readonly issueReconnectToken: (params: IssueReconnectTokenParams) => ReconnectToken;
  readonly reconnect: (params: ReconnectParams) => string | undefined;
  readonly getChannel: (channelId: string) => SseChannel | undefined;
  readonly getClient: (clientId: string) => SseClient | undefined;
  readonly getStats: () => SseStats;
}

// ── State ────────────────────────────────────────────────────────

interface MutableClient {
  readonly clientId: string;
  readonly connectedAt: number;
  lastEventAt: number;
  eventsReceived: number;
  readonly subscriptions: Set<string>;
}

interface MutableChannel {
  readonly channelId: string;
  readonly channelName: string;
  readonly subscribers: Set<string>;
  readonly createdAt: number;
  eventCount: number;
}

interface MutableSubscription {
  readonly subscriptionId: string;
  readonly clientId: string;
  readonly channelId: string;
  readonly subscribedAt: number;
}

interface MutableReconnectToken {
  readonly token: string;
  readonly clientId: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
}

interface SseState {
  readonly deps: SseStreamDeps;
  readonly channels: Map<string, MutableChannel>;
  readonly clients: Map<string, MutableClient>;
  readonly subscriptions: Map<string, MutableSubscription>;
  readonly tokens: Map<string, MutableReconnectToken>;
  readonly channelNameIndex: Map<string, string>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toSseChannel(channel: MutableChannel): SseChannel {
  return {
    channelId: channel.channelId,
    channelName: channel.channelName,
    subscriberCount: channel.subscribers.size,
    createdAt: channel.createdAt,
    eventCount: channel.eventCount,
  };
}

function toSseClient(client: MutableClient): SseClient {
  return {
    clientId: client.clientId,
    connectedAt: client.connectedAt,
    lastEventAt: client.lastEventAt,
    eventsReceived: client.eventsReceived,
    subscriptions: Array.from(client.subscriptions),
  };
}

function toSseSubscription(sub: MutableSubscription): SseSubscription {
  return {
    subscriptionId: sub.subscriptionId,
    clientId: sub.clientId,
    channelId: sub.channelId,
    subscribedAt: sub.subscribedAt,
  };
}

function toReconnectToken(token: MutableReconnectToken): ReconnectToken {
  return {
    token: token.token,
    clientId: token.clientId,
    issuedAt: token.issuedAt,
    expiresAt: token.expiresAt,
  };
}

function ensureClient(state: SseState, clientId: string): MutableClient {
  const existing = state.clients.get(clientId);
  if (existing !== undefined) {
    return existing;
  }
  const now = state.deps.clock.nowMicroseconds();
  const client: MutableClient = {
    clientId,
    connectedAt: now,
    lastEventAt: now,
    eventsReceived: 0,
    subscriptions: new Set(),
  };
  state.clients.set(clientId, client);
  return client;
}

// ── Operations ───────────────────────────────────────────────────

function createChannelImpl(state: SseState, params: CreateChannelParams): SseChannel {
  const now = state.deps.clock.nowMicroseconds();
  const channelId = state.deps.idGenerator.generate();
  const channel: MutableChannel = {
    channelId,
    channelName: params.channelName,
    subscribers: new Set(),
    createdAt: now,
    eventCount: 0,
  };
  state.channels.set(channelId, channel);
  state.channelNameIndex.set(params.channelName, channelId);
  state.deps.logger.info('sse-channel-created', {
    channelId,
    channelName: params.channelName,
  });
  return toSseChannel(channel);
}

function subscribeImpl(state: SseState, params: SubscribeParams): SseSubscription | string {
  const channel = state.channels.get(params.channelId);
  if (channel === undefined) {
    return 'CHANNEL_NOT_FOUND';
  }
  const client = ensureClient(state, params.clientId);
  const now = state.deps.clock.nowMicroseconds();
  const subscriptionId = state.deps.idGenerator.generate();
  const subscription: MutableSubscription = {
    subscriptionId,
    clientId: params.clientId,
    channelId: params.channelId,
    subscribedAt: now,
  };
  state.subscriptions.set(subscriptionId, subscription);
  channel.subscribers.add(params.clientId);
  client.subscriptions.add(params.channelId);
  state.deps.logger.info('sse-client-subscribed', {
    subscriptionId,
    clientId: params.clientId,
    channelId: params.channelId,
  });
  return toSseSubscription(subscription);
}

function publishToChannelImpl(state: SseState, params: PublishParams): SseEvent | string {
  const channel = state.channels.get(params.channelId);
  if (channel === undefined) {
    return 'CHANNEL_NOT_FOUND';
  }
  const now = state.deps.clock.nowMicroseconds();
  const eventId = state.deps.idGenerator.generate();
  const event: SseEvent = {
    eventId,
    channelId: params.channelId,
    eventType: params.eventType,
    data: params.data,
    timestamp: now,
  };
  channel.eventCount++;
  for (const clientId of channel.subscribers) {
    const client = state.clients.get(clientId);
    if (client !== undefined) {
      client.eventsReceived++;
      client.lastEventAt = now;
    }
  }
  state.deps.logger.info('sse-event-published', {
    eventId,
    channelId: params.channelId,
    eventType: params.eventType,
    subscriberCount: channel.subscribers.size,
  });
  return event;
}

function unsubscribeImpl(state: SseState, params: UnsubscribeParams): boolean {
  const subscription = state.subscriptions.get(params.subscriptionId);
  if (subscription === undefined) {
    return false;
  }
  const channel = state.channels.get(subscription.channelId);
  if (channel !== undefined) {
    channel.subscribers.delete(subscription.clientId);
  }
  const client = state.clients.get(subscription.clientId);
  if (client !== undefined) {
    client.subscriptions.delete(subscription.channelId);
  }
  state.subscriptions.delete(params.subscriptionId);
  state.deps.logger.info('sse-client-unsubscribed', {
    subscriptionId: params.subscriptionId,
    clientId: subscription.clientId,
  });
  return true;
}

function issueReconnectTokenImpl(
  state: SseState,
  params: IssueReconnectTokenParams,
): ReconnectToken {
  const now = state.deps.clock.nowMicroseconds();
  const token = state.deps.idGenerator.generate();
  const expiresAt = now + params.validityUs;
  const reconnectToken: MutableReconnectToken = {
    token,
    clientId: params.clientId,
    issuedAt: now,
    expiresAt,
  };
  state.tokens.set(token, reconnectToken);
  state.deps.logger.info('sse-reconnect-token-issued', {
    token,
    clientId: params.clientId,
  });
  return toReconnectToken(reconnectToken);
}

function reconnectImpl(state: SseState, params: ReconnectParams): string | undefined {
  const token = state.tokens.get(params.token);
  if (token === undefined) {
    return 'INVALID_TOKEN';
  }
  const now = state.deps.clock.nowMicroseconds();
  if (now > token.expiresAt) {
    state.tokens.delete(params.token);
    return 'TOKEN_EXPIRED';
  }
  ensureClient(state, token.clientId);
  state.deps.logger.info('sse-client-reconnected', {
    token: params.token,
    clientId: token.clientId,
  });
  return undefined;
}

function getStatsImpl(state: SseState): SseStats {
  let totalSubs = 0;
  let totalEvents = 0;
  for (const channel of state.channels.values()) {
    totalEvents = totalEvents + channel.eventCount;
  }
  totalSubs = state.subscriptions.size;
  return {
    totalChannels: state.channels.size,
    totalClients: state.clients.size,
    totalSubscriptions: totalSubs,
    totalEventsPublished: totalEvents,
    activeTokens: state.tokens.size,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createSseStream(deps: SseStreamDeps): SseStream {
  const state: SseState = {
    deps,
    channels: new Map(),
    clients: new Map(),
    subscriptions: new Map(),
    tokens: new Map(),
    channelNameIndex: new Map(),
  };
  return {
    createChannel: (p) => createChannelImpl(state, p),
    subscribe: (p) => subscribeImpl(state, p),
    publishToChannel: (p) => publishToChannelImpl(state, p),
    unsubscribe: (p) => unsubscribeImpl(state, p),
    issueReconnectToken: (p) => issueReconnectTokenImpl(state, p),
    reconnect: (p) => reconnectImpl(state, p),
    getChannel: (id) => {
      const c = state.channels.get(id);
      if (c === undefined) return undefined;
      return toSseChannel(c);
    },
    getClient: (id) => {
      const c = state.clients.get(id);
      if (c === undefined) return undefined;
      return toSseClient(c);
    },
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createSseStream };
export type {
  SseStream,
  SseStreamDeps,
  SseClockPort,
  SseIdPort,
  SseLoggerPort,
  SseClient,
  SseChannel,
  SseEvent,
  SseSubscription,
  ReconnectToken,
  CreateChannelParams,
  SubscribeParams,
  PublishParams,
  UnsubscribeParams,
  IssueReconnectTokenParams,
  ReconnectParams,
  SseStats,
};
