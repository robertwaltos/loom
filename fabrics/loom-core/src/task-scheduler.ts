/**
 * task-scheduler.ts — Deferred task execution.
 *
 * Schedules named tasks for future execution at a specified
 * timestamp. Supports cancellation, retrieval of due tasks,
 * and execution tracking.
 */

// ── Ports ────────────────────────────────────────────────────────

interface TaskClock {
  readonly nowMicroseconds: () => number;
}

interface TaskIdGenerator {
  readonly next: () => string;
}

interface TaskSchedulerDeps {
  readonly clock: TaskClock;
  readonly idGenerator: TaskIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type ScheduledTaskStatus = 'pending' | 'executed' | 'cancelled';

interface ScheduledTask {
  readonly taskId: string;
  readonly name: string;
  readonly payload: unknown;
  readonly scheduledAt: number;
  readonly executeAt: number;
  readonly status: ScheduledTaskStatus;
}

interface ScheduleTaskParams {
  readonly name: string;
  readonly payload: unknown;
  readonly executeAt: number;
}

interface TaskSchedulerStats {
  readonly totalTasks: number;
  readonly pendingTasks: number;
  readonly executedTasks: number;
  readonly cancelledTasks: number;
}

interface TaskScheduler {
  readonly schedule: (params: ScheduleTaskParams) => ScheduledTask;
  readonly cancel: (taskId: string) => boolean;
  readonly getDue: () => readonly ScheduledTask[];
  readonly markExecuted: (taskId: string) => boolean;
  readonly getTask: (taskId: string) => ScheduledTask | undefined;
  readonly getStats: () => TaskSchedulerStats;
}

// ── State ────────────────────────────────────────────────────────

interface MutableTask {
  readonly taskId: string;
  readonly name: string;
  readonly payload: unknown;
  readonly scheduledAt: number;
  readonly executeAt: number;
  status: ScheduledTaskStatus;
}

interface SchedulerState {
  readonly deps: TaskSchedulerDeps;
  readonly tasks: Map<string, MutableTask>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(t: MutableTask): ScheduledTask {
  return {
    taskId: t.taskId,
    name: t.name,
    payload: t.payload,
    scheduledAt: t.scheduledAt,
    executeAt: t.executeAt,
    status: t.status,
  };
}

// ── Operations ───────────────────────────────────────────────────

function scheduleImpl(state: SchedulerState, params: ScheduleTaskParams): ScheduledTask {
  const task: MutableTask = {
    taskId: state.deps.idGenerator.next(),
    name: params.name,
    payload: params.payload,
    scheduledAt: state.deps.clock.nowMicroseconds(),
    executeAt: params.executeAt,
    status: 'pending',
  };
  state.tasks.set(task.taskId, task);
  return toReadonly(task);
}

function getDueImpl(state: SchedulerState): ScheduledTask[] {
  const now = state.deps.clock.nowMicroseconds();
  const result: ScheduledTask[] = [];
  for (const t of state.tasks.values()) {
    if (t.status === 'pending' && t.executeAt <= now) {
      result.push(toReadonly(t));
    }
  }
  return result;
}

function setStatusImpl(state: SchedulerState, taskId: string, status: ScheduledTaskStatus): boolean {
  const t = state.tasks.get(taskId);
  if (!t || t.status !== 'pending') return false;
  t.status = status;
  return true;
}

function getStatsImpl(state: SchedulerState): TaskSchedulerStats {
  let pending = 0;
  let executed = 0;
  let cancelled = 0;
  for (const t of state.tasks.values()) {
    if (t.status === 'pending') pending++;
    else if (t.status === 'executed') executed++;
    else cancelled++;
  }
  return {
    totalTasks: state.tasks.size,
    pendingTasks: pending,
    executedTasks: executed,
    cancelledTasks: cancelled,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createTaskScheduler(deps: TaskSchedulerDeps): TaskScheduler {
  const state: SchedulerState = { deps, tasks: new Map() };
  return {
    schedule: (p) => scheduleImpl(state, p),
    cancel: (id) => setStatusImpl(state, id, 'cancelled'),
    getDue: () => getDueImpl(state),
    markExecuted: (id) => setStatusImpl(state, id, 'executed'),
    getTask: (id) => {
      const t = state.tasks.get(id);
      return t ? toReadonly(t) : undefined;
    },
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createTaskScheduler };
export type {
  TaskScheduler,
  TaskSchedulerDeps,
  ScheduledTaskStatus,
  ScheduledTask,
  ScheduleTaskParams,
  TaskSchedulerStats,
};
