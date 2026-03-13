import { describe, expect, it } from 'vitest';
import { createNpcScheduleV2System } from '../npc-schedule-v2.js';

describe('npc-schedule-v2 simulation', () => {
  it('simulates normal daily block resolution overridden by a high-priority interrupt', () => {
    let now = 1_000_000;
    let id = 0;
    const sys = createNpcScheduleV2System({
      clock: { nowMicroseconds: () => (now += 1_000_000) },
      idGenerator: { next: () => `sv2-${++id}` },
    });

    sys.createSchedule('npc-1');
    sys.addBlock({
      npcId: 'npc-1',
      activity: 'work',
      startHour: 8,
      endHour: 17,
      locationId: 'farm',
      days: [1, 2, 3, 4, 5],
    });
    sys.addInterrupt({
      npcId: 'npc-1',
      activity: 'travel',
      locationId: 'gate',
      reason: 'urgent escort',
      priority: 10,
      durationUs: 500_000_000,
    });

    const resolved = sys.resolve('npc-1', 10, 2);
    expect(resolved?.isInterrupt).toBe(true);
    expect(resolved?.activity).toBe('travel');
  });
});
