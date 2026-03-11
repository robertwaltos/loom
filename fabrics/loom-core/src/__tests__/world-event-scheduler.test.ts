import { describe, it, expect } from 'vitest';
import { createWorldEventScheduler } from '../world-event-scheduler.js';
import type { WorldEventSchedulerDeps } from '../world-event-scheduler.js';

function makeDeps(startTime?: number): WorldEventSchedulerDeps {
  let id = 0;
  let time = startTime ?? 1_000_000;
  return {
    idGenerator: { next: () => 'evt-' + String(++id) },
    clock: { nowMicroseconds: () => time++ },
  };
}

function makeControlledDeps(): { deps: WorldEventSchedulerDeps; setTime: (t: number) => void } {
  let id = 0;
  let time = 0;
  return {
    deps: {
      idGenerator: { next: () => 'evt-' + String(++id) },
      clock: { nowMicroseconds: () => time },
    },
    setTime: (t: number) => {
      time = t;
    },
  };
}

describe('WorldEventScheduler — scheduling', () => {
  it('schedules a one-shot event', () => {
    const scheduler = createWorldEventScheduler(makeDeps());
    const eventId = scheduler.schedule({ name: 'sunrise', fireAt: 5_000_000 }, () => {});
    expect(eventId).toBe('evt-1');
    const event = scheduler.getEvent(eventId);
    expect(event?.name).toBe('sunrise');
    expect(event?.status).toBe('pending');
    expect(event?.recurrence).toBe('once');
  });

  it('lists pending events', () => {
    const scheduler = createWorldEventScheduler(makeDeps());
    scheduler.schedule({ name: 'a', fireAt: 5_000_000 }, () => {});
    scheduler.schedule({ name: 'b', fireAt: 10_000_000 }, () => {});
    expect(scheduler.listPending()).toHaveLength(2);
  });
});

describe('WorldEventScheduler — tick firing', () => {
  it('fires events when time is reached', () => {
    const { deps, setTime } = makeControlledDeps();
    const scheduler = createWorldEventScheduler(deps);
    const fired: string[] = [];
    scheduler.schedule({ name: 'dawn', fireAt: 100 }, (e) => fired.push(e.name));
    setTime(100);
    const result = scheduler.tick();
    expect(result.firedCount).toBe(1);
    expect(result.eventNames).toContain('dawn');
    expect(fired).toEqual(['dawn']);
  });

  it('does not fire future events', () => {
    const { deps, setTime } = makeControlledDeps();
    const scheduler = createWorldEventScheduler(deps);
    scheduler.schedule({ name: 'later', fireAt: 1000 }, () => {});
    setTime(500);
    const result = scheduler.tick();
    expect(result.firedCount).toBe(0);
  });

  it('marks one-shot events as fired', () => {
    const { deps, setTime } = makeControlledDeps();
    const scheduler = createWorldEventScheduler(deps);
    const eid = scheduler.schedule({ name: 'boom', fireAt: 50 }, () => {});
    setTime(50);
    scheduler.tick();
    expect(scheduler.getEvent(eid)?.status).toBe('fired');
  });
});

describe('WorldEventScheduler — recurring events', () => {
  it('reschedules recurring events after firing', () => {
    const { deps, setTime } = makeControlledDeps();
    const scheduler = createWorldEventScheduler(deps);
    let count = 0;
    scheduler.schedule(
      { name: 'heartbeat', fireAt: 100, recurrence: 'recurring', intervalUs: 100 },
      () => {
        count += 1;
      },
    );
    setTime(100);
    scheduler.tick();
    expect(count).toBe(1);

    setTime(200);
    scheduler.tick();
    expect(count).toBe(2);
  });

  it('keeps recurring events as pending', () => {
    const { deps, setTime } = makeControlledDeps();
    const scheduler = createWorldEventScheduler(deps);
    const eid = scheduler.schedule(
      { name: 'pulse', fireAt: 50, recurrence: 'recurring', intervalUs: 50 },
      () => {},
    );
    setTime(50);
    scheduler.tick();
    expect(scheduler.getEvent(eid)?.status).toBe('pending');
  });
});

describe('WorldEventScheduler — cancellation', () => {
  it('cancels a pending event', () => {
    const scheduler = createWorldEventScheduler(makeDeps());
    const eid = scheduler.schedule({ name: 'test', fireAt: 5_000_000 }, () => {});
    expect(scheduler.cancel(eid)).toBe(true);
    expect(scheduler.getEvent(eid)?.status).toBe('cancelled');
  });

  it('returns false for unknown event', () => {
    const scheduler = createWorldEventScheduler(makeDeps());
    expect(scheduler.cancel('unknown')).toBe(false);
  });

  it('cancelled events do not fire', () => {
    const { deps, setTime } = makeControlledDeps();
    const scheduler = createWorldEventScheduler(deps);
    let fired = false;
    const eid = scheduler.schedule({ name: 'skip', fireAt: 100 }, () => {
      fired = true;
    });
    scheduler.cancel(eid);
    setTime(100);
    scheduler.tick();
    expect(fired).toBe(false);
  });
});

describe('WorldEventScheduler — stats', () => {
  it('tracks aggregate statistics', () => {
    const { deps, setTime } = makeControlledDeps();
    const scheduler = createWorldEventScheduler(deps);
    scheduler.schedule({ name: 'a', fireAt: 50 }, () => {});
    scheduler.schedule({ name: 'b', fireAt: 50 }, () => {});
    const eid = scheduler.schedule({ name: 'c', fireAt: 200 }, () => {});
    scheduler.cancel(eid);
    setTime(50);
    scheduler.tick();

    const stats = scheduler.getStats();
    expect(stats.totalScheduled).toBe(3);
    expect(stats.totalFired).toBe(2);
    expect(stats.totalCancelled).toBe(1);
    expect(stats.pendingEvents).toBe(0);
  });

  it('starts with zero stats', () => {
    const scheduler = createWorldEventScheduler(makeDeps());
    const stats = scheduler.getStats();
    expect(stats.totalScheduled).toBe(0);
    expect(stats.pendingEvents).toBe(0);
  });
});
