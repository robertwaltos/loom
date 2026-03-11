import { describe, it, expect, beforeEach } from 'vitest';
import type { WorldHistoryIndexState, Clock, IdGenerator, Logger } from '../world-history-index.js';
import {
  createWorldHistoryIndexState,
  registerWorld,
  addRecord,
  getRecord,
  deleteRecord,
  searchHistory,
  getMilestones,
  getWorldIndex,
} from '../world-history-index.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function makeClock(): Clock {
  let t = 1_000_000n;
  return {
    now: () => {
      t += 1000n;
      return t;
    },
  };
}

function makeIdGen(): IdGenerator {
  let n = 0;
  return { generate: () => 'rec-' + String(++n) };
}

function makeLogger(): Logger {
  return { info: () => undefined, warn: () => undefined };
}

function makeDeps() {
  return { clock: makeClock(), idGen: makeIdGen(), logger: makeLogger() };
}

// ============================================================================
// WORLD REGISTRATION
// ============================================================================

describe('WorldHistoryIndex — world registration', () => {
  let state: WorldHistoryIndexState;

  beforeEach(() => {
    state = createWorldHistoryIndexState(makeDeps());
  });

  it('registers a world successfully', () => {
    const result = registerWorld(state, 'world-alpha');
    expect(result).toEqual({ success: true });
  });

  it('rejects duplicate world registration', () => {
    registerWorld(state, 'world-alpha');
    const result = registerWorld(state, 'world-alpha');
    expect(result).toEqual({ success: false, error: 'already-registered' });
  });

  it('registers multiple distinct worlds', () => {
    expect(registerWorld(state, 'world-a')).toEqual({ success: true });
    expect(registerWorld(state, 'world-b')).toEqual({ success: true });
  });
});

// ============================================================================
// RECORD MANAGEMENT
// ============================================================================

describe('WorldHistoryIndex — record management', () => {
  let state: WorldHistoryIndexState;

  beforeEach(() => {
    state = createWorldHistoryIndexState(makeDeps());
    registerWorld(state, 'world-alpha');
  });

  it('adds a record to a registered world', () => {
    const result = addRecord(state, 'world-alpha', 'POLITICAL', 'Election', 'Summary', 5, 1000n, [
      'tag1',
    ]);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.worldId).toBe('world-alpha');
      expect(result.category).toBe('POLITICAL');
      expect(result.significance).toBe(5);
    }
  });

  it('returns world-not-found for unregistered world', () => {
    const result = addRecord(state, 'unknown', 'MILITARY', 'Battle', 'Desc', 7, 1000n, []);
    expect(result).toBe('world-not-found');
  });

  it('rejects significance < 1', () => {
    const result = addRecord(state, 'world-alpha', 'ECONOMIC', 'Trade', 'Desc', 0, 1000n, []);
    expect(result).toBe('invalid-date');
  });

  it('rejects significance > 10', () => {
    const result = addRecord(state, 'world-alpha', 'ECONOMIC', 'Trade', 'Desc', 11, 1000n, []);
    expect(result).toBe('invalid-date');
  });

  it('rejects negative occurredAt', () => {
    const result = addRecord(state, 'world-alpha', 'NATURAL', 'Flood', 'Desc', 5, -1n, []);
    expect(result).toBe('invalid-date');
  });

  it('retrieves a record by id', () => {
    const rec = addRecord(state, 'world-alpha', 'CULTURAL', 'Festival', 'Desc', 3, 500n, [
      'culture',
    ]);
    if (typeof rec !== 'string') {
      const fetched = getRecord(state, rec.recordId);
      expect(fetched?.title).toBe('Festival');
    }
  });

  it('returns undefined for unknown record id', () => {
    expect(getRecord(state, 'nonexistent')).toBeUndefined();
  });

  it('deletes a record', () => {
    const rec = addRecord(state, 'world-alpha', 'MILITARY', 'War', 'Desc', 8, 1000n, []);
    if (typeof rec !== 'string') {
      const del = deleteRecord(state, rec.recordId);
      expect(del).toEqual({ success: true });
      expect(getRecord(state, rec.recordId)).toBeUndefined();
    }
  });

  it('returns record-not-found when deleting unknown id', () => {
    const result = deleteRecord(state, 'ghost-id');
    expect(result).toEqual({ success: false, error: 'record-not-found' });
  });
});

// ============================================================================
// SEARCH
// ============================================================================

