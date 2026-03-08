/**
 * Message Router — Targeted message delivery for connected clients.
 *
 * The Selvage's outbound pipeline. When the Loom needs to notify
 * specific clients (chat messages, event notifications, state updates),
 * the Message Router resolves recipients and dispatches through
 * an injected delivery port.
 *
 * Routing modes:
 *   - Direct: Single connection by ID
 *   - Broadcast: All active connections
 *   - Group: Connections subscribed to a channel
 *   - Dynasty: All connections for a dynasty
 *
 * "The Selvage ensures every thread receives the right signal."
 */

// ─── Types ──────────────────────────────────────────────────────────

export type RouteMode = 'direct' | 'broadcast' | 'group' | 'dynasty';

export interface RoutedMessage {
  readonly messageId: string;
  readonly mode: RouteMode;
  readonly channel: string | null;
  readonly payload: string;
  readonly sentAt: number;
  readonly recipientCount: number;
}

export interface RouteDirectParams {
  readonly connectionId: string;
  readonly payload: string;
}

export interface RouteBroadcastParams {
  readonly payload: string;
  readonly excludeConnectionIds?: ReadonlyArray<string>;
}

export interface RouteGroupParams {
  readonly channel: string;
  readonly payload: string;
  readonly excludeConnectionIds?: ReadonlyArray<string>;
}

export interface RouteDynastyParams {
  readonly dynastyId: string;
  readonly payload: string;
}

export interface RouterStats {
  readonly totalMessagesSent: number;
  readonly totalRecipients: number;
  readonly activeChannels: number;
  readonly totalSubscriptions: number;
}

// ─── Ports ──────────────────────────────────────────────────────────

export interface MessageDeliveryPort {
  deliver(connectionId: string, payload: string): boolean;
}

export interface RouterConnectionPort {
  listActiveConnectionIds(): ReadonlyArray<string>;
  getConnectionsByDynasty(dynastyId: string): ReadonlyArray<string>;
}

export interface RouterIdGenerator {
  next(): string;
}

export interface MessageRouterDeps {
  readonly deliveryPort: MessageDeliveryPort;
  readonly connectionPort: RouterConnectionPort;
  readonly idGenerator: RouterIdGenerator;
  readonly clock: { nowMicroseconds(): number };
}

// ─── Public Interface ───────────────────────────────────────────────

export interface MessageRouter {
  sendDirect(params: RouteDirectParams): RoutedMessage;
  broadcast(params: RouteBroadcastParams): RoutedMessage;
  sendToGroup(params: RouteGroupParams): RoutedMessage;
  sendToDynasty(params: RouteDynastyParams): RoutedMessage;

  subscribe(connectionId: string, channel: string): boolean;
  unsubscribe(connectionId: string, channel: string): boolean;
  getSubscriptions(connectionId: string): ReadonlyArray<string>;
  getChannelMembers(channel: string): ReadonlyArray<string>;
  unsubscribeAll(connectionId: string): number;

  getStats(): RouterStats;
}

// ─── State ──────────────────────────────────────────────────────────

