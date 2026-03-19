import { describe, it, expect, beforeEach } from 'vitest';
import {
  NPC_QUESTIONS,
  getQuestion,
  getQuestionsByCategory,
  getQuestionsForChar,
  QUESTION_COUNT,
  type NpcQuestion,
  type QuestionCategory,
} from '../npc-question-registry.js';

describe('npc-question-registry', () => {
  describe('NPC_QUESTIONS constant', () => {
    it('contains exactly QUESTION_COUNT entries', () => {
      expect(NPC_QUESTIONS.length).toBe(QUESTION_COUNT);
    });

    it('has QUESTION_COUNT equal to 24', () => {
      expect(QUESTION_COUNT).toBe(24);
    });

    it('every entry has pillar set to QUESTION', () => {
      for (const q of NPC_QUESTIONS) {
        expect(q.pillar).toBe('QUESTION');
      }
    });

    it('all ids are unique', () => {
      const ids = NPC_QUESTIONS.map((q) => q.id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });

    it('every entry has a non-empty question string', () => {
      for (const q of NPC_QUESTIONS) {
        expect(q.question.length).toBeGreaterThan(0);
      }
    });

    it('every entry has a non-empty playerHookDescription', () => {
      for (const q of NPC_QUESTIONS) {
        expect(q.playerHookDescription.length).toBeGreaterThan(0);
      }
    });

    it('every entry has a valid category', () => {
      const validCategories: ReadonlyArray<QuestionCategory> = [
        'historical',
        'scientific',
        'personal',
        'political',
        'philosophical',
        'investigative',
      ];
      for (const q of NPC_QUESTIONS) {
        expect(validCategories).toContain(q.category);
      }
    });
  });

  describe('getQuestion', () => {
    it('returns the correct entry for ID_Q_001', () => {
      const result = getQuestion('ID_Q_001');
      expect(result).toBeDefined();
      if (result) {
        expect(result.charName).toBe('Historian Taiwo');
        expect(result.category).toBe('historical');
      }
    });

    it('returns undefined for an unknown id', () => {
      expect(getQuestion('ID_Q_MISSING')).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(getQuestion('')).toBeUndefined();
    });

    it('returns correct entry for last item ID_Q_024', () => {
      const result = getQuestion('ID_Q_024');
      expect(result).toBeDefined();
      if (result) {
        expect(result.charName).toBe('Circuit Keeper Ife');
        expect(result.category).toBe('political');
      }
    });
  });

  describe('getQuestionsByCategory', () => {
    it('returns historical questions', () => {
      const results = getQuestionsByCategory('historical');
      expect(results.length).toBeGreaterThan(0);
      for (const q of results) {
        expect(q.category).toBe('historical');
      }
    });

    it('returns scientific questions', () => {
      const results = getQuestionsByCategory('scientific');
      expect(results.length).toBeGreaterThan(0);
      for (const q of results) {
        expect(q.category).toBe('scientific');
      }
    });

    it('returns personal questions', () => {
      const results = getQuestionsByCategory('personal');
      expect(results.length).toBeGreaterThan(0);
      for (const q of results) {
        expect(q.category).toBe('personal');
      }
    });

    it('returns political questions', () => {
      const results = getQuestionsByCategory('political');
      expect(results.length).toBeGreaterThan(0);
      for (const q of results) {
        expect(q.category).toBe('political');
      }
    });

    it('returns investigative questions', () => {
      const results = getQuestionsByCategory('investigative');
      expect(results.length).toBeGreaterThan(0);
      for (const q of results) {
        expect(q.category).toBe('investigative');
      }
    });

    it('returns empty for philosophical (none defined)', () => {
      const results = getQuestionsByCategory('philosophical');
      expect(results.length).toBe(0);
    });

    it('all category results sum to QUESTION_COUNT', () => {
      const categories: ReadonlyArray<QuestionCategory> = [
        'historical',
        'scientific',
        'personal',
        'political',
        'philosophical',
        'investigative',
      ];
      let total = 0;
      for (const cat of categories) {
        total += getQuestionsByCategory(cat).length;
      }
      expect(total).toBe(QUESTION_COUNT);
    });
  });

  describe('getQuestionsForChar', () => {
    it('returns questions for charId 141', () => {
      const results = getQuestionsForChar(141);
      expect(results.length).toBeGreaterThan(0);
      for (const q of results) {
        expect(q.charId).toBe(141);
      }
    });

    it('returns empty array for unknown charId', () => {
      expect(getQuestionsForChar(999999)).toEqual([]);
    });

    it('does not match null charId entries', () => {
      expect(getQuestionsForChar(0)).toEqual([]);
    });

    it('returns correct entry for charId 289', () => {
      const results = getQuestionsForChar(289);
      expect(results.length).toBe(1);
      const first = results[0];
      if (first) {
        expect(first.id).toBe('ID_Q_024');
      }
    });
  });
});
