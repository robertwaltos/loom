/**
 * Tests — Content Engine
 *
 * Uses synthetic fixtures (not the real 9-world data) for speed and isolation.
 */

import { describe, it, expect } from 'vitest';
import { createContentEngine } from '../universe/content/engine.js';
import type { ContentEngineDeps } from '../universe/content/engine.js';
import type {
  RealWorldEntry,
  EntryQuizQuestion,
  EntryCurriculumMap,
  DifficultyTier,
  EntryStatus,
} from '../universe/content/types.js';

// ─── Fixture Helpers ───────────────────────────────────────────────

function e(
  id: string,
  worldId: string,
  opts: {
    tier?: DifficultyTier;
    prereqs?: readonly string[];
    unlocks?: readonly string[];
    status?: EntryStatus;
  } = {},
): RealWorldEntry {
  return {
    id,
    worldId,
    type: 'event',
    title: id,
    year: null,
    yearDisplay: 'unknown',
    era: 'contemporary',
    descriptionChild: '',
    descriptionOlder: '',
    descriptionParent: '',
    realPeople: [],
    quote: null,
    quoteAttribution: null,
    geographicLocation: null,
    continent: null,
    subjectTags: [],
    guideId: 'guide',
    adventureType: 'guided_expedition',
    difficultyTier: opts.tier ?? 1,
    prerequisites: opts.prereqs ?? [],
    unlocks: opts.unlocks ?? [],
    funFact: '',
    imagePrompt: '',
    status: opts.status ?? 'published',
  };
}

function q(
  id: string,
  entryId: string,
  tier: DifficultyTier = 1,
): EntryQuizQuestion {
  return {
    id,
    entryId,
    difficultyTier: tier,
    question: id,
    options: ['a', 'b'],
    correctIndex: 0,
    explanation: '',
  };
}

function m(id: string, entryId: string, standardCode: string): EntryCurriculumMap {
  return { id, entryId, standard: 'common_core', standardCode, description: '' };
}

// ─── Tests ─────────────────────────────────────────────────────────

describe('getEntriesForWorld', () => {
  const deps: ContentEngineDeps = {
    entries: [
      e('a', 'world-1'),
      e('b', 'world-1'),
      e('c', 'world-2'),
      e('d', 'world-1', { status: 'draft' }),
    ],
    quizzes: [],
    curriculumMaps: [],
  };
  const engine = createContentEngine(deps);

  it('returns published entries for the given world', () => {
    expect(engine.getEntriesForWorld('world-1').map(x => x.id)).toEqual(['a', 'b']);
  });

  it('excludes entries from other worlds', () => {
    expect(engine.getEntriesForWorld('world-2').map(x => x.id)).toEqual(['c']);
  });

  it('excludes draft entries', () => {
    expect(engine.getEntriesForWorld('world-1').every(x => x.status === 'published')).toBe(true);
  });

  it('returns empty array for unknown world', () => {
    expect(engine.getEntriesForWorld('no-world')).toHaveLength(0);
  });
});

describe('getEntriesForTier', () => {
  const deps: ContentEngineDeps = {
    entries: [
      e('t1a', 'w1', { tier: 1 }),
      e('t1b', 'w1', { tier: 1 }),
      e('t2a', 'w1', { tier: 2 }),
      e('t3-draft', 'w1', { tier: 3, status: 'draft' }),
    ],
    quizzes: [],
    curriculumMaps: [],
  };
  const engine = createContentEngine(deps);

  it('returns published entries matching tier', () => {
    expect(engine.getEntriesForTier(1).map(x => x.id)).toEqual(['t1a', 't1b']);
  });

  it('excludes entries of other tiers', () => {
    expect(engine.getEntriesForTier(2).map(x => x.id)).toEqual(['t2a']);
  });

  it('excludes draft entries', () => {
    expect(engine.getEntriesForTier(3)).toHaveLength(0);
  });

  it('returns empty for tier with no entries', () => {
    const eng = createContentEngine({ entries: [], quizzes: [], curriculumMaps: [] });
    expect(eng.getEntriesForTier(1)).toHaveLength(0);
  });
});

