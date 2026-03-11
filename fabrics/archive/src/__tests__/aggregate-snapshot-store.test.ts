import { describe, it, expect, beforeEach } from 'vitest';
import type {
  AggregateSnapshotStoreState,
  Clock,
  IdGenerator,
  Logger,
} from '../aggregate-snapshot-store.js';
import {
  createAggregateSnapshotStoreState,
  saveSnapshot,
  getLatestSnapshot,
  getSnapshotAtVersion,
  listSnapshots,
  getSnapshotMetadata,
  deleteOldSnapshots,
  purgeAggregate,
} from '../aggregate-snapshot-store.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

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
      return 'snap-' + String(n);
    },
  };
}

function makeLogger(): Logger {
  return { info: () => undefined, error: () => undefined };
}

function sampleState(): Record<string, string | number | boolean | bigint | null> {
  return { balance: 500n, active: true, name: 'TestAgg' };
}

// ============================================================================
// TESTS: SAVE SNAPSHOT
// ============================================================================

describe('Aggregate Snapshot Store - Save', () => {
  let state: AggregateSnapshotStoreState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createAggregateSnapshotStoreState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
  });

  it('saves a snapshot and returns it', () => {
    const result = saveSnapshot(state, 'agg-1', 'Order', 5, sampleState(), idGen, clock, logger);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.aggregateId).toBe('agg-1');
      expect(result.aggregateType).toBe('Order');
      expect(result.version).toBe(5);
    }
  });

  it('stores snapshot in state', () => {
    const snap = saveSnapshot(state, 'agg-1', 'Order', 1, sampleState(), idGen, clock, logger);
    if (typeof snap === 'object') {
      expect(state.snapshots.has(snap.snapshotId)).toBe(true);
    }
  });

  it('returns invalid-version for negative version', () => {
    const result = saveSnapshot(state, 'agg-1', 'Order', -1, sampleState(), idGen, clock, logger);
    expect(result).toBe('invalid-version');
  });

  it('allows version 0', () => {
    const result = saveSnapshot(state, 'agg-1', 'Order', 0, sampleState(), idGen, clock, logger);
    expect(typeof result).toBe('object');
  });

  it('returns invalid-state for empty state object', () => {
    const result = saveSnapshot(state, 'agg-1', 'Order', 1, {}, idGen, clock, logger);
    expect(result).toBe('invalid-state');
  });

  it('does not require pre-registered aggregate', () => {
    const result = saveSnapshot(
      state,
      'brand-new-agg',
      'Order',
      3,
      sampleState(),
      idGen,
      clock,
      logger,
    );
    expect(typeof result).toBe('object');
  });

  it('can save multiple snapshots for same aggregate', () => {
    saveSnapshot(state, 'agg-1', 'Order', 1, sampleState(), idGen, clock, logger);
    saveSnapshot(state, 'agg-1', 'Order', 2, sampleState(), idGen, clock, logger);
    const snaps = listSnapshots(state, 'agg-1');
    expect(snaps.length).toBe(2);
  });
});

// ============================================================================
// TESTS: QUERIES
// ============================================================================

