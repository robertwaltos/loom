import { describe, it, expect } from 'vitest';
import { createRateBucketService, MICROSECONDS_PER_SECOND } from '../rate-bucket.js';
import type { RateBucketDeps } from '../rate-bucket.js';

function createDeps(startTime = 0): { deps: RateBucketDeps; advance: (micro: number) => void } {
  let time = startTime;
  return {
    deps: { clock: { nowMicroseconds: () => time } },
    advance: (micro: number) => { time += micro; },
  };
}

describe('RateBucketService — configure / consume', () => {
  it('allows requests within capacity', () => {
    const { deps } = createDeps();
    const svc = createRateBucketService(deps);
    svc.configure('user-1', { capacity: 10, refillRatePerSecond: 1 });
    const result = svc.consume('user-1');
    expect(result.allowed).toBe(true);
    expect(result.remainingTokens).toBe(9);
  });

  it('rejects requests when tokens depleted', () => {
    const { deps } = createDeps();
    const svc = createRateBucketService(deps);
    svc.configure('user-1', { capacity: 2, refillRatePerSecond: 1 });
    svc.consume('user-1');
    svc.consume('user-1');
    const result = svc.consume('user-1');
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMicro).toBeGreaterThan(0);
  });

  it('rejects consume for unconfigured key', () => {
    const { deps } = createDeps();
    const svc = createRateBucketService(deps);
    const result = svc.consume('unknown');
    expect(result.allowed).toBe(false);
    expect(result.remainingTokens).toBe(0);
  });

  it('consumes multiple tokens at once', () => {
    const { deps } = createDeps();
    const svc = createRateBucketService(deps);
    svc.configure('user-1', { capacity: 10, refillRatePerSecond: 1 });
    const result = svc.consume('user-1', 5);
    expect(result.allowed).toBe(true);
    expect(result.remainingTokens).toBe(5);
  });
});

describe('RateBucketService — refill', () => {
  it('refills tokens over time', () => {
    const { deps, advance } = createDeps();
    const svc = createRateBucketService(deps);
    svc.configure('user-1', { capacity: 10, refillRatePerSecond: 5 });
    // Drain all tokens
    svc.consume('user-1', 10);
    expect(svc.peek('user-1')).toBe(0);
    // Advance 1 second — should refill 5 tokens
    advance(MICROSECONDS_PER_SECOND);
    expect(svc.peek('user-1')).toBe(5);
  });

  it('does not exceed capacity on refill', () => {
    const { deps, advance } = createDeps();
    const svc = createRateBucketService(deps);
    svc.configure('user-1', { capacity: 10, refillRatePerSecond: 100 });
    svc.consume('user-1', 5);
    advance(MICROSECONDS_PER_SECOND * 10);
    expect(svc.peek('user-1')).toBe(10);
  });
});

describe('RateBucketService — peek / reset / remove', () => {
  it('peek returns zero for unknown key', () => {
    const { deps } = createDeps();
    const svc = createRateBucketService(deps);
    expect(svc.peek('nope')).toBe(0);
  });

  it('reset restores tokens to capacity', () => {
    const { deps } = createDeps();
    const svc = createRateBucketService(deps);
    svc.configure('user-1', { capacity: 10, refillRatePerSecond: 1 });
    svc.consume('user-1', 8);
    expect(svc.reset('user-1')).toBe(true);
    expect(svc.peek('user-1')).toBe(10);
  });

  it('reset returns false for unknown key', () => {
    const { deps } = createDeps();
    const svc = createRateBucketService(deps);
    expect(svc.reset('nope')).toBe(false);
  });

  it('remove deletes a bucket', () => {
    const { deps } = createDeps();
    const svc = createRateBucketService(deps);
    svc.configure('user-1', { capacity: 10, refillRatePerSecond: 1 });
    expect(svc.remove('user-1')).toBe(true);
    expect(svc.peek('user-1')).toBe(0);
  });
});

describe('RateBucketService — getStats', () => {
  it('tracks consumed and rejected counts', () => {
    const { deps } = createDeps();
    const svc = createRateBucketService(deps);
    svc.configure('user-1', { capacity: 2, refillRatePerSecond: 0 });
    svc.consume('user-1');
    svc.consume('user-1');
    svc.consume('user-1'); // rejected

    const stats = svc.getStats();
    expect(stats.totalBuckets).toBe(1);
    expect(stats.totalConsumed).toBe(2);
    expect(stats.totalRejected).toBe(1);
  });
});
