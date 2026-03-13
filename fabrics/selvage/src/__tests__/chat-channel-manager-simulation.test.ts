import { describe, it, expect } from 'vitest';
import { createChatChannelManager } from '../chat-channel-manager.js';
import type {
  ChatChannelManagerDeps,
  ChatMessage,
  ModerationResult,
} from '../chat-channel-manager.js';
import type { ChatChannelType } from '@loom/events-contracts';

interface ChatHarness {
  readonly deps: ChatChannelManagerDeps;
  readonly sentDirect: Array<{ recipientId: string; message: ChatMessage }>;
  readonly sentBroadcast: Array<{ channelId: string; message: ChatMessage }>;
  readonly stored: ChatMessage[];
  readonly advanceUs: (delta: number) => void;
}

function makeHarness(modResult?: ModerationResult): ChatHarness {
  let nowUs = 1_000_000;
  let idCounter = 0;

  const sentDirect: Array<{ recipientId: string; message: ChatMessage }> = [];
  const sentBroadcast: Array<{ channelId: string; message: ChatMessage }> = [];
  const stored: ChatMessage[] = [];

  const deps: ChatChannelManagerDeps = {
    clock: { nowMicroseconds: () => nowUs },
    idGenerator: { generate: () => {
      idCounter += 1;
      return `id-${String(idCounter)}`;
    } },
    logger: { info: () => {}, warn: () => {} },
    delivery: {
      send: (recipientId, message) => {
        sentDirect.push({ recipientId, message });
      },
      broadcast: (channelId, message) => {
        sentBroadcast.push({ channelId, message });
      },
    },
    moderation: {
      evaluate: (content) => {
        if (modResult) return modResult;
        return {
          allowed: true,
          action: 'pass',
          reason: 'ok',
          sanitisedContent: null,
        };
      },
    },
    persistence: {
      store: (message) => {
        stored.push(message);
      },
      queryHistory: (channelId, before, limit) =>
        stored
          .filter((m) => m.channelId === channelId && m.timestamp < before)
          .slice(0, limit),
    },
  };

  return {
    deps,
    sentDirect,
    sentBroadcast,
    stored,
    advanceUs: (delta) => {
      nowUs += delta;
    },
  };
}

function asChannelType(value: string): ChatChannelType {
  return value as ChatChannelType;
}

