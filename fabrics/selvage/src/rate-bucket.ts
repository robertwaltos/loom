/**
 * rate-bucket.ts — Token bucket rate limiting.
 *
 * Implements the token bucket algorithm for per-key rate limiting.
 * Each bucket has a capacity and refill rate. Tokens are consumed
 * on each request and replenished over time.
 */

// ── Ports ────────────────────────────────────────────────────────

interface BucketClock {
  readonly nowMicroseconds: () => number;
}

interface RateBucketDeps {
  readonly clock: BucketClock;
}

// ── Types ────────────────────────────────────────────────────────

interface BucketConfig {
  readonly capacity: number;
  readonly refillRatePerSecond: number;
}

interface BucketState {
  readonly key: string;
  tokens: number;
  lastRefillAt: number;
  readonly capacity: number;
  readonly refillRatePerSecond: number;
}

interface ConsumeResult {
  readonly allowed: boolean;
  readonly remainingTokens: number;
  readonly retryAfterMicro: number;
}

interface RateBucketStats {
  readonly totalBuckets: number;
  readonly totalConsumed: number;
  readonly totalRejected: number;
}

interface RateBucketService {
  readonly configure: (key: string, config: BucketConfig) => void;
  readonly consume: (key: string, tokens?: number) => ConsumeResult;
  readonly peek: (key: string) => number;
  readonly reset: (key: string) => boolean;
  readonly remove: (key: string) => boolean;
  readonly getStats: () => RateBucketStats;
}

// ── Constants ────────────────────────────────────────────────────

const MICROSECONDS_PER_SECOND = 1_000_000;

// ── Internal State ───────────────────────────────────────────────

interface ServiceState {
  readonly deps: RateBucketDeps;
  readonly buckets: Map<string, BucketState>;
  totalConsumed: number;
  totalRejected: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function refill(bucket: BucketState, now: number): void {
  const elapsedMicro = now - bucket.lastRefillAt;
  if (elapsedMicro <= 0) return;
  const elapsedSeconds = elapsedMicro / MICROSECONDS_PER_SECOND;
  const newTokens = elapsedSeconds * bucket.refillRatePerSecond;
  bucket.tokens = Math.min(bucket.capacity, bucket.tokens + newTokens);
  bucket.lastRefillAt = now;
}

function microUntilTokens(bucket: BucketState, needed: number): number {
  if (bucket.tokens >= needed) return 0;
  const deficit = needed - bucket.tokens;
  return Math.ceil((deficit / bucket.refillRatePerSecond) * MICROSECONDS_PER_SECOND);
}

// ── Operations ───────────────────────────────────────────────────

function configureImpl(state: ServiceState, key: string, config: BucketConfig): void {
  const now = state.deps.clock.nowMicroseconds();
  state.buckets.set(key, {
    key,
    tokens: config.capacity,
    lastRefillAt: now,
    capacity: config.capacity,
    refillRatePerSecond: config.refillRatePerSecond,
  });
}

function consumeImpl(state: ServiceState, key: string, tokens: number): ConsumeResult {
  const bucket = state.buckets.get(key);
  if (!bucket) {
    state.totalRejected++;
    return { allowed: false, remainingTokens: 0, retryAfterMicro: 0 };
  }
  const now = state.deps.clock.nowMicroseconds();
  refill(bucket, now);
  if (bucket.tokens >= tokens) {
    bucket.tokens -= tokens;
    state.totalConsumed++;
    return { allowed: true, remainingTokens: bucket.tokens, retryAfterMicro: 0 };
  }
  state.totalRejected++;
  return {
    allowed: false,
    remainingTokens: bucket.tokens,
    retryAfterMicro: microUntilTokens(bucket, tokens),
  };
}

function peekImpl(state: ServiceState, key: string): number {
  const bucket = state.buckets.get(key);
  if (!bucket) return 0;
  refill(bucket, state.deps.clock.nowMicroseconds());
  return bucket.tokens;
}

function getStatsImpl(state: ServiceState): RateBucketStats {
  return {
    totalBuckets: state.buckets.size,
    totalConsumed: state.totalConsumed,
    totalRejected: state.totalRejected,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createRateBucketService(deps: RateBucketDeps): RateBucketService {
  const state: ServiceState = {
    deps,
    buckets: new Map(),
    totalConsumed: 0,
    totalRejected: 0,
  };
  return {
    configure: (k, c) => {
      configureImpl(state, k, c);
    },
    consume: (k, t) => consumeImpl(state, k, t ?? 1),
    peek: (k) => peekImpl(state, k),
    reset: (k) => {
      const b = state.buckets.get(k);
      if (!b) return false;
      b.tokens = b.capacity;
      return true;
    },
    remove: (k) => state.buckets.delete(k),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createRateBucketService, MICROSECONDS_PER_SECOND };
export type { RateBucketService, RateBucketDeps, BucketConfig, ConsumeResult, RateBucketStats };
