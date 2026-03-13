import { describe, expect, it } from 'vitest';
import { createFakeClock } from '../clock.js';

describe('clock simulation', () => {
  it('simulates deterministic timeline advancement for system ticks', () => {
    const clock = createFakeClock(100_000);
    const t0 = clock.nowMicroseconds();
    clock.advance(33_000);
    const t1 = clock.nowMicroseconds();
    clock.advance(33_000);
    const t2 = clock.nowMicroseconds();

    expect(t0).toBe(100_000);
    expect(t1).toBe(133_000);
    expect(t2).toBe(166_000);
  });
});