describe('getAvailableEntries', () => {
  const A = e('a', 'w');
  const B = e('b', 'w', { prereqs: ['a'] });
  const C = e('c', 'w', { prereqs: ['a', 'b'] });
  const D = e('d', 'w', { status: 'draft', prereqs: [] });
  const deps: ContentEngineDeps = { entries: [A, B, C, D], quizzes: [], curriculumMaps: [] };
  const engine = createContentEngine(deps);

  it('returns entries with no prerequisites when nothing completed', () => {
    const ids = engine.getAvailableEntries([]).map(x => x.id);
    expect(ids).toEqual(['a']);
  });

  it('returns entries whose prereqs are fully met', () => {
    const ids = engine.getAvailableEntries(['a']).map(x => x.id);
    expect(ids).toContain('b');
    expect(ids).not.toContain('c');
  });

  it('returns entry once all multi-prereqs are met', () => {
    const ids = engine.getAvailableEntries(['a', 'b']).map(x => x.id);
    expect(ids).toContain('c');
  });

  it('excludes draft entries regardless of prereqs', () => {
    expect(engine.getAvailableEntries([]).every(x => x.status === 'published')).toBe(true);
  });

  it('returns all published entries when everything completed', () => {
    const ids = engine.getAvailableEntries(['a', 'b', 'c']).map(x => x.id);
    expect(ids).toEqual(['a', 'b', 'c']);
  });
});

describe('getEntryById', () => {
  const deps: ContentEngineDeps = {
    entries: [e('x', 'w'), e('y', 'w', { status: 'draft' })],
    quizzes: [],
    curriculumMaps: [],
  };
  const engine = createContentEngine(deps);

  it('returns the entry when found', () => {
    expect(engine.getEntryById('x')?.id).toBe('x');
  });

  it('returns undefined for unknown id', () => {
    expect(engine.getEntryById('zzz')).toBeUndefined();
  });

  it('returns draft entries too (no status filter)', () => {
    expect(engine.getEntryById('y')?.status).toBe('draft');
  });
});

describe('getQuizzesForEntry', () => {
  const deps: ContentEngineDeps = {
    entries: [],
    quizzes: [q('q1', 'e1', 1), q('q2', 'e1', 2), q('q3', 'e2', 1)],
    curriculumMaps: [],
  };
  const engine = createContentEngine(deps);

  it('returns all quizzes for an entry regardless of tier', () => {
    expect(engine.getQuizzesForEntry('e1').map(x => x.id)).toEqual(['q1', 'q2']);
  });

  it('does not include quizzes from other entries', () => {
    expect(engine.getQuizzesForEntry('e1').some(x => x.entryId !== 'e1')).toBe(false);
  });

  it('returns empty for unknown entry', () => {
    expect(engine.getQuizzesForEntry('nope')).toHaveLength(0);
  });
});

describe('getQuizzesForEntryAndTier', () => {
  const deps: ContentEngineDeps = {
    entries: [],
    quizzes: [q('q1', 'e1', 1), q('q2', 'e1', 2), q('q3', 'e1', 3)],
    curriculumMaps: [],
  };
  const engine = createContentEngine(deps);

  it('returns only quizzes matching both entry and tier', () => {
    expect(engine.getQuizzesForEntryAndTier('e1', 2).map(x => x.id)).toEqual(['q2']);
  });

  it('excludes quizzes of wrong tier', () => {
    expect(engine.getQuizzesForEntryAndTier('e1', 1)).toHaveLength(1);
  });

  it('returns empty when no match', () => {
    expect(engine.getQuizzesForEntryAndTier('e9', 1)).toHaveLength(0);
  });
});

describe('getMapsForEntry', () => {
  const deps: ContentEngineDeps = {
    entries: [],
    quizzes: [],
    curriculumMaps: [m('m1', 'e1', 'CCSS.1'), m('m2', 'e1', 'NGSS.1'), m('m3', 'e2', 'CCSS.2')],
  };
  const engine = createContentEngine(deps);

  it('returns all curriculum maps for the entry', () => {
    expect(engine.getMapsForEntry('e1').map(x => x.id)).toEqual(['m1', 'm2']);
  });

  it('returns empty for unknown entry', () => {
    expect(engine.getMapsForEntry('nope')).toHaveLength(0);
  });
});

