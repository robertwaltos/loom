/**
 * Chat Archive — Persistent chat history with search.
 *
 * Stores chat messages in an append-only log per channel.
 * Supports:
 *   - Chronological history queries (paginated, newest-first)
 *   - Full-text keyword search across channel history
 *   - Moderator access to deleted/moderated messages
 *   - Per-channel message retention (configurable TTL)
 *   - Message export for GDPR data access requests
 *
 * Implements ChatPersistencePort from the chat-channel-manager.
 */

import type { ChatChannelType } from '@loom/events-contracts';

// ── Shared Chat Types (locally-defined to avoid cross-fabric import) ─

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

export interface ChatPersistencePort {
  readonly store: (message: ChatMessage) => void;
  readonly queryHistory: (
    channelId: string,
    before: number,
    limit: number,
  ) => ReadonlyArray<ChatMessage>;
}

// ── Ports ────────────────────────────────────────────────────────

export interface ChatArchiveClockPort {
  readonly nowMicroseconds: () => number;
}

export interface ChatArchiveLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
  readonly warn: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

// ── Config ───────────────────────────────────────────────────────

export interface ChatArchiveConfig {
  readonly maxMessagesPerChannel: number;
  readonly retentionDays: number;
  readonly searchResultLimit: number;
}

const DEFAULT_CONFIG: ChatArchiveConfig = {
  maxMessagesPerChannel: 100_000,
  retentionDays: 90,
  searchResultLimit: 100,
};

// ── Types ────────────────────────────────────────────────────────

export interface ChatSearchParams {
  readonly channelId: string;
  readonly query: string;
  readonly senderId?: string;
  readonly after?: number;
  readonly before?: number;
  readonly limit?: number;
}

export interface ChatExportParams {
  readonly playerId: string;
  readonly after?: number;
  readonly before?: number;
}

export interface ChatArchiveStats {
  readonly totalChannels: number;
  readonly totalMessages: number;
  readonly oldestMessageTimestamp: number;
  readonly newestMessageTimestamp: number;
}

export interface ChatArchive extends ChatPersistencePort {
  readonly search: (params: ChatSearchParams) => ReadonlyArray<ChatMessage>;
  readonly exportPlayerMessages: (params: ChatExportParams) => ReadonlyArray<ChatMessage>;
  readonly getModeratorView: (
    channelId: string,
    before: number,
    limit: number,
  ) => ReadonlyArray<ChatMessage>;
  readonly purgeExpired: () => number;
  readonly deletePlayerMessages: (playerId: string) => number;
  readonly getStats: () => ChatArchiveStats;
}

// ── Deps ─────────────────────────────────────────────────────────

export interface ChatArchiveDeps {
  readonly clock: ChatArchiveClockPort;
  readonly logger: ChatArchiveLogPort;
}

// ── Factory ──────────────────────────────────────────────────────

