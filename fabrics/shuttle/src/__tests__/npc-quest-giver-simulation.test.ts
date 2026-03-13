import { describe, expect, it } from 'vitest';
import { createQuestGiverEngine } from '../npc-quest-giver.js';

describe('npc-quest-giver simulation', () => {
  it('simulates quest issuance, acceptance, and objective completion', () => {
    let now = 1_000_000;
    let id = 0;
    const engine = createQuestGiverEngine({
      clock: { nowMicroseconds: () => now++ },
      idGenerator: { generate: () => `qg-${id++}` },
    });

    const quest = engine.createQuest({
      title: 'Clear the eastern road',
      description: 'Defeat raiders near the bridge',
      giverId: 'npc-elder',
      category: 'combat',
      difficulty: 'normal',
      rewards: [{ rewardType: 'kalon', amount: 150 }],
      objectives: [
        {
          objectiveId: 'obj-1',
          description: 'Defeat raiders',
          targetCount: 3,
          currentCount: 0,
          completed: false,
        },
      ],
      requiredReputation: 0,
      expiresAt: null,
    });

    const accepted = engine.acceptQuest(quest.questId, 'player-1');
    const progressed = engine.progressObjective(quest.questId, 'obj-1', 3);

    expect(accepted.success).toBe(true);
    expect(progressed?.questCompleted).toBe(true);
  });
});
