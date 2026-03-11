/**
 * Survey Corps Reputation — Dynasty ranking and reputation within the Survey Corps.
 *
 * Bible v1.1 Part 6: Survey Corps & World Discovery
 *
 * Every dynasty that participates in the Survey Corps earns reputation
 * from successful missions and loses it from failures and aborts.
 * Reputation determines rank, which gates access to harder missions.
 *
 * Rank Tiers:
 *   RECRUIT    (0-99)     — Basic exploration missions only
 *   SCOUT      (100-499)  — Standard missions, crew roles available
 *   PATHFINDER (500-1499) — Deep survey access, commander eligible
 *   NAVIGATOR  (1500-3999)— Hazard assessment access
 *   VANGUARD   (4000-9999)— Colony prep access, priority scheduling
 *   LEGEND     (10000+)   — All missions, naming priority, advisory role
 *
 * "Those who walk the Weave paths longest earn the right
 *  to name what they find."
 */

// ─── Types ───────────────────────────────────────────────────────────

export type CorpsRank = 'recruit' | 'scout' | 'pathfinder' | 'navigator' | 'vanguard' | 'legend';

export interface ReputationRecord {
  readonly dynastyId: string;
  readonly reputation: number;
  readonly rank: CorpsRank;
  readonly missionsCompleted: number;
  readonly missionsFailed: number;
  readonly missionsAborted: number;
  readonly totalReputationEarned: number;
  readonly totalReputationLost: number;
  readonly joinedAt: number;
  readonly lastMissionAt: number | null;
}

export interface ReputationChangeEvent {
  readonly dynastyId: string;
  readonly previousReputation: number;
  readonly newReputation: number;
  readonly previousRank: CorpsRank;
  readonly newRank: CorpsRank;
  readonly delta: number;
  readonly reason: string;
  readonly timestamp: number;
}

export interface LeaderboardEntry {
  readonly rank: number;
  readonly dynastyId: string;
  readonly reputation: number;
  readonly corpsRank: CorpsRank;
  readonly missionsCompleted: number;
}

export interface CorpsReputationStats {
  readonly totalMembers: number;
  readonly membersByRank: Readonly<Record<CorpsRank, number>>;
  readonly totalReputationIssued: number;
  readonly averageReputation: number;
}

export interface MissionReputationParams {
  readonly dynastyId: string;
  readonly missionDifficulty: number;
  readonly wasCommander: boolean;
  readonly crewSize: number;
}

export interface CorpsReputationService {
  enroll(dynastyId: string): ReputationRecord;
  getRecord(dynastyId: string): ReputationRecord;
  tryGetRecord(dynastyId: string): ReputationRecord | undefined;
  awardMissionComplete(params: MissionReputationParams): ReputationChangeEvent;
  penalizeMissionFailure(params: MissionReputationParams): ReputationChangeEvent;
  penalizeMissionAbort(dynastyId: string, difficulty: number): ReputationChangeEvent;
  awardDiscoveryBonus(dynastyId: string, worldName: string): ReputationChangeEvent;
  adjustReputation(dynastyId: string, delta: number, reason: string): ReputationChangeEvent;
  getRank(dynastyId: string): CorpsRank;
  canAccessMission(dynastyId: string, requiredDifficulty: number): boolean;
  canBeCommander(dynastyId: string): boolean;
  getLeaderboard(limit: number): ReadonlyArray<LeaderboardEntry>;
  getLeaderboardPosition(dynastyId: string): number;
  listByRank(rank: CorpsRank): ReadonlyArray<ReputationRecord>;
  getStats(): CorpsReputationStats;
  count(): number;
}

// ─── Constants ───────────────────────────────────────────────────────

export const RANK_THRESHOLDS: Readonly<Record<CorpsRank, number>> = {
  recruit: 0,
  scout: 100,
  pathfinder: 500,
  navigator: 1500,
  vanguard: 4000,
  legend: 10000,
};

