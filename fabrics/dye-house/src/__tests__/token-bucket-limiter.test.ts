import { describe, it, expect } from 'vitest';
import { createTokenBucketLimiter } from '../token-bucket-limiter.js';
import type { TokenBucketLimiter, BucketRule, GlobalBucketRule } from '../token-bucket-limiter.js';

// ─── Helpers ────────────────────────────────────────────────────────

function createTestLimiter(rules: BucketRule[] = []): {
  limiter: TokenBucketLimiter;
  advanceTime: (ms: number) => void;
} {
  let time = 1000;
  const limiter = createTokenBucketLimiter({
    clock: { nowMilliseconds: () => time },
  });
  for (const r of rules) limiter.registerRule(r);
  return {
    limiter,
    advanceTime: (ms: number) => {
      time += ms;
    },
  };
}

const API_RULE: BucketRule = {
  name: 'api.request',
  capacity: 5,
  refillRate: 1,
  refillIntervalMs: 1000,
};

const TRADE_RULE: BucketRule = {
  name: 'trade.execute',
  capacity: 1,
  refillRate: 1,
  refillIntervalMs: 60000,
};

const GLOBAL_RULE: GlobalBucketRule = {
  name: 'global.api',
  capacity: 100,
  refillRate: 10,
  refillIntervalMs: 1000,
};

// ─── Rule Registration ──────────────────────────────────────────────

describe('TokenBucketLimiter rules', () => {
  it('registers a rule', () => {
    const { limiter } = createTestLimiter([API_RULE]);
    expect(limiter.getRuleCount()).toBe(1);
  });

  it('registers multiple rules', () => {
    const { limiter } = createTestLimiter([API_RULE, TRADE_RULE]);
    expect(limiter.getRuleCount()).toBe(2);
  });

  it('throws checking unregistered rule', () => {
    const { limiter } = createTestLimiter();
    expect(() => limiter.check('dyn-1', 'unknown')).toThrow('No rate limit rule');
  });
});

// ─── Check ──────────────────────────────────────────────────────────

describe('TokenBucketLimiter check', () => {
  it('shows full capacity on fresh bucket', () => {
    const { limiter } = createTestLimiter([API_RULE]);
    const result = limiter.check('dyn-1', 'api.request');
    expect(result.allowed).toBe(true);
    expect(result.tokensRemaining).toBe(5);
  });

  it('check does not consume tokens', () => {
    const { limiter } = createTestLimiter([API_RULE]);
    limiter.check('dyn-1', 'api.request');
    limiter.check('dyn-1', 'api.request');
    const result = limiter.check('dyn-1', 'api.request');
    expect(result.tokensRemaining).toBe(5);
  });
});

// ─── Consume ────────────────────────────────────────────────────────

