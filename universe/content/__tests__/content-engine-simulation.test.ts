/**
 * Content Engine — Simulation Tests
 *
 * Pure-function tests for the knowledge-graph query layer:
 * entry lookups, tier/world filters, prerequisite gating,
 * unlock chain traversal, quiz queries, and curriculum mapping.
 *
 * Thread: silk/universe/content-engine-sim
 * Tier: 1
 */

import { describe, it, expect } from 'vitest';
import { createContentEngine } from '../engine.js';
import type { ContentEngineDeps } from '../engine.js';
import type { RealWorldEntry, EntryQuizQuestion, EntryCurriculumMap } from '../types.js';

// ─── Fixtures ─────────────────────────────────────────────────────

function makeEntry(
  overrides: Partial<RealWorldEntry> & { id: string; worldId: string },
): RealWorldEntry {
  return {
    type: 'event',
    title: `Entry ${overrides.id}`,
    year: 1900,
    yearDisplay: '1900',
    era: 'modern',
    descriptionChild: 'For kids.',
    descriptionOlder: 'For older kids.',
    descriptionParent: 'For parents.',
    realPeople: [],
    quote: null,
    quoteAttribution: null,
    geographicLocation: null,
    continent: null,
    subjectTags: [],
    guideId: 'grandmother-anaya',
    adventureType: 'guided_expedition',
    difficultyTier: 1,
    prerequisites: [],
    unlocks: [],
    funFact: 'Fun!',
    imagePrompt: 'A scene.',
    status: 'published',
    ...overrides,
  };
}

function makeQuiz(
  overrides: Partial<EntryQuizQuestion> & { id: string; entryId: string },
): EntryQuizQuestion {
  return {
    difficultyTier: 1,
    question: 'What is it?',
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 0,
    explanation: 'Because A.',
    ...overrides,
  };
}

function makeMap(
  overrides: Partial<EntryCurriculumMap> & { id: string; entryId: string },
): EntryCurriculumMap {
  return {
    standard: 'common_core',
    standardCode: 'CCSS.ELA.1',
    description: 'A standard.',
    ...overrides,
  };
}

function makeEngine(deps: Partial<ContentEngineDeps> = {}) {
  return createContentEngine({
    entries: [],
    quizzes: [],
    curriculumMaps: [],
    ...deps,
  });
}

// ─── World Queries ─────────────────────────────────────────────────

describe('getEntriesForWorld', () => {
  it('returns published entries for a worldId', () => {
    const engine = makeEngine({
      entries: [
        makeEntry({ id: 'e1', worldId: 'story-tree' }),
        makeEntry({ id: 'e2', worldId: 'story-tree' }),
        makeEntry({ id: 'e3', worldId: 'number-garden' }),
      ],
    });
    const results = engine.getEntriesForWorld('story-tree');
    expect(results.length).toBe(2);
    expect(results.every(e => e.worldId === 'story-tree')).toBe(true);
  });

  it('excludes draft entries', () => {
    const engine = makeEngine({
      entries: [
        makeEntry({ id: 'e1', worldId: 'story-tree', status: 'draft' }),
        makeEntry({ id: 'e2', worldId: 'story-tree', status: 'published' }),
      ],
    });
    expect(engine.getEntriesForWorld('story-tree').length).toBe(1);
  });

  it('returns empty array when world has no entries', () => {
    const engine = makeEngine({ entries: [] });
    expect(engine.getEntriesForWorld('unknown-world')).toHaveLength(0);
  });
});

// ─── Tier Queries ──────────────────────────────────────────────────

