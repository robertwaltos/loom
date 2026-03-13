import { describe, expect, it } from 'vitest';
import { createWorkflowEngine } from '../workflow-engine.js';

describe('workflow-engine simulation', () => {
  it('simulates a staged npc workflow from queue to completion', () => {
    let now = 1_000_000;
    let id = 0;
    const engine = createWorkflowEngine({
      clock: { nowMicroseconds: () => now },
      idGenerator: { next: () => `wf-${++id}` },
    });

    const def = engine.define({
      name: 'guard-shift',
      steps: [
        { name: 'equip', stepType: 'action', executeFn: 'equip' },
        { name: 'patrol', stepType: 'action', executeFn: 'patrol' },
      ],
    });
    const inst = engine.start({ definitionId: def.definitionId, npcId: 'npc-1' });

    engine.tick(inst.instanceId, () => 'completed');
    const final = engine.tick(inst.instanceId, () => 'completed');

    expect(final.status).toBe('completed');
  });
});
