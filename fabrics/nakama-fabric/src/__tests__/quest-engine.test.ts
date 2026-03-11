import { describe, it, expect, beforeEach } from 'vitest';
import { createQuestEngine } from '../quest-engine.js';
import type { QuestEngineDeps, QuestEvent, QuestDefinition, QuestEngine } from '../quest-engine.js';

function makeDeps(): QuestEngineDeps & { readonly events: QuestEvent[] } {
  let time = 1_000_000;
  let idCounter = 0;
  const events: QuestEvent[] = [];
  return {
    clock: { nowMicroseconds: () => (time += 1_000_000) },
    idGenerator: {
      generate: () => {
        idCounter++;
        return 'qi-' + String(idCounter);
      },
    },
    notifications: {
      notify: (_dynastyId, event) => {
        events.push(event);
      },
    },
    events,
  };
}

function makeDef(overrides?: Partial<QuestDefinition>): QuestDefinition {
  return {
    id: 'quest-1',
    name: 'The First Voyage',
    description: 'Complete your first exploration mission',
    objectives: [{ id: 'obj-1', description: 'Visit a new world', requiredCount: 1 }],
    reward: { microKalon: 5000n, items: [], reputationPoints: 10 },
    prerequisiteQuestIds: [],
    timeLimitMicroseconds: null,
    repeatable: false,
    maxLevel: 1,
    ...overrides,
  };
}

let engine: QuestEngine;
let deps: QuestEngineDeps & { readonly events: QuestEvent[] };

beforeEach(() => {
  deps = makeDeps();
  engine = createQuestEngine(deps);
});

describe('QuestEngine -- definitions', () => {
  it('defines and retrieves a quest', () => {
    engine.defineQuest(makeDef());
    const fetched = engine.getDefinition('quest-1');
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe('The First Voyage');
  });

  it('returns undefined for unknown quest', () => {
    expect(engine.getDefinition('missing')).toBeUndefined();
  });

  it('rejects quest with no objectives', () => {
    expect(() => engine.defineQuest(makeDef({ objectives: [] }))).toThrow('at least one objective');
  });

  it('rejects objective with zero required count', () => {
    const def = makeDef({
      objectives: [{ id: 'o1', description: 'x', requiredCount: 0 }],
    });
    expect(() => engine.defineQuest(def)).toThrow('positive count');
  });
});

describe('QuestEngine -- availability', () => {
  it('lists available quests with no prerequisites', () => {
    engine.defineQuest(makeDef());
    const available = engine.listAvailable('d1');
    expect(available).toHaveLength(1);
  });

  it('hides quests with unmet prerequisites', () => {
    engine.defineQuest(makeDef({ id: 'prereq' }));
    engine.defineQuest(makeDef({ id: 'locked', prerequisiteQuestIds: ['prereq'] }));
    const available = engine.listAvailable('d1');
    expect(available).toHaveLength(1);
    expect(available[0]?.id).toBe('prereq');
  });

  it('shows quests after prerequisite completed', () => {
    engine.defineQuest(makeDef({ id: 'prereq' }));
    engine.defineQuest(makeDef({ id: 'next', prerequisiteQuestIds: ['prereq'] }));
    const inst = engine.acceptQuest('d1', 'prereq');
    engine.advanceObjective(inst.instanceId, 'obj-1', 1);
    const available = engine.listAvailable('d1');
    const ids = available.map((q) => q.id);
    expect(ids).toContain('next');
  });

  it('hides non-repeatable completed quests', () => {
    engine.defineQuest(makeDef({ repeatable: false }));
    const inst = engine.acceptQuest('d1', 'quest-1');
    engine.advanceObjective(inst.instanceId, 'obj-1', 1);
    const available = engine.listAvailable('d1');
    expect(available).toHaveLength(0);
  });

  it('shows repeatable quests up to maxLevel', () => {
    engine.defineQuest(makeDef({ repeatable: true, maxLevel: 2 }));
    const inst1 = engine.acceptQuest('d1', 'quest-1');
    engine.advanceObjective(inst1.instanceId, 'obj-1', 1);
    const available1 = engine.listAvailable('d1');
    expect(available1).toHaveLength(1);
    const inst2 = engine.acceptQuest('d1', 'quest-1');
    engine.advanceObjective(inst2.instanceId, 'obj-1', 1);
    const available2 = engine.listAvailable('d1');
    expect(available2).toHaveLength(0);
  });
});