describe('getEntriesForTier', () => {
  it('returns only entries of the requested difficulty tier', () => {
    const engine = makeEngine({
      entries: [
        makeEntry({ id: 'e1', worldId: 'w1', difficultyTier: 1 }),
        makeEntry({ id: 'e2', worldId: 'w1', difficultyTier: 2 }),
        makeEntry({ id: 'e3', worldId: 'w1', difficultyTier: 2 }),
      ],
    });
    expect(engine.getEntriesForTier(1).length).toBe(1);
    expect(engine.getEntriesForTier(2).length).toBe(2);
    expect(engine.getEntriesForTier(3).length).toBe(0);
  });

  it('excludes draft entries from tier results', () => {
    const engine = makeEngine({
      entries: [
        makeEntry({ id: 'e1', worldId: 'w1', difficultyTier: 1, status: 'draft' }),
        makeEntry({ id: 'e2', worldId: 'w1', difficultyTier: 1 }),
      ],
    });
    expect(engine.getEntriesForTier(1).length).toBe(1);
  });
});

// ─── Availability (Prerequisite Gating) ───────────────────────────

describe('getAvailableEntries', () => {
  it('returns published entries with no prerequisites', () => {
    const engine = makeEngine({
      entries: [
        makeEntry({ id: 'e1', worldId: 'w1', prerequisites: [] }),
        makeEntry({ id: 'e2', worldId: 'w1', prerequisites: [] }),
      ],
    });
    expect(engine.getAvailableEntries([]).length).toBe(2);
  });

  it('excludes entries whose prerequisites are not yet completed', () => {
    const engine = makeEngine({
      entries: [
        makeEntry({ id: 'e1', worldId: 'w1', prerequisites: [] }),
        makeEntry({ id: 'e2', worldId: 'w1', prerequisites: ['e1'] }),
      ],
    });
    expect(engine.getAvailableEntries([]).length).toBe(1);
    expect(engine.getAvailableEntries([]).map(e => e.id)).toContain('e1');
  });

  it('unlocks entries once prerequisite is in completedIds', () => {
    const engine = makeEngine({
      entries: [
        makeEntry({ id: 'e1', worldId: 'w1', prerequisites: [] }),
        makeEntry({ id: 'e2', worldId: 'w1', prerequisites: ['e1'] }),
      ],
    });
    const available = engine.getAvailableEntries(['e1']);
    expect(available.map(e => e.id)).toContain('e2');
  });

  it('requires ALL prerequisites to be met', () => {
    const engine = makeEngine({
      entries: [
        makeEntry({ id: 'e3', worldId: 'w1', prerequisites: ['e1', 'e2'] }),
      ],
    });
    expect(engine.getAvailableEntries(['e1']).length).toBe(0);
    expect(engine.getAvailableEntries(['e1', 'e2']).length).toBe(1);
  });
});

// ─── Entry Lookup ──────────────────────────────────────────────────

describe('getEntryById', () => {
  it('returns the entry with the matching id', () => {
    const engine = makeEngine({
      entries: [makeEntry({ id: 'gutenberg', worldId: 'story-tree' })],
    });
    const entry = engine.getEntryById('gutenberg');
    expect(entry).toBeDefined();
    expect(entry!.id).toBe('gutenberg');
  });

  it('returns undefined for an unknown id', () => {
    const engine = makeEngine({ entries: [] });
    expect(engine.getEntryById('ghost')).toBeUndefined();
  });
});

// ─── Quiz Queries ──────────────────────────────────────────────────

describe('getQuizzesForEntry', () => {
  it('returns all quiz questions for an entry', () => {
    const engine = makeEngine({
      entries: [makeEntry({ id: 'e1', worldId: 'w1' })],
      quizzes: [
        makeQuiz({ id: 'q1', entryId: 'e1' }),
        makeQuiz({ id: 'q2', entryId: 'e1' }),
        makeQuiz({ id: 'q3', entryId: 'e2' }),
      ],
    });
    expect(engine.getQuizzesForEntry('e1').length).toBe(2);
  });

  it('returns empty array for entry with no quizzes', () => {
    const engine = makeEngine({ entries: [], quizzes: [] });
    expect(engine.getQuizzesForEntry('no-quiz-entry')).toHaveLength(0);
  });
});