describe('TokenBucketLimiter consume', () => {
  it('decrements tokens on consume', () => {
    const { limiter } = createTestLimiter([API_RULE]);
    limiter.consume('dyn-1', 'api.request');
    const result = limiter.check('dyn-1', 'api.request');
    expect(result.tokensRemaining).toBe(4);
  });

  it('denies when bucket empty', () => {
    const { limiter } = createTestLimiter([API_RULE]);
    for (let i = 0; i < 5; i++) limiter.consume('dyn-1', 'api.request');
    const result = limiter.consume('dyn-1', 'api.request');
    expect(result.allowed).toBe(false);
    expect(result.tokensRemaining).toBe(0);
  });

  it('provides retry-after when denied', () => {
    const { limiter } = createTestLimiter([API_RULE]);
    for (let i = 0; i < 5; i++) limiter.consume('dyn-1', 'api.request');
    const result = limiter.consume('dyn-1', 'api.request');
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('tracks dynasties independently', () => {
    const { limiter } = createTestLimiter([API_RULE]);
    for (let i = 0; i < 5; i++) limiter.consume('dyn-1', 'api.request');
    const r1 = limiter.consume('dyn-1', 'api.request');
    const r2 = limiter.consume('dyn-2', 'api.request');
    expect(r1.allowed).toBe(false);
    expect(r2.allowed).toBe(true);
  });

  it('tracks rules independently', () => {
    const { limiter } = createTestLimiter([API_RULE, TRADE_RULE]);
    limiter.consume('dyn-1', 'trade.execute');
    const tradeResult = limiter.consume('dyn-1', 'trade.execute');
    const apiResult = limiter.consume('dyn-1', 'api.request');
    expect(tradeResult.allowed).toBe(false);
    expect(apiResult.allowed).toBe(true);
  });
});

// ─── Token Refill ───────────────────────────────────────────────────

describe('TokenBucketLimiter token refill', () => {
  it('refills tokens after interval', () => {
    const { limiter, advanceTime } = createTestLimiter([API_RULE]);
    for (let i = 0; i < 5; i++) limiter.consume('dyn-1', 'api.request');
    advanceTime(1000);
    const result = limiter.check('dyn-1', 'api.request');
    expect(result.tokensRemaining).toBe(1);
    expect(result.allowed).toBe(true);
  });

  it('refills multiple tokens over time', () => {
    const { limiter, advanceTime } = createTestLimiter([API_RULE]);
    for (let i = 0; i < 5; i++) limiter.consume('dyn-1', 'api.request');
    advanceTime(3000);
    const result = limiter.check('dyn-1', 'api.request');
    expect(result.tokensRemaining).toBe(3);
  });

  it('does not exceed capacity on refill', () => {
    const { limiter, advanceTime } = createTestLimiter([API_RULE]);
    limiter.consume('dyn-1', 'api.request');
    advanceTime(100000);
    const result = limiter.check('dyn-1', 'api.request');
    expect(result.tokensRemaining).toBe(5);
  });

  it('burst allows initial spike', () => {
    const { limiter } = createTestLimiter([
      { name: 'burst', capacity: 10, refillRate: 1, refillIntervalMs: 1000 },
    ]);
    let allowed = 0;
    for (let i = 0; i < 15; i++) {
      const r = limiter.consume('dyn-1', 'burst');
      if (r.allowed) allowed += 1;
    }
    expect(allowed).toBe(10);
  });
});

// ─── Global Rate Limits ─────────────────────────────────────────────

describe('TokenBucketLimiter global limits', () => {
  it('registers and checks global rule', () => {
    const { limiter } = createTestLimiter();
    limiter.registerGlobalRule(GLOBAL_RULE);
    const result = limiter.checkGlobal('global.api');
    expect(result.allowed).toBe(true);
    expect(result.tokensRemaining).toBe(100);
  });

  it('consumes from global bucket', () => {
    const { limiter } = createTestLimiter();
    limiter.registerGlobalRule(GLOBAL_RULE);
    limiter.consumeGlobal('global.api');
    const result = limiter.checkGlobal('global.api');
    expect(result.tokensRemaining).toBe(99);
  });

  it('denies global when exhausted', () => {
    const { limiter } = createTestLimiter();
    limiter.registerGlobalRule({
      name: 'tight',
      capacity: 2,
      refillRate: 1,
      refillIntervalMs: 1000,
    });
    limiter.consumeGlobal('tight');
    limiter.consumeGlobal('tight');
    const result = limiter.consumeGlobal('tight');
    expect(result.allowed).toBe(false);
  });

  it('global is shared across all dynasties', () => {
    const { limiter } = createTestLimiter();
    limiter.registerGlobalRule({
      name: 'shared',
      capacity: 2,
      refillRate: 1,
      refillIntervalMs: 1000,
    });
    limiter.consumeGlobal('shared');
    limiter.consumeGlobal('shared');
    expect(limiter.consumeGlobal('shared').allowed).toBe(false);
  });

  it('throws on unknown global rule', () => {
    const { limiter } = createTestLimiter();
    expect(() => limiter.checkGlobal('unknown')).toThrow('No global rate limit rule');
  });
});

// ─── Reset ──────────────────────────────────────────────────────────

describe('TokenBucketLimiter reset', () => {
  it('resets specific dynasty-rule bucket', () => {
    const { limiter } = createTestLimiter([API_RULE]);
    for (let i = 0; i < 5; i++) limiter.consume('dyn-1', 'api.request');
    limiter.reset('dyn-1', 'api.request');
    expect(limiter.check('dyn-1', 'api.request').tokensRemaining).toBe(5);
  });

  it('resets all buckets for dynasty', () => {
    const { limiter } = createTestLimiter([API_RULE, TRADE_RULE]);
    limiter.consume('dyn-1', 'api.request');
    limiter.consume('dyn-1', 'trade.execute');
    limiter.resetAll('dyn-1');
    expect(limiter.check('dyn-1', 'api.request').tokensRemaining).toBe(5);
    expect(limiter.check('dyn-1', 'trade.execute').tokensRemaining).toBe(1);
  });

  it('reset does not affect other dynasties', () => {
    const { limiter } = createTestLimiter([API_RULE]);
    limiter.consume('dyn-1', 'api.request');
    limiter.consume('dyn-2', 'api.request');
    limiter.reset('dyn-1', 'api.request');
    expect(limiter.check('dyn-1', 'api.request').tokensRemaining).toBe(5);
    expect(limiter.check('dyn-2', 'api.request').tokensRemaining).toBe(4);
  });
});

// ─── Stats ──────────────────────────────────────────────────────────

describe('TokenBucketLimiter stats', () => {
  it('tracks allowed and denied counts', () => {
    const { limiter } = createTestLimiter([
      { name: 'tight', capacity: 1, refillRate: 1, refillIntervalMs: 10000 },
    ]);
    limiter.consume('dyn-1', 'tight');
    limiter.consume('dyn-1', 'tight');
    const stats = limiter.getStats();
    expect(stats.totalAllowed).toBe(1);
    expect(stats.totalDenied).toBe(1);
  });

  it('counts rules including global', () => {
    const { limiter } = createTestLimiter([API_RULE]);
    limiter.registerGlobalRule(GLOBAL_RULE);
    expect(limiter.getRuleCount()).toBe(2);
  });
});
