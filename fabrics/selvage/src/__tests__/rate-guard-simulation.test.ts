import { describe, it, expect } from 'vitest';
import { createRateGuard } from '../rate-guard.js';

function makeGuard() {
  const buckets: Record<string, number> = {};
  const limiter = {
    check: (key: string, _action: string) => ({
      allowed: (buckets[key] ?? 10) > 0,
      remaining: buckets[key] ?? 10,
    }),
    consume: (key: string, _action: string) => {
      buckets[key] = (buckets[key] ?? 10) - 1;
      const remaining = buckets[key] ?? 0;
      return { allowed: remaining >= 0, remaining: Math.max(0, remaining) };
    },
  };
  return createRateGuard({
    rateLimiter: limiter,
    clock: { nowMicroseconds: () => 1_000_000 },
  });
}

describe('Rate Guard Simulation', () => {
  it('allows actions within the rate limit', () => {
    const guard = makeGuard();

    const result = guard.check('conn-1', 'attack');
    expect(result.allowed).toBe(true);

    const consumed = guard.consume('conn-1', 'attack');
    expect(consumed.allowed).toBe(true);
  });

  it('detects and records violations', () => {
    const guard = makeGuard();

    // Exhaust budget
    for (let i = 0; i < 11; i++) {
      guard.consume('conn-violator', 'spam');
    }

    const violation = guard.getViolation('conn-violator');
    expect(violation).toBeDefined();
  });

  it('check does not consume budget', () => {
    const guard = makeGuard();

    for (let i = 0; i < 5; i++) {
      guard.check('conn-2', 'move');
    }

    // After only checking, bucket is still full
    const result = guard.consume('conn-2', 'move');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(9);
  });

  it('tracks stats', () => {
    const guard = makeGuard();
    guard.consume('conn-3', 'chat');
    const stats = guard.getStats();
    expect(stats.totalChecks).toBeGreaterThanOrEqual(1);
  });
});
