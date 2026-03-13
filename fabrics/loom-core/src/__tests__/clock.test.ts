import { describe, it, expect } from 'vitest';
import { createSystemClock, createFakeClock } from '../clock.js';

describe('createSystemClock', () => {
  it('returns a positive integer', () => {
    const clock = createSystemClock();
    expect(clock.nowMicroseconds()).toBeGreaterThan(0);
  });

  it('is monotonically non-decreasing', () => {
    const clock = createSystemClock();
    const t1 = clock.nowMicroseconds();
    const t2 = clock.nowMicroseconds();
    expect(t2).toBeGreaterThanOrEqual(t1);
  });
});

describe('createFakeClock', () => {
  it('starts at 0 by default', () => {
    const clock = createFakeClock();
    expect(clock.nowMicroseconds()).toBe(0);
  });

  it('starts at the provided value', () => {
    const clock = createFakeClock(500_000);
    expect(clock.nowMicroseconds()).toBe(500_000);
  });

  it('advances by the given number of microseconds', () => {
    const clock = createFakeClock(0);
    clock.advance(1_000_000);
    expect(clock.nowMicroseconds()).toBe(1_000_000);
  });

  it('accumulates multiple advances', () => {
    const clock = createFakeClock(100);
    clock.advance(200);
    clock.advance(300);
    expect(clock.nowMicroseconds()).toBe(600);
  });

  it('returned value is stable between advances', () => {
    const clock = createFakeClock(42);
    expect(clock.nowMicroseconds()).toBe(42);
    expect(clock.nowMicroseconds()).toBe(42);
  });
});