describe('WorldHistoryIndex — searchHistory', () => {
  let state: WorldHistoryIndexState;

  beforeEach(() => {
    state = createWorldHistoryIndexState(makeDeps());
    registerWorld(state, 'world-alpha');
    registerWorld(state, 'world-beta');
    addRecord(state, 'world-alpha', 'POLITICAL', 'Coup', 'A coup', 9, 3000n, [
      'politics',
      'violence',
    ]);
    addRecord(state, 'world-alpha', 'ECONOMIC', 'Boom', 'Economic', 4, 1000n, ['trade']);
    addRecord(state, 'world-beta', 'MILITARY', 'Siege', 'A siege', 7, 2000n, ['war']);
  });

  it('returns all records when no filters', () => {
    const results = searchHistory(state, {}, 100);
    expect(results).toHaveLength(3);
  });

  it('filters by worldId', () => {
    const results = searchHistory(state, { worldId: 'world-alpha' }, 100);
    expect(results).toHaveLength(2);
  });

  it('filters by category', () => {
    const results = searchHistory(state, { category: 'MILITARY' }, 100);
    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe('Siege');
  });

  it('filters by minSignificance', () => {
    const results = searchHistory(state, { minSignificance: 7 }, 100);
    expect(results).toHaveLength(2);
  });

  it('filters by tags — requires ALL tags', () => {
    const results = searchHistory(state, { tags: ['politics', 'violence'] }, 100);
    expect(results).toHaveLength(1);
  });

  it('returns nothing if tag not matched', () => {
    const results = searchHistory(state, { tags: ['nonexistent-tag'] }, 100);
    expect(results).toHaveLength(0);
  });

  it('filters by fromTime and toTime', () => {
    const results = searchHistory(state, { fromTime: 2000n, toTime: 3000n }, 100);
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('sorts results by occurredAt descending', () => {
    const results = searchHistory(state, {}, 100);
    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1];
      const curr = results[i];
      if (prev !== undefined && curr !== undefined) {
        expect(prev.occurredAt >= curr.occurredAt).toBe(true);
      }
    }
  });

  it('respects limit', () => {
    const results = searchHistory(state, {}, 2);
    expect(results).toHaveLength(2);
  });
});

// ============================================================================
// MILESTONES
// ============================================================================

describe('WorldHistoryIndex — getMilestones', () => {
  let state: WorldHistoryIndexState;

  beforeEach(() => {
    state = createWorldHistoryIndexState(makeDeps());
    registerWorld(state, 'world-alpha');
    addRecord(state, 'world-alpha', 'NATURAL', 'Volcano', 'Desc', 10, 1000n, []);
    addRecord(state, 'world-alpha', 'CULTURAL', 'Art', 'Desc', 2, 2000n, []);
    addRecord(state, 'world-alpha', 'POLITICAL', 'Reform', 'Desc', 7, 3000n, []);
  });

  it('returns top N by significance descending', () => {
    const milestones = getMilestones(state, 'world-alpha', 2);
    expect(milestones).toHaveLength(2);
    expect(milestones[0]?.significance).toBe(10);
    expect(milestones[1]?.significance).toBe(7);
  });

  it('returns empty for unregistered world', () => {
    const milestones = getMilestones(state, 'unknown', 5);
    expect(milestones).toHaveLength(0);
  });
});

// ============================================================================
// WORLD INDEX
// ============================================================================

describe('WorldHistoryIndex — getWorldIndex', () => {
  let state: WorldHistoryIndexState;

  beforeEach(() => {
    state = createWorldHistoryIndexState(makeDeps());
    registerWorld(state, 'world-alpha');
    addRecord(state, 'world-alpha', 'POLITICAL', 'Event1', 'Desc', 6, 1000n, []);
    addRecord(state, 'world-alpha', 'POLITICAL', 'Event2', 'Desc', 4, 2000n, []);
    addRecord(state, 'world-alpha', 'MILITARY', 'Battle', 'Desc', 8, 3000n, []);
  });

  it('returns correct totalRecords', () => {
    const index = getWorldIndex(state, 'world-alpha');
    expect(index?.totalRecords).toBe(3);
  });

  it('returns correct byCategory counts', () => {
    const index = getWorldIndex(state, 'world-alpha');
    expect(index?.byCategory.POLITICAL).toBe(2);
    expect(index?.byCategory.MILITARY).toBe(1);
    expect(index?.byCategory.ECONOMIC).toBe(0);
  });

  it('returns correct averageSignificance', () => {
    const index = getWorldIndex(state, 'world-alpha');
    expect(index?.averageSignificance).toBeCloseTo((6 + 4 + 8) / 3);
  });

  it('returns 0 averageSignificance for empty world', () => {
    registerWorld(state, 'empty-world');
    const index = getWorldIndex(state, 'empty-world');
    expect(index?.averageSignificance).toBe(0);
  });

  it('returns undefined for unregistered world', () => {
    expect(getWorldIndex(state, 'ghost')).toBeUndefined();
  });
});
