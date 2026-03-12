import { describe, it, expect, beforeEach } from 'vitest';
import {
  createAllianceChatSystem,
  type AllianceChatSystem,
  type AllianceChatDeps,
  DEFAULT_CHAT_CONFIG,
} from '../alliance-chat.js';

// ─── Helpers ─────────────────────────────────────────────────────

let nowUs = 1_000_000;
let idSeq = 0;

function createDeps(isMember = true): AllianceChatDeps {
  nowUs = 1_000_000;
  idSeq = 0;
  return {
    clock: { nowMicroseconds: () => nowUs },
    idGenerator: { next: () => `chat-${++idSeq}` },
    membershipCheck: { isMember: () => isMember },
  };
}

// ─── Tests ───────────────────────────────────────────────────────

describe('AllianceChatSystem', () => {
  let chat: AllianceChatSystem;

  beforeEach(() => {
    chat = createAllianceChatSystem(createDeps());
  });

  describe('channels', () => {
    it('creates a channel for an alliance', () => {
      const channel = chat.createChannel('alliance-1', 'GENERAL', 'Main Chat');
      expect(channel.channelType).toBe('GENERAL');
      expect(channel.name).toBe('Main Chat');
      expect(channel.allianceId).toBe('alliance-1');
      expect(channel.messageCount).toBe(0);
    });

    it('lists channels by alliance', () => {
      chat.createChannel('alliance-1', 'GENERAL', 'General');
      chat.createChannel('alliance-1', 'TRADE', 'Trade Talk');
      chat.createChannel('alliance-2', 'GENERAL', 'Other');

      const channels = chat.getChannels('alliance-1');
      expect(channels).toHaveLength(2);
    });

    it('enforces channel limit per alliance', () => {
      chat = createAllianceChatSystem(createDeps(), { maxChannelsPerAlliance: 2 });
      chat.createChannel('a1', 'GENERAL', 'G');
      chat.createChannel('a1', 'TRADE', 'T');
      expect(() => chat.createChannel('a1', 'STRATEGY', 'S')).toThrow('limit');
    });

    it('throws for unknown channel', () => {
      expect(() => chat.getChannel('nope')).toThrow('Unknown channel');
    });
  });

  describe('messaging', () => {
    it('sends a message to a channel', () => {
      const ch = chat.createChannel('a1', 'GENERAL', 'G');
      const msg = chat.sendMessage(ch.channelId, 'dynasty-1', 'Hello allies!');
      expect(msg.content).toBe('Hello allies!');
      expect(msg.isAnnouncement).toBe(false);
      expect(msg.senderDynastyId).toBe('dynasty-1');
    });

    it('sends an announcement', () => {
      const ch = chat.createChannel('a1', 'ANNOUNCEMENTS', 'News');
      const msg = chat.sendAnnouncement(ch.channelId, 'dynasty-1', 'War declared!');
      expect(msg.isAnnouncement).toBe(true);
    });

    it('rejects messages from non-members', () => {
      chat = createAllianceChatSystem(createDeps(false));
      const ch = chat.createChannel('a1', 'GENERAL', 'G');
      expect(() => chat.sendMessage(ch.channelId, 'outsider', 'Hello')).toThrow('not a member');
    });

    it('rejects messages exceeding max length', () => {
      const ch = chat.createChannel('a1', 'GENERAL', 'G');
      expect(() =>
        chat.sendMessage(ch.channelId, 'dynasty-1', 'x'.repeat(DEFAULT_CHAT_CONFIG.maxMessageLength + 1)),
      ).toThrow('exceeds');
    });

    it('rejects empty messages', () => {
      const ch = chat.createChannel('a1', 'GENERAL', 'G');
      expect(() => chat.sendMessage(ch.channelId, 'dynasty-1', '')).toThrow('empty');
    });

    it('retrieves recent messages with limit', () => {
      const ch = chat.createChannel('a1', 'GENERAL', 'G');
      for (let i = 0; i < 10; i++) {
        chat.sendMessage(ch.channelId, 'dynasty-1', `Message ${i}`);
      }

      const recent = chat.getMessages(ch.channelId, 3);
      expect(recent).toHaveLength(3);
      expect(recent[0].content).toBe('Message 7');
      expect(recent[2].content).toBe('Message 9');
    });
  });

  describe('message pruning', () => {
    it('prunes excess messages', () => {
      chat = createAllianceChatSystem(createDeps(), { maxMessagesPerChannel: 5 });
      const ch = chat.createChannel('a1', 'GENERAL', 'G');

      for (let i = 0; i < 10; i++) {
        chat.sendMessage(ch.channelId, 'dynasty-1', `Msg ${i}`);
      }

      const pruned = chat.pruneOldMessages(ch.channelId);
      expect(pruned).toBe(5);

      const remaining = chat.getMessages(ch.channelId, 100);
      expect(remaining).toHaveLength(5);
      expect(remaining[0].content).toBe('Msg 5');
    });

    it('returns 0 when no pruning needed', () => {
      const ch = chat.createChannel('a1', 'GENERAL', 'G');
      chat.sendMessage(ch.channelId, 'dynasty-1', 'Hello');
      expect(chat.pruneOldMessages(ch.channelId)).toBe(0);
    });
  });

  describe('portfolio sharing', () => {
    it('shares a read-only portfolio', () => {
      const portfolio = chat.sharePortfolio('a1', {
        dynastyId: 'dynasty-1',
        displayName: 'House Stark',
        kalonBalance: 50_000_000n,
        worldCount: 3,
        titles: ['Lord of World 12', 'Governor'],
      });

      expect(portfolio.dynastyId).toBe('dynasty-1');
      expect(portfolio.kalonBalance).toBe(50_000_000n);
      expect(portfolio.titles).toHaveLength(2);
    });

    it('retrieves shared portfolios for alliance', () => {
      chat.sharePortfolio('a1', {
        dynastyId: 'd1',
        displayName: 'House A',
        kalonBalance: 100n,
        worldCount: 1,
        titles: [],
      });
      chat.sharePortfolio('a1', {
        dynastyId: 'd2',
        displayName: 'House B',
        kalonBalance: 200n,
        worldCount: 2,
        titles: ['Title'],
      });

      const portfolios = chat.getSharedPortfolios('a1');
      expect(portfolios).toHaveLength(2);
    });

    it('overwrites portfolio for same dynasty', () => {
      chat.sharePortfolio('a1', {
        dynastyId: 'd1',
        displayName: 'House A',
        kalonBalance: 100n,
        worldCount: 1,
        titles: [],
      });
      chat.sharePortfolio('a1', {
        dynastyId: 'd1',
        displayName: 'House A Updated',
        kalonBalance: 200n,
        worldCount: 2,
        titles: [],
      });

      const portfolios = chat.getSharedPortfolios('a1');
      expect(portfolios).toHaveLength(1);
      expect(portfolios[0].kalonBalance).toBe(200n);
    });

    it('revokes a shared portfolio', () => {
      chat.sharePortfolio('a1', {
        dynastyId: 'd1',
        displayName: 'A',
        kalonBalance: 0n,
        worldCount: 0,
        titles: [],
      });

      expect(chat.revokePortfolio('a1', 'd1')).toBe(true);
      expect(chat.getSharedPortfolios('a1')).toHaveLength(0);
    });

    it('returns false when revoking non-existent portfolio', () => {
      expect(chat.revokePortfolio('a1', 'nobody')).toBe(false);
    });

    it('enforces portfolio limit', () => {
      chat = createAllianceChatSystem(createDeps(), { maxPortfoliosPerAlliance: 2 });
      chat.sharePortfolio('a1', { dynastyId: 'd1', displayName: 'A', kalonBalance: 0n, worldCount: 0, titles: [] });
      chat.sharePortfolio('a1', { dynastyId: 'd2', displayName: 'B', kalonBalance: 0n, worldCount: 0, titles: [] });
      expect(() =>
        chat.sharePortfolio('a1', { dynastyId: 'd3', displayName: 'C', kalonBalance: 0n, worldCount: 0, titles: [] }),
      ).toThrow('limit');
    });
  });

  describe('stats', () => {
    it('tracks totals', () => {
      const ch = chat.createChannel('a1', 'GENERAL', 'G');
      chat.sendMessage(ch.channelId, 'd1', 'Hello');
      chat.sharePortfolio('a1', { dynastyId: 'd1', displayName: 'A', kalonBalance: 0n, worldCount: 0, titles: [] });

      const stats = chat.getStats();
      expect(stats.totalChannels).toBe(1);
      expect(stats.totalMessages).toBe(1);
      expect(stats.totalPortfolios).toBe(1);
    });
  });
});
