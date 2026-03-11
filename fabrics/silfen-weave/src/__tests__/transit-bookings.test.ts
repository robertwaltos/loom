import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTransitSchedulerSystem,
  type TransitSchedulerSystem,
  type BookingClock,
  type BookingIdGenerator,
  type BookingLogger,
} from '../transit-bookings.js';

// ── Test Doubles ─────────────────────────────────────────────────

class TestClock implements BookingClock {
  private readonly time = 1_000_000n;
  now(): bigint {
    return this.time;
  }
}

class TestIdGen implements BookingIdGenerator {
  private counter = 0;
  generate(): string {
    return 'id-' + String(++this.counter);
  }
}

class TestLogger implements BookingLogger {
  readonly infos: string[] = [];
  readonly warns: string[] = [];
  readonly errors: string[] = [];
  info(m: string): void {
    this.infos.push(m);
  }
  warn(m: string): void {
    this.warns.push(m);
  }
  error(m: string): void {
    this.errors.push(m);
  }
}

function makeSystem(): { sys: TransitSchedulerSystem; logger: TestLogger } {
  const clock = new TestClock();
  const logger = new TestLogger();
  const sys = createTransitSchedulerSystem({ clock, idGen: new TestIdGen(), logger });
  return { sys, logger };
}

const DEP = 2_000_000n;
const ARR = 5_000_000n;

// ── Tests ────────────────────────────────────────────────────────

describe('TransitBookings — scheduleTransit', () => {
  let sys: TransitSchedulerSystem;
  let logger: TestLogger;

  beforeEach(() => {
    ({ sys, logger } = makeSystem());
  });

  it('creates a transit schedule with valid params', () => {
    const result = sys.scheduleTransit('A', 'B', DEP, ARR, 10);
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.fromWorldId).toBe('A');
    expect(result.capacity).toBe(10);
    expect(result.status).toBe('SCHEDULED');
    expect(result.passengers.length).toBe(0);
  });

  it('rejects arrivalAt equal to departureAt', () => {
    expect(sys.scheduleTransit('A', 'B', 5_000_000n, 5_000_000n, 10)).toBe('invalid-time');
    expect(logger.errors.length).toBeGreaterThan(0);
  });

  it('rejects arrivalAt before departureAt', () => {
    expect(sys.scheduleTransit('A', 'B', 5_000_000n, 1_000_000n, 10)).toBe('invalid-time');
  });

  it('rejects capacity of 0', () => {
    expect(sys.scheduleTransit('A', 'B', DEP, ARR, 0)).toBe('invalid-capacity');
  });

  it('rejects negative capacity', () => {
    expect(sys.scheduleTransit('A', 'B', DEP, ARR, -5)).toBe('invalid-capacity');
  });

  it('logs schedule creation', () => {
    sys.scheduleTransit('A', 'B', DEP, ARR, 5);
    expect(logger.infos.some((m) => m.includes('scheduled'))).toBe(true);
  });
});

describe('TransitBookings — bookPassenger', () => {
  let sys: TransitSchedulerSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
  });

  it('books a passenger on a SCHEDULED transit', () => {
    const schedule = sys.scheduleTransit('A', 'B', DEP, ARR, 10);
    if (typeof schedule === 'string') return;
    const result = sys.bookPassenger(schedule.scheduleId, 'passenger-1');
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.booking.passengerId).toBe('passenger-1');
  });

  it('increments bookedCount', () => {
    const schedule = sys.scheduleTransit('A', 'B', DEP, ARR, 10);
    if (typeof schedule === 'string') return;
    sys.bookPassenger(schedule.scheduleId, 'p1');
    sys.bookPassenger(schedule.scheduleId, 'p2');
    expect(sys.getSchedule(schedule.scheduleId)?.bookedCount).toBe(2);
  });

  it('books while BOARDING', () => {
    const schedule = sys.scheduleTransit('A', 'B', DEP, ARR, 10);
    if (typeof schedule === 'string') return;
    sys.openBoarding(schedule.scheduleId);
    expect(sys.bookPassenger(schedule.scheduleId, 'p1').success).toBe(true);
  });

  it('rejects duplicate booking for same passenger', () => {
    const schedule = sys.scheduleTransit('A', 'B', DEP, ARR, 10);
    if (typeof schedule === 'string') return;
    sys.bookPassenger(schedule.scheduleId, 'p1');
    const result = sys.bookPassenger(schedule.scheduleId, 'p1');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('already-booked');
  });

  it('rejects booking when transit is full', () => {
    const schedule = sys.scheduleTransit('A', 'B', DEP, ARR, 1);
    if (typeof schedule === 'string') return;
    sys.bookPassenger(schedule.scheduleId, 'p1');
    const result = sys.bookPassenger(schedule.scheduleId, 'p2');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('transit-full');
  });

  it('returns schedule-not-found for unknown scheduleId', () => {
    const result = sys.bookPassenger('fake', 'p1');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('schedule-not-found');
  });
});

