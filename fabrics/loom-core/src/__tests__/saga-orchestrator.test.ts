import { describe, it, expect } from 'vitest';
import {
  createSagaOrchestrator,
  MAX_SAGA_STEPS,
  DEFAULT_STEP_TIMEOUT_US,
  MAX_COMPENSATION_RETRIES,
} from '../saga-orchestrator.js';
import type {
  SagaDeps,
  SagaDefinition,
  SagaInstance,
  SagaStepResult,
  CompensationResult,
} from '../saga-orchestrator.js';

function createDeps(startTime = 1000): {
  deps: SagaDeps;
  advance: (t: number) => void;
} {
  let time = startTime;
  let id = 0;
  return {
    deps: {
      clock: { nowMicroseconds: () => time },
      idGenerator: { next: () => 'id-' + String(id++) },
    },
    advance: (t: number) => {
      time += t;
    },
  };
}

function threeStepDef(): SagaDefinition {
  return {
    sagaName: 'player-connect',
    steps: [
      { stepName: 'authenticate', timeoutUs: DEFAULT_STEP_TIMEOUT_US },
      { stepName: 'load-world', timeoutUs: DEFAULT_STEP_TIMEOUT_US },
      { stepName: 'spawn-entity', timeoutUs: DEFAULT_STEP_TIMEOUT_US },
    ],
  };
}

describe('SagaOrchestrator — registration', () => {
  it('registers a saga definition', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    const stats = orch.getStats();
    expect(stats.totalRegistered).toBe(1);
  });

  it('overwrites a saga definition with same name', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    orch.registerSaga(threeStepDef());
    expect(orch.getStats().totalRegistered).toBe(1);
  });
});

describe('SagaOrchestrator — startSaga', () => {
  it('starts a saga instance in PENDING phase', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    const result = orch.startSaga('player-connect', { playerId: 'p-1' });
    expect(typeof result).not.toBe('string');
    const inst = result as SagaInstance;
    expect(inst.phase).toBe('PENDING');
    expect(inst.sagaName).toBe('player-connect');
    expect(inst.contextData).toEqual({ playerId: 'p-1' });
    expect(inst.steps).toHaveLength(3);
  });

  it('returns error for unknown saga', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    const result = orch.startSaga('unknown', {});
    expect(typeof result).toBe('string');
    expect(result as string).toContain('not found');
  });

  it('returns error for saga with no steps', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga({ sagaName: 'empty', steps: [] });
    const result = orch.startSaga('empty', {});
    expect(typeof result).toBe('string');
    expect(result as string).toContain('no steps');
  });

  it('returns error when exceeding max steps', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    const tooMany = Array.from({ length: MAX_SAGA_STEPS + 1 }, (_, i) => ({
      stepName: 'step-' + String(i),
      timeoutUs: DEFAULT_STEP_TIMEOUT_US,
    }));
    orch.registerSaga({ sagaName: 'huge', steps: tooMany });
    const result = orch.startSaga('huge', {});
    expect(typeof result).toBe('string');
    expect(result as string).toContain('max steps');
  });

  it('records SAGA_STARTED event', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    const inst = orch.startSaga('player-connect', {}) as SagaInstance;
    const history = orch.getHistory(inst.instanceId);
    expect(history).toHaveLength(1);
    expect(history[0]?.kind).toBe('SAGA_STARTED');
  });
});

