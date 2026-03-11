/**
 * Rate Limiter System — Token bucket rate limiting per entity/endpoint.
 *
 * One bucket per (entityId, endpoint) pair. Tokens refill continuously
 * based on elapsed microseconds since the last refill. Requests are allowed
 * only when enough tokens are available; denied requests include a precise
 * retryAfterUs to tell callers how long to back off.
 *
 * "The Dye House controls the flow. Too fast, and the dye runs."
 *
 * Fabric: dye-house
 * Thread tier: 1
 */

// ─── Port Interfaces ─────────────────────────────────────────────────────────

interface RateLimiterClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface RateLimiterIdGenPort {
  readonly next: () => string;
}

interface RateLimiterLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type BucketId = string;

export type RateLimitError =
  | 'bucket-not-found'
  | 'invalid-capacity'
  | 'invalid-refill-rate'
  | 'already-exists';

export interface TokenBucket {
  readonly bucketId: BucketId;
  readonly entityId: string;
  readonly endpoint: string;
  readonly capacity: number;
  tokensAvailable: number;
  readonly refillRatePerSecond: number;
  lastRefillAt: bigint;
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly tokensRemaining: number;
  readonly retryAfterUs: bigint;
}

export interface RateLimiterStats {
  readonly totalBuckets: number;
  readonly totalAllowed: number;
  readonly totalDenied: number;
}

// ─── System Interface ─────────────────────────────────────────────────────────

export interface RateLimiterSystem {
  createBucket(
    entityId: string,
    endpoint: string,
    capacity: number,
    refillRatePerSecond: number,
  ): TokenBucket | RateLimitError;
  checkLimit(bucketId: BucketId, tokensNeeded?: number): RateLimitDecision | RateLimitError;
  refillBuckets(): number;
  resetBucket(bucketId: BucketId): { success: true } | { success: false; error: RateLimitError };
  deleteBucket(bucketId: BucketId): { success: true } | { success: false; error: RateLimitError };
  getBucket(bucketId: BucketId): TokenBucket | undefined;
  getStats(): RateLimiterStats;
}

// ─── Deps ────────────────────────────────────────────────────────────────────

export interface RateLimiterSystemDeps {
  readonly clock: RateLimiterClockPort;
  readonly idGen: RateLimiterIdGenPort;
  readonly logger: RateLimiterLoggerPort;
}

// ─── State ───────────────────────────────────────────────────────────────────

