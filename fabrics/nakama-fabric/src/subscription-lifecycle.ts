/**
 * Subscription Lifecycle Engine ΓÇö Stripe billing + tier transition management.
 *
 * Bible v1.1 Part 10.1 / Implementation Bible Part 10:
 * Four recurring tiers (FREE_TOURIST, ACCORD, PATRON, HERALD) plus
 * one-time Founder purchases (PROMETHEUS, SHEPHERD, FIRST_LIGHT).
 *
 * Stripe is accessed only through StripePort ΓÇö domain logic never imports
 * the Stripe SDK directly (hexagonal architecture).
 *
 * Payment failure policy: 3 failures over 14 days ΓåÆ SUSPENDED.
 * Founder subscriptions are FOUNDER status and never expire.
 */

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type SubscriptionTier = 'FREE_TOURIST' | 'ACCORD' | 'PATRON' | 'HERALD';

export type FounderTier = 'PROMETHEUS' | 'SHEPHERD' | 'FIRST_LIGHT';

export type BillingStatus =
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'SUSPENDED'
  | 'DORMANT'
  | 'CANCELLED'
  | 'FOUNDER';

export interface DynastySubscription {
  readonly dynastyId: string;
  readonly tier: SubscriptionTier;
  readonly founderTier?: FounderTier;
  readonly billingStatus: BillingStatus;
  readonly stripeCustomerId?: string;
  readonly stripeSubscriptionId?: string;
  readonly currentPeriodEndsAt?: string;
  readonly paymentFailures: number;
  readonly cancelledAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SubscriptionLimits {
  readonly tier: SubscriptionTier | FounderTier;
  readonly chronicleEntriesPerDay: number | 'unlimited';
  readonly canVoteInAssembly: boolean;
  readonly canClaimWorlds: boolean;
  readonly canReceiveMarks: boolean;
  readonly priorityQueue: boolean;
  readonly betaFeatures: boolean;
}

export interface StripePort {
  createCustomer(email: string, dynastyId: string): Promise<{ customerId: string }>;
  createSubscription(customerId: string, priceId: string): Promise<{ subscriptionId: string }>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  handleWebhook(event: StripeWebhookEvent): Promise<void>;
}

export type StripeWebhookEvent =
  | { type: 'invoice.payment_succeeded'; customerId: string }
  | { type: 'invoice.payment_failed'; customerId: string }
  | { type: 'customer.subscription.deleted'; subscriptionId: string };

// ΓöÇΓöÇΓöÇ Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const MAX_PAYMENT_FAILURES = 3;

export const SUBSCRIPTION_LIMITS: Readonly<
  Record<SubscriptionTier | FounderTier, SubscriptionLimits>
> = {
  FREE_TOURIST: {
    tier: 'FREE_TOURIST',
    chronicleEntriesPerDay: 0,
    canVoteInAssembly: false,
    canClaimWorlds: false,
    canReceiveMarks: false,
    priorityQueue: false,
    betaFeatures: false,
  },
  ACCORD: {
    tier: 'ACCORD',
    chronicleEntriesPerDay: 1,
    canVoteInAssembly: true,
    canClaimWorlds: false,
    canReceiveMarks: true,
    priorityQueue: false,
    betaFeatures: false,
  },
  PATRON: {
    tier: 'PATRON',
    chronicleEntriesPerDay: 5,
    canVoteInAssembly: true,
    canClaimWorlds: false,
    canReceiveMarks: true,
    priorityQueue: true,
    betaFeatures: false,
  },
  HERALD: {
    tier: 'HERALD',
    chronicleEntriesPerDay: 'unlimited',
    canVoteInAssembly: true,
    canClaimWorlds: false,
    canReceiveMarks: true,
    priorityQueue: true,
    betaFeatures: true,
  },
  PROMETHEUS: {
    tier: 'PROMETHEUS',
    chronicleEntriesPerDay: 'unlimited',
    canVoteInAssembly: true,
    canClaimWorlds: true,
    canReceiveMarks: true,
    priorityQueue: true,
    betaFeatures: true,
  },
  SHEPHERD: {
    tier: 'SHEPHERD',
    chronicleEntriesPerDay: 'unlimited',
    canVoteInAssembly: true,
    canClaimWorlds: true,
    canReceiveMarks: true,
    priorityQueue: true,
    betaFeatures: true,
  },
  FIRST_LIGHT: {
    tier: 'FIRST_LIGHT',
    chronicleEntriesPerDay: 'unlimited',
    canVoteInAssembly: true,
    canClaimWorlds: true,
    canReceiveMarks: true,
    priorityQueue: true,
    betaFeatures: true,
  },
} as const;

// ΓöÇΓöÇΓöÇ Price IDs (injected by infra, domain only stores keys) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const TIER_PRICE_IDS: Readonly<Record<SubscriptionTier, string>> = {
  FREE_TOURIST: 'price_free_tourist',
  ACCORD: 'price_accord_monthly',
  PATRON: 'price_patron_monthly',
  HERALD: 'price_herald_monthly',
};

// ΓöÇΓöÇΓöÇ State ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface SubscriptionStore {
  readonly byDynastyId: Map<string, DynastySubscription>;
  readonly byCustomerId: Map<string, string>; // customerId ΓåÆ dynastyId
  readonly bySubscriptionId: Map<string, string>; // stripeSubId ΓåÆ dynastyId
}

export function createSubscriptionStore(): SubscriptionStore {
  return {
    byDynastyId: new Map(),
    byCustomerId: new Map(),
    bySubscriptionId: new Map(),
  };
}

