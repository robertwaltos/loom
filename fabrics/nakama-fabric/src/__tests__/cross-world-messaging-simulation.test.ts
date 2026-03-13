import { describe, it, expect } from 'vitest';
import {
  createCrossWorldMessagingRelay,
  type MessagingRelayConfig,
  type MessagingRelayDeps,
  type MessageType,
  type SendMessageParams,
} from '../cross-world-messaging.js';

function makeClock(start = 1_000_000): { nowMicroseconds: () => number; set: (v: number) => void } {
  let now = start;
  return {
    nowMicroseconds: () => now,
    set: (v) => {
      now = v;
    },
  };
}

function makeDeps(args?: {
  allied?: boolean;
  delayUs?: number | null;
}): { deps: MessagingRelayDeps; clock: ReturnType<typeof makeClock> } {
  const clock = makeClock();
  let id = 0;

  const deps: MessagingRelayDeps = {
    clock,
    idGenerator: {
      next: () => `msg-${++id}`,
    },
    allianceCheck: {
      areAllied: () => args?.allied ?? true,
    },
    corridorLookup: {
      getTransitDelayUs: () => (args !== undefined && 'delayUs' in args ? args.delayUs ?? null : 5_000),
    },
  };

  return { deps, clock };
}

function makeParams(overrides?: Partial<SendMessageParams>): SendMessageParams {
  return {
    senderDynastyId: 'dynasty-a',
    senderWorldId: 'world-a',
    recipientDynastyId: 'dynasty-b',
    recipientWorldId: 'world-b',
    messageType: 'TEXT',
    subject: 'Trade update',
    body: 'Shipment incoming.',
    ...overrides,
  };
}

function makeConfig(overrides?: Partial<MessagingRelayConfig>): MessagingRelayConfig {
  return {
    maxMessageBodyLength: 2000,
    maxSubjectLength: 120,
    messageExpiryUs: 1_000,
    maxQueuedPerDynasty: 2,
    ...overrides,
  };
}

