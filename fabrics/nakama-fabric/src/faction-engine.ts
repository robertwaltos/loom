/**
 * faction-engine.ts — Faction system for the three canonical factions.
 *
 * Bible v1.2 defines three factions: Architects, Wardens, and Pioneers.
 * Dynasties may join one faction, earning reputation through contributions.
 * Faction reputation unlocks exclusive benefits and gates participation
 * in faction-specific events. Factions may declare conflicts against
 * each other, tracked with duration and resolution.
 *
 * Factions:
 *   ARCHITECTS — Builders and planners, focused on infrastructure
 *   WARDENS    — Protectors and enforcers, focused on security
 *   PIONEERS   — Explorers and innovators, focused on discovery
 */

// ── Ports ────────────────────────────────────────────────────────

export interface FactionClock {
  readonly nowMicroseconds: () => number;
}

export interface FactionIdGenerator {
  readonly generate: () => string;
}

export interface FactionNotificationPort {
  readonly notify: (dynastyId: string, event: FactionEvent) => void;
}

export interface FactionEngineDeps {
  readonly clock: FactionClock;
  readonly idGenerator: FactionIdGenerator;
  readonly notifications: FactionNotificationPort;
}

// ── Types ────────────────────────────────────────────────────────

export type FactionId = 'ARCHITECTS' | 'WARDENS' | 'PIONEERS';

export type FactionRank = 'INITIATE' | 'MEMBER' | 'VETERAN' | 'ELITE' | 'CHAMPION';

export type FactionEventKind =
  | 'JOINED'
  | 'LEFT'
  | 'PROMOTED'
  | 'CONTRIBUTION_MADE'
  | 'CONFLICT_DECLARED'
  | 'CONFLICT_RESOLVED';

export interface FactionEvent {
  readonly kind: FactionEventKind;
  readonly factionId: FactionId;
  readonly dynastyId: string;
  readonly timestamp: number;
}

export interface FactionMembership {
  readonly dynastyId: string;
  readonly factionId: FactionId;
  readonly rank: FactionRank;
  readonly reputation: number;
  readonly totalContributions: bigint;
  readonly joinedAt: number;
}

export interface FactionBenefit {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly requiredRank: FactionRank;
  readonly factionId: FactionId;
}

export interface FactionConflict {
  readonly conflictId: string;
  readonly aggressorFaction: FactionId;
  readonly defenderFaction: FactionId;
  readonly reason: string;
  readonly declaredAt: number;
  readonly resolvedAt: number | null;
  readonly active: boolean;
}

export interface FactionInfo {
  readonly factionId: FactionId;
  readonly memberCount: number;
  readonly totalReputation: number;
  readonly totalContributions: bigint;
  readonly activeConflicts: number;
}

export interface FactionEngineStats {
  readonly totalMembers: number;
  readonly membersByFaction: Readonly<Record<FactionId, number>>;
  readonly totalContributions: bigint;
  readonly activeConflicts: number;
}

export interface FactionEngine {
  readonly joinFaction: (dynastyId: string, factionId: FactionId) => FactionMembership;
  readonly leaveFaction: (dynastyId: string) => void;
  readonly getMembership: (dynastyId: string) => FactionMembership | undefined;
  readonly contribute: (dynastyId: string, amount: bigint) => FactionMembership;
  readonly addReputation: (dynastyId: string, amount: number) => FactionMembership;
  readonly registerBenefit: (benefit: FactionBenefit) => void;
  readonly getAvailableBenefits: (dynastyId: string) => readonly FactionBenefit[];
  readonly getAllBenefits: (factionId: FactionId) => readonly FactionBenefit[];
  readonly declareConflict: (
    aggressor: FactionId,
    defender: FactionId,
    reason: string,
  ) => FactionConflict;
  readonly resolveConflict: (conflictId: string) => FactionConflict;
  readonly getActiveConflicts: () => readonly FactionConflict[];
  readonly getFactionInfo: (factionId: FactionId) => FactionInfo;
  readonly listMembers: (factionId: FactionId) => readonly FactionMembership[];
  readonly getStats: () => FactionEngineStats;
}

