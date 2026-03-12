/**
 * Alliance Chat & Portfolio Sharing — Communication channels for allied dynasties.
 *
 * NEXT-STEPS Phase 8.2: "Alliance chat channels and shared dynasty
 * portfolios (read-only view)."
 *
 * Features:
 *   - Persistent chat channels per alliance
 *   - Read-only portfolio sharing (KALON balance, world ownership, titles)
 *   - Channel message history with automatic pruning
 *   - Alliance-wide announcements
 */

// ─── Types ───────────────────────────────────────────────────────

export type ChannelType = 'GENERAL' | 'STRATEGY' | 'TRADE' | 'ANNOUNCEMENTS';

export interface ChatMessage {
  readonly messageId: string;
  readonly channelId: string;
  readonly senderDynastyId: string;
  readonly content: string;
  readonly sentAt: number;
  readonly isAnnouncement: boolean;
}

export interface AllianceChannel {
  readonly channelId: string;
  readonly allianceId: string;
  readonly channelType: ChannelType;
  readonly name: string;
  readonly createdAt: number;
  readonly messageCount: number;
}

export interface SharedPortfolio {
  readonly dynastyId: string;
  readonly displayName: string;
  readonly kalonBalance: bigint;
  readonly worldCount: number;
  readonly titles: ReadonlyArray<string>;
  readonly sharedAt: number;
}

// ─── Ports ───────────────────────────────────────────────────────

export interface AllianceChatDeps {
  readonly clock: { readonly nowMicroseconds: () => number };
  readonly idGenerator: { readonly next: () => string };
  readonly membershipCheck: {
    readonly isMember: (allianceId: string, dynastyId: string) => boolean;
  };
}

// ─── Config ──────────────────────────────────────────────────────

export interface AllianceChatConfig {
  readonly maxMessageLength: number;
  readonly maxMessagesPerChannel: number;
  readonly maxChannelsPerAlliance: number;
  readonly maxPortfoliosPerAlliance: number;
}

export const DEFAULT_CHAT_CONFIG: AllianceChatConfig = {
  maxMessageLength: 1000,
  maxMessagesPerChannel: 5000,
  maxChannelsPerAlliance: 10,
  maxPortfoliosPerAlliance: 50,
};

// ─── Stats ───────────────────────────────────────────────────────

export interface AllianceChatStats {
  readonly totalChannels: number;
  readonly totalMessages: number;
  readonly totalPortfolios: number;
}

// ─── Public Interface ────────────────────────────────────────────

export interface AllianceChatSystem {
  readonly createChannel: (allianceId: string, channelType: ChannelType, name: string) => AllianceChannel;
  readonly sendMessage: (channelId: string, senderDynastyId: string, content: string) => ChatMessage;
  readonly sendAnnouncement: (channelId: string, senderDynastyId: string, content: string) => ChatMessage;
  readonly getMessages: (channelId: string, limit: number) => ReadonlyArray<ChatMessage>;
  readonly getChannels: (allianceId: string) => ReadonlyArray<AllianceChannel>;
  readonly getChannel: (channelId: string) => AllianceChannel;
  readonly sharePortfolio: (allianceId: string, portfolio: SharedPortfolioInput) => SharedPortfolio;
  readonly getSharedPortfolios: (allianceId: string) => ReadonlyArray<SharedPortfolio>;
  readonly revokePortfolio: (allianceId: string, dynastyId: string) => boolean;
  readonly pruneOldMessages: (channelId: string) => number;
  readonly getStats: () => AllianceChatStats;
}

export interface SharedPortfolioInput {
  readonly dynastyId: string;
  readonly displayName: string;
  readonly kalonBalance: bigint;
  readonly worldCount: number;
  readonly titles: ReadonlyArray<string>;
}

// ─── Mutable State ───────────────────────────────────────────────

interface MutableChannel {
  readonly channelId: string;
  readonly allianceId: string;
  readonly channelType: ChannelType;
  readonly name: string;
  readonly createdAt: number;
  readonly messages: ChatMessage[];
}

// ─── Factory ─────────────────────────────────────────────────────

export function createAllianceChatSystem(
  deps: AllianceChatDeps,
  config?: Partial<AllianceChatConfig>,
): AllianceChatSystem {
  const cfg: AllianceChatConfig = { ...DEFAULT_CHAT_CONFIG, ...config };
  const channels = new Map<string, MutableChannel>();
  const allianceChannels = new Map<string, string[]>(); // allianceId → channelIds
  const portfolios = new Map<string, Map<string, SharedPortfolio>>(); // allianceId → dynastyId → portfolio

  return {
    createChannel: (aid, type, name) => freezeChannel(createCh(deps, cfg, channels, allianceChannels, aid, type, name)),
    sendMessage: (cid, did, content) => sendMsg(deps, cfg, channels, cid, did, content, false),
    sendAnnouncement: (cid, did, content) => sendMsg(deps, cfg, channels, cid, did, content, true),
    getMessages: (cid, limit) => getRecentMessages(channels, cid, limit),
    getChannels: (aid) => getChannelsByAlliance(channels, allianceChannels, aid),
    getChannel: (cid) => freezeChannel(getOrThrow(channels, cid)),
    sharePortfolio: (aid, input) => sharePortfolioImpl(deps, cfg, portfolios, aid, input),
    getSharedPortfolios: (aid) => [...(portfolios.get(aid)?.values() ?? [])],
    revokePortfolio: (aid, did) => revokePortfolioImpl(portfolios, aid, did),
    pruneOldMessages: (cid) => pruneMessages(cfg, channels, cid),
    getStats: () => computeStats(channels, portfolios),
  };
}

