import { describe, it, expect, beforeEach } from 'vitest';
import type {
  QueryIndexState,
  Clock,
  IdGenerator,
  Logger,
  IndexField,
  QueryFilter,
} from '../query-index.js';
import {
  createQueryIndexState,
  createIndex,
  getIndexStats,
  listIndexes,
  insertRecord,
  updateRecord,
  deleteRecord,
  getRecord,
  query,
} from '../query-index.js';

function makeClock(): Clock {
  let time = 1_000_000n;
  return {
    now: () => {
      time = time + 1000n;
      return time;
    },
  };
}

function makeIdGen(): IdGenerator {
  let n = 0;
  return {
    generate: () => {
      n = n + 1;
      return 'idx-' + String(n);
    },
  };
}

function makeLogger(): Logger {
  return { info: () => undefined, error: () => undefined };
}

const PLAYER_FIELDS: ReadonlyArray<IndexField> = [
  { fieldName: 'name', fieldType: 'STRING' },
  { fieldName: 'score', fieldType: 'NUMBER' },
  { fieldName: 'active', fieldType: 'BOOLEAN' },
];

// ============================================================================
// TESTS: INDEX MANAGEMENT
// ============================================================================

describe('Query Index - Index Management', () => {
  let state: QueryIndexState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createQueryIndexState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
  });

  it('creates an index and returns IndexStats', () => {
    const result = createIndex(state, 'players', PLAYER_FIELDS, idGen, clock, logger);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.name).toBe('players');
      expect(result.fieldCount).toBe(3);
      expect(result.recordCount).toBe(0);
    }
  });

  it('returns already-exists for duplicate index name', () => {
    createIndex(state, 'players', PLAYER_FIELDS, idGen, clock, logger);
    const result = createIndex(state, 'players', PLAYER_FIELDS, idGen, clock, logger);
    expect(result).toBe('already-exists');
  });

  it('getIndexStats returns undefined for unknown indexId', () => {
    expect(getIndexStats(state, 'unknown')).toBeUndefined();
  });

  it('getIndexStats returns stats for known index', () => {
    const created = createIndex(state, 'players', PLAYER_FIELDS, idGen, clock, logger);
    if (typeof created === 'object') {
      const stats = getIndexStats(state, created.indexId);
      expect(stats?.name).toBe('players');
    }
  });

  it('listIndexes returns empty array when no indexes', () => {
    expect(listIndexes(state).length).toBe(0);
  });

  it('listIndexes returns all created indexes', () => {
    createIndex(state, 'players', PLAYER_FIELDS, idGen, clock, logger);
    createIndex(state, 'guilds', [{ fieldName: 'tag', fieldType: 'STRING' }], idGen, clock, logger);
    expect(listIndexes(state).length).toBe(2);
  });
});

// ============================================================================
// TESTS: RECORD INSERTION
// ============================================================================

describe('Query Index - Record Insertion', () => {
  let state: QueryIndexState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;
  let indexId: string;

  beforeEach(() => {
    state = createQueryIndexState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
    const idx = createIndex(state, 'players', PLAYER_FIELDS, idGen, clock, logger);
    indexId = typeof idx === 'object' ? idx.indexId : '';
  });

  it('inserts a record successfully', () => {
    const result = insertRecord(
      state,
      indexId,
      'p1',
      { name: 'Alice', score: 100, active: true },
      clock,
      logger,
    );
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.recordId).toBe('p1');
      expect(result.fields.get('name')).toBe('Alice');
    }
  });

  it('returns index-not-found for unknown indexId', () => {
    const result = insertRecord(
      state,
      'ghost',
      'p1',
      { name: 'Alice', score: 100, active: true },
      clock,
      logger,
    );
    expect(result).toBe('index-not-found');
  });

  it('returns already-exists for duplicate recordId', () => {
    insertRecord(state, indexId, 'p1', { name: 'Alice', score: 100, active: true }, clock, logger);
    const result = insertRecord(
      state,
      indexId,
      'p1',
      { name: 'Bob', score: 200, active: false },
      clock,
      logger,
    );
    expect(result).toBe('already-exists');
  });

  it('returns field-not-found when required field is missing', () => {
    const partial = { name: 'Alice', score: 100 } as Record<
      string,
      string | number | boolean | bigint
    >;
    const result = insertRecord(state, indexId, 'p1', partial, clock, logger);
    expect(result).toBe('field-not-found');
  });

  it('getRecord returns inserted record', () => {
    insertRecord(state, indexId, 'p1', { name: 'Alice', score: 100, active: true }, clock, logger);
    const record = getRecord(state, indexId, 'p1');
    expect(record?.recordId).toBe('p1');
  });

  it('getRecord returns undefined for unknown record', () => {
    expect(getRecord(state, indexId, 'ghost')).toBeUndefined();
  });
});

// ============================================================================
// TESTS: RECORD UPDATE & DELETE
// ============================================================================