const RANK_ORDER: ReadonlyArray<CorpsRank> = [
  'recruit',
  'scout',
  'pathfinder',
  'navigator',
  'vanguard',
  'legend',
];

const DIFFICULTY_ACCESS: Readonly<Record<CorpsRank, number>> = {
  recruit: 3,
  scout: 5,
  pathfinder: 7,
  navigator: 8,
  vanguard: 10,
  legend: 10,
};

const COMMANDER_RANK: CorpsRank = 'pathfinder';

const BASE_COMPLETION_REP = 10;
const DIFFICULTY_REP_MULTIPLIER = 5;
const COMMANDER_BONUS_MULTIPLIER = 1.5;
const CREW_SIZE_DIVISOR = 2;
const FAILURE_PENALTY_MULTIPLIER = 0.6;
const ABORT_PENALTY_MULTIPLIER = 0.3;
const DISCOVERY_BONUS = 50;
const MIN_REPUTATION = 0;

// ─── State ───────────────────────────────────────────────────────────

interface MutableReputationRecord {
  readonly dynastyId: string;
  reputation: number;
  rank: CorpsRank;
  missionsCompleted: number;
  missionsFailed: number;
  missionsAborted: number;
  totalReputationEarned: number;
  totalReputationLost: number;
  readonly joinedAt: number;
  lastMissionAt: number | null;
}

interface ServiceState {
  readonly records: Map<string, MutableReputationRecord>;
  readonly clock: { readonly nowMicroseconds: () => number };
}

// ─── Factory ─────────────────────────────────────────────────────────

export interface CorpsReputationDeps {
  readonly clock: { readonly nowMicroseconds: () => number };
}

export function createCorpsReputationService(deps: CorpsReputationDeps): CorpsReputationService {
  const state: ServiceState = {
    records: new Map(),
    clock: deps.clock,
  };

  return {
    enroll: (id) => enrollImpl(state, id),
    getRecord: (id) => getRecordImpl(state, id),
    tryGetRecord: (id) => tryGetRecordImpl(state, id),
    awardMissionComplete: (p) => awardMissionCompleteImpl(state, p),
    penalizeMissionFailure: (p) => penalizeMissionFailureImpl(state, p),
    penalizeMissionAbort: (id, d) => penalizeMissionAbortImpl(state, id, d),
    awardDiscoveryBonus: (id, wn) => awardDiscoveryBonusImpl(state, id, wn),
    adjustReputation: (id, d, r) => adjustReputationImpl(state, id, d, r),
    getRank: (id) => getRecordImpl(state, id).rank,
    canAccessMission: (id, d) => canAccessMissionImpl(state, id, d),
    canBeCommander: (id) => canBeCommanderImpl(state, id),
    getLeaderboard: (limit) => getLeaderboardImpl(state, limit),
    getLeaderboardPosition: (id) => getLeaderboardPositionImpl(state, id),
    listByRank: (r) => listByRankImpl(state, r),
    getStats: () => computeStats(state),
    count: () => state.records.size,
  };
}

// ─── Enrollment ──────────────────────────────────────────────────────

function enrollImpl(state: ServiceState, dynastyId: string): ReputationRecord {
  if (state.records.has(dynastyId)) {
    throw new Error('Dynasty ' + dynastyId + ' already enrolled in Survey Corps');
  }
  const now = state.clock.nowMicroseconds();
  const record: MutableReputationRecord = {
    dynastyId,
    reputation: 0,
    rank: 'recruit',
    missionsCompleted: 0,
    missionsFailed: 0,
    missionsAborted: 0,
    totalReputationEarned: 0,
    totalReputationLost: 0,
    joinedAt: now,
    lastMissionAt: null,
  };
  state.records.set(dynastyId, record);
  return toReadonly(record);
}

// ─── Reputation Awards ──────────────────────────────────────────────

function awardMissionCompleteImpl(
  state: ServiceState,
  params: MissionReputationParams,
): ReputationChangeEvent {
  const record = getMutable(state, params.dynastyId);
  const delta = calculateCompletionReputation(params);
  record.missionsCompleted++;
  record.lastMissionAt = state.clock.nowMicroseconds();
  return applyDelta(
    state,
    record,
    delta,
    'Mission completed (difficulty ' + String(params.missionDifficulty) + ')',
  );
}