describe('TransitBookings — cancelBooking', () => {
  let sys: TransitSchedulerSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
  });

  it('cancels an existing booking', () => {
    const schedule = sys.scheduleTransit('A', 'B', DEP, ARR, 10);
    if (typeof schedule === 'string') return;
    sys.bookPassenger(schedule.scheduleId, 'p1');
    expect(sys.cancelBooking(schedule.scheduleId, 'p1').success).toBe(true);
    expect(sys.getSchedule(schedule.scheduleId)?.bookedCount).toBe(0);
  });

  it('removes passenger from passengers list', () => {
    const schedule = sys.scheduleTransit('A', 'B', DEP, ARR, 10);
    if (typeof schedule === 'string') return;
    sys.bookPassenger(schedule.scheduleId, 'p1');
    sys.cancelBooking(schedule.scheduleId, 'p1');
    expect(sys.getSchedule(schedule.scheduleId)?.passengers).not.toContain('p1');
  });

  it('returns not-booked if passenger not on schedule', () => {
    const schedule = sys.scheduleTransit('A', 'B', DEP, ARR, 10);
    if (typeof schedule === 'string') return;
    const result = sys.cancelBooking(schedule.scheduleId, 'nobody');
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('not-booked');
  });

  it('rejects cancellation on DEPARTED transit', () => {
    const schedule = sys.scheduleTransit('A', 'B', DEP, ARR, 10);
    if (typeof schedule === 'string') return;
    sys.bookPassenger(schedule.scheduleId, 'p1');
    sys.openBoarding(schedule.scheduleId);
    sys.departTransit(schedule.scheduleId);
    expect(sys.cancelBooking(schedule.scheduleId, 'p1').success).toBe(false);
  });
});

describe('TransitBookings — status transitions', () => {
  let sys: TransitSchedulerSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
  });

  it('SCHEDULED → BOARDING via openBoarding', () => {
    const s = sys.scheduleTransit('A', 'B', DEP, ARR, 5);
    if (typeof s === 'string') return;
    sys.openBoarding(s.scheduleId);
    expect(sys.getSchedule(s.scheduleId)?.status).toBe('BOARDING');
  });

  it('BOARDING → DEPARTED via departTransit', () => {
    const s = sys.scheduleTransit('A', 'B', DEP, ARR, 5);
    if (typeof s === 'string') return;
    sys.openBoarding(s.scheduleId);
    sys.departTransit(s.scheduleId);
    expect(sys.getSchedule(s.scheduleId)?.status).toBe('DEPARTED');
  });

  it('DEPARTED → ARRIVED via arriveTransit', () => {
    const s = sys.scheduleTransit('A', 'B', DEP, ARR, 5);
    if (typeof s === 'string') return;
    sys.openBoarding(s.scheduleId);
    sys.departTransit(s.scheduleId);
    sys.arriveTransit(s.scheduleId);
    expect(sys.getSchedule(s.scheduleId)?.status).toBe('ARRIVED');
  });

  it('cannot openBoarding from BOARDING state', () => {
    const s = sys.scheduleTransit('A', 'B', DEP, ARR, 5);
    if (typeof s === 'string') return;
    sys.openBoarding(s.scheduleId);
    expect(sys.openBoarding(s.scheduleId).success).toBe(false);
  });

  it('cannot departTransit from SCHEDULED state', () => {
    const s = sys.scheduleTransit('A', 'B', DEP, ARR, 5);
    if (typeof s === 'string') return;
    expect(sys.departTransit(s.scheduleId).success).toBe(false);
  });

  it('returns schedule-not-found on unknown id for transitions', () => {
    expect(sys.openBoarding('fake').success).toBe(false);
    expect(sys.departTransit('fake').success).toBe(false);
    expect(sys.arriveTransit('fake').success).toBe(false);
  });
});

