import { describe, it, expect } from 'vitest';
import { createSystemScheduler } from '../system-scheduler.js';
import type { SystemSchedulerDeps } from '../system-scheduler.js';

function makeDeps(): SystemSchedulerDeps {
  let time = 1_000_000;
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
  };
}

describe('SystemScheduler — registration', () => {
  it('registers a system', () => {
    const sched = createSystemScheduler(makeDeps());
    expect(sched.register('physics', 'update')).toBe(true);
    expect(sched.getStats().totalSystems).toBe(1);
  });

  it('rejects duplicate registration', () => {
    const sched = createSystemScheduler(makeDeps());
    sched.register('physics', 'update');
    expect(sched.register('physics', 'update')).toBe(false);
  });

  it('registers with dependencies', () => {
    const sched = createSystemScheduler(makeDeps());
    sched.register('input', 'pre-update');
    sched.register('physics', 'update', ['input']);
    const def = sched.getDefinition('physics');
    expect(def?.dependsOn).toEqual(['input']);
  });

  it('unregisters a system', () => {
    const sched = createSystemScheduler(makeDeps());
    sched.register('physics', 'update');
    expect(sched.unregister('physics')).toBe(true);
    expect(sched.getStats().totalSystems).toBe(0);
  });

  it('returns false for unknown unregister', () => {
    const sched = createSystemScheduler(makeDeps());
    expect(sched.unregister('unknown')).toBe(false);
  });

  it('retrieves system definition', () => {
    const sched = createSystemScheduler(makeDeps());
    sched.register('render', 'render');
    const def = sched.getDefinition('render');
    expect(def?.systemId).toBe('render');
    expect(def?.phase).toBe('render');
    expect(def?.enabled).toBe(true);
  });

  it('returns undefined for unknown definition', () => {
    const sched = createSystemScheduler(makeDeps());
    expect(sched.getDefinition('unknown')).toBeUndefined();
  });
});

describe('SystemScheduler — enable / disable', () => {
  it('disables a system', () => {
    const sched = createSystemScheduler(makeDeps());
    sched.register('physics', 'update');
    expect(sched.disable('physics')).toBe(true);
    expect(sched.isEnabled('physics')).toBe(false);
  });

  it('re-enables a disabled system', () => {
    const sched = createSystemScheduler(makeDeps());
    sched.register('physics', 'update');
    sched.disable('physics');
    expect(sched.enable('physics')).toBe(true);
    expect(sched.isEnabled('physics')).toBe(true);
  });

  it('returns false for enabling unknown system', () => {
    const sched = createSystemScheduler(makeDeps());
    expect(sched.enable('unknown')).toBe(false);
  });

  it('returns false for isEnabled on unknown system', () => {
    const sched = createSystemScheduler(makeDeps());
    expect(sched.isEnabled('unknown')).toBe(false);
  });
});

describe('SystemScheduler — execution plan', () => {
  it('builds a valid plan for simple chain', () => {
    const sched = createSystemScheduler(makeDeps());
    sched.register('input', 'pre-update');
    sched.register('physics', 'update', ['input']);
    sched.register('render', 'render', ['physics']);
    const plan = sched.buildPlan();
    expect(plan.valid).toBe(true);
    expect(plan.totalSystems).toBe(3);
  });

  it('organizes systems into phases', () => {
    const sched = createSystemScheduler(makeDeps());
    sched.register('input', 'pre-update');
    sched.register('physics', 'update');
    sched.register('cleanup', 'post-update');
    sched.register('render', 'render');
    const plan = sched.buildPlan();
    expect(plan.phases).toHaveLength(4);
    expect(plan.phases[0]?.phase).toBe('pre-update');
    expect(plan.phases[1]?.phase).toBe('update');
    expect(plan.phases[2]?.phase).toBe('post-update');
    expect(plan.phases[3]?.phase).toBe('render');
  });

  it('excludes disabled systems from plan', () => {
    const sched = createSystemScheduler(makeDeps());
    sched.register('physics', 'update');
    sched.register('debug', 'update');
    sched.disable('debug');
    const plan = sched.buildPlan();
    expect(plan.totalSystems).toBe(1);
  });

  it('detects cycles and returns invalid plan', () => {
    const sched = createSystemScheduler(makeDeps());
    sched.register('a', 'update', ['b']);
    sched.register('b', 'update', ['a']);
    const plan = sched.buildPlan();
    expect(plan.valid).toBe(false);
  });

  it('detects parallel groups for independent systems', () => {
    const sched = createSystemScheduler(makeDeps());
    sched.register('physics', 'update');
    sched.register('ai', 'update');
    sched.register('animation', 'update');
    const plan = sched.buildPlan();
    const updatePhase = plan.phases.find((p) => p.phase === 'update');
    expect(updatePhase).toBeDefined();
    const firstGroup = updatePhase?.groups[0];
    expect(firstGroup?.systems.length).toBe(3);
  });

  it('separates dependent systems into different groups', () => {
    const sched = createSystemScheduler(makeDeps());
    sched.register('input', 'update');
    sched.register('physics', 'update', ['input']);
    const plan = sched.buildPlan();
    const updatePhase = plan.phases.find((p) => p.phase === 'update');
    expect(updatePhase?.groups.length).toBeGreaterThanOrEqual(2);
  });

  it('handles phases with no systems gracefully', () => {
    const sched = createSystemScheduler(makeDeps());
    sched.register('physics', 'update');
    const plan = sched.buildPlan();
    const renderPhase = plan.phases.find((p) => p.phase === 'render');
    expect(renderPhase).toBeUndefined();
  });
});

