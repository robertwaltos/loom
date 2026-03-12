/**
 * Cross-World Messaging Relay — Inter-world communication for allied dynasties.
 *
 * NEXT-STEPS Phase 8.1: "Cross-world messaging relay for allied dynasties."
 *
 * Messages travel along Lattice corridors. Delivery is not instant — transit
 * delay is proportional to the corridor distance in the Silfen Weave.
 * Messages are queued, delivered, and logged to the Chronicle.
 *
 * Message types: TEXT, DIPLOMATIC (formal proposals), TRADE (commerce),
 * DISTRESS (emergency broadcast, bypasses alliance check).
 */

// ─── Types ───────────────────────────────────────────────────────

export type MessageType = 'TEXT' | 'DIPLOMATIC' | 'TRADE' | 'DISTRESS';

export type MessageStatus = 'QUEUED' | 'IN_TRANSIT' | 'DELIVERED' | 'EXPIRED' | 'BLOCKED';

export interface CrossWorldMessage {
  readonly messageId: string;
  readonly senderDynastyId: string;
  readonly senderWorldId: string;
  readonly recipientDynastyId: string;
  readonly recipientWorldId: string;
  readonly messageType: MessageType;
  readonly subject: string;
  readonly body: string;
  readonly status: MessageStatus;
  readonly sentAt: number;
  readonly deliverAt: number;
  readonly deliveredAt: number | null;
  readonly corridorId: string | null;
}

export interface SendMessageParams {
  readonly senderDynastyId: string;
  readonly senderWorldId: string;
  readonly recipientDynastyId: string;
  readonly recipientWorldId: string;
  readonly messageType: MessageType;
  readonly subject: string;
  readonly body: string;
}

// ─── Ports ───────────────────────────────────────────────────────

export interface MessagingRelayDeps {
  readonly clock: { readonly nowMicroseconds: () => number };
  readonly idGenerator: { readonly next: () => string };
  readonly allianceCheck: {
    readonly areAllied: (dynastyA: string, dynastyB: string) => boolean;
  };
  readonly corridorLookup: {
    readonly getTransitDelayUs: (worldA: string, worldB: string) => number | null;
  };
}

// ─── Config ──────────────────────────────────────────────────────

export interface MessagingRelayConfig {
  readonly maxMessageBodyLength: number;
  readonly maxSubjectLength: number;
  readonly messageExpiryUs: number;
  readonly maxQueuedPerDynasty: number;
}

const ONE_DAY_US = 24 * 60 * 60 * 1_000_000;

export const DEFAULT_MESSAGING_CONFIG: MessagingRelayConfig = {
  maxMessageBodyLength: 2000,
  maxSubjectLength: 120,
  messageExpiryUs: 30 * ONE_DAY_US,
  maxQueuedPerDynasty: 100,
};

// ─── Stats ───────────────────────────────────────────────────────

export interface MessagingRelayStats {
  readonly totalSent: number;
  readonly queued: number;
  readonly inTransit: number;
  readonly delivered: number;
  readonly expired: number;
  readonly blocked: number;
}

// ─── Public Interface ────────────────────────────────────────────

export interface CrossWorldMessagingRelay {
  readonly send: (params: SendMessageParams) => CrossWorldMessage;
  readonly tick: () => ReadonlyArray<CrossWorldMessage>;
  readonly getInbox: (dynastyId: string) => ReadonlyArray<CrossWorldMessage>;
  readonly getOutbox: (dynastyId: string) => ReadonlyArray<CrossWorldMessage>;
  readonly getMessage: (messageId: string) => CrossWorldMessage;
  readonly getStats: () => MessagingRelayStats;
  readonly expireStale: () => ReadonlyArray<CrossWorldMessage>;
}

// ─── Mutable State ───────────────────────────────────────────────

interface MutableMessage {
  readonly messageId: string;
  readonly senderDynastyId: string;
  readonly senderWorldId: string;
  readonly recipientDynastyId: string;
  readonly recipientWorldId: string;
  readonly messageType: MessageType;
  readonly subject: string;
  readonly body: string;
  status: MessageStatus;
  readonly sentAt: number;
  readonly deliverAt: number;
  deliveredAt: number | null;
  readonly corridorId: string | null;
}

