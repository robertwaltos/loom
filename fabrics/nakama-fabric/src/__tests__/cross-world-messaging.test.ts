import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCrossWorldMessagingRelay,
  type CrossWorldMessagingRelay,
  type MessagingRelayDeps,
  DEFAULT_MESSAGING_CONFIG,
} from '../cross-world-messaging.js';

// ─── Helpers ─────────────────────────────────────────────────────

let nowUs = 1_000_000;
let idSeq = 0;

function createDeps(overrides?: {
  allied?: boolean;
  transitDelay?: number | null;
}): MessagingRelayDeps {
  nowUs = 1_000_000;
  idSeq = 0;
  const allied = overrides?.allied ?? true;
  const transitDelay = overrides !== undefined && 'transitDelay' in overrides
    ? overrides.transitDelay
    : 5_000_000;

  return {
    clock: { nowMicroseconds: () => nowUs },
    idGenerator: { next: () => `msg-${++idSeq}` },
    allianceCheck: { areAllied: () => allied },
    corridorLookup: { getTransitDelayUs: () => transitDelay },
  };
}

function advanceTime(us: number): void {
  nowUs += us;
}

const BASE_PARAMS = {
  senderDynastyId: 'dynasty-1',
  senderWorldId: 'world-1',
  recipientDynastyId: 'dynasty-2',
  recipientWorldId: 'world-2',
  messageType: 'TEXT' as const,
  subject: 'Hello',
  body: 'Test message',
};

// ─── Tests ───────────────────────────────────────────────────────

describe('CrossWorldMessagingRelay', () => {
  let relay: CrossWorldMessagingRelay;

  beforeEach(() => {
    relay = createCrossWorldMessagingRelay(createDeps());
  });

  describe('sending', () => {
    it('sends a message between allied dynasties', () => {
      const msg = relay.send(BASE_PARAMS);
      expect(msg.status).toBe('IN_TRANSIT');
      expect(msg.senderDynastyId).toBe('dynasty-1');
      expect(msg.recipientDynastyId).toBe('dynasty-2');
      expect(msg.corridorId).toBe('world-1->world-2');
    });

    it('blocks messages between non-allied dynasties', () => {
      relay = createCrossWorldMessagingRelay(createDeps({ allied: false }));
      const msg = relay.send(BASE_PARAMS);
      expect(msg.status).toBe('BLOCKED');
      expect(msg.corridorId).toBeNull();
    });

    it('blocks messages when no corridor exists', () => {
      relay = createCrossWorldMessagingRelay(createDeps({ transitDelay: null }));
      const msg = relay.send(BASE_PARAMS);
      expect(msg.status).toBe('BLOCKED');
    });

    it('DISTRESS bypasses alliance check', () => {
      relay = createCrossWorldMessagingRelay(createDeps({ allied: false }));
      const msg = relay.send({ ...BASE_PARAMS, messageType: 'DISTRESS' });
      expect(msg.status).toBe('IN_TRANSIT');
    });

    it('rejects body exceeding max length', () => {
      expect(() => relay.send({
        ...BASE_PARAMS,
        body: 'x'.repeat(DEFAULT_MESSAGING_CONFIG.maxMessageBodyLength + 1),
      })).toThrow('exceeds');
    });

    it('rejects subject exceeding max length', () => {
      expect(() => relay.send({
        ...BASE_PARAMS,
        subject: 'x'.repeat(DEFAULT_MESSAGING_CONFIG.maxSubjectLength + 1),
      })).toThrow('exceeds');
    });

    it('enforces per-dynasty queue limit', () => {
      relay = createCrossWorldMessagingRelay(createDeps(), { maxQueuedPerDynasty: 2 });
      relay.send(BASE_PARAMS);
      relay.send(BASE_PARAMS);
      expect(() => relay.send(BASE_PARAMS)).toThrow('Queue limit');
    });
  });

  describe('delivery', () => {
    it('delivers message after transit delay', () => {
      relay.send(BASE_PARAMS);
      advanceTime(5_000_000);
      const delivered = relay.tick();
      expect(delivered).toHaveLength(1);
      expect(delivered[0].status).toBe('DELIVERED');
      expect(delivered[0].deliveredAt).toBe(nowUs);
    });

    it('does not deliver before transit delay', () => {
      relay.send(BASE_PARAMS);
      advanceTime(4_999_999);
      const delivered = relay.tick();
      expect(delivered).toHaveLength(0);
    });

    it('delivered messages appear in recipient inbox', () => {
      relay.send(BASE_PARAMS);
      advanceTime(5_000_000);
      relay.tick();
      const inbox = relay.getInbox('dynasty-2');
      expect(inbox).toHaveLength(1);
      expect(inbox[0].subject).toBe('Hello');
    });

    it('sent messages appear in sender outbox', () => {
      relay.send(BASE_PARAMS);
      const outbox = relay.getOutbox('dynasty-1');
      expect(outbox).toHaveLength(1);
    });
  });

  describe('expiry', () => {
    it('expires stale in-transit messages', () => {
      relay.send(BASE_PARAMS);
      advanceTime(DEFAULT_MESSAGING_CONFIG.messageExpiryUs + 1);
      const expired = relay.expireStale();
      expect(expired).toHaveLength(1);
      expect(expired[0].status).toBe('EXPIRED');
    });

    it('does not expire delivered messages', () => {
      relay.send(BASE_PARAMS);
      advanceTime(5_000_000);
      relay.tick();
      advanceTime(DEFAULT_MESSAGING_CONFIG.messageExpiryUs + 1);
      const expired = relay.expireStale();
      expect(expired).toHaveLength(0);
    });
  });

  describe('stats', () => {
    it('tracks message statistics', () => {
      relay.send(BASE_PARAMS);
      relay.send(BASE_PARAMS);
      advanceTime(5_000_000);
      relay.tick();

      const stats = relay.getStats();
      expect(stats.totalSent).toBe(2);
      expect(stats.delivered).toBe(2);
      expect(stats.inTransit).toBe(0);
    });
  });

  describe('message types', () => {
    const types = ['TEXT', 'DIPLOMATIC', 'TRADE', 'DISTRESS'] as const;

    for (const type of types) {
      it(`accepts ${type} message type`, () => {
        const msg = relay.send({ ...BASE_PARAMS, messageType: type });
        expect(msg.messageType).toBe(type);
      });
    }
  });

  describe('retrieval', () => {
    it('getMessage returns specific message', () => {
      const sent = relay.send(BASE_PARAMS);
      const retrieved = relay.getMessage(sent.messageId);
      expect(retrieved.messageId).toBe(sent.messageId);
    });

    it('throws for unknown message id', () => {
      expect(() => relay.getMessage('nope')).toThrow('Unknown message');
    });
  });
});