// ΓöÇΓöÇΓöÇ Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function nowIso(): string {
  return new Date().toISOString();
}

function updateSub(store: SubscriptionStore, updated: DynastySubscription): DynastySubscription {
  store.byDynastyId.set(updated.dynastyId, updated);
  return updated;
}

function requireSub(store: SubscriptionStore, dynastyId: string): DynastySubscription {
  const sub = store.byDynastyId.get(dynastyId);
  if (!sub) throw new Error(`No subscription for dynasty: ${dynastyId}`);
  return sub;
}

// ΓöÇΓöÇΓöÇ Service ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export async function subscribe(
  store: SubscriptionStore,
  dynastyId: string,
  email: string,
  tier: SubscriptionTier,
  stripe: StripePort,
): Promise<DynastySubscription> {
  if (tier === 'FREE_TOURIST') {
    return createFreeTouristSubscription(store, dynastyId);
  }
  const { customerId } = await stripe.createCustomer(email, dynastyId);
  const priceId = TIER_PRICE_IDS[tier];
  const { subscriptionId } = await stripe.createSubscription(customerId, priceId);
  const now = nowIso();
  const sub: DynastySubscription = {
    dynastyId,
    tier,
    billingStatus: 'ACTIVE',
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    paymentFailures: 0,
    createdAt: now,
    updatedAt: now,
  };
  store.byCustomerId.set(customerId, dynastyId);
  store.bySubscriptionId.set(subscriptionId, dynastyId);
  return updateSub(store, sub);
}

function createFreeTouristSubscription(
  store: SubscriptionStore,
  dynastyId: string,
): DynastySubscription {
  const now = nowIso();
  const sub: DynastySubscription = {
    dynastyId,
    tier: 'FREE_TOURIST',
    billingStatus: 'ACTIVE',
    paymentFailures: 0,
    createdAt: now,
    updatedAt: now,
  };
  return updateSub(store, sub);
}

export async function upgrade(
  store: SubscriptionStore,
  dynastyId: string,
  newTier: SubscriptionTier,
  stripe: StripePort,
): Promise<DynastySubscription> {
  const existing = requireSub(store, dynastyId);
  const customerId = existing.stripeCustomerId;
  if (!customerId) throw new Error('No Stripe customer for upgrade');
  const priceId = TIER_PRICE_IDS[newTier];
  const { subscriptionId } = await stripe.createSubscription(customerId, priceId);
  const updated: DynastySubscription = {
    ...existing,
    tier: newTier,
    billingStatus: 'ACTIVE',
    stripeSubscriptionId: subscriptionId,
    paymentFailures: 0,
    updatedAt: nowIso(),
  };
  store.bySubscriptionId.set(subscriptionId, dynastyId);
  return updateSub(store, updated);
}

export async function downgrade(
  store: SubscriptionStore,
  dynastyId: string,
  newTier: SubscriptionTier,
  stripe: StripePort,
): Promise<DynastySubscription> {
  return upgrade(store, dynastyId, newTier, stripe);
}

export function handlePaymentSuccess(
  store: SubscriptionStore,
  customerId: string,
): DynastySubscription {
  const dynastyId = store.byCustomerId.get(customerId);
  if (!dynastyId) throw new Error(`No dynasty for Stripe customer: ${customerId}`);
  const existing = requireSub(store, dynastyId);
  const updated: DynastySubscription = {
    ...existing,
    billingStatus: 'ACTIVE',
    paymentFailures: 0,
    updatedAt: nowIso(),
  };
  return updateSub(store, updated);
}

export function handlePaymentFailure(
  store: SubscriptionStore,
  customerId: string,
): DynastySubscription {
  const dynastyId = store.byCustomerId.get(customerId);
  if (!dynastyId) throw new Error(`No dynasty for Stripe customer: ${customerId}`);
  const existing = requireSub(store, dynastyId);
  const newFailures = existing.paymentFailures + 1;
  const newStatus: BillingStatus = newFailures >= MAX_PAYMENT_FAILURES ? 'SUSPENDED' : 'PAST_DUE';
  const updated: DynastySubscription = {
    ...existing,
    billingStatus: newStatus,
    paymentFailures: newFailures,
    updatedAt: nowIso(),
  };
  return updateSub(store, updated);
}

export function cancel(store: SubscriptionStore, dynastyId: string): DynastySubscription {
  const existing = requireSub(store, dynastyId);
  const updated: DynastySubscription = {
    ...existing,
    billingStatus: 'CANCELLED',
    cancelledAt: nowIso(),
    updatedAt: nowIso(),
  };
  return updateSub(store, updated);
}

export function purchaseFounderTier(
  store: SubscriptionStore,
  dynastyId: string,
  founderTier: FounderTier,
): DynastySubscription {
  const now = nowIso();
  const existing = store.byDynastyId.get(dynastyId);
  const sub: DynastySubscription = {
    dynastyId,
    tier: existing?.tier ?? 'FREE_TOURIST',
    founderTier,
    billingStatus: 'FOUNDER',
    stripeCustomerId: existing?.stripeCustomerId,
    paymentFailures: 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  return updateSub(store, sub);
}

export function getLimits(subscription: DynastySubscription): SubscriptionLimits {
  const key: SubscriptionTier | FounderTier = subscription.founderTier ?? subscription.tier;
  return SUBSCRIPTION_LIMITS[key];
}

export function getSubscription(
  store: SubscriptionStore,
  dynastyId: string,
): DynastySubscription | undefined {
  return store.byDynastyId.get(dynastyId);
}
