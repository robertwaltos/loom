import { describe, expect, it } from 'vitest';
import { createQuestTrackerSystem } from '../quest-tracker.js';

describe('quest-tracker simulation', () => {
  it('simulates accept-progress-complete-reward flow with player stat updates', () => {
    let now = 1_000_000_000n;
    let id = 0;
    const tracker = createQuestTrackerSystem({
      clock: { nowUs: () => now++ },
      idGen: { generate: () => `qt-${++id}` },
      logger: {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    });

    tracker.registerPlayer('player-1');
    tracker.defineQuest(
      'q-1',
      'Wolves',
      'Hunt wolves',
      [{ objectiveId: 'o-1', description: 'Defeat 10', required: true }],
      500n,
      null,
    );

    const accepted = tracker.acceptQuest('player-1', 'q-1');
    if (typeof accepted === 'string') throw new Error('expected accepted quest');

    const progressed = tracker.progressObjective(accepted.playerQuestId, 'o-1');
    const reward = tracker.awardReward(accepted.playerQuestId);

    expect(progressed.success).toBe(true);
    expect(progressed.questCompleted).toBe(true);
    expect(reward.success).toBe(true);
    expect(tracker.getPlayerStats('player-1')?.totalKalonEarned).toBe(500n);
  });
});
