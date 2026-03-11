import { describe, it, expect } from 'vitest';
import { createWorkflowEngine } from '../workflow-engine.js';
import type { WorkflowDeps, StepStatus } from '../workflow-engine.js';

function makeDeps(): { deps: WorkflowDeps; setTime: (t: number) => void } {
  let time = 1_000_000;
  let id = 0;
  return {
    deps: {
      clock: { nowMicroseconds: () => time },
      idGenerator: { next: () => 'wf-' + String(++id) },
    },
    setTime: (t: number) => {
      time = t;
    },
  };
}

function successExecutor(): StepStatus {
  return 'completed';
}

function failExecutor(): StepStatus {
  return 'failed';
}

describe('WorkflowEngine — definition', () => {
  it('defines a workflow', () => {
    const { deps } = makeDeps();
    const engine = createWorkflowEngine(deps);
    const def = engine.define({
      name: 'gather-resources',
      steps: [
        { name: 'find-tree', stepType: 'action', executeFn: 'find' },
        { name: 'chop-wood', stepType: 'action', executeFn: 'chop' },
        { name: 'carry-home', stepType: 'action', executeFn: 'carry' },
      ],
    });
    expect(def.name).toBe('gather-resources');
    expect(def.steps).toHaveLength(3);
  });

  it('retrieves a definition by ID', () => {
    const { deps } = makeDeps();
    const engine = createWorkflowEngine(deps);
    const def = engine.define({
      name: 'patrol',
      steps: [{ name: 'walk', stepType: 'action', executeFn: 'walk' }],
    });
    const retrieved = engine.getDefinition(def.definitionId);
    expect(retrieved?.name).toBe('patrol');
  });

  it('returns undefined for unknown definition', () => {
    const { deps } = makeDeps();
    const engine = createWorkflowEngine(deps);
    expect(engine.getDefinition('missing')).toBeUndefined();
  });
});

describe('WorkflowEngine — start and tick', () => {
  it('starts a workflow in queued state', () => {
    const { deps } = makeDeps();
    const engine = createWorkflowEngine(deps);
    const def = engine.define({
      name: 'test',
      steps: [{ name: 'step1', stepType: 'action', executeFn: 'do' }],
    });
    const instance = engine.start({ definitionId: def.definitionId, npcId: 'npc-1' });
    expect(instance.status).toBe('queued');
    expect(instance.npcId).toBe('npc-1');
  });

  it('throws for unknown definition', () => {
    const { deps } = makeDeps();
    const engine = createWorkflowEngine(deps);
    expect(() => engine.start({ definitionId: 'missing', npcId: 'npc-1' })).toThrow();
  });

  it('transitions from queued to running on first tick', () => {
    const { deps } = makeDeps();
    const engine = createWorkflowEngine(deps);
    const def = engine.define({
      name: 'test',
      steps: [{ name: 'step1', stepType: 'action', executeFn: 'do' }],
    });
    const instance = engine.start({ definitionId: def.definitionId, npcId: 'npc-1' });
    const result = engine.tick(instance.instanceId, successExecutor);
    expect(result.status).toBe('completed');
  });

  it('completes a multi-step workflow', () => {
    const { deps } = makeDeps();
    const engine = createWorkflowEngine(deps);
    const def = engine.define({
      name: 'multi',
      steps: [
        { name: 'step1', stepType: 'action', executeFn: 'a' },
        { name: 'step2', stepType: 'action', executeFn: 'b' },
        { name: 'step3', stepType: 'action', executeFn: 'c' },
      ],
    });
    const inst = engine.start({ definitionId: def.definitionId, npcId: 'npc-1' });
    engine.tick(inst.instanceId, successExecutor);
    engine.tick(inst.instanceId, successExecutor);
    const result = engine.tick(inst.instanceId, successExecutor);
    expect(result.status).toBe('completed');
  });

  it('fails on step failure', () => {
    const { deps } = makeDeps();
    const engine = createWorkflowEngine(deps);
    const def = engine.define({
      name: 'failtest',
      steps: [
        { name: 'ok-step', stepType: 'action', executeFn: 'a' },
        { name: 'bad-step', stepType: 'action', executeFn: 'b' },
      ],
    });
    const inst = engine.start({ definitionId: def.definitionId, npcId: 'npc-1' });
    engine.tick(inst.instanceId, successExecutor);
    const result = engine.tick(inst.instanceId, failExecutor);
    expect(result.status).toBe('failed');
  });

  it('handles running steps across multiple ticks', () => {
    const { deps } = makeDeps();
    const engine = createWorkflowEngine(deps);
    const def = engine.define({
      name: 'slow',
      steps: [{ name: 'long-task', stepType: 'action', executeFn: 'long' }],
    });
    const inst = engine.start({ definitionId: def.definitionId, npcId: 'npc-1' });
    let count = 0;
    const slowExecutor = (): StepStatus => {
      count++;
      return count >= 3 ? 'completed' : 'running';
    };
    engine.tick(inst.instanceId, slowExecutor);
    engine.tick(inst.instanceId, slowExecutor);
    const result = engine.tick(inst.instanceId, slowExecutor);
    expect(result.status).toBe('completed');
  });
});

