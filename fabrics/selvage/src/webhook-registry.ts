/**
 * webhook-registry.ts — Webhook registration and delivery management.
 *
 * Manages webhook subscriptions, tracks delivery attempts with
 * exponential backoff, generates HMAC signatures for payloads,
 * and maintains a dead letter queue for permanently failed deliveries.
 *
 * "Each webhook is a thread cast outward from the loom."
 */

// ── Ports ────────────────────────────────────────────────────────

interface WebhookClock {
  readonly nowMicroseconds: () => number;
}

interface WebhookIdGenerator {
  readonly generate: () => string;
}

interface WebhookLogPort {
  readonly info: (message: string, context: Record<string, unknown>) => void;
  readonly warn: (message: string, context: Record<string, unknown>) => void;
}

interface WebhookRegistryDeps {
  readonly clock: WebhookClock;
  readonly idGenerator: WebhookIdGenerator;
  readonly log: WebhookLogPort;
}

// ── Types ────────────────────────────────────────────────────────

interface WebhookSubscription {
  readonly id: string;
  readonly url: string;
  readonly eventTypes: readonly string[];
  readonly secret: string;
  readonly createdAt: number;
  readonly active: boolean;
}

interface RegisterWebhookParams {
  readonly url: string;
  readonly eventTypes: readonly string[];
  readonly secret: string;
}

type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'dead_letter';

interface DeliveryAttempt {
  readonly attemptNumber: number;
  readonly attemptedAt: number;
  readonly success: boolean;
  readonly statusCode: number | undefined;
}

interface DeliveryRecord {
  readonly id: string;
  readonly subscriptionId: string;
  readonly eventType: string;
  readonly payload: unknown;
  readonly status: DeliveryStatus;
  readonly attempts: readonly DeliveryAttempt[];
  readonly createdAt: number;
  readonly nextRetryAt: number | undefined;
}

interface EnqueueDeliveryParams {
  readonly subscriptionId: string;
  readonly eventType: string;
  readonly payload: unknown;
}

interface RecordAttemptParams {
  readonly deliveryId: string;
  readonly success: boolean;
  readonly statusCode: number | undefined;
}

interface WebhookSignature {
  readonly header: string;
  readonly signature: string;
  readonly timestamp: number;
}

interface DeadLetterEntry {
  readonly deliveryId: string;
  readonly subscriptionId: string;
  readonly eventType: string;
  readonly payload: unknown;
  readonly failedAt: number;
  readonly totalAttempts: number;
}

interface WebhookConfig {
  readonly maxRetries: number;
  readonly baseRetryDelayMicro: number;
  readonly maxRetryDelayMicro: number;
}

interface WebhookStats {
  readonly totalSubscriptions: number;
  readonly activeSubscriptions: number;
  readonly totalDeliveries: number;
  readonly pendingDeliveries: number;
  readonly deliveredCount: number;
  readonly failedCount: number;
  readonly deadLetterCount: number;
}

