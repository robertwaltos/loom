import { describe, it, expect } from 'vitest';
import { createRateGuard } from '../rate-guard.js';
import type { RateGuardDeps, RateLimitPort } from '../rate-guard.js';

function makeAllowedPort(): RateLimitPort {
  return {
    check: () => ({ allowed: true, remaining: 10, retryAfterMicroseconds: 0 }),
    consume: () => ({ allowed: true, remaining: 9, retryAfterMicroseconds: 0 }),
  };
}

function makeBlockedPort(): RateLimitPort {
  return {
    check: () => ({ allowed: false, remaining: 0, retryAfterMicroseconds: 5_000_000 }),
    consume: () => ({ allowed: false, remaining: 0, retryAfterMicroseconds: 5_000_000 }),
  };
}

function makeDeps(overrides?: Partial<RateGuardDeps>): RateGuardDeps {
  let time = 1_000_000;
  return {
    rateLimiter: makeAllowedPort(),
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    ...overrides,
  };
}

describe('RateGuard — allowed actions', () => {
  it('allows action when rate limiter permits', () => {
    const guard = createRateGuard(makeDeps());
    const result = guard.check('conn-1', 'send_message');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(10);
  });

  it('consume returns remaining count', () => {
    const guard = createRateGuard(makeDeps());
    const result = guard.consume('conn-1', 'send_message');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it('allowed result has zero retry time', () => {
    const guard = createRateGuard(makeDeps());
    const result = guard.check('conn-1', 'action');
    expect(result.retryAfterUs).toBe(0);
  });
});

describe('RateGuard — blocked actions', () => {
  it('blocks when rate limiter denies', () => {
    const guard = createRateGuard(makeDeps({ rateLimiter: makeBlockedPort() }));
    const result = guard.consume('conn-1', 'spam');
    expect(result.allowed).toBe(false);
    expect(result.retryAfterUs).toBe(5_000_000);
  });

  it('increments violation count per connection', () => {
    const guard = createRateGuard(makeDeps({ rateLimiter: makeBlockedPort() }));

    guard.consume('conn-1', 'spam');
    guard.consume('conn-1', 'spam');
    const result = guard.consume('conn-1', 'spam');

    expect(result.violationCount).toBe(3);
  });

  it('tracks violations independently per connection', () => {
    const guard = createRateGuard(makeDeps({ rateLimiter: makeBlockedPort() }));

    guard.consume('conn-1', 'spam');
    guard.consume('conn-1', 'spam');
    guard.consume('conn-2', 'spam');

    const v1 = guard.getViolation('conn-1');
    const v2 = guard.getViolation('conn-2');
    expect(v1?.totalViolations).toBe(2);
    expect(v2?.totalViolations).toBe(1);
  });
});

describe('RateGuard — disconnect threshold', () => {
  it('recommends disconnect after max violations', () => {
    const guard = createRateGuard(
      makeDeps({
        rateLimiter: makeBlockedPort(),
        config: { maxViolationsBeforeDisconnect: 3 },
      }),
    );

    guard.consume('conn-1', 'spam');
    guard.consume('conn-1', 'spam');
    guard.consume('conn-1', 'spam');

    const violation = guard.getViolation('conn-1');
    expect(violation?.shouldDisconnect).toBe(true);
  });

  it('does not recommend disconnect below threshold', () => {
    const guard = createRateGuard(
      makeDeps({
        rateLimiter: makeBlockedPort(),
        config: { maxViolationsBeforeDisconnect: 5 },
      }),
    );

    guard.consume('conn-1', 'spam');
    guard.consume('conn-1', 'spam');

    const violation = guard.getViolation('conn-1');
    expect(violation?.shouldDisconnect).toBe(false);
  });
});

describe('RateGuard — connection management', () => {
  it('resets connection violation tracking', () => {
    const guard = createRateGuard(makeDeps({ rateLimiter: makeBlockedPort() }));
    guard.consume('conn-1', 'spam');

    expect(guard.resetConnection('conn-1')).toBe(true);
    expect(guard.getViolation('conn-1')).toBeUndefined();
  });

  it('returns false for unknown connection reset', () => {
    const guard = createRateGuard(makeDeps());
    expect(guard.resetConnection('unknown')).toBe(false);
  });

  it('returns undefined for untracked connection', () => {
    const guard = createRateGuard(makeDeps());
    expect(guard.getViolation('unknown')).toBeUndefined();
  });
});

describe('RateGuard — stats', () => {
  it('tracks check and block counts', () => {
    const guard = createRateGuard(makeDeps({ rateLimiter: makeBlockedPort() }));

    guard.consume('conn-1', 'a');
    guard.check('conn-2', 'b');

    const stats = guard.getStats();
    expect(stats.totalChecks).toBe(2);
    expect(stats.totalBlocked).toBe(2);
  });

  it('tracks disconnect recommendations', () => {
    const guard = createRateGuard(
      makeDeps({
        rateLimiter: makeBlockedPort(),
        config: { maxViolationsBeforeDisconnect: 1 },
      }),
    );

    guard.consume('conn-1', 'spam');
    guard.consume('conn-2', 'spam');

    const stats = guard.getStats();
    expect(stats.totalDisconnectRecommendations).toBe(2);
  });

  it('counts tracked connections', () => {
    const guard = createRateGuard(makeDeps({ rateLimiter: makeBlockedPort() }));
    guard.consume('conn-1', 'a');
    guard.consume('conn-2', 'b');

    expect(guard.getStats().trackedConnections).toBe(2);
  });

  it('starts with empty stats', () => {
    const guard = createRateGuard(makeDeps());
    const stats = guard.getStats();
    expect(stats.totalChecks).toBe(0);
    expect(stats.totalBlocked).toBe(0);
  });
});

describe('RateGuard — violation details', () => {
  it('records last action and timestamp', () => {
    const guard = createRateGuard(makeDeps({ rateLimiter: makeBlockedPort() }));
    guard.consume('conn-1', 'send_message');

    const violation = guard.getViolation('conn-1');
    expect(violation?.lastAction).toBe('send_message');
    expect(violation?.lastViolationAt).toBeGreaterThan(0);
  });
});
