/**
 * survey-roster.ts — Survey Corps member tracking.
 *
 * Manages the roster of dynasties participating in the Survey Corps,
 * tracks mission assignments, skill specialisations, and active/inactive
 * status. Members can be deployed to missions and recalled.
 */

// ── Ports ────────────────────────────────────────────────────────

interface RosterClock {
  readonly nowMicroseconds: () => number;
}

interface RosterIdGenerator {
  readonly next: () => string;
}

interface SurveyRosterDeps {
  readonly clock: RosterClock;
  readonly idGenerator: RosterIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type RosterMemberStatus = 'active' | 'deployed' | 'inactive';

type SurveySpecialisation = 'navigation' | 'cartography' | 'geology' | 'xenobiology' | 'engineering';

interface RosterMember {
  readonly memberId: string;
  readonly dynastyId: string;
  readonly specialisation: SurveySpecialisation;
  readonly status: RosterMemberStatus;
  readonly missionsCompleted: number;
  readonly enrolledAt: number;
}

interface EnrollParams {
  readonly dynastyId: string;
  readonly specialisation: SurveySpecialisation;
}

interface RosterStats {
  readonly totalMembers: number;
  readonly activeMembers: number;
  readonly deployedMembers: number;
  readonly inactiveMembers: number;
}

interface SurveyRoster {
  readonly enroll: (params: EnrollParams) => RosterMember;
  readonly getMember: (memberId: string) => RosterMember | undefined;
  readonly getByDynasty: (dynastyId: string) => RosterMember | undefined;
  readonly deploy: (memberId: string) => boolean;
  readonly recall: (memberId: string) => boolean;
  readonly completeMission: (memberId: string) => boolean;
  readonly deactivate: (memberId: string) => boolean;
  readonly reactivate: (memberId: string) => boolean;
  readonly listByStatus: (status: RosterMemberStatus) => readonly RosterMember[];
  readonly getStats: () => RosterStats;
}

// ── State ────────────────────────────────────────────────────────

interface MutableMember {
  readonly memberId: string;
  readonly dynastyId: string;
  readonly specialisation: SurveySpecialisation;
  status: RosterMemberStatus;
  missionsCompleted: number;
  readonly enrolledAt: number;
}

interface RosterState {
  readonly deps: SurveyRosterDeps;
  readonly members: Map<string, MutableMember>;
  readonly dynastyIndex: Map<string, string>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(m: MutableMember): RosterMember {
  return {
    memberId: m.memberId,
    dynastyId: m.dynastyId,
    specialisation: m.specialisation,
    status: m.status,
    missionsCompleted: m.missionsCompleted,
    enrolledAt: m.enrolledAt,
  };
}

// ── Operations ───────────────────────────────────────────────────

function enrollImpl(state: RosterState, params: EnrollParams): RosterMember {
  const member: MutableMember = {
    memberId: state.deps.idGenerator.next(),
    dynastyId: params.dynastyId,
    specialisation: params.specialisation,
    status: 'active',
    missionsCompleted: 0,
    enrolledAt: state.deps.clock.nowMicroseconds(),
  };
  state.members.set(member.memberId, member);
  state.dynastyIndex.set(params.dynastyId, member.memberId);
  return toReadonly(member);
}

function deployImpl(state: RosterState, memberId: string): boolean {
  const member = state.members.get(memberId);
  if (!member || member.status !== 'active') return false;
  member.status = 'deployed';
  return true;
}

function recallImpl(state: RosterState, memberId: string): boolean {
  const member = state.members.get(memberId);
  if (!member || member.status !== 'deployed') return false;
  member.status = 'active';
  return true;
}

function completeMissionImpl(state: RosterState, memberId: string): boolean {
  const member = state.members.get(memberId);
  if (!member || member.status !== 'deployed') return false;
  member.missionsCompleted++;
  member.status = 'active';
  return true;
}

function deactivateImpl(state: RosterState, memberId: string): boolean {
  const member = state.members.get(memberId);
  if (!member || member.status === 'inactive') return false;
  member.status = 'inactive';
  return true;
}

function reactivateImpl(state: RosterState, memberId: string): boolean {
  const member = state.members.get(memberId);
  if (!member || member.status !== 'inactive') return false;
  member.status = 'active';
  return true;
}

function listByStatusImpl(state: RosterState, status: RosterMemberStatus): RosterMember[] {
  const result: RosterMember[] = [];
  for (const m of state.members.values()) {
    if (m.status === status) result.push(toReadonly(m));
  }
  return result;
}

function getStatsImpl(state: RosterState): RosterStats {
  let active = 0;
  let deployed = 0;
  let inactive = 0;
  for (const m of state.members.values()) {
    if (m.status === 'active') active++;
    else if (m.status === 'deployed') deployed++;
    else inactive++;
  }
  return {
    totalMembers: state.members.size,
    activeMembers: active,
    deployedMembers: deployed,
    inactiveMembers: inactive,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createSurveyRoster(deps: SurveyRosterDeps): SurveyRoster {
  const state: RosterState = {
    deps,
    members: new Map(),
    dynastyIndex: new Map(),
  };
  return {
    enroll: (p) => enrollImpl(state, p),
    getMember: (id) => {
      const m = state.members.get(id);
      return m ? toReadonly(m) : undefined;
    },
    getByDynasty: (did) => {
      const mid = state.dynastyIndex.get(did);
      if (mid === undefined) return undefined;
      const m = state.members.get(mid);
      return m ? toReadonly(m) : undefined;
    },
    deploy: (id) => deployImpl(state, id),
    recall: (id) => recallImpl(state, id),
    completeMission: (id) => completeMissionImpl(state, id),
    deactivate: (id) => deactivateImpl(state, id),
    reactivate: (id) => reactivateImpl(state, id),
    listByStatus: (s) => listByStatusImpl(state, s),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createSurveyRoster };
export type {
  SurveyRoster,
  SurveyRosterDeps,
  RosterMember,
  RosterMemberStatus,
  SurveySpecialisation,
  EnrollParams,
  RosterStats,
};
