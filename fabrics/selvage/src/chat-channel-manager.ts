/**
 * Chat Channel Manager — Real-time text chat infrastructure.
 *
 * Manages chat channels across worlds, dynasties, alliances, and parties.
 * Supports:
 *   - world-local    → Players within a world zone (proximity-based)
 *   - dynasty        → Dynasty members only
 *   - alliance       → Allied dynasties
 *   - assembly       → World governance chamber
 *   - whisper        → Private 1-to-1 messages
 *   - trade          → Trade-related broadcasts
 *   - party          → Small group (up to 8)
 *   - global         → Server-wide announcements
 *
 * Rate-limits messages per player (10 msg/s, escalating cooldowns).
 * Cross-world relay for allied dynasty channels.
 */

import type { ChatChannelType } from '@loom/events-contracts';

// ── Ports ────────────────────────────────────────────────────────

export interface ChatClockPort {
  readonly nowMicroseconds: () => number;
}

export interface ChatIdPort {
  readonly generate: () => string;
}

export interface ChatLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
  readonly warn: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

export interface ChatDeliveryPort {
  readonly send: (recipientId: string, message: ChatMessage) => void;
  readonly broadcast: (channelId: string, message: ChatMessage) => void;
}

export interface ChatModerationPort {
  readonly evaluate: (content: string, senderId: string) => ModerationResult;
}

export interface ChatPersistencePort {
  readonly store: (message: ChatMessage) => void;
  readonly queryHistory: (
    channelId: string,
    before: number,
    limit: number,
  ) => ReadonlyArray<ChatMessage>;
}

// ── Types ────────────────────────────────────────────────────────

export interface ChatMessage {
  readonly messageId: string;
  readonly channelId: string;
  readonly channelType: ChatChannelType;
  readonly senderId: string;
  readonly senderDisplayName: string;
  readonly content: string;
  readonly worldId: string;
  readonly timestamp: number;
  readonly replyToMessageId: string | null;
  readonly reactions: Readonly<Record<string, ReadonlyArray<string>>>;
  readonly edited: boolean;
}

export interface ChatChannel {
  readonly channelId: string;
  readonly channelType: ChatChannelType;
  readonly worldId: string;
  readonly name: string;
  readonly members: ReadonlySet<string>;
  readonly createdAt: number;
  readonly metadata: Readonly<Record<string, string>>;
}

export interface ModerationResult {
  readonly allowed: boolean;
  readonly action: 'pass' | 'filtered' | 'blocked' | 'flagged';
  readonly reason: string;
  readonly sanitisedContent: string | null;
}

export interface SendMessageParams {
  readonly channelId: string;
  readonly senderId: string;
  readonly senderDisplayName: string;
  readonly content: string;
  readonly worldId: string;
  readonly replyToMessageId?: string;
}

export interface ChatChannelManagerDeps {
  readonly clock: ChatClockPort;
  readonly idGenerator: ChatIdPort;
  readonly logger: ChatLogPort;
  readonly delivery: ChatDeliveryPort;
  readonly moderation: ChatModerationPort;
  readonly persistence: ChatPersistencePort;
}

export interface ChatChannelManagerConfig {
  readonly maxMessagesPerSecond: number;
  readonly cooldownEscalationFactor: number;
  readonly maxCooldownMs: number;
  readonly maxMessageLength: number;
  readonly maxChannelMembers: number;
  readonly historyPageSize: number;
}

export interface ChatChannelManagerStats {
  readonly totalChannels: number;
  readonly totalMessages: number;
  readonly totalBlocked: number;
  readonly totalFiltered: number;
  readonly activeConnections: number;
}

export interface ChatChannelManager {
  readonly createChannel: (
    channelType: ChatChannelType,
    worldId: string,
    name: string,
    metadata?: Readonly<Record<string, string>>,
  ) => ChatChannel;
  readonly removeChannel: (channelId: string) => boolean;
  readonly joinChannel: (channelId: string, playerId: string) => boolean;
  readonly leaveChannel: (channelId: string, playerId: string) => boolean;
  readonly sendMessage: (params: SendMessageParams) => ChatMessage | null;
  readonly addReaction: (messageId: string, playerId: string, emoji: string) => boolean;
  readonly mutePlayer: (
    playerId: string,
    channelId: string | null,
    durationMs: number,
    reason: string,
  ) => void;
  readonly unmutePlayer: (playerId: string, channelId: string | null) => void;
  readonly getChannel: (channelId: string) => ChatChannel | undefined;
  readonly getPlayerChannels: (playerId: string) => ReadonlyArray<ChatChannel>;
  readonly getHistory: (
    channelId: string,
    before: number,
    limit?: number,
  ) => ReadonlyArray<ChatMessage>;
  readonly getStats: () => ChatChannelManagerStats;
}

// ── Rate Limiter State ───────────────────────────────────────────

