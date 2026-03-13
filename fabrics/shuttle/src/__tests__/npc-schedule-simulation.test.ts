import { describe, expect, it } from 'vitest';
import { createNpcScheduleManager } from '../npc-schedule.js';

describe('npc-schedule simulation', () => {
  it('simulates baseline work block with temporary ritual override', () => {
    const HOUR = 3_600_000_000;
    let now = 1_000_000;
    const mgr = createNpcScheduleManager({
      clock: { nowMicroseconds: () => (now += 1_000_000) },
    });

    mgr.createSchedule('npc-1');
    mgr.addBlock({
      entityId: 'npc-1',
      activityType: 'work',
      startTimeUs: 8 * HOUR,
      endTimeUs: 17 * HOUR,
      locationId: 'forge',
    });
    mgr.addOverride({
      entityId: 'npc-1',
      overrideId: 'ov-ritual',
      activityType: 'worship',
      startTimeUs: 10 * HOUR,
      endTimeUs: 12 * HOUR,
      locationId: 'temple',
      reason: 'holy day',
      durationUs: 100_000_000,
    });

    const active = mgr.getActiveBlock('npc-1', 11 * HOUR);
    expect(active?.isOverride).toBe(true);
    expect(active?.block.activityType).toBe('worship');
  });
});
