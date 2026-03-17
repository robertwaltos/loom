/**
 * Economy Scheduler ΓÇö Tracks and dispatches periodic economy jobs.
 *
 * Each job runs on a fixed in-game day interval. The scheduler determines
 * which jobs are due, marks their lifecycle, and records results.
 * All time is expressed in integer in-game days.
 */

// ΓöÇΓöÇΓöÇ Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type ScheduledJobId =
  | 'LEVY_COLLECTION' //      Every 10 in-game days
  | 'UBK_DISTRIBUTION' //     Every 30 in-game days (monthly)
  | 'WORLD_ISSUANCE' //       Every 365 in-game days (annually)
  | 'COMMONS_DISTRIBUTION' // Every 90 in-game days (quarterly)
  | 'WEALTH_ZONE_RECALC' //   Every 30 in-game days
  | 'KALON_SUPPLY_AUDIT'; //  Every 30 in-game days

export type JobStatus = 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface ScheduledJob {
  readonly jobId: ScheduledJobId;
  readonly description: string;
  readonly intervalInGameDays: number;
  readonly lastRunAt?: number;
  readonly nextRunAt: number;
  readonly status: JobStatus;
  readonly lastRunResult?: JobResult;
}

export interface JobResult {
  readonly jobId: ScheduledJobId;
  readonly ranAt: string;
  readonly inGameDay: number;
  readonly dynastiesAffected: number;
  readonly kalonMinted: bigint;
  readonly kalonCollected: bigint;
  readonly kalonDistributed: bigint;
  readonly errors: string[];
  readonly durationMs: number;
}

// ΓöÇΓöÇΓöÇ Job Definitions ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const JOB_DEFINITIONS: ReadonlyArray<{
  jobId: ScheduledJobId;
  description: string;
  intervalInGameDays: number;
}> = [
  {
    jobId: 'LEVY_COLLECTION',
    description: 'Progressive levy collection from all active dynasties',
    intervalInGameDays: 10,
  },
  {
    jobId: 'UBK_DISTRIBUTION',
    description: 'Monthly Universal Basic KALON distribution to eligible dynasties',
    intervalInGameDays: 30,
  },
  {
    jobId: 'WORLD_ISSUANCE',
    description: 'Annual KALON minting per world via Stellar Standard',
    intervalInGameDays: 365,
  },
  {
    jobId: 'COMMONS_DISTRIBUTION',
    description: 'Quarterly Commons Fund distribution to dynasties',
    intervalInGameDays: 90,
  },
  {
    jobId: 'WEALTH_ZONE_RECALC',
    description: 'Recalculate wealth zone thresholds from current total supply',
    intervalInGameDays: 30,
  },
  {
    jobId: 'KALON_SUPPLY_AUDIT',
    description: 'Audit total KALON supply across all accounts',
    intervalInGameDays: 30,
  },
];

// ΓöÇΓöÇΓöÇ State ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

interface SchedulerState {
  readonly jobs: Map<ScheduledJobId, ScheduledJob>;
}

// ΓöÇΓöÇΓöÇ Service Interface ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface EconomyScheduler {
  initializeJobs(currentInGameDay: number): ScheduledJob[];
  getJobsDue(currentInGameDay: number): ScheduledJob[];
  markJobStarted(jobId: ScheduledJobId): ScheduledJob;
  markJobCompleted(jobId: ScheduledJobId, result: JobResult): ScheduledJob;
  markJobFailed(jobId: ScheduledJobId, error: string): ScheduledJob;
  getJobStatus(jobId: ScheduledJobId): ScheduledJob;
  getSchedule(): ScheduledJob[];
}

// ΓöÇΓöÇΓöÇ Factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function createEconomyScheduler(): EconomyScheduler {
  const state: SchedulerState = { jobs: new Map() };

  return {
    initializeJobs: (day) => initializeJobsImpl(state, day),
    getJobsDue: (day) => getJobsDueImpl(state, day),
    markJobStarted: (jobId) => markStartedImpl(state, jobId),
    markJobCompleted: (jobId, result) => markCompletedImpl(state, jobId, result),
    markJobFailed: (jobId, error) => markFailedImpl(state, jobId, error),
    getJobStatus: (jobId) => getJobStatusImpl(state, jobId),
    getSchedule: () => [...state.jobs.values()],
  };
}

// ΓöÇΓöÇΓöÇ Implementations ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function initializeJobsImpl(state: SchedulerState, currentDay: number): ScheduledJob[] {
  state.jobs.clear();
  for (const def of JOB_DEFINITIONS) {
    const job: ScheduledJob = {
      jobId: def.jobId,
      description: def.description,
      intervalInGameDays: def.intervalInGameDays,
      nextRunAt: currentDay + def.intervalInGameDays,
      status: 'SCHEDULED',
    };
    state.jobs.set(def.jobId, job);
  }
  return [...state.jobs.values()];
}

function getJobsDueImpl(state: SchedulerState, currentDay: number): ScheduledJob[] {
  return [...state.jobs.values()].filter(
    (job) => job.nextRunAt <= currentDay && job.status !== 'RUNNING',
  );
}

function markStartedImpl(state: SchedulerState, jobId: ScheduledJobId): ScheduledJob {
  const job = requireJob(state, jobId);
  const updated: ScheduledJob = { ...job, status: 'RUNNING' };
  state.jobs.set(jobId, updated);
  return updated;
}

function markCompletedImpl(
  state: SchedulerState,
  jobId: ScheduledJobId,
  result: JobResult,
): ScheduledJob {
  const job = requireJob(state, jobId);
  const updated: ScheduledJob = {
    ...job,
    status: 'COMPLETED',
    lastRunAt: result.inGameDay,
    nextRunAt: result.inGameDay + job.intervalInGameDays,
    lastRunResult: result,
  };
  state.jobs.set(jobId, updated);
  return updated;
}

function markFailedImpl(state: SchedulerState, jobId: ScheduledJobId, error: string): ScheduledJob {
  const job = requireJob(state, jobId);
  const updated: ScheduledJob = { ...job, status: 'FAILED' };
  state.jobs.set(jobId, updated);
  void error; // error is surfaced via lastRunResult; kept for future audit logging
  return updated;
}

function getJobStatusImpl(state: SchedulerState, jobId: ScheduledJobId): ScheduledJob {
  return requireJob(state, jobId);
}

function requireJob(state: SchedulerState, jobId: ScheduledJobId): ScheduledJob {
  const job = state.jobs.get(jobId);
  if (job === undefined) {
    throw new Error(`Scheduler job not found: ${jobId}. Call initializeJobs first.`);
  }
  return job;
}
