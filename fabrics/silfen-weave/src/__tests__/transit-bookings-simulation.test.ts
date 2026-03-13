import { describe, expect, it } from 'vitest';
import { createTransitSchedulerSystem } from '../transit-bookings.js';

function makeSystem() {
  let i = 0;
  return createTransitSchedulerSystem({
    clock: { now: () => 1_000_000n },
    idGen: { generate: () => `id-${++i}` },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  });
}

describe('transit-bookings simulation', () => {
  it('runs booking lifecycle from schedule to arrival', () => {
    const scheduler = makeSystem();
    const schedule = scheduler.scheduleTransit('w1', 'w2', 2_000_000n, 5_000_000n, 2);
    expect(typeof schedule).toBe('object');
    if (typeof schedule === 'string') return;

    scheduler.bookPassenger(schedule.scheduleId, 'p1');
    scheduler.bookPassenger(schedule.scheduleId, 'p2');
    scheduler.openBoarding(schedule.scheduleId);
    scheduler.departTransit(schedule.scheduleId);
    scheduler.arriveTransit(schedule.scheduleId);

    const final = scheduler.getSchedule(schedule.scheduleId);
    expect(final?.status).toBe('ARRIVED');
    expect(final?.bookedCount).toBe(2);
  });
});
