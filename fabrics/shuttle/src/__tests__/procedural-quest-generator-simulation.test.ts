import { describe, it, expect, vi } from 'vitest';
import { createQuestGenerator } from '../procedural-quest-generator.js';

function makeDeps() {
  return {
    clock: { now: vi.fn(() => BigInt(1_000_000)) },
    id: { next: vi.fn(() => `q-${Math.random().toString(36).slice(2)}`) },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    events: { emit: vi.fn() },
    worldState: {
      getEconomicState: vi.fn().mockResolvedValue({ inflationRate: 0.05, averageWealth: 100, marketStability: 0.7, tradeVolume: 500 }),
      getPoliticalState: vi.fn().mockResolvedValue({ governmentType: 'democracy', stabilityScore: 0.8, activeElection: false, pendingLegislation: 0 }),
      getWeatherState: vi.fn().mockResolvedValue({ currentWeather: 'clear', severity: 0.1, forecast: [] }),
      getActiveConflicts: vi.fn().mockResolvedValue([]),
      getWorldConnections: vi.fn().mockResolvedValue([]),
    },
    npc: {
      getNpcGoals: vi.fn().mockResolvedValue([]),
      getNpcPersonality: vi.fn().mockResolvedValue(undefined),
    },
    economy: {
      getAverageIncome: vi.fn().mockResolvedValue(100),
      getInflationRate: vi.fn().mockResolvedValue(0.05),
    },
    ratings: {
      recordRating: vi.fn().mockResolvedValue(undefined),
      getTemplateRatings: vi.fn().mockResolvedValue({ templateType: 'escort', averageRating: 4.0, totalRatings: 10, completionRate: 0.8 }),
    },
  };
}

function makeSampleTemplate() {
  return {
    templateId: 'template-escort',
    type: 'escort' as const,
    namePattern: 'Escort Mission',
    descriptionPattern: 'Escort the target safely.',
    objectives: [
      {
        objectiveId: 'obj-1',
        description: 'Reach destination',
        type: 'reach' as const,
        targetParam: 'destination',
        quantityParam: '1',
        optional: false,
      },
    ],
    baseRewardKalon: 30,
    baseDifficulty: 'moderate' as const,
    requiredPlayerCount: 1,
    estimatedDurationMs: 7 * 24 * 60 * 60 * 1000,
    worldStatePrerequisites: [],
  };
}

