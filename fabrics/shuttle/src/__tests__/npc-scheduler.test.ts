import { describe, it, expect, beforeEach } from 'vitest';
import type { NpcSchedulerDeps, NpcSchedulerSystem } from '../npc-scheduler.js';
import { createNpcSchedulerSystem } from '../npc-scheduler.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMockDeps(): NpcSchedulerDeps {
  let time = 1_000_000n;
  let counter = 0;
  return {
    clock: {
      now: () => {
        time = time + 1000n;
        return time;
      },
    },
    idGen: { generate: () => 'act-' + String(++counter) },
    logger: { info: () => undefined, error: () => undefined },
  };
}

const ONE_HOUR_US = 3_600_000_000n;
const DAY_US = 86_400_000_000n;

// ============================================================================
// TESTS: REGISTRATION
// ============================================================================

describe('NpcScheduler - Registration', () => {
  let sys: NpcSchedulerSystem;

  beforeEach(() => {
    sys = createNpcSchedulerSystem(createMockDeps());
  });

  it('should register a new NPC successfully', () => {
    const result = sys.registerNpc('npc-1');
    expect(result.success).toBe(true);
  });

  it('should return already-registered for duplicate NPC', () => {
    sys.registerNpc('npc-1');
    const result = sys.registerNpc('npc-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('already-registered');
  });

  it('should allow multiple distinct NPCs', () => {
    const r1 = sys.registerNpc('npc-1');
    const r2 = sys.registerNpc('npc-2');
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
  });
});

// ============================================================================
// TESTS: SCHEDULE ACTIVITY
// ============================================================================

describe('NpcScheduler - Schedule Activity', () => {
  let sys: NpcSchedulerSystem;

  beforeEach(() => {
    sys = createNpcSchedulerSystem(createMockDeps());
    sys.registerNpc('npc-1');
  });

  it('should schedule an activity for a registered NPC', () => {
    const result = sys.scheduleActivity('npc-1', 'WORK', 0n, ONE_HOUR_US, 5, 'world-1');
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.type).toBe('WORK');
      expect(result.npcId).toBe('npc-1');
      expect(result.startOffsetUs).toBe(0n);
      expect(result.durationUs).toBe(ONE_HOUR_US);
    }
  });

  it('should return npc-not-found for unregistered NPC', () => {
    const result = sys.scheduleActivity('unknown', 'REST', 0n, ONE_HOUR_US, 1, 'world-1');
    expect(result).toBe('npc-not-found');
  });

  it('should reject invalid startOffsetUs >= DAY_US', () => {
    const result = sys.scheduleActivity('npc-1', 'WORK', DAY_US, ONE_HOUR_US, 1, 'world-1');
    expect(result).toBe('invalid-time');
  });

  it('should reject negative startOffsetUs', () => {
    const result = sys.scheduleActivity('npc-1', 'REST', -1n, ONE_HOUR_US, 1, 'world-1');
    expect(result).toBe('invalid-time');
  });

  it('should reject durationUs of 0', () => {
    const result = sys.scheduleActivity('npc-1', 'WORK', 0n, 0n, 1, 'world-1');
    expect(result).toBe('invalid-time');
  });

  it('should detect time conflict with overlapping activity', () => {
    sys.scheduleActivity('npc-1', 'WORK', 0n, ONE_HOUR_US * 2n, 5, 'world-1');
    const conflict = sys.scheduleActivity('npc-1', 'REST', ONE_HOUR_US, ONE_HOUR_US, 3, 'world-1');
    expect(conflict).toBe('time-conflict');
  });

  it('should allow adjacent non-overlapping activities', () => {
    sys.scheduleActivity('npc-1', 'WORK', 0n, ONE_HOUR_US, 5, 'world-1');
    const result = sys.scheduleActivity('npc-1', 'REST', ONE_HOUR_US, ONE_HOUR_US, 3, 'world-1');
    expect(typeof result).toBe('object');
  });
});

