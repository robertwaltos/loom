import { describe, it, expect, beforeEach } from 'vitest';
import type { ReplicationLogState, Clock, IdGenerator, Logger } from '../replication-log.js';
import {
  createReplicationLogState,
  registerNode,
  logReplication,
  startReplication,
  completeReplication,
  failReplication,
  retryReplication,
  getNodeHealth,
  getEntry,
  listEntries,
  getStats,
} from '../replication-log.js';

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
      return 'rep-' + String(n);
    },
  };
}

function makeLogger(): Logger {
  return { info: () => undefined, error: () => undefined };
}

function setupTwoNodes(state: ReplicationLogState): void {
  registerNode(state, 'node-A');
  registerNode(state, 'node-B');
}

// ============================================================================
// TESTS: NODE REGISTRATION
// ============================================================================

describe('ReplicationLog - Node Registration', () => {
  let state: ReplicationLogState;

  beforeEach(() => {
    state = createReplicationLogState();
  });

  it('registers a node successfully', () => {
    const result = registerNode(state, 'node-A');
    expect(result).toEqual({ success: true });
  });

  it('rejects duplicate node registration', () => {
    registerNode(state, 'node-A');
    const result = registerNode(state, 'node-A');
    expect(result).toEqual({ success: false, error: 'already-registered' });
  });

  it('allows multiple distinct nodes', () => {
    expect(registerNode(state, 'node-A')).toEqual({ success: true });
    expect(registerNode(state, 'node-B')).toEqual({ success: true });
    expect(registerNode(state, 'node-C')).toEqual({ success: true });
  });

  it('getNodeHealth returns undefined for unregistered node', () => {
    expect(getNodeHealth(state, 'unknown')).toBeUndefined();
  });

  it('new node has zero metrics', () => {
    registerNode(state, 'node-A');
    const health = getNodeHealth(state, 'node-A');
    expect(health?.totalReplications).toBe(0);
    expect(health?.successCount).toBe(0);
    expect(health?.failureCount).toBe(0);
    expect(health?.successRate).toBe(0);
    expect(health?.lastActivityAt).toBeNull();
  });
});

// ============================================================================
// TESTS: LOG REPLICATION VALIDATION
// ============================================================================

describe('ReplicationLog - Log Replication Validation', () => {
  let state: ReplicationLogState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createReplicationLogState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
    setupTwoNodes(state);
  });

  it('rejects dataSizeBytes of zero', () => {
    const result = logReplication(state, 'node-A', 'node-B', 'key', 0n, idGen, clock, logger);
    expect(result).toBe('invalid-size');
  });

  it('rejects unknown source node', () => {
    const result = logReplication(state, 'ghost', 'node-B', 'key', 100n, idGen, clock, logger);
    expect(result).toBe('node-not-found');
  });

  it('rejects unknown target node', () => {
    const result = logReplication(state, 'node-A', 'ghost', 'key', 100n, idGen, clock, logger);
    expect(result).toBe('node-not-found');
  });

  it('creates a PENDING entry on success', () => {
    const result = logReplication(
      state,
      'node-A',
      'node-B',
      'archive/data.bin',
      512n,
      idGen,
      clock,
      logger,
    );
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.status).toBe('PENDING');
      expect(result.dataKey).toBe('archive/data.bin');
      expect(result.dataSizeBytes).toBe(512n);
      expect(result.retryCount).toBe(0);
    }
  });
});

// ============================================================================
// TESTS: STATUS TRANSITIONS
// ============================================================================

describe('ReplicationLog - Status Transitions', () => {
  let state: ReplicationLogState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createReplicationLogState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
    setupTwoNodes(state);
  });

  it('PENDING -> IN_PROGRESS via startReplication', () => {
    const entry = logReplication(state, 'node-A', 'node-B', 'key', 100n, idGen, clock, logger);
    if (typeof entry !== 'object') throw new Error('expected entry');
    const r = startReplication(state, entry.replicationId, clock);
    expect(r).toEqual({ success: true });
    expect(getEntry(state, entry.replicationId)?.status).toBe('IN_PROGRESS');
  });

  it('IN_PROGRESS -> COMPLETED via completeReplication', () => {
    const entry = logReplication(state, 'node-A', 'node-B', 'key', 100n, idGen, clock, logger);
    if (typeof entry !== 'object') throw new Error('expected entry');
    startReplication(state, entry.replicationId, clock);
    const r = completeReplication(state, entry.replicationId, clock);
    expect(r).toEqual({ success: true });
    expect(getEntry(state, entry.replicationId)?.status).toBe('COMPLETED');
    expect(getEntry(state, entry.replicationId)?.completedAt).not.toBeNull();
  });

  it('IN_PROGRESS -> FAILED via failReplication', () => {
    const entry = logReplication(state, 'node-A', 'node-B', 'key', 100n, idGen, clock, logger);
    if (typeof entry !== 'object') throw new Error('expected entry');
    startReplication(state, entry.replicationId, clock);
    const r = failReplication(state, entry.replicationId, 'timeout', clock);
    expect(r).toEqual({ success: true });
    expect(getEntry(state, entry.replicationId)?.status).toBe('FAILED');
    expect(getEntry(state, entry.replicationId)?.errorMessage).toBe('timeout');
  });

  it('startReplication returns error for unknown id', () => {
    const r = startReplication(state, 'ghost', clock);
    expect(r).toEqual({ success: false, error: 'replication-not-found' });
  });

  it('completeReplication returns error for non-IN_PROGRESS entry', () => {
    const entry = logReplication(state, 'node-A', 'node-B', 'key', 100n, idGen, clock, logger);
    if (typeof entry !== 'object') throw new Error('expected entry');
    const r = completeReplication(state, entry.replicationId, clock);
    expect(r).toEqual({ success: false, error: 'replication-not-found' });
  });
});

