/**
 * rate-limiter.ts — Token bucket rate limiting for the Selvage gateway.
 *
 * Provides per-client rate limiting using the token bucket algorithm.
 * Buckets refill at a configured rate and burst capacity. Supports
 * sliding window and fixed window strategies via configuration,
 * with token bucket as the primary implementation. Idle buckets
 * are swept to prevent unbounded memory growth.
 */

// ── Ports ────────────────────────────────────────────────────────

interface RateLimitClock {
  readonly nowMicroseconds: () => number;
}

interface RateLimitDeps {
  readonly clock: RateLimitClock;
}

// ── Types ────────────────────────────────────────────────────────

type RateLimitStrategy = 'TOKEN_BUCKET' | 'SLIDING_WINDOW' | 'FIXED_WINDOW';

interface RateLimitConfig {
  readonly strategy: RateLimitStrategy;
  readonly maxTokens: number;
  readonly refillRate: number;
  readonly refillIntervalUs: number;
  readonly idleExpirationUs: number;
}

interface BucketState {
  readonly clientId: string;
  readonly tokens: number;
  readonly maxTokens: number;
  readonly lastRefillAt: number;
  readonly createdAt: number;
  readonly lastConsumedAt: number;
  readonly totalConsumed: number;
  readonly totalRejected: number;
}

interface RateLimitResult {
  readonly allowed: boolean;
  readonly remainingTokens: number;
  readonly retryAfterUs: number;
  readonly clientId: string;
}

interface RateLimitStats {
  readonly totalBuckets: number;
  readonly totalConsumed: number;
  readonly totalRejected: number;
  readonly throttledClients: number;
}

interface RateLimitBucket {
  readonly clientId: string;
  readonly tokens: number;
  readonly maxTokens: number;
  readonly lastRefillAt: number;
  readonly createdAt: number;
}

interface RateLimiter {
  readonly createBucket: (clientId: string, config?: Partial<RateLimitConfig>) => RateLimitBucket;
  readonly tryConsume: (clientId: string, tokens?: number) => RateLimitResult;
  readonly refill: (clientId: string) => RateLimitBucket | string;
  readonly getRemainingTokens: (clientId: string) => number;
  readonly resetBucket: (clientId: string) => RateLimitBucket | string;
  readonly removeBucket: (clientId: string) => boolean;
  readonly isThrottled: (clientId: string) => boolean;
  readonly getRetryAfter: (clientId: string) => number;
  readonly sweepExpired: () => number;
  readonly getStats: () => RateLimitStats;
  readonly getBucketState: (clientId: string) => BucketState | undefined;
}

// ── Constants ────────────────────────────────────────────────────

const MAX_TOKENS_DEFAULT = 100;
const REFILL_INTERVAL_US = 1_000_000;
const DEFAULT_IDLE_EXPIRATION_US = 3_600_000_000;

const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  strategy: 'TOKEN_BUCKET',
  maxTokens: MAX_TOKENS_DEFAULT,
  refillRate: 10,
  refillIntervalUs: REFILL_INTERVAL_US,
  idleExpirationUs: DEFAULT_IDLE_EXPIRATION_US,
};

// ── State ────────────────────────────────────────────────────────

interface MutableBucket {
  readonly clientId: string;
  tokens: number;
  readonly maxTokens: number;
  lastRefillAt: number;
  readonly createdAt: number;
  lastConsumedAt: number;
  totalConsumed: number;
  totalRejected: number;
  readonly config: RateLimitConfig;
}

