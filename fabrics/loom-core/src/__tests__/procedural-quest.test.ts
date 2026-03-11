import { describe, it, expect, beforeEach } from 'vitest';
import {
  createProceduralQuestModule,
  type QuestDeps,
  type QuestTemplate,
  type QuestTrigger,
  type QuestDifficulty,
} from '../procedural-quest.js';

function createMockDeps(): QuestDeps {
  let counter = 0;
  let now = 1000000000n;

  return {
    clock: {
      nowMicroseconds: () => now,
    },
    idGen: {
      generate: () => {
        counter = counter + 1;
        return 'quest-' + String(counter);
      },
    },
    logger: {
      info: () => {},
      warn: () => {},
    },
  };
}

function createTestTemplate(
  id: string,
  difficulty: QuestDifficulty,
  triggerType: QuestTrigger['type'],
): QuestTemplate {
  return {
    templateId: id,
    name: 'Test Quest ' + id,
    description: 'A test quest',
    triggerType,
    difficulty,
    prerequisites: [],
    baseReward: {
      kalonAmount: 100000000n,
      experiencePoints: 100,
      items: [],
      reputationGain: 10,
    },
    estimatedDurationMinutes: 60,
    maxActiveInstances: 10,
  };
}

describe('ProceduralQuestModule', () => {
  let deps: QuestDeps;

  beforeEach(() => {
    deps = createMockDeps();
  });

  describe('registerTemplate', () => {
    it('should register a new template', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY');

      const result = module.registerTemplate(template);

      expect(result).toBe('tmpl-1');
    });

    it('should reject duplicate template ID', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY');

      module.registerTemplate(template);
      const result = module.registerTemplate(template);

      expect(result).toEqual({ error: 'TEMPLATE_ALREADY_EXISTS' });
    });

    it('should reject template with empty name', () => {
      const module = createProceduralQuestModule(deps);
      const template: QuestTemplate = {
        ...createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY'),
        name: '',
      };

      const result = module.registerTemplate(template);

      expect(result).toEqual({ error: 'TEMPLATE_NAME_EMPTY' });
    });

    it('should initialize template instance count to zero', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY');

      module.registerTemplate(template);
      const stats = module.getTemplateStats();

      expect(stats['tmpl-1']).toBe(0);
    });
  });

  describe('generateQuest', () => {
    it('should generate quest from matching template', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY');
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      const result = module.generateQuest(trigger);

      expect(result).not.toHaveProperty('error');
      if ('error' in result) {
        return;
      }

      expect(result.templateId).toBe('tmpl-1');
      expect(result.worldId).toBe('world-1');
      expect(result.status).toBe('ACTIVE');
    });

    it('should return error when no matching template', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY');
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'FACTION_CONFLICT',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      const result = module.generateQuest(trigger);

      expect(result).toEqual({ error: 'NO_MATCHING_TEMPLATE' });
    });

    it('should respect max active instances limit', () => {
      const module = createProceduralQuestModule(deps);
      const template: QuestTemplate = {
        ...createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY'),
        maxActiveInstances: 2,
      };
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      const q1 = module.generateQuest(trigger);
      const q2 = module.generateQuest(trigger);
      const q3 = module.generateQuest(trigger);

      expect(q1).not.toHaveProperty('error');
      expect(q2).not.toHaveProperty('error');
      expect(q3).toEqual({ error: 'MAX_INSTANCES_REACHED' });
    });

    it('should scale TRIVIAL reward by 1x', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'TRIVIAL', 'LOW_INTEGRITY');
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.1,
        metadata: {},
      };

      const result = module.generateQuest(trigger);

      if ('error' in result) {
        throw new Error('Unexpected error');
      }

      expect(result.reward.kalonAmount).toBe(100000000n);
      expect(result.reward.experiencePoints).toBe(100);
    });

    it('should scale EASY reward by 2x', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY');
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.3,
        metadata: {},
      };

      const result = module.generateQuest(trigger);

      if ('error' in result) {
        throw new Error('Unexpected error');
      }

      expect(result.reward.kalonAmount).toBe(200000000n);
      expect(result.reward.experiencePoints).toBe(200);
    });

    it('should scale MODERATE reward by 4x', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'MODERATE', 'LOW_INTEGRITY');
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      const result = module.generateQuest(trigger);

      if ('error' in result) {
        throw new Error('Unexpected error');
      }

      expect(result.reward.kalonAmount).toBe(400000000n);
      expect(result.reward.experiencePoints).toBe(400);
    });

    it('should scale HARD reward by 8x', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'HARD', 'LOW_INTEGRITY');
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.7,
        metadata: {},
      };

      const result = module.generateQuest(trigger);

      if ('error' in result) {
        throw new Error('Unexpected error');
      }

      expect(result.reward.kalonAmount).toBe(800000000n);
      expect(result.reward.experiencePoints).toBe(800);
    });

    it('should scale LEGENDARY reward by 16x', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'LEGENDARY', 'LOW_INTEGRITY');
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.9,
        metadata: {},
      };

      const result = module.generateQuest(trigger);

      if ('error' in result) {
        throw new Error('Unexpected error');
      }

      expect(result.reward.kalonAmount).toBe(1600000000n);
      expect(result.reward.experiencePoints).toBe(1600);
    });

    it('should set expiration based on duration', () => {
      const module = createProceduralQuestModule(deps);
      const template: QuestTemplate = {
        ...createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY'),
        estimatedDurationMinutes: 120,
      };
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      const result = module.generateQuest(trigger);

      if ('error' in result) {
        throw new Error('Unexpected error');
      }

      const expectedExpiry = 1000000000n + 120n * 60n * 1000000n;
      expect(result.expiresAtMicros).toBe(expectedExpiry);
    });
  });

  describe('activateQuest', () => {
    it('should assign quest to dynasty', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY');
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      const quest = module.generateQuest(trigger);

      if ('error' in quest) {
        throw new Error('Unexpected error');
      }

      const result = module.activateQuest(quest.questId, 'dynasty-1');

      expect(result).toBe(quest.questId);
    });

    it('should return error for non-existent quest', () => {
      const module = createProceduralQuestModule(deps);

      const result = module.activateQuest('invalid-id', 'dynasty-1');

      expect(result).toEqual({ error: 'QUEST_NOT_FOUND' });
    });

    it('should reject already assigned quest', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY');
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      const quest = module.generateQuest(trigger);

      if ('error' in quest) {
        throw new Error('Unexpected error');
      }

      module.activateQuest(quest.questId, 'dynasty-1');
      const result = module.activateQuest(quest.questId, 'dynasty-2');

      expect(result).toEqual({ error: 'QUEST_ALREADY_ASSIGNED' });
    });

    it('should add quest to dynasty active quests', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY');
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      const quest = module.generateQuest(trigger);

      if ('error' in quest) {
        throw new Error('Unexpected error');
      }

      module.activateQuest(quest.questId, 'dynasty-1');

      const activeQuests = module.getActiveQuests('dynasty-1');

      expect(activeQuests).toHaveLength(1);
      expect(activeQuests[0]?.questId).toBe(quest.questId);
    });
  });

  describe('completeQuest', () => {
    it('should complete quest and return reward', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY');
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      const quest = module.generateQuest(trigger);

      if ('error' in quest) {
        throw new Error('Unexpected error');
      }

      const result = module.completeQuest(quest.questId);

      expect(result).not.toHaveProperty('error');
      if ('error' in result) {
        return;
      }

      expect(result.kalonAmount).toBe(200000000n);
    });

    it('should return error for non-existent quest', () => {
      const module = createProceduralQuestModule(deps);

      const result = module.completeQuest('invalid-id');

      expect(result).toEqual({ error: 'QUEST_NOT_FOUND' });
    });

    it('should decrement template instance count', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY');
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      const quest = module.generateQuest(trigger);

      if ('error' in quest) {
        throw new Error('Unexpected error');
      }

      const statsBefore = module.getTemplateStats();
      expect(statsBefore['tmpl-1']).toBe(1);

      module.completeQuest(quest.questId);

      const statsAfter = module.getTemplateStats();
      expect(statsAfter['tmpl-1']).toBe(0);
    });

    it('should remove quest from dynasty active quests', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY');
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      const quest = module.generateQuest(trigger);

      if ('error' in quest) {
        throw new Error('Unexpected error');
      }

      module.activateQuest(quest.questId, 'dynasty-1');
      module.completeQuest(quest.questId);

      const activeQuests = module.getActiveQuests('dynasty-1');

      expect(activeQuests).toHaveLength(0);
    });
  });

  describe('failQuest', () => {
    it('should mark quest as failed', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY');
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      const quest = module.generateQuest(trigger);

      if ('error' in quest) {
        throw new Error('Unexpected error');
      }

      const result = module.failQuest(quest.questId, 'timeout');

      expect(result).toBe(quest.questId);
    });

    it('should decrement template instance count', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY');
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      const quest = module.generateQuest(trigger);

      if ('error' in quest) {
        throw new Error('Unexpected error');
      }

      module.failQuest(quest.questId, 'timeout');

      const stats = module.getTemplateStats();
      expect(stats['tmpl-1']).toBe(0);
    });

    it('should remove quest from dynasty active quests', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY');
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      const quest = module.generateQuest(trigger);

      if ('error' in quest) {
        throw new Error('Unexpected error');
      }

      module.activateQuest(quest.questId, 'dynasty-1');
      module.failQuest(quest.questId, 'timeout');

      const activeQuests = module.getActiveQuests('dynasty-1');

      expect(activeQuests).toHaveLength(0);
    });
  });

  describe('getActiveQuests', () => {
    it('should return empty array for dynasty with no quests', () => {
      const module = createProceduralQuestModule(deps);

      const result = module.getActiveQuests('dynasty-1');

      expect(result).toEqual([]);
    });

    it('should return all active quests for dynasty', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY');
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      const q1 = module.generateQuest(trigger);
      const q2 = module.generateQuest(trigger);

      if ('error' in q1 || 'error' in q2) {
        throw new Error('Unexpected error');
      }

      module.activateQuest(q1.questId, 'dynasty-1');
      module.activateQuest(q2.questId, 'dynasty-1');

      const activeQuests = module.getActiveQuests('dynasty-1');

      expect(activeQuests).toHaveLength(2);
    });
  });

  describe('createChain', () => {
    it('should create quest chain', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY');
      module.registerTemplate(template);

      const result = module.createChain('Epic Chain', ['tmpl-1']);

      expect(result).not.toHaveProperty('error');
    });

    it('should reject empty chain', () => {
      const module = createProceduralQuestModule(deps);

      const result = module.createChain('Empty Chain', []);

      expect(result).toEqual({ error: 'EMPTY_CHAIN' });
    });

    it('should reject chain with invalid template', () => {
      const module = createProceduralQuestModule(deps);

      const result = module.createChain('Invalid Chain', ['invalid-tmpl']);

      expect(result).toEqual({ error: 'TEMPLATE_NOT_FOUND' });
    });
  });

  describe('getQuestChain', () => {
    it('should return quest chain', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY');
      module.registerTemplate(template);

      const chainId = module.createChain('Test Chain', ['tmpl-1']);

      if (typeof chainId !== 'string') {
        throw new Error('Unexpected error');
      }

      const result = module.getQuestChain(chainId);

      expect(result).not.toHaveProperty('error');
      if ('error' in result) {
        return;
      }

      expect(result.name).toBe('Test Chain');
    });

    it('should return error for non-existent chain', () => {
      const module = createProceduralQuestModule(deps);

      const result = module.getQuestChain('invalid-id');

      expect(result).toEqual({ error: 'CHAIN_NOT_FOUND' });
    });
  });

  describe('expireOldQuests', () => {
    it('should expire quests past their expiration time', () => {
      const deps = createMockDeps();
      const module = createProceduralQuestModule(deps);
      const template: QuestTemplate = {
        ...createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY'),
        estimatedDurationMinutes: 1,
      };
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      module.generateQuest(trigger);

      (deps.clock as { nowMicroseconds: () => bigint }).nowMicroseconds = () =>
        1000000000n + 2n * 60n * 1000000n;

      const expiredCount = module.expireOldQuests();

      expect(expiredCount).toBe(1);
    });

    it('should not expire quests still within expiration time', () => {
      const module = createProceduralQuestModule(deps);
      const template: QuestTemplate = {
        ...createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY'),
        estimatedDurationMinutes: 120,
      };
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      module.generateQuest(trigger);

      const expiredCount = module.expireOldQuests();

      expect(expiredCount).toBe(0);
    });

    it('should decrement template instance count for expired quests', () => {
      const deps = createMockDeps();
      const module = createProceduralQuestModule(deps);
      const template: QuestTemplate = {
        ...createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY'),
        estimatedDurationMinutes: 1,
      };
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      module.generateQuest(trigger);

      (deps.clock as { nowMicroseconds: () => bigint }).nowMicroseconds = () =>
        1000000000n + 2n * 60n * 1000000n;

      module.expireOldQuests();

      const stats = module.getTemplateStats();
      expect(stats['tmpl-1']).toBe(0);
    });
  });

  describe('trigger type matching', () => {
    it('should match LOW_INTEGRITY trigger', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY');
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      const result = module.generateQuest(trigger);

      expect(result).not.toHaveProperty('error');
    });

    it('should match NPC_NEED trigger', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'EASY', 'NPC_NEED');
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'NPC_NEED',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      const result = module.generateQuest(trigger);

      expect(result).not.toHaveProperty('error');
    });

    it('should match FACTION_CONFLICT trigger', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'EASY', 'FACTION_CONFLICT');
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'FACTION_CONFLICT',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      const result = module.generateQuest(trigger);

      expect(result).not.toHaveProperty('error');
    });

    it('should match RESOURCE_SHORTAGE trigger', () => {
      const module = createProceduralQuestModule(deps);
      const template = createTestTemplate('tmpl-1', 'EASY', 'RESOURCE_SHORTAGE');
      module.registerTemplate(template);

      const trigger: QuestTrigger = {
        type: 'RESOURCE_SHORTAGE',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      const result = module.generateQuest(trigger);

      expect(result).not.toHaveProperty('error');
    });
  });

  describe('getTemplateStats', () => {
    it('should return empty stats for no templates', () => {
      const module = createProceduralQuestModule(deps);

      const stats = module.getTemplateStats();

      expect(stats).toEqual({});
    });

    it('should track multiple template instances', () => {
      const module = createProceduralQuestModule(deps);
      const t1 = createTestTemplate('tmpl-1', 'EASY', 'LOW_INTEGRITY');
      const t2 = createTestTemplate('tmpl-2', 'HARD', 'FACTION_CONFLICT');
      module.registerTemplate(t1);
      module.registerTemplate(t2);

      const trigger1: QuestTrigger = {
        type: 'LOW_INTEGRITY',
        worldId: 'world-1',
        severity: 0.5,
        metadata: {},
      };

      const trigger2: QuestTrigger = {
        type: 'FACTION_CONFLICT',
        worldId: 'world-2',
        severity: 0.7,
        metadata: {},
      };

      module.generateQuest(trigger1);
      module.generateQuest(trigger1);
      module.generateQuest(trigger2);

      const stats = module.getTemplateStats();

      expect(stats['tmpl-1']).toBe(2);
      expect(stats['tmpl-2']).toBe(1);
    });
  });
});