describe('getQuizzesForEntryAndTier', () => {
  it('filters quizzes by both entryId and difficultyTier', () => {
    const engine = makeEngine({
      entries: [makeEntry({ id: 'e1', worldId: 'w1' })],
      quizzes: [
        makeQuiz({ id: 'q1', entryId: 'e1', difficultyTier: 1 }),
        makeQuiz({ id: 'q2', entryId: 'e1', difficultyTier: 2 }),
        makeQuiz({ id: 'q3', entryId: 'e1', difficultyTier: 2 }),
      ],
    });
    expect(engine.getQuizzesForEntryAndTier('e1', 1).length).toBe(1);
    expect(engine.getQuizzesForEntryAndTier('e1', 2).length).toBe(2);
    expect(engine.getQuizzesForEntryAndTier('e1', 3).length).toBe(0);
  });
});

// ─── Curriculum Maps ───────────────────────────────────────────────

describe('getMapsForEntry', () => {
  it('returns curriculum maps for a given entry', () => {
    const engine = makeEngine({
      entries: [makeEntry({ id: 'e1', worldId: 'w1' })],
      curriculumMaps: [
        makeMap({ id: 'm1', entryId: 'e1' }),
        makeMap({ id: 'm2', entryId: 'e1', standardCode: 'CCSS.ELA.2' }),
        makeMap({ id: 'm3', entryId: 'e2' }),
      ],
    });
    expect(engine.getMapsForEntry('e1').length).toBe(2);
  });
});

describe('getEntriesForStandardCode', () => {
  it('returns entries linked to a specific curriculum standard code', () => {
    const entries = [
      makeEntry({ id: 'e1', worldId: 'w1' }),
      makeEntry({ id: 'e2', worldId: 'w1' }),
    ];
    const engine = makeEngine({
      entries,
      curriculumMaps: [
        makeMap({ id: 'm1', entryId: 'e1', standardCode: 'CCSS.ELA.RL.3.1' }),
        makeMap({ id: 'm2', entryId: 'e2', standardCode: 'NGSS.3-LS1-1' }),
      ],
    });
    const results = engine.getEntriesForStandardCode('CCSS.ELA.RL.3.1');
    expect(results.length).toBe(1);
    expect(results[0]!.id).toBe('e1');
  });

  it('returns empty when no entries map to that standard code', () => {
    const engine = makeEngine({ entries: [], curriculumMaps: [] });
    expect(engine.getEntriesForStandardCode('UNKNOWN.STD')).toHaveLength(0);
  });
});

// ─── Prerequisite Validation ───────────────────────────────────────

describe('validatePrerequisites', () => {
  it('returns empty array when all prerequisites are completed', () => {
    const engine = makeEngine({
      entries: [makeEntry({ id: 'e2', worldId: 'w1', prerequisites: ['e1'] })],
    });
    expect(engine.validatePrerequisites(['e1'], 'e2')).toHaveLength(0);
  });

  it('returns missing prerequisite ids', () => {
    const engine = makeEngine({
      entries: [makeEntry({ id: 'e3', worldId: 'w1', prerequisites: ['e1', 'e2'] })],
    });
    const missing = engine.validatePrerequisites(['e1'], 'e3');
    expect(missing).toContain('e2');
    expect(missing).not.toContain('e1');
  });

  it('returns empty array for unknown entry id', () => {
    const engine = makeEngine({ entries: [] });
    expect(engine.validatePrerequisites([], 'ghost')).toHaveLength(0);
  });

  it('returns empty array for entry with no prerequisites', () => {
    const engine = makeEngine({
      entries: [makeEntry({ id: 'e1', worldId: 'w1', prerequisites: [] })],
    });
    expect(engine.validatePrerequisites([], 'e1')).toHaveLength(0);
  });
});

// ─── Unlock Chain (BFS Graph Traversal) ───────────────────────────