describe('QuestEngine -- acceptance', () => {
  it('accepts a quest and creates an instance', () => {
    engine.defineQuest(makeDef());
    const inst = engine.acceptQuest('d1', 'quest-1');
    expect(inst.status).toBe('ACTIVE');
    expect(inst.questId).toBe('quest-1');
    expect(inst.dynastyId).toBe('d1');
    expect(inst.objectives).toHaveLength(1);
  });

  it('rejects acceptance of non-repeatable completed quest', () => {
    engine.defineQuest(makeDef());
    const inst = engine.acceptQuest('d1', 'quest-1');
    engine.advanceObjective(inst.instanceId, 'obj-1', 1);
    expect(() => engine.acceptQuest('d1', 'quest-1')).toThrow('already completed');
  });

  it('rejects acceptance with unmet prerequisites', () => {
    engine.defineQuest(makeDef({ id: 'prereq' }));
    engine.defineQuest(makeDef({ id: 'locked', prerequisiteQuestIds: ['prereq'] }));
    expect(() => engine.acceptQuest('d1', 'locked')).toThrow('Prerequisites not met');
  });

  it('creates time-limited quest with expiration', () => {
    engine.defineQuest(makeDef({ timeLimitMicroseconds: 60_000_000 }));
    const inst = engine.acceptQuest('d1', 'quest-1');
    expect(inst.expiresAt).toBeGreaterThan(0);
  });

  it('throws for unknown quest id', () => {
    expect(() => engine.acceptQuest('d1', 'missing')).toThrow('not found');
  });
});

describe('QuestEngine -- objective progression', () => {
  it('advances an objective', () => {
    engine.defineQuest(makeDef({ objectives: [{ id: 'o1', description: 'x', requiredCount: 5 }] }));
    const inst = engine.acceptQuest('d1', 'quest-1');
    const updated = engine.advanceObjective(inst.instanceId, 'o1', 3);
    expect(updated.objectives[0]?.currentCount).toBe(3);
    expect(updated.objectives[0]?.completed).toBe(false);
  });

  it('completes an objective when threshold met', () => {
    engine.defineQuest(makeDef());
    const inst = engine.acceptQuest('d1', 'quest-1');
    const updated = engine.advanceObjective(inst.instanceId, 'obj-1', 1);
    expect(updated.objectives[0]?.completed).toBe(true);
  });

  it('caps objective count at required count', () => {
    engine.defineQuest(makeDef({ objectives: [{ id: 'o1', description: 'x', requiredCount: 3 }] }));
    const inst = engine.acceptQuest('d1', 'quest-1');
    const updated = engine.advanceObjective(inst.instanceId, 'o1', 100);
    expect(updated.objectives[0]?.currentCount).toBe(3);
  });

  it('completes quest when all objectives done', () => {
    const def = makeDef({
      objectives: [
        { id: 'o1', description: 'a', requiredCount: 1 },
        { id: 'o2', description: 'b', requiredCount: 1 },
      ],
    });
    engine.defineQuest(def);
    const inst = engine.acceptQuest('d1', 'quest-1');
    engine.advanceObjective(inst.instanceId, 'o1', 1);
    const updated = engine.advanceObjective(inst.instanceId, 'o2', 1);
    expect(updated.status).toBe('COMPLETED');
    expect(updated.completedAt).toBeGreaterThan(0);
  });

  it('rejects negative advance amount', () => {
    engine.defineQuest(makeDef());
    const inst = engine.acceptQuest('d1', 'quest-1');
    expect(() => engine.advanceObjective(inst.instanceId, 'obj-1', -1)).toThrow('must be positive');
  });

  it('throws for unknown objective', () => {
    engine.defineQuest(makeDef());
    const inst = engine.acceptQuest('d1', 'quest-1');
    expect(() => engine.advanceObjective(inst.instanceId, 'missing', 1)).toThrow('not found');
  });

  it('throws when advancing non-active quest', () => {
    engine.defineQuest(makeDef());
    const inst = engine.acceptQuest('d1', 'quest-1');
    engine.abandonQuest(inst.instanceId);
    expect(() => engine.advanceObjective(inst.instanceId, 'obj-1', 1)).toThrow('not active');
  });
});