describe('procedural-quest-generator simulation', () => {
  // ── engine creation ──────────────────────────────────────────────

  it('creates generator without throwing', () => {
    expect(() => createQuestGenerator(makeDeps())).not.toThrow();
  });

  it('accepts optional config overrides', () => {
    const gen = createQuestGenerator(makeDeps(), { maxActiveQuestsPerWorld: 10 });
    expect(gen).toBeDefined();
  });

  // ── registerTemplate / getTemplate ────────────────────────────────

  describe('registerTemplate', () => {
    it('stores a template and getTemplate retrieves it', () => {
      const gen = createQuestGenerator(makeDeps());
      const template = makeSampleTemplate();
      gen.registerTemplate(template);
      const retrieved = gen.getTemplate('template-escort');
      expect(retrieved).toBeDefined();
      expect(retrieved!.templateId).toBe('template-escort');
    });

    it('getTemplate returns undefined for unknown id', () => {
      const gen = createQuestGenerator(makeDeps());
      expect(gen.getTemplate('__no-template__')).toBeUndefined();
    });
  });

  // ── createChain / addToChain / advanceChain ────────────────────────

  describe('quest chain operations', () => {
    it('createChain returns a chain with the given name', () => {
      const gen = createQuestGenerator(makeDeps());
      const chain = gen.createChain('Dragon Arc', ['world-1', 'world-2']);
      expect(chain).toHaveProperty('chainId');
      expect(chain.name).toBe('Dragon Arc');
    });

    it('addToChain associates a quest with a chain', async () => {
      const gen = createQuestGenerator(makeDeps());
      gen.registerTemplate(makeSampleTemplate());
      const chain = gen.createChain('Test Arc', ['world-1']);
      const quest = await gen.generateFromWorldState('world-1');
      expect(() => gen.addToChain(chain.chainId, quest.questId)).not.toThrow();
    });

    it('advanceChain does not throw for a valid chain', () => {
      const gen = createQuestGenerator(makeDeps());
      const chain = gen.createChain('Test Arc', ['world-1']);
      expect(() => gen.advanceChain(chain.chainId)).not.toThrow();
    });
  });

  // ── acceptQuest ───────────────────────────────────────────────────

  describe('acceptQuest', () => {
    it('moves a quest to in-progress when required players accept', async () => {
      const gen = createQuestGenerator(makeDeps());
      gen.registerTemplate(makeSampleTemplate());
      const quest = await gen.generateFromWorldState('world-1');
      gen.acceptQuest(quest.questId, 'player-1'); // requiredPlayerCount=1, so goes in-progress
      const updated = gen.getQuest(quest.questId);
      expect(updated!.status).toBe('in-progress');
    });
  });

  // ── updateObjective ───────────────────────────────────────────────

  describe('updateObjective', () => {
    it('updates objective progress without throwing', async () => {
      const gen = createQuestGenerator(makeDeps());
      gen.registerTemplate(makeSampleTemplate());
      const quest = await gen.generateFromWorldState('world-1');
      gen.acceptQuest(quest.questId, 'player-1');
      const objId = quest.objectives[0]!.objectiveId;
      expect(() => gen.updateObjective(quest.questId, objId, 1)).not.toThrow();
    });
  });

  // ── completeQuest / failQuest ─────────────────────────────────────

  describe('completeQuest', () => {
    it('sets quest status to completed when required objectives are done', async () => {
      const gen = createQuestGenerator(makeDeps());
      gen.registerTemplate(makeSampleTemplate());
      const quest = await gen.generateFromWorldState('world-1');
      gen.acceptQuest(quest.questId, 'player-1');
      const objId = quest.objectives[0]!.objectiveId;
      gen.updateObjective(quest.questId, objId, 1); // progress = target
      gen.completeQuest(quest.questId);
      const completed = gen.getQuest(quest.questId);
      expect(completed!.status).toBe('completed');
    });
  });

  describe('failQuest', () => {
    it('sets quest status to failed', async () => {
      const gen = createQuestGenerator(makeDeps());
      gen.registerTemplate(makeSampleTemplate());
      const quest = await gen.generateFromWorldState('world-1');
      gen.acceptQuest(quest.questId, 'player-1');
      gen.failQuest(quest.questId, 'player abandoned');
      const failed = gen.getQuest(quest.questId);
      expect(failed!.status).toBe('failed');
    });
  });

  // ── expireStaleQuests ─────────────────────────────────────────────

  describe('expireStaleQuests', () => {
    it('does not throw when called with no stale quests', () => {
      const gen = createQuestGenerator(makeDeps());
      expect(() => gen.expireStaleQuests()).not.toThrow();
    });
  });

  // ── getWorldQuests / getPlayerQuests ──────────────────────────────

  describe('query methods', () => {
    it('getWorldQuests returns an array for any worldId', () => {
      const gen = createQuestGenerator(makeDeps());
      expect(Array.isArray(gen.getWorldQuests('world-1'))).toBe(true);
    });

    it('getPlayerQuests returns an array for any playerId', () => {
      const gen = createQuestGenerator(makeDeps());
      expect(Array.isArray(gen.getPlayerQuests('player-1'))).toBe(true);
    });
  });

  // ── getStats ──────────────────────────────────────────────────────

  it('getStats returns total quest counts', () => {
    const gen = createQuestGenerator(makeDeps());
    const stats = gen.getStats();
    expect(stats).toHaveProperty('questsGenerated');
  });

  // ── DIFFICULTY_MULTIPLIERS via evaluateQuality ────────────────────

  describe('evaluateQuality', () => {
    it('returns a quality score for a quest', async () => {
      const gen = createQuestGenerator(makeDeps());
      gen.registerTemplate(makeSampleTemplate());
      const quest = await gen.generateFromWorldState('world-1');
      const score = gen.evaluateQuality(quest.questId);
      expect(typeof score.overall).toBe('number');
      expect(score.overall).toBeGreaterThanOrEqual(0);
      expect(score.overall).toBeLessThanOrEqual(1);
    });
  });
});
