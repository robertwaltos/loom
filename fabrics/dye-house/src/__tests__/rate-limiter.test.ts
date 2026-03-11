import { describe, it, expect } from 'vitest';
import { createRateLimiter } from '../rate-limiter.js';
import type { RateLimiter, RateLimitRule } from '../rate-limiter.js';

// ─── Test Helpers ───────────────────────────────────────────────────

const US_PER_SECOND = 1_000_000;

function createTestLimiter(
  rules: RateLimitRule[] = [],
  startTime = 1_000_000,
): { limiter: RateLimiter; advanceTime: (us: number) => void } {
  let currentTime = startTime;
  const limiter = createRateLimiter({
    clock: { nowMicroseconds: () => currentTime },
  });
  for (const rule of rules) {
    limiter.registerRule(rule);
  }
  return {
    limiter,
    advanceTime(us: number) {
      currentTime += us;
    },
  };
}

const API_RULE: RateLimitRule = {
  action: 'api.request',
  maxRequests: 3,
  windowMicroseconds: 10 * US_PER_SECOND,
};

const TRADE_RULE: RateLimitRule = {
  action: 'trade.execute',
  maxRequests: 1,
  windowMicroseconds: 60 * US_PER_SECOND,
};

// ─── Rule Registration ──────────────────────────────────────────────

describe('Rate limiter rules', () => {
  it('registers a rule', () => {
    const { limiter } = createTestLimiter([API_RULE]);
    expect(limiter.getRuleCount()).toBe(1);
  });

  it('registers multiple rules', () => {
    const { limiter } = createTestLimiter([API_RULE, TRADE_RULE]);
    expect(limiter.getRuleCount()).toBe(2);
  });

  it('throws when checking unregistered action', () => {
    const { limiter } = createTestLimiter();
    expect(() => limiter.check('dyn-1', 'unknown')).toThrow('No rate limit rule');
  });
});

// ─── Check ──────────────────────────────────────────────────────────

describe('Rate limiter check', () => {
  it('allows requests under limit', () => {
    const { limiter } = createTestLimiter([API_RULE]);
    const result = limiter.check('dyn-1', 'api.request');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(3);
  });

  it('check does not consume quota', () => {
    const { limiter } = createTestLimiter([API_RULE]);
    limiter.check('dyn-1', 'api.request');
    limiter.check('dyn-1', 'api.request');
    const result = limiter.check('dyn-1', 'api.request');
    expect(result.remaining).toBe(3);
  });
});

// ─── Consume ────────────────────────────────────────────────────────