interface RouterState {
  readonly channelMembers: Map<string, Set<string>>; // channel → connectionIds
  readonly connectionChannels: Map<string, Set<string>>; // connectionId → channels
  readonly deps: MessageRouterDeps;
  totalMessagesSent: number;
  totalRecipients: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createMessageRouter(
  deps: MessageRouterDeps,
): MessageRouter {
  const state: RouterState = {
    channelMembers: new Map(),
    connectionChannels: new Map(),
    deps,
    totalMessagesSent: 0,
    totalRecipients: 0,
  };

  return {
    sendDirect: (p) => sendDirectImpl(state, p),
    broadcast: (p) => broadcastImpl(state, p),
    sendToGroup: (p) => sendGroupImpl(state, p),
    sendToDynasty: (p) => sendDynastyImpl(state, p),
    subscribe: (cid, ch) => subscribeImpl(state, cid, ch),
    unsubscribe: (cid, ch) => unsubscribeImpl(state, cid, ch),
    getSubscriptions: (cid) => getSubsImpl(state, cid),
    getChannelMembers: (ch) => getMembersImpl(state, ch),
    unsubscribeAll: (cid) => unsubAllImpl(state, cid),
    getStats: () => computeStats(state),
  };
}

// ─── Direct ─────────────────────────────────────────────────────────

function sendDirectImpl(
  state: RouterState,
  params: RouteDirectParams,
): RoutedMessage {
  const delivered = state.deps.deliveryPort.deliver(
    params.connectionId, params.payload,
  );
  const count = delivered ? 1 : 0;
  return recordMessage(state, 'direct', null, params.payload, count);
}

// ─── Broadcast ──────────────────────────────────────────────────────

function broadcastImpl(
  state: RouterState,
  params: RouteBroadcastParams,
): RoutedMessage {
  const all = state.deps.connectionPort.listActiveConnectionIds();
  const excluded = new Set(params.excludeConnectionIds ?? []);
  let count = 0;
  for (const cid of all) {
    if (excluded.has(cid)) continue;
    if (state.deps.deliveryPort.deliver(cid, params.payload)) count += 1;
  }
  return recordMessage(state, 'broadcast', null, params.payload, count);
}

// ─── Group ──────────────────────────────────────────────────────────

function sendGroupImpl(
  state: RouterState,
  params: RouteGroupParams,
): RoutedMessage {
  const members = state.channelMembers.get(params.channel);
  if (members === undefined) {
    return recordMessage(state, 'group', params.channel, params.payload, 0);
  }
  const excluded = new Set(params.excludeConnectionIds ?? []);
  let count = 0;
  for (const cid of members) {
    if (excluded.has(cid)) continue;
    if (state.deps.deliveryPort.deliver(cid, params.payload)) count += 1;
  }
  return recordMessage(state, 'group', params.channel, params.payload, count);
}

// ─── Dynasty ────────────────────────────────────────────────────────

function sendDynastyImpl(
  state: RouterState,
  params: RouteDynastyParams,
): RoutedMessage {
  const connections = state.deps.connectionPort.getConnectionsByDynasty(
    params.dynastyId,
  );
  let count = 0;
  for (const cid of connections) {
    if (state.deps.deliveryPort.deliver(cid, params.payload)) count += 1;
  }
  return recordMessage(state, 'dynasty', null, params.payload, count);
}

// ─── Subscriptions ──────────────────────────────────────────────────

function subscribeImpl(
  state: RouterState,
  connectionId: string,
  channel: string,
): boolean {
  let members = state.channelMembers.get(channel);
  if (members === undefined) {
    members = new Set();
    state.channelMembers.set(channel, members);
  }
  if (members.has(connectionId)) return false;
  members.add(connectionId);
  addToConnectionChannels(state, connectionId, channel);
  return true;
}

function addToConnectionChannels(
  state: RouterState,
  connectionId: string,
  channel: string,
): void {
  let channels = state.connectionChannels.get(connectionId);
  if (channels === undefined) {
    channels = new Set();
    state.connectionChannels.set(connectionId, channels);
  }
  channels.add(channel);
}

function unsubscribeImpl(
  state: RouterState,
  connectionId: string,
  channel: string,
): boolean {
  const members = state.channelMembers.get(channel);
  if (members === undefined) return false;
  if (!members.delete(connectionId)) return false;
  if (members.size === 0) state.channelMembers.delete(channel);
  removeFromConnectionChannels(state, connectionId, channel);
  return true;
}

function removeFromConnectionChannels(
  state: RouterState,
  connectionId: string,
  channel: string,
): void {
  const channels = state.connectionChannels.get(connectionId);
  if (channels === undefined) return;
  channels.delete(channel);
  if (channels.size === 0) state.connectionChannels.delete(connectionId);
}

function unsubAllImpl(state: RouterState, connectionId: string): number {
  const channels = state.connectionChannels.get(connectionId);
  if (channels === undefined) return 0;
  let removed = 0;
  for (const channel of channels) {
    const members = state.channelMembers.get(channel);
    if (members !== undefined) {
      members.delete(connectionId);
      if (members.size === 0) state.channelMembers.delete(channel);
    }
    removed += 1;
  }
  state.connectionChannels.delete(connectionId);
  return removed;
}

// ─── Queries ────────────────────────────────────────────────────────

function getSubsImpl(
  state: RouterState,
  connectionId: string,
): ReadonlyArray<string> {
  const channels = state.connectionChannels.get(connectionId);
  return channels !== undefined ? [...channels] : [];
}

function getMembersImpl(
  state: RouterState,
  channel: string,
): ReadonlyArray<string> {
  const members = state.channelMembers.get(channel);
  return members !== undefined ? [...members] : [];
}

// ─── Recording ──────────────────────────────────────────────────────

function recordMessage(
  state: RouterState,
  mode: RouteMode,
  channel: string | null,
  payload: string,
  recipientCount: number,
): RoutedMessage {
  state.totalMessagesSent += 1;
  state.totalRecipients += recipientCount;
  return {
    messageId: state.deps.idGenerator.next(),
    mode,
    channel,
    payload,
    sentAt: state.deps.clock.nowMicroseconds(),
    recipientCount,
  };
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: RouterState): RouterStats {
  let totalSubscriptions = 0;
  for (const members of state.channelMembers.values()) {
    totalSubscriptions += members.size;
  }
  return {
    totalMessagesSent: state.totalMessagesSent,
    totalRecipients: state.totalRecipients,
    activeChannels: state.channelMembers.size,
    totalSubscriptions,
  };
}