describe('SagaOrchestrator — advanceStep', () => {
  it('advances the first step to RUNNING', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    const inst = orch.startSaga('player-connect', {}) as SagaInstance;
    const result = orch.advanceStep(inst.instanceId);
    expect(typeof result).not.toBe('string');
    const stepResult = result as SagaStepResult;
    expect(stepResult.stepName).toBe('authenticate');
    expect(stepResult.stepIndex).toBe(0);
  });

  it('sets saga phase to RUNNING on advance', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    const inst = orch.startSaga('player-connect', {}) as SagaInstance;
    orch.advanceStep(inst.instanceId);
    const saga = orch.getSaga(inst.instanceId);
    expect(saga?.phase).toBe('RUNNING');
  });

  it('returns error for unknown instance', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    const result = orch.advanceStep('unknown');
    expect(typeof result).toBe('string');
  });

  it('returns error when saga is completed', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga({
      sagaName: 'single',
      steps: [{ stepName: 'only', timeoutUs: DEFAULT_STEP_TIMEOUT_US }],
    });
    const inst = orch.startSaga('single', {}) as SagaInstance;
    orch.advanceStep(inst.instanceId);
    orch.completeStep(inst.instanceId, 'only', {});
    const result = orch.advanceStep(inst.instanceId);
    expect(typeof result).toBe('string');
    expect(result as string).toContain('COMPLETED');
  });

  it('returns error when current step is not pending', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    const inst = orch.startSaga('player-connect', {}) as SagaInstance;
    orch.advanceStep(inst.instanceId);
    const result = orch.advanceStep(inst.instanceId);
    expect(typeof result).toBe('string');
    expect(result as string).toContain('not pending');
  });
});

describe('SagaOrchestrator — completeStep', () => {
  it('completes a running step and advances index', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    const inst = orch.startSaga('player-connect', {}) as SagaInstance;
    orch.advanceStep(inst.instanceId);
    const result = orch.completeStep(inst.instanceId, 'authenticate', {
      token: 'abc',
    });
    expect(typeof result).not.toBe('string');
    const updated = result as SagaInstance;
    expect(updated.currentStepIndex).toBe(1);
    expect(updated.steps[0]?.status).toBe('COMPLETED');
    expect(updated.steps[0]?.result).toEqual({ token: 'abc' });
  });

  it('completes saga when last step is completed', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga({
      sagaName: 'single',
      steps: [{ stepName: 'only', timeoutUs: DEFAULT_STEP_TIMEOUT_US }],
    });
    const inst = orch.startSaga('single', {}) as SagaInstance;
    orch.advanceStep(inst.instanceId);
    const result = orch.completeStep(inst.instanceId, 'only', {
      done: true,
    });
    const updated = result as SagaInstance;
    expect(updated.phase).toBe('COMPLETED');
    expect(updated.completedAt).not.toBeNull();
  });

  it('returns error for unknown instance', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    const result = orch.completeStep('nope', 'step', {});
    expect(typeof result).toBe('string');
  });

  it('returns error when saga is not running', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    const inst = orch.startSaga('player-connect', {}) as SagaInstance;
    const result = orch.completeStep(inst.instanceId, 'authenticate', {});
    expect(typeof result).toBe('string');
    expect(result as string).toContain('not running');
  });

  it('returns error when step name does not match running step', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    const inst = orch.startSaga('player-connect', {}) as SagaInstance;
    orch.advanceStep(inst.instanceId);
    const result = orch.completeStep(inst.instanceId, 'wrong-step', {});
    expect(typeof result).toBe('string');
    expect(result as string).toContain('No running step');
  });
});

describe('SagaOrchestrator — failStep', () => {
  it('fails a running step and enters COMPENSATING phase', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    const inst = orch.startSaga('player-connect', {}) as SagaInstance;
    orch.advanceStep(inst.instanceId);
    const result = orch.failStep(inst.instanceId, 'authenticate', 'Auth timeout');
    expect(typeof result).not.toBe('string');
    const updated = result as SagaInstance;
    expect(updated.phase).toBe('COMPENSATING');
    expect(updated.failureReason).toBe('Auth timeout');
  });

  it('records STEP_FAILED and COMPENSATION_STARTED events', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    const inst = orch.startSaga('player-connect', {}) as SagaInstance;
    orch.advanceStep(inst.instanceId);
    orch.failStep(inst.instanceId, 'authenticate', 'timeout');
    const history = orch.getHistory(inst.instanceId);
    const kinds = history.map((e) => e.kind);
    expect(kinds).toContain('STEP_FAILED');
    expect(kinds).toContain('COMPENSATION_STARTED');
  });

  it('returns error for unknown instance', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    const result = orch.failStep('nope', 'step', 'reason');
    expect(typeof result).toBe('string');
  });

  it('returns error when saga not running', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    const inst = orch.startSaga('player-connect', {}) as SagaInstance;
    const result = orch.failStep(inst.instanceId, 'authenticate', 'err');
    expect(typeof result).toBe('string');
    expect(result as string).toContain('not running');
  });
});

