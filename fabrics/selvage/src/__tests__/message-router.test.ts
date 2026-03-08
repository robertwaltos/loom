import { describe, it, expect } from 'vitest';
import { createMessageRouter } from '../message-router.js';
import type { MessageRouterDeps } from '../message-router.js';

function makeDeps(overrides?: {
  deliverFn?: (cid: string, payload: string) => boolean;
  activeIds?: ReadonlyArray<string>;
  dynastyMap?: Record<string, ReadonlyArray<string>>;
}): MessageRouterDeps {
  let idCounter = 0;
  let time = 1_000_000;
  return {
    deliveryPort: {
      deliver: overrides?.deliverFn ?? (() => true),
    },
    connectionPort: {
      listActiveConnectionIds: () => overrides?.activeIds ?? [],
      getConnectionsByDynasty: (did) =>
        (overrides?.dynastyMap ?? {})[did] ?? [],
    },
    idGenerator: { next: () => 'msg-' + String(++idCounter) },
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('MessageRouter — direct send', () => {
  it('delivers to a single connection', () => {
    const router = createMessageRouter(makeDeps());
    const msg = router.sendDirect({ connectionId: 'c1', payload: 'hello' });
    expect(msg.mode).toBe('direct');
    expect(msg.recipientCount).toBe(1);
    expect(msg.payload).toBe('hello');
  });

  it('reports zero recipients on failed delivery', () => {
    const router = createMessageRouter(makeDeps({
      deliverFn: () => false,
    }));
    const msg = router.sendDirect({ connectionId: 'c1', payload: 'fail' });
    expect(msg.recipientCount).toBe(0);
  });

  it('assigns a message id and timestamp', () => {
    const router = createMessageRouter(makeDeps());
    const msg = router.sendDirect({ connectionId: 'c1', payload: 'x' });
    expect(msg.messageId).toBe('msg-1');
    expect(msg.sentAt).toBeGreaterThan(0);
  });
});

describe('MessageRouter — broadcast', () => {
  it('sends to all active connections', () => {
    const router = createMessageRouter(makeDeps({
      activeIds: ['c1', 'c2', 'c3'],
    }));
    const msg = router.broadcast({ payload: 'all' });
    expect(msg.mode).toBe('broadcast');
    expect(msg.recipientCount).toBe(3);
  });

  it('excludes specified connections', () => {
    const router = createMessageRouter(makeDeps({
      activeIds: ['c1', 'c2', 'c3'],
    }));
    const msg = router.broadcast({
      payload: 'most',
      excludeConnectionIds: ['c2'],
    });
    expect(msg.recipientCount).toBe(2);
  });

  it('handles empty active list', () => {
    const router = createMessageRouter(makeDeps({ activeIds: [] }));
    const msg = router.broadcast({ payload: 'empty' });
    expect(msg.recipientCount).toBe(0);
  });
});

describe('MessageRouter — group send', () => {
  it('sends to subscribed channel members', () => {
    const router = createMessageRouter(makeDeps());
    router.subscribe('c1', 'chat');
    router.subscribe('c2', 'chat');
    const msg = router.sendToGroup({ channel: 'chat', payload: 'hi' });
    expect(msg.mode).toBe('group');
    expect(msg.channel).toBe('chat');
    expect(msg.recipientCount).toBe(2);
  });

  it('excludes connections from group send', () => {
    const router = createMessageRouter(makeDeps());
    router.subscribe('c1', 'chat');
    router.subscribe('c2', 'chat');
    const msg = router.sendToGroup({
      channel: 'chat',
      payload: 'partial',
      excludeConnectionIds: ['c1'],
    });
    expect(msg.recipientCount).toBe(1);
  });

  it('returns zero recipients for unknown channel', () => {
    const router = createMessageRouter(makeDeps());
    const msg = router.sendToGroup({ channel: 'void', payload: 'none' });
    expect(msg.recipientCount).toBe(0);
  });
});

describe('MessageRouter — dynasty send', () => {
  it('sends to all connections for a dynasty', () => {
    const router = createMessageRouter(makeDeps({
      dynastyMap: { 'd1': ['c1', 'c2'] },
    }));
    const msg = router.sendToDynasty({ dynastyId: 'd1', payload: 'dynasty' });
    expect(msg.mode).toBe('dynasty');
    expect(msg.recipientCount).toBe(2);
  });

  it('returns zero for unknown dynasty', () => {
    const router = createMessageRouter(makeDeps());
    const msg = router.sendToDynasty({ dynastyId: 'none', payload: 'x' });
    expect(msg.recipientCount).toBe(0);
  });
});

describe('MessageRouter — subscribe and unsubscribe', () => {
  it('subscribes a connection to a channel', () => {
    const router = createMessageRouter(makeDeps());
    expect(router.subscribe('c1', 'chat')).toBe(true);
    expect(router.getChannelMembers('chat')).toEqual(['c1']);
  });

  it('returns false for duplicate subscription', () => {
    const router = createMessageRouter(makeDeps());
    router.subscribe('c1', 'chat');
    expect(router.subscribe('c1', 'chat')).toBe(false);
  });

  it('unsubscribes a connection from a channel', () => {
    const router = createMessageRouter(makeDeps());
    router.subscribe('c1', 'chat');
    expect(router.unsubscribe('c1', 'chat')).toBe(true);
    expect(router.getChannelMembers('chat')).toEqual([]);
  });

  it('returns false when unsubscribing from unknown channel', () => {
    const router = createMessageRouter(makeDeps());
    expect(router.unsubscribe('c1', 'void')).toBe(false);
  });
});

describe('MessageRouter — subscription queries', () => {
  it('returns subscriptions for a connection', () => {
    const router = createMessageRouter(makeDeps());
    router.subscribe('c1', 'chat');
    router.subscribe('c1', 'events');
    const subs = router.getSubscriptions('c1');
    expect(subs).toContain('chat');
    expect(subs).toContain('events');
    expect(subs).toHaveLength(2);
  });

  it('returns empty for unknown connection', () => {
    const router = createMessageRouter(makeDeps());
    expect(router.getSubscriptions('unknown')).toEqual([]);
  });

  it('returns members for a channel', () => {
    const router = createMessageRouter(makeDeps());
    router.subscribe('c1', 'chat');
    router.subscribe('c2', 'chat');
    const members = router.getChannelMembers('chat');
    expect(members).toContain('c1');
    expect(members).toContain('c2');
  });

  it('returns empty for unknown channel', () => {
    const router = createMessageRouter(makeDeps());
    expect(router.getChannelMembers('void')).toEqual([]);
  });
});

describe('MessageRouter — unsubscribe all', () => {
  it('removes all subscriptions for a connection', () => {
    const router = createMessageRouter(makeDeps());
    router.subscribe('c1', 'chat');
    router.subscribe('c1', 'events');
    router.subscribe('c1', 'system');
    expect(router.unsubscribeAll('c1')).toBe(3);
    expect(router.getSubscriptions('c1')).toEqual([]);
  });

  it('returns zero for unknown connection', () => {
    const router = createMessageRouter(makeDeps());
    expect(router.unsubscribeAll('unknown')).toBe(0);
  });

  it('cleans up empty channels', () => {
    const router = createMessageRouter(makeDeps());
    router.subscribe('c1', 'solo');
    router.unsubscribeAll('c1');
    expect(router.getChannelMembers('solo')).toEqual([]);
    expect(router.getStats().activeChannels).toBe(0);
  });
});

describe('MessageRouter — stats', () => {
  it('tracks message and recipient counts', () => {
    const router = createMessageRouter(makeDeps({
      activeIds: ['c1', 'c2'],
    }));
    router.sendDirect({ connectionId: 'c1', payload: 'a' });
    router.broadcast({ payload: 'b' });
    const stats = router.getStats();
    expect(stats.totalMessagesSent).toBe(2);
    expect(stats.totalRecipients).toBe(3);
  });

  it('tracks channel and subscription counts', () => {
    const router = createMessageRouter(makeDeps());
    router.subscribe('c1', 'chat');
    router.subscribe('c2', 'chat');
    router.subscribe('c1', 'events');
    const stats = router.getStats();
    expect(stats.activeChannels).toBe(2);
    expect(stats.totalSubscriptions).toBe(3);
  });

  it('starts with zero stats', () => {
    const router = createMessageRouter(makeDeps());
    const stats = router.getStats();
    expect(stats.totalMessagesSent).toBe(0);
    expect(stats.totalRecipients).toBe(0);
    expect(stats.activeChannels).toBe(0);
    expect(stats.totalSubscriptions).toBe(0);
  });
});
