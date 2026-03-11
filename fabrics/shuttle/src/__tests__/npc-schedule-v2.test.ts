import { describe, it, expect } from 'vitest';
import { createNpcScheduleV2System } from '../npc-schedule-v2.js';
import type { ScheduleV2Deps, DayOfWeek } from '../npc-schedule-v2.js';

function makeDeps(): ScheduleV2Deps {
  let time = 1_000_000;
  let id = 0;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: { next: () => 'sched-' + String(++id) },
  };
}

describe('ScheduleV2 — creation', () => {
  it('creates a schedule for an NPC', () => {
    const sys = createNpcScheduleV2System(makeDeps());
    const schedule = sys.createSchedule('npc-1');
    expect(schedule.npcId).toBe('npc-1');
    expect(schedule.blocks).toHaveLength(0);
  });

  it('throws on duplicate schedule', () => {
    const sys = createNpcScheduleV2System(makeDeps());
    sys.createSchedule('npc-1');
    expect(() => sys.createSchedule('npc-1')).toThrow();
  });

  it('retrieves a schedule', () => {
    const sys = createNpcScheduleV2System(makeDeps());
    sys.createSchedule('npc-1');
    const schedule = sys.getSchedule('npc-1');
    expect(schedule).toBeDefined();
    expect(schedule?.npcId).toBe('npc-1');
  });

  it('returns undefined for unknown NPC', () => {
    const sys = createNpcScheduleV2System(makeDeps());
    expect(sys.getSchedule('missing')).toBeUndefined();
  });

  it('removes a schedule', () => {
    const sys = createNpcScheduleV2System(makeDeps());
    sys.createSchedule('npc-1');
    expect(sys.removeSchedule('npc-1')).toBe(true);
    expect(sys.getSchedule('npc-1')).toBeUndefined();
  });
});

describe('ScheduleV2 — blocks', () => {
  it('adds a time block', () => {
    const sys = createNpcScheduleV2System(makeDeps());
    sys.createSchedule('npc-1');
    const block = sys.addBlock({
      npcId: 'npc-1',
      activity: 'work',
      startHour: 8,
      endHour: 17,
      locationId: 'farm',
      days: [0, 1, 2, 3, 4] as DayOfWeek[],
    });
    expect(block.activity).toBe('work');
    expect(block.startHour).toBe(8);
    expect(block.endHour).toBe(17);
  });

  it('clamps hours to valid range', () => {
    const sys = createNpcScheduleV2System(makeDeps());
    sys.createSchedule('npc-1');
    const block = sys.addBlock({
      npcId: 'npc-1',
      activity: 'sleep',
      startHour: -5,
      endHour: 30,
      locationId: 'home',
      days: [0] as DayOfWeek[],
    });
    expect(block.startHour).toBe(0);
    expect(block.endHour).toBe(23);
  });

  it('removes a block by id', () => {
    const sys = createNpcScheduleV2System(makeDeps());
    sys.createSchedule('npc-1');
    const block = sys.addBlock({
      npcId: 'npc-1',
      activity: 'work',
      startHour: 8,
      endHour: 17,
      locationId: 'farm',
      days: [0] as DayOfWeek[],
    });
    expect(sys.removeBlock('npc-1', block.blockId)).toBe(true);
    const schedule = sys.getSchedule('npc-1');
    expect(schedule?.blocks).toHaveLength(0);
  });
});

