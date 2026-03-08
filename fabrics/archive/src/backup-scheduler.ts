/**
 * backup-scheduler.ts — Automated backup scheduling.
 *
 * Registers named backup jobs with interval-based scheduling.
 * Tracks execution history, supports enable/disable, and reports
 * overdue jobs based on their configured intervals.
 */

// ── Ports ────────────────────────────────────────────────────────

interface BackupClock {
  readonly nowMicroseconds: () => number;
}

interface BackupIdGenerator {
  readonly next: () => string;
}

interface BackupSchedulerDeps {
  readonly clock: BackupClock;
  readonly idGenerator: BackupIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

interface BackupJob {
  readonly jobId: string;
  readonly name: string;
  readonly intervalMicro: number;
  readonly enabled: boolean;
  readonly createdAt: number;
  readonly lastRunAt: number;
  readonly runCount: number;
}

interface CreateJobParams {
  readonly name: string;
  readonly intervalMicro: number;
}

interface BackupRun {
  readonly runId: string;
  readonly jobId: string;
  readonly startedAt: number;
  readonly success: boolean;
}

interface BackupSchedulerStats {
  readonly totalJobs: number;
  readonly enabledJobs: number;
  readonly overdueJobs: number;
  readonly totalRuns: number;
}

interface BackupScheduler {
  readonly createJob: (params: CreateJobParams) => BackupJob;
  readonly getJob: (jobId: string) => BackupJob | undefined;
  readonly enable: (jobId: string) => boolean;
  readonly disable: (jobId: string) => boolean;
  readonly recordRun: (jobId: string, success: boolean) => BackupRun | undefined;
  readonly getOverdue: () => readonly BackupJob[];
  readonly getRuns: (jobId: string) => readonly BackupRun[];
  readonly getStats: () => BackupSchedulerStats;
}

// ── State ────────────────────────────────────────────────────────

interface MutableJob {
  readonly jobId: string;
  readonly name: string;
  readonly intervalMicro: number;
  enabled: boolean;
  readonly createdAt: number;
  lastRunAt: number;
  runCount: number;
}

interface SchedulerState {
  readonly deps: BackupSchedulerDeps;
  readonly jobs: Map<string, MutableJob>;
  readonly runs: Map<string, BackupRun[]>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(j: MutableJob): BackupJob {
  return {
    jobId: j.jobId,
    name: j.name,
    intervalMicro: j.intervalMicro,
    enabled: j.enabled,
    createdAt: j.createdAt,
    lastRunAt: j.lastRunAt,
    runCount: j.runCount,
  };
}

// ── Operations ───────────────────────────────────────────────────

function createJobImpl(state: SchedulerState, params: CreateJobParams): BackupJob {
  const now = state.deps.clock.nowMicroseconds();
  const job: MutableJob = {
    jobId: state.deps.idGenerator.next(),
    name: params.name,
    intervalMicro: params.intervalMicro,
    enabled: true,
    createdAt: now,
    lastRunAt: 0,
    runCount: 0,
  };
  state.jobs.set(job.jobId, job);
  return toReadonly(job);
}

function recordRunImpl(state: SchedulerState, jobId: string, success: boolean): BackupRun | undefined {
  const job = state.jobs.get(jobId);
  if (!job) return undefined;
  const now = state.deps.clock.nowMicroseconds();
  const run: BackupRun = {
    runId: state.deps.idGenerator.next(),
    jobId,
    startedAt: now,
    success,
  };
  job.lastRunAt = now;
  job.runCount++;
  let jobRuns = state.runs.get(jobId);
  if (!jobRuns) {
    jobRuns = [];
    state.runs.set(jobId, jobRuns);
  }
  jobRuns.push(run);
  return run;
}

function getOverdueImpl(state: SchedulerState): BackupJob[] {
  const now = state.deps.clock.nowMicroseconds();
  const result: BackupJob[] = [];
  for (const job of state.jobs.values()) {
    if (!job.enabled) continue;
    const nextDue = job.lastRunAt + job.intervalMicro;
    if (now >= nextDue) result.push(toReadonly(job));
  }
  return result;
}

function getStatsImpl(state: SchedulerState): BackupSchedulerStats {
  let enabled = 0;
  let totalRuns = 0;
  const now = state.deps.clock.nowMicroseconds();
  let overdue = 0;
  for (const job of state.jobs.values()) {
    if (job.enabled) enabled++;
    totalRuns += job.runCount;
    if (job.enabled && now >= job.lastRunAt + job.intervalMicro) overdue++;
  }
  return {
    totalJobs: state.jobs.size,
    enabledJobs: enabled,
    overdueJobs: overdue,
    totalRuns,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createBackupScheduler(deps: BackupSchedulerDeps): BackupScheduler {
  const state: SchedulerState = { deps, jobs: new Map(), runs: new Map() };
  return {
    createJob: (p) => createJobImpl(state, p),
    getJob: (id) => {
      const j = state.jobs.get(id);
      return j ? toReadonly(j) : undefined;
    },
    enable: (id) => {
      const j = state.jobs.get(id);
      if (!j) return false;
      j.enabled = true;
      return true;
    },
    disable: (id) => {
      const j = state.jobs.get(id);
      if (!j) return false;
      j.enabled = false;
      return true;
    },
    recordRun: (id, s) => recordRunImpl(state, id, s),
    getOverdue: () => getOverdueImpl(state),
    getRuns: (id) => state.runs.get(id) ?? [],
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createBackupScheduler };
export type {
  BackupScheduler,
  BackupSchedulerDeps,
  BackupJob,
  CreateJobParams,
  BackupRun,
  BackupSchedulerStats,
};
