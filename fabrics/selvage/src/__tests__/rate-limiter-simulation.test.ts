import { describe, it, expect } from 'vitest';
import { createRateLimiter, DEFAULT_RATE_LIMIT_CONFIG, MAX_TOKENS_DEFAULT, REFILL_INTERVAL_US } from '../rate-limiter.js';

function makeLimiter(start = 0) {
  let time = start;
  return {
    limiter: createRateLimiter({ clock: { nowMicroseconds: () => time } }),
    advance: (us: number) => { time += us; },
  };
}

describe('Rate Limiter Simulation', () => {
  it('creates buckets and allows token consumption', () => {
    const { limiter } = makeLimiter();

    limiter.createBucket('client-A');
    const r = limiter.tryConsume('client-A', 1);
    expect(r.allowed).toBe(true);
    expect(r.remainingTokens).toBe(MAX_TOKENS_DEFAULT - 1);
  });

  it('blocks consumption when tokens are exhausted', () => {
    const { limiter } = makeLimiter();

    limiter.createBucket('client-B', { maxTokens: 3 });
    limiter.tryConsume('client-B', 3);

    const r = limiter.tryConsume('client-B', 1);
    expect(r.allowed).toBe(false);
  });

  it('refills tokens after the interval passes', () => {
    const { limiter, advance } = makeLimiter(0);

    limiter.createBucket('client-C', { maxTokens: 5 });
    limiter.tryConsume('client-C', 5);

    let r = limiter.tryConsume('client-C', 1);
    expect(r.allowed).toBe(false);

    advance(REFILL_INTERVAL_US);
    limiter.refill('client-C');

    r = limiter.tryConsume('client-C', 1);
    expect(r.allowed).toBe(true);
  });

  it('removes buckets', () => {
    const { limiter } = makeLimiter();

    limiter.createBucket('client-D');
    limiter.removeBucket('client-D');

    expect(limiter.getBucketState('client-D')).toBeUndefined();
  });

  it('lists all buckets', () => {
    const { limiter } = makeLimiter();

    limiter.createBucket('client-E');
    limiter.createBucket('client-F');

    const stats = limiter.getStats();
    expect(stats.totalBuckets).toBe(2);
  });

  it('exposes DEFAULT_RATE_LIMIT_CONFIG', () => {
    expect(DEFAULT_RATE_LIMIT_CONFIG).toBeDefined();
    expect(DEFAULT_RATE_LIMIT_CONFIG.maxTokens).toBeGreaterThan(0);
  });
});