function calculateCompletionReputation(params: MissionReputationParams): number {
  let rep = BASE_COMPLETION_REP + params.missionDifficulty * DIFFICULTY_REP_MULTIPLIER;
  if (params.wasCommander) {
    rep = Math.round(rep * COMMANDER_BONUS_MULTIPLIER);
  }
  const crewBonus = Math.floor(params.crewSize / CREW_SIZE_DIVISOR);
  return rep + crewBonus;
}

function awardDiscoveryBonusImpl(
  state: ServiceState,
  dynastyId: string,
  worldName: string,
): ReputationChangeEvent {
  const record = getMutable(state, dynastyId);
  return applyDelta(state, record, DISCOVERY_BONUS, 'Discovery bonus: ' + worldName);
}

// ─── Reputation Penalties ───────────────────────────────────────────

function penalizeMissionFailureImpl(
  state: ServiceState,
  params: MissionReputationParams,
): ReputationChangeEvent {
  const record = getMutable(state, params.dynastyId);
  const base = BASE_COMPLETION_REP + params.missionDifficulty * DIFFICULTY_REP_MULTIPLIER;
  const penalty = -Math.round(base * FAILURE_PENALTY_MULTIPLIER);
  record.missionsFailed++;
  record.lastMissionAt = state.clock.nowMicroseconds();
  return applyDelta(
    state,
    record,
    penalty,
    'Mission failed (difficulty ' + String(params.missionDifficulty) + ')',
  );
}

function penalizeMissionAbortImpl(
  state: ServiceState,
  dynastyId: string,
  difficulty: number,
): ReputationChangeEvent {
  const record = getMutable(state, dynastyId);
  const base = BASE_COMPLETION_REP + difficulty * DIFFICULTY_REP_MULTIPLIER;
  const penalty = -Math.round(base * ABORT_PENALTY_MULTIPLIER);
  record.missionsAborted++;
  record.lastMissionAt = state.clock.nowMicroseconds();
  return applyDelta(
    state,
    record,
    penalty,
    'Mission aborted (difficulty ' + String(difficulty) + ')',
  );
}

// ─── General Adjustment ─────────────────────────────────────────────

function adjustReputationImpl(
  state: ServiceState,
  dynastyId: string,
  delta: number,
  reason: string,
): ReputationChangeEvent {
  const record = getMutable(state, dynastyId);
  return applyDelta(state, record, delta, reason);
}

// ─── Access Control ─────────────────────────────────────────────────

function canAccessMissionImpl(
  state: ServiceState,
  dynastyId: string,
  requiredDifficulty: number,
): boolean {
  const record = state.records.get(dynastyId);
  if (!record) return false;
  const maxDifficulty = DIFFICULTY_ACCESS[record.rank];
  return requiredDifficulty <= maxDifficulty;
}

function canBeCommanderImpl(state: ServiceState, dynastyId: string): boolean {
  const record = state.records.get(dynastyId);
  if (!record) return false;
  const commanderIndex = RANK_ORDER.indexOf(COMMANDER_RANK);
  const currentIndex = RANK_ORDER.indexOf(record.rank);
  return currentIndex >= commanderIndex;
}

// ─── Leaderboard ────────────────────────────────────────────────────

function getLeaderboardImpl(state: ServiceState, limit: number): ReadonlyArray<LeaderboardEntry> {
  const sorted = getSortedRecords(state);
  const capped = sorted.slice(0, limit);
  return capped.map(toLeaderboardEntry);
}

function toLeaderboardEntry(record: MutableReputationRecord, index: number): LeaderboardEntry {
  return {
    rank: index + 1,
    dynastyId: record.dynastyId,
    reputation: record.reputation,
    corpsRank: record.rank,
    missionsCompleted: record.missionsCompleted,
  };
}