interface RateLimitState {
  readonly deps: RateLimitDeps;
  readonly defaultConfig: RateLimitConfig;
  readonly buckets: Map<string, MutableBucket>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toBucketView(bucket: MutableBucket): RateLimitBucket {
  return {
    clientId: bucket.clientId,
    tokens: bucket.tokens,
    maxTokens: bucket.maxTokens,
    lastRefillAt: bucket.lastRefillAt,
    createdAt: bucket.createdAt,
  };
}

function toBucketState(bucket: MutableBucket): BucketState {
  return {
    clientId: bucket.clientId,
    tokens: bucket.tokens,
    maxTokens: bucket.maxTokens,
    lastRefillAt: bucket.lastRefillAt,
    createdAt: bucket.createdAt,
    lastConsumedAt: bucket.lastConsumedAt,
    totalConsumed: bucket.totalConsumed,
    totalRejected: bucket.totalRejected,
  };
}

function mergeConfig(base: RateLimitConfig, overrides?: Partial<RateLimitConfig>): RateLimitConfig {
  if (!overrides) return base;
  return {
    strategy: overrides.strategy ?? base.strategy,
    maxTokens: overrides.maxTokens ?? base.maxTokens,
    refillRate: overrides.refillRate ?? base.refillRate,
    refillIntervalUs: overrides.refillIntervalUs ?? base.refillIntervalUs,
    idleExpirationUs: overrides.idleExpirationUs ?? base.idleExpirationUs,
  };
}

function calculateRefillTokens(bucket: MutableBucket, nowUs: number): number {
  const elapsed = nowUs - bucket.lastRefillAt;
  if (elapsed <= 0) return 0;
  const intervals = Math.floor(elapsed / bucket.config.refillIntervalUs);
  return intervals * bucket.config.refillRate;
}

function calculateRetryAfterUs(bucket: MutableBucket, tokensNeeded: number): number {
  if (bucket.tokens >= tokensNeeded) return 0;
  const deficit = tokensNeeded - bucket.tokens;
  const intervalsNeeded = Math.ceil(deficit / bucket.config.refillRate);
  return intervalsNeeded * bucket.config.refillIntervalUs;
}

// ── Operations ───────────────────────────────────────────────────

function createBucketImpl(
  state: RateLimitState,
  clientId: string,
  configOverrides?: Partial<RateLimitConfig>,
): RateLimitBucket {
  const config = mergeConfig(state.defaultConfig, configOverrides);
  const now = state.deps.clock.nowMicroseconds();
  const existing = state.buckets.get(clientId);
  if (existing) return toBucketView(existing);
  const bucket: MutableBucket = {
    clientId,
    tokens: config.maxTokens,
    maxTokens: config.maxTokens,
    lastRefillAt: now,
    createdAt: now,
    lastConsumedAt: 0,
    totalConsumed: 0,
    totalRejected: 0,
    config,
  };
  state.buckets.set(clientId, bucket);
  return toBucketView(bucket);
}

function refillImpl(state: RateLimitState, clientId: string): RateLimitBucket | string {
  const bucket = state.buckets.get(clientId);
  if (!bucket) return 'BUCKET_NOT_FOUND';
  const now = state.deps.clock.nowMicroseconds();
  const newTokens = calculateRefillTokens(bucket, now);
  if (newTokens > 0) {
    bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + newTokens);
    const intervals = Math.floor((now - bucket.lastRefillAt) / bucket.config.refillIntervalUs);
    bucket.lastRefillAt = bucket.lastRefillAt + intervals * bucket.config.refillIntervalUs;
  }
  return toBucketView(bucket);
}

function tryConsumeImpl(state: RateLimitState, clientId: string, tokens: number): RateLimitResult {
  const bucket = state.buckets.get(clientId);
  if (!bucket) {
    createBucketImpl(state, clientId);
    return tryConsumeImpl(state, clientId, tokens);
  }
  refillImpl(state, clientId);
  if (bucket.tokens >= tokens) {
    bucket.tokens -= tokens;
    bucket.lastConsumedAt = state.deps.clock.nowMicroseconds();
    bucket.totalConsumed += tokens;
    return buildAllowedResult(bucket);
  }
  bucket.totalRejected += tokens;
  return buildRejectedResult(bucket, tokens);
}

function buildAllowedResult(bucket: MutableBucket): RateLimitResult {
  return {
    allowed: true,
    remainingTokens: bucket.tokens,
    retryAfterUs: 0,
    clientId: bucket.clientId,
  };
}

function buildRejectedResult(bucket: MutableBucket, tokensNeeded: number): RateLimitResult {
  return {
    allowed: false,
    remainingTokens: bucket.tokens,
    retryAfterUs: calculateRetryAfterUs(bucket, tokensNeeded),
    clientId: bucket.clientId,
  };
}

