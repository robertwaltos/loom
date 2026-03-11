import { describe, it, expect } from 'vitest';
import { createRateLimiterSystem } from '../rate-limiter-system.js';
import type { RateLimiterSystem, TokenBucket, RateLimitDecision } from '../rate-limiter-system.js';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

let idCounter = 0;

function createTestSystem(): {
  system: RateLimiterSystem;
  advanceTime: (us: bigint) => void;
} {
  let now = 1_000_000n;
  return {
    system: createRateLimiterSystem({
      clock: { nowMicroseconds: () => now },
      idGen: { next: () => 'bucket-' + String(++idCounter) },
      logger: {
        info: () => undefined,
        warn: () => undefined,
      },
    }),
    advanceTime(us: bigint) {
      now += us;
    },
  };
}

function asBucket(r: TokenBucket | string): TokenBucket {
  if (typeof r === 'string') throw new Error('Expected TokenBucket, got error: ' + r);
  return r;
}

function asDecision(r: RateLimitDecision | string): RateLimitDecision {
  if (typeof r === 'string') throw new Error('Expected RateLimitDecision, got error: ' + r);
  return r;
}

// ─── createBucket ─────────────────────────────────────────────────────────────

describe('createBucket', () => {
  it('creates a bucket with full tokens', () => {
    const { system } = createTestSystem();
    const bucket = asBucket(system.createBucket('entity-1', '/api/v1', 10, 2));
    expect(bucket.capacity).toBe(10);
    expect(bucket.tokensAvailable).toBe(10);
    expect(bucket.refillRatePerSecond).toBe(2);
    expect(bucket.entityId).toBe('entity-1');
    expect(bucket.endpoint).toBe('/api/v1');
  });

  it('returns invalid-capacity for capacity < 1', () => {
    const { system } = createTestSystem();
    expect(system.createBucket('entity-1', '/api', 0, 1)).toBe('invalid-capacity');
  });

  it('returns invalid-refill-rate for rate = 0', () => {
    const { system } = createTestSystem();
    expect(system.createBucket('entity-1', '/api', 10, 0)).toBe('invalid-refill-rate');
  });

  it('returns invalid-refill-rate for negative rate', () => {
    const { system } = createTestSystem();
    expect(system.createBucket('entity-1', '/api2', 10, -1)).toBe('invalid-refill-rate');
  });

  it('returns already-exists for duplicate (entityId, endpoint) pair', () => {
    const { system } = createTestSystem();
    system.createBucket('entity-1', '/api', 5, 1);
    expect(system.createBucket('entity-1', '/api', 5, 1)).toBe('already-exists');
  });

  it('allows same entityId with different endpoint', () => {
    const { system } = createTestSystem();
    system.createBucket('entity-1', '/api/a', 5, 1);
    const r2 = system.createBucket('entity-1', '/api/b', 5, 1);
    expect(typeof r2).not.toBe('string');
  });
});

// ─── checkLimit ──────────────────────────────────────────────────────────────

describe('checkLimit — allowed', () => {
  it('allows request and deducts token', () => {
    const { system } = createTestSystem();
    const bucket = asBucket(system.createBucket('entity-1', '/api', 5, 1));
    const decision = asDecision(system.checkLimit(bucket.bucketId));
    expect(decision.allowed).toBe(true);
    expect(decision.tokensRemaining).toBe(4);
    expect(decision.retryAfterUs).toBe(0n);
  });

  it('respects tokensNeeded > 1', () => {
    const { system } = createTestSystem();
    const bucket = asBucket(system.createBucket('e', '/ep', 3, 1));
    const decision = asDecision(system.checkLimit(bucket.bucketId, 2));
    expect(decision.allowed).toBe(true);
    expect(decision.tokensRemaining).toBe(1);
  });

  it('refills tokens based on elapsed time before checking', () => {
    const { system, advanceTime } = createTestSystem();
    const bucket = asBucket(system.createBucket('e', '/ep', 5, 2));
    for (let i = 0; i < 5; i++) system.checkLimit(bucket.bucketId);
    const denied = asDecision(system.checkLimit(bucket.bucketId));
    expect(denied.allowed).toBe(false);
    advanceTime(1_000_000n); // 1 second → 2 tokens refilled
    const allowed = asDecision(system.checkLimit(bucket.bucketId));
    expect(allowed.allowed).toBe(true);
  });
});

