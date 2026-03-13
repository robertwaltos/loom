import { describe, expect, it } from 'vitest';
import { createWorldEventScheduler } from '../world-event-scheduler.js';

describe('world-event-scheduler simulation', () => {
  it('simulates mixed one-shot and recurring world events over advancing time', () => {
    let now = 0;
    let id = 0;
    const scheduler = createWorldEventScheduler({
      idGenerator: { next: () => 'evt-' + String(++id) },
      clock: { nowMicroseconds: () => now },
    });

    const fired: string[] = [];
    scheduler.schedule({ name: 'sunrise', fireAt: 100 }, (e) => fired.push(e.name));
    scheduler.schedule(
      { name: 'heartbeat', fireAt: 50, recurrence: 'recurring', intervalUs: 50 },
      (e) => fired.push(e.name + '-' + String(e.firedCount)),
    );

    now = 50;
    scheduler.tick();
    now = 100;
    scheduler.tick();
    now = 150;
    scheduler.tick();

    const stats = scheduler.getStats();
    expect(fired).toContain('sunrise');
    expect(fired.filter((n) => n.startsWith('heartbeat')).length).toBe(3);
    expect(stats.totalFired).toBe(4);
    expect(stats.pendingEvents).toBe(1);
  });
});