describe('TransitBookings — cancelTransit', () => {
  let sys: TransitSchedulerSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
  });

  it('cancels a SCHEDULED transit', () => {
    const s = sys.scheduleTransit('A', 'B', DEP, ARR, 5);
    if (typeof s === 'string') return;
    expect(sys.cancelTransit(s.scheduleId).success).toBe(true);
    expect(sys.getSchedule(s.scheduleId)?.status).toBe('CANCELLED');
  });

  it('cancels a BOARDING transit', () => {
    const s = sys.scheduleTransit('A', 'B', DEP, ARR, 5);
    if (typeof s === 'string') return;
    sys.openBoarding(s.scheduleId);
    expect(sys.cancelTransit(s.scheduleId).success).toBe(true);
  });

  it('cannot cancel a DEPARTED transit', () => {
    const s = sys.scheduleTransit('A', 'B', DEP, ARR, 5);
    if (typeof s === 'string') return;
    sys.openBoarding(s.scheduleId);
    sys.departTransit(s.scheduleId);
    const result = sys.cancelTransit(s.scheduleId);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toBe('cannot-cancel');
  });

  it('cannot cancel an ARRIVED transit', () => {
    const s = sys.scheduleTransit('A', 'B', DEP, ARR, 5);
    if (typeof s === 'string') return;
    sys.openBoarding(s.scheduleId);
    sys.departTransit(s.scheduleId);
    sys.arriveTransit(s.scheduleId);
    expect(sys.cancelTransit(s.scheduleId).success).toBe(false);
  });
});

describe('TransitBookings — listSchedules and getStats', () => {
  let sys: TransitSchedulerSystem;

  beforeEach(() => {
    ({ sys } = makeSystem());
  });

  it('listSchedules without filter returns all', () => {
    sys.scheduleTransit('A', 'B', DEP, ARR, 5);
    sys.scheduleTransit('C', 'D', DEP, ARR, 5);
    expect(sys.listSchedules().length).toBe(2);
  });

  it('listSchedules filters by fromWorldId', () => {
    sys.scheduleTransit('A', 'B', DEP, ARR, 5);
    sys.scheduleTransit('C', 'D', DEP, ARR, 5);
    expect(sys.listSchedules('A').length).toBe(1);
  });

  it('listSchedules filters by toWorldId', () => {
    sys.scheduleTransit('A', 'B', DEP, ARR, 5);
    sys.scheduleTransit('C', 'D', DEP, ARR, 5);
    expect(sys.listSchedules('B').length).toBe(1);
  });

  it('getStats returns zeroed stats initially', () => {
    const stats = sys.getStats();
    expect(stats.totalScheduled).toBe(0);
    expect(stats.averagePassengersPerTransit).toBe(0);
  });

  it('getStats counts completed transits', () => {
    const s = sys.scheduleTransit('A', 'B', DEP, ARR, 5);
    if (typeof s === 'string') return;
    sys.openBoarding(s.scheduleId);
    sys.departTransit(s.scheduleId);
    sys.arriveTransit(s.scheduleId);
    expect(sys.getStats().totalCompleted).toBe(1);
  });

  it('getStats counts cancelled transits', () => {
    const s = sys.scheduleTransit('A', 'B', DEP, ARR, 5);
    if (typeof s === 'string') return;
    sys.cancelTransit(s.scheduleId);
    expect(sys.getStats().totalCancelled).toBe(1);
  });

  it('getStats calculates averagePassengersPerTransit', () => {
    const s1 = sys.scheduleTransit('A', 'B', DEP, ARR, 10);
    const s2 = sys.scheduleTransit('C', 'D', DEP, ARR, 10);
    if (typeof s1 === 'string' || typeof s2 === 'string') return;
    sys.bookPassenger(s1.scheduleId, 'p1');
    sys.bookPassenger(s1.scheduleId, 'p2');
    sys.bookPassenger(s1.scheduleId, 'p3');
    sys.openBoarding(s1.scheduleId);
    sys.departTransit(s1.scheduleId);
    sys.arriveTransit(s1.scheduleId);
    sys.bookPassenger(s2.scheduleId, 'p4');
    sys.openBoarding(s2.scheduleId);
    sys.departTransit(s2.scheduleId);
    sys.arriveTransit(s2.scheduleId);
    expect(sys.getStats().averagePassengersPerTransit).toBe(2);
  });
});
