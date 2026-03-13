/**
 * chat-channel-manager.test.ts — Unit tests for ChatChannelManager.
 *
 * Thread: silk/selvage/chat-channel-manager
 * Tier: 1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createChatChannelManager } from '../chat-channel-manager.js';
import type {
  ChatChannelManager,
  ChatChannelManagerDeps,
  ChatMessage,
  ModerationResult,
} from '../chat-channel-manager.js';

// ── Helpers ────────────────────────────────────────────────────────────

function passResult(content = ''): ModerationResult {
  return { allowed: true, action: 'pass', reason: '', sanitisedContent: content || null };
}

function blockedResult(): ModerationResult {
  return { allowed: false, action: 'blocked', reason: 'profanity', sanitisedContent: null };
}

function filteredResult(sanitised: string): ModerationResult {
  return { allowed: true, action: 'filtered', reason: 'mild', sanitisedContent: sanitised };
}

interface TestDeps extends ChatChannelManagerDeps {
  advance: (us: number) => void;
  broadcasts: Array<{ channelId: string; message: ChatMessage }>;
  stored: ChatMessage[];
}

function makeDeps(startUs = 1_000_000_000): TestDeps {
  let now = startUs;
  let idSeq = 0;
  const broadcasts: Array<{ channelId: string; message: ChatMessage }> = [];
  const stored: ChatMessage[] = [];

  return {
    advance: (us: number) => { now += us; },
    broadcasts,
    stored,
    clock: { nowMicroseconds: () => now },
    idGenerator: { generate: () => `id-${String(++idSeq)}` },
    logger: {
      info: () => undefined,
      warn: () => undefined,
    },
    delivery: {
      send: () => undefined,
      broadcast: (channelId, message) => { broadcasts.push({ channelId, message }); },
    },
    moderation: {
      evaluate: (content) => passResult(content),
    },
    persistence: {
      store: (msg) => { stored.push(msg); },
      queryHistory: () => [],
    },
  };
}

function makeManager(deps?: TestDeps): { mgr: ChatChannelManager; deps: TestDeps } {
  const d = deps ?? makeDeps();
  return { mgr: createChatChannelManager(d), deps: d };
}

// ── createChannel ─────────────────────────────────────────────────────

describe('createChannel', () => {
  it('creates a channel with correct fields', () => {
    const { mgr } = makeManager();
    const ch = mgr.createChannel('world-local', 'world-1', 'Town Square');
    expect(ch.channelType).toBe('world-local');
    expect(ch.worldId).toBe('world-1');
    expect(ch.name).toBe('Town Square');
    expect(ch.members.size).toBe(0);
  });

  it('retrieves channel via getChannel', () => {
    const { mgr } = makeManager();
    const ch = mgr.createChannel('dynasty', 'w1', 'Dynasty Chat');
    expect(mgr.getChannel(ch.channelId)).toBeDefined();
  });

  it('accepts optional metadata', () => {
    const { mgr } = makeManager();
    const ch = mgr.createChannel('party', 'w1', 'Party', { tier: 'platinum' });
    expect(ch.metadata['tier']).toBe('platinum');
  });
});

// ── removeChannel ─────────────────────────────────────────────────────

describe('removeChannel', () => {
  it('removes an existing channel', () => {
    const { mgr } = makeManager();
    const ch = mgr.createChannel('trade', 'w1', 'Market');
    expect(mgr.removeChannel(ch.channelId)).toBe(true);
    expect(mgr.getChannel(ch.channelId)).toBeUndefined();
  });

  it('returns false for a non-existent channel', () => {
    const { mgr } = makeManager();
    expect(mgr.removeChannel('unknown')).toBe(false);
  });

  it('cleans up player-channel membership on removal', () => {
    const { mgr } = makeManager();
    const ch = mgr.createChannel('global', 'w1', 'General');
    mgr.joinChannel(ch.channelId, 'player-1');
    mgr.removeChannel(ch.channelId);
    expect(mgr.getPlayerChannels('player-1')).toHaveLength(0);
  });
});

// ── joinChannel / leaveChannel ────────────────────────────────────────

describe('joinChannel', () => {
  let mgr: ChatChannelManager;
  let channelId: string;
  beforeEach(() => {
    ({ mgr } = makeManager());
    channelId = mgr.createChannel('world-local', 'w1', 'Zone').channelId;
  });

  it('adds a player to the channel', () => {
    expect(mgr.joinChannel(channelId, 'p1')).toBe(true);
    expect(mgr.getChannel(channelId)?.members.has('p1')).toBe(true);
  });

  it('returns false for a non-existent channel', () => {
    expect(mgr.joinChannel('unknown', 'p1')).toBe(false);
  });

  it('returns false if player is already a member', () => {
    mgr.joinChannel(channelId, 'p1');
    expect(mgr.joinChannel(channelId, 'p1')).toBe(false);
  });

  it('appears in getPlayerChannels after joining', () => {
    mgr.joinChannel(channelId, 'p1');
    expect(mgr.getPlayerChannels('p1').map((c) => c.channelId)).toContain(channelId);
  });
});

describe('leaveChannel', () => {
  it('removes player from channel', () => {
    const { mgr } = makeManager();
    const ch = mgr.createChannel('party', 'w1', 'Group');
    mgr.joinChannel(ch.channelId, 'p1');
    expect(mgr.leaveChannel(ch.channelId, 'p1')).toBe(true);
    expect(mgr.getChannel(ch.channelId)?.members.has('p1')).toBe(false);
  });

  it('returns false when player is not a member', () => {
    const { mgr } = makeManager();
    const ch = mgr.createChannel('party', 'w1', 'Group');
    expect(mgr.leaveChannel(ch.channelId, 'p99')).toBe(false);
  });
});

// ── sendMessage ───────────────────────────────────────────────────────

describe('sendMessage', () => {
  let mgr: ChatChannelManager;
  let deps: TestDeps;
  let channelId: string;

  beforeEach(() => {
    ({ mgr, deps } = makeManager());
    channelId = mgr.createChannel('world-local', 'w1', 'Zone').channelId;
    mgr.joinChannel(channelId, 'sender');
  });

  it('sends a message and returns the ChatMessage', () => {
    const msg = mgr.sendMessage({ channelId, senderId: 'sender', senderDisplayName: 'Alice', content: 'Hello!', worldId: 'w1' });
    expect(msg).not.toBeNull();
    expect(msg?.content).toBe('Hello!');
    expect(msg?.senderId).toBe('sender');
  });

  it('broadcasts the message to the channel', () => {
    mgr.sendMessage({ channelId, senderId: 'sender', senderDisplayName: 'Alice', content: 'Hi', worldId: 'w1' });
    expect(deps.broadcasts.some((b) => b.channelId === channelId)).toBe(true);
  });

  it('persists the message', () => {
    mgr.sendMessage({ channelId, senderId: 'sender', senderDisplayName: 'Alice', content: 'Stored', worldId: 'w1' });
    expect(deps.stored).toHaveLength(1);
  });

  it('returns null when sender is not a channel member', () => {
    expect(mgr.sendMessage({ channelId, senderId: 'outsider', senderDisplayName: 'Bob', content: 'Hey', worldId: 'w1' })).toBeNull();
  });

  it('returns null for empty content', () => {
    expect(mgr.sendMessage({ channelId, senderId: 'sender', senderDisplayName: 'Alice', content: '   ', worldId: 'w1' })).toBeNull();
  });

  it('returns null when moderation blocks the message', () => {
    deps.moderation.evaluate = () => blockedResult();
    expect(mgr.sendMessage({ channelId, senderId: 'sender', senderDisplayName: 'Alice', content: 'bad word', worldId: 'w1' })).toBeNull();
  });

  it('uses sanitised content when moderation filters', () => {
    deps.moderation.evaluate = () => filteredResult('clean content');
    const msg = mgr.sendMessage({ channelId, senderId: 'sender', senderDisplayName: 'Alice', content: 'dirty', worldId: 'w1' });
    expect(msg?.content).toBe('clean content');
  });
});

// ── mute / unmute ─────────────────────────────────────────────────────

describe('mutePlayer', () => {
  let mgr: ChatChannelManager;
  let channelId: string;

  beforeEach(() => {
    ({ mgr } = makeManager());
    channelId = mgr.createChannel('world-local', 'w1', 'Zone').channelId;
    mgr.joinChannel(channelId, 'bad-actor');
  });

  it('blocks messages from a muted player', () => {
    mgr.mutePlayer('bad-actor', channelId, 60_000, 'spam');
    expect(mgr.sendMessage({ channelId, senderId: 'bad-actor', senderDisplayName: 'X', content: 'hello', worldId: 'w1' })).toBeNull();
  });

  it('global mute blocks messages across all channels', () => {
    const ch2 = mgr.createChannel('dynasty', 'w1', 'Dynasty');
    mgr.joinChannel(ch2.channelId, 'bad-actor');
    mgr.mutePlayer('bad-actor', null, 60_000, 'harassment');
    expect(mgr.sendMessage({ channelId: ch2.channelId, senderId: 'bad-actor', senderDisplayName: 'X', content: 'msg', worldId: 'w1' })).toBeNull();
  });

  it('unmuting restores ability to send', () => {
    mgr.mutePlayer('bad-actor', channelId, 60_000, 'spam');
    mgr.unmutePlayer('bad-actor', channelId);
    expect(mgr.sendMessage({ channelId, senderId: 'bad-actor', senderDisplayName: 'X', content: 'back', worldId: 'w1' })).not.toBeNull();
  });
});

// ── addReaction ───────────────────────────────────────────────────────

describe('addReaction', () => {
  it('adds a reaction to a message', () => {
    const { mgr } = makeManager();
    const ch = mgr.createChannel('party', 'w1', 'Party');
    mgr.joinChannel(ch.channelId, 'p1');
    const msg = mgr.sendMessage({ channelId: ch.channelId, senderId: 'p1', senderDisplayName: 'P1', content: 'Nice!', worldId: 'w1' });
    expect(msg).not.toBeNull();
    if (!msg) throw new Error('Expected message');
    mgr.joinChannel(ch.channelId, 'p2');
    expect(mgr.addReaction(msg.messageId, 'p2', '👍')).toBe(true);
  });

  it('returns false if player reacts twice with same emoji', () => {
    const { mgr } = makeManager();
    const ch = mgr.createChannel('party', 'w1', 'Party');
    mgr.joinChannel(ch.channelId, 'p1');
    const msg = mgr.sendMessage({ channelId: ch.channelId, senderId: 'p1', senderDisplayName: 'P1', content: 'Hi', worldId: 'w1' });
    if (!msg) throw new Error('Expected message');
    mgr.addReaction(msg.messageId, 'p1', '❤️');
    expect(mgr.addReaction(msg.messageId, 'p1', '❤️')).toBe(false);
  });

  it('returns false for unknown message', () => {
    const { mgr } = makeManager();
    expect(mgr.addReaction('nonexistent', 'p1', '👋')).toBe(false);
  });
});

// ── getStats ──────────────────────────────────────────────────────────

describe('getStats', () => {
  it('tracks channel and message counts', () => {
    const { mgr } = makeManager();
    mgr.createChannel('global', 'w1', 'G1');
    mgr.createChannel('trade', 'w1', 'T1');
    const stats = mgr.getStats();
    expect(stats.totalChannels).toBe(2);
  });

  it('increments totalMessages on each sent message', () => {
    const { mgr } = makeManager();
    const ch = mgr.createChannel('world-local', 'w1', 'Zone');
    mgr.joinChannel(ch.channelId, 'p1');
    mgr.sendMessage({ channelId: ch.channelId, senderId: 'p1', senderDisplayName: 'P1', content: 'msg1', worldId: 'w1' });
    mgr.sendMessage({ channelId: ch.channelId, senderId: 'p1', senderDisplayName: 'P1', content: 'msg2', worldId: 'w1' });
    expect(mgr.getStats().totalMessages).toBe(2);
  });

  it('increments totalBlocked when moderation blocks', () => {
    const { mgr, deps } = makeManager();
    const ch = mgr.createChannel('world-local', 'w1', 'Zone');
    mgr.joinChannel(ch.channelId, 'spammer');
    deps.moderation.evaluate = () => blockedResult();
    mgr.sendMessage({ channelId: ch.channelId, senderId: 'spammer', senderDisplayName: 'S', content: 'bad', worldId: 'w1' });
    expect(mgr.getStats().totalBlocked).toBe(1);
  });
});