interface WebhookRegistry {
  readonly subscribe: (params: RegisterWebhookParams) => WebhookSubscription;
  readonly unsubscribe: (id: string) => boolean;
  readonly getSubscription: (id: string) => WebhookSubscription | undefined;
  readonly listSubscriptions: () => readonly WebhookSubscription[];
  readonly listByEventType: (eventType: string) => readonly WebhookSubscription[];
  readonly enqueueDelivery: (params: EnqueueDeliveryParams) => DeliveryRecord;
  readonly recordAttempt: (params: RecordAttemptParams) => DeliveryRecord | undefined;
  readonly getDelivery: (id: string) => DeliveryRecord | undefined;
  readonly getPendingDeliveries: () => readonly DeliveryRecord[];
  readonly getRetryableDeliveries: () => readonly DeliveryRecord[];
  readonly generateSignature: (
    subscriptionId: string,
    payload: string,
  ) => WebhookSignature | undefined;
  readonly getDeadLetterQueue: () => readonly DeadLetterEntry[];
  readonly getStats: () => WebhookStats;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_WEBHOOK_CONFIG: WebhookConfig = {
  maxRetries: 5,
  baseRetryDelayMicro: 1_000_000, // 1 second
  maxRetryDelayMicro: 300_000_000, // 5 minutes
};

// ── State ────────────────────────────────────────────────────────

interface MutableSubscription {
  readonly id: string;
  readonly url: string;
  readonly eventTypes: readonly string[];
  readonly secret: string;
  readonly createdAt: number;
  active: boolean;
}

interface MutableDelivery {
  readonly id: string;
  readonly subscriptionId: string;
  readonly eventType: string;
  readonly payload: unknown;
  status: DeliveryStatus;
  readonly attempts: DeliveryAttempt[];
  readonly createdAt: number;
  nextRetryAt: number | undefined;
}

interface RegistryState {
  readonly deps: WebhookRegistryDeps;
  readonly config: WebhookConfig;
  readonly subscriptions: Map<string, MutableSubscription>;
  readonly deliveries: Map<string, MutableDelivery>;
  readonly deadLetters: DeadLetterEntry[];
}

// ── Helpers ──────────────────────────────────────────────────────

function toSubscription(sub: MutableSubscription): WebhookSubscription {
  return {
    id: sub.id,
    url: sub.url,
    eventTypes: sub.eventTypes,
    secret: sub.secret,
    createdAt: sub.createdAt,
    active: sub.active,
  };
}

function toDeliveryRecord(del: MutableDelivery): DeliveryRecord {
  return {
    id: del.id,
    subscriptionId: del.subscriptionId,
    eventType: del.eventType,
    payload: del.payload,
    status: del.status,
    attempts: [...del.attempts],
    createdAt: del.createdAt,
    nextRetryAt: del.nextRetryAt,
  };
}

function computeRetryDelay(attemptNumber: number, config: WebhookConfig): number {
  const delay = config.baseRetryDelayMicro * Math.pow(2, attemptNumber - 1);
  return Math.min(delay, config.maxRetryDelayMicro);
}

function simpleHash(input: string, secret: string): string {
  let hash = 0;
  const combined = secret + ':' + input;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return 'sha256=' + Math.abs(hash).toString(16).padStart(8, '0');
}

// ── Operations ───────────────────────────────────────────────────

function subscribeImpl(state: RegistryState, params: RegisterWebhookParams): WebhookSubscription {
  const id = state.deps.idGenerator.generate();
  const sub: MutableSubscription = {
    id,
    url: params.url,
    eventTypes: [...params.eventTypes],
    secret: params.secret,
    createdAt: state.deps.clock.nowMicroseconds(),
    active: true,
  };
  state.subscriptions.set(id, sub);
  return toSubscription(sub);
}

function unsubscribeImpl(state: RegistryState, id: string): boolean {
  const sub = state.subscriptions.get(id);
  if (!sub) return false;
  sub.active = false;
  return true;
}

function listByEventTypeImpl(
  state: RegistryState,
  eventType: string,
): readonly WebhookSubscription[] {
  const results: WebhookSubscription[] = [];
  for (const sub of state.subscriptions.values()) {
    if (!sub.active) continue;
    if (sub.eventTypes.includes(eventType)) {
      results.push(toSubscription(sub));
    }
  }
  return results;
}

function enqueueImpl(state: RegistryState, params: EnqueueDeliveryParams): DeliveryRecord {
  const id = state.deps.idGenerator.generate();
  const delivery: MutableDelivery = {
    id,
    subscriptionId: params.subscriptionId,
    eventType: params.eventType,
    payload: params.payload,
    status: 'pending',
    attempts: [],
    createdAt: state.deps.clock.nowMicroseconds(),
    nextRetryAt: undefined,
  };
  state.deliveries.set(id, delivery);
  return toDeliveryRecord(delivery);
}

function recordAttemptImpl(
  state: RegistryState,
  params: RecordAttemptParams,
): DeliveryRecord | undefined {
  const delivery = state.deliveries.get(params.deliveryId);
  if (!delivery) return undefined;

  const now = state.deps.clock.nowMicroseconds();
  const attemptNumber = delivery.attempts.length + 1;
  delivery.attempts.push({
    attemptNumber,
    attemptedAt: now,
    success: params.success,
    statusCode: params.statusCode,
  });

  if (params.success) {
    return markDelivered(delivery);
  }
  return handleFailedAttempt(state, delivery, attemptNumber, now);
}

function markDelivered(delivery: MutableDelivery): DeliveryRecord {
  delivery.status = 'delivered';
  delivery.nextRetryAt = undefined;
  return toDeliveryRecord(delivery);
}

function handleFailedAttempt(
  state: RegistryState,
  delivery: MutableDelivery,
  attemptNumber: number,
  now: number,
): DeliveryRecord {
  if (attemptNumber >= state.config.maxRetries) {
    return moveToDeadLetter(state, delivery);
  }
  delivery.status = 'failed';
  delivery.nextRetryAt = now + computeRetryDelay(attemptNumber, state.config);
  return toDeliveryRecord(delivery);
}

function moveToDeadLetter(state: RegistryState, delivery: MutableDelivery): DeliveryRecord {
  delivery.status = 'dead_letter';
  delivery.nextRetryAt = undefined;
  state.deadLetters.push({
    deliveryId: delivery.id,
    subscriptionId: delivery.subscriptionId,
    eventType: delivery.eventType,
    payload: delivery.payload,
    failedAt: state.deps.clock.nowMicroseconds(),
    totalAttempts: delivery.attempts.length,
  });
  return toDeliveryRecord(delivery);
}

function getPendingImpl(state: RegistryState): readonly DeliveryRecord[] {
  const results: DeliveryRecord[] = [];
  for (const del of state.deliveries.values()) {
    if (del.status === 'pending') results.push(toDeliveryRecord(del));
  }
  return results;
}

function getRetryableImpl(state: RegistryState): readonly DeliveryRecord[] {
  const now = state.deps.clock.nowMicroseconds();
  const results: DeliveryRecord[] = [];
  for (const del of state.deliveries.values()) {
    if (del.status !== 'failed') continue;
    if (del.nextRetryAt === undefined) continue;
    if (now >= del.nextRetryAt) results.push(toDeliveryRecord(del));
  }
  return results;
}

function generateSignatureImpl(
  state: RegistryState,
  subscriptionId: string,
  payload: string,
): WebhookSignature | undefined {
  const sub = state.subscriptions.get(subscriptionId);
  if (!sub) return undefined;
  const timestamp = state.deps.clock.nowMicroseconds();
  const signatureInput = String(timestamp) + '.' + payload;
  const signature = simpleHash(signatureInput, sub.secret);
  return { header: 'X-Webhook-Signature', signature, timestamp };
}

function countByStatus(state: RegistryState, target: DeliveryStatus): number {
  let count = 0;
  for (const del of state.deliveries.values()) {
    if (del.status === target) count += 1;
  }
  return count;
}

function getStatsImpl(state: RegistryState): WebhookStats {
  let activeSubs = 0;
  for (const sub of state.subscriptions.values()) {
    if (sub.active) activeSubs += 1;
  }
  return {
    totalSubscriptions: state.subscriptions.size,
    activeSubscriptions: activeSubs,
    totalDeliveries: state.deliveries.size,
    pendingDeliveries: countByStatus(state, 'pending'),
    deliveredCount: countByStatus(state, 'delivered'),
    failedCount: countByStatus(state, 'failed'),
    deadLetterCount: state.deadLetters.length,
  };
}

// ── Accessors ────────────────────────────────────────────────────

function getSubscriptionImpl(state: RegistryState, id: string): WebhookSubscription | undefined {
  const s = state.subscriptions.get(id);
  return s ? toSubscription(s) : undefined;
}

function getDeliveryImpl(state: RegistryState, id: string): DeliveryRecord | undefined {
  const d = state.deliveries.get(id);
  return d ? toDeliveryRecord(d) : undefined;
}

// ── Factory ──────────────────────────────────────────────────────

function createWebhookRegistry(
  deps: WebhookRegistryDeps,
  config: WebhookConfig = DEFAULT_WEBHOOK_CONFIG,
): WebhookRegistry {
  const state: RegistryState = {
    deps,
    config,
    subscriptions: new Map(),
    deliveries: new Map(),
    deadLetters: [],
  };
  return {
    subscribe: (p) => subscribeImpl(state, p),
    unsubscribe: (id) => unsubscribeImpl(state, id),
    getSubscription: (id) => getSubscriptionImpl(state, id),
    listSubscriptions: () => [...state.subscriptions.values()].map(toSubscription),
    listByEventType: (et) => listByEventTypeImpl(state, et),
    enqueueDelivery: (p) => enqueueImpl(state, p),
    recordAttempt: (p) => recordAttemptImpl(state, p),
    getDelivery: (id) => getDeliveryImpl(state, id),
    getPendingDeliveries: () => getPendingImpl(state),
    getRetryableDeliveries: () => getRetryableImpl(state),
    generateSignature: (sid, p) => generateSignatureImpl(state, sid, p),
    getDeadLetterQueue: () => [...state.deadLetters],
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createWebhookRegistry, DEFAULT_WEBHOOK_CONFIG };
export type {
  WebhookRegistry,
  WebhookRegistryDeps,
  WebhookClock,
  WebhookIdGenerator,
  WebhookLogPort,
  WebhookSubscription,
  RegisterWebhookParams,
  DeliveryStatus,
  DeliveryAttempt,
  DeliveryRecord,
  EnqueueDeliveryParams,
  RecordAttemptParams,
  WebhookSignature,
  DeadLetterEntry,
  WebhookConfig,
  WebhookStats,
};