describe('getUnlockChain', () => {
  it('returns empty array when an entry unlocks nothing', () => {
    const engine = makeEngine({
      entries: [makeEntry({ id: 'e1', worldId: 'w1', unlocks: [] })],
    });
    expect(engine.getUnlockChain('e1')).toHaveLength(0);
  });

  it('returns direct unlocks', () => {
    const engine = makeEngine({
      entries: [
        makeEntry({ id: 'e1', worldId: 'w1', unlocks: ['e2', 'e3'] }),
        makeEntry({ id: 'e2', worldId: 'w1', unlocks: [] }),
        makeEntry({ id: 'e3', worldId: 'w1', unlocks: [] }),
      ],
    });
    const chain = engine.getUnlockChain('e1');
    expect(chain).toContain('e2');
    expect(chain).toContain('e3');
  });

  it('traverses multi-level unlock chains', () => {
    // e1 → e2 → e3
    const engine = makeEngine({
      entries: [
        makeEntry({ id: 'e1', worldId: 'w1', unlocks: ['e2'] }),
        makeEntry({ id: 'e2', worldId: 'w1', unlocks: ['e3'] }),
        makeEntry({ id: 'e3', worldId: 'w1', unlocks: [] }),
      ],
    });
    const chain = engine.getUnlockChain('e1');
    expect(chain).toContain('e2');
    expect(chain).toContain('e3');
  });

  it('does not include the starting entry in the chain', () => {
    const engine = makeEngine({
      entries: [makeEntry({ id: 'e1', worldId: 'w1', unlocks: ['e2'] }),
                makeEntry({ id: 'e2', worldId: 'w1', unlocks: [] })],
    });
    expect(engine.getUnlockChain('e1')).not.toContain('e1');
  });

  it('handles circular unlock references without infinite loops', () => {
    const engine = makeEngine({
      entries: [
        makeEntry({ id: 'e1', worldId: 'w1', unlocks: ['e2'] }),
        makeEntry({ id: 'e2', worldId: 'w1', unlocks: ['e1'] }), // cycle
      ],
    });
    // Should terminate — result contains e2 (reachable from e1)
    const chain = engine.getUnlockChain('e1');
    expect(chain).toContain('e2');
    expect(chain.length).toBeLessThan(5); // no infinite expansion
  });
});

// ─── Stats ─────────────────────────────────────────────────────────

describe('getStats', () => {
  it('reports total and published entry counts', () => {
    const engine = makeEngine({
      entries: [
        makeEntry({ id: 'e1', worldId: 'w1', status: 'published' }),
        makeEntry({ id: 'e2', worldId: 'w1', status: 'draft' }),
      ],
    });
    const stats = engine.getStats();
    expect(stats.totalEntries).toBe(2);
    expect(stats.publishedEntries).toBe(1);
  });

  it('counts quiz questions and curriculum maps', () => {
    const engine = makeEngine({
      entries: [makeEntry({ id: 'e1', worldId: 'w1' })],
      quizzes: [makeQuiz({ id: 'q1', entryId: 'e1' }), makeQuiz({ id: 'q2', entryId: 'e1' })],
      curriculumMaps: [makeMap({ id: 'm1', entryId: 'e1' })],
    });
    const stats = engine.getStats();
    expect(stats.totalQuizQuestions).toBe(2);
    expect(stats.totalCurriculumMaps).toBe(1);
  });

  it('reports unique worldIds', () => {
    const engine = makeEngine({
      entries: [
        makeEntry({ id: 'e1', worldId: 'story-tree' }),
        makeEntry({ id: 'e2', worldId: 'story-tree' }),
        makeEntry({ id: 'e3', worldId: 'number-garden' }),
      ],
    });
    const stats = engine.getStats();
    expect(stats.worldIds).toContain('story-tree');
    expect(stats.worldIds).toContain('number-garden');
    expect(stats.worldIds.length).toBe(2);
  });
});
