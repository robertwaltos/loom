/**
 * webhook-dispatcher.ts — Webhook registration and event dispatch to external endpoints.
 *
 * Manages webhook subscriptions by event type, dispatches events to all active
 * matching webhooks, tracks delivery outcomes, and enforces failure thresholds
 * that transition webhooks to FAILED status.
 *
 * "Each webhook is a thread cast outward from the loom."
 */

// ============================================================================
// PORTS
// ============================================================================

export type Clock = {
  now(): bigint;
};

export type IdGenerator = {
  generate(): string;
};

export type Logger = {
  info(message: string): void;
  error(message: string): void;
};

// ============================================================================
// TYPES
// ============================================================================

export type WebhookId = string;
export type EndpointId = string;

export type WebhookError =
  | 'webhook-not-found'
  | 'endpoint-not-found'
  | 'already-registered'
  | 'invalid-url'
  | 'max-retries-exceeded';

export type WebhookStatus = 'ACTIVE' | 'PAUSED' | 'FAILED';

export type Webhook = {
  webhookId: WebhookId;
  endpointUrl: string;
  eventTypes: ReadonlyArray<string>;
  status: WebhookStatus;
  createdAt: bigint;
  lastDeliveredAt: bigint | null;
  deliveryCount: number;
  failureCount: number;
};

export type WebhookDelivery = {
  deliveryId: string;
  webhookId: WebhookId;
  eventType: string;
  payload: Record<string, string | number | boolean>;
  attemptCount: number;
  success: boolean;
  deliveredAt: bigint;
};

export type WebhookStats = {
  totalWebhooks: number;
  activeWebhooks: number;
  totalDeliveries: number;
  successRate: number;
};

// ============================================================================
// STATE
// ============================================================================

export type WebhookDispatcherState = {
  webhooks: Map<WebhookId, MutableWebhook>;
  deliveries: Map<string, MutableDelivery>;
};

type MutableWebhook = {
  webhookId: WebhookId;
  endpointUrl: string;
  eventTypes: ReadonlyArray<string>;
  status: WebhookStatus;
  createdAt: bigint;
  lastDeliveredAt: bigint | null;
  deliveryCount: number;
  failureCount: number;
};

type MutableDelivery = {
  deliveryId: string;
  webhookId: WebhookId;
  eventType: string;
  payload: Record<string, string | number | boolean>;
  attemptCount: number;
  success: boolean;
  deliveredAt: bigint;
};

const FAILURE_THRESHOLD = 5;

// ============================================================================
// FACTORY
// ============================================================================

export function createWebhookDispatcherState(): WebhookDispatcherState {
  return {
    webhooks: new Map(),
    deliveries: new Map(),
  };
}

// ============================================================================
// WEBHOOK MANAGEMENT
// ============================================================================

export function registerWebhook(
  state: WebhookDispatcherState,
  endpointUrl: string,
  eventTypes: ReadonlyArray<string>,
  idGen: IdGenerator,
  clock: Clock,
  logger: Logger,
): Webhook | WebhookError {
  if (!endpointUrl.startsWith('http://') && !endpointUrl.startsWith('https://')) {
    return 'invalid-url';
  }

  const webhook: MutableWebhook = {
    webhookId: idGen.generate(),
    endpointUrl,
    eventTypes: [...eventTypes],
    status: 'ACTIVE',
    createdAt: clock.now(),
    lastDeliveredAt: null,
    deliveryCount: 0,
    failureCount: 0,
  };

  state.webhooks.set(webhook.webhookId, webhook);
  logger.info('Webhook registered: ' + webhook.webhookId + ' -> ' + endpointUrl);
  return toWebhook(webhook);
}

export function pauseWebhook(
  state: WebhookDispatcherState,
  webhookId: WebhookId,
): { success: true } | { success: false; error: WebhookError } {
  const webhook = state.webhooks.get(webhookId);
  if (webhook === undefined) return { success: false, error: 'webhook-not-found' };
  webhook.status = 'PAUSED';
  return { success: true };
}

export function resumeWebhook(
  state: WebhookDispatcherState,
  webhookId: WebhookId,
): { success: true } | { success: false; error: WebhookError } {
  const webhook = state.webhooks.get(webhookId);
  if (webhook === undefined) return { success: false, error: 'webhook-not-found' };
  webhook.status = 'ACTIVE';
  return { success: true };
}

