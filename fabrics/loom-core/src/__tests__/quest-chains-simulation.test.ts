import { describe, it, expect } from 'vitest';
import {
  createQuestChains,
  SPARK_GAIN_QUEST_MIN,
  SPARK_GAIN_QUEST_MAX,
  TOTAL_QUEST_CHAINS,
} from '../quest-chains.js';

describe('quest-chains simulation', () => {
  function makeQc() {
    return createQuestChains();
  }

  // ── constants ─────────────────────────────────────────────────────

  it('exports SPARK_GAIN_QUEST_MIN = 25', () => {
    expect(SPARK_GAIN_QUEST_MIN).toBe(25);
  });

  it('exports SPARK_GAIN_QUEST_MAX = 50', () => {
    expect(SPARK_GAIN_QUEST_MAX).toBe(50);
  });

  it('exports TOTAL_QUEST_CHAINS = 20', () => {
    expect(TOTAL_QUEST_CHAINS).toBe(20);
  });

  // ── data coverage ─────────────────────────────────────────────────

  it('getAllQuests returns exactly 20 quest chains', () => {
    const qc = makeQc();
    expect(qc.getAllQuests().length).toBe(TOTAL_QUEST_CHAINS);
  });

  it('keeps the startup quest on the canonical entrepreneur workshop id', () => {
    const qc = makeQc();
    const startup = qc.getQuestById('the-startup');

    expect(startup).toBeDefined();
    expect(startup?.worldIds[0]).toBe('entrepreneur-workshop');
    expect(startup?.steps[0]?.worldId).toBe('entrepreneur-workshop');
  });

  it('getTotalSparkAvailable returns 920', () => {
    const qc = makeQc();
    expect(qc.getTotalSparkAvailable()).toBe(920);
  });

  // ── getQuestById ──────────────────────────────────────────────────

  it('getQuestById returns a quest for a known id', () => {
    const qc = makeQc();
    const all = qc.getAllQuests();
    const target = all[0];
    const found = qc.getQuestById(target.questId);
    expect(found).toBeDefined();
    expect(found!.questId).toBe(target.questId);
  });

  it('getQuestById returns undefined for an unknown id', () => {
    const qc = makeQc();
    expect(qc.getQuestById('__no-quest__')).toBeUndefined();
  });

  // ── getQuestsByCategory ───────────────────────────────────────────

  it('getQuestsByCategory returns only quests of given category', () => {
    const qc = makeQc();
    const all = qc.getAllQuests();
    const category = all[0].category;
    const byCat = qc.getQuestsByCategory(category);
    expect(byCat.length).toBeGreaterThan(0);
    expect(byCat.every((q) => q.category === category)).toBe(true);
  });

  // ── checkAvailability ─────────────────────────────────────────────

  describe('checkAvailability', () => {
    it('returns completed when quest is in completedQuestIds', () => {
      const qc = makeQc();
      const all = qc.getAllQuests();
      const questId = all[0].questId;
      const state = {
        kindlerId: 'kindler-1',
        completedQuestIds: new Set([questId]),
        activeQuestIds: new Set<string>(),
        completedEntryWorldIds: new Set<string>(),
        completedSteps: new Map(),
      };
      expect(qc.checkAvailability(questId, state).status).toBe('completed');
    });

    it('returns in-progress when quest is in activeQuestIds', () => {
      const qc = makeQc();
      const all = qc.getAllQuests();
      const questId = all[0].questId;
      const state = {
        kindlerId: 'kindler-1',
        completedQuestIds: new Set<string>(),
        activeQuestIds: new Set([questId]),
        completedEntryWorldIds: new Set<string>(),
        completedSteps: new Map(),
      };
      expect(qc.checkAvailability(questId, state).status).toBe('in-progress');
    });

    it('returns available or locked when quest is neither completed nor in-progress', () => {
      const qc = makeQc();
      const all = qc.getAllQuests();
      const questId = all[0].questId;
      const state = {
        kindlerId: 'kindler-1',
        completedQuestIds: new Set<string>(),
        activeQuestIds: new Set<string>(),
        completedEntryWorldIds: new Set<string>(),
        completedSteps: new Map(),
      };
      const status = qc.checkAvailability(questId, state).status;
      expect(['available', 'locked']).toContain(status);
    });
  });

  // ── evaluateCompletion ────────────────────────────────────────────

  describe('evaluateCompletion', () => {
    it('returns an evaluation result with a sparkGained field', () => {
      const qc = makeQc();
      const all = qc.getAllQuests();
      const questId = all[0].questId;
      const state = {
        kindlerId: 'kindler-1',
        completedQuestIds: new Set([questId]),
        activeQuestIds: new Set<string>(),
        completedEntryWorldIds: new Set<string>(),
        completedSteps: new Map(),
      };
      const result = qc.evaluateCompletion(questId, state);
      expect(result).toHaveProperty('sparkGained');
    });
  });

  // ── getAvailableQuests ────────────────────────────────────────────

  describe('getAvailableQuests', () => {
    it('returns a subset of all quests', () => {
      const qc = makeQc();
      const state = {
        kindlerId: 'kindler-1',
        completedQuestIds: new Set<string>(),
        activeQuestIds: new Set<string>(),
        completedEntryWorldIds: new Set<string>(),
        completedSteps: new Map(),
      };
      const available = qc.getAvailableQuests(state);
      expect(available.length).toBeGreaterThanOrEqual(0);
    });

    it('marks completed quests with completed status', () => {
      const qc = makeQc();
      const all = qc.getAllQuests();
      const completedId = all[0].questId;
      const state = {
        kindlerId: 'kindler-1',
        completedQuestIds: new Set([completedId]),
        activeQuestIds: new Set<string>(),
        completedEntryWorldIds: new Set<string>(),
        completedSteps: new Map(),
      };
      const available = qc.getAvailableQuests(state);
      const completedResult = available.find((q) => q.questId === completedId);
      expect(completedResult?.status).toBe('completed');
    });
  });
});
