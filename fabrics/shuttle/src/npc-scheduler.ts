/**
 * NPC Scheduler — Daily activity scheduling for AI-driven NPCs.
 *
 * Each NPC has a repeating daily template of scheduled activities.
 * Activities are placed at offsets from midnight (in microseconds) and
 * must not overlap. The scheduler resolves which activity is active at
 * any given offset within a day.
 *
 * Time model: offsets in microseconds from the start of the day.
 * One day = 86_400_000_000 µs.
 *
 * "The loom sets the pattern; the weaver fills the hours."
 */

// ============================================================================
// PORTS
// ============================================================================

export type NpcSchedulerClock = {
  now(): bigint;
};

export type NpcSchedulerIdGen = {
  generate(): string;
};

export type NpcSchedulerLogger = {
  info(message: string): void;
  error(message: string): void;
};

export type NpcSchedulerDeps = {
  readonly clock: NpcSchedulerClock;
  readonly idGen: NpcSchedulerIdGen;
  readonly logger: NpcSchedulerLogger;
};

// ============================================================================
// TYPES
// ============================================================================

export type NpcId = string;
export type ActivityId = string;

export type ScheduleError =
  | 'npc-not-found'
  | 'activity-not-found'
  | 'time-conflict'
  | 'already-registered'
  | 'invalid-time';

export type ActivityType = 'WORK' | 'REST' | 'SOCIAL' | 'TRADE' | 'PATROL' | 'RITUAL' | 'TRAVEL';

export type ScheduledActivity = {
  readonly activityId: ActivityId;
  readonly npcId: NpcId;
  readonly type: ActivityType;
  readonly startOffsetUs: bigint;
  readonly durationUs: bigint;
  readonly priority: number;
  readonly worldId: string;
  readonly scheduledAt: bigint;
};

export type DaySchedule = {
  readonly npcId: NpcId;
  readonly date: bigint;
  readonly activities: ReadonlyArray<ScheduledActivity>;
  readonly totalActiveUs: bigint;
};

export type SchedulerStats = {
  readonly totalNpcs: number;
  readonly totalActivities: number;
  readonly averageActivitiesPerNpc: number;
};

// ============================================================================
// PUBLIC API
// ============================================================================

