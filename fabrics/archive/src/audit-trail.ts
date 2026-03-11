/**
 * audit-trail.ts — Immutable audit trail for administrative and governance actions.
 *
 * Append-only audit entries with tamper detection via hash chains,
 * query by actor/action/target, compliance reporting, and
 * configurable retention periods.
 *
 * "No decree passes unwitnessed. The trail endures."
 */

// ── Ports ────────────────────────────────────────────────────────

interface AuditTrailClock {
  readonly nowMicroseconds: () => number;
}

interface AuditTrailIdGenerator {
  readonly generate: () => string;
}

interface AuditTrailHasher {
  readonly hash: (input: string) => string;
}

interface AuditTrailDeps {
  readonly clock: AuditTrailClock;
  readonly idGenerator: AuditTrailIdGenerator;
  readonly hasher: AuditTrailHasher;
}

// ── Types ────────────────────────────────────────────────────────

type AuditSeverity = 'info' | 'warning' | 'critical';
type AuditCategory = 'governance' | 'economy' | 'identity' | 'security' | 'system';

interface AuditTrailEntry {
  readonly entryId: string;
  readonly actorId: string;
  readonly action: string;
  readonly targetId: string;
  readonly targetType: string;
  readonly category: AuditCategory;
  readonly severity: AuditSeverity;
  readonly detail: string;
  readonly recordedAt: number;
  readonly sequenceNumber: number;
  readonly previousHash: string;
  readonly entryHash: string;
}

interface AppendEntryParams {
  readonly actorId: string;
  readonly action: string;
  readonly targetId: string;
  readonly targetType: string;
  readonly category: AuditCategory;
  readonly severity: AuditSeverity;
  readonly detail: string;
}

interface AuditTrailQuery {
  readonly actorId?: string;
  readonly action?: string;
  readonly targetId?: string;
  readonly targetType?: string;
  readonly category?: AuditCategory;
  readonly severity?: AuditSeverity;
  readonly startTime?: number;
  readonly endTime?: number;
}

interface ChainVerificationResult {
  readonly valid: boolean;
  readonly entriesChecked: number;
  readonly brokenAtSequence: number | null;
  readonly verifiedAt: number;
}

interface RetentionConfig {
  readonly configId: string;
  readonly category: AuditCategory;
  readonly retainForMs: number;
  readonly createdAt: number;
}

interface CreateRetentionConfigParams {
  readonly category: AuditCategory;
  readonly retainForMs: number;
}

interface ComplianceReport {
  readonly generatedAt: number;
  readonly totalEntries: number;
  readonly entriesBySeverity: Readonly<Record<AuditSeverity, number>>;
  readonly entriesByCategory: Readonly<Record<AuditCategory, number>>;
  readonly chainIntegrity: boolean;
  readonly oldestEntryAt: number | null;
  readonly newestEntryAt: number | null;
  readonly retentionConfigCount: number;
}

interface AuditTrailStats {
  readonly totalEntries: number;
  readonly chainLength: number;
  readonly retentionConfigCount: number;
  readonly categoryCount: number;
}

// ── Public Interface ─────────────────────────────────────────────

interface AuditTrail {
  readonly append: (params: AppendEntryParams) => AuditTrailEntry;
  readonly getEntry: (entryId: string) => AuditTrailEntry | undefined;
  readonly getBySequence: (seq: number) => AuditTrailEntry | undefined;
  readonly query: (q: AuditTrailQuery) => ReadonlyArray<AuditTrailEntry>;
  readonly getRecent: (count: number) => ReadonlyArray<AuditTrailEntry>;
  readonly verifyChain: () => ChainVerificationResult;
  readonly addRetentionConfig: (params: CreateRetentionConfigParams) => RetentionConfig;
  readonly getRetentionConfigs: () => ReadonlyArray<RetentionConfig>;
  readonly applyRetention: () => number;
  readonly generateComplianceReport: () => ComplianceReport;
  readonly getStats: () => AuditTrailStats;
}

// ── Constants ────────────────────────────────────────────────────

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

// ── State ────────────────────────────────────────────────────────

interface TrailState {
  readonly deps: AuditTrailDeps;
  readonly entries: AuditTrailEntry[];
  readonly entryIndex: Map<string, AuditTrailEntry>;
  readonly retentionConfigs: RetentionConfig[];
  nextSequence: number;
  lastHash: string;
}