// ─── Channel Management ─────────────────────────────────────────

function createCh(
  deps: AllianceChatDeps,
  cfg: AllianceChatConfig,
  channels: Map<string, MutableChannel>,
  allianceChannels: Map<string, string[]>,
  allianceId: string,
  channelType: ChannelType,
  name: string,
): MutableChannel {
  const existing = allianceChannels.get(allianceId) ?? [];
  if (existing.length >= cfg.maxChannelsPerAlliance) {
    throw new Error(`Alliance channel limit reached: ${cfg.maxChannelsPerAlliance}`);
  }

  const channel: MutableChannel = {
    channelId: deps.idGenerator.next(),
    allianceId,
    channelType,
    name,
    createdAt: deps.clock.nowMicroseconds(),
    messages: [],
  };

  channels.set(channel.channelId, channel);
  if (existing.length === 0) {
    allianceChannels.set(allianceId, [channel.channelId]);
  } else {
    existing.push(channel.channelId);
  }

  return channel;
}

// ─── Messaging ───────────────────────────────────────────────────

function sendMsg(
  deps: AllianceChatDeps,
  cfg: AllianceChatConfig,
  channels: Map<string, MutableChannel>,
  channelId: string,
  senderDynastyId: string,
  content: string,
  isAnnouncement: boolean,
): ChatMessage {
  const channel = getOrThrow(channels, channelId);

  if (!deps.membershipCheck.isMember(channel.allianceId, senderDynastyId)) {
    throw new Error(`Dynasty ${senderDynastyId} is not a member of alliance`);
  }

  if (content.length > cfg.maxMessageLength) {
    throw new Error(`Message exceeds ${cfg.maxMessageLength} characters`);
  }

  if (content.length === 0) {
    throw new Error('Message cannot be empty');
  }

  const msg: ChatMessage = {
    messageId: deps.idGenerator.next(),
    channelId,
    senderDynastyId,
    content,
    sentAt: deps.clock.nowMicroseconds(),
    isAnnouncement,
  };

  channel.messages.push(msg);
  return msg;
}

function getRecentMessages(
  channels: Map<string, MutableChannel>,
  channelId: string,
  limit: number,
): ReadonlyArray<ChatMessage> {
  const channel = getOrThrow(channels, channelId);
  const start = Math.max(0, channel.messages.length - limit);
  return channel.messages.slice(start);
}

function pruneMessages(
  cfg: AllianceChatConfig,
  channels: Map<string, MutableChannel>,
  channelId: string,
): number {
  const channel = getOrThrow(channels, channelId);
  const excess = channel.messages.length - cfg.maxMessagesPerChannel;
  if (excess <= 0) return 0;

  channel.messages.splice(0, excess);
  return excess;
}

// ─── Portfolios ──────────────────────────────────────────────────

function sharePortfolioImpl(
  deps: AllianceChatDeps,
  cfg: AllianceChatConfig,
  portfolios: Map<string, Map<string, SharedPortfolio>>,
  allianceId: string,
  input: SharedPortfolioInput,
): SharedPortfolio {
  let map = portfolios.get(allianceId);
  if (map === undefined) {
    map = new Map();
    portfolios.set(allianceId, map);
  }

  if (!map.has(input.dynastyId) && map.size >= cfg.maxPortfoliosPerAlliance) {
    throw new Error(`Portfolio limit reached: ${cfg.maxPortfoliosPerAlliance}`);
  }

  const portfolio: SharedPortfolio = {
    dynastyId: input.dynastyId,
    displayName: input.displayName,
    kalonBalance: input.kalonBalance,
    worldCount: input.worldCount,
    titles: [...input.titles],
    sharedAt: deps.clock.nowMicroseconds(),
  };

  map.set(input.dynastyId, portfolio);
  return portfolio;
}

function revokePortfolioImpl(
  portfolios: Map<string, Map<string, SharedPortfolio>>,
  allianceId: string,
  dynastyId: string,
): boolean {
  const map = portfolios.get(allianceId);
  if (map === undefined) return false;
  return map.delete(dynastyId);
}

// ─── Queries ─────────────────────────────────────────────────────

function getChannelsByAlliance(
  channels: Map<string, MutableChannel>,
  allianceChannels: Map<string, string[]>,
  allianceId: string,
): ReadonlyArray<AllianceChannel> {
  const ids = allianceChannels.get(allianceId) ?? [];
  return ids
    .map(id => channels.get(id))
    .filter((c): c is MutableChannel => c !== undefined)
    .map(freezeChannel);
}

// ─── Helpers ─────────────────────────────────────────────────────

function getOrThrow(channels: Map<string, MutableChannel>, id: string): MutableChannel {
  const channel = channels.get(id);
  if (channel === undefined) throw new Error(`Unknown channel: ${id}`);
  return channel;
}

function freezeChannel(c: MutableChannel): AllianceChannel {
  return {
    channelId: c.channelId,
    allianceId: c.allianceId,
    channelType: c.channelType,
    name: c.name,
    createdAt: c.createdAt,
    messageCount: c.messages.length,
  };
}

function computeStats(
  channels: Map<string, MutableChannel>,
  portfolios: Map<string, Map<string, SharedPortfolio>>,
): AllianceChatStats {
  let totalMessages = 0;
  let totalPortfolios = 0;

  for (const c of channels.values()) totalMessages += c.messages.length;
  for (const m of portfolios.values()) totalPortfolios += m.size;

  return { totalChannels: channels.size, totalMessages, totalPortfolios };
}