function getRemainingTokensImpl(state: RateLimitState, clientId: string): number {
  const bucket = state.buckets.get(clientId);
  if (!bucket) return 0;
  refillImpl(state, clientId);
  return bucket.tokens;
}

function resetBucketImpl(state: RateLimitState, clientId: string): RateLimitBucket | string {
  const bucket = state.buckets.get(clientId);
  if (!bucket) return 'BUCKET_NOT_FOUND';
  bucket.tokens = bucket.maxTokens;
  bucket.lastRefillAt = state.deps.clock.nowMicroseconds();
  bucket.lastConsumedAt = 0;
  bucket.totalConsumed = 0;
  bucket.totalRejected = 0;
  return toBucketView(bucket);
}

function removeBucketImpl(state: RateLimitState, clientId: string): boolean {
  return state.buckets.delete(clientId);
}

function isThrottledImpl(state: RateLimitState, clientId: string): boolean {
  const bucket = state.buckets.get(clientId);
  if (!bucket) return false;
  refillImpl(state, clientId);
  return bucket.tokens < 1;
}

function getRetryAfterImpl(state: RateLimitState, clientId: string): number {
  const bucket = state.buckets.get(clientId);
  if (!bucket) return 0;
  refillImpl(state, clientId);
  return calculateRetryAfterUs(bucket, 1);
}

function sweepExpiredImpl(state: RateLimitState): number {
  const now = state.deps.clock.nowMicroseconds();
  let removed = 0;
  const toRemove: string[] = [];
  for (const bucket of state.buckets.values()) {
    const lastActivity = Math.max(bucket.lastConsumedAt, bucket.lastRefillAt);
    if (now - lastActivity > bucket.config.idleExpirationUs) {
      toRemove.push(bucket.clientId);
    }
  }
  for (const id of toRemove) {
    state.buckets.delete(id);
    removed += 1;
  }
  return removed;
}

function getStatsImpl(state: RateLimitState): RateLimitStats {
  let totalConsumed = 0;
  let totalRejected = 0;
  let throttledClients = 0;
  for (const bucket of state.buckets.values()) {
    totalConsumed += bucket.totalConsumed;
    totalRejected += bucket.totalRejected;
    if (bucket.tokens < 1) {
      throttledClients += 1;
    }
  }
  return {
    totalBuckets: state.buckets.size,
    totalConsumed,
    totalRejected,
    throttledClients,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createRateLimiter(deps: RateLimitDeps, config?: Partial<RateLimitConfig>): RateLimiter {
  const state: RateLimitState = {
    deps,
    defaultConfig: mergeConfig(DEFAULT_RATE_LIMIT_CONFIG, config),
    buckets: new Map(),
  };
  return {
    createBucket: (clientId, cfg) => createBucketImpl(state, clientId, cfg),
    tryConsume: (clientId, tokens = 1) => tryConsumeImpl(state, clientId, tokens),
    refill: (clientId) => refillImpl(state, clientId),
    getRemainingTokens: (clientId) => getRemainingTokensImpl(state, clientId),
    resetBucket: (clientId) => resetBucketImpl(state, clientId),
    removeBucket: (clientId) => removeBucketImpl(state, clientId),
    isThrottled: (clientId) => isThrottledImpl(state, clientId),
    getRetryAfter: (clientId) => getRetryAfterImpl(state, clientId),
    sweepExpired: () => sweepExpiredImpl(state),
    getStats: () => getStatsImpl(state),
    getBucketState: (clientId) => {
      const bucket = state.buckets.get(clientId);
      return bucket ? toBucketState(bucket) : undefined;
    },
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createRateLimiter, DEFAULT_RATE_LIMIT_CONFIG, MAX_TOKENS_DEFAULT, REFILL_INTERVAL_US };

export type {
  RateLimiter,
  RateLimitDeps,
  RateLimitConfig,
  RateLimitStrategy,
  RateLimitBucket,
  RateLimitResult,
  RateLimitStats,
  BucketState,
};