describe('WorkflowEngine — wait step', () => {
  it('waits for specified duration', () => {
    const { deps, setTime } = makeDeps();
    const engine = createWorkflowEngine(deps);
    const def = engine.define({
      name: 'with-wait',
      steps: [
        { name: 'wait-step', stepType: 'wait', executeFn: 'noop', waitDurationUs: 1_000_000 },
        { name: 'after-wait', stepType: 'action', executeFn: 'done' },
      ],
    });
    const inst = engine.start({ definitionId: def.definitionId, npcId: 'npc-1' });
    const r1 = engine.tick(inst.instanceId, successExecutor);
    expect(r1.status).toBe('running');

    setTime(500_000);
    const r2 = engine.tick(inst.instanceId, successExecutor);
    expect(r2.status).toBe('running');

    setTime(2_000_000);
    const r3 = engine.tick(inst.instanceId, successExecutor);
    expect(r3.status).toBe('running');

    const r4 = engine.tick(inst.instanceId, successExecutor);
    expect(r4.status).toBe('completed');
  });
});

describe('WorkflowEngine — loop step', () => {
  it('loops a step N times', () => {
    const { deps } = makeDeps();
    const engine = createWorkflowEngine(deps);
    const def = engine.define({
      name: 'loop-test',
      steps: [{ name: 'repeat', stepType: 'loop', executeFn: 'iterate', maxIterations: 3 }],
    });
    const inst = engine.start({ definitionId: def.definitionId, npcId: 'npc-1' });
    engine.tick(inst.instanceId, successExecutor);
    engine.tick(inst.instanceId, successExecutor);
    const result = engine.tick(inst.instanceId, successExecutor);
    expect(result.status).toBe('completed');
  });
});

describe('WorkflowEngine — pause and resume', () => {
  it('pauses a running workflow', () => {
    const { deps } = makeDeps();
    const engine = createWorkflowEngine(deps);
    const def = engine.define({
      name: 'pausable',
      steps: [
        { name: 'step1', stepType: 'action', executeFn: 'do' },
        { name: 'step2', stepType: 'action', executeFn: 'do' },
      ],
    });
    const inst = engine.start({ definitionId: def.definitionId, npcId: 'npc-1' });
    engine.tick(inst.instanceId, successExecutor);
    expect(engine.pause(inst.instanceId)).toBe(true);
    const paused = engine.getInstance(inst.instanceId);
    expect(paused?.status).toBe('paused');
  });

  it('resumes a paused workflow', () => {
    const { deps } = makeDeps();
    const engine = createWorkflowEngine(deps);
    const def = engine.define({
      name: 'resumable',
      steps: [
        { name: 'step1', stepType: 'action', executeFn: 'do' },
        { name: 'step2', stepType: 'action', executeFn: 'do' },
      ],
    });
    const inst = engine.start({ definitionId: def.definitionId, npcId: 'npc-1' });
    engine.tick(inst.instanceId, successExecutor);
    engine.pause(inst.instanceId);
    expect(engine.resume(inst.instanceId)).toBe(true);
    const resumed = engine.getInstance(inst.instanceId);
    expect(resumed?.status).toBe('running');
  });

  it('cannot pause a non-running workflow', () => {
    const { deps } = makeDeps();
    const engine = createWorkflowEngine(deps);
    const def = engine.define({
      name: 'test',
      steps: [{ name: 's', stepType: 'action', executeFn: 'do' }],
    });
    const inst = engine.start({ definitionId: def.definitionId, npcId: 'npc-1' });
    expect(engine.pause(inst.instanceId)).toBe(false);
  });
});

