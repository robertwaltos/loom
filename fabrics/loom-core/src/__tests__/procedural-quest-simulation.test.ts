import { describe, expect, it } from 'vitest';
import { createProceduralQuestModule } from '../procedural-quest.js';

describe('procedural-quest simulation', () => {
  it('simulates template registration, quest generation, activation, and completion rewards', () => {
    let now = 1_000_000_000n;
    let id = 0;
    const module = createProceduralQuestModule({
      clock: { nowMicroseconds: () => now++ },
      idGen: { generate: () => `q-${++id}` },
      logger: {
        info: () => undefined,
        warn: () => undefined,
      },
    });

    module.registerTemplate({
      templateId: 'tmpl-1',
      name: 'Integrity Patrol',
      description: 'Stabilize district',
      triggerType: 'LOW_INTEGRITY',
      difficulty: 'EASY',
      prerequisites: [],
      baseReward: {
        kalonAmount: 100_000_000n,
        experiencePoints: 100,
        items: [],
        reputationGain: 10,
      },
      estimatedDurationMinutes: 30,
      maxActiveInstances: 5,
    });

    const generated = module.generateQuest({
      type: 'LOW_INTEGRITY',
      worldId: 'earth',
      severity: 0.3,
      metadata: {},
    });
    if ('error' in generated) throw new Error('expected generated quest');

    const activated = module.activateQuest(generated.questId, 'dynasty-1');
    const reward = module.completeQuest(generated.questId);

    expect(typeof activated).toBe('string');
    expect('error' in reward).toBe(false);
    if (!('error' in reward)) expect(reward.kalonAmount).toBe(200_000_000n);
  });
});