describe('getEntriesForStandardCode', () => {
  const deps: ContentEngineDeps = {
    entries: [e('e1', 'w'), e('e2', 'w'), e('e3', 'w')],
    quizzes: [],
    curriculumMaps: [m('m1', 'e1', 'CCSS.MATH.1'), m('m2', 'e2', 'CCSS.MATH.1'), m('m3', 'e3', 'NGSS.X')],
  };
  const engine = createContentEngine(deps);

  it('returns entries linked to the standard code', () => {
    const ids = engine.getEntriesForStandardCode('CCSS.MATH.1').map(x => x.id);
    expect(ids).toEqual(['e1', 'e2']);
  });

  it('does not include entries linked to a different code', () => {
    expect(engine.getEntriesForStandardCode('CCSS.MATH.1').some(x => x.id === 'e3')).toBe(false);
  });

  it('returns empty for unknown standard code', () => {
    expect(engine.getEntriesForStandardCode('NO.CODE')).toHaveLength(0);
  });
});

describe('validatePrerequisites', () => {
  const deps: ContentEngineDeps = {
    entries: [
      e('a', 'w'),
      e('b', 'w', { prereqs: ['a'] }),
      e('c', 'w', { prereqs: ['a', 'b'] }),
    ],
    quizzes: [],
    curriculumMaps: [],
  };
  const engine = createContentEngine(deps);

  it('returns empty when no prerequisites', () => {
    expect(engine.validatePrerequisites([], 'a')).toHaveLength(0);
  });

  it('returns empty when all prerequisites completed', () => {
    expect(engine.validatePrerequisites(['a'], 'b')).toHaveLength(0);
  });

  it('returns missing prerequisites', () => {
    expect(engine.validatePrerequisites([], 'b')).toEqual(['a']);
  });

  it('returns only the unmet subset for multi-prereq entry', () => {
    expect(engine.validatePrerequisites(['a'], 'c')).toEqual(['b']);
  });

  it('returns empty for unknown target entry', () => {
    expect(engine.validatePrerequisites([], 'unknown')).toHaveLength(0);
  });
});

describe('getUnlockChain', () => {
  const deps: ContentEngineDeps = {
    entries: [
      e('a', 'w', { unlocks: ['b'] }),
      e('b', 'w', { unlocks: ['c'] }),
      e('c', 'w'),
      e('solo', 'w'),
    ],
    quizzes: [],
    curriculumMaps: [],
  };
  const engine = createContentEngine(deps);

  it('returns direct unlocks', () => {
    expect(engine.getUnlockChain('c')).toHaveLength(0);
  });

  it('returns transitively unlocked entries via BFS', () => {
    expect(engine.getUnlockChain('a')).toEqual(['b', 'c']);
  });

  it('does not include the start entry itself', () => {
    expect(engine.getUnlockChain('a')).not.toContain('a');
  });

  it('returns empty when entry has no unlocks', () => {
    expect(engine.getUnlockChain('solo')).toHaveLength(0);
  });

  it('handles cycles without infinite loop', () => {
    const cyclic: ContentEngineDeps = {
      entries: [e('x', 'w', { unlocks: ['y'] }), e('y', 'w', { unlocks: ['x'] })],
      quizzes: [],
      curriculumMaps: [],
    };
    const chain = createContentEngine(cyclic).getUnlockChain('x');
    expect(chain).toEqual(['y']);
  });
});

describe('getStats', () => {
  const deps: ContentEngineDeps = {
    entries: [
      e('a', 'world-1'),
      e('b', 'world-1'),
      e('c', 'world-2'),
      e('d', 'world-2', { status: 'draft' }),
    ],
    quizzes: [q('q1', 'a'), q('q2', 'a'), q('q3', 'b')],
    curriculumMaps: [m('m1', 'a', 'CCSS.1')],
  };
  const engine = createContentEngine(deps);
  const stats = engine.getStats();

  it('counts all entries including drafts', () => {
    expect(stats.totalEntries).toBe(4);
  });

  it('counts only published entries', () => {
    expect(stats.publishedEntries).toBe(3);
  });

  it('counts quiz questions', () => {
    expect(stats.totalQuizQuestions).toBe(3);
  });

  it('counts curriculum maps', () => {
    expect(stats.totalCurriculumMaps).toBe(1);
  });

  it('lists unique world IDs', () => {
    expect([...stats.worldIds].sort()).toEqual(['world-1', 'world-2']);
  });
});