describe('Rate limiter consume', () => {
  it('decrements remaining on consume', () => {
    const { limiter } = createTestLimiter([API_RULE]);
    const r1 = limiter.consume('dyn-1', 'api.request');
    expect(r1.remaining).toBe(2);
    const r2 = limiter.consume('dyn-1', 'api.request');
    expect(r2.remaining).toBe(1);
  });

  it('denies when at limit', () => {
    const { limiter } = createTestLimiter([API_RULE]);
    limiter.consume('dyn-1', 'api.request');
    limiter.consume('dyn-1', 'api.request');
    limiter.consume('dyn-1', 'api.request');
    const result = limiter.consume('dyn-1', 'api.request');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('provides retry-after when denied', () => {
    const { limiter } = createTestLimiter([API_RULE]);
    limiter.consume('dyn-1', 'api.request');
    limiter.consume('dyn-1', 'api.request');
    limiter.consume('dyn-1', 'api.request');
    const result = limiter.consume('dyn-1', 'api.request');
    expect(result.retryAfterMicroseconds).toBeGreaterThan(0);
  });

  it('tracks different identities independently', () => {
    const { limiter } = createTestLimiter([API_RULE]);
    limiter.consume('dyn-1', 'api.request');
    limiter.consume('dyn-1', 'api.request');
    limiter.consume('dyn-1', 'api.request');
    const r1 = limiter.consume('dyn-1', 'api.request');
    const r2 = limiter.consume('dyn-2', 'api.request');
    expect(r1.allowed).toBe(false);
    expect(r2.allowed).toBe(true);
  });

  it('tracks different actions independently', () => {
    const { limiter } = createTestLimiter([API_RULE, TRADE_RULE]);
    limiter.consume('dyn-1', 'trade.execute');
    const tradeResult = limiter.consume('dyn-1', 'trade.execute');
    const apiResult = limiter.consume('dyn-1', 'api.request');
    expect(tradeResult.allowed).toBe(false);
    expect(apiResult.allowed).toBe(true);
  });
});

// ─── Window Sliding ─────────────────────────────────────────────────

describe('Rate limiter sliding window', () => {
  it('recovers after window expires', () => {
    const { limiter, advanceTime } = createTestLimiter([API_RULE]);
    limiter.consume('dyn-1', 'api.request');
    limiter.consume('dyn-1', 'api.request');
    limiter.consume('dyn-1', 'api.request');
    // All 3 consumed, now advance past window
    advanceTime(11 * US_PER_SECOND);
    const result = limiter.consume('dyn-1', 'api.request');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('partially recovers as oldest requests expire', () => {
    const { limiter, advanceTime } = createTestLimiter([API_RULE]);
    limiter.consume('dyn-1', 'api.request'); // t=1s
    advanceTime(2 * US_PER_SECOND);
    limiter.consume('dyn-1', 'api.request'); // t=3s
    advanceTime(2 * US_PER_SECOND);
    limiter.consume('dyn-1', 'api.request'); // t=5s
    // At t=5s, all 3 consumed. Advance 6s to t=11s (first request at t=1s expires)
    advanceTime(6 * US_PER_SECOND);
    const result = limiter.check('dyn-1', 'api.request');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });
});

// ─── Reset ──────────────────────────────────────────────────────────

describe('Rate limiter reset', () => {
  it('resets specific identity-action pair', () => {
    const { limiter } = createTestLimiter([API_RULE]);
    limiter.consume('dyn-1', 'api.request');
    limiter.consume('dyn-1', 'api.request');
    limiter.reset('dyn-1', 'api.request');
    const result = limiter.check('dyn-1', 'api.request');
    expect(result.remaining).toBe(3);
  });

  it('resets all actions for identity', () => {
    const { limiter } = createTestLimiter([API_RULE, TRADE_RULE]);
    limiter.consume('dyn-1', 'api.request');
    limiter.consume('dyn-1', 'trade.execute');
    limiter.resetAll('dyn-1');
    expect(limiter.check('dyn-1', 'api.request').remaining).toBe(3);
    expect(limiter.check('dyn-1', 'trade.execute').remaining).toBe(1);
  });

  it('reset does not affect other identities', () => {
    const { limiter } = createTestLimiter([API_RULE]);
    limiter.consume('dyn-1', 'api.request');
    limiter.consume('dyn-2', 'api.request');
    limiter.reset('dyn-1', 'api.request');
    expect(limiter.check('dyn-1', 'api.request').remaining).toBe(3);
    expect(limiter.check('dyn-2', 'api.request').remaining).toBe(2);
  });
});

// ─── Cleanup ────────────────────────────────────────────────────────

describe('Rate limiter cleanup', () => {
  it('removes expired windows', () => {
    const { limiter, advanceTime } = createTestLimiter([API_RULE]);
    limiter.consume('dyn-1', 'api.request');
    advanceTime(20 * US_PER_SECOND);
    const cleaned = limiter.cleanup();
    expect(cleaned).toBe(1);
  });

  it('preserves active windows', () => {
    const { limiter } = createTestLimiter([API_RULE]);
    limiter.consume('dyn-1', 'api.request');
    const cleaned = limiter.cleanup();
    expect(cleaned).toBe(0);
  });
});
