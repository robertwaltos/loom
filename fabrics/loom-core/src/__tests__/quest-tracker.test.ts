/**
 * Quest Tracker System Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createQuestTrackerSystem,
  type QuestTrackerSystem,
  type QuestError,
  type QuestObjectiveTemplate,
} from '../quest-tracker.js';

class TestClock {
  private currentUs = 1_000_000_000n;
  nowUs(): bigint {
    return this.currentUs;
  }
  advance(deltaUs: bigint): void {
    this.currentUs = this.currentUs + deltaUs;
  }
}

class TestIdGenerator {
  private counter = 0;
  generate(): string {
    this.counter += 1;
    return 'id-' + String(this.counter);
  }
}

class TestLogger {
  debug(_msg: string): void {}
  info(_msg: string): void {}
  warn(_msg: string): void {}
  error(_msg: string): void {}
}

function makeDeps() {
  return { clock: new TestClock(), idGen: new TestIdGenerator(), logger: new TestLogger() };
}

const OBJECTIVES: ReadonlyArray<QuestObjectiveTemplate> = [
  { objectiveId: 'obj-1', description: 'Kill 10 wolves', required: true },
  { objectiveId: 'obj-2', description: 'Collect a trophy', required: false },
];

describe('QuestTracker — defineQuest', () => {
  let tracker: QuestTrackerSystem;

  beforeEach(() => {
    tracker = createQuestTrackerSystem(makeDeps());
  });

  it('defines a new quest successfully', () => {
    const result = tracker.defineQuest('q-1', 'Wolf Hunt', 'Hunt wolves', OBJECTIVES, 500n, null);
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.questId).toBe('q-1');
    expect(result.rewardKalon).toBe(500n);
  });

  it('returns wrong-status when same questId is defined twice', () => {
    tracker.defineQuest('q-1', 'Quest', 'Desc', OBJECTIVES, 100n, null);
    const result = tracker.defineQuest('q-1', 'Duplicate', 'Desc', OBJECTIVES, 200n, null);
    expect(result).toBe('wrong-status' satisfies QuestError);
  });

  it('stores timeLimit when provided', () => {
    const result = tracker.defineQuest('q-tl', 'Timed', 'Timed quest', OBJECTIVES, 100n, 3600n);
    if (typeof result === 'string') return;
    expect(result.timeLimit).toBe(3600n);
  });

  it('stores null timeLimit when not provided', () => {
    const result = tracker.defineQuest('q-notl', 'Untimed', 'No limit', OBJECTIVES, 100n, null);
    if (typeof result === 'string') return;
    expect(result.timeLimit).toBeNull();
  });
});

describe('QuestTracker — registerPlayer', () => {
  let tracker: QuestTrackerSystem;

  beforeEach(() => {
    tracker = createQuestTrackerSystem(makeDeps());
  });

  it('registers a player successfully', () => {
    expect(tracker.registerPlayer('player-1')).toEqual({ success: true });
  });

  it('returns already-registered for duplicate player', () => {
    tracker.registerPlayer('player-1');
    const result = tracker.registerPlayer('player-1');
    expect(result).toEqual({ success: false, error: 'already-registered' satisfies QuestError });
  });
});

describe('QuestTracker — acceptQuest', () => {
  let tracker: QuestTrackerSystem;

  beforeEach(() => {
    tracker = createQuestTrackerSystem(makeDeps());
    tracker.registerPlayer('player-1');
    tracker.defineQuest('q-1', 'Hunt', 'Hunt wolves', OBJECTIVES, 500n, null);
  });

  it('accepts a quest and creates PlayerQuest with ACTIVE status', () => {
    const result = tracker.acceptQuest('player-1', 'q-1');
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.status).toBe('ACTIVE');
    expect(result.questId).toBe('q-1');
    expect(result.playerId).toBe('player-1');
  });

  it('initializes all objectives as PENDING', () => {
    const result = tracker.acceptQuest('player-1', 'q-1');
    if (typeof result === 'string') return;
    expect(result.objectiveProgress.get('obj-1')).toBe('PENDING');
    expect(result.objectiveProgress.get('obj-2')).toBe('PENDING');
  });

  it('returns player-not-found for unregistered player', () => {
    const result = tracker.acceptQuest('ghost', 'q-1');
    expect(result).toBe('player-not-found' satisfies QuestError);
  });

  it('returns quest-not-found for unknown quest', () => {
    const result = tracker.acceptQuest('player-1', 'ghost-q');
    expect(result).toBe('quest-not-found' satisfies QuestError);
  });

  it('returns already-accepted when same quest is already ACTIVE', () => {
    tracker.acceptQuest('player-1', 'q-1');
    const result = tracker.acceptQuest('player-1', 'q-1');
    expect(result).toBe('already-accepted' satisfies QuestError);
  });
});

describe('QuestTracker — progressObjective', () => {
  let tracker: QuestTrackerSystem;
  let playerQuestId: string;

  beforeEach(() => {
    tracker = createQuestTrackerSystem(makeDeps());
    tracker.registerPlayer('player-1');
    tracker.defineQuest('q-1', 'Hunt', 'Desc', OBJECTIVES, 500n, null);
    const pq = tracker.acceptQuest('player-1', 'q-1');
    if (typeof pq === 'string') throw new Error('setup failed');
    playerQuestId = pq.playerQuestId;
  });

  it('marks an objective as COMPLETED', () => {
    tracker.progressObjective(playerQuestId, 'obj-1');
    const pq = tracker.getPlayerQuest(playerQuestId);
    expect(pq?.objectiveProgress.get('obj-1')).toBe('COMPLETED');
  });

  it('completes the quest when all required objectives are done', () => {
    const result = tracker.progressObjective(playerQuestId, 'obj-1');
    expect(result).toEqual({ success: true, questCompleted: true });
    const pq = tracker.getPlayerQuest(playerQuestId);
    expect(pq?.status).toBe('COMPLETED');
  });

  it('does not complete quest when only optional objectives done', () => {
    const result = tracker.progressObjective(playerQuestId, 'obj-2');
    expect(result).toEqual({ success: true, questCompleted: false });
    const pq = tracker.getPlayerQuest(playerQuestId);
    expect(pq?.status).toBe('ACTIVE');
  });

  it('returns quest-not-found for unknown playerQuestId', () => {
    const result = tracker.progressObjective('ghost', 'obj-1');
    expect(result).toEqual({ success: false, error: 'quest-not-found' satisfies QuestError });
  });

  it('returns objective-not-found for unknown objectiveId', () => {
    const result = tracker.progressObjective(playerQuestId, 'ghost-obj');
    expect(result).toEqual({ success: false, error: 'objective-not-found' satisfies QuestError });
  });

  it('returns wrong-status on non-ACTIVE quest', () => {
    tracker.abandonQuest(playerQuestId);
    const result = tracker.progressObjective(playerQuestId, 'obj-1');
    expect(result).toEqual({ success: false, error: 'wrong-status' satisfies QuestError });
  });
});

describe('QuestTracker — failObjective', () => {
  let tracker: QuestTrackerSystem;
  let playerQuestId: string;

  beforeEach(() => {
    tracker = createQuestTrackerSystem(makeDeps());
    tracker.registerPlayer('player-1');
    tracker.defineQuest('q-1', 'Hunt', 'Desc', OBJECTIVES, 500n, null);
    const pq = tracker.acceptQuest('player-1', 'q-1');
    if (typeof pq === 'string') throw new Error('setup failed');
    playerQuestId = pq.playerQuestId;
  });

  it('fails a required objective and fails the quest', () => {
    const result = tracker.failObjective(playerQuestId, 'obj-1');
    expect(result).toEqual({ success: true, questFailed: true });
    expect(tracker.getPlayerQuest(playerQuestId)?.status).toBe('FAILED');
  });

  it('fails an optional objective without failing the quest', () => {
    const result = tracker.failObjective(playerQuestId, 'obj-2');
    expect(result).toEqual({ success: true, questFailed: false });
    expect(tracker.getPlayerQuest(playerQuestId)?.status).toBe('ACTIVE');
  });

  it('returns objective-not-found for unknown objectiveId', () => {
    const result = tracker.failObjective(playerQuestId, 'ghost');
    expect(result).toEqual({ success: false, error: 'objective-not-found' satisfies QuestError });
  });
});

describe('QuestTracker — abandonQuest', () => {
  let tracker: QuestTrackerSystem;
  let playerQuestId: string;

  beforeEach(() => {
    tracker = createQuestTrackerSystem(makeDeps());
    tracker.registerPlayer('player-1');
    tracker.defineQuest('q-1', 'Hunt', 'Desc', OBJECTIVES, 500n, null);
    const pq = tracker.acceptQuest('player-1', 'q-1');
    if (typeof pq === 'string') throw new Error('setup failed');
    playerQuestId = pq.playerQuestId;
  });

  it('abandons an ACTIVE quest', () => {
    expect(tracker.abandonQuest(playerQuestId)).toEqual({ success: true });
    expect(tracker.getPlayerQuest(playerQuestId)?.status).toBe('ABANDONED');
  });

  it('returns wrong-status on a non-ACTIVE quest', () => {
    tracker.progressObjective(playerQuestId, 'obj-1');
    const result = tracker.abandonQuest(playerQuestId);
    expect(result).toEqual({ success: false, error: 'wrong-status' satisfies QuestError });
  });

  it('returns quest-not-found for unknown playerQuestId', () => {
    const result = tracker.abandonQuest('ghost');
    expect(result).toEqual({ success: false, error: 'quest-not-found' satisfies QuestError });
  });
});

describe('QuestTracker — awardReward', () => {
  let tracker: QuestTrackerSystem;
  let playerQuestId: string;

  beforeEach(() => {
    tracker = createQuestTrackerSystem(makeDeps());
    tracker.registerPlayer('player-1');
    tracker.defineQuest('q-1', 'Hunt', 'Desc', OBJECTIVES, 500n, null);
    const pq = tracker.acceptQuest('player-1', 'q-1');
    if (typeof pq === 'string') throw new Error('setup failed');
    playerQuestId = pq.playerQuestId;
    tracker.progressObjective(playerQuestId, 'obj-1');
  });

  it('awards reward for a COMPLETED quest', () => {
    const result = tracker.awardReward(playerQuestId);
    expect(result).toMatchObject({ success: true });
    if (!result.success) return;
    expect(result.reward.kalonAmount).toBe(500n);
    expect(result.reward.playerId).toBe('player-1');
  });

  it('cannot award reward twice for the same quest', () => {
    tracker.awardReward(playerQuestId);
    const result = tracker.awardReward(playerQuestId);
    expect(result).toEqual({ success: false, error: 'wrong-status' satisfies QuestError });
  });

  it('returns wrong-status for non-COMPLETED quest', () => {
    tracker.registerPlayer('player-2');
    const pq2 = tracker.acceptQuest('player-2', 'q-1');
    if (typeof pq2 === 'string') return;
    const result = tracker.awardReward(pq2.playerQuestId);
    expect(result).toEqual({ success: false, error: 'wrong-status' satisfies QuestError });
  });

  it('adds kalonAmount to player totalKalonEarned', () => {
    tracker.awardReward(playerQuestId);
    const stats = tracker.getPlayerStats('player-1');
    expect(stats?.totalKalonEarned).toBe(500n);
  });
});

describe('QuestTracker — listPlayerQuests and getPlayerStats', () => {
  let tracker: QuestTrackerSystem;

  beforeEach(() => {
    tracker = createQuestTrackerSystem(makeDeps());
    tracker.registerPlayer('player-1');
    tracker.defineQuest('q-1', 'Q1', 'D1', OBJECTIVES, 100n, null);
    tracker.defineQuest('q-2', 'Q2', 'D2', OBJECTIVES, 200n, null);
  });

  it('listPlayerQuests returns all quests for a player', () => {
    tracker.acceptQuest('player-1', 'q-1');
    tracker.acceptQuest('player-1', 'q-2');
    expect(tracker.listPlayerQuests('player-1')).toHaveLength(2);
  });

  it('listPlayerQuests filters by status', () => {
    const pq1 = tracker.acceptQuest('player-1', 'q-1');
    if (typeof pq1 === 'string') return;
    tracker.abandonQuest(pq1.playerQuestId);
    tracker.acceptQuest('player-1', 'q-2');
    const active = tracker.listPlayerQuests('player-1', 'ACTIVE');
    expect(active).toHaveLength(1);
    expect(active[0]?.questId).toBe('q-2');
  });

  it('getPlayerStats returns undefined for unregistered player', () => {
    expect(tracker.getPlayerStats('ghost')).toBeUndefined();
  });

  it('getPlayerStats tracks accepted count', () => {
    tracker.acceptQuest('player-1', 'q-1');
    tracker.acceptQuest('player-1', 'q-2');
    const stats = tracker.getPlayerStats('player-1');
    expect(stats?.accepted).toBe(2);
  });

  it('getPlayerStats tracks abandoned count', () => {
    const pq = tracker.acceptQuest('player-1', 'q-1');
    if (typeof pq === 'string') return;
    tracker.abandonQuest(pq.playerQuestId);
    expect(tracker.getPlayerStats('player-1')?.abandoned).toBe(1);
  });

  it('getPlayerStats tracks failed count', () => {
    const pq = tracker.acceptQuest('player-1', 'q-1');
    if (typeof pq === 'string') return;
    tracker.failObjective(pq.playerQuestId, 'obj-1');
    expect(tracker.getPlayerStats('player-1')?.failed).toBe(1);
  });
});
