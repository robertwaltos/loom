import { describe, it, expect } from 'vitest';
import { createTaskScheduler } from '../task-scheduler.js';
import type { TaskSchedulerDeps } from '../task-scheduler.js';

function createDeps(startTime = 1000): { deps: TaskSchedulerDeps; advance: (t: number) => void } {
  let time = startTime;
  let id = 0;
  return {
    deps: {
      clock: { nowMicroseconds: () => time },
      idGenerator: { next: () => 'task-' + String(id++) },
    },
    advance: (t: number) => { time += t; },
  };
}

describe('TaskScheduler — schedule / getTask', () => {
  it('schedules a task for future execution', () => {
    const { deps } = createDeps();
    const sched = createTaskScheduler(deps);
    const task = sched.schedule({ name: 'cleanup', payload: { target: 'logs' }, executeAt: 5000 });
    expect(task.taskId).toBe('task-0');
    expect(task.name).toBe('cleanup');
    expect(task.status).toBe('pending');
    expect(task.executeAt).toBe(5000);
  });

  it('retrieves a task by id', () => {
    const { deps } = createDeps();
    const sched = createTaskScheduler(deps);
    const task = sched.schedule({ name: 'sync', payload: null, executeAt: 3000 });
    expect(sched.getTask(task.taskId)).toBeDefined();
  });

  it('returns undefined for unknown task', () => {
    const { deps } = createDeps();
    const sched = createTaskScheduler(deps);
    expect(sched.getTask('nope')).toBeUndefined();
  });
});

describe('TaskScheduler — getDue / markExecuted', () => {
  it('returns due tasks when time has passed', () => {
    const { deps, advance } = createDeps(0);
    const sched = createTaskScheduler(deps);
    sched.schedule({ name: 'a', payload: null, executeAt: 500 });
    sched.schedule({ name: 'b', payload: null, executeAt: 2000 });
    advance(1000);
    const due = sched.getDue();
    expect(due).toHaveLength(1);
    expect(due[0]?.name).toBe('a');
  });

  it('marks a task as executed', () => {
    const { deps, advance } = createDeps(0);
    const sched = createTaskScheduler(deps);
    const task = sched.schedule({ name: 'a', payload: null, executeAt: 100 });
    advance(200);
    expect(sched.markExecuted(task.taskId)).toBe(true);
    expect(sched.getTask(task.taskId)?.status).toBe('executed');
    expect(sched.getDue()).toHaveLength(0);
  });

  it('cannot mark already executed task', () => {
    const { deps } = createDeps();
    const sched = createTaskScheduler(deps);
    const task = sched.schedule({ name: 'a', payload: null, executeAt: 100 });
    sched.markExecuted(task.taskId);
    expect(sched.markExecuted(task.taskId)).toBe(false);
  });
});

describe('TaskScheduler — cancel', () => {
  it('cancels a pending task', () => {
    const { deps } = createDeps();
    const sched = createTaskScheduler(deps);
    const task = sched.schedule({ name: 'a', payload: null, executeAt: 5000 });
    expect(sched.cancel(task.taskId)).toBe(true);
    expect(sched.getTask(task.taskId)?.status).toBe('cancelled');
  });

  it('cannot cancel already cancelled task', () => {
    const { deps } = createDeps();
    const sched = createTaskScheduler(deps);
    const task = sched.schedule({ name: 'a', payload: null, executeAt: 5000 });
    sched.cancel(task.taskId);
    expect(sched.cancel(task.taskId)).toBe(false);
  });
});

describe('TaskScheduler — getStats', () => {
  it('reports task status counts', () => {
    const { deps } = createDeps();
    const sched = createTaskScheduler(deps);
    sched.schedule({ name: 'a', payload: null, executeAt: 5000 });
    const t2 = sched.schedule({ name: 'b', payload: null, executeAt: 5000 });
    const t3 = sched.schedule({ name: 'c', payload: null, executeAt: 5000 });
    sched.markExecuted(t2.taskId);
    sched.cancel(t3.taskId);

    const stats = sched.getStats();
    expect(stats.totalTasks).toBe(3);
    expect(stats.pendingTasks).toBe(1);
    expect(stats.executedTasks).toBe(1);
    expect(stats.cancelledTasks).toBe(1);
  });
});