describe('QuestEngine -- abandonment and expiration', () => {
  it('abandons an active quest', () => {
    engine.defineQuest(makeDef());
    const inst = engine.acceptQuest('d1', 'quest-1');
    const abandoned = engine.abandonQuest(inst.instanceId);
    expect(abandoned.status).toBe('FAILED');
  });

  it('rejects abandoning non-active quest', () => {
    engine.defineQuest(makeDef());
    const inst = engine.acceptQuest('d1', 'quest-1');
    engine.advanceObjective(inst.instanceId, 'obj-1', 1);
    expect(() => engine.abandonQuest(inst.instanceId)).toThrow('active quests');
  });

  it('expires a timed-out quest', () => {
    let time = 1_000_000;
    const customDeps: QuestEngineDeps & { readonly events: QuestEvent[] } = {
      clock: { nowMicroseconds: () => (time += 100_000_000) },
      idGenerator: { generate: () => 'qi-exp' },
      notifications: { notify: () => {} },
      events: [],
    };
    const customEngine = createQuestEngine(customDeps);
    customEngine.defineQuest(makeDef({ timeLimitMicroseconds: 10_000_000 }));
    const inst = customEngine.acceptQuest('d1', 'quest-1');
    const checked = customEngine.checkExpiration(inst.instanceId);
    expect(checked.status).toBe('FAILED');
  });

  it('does not expire a quest before its time', () => {
    engine.defineQuest(makeDef({ timeLimitMicroseconds: 999_999_999_999 }));
    const inst = engine.acceptQuest('d1', 'quest-1');
    const checked = engine.checkExpiration(inst.instanceId);
    expect(checked.status).toBe('ACTIVE');
  });
});

describe('QuestEngine -- rewards', () => {
  it('claims reward for completed quest', () => {
    engine.defineQuest(
      makeDef({
        reward: {
          microKalon: 9999n,
          items: [{ itemId: 'sword', quantity: 1 }],
          reputationPoints: 5,
        },
      }),
    );
    const inst = engine.acceptQuest('d1', 'quest-1');
    engine.advanceObjective(inst.instanceId, 'obj-1', 1);
    const reward = engine.claimReward(inst.instanceId);
    expect(reward.microKalon).toBe(9999n);
    expect(reward.items).toHaveLength(1);
    expect(reward.reputationPoints).toBe(5);
  });

  it('rejects double claim', () => {
    engine.defineQuest(makeDef());
    const inst = engine.acceptQuest('d1', 'quest-1');
    engine.advanceObjective(inst.instanceId, 'obj-1', 1);
    engine.claimReward(inst.instanceId);
    expect(() => engine.claimReward(inst.instanceId)).toThrow('already claimed');
  });

  it('rejects claim for incomplete quest', () => {
    engine.defineQuest(
      makeDef({ objectives: [{ id: 'o1', description: 'x', requiredCount: 99 }] }),
    );
    const inst = engine.acceptQuest('d1', 'quest-1');
    expect(() => engine.claimReward(inst.instanceId)).toThrow('not completed');
  });
});

