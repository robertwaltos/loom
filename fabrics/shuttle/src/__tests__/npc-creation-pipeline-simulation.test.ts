import { describe, expect, it } from 'vitest';
import { createNpcCreationPipeline } from '../npc-creation-pipeline.js';

describe('npc-creation-pipeline simulation', () => {
  it('simulates full npc pipeline from spec to deploy and retire', async () => {
    let now = 1_000_000;
    let id = 0;
    const pipeline = createNpcCreationPipeline({
      trainer: {
        train: async () => '1.2.0',
        validate: async () => null,
      },
      clock: { nowMicroseconds: () => now },
      id: { next: () => `pip-${++id}` },
      log: { info: () => undefined, warn: () => undefined },
    });

    const created = pipeline.create({
      archetype: 'merchant',
      traitWeights: { curiosity: 0.6, aggression: 0.2, loyalty: 0.8, greed: 0.5, empathy: 0.7 },
      memorySeeds: ['first trade'],
      worldId: 'world-a',
    });
    if ('code' in created) throw new Error('create failed');

    await pipeline.advance(created.pipelineId);
    await pipeline.advance(created.pipelineId);
    const deployed = await pipeline.advance(created.pipelineId);
    expect('code' in deployed).toBe(false);
    if ('code' in deployed) return;
    expect(deployed.stage).toBe('DEPLOYED');

    const retired = pipeline.retire(created.pipelineId);
    expect('code' in retired).toBe(false);
    if ('code' in retired) return;
    expect(retired.stage).toBe('RETIRED');
  });
});