describe('ReplicationLog - Retry Transitions', () => {
  let state: ReplicationLogState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createReplicationLogState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
    setupTwoNodes(state);
  });

  it('FAILED -> RETRYING via retryReplication and increments retryCount', () => {
    const entry = logReplication(state, 'node-A', 'node-B', 'key', 100n, idGen, clock, logger);
    if (typeof entry !== 'object') throw new Error('expected entry');
    startReplication(state, entry.replicationId, clock);
    failReplication(state, entry.replicationId, 'err', clock);
    retryReplication(state, entry.replicationId);
    const updated = getEntry(state, entry.replicationId);
    expect(updated?.status).toBe('RETRYING');
    expect(updated?.retryCount).toBe(1);
  });

  it('RETRYING -> IN_PROGRESS via startReplication again', () => {
    const entry = logReplication(state, 'node-A', 'node-B', 'key', 100n, idGen, clock, logger);
    if (typeof entry !== 'object') throw new Error('expected entry');
    startReplication(state, entry.replicationId, clock);
    failReplication(state, entry.replicationId, 'err', clock);
    retryReplication(state, entry.replicationId);
    startReplication(state, entry.replicationId, clock);
    expect(getEntry(state, entry.replicationId)?.status).toBe('IN_PROGRESS');
  });
});

// ============================================================================
// TESTS: NODE HEALTH & STATS
// ============================================================================

describe('ReplicationLog - Node Health and Stats', () => {
  let state: ReplicationLogState;
  let clock: Clock;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createReplicationLogState();
    clock = makeClock();
    idGen = makeIdGen();
    logger = makeLogger();
    setupTwoNodes(state);
  });

  it('successRate is 1.0 after completing all replications', () => {
    const e = logReplication(state, 'node-A', 'node-B', 'key', 100n, idGen, clock, logger);
    if (typeof e !== 'object') throw new Error('expected entry');
    startReplication(state, e.replicationId, clock);
    completeReplication(state, e.replicationId, clock);
    const health = getNodeHealth(state, 'node-B');
    expect(health?.successRate).toBe(1);
  });

  it('stats counts COMPLETED bytes only', () => {
    const e1 = logReplication(state, 'node-A', 'node-B', 'k1', 200n, idGen, clock, logger);
    const e2 = logReplication(state, 'node-A', 'node-B', 'k2', 100n, idGen, clock, logger);
    if (typeof e1 !== 'object' || typeof e2 !== 'object') throw new Error('expected entries');
    startReplication(state, e1.replicationId, clock);
    completeReplication(state, e1.replicationId, clock);
    const stats = getStats(state);
    expect(stats.totalBytesReplicated).toBe(200n);
    expect(stats.completedCount).toBe(1);
    expect(stats.pendingCount).toBe(1);
  });

  it('listEntries filters by status', () => {
    const e1 = logReplication(state, 'node-A', 'node-B', 'k1', 100n, idGen, clock, logger);
    if (typeof e1 !== 'object') throw new Error('expected entry');
    startReplication(state, e1.replicationId, clock);
    completeReplication(state, e1.replicationId, clock);
    logReplication(state, 'node-A', 'node-B', 'k2', 100n, idGen, clock, logger);
    const completed = listEntries(state, undefined, 'COMPLETED');
    expect(completed.length).toBe(1);
    expect(completed[0]?.status).toBe('COMPLETED');
  });

  it('listEntries filters by nodeId', () => {
    registerNode(state, 'node-C');
    logReplication(state, 'node-A', 'node-B', 'k1', 100n, idGen, clock, logger);
    logReplication(state, 'node-A', 'node-C', 'k2', 100n, idGen, clock, logger);
    const forB = listEntries(state, 'node-B');
    expect(forB.length).toBe(1);
    expect(forB[0]?.targetNodeId).toBe('node-B');
  });
});
