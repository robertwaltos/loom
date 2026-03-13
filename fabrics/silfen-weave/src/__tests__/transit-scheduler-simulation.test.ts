import { describe, expect, it } from 'vitest';
import { createTransitScheduler } from '../transit-scheduler.js';

function makeScheduler() {
  let now = 100_000;
  let id = 0;
  return {
    scheduler: createTransitScheduler({
      clock: { nowMicroseconds: () => now },
      idGenerator: { generate: () => `sch-${++id}` },
    }),
    advance: (delta: number) => {
      now += delta;
    },
  };
}

describe('transit-scheduler simulation', () => {
  it('runs windows through open/queue/blackout behavior', () => {
    const { scheduler, advance } = makeScheduler();

    const w = scheduler.createWindow({
      fromWorldId: 'a',
      toWorldId: 'b',
      opensAt: 200_000,
      closesAt: 400_000,
      capacity: 1,
    });

    expect(scheduler.enroll(w.windowId, 'entity-1').outcome).toBe('enrolled');
    advance(150_000);
    expect(scheduler.enroll(w.windowId, 'entity-1').outcome).toBe('already_enrolled');
    expect(scheduler.enroll(w.windowId, 'entity-2').outcome).toBe('window_full');

    scheduler.createBlackout({
      fromWorldId: 'a',
      toWorldId: 'b',
      startsAt: 250_000,
      endsAt: 500_000,
      reason: 'solar flare',
    });
    expect(scheduler.enroll(w.windowId, 'entity-3').outcome).toBe('blackout_active');

    const stats = scheduler.getStats();
    expect(stats.totalWindows).toBe(1);
    expect(stats.activeBlackouts).toBe(1);
  });
});
