/**
 * retention-policy.ts — Data lifecycle and cleanup rules.
 *
 * Defines named retention policies with age-based expiration. Records
 * are tracked against policies, and a sweep operation identifies
 * expired records for removal. Policies can be updated or removed.
 */

// ── Ports ────────────────────────────────────────────────────────

interface RetentionClock {
  readonly nowMicroseconds: () => number;
}

interface RetentionIdGenerator {
  readonly next: () => string;
}

interface RetentionPolicyDeps {
  readonly clock: RetentionClock;
  readonly idGenerator: RetentionIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

interface RetentionRule {
  readonly ruleId: string;
  readonly name: string;
  readonly maxAgeMicroseconds: number;
  readonly createdAt: number;
}

interface CreateRuleParams {
  readonly name: string;
  readonly maxAgeMicroseconds: number;
}

interface TrackedRecord {
  readonly recordId: string;
  readonly ruleId: string;
  readonly createdAt: number;
}

interface TrackRecordParams {
  readonly recordId: string;
  readonly ruleId: string;
}

interface SweepResult {
  readonly expiredRecordIds: readonly string[];
  readonly checkedCount: number;
}

interface RetentionStats {
  readonly totalRules: number;
  readonly totalTrackedRecords: number;
}

interface RetentionPolicyService {
  readonly createRule: (params: CreateRuleParams) => RetentionRule;
  readonly getRule: (ruleId: string) => RetentionRule | undefined;
  readonly removeRule: (ruleId: string) => boolean;
  readonly listRules: () => readonly RetentionRule[];
  readonly trackRecord: (params: TrackRecordParams) => TrackedRecord;
  readonly untrack: (recordId: string) => boolean;
  readonly sweep: () => SweepResult;
  readonly getStats: () => RetentionStats;
}

// ── State ────────────────────────────────────────────────────────

interface RetentionState {
  readonly deps: RetentionPolicyDeps;
  readonly rules: Map<string, RetentionRule>;
  readonly records: Map<string, TrackedRecord>;
}

// ── Operations ───────────────────────────────────────────────────

function createRuleImpl(state: RetentionState, params: CreateRuleParams): RetentionRule {
  const rule: RetentionRule = {
    ruleId: state.deps.idGenerator.next(),
    name: params.name,
    maxAgeMicroseconds: params.maxAgeMicroseconds,
    createdAt: state.deps.clock.nowMicroseconds(),
  };
  state.rules.set(rule.ruleId, rule);
  return rule;
}

function trackRecordImpl(state: RetentionState, params: TrackRecordParams): TrackedRecord {
  const record: TrackedRecord = {
    recordId: params.recordId,
    ruleId: params.ruleId,
    createdAt: state.deps.clock.nowMicroseconds(),
  };
  state.records.set(params.recordId, record);
  return record;
}

function sweepImpl(state: RetentionState): SweepResult {
  const now = state.deps.clock.nowMicroseconds();
  const expired: string[] = [];
  let checked = 0;
  for (const [recordId, record] of state.records) {
    checked++;
    const rule = state.rules.get(record.ruleId);
    if (!rule) continue;
    const age = now - record.createdAt;
    if (age > rule.maxAgeMicroseconds) {
      expired.push(recordId);
    }
  }
  for (const id of expired) {
    state.records.delete(id);
  }
  return { expiredRecordIds: expired, checkedCount: checked };
}

// ── Factory ──────────────────────────────────────────────────────

function createRetentionPolicyService(deps: RetentionPolicyDeps): RetentionPolicyService {
  const state: RetentionState = {
    deps,
    rules: new Map(),
    records: new Map(),
  };
  return {
    createRule: (p) => createRuleImpl(state, p),
    getRule: (id) => state.rules.get(id),
    removeRule: (id) => state.rules.delete(id),
    listRules: () => [...state.rules.values()],
    trackRecord: (p) => trackRecordImpl(state, p),
    untrack: (id) => state.records.delete(id),
    sweep: () => sweepImpl(state),
    getStats: () => ({
      totalRules: state.rules.size,
      totalTrackedRecords: state.records.size,
    }),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createRetentionPolicyService };
export type {
  RetentionPolicyService,
  RetentionPolicyDeps,
  RetentionRule,
  CreateRuleParams as CreateRetentionRuleParams,
  TrackedRecord,
  TrackRecordParams,
  SweepResult as RetentionSweepResult,
  RetentionStats,
};
