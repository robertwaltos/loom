import { describe, it, expect, beforeEach } from 'vitest';
import type { RetentionPolicyV2State, Clock, IdGenerator, Logger } from '../retention-policy-v2.js';
import {
  createRetentionPolicyV2State,
  createPolicy,
  deactivatePolicy,
  addRecord,
  enforcePolicy,
  getPolicy,
  listPolicies,
  listRecords,
  getPolicyStats,
} from '../retention-policy-v2.js';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function makeClock(start = 1_000_000n): { clock: Clock; advance: (us: bigint) => void } {
  let time = start;
  return {
    clock: { now: () => time },
    advance: (us: bigint) => {
      time = time + us;
    },
  };
}

function makeIdGen(): IdGenerator {
  let n = 0;
  return {
    generate: () => {
      n = n + 1;
      return 'obj-' + String(n);
    },
  };
}

function makeLogger(): Logger {
  return { info: () => undefined, error: () => undefined };
}

// ============================================================================
// TESTS: POLICY CREATION
// ============================================================================

describe('RetentionPolicyV2 - Policy Creation', () => {
  let state: RetentionPolicyV2State;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createRetentionPolicyV2State();
    idGen = makeIdGen();
    logger = makeLogger();
  });

  it('creates a policy successfully', () => {
    const { clock } = makeClock();
    const result = createPolicy(state, 'events', 1_000_000n, null, 'DELETE', idGen, clock, logger);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.recordType).toBe('events');
      expect(result.action).toBe('DELETE');
      expect(result.active).toBe(true);
      expect(result.maxCount).toBeNull();
    }
  });

  it('rejects maxAgeUs of zero', () => {
    const { clock } = makeClock();
    const result = createPolicy(state, 'events', 0n, null, 'DELETE', idGen, clock, logger);
    expect(result).toBe('invalid-duration');
  });

  it('rejects duplicate recordType', () => {
    const { clock } = makeClock();
    createPolicy(state, 'events', 1_000_000n, null, 'DELETE', idGen, clock, logger);
    const result = createPolicy(state, 'events', 2_000_000n, null, 'ARCHIVE', idGen, clock, logger);
    expect(result).toBe('already-exists');
  });

  it('allows different record types', () => {
    const { clock } = makeClock();
    const r1 = createPolicy(state, 'events', 1_000_000n, null, 'DELETE', idGen, clock, logger);
    const r2 = createPolicy(state, 'logs', 2_000_000n, null, 'ARCHIVE', idGen, clock, logger);
    expect(typeof r1).toBe('object');
    expect(typeof r2).toBe('object');
  });

  it('getPolicy returns undefined for unknown id', () => {
    expect(getPolicy(state, 'missing')).toBeUndefined();
  });

  it('deactivatePolicy returns error for unknown id', () => {
    const result = deactivatePolicy(state, 'ghost');
    expect(result).toEqual({ success: false, error: 'policy-not-found' });
  });
});

describe('RetentionPolicyV2 - Policy Deactivation and Listing', () => {
  let state: RetentionPolicyV2State;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createRetentionPolicyV2State();
    idGen = makeIdGen();
    logger = makeLogger();
  });

  it('deactivatePolicy sets active to false', () => {
    const { clock } = makeClock();
    const policy = createPolicy(state, 'events', 1_000_000n, null, 'DELETE', idGen, clock, logger);
    if (typeof policy !== 'object') throw new Error('expected policy');
    deactivatePolicy(state, policy.policyId);
    expect(getPolicy(state, policy.policyId)?.active).toBe(false);
  });

  it('listPolicies filters by active flag', () => {
    const { clock } = makeClock();
    const p1 = createPolicy(state, 'events', 1_000_000n, null, 'DELETE', idGen, clock, logger);
    const p2 = createPolicy(state, 'logs', 1_000_000n, null, 'ARCHIVE', idGen, clock, logger);
    if (typeof p1 !== 'object' || typeof p2 !== 'object') throw new Error();
    deactivatePolicy(state, p1.policyId);
    expect(listPolicies(state, true).length).toBe(1);
    expect(listPolicies(state, false).length).toBe(1);
    expect(listPolicies(state).length).toBe(2);
  });
});

// ============================================================================
// TESTS: RECORD MANAGEMENT
// ============================================================================