describe('checkLimit — denied', () => {
  it('denies when insufficient tokens', () => {
    const { system } = createTestSystem();
    const bucket = asBucket(system.createBucket('entity-1', '/api', 2, 1));
    system.checkLimit(bucket.bucketId);
    system.checkLimit(bucket.bucketId);
    const decision = asDecision(system.checkLimit(bucket.bucketId));
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterUs).toBeGreaterThan(0n);
  });

  it('returns bucket-not-found for unknown id', () => {
    const { system } = createTestSystem();
    expect(system.checkLimit('nonexistent')).toBe('bucket-not-found');
  });
});

// ─── refillBuckets ───────────────────────────────────────────────────────────

describe('refillBuckets', () => {
  it('returns count of buckets refilled', () => {
    const { system } = createTestSystem();
    system.createBucket('e1', '/a', 5, 1);
    system.createBucket('e2', '/b', 5, 1);
    expect(system.refillBuckets()).toBe(2);
  });

  it('caps refilled tokens at capacity', () => {
    const { system, advanceTime } = createTestSystem();
    const bucket = asBucket(system.createBucket('e', '/ep', 3, 100));
    system.checkLimit(bucket.bucketId); // consume 1
    advanceTime(10_000_000n); // 10s → would add 1000 tokens but capped at 3
    system.refillBuckets();
    const stored = system.getBucket(bucket.bucketId);
    expect(stored?.tokensAvailable).toBe(3);
  });
});

// ─── resetBucket ─────────────────────────────────────────────────────────────

describe('resetBucket', () => {
  it('resets tokens to capacity', () => {
    const { system } = createTestSystem();
    const bucket = asBucket(system.createBucket('e', '/ep', 5, 1));
    system.checkLimit(bucket.bucketId);
    system.checkLimit(bucket.bucketId);
    system.resetBucket(bucket.bucketId);
    expect(system.getBucket(bucket.bucketId)?.tokensAvailable).toBe(5);
  });

  it('returns bucket-not-found for unknown id', () => {
    const { system } = createTestSystem();
    const r = system.resetBucket('bad-id');
    expect(r).toEqual({ success: false, error: 'bucket-not-found' });
  });
});

// ─── deleteBucket ────────────────────────────────────────────────────────────

describe('deleteBucket', () => {
  it('removes the bucket', () => {
    const { system } = createTestSystem();
    const bucket = asBucket(system.createBucket('e', '/ep', 5, 1));
    system.deleteBucket(bucket.bucketId);
    expect(system.getBucket(bucket.bucketId)).toBeUndefined();
  });

  it('allows re-creating same pair after deletion', () => {
    const { system } = createTestSystem();
    const bucket = asBucket(system.createBucket('e', '/ep', 5, 1));
    system.deleteBucket(bucket.bucketId);
    expect(typeof system.createBucket('e', '/ep', 5, 1)).not.toBe('string');
  });

  it('returns bucket-not-found for unknown id', () => {
    const { system } = createTestSystem();
    expect(system.deleteBucket('bad-id')).toEqual({ success: false, error: 'bucket-not-found' });
  });
});

// ─── getStats ────────────────────────────────────────────────────────────────

describe('getStats', () => {
  it('tracks allowed and denied counts', () => {
    const { system } = createTestSystem();
    const bucket = asBucket(system.createBucket('e', '/ep', 2, 1));
    system.checkLimit(bucket.bucketId);
    system.checkLimit(bucket.bucketId);
    system.checkLimit(bucket.bucketId); // denied
    const stats = system.getStats();
    expect(stats.totalAllowed).toBe(2);
    expect(stats.totalDenied).toBe(1);
    expect(stats.totalBuckets).toBe(1);
  });
});