// ─── Factory ─────────────────────────────────────────────────────

export function createCrossWorldMessagingRelay(
  deps: MessagingRelayDeps,
  config?: Partial<MessagingRelayConfig>,
): CrossWorldMessagingRelay {
  const cfg: MessagingRelayConfig = { ...DEFAULT_MESSAGING_CONFIG, ...config };
  const messages = new Map<string, MutableMessage>();
  const outbox = new Map<string, string[]>(); // dynastyId → messageIds
  const inbox = new Map<string, string[]>();  // dynastyId → messageIds

  return {
    send: (params) => freeze(sendMessage(deps, cfg, messages, outbox, params)),
    tick: () => tickDelivery(deps, messages, inbox),
    getInbox: (dynastyId) => getByIndex(inbox, dynastyId, messages),
    getOutbox: (dynastyId) => getByIndex(outbox, dynastyId, messages),
    getMessage: (id) => freeze(getOrThrow(messages, id)),
    getStats: () => computeStats(messages),
    expireStale: () => expireMessages(deps, cfg, messages),
  };
}

// ─── Send ────────────────────────────────────────────────────────

function sendMessage(
  deps: MessagingRelayDeps,
  cfg: MessagingRelayConfig,
  messages: Map<string, MutableMessage>,
  outbox: Map<string, string[]>,
  params: SendMessageParams,
): MutableMessage {
  if (params.body.length > cfg.maxMessageBodyLength) {
    throw new Error(`Message body exceeds ${cfg.maxMessageBodyLength} characters`);
  }
  if (params.subject.length > cfg.maxSubjectLength) {
    throw new Error(`Subject exceeds ${cfg.maxSubjectLength} characters`);
  }

  // DISTRESS bypasses alliance check
  if (params.messageType !== 'DISTRESS') {
    if (!deps.allianceCheck.areAllied(params.senderDynastyId, params.recipientDynastyId)) {
      return createBlockedMessage(deps, messages, outbox, params);
    }
  }

  const transitDelay = deps.corridorLookup.getTransitDelayUs(
    params.senderWorldId,
    params.recipientWorldId,
  );

  if (transitDelay === null) {
    return createBlockedMessage(deps, messages, outbox, params);
  }

  // Check queue limit
  const senderOutbox = outbox.get(params.senderDynastyId) ?? [];
  const activeCount = senderOutbox.filter(id => {
    const m = messages.get(id);
    return m !== undefined && (m.status === 'QUEUED' || m.status === 'IN_TRANSIT');
  }).length;

  if (activeCount >= cfg.maxQueuedPerDynasty) {
    throw new Error(`Queue limit reached: ${cfg.maxQueuedPerDynasty} messages`);
  }

  const now = deps.clock.nowMicroseconds();
  const msg: MutableMessage = {
    messageId: deps.idGenerator.next(),
    senderDynastyId: params.senderDynastyId,
    senderWorldId: params.senderWorldId,
    recipientDynastyId: params.recipientDynastyId,
    recipientWorldId: params.recipientWorldId,
    messageType: params.messageType,
    subject: params.subject,
    body: params.body,
    status: 'IN_TRANSIT',
    sentAt: now,
    deliverAt: now + transitDelay,
    deliveredAt: null,
    corridorId: `${params.senderWorldId}->${params.recipientWorldId}`,
  };

  messages.set(msg.messageId, msg);
  appendToIndex(outbox, params.senderDynastyId, msg.messageId);
  return msg;
}

