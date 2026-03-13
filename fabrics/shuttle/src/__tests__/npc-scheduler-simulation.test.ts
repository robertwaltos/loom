import { describe, expect, it } from 'vitest';
import { createNpcSchedulerSystem } from '../npc-scheduler.js';

describe('npc-scheduler simulation', () => {
  it('simulates daily activity registration and active-slot query', () => {
    const HOUR = 3_600_000_000n;
    let now = 1_000_000n;
    let id = 0;
    const sys = createNpcSchedulerSystem({
      clock: { now: () => (now += 1_000n) },
      idGen: { generate: () => `act-${++id}` },
      logger: { info: () => undefined, error: () => undefined },
    });

    sys.registerNpc('npc-1');
    sys.scheduleActivity('npc-1', 'WORK', 8n * HOUR, 4n * HOUR, 5, 'world-1');
    sys.scheduleActivity('npc-1', 'REST', 13n * HOUR, 2n * HOUR, 2, 'world-1');

    const day = sys.getDaySchedule('npc-1', 0n);
    const active = sys.getActiveActivity('npc-1', 10n * HOUR);

    expect(typeof day).toBe('object');
    if (typeof day === 'object') {
      expect(day.activities.length).toBe(2);
    }
    expect(active && typeof active === 'object' ? active.type : null).toBe('WORK');
  });
});
