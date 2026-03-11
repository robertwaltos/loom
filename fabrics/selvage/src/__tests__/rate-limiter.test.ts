import { describe, it, expect } from 'vitest';
import {
  createRateLimiter,
  DEFAULT_RATE_LIMIT_CONFIG,
  MAX_TOKENS_DEFAULT,
  REFILL_INTERVAL_US,
} from '../rate-limiter.js';
import type { RateLimitDeps } from '../rate-limiter.js';

function createDeps(
  startUs = 0,
): RateLimitDeps & { advance: (us: number) => void; now: () => number } {
  let time = startUs;
  return {
    clock: { nowMicroseconds: () => time },
    advance(us: number) {
      time += us;
    },
    now() {
      return time;
    },
  };
}

// ── Constants ──────────────────────────────────────────────────

describe('rate-limiter constants', () => {
  it('exports default config with expected values', () => {
    expect(DEFAULT_RATE_LIMIT_CONFIG.strategy).toBe('TOKEN_BUCKET');
    expect(DEFAULT_RATE_LIMIT_CONFIG.maxTokens).toBe(MAX_TOKENS_DEFAULT);
    expect(DEFAULT_RATE_LIMIT_CONFIG.refillRate).toBe(10);
    expect(DEFAULT_RATE_LIMIT_CONFIG.refillIntervalUs).toBe(REFILL_INTERVAL_US);
  });

  it('MAX_TOKENS_DEFAULT is 100', () => {
    expect(MAX_TOKENS_DEFAULT).toBe(100);
  });

  it('REFILL_INTERVAL_US is 1 second in microseconds', () => {
    expect(REFILL_INTERVAL_US).toBe(1_000_000);
  });
});

// ── createBucket ─────────────────────────────────────────────

describe('rate-limiter createBucket', () => {
  it('creates a bucket with full tokens', () => {
    const deps = createDeps(1000);
    const limiter = createRateLimiter(deps);
    const bucket = limiter.createBucket('client-1');
    expect(bucket.clientId).toBe('client-1');
    expect(bucket.tokens).toBe(MAX_TOKENS_DEFAULT);
    expect(bucket.maxTokens).toBe(MAX_TOKENS_DEFAULT);
    expect(bucket.createdAt).toBe(1000);
  });

  it('returns existing bucket without overwriting', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps);
    limiter.createBucket('client-1');
    limiter.tryConsume('client-1', 10);
    const bucket = limiter.createBucket('client-1');
    expect(bucket.tokens).toBe(90);
  });

  it('accepts per-bucket config overrides', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps);
    const bucket = limiter.createBucket('client-1', { maxTokens: 50 });
    expect(bucket.maxTokens).toBe(50);
    expect(bucket.tokens).toBe(50);
  });
});

// ── tryConsume ───────────────────────────────────────────────

describe('rate-limiter tryConsume — allow and reject', () => {
  it('allows consumption when tokens are available', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps);
    limiter.createBucket('client-1');
    const result = limiter.tryConsume('client-1');
    expect(result.allowed).toBe(true);
    expect(result.remainingTokens).toBe(99);
    expect(result.retryAfterUs).toBe(0);
    expect(result.clientId).toBe('client-1');
  });

  it('allows consuming multiple tokens at once', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps);
    limiter.createBucket('client-1');
    const result = limiter.tryConsume('client-1', 50);
    expect(result.allowed).toBe(true);
    expect(result.remainingTokens).toBe(50);
  });

  it('rejects when insufficient tokens', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps, { maxTokens: 5, refillRate: 1 });
    limiter.createBucket('client-1');
    limiter.tryConsume('client-1', 5);
    const result = limiter.tryConsume('client-1', 1);
    expect(result.allowed).toBe(false);
    expect(result.remainingTokens).toBe(0);
    expect(result.retryAfterUs).toBeGreaterThan(0);
  });

  it('auto-creates bucket for unknown client', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps);
    const result = limiter.tryConsume('new-client');
    expect(result.allowed).toBe(true);
    expect(result.remainingTokens).toBe(99);
  });
});

describe('rate-limiter tryConsume — refill and retry', () => {
  it('refills tokens before consumption check', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps, {
      maxTokens: 10,
      refillRate: 5,
      refillIntervalUs: 1_000_000,
    });
    limiter.createBucket('client-1');
    limiter.tryConsume('client-1', 10);
    expect(limiter.getRemainingTokens('client-1')).toBe(0);
    deps.advance(1_000_000);
    const result = limiter.tryConsume('client-1', 3);
    expect(result.allowed).toBe(true);
    expect(result.remainingTokens).toBe(2);
  });

  it('provides retry-after for rejected requests', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps, {
      maxTokens: 2,
      refillRate: 1,
      refillIntervalUs: 500_000,
    });
    limiter.createBucket('client-1');
    limiter.tryConsume('client-1', 2);
    const result = limiter.tryConsume('client-1', 2);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterUs).toBe(1_000_000);
  });
});

