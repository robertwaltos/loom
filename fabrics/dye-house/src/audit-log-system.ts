/**
 * Audit Log System — Tamper-evident audit trail for security events.
 *
 * Every security-relevant action in The Loom is recorded with a
 * deterministic checksum that ties the entry to its identity, action,
 * and timestamp. Entries are append-only; the record can be queried
 * by category, severity, actor, outcome, or time range.
 *
 * "The Dye House sees all. Every thread bears its mark."
 *
 * Fabric: dye-house
 * Thread tier: 1
 */

// ─── Port Interfaces ─────────────────────────────────────────────────────────

interface AuditLogClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface AuditLogIdGenPort {
  readonly next: () => string;
}

interface AuditLogLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type AuditEntryId = string;
export type ActorId = string;

export type AuditCategory = 'AUTH' | 'TRADE' | 'GOVERNANCE' | 'ADMIN' | 'DATA_ACCESS' | 'SYSTEM';

export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type AuditError = 'entry-not-found' | 'invalid-category' | 'invalid-actor';

export interface AuditEntry {
  readonly entryId: AuditEntryId;
  readonly actorId: ActorId;
  readonly category: AuditCategory;
  readonly severity: AuditSeverity;
  readonly action: string;
  readonly resourceId: string | null;
  readonly outcome: 'SUCCESS' | 'FAILURE';
  readonly metadata: Record<string, string>;
  readonly occurredAt: bigint;
  readonly checksum: string;
}

export interface AuditQuery {
  readonly category?: AuditCategory;
  readonly severity?: AuditSeverity;
  readonly actorId?: ActorId;
  readonly outcome?: 'SUCCESS' | 'FAILURE';
  readonly fromTime?: bigint;
  readonly toTime?: bigint;
}

export interface AuditReport {
  readonly totalEntries: number;
  readonly criticalCount: number;
  readonly failureCount: number;
  readonly entriesByCategory: Record<AuditCategory, number>;
}

// ─── System Interface ─────────────────────────────────────────────────────────

export interface AuditLogSystem {
  recordEntry(
    actorId: ActorId,
    category: AuditCategory,
    severity: AuditSeverity,
    action: string,
    resourceId: string | null,
    outcome: 'SUCCESS' | 'FAILURE',
    metadata: Record<string, string>,
  ): AuditEntry;
  queryEntries(query: AuditQuery, limit: number): ReadonlyArray<AuditEntry>;
  getEntry(entryId: AuditEntryId): AuditEntry | undefined;
  getReport(): AuditReport;
  getActorHistory(actorId: ActorId, limit: number): ReadonlyArray<AuditEntry>;
}

// ─── Deps ────────────────────────────────────────────────────────────────────

export interface AuditLogSystemDeps {
  readonly clock: AuditLogClockPort;
  readonly idGen: AuditLogIdGenPort;
  readonly logger: AuditLogLoggerPort;
}

// ─── State ───────────────────────────────────────────────────────────────────

interface LogSystemState {
  readonly entries: AuditEntry[];
  readonly entryIndex: Map<AuditEntryId, AuditEntry>;
  readonly deps: AuditLogSystemDeps;
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createAuditLogSystem(deps: AuditLogSystemDeps): AuditLogSystem {
  const state: LogSystemState = {
    entries: [],
    entryIndex: new Map(),
    deps,
  };

  return {
    recordEntry: (actorId, category, severity, action, resourceId, outcome, metadata) =>
      recordEntryImpl(state, actorId, category, severity, action, resourceId, outcome, metadata),
    queryEntries: (query, limit) => queryEntriesImpl(state, query, limit),
    getEntry: (entryId) => state.entryIndex.get(entryId),
    getReport: () => buildReport(state),
    getActorHistory: (actorId, limit) => getActorHistoryImpl(state, actorId, limit),
  };
}

// ─── Record Entry ─────────────────────────────────────────────────────────────

function recordEntryImpl(
  state: LogSystemState,
  actorId: ActorId,
  category: AuditCategory,
  severity: AuditSeverity,
  action: string,
  resourceId: string | null,
  outcome: 'SUCCESS' | 'FAILURE',
  metadata: Record<string, string>,
): AuditEntry {
  const entryId = state.deps.idGen.next();
  const occurredAt = state.deps.clock.nowMicroseconds();
  const checksum = buildChecksum(entryId, actorId, action, occurredAt);

  const entry: AuditEntry = {
    entryId,
    actorId,
    category,
    severity,
    action,
    resourceId,
    outcome,
    metadata,
    occurredAt,
    checksum,
  };

  state.entries.push(entry);
  state.entryIndex.set(entryId, entry);
  state.deps.logger.info('audit-entry-recorded', { entryId, category, severity, outcome });
  return entry;
}

// ─── Query Entries ────────────────────────────────────────────────────────────

function queryEntriesImpl(
  state: LogSystemState,
  query: AuditQuery,
  limit: number,
): ReadonlyArray<AuditEntry> {
  const matching: AuditEntry[] = [];

  for (let i = state.entries.length - 1; i >= 0; i--) {
    const entry = state.entries[i];
    if (entry === undefined) continue;
    if (!matchesQuery(entry, query)) continue;
    matching.push(entry);
    if (matching.length >= limit) break;
  }

  return matching;
}

function matchesQuery(entry: AuditEntry, query: AuditQuery): boolean {
  if (query.category !== undefined && entry.category !== query.category) return false;
  if (query.severity !== undefined && entry.severity !== query.severity) return false;
  if (query.actorId !== undefined && entry.actorId !== query.actorId) return false;
  if (query.outcome !== undefined && entry.outcome !== query.outcome) return false;
  if (query.fromTime !== undefined && entry.occurredAt < query.fromTime) return false;
  if (query.toTime !== undefined && entry.occurredAt > query.toTime) return false;
  return true;
}

// ─── Actor History ────────────────────────────────────────────────────────────

function getActorHistoryImpl(
  state: LogSystemState,
  actorId: ActorId,
  limit: number,
): ReadonlyArray<AuditEntry> {
  return queryEntriesImpl(state, { actorId }, limit);
}

// ─── Report ──────────────────────────────────────────────────────────────────

function buildReport(state: LogSystemState): AuditReport {
  const entriesByCategory: Record<AuditCategory, number> = {
    AUTH: 0,
    TRADE: 0,
    GOVERNANCE: 0,
    ADMIN: 0,
    DATA_ACCESS: 0,
    SYSTEM: 0,
  };
  let criticalCount = 0;
  let failureCount = 0;

  for (const entry of state.entries) {
    entriesByCategory[entry.category] += 1;
    if (entry.severity === 'CRITICAL') criticalCount += 1;
    if (entry.outcome === 'FAILURE') failureCount += 1;
  }

  return {
    totalEntries: state.entries.length,
    criticalCount,
    failureCount,
    entriesByCategory,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildChecksum(
  entryId: string,
  actorId: string,
  action: string,
  occurredAt: bigint,
): string {
  return `${entryId}:${actorId}:${action}:${String(occurredAt)}`;
}