export type NpcSchedulerSystem = {
  readonly registerNpc: (
    npcId: NpcId,
  ) => { success: true } | { success: false; error: ScheduleError };
  readonly scheduleActivity: (
    npcId: NpcId,
    type: ActivityType,
    startOffsetUs: bigint,
    durationUs: bigint,
    priority: number,
    worldId: string,
  ) => ScheduledActivity | ScheduleError;
  readonly cancelActivity: (
    npcId: NpcId,
    activityId: ActivityId,
  ) => { success: true } | { success: false; error: ScheduleError };
  readonly getDaySchedule: (npcId: NpcId, dayIndex: bigint) => DaySchedule | ScheduleError;
  readonly getActiveActivity: (
    npcId: NpcId,
    currentOffsetUs: bigint,
  ) => ScheduledActivity | null | ScheduleError;
  readonly rescheduleActivity: (
    npcId: NpcId,
    activityId: ActivityId,
    newStartOffsetUs: bigint,
    newDurationUs: bigint,
  ) => { success: true } | { success: false; error: ScheduleError };
  readonly getStats: () => SchedulerStats;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const DAY_DURATION_US = 86_400_000_000n;

// ============================================================================
// STATE
// ============================================================================

type MutableActivity = {
  activityId: ActivityId;
  npcId: NpcId;
  type: ActivityType;
  startOffsetUs: bigint;
  durationUs: bigint;
  priority: number;
  worldId: string;
  scheduledAt: bigint;
};

type NpcSchedulerState = {
  readonly deps: NpcSchedulerDeps;
  readonly npcs: Set<NpcId>;
  readonly activities: Map<ActivityId, MutableActivity>;
  readonly npcActivityIndex: Map<NpcId, Set<ActivityId>>;
};

// ============================================================================
// FACTORY
// ============================================================================

export function createNpcSchedulerSystem(deps: NpcSchedulerDeps): NpcSchedulerSystem {
  const state: NpcSchedulerState = {
    deps,
    npcs: new Set(),
    activities: new Map(),
    npcActivityIndex: new Map(),
  };

  return {
    registerNpc: (npcId) => registerNpcImpl(state, npcId),
    scheduleActivity: (npcId, type, startOffsetUs, durationUs, priority, worldId) =>
      scheduleActivityImpl(state, npcId, type, startOffsetUs, durationUs, priority, worldId),
    cancelActivity: (npcId, activityId) => cancelActivityImpl(state, npcId, activityId),
    getDaySchedule: (npcId, dayIndex) => getDayScheduleImpl(state, npcId, dayIndex),
    getActiveActivity: (npcId, currentOffsetUs) =>
      getActiveActivityImpl(state, npcId, currentOffsetUs),
    rescheduleActivity: (npcId, activityId, newStartOffsetUs, newDurationUs) =>
      rescheduleActivityImpl(state, npcId, activityId, newStartOffsetUs, newDurationUs),
    getStats: () => getStatsImpl(state),
  };
}

// ============================================================================
// REGISTRATION
// ============================================================================

function registerNpcImpl(
  state: NpcSchedulerState,
  npcId: NpcId,
): { success: true } | { success: false; error: ScheduleError } {
  if (state.npcs.has(npcId)) {
    return { success: false, error: 'already-registered' };
  }
  state.npcs.add(npcId);
  state.npcActivityIndex.set(npcId, new Set());
  state.deps.logger.info('npc-scheduler: registered npc ' + npcId);
  return { success: true };
}

// ============================================================================
// SCHEDULE ACTIVITY
// ============================================================================

function scheduleActivityImpl(
  state: NpcSchedulerState,
  npcId: NpcId,
  type: ActivityType,
  startOffsetUs: bigint,
  durationUs: bigint,
  priority: number,
  worldId: string,
): ScheduledActivity | ScheduleError {
  if (!state.npcs.has(npcId)) return 'npc-not-found';
  if (!isValidTime(startOffsetUs, durationUs)) return 'invalid-time';
  if (hasConflict(state, npcId, startOffsetUs, durationUs, null)) return 'time-conflict';

  const activityId = state.deps.idGen.generate();
  const activity: MutableActivity = {
    activityId,
    npcId,
    type,
    startOffsetUs,
    durationUs,
    priority,
    worldId,
    scheduledAt: state.deps.clock.now(),
  };

  state.activities.set(activityId, activity);
  const npcIndex = state.npcActivityIndex.get(npcId);
  if (npcIndex !== undefined) npcIndex.add(activityId);
  state.deps.logger.info('npc-scheduler: scheduled activity ' + activityId + ' for ' + npcId);
  return toReadonlyActivity(activity);
}

// ============================================================================
// CANCEL ACTIVITY
// ============================================================================

function cancelActivityImpl(
  state: NpcSchedulerState,
  npcId: NpcId,
  activityId: ActivityId,
): { success: true } | { success: false; error: ScheduleError } {
  if (!state.npcs.has(npcId)) return { success: false, error: 'npc-not-found' };
  const index = state.npcActivityIndex.get(npcId);
  if (index === undefined || !index.has(activityId)) {
    return { success: false, error: 'activity-not-found' };
  }
  index.delete(activityId);
  state.activities.delete(activityId);
  return { success: true };
}

// ============================================================================
// GET DAY SCHEDULE
// ============================================================================

function getDayScheduleImpl(
  state: NpcSchedulerState,
  npcId: NpcId,
  dayIndex: bigint,
): DaySchedule | ScheduleError {
  if (!state.npcs.has(npcId)) return 'npc-not-found';

  const index = state.npcActivityIndex.get(npcId) ?? new Set();
  const activities: ScheduledActivity[] = [];
  let totalActiveUs = 0n;

  for (const activityId of index) {
    const activity = state.activities.get(activityId);
    if (activity === undefined) continue;
    activities.push(toReadonlyActivity(activity));
    totalActiveUs += activity.durationUs;
  }

  activities.sort((a, b) => (a.startOffsetUs < b.startOffsetUs ? -1 : 1));
  return { npcId, date: dayIndex, activities, totalActiveUs };
}

// ============================================================================
// GET ACTIVE ACTIVITY
// ============================================================================

function getActiveActivityImpl(
  state: NpcSchedulerState,
  npcId: NpcId,
  currentOffsetUs: bigint,
): ScheduledActivity | null | ScheduleError {
  if (!state.npcs.has(npcId)) return 'npc-not-found';

  const index = state.npcActivityIndex.get(npcId) ?? new Set();
  for (const activityId of index) {
    const activity = state.activities.get(activityId);
    if (activity === undefined) continue;
    const end = activity.startOffsetUs + activity.durationUs;
    if (currentOffsetUs >= activity.startOffsetUs && currentOffsetUs < end) {
      return toReadonlyActivity(activity);
    }
  }
  return null;
}

// ============================================================================
// RESCHEDULE ACTIVITY
// ============================================================================

function rescheduleActivityImpl(
  state: NpcSchedulerState,
  npcId: NpcId,
  activityId: ActivityId,
  newStartOffsetUs: bigint,
  newDurationUs: bigint,
): { success: true } | { success: false; error: ScheduleError } {
  if (!state.npcs.has(npcId)) return { success: false, error: 'npc-not-found' };
  const index = state.npcActivityIndex.get(npcId);
  if (index === undefined || !index.has(activityId)) {
    return { success: false, error: 'activity-not-found' };
  }
  if (!isValidTime(newStartOffsetUs, newDurationUs)) {
    return { success: false, error: 'invalid-time' };
  }
  if (hasConflict(state, npcId, newStartOffsetUs, newDurationUs, activityId)) {
    return { success: false, error: 'time-conflict' };
  }

  const activity = state.activities.get(activityId);
  if (activity === undefined) return { success: false, error: 'activity-not-found' };
  activity.startOffsetUs = newStartOffsetUs;
  activity.durationUs = newDurationUs;
  return { success: true };
}

// ============================================================================
// STATS
// ============================================================================

function getStatsImpl(state: NpcSchedulerState): SchedulerStats {
  const totalNpcs = state.npcs.size;
  const totalActivities = state.activities.size;
  const averageActivitiesPerNpc = totalNpcs === 0 ? 0 : totalActivities / totalNpcs;
  return { totalNpcs, totalActivities, averageActivitiesPerNpc };
}

// ============================================================================
// HELPERS
// ============================================================================

function isValidTime(startOffsetUs: bigint, durationUs: bigint): boolean {
  return startOffsetUs >= 0n && startOffsetUs < DAY_DURATION_US && durationUs >= 1n;
}

function hasConflict(
  state: NpcSchedulerState,
  npcId: NpcId,
  startOffsetUs: bigint,
  durationUs: bigint,
  excludeId: ActivityId | null,
): boolean {
  const index = state.npcActivityIndex.get(npcId) ?? new Set();
  for (const activityId of index) {
    if (activityId === excludeId) continue;
    const existing = state.activities.get(activityId);
    if (existing === undefined) continue;
    if (overlaps(startOffsetUs, durationUs, existing.startOffsetUs, existing.durationUs)) {
      return true;
    }
  }
  return false;
}

function overlaps(startA: bigint, durA: bigint, startB: bigint, durB: bigint): boolean {
  return startA < startB + durB && startA + durA > startB;
}

function toReadonlyActivity(a: MutableActivity): ScheduledActivity {
  return {
    activityId: a.activityId,
    npcId: a.npcId,
    type: a.type,
    startOffsetUs: a.startOffsetUs,
    durationUs: a.durationUs,
    priority: a.priority,
    worldId: a.worldId,
    scheduledAt: a.scheduledAt,
  };
}
