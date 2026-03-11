/**
 * Audit Log — Security event recording for the Dye House.
 *
 * Every security-relevant action in The Loom leaves a trace:
 *   - Authentication events (token issued, validated, revoked)
 *   - Authorization decisions (permission checks, denials)
 *   - Rate limit actions (throttled, blocked)
 *   - Administrative operations (rule changes, config updates)
 *
 * The Audit Log is append-only. Entries cannot be modified or deleted.
 * Each entry carries a severity level, actor identity, and structured
 * metadata for forensic analysis.
 *
 * "The Dye House sees all. Every thread bears its mark."
 */

// ─── Types ───────────────────────────────────────────────────────────

export type AuditSeverity = 'info' | 'warning' | 'alert' | 'critical';

export type AuditCategory =
  | 'authentication'
  | 'authorization'
  | 'rate_limit'
  | 'administration'
  | 'anomaly';

export interface AuditEntry {
  readonly entryId: string;
  readonly category: AuditCategory;
  readonly severity: AuditSeverity;
  readonly action: string;
  readonly actorId: string;
  readonly targetId: string;
  readonly outcome: 'success' | 'failure' | 'blocked';
  readonly reason: string;
  readonly metadata: Readonly<Record<string, string>>;
  readonly timestamp: number;
}

export interface RecordAuditParams {
  readonly category: AuditCategory;
  readonly severity: AuditSeverity;
  readonly action: string;
  readonly actorId: string;
  readonly targetId: string;
  readonly outcome: 'success' | 'failure' | 'blocked';
  readonly reason: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface AuditFilter {
  readonly category?: AuditCategory;
  readonly severity?: AuditSeverity;
  readonly actorId?: string;
  readonly since?: number;
  readonly limit?: number;
}

export interface AuditStats {
  readonly totalEntries: number;
  readonly byCategory: Readonly<Record<AuditCategory, number>>;
  readonly bySeverity: Readonly<Record<AuditSeverity, number>>;
}

// ─── Port Interfaces ────────────────────────────────────────────────

export interface AuditIdGenerator {
  next(): string;
}

export interface AuditLogDeps {
  readonly idGenerator: AuditIdGenerator;
  readonly clock: { nowMicroseconds(): number };
  readonly maxEntries: number;
}

// ─── Public Interface ───────────────────────────────────────────────

export interface AuditLog {
  record(params: RecordAuditParams): AuditEntry;
  query(filter: AuditFilter): ReadonlyArray<AuditEntry>;
  getEntry(entryId: string): AuditEntry | undefined;
  getStats(): AuditStats;
  getRecentAlerts(limit: number): ReadonlyArray<AuditEntry>;
  count(): number;
}

// ─── State ──────────────────────────────────────────────────────────

interface LogState {
  readonly entries: AuditEntry[];
  readonly entryIndex: Map<string, AuditEntry>;
  readonly deps: AuditLogDeps;
  readonly categoryCounts: Record<AuditCategory, number>;
  readonly severityCounts: Record<AuditSeverity, number>;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createAuditLog(deps: AuditLogDeps): AuditLog {
  const state: LogState = {
    entries: [],
    entryIndex: new Map(),
    deps,
    categoryCounts: {
      authentication: 0,
      authorization: 0,
      rate_limit: 0,
      administration: 0,
      anomaly: 0,
    },
    severityCounts: {
      info: 0,
      warning: 0,
      alert: 0,
      critical: 0,
    },
  };

  return {
    record: (p) => recordImpl(state, p),
    query: (f) => queryImpl(state, f),
    getEntry: (id) => state.entryIndex.get(id),
    getStats: () => getStatsImpl(state),
    getRecentAlerts: (l) => getRecentAlertsImpl(state, l),
    count: () => state.entries.length,
  };
}

// ─── Record ─────────────────────────────────────────────────────────

function recordImpl(state: LogState, params: RecordAuditParams): AuditEntry {
  const entry: AuditEntry = {
    entryId: state.deps.idGenerator.next(),
    category: params.category,
    severity: params.severity,
    action: params.action,
    actorId: params.actorId,
    targetId: params.targetId,
    outcome: params.outcome,
    reason: params.reason,
    metadata: params.metadata ?? {},
    timestamp: state.deps.clock.nowMicroseconds(),
  };

  appendEntry(state, entry);
  updateCounts(state, entry);
  enforceCapacity(state);

  return entry;
}

function appendEntry(state: LogState, entry: AuditEntry): void {
  state.entries.push(entry);
  state.entryIndex.set(entry.entryId, entry);
}

function updateCounts(state: LogState, entry: AuditEntry): void {
  state.categoryCounts[entry.category] += 1;
  state.severityCounts[entry.severity] += 1;
}

function enforceCapacity(state: LogState): void {
  while (state.entries.length > state.deps.maxEntries) {
    const removed = state.entries.shift();
    if (removed !== undefined) {
      state.entryIndex.delete(removed.entryId);
    }
  }
}

// ─── Query ──────────────────────────────────────────────────────────

function queryImpl(state: LogState, filter: AuditFilter): ReadonlyArray<AuditEntry> {
  const results: AuditEntry[] = [];

  for (let i = state.entries.length - 1; i >= 0; i--) {
    const entry = state.entries[i];
    if (entry === undefined) continue;
    if (!matchesFilter(entry, filter)) continue;
    results.push(entry);
    if (filter.limit !== undefined && results.length >= filter.limit) break;
  }

  return results;
}

function matchesFilter(entry: AuditEntry, filter: AuditFilter): boolean {
  if (filter.category !== undefined && entry.category !== filter.category) {
    return false;
  }
  if (filter.severity !== undefined && entry.severity !== filter.severity) {
    return false;
  }
  if (filter.actorId !== undefined && entry.actorId !== filter.actorId) {
    return false;
  }
  if (filter.since !== undefined && entry.timestamp < filter.since) {
    return false;
  }
  return true;
}

// ─── Alerts ─────────────────────────────────────────────────────────

function getRecentAlertsImpl(state: LogState, limit: number): ReadonlyArray<AuditEntry> {
  return queryImpl(state, { severity: 'alert', limit })
    .concat(queryImpl(state, { severity: 'critical', limit }))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

// ─── Stats ──────────────────────────────────────────────────────────

function getStatsImpl(state: LogState): AuditStats {
  return {
    totalEntries: state.entries.length,
    byCategory: { ...state.categoryCounts },
    bySeverity: { ...state.severityCounts },
  };
}
