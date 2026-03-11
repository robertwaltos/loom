/**
 * retention-policy-v2.ts — Data retention rules with policy-based enforcement.
 *
 * Defines named policies per record type with age-based expiration and count
 * caps. Enforcement sweeps records and applies the configured action
 * (DELETE, ARCHIVE, COMPRESS) to records that violate policy constraints.
 *
 * "The Loom keeps what matters. The rest becomes sediment."
 */

// ============================================================================
// PORTS
// ============================================================================

export type Clock = {
  now(): bigint;
};

export type IdGenerator = {
  generate(): string;
};

export type Logger = {
  info(message: string): void;
  error(message: string): void;
};

// ============================================================================
// TYPES
// ============================================================================

export type PolicyId = string;
export type RecordType = string;

export type RetentionError =
  | 'policy-not-found'
  | 'record-type-not-found'
  | 'invalid-duration'
  | 'already-exists';

export type RetentionPolicy = {
  policyId: PolicyId;
  recordType: RecordType;
  maxAgeUs: bigint;
  maxCount: number | null;
  action: 'DELETE' | 'ARCHIVE' | 'COMPRESS';
  createdAt: bigint;
  active: boolean;
};

export type RetentionRecord = {
  recordId: string;
  recordType: RecordType;
  createdAt: bigint;
  sizeBytes: bigint;
  archived: boolean;
};

export type EnforcementResult = {
  policyId: PolicyId;
  recordType: RecordType;
  recordsProcessed: number;
  action: 'DELETE' | 'ARCHIVE' | 'COMPRESS';
  executedAt: bigint;
};

// ============================================================================
// STATE
// ============================================================================

export type RetentionPolicyV2State = {
  policies: Map<PolicyId, MutablePolicy>;
  policyByType: Map<RecordType, PolicyId>;
  records: Map<string, MutableRecord>;
};

type MutablePolicy = {
  policyId: PolicyId;
  recordType: RecordType;
  maxAgeUs: bigint;
  maxCount: number | null;
  action: 'DELETE' | 'ARCHIVE' | 'COMPRESS';
  createdAt: bigint;
  active: boolean;
};

type MutableRecord = {
  recordId: string;
  recordType: RecordType;
  createdAt: bigint;
  sizeBytes: bigint;
  archived: boolean;
};

// ============================================================================
// FACTORY
// ============================================================================

export function createRetentionPolicyV2State(): RetentionPolicyV2State {
  return {
    policies: new Map(),
    policyByType: new Map(),
    records: new Map(),
  };
}

// ============================================================================
// POLICY MANAGEMENT
// ============================================================================

export function createPolicy(
  state: RetentionPolicyV2State,
  recordType: RecordType,
  maxAgeUs: bigint,
  maxCount: number | null,
  action: 'DELETE' | 'ARCHIVE' | 'COMPRESS',
  idGen: IdGenerator,
  clock: Clock,
  logger: Logger,
): RetentionPolicy | RetentionError {
  if (maxAgeUs < 1n) return 'invalid-duration';
  if (state.policyByType.has(recordType)) return 'already-exists';

  const policy: MutablePolicy = {
    policyId: idGen.generate(),
    recordType,
    maxAgeUs,
    maxCount,
    action,
    createdAt: clock.now(),
    active: true,
  };

  state.policies.set(policy.policyId, policy);
  state.policyByType.set(recordType, policy.policyId);
  logger.info('Retention policy created: ' + policy.policyId + ' for ' + recordType);
  return toPolicy(policy);
}

export function deactivatePolicy(
  state: RetentionPolicyV2State,
  policyId: PolicyId,
): { success: true } | { success: false; error: RetentionError } {
  const policy = state.policies.get(policyId);
  if (policy === undefined) return { success: false, error: 'policy-not-found' };
  policy.active = false;
  return { success: true };
}

export function getPolicy(
  state: RetentionPolicyV2State,
  policyId: PolicyId,
): RetentionPolicy | undefined {
  const policy = state.policies.get(policyId);
  return policy !== undefined ? toPolicy(policy) : undefined;
}

export function listPolicies(
  state: RetentionPolicyV2State,
  active?: boolean,
): ReadonlyArray<RetentionPolicy> {
  const results: RetentionPolicy[] = [];
  for (const policy of state.policies.values()) {
    if (active !== undefined && policy.active !== active) continue;
    results.push(toPolicy(policy));
  }
  return results;
}

