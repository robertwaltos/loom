import { beforeEach, describe, expect, it } from 'vitest';
import {
  createAllianceChatSystem,
  type AllianceChatDeps,
  type AllianceChatSystem,
} from '../alliance-chat.js';

describe('alliance-chat simulation', () => {
  let nowUs: number;
  let idCounter: number;
  let membership: Map<string, Set<string>>;
  let chat: AllianceChatSystem;

  const deps = (): AllianceChatDeps => ({
    clock: { nowMicroseconds: () => nowUs },
    idGenerator: { next: () => `sim-chat-${++idCounter}` },
    membershipCheck: {
      isMember: (allianceId, dynastyId) => membership.get(allianceId)?.has(dynastyId) ?? false,
    },
  });

  const allow = (allianceId: string, dynastyIds: string[]): void => {
    membership.set(allianceId, new Set(dynastyIds));
  };

  beforeEach(() => {
    nowUs = 500_000;
    idCounter = 0;
    membership = new Map();
    allow('alliance-north', ['dawn', 'ember', 'frost']);
    allow('alliance-south', ['iris', 'jade']);
    chat = createAllianceChatSystem(deps(), {
      maxChannelsPerAlliance: 3,
      maxMessagesPerChannel: 4,
      maxPortfoliosPerAlliance: 2,
      maxMessageLength: 40,
    });
  });

  it('runs mixed messaging traffic with announcement flags and per-channel ordering', () => {
    const general = chat.createChannel('alliance-north', 'GENERAL', 'Council Hall');
    const trade = chat.createChannel('alliance-north', 'TRADE', 'Ledger Exchange');

    nowUs += 1;
    chat.sendMessage(general.channelId, 'dawn', 'Status check.');
    nowUs += 1;
    chat.sendAnnouncement(general.channelId, 'ember', 'Summit at dusk.');
    nowUs += 1;
    chat.sendMessage(trade.channelId, 'frost', 'Offering timber lots.');

    const generalMessages = chat.getMessages(general.channelId, 10);
    expect(generalMessages).toHaveLength(2);
    expect(generalMessages[0].isAnnouncement).toBe(false);
    expect(generalMessages[1].isAnnouncement).toBe(true);
    expect(generalMessages[1].senderDynastyId).toBe('ember');

    const tradeMessages = chat.getMessages(trade.channelId, 10);
    expect(tradeMessages).toHaveLength(1);
    expect(tradeMessages[0].content).toBe('Offering timber lots.');

    const stats = chat.getStats();
    expect(stats.totalChannels).toBe(2);
    expect(stats.totalMessages).toBe(3);
  });

  it('enforces membership boundary between alliances', () => {
    const channel = chat.createChannel('alliance-north', 'GENERAL', 'Watchfire');

    expect(() => chat.sendMessage(channel.channelId, 'jade', 'South alliance update')).toThrow(
      'Dynasty jade is not a member of alliance',
    );

    const delivered = chat.sendMessage(channel.channelId, 'dawn', 'North alliance report');
    expect(delivered.senderDynastyId).toBe('dawn');
  });

  it('keeps channel creation isolated per alliance and respects per-alliance cap', () => {
    chat.createChannel('alliance-north', 'GENERAL', 'Main');
    chat.createChannel('alliance-north', 'STRATEGY', 'War Room');
    chat.createChannel('alliance-north', 'TRADE', 'Exchange');

    chat.createChannel('alliance-south', 'GENERAL', 'South Main');

    expect(() => chat.createChannel('alliance-north', 'ANNOUNCEMENTS', 'Herald')).toThrow(
      'Alliance channel limit reached: 3',
    );

    expect(chat.getChannels('alliance-north')).toHaveLength(3);
    expect(chat.getChannels('alliance-south')).toHaveLength(1);
  });

  it('prunes oldest traffic and preserves recent message window', () => {
    const channel = chat.createChannel('alliance-north', 'GENERAL', 'Archive');

    for (let i = 1; i <= 6; i += 1) {
      nowUs += 1;
      chat.sendMessage(channel.channelId, 'dawn', `msg-${i}`);
    }

    const removed = chat.pruneOldMessages(channel.channelId);
    expect(removed).toBe(2);

    const kept = chat.getMessages(channel.channelId, 10);
    expect(kept.map((m) => m.content)).toEqual(['msg-3', 'msg-4', 'msg-5', 'msg-6']);
  });

  it('returns bounded recent messages when limit is smaller than history', () => {
    const channel = chat.createChannel('alliance-north', 'GENERAL', 'Recent');

    for (let i = 1; i <= 5; i += 1) {
      chat.sendMessage(channel.channelId, 'ember', `entry-${i}`);
    }

    const recent = chat.getMessages(channel.channelId, 2);
    expect(recent.map((m) => m.content)).toEqual(['entry-4', 'entry-5']);
  });

  it('maintains portfolio isolation and allows overwrite without increasing count', () => {
    chat.sharePortfolio('alliance-north', {
      dynastyId: 'dawn',
      displayName: 'House Dawn',
      kalonBalance: 500n,
      worldCount: 2,
      titles: ['Marshal'],
    });

    chat.sharePortfolio('alliance-north', {
      dynastyId: 'dawn',
      displayName: 'House Dawn Prime',
      kalonBalance: 900n,
      worldCount: 3,
      titles: ['Marshal', 'Consul'],
    });

    chat.sharePortfolio('alliance-south', {
      dynastyId: 'jade',
      displayName: 'House Jade',
      kalonBalance: 300n,
      worldCount: 1,
      titles: ['Steward'],
    });

    const north = chat.getSharedPortfolios('alliance-north');
    const south = chat.getSharedPortfolios('alliance-south');

    expect(north).toHaveLength(1);
    expect(north[0].displayName).toBe('House Dawn Prime');
    expect(south).toHaveLength(1);
    expect(chat.getStats().totalPortfolios).toBe(2);
  });

  it('enforces portfolio cap only for new dynasty entries', () => {
    chat.sharePortfolio('alliance-north', {
      dynastyId: 'dawn',
      displayName: 'Dawn',
      kalonBalance: 100n,
      worldCount: 1,
      titles: [],
    });

    chat.sharePortfolio('alliance-north', {
      dynastyId: 'ember',
      displayName: 'Ember',
      kalonBalance: 120n,
      worldCount: 1,
      titles: [],
    });

    chat.sharePortfolio('alliance-north', {
      dynastyId: 'dawn',
      displayName: 'Dawn+',
      kalonBalance: 150n,
      worldCount: 2,
      titles: ['Councillor'],
    });

    expect(() =>
      chat.sharePortfolio('alliance-north', {
        dynastyId: 'frost',
        displayName: 'Frost',
        kalonBalance: 80n,
        worldCount: 1,
        titles: [],
      }),
    ).toThrow('Portfolio limit reached: 2');
  });

  it('revokes portfolio idempotently and leaves unrelated alliances untouched', () => {
    chat.sharePortfolio('alliance-north', {
      dynastyId: 'dawn',
      displayName: 'Dawn',
      kalonBalance: 200n,
      worldCount: 1,
      titles: [],
    });

    chat.sharePortfolio('alliance-south', {
      dynastyId: 'jade',
      displayName: 'Jade',
      kalonBalance: 250n,
      worldCount: 2,
      titles: ['Warden'],
    });

    expect(chat.revokePortfolio('alliance-north', 'dawn')).toBe(true);
    expect(chat.revokePortfolio('alliance-north', 'dawn')).toBe(false);

    expect(chat.getSharedPortfolios('alliance-north')).toHaveLength(0);
    expect(chat.getSharedPortfolios('alliance-south')).toHaveLength(1);
  });

  it('enforces content validation for empty and oversized messages', () => {
    const channel = chat.createChannel('alliance-north', 'GENERAL', 'Rules');

    expect(() => chat.sendMessage(channel.channelId, 'dawn', '')).toThrow('Message cannot be empty');
    expect(() => chat.sendMessage(channel.channelId, 'dawn', 'x'.repeat(41))).toThrow(
      'Message exceeds 40 characters',
    );
  });

  it('uses deterministic id allocation for channels and messages', () => {
    const channelA = chat.createChannel('alliance-north', 'GENERAL', 'A');
    const channelB = chat.createChannel('alliance-south', 'GENERAL', 'B');

    const message = chat.sendAnnouncement(channelA.channelId, 'dawn', 'Signal flare.');

    expect(channelA.channelId).toBe('sim-chat-1');
    expect(channelB.channelId).toBe('sim-chat-2');
    expect(message.messageId).toBe('sim-chat-3');
  });
});
