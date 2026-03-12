/**
 * Corridor Maintenance Service — Simulation Tests
 *
 * Tests the full maintenance lifecycle: scheduling, starting,
 * completing, and cancelling tasks. Validates corridor registration,
 * concurrent limits, emergency bypasses, overdue detection, and
 * report generation.
 *
 * Phase 9.23 — Silfen Weave Maintenance
 * Thread: test/silfen-weave/corridor-maintenance
 * Tier: 1
 */

import { describe, it, expect } from 'vitest';
import {
  createCorridorMaintenanceService,
  MAX_CONCURRENT_MAINTENANCE,
  MAINTENANCE_COST_MULTIPLIERS,
  DEFAULT_MAINTENANCE_INTERVAL_US,
  type MaintenanceType,
} from '../corridor-maintenance.js';

// ─── Fake Ports ─────────────────────────────────────────────────

function createFakeClock(startUs = 1_000_000) {
  let now = startUs;
  return {
    nowMicroseconds: () => now,
    advance: (us: number) => { now += us; },
    set: (us: number) => { now = us; },
  };
}

function createFakeIds(prefix = 'id') {
  let counter = 0;
  return { generate: () => `${prefix}-${++counter}` };
}

// ─── Tests ──────────────────────────────────────────────────────

describe('CorridorMaintenanceService', () => {
  function setup() {
    const clock = createFakeClock();
    const ids = createFakeIds();
    const service = createCorridorMaintenanceService({ clock, idGenerator: ids });
    return { service, clock, ids };
  }

  // ─── Corridor Registration ──────────────────────────────────

  describe('corridor registration', () => {
    it('registers a corridor with default interval', () => {
      const { service } = setup();
      const schedule = service.registerCorridor('c1');

      expect(schedule.corridorId).toBe('c1');
      expect(schedule.intervalUs).toBe(DEFAULT_MAINTENANCE_INTERVAL_US);
      expect(schedule.lastMaintenanceAt).toBeNull();
      expect(schedule.totalCompleted).toBe(0);
    });

    it('registers a corridor with custom interval', () => {
      const { service } = setup();
      const schedule = service.registerCorridor('c1', 3_600_000_000);

      expect(schedule.intervalUs).toBe(3_600_000_000);
    });

    it('unregisters a corridor and cleans up tasks', () => {
      const { service } = setup();
      service.registerCorridor('c1');
      service.scheduleTask({
        corridorId: 'c1',
        maintenanceType: 'routine',
        estimatedDurationUs: 1000,
      });

      expect(service.unregisterCorridor('c1')).toBe(true);
      expect(service.getSchedule('c1')).toBeUndefined();
      expect(service.getMaintenanceHistory('c1')).toEqual([]);
    });

    it('unregistering unknown corridor returns false', () => {
      const { service } = setup();
      expect(service.unregisterCorridor('nonexistent')).toBe(false);
    });
  });

  // ─── Task Scheduling ───────────────────────────────────────

  describe('task scheduling', () => {
    it('schedules a routine task', () => {
      const { service } = setup();
      service.registerCorridor('c1');

      const result = service.scheduleTask({
        corridorId: 'c1',
        maintenanceType: 'routine',
        estimatedDurationUs: 5000,
        notes: 'Monthly check',
      });

      expect(typeof result).toBe('object');
      const task = result as Exclude<typeof result, string>;
      expect(task.taskId).toBe('id-1');
      expect(task.corridorId).toBe('c1');
      expect(task.maintenanceType).toBe('routine');
      expect(task.status).toBe('scheduled');
      expect(task.estimatedDurationUs).toBe(5000);
      expect(task.notes).toBe('Monthly check');
      expect(task.costMultiplier).toBe(MAINTENANCE_COST_MULTIPLIERS.routine);
    });

    it('rejects scheduling on unregistered corridor', () => {
      const { service } = setup();

      const result = service.scheduleTask({
        corridorId: 'unknown',
        maintenanceType: 'routine',
        estimatedDurationUs: 1000,
      });
      expect(result).toBe('corridor_not_registered');
    });

    it('applies correct cost multiplier per type', () => {
      const { service } = setup();
      service.registerCorridor('c1');

      const types: MaintenanceType[] = ['routine', 'emergency', 'upgrade', 'reinforcement'];

      for (const type of types) {
        const result = service.scheduleTask({
          corridorId: 'c1',
          maintenanceType: type,
          estimatedDurationUs: 1000,
        });
        expect(typeof result).toBe('object');
        const task = result as Exclude<typeof result, string>;
        expect(task.costMultiplier).toBe(MAINTENANCE_COST_MULTIPLIERS[type]);
      }
    });
  });

  // ─── Task Lifecycle ─────────────────────────────────────────

  describe('task lifecycle', () => {
    it('transitions scheduled → in_progress → completed', () => {
      const { service, clock } = setup();
      service.registerCorridor('c1');

      const task = service.scheduleTask({
        corridorId: 'c1',
        maintenanceType: 'routine',
        estimatedDurationUs: 5000,
      }) as Exclude<ReturnType<typeof service.scheduleTask>, string>;
      expect(task.status).toBe('scheduled');

      clock.advance(1000);
      const started = service.startTask(task.taskId);
      expect(typeof started).toBe('object');
      expect((started as typeof task).status).toBe('in_progress');

      clock.advance(5000);
      const report = service.completeTask({ taskId: task.taskId, findings: 'All good' });
      expect(typeof report).toBe('object');
      const r = report as Exclude<typeof report, string>;
      expect(r.findings).toBe('All good');
      expect(r.durationUs).toBe(5000);
    });

    it('scheduled → cancelled', () => {
      const { service } = setup();
      service.registerCorridor('c1');
      const task = service.scheduleTask({
        corridorId: 'c1',
        maintenanceType: 'routine',
        estimatedDurationUs: 1000,
      }) as Exclude<ReturnType<typeof service.scheduleTask>, string>;

      const cancelled = service.cancelTask(task.taskId);
      expect(typeof cancelled).toBe('object');
      expect((cancelled as typeof task).status).toBe('cancelled');
    });

    it('in_progress → cancelled', () => {
      const { service } = setup();
      service.registerCorridor('c1');
      const task = service.scheduleTask({
        corridorId: 'c1',
        maintenanceType: 'routine',
        estimatedDurationUs: 1000,
      }) as Exclude<ReturnType<typeof service.scheduleTask>, string>;
      service.startTask(task.taskId);

      const cancelled = service.cancelTask(task.taskId);
      expect(typeof cancelled).toBe('object');
      expect((cancelled as typeof task).status).toBe('cancelled');
    });

    it('rejects completing a non-in_progress task', () => {
      const { service } = setup();
      service.registerCorridor('c1');
      const task = service.scheduleTask({
        corridorId: 'c1',
        maintenanceType: 'routine',
        estimatedDurationUs: 1000,
      }) as Exclude<ReturnType<typeof service.scheduleTask>, string>;

      expect(service.completeTask({ taskId: task.taskId })).toBe('task_not_in_progress');
    });

    it('rejects starting a non-scheduled task', () => {
      const { service } = setup();
      service.registerCorridor('c1');
      const task = service.scheduleTask({
        corridorId: 'c1',
        maintenanceType: 'routine',
        estimatedDurationUs: 1000,
      }) as Exclude<ReturnType<typeof service.scheduleTask>, string>;
      service.startTask(task.taskId);

      // Try starting again (now in_progress)
      expect(service.startTask(task.taskId)).toBe('task_not_scheduled');
    });

    it('rejects cancelling completed/cancelled task', () => {
      const { service } = setup();
      service.registerCorridor('c1');
      const task = service.scheduleTask({
        corridorId: 'c1',
        maintenanceType: 'routine',
        estimatedDurationUs: 1000,
      }) as Exclude<ReturnType<typeof service.scheduleTask>, string>;

      service.startTask(task.taskId);
      service.completeTask({ taskId: task.taskId });
      expect(service.cancelTask(task.taskId)).toBe('task_already_completed');
    });
  });

  // ─── Concurrent Limits ─────────────────────────────────────

  describe('concurrent limits', () => {
    it(`blocks scheduling when ${MAX_CONCURRENT_MAINTENANCE} tasks active`, () => {
      const { service } = setup();
      service.registerCorridor('c1');

      // Start MAX_CONCURRENT tasks
      for (let i = 0; i < MAX_CONCURRENT_MAINTENANCE; i++) {
        const task = service.scheduleTask({
          corridorId: 'c1',
          maintenanceType: 'routine',
          estimatedDurationUs: 1000,
        }) as Exclude<ReturnType<typeof service.scheduleTask>, string>;
        service.startTask(task.taskId);
      }

      // Next non-emergency should be blocked
      const result = service.scheduleTask({
        corridorId: 'c1',
        maintenanceType: 'routine',
        estimatedDurationUs: 1000,
      });
      expect(result).toBe('max_concurrent_reached');
    });

    it('emergency bypasses concurrent scheduling limit', () => {
      const { service } = setup();
      service.registerCorridor('c1');

      // Fill up concurrent slots
      for (let i = 0; i < MAX_CONCURRENT_MAINTENANCE; i++) {
        const task = service.scheduleTask({
          corridorId: 'c1',
          maintenanceType: 'routine',
          estimatedDurationUs: 1000,
        }) as Exclude<ReturnType<typeof service.scheduleTask>, string>;
        service.startTask(task.taskId);
      }

      // Emergency should bypass
      const result = service.scheduleTask({
        corridorId: 'c1',
        maintenanceType: 'emergency',
        estimatedDurationUs: 500,
      });
      expect(typeof result).toBe('object');
      expect((result as Exclude<typeof result, string>).maintenanceType).toBe('emergency');
    });
  });

  // ─── Schedule Updates ───────────────────────────────────────

  describe('schedule updates', () => {
    it('updates schedule after task completion', () => {
      const { service, clock } = setup();
      service.registerCorridor('c1', 10_000);

      const task = service.scheduleTask({
        corridorId: 'c1',
        maintenanceType: 'routine',
        estimatedDurationUs: 1000,
      }) as Exclude<ReturnType<typeof service.scheduleTask>, string>;
      service.startTask(task.taskId);

      clock.advance(1000);
      service.completeTask({ taskId: task.taskId });

      const schedule = service.getSchedule('c1')!;
      expect(schedule.lastMaintenanceAt).not.toBeNull();
      expect(schedule.totalCompleted).toBe(1);
      expect(schedule.nextMaintenanceAt).toBe(schedule.lastMaintenanceAt! + 10_000);
    });
  });

  // ─── Overdue & Upcoming ─────────────────────────────────────

  describe('overdue and upcoming', () => {
    it('detects overdue maintenance', () => {
      const { service, clock } = setup();
      service.registerCorridor('c1', 1000);

      // Advance past the next maintenance time
      clock.advance(2000);
      const overdue = service.getOverdueMaintenance();

      expect(overdue).toHaveLength(1);
      expect(overdue[0]!.corridorId).toBe('c1');
    });

    it('returns upcoming maintenance within horizon', () => {
      const { service } = setup();
      service.registerCorridor('c1', 5_000);
      service.registerCorridor('c2', 50_000_000);

      const upcoming = service.getUpcomingMaintenance(10_000);

      expect(upcoming).toHaveLength(1);
      expect(upcoming[0]!.corridorId).toBe('c1');
    });

    it('sorts upcoming by nextMaintenanceAt ascending', () => {
      const { service } = setup();
      service.registerCorridor('c1', 5_000);
      service.registerCorridor('c2', 3_000);
      service.registerCorridor('c3', 4_000);

      const upcoming = service.getUpcomingMaintenance(10_000);
      for (let i = 1; i < upcoming.length; i++) {
        expect(upcoming[i]!.nextMaintenanceAt).toBeGreaterThanOrEqual(
          upcoming[i - 1]!.nextMaintenanceAt,
        );
      }
    });
  });

  // ─── Reports ────────────────────────────────────────────────

  describe('reports', () => {
    it('generates report on task completion', () => {
      const { service, clock } = setup();
      service.registerCorridor('c1');
      const task = service.scheduleTask({
        corridorId: 'c1',
        maintenanceType: 'upgrade',
        estimatedDurationUs: 3000,
      }) as Exclude<ReturnType<typeof service.scheduleTask>, string>;
      service.startTask(task.taskId);
      clock.advance(3500);

      const report = service.completeTask({
        taskId: task.taskId,
        findings: 'Upgraded power conduit',
      }) as Exclude<ReturnType<typeof service.completeTask>, string>;

      expect(report.reportId).toBeDefined();
      expect(report.corridorId).toBe('c1');
      expect(report.maintenanceType).toBe('upgrade');
      expect(report.findings).toBe('Upgraded power conduit');
      expect(report.durationUs).toBe(3500);
    });

    it('retrieves report by id', () => {
      const { service } = setup();
      service.registerCorridor('c1');
      const task = service.scheduleTask({
        corridorId: 'c1',
        maintenanceType: 'routine',
        estimatedDurationUs: 1000,
      }) as Exclude<ReturnType<typeof service.scheduleTask>, string>;
      service.startTask(task.taskId);

      const report = service.completeTask({ taskId: task.taskId }) as Exclude<
        ReturnType<typeof service.completeTask>, string
      >;
      const fetched = service.getReport(report.reportId);
      expect(fetched).toBeDefined();
      expect(fetched!.taskId).toBe(task.taskId);
    });

    it('lists reports for a corridor', () => {
      const { service } = setup();
      service.registerCorridor('c1');
      service.registerCorridor('c2');

      // Complete 2 tasks on c1, 1 on c2
      for (const cId of ['c1', 'c1', 'c2']) {
        const t = service.scheduleTask({
          corridorId: cId,
          maintenanceType: 'routine',
          estimatedDurationUs: 100,
        }) as Exclude<ReturnType<typeof service.scheduleTask>, string>;
        service.startTask(t.taskId);
        service.completeTask({ taskId: t.taskId });
      }

      expect(service.getReportsForCorridor('c1')).toHaveLength(2);
      expect(service.getReportsForCorridor('c2')).toHaveLength(1);
    });
  });

  // ─── Queries ────────────────────────────────────────────────

  describe('queries', () => {
    it('getTask returns undefined for unknown id', () => {
      const { service } = setup();
      expect(service.getTask('unknown')).toBeUndefined();
    });

    it('getActiveMaintenanceForCorridor filters by status', () => {
      const { service } = setup();
      service.registerCorridor('c1');

      const t1 = service.scheduleTask({
        corridorId: 'c1',
        maintenanceType: 'routine',
        estimatedDurationUs: 1000,
      }) as Exclude<ReturnType<typeof service.scheduleTask>, string>;
      const t2 = service.scheduleTask({
        corridorId: 'c1',
        maintenanceType: 'upgrade',
        estimatedDurationUs: 2000,
      }) as Exclude<ReturnType<typeof service.scheduleTask>, string>;

      // Start t1, cancel t2
      service.startTask(t1.taskId);
      service.cancelTask(t2.taskId);

      const active = service.getActiveMaintenanceForCorridor('c1');
      expect(active).toHaveLength(1);
      expect(active[0]!.taskId).toBe(t1.taskId);
    });

    it('getMaintenanceHistory returns all tasks', () => {
      const { service } = setup();
      service.registerCorridor('c1');

      for (let i = 0; i < 3; i++) {
        service.scheduleTask({
          corridorId: 'c1',
          maintenanceType: 'routine',
          estimatedDurationUs: 1000,
        });
      }

      expect(service.getMaintenanceHistory('c1')).toHaveLength(3);
    });
  });

  // ─── Stats ──────────────────────────────────────────────────

  describe('stats', () => {
    it('starts with zero stats', () => {
      const { service } = setup();
      const stats = service.getStats();

      expect(stats.totalScheduled).toBe(0);
      expect(stats.totalInProgress).toBe(0);
      expect(stats.totalCompleted).toBe(0);
      expect(stats.totalCancelled).toBe(0);
      expect(stats.totalReports).toBe(0);
      expect(stats.corridorsTracked).toBe(0);
    });

    it('aggregates all operations correctly', () => {
      const { service } = setup();
      service.registerCorridor('c1');
      service.registerCorridor('c2');

      // 3 scheduled
      const t1 = service.scheduleTask({ corridorId: 'c1', maintenanceType: 'routine', estimatedDurationUs: 100 }) as Exclude<ReturnType<typeof service.scheduleTask>, string>;
      const t2 = service.scheduleTask({ corridorId: 'c1', maintenanceType: 'upgrade', estimatedDurationUs: 200 }) as Exclude<ReturnType<typeof service.scheduleTask>, string>;
      const t3 = service.scheduleTask({ corridorId: 'c2', maintenanceType: 'reinforcement', estimatedDurationUs: 300 }) as Exclude<ReturnType<typeof service.scheduleTask>, string>;

      // Start all
      service.startTask(t1.taskId);
      service.startTask(t2.taskId);
      service.startTask(t3.taskId);

      // Complete 2, cancel 1
      service.completeTask({ taskId: t1.taskId });
      service.completeTask({ taskId: t2.taskId });
      service.cancelTask(t3.taskId);

      const stats = service.getStats();
      expect(stats.totalScheduled).toBe(3);
      expect(stats.totalInProgress).toBe(0); // 3 started, 2 completed, 1 cancelled
      expect(stats.totalCompleted).toBe(2);
      expect(stats.totalCancelled).toBe(1);
      expect(stats.totalReports).toBe(2);
      expect(stats.corridorsTracked).toBe(2);
    });
  });

  // ─── Error Cases ────────────────────────────────────────────

  describe('error cases', () => {
    it('startTask returns task_not_found for unknown id', () => {
      const { service } = setup();
      expect(service.startTask('nope')).toBe('task_not_found');
    });

    it('completeTask returns task_not_found for unknown id', () => {
      const { service } = setup();
      expect(service.completeTask({ taskId: 'nope' })).toBe('task_not_found');
    });

    it('cancelTask returns task_not_found for unknown id', () => {
      const { service } = setup();
      expect(service.cancelTask('nope')).toBe('task_not_found');
    });

    it('double cancel returns task_already_cancelled', () => {
      const { service } = setup();
      service.registerCorridor('c1');
      const task = service.scheduleTask({
        corridorId: 'c1',
        maintenanceType: 'routine',
        estimatedDurationUs: 100,
      }) as Exclude<ReturnType<typeof service.scheduleTask>, string>;

      service.cancelTask(task.taskId);
      expect(service.cancelTask(task.taskId)).toBe('task_already_cancelled');
    });
  });
});