describe('Chat Channel Manager Simulation', () => {
  it('creates, joins, leaves, and removes channels', () => {
    const h = makeHarness();
    const manager = createChatChannelManager(h.deps);

    const channel = manager.createChannel(asChannelType('party'), 'world-1', 'Squad');
    expect(channel.channelType).toBe('party');

    expect(manager.joinChannel(channel.channelId, 'p1')).toBe(true);
    expect(manager.joinChannel(channel.channelId, 'p2')).toBe(true);
    expect(manager.leaveChannel(channel.channelId, 'p2')).toBe(true);

    const playerChannels = manager.getPlayerChannels('p1');
    expect(playerChannels).toHaveLength(1);

    expect(manager.removeChannel(channel.channelId)).toBe(true);
    expect(manager.getChannel(channel.channelId)).toBeUndefined();
  });

  it('sends message for active member and stores/broadcasts payload', () => {
    const h = makeHarness();
    const manager = createChatChannelManager(h.deps);

    const channel = manager.createChannel(asChannelType('global'), 'world-2', 'Global');
    manager.joinChannel(channel.channelId, 'sender-1');

    const sent = manager.sendMessage({
      channelId: channel.channelId,
      senderId: 'sender-1',
      senderDisplayName: 'Sender',
      content: 'hello world',
      worldId: 'world-2',
    });

    expect(sent).not.toBeNull();
    expect(h.stored).toHaveLength(1);
    expect(h.sentBroadcast).toHaveLength(1);
    expect(h.sentBroadcast[0]?.message.content).toBe('hello world');
  });

  it('blocks empty/too-long/non-member messages', () => {
    const h = makeHarness();
    const manager = createChatChannelManager(h.deps, { maxMessageLength: 5 });

    const channel = manager.createChannel(asChannelType('world-local'), 'world-3', 'Local');
    manager.joinChannel(channel.channelId, 'sender-1');

    const empty = manager.sendMessage({
      channelId: channel.channelId,
      senderId: 'sender-1',
      senderDisplayName: 'A',
      content: '   ',
      worldId: 'world-3',
    });
    const long = manager.sendMessage({
      channelId: channel.channelId,
      senderId: 'sender-1',
      senderDisplayName: 'A',
      content: '123456',
      worldId: 'world-3',
    });
    const notMember = manager.sendMessage({
      channelId: channel.channelId,
      senderId: 'sender-2',
      senderDisplayName: 'B',
      content: 'hi',
      worldId: 'world-3',
    });

    expect(empty).toBeNull();
    expect(long).toBeNull();
    expect(notMember).toBeNull();
  });

  it('applies moderation filtered content and blocked action stats', () => {
    const filteredHarness = makeHarness({
      allowed: true,
      action: 'filtered',
      reason: 'profanity',
      sanitisedContent: 'clean text',
    });

    const filteredManager = createChatChannelManager(filteredHarness.deps);
    const filteredChannel = filteredManager.createChannel(asChannelType('dynasty'), 'w', 'Dynasty');
    filteredManager.joinChannel(filteredChannel.channelId, 'p1');

    const filtered = filteredManager.sendMessage({
      channelId: filteredChannel.channelId,
      senderId: 'p1',
      senderDisplayName: 'P1',
      content: 'bad text',
      worldId: 'w',
    });

    expect(filtered?.content).toBe('clean text');
    expect(filteredManager.getStats().totalFiltered).toBe(1);

    const blockedHarness = makeHarness({
      allowed: false,
      action: 'blocked',
      reason: 'toxicity',
      sanitisedContent: null,
    });

    const blockedManager = createChatChannelManager(blockedHarness.deps);
    const blockedChannel = blockedManager.createChannel(asChannelType('alliance'), 'w', 'Alliance');
    blockedManager.joinChannel(blockedChannel.channelId, 'p1');

    const blocked = blockedManager.sendMessage({
      channelId: blockedChannel.channelId,
      senderId: 'p1',
      senderDisplayName: 'P1',
      content: 'toxic',
      worldId: 'w',
    });

    expect(blocked).toBeNull();
    expect(blockedManager.getStats().totalBlocked).toBe(1);
  });

  it('enforces rate limit with cooldown and recovers after cooldown window', () => {
    const h = makeHarness();
    const manager = createChatChannelManager(h.deps, {
      maxMessagesPerSecond: 2,
      cooldownEscalationFactor: 2,
      maxCooldownMs: 5_000,
    });

    const channel = manager.createChannel(asChannelType('trade'), 'w', 'Trade');
    manager.joinChannel(channel.channelId, 'p1');

    const first = manager.sendMessage({
      channelId: channel.channelId,
      senderId: 'p1',
      senderDisplayName: 'P1',
      content: 'm1',
      worldId: 'w',
    });
    const second = manager.sendMessage({
      channelId: channel.channelId,
      senderId: 'p1',
      senderDisplayName: 'P1',
      content: 'm2',
      worldId: 'w',
    });
    const third = manager.sendMessage({
      channelId: channel.channelId,
      senderId: 'p1',
      senderDisplayName: 'P1',
      content: 'm3',
      worldId: 'w',
    });

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(third).toBeNull();

    h.advanceUs(2_100_000);

    const afterCooldown = manager.sendMessage({
      channelId: channel.channelId,
      senderId: 'p1',
      senderDisplayName: 'P1',
      content: 'm4',
      worldId: 'w',
    });

    expect(afterCooldown).not.toBeNull();
  });

  it('mutes/unmutes players per channel and supports reactions/history', () => {
    const h = makeHarness();
    const manager = createChatChannelManager(h.deps);

    const channel = manager.createChannel(asChannelType('assembly'), 'w', 'Assembly');
    manager.joinChannel(channel.channelId, 'p1');
    manager.joinChannel(channel.channelId, 'p2');

    manager.mutePlayer('p1', channel.channelId, 5_000, 'spam');
    const muted = manager.sendMessage({
      channelId: channel.channelId,
      senderId: 'p1',
      senderDisplayName: 'P1',
      content: 'blocked while muted',
      worldId: 'w',
    });
    expect(muted).toBeNull();

    manager.unmutePlayer('p1', channel.channelId);
    const sent = manager.sendMessage({
      channelId: channel.channelId,
      senderId: 'p1',
      senderDisplayName: 'P1',
      content: 'back online',
      worldId: 'w',
    });

    expect(sent).not.toBeNull();
    expect(manager.addReaction(sent?.messageId ?? '', 'p2', ':fire:')).toBe(true);
    expect(manager.addReaction(sent?.messageId ?? '', 'p2', ':fire:')).toBe(false);

    const history = manager.getHistory(channel.channelId, Number.MAX_SAFE_INTEGER, 10);
    expect(history.length).toBeGreaterThan(0);
  });
});
