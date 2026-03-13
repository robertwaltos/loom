import { describe, expect, it } from 'vitest';
import { createSagaOrchestrator } from '../saga-orchestrator.js';

describe('saga-orchestrator simulation', () => {
  it('simulates multi-step execution with failure path and compensation processing', () => {
    let now = 1_000;
    let id = 0;
    const orchestrator = createSagaOrchestrator({
      clock: { nowMicroseconds: () => now++ },
      idGenerator: { next: () => `saga-${++id}` },
    });

    orchestrator.registerSaga({
      sagaName: 'player-connect',
      steps: [
        { stepName: 'authenticate', timeoutUs: 1_000_000 },
        { stepName: 'spawn', timeoutUs: 1_000_000 },
        { stepName: 'notify', timeoutUs: 1_000_000 },
      ],
    });

    const started = orchestrator.startSaga('player-connect', { playerId: 'p1' });
    if (typeof started === 'string') throw new Error('expected started saga');

    orchestrator.advanceStep(started.instanceId);
    orchestrator.completeStep(started.instanceId, 'authenticate', { token: 'ok' });
    orchestrator.advanceStep(started.instanceId);
    orchestrator.failStep(started.instanceId, 'spawn', 'capacity reached');
    const compensated = orchestrator.compensate(started.instanceId);

    expect(typeof compensated).toBe('object');
    if (typeof compensated === 'object') {
      expect(compensated.compensatedSteps).toBeGreaterThanOrEqual(1);
      expect(compensated.phase).toBe('FAILED');
    }
  });
});