describe('QuestEngine -- notifications', () => {
  it('emits QUEST_ACCEPTED on accept', () => {
    engine.defineQuest(makeDef());
    engine.acceptQuest('d1', 'quest-1');
    const accepted = deps.events.filter((e) => e.kind === 'QUEST_ACCEPTED');
    expect(accepted).toHaveLength(1);
  });

  it('emits OBJECTIVE_COMPLETED when objective done', () => {
    engine.defineQuest(makeDef());
    const inst = engine.acceptQuest('d1', 'quest-1');
    engine.advanceObjective(inst.instanceId, 'obj-1', 1);
    const objComplete = deps.events.filter((e) => e.kind === 'OBJECTIVE_COMPLETED');
    expect(objComplete).toHaveLength(1);
  });

  it('emits QUEST_COMPLETED when all objectives done', () => {
    engine.defineQuest(makeDef());
    const inst = engine.acceptQuest('d1', 'quest-1');
    engine.advanceObjective(inst.instanceId, 'obj-1', 1);
    const questComplete = deps.events.filter((e) => e.kind === 'QUEST_COMPLETED');
    expect(questComplete).toHaveLength(1);
  });
});

describe('QuestEngine -- queries', () => {
  it('retrieves quest instance by id', () => {
    engine.defineQuest(makeDef());
    const inst = engine.acceptQuest('d1', 'quest-1');
    const fetched = engine.getInstance(inst.instanceId);
    expect(fetched).toBeDefined();
    expect(fetched?.questId).toBe('quest-1');
  });

  it('returns undefined for unknown instance', () => {
    expect(engine.getInstance('nonexistent')).toBeUndefined();
  });

  it('lists active quests by dynasty', () => {
    engine.defineQuest(makeDef({ id: 'q1' }));
    engine.defineQuest(makeDef({ id: 'q2' }));
    engine.acceptQuest('d1', 'q1');
    engine.acceptQuest('d1', 'q2');
    const active = engine.listActiveByDynasty('d1');
    expect(active).toHaveLength(2);
  });

  it('returns empty for dynasty with no quests', () => {
    expect(engine.listActiveByDynasty('nobody')).toHaveLength(0);
  });

  it('builds quest journal', () => {
    engine.defineQuest(makeDef({ id: 'q1' }));
    engine.defineQuest(makeDef({ id: 'q2' }));
    const inst1 = engine.acceptQuest('d1', 'q1');
    engine.advanceObjective(inst1.instanceId, 'obj-1', 1);
    engine.claimReward(inst1.instanceId);
    engine.acceptQuest('d1', 'q2');
    const journal = engine.getJournal('d1');
    expect(journal.activeQuests).toHaveLength(1);
    expect(journal.completedQuests).toHaveLength(1);
    expect(journal.totalCompleted).toBe(1);
    expect(journal.totalRewardsClaimed).toBe(5000n);
  });
});

describe('QuestEngine -- stats', () => {
  it('starts with zero stats', () => {
    const stats = engine.getStats();
    expect(stats.totalDefinitions).toBe(0);
    expect(stats.totalActiveInstances).toBe(0);
    expect(stats.totalCompleted).toBe(0);
    expect(stats.totalFailed).toBe(0);
    expect(stats.totalRewardsDistributed).toBe(0n);
  });

  it('tracks aggregate statistics', () => {
    engine.defineQuest(makeDef({ id: 'q1' }));
    engine.defineQuest(makeDef({ id: 'q2' }));
    const inst1 = engine.acceptQuest('d1', 'q1');
    engine.advanceObjective(inst1.instanceId, 'obj-1', 1);
    engine.claimReward(inst1.instanceId);
    const inst2 = engine.acceptQuest('d1', 'q2');
    engine.abandonQuest(inst2.instanceId);
    const stats = engine.getStats();
    expect(stats.totalDefinitions).toBe(2);
    expect(stats.totalCompleted).toBe(1);
    expect(stats.totalFailed).toBe(1);
    expect(stats.totalRewardsDistributed).toBe(5000n);
  });
});
