import { describe, it, expect } from 'vitest';
import { createBackupScheduler } from '../backup-scheduler.js';
import type { BackupSchedulerDeps } from '../backup-scheduler.js';

function createDeps(startTime = 1000): { deps: BackupSchedulerDeps; advance: (t: number) => void } {
  let time = startTime;
  let id = 0;
  return {
    deps: {
      clock: { nowMicroseconds: () => time },
      idGenerator: { next: () => 'bk-' + String(id++) },
    },
    advance: (t: number) => { time += t; },
  };
}

const HOUR = 3_600_000_000;

describe('BackupScheduler — createJob / getJob', () => {
  it('creates an enabled job', () => {
    const { deps } = createDeps();
    const sched = createBackupScheduler(deps);
    const job = sched.createJob({ name: 'db-backup', intervalMicro: HOUR });
    expect(job.jobId).toBe('bk-0');
    expect(job.name).toBe('db-backup');
    expect(job.enabled).toBe(true);
    expect(job.runCount).toBe(0);
  });

  it('retrieves a job by id', () => {
    const { deps } = createDeps();
    const sched = createBackupScheduler(deps);
    const job = sched.createJob({ name: 'logs', intervalMicro: HOUR });
    expect(sched.getJob(job.jobId)).toEqual(job);
  });

  it('returns undefined for unknown job', () => {
    const { deps } = createDeps();
    const sched = createBackupScheduler(deps);
    expect(sched.getJob('nope')).toBeUndefined();
  });
});

describe('BackupScheduler — enable / disable', () => {
  it('disables a job', () => {
    const { deps } = createDeps();
    const sched = createBackupScheduler(deps);
    const job = sched.createJob({ name: 'db', intervalMicro: HOUR });
    expect(sched.disable(job.jobId)).toBe(true);
    expect(sched.getJob(job.jobId)?.enabled).toBe(false);
  });

  it('re-enables a disabled job', () => {
    const { deps } = createDeps();
    const sched = createBackupScheduler(deps);
    const job = sched.createJob({ name: 'db', intervalMicro: HOUR });
    sched.disable(job.jobId);
    expect(sched.enable(job.jobId)).toBe(true);
    expect(sched.getJob(job.jobId)?.enabled).toBe(true);
  });

  it('returns false for unknown job', () => {
    const { deps } = createDeps();
    const sched = createBackupScheduler(deps);
    expect(sched.enable('nope')).toBe(false);
    expect(sched.disable('nope')).toBe(false);
  });
});

describe('BackupScheduler — recordRun / getRuns', () => {
  it('records a successful run', () => {
    const { deps } = createDeps();
    const sched = createBackupScheduler(deps);
    const job = sched.createJob({ name: 'db', intervalMicro: HOUR });
    const run = sched.recordRun(job.jobId, true);
    expect(run).toBeDefined();
    expect(run?.success).toBe(true);
    expect(sched.getJob(job.jobId)?.runCount).toBe(1);
  });

  it('returns undefined for unknown job', () => {
    const { deps } = createDeps();
    const sched = createBackupScheduler(deps);
    expect(sched.recordRun('nope', true)).toBeUndefined();
  });

  it('retrieves run history for a job', () => {
    const { deps } = createDeps();
    const sched = createBackupScheduler(deps);
    const job = sched.createJob({ name: 'db', intervalMicro: HOUR });
    sched.recordRun(job.jobId, true);
    sched.recordRun(job.jobId, false);
    expect(sched.getRuns(job.jobId)).toHaveLength(2);
  });
});

describe('BackupScheduler — getOverdue / getStats', () => {
  it('detects overdue jobs', () => {
    const { deps, advance } = createDeps(0);
    const sched = createBackupScheduler(deps);
    sched.createJob({ name: 'db', intervalMicro: HOUR });
    // Advance past the interval so the job becomes overdue
    advance(2 * HOUR);
    const overdue = sched.getOverdue();
    expect(overdue).toHaveLength(1);
  });

  it('excludes disabled jobs from overdue', () => {
    const { deps, advance } = createDeps(0);
    const sched = createBackupScheduler(deps);
    const job = sched.createJob({ name: 'db', intervalMicro: HOUR });
    sched.disable(job.jobId);
    advance(2 * HOUR);
    expect(sched.getOverdue()).toHaveLength(0);
  });

  it('reports statistics', () => {
    const { deps } = createDeps();
    const sched = createBackupScheduler(deps);
    const j1 = sched.createJob({ name: 'db', intervalMicro: HOUR });
    sched.createJob({ name: 'logs', intervalMicro: HOUR });
    sched.disable(j1.jobId);
    sched.recordRun(j1.jobId, true);

    const stats = sched.getStats();
    expect(stats.totalJobs).toBe(2);
    expect(stats.enabledJobs).toBe(1);
    expect(stats.totalRuns).toBe(1);
  });
});
