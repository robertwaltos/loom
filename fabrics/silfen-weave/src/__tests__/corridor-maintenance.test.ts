/**
 * corridor-maintenance.test.ts — Unit tests for CorridorMaintenanceService.
 *
 * Thread: bridge/silfen-weave/corridor-maintenance
 * Tier: 2
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCorridorMaintenanceService,
  MAX_CONCURRENT_MAINTENANCE,
  MAINTENANCE_COST_MULTIPLIERS,
} from '../corridor-maintenance.js';
import type {
  CorridorMaintenanceService,
  MaintenanceDeps,
} from '../corridor-maintenance.js';

// ── Helpers ────────────────────────────────────────────────────────────

function makeDeps(startUs = 1_000_000): MaintenanceDeps & { advance: (us: number) => void } {
  let now = startUs;
  let idSeq = 0;
  return {
    clock: { nowMicroseconds: () => now },
    idGenerator: { generate: () => `task-${String(++idSeq)}` },
    advance: (us: number) => { now += us; },
  };
}

function makeService(startUs?: number): { svc: CorridorMaintenanceService; advance: (us: number) => void } {
  const deps = makeDeps(startUs);
  return { svc: createCorridorMaintenanceService(deps), advance: deps.advance };
}

// ── registerCorridor ──────────────────────────────────────────────────

describe('registerCorridor', () => {
  it('creates a maintenance schedule with default interval', () => {
    const { svc } = makeService();
    const schedule = svc.registerCorridor('c-1');
    expect(schedule.corridorId).toBe('c-1');
    expect(schedule.lastMaintenanceAt).toBeNull();
    expect(schedule.totalCompleted).toBe(0);
  });

  it('respects a custom maintenance interval', () => {
    const { svc } = makeService(0);
    const schedule = svc.registerCorridor('c-1', 500);
    expect(schedule.nextMaintenanceAt).toBe(500);
  });

  it('returns the schedule via getSchedule', () => {
    const { svc } = makeService();
    svc.registerCorridor('c-1');
    expect(svc.getSchedule('c-1')).toBeDefined();
  });
});

// ── unregisterCorridor ────────────────────────────────────────────────

describe('unregisterCorridor', () => {
  it('removes an existing corridor and its tasks', () => {
    const { svc } = makeService();
    svc.registerCorridor('c-1');
    svc.scheduleTask({ corridorId: 'c-1', maintenanceType: 'routine', estimatedDurationUs: 1000 });
    expect(svc.unregisterCorridor('c-1')).toBe(true);
    expect(svc.getSchedule('c-1')).toBeUndefined();
  });

  it('returns false for an unknown corridor', () => {
    const { svc } = makeService();
    expect(svc.unregisterCorridor('unknown')).toBe(false);
  });
});

// ── scheduleTask ──────────────────────────────────────────────────────

describe('scheduleTask', () => {
  let svc: CorridorMaintenanceService;
  beforeEach(() => { ({ svc } = makeService()); svc.registerCorridor('c-1'); });

  it('creates a scheduled task with correct fields', () => {
    const result = svc.scheduleTask({ corridorId: 'c-1', maintenanceType: 'routine', estimatedDurationUs: 5000 });
    expect(typeof result).toBe('object');
    if (typeof result === 'string') throw new Error('Expected task');
    expect(result.status).toBe('scheduled');
    expect(result.costMultiplier).toBe(MAINTENANCE_COST_MULTIPLIERS.routine);
  });

  it('returns corridor_not_registered for unknown corridor', () => {
    expect(svc.scheduleTask({ corridorId: 'unknown', maintenanceType: 'routine', estimatedDurationUs: 1000 })).toBe('corridor_not_registered');
  });

  it('returns max_concurrent_reached when corridor is saturated with non-emergency', () => {
    for (let i = 0; i < MAX_CONCURRENT_MAINTENANCE; i++) {
      const t = svc.scheduleTask({ corridorId: 'c-1', maintenanceType: 'routine', estimatedDurationUs: 1000 });
      if (typeof t === 'string') throw new Error('Expected task');
      svc.startTask(t.taskId);
    }
    expect(svc.scheduleTask({ corridorId: 'c-1', maintenanceType: 'routine', estimatedDurationUs: 1000 })).toBe('max_concurrent_reached');
  });

  it('emergency bypasses max_concurrent_reached limit', () => {
    for (let i = 0; i < MAX_CONCURRENT_MAINTENANCE; i++) {
      const t = svc.scheduleTask({ corridorId: 'c-1', maintenanceType: 'routine', estimatedDurationUs: 1000 });
      if (typeof t === 'string') throw new Error('Expected task');
      svc.startTask(t.taskId);
    }
    const emergency = svc.scheduleTask({ corridorId: 'c-1', maintenanceType: 'emergency', estimatedDurationUs: 1000 });
    expect(typeof emergency).toBe('object');
  });

  it('each maintenance type has expected cost multiplier', () => {
    const types = ['routine', 'emergency', 'upgrade', 'reinforcement'] as const;
    for (const mt of types) {
      const t = svc.scheduleTask({ corridorId: 'c-1', maintenanceType: mt, estimatedDurationUs: 1000 });
      if (typeof t === 'string') throw new Error(`Expected task for ${mt}`);
      expect(t.costMultiplier).toBe(MAINTENANCE_COST_MULTIPLIERS[mt]);
    }
  });
});

// ── startTask ─────────────────────────────────────────────────────────

describe('startTask', () => {
  let svc: CorridorMaintenanceService;
  let taskId: string;
  beforeEach(() => {
    ({ svc } = makeService());
    svc.registerCorridor('c-1');
    const t = svc.scheduleTask({ corridorId: 'c-1', maintenanceType: 'routine', estimatedDurationUs: 1000 });
    if (typeof t === 'string') throw new Error('Expected task');
    taskId = t.taskId;
  });

  it('transitions task to in_progress', () => {
    const result = svc.startTask(taskId);
    if (typeof result === 'string') throw new Error('Expected task');
    expect(result.status).toBe('in_progress');
    expect(result.startedAt).not.toBeNull();
  });

  it('returns task_not_found for an unknown task', () => {
    expect(svc.startTask('nonexistent')).toBe('task_not_found');
  });

  it('returns task_not_scheduled for an already-started task', () => {
    svc.startTask(taskId);
    expect(svc.startTask(taskId)).toBe('task_not_scheduled');
  });
});

// ── completeTask ──────────────────────────────────────────────────────

describe('completeTask', () => {
  let svc: CorridorMaintenanceService;
  let taskId: string;
  beforeEach(() => {
    ({ svc } = makeService());
    svc.registerCorridor('c-1');
    const t = svc.scheduleTask({ corridorId: 'c-1', maintenanceType: 'routine', estimatedDurationUs: 1000 });
    if (typeof t === 'string') throw new Error('Expected task');
    taskId = t.taskId;
    svc.startTask(taskId);
  });

  it('completes a task and generates a maintenance report', () => {
    const result = svc.completeTask({ taskId, findings: 'All clear' });
    if (typeof result === 'string') throw new Error('Expected report');
    expect(result.corridorId).toBe('c-1');
    expect(result.findings).toBe('All clear');
    expect(result.maintenanceType).toBe('routine');
  });

  it('task status becomes completed after completion', () => {
    svc.completeTask({ taskId });
    const task = svc.getTask(taskId);
    expect(task?.status).toBe('completed');
    expect(task?.completedAt).not.toBeNull();
  });

  it('updates schedule lastMaintenanceAt after completion', () => {
    svc.completeTask({ taskId });
    const schedule = svc.getSchedule('c-1');
    expect(schedule?.lastMaintenanceAt).not.toBeNull();
    expect(schedule?.totalCompleted).toBe(1);
  });

  it('returns task_not_found for unknown task', () => {
    expect(svc.completeTask({ taskId: 'unknown' })).toBe('task_not_found');
  });

  it('returns task_not_in_progress for a scheduled (not-started) task', () => {
    const t2 = svc.scheduleTask({ corridorId: 'c-1', maintenanceType: 'upgrade', estimatedDurationUs: 1000 });
    if (typeof t2 === 'string') throw new Error('Expected task');
    expect(svc.completeTask({ taskId: t2.taskId })).toBe('task_not_in_progress');
  });
});

// ── cancelTask ────────────────────────────────────────────────────────

describe('cancelTask', () => {
  let svc: CorridorMaintenanceService;
  let taskId: string;
  beforeEach(() => {
    ({ svc } = makeService());
    svc.registerCorridor('c-1');
    const t = svc.scheduleTask({ corridorId: 'c-1', maintenanceType: 'routine', estimatedDurationUs: 1000 });
    if (typeof t === 'string') throw new Error('Expected task');
    taskId = t.taskId;
  });

  it('cancels a scheduled task', () => {
    const result = svc.cancelTask(taskId);
    if (typeof result === 'string') throw new Error('Expected task');
    expect(result.status).toBe('cancelled');
  });

  it('cancels an in-progress task', () => {
    svc.startTask(taskId);
    const result = svc.cancelTask(taskId);
    if (typeof result === 'string') throw new Error('Expected task');
    expect(result.status).toBe('cancelled');
  });

  it('returns task_not_found for unknown task', () => {
    expect(svc.cancelTask('unknown')).toBe('task_not_found');
  });

  it('returns task_already_completed for completed task', () => {
    svc.startTask(taskId);
    svc.completeTask({ taskId });
    expect(svc.cancelTask(taskId)).toBe('task_already_completed');
  });

  it('returns task_already_cancelled for already-cancelled task', () => {
    svc.cancelTask(taskId);
    expect(svc.cancelTask(taskId)).toBe('task_already_cancelled');
  });
});

// ── getActiveMaintenanceForCorridor ───────────────────────────────────

describe('getActiveMaintenanceForCorridor', () => {
  it('returns only scheduled and in_progress tasks', () => {
    const { svc } = makeService();
    svc.registerCorridor('c-1');
    const t1 = svc.scheduleTask({ corridorId: 'c-1', maintenanceType: 'routine', estimatedDurationUs: 1000 });
    const t2 = svc.scheduleTask({ corridorId: 'c-1', maintenanceType: 'upgrade', estimatedDurationUs: 1000 });
    if (typeof t1 === 'string' || typeof t2 === 'string') throw new Error('Expected tasks');

    svc.startTask(t1.taskId);
    svc.completeTask({ taskId: t1.taskId });

    const active = svc.getActiveMaintenanceForCorridor('c-1');
    const ids = active.map((t) => t.taskId);
    expect(ids).not.toContain(t1.taskId); // completed
    expect(ids).toContain(t2.taskId);     // scheduled
  });

  it('returns empty array for unregistered corridor', () => {
    const { svc } = makeService();
    expect(svc.getActiveMaintenanceForCorridor('unknown')).toHaveLength(0);
  });
});

// ── getOverdueMaintenance / getUpcomingMaintenance ────────────────────

describe('getOverdueMaintenance', () => {
  it('lists corridors whose next maintenance time has passed', () => {
    const { svc, advance } = makeService(0);
    svc.registerCorridor('c-1', 1000);  // due at t=1000
    svc.registerCorridor('c-2', 5000);  // due at t=5000
    advance(2000);                       // now t=2000 → c-1 overdue, c-2 not
    const overdue = svc.getOverdueMaintenance();
    expect(overdue.map((s) => s.corridorId)).toContain('c-1');
    expect(overdue.map((s) => s.corridorId)).not.toContain('c-2');
  });
});

describe('getUpcomingMaintenance', () => {
  it('lists corridors due within the horizon', () => {
    const { svc } = makeService(0);
    svc.registerCorridor('c-far', 100_000);  // due at 100_000
    svc.registerCorridor('c-near', 500);     // due at 500
    const upcoming = svc.getUpcomingMaintenance(1000);
    expect(upcoming.map((s) => s.corridorId)).toContain('c-near');
    expect(upcoming.map((s) => s.corridorId)).not.toContain('c-far');
  });
});

// ── reports ───────────────────────────────────────────────────────────

describe('getReport / getReportsForCorridor', () => {
  it('retrieves a report by id', () => {
    const { svc } = makeService();
    svc.registerCorridor('c-1');
    const t = svc.scheduleTask({ corridorId: 'c-1', maintenanceType: 'routine', estimatedDurationUs: 1000 });
    if (typeof t === 'string') throw new Error('Expected task');
    svc.startTask(t.taskId);
    const report = svc.completeTask({ taskId: t.taskId });
    if (typeof report === 'string') throw new Error('Expected report');
    expect(svc.getReport(report.reportId)).toBeDefined();
  });

  it('lists all reports for a corridor in order', () => {
    const { svc } = makeService();
    svc.registerCorridor('c-1');
    for (const type of ['routine', 'upgrade'] as const) {
      const t = svc.scheduleTask({ corridorId: 'c-1', maintenanceType: type, estimatedDurationUs: 1000 });
      if (typeof t === 'string') throw new Error('Expected task');
      svc.startTask(t.taskId);
      svc.completeTask({ taskId: t.taskId });
    }
    expect(svc.getReportsForCorridor('c-1')).toHaveLength(2);
  });
});

// ── getStats ──────────────────────────────────────────────────────────

describe('getStats', () => {
  it('tracks counts accurately through a full lifecycle', () => {
    const { svc } = makeService();
    svc.registerCorridor('c-1');
    svc.registerCorridor('c-2');

    const t1 = svc.scheduleTask({ corridorId: 'c-1', maintenanceType: 'routine', estimatedDurationUs: 1000 });
    const t2 = svc.scheduleTask({ corridorId: 'c-2', maintenanceType: 'upgrade', estimatedDurationUs: 1000 });
    const t3 = svc.scheduleTask({ corridorId: 'c-1', maintenanceType: 'routine', estimatedDurationUs: 1000 });
    if (typeof t1 === 'string' || typeof t2 === 'string' || typeof t3 === 'string') throw new Error('Expected tasks');

    svc.startTask(t1.taskId);
    svc.completeTask({ taskId: t1.taskId });
    svc.cancelTask(t3.taskId);

    const stats = svc.getStats();
    expect(stats.totalScheduled).toBe(3);
    expect(stats.totalCompleted).toBe(1);
    expect(stats.totalCancelled).toBe(1);
    expect(stats.totalReports).toBe(1);
    expect(stats.corridorsTracked).toBe(2);
  });

  it('counts totalInProgress for active tasks', () => {
    const { svc } = makeService();
    svc.registerCorridor('c-1');
    const t = svc.scheduleTask({ corridorId: 'c-1', maintenanceType: 'routine', estimatedDurationUs: 1000 });
    if (typeof t === 'string') throw new Error('Expected task');
    svc.startTask(t.taskId);
    expect(svc.getStats().totalInProgress).toBe(1);
    svc.completeTask({ taskId: t.taskId });
    expect(svc.getStats().totalInProgress).toBe(0);
  });
});
