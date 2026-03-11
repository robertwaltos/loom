import { describe, it, expect, beforeEach } from 'vitest';
import {
  createQuestGiverEngine,
  DEFAULT_POOL_CONFIG,
  DIFFICULTY_MULTIPLIERS,
} from '../npc-quest-giver.js';
import type {
  QuestGiverEngine,
  QuestGiverDeps,
  QuestPoolConfig,
  CreateQuestParams,
  WorldStateHint,
} from '../npc-quest-giver.js';

function createDeps(): QuestGiverDeps {
  let time = 1000;
  let id = 0;
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: { generate: () => 'qg-' + String(id++) },
  };
}

function makeQuestParams(overrides: Partial<CreateQuestParams> = {}): CreateQuestParams {
  return {
    title: 'Slay the Dragon',
    description: 'Defeat the dragon in the cave',
    giverId: 'npc-1',
    category: 'combat',
    difficulty: 'normal',
    rewards: [{ rewardType: 'kalon', amount: 100 }],
    objectives: [
      {
        objectiveId: 'obj-1',
        description: 'Defeat dragon',
        targetCount: 1,
        currentCount: 0,
        completed: false,
      },
    ],
    requiredReputation: 0,
    expiresAt: null,
    ...overrides,
  };
}

describe('QuestGiverEngine — quest creation', () => {
  let engine: QuestGiverEngine;

  beforeEach(() => {
    engine = createQuestGiverEngine(createDeps());
  });

  it('creates a quest', () => {
    const quest = engine.createQuest(makeQuestParams());
    expect(quest.questId).toBe('qg-0');
    expect(quest.title).toBe('Slay the Dragon');
    expect(quest.status).toBe('available');
    expect(quest.chainId).toBeNull();
  });

  it('retrieves a quest by id', () => {
    const quest = engine.createQuest(makeQuestParams());
    const retrieved = engine.getQuest(quest.questId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.title).toBe('Slay the Dragon');
  });

  it('returns undefined for unknown quest', () => {
    expect(engine.getQuest('ghost')).toBeUndefined();
  });

  it('removes a quest', () => {
    const quest = engine.createQuest(makeQuestParams());
    expect(engine.removeQuest(quest.questId)).toBe(true);
    expect(engine.getQuest(quest.questId)).toBeUndefined();
  });

  it('lists quests by giver', () => {
    engine.createQuest(makeQuestParams({ giverId: 'npc-1' }));
    engine.createQuest(makeQuestParams({ giverId: 'npc-1', title: 'Gather Herbs' }));
    engine.createQuest(makeQuestParams({ giverId: 'npc-2' }));
    expect(engine.getQuestsByGiver('npc-1')).toHaveLength(2);
  });
});

describe('QuestGiverEngine — quest availability', () => {
  let engine: QuestGiverEngine;

  beforeEach(() => {
    engine = createQuestGiverEngine(createDeps());
  });

  it('returns available quests for sufficient reputation', () => {
    engine.createQuest(makeQuestParams({ requiredReputation: 10 }));
    engine.createQuest(makeQuestParams({ requiredReputation: 50 }));
    const available = engine.getAvailableQuests('npc-1', 30);
    expect(available).toHaveLength(1);
  });

  it('returns all available quests for high reputation', () => {
    engine.createQuest(makeQuestParams({ requiredReputation: 10 }));
    engine.createQuest(makeQuestParams({ requiredReputation: 50 }));
    expect(engine.getAvailableQuests('npc-1', 100)).toHaveLength(2);
  });

  it('returns no quests when reputation too low', () => {
    engine.createQuest(makeQuestParams({ requiredReputation: 50 }));
    expect(engine.getAvailableQuests('npc-1', 10)).toHaveLength(0);
  });

  it('excludes non-available quests', () => {
    const quest = engine.createQuest(makeQuestParams());
    engine.acceptQuest(quest.questId, 'player-1');
    expect(engine.getAvailableQuests('npc-1', 100)).toHaveLength(0);
  });
});

