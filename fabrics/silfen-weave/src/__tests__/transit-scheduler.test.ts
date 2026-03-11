/**
 * transit-scheduler.test.ts — Unit tests for transit scheduler.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createTransitScheduler } from '../transit-scheduler.js';
import type { TransitScheduler, TransitSchedulerDeps } from '../transit-scheduler.js';

// ── Test Helpers ─────────────────────────────────────────────────

const US_PER_HOUR = 3_600_000_000;
const US_PER_DAY = 86_400_000_000;

function mockClock(start = 1_000_000): {
  nowMicroseconds: () => number;
  advance: (us: number) => void;
  set: (us: number) => void;
} {
  let t = start;
  return {
    nowMicroseconds: () => t,
    advance: (us: number) => {
      t += us;
    },
    set: (us: number) => {
      t = us;
    },
  };
}

function mockIdGen(): { generate: () => string; lastId: () => number } {
  let counter = 0;
  return {
    generate: () => {
      counter += 1;
      return 'id-' + String(counter);
    },
    lastId: () => counter,
  };
}

function makeDeps(
  clock?: ReturnType<typeof mockClock>,
  idGen?: ReturnType<typeof mockIdGen>,
): TransitSchedulerDeps {
  return {
    clock: clock ?? mockClock(),
    idGenerator: idGen ?? mockIdGen(),
  };
}

// ── Tests: Window Creation ───────────────────────────────────────

describe('TransitScheduler — window creation', () => {
  let scheduler: TransitScheduler;

  beforeEach(() => {
    scheduler = createTransitScheduler(makeDeps(mockClock(100_000)));
  });

  it('creates a scheduled window in the future', () => {
    const w = scheduler.createWindow({
      fromWorldId: 'world-a',
      toWorldId: 'world-b',
      opensAt: 200_000,
      closesAt: 300_000,
      capacity: 10,
    });
    expect(w.status).toBe('scheduled');
    expect(w.fromWorldId).toBe('world-a');
    expect(w.toWorldId).toBe('world-b');
    expect(w.capacity).toBe(10);
    expect(w.enrolled).toBe(0);
  });

  it('creates an open window when current time is past opensAt', () => {
    const w = scheduler.createWindow({
      fromWorldId: 'world-a',
      toWorldId: 'world-b',
      opensAt: 50_000,
      closesAt: 300_000,
      capacity: 5,
    });
    expect(w.status).toBe('open');
  });

  it('retrieves a window by id', () => {
    const w = scheduler.createWindow({
      fromWorldId: 'world-a',
      toWorldId: 'world-b',
      opensAt: 200_000,
      closesAt: 300_000,
      capacity: 10,
    });
    const found = scheduler.getWindow(w.windowId);
    expect(found).toBeDefined();
    expect(found?.windowId).toBe(w.windowId);
  });

  it('returns undefined for unknown window', () => {
    expect(scheduler.getWindow('unknown')).toBeUndefined();
  });
});

describe('TransitScheduler — window transitions', () => {
  it('transitions window to open when time advances', () => {
    const clock = mockClock(100_000);
    const scheduler = createTransitScheduler(makeDeps(clock));
    const w = scheduler.createWindow({
      fromWorldId: 'world-a',
      toWorldId: 'world-b',
      opensAt: 200_000,
      closesAt: 300_000,
      capacity: 10,
    });
    clock.advance(150_000);
    expect(scheduler.getWindow(w.windowId)?.status).toBe('open');
  });

  it('transitions window to closed when time passes closesAt', () => {
    const clock = mockClock(100_000);
    const scheduler = createTransitScheduler(makeDeps(clock));
    const w = scheduler.createWindow({
      fromWorldId: 'world-a',
      toWorldId: 'world-b',
      opensAt: 200_000,
      closesAt: 300_000,
      capacity: 10,
    });
    clock.advance(300_000);
    expect(scheduler.getWindow(w.windowId)?.status).toBe('closed');
  });
});

// ── Tests: Window Cancellation ───────────────────────────────────

describe('TransitScheduler — window cancellation', () => {
  it('cancels a window', () => {
    const scheduler = createTransitScheduler(makeDeps());
    const w = scheduler.createWindow({
      fromWorldId: 'a',
      toWorldId: 'b',
      opensAt: 0,
      closesAt: 999_999_999,
      capacity: 5,
    });
    expect(scheduler.cancelWindow(w.windowId)).toBe(true);
    const found = scheduler.getWindow(w.windowId);
    expect(found?.status).toBe('cancelled');
  });

  it('returns false for cancelling unknown window', () => {
    const scheduler = createTransitScheduler(makeDeps());
    expect(scheduler.cancelWindow('unknown')).toBe(false);
  });
});

// ── Tests: Window Listing ────────────────────────────────────────

describe('TransitScheduler — window listing', () => {
  let scheduler: TransitScheduler;

  beforeEach(() => {
    const clock = mockClock(50_000);
    scheduler = createTransitScheduler(makeDeps(clock));
    scheduler.createWindow({
      fromWorldId: 'a',
      toWorldId: 'b',
      opensAt: 0,
      closesAt: 100_000,
      capacity: 10,
    });
    scheduler.createWindow({
      fromWorldId: 'a',
      toWorldId: 'b',
      opensAt: 200_000,
      closesAt: 300_000,
      capacity: 5,
    });
    scheduler.createWindow({
      fromWorldId: 'b',
      toWorldId: 'c',
      opensAt: 0,
      closesAt: 100_000,
      capacity: 8,
    });
  });

  it('lists windows for a specific route', () => {
    const windows = scheduler.listWindows('a', 'b');
    expect(windows).toHaveLength(2);
  });

  it('lists only open windows', () => {
    const open = scheduler.listOpenWindows();
    expect(open).toHaveLength(2);
  });
});

// ── Tests: Recurring Schedules ───────────────────────────────────

describe('TransitScheduler — schedule creation', () => {
  let scheduler: TransitScheduler;

  beforeEach(() => {
    scheduler = createTransitScheduler(makeDeps(mockClock(0)));
  });

  it('creates a recurring schedule', () => {
    const s = scheduler.createSchedule({
      fromWorldId: 'a',
      toWorldId: 'b',
      recurrence: 'daily',
      windowDurationUs: US_PER_HOUR,
      capacity: 20,
      anchorTime: US_PER_DAY,
    });
    expect(s.recurrence).toBe('daily');
    expect(s.enabled).toBe(true);
    expect(s.capacity).toBe(20);
  });

  it('retrieves schedule by id', () => {
    const s = scheduler.createSchedule({
      fromWorldId: 'a',
      toWorldId: 'b',
      recurrence: 'daily',
      windowDurationUs: US_PER_HOUR,
      capacity: 20,
      anchorTime: 0,
    });
    expect(scheduler.getSchedule(s.scheduleId)?.scheduleId).toBe(s.scheduleId);
  });

  it('returns undefined for unknown schedule', () => {
    expect(scheduler.getSchedule('unknown')).toBeUndefined();
  });

  it('returns false when disabling unknown schedule', () => {
    expect(scheduler.disableSchedule('unknown')).toBe(false);
  });
});

describe('TransitScheduler — schedule window generation', () => {
  let scheduler: TransitScheduler;

  beforeEach(() => {
    scheduler = createTransitScheduler(makeDeps(mockClock(0)));
  });

  it('generates windows from a schedule', () => {
    const s = scheduler.createSchedule({
      fromWorldId: 'a',
      toWorldId: 'b',
      recurrence: 'daily',
      windowDurationUs: US_PER_HOUR,
      capacity: 20,
      anchorTime: US_PER_DAY,
    });
    const windows = scheduler.generateWindows(s.scheduleId, 3);
    expect(windows).toHaveLength(3);
    expect(windows[0]?.opensAt).toBe(US_PER_DAY);
    expect(windows[1]?.opensAt).toBe(US_PER_DAY + US_PER_DAY);
  });

  it('does not generate windows for disabled schedule', () => {
    const s = scheduler.createSchedule({
      fromWorldId: 'a',
      toWorldId: 'b',
      recurrence: 'hourly',
      windowDurationUs: US_PER_HOUR / 2,
      capacity: 10,
      anchorTime: 0,
    });
    scheduler.disableSchedule(s.scheduleId);
    expect(scheduler.generateWindows(s.scheduleId, 5)).toHaveLength(0);
  });

  it('re-enables a disabled schedule', () => {
    const s = scheduler.createSchedule({
      fromWorldId: 'a',
      toWorldId: 'b',
      recurrence: 'weekly',
      windowDurationUs: US_PER_HOUR,
      capacity: 50,
      anchorTime: 0,
    });
    scheduler.disableSchedule(s.scheduleId);
    expect(scheduler.enableSchedule(s.scheduleId)).toBe(true);
    expect(scheduler.getSchedule(s.scheduleId)?.enabled).toBe(true);
  });

  it('returns empty for unknown schedule generation', () => {
    expect(scheduler.generateWindows('unknown', 3)).toHaveLength(0);
  });
});

// ── Tests: Enrollment & Queues ───────────────────────────────────

describe('TransitScheduler — enrollment', () => {
  let scheduler: TransitScheduler;
  let windowId: string;

  beforeEach(() => {
    scheduler = createTransitScheduler(makeDeps(mockClock(50_000)));
    const w = scheduler.createWindow({
      fromWorldId: 'a',
      toWorldId: 'b',
      opensAt: 0,
      closesAt: 100_000,
      capacity: 3,
    });
    windowId = w.windowId;
  });

  it('enrolls an entity in a window', () => {
    const result = scheduler.enroll(windowId, 'entity-1');
    expect(result.outcome).toBe('enrolled');
    if (result.outcome === 'enrolled') {
      expect(result.position).toBe(1);
    }
  });

  it('rejects enrollment when window is full', () => {
    scheduler.enroll(windowId, 'e1');
    scheduler.enroll(windowId, 'e2');
    scheduler.enroll(windowId, 'e3');
    const result = scheduler.enroll(windowId, 'e4');
    expect(result.outcome).toBe('window_full');
  });

  it('rejects duplicate enrollment', () => {
    scheduler.enroll(windowId, 'e1');
    const result = scheduler.enroll(windowId, 'e1');
    expect(result.outcome).toBe('already_enrolled');
  });

  it('rejects enrollment for unknown window', () => {
    const result = scheduler.enroll('unknown', 'e1');
    expect(result.outcome).toBe('window_not_found');
  });

  it('retrieves queue for a window', () => {
    scheduler.enroll(windowId, 'e1');
    scheduler.enroll(windowId, 'e2');
    const queue = scheduler.getQueue(windowId);
    expect(queue).toHaveLength(2);
    expect(queue[0]?.entityId).toBe('e1');
    expect(queue[1]?.entityId).toBe('e2');
  });

  it('returns empty queue for unknown window', () => {
    expect(scheduler.getQueue('unknown')).toHaveLength(0);
  });

  it('dequeues an entity from a window', () => {
    scheduler.enroll(windowId, 'e1');
    scheduler.enroll(windowId, 'e2');
    expect(scheduler.dequeue(windowId, 'e1')).toBe(true);
    expect(scheduler.getQueue(windowId)).toHaveLength(1);
  });

  it('returns false when dequeuing unknown entity', () => {
    expect(scheduler.dequeue(windowId, 'unknown')).toBe(false);
  });
});

// ── Tests: Blackout Periods ──────────────────────────────────────

describe('TransitScheduler — blackout creation', () => {
  let scheduler: TransitScheduler;

  beforeEach(() => {
    scheduler = createTransitScheduler(makeDeps(mockClock(50_000)));
  });

  it('creates a blackout period', () => {
    const b = scheduler.createBlackout({
      fromWorldId: 'a',
      toWorldId: 'b',
      startsAt: 0,
      endsAt: 100_000,
      reason: 'maintenance',
    });
    expect(b.reason).toBe('maintenance');
  });

  it('removes a blackout period', () => {
    const b = scheduler.createBlackout({
      fromWorldId: 'a',
      toWorldId: 'b',
      startsAt: 0,
      endsAt: 100_000,
      reason: 'test',
    });
    expect(scheduler.removeBlackout(b.blackoutId)).toBe(true);
  });

  it('returns false removing unknown blackout', () => {
    expect(scheduler.removeBlackout('unknown')).toBe(false);
  });

  it('lists active blackouts', () => {
    scheduler.createBlackout({
      fromWorldId: 'a',
      toWorldId: 'b',
      startsAt: 0,
      endsAt: 100_000,
      reason: 'active',
    });
    scheduler.createBlackout({
      fromWorldId: 'c',
      toWorldId: 'd',
      startsAt: 200_000,
      endsAt: 300_000,
      reason: 'future',
    });
    const active = scheduler.listActiveBlackouts();
    expect(active).toHaveLength(1);
    expect(active[0]?.reason).toBe('active');
  });
});

describe('TransitScheduler — blackout enforcement', () => {
  it('prevents enrollment during blackout', () => {
    const scheduler = createTransitScheduler(makeDeps(mockClock(50_000)));
    scheduler.createBlackout({
      fromWorldId: 'a',
      toWorldId: 'b',
      startsAt: 0,
      endsAt: 100_000,
      reason: 'anomaly',
    });
    const w = scheduler.createWindow({
      fromWorldId: 'a',
      toWorldId: 'b',
      opensAt: 0,
      closesAt: 100_000,
      capacity: 10,
    });
    expect(scheduler.enroll(w.windowId, 'e1').outcome).toBe('blackout_active');
  });

  it('allows enrollment after blackout expires', () => {
    const clock = mockClock(50_000);
    const scheduler = createTransitScheduler(makeDeps(clock));
    scheduler.createBlackout({
      fromWorldId: 'a',
      toWorldId: 'b',
      startsAt: 0,
      endsAt: 60_000,
      reason: 'anomaly',
    });
    clock.set(70_000);
    const w = scheduler.createWindow({
      fromWorldId: 'a',
      toWorldId: 'b',
      opensAt: 0,
      closesAt: 200_000,
      capacity: 10,
    });
    expect(scheduler.enroll(w.windowId, 'e1').outcome).toBe('enrolled');
  });
});

// ── Tests: Stats ─────────────────────────────────────────────────

describe('TransitScheduler — stats', () => {
  it('reports zero stats on empty scheduler', () => {
    const scheduler = createTransitScheduler(makeDeps());
    const stats = scheduler.getStats();
    expect(stats.totalWindows).toBe(0);
    expect(stats.openWindows).toBe(0);
    expect(stats.totalSchedules).toBe(0);
    expect(stats.totalQueued).toBe(0);
    expect(stats.activeBlackouts).toBe(0);
  });

  it('reports accurate aggregate stats', () => {
    const clock = mockClock(50_000);
    const scheduler = createTransitScheduler(makeDeps(clock));
    const w = scheduler.createWindow({
      fromWorldId: 'a',
      toWorldId: 'b',
      opensAt: 0,
      closesAt: 100_000,
      capacity: 10,
    });
    scheduler.createWindow({
      fromWorldId: 'c',
      toWorldId: 'd',
      opensAt: 200_000,
      closesAt: 300_000,
      capacity: 5,
    });
    scheduler.createSchedule({
      fromWorldId: 'a',
      toWorldId: 'b',
      recurrence: 'daily',
      windowDurationUs: US_PER_HOUR,
      capacity: 20,
      anchorTime: 0,
    });
    scheduler.enroll(w.windowId, 'e1');
    scheduler.enroll(w.windowId, 'e2');
    scheduler.createBlackout({
      fromWorldId: 'x',
      toWorldId: 'y',
      startsAt: 0,
      endsAt: 100_000,
      reason: 'test',
    });
    const stats = scheduler.getStats();
    expect(stats.totalWindows).toBe(2);
    expect(stats.openWindows).toBe(1);
    expect(stats.scheduledWindows).toBe(1);
    expect(stats.totalSchedules).toBe(1);
    expect(stats.enabledSchedules).toBe(1);
    expect(stats.totalQueued).toBe(2);
    expect(stats.activeBlackouts).toBe(1);
  });
});