describe('SagaOrchestrator — compensate', () => {
  it('compensates completed steps in a failed saga', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    const inst = orch.startSaga('player-connect', {}) as SagaInstance;
    orch.advanceStep(inst.instanceId);
    orch.completeStep(inst.instanceId, 'authenticate', {});
    orch.advanceStep(inst.instanceId);
    orch.failStep(inst.instanceId, 'load-world', 'world unavailable');
    const result = orch.compensate(inst.instanceId);
    expect(typeof result).not.toBe('string');
    const comp = result as CompensationResult;
    expect(comp.compensatedSteps).toBe(1);
    expect(comp.failedCompensations).toBe(0);
    expect(comp.phase).toBe('FAILED');
  });

  it('returns error for unknown instance', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    const result = orch.compensate('nope');
    expect(typeof result).toBe('string');
  });

  it('returns error when saga is not in COMPENSATING phase', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    const inst = orch.startSaga('player-connect', {}) as SagaInstance;
    const result = orch.compensate(inst.instanceId);
    expect(typeof result).toBe('string');
    expect(result as string).toContain('not in compensating');
  });

  it('records compensation events in history', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    const inst = orch.startSaga('player-connect', {}) as SagaInstance;
    orch.advanceStep(inst.instanceId);
    orch.completeStep(inst.instanceId, 'authenticate', {});
    orch.advanceStep(inst.instanceId);
    orch.failStep(inst.instanceId, 'load-world', 'err');
    orch.compensate(inst.instanceId);
    const history = orch.getHistory(inst.instanceId);
    const kinds = history.map((e) => e.kind);
    expect(kinds).toContain('COMPENSATION_STEP_OK');
    expect(kinds).toContain('COMPENSATION_COMPLETED');
  });
});

describe('SagaOrchestrator — abortSaga', () => {
  it('aborts a pending saga', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    const inst = orch.startSaga('player-connect', {}) as SagaInstance;
    const result = orch.abortSaga(inst.instanceId, 'user cancelled');
    expect(typeof result).not.toBe('string');
    const updated = result as SagaInstance;
    expect(updated.phase).toBe('FAILED');
    expect(updated.failureReason).toBe('user cancelled');
    expect(updated.completedAt).not.toBeNull();
  });

  it('aborts a running saga', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    const inst = orch.startSaga('player-connect', {}) as SagaInstance;
    orch.advanceStep(inst.instanceId);
    const result = orch.abortSaga(inst.instanceId, 'shutdown');
    const updated = result as SagaInstance;
    expect(updated.phase).toBe('FAILED');
  });

  it('returns error when aborting completed saga', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga({
      sagaName: 'single',
      steps: [{ stepName: 'only', timeoutUs: DEFAULT_STEP_TIMEOUT_US }],
    });
    const inst = orch.startSaga('single', {}) as SagaInstance;
    orch.advanceStep(inst.instanceId);
    orch.completeStep(inst.instanceId, 'only', {});
    const result = orch.abortSaga(inst.instanceId, 'too late');
    expect(typeof result).toBe('string');
    expect(result as string).toContain('Cannot abort');
  });

  it('returns error for unknown instance', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    const result = orch.abortSaga('nope', 'reason');
    expect(typeof result).toBe('string');
  });

  it('records SAGA_ABORTED event', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    const inst = orch.startSaga('player-connect', {}) as SagaInstance;
    orch.abortSaga(inst.instanceId, 'reason');
    const history = orch.getHistory(inst.instanceId);
    const kinds = history.map((e) => e.kind);
    expect(kinds).toContain('SAGA_ABORTED');
  });
});

describe('SagaOrchestrator — getSaga / listByPhase', () => {
  it('returns undefined for unknown instance', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    expect(orch.getSaga('nope')).toBeUndefined();
  });

  it('lists instances by phase', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    orch.startSaga('player-connect', { id: 1 });
    orch.startSaga('player-connect', { id: 2 });
    const inst3 = orch.startSaga('player-connect', { id: 3 }) as SagaInstance;
    orch.advanceStep(inst3.instanceId);

    expect(orch.listByPhase('PENDING')).toHaveLength(2);
    expect(orch.listByPhase('RUNNING')).toHaveLength(1);
    expect(orch.listByPhase('COMPLETED')).toHaveLength(0);
  });
});

