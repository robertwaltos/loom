/**
 * transit-ledger.ts — Record of all world transits.
 *
 * Maintains an immutable log of every dynasty transit between worlds.
 * Supports queries by dynasty, origin/destination world, time range,
 * and aggregate transit statistics.
 */

// ── Ports ────────────────────────────────────────────────────────

interface TransitClock {
  readonly nowMicroseconds: () => number;
}

interface TransitIdGenerator {
  readonly next: () => string;
}

interface TransitLedgerDeps {
  readonly clock: TransitClock;
  readonly idGenerator: TransitIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

interface TransitRecord {
  readonly transitId: string;
  readonly dynastyId: string;
  readonly originWorldId: string;
  readonly destinationWorldId: string;
  readonly transitAt: number;
  readonly durationMicroseconds: number;
}

interface RecordTransitParams {
  readonly dynastyId: string;
  readonly originWorldId: string;
  readonly destinationWorldId: string;
  readonly durationMicroseconds: number;
}

interface TransitLedgerStats {
  readonly totalTransits: number;
  readonly uniqueTravellers: number;
  readonly uniqueRoutes: number;
}

interface TransitLedger {
  readonly record: (params: RecordTransitParams) => TransitRecord;
  readonly getTransit: (transitId: string) => TransitRecord | undefined;
  readonly listByDynasty: (dynastyId: string) => readonly TransitRecord[];
  readonly listByOrigin: (worldId: string) => readonly TransitRecord[];
  readonly listByDestination: (worldId: string) => readonly TransitRecord[];
  readonly countByRoute: (origin: string, destination: string) => number;
  readonly getStats: () => TransitLedgerStats;
}

// ── State ────────────────────────────────────────────────────────

interface LedgerState {
  readonly deps: TransitLedgerDeps;
  readonly records: Map<string, TransitRecord>;
  readonly byDynasty: Map<string, string[]>;
  readonly byOrigin: Map<string, string[]>;
  readonly byDestination: Map<string, string[]>;
}

// ── Helpers ──────────────────────────────────────────────────────

function appendToIndex(index: Map<string, string[]>, key: string, transitId: string): void {
  let list = index.get(key);
  if (!list) {
    list = [];
    index.set(key, list);
  }
  list.push(transitId);
}

function resolveIds(state: LedgerState, ids: readonly string[]): TransitRecord[] {
  const result: TransitRecord[] = [];
  for (const id of ids) {
    const r = state.records.get(id);
    if (r) result.push(r);
  }
  return result;
}

// ── Operations ───────────────────────────────────────────────────

function recordImpl(state: LedgerState, params: RecordTransitParams): TransitRecord {
  const record: TransitRecord = {
    transitId: state.deps.idGenerator.next(),
    dynastyId: params.dynastyId,
    originWorldId: params.originWorldId,
    destinationWorldId: params.destinationWorldId,
    transitAt: state.deps.clock.nowMicroseconds(),
    durationMicroseconds: params.durationMicroseconds,
  };
  state.records.set(record.transitId, record);
  appendToIndex(state.byDynasty, params.dynastyId, record.transitId);
  appendToIndex(state.byOrigin, params.originWorldId, record.transitId);
  appendToIndex(state.byDestination, params.destinationWorldId, record.transitId);
  return record;
}

function countByRouteImpl(state: LedgerState, origin: string, destination: string): number {
  const originIds = state.byOrigin.get(origin) ?? [];
  let count = 0;
  for (const id of originIds) {
    const r = state.records.get(id);
    if (r && r.destinationWorldId === destination) count++;
  }
  return count;
}

function getStatsImpl(state: LedgerState): TransitLedgerStats {
  const travellers = new Set<string>();
  const routes = new Set<string>();
  for (const r of state.records.values()) {
    travellers.add(r.dynastyId);
    routes.add(r.originWorldId + '->' + r.destinationWorldId);
  }
  return {
    totalTransits: state.records.size,
    uniqueTravellers: travellers.size,
    uniqueRoutes: routes.size,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createTransitLedger(deps: TransitLedgerDeps): TransitLedger {
  const state: LedgerState = {
    deps,
    records: new Map(),
    byDynasty: new Map(),
    byOrigin: new Map(),
    byDestination: new Map(),
  };
  return {
    record: (p) => recordImpl(state, p),
    getTransit: (id) => state.records.get(id),
    listByDynasty: (did) => resolveIds(state, state.byDynasty.get(did) ?? []),
    listByOrigin: (wid) => resolveIds(state, state.byOrigin.get(wid) ?? []),
    listByDestination: (wid) => resolveIds(state, state.byDestination.get(wid) ?? []),
    countByRoute: (o, d) => countByRouteImpl(state, o, d),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createTransitLedger };
export type {
  TransitLedger,
  TransitLedgerDeps,
  TransitRecord,
  RecordTransitParams,
  TransitLedgerStats,
};
