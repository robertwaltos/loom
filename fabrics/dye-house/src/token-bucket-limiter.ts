/**
 * Rate Limiter — Token bucket algorithm with burst and global limits.
 *
 * Features:
 *   - Token bucket algorithm (smooth rate control)
 *   - Named rate limiters (per API endpoint)
 *   - Per-dynasty rate limits
 *   - Global rate limits (across all identities)
 *   - Burst allowance (initial token capacity)
 *   - Rate limit status queries
 *   - Sliding window tracking with token refill
 *
 * Token Bucket: Each bucket holds N tokens. Tokens refill at a
 * fixed rate. Each request consumes one token. When empty, requests
 * are denied until tokens refill. Burst capacity allows short spikes.
 *
 * "The Dye House controls the flow. Too fast, and the dye runs."
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface BucketRule {
  readonly name: string;
  readonly capacity: number;
  readonly refillRate: number;
  readonly refillIntervalMs: number;
}

export interface BucketStatus {
  readonly allowed: boolean;
  readonly tokensRemaining: number;
  readonly capacity: number;
  readonly retryAfterMs: number;
}

export interface BucketLimiterStats {
  readonly ruleCount: number;
  readonly bucketCount: number;
  readonly totalAllowed: number;
  readonly totalDenied: number;
}

export interface GlobalBucketRule {
  readonly name: string;
  readonly capacity: number;
  readonly refillRate: number;
  readonly refillIntervalMs: number;
}

// ─── Ports ──────────────────────────────────────────────────────────

export interface BucketLimiterDeps {
  readonly clock: { nowMilliseconds(): number };
}

// ─── Public Interface ───────────────────────────────────────────────

export interface TokenBucketLimiter {
  readonly registerRule: (rule: BucketRule) => void;
  readonly registerGlobalRule: (rule: GlobalBucketRule) => void;
  readonly check: (dynastyId: string, ruleName: string) => BucketStatus;
  readonly consume: (dynastyId: string, ruleName: string) => BucketStatus;
  readonly checkGlobal: (ruleName: string) => BucketStatus;
  readonly consumeGlobal: (ruleName: string) => BucketStatus;
  readonly reset: (dynastyId: string, ruleName: string) => void;
  readonly resetAll: (dynastyId: string) => void;
  readonly getStatus: (dynastyId: string, ruleName: string) => BucketStatus;
  readonly getRuleCount: () => number;
  readonly getStats: () => BucketLimiterStats;
}

// ─── Internal State ─────────────────────────────────────────────────

interface Bucket {
  tokens: number;
  readonly capacity: number;
  lastRefillAt: number;
  readonly refillRate: number;
  readonly refillIntervalMs: number;
}

interface LimiterState {
  readonly rules: Map<string, BucketRule>;
  readonly globalRules: Map<string, GlobalBucketRule>;
  readonly buckets: Map<string, Bucket>;
  readonly globalBuckets: Map<string, Bucket>;
  readonly deps: BucketLimiterDeps;
  totalAllowed: number;
  totalDenied: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createTokenBucketLimiter(deps: BucketLimiterDeps): TokenBucketLimiter {
  const state: LimiterState = {
    rules: new Map(),
    globalRules: new Map(),
    buckets: new Map(),
    globalBuckets: new Map(),
    deps,
    totalAllowed: 0,
    totalDenied: 0,
  };

  return {
    registerRule: (r) => {
      state.rules.set(r.name, r);
    },
    registerGlobalRule: (r) => {
      registerGlobalImpl(state, r);
    },
    check: (did, rn) => checkImpl(state, did, rn),
    consume: (did, rn) => consumeImpl(state, did, rn),
    checkGlobal: (rn) => checkGlobalImpl(state, rn),
    consumeGlobal: (rn) => consumeGlobalImpl(state, rn),
    reset: (did, rn) => {
      resetImpl(state, did, rn);
    },
    resetAll: (did) => {
      resetAllImpl(state, did);
    },
    getStatus: (did, rn) => checkImpl(state, did, rn),
    getRuleCount: () => state.rules.size + state.globalRules.size,
    getStats: () => computeStats(state),
  };
}

// ─── Global Rule ────────────────────────────────────────────────────

function registerGlobalImpl(state: LimiterState, rule: GlobalBucketRule): void {
  state.globalRules.set(rule.name, rule);
}

// ─── Per-Dynasty Check / Consume ────────────────────────────────────

function checkImpl(state: LimiterState, dynastyId: string, ruleName: string): BucketStatus {
  const rule = getRule(state, ruleName);
  const key = bucketKey(dynastyId, ruleName);
  const bucket = getOrCreateBucket(state, key, rule);
  refillBucket(state, bucket);
  return toBucketStatus(bucket);
}

function consumeImpl(state: LimiterState, dynastyId: string, ruleName: string): BucketStatus {
  const rule = getRule(state, ruleName);
  const key = bucketKey(dynastyId, ruleName);
  const bucket = getOrCreateBucket(state, key, rule);
  refillBucket(state, bucket);
  return tryConsume(state, bucket);
}

// ─── Global Check / Consume ─────────────────────────────────────────

function checkGlobalImpl(state: LimiterState, ruleName: string): BucketStatus {
  const rule = getGlobalRule(state, ruleName);
  const bucket = getOrCreateGlobalBucket(state, ruleName, rule);
  refillBucket(state, bucket);
  return toBucketStatus(bucket);
}

function consumeGlobalImpl(state: LimiterState, ruleName: string): BucketStatus {
  const rule = getGlobalRule(state, ruleName);
  const bucket = getOrCreateGlobalBucket(state, ruleName, rule);
  refillBucket(state, bucket);
  return tryConsume(state, bucket);
}

// ─── Token Bucket Logic ────────────────────────────────────────────

function refillBucket(state: LimiterState, bucket: Bucket): void {
  const now = state.deps.clock.nowMilliseconds();
  const elapsed = now - bucket.lastRefillAt;
  if (elapsed <= 0) return;

  const intervals = Math.floor(elapsed / bucket.refillIntervalMs);
  if (intervals <= 0) return;

  const tokensToAdd = intervals * bucket.refillRate;
  bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
  bucket.lastRefillAt = bucket.lastRefillAt + intervals * bucket.refillIntervalMs;
}

function tryConsume(state: LimiterState, bucket: Bucket): BucketStatus {
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    state.totalAllowed += 1;
    return {
      allowed: true,
      tokensRemaining: Math.floor(bucket.tokens),
      capacity: bucket.capacity,
      retryAfterMs: 0,
    };
  }
  state.totalDenied += 1;
  return toBucketStatusDenied(bucket);
}

function toBucketStatus(bucket: Bucket): BucketStatus {
  return {
    allowed: bucket.tokens >= 1,
    tokensRemaining: Math.floor(bucket.tokens),
    capacity: bucket.capacity,
    retryAfterMs: 0,
  };
}

function toBucketStatusDenied(bucket: Bucket): BucketStatus {
  const retryAfter = bucket.refillRate > 0 ? bucket.refillIntervalMs / bucket.refillRate : 0;
  return {
    allowed: false,
    tokensRemaining: 0,
    capacity: bucket.capacity,
    retryAfterMs: Math.ceil(retryAfter),
  };
}

// ─── Bucket Management ─────────────────────────────────────────────

function getOrCreateBucket(state: LimiterState, key: string, rule: BucketRule): Bucket {
  const existing = state.buckets.get(key);
  if (existing !== undefined) return existing;
  const bucket: Bucket = {
    tokens: rule.capacity,
    capacity: rule.capacity,
    lastRefillAt: state.deps.clock.nowMilliseconds(),
    refillRate: rule.refillRate,
    refillIntervalMs: rule.refillIntervalMs,
  };
  state.buckets.set(key, bucket);
  return bucket;
}

function getOrCreateGlobalBucket(
  state: LimiterState,
  name: string,
  rule: GlobalBucketRule,
): Bucket {
  const existing = state.globalBuckets.get(name);
  if (existing !== undefined) return existing;
  const bucket: Bucket = {
    tokens: rule.capacity,
    capacity: rule.capacity,
    lastRefillAt: state.deps.clock.nowMilliseconds(),
    refillRate: rule.refillRate,
    refillIntervalMs: rule.refillIntervalMs,
  };
  state.globalBuckets.set(name, bucket);
  return bucket;
}

// ─── Reset ──────────────────────────────────────────────────────────

function resetImpl(state: LimiterState, dynastyId: string, ruleName: string): void {
  state.buckets.delete(bucketKey(dynastyId, ruleName));
}

function resetAllImpl(state: LimiterState, dynastyId: string): void {
  const prefix = dynastyId + ':';
  const toDelete: string[] = [];
  for (const key of state.buckets.keys()) {
    if (key.startsWith(prefix)) toDelete.push(key);
  }
  for (const key of toDelete) state.buckets.delete(key);
}

// ─── Helpers ────────────────────────────────────────────────────────

function bucketKey(dynastyId: string, ruleName: string): string {
  return dynastyId + ':' + ruleName;
}

function getRule(state: LimiterState, name: string): BucketRule {
  const rule = state.rules.get(name);
  if (rule === undefined) {
    throw new Error('No rate limit rule: ' + name);
  }
  return rule;
}

function getGlobalRule(state: LimiterState, name: string): GlobalBucketRule {
  const rule = state.globalRules.get(name);
  if (rule === undefined) {
    throw new Error('No global rate limit rule: ' + name);
  }
  return rule;
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: LimiterState): BucketLimiterStats {
  return {
    ruleCount: state.rules.size + state.globalRules.size,
    bucketCount: state.buckets.size + state.globalBuckets.size,
    totalAllowed: state.totalAllowed,
    totalDenied: state.totalDenied,
  };
}