describe('SagaOrchestrator — getHistory', () => {
  it('returns empty array for unknown instance', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    expect(orch.getHistory('nope')).toHaveLength(0);
  });

  it('returns events in order for an instance', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    const inst = orch.startSaga('player-connect', {}) as SagaInstance;
    orch.advanceStep(inst.instanceId);
    orch.completeStep(inst.instanceId, 'authenticate', {});
    const history = orch.getHistory(inst.instanceId);
    expect(history.length).toBeGreaterThanOrEqual(3);
    expect(history[0]?.kind).toBe('SAGA_STARTED');
    expect(history[1]?.kind).toBe('STEP_ADVANCED');
    expect(history[2]?.kind).toBe('STEP_COMPLETED');
  });
});

describe('SagaOrchestrator — getStats', () => {
  it('starts with zero stats', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    const stats = orch.getStats();
    expect(stats.totalRegistered).toBe(0);
    expect(stats.totalInstances).toBe(0);
    expect(stats.totalEvents).toBe(0);
  });

  it('tracks instance phase counts', () => {
    const { deps } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    orch.registerSaga({
      sagaName: 'single',
      steps: [{ stepName: 'only', timeoutUs: DEFAULT_STEP_TIMEOUT_US }],
    });
    orch.startSaga('player-connect', {});
    const inst2 = orch.startSaga('single', {}) as SagaInstance;
    orch.advanceStep(inst2.instanceId);
    orch.completeStep(inst2.instanceId, 'only', {});

    const stats = orch.getStats();
    expect(stats.totalRegistered).toBe(2);
    expect(stats.totalInstances).toBe(2);
    expect(stats.pendingCount).toBe(1);
    expect(stats.completedCount).toBe(1);
  });
});

describe('SagaOrchestrator — full lifecycle', () => {
  it('runs a 3-step saga to completion', () => {
    const { deps, advance } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    const inst = orch.startSaga('player-connect', {
      playerId: 'p-1',
    }) as SagaInstance;
    const id = inst.instanceId;

    advance(100);
    orch.advanceStep(id);
    advance(200);
    orch.completeStep(id, 'authenticate', { token: 'x' });

    advance(100);
    orch.advanceStep(id);
    advance(300);
    orch.completeStep(id, 'load-world', { worldId: 'w-1' });

    advance(100);
    orch.advanceStep(id);
    advance(150);
    orch.completeStep(id, 'spawn-entity', { entityId: 'e-1' });

    const final = orch.getSaga(id);
    expect(final?.phase).toBe('COMPLETED');
    expect(final?.steps.every((s) => s.status === 'COMPLETED')).toBe(true);
    expect(orch.getHistory(id).length).toBeGreaterThanOrEqual(7);
  });

  it('fails mid-saga and compensates', () => {
    const { deps, advance } = createDeps();
    const orch = createSagaOrchestrator(deps);
    orch.registerSaga(threeStepDef());
    const inst = orch.startSaga('player-connect', {}) as SagaInstance;
    const id = inst.instanceId;

    advance(100);
    orch.advanceStep(id);
    advance(200);
    orch.completeStep(id, 'authenticate', {});

    advance(100);
    orch.advanceStep(id);
    advance(200);
    orch.failStep(id, 'load-world', 'world full');

    const comp = orch.compensate(id) as CompensationResult;
    expect(comp.compensatedSteps).toBe(1);
    expect(comp.phase).toBe('FAILED');

    const final = orch.getSaga(id);
    expect(final?.phase).toBe('FAILED');
    expect(final?.completedAt).not.toBeNull();
  });
});

describe('SagaOrchestrator — constants', () => {
  it('exports expected constants', () => {
    expect(MAX_SAGA_STEPS).toBe(64);
    expect(DEFAULT_STEP_TIMEOUT_US).toBe(30_000_000);
    expect(MAX_COMPENSATION_RETRIES).toBe(3);
  });
});