describe('ScheduleV2 — resolution', () => {
  it('resolves the correct activity for time and day', () => {
    const sys = createNpcScheduleV2System(makeDeps());
    sys.createSchedule('npc-1');
    sys.addBlock({
      npcId: 'npc-1',
      activity: 'work',
      startHour: 8,
      endHour: 17,
      locationId: 'farm',
      days: [0, 1, 2, 3, 4] as DayOfWeek[],
    });
    const resolved = sys.resolve('npc-1', 10, 2 as DayOfWeek);
    expect(resolved).toBeDefined();
    expect(resolved?.activity).toBe('work');
    expect(resolved?.locationId).toBe('farm');
    expect(resolved?.isInterrupt).toBe(false);
  });

  it('returns undefined for unscheduled time', () => {
    const sys = createNpcScheduleV2System(makeDeps());
    sys.createSchedule('npc-1');
    sys.addBlock({
      npcId: 'npc-1',
      activity: 'work',
      startHour: 8,
      endHour: 17,
      locationId: 'farm',
      days: [0] as DayOfWeek[],
    });
    expect(sys.resolve('npc-1', 20, 0 as DayOfWeek)).toBeUndefined();
  });

  it('returns undefined for wrong day', () => {
    const sys = createNpcScheduleV2System(makeDeps());
    sys.createSchedule('npc-1');
    sys.addBlock({
      npcId: 'npc-1',
      activity: 'work',
      startHour: 8,
      endHour: 17,
      locationId: 'farm',
      days: [0] as DayOfWeek[],
    });
    expect(sys.resolve('npc-1', 10, 5 as DayOfWeek)).toBeUndefined();
  });

  it('resolves higher priority block when overlapping', () => {
    const sys = createNpcScheduleV2System(makeDeps());
    sys.createSchedule('npc-1');
    sys.addBlock({
      npcId: 'npc-1',
      activity: 'work',
      startHour: 8,
      endHour: 17,
      locationId: 'farm',
      days: [0] as DayOfWeek[],
      priority: 1,
    });
    sys.addBlock({
      npcId: 'npc-1',
      activity: 'eat',
      startHour: 12,
      endHour: 13,
      locationId: 'home',
      days: [0] as DayOfWeek[],
      priority: 5,
    });
    const resolved = sys.resolve('npc-1', 12, 0 as DayOfWeek);
    expect(resolved?.activity).toBe('eat');
  });

  it('handles overnight blocks (start > end)', () => {
    const sys = createNpcScheduleV2System(makeDeps());
    sys.createSchedule('npc-1');
    sys.addBlock({
      npcId: 'npc-1',
      activity: 'sleep',
      startHour: 22,
      endHour: 6,
      locationId: 'home',
      days: [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[],
    });
    const late = sys.resolve('npc-1', 23, 0 as DayOfWeek);
    expect(late?.activity).toBe('sleep');
    const early = sys.resolve('npc-1', 3, 0 as DayOfWeek);
    expect(early?.activity).toBe('sleep');
  });
});

describe('ScheduleV2 — interrupts', () => {
  it('interrupts override normal blocks', () => {
    const sys = createNpcScheduleV2System(makeDeps());
    sys.createSchedule('npc-1');
    sys.addBlock({
      npcId: 'npc-1',
      activity: 'work',
      startHour: 8,
      endHour: 17,
      locationId: 'farm',
      days: [0] as DayOfWeek[],
    });
    sys.addInterrupt({
      npcId: 'npc-1',
      activity: 'travel',
      locationId: 'gate',
      reason: 'emergency',
      priority: 10,
      durationUs: 999_000_000,
    });
    const resolved = sys.resolve('npc-1', 10, 0 as DayOfWeek);
    expect(resolved?.activity).toBe('travel');
    expect(resolved?.isInterrupt).toBe(true);
    expect(resolved?.reason).toBe('emergency');
  });

  it('clears interrupts for an NPC', () => {
    const sys = createNpcScheduleV2System(makeDeps());
    sys.createSchedule('npc-1');
    sys.addInterrupt({
      npcId: 'npc-1',
      activity: 'travel',
      locationId: 'gate',
      reason: 'attack',
      priority: 10,
      durationUs: 999_000_000,
    });
    expect(sys.clearInterrupts('npc-1')).toBe(1);
  });

  it('sweeps expired interrupts', () => {
    let time = 1_000_000;
    const deps: ScheduleV2Deps = {
      clock: { nowMicroseconds: () => time },
      idGenerator: { next: () => 'id-' + String(time++) },
    };
    const sys = createNpcScheduleV2System(deps);
    sys.createSchedule('npc-1');
    sys.addInterrupt({
      npcId: 'npc-1',
      activity: 'travel',
      locationId: 'gate',
      reason: 'test',
      priority: 5,
      durationUs: 100,
    });
    time += 1000;
    expect(sys.sweepExpiredInterrupts()).toBe(1);
  });
});

describe('ScheduleV2 — templates', () => {
  it('applies farmer template', () => {
    const sys = createNpcScheduleV2System(makeDeps());
    const schedule = sys.applyTemplate('npc-1', 'farmer');
    expect(schedule.blocks.length).toBeGreaterThan(3);
    const workBlocks = schedule.blocks.filter((b) => b.activity === 'work');
    expect(workBlocks.length).toBeGreaterThan(0);
  });

  it('applies guard template', () => {
    const sys = createNpcScheduleV2System(makeDeps());
    const schedule = sys.applyTemplate('npc-2', 'guard');
    const sleepBlocks = schedule.blocks.filter((b) => b.activity === 'sleep');
    expect(sleepBlocks.length).toBeGreaterThan(0);
  });

  it('applies scholar template with worship on sunday', () => {
    const sys = createNpcScheduleV2System(makeDeps());
    const schedule = sys.applyTemplate('npc-3', 'scholar');
    const worshipBlocks = schedule.blocks.filter((b) => b.activity === 'worship');
    expect(worshipBlocks.length).toBeGreaterThan(0);
  });
});

describe('ScheduleV2 — stats', () => {
  it('returns empty stats initially', () => {
    const sys = createNpcScheduleV2System(makeDeps());
    const stats = sys.getStats();
    expect(stats.totalSchedules).toBe(0);
    expect(stats.totalBlocks).toBe(0);
  });

  it('counts schedules and blocks', () => {
    const sys = createNpcScheduleV2System(makeDeps());
    sys.createSchedule('npc-1');
    sys.addBlock({
      npcId: 'npc-1',
      activity: 'work',
      startHour: 8,
      endHour: 17,
      locationId: 'farm',
      days: [0] as DayOfWeek[],
    });
    sys.addBlock({
      npcId: 'npc-1',
      activity: 'sleep',
      startHour: 22,
      endHour: 6,
      locationId: 'home',
      days: [0] as DayOfWeek[],
    });
    const stats = sys.getStats();
    expect(stats.totalSchedules).toBe(1);
    expect(stats.totalBlocks).toBe(2);
  });
});
