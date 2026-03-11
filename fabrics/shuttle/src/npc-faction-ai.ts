/**
 * npc-faction-ai.ts — NPC faction behavior orchestration.
 *
 * Faction loyalty influence on NPC decisions, faction territory
 * patrol patterns, inter-faction diplomacy NPC roles, faction
 * event responses, and recruitment behavior.
 *
 * Unlike npc-faction.ts (affinity tracking), this module owns
 * the AI-driven faction behaviors: patrols, diplomacy, events.
 */

// ── Ports ────────────────────────────────────────────────────────

interface FactionAIClock {
  readonly nowMicroseconds: () => number;
}

interface FactionAIIdGenerator {
  readonly generate: () => string;
}

interface NpcFactionAIDeps {
  readonly clock: FactionAIClock;
  readonly idGenerator: FactionAIIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type FactionRole = 'soldier' | 'diplomat' | 'recruiter' | 'scout' | 'leader';

type PatrolStatus = 'idle' | 'patrolling' | 'returning' | 'completed';

type DiplomacyStance = 'hostile' | 'cautious' | 'neutral' | 'friendly' | 'allied';

type EventResponseType = 'defend' | 'retreat' | 'negotiate' | 'ignore' | 'rally';

interface FactionMember {
  readonly memberId: string;
  readonly npcId: string;
  readonly factionId: string;
  readonly role: FactionRole;
  readonly loyalty: number;
  readonly joinedAt: number;
}

interface PatrolRoute {
  readonly routeId: string;
  readonly factionId: string;
  readonly waypoints: readonly string[];
  readonly priority: number;
}

interface PatrolAssignment {
  readonly assignmentId: string;
  readonly npcId: string;
  readonly routeId: string;
  readonly currentWaypointIndex: number;
  readonly status: PatrolStatus;
  readonly startedAt: number;
}

interface DiplomacyRelation {
  readonly relationId: string;
  readonly factionA: string;
  readonly factionB: string;
  readonly stance: DiplomacyStance;
  readonly lastUpdatedAt: number;
}

interface FactionEvent {
  readonly eventId: string;
  readonly factionId: string;
  readonly eventType: string;
  readonly severity: number;
  readonly location: string;
  readonly occurredAt: number;
}

interface EventResponse {
  readonly responseId: string;
  readonly eventId: string;
  readonly npcId: string;
  readonly responseType: EventResponseType;
  readonly decidedAt: number;
}

interface RecruitmentAttempt {
  readonly attemptId: string;
  readonly recruiterId: string;
  readonly targetNpcId: string;
  readonly factionId: string;
  readonly success: boolean;
  readonly attemptedAt: number;
}

interface LoyaltyDecision {
  readonly npcId: string;
  readonly factionId: string;
  readonly loyalty: number;
  readonly action: string;
  readonly willComply: boolean;
}

interface NpcFactionAIStats {
  readonly totalMembers: number;
  readonly totalPatrolRoutes: number;
  readonly totalAssignments: number;
  readonly totalDiplomacyRelations: number;
  readonly totalRecruitmentAttempts: number;
}

// ── Constants ────────────────────────────────────────────────────

const LOYALTY_MIN = 0;
const LOYALTY_MAX = 100;
const LOYALTY_COMPLY_THRESHOLD = 30;
const RECRUITMENT_BASE_CHANCE = 0.5;
const LOYALTY_RECRUITMENT_BONUS = 0.005;

// ── State ────────────────────────────────────────────────────────

interface MutableMember {
  readonly memberId: string;
  readonly npcId: string;
  readonly factionId: string;
  role: FactionRole;
  loyalty: number;
  readonly joinedAt: number;
}

interface MutableAssignment {
  readonly assignmentId: string;
  readonly npcId: string;
  readonly routeId: string;
  currentWaypointIndex: number;
  status: PatrolStatus;
  readonly startedAt: number;
}

interface MutableDiplomacy {
  readonly relationId: string;
  readonly factionA: string;
  readonly factionB: string;
  stance: DiplomacyStance;
  lastUpdatedAt: number;
}

interface FactionAIState {
  readonly deps: NpcFactionAIDeps;
  readonly members: Map<string, MutableMember>;
  readonly npcToFaction: Map<string, string>;
  readonly patrolRoutes: Map<string, PatrolRoute>;
  readonly assignments: Map<string, MutableAssignment>;
  readonly diplomacy: Map<string, MutableDiplomacy>;
  readonly eventResponses: EventResponse[];
  readonly recruitmentAttempts: RecruitmentAttempt[];
}

// ── Public API ───────────────────────────────────────────────────

interface NpcFactionAI {
  readonly addMember: (npcId: string, factionId: string, role: FactionRole) => FactionMember;
  readonly removeMember: (npcId: string) => boolean;
  readonly getMember: (npcId: string) => FactionMember | undefined;
  readonly getMembersByFaction: (factionId: string) => readonly FactionMember[];
  readonly adjustLoyalty: (npcId: string, delta: number) => number;
  readonly evaluateLoyalty: (npcId: string, action: string) => LoyaltyDecision | undefined;
  readonly addPatrolRoute: (route: PatrolRoute) => boolean;
  readonly getPatrolRoute: (routeId: string) => PatrolRoute | undefined;
  readonly getPatrolRoutesForFaction: (factionId: string) => readonly PatrolRoute[];
  readonly assignPatrol: (npcId: string, routeId: string) => PatrolAssignment | undefined;
  readonly advancePatrol: (assignmentId: string) => PatrolAssignment | undefined;
  readonly getAssignment: (assignmentId: string) => PatrolAssignment | undefined;
  readonly setDiplomacy: (
    factionA: string,
    factionB: string,
    stance: DiplomacyStance,
  ) => DiplomacyRelation;
  readonly getDiplomacy: (factionA: string, factionB: string) => DiplomacyStance;
  readonly respondToEvent: (event: FactionEvent, npcId: string) => EventResponse;
  readonly attemptRecruitment: (recruiterId: string, targetNpcId: string) => RecruitmentAttempt;
  readonly getStats: () => NpcFactionAIStats;
}

// ── Helpers ──────────────────────────────────────────────────────

function clampLoyalty(value: number): number {
  return Math.max(LOYALTY_MIN, Math.min(LOYALTY_MAX, value));
}

function diplomacyKey(a: string, b: string): string {
  return a < b ? a + ':' + b : b + ':' + a;
}

function toMember(m: MutableMember): FactionMember {
  return {
    memberId: m.memberId,
    npcId: m.npcId,
    factionId: m.factionId,
    role: m.role,
    loyalty: m.loyalty,
    joinedAt: m.joinedAt,
  };
}

function toAssignment(a: MutableAssignment): PatrolAssignment {
  return {
    assignmentId: a.assignmentId,
    npcId: a.npcId,
    routeId: a.routeId,
    currentWaypointIndex: a.currentWaypointIndex,
    status: a.status,
    startedAt: a.startedAt,
  };
}

function toDiplomacyRelation(d: MutableDiplomacy): DiplomacyRelation {
  return {
    relationId: d.relationId,
    factionA: d.factionA,
    factionB: d.factionB,
    stance: d.stance,
    lastUpdatedAt: d.lastUpdatedAt,
  };
}

function determineResponse(loyalty: number, severity: number): EventResponseType {
  if (loyalty >= 70 && severity >= 7) return 'defend';
  if (loyalty >= 50 && severity >= 5) return 'rally';
  if (loyalty >= 30) return 'negotiate';
  if (severity >= 8) return 'retreat';
  return 'ignore';
}

// ── Operations ───────────────────────────────────────────────────

function addMemberImpl(
  state: FactionAIState,
  npcId: string,
  factionId: string,
  role: FactionRole,
): FactionMember {
  const member: MutableMember = {
    memberId: state.deps.idGenerator.generate(),
    npcId,
    factionId,
    role,
    loyalty: 50,
    joinedAt: state.deps.clock.nowMicroseconds(),
  };
  state.members.set(npcId, member);
  state.npcToFaction.set(npcId, factionId);
  return toMember(member);
}

function getMembersByFactionImpl(
  state: FactionAIState,
  factionId: string,
): readonly FactionMember[] {
  const results: FactionMember[] = [];
  for (const m of state.members.values()) {
    if (m.factionId === factionId) results.push(toMember(m));
  }
  return results;
}

function adjustLoyaltyImpl(state: FactionAIState, npcId: string, delta: number): number {
  const member = state.members.get(npcId);
  if (!member) return 0;
  member.loyalty = clampLoyalty(member.loyalty + delta);
  return member.loyalty;
}

function evaluateLoyaltyImpl(
  state: FactionAIState,
  npcId: string,
  action: string,
): LoyaltyDecision | undefined {
  const member = state.members.get(npcId);
  if (!member) return undefined;
  return {
    npcId,
    factionId: member.factionId,
    loyalty: member.loyalty,
    action,
    willComply: member.loyalty >= LOYALTY_COMPLY_THRESHOLD,
  };
}

function assignPatrolImpl(
  state: FactionAIState,
  npcId: string,
  routeId: string,
): PatrolAssignment | undefined {
  if (!state.members.has(npcId)) return undefined;
  if (!state.patrolRoutes.has(routeId)) return undefined;
  const assignment: MutableAssignment = {
    assignmentId: state.deps.idGenerator.generate(),
    npcId,
    routeId,
    currentWaypointIndex: 0,
    status: 'patrolling',
    startedAt: state.deps.clock.nowMicroseconds(),
  };
  state.assignments.set(assignment.assignmentId, assignment);
  return toAssignment(assignment);
}

function advancePatrolImpl(
  state: FactionAIState,
  assignmentId: string,
): PatrolAssignment | undefined {
  const assignment = state.assignments.get(assignmentId);
  if (!assignment || assignment.status !== 'patrolling') return undefined;
  const route = state.patrolRoutes.get(assignment.routeId);
  if (!route) return undefined;
  const nextIndex = assignment.currentWaypointIndex + 1;
  if (nextIndex >= route.waypoints.length) {
    assignment.status = 'returning';
    return toAssignment(assignment);
  }
  assignment.currentWaypointIndex = nextIndex;
  return toAssignment(assignment);
}

function setDiplomacyImpl(
  state: FactionAIState,
  factionA: string,
  factionB: string,
  stance: DiplomacyStance,
): DiplomacyRelation {
  const key = diplomacyKey(factionA, factionB);
  let rel = state.diplomacy.get(key);
  if (!rel) {
    rel = {
      relationId: state.deps.idGenerator.generate(),
      factionA,
      factionB,
      stance,
      lastUpdatedAt: state.deps.clock.nowMicroseconds(),
    };
    state.diplomacy.set(key, rel);
  } else {
    rel.stance = stance;
    rel.lastUpdatedAt = state.deps.clock.nowMicroseconds();
  }
  return toDiplomacyRelation(rel);
}

function respondToEventImpl(
  state: FactionAIState,
  event: FactionEvent,
  npcId: string,
): EventResponse {
  const member = state.members.get(npcId);
  const loyalty = member ? member.loyalty : 0;
  const responseType = determineResponse(loyalty, event.severity);
  const response: EventResponse = {
    responseId: state.deps.idGenerator.generate(),
    eventId: event.eventId,
    npcId,
    responseType,
    decidedAt: state.deps.clock.nowMicroseconds(),
  };
  state.eventResponses.push(response);
  return response;
}

function attemptRecruitmentImpl(
  state: FactionAIState,
  recruiterId: string,
  targetNpcId: string,
): RecruitmentAttempt {
  const recruiter = state.members.get(recruiterId);
  const factionId = recruiter ? recruiter.factionId : 'unknown';
  const loyalty = recruiter ? recruiter.loyalty : 0;
  const chance = RECRUITMENT_BASE_CHANCE + loyalty * LOYALTY_RECRUITMENT_BONUS;
  const roll = (state.deps.clock.nowMicroseconds() % 100) / 100;
  const success = roll < chance;
  const attempt: RecruitmentAttempt = {
    attemptId: state.deps.idGenerator.generate(),
    recruiterId,
    targetNpcId,
    factionId,
    success,
    attemptedAt: state.deps.clock.nowMicroseconds(),
  };
  state.recruitmentAttempts.push(attempt);
  return attempt;
}

function getStatsImpl(state: FactionAIState): NpcFactionAIStats {
  return {
    totalMembers: state.members.size,
    totalPatrolRoutes: state.patrolRoutes.size,
    totalAssignments: state.assignments.size,
    totalDiplomacyRelations: state.diplomacy.size,
    totalRecruitmentAttempts: state.recruitmentAttempts.length,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function initFactionAIState(deps: NpcFactionAIDeps): FactionAIState {
  return {
    deps,
    members: new Map(),
    npcToFaction: new Map(),
    patrolRoutes: new Map(),
    assignments: new Map(),
    diplomacy: new Map(),
    eventResponses: [],
    recruitmentAttempts: [],
  };
}

function removeMemberImpl(state: FactionAIState, npc: string): boolean {
  state.npcToFaction.delete(npc);
  return state.members.delete(npc);
}

function getMemberImpl(state: FactionAIState, npc: string): FactionMember | undefined {
  const m = state.members.get(npc);
  return m ? toMember(m) : undefined;
}

function addPatrolRouteImpl(state: FactionAIState, r: PatrolRoute): boolean {
  if (state.patrolRoutes.has(r.routeId)) return false;
  state.patrolRoutes.set(r.routeId, r);
  return true;
}

function getPatrolRoutesForFactionImpl(state: FactionAIState, fac: string): readonly PatrolRoute[] {
  const results: PatrolRoute[] = [];
  for (const r of state.patrolRoutes.values()) {
    if (r.factionId === fac) results.push(r);
  }
  return results;
}

function getAssignmentImpl(state: FactionAIState, aid: string): PatrolAssignment | undefined {
  const a = state.assignments.get(aid);
  return a ? toAssignment(a) : undefined;
}

function getDiplomacyImpl(state: FactionAIState, a: string, b: string): DiplomacyStance {
  const r = state.diplomacy.get(diplomacyKey(a, b));
  return r ? r.stance : 'neutral';
}

function buildFactionMemberMethods(
  state: FactionAIState,
): Pick<
  NpcFactionAI,
  | 'addMember'
  | 'removeMember'
  | 'getMember'
  | 'getMembersByFaction'
  | 'adjustLoyalty'
  | 'evaluateLoyalty'
> {
  return {
    addMember: (npc, fac, role) => addMemberImpl(state, npc, fac, role),
    removeMember: (npc) => removeMemberImpl(state, npc),
    getMember: (npc) => getMemberImpl(state, npc),
    getMembersByFaction: (fac) => getMembersByFactionImpl(state, fac),
    adjustLoyalty: (npc, d) => adjustLoyaltyImpl(state, npc, d),
    evaluateLoyalty: (npc, action) => evaluateLoyaltyImpl(state, npc, action),
  };
}

function buildFactionPatrolMethods(
  state: FactionAIState,
): Pick<
  NpcFactionAI,
  | 'addPatrolRoute'
  | 'getPatrolRoute'
  | 'getPatrolRoutesForFaction'
  | 'assignPatrol'
  | 'advancePatrol'
  | 'getAssignment'
> {
  return {
    addPatrolRoute: (r) => addPatrolRouteImpl(state, r),
    getPatrolRoute: (id) => state.patrolRoutes.get(id),
    getPatrolRoutesForFaction: (fac) => getPatrolRoutesForFactionImpl(state, fac),
    assignPatrol: (npc, rid) => assignPatrolImpl(state, npc, rid),
    advancePatrol: (aid) => advancePatrolImpl(state, aid),
    getAssignment: (aid) => getAssignmentImpl(state, aid),
  };
}

function createNpcFactionAI(deps: NpcFactionAIDeps): NpcFactionAI {
  const state = initFactionAIState(deps);
  return {
    ...buildFactionMemberMethods(state),
    ...buildFactionPatrolMethods(state),
    setDiplomacy: (a, b, s) => setDiplomacyImpl(state, a, b, s),
    getDiplomacy: (a, b) => getDiplomacyImpl(state, a, b),
    respondToEvent: (e, npc) => respondToEventImpl(state, e, npc),
    attemptRecruitment: (rec, tgt) => attemptRecruitmentImpl(state, rec, tgt),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export {
  createNpcFactionAI,
  LOYALTY_MIN,
  LOYALTY_MAX,
  LOYALTY_COMPLY_THRESHOLD,
  RECRUITMENT_BASE_CHANCE,
};
export type {
  NpcFactionAI,
  NpcFactionAIDeps,
  FactionRole,
  FactionMember,
  PatrolRoute,
  PatrolAssignment,
  PatrolStatus,
  DiplomacyStance,
  DiplomacyRelation,
  FactionEvent,
  EventResponse,
  EventResponseType,
  RecruitmentAttempt,
  LoyaltyDecision,
  NpcFactionAIStats,
};