describe('Aggregate Snapshot Store - Queries', () => {
  let state: AggregateSnapshotStoreState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createAggregateSnapshotStoreState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
  });

  it('getLatestSnapshot returns undefined for unknown aggregate', () => {
    expect(getLatestSnapshot(state, 'ghost')).toBeUndefined();
  });

  it('getLatestSnapshot returns the highest version snapshot', () => {
    saveSnapshot(state, 'agg-1', 'Order', 1, sampleState(), idGen, clock, logger);
    saveSnapshot(state, 'agg-1', 'Order', 3, sampleState(), idGen, clock, logger);
    saveSnapshot(state, 'agg-1', 'Order', 2, sampleState(), idGen, clock, logger);
    const latest = getLatestSnapshot(state, 'agg-1');
    expect(latest?.version).toBe(3);
  });

  it('getSnapshotAtVersion returns undefined for unknown aggregate', () => {
    expect(getSnapshotAtVersion(state, 'ghost', 5)).toBeUndefined();
  });

  it('getSnapshotAtVersion returns highest version <= requested', () => {
    saveSnapshot(state, 'agg-1', 'Order', 2, sampleState(), idGen, clock, logger);
    saveSnapshot(state, 'agg-1', 'Order', 5, sampleState(), idGen, clock, logger);
    saveSnapshot(state, 'agg-1', 'Order', 8, sampleState(), idGen, clock, logger);
    const snap = getSnapshotAtVersion(state, 'agg-1', 6);
    expect(snap?.version).toBe(5);
  });

  it('getSnapshotAtVersion returns undefined when requested version is below all snapshots', () => {
    saveSnapshot(state, 'agg-1', 'Order', 5, sampleState(), idGen, clock, logger);
    expect(getSnapshotAtVersion(state, 'agg-1', 3)).toBeUndefined();
  });

  it('listSnapshots returns empty array for unknown aggregate', () => {
    expect(listSnapshots(state, 'ghost').length).toBe(0);
  });

  it('listSnapshots returns all snapshots', () => {
    saveSnapshot(state, 'agg-1', 'Order', 1, sampleState(), idGen, clock, logger);
    saveSnapshot(state, 'agg-1', 'Order', 2, sampleState(), idGen, clock, logger);
    expect(listSnapshots(state, 'agg-1').length).toBe(2);
  });

  it('getSnapshotMetadata returns undefined when no snapshots', () => {
    expect(getSnapshotMetadata(state, 'ghost')).toBeUndefined();
  });

  it('getSnapshotMetadata returns correct metadata', () => {
    saveSnapshot(state, 'agg-1', 'Order', 1, sampleState(), idGen, clock, logger);
    saveSnapshot(state, 'agg-1', 'Order', 3, sampleState(), idGen, clock, logger);
    const meta = getSnapshotMetadata(state, 'agg-1');
    expect(meta?.aggregateId).toBe('agg-1');
    expect(meta?.snapshotCount).toBe(2);
    expect(meta?.latestVersion).toBe(3);
    expect(meta?.oldestSnapshotAt).not.toBeNull();
    expect(meta?.latestSnapshotAt).not.toBeNull();
  });
});

// ============================================================================
// TESTS: PRUNING
// ============================================================================

describe('Aggregate Snapshot Store - Pruning', () => {
  let state: AggregateSnapshotStoreState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createAggregateSnapshotStoreState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
  });

  it('deleteOldSnapshots keeps only the N most recent by version', () => {
    saveSnapshot(state, 'agg-1', 'Order', 1, sampleState(), idGen, clock, logger);
    saveSnapshot(state, 'agg-1', 'Order', 2, sampleState(), idGen, clock, logger);
    saveSnapshot(state, 'agg-1', 'Order', 3, sampleState(), idGen, clock, logger);
    saveSnapshot(state, 'agg-1', 'Order', 4, sampleState(), idGen, clock, logger);
    const result = deleteOldSnapshots(state, 'agg-1', 2);
    expect(result.success).toBe(true);
    expect(result.deleted).toBe(2);
    const remaining = listSnapshots(state, 'agg-1');
    expect(remaining.length).toBe(2);
    expect(remaining.every((s) => s.version >= 3)).toBe(true);
  });

  it('deleteOldSnapshots returns 0 deleted when count is within keepCount', () => {
    saveSnapshot(state, 'agg-1', 'Order', 1, sampleState(), idGen, clock, logger);
    const result = deleteOldSnapshots(state, 'agg-1', 5);
    expect(result.deleted).toBe(0);
  });

  it('deleteOldSnapshots returns 0 for unknown aggregate', () => {
    const result = deleteOldSnapshots(state, 'ghost', 3);
    expect(result.deleted).toBe(0);
  });

  it('purgeAggregate removes all snapshots', () => {
    saveSnapshot(state, 'agg-1', 'Order', 1, sampleState(), idGen, clock, logger);
    saveSnapshot(state, 'agg-1', 'Order', 2, sampleState(), idGen, clock, logger);
    const result = purgeAggregate(state, 'agg-1');
    expect(result.success).toBe(true);
    expect(result.deleted).toBe(2);
    expect(listSnapshots(state, 'agg-1').length).toBe(0);
  });

  it('purgeAggregate returns 0 for unknown aggregate', () => {
    const result = purgeAggregate(state, 'ghost');
    expect(result.deleted).toBe(0);
  });
});
