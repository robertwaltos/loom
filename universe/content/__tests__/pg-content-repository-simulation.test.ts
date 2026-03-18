/**
 * PgContentRepository — Simulation Tests
 *
 * Mock the pg Pool to verify SQL shapes and return value mapping.
 * No real DB required; pool.query() is stubbed with vi.fn().
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPgContentRepository } from '../pg-repository.js';
import type { RealWorldEntry, EntryQuizQuestion } from '../types.js';

// ─── Minimal pool mock ─────────────────────────────────────────────

function makePool(returnRows: unknown[][] = []) {
  let callIndex = 0;
  return {
    query: vi.fn((_sql: string, _params?: unknown[]) => {
      const rows = returnRows[callIndex++] ?? [];
      return Promise.resolve({ rows });
    }),
  };
}

// ─── Fixtures ──────────────────────────────────────────────────────

const ENTRY: RealWorldEntry = {
  id: 'entry-001',
  type: 'event',
  title: 'The Moon Landing',
  year: 1969,
  yearDisplay: '1969',
  era: 'modern',
  descriptionChild: 'Astronauts went to the Moon!',
  descriptionOlder: 'Humans landed on the Moon for the first time.',
  descriptionParent: 'Apollo 11 successfully landed on the Moon on July 20, 1969.',
  realPeople: ['Neil Armstrong', 'Buzz Aldrin'],
  quote: 'One small step for man',
  quoteAttribution: 'Neil Armstrong',
  geographicLocation: { lat: 28.5, lng: -80.6, name: 'Kennedy Space Center' },
  continent: 'North America',
  subjectTags: ['space', 'science'],
  worldId: 'starfall-observatory',
  guideId: 'guide-cosmos',
  adventureType: 'guided_expedition',
  difficultyTier: 2,
  prerequisites: [],
  unlocks: ['entry-002'],
  funFact: 'The Moon is moving away from Earth at 3.8 cm per year.',
  imagePrompt: 'astronaut on moon surface',
  status: 'published',
};

const QUIZ: EntryQuizQuestion = {
  id: 'quiz-001',
  entryId: 'entry-001',
  difficultyTier: 2,
  question: 'Who was the first human to walk on the Moon?',
  options: ['Neil Armstrong', 'Buzz Aldrin', 'Michael Collins', 'John Glenn'],
  correctIndex: 0,
  explanation: 'Neil Armstrong was the mission commander of Apollo 11.',
};

const ENTRY_ROW = {
  id: 'entry-001', type: 'event', title: 'The Moon Landing',
  year: 1969, year_display: '1969', era: 'modern',
  description_child: 'Astronauts went to the Moon!',
  description_older: 'Humans landed on the Moon for the first time.',
  description_parent: 'Apollo 11 successfully landed on the Moon on July 20, 1969.',
  real_people: ['Neil Armstrong', 'Buzz Aldrin'],
  quote: 'One small step for man', quote_attribution: 'Neil Armstrong',
  geographic_location: { lat: 28.5, lng: -80.6, name: 'Kennedy Space Center' },
  continent: 'North America', subject_tags: ['space', 'science'],
  world_id: 'starfall-observatory', guide_id: 'guide-cosmos',
  adventure_type: 'guided_expedition', difficulty_tier: 2,
  prerequisites: [], unlocks: ['entry-002'],
  fun_fact: 'The Moon is moving away from Earth at 3.8 cm per year.',
  image_prompt: 'astronaut on moon surface', status: 'published',
};

// ─── Tests ─────────────────────────────────────────────────────────

describe('PgContentRepository', () => {
  describe('countEntries', () => {
    it('returns parsed count from DB', async () => {
      const pool = makePool([[{ count: '42' }]]);
      const repo = createPgContentRepository(pool as never);
      const count = await repo.countEntries();
      expect(count).toBe(42);
      expect(pool.query).toHaveBeenCalledWith('SELECT COUNT(*) AS count FROM real_world_entries');
    });

    it('returns 0 when no rows returned', async () => {
      const pool = makePool([[]]);
      const repo = createPgContentRepository(pool as never);
      const count = await repo.countEntries();
      expect(count).toBe(0);
    });
  });

  describe('seedEntries', () => {
    it('inserts one entry and returns inserted count', async () => {
      const pool = makePool([[{ id: 'entry-001' }]]);
      const repo = createPgContentRepository(pool as never);
      const result = await repo.seedEntries([ENTRY]);
      expect(result.inserted).toBe(1);
      expect(result.skipped).toBe(0);
      const [sql, params] = pool.query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('INSERT INTO real_world_entries');
      expect(sql).toContain('ON CONFLICT (id) DO NOTHING');
      expect(params).toContain('entry-001');
      expect(params).toContain('event');
      expect(params).toContain('The Moon Landing');
    });

    it('counts conflict (no return) as skipped', async () => {
      const pool = makePool([[]]); // ON CONFLICT DO NOTHING returns empty rows
      const repo = createPgContentRepository(pool as never);
      const result = await repo.seedEntries([ENTRY]);
      expect(result.inserted).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('serializes geographicLocation as JSON', async () => {
      const pool = makePool([[{ id: 'entry-001' }]]);
      const repo = createPgContentRepository(pool as never);
      await repo.seedEntries([ENTRY]);
      const [, params] = pool.query.mock.calls[0] as [string, unknown[]];
      const geoParam = params.find(p => typeof p === 'string' && (p as string).includes('Kennedy'));
      expect(geoParam).toBe(JSON.stringify({ lat: 28.5, lng: -80.6, name: 'Kennedy Space Center' }));
    });

    it('handles null fields gracefully', async () => {
      const pool = makePool([[{ id: 'null-entry' }]]);
      const repo = createPgContentRepository(pool as never);
      const nullEntry: RealWorldEntry = { ...ENTRY, id: 'null-entry', year: null, quote: null, quoteAttribution: null, geographicLocation: null, continent: null };
      await repo.seedEntries([nullEntry]);
      const [, params] = pool.query.mock.calls[0] as [string, unknown[]];
      expect(params[3]).toBeNull();  // year
      expect(params[10]).toBeNull(); // quote
      expect(params[12]).toBeNull(); // geographic_location
    });
  });

  describe('seedQuizzes', () => {
    it('inserts quiz question and returns count', async () => {
      const pool = makePool([[]]); // ON CONFLICT DO NOTHING
      const repo = createPgContentRepository(pool as never);
      const result = await repo.seedQuizzes([QUIZ]);
      expect(result.inserted).toBe(1);
      const [sql, params] = pool.query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('INSERT INTO entry_quiz_questions');
      expect(sql).toContain('ON CONFLICT (id) DO NOTHING');
      expect(params).toContain('quiz-001');
      expect(params).toContain('entry-001');
    });
  });

  describe('loadEntries', () => {
    it('maps DB row to RealWorldEntry shape', async () => {
      const pool = makePool([[ENTRY_ROW]]);
      const repo = createPgContentRepository(pool as never);
      const entries = await repo.loadEntries();
      expect(entries).toHaveLength(1);
      const e = entries[0]!;
      expect(e.id).toBe('entry-001');
      expect(e.yearDisplay).toBe('1969');
      expect(e.descriptionChild).toBe('Astronauts went to the Moon!');
      expect(e.realPeople).toEqual(['Neil Armstrong', 'Buzz Aldrin']);
      expect(e.geographicLocation).toEqual({ lat: 28.5, lng: -80.6, name: 'Kennedy Space Center' });
      const [sql] = pool.query.mock.calls[0] as [string];
      expect(sql).toContain('SELECT * FROM real_world_entries ORDER BY id');
    });

    it('filters by worldId when provided', async () => {
      const pool = makePool([[ENTRY_ROW]]);
      const repo = createPgContentRepository(pool as never);
      await repo.loadEntries('starfall-observatory');
      const [sql, params] = pool.query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('WHERE world_id = $1');
      expect(params).toContain('starfall-observatory');
    });
  });

  describe('loadQuizzesForEntry', () => {
    it('maps DB row to EntryQuizQuestion shape', async () => {
      const quizRow = {
        id: 'quiz-001', entry_id: 'entry-001', difficulty_tier: 2,
        question: 'Who was first on the Moon?',
        options: ['Neil Armstrong', 'Buzz Aldrin'],
        correct_index: 0, explanation: 'Neil was the commander.',
      };
      const pool = makePool([[quizRow]]);
      const repo = createPgContentRepository(pool as never);
      const quizzes = await repo.loadQuizzesForEntry('entry-001');
      expect(quizzes).toHaveLength(1);
      const q = quizzes[0]!;
      expect(q.id).toBe('quiz-001');
      expect(q.entryId).toBe('entry-001');
      expect(q.difficultyTier).toBe(2);
      expect(q.correctIndex).toBe(0);
    });

    it('passes entryId as query param', async () => {
      const pool = makePool([[]]);
      const repo = createPgContentRepository(pool as never);
      await repo.loadQuizzesForEntry('entry-abc');
      const [sql, params] = pool.query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('WHERE entry_id = $1');
      expect(params).toContain('entry-abc');
    });
  });

  describe('loadAllQuizzes', () => {
    it('returns all quiz rows', async () => {
      const pool = makePool([[
        { id: 'q1', entry_id: 'e1', difficulty_tier: 1, question: 'Q1', options: ['a','b'], correct_index: 0, explanation: 'x' },
        { id: 'q2', entry_id: 'e2', difficulty_tier: 3, question: 'Q2', options: ['c','d'], correct_index: 1, explanation: 'y' },
      ]]);
      const repo = createPgContentRepository(pool as never);
      const quizzes = await repo.loadAllQuizzes();
      expect(quizzes).toHaveLength(2);
      expect(quizzes[0]!.id).toBe('q1');
      expect(quizzes[1]!.difficultyTier).toBe(3);
    });
  });
});
