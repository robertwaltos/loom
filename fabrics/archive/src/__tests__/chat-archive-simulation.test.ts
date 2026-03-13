import { describe, expect, it } from 'vitest';
import {
  createChatArchive,
  type ChatArchiveDeps,
  type ChatMessage,
} from '../chat-archive.js';

function createDeps(startMicros = 10_000_000): ChatArchiveDeps {
  let now = startMicros;
  return {
    clock: {
      nowMicroseconds: () => now,
    },
    logger: {
      info: () => {
        now += 1;
      },
      warn: () => {
        now += 1;
      },
    },
  };
}

function makeMessage(overrides?: Partial<ChatMessage>): ChatMessage {
  return {
    messageId: overrides?.messageId ?? 'm-1',
    channelId: overrides?.channelId ?? 'ch-1',
    channelType: overrides?.channelType ?? 'WORLD',
    senderId: overrides?.senderId ?? 'p-1',
    senderDisplayName: overrides?.senderDisplayName ?? 'Player 1',
    content: overrides?.content ?? 'hello world',
    worldId: overrides?.worldId ?? 'w-1',
    timestamp: overrides?.timestamp ?? 1_000,
    replyToMessageId: overrides?.replyToMessageId ?? null,
    reactions: overrides?.reactions ?? {},
    edited: overrides?.edited ?? false,
  };
}

describe('ChatArchive simulation', () => {
  it('stores and queries chronological channel history before timestamp', () => {
    const archive = createChatArchive(createDeps(), { maxMessagesPerChannel: 10 });
    archive.store(makeMessage({ messageId: 'm-1', timestamp: 10 }));
    archive.store(makeMessage({ messageId: 'm-2', timestamp: 20 }));
    archive.store(makeMessage({ messageId: 'm-3', timestamp: 30 }));

    const history = archive.queryHistory('ch-1', 30, 2);

    expect(history).toHaveLength(2);
    expect(history[0]?.messageId).toBe('m-1');
    expect(history[1]?.messageId).toBe('m-2');
  });

  it('enforces per-channel cap by evicting oldest messages', () => {
    const archive = createChatArchive(createDeps(), { maxMessagesPerChannel: 2 });
    archive.store(makeMessage({ messageId: 'm-1', timestamp: 10 }));
    archive.store(makeMessage({ messageId: 'm-2', timestamp: 20 }));
    archive.store(makeMessage({ messageId: 'm-3', timestamp: 30 }));

    const history = archive.queryHistory('ch-1', 999, 10);
    expect(history.map((m) => m.messageId)).toEqual(['m-2', 'm-3']);
  });

  it('searches with case-insensitive content, sender, range, and limit', () => {
    const archive = createChatArchive(createDeps(), { searchResultLimit: 2 });
    archive.store(makeMessage({ messageId: 'm-1', senderId: 'p-1', content: 'Kalon rises', timestamp: 100 }));
    archive.store(makeMessage({ messageId: 'm-2', senderId: 'p-2', content: 'kalon dips', timestamp: 200 }));
    archive.store(makeMessage({ messageId: 'm-3', senderId: 'p-1', content: 'nothing here', timestamp: 300 }));

    const found = archive.search({
      channelId: 'ch-1',
      query: 'KALON',
      senderId: 'p-1',
      after: 50,
      before: 250,
      limit: 5,
    });

    expect(found).toHaveLength(1);
    expect(found[0]?.messageId).toBe('m-1');
  });

  it('exports player messages constrained by time filters', () => {
    const archive = createChatArchive(createDeps());
    archive.store(makeMessage({ messageId: 'a', senderId: 'p-9', timestamp: 10 }));
    archive.store(makeMessage({ messageId: 'b', senderId: 'p-9', timestamp: 20 }));
    archive.store(makeMessage({ messageId: 'c', senderId: 'p-9', timestamp: 30 }));

    const exported = archive.exportPlayerMessages({ playerId: 'p-9', after: 10, before: 30 });
    expect(exported.map((m) => m.messageId)).toEqual(['b']);
  });

  it('moderator view delegates to history query', () => {
    const archive = createChatArchive(createDeps());
    archive.store(makeMessage({ messageId: 'm-1', timestamp: 100 }));
    archive.store(makeMessage({ messageId: 'm-2', timestamp: 200 }));

    const view = archive.getModeratorView('ch-1', 250, 1);
    expect(view).toHaveLength(1);
    expect(view[0]?.messageId).toBe('m-2');
  });

  it('purges expired messages from channel and player indexes', () => {
    const deps = createDeps(100 * 24 * 60 * 60 * 1_000_000);
    const archive = createChatArchive(deps, { retentionDays: 90 });

    archive.store(makeMessage({ messageId: 'old', senderId: 'p-old', timestamp: 1 }));
    archive.store(makeMessage({ messageId: 'new', senderId: 'p-new', timestamp: 95 * 24 * 60 * 60 * 1_000_000 }));

    const purged = archive.purgeExpired();
    expect(purged).toBe(1);
    expect(archive.queryHistory('ch-1', Number.MAX_SAFE_INTEGER, 10).map((m) => m.messageId)).toEqual(['new']);
    expect(archive.exportPlayerMessages({ playerId: 'p-old' })).toHaveLength(0);
  });

  it('deletes a player messages across channels and updates indexes', () => {
    const archive = createChatArchive(createDeps());
    archive.store(makeMessage({ messageId: 'a', senderId: 'p-x', channelId: 'ch-1', timestamp: 10 }));
    archive.store(makeMessage({ messageId: 'b', senderId: 'p-x', channelId: 'ch-2', timestamp: 20 }));
    archive.store(makeMessage({ messageId: 'c', senderId: 'p-y', channelId: 'ch-1', timestamp: 30 }));

    const deleted = archive.deletePlayerMessages('p-x');

    expect(deleted).toBe(2);
    expect(archive.queryHistory('ch-1', 999, 10).map((m) => m.messageId)).toEqual(['c']);
    expect(archive.queryHistory('ch-2', 999, 10)).toHaveLength(0);
    expect(archive.deletePlayerMessages('missing')).toBe(0);
  });

  it('reports archive stats for channels and message timestamps', () => {
    const archive = createChatArchive(createDeps());
    archive.store(makeMessage({ messageId: 'a', channelId: 'c1', timestamp: 100 }));
    archive.store(makeMessage({ messageId: 'b', channelId: 'c1', timestamp: 200 }));
    archive.store(makeMessage({ messageId: 'c', channelId: 'c2', timestamp: 150 }));

    const stats = archive.getStats();

    expect(stats.totalChannels).toBe(2);
    expect(stats.totalMessages).toBe(3);
    expect(stats.oldestMessageTimestamp).toBe(100);
    expect(stats.newestMessageTimestamp).toBe(200);
  });
});