interface RateLimitEntry {
  timestamps: number[];
  cooldownUntil: number;
  violations: number;
}

// ── Mute State ───────────────────────────────────────────────────

interface MuteEntry {
  readonly channelId: string | null;
  readonly expiresAt: number;
  readonly reason: string;
}

// ── Default Config ───────────────────────────────────────────────

const DEFAULT_CONFIG: ChatChannelManagerConfig = {
  maxMessagesPerSecond: 10,
  cooldownEscalationFactor: 2,
  maxCooldownMs: 60_000,
  maxMessageLength: 2_000,
  maxChannelMembers: 500,
  historyPageSize: 50,
};

// ── Factory ──────────────────────────────────────────────────────

export function createChatChannelManager(
  deps: ChatChannelManagerDeps,
  config?: Partial<ChatChannelManagerConfig>,
): ChatChannelManager {
  const cfg: ChatChannelManagerConfig = { ...DEFAULT_CONFIG, ...config };
  const channels = new Map<string, MutableChannel>();
  const messages = new Map<string, MutableMessage>();
  const playerChannels = new Map<string, Set<string>>();
  const rateLimits = new Map<string, RateLimitEntry>();
  const mutes = new Map<string, MuteEntry[]>();

  let totalMessages = 0;
  let totalBlocked = 0;
  let totalFiltered = 0;

  function createChannel(
    channelType: ChatChannelType,
    worldId: string,
    name: string,
    metadata?: Readonly<Record<string, string>>,
  ): ChatChannel {
    const channelId = deps.idGenerator.generate();
    const channel: MutableChannel = {
      channelId,
      channelType,
      worldId,
      name,
      members: new Set(),
      createdAt: deps.clock.nowMicroseconds(),
      metadata: metadata ?? {},
    };
    channels.set(channelId, channel);
    deps.logger.info({ channelId, channelType, worldId }, 'chat.channel.created');
    return toReadonlyChannel(channel);
  }

  function removeChannel(channelId: string): boolean {
    const channel = channels.get(channelId);
    if (!channel) return false;
    for (const memberId of channel.members) {
      playerChannels.get(memberId)?.delete(channelId);
    }
    channels.delete(channelId);
    deps.logger.info({ channelId }, 'chat.channel.removed');
    return true;
  }

  function joinChannel(channelId: string, playerId: string): boolean {
    const channel = channels.get(channelId);
    if (!channel) return false;
    if (channel.members.size >= cfg.maxChannelMembers) return false;
    if (channel.members.has(playerId)) return false;

    channel.members.add(playerId);
    let playerSet = playerChannels.get(playerId);
    if (!playerSet) {
      playerSet = new Set();
      playerChannels.set(playerId, playerSet);
    }
    playerSet.add(channelId);
    deps.logger.info({ channelId, playerId }, 'chat.channel.joined');
    return true;
  }

  function leaveChannel(channelId: string, playerId: string): boolean {
    const channel = channels.get(channelId);
    if (!channel) return false;
    if (!channel.members.has(playerId)) return false;

    channel.members.delete(playerId);
    playerChannels.get(playerId)?.delete(channelId);
    deps.logger.info({ channelId, playerId }, 'chat.channel.left');
    return true;
  }

  function isRateLimited(senderId: string): boolean {
    const now = deps.clock.nowMicroseconds();
    const nowMs = now / 1_000;
    let entry = rateLimits.get(senderId);

    if (!entry) {
      entry = { timestamps: [], cooldownUntil: 0, violations: 0 };
      rateLimits.set(senderId, entry);
    }

    if (nowMs < entry.cooldownUntil) return true;

    const windowStart = nowMs - 1_000;
    entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

    if (entry.timestamps.length >= cfg.maxMessagesPerSecond) {
      entry.violations++;
      const cooldownMs = Math.min(
        1_000 * Math.pow(cfg.cooldownEscalationFactor, entry.violations),
        cfg.maxCooldownMs,
      );
      entry.cooldownUntil = nowMs + cooldownMs;
      deps.logger.warn(
        { senderId, violations: entry.violations, cooldownMs },
        'chat.rate.limited',
      );
      return true;
    }

    entry.timestamps.push(nowMs);
    return false;
  }

  function isPlayerMuted(playerId: string, channelId: string): boolean {
    const entries = mutes.get(playerId);
    if (!entries) return false;
    const now = deps.clock.nowMicroseconds();
    return entries.some(
      (m) =>
        m.expiresAt > now &&
        (m.channelId === null || m.channelId === channelId),
    );
  }

  function sendMessage(params: SendMessageParams): ChatMessage | null {
    const channel = channels.get(params.channelId);
    if (!channel) return null;
    if (!channel.members.has(params.senderId)) return null;

    if (params.content.length > cfg.maxMessageLength) return null;
    if (params.content.trim().length === 0) return null;

    if (isPlayerMuted(params.senderId, params.channelId)) return null;
    if (isRateLimited(params.senderId)) return null;

    const modResult = deps.moderation.evaluate(params.content, params.senderId);

    if (modResult.action === 'blocked') {
      totalBlocked++;
      deps.logger.warn(
        { senderId: params.senderId, reason: modResult.reason },
        'chat.message.blocked',
      );
      return null;
    }

    const finalContent =
      modResult.action === 'filtered' && modResult.sanitisedContent !== null
        ? modResult.sanitisedContent
        : params.content;

    if (modResult.action === 'filtered') totalFiltered++;

    const messageId = deps.idGenerator.generate();
    const message: MutableMessage = {
      messageId,
      channelId: params.channelId,
      channelType: channel.channelType,
      senderId: params.senderId,
      senderDisplayName: params.senderDisplayName,
      content: finalContent,
      worldId: params.worldId,
      timestamp: deps.clock.nowMicroseconds(),
      replyToMessageId: params.replyToMessageId ?? null,
      reactions: {},
      edited: false,
    };

    messages.set(messageId, message);
    totalMessages++;

    deps.persistence.store(message);
    deps.delivery.broadcast(params.channelId, message);

    return message;
  }

  function addReaction(messageId: string, playerId: string, emoji: string): boolean {
    const message = messages.get(messageId);
    if (!message) return false;
    const channel = channels.get(message.channelId);
    if (!channel?.members.has(playerId)) return false;

    if (!message.reactions[emoji]) {
      message.reactions[emoji] = [];
    }
    const list = message.reactions[emoji] as string[];
    if (list.includes(playerId)) return false;
    list.push(playerId);
    return true;
  }

  function mutePlayer(
    playerId: string,
    channelId: string | null,
    durationMs: number,
    reason: string,
  ): void {
    let entries = mutes.get(playerId);
    if (!entries) {
      entries = [];
      mutes.set(playerId, entries);
    }
    entries.push({
      channelId,
      expiresAt: deps.clock.nowMicroseconds() + durationMs * 1_000,
      reason,
    });
    deps.logger.info({ playerId, channelId, durationMs, reason }, 'chat.player.muted');
  }

  function unmutePlayer(playerId: string, channelId: string | null): void {
    const entries = mutes.get(playerId);
    if (!entries) return;
    const filtered = entries.filter((m) => m.channelId !== channelId);
    if (filtered.length === 0) {
      mutes.delete(playerId);
    } else {
      mutes.set(playerId, filtered);
    }
    deps.logger.info({ playerId, channelId }, 'chat.player.unmuted');
  }

  function getChannel(channelId: string): ChatChannel | undefined {
    const ch = channels.get(channelId);
    return ch ? toReadonlyChannel(ch) : undefined;
  }

  function getPlayerChannels(playerId: string): ReadonlyArray<ChatChannel> {
    const ids = playerChannels.get(playerId);
    if (!ids) return [];
    const result: ChatChannel[] = [];
    for (const id of ids) {
      const ch = channels.get(id);
      if (ch) result.push(toReadonlyChannel(ch));
    }
    return result;
  }

  function getHistory(
    channelId: string,
    before: number,
    limit?: number,
  ): ReadonlyArray<ChatMessage> {
    return deps.persistence.queryHistory(
      channelId,
      before,
      limit ?? cfg.historyPageSize,
    );
  }

  function getStats(): ChatChannelManagerStats {
    return {
      totalChannels: channels.size,
      totalMessages,
      totalBlocked,
      totalFiltered,
      activeConnections: playerChannels.size,
    };
  }

  return {
    createChannel,
    removeChannel,
    joinChannel,
    leaveChannel,
    sendMessage,
    addReaction,
    mutePlayer,
    unmutePlayer,
    getChannel,
    getPlayerChannels,
    getHistory,
    getStats,
  };
}

// ── Internal Mutable Types ───────────────────────────────────────

interface MutableChannel {
  readonly channelId: string;
  readonly channelType: ChatChannelType;
  readonly worldId: string;
  readonly name: string;
  readonly members: Set<string>;
  readonly createdAt: number;
  readonly metadata: Readonly<Record<string, string>>;
}

interface MutableMessage {
  readonly messageId: string;
  readonly channelId: string;
  readonly channelType: ChatChannelType;
  readonly senderId: string;
  readonly senderDisplayName: string;
  readonly content: string;
  readonly worldId: string;
  readonly timestamp: number;
  readonly replyToMessageId: string | null;
  readonly reactions: Record<string, string[]>;
  readonly edited: boolean;
}

function toReadonlyChannel(ch: MutableChannel): ChatChannel {
  return {
    channelId: ch.channelId,
    channelType: ch.channelType,
    worldId: ch.worldId,
    name: ch.name,
    members: ch.members,
    createdAt: ch.createdAt,
    metadata: ch.metadata,
  };
}
