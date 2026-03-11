/**
 * Clock Port — Monotonic time source for The Loom.
 *
 * Abstracted for testing (inject a fake clock)
 * and for future high-resolution time sources.
 */

export interface Clock {
  /** Returns current time in microseconds */
  nowMicroseconds(): number;
}

/**
 * System clock using performance.now() for sub-millisecond precision.
 * Anchored to Date.now() for absolute timestamps.
 */
export function createSystemClock(): Clock {
  const anchor = Date.now() * 1000;
  const perfAnchor = performance.now() * 1000;

  return {
    nowMicroseconds(): number {
      return Math.floor(anchor + (performance.now() * 1000 - perfAnchor));
    },
  };
}

/**
 * Fake clock for deterministic testing.
 */
export function createFakeClock(
  startMicroseconds = 0,
): Clock & { advance(microseconds: number): void } {
  let current = startMicroseconds;

  return {
    nowMicroseconds(): number {
      return current;
    },
    advance(microseconds: number): void {
      current += microseconds;
    },
  };
}