describe('WorkflowEngine — cancel', () => {
  it('cancels a running workflow', () => {
    const { deps } = makeDeps();
    const engine = createWorkflowEngine(deps);
    const def = engine.define({
      name: 'cancel-test',
      steps: [
        { name: 's1', stepType: 'action', executeFn: 'do' },
        { name: 's2', stepType: 'action', executeFn: 'do' },
      ],
    });
    const inst = engine.start({ definitionId: def.definitionId, npcId: 'npc-1' });
    engine.tick(inst.instanceId, successExecutor);
    expect(engine.cancel(inst.instanceId)).toBe(true);
    const cancelled = engine.getInstance(inst.instanceId);
    expect(cancelled?.status).toBe('cancelled');
  });

  it('cannot cancel an already completed workflow', () => {
    const { deps } = makeDeps();
    const engine = createWorkflowEngine(deps);
    const def = engine.define({
      name: 'done',
      steps: [{ name: 's1', stepType: 'action', executeFn: 'do' }],
    });
    const inst = engine.start({ definitionId: def.definitionId, npcId: 'npc-1' });
    engine.tick(inst.instanceId, successExecutor);
    expect(engine.cancel(inst.instanceId)).toBe(false);
  });
});

describe('WorkflowEngine — compensate', () => {
  it('compensates completed steps on failure', () => {
    const { deps } = makeDeps();
    const engine = createWorkflowEngine(deps);
    const def = engine.define({
      name: 'compensable',
      steps: [
        { name: 'step1', stepType: 'action', executeFn: 'do1', compensateFn: 'undo1' },
        { name: 'step2', stepType: 'action', executeFn: 'do2', compensateFn: 'undo2' },
      ],
    });
    const inst = engine.start({ definitionId: def.definitionId, npcId: 'npc-1' });
    engine.tick(inst.instanceId, successExecutor);
    engine.tick(inst.instanceId, failExecutor);

    const compensated: string[] = [];
    const compensateExec = (_npcId: string, stepName: string): StepStatus => {
      compensated.push(stepName);
      return 'completed';
    };
    const count = engine.compensate(inst.instanceId, compensateExec);
    expect(count).toBeGreaterThanOrEqual(1);
    expect(compensated.length).toBeGreaterThanOrEqual(1);
  });
});

describe('WorkflowEngine — queries', () => {
  it('gets instances for an NPC', () => {
    const { deps } = makeDeps();
    const engine = createWorkflowEngine(deps);
    const def = engine.define({
      name: 'q',
      steps: [{ name: 's', stepType: 'action', executeFn: 'do' }],
    });
    engine.start({ definitionId: def.definitionId, npcId: 'npc-1' });
    engine.start({ definitionId: def.definitionId, npcId: 'npc-1' });
    engine.start({ definitionId: def.definitionId, npcId: 'npc-2' });
    const instances = engine.getInstancesForNpc('npc-1');
    expect(instances).toHaveLength(2);
  });

  it('gets the queue sorted by priority', () => {
    const { deps } = makeDeps();
    const engine = createWorkflowEngine(deps);
    const def = engine.define({
      name: 'prio',
      steps: [{ name: 's', stepType: 'action', executeFn: 'do' }],
    });
    engine.start({ definitionId: def.definitionId, npcId: 'npc-1', priority: 1 });
    engine.start({ definitionId: def.definitionId, npcId: 'npc-2', priority: 10 });
    engine.start({ definitionId: def.definitionId, npcId: 'npc-3', priority: 5 });
    const queue = engine.getQueue();
    expect(queue[0]?.priority).toBe(10);
    expect(queue[1]?.priority).toBe(5);
    expect(queue[2]?.priority).toBe(1);
  });
});

describe('WorkflowEngine — stats', () => {
  it('returns empty stats initially', () => {
    const { deps } = makeDeps();
    const engine = createWorkflowEngine(deps);
    const stats = engine.getStats();
    expect(stats.totalDefinitions).toBe(0);
    expect(stats.totalInstances).toBe(0);
  });

  it('tracks workflow state counts', () => {
    const { deps } = makeDeps();
    const engine = createWorkflowEngine(deps);
    const def = engine.define({
      name: 'stat-test',
      steps: [{ name: 's1', stepType: 'action', executeFn: 'do' }],
    });
    const i1 = engine.start({ definitionId: def.definitionId, npcId: 'npc-1' });
    const i2 = engine.start({ definitionId: def.definitionId, npcId: 'npc-2' });
    engine.tick(i1.instanceId, successExecutor);
    engine.tick(i2.instanceId, failExecutor);
    engine.start({ definitionId: def.definitionId, npcId: 'npc-3' });

    const stats = engine.getStats();
    expect(stats.totalDefinitions).toBe(1);
    expect(stats.totalInstances).toBe(3);
    expect(stats.completedCount).toBe(1);
    expect(stats.failedCount).toBe(1);
    expect(stats.queuedCount).toBe(1);
  });
});