// ============================================================================
// RECORD MANAGEMENT
// ============================================================================

export function addRecord(
  state: RetentionPolicyV2State,
  recordType: RecordType,
  sizeBytes: bigint,
  idGen: IdGenerator,
  clock: Clock,
): RetentionRecord | RetentionError {
  if (!state.policyByType.has(recordType)) return 'record-type-not-found';

  const record: MutableRecord = {
    recordId: idGen.generate(),
    recordType,
    createdAt: clock.now(),
    sizeBytes,
    archived: false,
  };

  state.records.set(record.recordId, record);
  return toRecord(record);
}

export function listRecords(
  state: RetentionPolicyV2State,
  recordType: RecordType,
): ReadonlyArray<RetentionRecord> {
  const results: RetentionRecord[] = [];
  for (const record of state.records.values()) {
    if (record.recordType === recordType) results.push(toRecord(record));
  }
  return results;
}

// ============================================================================
// ENFORCEMENT
// ============================================================================

export function enforcePolicy(
  state: RetentionPolicyV2State,
  policyId: PolicyId,
  clock: Clock,
  logger: Logger,
): EnforcementResult | RetentionError {
  const policy = state.policies.get(policyId);
  if (policy === undefined) return 'policy-not-found';

  const now = clock.now();
  const ageExpired = collectAgeExpired(state, policy, now);
  const countExpired = collectCountExpired(state, policy, ageExpired);
  const toProcess = new Set([...ageExpired, ...countExpired]);

  applyAction(state, toProcess, policy.action);
  logger.info('Policy enforced: ' + policyId + ' processed ' + String(toProcess.size) + ' records');

  return {
    policyId,
    recordType: policy.recordType,
    recordsProcessed: toProcess.size,
    action: policy.action,
    executedAt: now,
  };
}

function collectAgeExpired(
  state: RetentionPolicyV2State,
  policy: MutablePolicy,
  now: bigint,
): string[] {
  const expired: string[] = [];
  for (const record of state.records.values()) {
    if (record.recordType !== policy.recordType) continue;
    if (now - record.createdAt > policy.maxAgeUs) expired.push(record.recordId);
  }
  return expired;
}

function collectCountExpired(
  state: RetentionPolicyV2State,
  policy: MutablePolicy,
  alreadyExpired: string[],
): string[] {
  if (policy.maxCount === null) return [];

  const alreadySet = new Set(alreadyExpired);
  const typeRecords: MutableRecord[] = [];
  for (const record of state.records.values()) {
    if (record.recordType === policy.recordType && !alreadySet.has(record.recordId)) {
      typeRecords.push(record);
    }
  }

  typeRecords.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  const excess = typeRecords.slice(policy.maxCount);
  return excess.map((r) => r.recordId);
}

function applyAction(
  state: RetentionPolicyV2State,
  ids: Set<string>,
  action: 'DELETE' | 'ARCHIVE' | 'COMPRESS',
): void {
  for (const id of ids) {
    if (action === 'DELETE') {
      state.records.delete(id);
    } else {
      const record = state.records.get(id);
      if (record !== undefined) record.archived = true;
    }
  }
}

// ============================================================================
// STATS
// ============================================================================

export function getPolicyStats(state: RetentionPolicyV2State): {
  totalPolicies: number;
  activePolicies: number;
  totalRecords: number;
} {
  let activePolicies = 0;
  for (const policy of state.policies.values()) {
    if (policy.active) activePolicies = activePolicies + 1;
  }
  return {
    totalPolicies: state.policies.size,
    activePolicies,
    totalRecords: state.records.size,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function toPolicy(policy: MutablePolicy): RetentionPolicy {
  return {
    policyId: policy.policyId,
    recordType: policy.recordType,
    maxAgeUs: policy.maxAgeUs,
    maxCount: policy.maxCount,
    action: policy.action,
    createdAt: policy.createdAt,
    active: policy.active,
  };
}

function toRecord(record: MutableRecord): RetentionRecord {
  return {
    recordId: record.recordId,
    recordType: record.recordType,
    createdAt: record.createdAt,
    sizeBytes: record.sizeBytes,
    archived: record.archived,
  };
}
