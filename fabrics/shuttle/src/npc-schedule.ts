/**
 * NPC Schedule Manager — Daily activity routines for AI agents.
 *
 * Bible v1.1 Part 5: NPCs follow daily schedules tied to world time.
 * Tier 3 Sentinels and Tier 4 Paragons operate on rich daily cycles
 * with work, social, rest, and patrol blocks. Tier 2 Inhabitants
 * follow simpler fixed routines.
 *
 * Schedules are composed of time blocks, each defining an activity
 * type and location. The engine evaluates which block is active
 * given the current world time and supports schedule overrides for
 * events (festivals, emergencies, quests).
 *
 * Time model: 24-hour clock in microseconds from day start.
 * A full day = 86_400_000_000 microseconds.
 *
 * "Every thread has its place in the weave."
 */

// ─── Types ──────────────────────────────────────────────────────────

export type ActivityType =
  | 'work'
  | 'rest'
  | 'social'
  | 'patrol'
  | 'trade'
  | 'worship'
  | 'travel'
  | 'idle';

export interface TimeBlock {
  readonly activityType: ActivityType;
  readonly startTimeUs: number;
  readonly endTimeUs: number;
  readonly locationId: string;
  readonly priority: number;
  readonly metadata: Readonly<Record<string, string>>;
}

export interface NpcSchedule {
  readonly entityId: string;
  readonly blocks: ReadonlyArray<TimeBlock>;
  readonly overrides: ReadonlyArray<ScheduleOverride>;
  readonly createdAt: number;
}

export interface ScheduleOverride {
  readonly overrideId: string;
  readonly activityType: ActivityType;
  readonly startTimeUs: number;
  readonly endTimeUs: number;
  readonly locationId: string;
  readonly reason: string;
  readonly expiresAt: number;
}

export interface ActiveBlock {
  readonly entityId: string;
  readonly block: TimeBlock;
  readonly isOverride: boolean;
  readonly overrideReason: string | null;
}