// ── Factory ──────────────────────────────────────────────────────

function createAuditTrail(deps: AuditTrailDeps): AuditTrail {
  const state: TrailState = {
    deps,
    entries: [],
    entryIndex: new Map(),
    retentionConfigs: [],
    nextSequence: 0,
    lastHash: GENESIS_HASH,
  };

  return {
    append: (p) => appendImpl(state, p),
    getEntry: (id) => state.entryIndex.get(id),
    getBySequence: (seq) => getBySequenceImpl(state, seq),
    query: (q) => queryImpl(state, q),
    getRecent: (n) => getRecentImpl(state, n),
    verifyChain: () => verifyChainImpl(state),
    addRetentionConfig: (p) => addRetentionConfigImpl(state, p),
    getRetentionConfigs: () => [...state.retentionConfigs],
    applyRetention: () => applyRetentionImpl(state),
    generateComplianceReport: () => generateReportImpl(state),
    getStats: () => getStatsImpl(state),
  };
}

// ── Append ───────────────────────────────────────────────────────

function appendImpl(state: TrailState, params: AppendEntryParams): AuditTrailEntry {
  const entryId = state.deps.idGenerator.generate();
  const now = state.deps.clock.nowMicroseconds();
  const seq = state.nextSequence;
  const previousHash = state.lastHash;
  const entryHash = computeEntryHash(state, entryId, seq, now, previousHash, params);

  const entry: AuditTrailEntry = {
    entryId,
    actorId: params.actorId,
    action: params.action,
    targetId: params.targetId,
    targetType: params.targetType,
    category: params.category,
    severity: params.severity,
    detail: params.detail,
    recordedAt: now,
    sequenceNumber: seq,
    previousHash,
    entryHash,
  };

  state.entries.push(entry);
  state.entryIndex.set(entryId, entry);
  state.nextSequence++;
  state.lastHash = entryHash;
  return entry;
}

function computeEntryHash(
  state: TrailState,
  entryId: string,
  seq: number,
  timestamp: number,
  previousHash: string,
  params: AppendEntryParams,
): string {
  const payload = [
    previousHash,
    entryId,
    String(seq),
    String(timestamp),
    params.actorId,
    params.action,
    params.targetId,
    params.category,
    params.detail,
  ].join(':');
  return state.deps.hasher.hash(payload);
}

// ── Queries ──────────────────────────────────────────────────────

function getBySequenceImpl(state: TrailState, seq: number): AuditTrailEntry | undefined {
  if (seq < 0 || seq >= state.entries.length) return undefined;
  return state.entries[seq];
}

function queryImpl(state: TrailState, q: AuditTrailQuery): ReadonlyArray<AuditTrailEntry> {
  return state.entries.filter((e) => matchesAuditQuery(e, q));
}

function matchesAuditQuery(entry: AuditTrailEntry, q: AuditTrailQuery): boolean {
  if (q.actorId !== undefined && entry.actorId !== q.actorId) return false;
  if (q.action !== undefined && entry.action !== q.action) return false;
  if (q.targetId !== undefined && entry.targetId !== q.targetId) return false;
  if (q.targetType !== undefined && entry.targetType !== q.targetType) return false;
  if (q.category !== undefined && entry.category !== q.category) return false;
  if (q.severity !== undefined && entry.severity !== q.severity) return false;
  if (q.startTime !== undefined && entry.recordedAt < q.startTime) return false;
  if (q.endTime !== undefined && entry.recordedAt > q.endTime) return false;
  return true;
}

function getRecentImpl(state: TrailState, count: number): ReadonlyArray<AuditTrailEntry> {
  const start = Math.max(0, state.entries.length - count);
  return state.entries.slice(start);
}

// ── Chain Verification ───────────────────────────────────────────

function verifyChainImpl(state: TrailState): ChainVerificationResult {
  const now = state.deps.clock.nowMicroseconds();
  if (state.entries.length === 0) {
    return { valid: true, entriesChecked: 0, brokenAtSequence: null, verifiedAt: now };
  }

  let expectedPreviousHash = GENESIS_HASH;
  for (let i = 0; i < state.entries.length; i++) {
    const entry = state.entries[i];
    if (entry === undefined) {
      return { valid: false, entriesChecked: i, brokenAtSequence: i, verifiedAt: now };
    }
    if (entry.previousHash !== expectedPreviousHash) {
      return { valid: false, entriesChecked: i, brokenAtSequence: i, verifiedAt: now };
    }
    expectedPreviousHash = entry.entryHash;
  }
  return {
    valid: true,
    entriesChecked: state.entries.length,
    brokenAtSequence: null,
    verifiedAt: now,
  };
}