describe('QuestGiverEngine — quest acceptance', () => {
  let engine: QuestGiverEngine;

  beforeEach(() => {
    engine = createQuestGiverEngine(createDeps());
  });

  it('accepts a quest', () => {
    const quest = engine.createQuest(makeQuestParams());
    const result = engine.acceptQuest(quest.questId, 'player-1');
    expect(result.success).toBe(true);
    expect(result.quest?.status).toBe('active');
  });

  it('fails to accept non-existent quest', () => {
    const result = engine.acceptQuest('ghost', 'player-1');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('quest not found');
  });

  it('fails to accept already-active quest', () => {
    const quest = engine.createQuest(makeQuestParams());
    engine.acceptQuest(quest.questId, 'player-1');
    const result = engine.acceptQuest(quest.questId, 'player-2');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('quest not available');
  });

  it('limits active quests per player', () => {
    const config: QuestPoolConfig = {
      maxQuestsPerGiver: 10,
      maxActiveQuestsPerPlayer: 2,
      baseRewardMultiplier: 1.0,
    };
    const limitedEngine = createQuestGiverEngine(createDeps(), config);
    const q1 = limitedEngine.createQuest(makeQuestParams({ title: 'Q1' }));
    const q2 = limitedEngine.createQuest(makeQuestParams({ title: 'Q2' }));
    const q3 = limitedEngine.createQuest(makeQuestParams({ title: 'Q3' }));
    limitedEngine.acceptQuest(q1.questId, 'player-1');
    limitedEngine.acceptQuest(q2.questId, 'player-1');
    const result = limitedEngine.acceptQuest(q3.questId, 'player-1');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('too many active quests');
  });

  it('lists active quests for a player', () => {
    const q1 = engine.createQuest(makeQuestParams({ title: 'Q1' }));
    const q2 = engine.createQuest(makeQuestParams({ title: 'Q2' }));
    engine.acceptQuest(q1.questId, 'player-1');
    engine.acceptQuest(q2.questId, 'player-1');
    expect(engine.getActiveQuests('player-1')).toHaveLength(2);
  });
});

describe('QuestGiverEngine — quest progression', () => {
  let engine: QuestGiverEngine;

  beforeEach(() => {
    engine = createQuestGiverEngine(createDeps());
  });

  it('progresses an objective', () => {
    const quest = engine.createQuest(
      makeQuestParams({
        objectives: [
          {
            objectiveId: 'obj-1',
            description: 'Kill goblins',
            targetCount: 5,
            currentCount: 0,
            completed: false,
          },
        ],
      }),
    );
    engine.acceptQuest(quest.questId, 'player-1');
    const result = engine.progressObjective(quest.questId, 'obj-1', 3);
    expect(result?.completed).toBe(false);
    expect(result?.questCompleted).toBe(false);
  });

  it('completes an objective at target count', () => {
    const quest = engine.createQuest(
      makeQuestParams({
        objectives: [
          {
            objectiveId: 'obj-1',
            description: 'Kill goblins',
            targetCount: 5,
            currentCount: 0,
            completed: false,
          },
        ],
      }),
    );
    engine.acceptQuest(quest.questId, 'player-1');
    const result = engine.progressObjective(quest.questId, 'obj-1', 5);
    expect(result?.completed).toBe(true);
    expect(result?.questCompleted).toBe(true);
  });

  it('caps progress at target count', () => {
    const quest = engine.createQuest(
      makeQuestParams({
        objectives: [
          {
            objectiveId: 'obj-1',
            description: 'Collect herbs',
            targetCount: 10,
            currentCount: 0,
            completed: false,
          },
        ],
      }),
    );
    engine.acceptQuest(quest.questId, 'player-1');
    engine.progressObjective(quest.questId, 'obj-1', 100);
    const q = engine.getQuest(quest.questId);
    expect(q?.objectives[0]?.currentCount).toBe(10);
  });

  it('returns undefined for inactive quest', () => {
    const quest = engine.createQuest(makeQuestParams());
    expect(engine.progressObjective(quest.questId, 'obj-1', 1)).toBeUndefined();
  });
});

describe('QuestGiverEngine — quest completion and failure', () => {
  let engine: QuestGiverEngine;

  beforeEach(() => {
    engine = createQuestGiverEngine(createDeps());
  });

  it('completes an active quest', () => {
    const quest = engine.createQuest(makeQuestParams());
    engine.acceptQuest(quest.questId, 'player-1');
    expect(engine.completeQuest(quest.questId)).toBe(true);
    expect(engine.getQuest(quest.questId)?.status).toBe('completed');
  });

  it('fails to complete non-active quest', () => {
    const quest = engine.createQuest(makeQuestParams());
    expect(engine.completeQuest(quest.questId)).toBe(false);
  });

  it('fails an active quest', () => {
    const quest = engine.createQuest(makeQuestParams());
    engine.acceptQuest(quest.questId, 'player-1');
    expect(engine.failQuest(quest.questId)).toBe(true);
    expect(engine.getQuest(quest.questId)?.status).toBe('failed');
  });

  it('removes quest from player active list on completion', () => {
    const quest = engine.createQuest(makeQuestParams());
    engine.acceptQuest(quest.questId, 'player-1');
    engine.completeQuest(quest.questId);
    expect(engine.getActiveQuests('player-1')).toHaveLength(0);
  });
});

describe('QuestGiverEngine — quest expiration', () => {
  it('expires quests past their expiration time', () => {
    let time = 1000;
    const deps: QuestGiverDeps = {
      clock: { nowMicroseconds: () => time },
      idGenerator: { generate: () => 'qg-' + String(time++) },
    };
    const engine = createQuestGiverEngine(deps);
    engine.createQuest(makeQuestParams({ expiresAt: 2000 }));
    engine.createQuest(makeQuestParams({ expiresAt: 5000 }));
    time = 3000;
    const expired = engine.expireQuests();
    expect(expired).toBe(1);
  });

  it('does not expire quests without expiration', () => {
    let time = 1000;
    const deps: QuestGiverDeps = {
      clock: { nowMicroseconds: () => time },
      idGenerator: { generate: () => 'qg-' + String(time++) },
    };
    const engine = createQuestGiverEngine(deps);
    engine.createQuest(makeQuestParams({ expiresAt: null }));
    time = 999999;
    expect(engine.expireQuests()).toBe(0);
  });
});