describe('RetentionPolicyV2 - Record Management', () => {
  let state: RetentionPolicyV2State;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createRetentionPolicyV2State();
    idGen = makeIdGen();
    logger = makeLogger();
  });

  it('addRecord rejects unknown record type', () => {
    const { clock } = makeClock();
    const result = addRecord(state, 'logs', 512n, idGen, clock);
    expect(result).toBe('record-type-not-found');
  });

  it('addRecord creates record for known type', () => {
    const { clock } = makeClock();
    createPolicy(state, 'events', 1_000_000n, null, 'DELETE', idGen, clock, logger);
    const record = addRecord(state, 'events', 256n, idGen, clock);
    expect(typeof record).toBe('object');
    if (typeof record === 'object') {
      expect(record.recordType).toBe('events');
      expect(record.sizeBytes).toBe(256n);
      expect(record.archived).toBe(false);
    }
  });

  it('listRecords returns records for a type', () => {
    const { clock } = makeClock();
    createPolicy(state, 'events', 1_000_000n, null, 'DELETE', idGen, clock, logger);
    addRecord(state, 'events', 100n, idGen, clock);
    addRecord(state, 'events', 200n, idGen, clock);
    expect(listRecords(state, 'events').length).toBe(2);
  });
});

// ============================================================================
// TESTS: ENFORCEMENT
// ============================================================================

describe('RetentionPolicyV2 - Enforcement', () => {
  let state: RetentionPolicyV2State;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createRetentionPolicyV2State();
    idGen = makeIdGen();
    logger = makeLogger();
  });

  it('returns policy-not-found for unknown policy', () => {
    const { clock } = makeClock();
    const result = enforcePolicy(state, 'ghost', clock, logger);
    expect(result).toBe('policy-not-found');
  });

  it('DELETE removes age-expired records', () => {
    const { clock, advance } = makeClock();
    const p = createPolicy(state, 'events', 1_000n, null, 'DELETE', idGen, clock, logger);
    if (typeof p !== 'object') throw new Error();
    addRecord(state, 'events', 100n, idGen, clock);
    advance(2_000n);
    const result = enforcePolicy(state, p.policyId, clock, logger);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') {
      expect(result.recordsProcessed).toBe(1);
      expect(result.action).toBe('DELETE');
    }
    expect(listRecords(state, 'events').length).toBe(0);
  });

  it('ARCHIVE marks expired records as archived', () => {
    const { clock, advance } = makeClock();
    const p = createPolicy(state, 'logs', 1_000n, null, 'ARCHIVE', idGen, clock, logger);
    if (typeof p !== 'object') throw new Error();
    addRecord(state, 'logs', 100n, idGen, clock);
    advance(2_000n);
    enforcePolicy(state, p.policyId, clock, logger);
    const records = listRecords(state, 'logs');
    expect(records[0]?.archived).toBe(true);
  });

  it('maxCount keeps only N most recent records', () => {
    const { clock } = makeClock();
    const p = createPolicy(state, 'events', 9_999_999_999n, 2, 'DELETE', idGen, clock, logger);
    if (typeof p !== 'object') throw new Error();
    addRecord(state, 'events', 10n, idGen, clock);
    addRecord(state, 'events', 20n, idGen, clock);
    addRecord(state, 'events', 30n, idGen, clock);
    addRecord(state, 'events', 40n, idGen, clock);
    const result = enforcePolicy(state, p.policyId, clock, logger);
    expect(typeof result).toBe('object');
    if (typeof result === 'object') expect(result.recordsProcessed).toBe(2);
    expect(listRecords(state, 'events').length).toBe(2);
  });
});

describe('RetentionPolicyV2 - Stats', () => {
  let state: RetentionPolicyV2State;
  let idGen: IdGenerator;
  let logger: Logger;

  beforeEach(() => {
    state = createRetentionPolicyV2State();
    idGen = makeIdGen();
    logger = makeLogger();
  });

  it('getPolicyStats reflects active/inactive counts', () => {
    const { clock } = makeClock();
    const p = createPolicy(state, 'events', 1_000_000n, null, 'DELETE', idGen, clock, logger);
    createPolicy(state, 'logs', 2_000_000n, null, 'ARCHIVE', idGen, clock, logger);
    if (typeof p !== 'object') throw new Error();
    deactivatePolicy(state, p.policyId);
    addRecord(state, 'logs', 100n, idGen, clock);
    const stats = getPolicyStats(state);
    expect(stats.totalPolicies).toBe(2);
    expect(stats.activePolicies).toBe(1);
    expect(stats.totalRecords).toBe(1);
  });
});
