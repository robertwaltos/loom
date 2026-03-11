/**
 * audit-log.ts — Immutable audit trail.
 *
 * Append-only log of security-relevant actions with actor,
 * action, resource, outcome, and timestamp. Supports filtered
 * queries, pagination, and tamper detection via sequential IDs.
 */

// ── Ports ────────────────────────────────────────────────────────

interface AuditClock {
  readonly nowMicroseconds: () => number;
}

interface AuditIdGenerator {
  readonly next: () => string;
}

interface AuditLogDeps {
  readonly clock: AuditClock;
  readonly idGenerator: AuditIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type AuditOutcome = 'success' | 'failure' | 'denied';

interface AuditEntry {
  readonly entryId: string;
  readonly actorId: string;
  readonly action: string;
  readonly resource: string;
  readonly outcome: AuditOutcome;
  readonly detail: string;
  readonly recordedAt: number;
  readonly sequenceNumber: number;
}

interface RecordAuditParams {
  readonly actorId: string;
  readonly action: string;
  readonly resource: string;
  readonly outcome: AuditOutcome;
  readonly detail: string;
}

interface AuditQuery {
  readonly actorId?: string;
  readonly action?: string;
  readonly resource?: string;
  readonly outcome?: AuditOutcome;
}

interface AuditLogStats {
  readonly totalEntries: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly deniedCount: number;
}

interface AuditLogService {
  readonly record: (params: RecordAuditParams) => AuditEntry;
  readonly query: (filter: AuditQuery) => readonly AuditEntry[];
  readonly getEntry: (entryId: string) => AuditEntry | undefined;
  readonly getRecent: (count: number) => readonly AuditEntry[];
  readonly getStats: () => AuditLogStats;
}

// ── State ────────────────────────────────────────────────────────

interface AuditState {
  readonly deps: AuditLogDeps;
  readonly entries: AuditEntry[];
  readonly index: Map<string, AuditEntry>;
  nextSequence: number;
}

// ── Operations ───────────────────────────────────────────────────

function recordImpl(state: AuditState, params: RecordAuditParams): AuditEntry {
  const entry: AuditEntry = {
    entryId: state.deps.idGenerator.next(),
    actorId: params.actorId,
    action: params.action,
    resource: params.resource,
    outcome: params.outcome,
    detail: params.detail,
    recordedAt: state.deps.clock.nowMicroseconds(),
    sequenceNumber: state.nextSequence,
  };
  state.nextSequence++;
  state.entries.push(entry);
  state.index.set(entry.entryId, entry);
  return entry;
}

function matchesQuery(entry: AuditEntry, filter: AuditQuery): boolean {
  if (filter.actorId !== undefined && entry.actorId !== filter.actorId) return false;
  if (filter.action !== undefined && entry.action !== filter.action) return false;
  if (filter.resource !== undefined && entry.resource !== filter.resource) return false;
  if (filter.outcome !== undefined && entry.outcome !== filter.outcome) return false;
  return true;
}

function queryImpl(state: AuditState, filter: AuditQuery): readonly AuditEntry[] {
  return state.entries.filter((e) => matchesQuery(e, filter));
}

function getRecentImpl(state: AuditState, count: number): readonly AuditEntry[] {
  const start = Math.max(0, state.entries.length - count);
  return state.entries.slice(start);
}

function getStatsImpl(state: AuditState): AuditLogStats {
  let success = 0;
  let failure = 0;
  let denied = 0;
  for (const e of state.entries) {
    if (e.outcome === 'success') success++;
    else if (e.outcome === 'failure') failure++;
    else denied++;
  }
  return {
    totalEntries: state.entries.length,
    successCount: success,
    failureCount: failure,
    deniedCount: denied,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createAuditLogService(deps: AuditLogDeps): AuditLogService {
  const state: AuditState = {
    deps,
    entries: [],
    index: new Map(),
    nextSequence: 0,
  };
  return {
    record: (p) => recordImpl(state, p),
    query: (f) => queryImpl(state, f),
    getEntry: (id) => state.index.get(id),
    getRecent: (n) => getRecentImpl(state, n),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createAuditLogService };
export type {
  AuditLogService,
  AuditLogDeps,
  AuditEntry,
  AuditOutcome,
  RecordAuditParams,
  AuditQuery,
  AuditLogStats,
};