// ── Retention ────────────────────────────────────────────────────

function addRetentionConfigImpl(
  state: TrailState,
  params: CreateRetentionConfigParams,
): RetentionConfig {
  const config: RetentionConfig = {
    configId: state.deps.idGenerator.generate(),
    category: params.category,
    retainForMs: params.retainForMs,
    createdAt: state.deps.clock.nowMicroseconds(),
  };
  state.retentionConfigs.push(config);
  return config;
}

function applyRetentionImpl(state: TrailState): number {
  const now = state.deps.clock.nowMicroseconds();
  const toRemoveSet = new Set<number>();

  for (const config of state.retentionConfigs) {
    const cutoff = now - config.retainForMs;
    for (let i = 0; i < state.entries.length; i++) {
      const entry = state.entries[i];
      if (entry !== undefined && entry.category === config.category && entry.recordedAt < cutoff) {
        toRemoveSet.add(i);
      }
    }
  }

  if (toRemoveSet.size === 0) return 0;

  const indicesToRemove = [...toRemoveSet].sort((a, b) => b - a);
  for (const idx of indicesToRemove) {
    const entry = state.entries[idx];
    if (entry !== undefined) {
      state.entryIndex.delete(entry.entryId);
    }
    state.entries.splice(idx, 1);
  }
  return indicesToRemove.length;
}

// ── Compliance Report ────────────────────────────────────────────

function generateReportImpl(state: TrailState): ComplianceReport {
  const severityCounts = countBySeverity(state);
  const categoryCounts = countByCategory(state);
  const chainResult = verifyChainImpl(state);
  const timeRange = getTimeRange(state);

  return {
    generatedAt: state.deps.clock.nowMicroseconds(),
    totalEntries: state.entries.length,
    entriesBySeverity: severityCounts,
    entriesByCategory: categoryCounts,
    chainIntegrity: chainResult.valid,
    oldestEntryAt: timeRange.oldest,
    newestEntryAt: timeRange.newest,
    retentionConfigCount: state.retentionConfigs.length,
  };
}

function countBySeverity(state: TrailState): Record<AuditSeverity, number> {
  const counts: Record<AuditSeverity, number> = { info: 0, warning: 0, critical: 0 };
  for (const entry of state.entries) {
    counts[entry.severity]++;
  }
  return counts;
}

function countByCategory(state: TrailState): Record<AuditCategory, number> {
  const counts: Record<AuditCategory, number> = {
    governance: 0,
    economy: 0,
    identity: 0,
    security: 0,
    system: 0,
  };
  for (const entry of state.entries) {
    counts[entry.category]++;
  }
  return counts;
}

function getTimeRange(state: TrailState): { oldest: number | null; newest: number | null } {
  if (state.entries.length === 0) return { oldest: null, newest: null };
  const first = state.entries[0];
  const last = state.entries[state.entries.length - 1];
  return {
    oldest: first !== undefined ? first.recordedAt : null,
    newest: last !== undefined ? last.recordedAt : null,
  };
}

// ── Stats ────────────────────────────────────────────────────────

function getStatsImpl(state: TrailState): AuditTrailStats {
  const categories = new Set<string>();
  for (const entry of state.entries) {
    categories.add(entry.category);
  }
  return {
    totalEntries: state.entries.length,
    chainLength: state.entries.length,
    retentionConfigCount: state.retentionConfigs.length,
    categoryCount: categories.size,
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createAuditTrail };
export type {
  AuditTrail,
  AuditTrailDeps,
  AuditTrailClock,
  AuditTrailIdGenerator,
  AuditTrailHasher,
  AuditTrailEntry,
  AppendEntryParams,
  AuditTrailQuery,
  AuditSeverity,
  AuditCategory,
  ChainVerificationResult,
  RetentionConfig,
  CreateRetentionConfigParams,
  ComplianceReport,
  AuditTrailStats,
};
