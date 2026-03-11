/**
 * transit-scheduler.ts — Schedule and manage transit windows between worlds.
 *
 * Transit windows define time-bounded intervals during which travel
 * between specific world pairs is permitted. Supports recurring
 * schedules, capacity limits per window, queue management, and
 * blackout period enforcement.
 */

// ── Ports ────────────────────────────────────────────────────────

interface SchedulerClock {
  readonly nowMicroseconds: () => number;
}

interface SchedulerIdGenerator {
  readonly generate: () => string;
}

// ── Deps ─────────────────────────────────────────────────────────

interface TransitSchedulerDeps {
  readonly clock: SchedulerClock;
  readonly idGenerator: SchedulerIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type WindowStatus = 'scheduled' | 'open' | 'closed' | 'cancelled';

interface TransitWindow {
  readonly windowId: string;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly opensAt: number;
  readonly closesAt: number;
  readonly capacity: number;
  readonly enrolled: number;
  readonly status: WindowStatus;
  readonly scheduleId: string | null;
}

interface CreateWindowParams {
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly opensAt: number;
  readonly closesAt: number;
  readonly capacity: number;
}

type RecurrenceInterval = 'hourly' | 'daily' | 'weekly';

interface RecurringSchedule {
  readonly scheduleId: string;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly intervalUs: number;
  readonly recurrence: RecurrenceInterval;
  readonly windowDurationUs: number;
  readonly capacity: number;
  readonly anchorTime: number;
  readonly enabled: boolean;
}

interface CreateScheduleParams {
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly recurrence: RecurrenceInterval;
  readonly windowDurationUs: number;
  readonly capacity: number;
  readonly anchorTime: number;
}

interface QueueEntry {
  readonly entityId: string;
  readonly windowId: string;
  readonly enqueuedAt: number;
  readonly position: number;
}

interface BlackoutPeriod {
  readonly blackoutId: string;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly startsAt: number;
  readonly endsAt: number;
  readonly reason: string;
}

interface CreateBlackoutParams {
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly startsAt: number;
  readonly endsAt: number;
  readonly reason: string;
}

type EnrollResult =
  | { readonly outcome: 'enrolled'; readonly position: number }
  | { readonly outcome: 'window_full' }
  | { readonly outcome: 'window_not_open' }
  | { readonly outcome: 'window_not_found' }
  | { readonly outcome: 'already_enrolled' }
  | { readonly outcome: 'blackout_active' };

interface SchedulerStats {
  readonly totalWindows: number;
  readonly openWindows: number;
  readonly scheduledWindows: number;
  readonly totalSchedules: number;
  readonly enabledSchedules: number;
  readonly totalQueued: number;
  readonly activeBlackouts: number;
}

// ── Constants ────────────────────────────────────────────────────

const US_PER_HOUR = 3_600_000_000;
const US_PER_DAY = 86_400_000_000;
const US_PER_WEEK = 604_800_000_000;

const RECURRENCE_TO_US: Readonly<Record<RecurrenceInterval, number>> = {
  hourly: US_PER_HOUR,
  daily: US_PER_DAY,
  weekly: US_PER_WEEK,
};

// ── State ────────────────────────────────────────────────────────

interface MutableWindow {
  readonly windowId: string;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly opensAt: number;
  readonly closesAt: number;
  readonly capacity: number;
  enrolled: number;
  status: WindowStatus;
  readonly scheduleId: string | null;
}

interface MutableSchedule {
  readonly scheduleId: string;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly intervalUs: number;
  readonly recurrence: RecurrenceInterval;
  readonly windowDurationUs: number;
  readonly capacity: number;
  readonly anchorTime: number;
  enabled: boolean;
}

interface SchedulerState {
  readonly deps: TransitSchedulerDeps;
  readonly windows: Map<string, MutableWindow>;
  readonly schedules: Map<string, MutableSchedule>;
  readonly queues: Map<string, QueueEntry[]>;
  readonly blackouts: Map<string, BlackoutPeriod>;
}

// ── Helpers ──────────────────────────────────────────────────────

function windowToReadonly(w: MutableWindow): TransitWindow {
  return { ...w };
}

function scheduleToReadonly(s: MutableSchedule): RecurringSchedule {
  return { ...s };
}

function isWindowOpen(w: MutableWindow, now: number): boolean {
  return now >= w.opensAt && now < w.closesAt && w.status !== 'cancelled';
}

function isBlackoutActive(b: BlackoutPeriod, now: number): boolean {
  return now >= b.startsAt && now < b.endsAt;
}

// ── Window Operations ────────────────────────────────────────────

function createWindowImpl(state: SchedulerState, params: CreateWindowParams): TransitWindow {
  const windowId = state.deps.idGenerator.generate();
  const now = state.deps.clock.nowMicroseconds();
  const status: WindowStatus = now >= params.opensAt ? 'open' : 'scheduled';
  const w: MutableWindow = {
    windowId,
    fromWorldId: params.fromWorldId,
    toWorldId: params.toWorldId,
    opensAt: params.opensAt,
    closesAt: params.closesAt,
    capacity: params.capacity,
    enrolled: 0,
    status,
    scheduleId: null,
  };
  state.windows.set(windowId, w);
  return windowToReadonly(w);
}

function getWindowImpl(state: SchedulerState, windowId: string): TransitWindow | undefined {
  const w = state.windows.get(windowId);
  if (w === undefined) return undefined;
  refreshWindowStatus(state, w);
  return windowToReadonly(w);
}

function refreshWindowStatus(state: SchedulerState, w: MutableWindow): void {
  if (w.status === 'cancelled') return;
  const now = state.deps.clock.nowMicroseconds();
  if (now >= w.closesAt) {
    w.status = 'closed';
  } else if (now >= w.opensAt) {
    w.status = 'open';
  }
}

function cancelWindowImpl(state: SchedulerState, windowId: string): boolean {
  const w = state.windows.get(windowId);
  if (w === undefined) return false;
  w.status = 'cancelled';
  state.queues.delete(windowId);
  return true;
}

function listWindowsImpl(
  state: SchedulerState,
  fromWorldId: string,
  toWorldId: string,
): readonly TransitWindow[] {
  const result: TransitWindow[] = [];
  for (const w of state.windows.values()) {
    if (w.fromWorldId !== fromWorldId) continue;
    if (w.toWorldId !== toWorldId) continue;
    refreshWindowStatus(state, w);
    result.push(windowToReadonly(w));
  }
  return result;
}

function listOpenWindowsImpl(state: SchedulerState): readonly TransitWindow[] {
  const now = state.deps.clock.nowMicroseconds();
  const result: TransitWindow[] = [];
  for (const w of state.windows.values()) {
    refreshWindowStatus(state, w);
    if (isWindowOpen(w, now)) {
      result.push(windowToReadonly(w));
    }
  }
  return result;
}

// ── Schedule Operations ──────────────────────────────────────────

function createScheduleImpl(
  state: SchedulerState,
  params: CreateScheduleParams,
): RecurringSchedule {
  const scheduleId = state.deps.idGenerator.generate();
  const s: MutableSchedule = {
    scheduleId,
    fromWorldId: params.fromWorldId,
    toWorldId: params.toWorldId,
    intervalUs: RECURRENCE_TO_US[params.recurrence],
    recurrence: params.recurrence,
    windowDurationUs: params.windowDurationUs,
    capacity: params.capacity,
    anchorTime: params.anchorTime,
    enabled: true,
  };
  state.schedules.set(scheduleId, s);
  return scheduleToReadonly(s);
}

function disableScheduleImpl(state: SchedulerState, scheduleId: string): boolean {
  const s = state.schedules.get(scheduleId);
  if (s === undefined) return false;
  s.enabled = false;
  return true;
}

function enableScheduleImpl(state: SchedulerState, scheduleId: string): boolean {
  const s = state.schedules.get(scheduleId);
  if (s === undefined) return false;
  s.enabled = true;
  return true;
}

function generateWindowsImpl(
  state: SchedulerState,
  scheduleId: string,
  count: number,
): readonly TransitWindow[] {
  const s = state.schedules.get(scheduleId);
  if (s === undefined) return [];
  if (!s.enabled) return [];
  const generated: TransitWindow[] = [];
  for (let i = 0; i < count; i++) {
    const opensAt = s.anchorTime + s.intervalUs * i;
    const closesAt = opensAt + s.windowDurationUs;
    const w: MutableWindow = {
      windowId: state.deps.idGenerator.generate(),
      fromWorldId: s.fromWorldId,
      toWorldId: s.toWorldId,
      opensAt,
      closesAt,
      capacity: s.capacity,
      enrolled: 0,
      status: 'scheduled',
      scheduleId: s.scheduleId,
    };
    state.windows.set(w.windowId, w);
    generated.push(windowToReadonly(w));
  }
  return generated;
}

function getScheduleImpl(state: SchedulerState, scheduleId: string): RecurringSchedule | undefined {
  const s = state.schedules.get(scheduleId);
  return s !== undefined ? scheduleToReadonly(s) : undefined;
}

// ── Enrollment / Queue ───────────────────────────────────────────

function enrollImpl(state: SchedulerState, windowId: string, entityId: string): EnrollResult {
  const w = state.windows.get(windowId);
  if (w === undefined) return { outcome: 'window_not_found' };
  refreshWindowStatus(state, w);
  return processEnrollment(state, w, entityId);
}

function processEnrollment(
  state: SchedulerState,
  w: MutableWindow,
  entityId: string,
): EnrollResult {
  if (w.status !== 'open' && w.status !== 'scheduled') {
    return { outcome: 'window_not_open' };
  }
  if (hasBlackoutForRoute(state, w.fromWorldId, w.toWorldId)) {
    return { outcome: 'blackout_active' };
  }
  if (isAlreadyEnrolled(state, w.windowId, entityId)) {
    return { outcome: 'already_enrolled' };
  }
  if (w.enrolled >= w.capacity) {
    return { outcome: 'window_full' };
  }
  return addToQueue(state, w, entityId);
}

function addToQueue(state: SchedulerState, w: MutableWindow, entityId: string): EnrollResult {
  w.enrolled += 1;
  const queue = getOrCreateQueue(state, w.windowId);
  const entry: QueueEntry = {
    entityId,
    windowId: w.windowId,
    enqueuedAt: state.deps.clock.nowMicroseconds(),
    position: queue.length + 1,
  };
  queue.push(entry);
  return { outcome: 'enrolled', position: entry.position };
}

function getOrCreateQueue(state: SchedulerState, windowId: string): QueueEntry[] {
  let queue = state.queues.get(windowId);
  if (queue === undefined) {
    queue = [];
    state.queues.set(windowId, queue);
  }
  return queue;
}

function isAlreadyEnrolled(state: SchedulerState, windowId: string, entityId: string): boolean {
  const queue = state.queues.get(windowId);
  if (queue === undefined) return false;
  return queue.some((e) => e.entityId === entityId);
}

function hasBlackoutForRoute(state: SchedulerState, from: string, to: string): boolean {
  const now = state.deps.clock.nowMicroseconds();
  for (const b of state.blackouts.values()) {
    if (b.fromWorldId !== from) continue;
    if (b.toWorldId !== to) continue;
    if (isBlackoutActive(b, now)) return true;
  }
  return false;
}

function getQueueImpl(state: SchedulerState, windowId: string): readonly QueueEntry[] {
  return state.queues.get(windowId) ?? [];
}

function dequeueImpl(state: SchedulerState, windowId: string, entityId: string): boolean {
  const queue = state.queues.get(windowId);
  if (queue === undefined) return false;
  const idx = queue.findIndex((e) => e.entityId === entityId);
  if (idx === -1) return false;
  queue.splice(idx, 1);
  const w = state.windows.get(windowId);
  if (w !== undefined) w.enrolled = Math.max(0, w.enrolled - 1);
  return true;
}

// ── Blackout Operations ──────────────────────────────────────────

function createBlackoutImpl(state: SchedulerState, params: CreateBlackoutParams): BlackoutPeriod {
  const blackoutId = state.deps.idGenerator.generate();
  const b: BlackoutPeriod = { blackoutId, ...params };
  state.blackouts.set(blackoutId, b);
  return b;
}

function removeBlackoutImpl(state: SchedulerState, blackoutId: string): boolean {
  return state.blackouts.delete(blackoutId);
}

function listActiveBlackoutsImpl(state: SchedulerState): readonly BlackoutPeriod[] {
  const now = state.deps.clock.nowMicroseconds();
  const result: BlackoutPeriod[] = [];
  for (const b of state.blackouts.values()) {
    if (isBlackoutActive(b, now)) result.push(b);
  }
  return result;
}

// ── Stats ────────────────────────────────────────────────────────

function countWindowsByStatus(state: SchedulerState): { open: number; scheduled: number } {
  let open = 0;
  let scheduled = 0;
  for (const w of state.windows.values()) {
    refreshWindowStatus(state, w);
    if (w.status === 'open') open += 1;
    if (w.status === 'scheduled') scheduled += 1;
  }
  return { open, scheduled };
}

function countActiveBlackouts(state: SchedulerState): number {
  const now = state.deps.clock.nowMicroseconds();
  let count = 0;
  for (const b of state.blackouts.values()) {
    if (isBlackoutActive(b, now)) count += 1;
  }
  return count;
}

function getStatsImpl(state: SchedulerState): SchedulerStats {
  const { open, scheduled } = countWindowsByStatus(state);
  let enabled = 0;
  for (const s of state.schedules.values()) {
    if (s.enabled) enabled += 1;
  }
  let totalQueued = 0;
  for (const q of state.queues.values()) {
    totalQueued += q.length;
  }
  return {
    totalWindows: state.windows.size,
    openWindows: open,
    scheduledWindows: scheduled,
    totalSchedules: state.schedules.size,
    enabledSchedules: enabled,
    totalQueued,
    activeBlackouts: countActiveBlackouts(state),
  };
}

// ── Public API ───────────────────────────────────────────────────

interface TransitScheduler {
  readonly createWindow: (params: CreateWindowParams) => TransitWindow;
  readonly getWindow: (windowId: string) => TransitWindow | undefined;
  readonly cancelWindow: (windowId: string) => boolean;
  readonly listWindows: (from: string, to: string) => readonly TransitWindow[];
  readonly listOpenWindows: () => readonly TransitWindow[];
  readonly createSchedule: (params: CreateScheduleParams) => RecurringSchedule;
  readonly disableSchedule: (scheduleId: string) => boolean;
  readonly enableSchedule: (scheduleId: string) => boolean;
  readonly generateWindows: (scheduleId: string, count: number) => readonly TransitWindow[];
  readonly getSchedule: (scheduleId: string) => RecurringSchedule | undefined;
  readonly enroll: (windowId: string, entityId: string) => EnrollResult;
  readonly getQueue: (windowId: string) => readonly QueueEntry[];
  readonly dequeue: (windowId: string, entityId: string) => boolean;
  readonly createBlackout: (params: CreateBlackoutParams) => BlackoutPeriod;
  readonly removeBlackout: (blackoutId: string) => boolean;
  readonly listActiveBlackouts: () => readonly BlackoutPeriod[];
  readonly getStats: () => SchedulerStats;
}

// ── Factory ──────────────────────────────────────────────────────

function createTransitScheduler(deps: TransitSchedulerDeps): TransitScheduler {
  const state: SchedulerState = {
    deps,
    windows: new Map(),
    schedules: new Map(),
    queues: new Map(),
    blackouts: new Map(),
  };
  return {
    createWindow: (p) => createWindowImpl(state, p),
    getWindow: (id) => getWindowImpl(state, id),
    cancelWindow: (id) => cancelWindowImpl(state, id),
    listWindows: (f, t) => listWindowsImpl(state, f, t),
    listOpenWindows: () => listOpenWindowsImpl(state),
    createSchedule: (p) => createScheduleImpl(state, p),
    disableSchedule: (id) => disableScheduleImpl(state, id),
    enableSchedule: (id) => enableScheduleImpl(state, id),
    generateWindows: (id, n) => generateWindowsImpl(state, id, n),
    getSchedule: (id) => getScheduleImpl(state, id),
    enroll: (wId, eId) => enrollImpl(state, wId, eId),
    getQueue: (wId) => getQueueImpl(state, wId),
    dequeue: (wId, eId) => dequeueImpl(state, wId, eId),
    createBlackout: (p) => createBlackoutImpl(state, p),
    removeBlackout: (id) => removeBlackoutImpl(state, id),
    listActiveBlackouts: () => listActiveBlackoutsImpl(state),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createTransitScheduler };
export type {
  TransitScheduler,
  TransitSchedulerDeps,
  SchedulerClock,
  SchedulerIdGenerator,
  TransitWindow,
  CreateWindowParams,
  WindowStatus,
  RecurringSchedule,
  CreateScheduleParams,
  RecurrenceInterval,
  QueueEntry,
  BlackoutPeriod,
  CreateBlackoutParams,
  EnrollResult,
  SchedulerStats,
};
