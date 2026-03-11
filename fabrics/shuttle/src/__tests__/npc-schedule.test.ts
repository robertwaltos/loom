import { describe, it, expect } from 'vitest';
import { createNpcScheduleManager, MICROSECONDS_PER_DAY } from '../npc-schedule.js';
import type { NpcScheduleDeps } from '../npc-schedule.js';

const HOUR = 3_600_000_000; // 1 hour in microseconds

function makeDeps(): NpcScheduleDeps {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('NpcScheduleManager — schedule creation', () => {
  it('creates a schedule for an entity', () => {
    const mgr = createNpcScheduleManager(makeDeps());
    const schedule = mgr.createSchedule('npc-1');
    expect(schedule.entityId).toBe('npc-1');
    expect(schedule.blocks).toHaveLength(0);
    expect(schedule.overrides).toHaveLength(0);
  });

  it('rejects duplicate schedules', () => {
    const mgr = createNpcScheduleManager(makeDeps());
    mgr.createSchedule('npc-1');
    expect(() => mgr.createSchedule('npc-1')).toThrow('already exists');
  });
});

describe('NpcScheduleManager — time blocks', () => {
  it('adds a time block to a schedule', () => {
    const mgr = createNpcScheduleManager(makeDeps());
    mgr.createSchedule('npc-1');
    const block = mgr.addBlock({
      entityId: 'npc-1',
      activityType: 'work',
      startTimeUs: 8 * HOUR,
      endTimeUs: 17 * HOUR,
      locationId: 'forge-1',
    });
    expect(block.activityType).toBe('work');
    expect(block.locationId).toBe('forge-1');
  });

  it('throws for unknown entity', () => {
    const mgr = createNpcScheduleManager(makeDeps());
    expect(() =>
      mgr.addBlock({
        entityId: 'unknown',
        activityType: 'idle',
        startTimeUs: 0,
        endTimeUs: HOUR,
        locationId: 'loc',
      }),
    ).toThrow('not found');
  });

  it('removes a block by index', () => {
    const mgr = createNpcScheduleManager(makeDeps());
    mgr.createSchedule('npc-1');
    mgr.addBlock({
      entityId: 'npc-1',
      activityType: 'work',
      startTimeUs: 0,
      endTimeUs: HOUR,
      locationId: 'loc',
    });
    expect(mgr.removeBlock('npc-1', 0)).toBe(true);
    expect(mgr.getSchedule('npc-1')?.blocks).toHaveLength(0);
  });

  it('returns false for invalid index', () => {
    const mgr = createNpcScheduleManager(makeDeps());
    mgr.createSchedule('npc-1');
    expect(mgr.removeBlock('npc-1', 5)).toBe(false);
  });

  it('stores block metadata', () => {
    const mgr = createNpcScheduleManager(makeDeps());
    mgr.createSchedule('npc-1');
    const block = mgr.addBlock({
      entityId: 'npc-1',
      activityType: 'trade',
      startTimeUs: 10 * HOUR,
      endTimeUs: 12 * HOUR,
      locationId: 'market',
      metadata: { goods: 'potions' },
    });
    expect(block.metadata).toEqual({ goods: 'potions' });
  });
});

describe('NpcScheduleManager — active block basic', () => {
  it('finds the active block for a given time', () => {
    const mgr = createNpcScheduleManager(makeDeps());
    mgr.createSchedule('npc-1');
    mgr.addBlock({
      entityId: 'npc-1',
      activityType: 'rest',
      startTimeUs: 0,
      endTimeUs: 8 * HOUR,
      locationId: 'home',
    });
    mgr.addBlock({
      entityId: 'npc-1',
      activityType: 'work',
      startTimeUs: 8 * HOUR,
      endTimeUs: 17 * HOUR,
      locationId: 'forge',
    });

    const active = mgr.getActiveBlock('npc-1', 10 * HOUR);
    expect(active?.block.activityType).toBe('work');
    expect(active?.isOverride).toBe(false);
  });

  it('returns undefined when no block matches', () => {
    const mgr = createNpcScheduleManager(makeDeps());
    mgr.createSchedule('npc-1');
    mgr.addBlock({
      entityId: 'npc-1',
      activityType: 'work',
      startTimeUs: 8 * HOUR,
      endTimeUs: 17 * HOUR,
      locationId: 'forge',
    });

    const active = mgr.getActiveBlock('npc-1', 20 * HOUR);
    expect(active).toBeUndefined();
  });

  it('returns undefined for unknown entity', () => {
    const mgr = createNpcScheduleManager(makeDeps());
    expect(mgr.getActiveBlock('unknown', 0)).toBeUndefined();
  });
});

describe('NpcScheduleManager — active block priority', () => {
  it('returns higher priority block on overlap', () => {
    const mgr = createNpcScheduleManager(makeDeps());
    mgr.createSchedule('npc-1');
    mgr.addBlock({
      entityId: 'npc-1',
      activityType: 'idle',
      startTimeUs: 0,
      endTimeUs: 24 * HOUR,
      locationId: 'town',
      priority: 0,
    });
    mgr.addBlock({
      entityId: 'npc-1',
      activityType: 'patrol',
      startTimeUs: 6 * HOUR,
      endTimeUs: 12 * HOUR,
      locationId: 'walls',
      priority: 5,
    });

    const active = mgr.getActiveBlock('npc-1', 9 * HOUR);
    expect(active?.block.activityType).toBe('patrol');
  });
});

describe('NpcScheduleManager — override priority', () => {
  it('adds an override that takes priority', () => {
    let time = 1_000_000;
    const mgr = createNpcScheduleManager({
      clock: { nowMicroseconds: () => (time += 1_000_000) },
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
      overrideId: 'ov-1',
      activityType: 'worship',
      startTimeUs: 10 * HOUR,
      endTimeUs: 12 * HOUR,
      locationId: 'temple',
      reason: 'festival',
      durationUs: 100_000_000,
    });

    const active = mgr.getActiveBlock('npc-1', 11 * HOUR);
    expect(active?.isOverride).toBe(true);
    expect(active?.block.activityType).toBe('worship');
    expect(active?.overrideReason).toBe('festival');
  });
});

describe('NpcScheduleManager — override expiry', () => {
  it('ignores expired overrides', () => {
    let time = 0;
    const mgr = createNpcScheduleManager({
      clock: {
        nowMicroseconds: () => {
          time += 1_000_000;
          return time;
        },
      },
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
      overrideId: 'ov-1',
      activityType: 'worship',
      startTimeUs: 10 * HOUR,
      endTimeUs: 12 * HOUR,
      locationId: 'temple',
      reason: 'festival',
      durationUs: 5_000_000,
    });

    // Advance past expiration
    time += 100_000_000;
    const active = mgr.getActiveBlock('npc-1', 11 * HOUR);
    expect(active?.block.activityType).toBe('work');
    expect(active?.isOverride).toBe(false);
  });
});

describe('NpcScheduleManager — override management', () => {
  it('clears all overrides for an entity', () => {
    const mgr = createNpcScheduleManager(makeDeps());
    mgr.createSchedule('npc-1');
    mgr.addOverride({
      entityId: 'npc-1',
      overrideId: 'ov-1',
      activityType: 'patrol',
      startTimeUs: 0,
      endTimeUs: HOUR,
      locationId: 'walls',
      reason: 'alert',
      durationUs: 100_000_000,
    });
    mgr.addOverride({
      entityId: 'npc-1',
      overrideId: 'ov-2',
      activityType: 'rest',
      startTimeUs: HOUR,
      endTimeUs: 2 * HOUR,
      locationId: 'home',
      reason: 'tired',
      durationUs: 100_000_000,
    });

    expect(mgr.clearOverrides('npc-1')).toBe(2);
    expect(mgr.getSchedule('npc-1')?.overrides).toHaveLength(0);
  });
});

describe('NpcScheduleManager — sweep', () => {
  it('removes expired overrides', () => {
    let time = 0;
    const mgr = createNpcScheduleManager({
      clock: {
        nowMicroseconds: () => {
          time += 1_000_000;
          return time;
        },
      },
    });
    mgr.createSchedule('npc-1');
    mgr.addOverride({
      entityId: 'npc-1',
      overrideId: 'ov-1',
      activityType: 'patrol',
      startTimeUs: 0,
      endTimeUs: HOUR,
      locationId: 'walls',
      reason: 'alert',
      durationUs: 5_000_000,
    });

    time += 100_000_000;
    const removed = mgr.sweepOverrides();
    expect(removed).toBe(1);
  });
});

describe('NpcScheduleManager — queries and removal', () => {
  it('gets schedule by entity id', () => {
    const mgr = createNpcScheduleManager(makeDeps());
    mgr.createSchedule('npc-1');
    expect(mgr.getSchedule('npc-1')?.entityId).toBe('npc-1');
  });

  it('returns undefined for unknown entity', () => {
    const mgr = createNpcScheduleManager(makeDeps());
    expect(mgr.getSchedule('unknown')).toBeUndefined();
  });

  it('removes a schedule', () => {
    const mgr = createNpcScheduleManager(makeDeps());
    mgr.createSchedule('npc-1');
    expect(mgr.removeSchedule('npc-1')).toBe(true);
    expect(mgr.getSchedule('npc-1')).toBeUndefined();
  });
});

describe('NpcScheduleManager — stats', () => {
  it('computes aggregate stats', () => {
    const mgr = createNpcScheduleManager(makeDeps());
    mgr.createSchedule('npc-1');
    mgr.createSchedule('npc-2');
    mgr.addBlock({
      entityId: 'npc-1',
      activityType: 'work',
      startTimeUs: 0,
      endTimeUs: HOUR,
      locationId: 'loc',
    });
    mgr.addBlock({
      entityId: 'npc-1',
      activityType: 'rest',
      startTimeUs: HOUR,
      endTimeUs: 2 * HOUR,
      locationId: 'loc',
    });

    const stats = mgr.getStats();
    expect(stats.totalSchedules).toBe(2);
    expect(stats.totalBlocks).toBe(2);
  });
});

describe('NpcScheduleManager — constants', () => {
  it('exports microseconds per day', () => {
    expect(MICROSECONDS_PER_DAY).toBe(86_400_000_000);
  });
});
