/**
 * dynasty-alliance.ts — Inter-dynasty alliance management.
 *
 * Tracks alliances between dynasties with proposal, acceptance,
 * and dissolution lifecycle. Supports alliance queries and
 * mutual relationship tracking.
 */

// ── Ports ────────────────────────────────────────────────────────

interface AllianceClock {
  readonly nowMicroseconds: () => number;
}

interface AllianceIdGenerator {
  readonly next: () => string;
}

interface DynastyAllianceDeps {
  readonly clock: AllianceClock;
  readonly idGenerator: AllianceIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type AllianceStatus = 'proposed' | 'active' | 'dissolved';

interface Alliance {
  readonly allianceId: string;
  readonly proposerId: string;
  readonly acceptorId: string;
  readonly status: AllianceStatus;
  readonly proposedAt: number;
  readonly formedAt: number;
  readonly dissolvedAt: number;
}

interface ProposeAllianceParams {
  readonly proposerId: string;
  readonly targetId: string;
}

interface DynastyAllianceStats {
  readonly totalAlliances: number;
  readonly activeAlliances: number;
  readonly proposedAlliances: number;
  readonly dissolvedAlliances: number;
}

interface DynastyAllianceService {
  readonly propose: (params: ProposeAllianceParams) => Alliance;
  readonly accept: (allianceId: string) => boolean;
  readonly dissolve: (allianceId: string) => boolean;
  readonly getAlliance: (allianceId: string) => Alliance | undefined;
  readonly getAlliances: (dynastyId: string) => readonly Alliance[];
  readonly areAllied: (dynastyA: string, dynastyB: string) => boolean;
  readonly getStats: () => DynastyAllianceStats;
}

// ── State ────────────────────────────────────────────────────────

interface MutableAlliance {
  readonly allianceId: string;
  readonly proposerId: string;
  readonly acceptorId: string;
  status: AllianceStatus;
  readonly proposedAt: number;
  formedAt: number;
  dissolvedAt: number;
}

interface AllianceState {
  readonly deps: DynastyAllianceDeps;
  readonly alliances: Map<string, MutableAlliance>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(a: MutableAlliance): Alliance {
  return {
    allianceId: a.allianceId,
    proposerId: a.proposerId,
    acceptorId: a.acceptorId,
    status: a.status,
    proposedAt: a.proposedAt,
    formedAt: a.formedAt,
    dissolvedAt: a.dissolvedAt,
  };
}

function involvesDynasty(a: MutableAlliance, dynastyId: string): boolean {
  return a.proposerId === dynastyId || a.acceptorId === dynastyId;
}

// ── Operations ───────────────────────────────────────────────────

function proposeImpl(state: AllianceState, params: ProposeAllianceParams): Alliance {
  const now = state.deps.clock.nowMicroseconds();
  const alliance: MutableAlliance = {
    allianceId: state.deps.idGenerator.next(),
    proposerId: params.proposerId,
    acceptorId: params.targetId,
    status: 'proposed',
    proposedAt: now,
    formedAt: 0,
    dissolvedAt: 0,
  };
  state.alliances.set(alliance.allianceId, alliance);
  return toReadonly(alliance);
}

function acceptImpl(state: AllianceState, allianceId: string): boolean {
  const a = state.alliances.get(allianceId);
  if (!a || a.status !== 'proposed') return false;
  a.status = 'active';
  a.formedAt = state.deps.clock.nowMicroseconds();
  return true;
}

function dissolveImpl(state: AllianceState, allianceId: string): boolean {
  const a = state.alliances.get(allianceId);
  if (!a || a.status === 'dissolved') return false;
  a.status = 'dissolved';
  a.dissolvedAt = state.deps.clock.nowMicroseconds();
  return true;
}

function getAlliancesImpl(state: AllianceState, dynastyId: string): Alliance[] {
  const result: Alliance[] = [];
  for (const a of state.alliances.values()) {
    if (involvesDynasty(a, dynastyId)) result.push(toReadonly(a));
  }
  return result;
}

function areAlliedImpl(state: AllianceState, a: string, b: string): boolean {
  for (const al of state.alliances.values()) {
    if (al.status !== 'active') continue;
    const involves = involvesDynasty(al, a) && involvesDynasty(al, b);
    if (involves) return true;
  }
  return false;
}

function getStatsImpl(state: AllianceState): DynastyAllianceStats {
  let active = 0;
  let proposed = 0;
  let dissolved = 0;
  for (const a of state.alliances.values()) {
    if (a.status === 'active') active++;
    else if (a.status === 'proposed') proposed++;
    else dissolved++;
  }
  return {
    totalAlliances: state.alliances.size,
    activeAlliances: active,
    proposedAlliances: proposed,
    dissolvedAlliances: dissolved,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createDynastyAllianceService(deps: DynastyAllianceDeps): DynastyAllianceService {
  const state: AllianceState = { deps, alliances: new Map() };
  return {
    propose: (p) => proposeImpl(state, p),
    accept: (id) => acceptImpl(state, id),
    dissolve: (id) => dissolveImpl(state, id),
    getAlliance: (id) => {
      const a = state.alliances.get(id);
      return a ? toReadonly(a) : undefined;
    },
    getAlliances: (id) => getAlliancesImpl(state, id),
    areAllied: (a, b) => areAlliedImpl(state, a, b),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createDynastyAllianceService };
export type {
  DynastyAllianceService,
  DynastyAllianceDeps,
  AllianceStatus,
  Alliance,
  ProposeAllianceParams,
  DynastyAllianceStats,
};