describe('QuestGiverEngine — quest chains', () => {
  let engine: QuestGiverEngine;

  beforeEach(() => {
    engine = createQuestGiverEngine(createDeps());
  });

  it('creates a quest chain', () => {
    const q1 = engine.createQuest(makeQuestParams({ title: 'Part 1' }));
    const q2 = engine.createQuest(makeQuestParams({ title: 'Part 2' }));
    const chain = engine.createChain('Dragon Saga', [q1.questId, q2.questId]);
    expect(chain).toBeDefined();
    expect(chain?.name).toBe('Dragon Saga');
    expect(chain?.questIds).toHaveLength(2);
  });

  it('returns undefined for chain with invalid quest', () => {
    const q1 = engine.createQuest(makeQuestParams());
    const chain = engine.createChain('Invalid', [q1.questId, 'ghost']);
    expect(chain).toBeUndefined();
  });

  it('gets next quest in chain', () => {
    const q1 = engine.createQuest(makeQuestParams({ title: 'Part 1' }));
    const q2 = engine.createQuest(makeQuestParams({ title: 'Part 2' }));
    const chain = engine.createChain('Saga', [q1.questId, q2.questId]);
    expect(chain).toBeDefined();
    const next = engine.getNextInChain(chain?.chainId ?? '', 0);
    expect(next?.title).toBe('Part 2');
  });

  it('returns undefined at end of chain', () => {
    const q1 = engine.createQuest(makeQuestParams());
    const chain = engine.createChain('Short', [q1.questId]);
    expect(chain).toBeDefined();
    expect(engine.getNextInChain(chain?.chainId ?? '', 0)).toBeUndefined();
  });
});

describe('QuestGiverEngine — world state generation', () => {
  let engine: QuestGiverEngine;

  beforeEach(() => {
    engine = createQuestGiverEngine(createDeps());
  });

  it('generates quests from world state hints', () => {
    const hints: readonly WorldStateHint[] = [
      { hintType: 'threat', location: 'cave', severity: 7, resourceType: null },
      { hintType: 'shortage', location: 'farm', severity: 3, resourceType: 'wheat' },
    ];
    const batch = engine.generateFromWorldState('npc-1', hints);
    expect(batch.quests).toHaveLength(2);
    expect(batch.generatedFrom).toBe('world_state');
  });

  it('assigns correct category from hint type', () => {
    const hints: readonly WorldStateHint[] = [
      { hintType: 'threat', location: 'cave', severity: 5, resourceType: null },
    ];
    const batch = engine.generateFromWorldState('npc-1', hints);
    expect(batch.quests[0]?.category).toBe('combat');
  });

  it('assigns difficulty from severity', () => {
    const hints: readonly WorldStateHint[] = [
      { hintType: 'discovery', location: 'ruins', severity: 9, resourceType: null },
    ];
    const batch = engine.generateFromWorldState('npc-1', hints);
    expect(batch.quests[0]?.difficulty).toBe('legendary');
  });

  it('scales rewards by difficulty', () => {
    const trivialReward = engine.calculateScaledReward(100, 'trivial');
    const legendaryReward = engine.calculateScaledReward(100, 'legendary');
    expect(legendaryReward).toBeGreaterThan(trivialReward);
  });
});

describe('QuestGiverEngine — stats and constants', () => {
  it('reports quest statistics', () => {
    const engine = createQuestGiverEngine(createDeps());
    const q1 = engine.createQuest(makeQuestParams({ difficulty: 'hard' }));
    engine.createQuest(makeQuestParams({ difficulty: 'easy' }));
    engine.acceptQuest(q1.questId, 'player-1');
    const stats = engine.getStats();
    expect(stats.totalQuests).toBe(2);
    expect(stats.questsByStatus.active).toBe(1);
    expect(stats.questsByStatus.available).toBe(1);
    expect(stats.questsByDifficulty.hard).toBe(1);
    expect(stats.questsByDifficulty.easy).toBe(1);
  });

  it('exports default pool config', () => {
    expect(DEFAULT_POOL_CONFIG.maxQuestsPerGiver).toBe(10);
    expect(DEFAULT_POOL_CONFIG.maxActiveQuestsPerPlayer).toBe(5);
    expect(DEFAULT_POOL_CONFIG.baseRewardMultiplier).toBe(1.0);
  });

  it('exports difficulty multipliers', () => {
    expect(DIFFICULTY_MULTIPLIERS.trivial).toBe(0.5);
    expect(DIFFICULTY_MULTIPLIERS.legendary).toBe(3.0);
  });
});