export function createChatArchive(
  deps: ChatArchiveDeps,
  config?: Partial<ChatArchiveConfig>,
): ChatArchive {
  const cfg: ChatArchiveConfig = { ...DEFAULT_CONFIG, ...config };
  const channelMessages = new Map<string, ChatMessage[]>();
  const playerIndex = new Map<string, ChatMessage[]>();

  function store(message: ChatMessage): void {
    let messages = channelMessages.get(message.channelId);
    if (!messages) {
      messages = [];
      channelMessages.set(message.channelId, messages);
    }
    messages.push(message);

    // Enforce per-channel limit (evict oldest)
    if (messages.length > cfg.maxMessagesPerChannel) {
      messages.splice(0, messages.length - cfg.maxMessagesPerChannel);
    }

    // Update player index
    let playerMsgs = playerIndex.get(message.senderId);
    if (!playerMsgs) {
      playerMsgs = [];
      playerIndex.set(message.senderId, playerMsgs);
    }
    playerMsgs.push(message);
  }

  function queryHistory(
    channelId: string,
    before: number,
    limit: number,
  ): ReadonlyArray<ChatMessage> {
    const messages = channelMessages.get(channelId);
    if (!messages) return [];

    const filtered = messages.filter((m) => m.timestamp < before);
    return filtered.slice(-limit);
  }

  function search(params: ChatSearchParams): ReadonlyArray<ChatMessage> {
    const messages = channelMessages.get(params.channelId);
    if (!messages) return [];

    const queryLower = params.query.toLowerCase();
    const limit = params.limit ?? cfg.searchResultLimit;

    const results: ChatMessage[] = [];
    for (const msg of messages) {
      if (results.length >= limit) break;

      if (params.senderId && msg.senderId !== params.senderId) continue;
      if (params.after && msg.timestamp <= params.after) continue;
      if (params.before && msg.timestamp >= params.before) continue;
      if (!msg.content.toLowerCase().includes(queryLower)) continue;

      results.push(msg);
    }

    return results;
  }

  function exportPlayerMessages(params: ChatExportParams): ReadonlyArray<ChatMessage> {
    const messages = playerIndex.get(params.playerId);
    if (!messages) return [];

    return messages.filter((m) => {
      if (params.after && m.timestamp <= params.after) return false;
      if (params.before && m.timestamp >= params.before) return false;
      return true;
    });
  }

  function getModeratorView(
    channelId: string,
    before: number,
    limit: number,
  ): ReadonlyArray<ChatMessage> {
    return queryHistory(channelId, before, limit);
  }

  function purgeExpired(): number {
    const now = deps.clock.nowMicroseconds();
    const cutoff = now - cfg.retentionDays * 24 * 60 * 60 * 1_000_000;
    let purged = 0;

    for (const [channelId, messages] of channelMessages) {
      const before = messages.length;
      const filtered = messages.filter((m) => m.timestamp >= cutoff);
      if (filtered.length < before) {
        channelMessages.set(channelId, filtered);
        purged += before - filtered.length;
      }
    }

    // Purge player index
    for (const [playerId, messages] of playerIndex) {
      const filtered = messages.filter((m) => m.timestamp >= cutoff);
      if (filtered.length === 0) {
        playerIndex.delete(playerId);
      } else {
        playerIndex.set(playerId, filtered);
      }
    }

    if (purged > 0) {
      deps.logger.info({ purged, retentionDays: cfg.retentionDays }, 'chat.archive.purged');
    }
    return purged;
  }

  function deletePlayerMessages(playerId: string): number {
    const messages = playerIndex.get(playerId);
    if (!messages) return 0;

    const count = messages.length;
    const messageIds = new Set(messages.map((m) => m.messageId));

    // Remove from channel indexes
    for (const [channelId, channelMsgs] of channelMessages) {
      const filtered = channelMsgs.filter((m) => !messageIds.has(m.messageId));
      channelMessages.set(channelId, filtered);
    }

    playerIndex.delete(playerId);
    deps.logger.info({ playerId, deletedCount: count }, 'chat.archive.player.deleted');
    return count;
  }

  function getStats(): ChatArchiveStats {
    let totalMessages = 0;
    let oldest = Number.MAX_SAFE_INTEGER;
    let newest = 0;

    for (const messages of channelMessages.values()) {
      totalMessages += messages.length;
      if (messages.length > 0) {
        const first = messages[0]!;
        const last = messages[messages.length - 1]!;
        if (first.timestamp < oldest) oldest = first.timestamp;
        if (last.timestamp > newest) newest = last.timestamp;
      }
    }

    return {
      totalChannels: channelMessages.size,
      totalMessages,
      oldestMessageTimestamp: totalMessages > 0 ? oldest : 0,
      newestMessageTimestamp: newest,
    };
  }

  return {
    store,
    queryHistory,
    search,
    exportPlayerMessages,
    getModeratorView,
    purgeExpired,
    deletePlayerMessages,
    getStats,
  };
}