// ── Constants ────────────────────────────────────────────────────

export const ALL_FACTIONS: readonly FactionId[] = ['ARCHITECTS', 'WARDENS', 'PIONEERS'];

export const RANK_THRESHOLDS: Readonly<Record<FactionRank, number>> = {
  INITIATE: 0,
  MEMBER: 100,
  VETERAN: 500,
  ELITE: 2000,
  CHAMPION: 5000,
};

const RANK_ORDER: readonly FactionRank[] = ['INITIATE', 'MEMBER', 'VETERAN', 'ELITE', 'CHAMPION'];

// ── State ────────────────────────────────────────────────────────

interface MutableMembership {
  readonly dynastyId: string;
  readonly factionId: FactionId;
  rank: FactionRank;
  reputation: number;
  totalContributions: bigint;
  readonly joinedAt: number;
}

interface EngineState {
  readonly deps: FactionEngineDeps;
  readonly memberships: Map<string, MutableMembership>;
  readonly factionMembers: Map<FactionId, Set<string>>;
  readonly benefits: Map<string, FactionBenefit>;
  readonly conflicts: Map<string, MutableConflict>;
}

interface MutableConflict {
  readonly conflictId: string;
  readonly aggressorFaction: FactionId;
  readonly defenderFaction: FactionId;
  readonly reason: string;
  readonly declaredAt: number;
  resolvedAt: number | null;
  active: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────

function membershipToReadonly(m: MutableMembership): FactionMembership {
  return {
    dynastyId: m.dynastyId,
    factionId: m.factionId,
    rank: m.rank,
    reputation: m.reputation,
    totalContributions: m.totalContributions,
    joinedAt: m.joinedAt,
  };
}

function conflictToReadonly(c: MutableConflict): FactionConflict {
  return {
    conflictId: c.conflictId,
    aggressorFaction: c.aggressorFaction,
    defenderFaction: c.defenderFaction,
    reason: c.reason,
    declaredAt: c.declaredAt,
    resolvedAt: c.resolvedAt,
    active: c.active,
  };
}

function requireMembership(state: EngineState, dynastyId: string): MutableMembership {
  const m = state.memberships.get(dynastyId);
  if (!m) throw new Error('Dynasty ' + dynastyId + ' is not in any faction');
  return m;
}

function calculateRank(reputation: number): FactionRank {
  for (let i = RANK_ORDER.length - 1; i >= 0; i--) {
    const rank = RANK_ORDER[i];
    if (rank !== undefined && reputation >= RANK_THRESHOLDS[rank]) {
      return rank;
    }
  }
  return 'INITIATE';
}

function rankIndex(rank: FactionRank): number {
  return RANK_ORDER.indexOf(rank);
}

function ensureFactionSet(state: EngineState, factionId: FactionId): Set<string> {
  let set = state.factionMembers.get(factionId);
  if (set !== undefined) return set;
  set = new Set();
  state.factionMembers.set(factionId, set);
  return set;
}

function emitEvent(
  state: EngineState,
  kind: FactionEventKind,
  factionId: FactionId,
  dynastyId: string,
): void {
  state.deps.notifications.notify(dynastyId, {
    kind,
    factionId,
    dynastyId,
    timestamp: state.deps.clock.nowMicroseconds(),
  });
}

// ── Operations ───────────────────────────────────────────────────

function joinFactionImpl(
  state: EngineState,
  dynastyId: string,
  factionId: FactionId,
): FactionMembership {
  if (state.memberships.has(dynastyId)) {
    throw new Error('Dynasty ' + dynastyId + ' already belongs to a faction');
  }
  const membership: MutableMembership = {
    dynastyId,
    factionId,
    rank: 'INITIATE',
    reputation: 0,
    totalContributions: 0n,
    joinedAt: state.deps.clock.nowMicroseconds(),
  };
  state.memberships.set(dynastyId, membership);
  ensureFactionSet(state, factionId).add(dynastyId);
  emitEvent(state, 'JOINED', factionId, dynastyId);
  return membershipToReadonly(membership);
}

function leaveFactionImpl(state: EngineState, dynastyId: string): void {
  const m = requireMembership(state, dynastyId);
  const factionSet = state.factionMembers.get(m.factionId);
  if (factionSet) factionSet.delete(dynastyId);
  state.memberships.delete(dynastyId);
  emitEvent(state, 'LEFT', m.factionId, dynastyId);
}

function contributeImpl(state: EngineState, dynastyId: string, amount: bigint): FactionMembership {
  if (amount <= 0n) throw new Error('Contribution must be positive');
  const m = requireMembership(state, dynastyId);
  m.totalContributions += amount;
  emitEvent(state, 'CONTRIBUTION_MADE', m.factionId, dynastyId);
  return membershipToReadonly(m);
}

function addReputationImpl(
  state: EngineState,
  dynastyId: string,
  amount: number,
): FactionMembership {
  if (amount <= 0) throw new Error('Reputation amount must be positive');
  const m = requireMembership(state, dynastyId);
  const previousRank = m.rank;
  m.reputation += amount;
  m.rank = calculateRank(m.reputation);
  if (m.rank !== previousRank) {
    emitEvent(state, 'PROMOTED', m.factionId, dynastyId);
  }
  return membershipToReadonly(m);
}

function registerBenefitImpl(state: EngineState, benefit: FactionBenefit): void {
  state.benefits.set(benefit.id, benefit);
}

function getAvailableBenefitsImpl(
  state: EngineState,
  dynastyId: string,
): readonly FactionBenefit[] {
  const m = state.memberships.get(dynastyId);
  if (!m) return [];
  const memberRankIdx = rankIndex(m.rank);
  const result: FactionBenefit[] = [];
  for (const b of state.benefits.values()) {
    if (b.factionId !== m.factionId) continue;
    if (rankIndex(b.requiredRank) <= memberRankIdx) result.push(b);
  }
  return result;
}

function getAllBenefitsImpl(state: EngineState, factionId: FactionId): readonly FactionBenefit[] {
  const result: FactionBenefit[] = [];
  for (const b of state.benefits.values()) {
    if (b.factionId === factionId) result.push(b);
  }
  return result;
}

function declareConflictImpl(
  state: EngineState,
  aggressor: FactionId,
  defender: FactionId,
  reason: string,
): FactionConflict {
  if (aggressor === defender) {
    throw new Error('A faction cannot conflict with itself');
  }
  const conflictId = state.deps.idGenerator.generate();
  const conflict: MutableConflict = {
    conflictId,
    aggressorFaction: aggressor,
    defenderFaction: defender,
    reason,
    declaredAt: state.deps.clock.nowMicroseconds(),
    resolvedAt: null,
    active: true,
  };
  state.conflicts.set(conflictId, conflict);
  broadcastConflictEvent(state, 'CONFLICT_DECLARED', aggressor, defender);
  return conflictToReadonly(conflict);
}

function broadcastConflictEvent(
  state: EngineState,
  kind: FactionEventKind,
  faction1: FactionId,
  faction2: FactionId,
): void {
  const set1 = state.factionMembers.get(faction1);
  const set2 = state.factionMembers.get(faction2);
  if (set1) {
    for (const did of set1) emitEvent(state, kind, faction1, did);
  }
  if (set2) {
    for (const did of set2) emitEvent(state, kind, faction2, did);
  }
}

function resolveConflictImpl(state: EngineState, conflictId: string): FactionConflict {
  const conflict = state.conflicts.get(conflictId);
  if (!conflict) throw new Error('Conflict ' + conflictId + ' not found');
  if (!conflict.active) throw new Error('Conflict ' + conflictId + ' already resolved');
  conflict.active = false;
  conflict.resolvedAt = state.deps.clock.nowMicroseconds();
  broadcastConflictEvent(
    state,
    'CONFLICT_RESOLVED',
    conflict.aggressorFaction,
    conflict.defenderFaction,
  );
  return conflictToReadonly(conflict);
}

// ── Queries ──────────────────────────────────────────────────────

function getActiveConflictsImpl(state: EngineState): readonly FactionConflict[] {
  const result: FactionConflict[] = [];
  for (const c of state.conflicts.values()) {
    if (c.active) result.push(conflictToReadonly(c));
  }
  return result;
}

function getFactionInfoImpl(state: EngineState, factionId: FactionId): FactionInfo {
  const members = state.factionMembers.get(factionId);
  const memberCount = members ? members.size : 0;
  let totalRep = 0;
  let totalContrib = 0n;
  if (members) {
    for (const did of members) {
      const m = state.memberships.get(did);
      if (!m) continue;
      totalRep += m.reputation;
      totalContrib += m.totalContributions;
    }
  }
  let activeConflicts = 0;
  for (const c of state.conflicts.values()) {
    if (!c.active) continue;
    if (c.aggressorFaction === factionId || c.defenderFaction === factionId) {
      activeConflicts += 1;
    }
  }
  return {
    factionId,
    memberCount,
    totalReputation: totalRep,
    totalContributions: totalContrib,
    activeConflicts,
  };
}

function listMembersImpl(state: EngineState, factionId: FactionId): readonly FactionMembership[] {
  const set = state.factionMembers.get(factionId);
  if (!set) return [];
  const result: FactionMembership[] = [];
  for (const did of set) {
    const m = state.memberships.get(did);
    if (m) result.push(membershipToReadonly(m));
  }
  return result;
}

function getStatsImpl(state: EngineState): FactionEngineStats {
  const membersByFaction: Record<FactionId, number> = {
    ARCHITECTS: 0,
    WARDENS: 0,
    PIONEERS: 0,
  };
  let totalContrib = 0n;
  for (const m of state.memberships.values()) {
    membersByFaction[m.factionId] += 1;
    totalContrib += m.totalContributions;
  }
  let activeConflicts = 0;
  for (const c of state.conflicts.values()) {
    if (c.active) activeConflicts += 1;
  }
  return {
    totalMembers: state.memberships.size,
    membersByFaction,
    totalContributions: totalContrib,
    activeConflicts,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function buildInitialState(deps: FactionEngineDeps): EngineState {
  return {
    deps,
    memberships: new Map(),
    factionMembers: new Map(),
    benefits: new Map(),
    conflicts: new Map(),
  };
}

function getMembershipImpl(state: EngineState, did: string): FactionMembership | undefined {
  const m = state.memberships.get(did);
  return m ? membershipToReadonly(m) : undefined;
}

function createFactionEngine(deps: FactionEngineDeps): FactionEngine {
  const state = buildInitialState(deps);
  return {
    joinFaction: (did, fid) => joinFactionImpl(state, did, fid),
    leaveFaction: (did) => {
      leaveFactionImpl(state, did);
    },
    getMembership: (did) => getMembershipImpl(state, did),
    contribute: (did, amt) => contributeImpl(state, did, amt),
    addReputation: (did, amt) => addReputationImpl(state, did, amt),
    registerBenefit: (b) => {
      registerBenefitImpl(state, b);
    },
    getAvailableBenefits: (did) => getAvailableBenefitsImpl(state, did),
    getAllBenefits: (fid) => getAllBenefitsImpl(state, fid),
    declareConflict: (a, d, r) => declareConflictImpl(state, a, d, r),
    resolveConflict: (cid) => resolveConflictImpl(state, cid),
    getActiveConflicts: () => getActiveConflictsImpl(state),
    getFactionInfo: (fid) => getFactionInfoImpl(state, fid),
    listMembers: (fid) => listMembersImpl(state, fid),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createFactionEngine };