// ============================================================================
// TESTS: CANCEL ACTIVITY
// ============================================================================

describe('NpcScheduler - Cancel Activity', () => {
  let sys: NpcSchedulerSystem;

  beforeEach(() => {
    sys = createNpcSchedulerSystem(createMockDeps());
    sys.registerNpc('npc-1');
  });

  it('should cancel an existing activity', () => {
    const activity = sys.scheduleActivity('npc-1', 'WORK', 0n, ONE_HOUR_US, 5, 'world-1');
    if (typeof activity === 'string') throw new Error('expected activity');
    const result = sys.cancelActivity('npc-1', activity.activityId);
    expect(result.success).toBe(true);
  });

  it('should return npc-not-found for unknown NPC', () => {
    const result = sys.cancelActivity('ghost', 'act-1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('npc-not-found');
  });

  it('should return activity-not-found for unknown activity', () => {
    const result = sys.cancelActivity('npc-1', 'nonexistent');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('activity-not-found');
  });
});

// ============================================================================
// TESTS: GET DAY SCHEDULE
// ============================================================================

describe('NpcScheduler - Get Day Schedule', () => {
  let sys: NpcSchedulerSystem;

  beforeEach(() => {
    sys = createNpcSchedulerSystem(createMockDeps());
    sys.registerNpc('npc-1');
  });

  it('should return an empty schedule for an NPC with no activities', () => {
    const result = sys.getDaySchedule('npc-1', 0n);
    if (typeof result === 'string') throw new Error('expected schedule');
    expect(result.activities).toHaveLength(0);
    expect(result.totalActiveUs).toBe(0n);
  });

  it('should return npc-not-found for unknown NPC', () => {
    const result = sys.getDaySchedule('ghost', 0n);
    expect(result).toBe('npc-not-found');
  });

  it('should return activities sorted by startOffsetUs', () => {
    sys.scheduleActivity('npc-1', 'PATROL', ONE_HOUR_US * 8n, ONE_HOUR_US, 5, 'world-1');
    sys.scheduleActivity('npc-1', 'REST', ONE_HOUR_US * 6n, ONE_HOUR_US, 3, 'world-1');
    sys.scheduleActivity('npc-1', 'WORK', ONE_HOUR_US * 10n, ONE_HOUR_US, 4, 'world-1');
    const result = sys.getDaySchedule('npc-1', 1n);
    if (typeof result === 'string') throw new Error('expected schedule');
    expect(result.activities[0]?.startOffsetUs).toBe(ONE_HOUR_US * 6n);
    expect(result.activities[1]?.startOffsetUs).toBe(ONE_HOUR_US * 8n);
    expect(result.activities[2]?.startOffsetUs).toBe(ONE_HOUR_US * 10n);
  });

  it('should compute totalActiveUs as sum of durations', () => {
    sys.scheduleActivity('npc-1', 'WORK', 0n, ONE_HOUR_US, 5, 'world-1');
    sys.scheduleActivity('npc-1', 'REST', ONE_HOUR_US * 2n, ONE_HOUR_US * 3n, 3, 'world-1');
    const result = sys.getDaySchedule('npc-1', 0n);
    if (typeof result === 'string') throw new Error('expected schedule');
    expect(result.totalActiveUs).toBe(ONE_HOUR_US * 4n);
  });

  it('should embed the dayIndex in the returned schedule', () => {
    const result = sys.getDaySchedule('npc-1', 42n);
    if (typeof result === 'string') throw new Error('expected schedule');
    expect(result.date).toBe(42n);
  });
});

// ============================================================================
// TESTS: GET ACTIVE ACTIVITY
// ============================================================================

describe('NpcScheduler - Get Active Activity', () => {
  let sys: NpcSchedulerSystem;

  beforeEach(() => {
    sys = createNpcSchedulerSystem(createMockDeps());
    sys.registerNpc('npc-1');
    sys.scheduleActivity('npc-1', 'WORK', ONE_HOUR_US * 8n, ONE_HOUR_US * 4n, 5, 'world-1');
  });

  it('should return the active activity for a matching offset', () => {
    const result = sys.getActiveActivity('npc-1', ONE_HOUR_US * 10n);
    expect(result).not.toBeNull();
    if (result !== null && typeof result === 'object') {
      expect(result.type).toBe('WORK');
    }
  });

  it('should return null when no activity covers the offset', () => {
    const result = sys.getActiveActivity('npc-1', ONE_HOUR_US * 20n);
    expect(result).toBeNull();
  });

  it('should return npc-not-found for unregistered NPC', () => {
    const result = sys.getActiveActivity('ghost', 0n);
    expect(result).toBe('npc-not-found');
  });

  it('should not include activity at its exact end offset', () => {
    const endOffset = ONE_HOUR_US * 12n;
    const result = sys.getActiveActivity('npc-1', endOffset);
    expect(result).toBeNull();
  });
});

// ============================================================================
// TESTS: RESCHEDULE ACTIVITY
// ============================================================================

describe('NpcScheduler - Reschedule Activity', () => {
  let sys: NpcSchedulerSystem;

  beforeEach(() => {
    sys = createNpcSchedulerSystem(createMockDeps());
    sys.registerNpc('npc-1');
  });

  it('should reschedule an activity to a new time', () => {
    const activity = sys.scheduleActivity('npc-1', 'WORK', 0n, ONE_HOUR_US, 5, 'world-1');
    if (typeof activity === 'string') throw new Error('expected activity');
    const result = sys.rescheduleActivity(
      'npc-1',
      activity.activityId,
      ONE_HOUR_US * 4n,
      ONE_HOUR_US * 2n,
    );
    expect(result.success).toBe(true);
    const active = sys.getActiveActivity('npc-1', ONE_HOUR_US * 5n);
    if (active !== null && typeof active === 'object') {
      expect(active.activityId).toBe(activity.activityId);
    }
  });

  it('should reject reschedule if new time conflicts with another activity', () => {
    const a1 = sys.scheduleActivity('npc-1', 'WORK', 0n, ONE_HOUR_US, 5, 'world-1');
    sys.scheduleActivity('npc-1', 'REST', ONE_HOUR_US * 2n, ONE_HOUR_US, 3, 'world-1');
    if (typeof a1 === 'string') throw new Error('expected activity');
    const result = sys.rescheduleActivity('npc-1', a1.activityId, ONE_HOUR_US * 2n, ONE_HOUR_US);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('time-conflict');
  });

  it('should return activity-not-found for unknown activity', () => {
    const result = sys.rescheduleActivity('npc-1', 'no-such', 0n, ONE_HOUR_US);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('activity-not-found');
  });
});

// ============================================================================
// TESTS: STATS
// ============================================================================

describe('NpcScheduler - Stats', () => {
  it('should report zero stats on empty system', () => {
    const sys = createNpcSchedulerSystem(createMockDeps());
    const stats = sys.getStats();
    expect(stats.totalNpcs).toBe(0);
    expect(stats.totalActivities).toBe(0);
    expect(stats.averageActivitiesPerNpc).toBe(0);
  });

  it('should count NPCs and activities correctly', () => {
    const sys = createNpcSchedulerSystem(createMockDeps());
    sys.registerNpc('npc-1');
    sys.registerNpc('npc-2');
    sys.scheduleActivity('npc-1', 'WORK', 0n, ONE_HOUR_US, 5, 'world-1');
    sys.scheduleActivity('npc-1', 'REST', ONE_HOUR_US * 2n, ONE_HOUR_US, 3, 'world-1');
    sys.scheduleActivity('npc-2', 'PATROL', 0n, ONE_HOUR_US, 4, 'world-1');
    const stats = sys.getStats();
    expect(stats.totalNpcs).toBe(2);
    expect(stats.totalActivities).toBe(3);
    expect(stats.averageActivitiesPerNpc).toBe(1.5);
  });
});