export function getWebhook(
  state: WebhookDispatcherState,
  webhookId: WebhookId,
): Webhook | undefined {
  const webhook = state.webhooks.get(webhookId);
  return webhook !== undefined ? toWebhook(webhook) : undefined;
}

// ============================================================================
// DISPATCH
// ============================================================================

export function dispatchEvent(
  state: WebhookDispatcherState,
  eventType: string,
  payload: Record<string, string | number | boolean>,
  idGen: IdGenerator,
  clock: Clock,
  logger: Logger,
): ReadonlyArray<WebhookDelivery> {
  const deliveries: WebhookDelivery[] = [];
  const now = clock.now();

  for (const webhook of state.webhooks.values()) {
    if (webhook.status !== 'ACTIVE') continue;
    if (!webhook.eventTypes.includes(eventType)) continue;

    const delivery = createDelivery(webhook, eventType, payload, idGen, now);
    state.deliveries.set(delivery.deliveryId, delivery);
    webhook.deliveryCount = webhook.deliveryCount + 1;
    deliveries.push(toDelivery(delivery));
  }

  logger.info('Event dispatched: ' + eventType + ' to ' + String(deliveries.length) + ' webhooks');
  return deliveries;
}

function createDelivery(
  webhook: MutableWebhook,
  eventType: string,
  payload: Record<string, string | number | boolean>,
  idGen: IdGenerator,
  now: bigint,
): MutableDelivery {
  return {
    deliveryId: idGen.generate(),
    webhookId: webhook.webhookId,
    eventType,
    payload: { ...payload },
    attemptCount: 1,
    success: false,
    deliveredAt: now,
  };
}

export function recordDeliveryResult(
  state: WebhookDispatcherState,
  deliveryId: string,
  success: boolean,
  clock: Clock,
): { success: true } | { success: false; error: WebhookError } {
  const delivery = state.deliveries.get(deliveryId);
  if (delivery === undefined) return { success: false, error: 'webhook-not-found' };

  delivery.success = success;

  const webhook = state.webhooks.get(delivery.webhookId);
  if (webhook === undefined) return { success: true };

  if (success) {
    webhook.lastDeliveredAt = clock.now();
  } else {
    webhook.failureCount = webhook.failureCount + 1;
    if (webhook.failureCount >= FAILURE_THRESHOLD) webhook.status = 'FAILED';
  }

  return { success: true };
}

// ============================================================================
// QUERIES
// ============================================================================

export function getDeliveryHistory(
  state: WebhookDispatcherState,
  webhookId: WebhookId,
  limit: number,
): ReadonlyArray<WebhookDelivery> {
  const results: WebhookDelivery[] = [];
  for (const delivery of state.deliveries.values()) {
    if (delivery.webhookId === webhookId) results.push(toDelivery(delivery));
  }
  results.sort((a, b) =>
    a.deliveredAt < b.deliveredAt ? 1 : a.deliveredAt > b.deliveredAt ? -1 : 0,
  );
  return results.slice(0, limit);
}

export function getStats(state: WebhookDispatcherState): WebhookStats {
  let activeWebhooks = 0;
  for (const webhook of state.webhooks.values()) {
    if (webhook.status === 'ACTIVE') activeWebhooks = activeWebhooks + 1;
  }

  const totalDeliveries = state.deliveries.size;
  let successCount = 0;
  for (const delivery of state.deliveries.values()) {
    if (delivery.success) successCount = successCount + 1;
  }

  return {
    totalWebhooks: state.webhooks.size,
    activeWebhooks,
    totalDeliveries,
    successRate: totalDeliveries === 0 ? 0 : successCount / totalDeliveries,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function toWebhook(webhook: MutableWebhook): Webhook {
  return {
    webhookId: webhook.webhookId,
    endpointUrl: webhook.endpointUrl,
    eventTypes: webhook.eventTypes,
    status: webhook.status,
    createdAt: webhook.createdAt,
    lastDeliveredAt: webhook.lastDeliveredAt,
    deliveryCount: webhook.deliveryCount,
    failureCount: webhook.failureCount,
  };
}

function toDelivery(delivery: MutableDelivery): WebhookDelivery {
  return {
    deliveryId: delivery.deliveryId,
    webhookId: delivery.webhookId,
    eventType: delivery.eventType,
    payload: { ...delivery.payload },
    attemptCount: delivery.attemptCount,
    success: delivery.success,
    deliveredAt: delivery.deliveredAt,
  };
}