interface SystemState {
  readonly buckets: Map<BucketId, TokenBucket>;
  readonly pairIndex: Map<string, BucketId>;
  totalAllowed: number;
  totalDenied: number;
  readonly deps: RateLimiterSystemDeps;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createRateLimiterSystem(deps: RateLimiterSystemDeps): RateLimiterSystem {
  const state: SystemState = {
    buckets: new Map(),
    pairIndex: new Map(),
    totalAllowed: 0,
    totalDenied: 0,
    deps,
  };

  return {
    createBucket: (entityId, endpoint, capacity, refillRatePerSecond) =>
      createBucketImpl(state, entityId, endpoint, capacity, refillRatePerSecond),
    checkLimit: (bucketId, tokensNeeded) => checkLimitImpl(state, bucketId, tokensNeeded ?? 1),
    refillBuckets: () => refillBucketsImpl(state),
    resetBucket: (bucketId) => resetBucketImpl(state, bucketId),
    deleteBucket: (bucketId) => deleteBucketImpl(state, bucketId),
    getBucket: (bucketId) => state.buckets.get(bucketId),
    getStats: () => getStatsImpl(state),
  };
}

// ─── Create Bucket ───────────────────────────────────────────────────────────

function createBucketImpl(
  state: SystemState,
  entityId: string,
  endpoint: string,
  capacity: number,
  refillRatePerSecond: number,
): TokenBucket | RateLimitError {
  if (capacity < 1) return 'invalid-capacity';
  if (refillRatePerSecond <= 0) return 'invalid-refill-rate';

  const pairKey = pairIndexKey(entityId, endpoint);
  if (state.pairIndex.has(pairKey)) return 'already-exists';

  const bucketId = state.deps.idGen.next();
  const now = state.deps.clock.nowMicroseconds();
  const bucket: TokenBucket = {
    bucketId,
    entityId,
    endpoint,
    capacity,
    tokensAvailable: capacity,
    refillRatePerSecond,
    lastRefillAt: now,
  };

  state.buckets.set(bucketId, bucket);
  state.pairIndex.set(pairKey, bucketId);
  state.deps.logger.info('bucket-created', { bucketId, entityId, endpoint });
  return bucket;
}

// ─── Check Limit ─────────────────────────────────────────────────────────────

function checkLimitImpl(
  state: SystemState,
  bucketId: BucketId,
  tokensNeeded: number,
): RateLimitDecision | RateLimitError {
  const bucket = state.buckets.get(bucketId);
  if (bucket === undefined) return 'bucket-not-found';

  applyRefill(bucket, state.deps.clock.nowMicroseconds());

  if (bucket.tokensAvailable >= tokensNeeded) {
    bucket.tokensAvailable -= tokensNeeded;
    state.totalAllowed += 1;
    return { allowed: true, tokensRemaining: bucket.tokensAvailable, retryAfterUs: 0n };
  }

  state.totalDenied += 1;
  const tokensShort = tokensNeeded - bucket.tokensAvailable;
  const retryAfterUs = BigInt(Math.ceil((tokensShort / bucket.refillRatePerSecond) * 1_000_000));
  return { allowed: false, tokensRemaining: bucket.tokensAvailable, retryAfterUs };
}

// ─── Refill All Buckets ──────────────────────────────────────────────────────

function refillBucketsImpl(state: SystemState): number {
  const now = state.deps.clock.nowMicroseconds();
  let count = 0;
  for (const bucket of state.buckets.values()) {
    applyRefill(bucket, now);
    count += 1;
  }
  return count;
}

// ─── Reset Bucket ────────────────────────────────────────────────────────────

function resetBucketImpl(
  state: SystemState,
  bucketId: BucketId,
): { success: true } | { success: false; error: RateLimitError } {
  const bucket = state.buckets.get(bucketId);
  if (bucket === undefined) return { success: false, error: 'bucket-not-found' };
  bucket.tokensAvailable = bucket.capacity;
  bucket.lastRefillAt = state.deps.clock.nowMicroseconds();
  return { success: true };
}

// ─── Delete Bucket ───────────────────────────────────────────────────────────

function deleteBucketImpl(
  state: SystemState,
  bucketId: BucketId,
): { success: true } | { success: false; error: RateLimitError } {
  const bucket = state.buckets.get(bucketId);
  if (bucket === undefined) return { success: false, error: 'bucket-not-found' };
  state.buckets.delete(bucketId);
  state.pairIndex.delete(pairIndexKey(bucket.entityId, bucket.endpoint));
  return { success: true };
}

// ─── Stats ───────────────────────────────────────────────────────────────────

function getStatsImpl(state: SystemState): RateLimiterStats {
  return {
    totalBuckets: state.buckets.size,
    totalAllowed: state.totalAllowed,
    totalDenied: state.totalDenied,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pairIndexKey(entityId: string, endpoint: string): string {
  return entityId + '::' + endpoint;
}

function applyRefill(bucket: TokenBucket, now: bigint): void {
  const elapsedUs = now - bucket.lastRefillAt;
  if (elapsedUs <= 0n) return;
  const elapsedSeconds = Number(elapsedUs) / 1_000_000;
  const tokensToAdd = elapsedSeconds * bucket.refillRatePerSecond;
  bucket.tokensAvailable = Math.min(bucket.capacity, bucket.tokensAvailable + tokensToAdd);
  bucket.lastRefillAt = now;
}
