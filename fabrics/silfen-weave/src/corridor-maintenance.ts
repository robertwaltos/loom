/**
 * corridor-maintenance.ts — Scheduled corridor maintenance and repair system.
 *
 * Corridors in the Silfen Weave require regular maintenance to prevent
 * degradation and ensure reliable transit. This module manages maintenance
 * tasks including routine inspections, emergency repairs, upgrades,
 * and structural reinforcement. Tasks progress through a lifecycle:
 *
 *   scheduled -> in_progress -> completed
 *   scheduled -> cancelled
 *   in_progress -> cancelled
 *
 * Constraints:
 *   - Max concurrent maintenance per corridor is bounded
 *   - Each maintenance type has a cost multiplier
 *   - Emergency maintenance takes priority and bypasses scheduling limits
 *   - Completed tasks generate maintenance reports
 */

// ── Ports ────────────────────────────────────────────────────────

interface MaintenanceClock {
  readonly nowMicroseconds: () => number;
}

interface MaintenanceIdGenerator {
  readonly generate: () => string;
}

// ── Deps ─────────────────────────────────────────────────────────

interface MaintenanceDeps {
  readonly clock: MaintenanceClock;
  readonly idGenerator: MaintenanceIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type MaintenanceType = 'routine' | 'emergency' | 'upgrade' | 'reinforcement';

type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

interface MaintenanceTask {
  readonly taskId: string;
  readonly corridorId: string;
  readonly maintenanceType: MaintenanceType;
  readonly status: MaintenanceStatus;
  readonly scheduledAt: number;
  readonly startedAt: number | null;
  readonly completedAt: number | null;
  readonly estimatedDurationUs: number;
  readonly actualDurationUs: number | null;
  readonly costMultiplier: number;
  readonly notes: string;
}

interface MaintenanceSchedule {
  readonly corridorId: string;
  readonly lastMaintenanceAt: number | null;
  readonly nextMaintenanceAt: number;
  readonly intervalUs: number;
  readonly totalCompleted: number;
}

interface MaintenanceReport {
  readonly reportId: string;
  readonly taskId: string;
  readonly corridorId: string;
  readonly maintenanceType: MaintenanceType;
  readonly durationUs: number;
  readonly completedAt: number;
  readonly findings: string;
}

interface ScheduleTaskParams {
  readonly corridorId: string;
  readonly maintenanceType: MaintenanceType;
  readonly estimatedDurationUs: number;
  readonly notes?: string;
}

interface CompleteTaskParams {
  readonly taskId: string;
  readonly findings?: string;
}

interface MaintenanceStats {
  readonly totalScheduled: number;
  readonly totalInProgress: number;
  readonly totalCompleted: number;
  readonly totalCancelled: number;
  readonly totalReports: number;
  readonly corridorsTracked: number;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_MAINTENANCE_INTERVAL_US = 86_400_000_000;

const MAX_CONCURRENT_MAINTENANCE = 3;

const MAINTENANCE_COST_MULTIPLIERS: Readonly<Record<MaintenanceType, number>> = {
  routine: 1.0,
  emergency: 3.0,
  upgrade: 2.5,
  reinforcement: 2.0,
};

// ── State ────────────────────────────────────────────────────────

interface MutableTask {
  readonly taskId: string;
  readonly corridorId: string;
  readonly maintenanceType: MaintenanceType;
  status: MaintenanceStatus;
  readonly scheduledAt: number;
  startedAt: number | null;
  completedAt: number | null;
  readonly estimatedDurationUs: number;
  actualDurationUs: number | null;
  readonly costMultiplier: number;
  readonly notes: string;
}

interface MutableSchedule {
  readonly corridorId: string;
  lastMaintenanceAt: number | null;
  nextMaintenanceAt: number;
  readonly intervalUs: number;
  totalCompleted: number;
}

interface MaintenanceState {
  readonly deps: MaintenanceDeps;
  readonly tasks: Map<string, MutableTask>;
  readonly schedules: Map<string, MutableSchedule>;
  readonly reports: Map<string, MaintenanceReport>;
  readonly tasksByCorridorId: Map<string, Set<string>>;
  totalScheduled: number;
  totalInProgress: number;
  totalCompleted: number;
  totalCancelled: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonlyTask(task: MutableTask): MaintenanceTask {
  return {
    taskId: task.taskId,
    corridorId: task.corridorId,
    maintenanceType: task.maintenanceType,
    status: task.status,
    scheduledAt: task.scheduledAt,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    estimatedDurationUs: task.estimatedDurationUs,
    actualDurationUs: task.actualDurationUs,
    costMultiplier: task.costMultiplier,
    notes: task.notes,
  };
}

function toReadonlySchedule(schedule: MutableSchedule): MaintenanceSchedule {
  return {
    corridorId: schedule.corridorId,
    lastMaintenanceAt: schedule.lastMaintenanceAt,
    nextMaintenanceAt: schedule.nextMaintenanceAt,
    intervalUs: schedule.intervalUs,
    totalCompleted: schedule.totalCompleted,
  };
}

function getCorridorTaskSet(state: MaintenanceState, corridorId: string): Set<string> {
  let set = state.tasksByCorridorId.get(corridorId);
  if (!set) {
    set = new Set();
    state.tasksByCorridorId.set(corridorId, set);
  }
  return set;
}

function countActiveForCorridor(state: MaintenanceState, corridorId: string): number {
  const taskIds = state.tasksByCorridorId.get(corridorId);
  if (!taskIds) return 0;
  let count = 0;
  for (const taskId of taskIds) {
    const task = state.tasks.get(taskId);
    if (task && task.status === 'in_progress') count += 1;
  }
  return count;
}

// ── Schedule Task ────────────────────────────────────────────────

type ScheduleTaskError = 'corridor_not_registered' | 'max_concurrent_reached';

function scheduleTask(
  state: MaintenanceState,
  params: ScheduleTaskParams,
): MaintenanceTask | ScheduleTaskError {
  const schedule = state.schedules.get(params.corridorId);
  if (!schedule) return 'corridor_not_registered';
  const activeCount = countActiveForCorridor(state, params.corridorId);
  if (activeCount >= MAX_CONCURRENT_MAINTENANCE && params.maintenanceType !== 'emergency') {
    return 'max_concurrent_reached';
  }
  return createTaskRecord(state, params);
}

function createTaskRecord(state: MaintenanceState, params: ScheduleTaskParams): MaintenanceTask {
  const now = state.deps.clock.nowMicroseconds();
  const taskId = state.deps.idGenerator.generate();
  const multiplier = MAINTENANCE_COST_MULTIPLIERS[params.maintenanceType];
  const task: MutableTask = {
    taskId,
    corridorId: params.corridorId,
    maintenanceType: params.maintenanceType,
    status: 'scheduled',
    scheduledAt: now,
    startedAt: null,
    completedAt: null,
    estimatedDurationUs: params.estimatedDurationUs,
    actualDurationUs: null,
    costMultiplier: multiplier,
    notes: params.notes ?? '',
  };
  state.tasks.set(taskId, task);
  getCorridorTaskSet(state, params.corridorId).add(taskId);
  state.totalScheduled += 1;
  return toReadonlyTask(task);
}

// ── Start Task ───────────────────────────────────────────────────

type StartTaskError = 'task_not_found' | 'task_not_scheduled' | 'max_concurrent_reached';

function startTask(state: MaintenanceState, taskId: string): MaintenanceTask | StartTaskError {
  const task = state.tasks.get(taskId);
  if (!task) return 'task_not_found';
  if (task.status !== 'scheduled') return 'task_not_scheduled';
  const activeCount = countActiveForCorridor(state, task.corridorId);
  if (activeCount >= MAX_CONCURRENT_MAINTENANCE && task.maintenanceType !== 'emergency') {
    return 'max_concurrent_reached';
  }
  task.status = 'in_progress';
  task.startedAt = state.deps.clock.nowMicroseconds();
  state.totalInProgress += 1;
  return toReadonlyTask(task);
}

// ── Complete Task ────────────────────────────────────────────────

type CompleteTaskError = 'task_not_found' | 'task_not_in_progress';

function completeTask(
  state: MaintenanceState,
  params: CompleteTaskParams,
): MaintenanceReport | CompleteTaskError {
  const task = state.tasks.get(params.taskId);
  if (!task) return 'task_not_found';
  if (task.status !== 'in_progress') return 'task_not_in_progress';
  const now = state.deps.clock.nowMicroseconds();
  return finalizeTask(state, task, now, params.findings ?? '');
}

function finalizeTask(
  state: MaintenanceState,
  task: MutableTask,
  now: number,
  findings: string,
): MaintenanceReport {
  task.status = 'completed';
  task.completedAt = now;
  task.actualDurationUs = now - (task.startedAt ?? now);
  state.totalCompleted += 1;
  state.totalInProgress = Math.max(0, state.totalInProgress - 1);
  updateScheduleAfterCompletion(state, task.corridorId, now);
  return generateReport(state, task, findings);
}

function updateScheduleAfterCompletion(
  state: MaintenanceState,
  corridorId: string,
  now: number,
): void {
  const schedule = state.schedules.get(corridorId);
  if (!schedule) return;
  schedule.lastMaintenanceAt = now;
  schedule.nextMaintenanceAt = now + schedule.intervalUs;
  schedule.totalCompleted += 1;
}

function generateReport(
  state: MaintenanceState,
  task: MutableTask,
  findings: string,
): MaintenanceReport {
  const reportId = state.deps.idGenerator.generate();
  const report: MaintenanceReport = {
    reportId,
    taskId: task.taskId,
    corridorId: task.corridorId,
    maintenanceType: task.maintenanceType,
    durationUs: task.actualDurationUs ?? 0,
    completedAt: task.completedAt ?? 0,
    findings,
  };
  state.reports.set(reportId, report);
  return report;
}

// ── Cancel Task ──────────────────────────────────────────────────

type CancelTaskError = 'task_not_found' | 'task_already_completed' | 'task_already_cancelled';

function cancelTask(state: MaintenanceState, taskId: string): MaintenanceTask | CancelTaskError {
  const task = state.tasks.get(taskId);
  if (!task) return 'task_not_found';
  if (task.status === 'completed') return 'task_already_completed';
  if (task.status === 'cancelled') return 'task_already_cancelled';
  const wasInProgress = task.status === 'in_progress';
  task.status = 'cancelled';
  state.totalCancelled += 1;
  if (wasInProgress) {
    state.totalInProgress = Math.max(0, state.totalInProgress - 1);
  }
  return toReadonlyTask(task);
}

// ── Register Corridor ────────────────────────────────────────────

function registerCorridor(
  state: MaintenanceState,
  corridorId: string,
  intervalUs?: number,
): MaintenanceSchedule {
  const now = state.deps.clock.nowMicroseconds();
  const interval = intervalUs ?? DEFAULT_MAINTENANCE_INTERVAL_US;
  const schedule: MutableSchedule = {
    corridorId,
    lastMaintenanceAt: null,
    nextMaintenanceAt: now + interval,
    intervalUs: interval,
    totalCompleted: 0,
  };
  state.schedules.set(corridorId, schedule);
  return toReadonlySchedule(schedule);
}

// ── Unregister Corridor ──────────────────────────────────────────

function unregisterCorridor(state: MaintenanceState, corridorId: string): boolean {
  const removed = state.schedules.delete(corridorId);
  if (!removed) return false;
  const taskIds = state.tasksByCorridorId.get(corridorId);
  if (taskIds) {
    for (const tid of taskIds) state.tasks.delete(tid);
    state.tasksByCorridorId.delete(corridorId);
  }
  return true;
}

// ── Queries ──────────────────────────────────────────────────────

function getTask(state: MaintenanceState, taskId: string): MaintenanceTask | undefined {
  const task = state.tasks.get(taskId);
  return task ? toReadonlyTask(task) : undefined;
}

function getSchedule(state: MaintenanceState, corridorId: string): MaintenanceSchedule | undefined {
  const schedule = state.schedules.get(corridorId);
  return schedule ? toReadonlySchedule(schedule) : undefined;
}

function getActiveMaintenanceForCorridor(
  state: MaintenanceState,
  corridorId: string,
): readonly MaintenanceTask[] {
  const taskIds = state.tasksByCorridorId.get(corridorId);
  if (!taskIds) return [];
  const result: MaintenanceTask[] = [];
  for (const taskId of taskIds) {
    const task = state.tasks.get(taskId);
    if (task && (task.status === 'scheduled' || task.status === 'in_progress')) {
      result.push(toReadonlyTask(task));
    }
  }
  return result;
}

function getMaintenanceHistory(
  state: MaintenanceState,
  corridorId: string,
): readonly MaintenanceTask[] {
  const taskIds = state.tasksByCorridorId.get(corridorId);
  if (!taskIds) return [];
  const result: MaintenanceTask[] = [];
  for (const taskId of taskIds) {
    const task = state.tasks.get(taskId);
    if (task) result.push(toReadonlyTask(task));
  }
  return result;
}

function getUpcomingMaintenance(
  state: MaintenanceState,
  horizonUs: number,
): readonly MaintenanceSchedule[] {
  const now = state.deps.clock.nowMicroseconds();
  const cutoff = now + horizonUs;
  const result: MaintenanceSchedule[] = [];
  for (const schedule of state.schedules.values()) {
    if (schedule.nextMaintenanceAt <= cutoff) {
      result.push(toReadonlySchedule(schedule));
    }
  }
  return result.sort((a, b) => a.nextMaintenanceAt - b.nextMaintenanceAt);
}

function getOverdueMaintenance(state: MaintenanceState): readonly MaintenanceSchedule[] {
  const now = state.deps.clock.nowMicroseconds();
  const result: MaintenanceSchedule[] = [];
  for (const schedule of state.schedules.values()) {
    if (schedule.nextMaintenanceAt <= now) {
      result.push(toReadonlySchedule(schedule));
    }
  }
  return result.sort((a, b) => a.nextMaintenanceAt - b.nextMaintenanceAt);
}

function getReport(state: MaintenanceState, reportId: string): MaintenanceReport | undefined {
  return state.reports.get(reportId);
}

function getReportsForCorridor(
  state: MaintenanceState,
  corridorId: string,
): readonly MaintenanceReport[] {
  const result: MaintenanceReport[] = [];
  for (const report of state.reports.values()) {
    if (report.corridorId === corridorId) result.push(report);
  }
  return result.sort((a, b) => a.completedAt - b.completedAt);
}

function getStats(state: MaintenanceState): MaintenanceStats {
  return {
    totalScheduled: state.totalScheduled,
    totalInProgress: state.totalInProgress,
    totalCompleted: state.totalCompleted,
    totalCancelled: state.totalCancelled,
    totalReports: state.reports.size,
    corridorsTracked: state.schedules.size,
  };
}

// ── Public API ───────────────────────────────────────────────────

interface CorridorMaintenanceService {
  readonly registerCorridor: (corridorId: string, intervalUs?: number) => MaintenanceSchedule;
  readonly unregisterCorridor: (corridorId: string) => boolean;
  readonly scheduleTask: (params: ScheduleTaskParams) => MaintenanceTask | ScheduleTaskError;
  readonly startTask: (taskId: string) => MaintenanceTask | StartTaskError;
  readonly completeTask: (params: CompleteTaskParams) => MaintenanceReport | CompleteTaskError;
  readonly cancelTask: (taskId: string) => MaintenanceTask | CancelTaskError;
  readonly getTask: (taskId: string) => MaintenanceTask | undefined;
  readonly getSchedule: (corridorId: string) => MaintenanceSchedule | undefined;
  readonly getActiveMaintenanceForCorridor: (corridorId: string) => readonly MaintenanceTask[];
  readonly getMaintenanceHistory: (corridorId: string) => readonly MaintenanceTask[];
  readonly getUpcomingMaintenance: (horizonUs: number) => readonly MaintenanceSchedule[];
  readonly getOverdueMaintenance: () => readonly MaintenanceSchedule[];
  readonly getReport: (reportId: string) => MaintenanceReport | undefined;
  readonly getReportsForCorridor: (corridorId: string) => readonly MaintenanceReport[];
  readonly getStats: () => MaintenanceStats;
}

// ── Factory ──────────────────────────────────────────────────────

function createCorridorMaintenanceService(deps: MaintenanceDeps): CorridorMaintenanceService {
  const state: MaintenanceState = {
    deps,
    tasks: new Map(),
    schedules: new Map(),
    reports: new Map(),
    tasksByCorridorId: new Map(),
    totalScheduled: 0,
    totalInProgress: 0,
    totalCompleted: 0,
    totalCancelled: 0,
  };

  return {
    registerCorridor: (id, interval) => registerCorridor(state, id, interval),
    unregisterCorridor: (id) => unregisterCorridor(state, id),
    scheduleTask: (p) => scheduleTask(state, p),
    startTask: (id) => startTask(state, id),
    completeTask: (p) => completeTask(state, p),
    cancelTask: (id) => cancelTask(state, id),
    getTask: (id) => getTask(state, id),
    getSchedule: (id) => getSchedule(state, id),
    getActiveMaintenanceForCorridor: (id) => getActiveMaintenanceForCorridor(state, id),
    getMaintenanceHistory: (id) => getMaintenanceHistory(state, id),
    getUpcomingMaintenance: (h) => getUpcomingMaintenance(state, h),
    getOverdueMaintenance: () => getOverdueMaintenance(state),
    getReport: (id) => getReport(state, id),
    getReportsForCorridor: (id) => getReportsForCorridor(state, id),
    getStats: () => getStats(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export {
  createCorridorMaintenanceService,
  DEFAULT_MAINTENANCE_INTERVAL_US,
  MAX_CONCURRENT_MAINTENANCE,
  MAINTENANCE_COST_MULTIPLIERS,
};
export type {
  CorridorMaintenanceService,
  MaintenanceDeps,
  MaintenanceClock,
  MaintenanceIdGenerator,
  MaintenanceType,
  MaintenanceStatus,
  MaintenanceTask,
  MaintenanceSchedule,
  MaintenanceReport,
  ScheduleTaskParams,
  CompleteTaskParams,
  MaintenanceStats,
  ScheduleTaskError,
  StartTaskError,
  CompleteTaskError,
  CancelTaskError,
};