function createBlockedMessage(
  deps: MessagingRelayDeps,
  messages: Map<string, MutableMessage>,
  outbox: Map<string, string[]>,
  params: SendMessageParams,
): MutableMessage {
  const now = deps.clock.nowMicroseconds();
  const msg: MutableMessage = {
    messageId: deps.idGenerator.next(),
    senderDynastyId: params.senderDynastyId,
    senderWorldId: params.senderWorldId,
    recipientDynastyId: params.recipientDynastyId,
    recipientWorldId: params.recipientWorldId,
    messageType: params.messageType,
    subject: params.subject,
    body: params.body,
    status: 'BLOCKED',
    sentAt: now,
    deliverAt: now,
    deliveredAt: null,
    corridorId: null,
  };

  messages.set(msg.messageId, msg);
  appendToIndex(outbox, params.senderDynastyId, msg.messageId);
  return msg;
}

// ─── Tick ────────────────────────────────────────────────────────

function tickDelivery(
  deps: MessagingRelayDeps,
  messages: Map<string, MutableMessage>,
  inbox: Map<string, string[]>,
): ReadonlyArray<CrossWorldMessage> {
  const now = deps.clock.nowMicroseconds();
  const delivered: CrossWorldMessage[] = [];

  for (const msg of messages.values()) {
    if (msg.status === 'IN_TRANSIT' && now >= msg.deliverAt) {
      msg.status = 'DELIVERED';
      msg.deliveredAt = now;
      appendToIndex(inbox, msg.recipientDynastyId, msg.messageId);
      delivered.push(freeze(msg));
    }
  }

  return delivered;
}

// ─── Expiry ──────────────────────────────────────────────────────

function expireMessages(
  deps: MessagingRelayDeps,
  cfg: MessagingRelayConfig,
  messages: Map<string, MutableMessage>,
): ReadonlyArray<CrossWorldMessage> {
  const now = deps.clock.nowMicroseconds();
  const expired: CrossWorldMessage[] = [];

  for (const msg of messages.values()) {
    if (msg.status === 'IN_TRANSIT' && now - msg.sentAt > cfg.messageExpiryUs) {
      msg.status = 'EXPIRED';
      expired.push(freeze(msg));
    }
  }

  return expired;
}

// ─── Helpers ─────────────────────────────────────────────────────

function getOrThrow(messages: Map<string, MutableMessage>, id: string): MutableMessage {
  const msg = messages.get(id);
  if (msg === undefined) throw new Error(`Unknown message: ${id}`);
  return msg;
}

function getByIndex(
  index: Map<string, string[]>,
  dynastyId: string,
  messages: Map<string, MutableMessage>,
): ReadonlyArray<CrossWorldMessage> {
  const ids = index.get(dynastyId) ?? [];
  return ids
    .map(id => messages.get(id))
    .filter((m): m is MutableMessage => m !== undefined)
    .map(freeze);
}

function appendToIndex(index: Map<string, string[]>, key: string, messageId: string): void {
  const list = index.get(key);
  if (list !== undefined) {
    list.push(messageId);
  } else {
    index.set(key, [messageId]);
  }
}

function freeze(msg: MutableMessage): CrossWorldMessage {
  return {
    messageId: msg.messageId,
    senderDynastyId: msg.senderDynastyId,
    senderWorldId: msg.senderWorldId,
    recipientDynastyId: msg.recipientDynastyId,
    recipientWorldId: msg.recipientWorldId,
    messageType: msg.messageType,
    subject: msg.subject,
    body: msg.body,
    status: msg.status,
    sentAt: msg.sentAt,
    deliverAt: msg.deliverAt,
    deliveredAt: msg.deliveredAt,
    corridorId: msg.corridorId,
  };
}

function computeStats(messages: Map<string, MutableMessage>): MessagingRelayStats {
  let queued = 0;
  let inTransit = 0;
  let delivered = 0;
  let expired = 0;
  let blocked = 0;

  for (const msg of messages.values()) {
    switch (msg.status) {
      case 'QUEUED': queued += 1; break;
      case 'IN_TRANSIT': inTransit += 1; break;
      case 'DELIVERED': delivered += 1; break;
      case 'EXPIRED': expired += 1; break;
      case 'BLOCKED': blocked += 1; break;
    }
  }

  return { totalSent: messages.size, queued, inTransit, delivered, expired, blocked };
}