// ── refill ──────────────────────────────────────────────────

describe('rate-limiter refill', () => {
  it('refills tokens based on elapsed time', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps, {
      maxTokens: 20,
      refillRate: 5,
      refillIntervalUs: 1_000_000,
    });
    limiter.createBucket('client-1');
    limiter.tryConsume('client-1', 15);
    deps.advance(2_000_000);
    const result = limiter.refill('client-1');
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.tokens).toBe(15);
    }
  });

  it('caps refill at maxTokens', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps, { maxTokens: 10, refillRate: 100 });
    limiter.createBucket('client-1');
    limiter.tryConsume('client-1', 5);
    deps.advance(10_000_000);
    const result = limiter.refill('client-1');
    if (typeof result !== 'string') {
      expect(result.tokens).toBe(10);
    }
  });

  it('returns error string for unknown bucket', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps);
    const result = limiter.refill('unknown');
    expect(result).toBe('BUCKET_NOT_FOUND');
  });

  it('does not refill when no intervals have elapsed', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps, {
      maxTokens: 10,
      refillRate: 5,
      refillIntervalUs: 1_000_000,
    });
    limiter.createBucket('client-1');
    limiter.tryConsume('client-1', 5);
    deps.advance(500_000);
    const result = limiter.refill('client-1');
    if (typeof result !== 'string') {
      expect(result.tokens).toBe(5);
    }
  });
});

// ── getRemainingTokens ──────────────────────────────────────

describe('rate-limiter getRemainingTokens', () => {
  it('returns current token count', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps);
    limiter.createBucket('client-1');
    expect(limiter.getRemainingTokens('client-1')).toBe(100);
  });

  it('returns 0 for unknown client', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps);
    expect(limiter.getRemainingTokens('unknown')).toBe(0);
  });

  it('triggers refill before returning', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps, {
      maxTokens: 10,
      refillRate: 5,
      refillIntervalUs: 1_000_000,
    });
    limiter.createBucket('client-1');
    limiter.tryConsume('client-1', 10);
    deps.advance(1_000_000);
    expect(limiter.getRemainingTokens('client-1')).toBe(5);
  });
});

// ── resetBucket ─────────────────────────────────────────────

describe('rate-limiter resetBucket', () => {
  it('restores bucket to full capacity', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps);
    limiter.createBucket('client-1');
    limiter.tryConsume('client-1', 80);
    const result = limiter.resetBucket('client-1');
    expect(typeof result).not.toBe('string');
    if (typeof result !== 'string') {
      expect(result.tokens).toBe(100);
    }
  });

  it('returns error for unknown bucket', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps);
    expect(limiter.resetBucket('unknown')).toBe('BUCKET_NOT_FOUND');
  });

  it('clears consumption statistics', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps);
    limiter.createBucket('client-1');
    limiter.tryConsume('client-1', 10);
    limiter.resetBucket('client-1');
    const state = limiter.getBucketState('client-1');
    expect(state).toBeDefined();
    expect(state?.totalConsumed).toBe(0);
    expect(state?.totalRejected).toBe(0);
  });
});

// ── removeBucket ────────────────────────────────────────────

describe('rate-limiter removeBucket', () => {
  it('removes an existing bucket', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps);
    limiter.createBucket('client-1');
    expect(limiter.removeBucket('client-1')).toBe(true);
    expect(limiter.getBucketState('client-1')).toBeUndefined();
  });

  it('returns false for unknown bucket', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps);
    expect(limiter.removeBucket('unknown')).toBe(false);
  });
});

// ── isThrottled ─────────────────────────────────────────────

describe('rate-limiter isThrottled', () => {
  it('returns false when tokens remain', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps);
    limiter.createBucket('client-1');
    expect(limiter.isThrottled('client-1')).toBe(false);
  });

  it('returns true when no tokens remain', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps, { maxTokens: 5 });
    limiter.createBucket('client-1');
    limiter.tryConsume('client-1', 5);
    expect(limiter.isThrottled('client-1')).toBe(true);
  });

  it('returns false for unknown client', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps);
    expect(limiter.isThrottled('unknown')).toBe(false);
  });

  it('accounts for refill before checking', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps, {
      maxTokens: 5,
      refillRate: 5,
      refillIntervalUs: 1_000_000,
    });
    limiter.createBucket('client-1');
    limiter.tryConsume('client-1', 5);
    expect(limiter.isThrottled('client-1')).toBe(true);
    deps.advance(1_000_000);
    expect(limiter.isThrottled('client-1')).toBe(false);
  });
});