describe('SystemScheduler — execution timing', () => {
  it('records execution timing', () => {
    const sched = createSystemScheduler(makeDeps());
    sched.register('physics', 'update');
    expect(sched.recordExecution('physics', 500)).toBe(true);
    const timing = sched.getTiming('physics');
    expect(timing?.lastDurationMicros).toBe(500);
    expect(timing?.executionCount).toBe(1);
  });

  it('accumulates multiple executions', () => {
    const sched = createSystemScheduler(makeDeps());
    sched.register('physics', 'update');
    sched.recordExecution('physics', 400);
    sched.recordExecution('physics', 600);
    const timing = sched.getTiming('physics');
    expect(timing?.executionCount).toBe(2);
    expect(timing?.totalDurationMicros).toBe(1000);
    expect(timing?.averageDurationMicros).toBe(500);
    expect(timing?.lastDurationMicros).toBe(600);
  });

  it('returns false for recording on unknown system', () => {
    const sched = createSystemScheduler(makeDeps());
    expect(sched.recordExecution('unknown', 100)).toBe(false);
  });

  it('returns undefined timing for untracked system', () => {
    const sched = createSystemScheduler(makeDeps());
    expect(sched.getTiming('unknown')).toBeUndefined();
  });

  it('returns all timings', () => {
    const sched = createSystemScheduler(makeDeps());
    sched.register('physics', 'update');
    sched.register('render', 'render');
    sched.recordExecution('physics', 300);
    sched.recordExecution('render', 200);
    const all = sched.getAllTimings();
    expect(all).toHaveLength(2);
  });
});

describe('SystemScheduler — stats', () => {
  it('starts with zero stats', () => {
    const sched = createSystemScheduler(makeDeps());
    const stats = sched.getStats();
    expect(stats.totalSystems).toBe(0);
    expect(stats.enabledSystems).toBe(0);
    expect(stats.hasCycle).toBe(false);
  });

  it('tracks enabled and disabled counts', () => {
    const sched = createSystemScheduler(makeDeps());
    sched.register('physics', 'update');
    sched.register('debug', 'update');
    sched.disable('debug');
    const stats = sched.getStats();
    expect(stats.enabledSystems).toBe(1);
    expect(stats.disabledSystems).toBe(1);
  });

  it('reports phase distribution', () => {
    const sched = createSystemScheduler(makeDeps());
    sched.register('input', 'pre-update');
    sched.register('physics', 'update');
    sched.register('ai', 'update');
    sched.register('render', 'render');
    const stats = sched.getStats();
    expect(stats.phaseDistribution['pre-update']).toBe(1);
    expect(stats.phaseDistribution['update']).toBe(2);
    expect(stats.phaseDistribution['render']).toBe(1);
    expect(stats.phaseDistribution['post-update']).toBe(0);
  });

  it('reports edge count', () => {
    const sched = createSystemScheduler(makeDeps());
    sched.register('input', 'pre-update');
    sched.register('physics', 'update', ['input']);
    sched.register('render', 'render', ['physics']);
    expect(sched.getStats().totalEdges).toBe(2);
  });

  it('detects cycles in stats', () => {
    const sched = createSystemScheduler(makeDeps());
    sched.register('a', 'update', ['b']);
    sched.register('b', 'update', ['a']);
    expect(sched.getStats().hasCycle).toBe(true);
  });
});
