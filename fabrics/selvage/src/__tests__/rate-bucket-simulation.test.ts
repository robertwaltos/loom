import { describe, it, expect } from 'vitest';
import { createRateBucketService, MICROSECONDS_PER_SECOND } from '../rate-bucket.js';

function makeService(start = 0) {
  let time = start;
  return {
    svc: createRateBucketService({ clock: { nowMicroseconds: () => time } }),
    advance: (us: number) => { time += us; },
  };
}

describe('Rate Bucket Simulation', () => {
  it('configures buckets and allows consumption within capacity', () => {
    const { svc } = makeService();

    svc.configure('api-calls', { capacity: 10, refillRatePerSecond: 2 });

    const r1 = svc.consume('api-calls', 3);
    expect(r1.allowed).toBe(true);
    expect(r1.remainingTokens).toBe(7);

    const r2 = svc.consume('api-calls', 5);
    expect(r2.allowed).toBe(true);
    expect(r2.remainingTokens).toBe(2);
  });

  it('rejects consumption when bucket is exhausted', () => {
    const { svc } = makeService();

    svc.configure('burst', { capacity: 5, refillRatePerSecond: 1 });
    svc.consume('burst', 5);

    const r = svc.consume('burst', 1);
    expect(r.allowed).toBe(false);
  });

  it('refills tokens over time', () => {
    const { svc, advance } = makeService();

    svc.configure('refillable', { capacity: 10, refillRatePerSecond: 5 });
    svc.consume('refillable', 10);

    let r = svc.consume('refillable', 1);
    expect(r.allowed).toBe(false);

    advance(MICROSECONDS_PER_SECOND); // 1 second = 5 tokens refilled
    r = svc.consume('refillable', 4);
    expect(r.allowed).toBe(true);
  });

  it('peeks at current bucket state without consuming', () => {
    const { svc } = makeService();

    svc.configure('peekable', { capacity: 20, refillRatePerSecond: 1 });
    svc.consume('peekable', 8);
    const remaining = svc.peek('peekable');
    expect(remaining).toBe(12);
  });

  it('resets a bucket back to full', () => {
    const { svc } = makeService();

    svc.configure('resettable', { capacity: 15, refillRatePerSecond: 1 });
    svc.consume('resettable', 10);
    svc.reset('resettable');

    const remaining = svc.peek('resettable');
    expect(remaining).toBe(15);
  });

  it('removes a bucket from the service', () => {
    const { svc } = makeService();

    svc.configure('temp', { capacity: 5, refillRatePerSecond: 1 });
    svc.remove('temp');

    const stats = svc.getStats();
    expect(stats.totalBuckets).toBe(0);
  });
});