describe('cross-world-messaging simulation', () => {
  it('sends allied message into transit', () => {
    const { deps } = makeDeps({ allied: true, delayUs: 7_000 });
    const relay = createCrossWorldMessagingRelay(deps);
    const msg = relay.send(makeParams());

    expect(msg.status).toBe('IN_TRANSIT');
    expect(msg.deliverAt - msg.sentAt).toBe(7_000);
    expect(msg.corridorId).toBe('world-a->world-b');
  });

  it('blocks non-distress message when dynasties are not allied', () => {
    const { deps } = makeDeps({ allied: false, delayUs: 5_000 });
    const relay = createCrossWorldMessagingRelay(deps);
    const msg = relay.send(makeParams({ messageType: 'TRADE' }));

    expect(msg.status).toBe('BLOCKED');
    expect(msg.corridorId).toBeNull();
  });

  it('allows DISTRESS to bypass alliance check', () => {
    const { deps } = makeDeps({ allied: false, delayUs: 9_000 });
    const relay = createCrossWorldMessagingRelay(deps);
    const msg = relay.send(makeParams({ messageType: 'DISTRESS' }));

    expect(msg.status).toBe('IN_TRANSIT');
    expect(msg.corridorId).toBe('world-a->world-b');
  });

  it('blocks message when corridor is unavailable', () => {
    const { deps } = makeDeps({ allied: true, delayUs: null });
    const relay = createCrossWorldMessagingRelay(deps);
    const msg = relay.send(makeParams());

    expect(msg.status).toBe('BLOCKED');
    expect(msg.corridorId).toBeNull();
  });

  it('enforces body length limit', () => {
    const { deps } = makeDeps();
    const relay = createCrossWorldMessagingRelay(deps, makeConfig({ maxMessageBodyLength: 5 }));

    expect(() => relay.send(makeParams({ body: 'too long body' }))).toThrow('Message body exceeds');
  });

  it('enforces subject length limit', () => {
    const { deps } = makeDeps();
    const relay = createCrossWorldMessagingRelay(deps, makeConfig({ maxSubjectLength: 3 }));

    expect(() => relay.send(makeParams({ subject: 'long' }))).toThrow('Subject exceeds');
  });

  it('enforces sender queue limit on active in-transit messages', () => {
    const { deps } = makeDeps({ allied: true, delayUs: 10_000 });
    const relay = createCrossWorldMessagingRelay(deps, makeConfig({ maxQueuedPerDynasty: 2 }));

    relay.send(makeParams({ subject: '1' }));
    relay.send(makeParams({ subject: '2' }));
    expect(() => relay.send(makeParams({ subject: '3' }))).toThrow('Queue limit reached');
  });

  it('delivers message on tick when deliverAt is reached', () => {
    const { deps, clock } = makeDeps({ allied: true, delayUs: 500 });
    const relay = createCrossWorldMessagingRelay(deps);
    const sent = relay.send(makeParams());

    clock.set(sent.sentAt + 500);
    const delivered = relay.tick();

    expect(delivered.length).toBe(1);
    expect(delivered[0]?.status).toBe('DELIVERED');
    expect(delivered[0]?.deliveredAt).toBe(sent.sentAt + 500);
  });

  it('does not deliver before transit delay elapses', () => {
    const { deps, clock } = makeDeps({ allied: true, delayUs: 2_000 });
    const relay = createCrossWorldMessagingRelay(deps);
    const sent = relay.send(makeParams());

    clock.set(sent.sentAt + 1_000);
    expect(relay.tick()).toHaveLength(0);
  });

  it('expires stale in-transit messages', () => {
    const { deps, clock } = makeDeps({ allied: true, delayUs: 10_000 });
    const relay = createCrossWorldMessagingRelay(deps, makeConfig({ messageExpiryUs: 200 }));
    const sent = relay.send(makeParams());

    clock.set(sent.sentAt + 201);
    const expired = relay.expireStale();

    expect(expired).toHaveLength(1);
    expect(expired[0]?.status).toBe('EXPIRED');
  });

  it('returns delivered messages in recipient inbox', () => {
    const { deps, clock } = makeDeps({ allied: true, delayUs: 1 });
    const relay = createCrossWorldMessagingRelay(deps);
    const sent = relay.send(makeParams());

    clock.set(sent.sentAt + 1);
    relay.tick();

    const inbox = relay.getInbox('dynasty-b');
    expect(inbox).toHaveLength(1);
    expect(inbox[0]?.messageId).toBe(sent.messageId);
  });

  it('returns sender messages in outbox including blocked ones', () => {
    const { deps } = makeDeps({ allied: false, delayUs: null });
    const relay = createCrossWorldMessagingRelay(deps);
    const blocked = relay.send(makeParams({ messageType: 'DIPLOMATIC' as MessageType }));

    const outbox = relay.getOutbox('dynasty-a');
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.messageId).toBe(blocked.messageId);
    expect(outbox[0]?.status).toBe('BLOCKED');
  });

  it('retrieves message by id', () => {
    const { deps } = makeDeps();
    const relay = createCrossWorldMessagingRelay(deps);
    const msg = relay.send(makeParams());

    const found = relay.getMessage(msg.messageId);
    expect(found.subject).toBe('Trade update');
  });

  it('throws when getting unknown message id', () => {
    const { deps } = makeDeps();
    const relay = createCrossWorldMessagingRelay(deps);

    expect(() => relay.getMessage('missing')).toThrow('Unknown message');
  });

  it('computes stats across blocked, in-transit, delivered and expired messages', () => {
    const { deps, clock } = makeDeps({ allied: false, delayUs: 100 });
    const relay = createCrossWorldMessagingRelay(deps, makeConfig({ messageExpiryUs: 50 }));

    relay.send(makeParams({ subject: 'blocked', messageType: 'TEXT' }));
    const deliverable = relay.send(makeParams({ subject: 'deliver', messageType: 'DISTRESS' }));
    const expiring = relay.send(makeParams({ subject: 'expire', messageType: 'DISTRESS' }));

    clock.set(deliverable.sentAt + 100);
    relay.tick();
    clock.set(expiring.sentAt + 200);
    relay.expireStale();

    const stats = relay.getStats();
    expect(stats.totalSent).toBe(3);
    expect(stats.blocked).toBe(1);
    expect(stats.delivered).toBe(2);
    expect(stats.expired).toBe(0);
  });

  it('keeps delivered messages from being expired later', () => {
    const { deps, clock } = makeDeps({ allied: true, delayUs: 1 });
    const relay = createCrossWorldMessagingRelay(deps, makeConfig({ messageExpiryUs: 1 }));
    const msg = relay.send(makeParams());

    clock.set(msg.sentAt + 1);
    relay.tick();
    clock.set(msg.sentAt + 5000);
    const expired = relay.expireStale();

    expect(expired).toHaveLength(0);
    expect(relay.getMessage(msg.messageId).status).toBe('DELIVERED');
  });
});