function getLeaderboardPositionImpl(state: ServiceState, dynastyId: string): number {
  const sorted = getSortedRecords(state);
  const index = sorted.findIndex((r) => r.dynastyId === dynastyId);
  return index === -1 ? -1 : index + 1;
}

function getSortedRecords(state: ServiceState): ReadonlyArray<MutableReputationRecord> {
  const all = Array.from(state.records.values());
  return all.sort(compareByReputation);
}

function compareByReputation(a: MutableReputationRecord, b: MutableReputationRecord): number {
  if (b.reputation !== a.reputation) return b.reputation - a.reputation;
  return b.missionsCompleted - a.missionsCompleted;
}

// ─── Queries ─────────────────────────────────────────────────────────

function getRecordImpl(state: ServiceState, dynastyId: string): ReputationRecord {
  const record = state.records.get(dynastyId);
  if (!record) throw new Error('Dynasty ' + dynastyId + ' not enrolled in Survey Corps');
  return toReadonly(record);
}

function tryGetRecordImpl(state: ServiceState, dynastyId: string): ReputationRecord | undefined {
  const record = state.records.get(dynastyId);
  return record ? toReadonly(record) : undefined;
}

function listByRankImpl(state: ServiceState, rank: CorpsRank): ReadonlyArray<ReputationRecord> {
  const results: ReputationRecord[] = [];
  for (const record of state.records.values()) {
    if (record.rank === rank) results.push(toReadonly(record));
  }
  return results;
}

// ─── Stats ───────────────────────────────────────────────────────────

function computeStats(state: ServiceState): CorpsReputationStats {
  const membersByRank: Record<CorpsRank, number> = {
    recruit: 0,
    scout: 0,
    pathfinder: 0,
    navigator: 0,
    vanguard: 0,
    legend: 0,
  };
  let totalReputation = 0;
  for (const record of state.records.values()) {
    membersByRank[record.rank]++;
    totalReputation += record.reputation;
  }
  const count = state.records.size;
  return {
    totalMembers: count,
    membersByRank,
    totalReputationIssued: totalReputation,
    averageReputation: count > 0 ? Math.round(totalReputation / count) : 0,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getMutable(state: ServiceState, dynastyId: string): MutableReputationRecord {
  const record = state.records.get(dynastyId);
  if (!record) throw new Error('Dynasty ' + dynastyId + ' not enrolled in Survey Corps');
  return record;
}

function applyDelta(
  state: ServiceState,
  record: MutableReputationRecord,
  delta: number,
  reason: string,
): ReputationChangeEvent {
  const previousReputation = record.reputation;
  const previousRank = record.rank;
  record.reputation = Math.max(MIN_REPUTATION, record.reputation + delta);

  if (delta > 0) {
    record.totalReputationEarned += delta;
  } else {
    record.totalReputationLost += Math.abs(delta);
  }

  record.rank = calculateRank(record.reputation);

  return {
    dynastyId: record.dynastyId,
    previousReputation,
    newReputation: record.reputation,
    previousRank,
    newRank: record.rank,
    delta,
    reason,
    timestamp: state.clock.nowMicroseconds(),
  };
}

function calculateRank(reputation: number): CorpsRank {
  for (let i = RANK_ORDER.length - 1; i >= 0; i--) {
    const rank = RANK_ORDER[i];
    if (rank !== undefined && reputation >= RANK_THRESHOLDS[rank]) {
      return rank;
    }
  }
  return 'recruit';
}

function toReadonly(record: MutableReputationRecord): ReputationRecord {
  return {
    dynastyId: record.dynastyId,
    reputation: record.reputation,
    rank: record.rank,
    missionsCompleted: record.missionsCompleted,
    missionsFailed: record.missionsFailed,
    missionsAborted: record.missionsAborted,
    totalReputationEarned: record.totalReputationEarned,
    totalReputationLost: record.totalReputationLost,
    joinedAt: record.joinedAt,
    lastMissionAt: record.lastMissionAt,
  };
}