describe('Query Index - Record Update and Delete', () => {
  let state: QueryIndexState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;
  let indexId: string;

  beforeEach(() => {
    state = createQueryIndexState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
    const idx = createIndex(state, 'players', PLAYER_FIELDS, idGen, clock, logger);
    indexId = typeof idx === 'object' ? idx.indexId : '';
    insertRecord(state, indexId, 'p1', { name: 'Alice', score: 100, active: true }, clock, logger);
  });

  it('updates a record successfully', () => {
    const result = updateRecord(
      state,
      indexId,
      'p1',
      { name: 'Alice', score: 200, active: false },
      clock,
      logger,
    );
    expect(typeof result).toBe('object');
    if (typeof result === 'object') expect(result.fields.get('score')).toBe(200);
  });

  it('returns record-not-found when updating missing record', () => {
    const result = updateRecord(
      state,
      indexId,
      'ghost',
      { name: 'X', score: 1, active: true },
      clock,
      logger,
    );
    expect(result).toBe('record-not-found');
  });

  it('returns index-not-found when updating in unknown index', () => {
    const result = updateRecord(
      state,
      'bad-idx',
      'p1',
      { name: 'X', score: 1, active: true },
      clock,
      logger,
    );
    expect(result).toBe('index-not-found');
  });

  it('deletes a record successfully', () => {
    const result = deleteRecord(state, indexId, 'p1');
    expect(result.success).toBe(true);
    expect(getRecord(state, indexId, 'p1')).toBeUndefined();
  });

  it('returns error when deleting from unknown index', () => {
    const result = deleteRecord(state, 'bad-idx', 'p1');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('index-not-found');
  });

  it('returns error when deleting unknown record', () => {
    const result = deleteRecord(state, indexId, 'ghost');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('record-not-found');
  });
});

// ============================================================================
// TESTS: QUERY — BASIC
// ============================================================================

describe('Query Index - Query (basic)', () => {
  let state: QueryIndexState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;
  let indexId: string;

  beforeEach(() => {
    state = createQueryIndexState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
    const idx = createIndex(state, 'players', PLAYER_FIELDS, idGen, clock, logger);
    indexId = typeof idx === 'object' ? idx.indexId : '';
    insertRecord(state, indexId, 'p1', { name: 'Alice', score: 100, active: true }, clock, logger);
    insertRecord(state, indexId, 'p2', { name: 'Bob', score: 200, active: false }, clock, logger);
    insertRecord(
      state,
      indexId,
      'p3',
      { name: 'Alice-Prime', score: 50, active: true },
      clock,
      logger,
    );
  });

  it('returns index-not-found for unknown indexId', () => {
    expect(query(state, 'ghost', [], clock)).toBe('index-not-found');
  });

  it('returns all records when no filters', () => {
    const result = query(state, indexId, [], clock);
    if (typeof result === 'object') expect(result.totalCount).toBe(3);
  });

  it('filters by EQ on string field', () => {
    const filters: QueryFilter[] = [{ field: 'name', operator: 'EQ', value: 'Alice' }];
    const result = query(state, indexId, filters, clock);
    if (typeof result === 'object') {
      expect(result.totalCount).toBe(1);
      expect(result.records[0]?.recordId).toBe('p1');
    }
  });

  it('filters by EQ on boolean field', () => {
    const filters: QueryFilter[] = [{ field: 'active', operator: 'EQ', value: true }];
    const result = query(state, indexId, filters, clock);
    if (typeof result === 'object') expect(result.totalCount).toBe(2);
  });

  it('includes executedAt timestamp in result', () => {
    const result = query(state, indexId, [], clock);
    if (typeof result === 'object') expect(typeof result.executedAt).toBe('bigint');
  });
});

// ============================================================================
// TESTS: QUERY — OPERATORS
// ============================================================================

describe('Query Index - Query (operators)', () => {
  let state: QueryIndexState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;
  let indexId: string;

  beforeEach(() => {
    state = createQueryIndexState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
    const idx = createIndex(state, 'players', PLAYER_FIELDS, idGen, clock, logger);
    indexId = typeof idx === 'object' ? idx.indexId : '';
    insertRecord(state, indexId, 'p1', { name: 'Alice', score: 100, active: true }, clock, logger);
    insertRecord(state, indexId, 'p2', { name: 'Bob', score: 200, active: false }, clock, logger);
    insertRecord(
      state,
      indexId,
      'p3',
      { name: 'Alice-Prime', score: 50, active: true },
      clock,
      logger,
    );
  });

  it('filters by GT on number field', () => {
    const filters: QueryFilter[] = [{ field: 'score', operator: 'GT', value: 100 }];
    const result = query(state, indexId, filters, clock);
    if (typeof result === 'object') {
      expect(result.totalCount).toBe(1);
      expect(result.records[0]?.recordId).toBe('p2');
    }
  });

  it('filters by LT on number field', () => {
    const filters: QueryFilter[] = [{ field: 'score', operator: 'LT', value: 100 }];
    const result = query(state, indexId, filters, clock);
    if (typeof result === 'object') {
      expect(result.totalCount).toBe(1);
      expect(result.records[0]?.recordId).toBe('p3');
    }
  });

  it('filters by CONTAINS on string field (case-insensitive)', () => {
    const filters: QueryFilter[] = [{ field: 'name', operator: 'CONTAINS', value: 'alice' }];
    const result = query(state, indexId, filters, clock);
    if (typeof result === 'object') expect(result.totalCount).toBe(2);
  });

  it('ANDs multiple filters together', () => {
    const filters: QueryFilter[] = [
      { field: 'active', operator: 'EQ', value: true },
      { field: 'score', operator: 'GT', value: 60 },
    ];
    const result = query(state, indexId, filters, clock);
    if (typeof result === 'object') {
      expect(result.totalCount).toBe(1);
      expect(result.records[0]?.recordId).toBe('p1');
    }
  });

  it('CONTAINS on non-string field returns no match', () => {
    const filters: QueryFilter[] = [{ field: 'score', operator: 'CONTAINS', value: 100 }];
    const result = query(state, indexId, filters, clock);
    if (typeof result === 'object') expect(result.totalCount).toBe(0);
  });

  it('filter on missing field returns no matches', () => {
    const filters: QueryFilter[] = [{ field: 'nonexistent', operator: 'EQ', value: 'x' }];
    const result = query(state, indexId, filters, clock);
    if (typeof result === 'object') expect(result.totalCount).toBe(0);
  });
});