export interface AddBlockParams {
  readonly entityId: string;
  readonly activityType: ActivityType;
  readonly startTimeUs: number;
  readonly endTimeUs: number;
  readonly locationId: string;
  readonly priority?: number;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface AddOverrideParams {
  readonly entityId: string;
  readonly overrideId: string;
  readonly activityType: ActivityType;
  readonly startTimeUs: number;
  readonly endTimeUs: number;
  readonly locationId: string;
  readonly reason: string;
  readonly durationUs: number;
}

export interface ScheduleStats {
  readonly totalSchedules: number;
  readonly totalBlocks: number;
  readonly totalActiveOverrides: number;
}

// ─── Deps ───────────────────────────────────────────────────────────

export interface NpcScheduleDeps {
  readonly clock: { nowMicroseconds(): number };
}

// ─── Public Interface ───────────────────────────────────────────────

export interface NpcScheduleManager {
  createSchedule(entityId: string): NpcSchedule;
  addBlock(params: AddBlockParams): TimeBlock;
  removeBlock(entityId: string, index: number): boolean;
  addOverride(params: AddOverrideParams): ScheduleOverride;
  clearOverrides(entityId: string): number;
  getActiveBlock(entityId: string, dayTimeUs: number): ActiveBlock | undefined;
  getSchedule(entityId: string): NpcSchedule | undefined;
  removeSchedule(entityId: string): boolean;
  sweepOverrides(): number;
  getStats(): ScheduleStats;
}

// ─── Constants ──────────────────────────────────────────────────────

export const MICROSECONDS_PER_DAY = 86_400_000_000;

// ─── State ──────────────────────────────────────────────────────────

interface MutableSchedule {
  readonly entityId: string;
  readonly blocks: MutableBlock[];
  readonly overrides: MutableOverride[];
  readonly createdAt: number;
}

interface MutableBlock {
  readonly activityType: ActivityType;
  readonly startTimeUs: number;
  readonly endTimeUs: number;
  readonly locationId: string;
  readonly priority: number;
  readonly metadata: Record<string, string>;
}

interface MutableOverride {
  readonly overrideId: string;
  readonly activityType: ActivityType;
  readonly startTimeUs: number;
  readonly endTimeUs: number;
  readonly locationId: string;
  readonly reason: string;
  readonly expiresAt: number;
}

interface ScheduleState {
  readonly schedules: Map<string, MutableSchedule>;
  readonly deps: NpcScheduleDeps;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createNpcScheduleManager(deps: NpcScheduleDeps): NpcScheduleManager {
  const state: ScheduleState = { schedules: new Map(), deps };

  return {
    createSchedule: (eid) => createImpl(state, eid),
    addBlock: (p) => addBlockImpl(state, p),
    removeBlock: (eid, i) => removeBlockImpl(state, eid, i),
    addOverride: (p) => addOverrideImpl(state, p),
    clearOverrides: (eid) => clearOverridesImpl(state, eid),
    getActiveBlock: (eid, t) => activeBlockImpl(state, eid, t),
    getSchedule: (eid) => getScheduleImpl(state, eid),
    removeSchedule: (eid) => state.schedules.delete(eid),
    sweepOverrides: () => sweepImpl(state),
    getStats: () => computeStats(state),
  };
}

// ─── Create Schedule ────────────────────────────────────────────────

function createImpl(state: ScheduleState, entityId: string): NpcSchedule {
  if (state.schedules.has(entityId)) {
    throw new Error('Schedule for ' + entityId + ' already exists');
  }
  const schedule: MutableSchedule = {
    entityId,
    blocks: [],
    overrides: [],
    createdAt: state.deps.clock.nowMicroseconds(),
  };
  state.schedules.set(entityId, schedule);
  return toReadonly(schedule);
}

// ─── Blocks ─────────────────────────────────────────────────────────

function addBlockImpl(state: ScheduleState, params: AddBlockParams): TimeBlock {
  const schedule = getSchedule(state, params.entityId);
  const block: MutableBlock = {
    activityType: params.activityType,
    startTimeUs: params.startTimeUs,
    endTimeUs: params.endTimeUs,
    locationId: params.locationId,
    priority: params.priority ?? 0,
    metadata: params.metadata !== undefined ? { ...params.metadata } : {},
  };
  schedule.blocks.push(block);
  return toReadonlyBlock(block);
}

function removeBlockImpl(state: ScheduleState, entityId: string, index: number): boolean {
  const schedule = state.schedules.get(entityId);
  if (schedule === undefined) return false;
  if (index < 0 || index >= schedule.blocks.length) return false;
  schedule.blocks.splice(index, 1);
  return true;
}

// ─── Overrides ──────────────────────────────────────────────────────

function addOverrideImpl(state: ScheduleState, params: AddOverrideParams): ScheduleOverride {
  const schedule = getSchedule(state, params.entityId);
  const now = state.deps.clock.nowMicroseconds();
  const override: MutableOverride = {
    overrideId: params.overrideId,
    activityType: params.activityType,
    startTimeUs: params.startTimeUs,
    endTimeUs: params.endTimeUs,
    locationId: params.locationId,
    reason: params.reason,
    expiresAt: now + params.durationUs,
  };
  schedule.overrides.push(override);
  return toReadonlyOverride(override);
}

function clearOverridesImpl(state: ScheduleState, entityId: string): number {
  const schedule = state.schedules.get(entityId);
  if (schedule === undefined) return 0;
  const count = schedule.overrides.length;
  schedule.overrides.length = 0;
  return count;
}

// ─── Active Block ───────────────────────────────────────────────────

function activeBlockImpl(
  state: ScheduleState,
  entityId: string,
  dayTimeUs: number,
): ActiveBlock | undefined {
  const schedule = state.schedules.get(entityId);
  if (schedule === undefined) return undefined;

  const override = findActiveOverride(schedule, dayTimeUs, state);
  if (override !== undefined) return override;

  return findActiveBlock(schedule, entityId, dayTimeUs);
}

function findActiveOverride(
  schedule: MutableSchedule,
  dayTimeUs: number,
  state: ScheduleState,
): ActiveBlock | undefined {
  const now = state.deps.clock.nowMicroseconds();
  for (const ov of schedule.overrides) {
    if (now >= ov.expiresAt) continue;
    if (dayTimeUs >= ov.startTimeUs && dayTimeUs < ov.endTimeUs) {
      return buildOverrideBlock(schedule.entityId, ov);
    }
  }
  return undefined;
}

function buildOverrideBlock(entityId: string, ov: MutableOverride): ActiveBlock {
  return {
    entityId,
    block: {
      activityType: ov.activityType,
      startTimeUs: ov.startTimeUs,
      endTimeUs: ov.endTimeUs,
      locationId: ov.locationId,
      priority: 999,
      metadata: {},
    },
    isOverride: true,
    overrideReason: ov.reason,
  };
}

function findActiveBlock(
  schedule: MutableSchedule,
  entityId: string,
  dayTimeUs: number,
): ActiveBlock | undefined {
  let best: MutableBlock | undefined;
  for (const block of schedule.blocks) {
    if (dayTimeUs < block.startTimeUs || dayTimeUs >= block.endTimeUs) continue;
    if (best === undefined || block.priority > best.priority) {
      best = block;
    }
  }
  if (best === undefined) return undefined;
  return {
    entityId,
    block: toReadonlyBlock(best),
    isOverride: false,
    overrideReason: null,
  };
}

// ─── Queries ────────────────────────────────────────────────────────

function getScheduleImpl(state: ScheduleState, entityId: string): NpcSchedule | undefined {
  const schedule = state.schedules.get(entityId);
  return schedule !== undefined ? toReadonly(schedule) : undefined;
}

// ─── Sweep ──────────────────────────────────────────────────────────

function sweepImpl(state: ScheduleState): number {
  const now = state.deps.clock.nowMicroseconds();
  let removed = 0;
  for (const schedule of state.schedules.values()) {
    const before = schedule.overrides.length;
    const kept = schedule.overrides.filter((o) => now < o.expiresAt);
    schedule.overrides.length = 0;
    schedule.overrides.push(...kept);
    removed += before - kept.length;
  }
  return removed;
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: ScheduleState): ScheduleStats {
  let totalBlocks = 0;
  let totalActiveOverrides = 0;
  const now = state.deps.clock.nowMicroseconds();
  for (const schedule of state.schedules.values()) {
    totalBlocks += schedule.blocks.length;
    for (const ov of schedule.overrides) {
      if (now < ov.expiresAt) totalActiveOverrides += 1;
    }
  }
  return {
    totalSchedules: state.schedules.size,
    totalBlocks,
    totalActiveOverrides,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function getSchedule(state: ScheduleState, entityId: string): MutableSchedule {
  const schedule = state.schedules.get(entityId);
  if (schedule === undefined) {
    throw new Error('Schedule for ' + entityId + ' not found');
  }
  return schedule;
}

function toReadonly(schedule: MutableSchedule): NpcSchedule {
  return {
    entityId: schedule.entityId,
    blocks: schedule.blocks.map(toReadonlyBlock),
    overrides: schedule.overrides.map(toReadonlyOverride),
    createdAt: schedule.createdAt,
  };
}

function toReadonlyBlock(block: MutableBlock): TimeBlock {
  return {
    activityType: block.activityType,
    startTimeUs: block.startTimeUs,
    endTimeUs: block.endTimeUs,
    locationId: block.locationId,
    priority: block.priority,
    metadata: { ...block.metadata },
  };
}

function toReadonlyOverride(ov: MutableOverride): ScheduleOverride {
  return {
    overrideId: ov.overrideId,
    activityType: ov.activityType,
    startTimeUs: ov.startTimeUs,
    endTimeUs: ov.endTimeUs,
    locationId: ov.locationId,
    reason: ov.reason,
    expiresAt: ov.expiresAt,
  };
}