// ── getRetryAfter ───────────────────────────────────────────

describe('rate-limiter getRetryAfter', () => {
  it('returns 0 when tokens are available', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps);
    limiter.createBucket('client-1');
    expect(limiter.getRetryAfter('client-1')).toBe(0);
  });

  it('returns time until next token when exhausted', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps, {
      maxTokens: 3,
      refillRate: 1,
      refillIntervalUs: 500_000,
    });
    limiter.createBucket('client-1');
    limiter.tryConsume('client-1', 3);
    expect(limiter.getRetryAfter('client-1')).toBe(500_000);
  });

  it('returns 0 for unknown client', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps);
    expect(limiter.getRetryAfter('unknown')).toBe(0);
  });
});

// ── sweepExpired ────────────────────────────────────────────

describe('rate-limiter sweepExpired', () => {
  it('removes idle buckets past expiration', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps, { idleExpirationUs: 5_000_000 });
    limiter.createBucket('client-1');
    limiter.createBucket('client-2');
    deps.advance(6_000_000);
    const removed = limiter.sweepExpired();
    expect(removed).toBe(2);
    expect(limiter.getStats().totalBuckets).toBe(0);
  });

  it('keeps active buckets', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps, { idleExpirationUs: 5_000_000 });
    limiter.createBucket('client-1');
    limiter.createBucket('client-2');
    deps.advance(3_000_000);
    limiter.tryConsume('client-1');
    deps.advance(3_000_000);
    const removed = limiter.sweepExpired();
    expect(removed).toBe(1);
    expect(limiter.getBucketState('client-1')).toBeDefined();
    expect(limiter.getBucketState('client-2')).toBeUndefined();
  });

  it('returns 0 when no buckets expired', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps);
    limiter.createBucket('client-1');
    expect(limiter.sweepExpired()).toBe(0);
  });
});

// ── getStats ────────────────────────────────────────────────

describe('rate-limiter getStats', () => {
  it('reports aggregate statistics', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps, { maxTokens: 5 });
    limiter.createBucket('client-1');
    limiter.createBucket('client-2');
    limiter.tryConsume('client-1', 3);
    limiter.tryConsume('client-2', 5);
    limiter.tryConsume('client-2', 1);
    const stats = limiter.getStats();
    expect(stats.totalBuckets).toBe(2);
    expect(stats.totalConsumed).toBe(8);
    expect(stats.totalRejected).toBe(1);
    expect(stats.throttledClients).toBe(1);
  });

  it('returns zeros when empty', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps);
    const stats = limiter.getStats();
    expect(stats.totalBuckets).toBe(0);
    expect(stats.totalConsumed).toBe(0);
    expect(stats.totalRejected).toBe(0);
    expect(stats.throttledClients).toBe(0);
  });
});

// ── getBucketState ──────────────────────────────────────────

describe('rate-limiter getBucketState', () => {
  it('returns full bucket state', () => {
    const deps = createDeps(5000);
    const limiter = createRateLimiter(deps);
    limiter.createBucket('client-1');
    limiter.tryConsume('client-1', 10);
    const state = limiter.getBucketState('client-1');
    expect(state).toBeDefined();
    expect(state?.clientId).toBe('client-1');
    expect(state?.tokens).toBe(90);
    expect(state?.totalConsumed).toBe(10);
    expect(state?.createdAt).toBe(5000);
  });

  it('returns undefined for unknown client', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps);
    expect(limiter.getBucketState('unknown')).toBeUndefined();
  });
});

// ── Edge cases ──────────────────────────────────────────────

describe('rate-limiter edge cases', () => {
  it('handles rapid burst consumption', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps, { maxTokens: 10 });
    limiter.createBucket('client-1');
    for (let i = 0; i < 10; i++) {
      expect(limiter.tryConsume('client-1').allowed).toBe(true);
    }
    expect(limiter.tryConsume('client-1').allowed).toBe(false);
  });

  it('handles multiple independent clients', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps, { maxTokens: 5 });
    limiter.createBucket('a');
    limiter.createBucket('b');
    limiter.tryConsume('a', 5);
    expect(limiter.isThrottled('a')).toBe(true);
    expect(limiter.isThrottled('b')).toBe(false);
  });

  it('handles global config override at creation', () => {
    const deps = createDeps();
    const limiter = createRateLimiter(deps, { maxTokens: 20, refillRate: 2 });
    limiter.createBucket('client-1');
    const state = limiter.getBucketState('client-1');
    expect(state?.maxTokens).toBe(20);
  });
});
