/**
 * Alliance Engine — Multi-dynasty alliance formation and management.
 *
 * Models inter-dynasty alliances with full lifecycle from formation
 * through ratification to dissolution. Supports multiple alliance types
 * with configurable member limits, treasury pooling, and resource
 * sharing agreements.
 *
 * Alliance Lifecycle:
 *   FORMING     → Founder creates, invites arrive
 *   RATIFIED    → Charter vote passed, alliance formalised
 *   ACTIVE      → Operating normally
 *   DISSOLVING  → Dissolution vote in progress
 *   DISSOLVED   → Terminal state
 */

// ── Ports ────────────────────────────────────────────────────────

export interface AllianceClock {
  readonly nowMicroseconds: () => number;
}

export interface AllianceIdGenerator {
  readonly generate: () => string;
}

export interface AllianceNotificationPort {
  readonly notify: (dynastyId: string, event: AllianceEvent) => void;
}

// ── Types ────────────────────────────────────────────────────────

export type AlliancePhase = 'FORMING' | 'RATIFIED' | 'ACTIVE' | 'DISSOLVING' | 'DISSOLVED';

export type AllianceType =
  | 'MUTUAL_DEFENSE'
  | 'TRADE_PACT'
  | 'RESEARCH_COALITION'
  | 'POLITICAL_BLOC'
  | 'GRAND_ALLIANCE';

export type MemberRole = 'FOUNDER' | 'OFFICER' | 'MEMBER';
export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export type AllianceEventKind =
  | 'INVITED'
  | 'JOINED'
  | 'LEFT'
  | 'EXPELLED'
  | 'RATIFIED'
  | 'DISSOLVED'
  | 'CONTRIBUTION_RECEIVED';

export interface AllianceEvent {
  readonly kind: AllianceEventKind;
  readonly allianceId: string;
  readonly dynastyId: string;
  readonly timestamp: number;
}

export interface AllianceMember {
  readonly dynastyId: string;
  readonly role: MemberRole;
  readonly joinedAt: number;
  readonly contributionTotal: bigint;
}

export interface AllianceInvite {
  readonly inviteId: string;
  readonly allianceId: string;
  readonly inviterId: string;
  readonly inviteeId: string;
  readonly status: InviteStatus;
  readonly createdAt: number;
}

export interface ResourceAgreement {
  readonly resourceType: string;
  readonly sharePercentage: number;
}

export interface AllianceRecord {
  readonly allianceId: string;
  readonly name: string;
  readonly allianceType: AllianceType;
  readonly phase: AlliancePhase;
  readonly founderId: string;
  readonly charter: string;
  readonly members: ReadonlyArray<AllianceMember>;
  readonly treasury: bigint;
  readonly resourceAgreements: ReadonlyArray<ResourceAgreement>;
  readonly createdAt: number;
  readonly ratifiedAt: number;
  readonly dissolvedAt: number;
}

export interface CreateAllianceParams {
  readonly name: string;
  readonly allianceType: AllianceType;
  readonly founderId: string;
  readonly charter: string;
  readonly initialMembers?: ReadonlyArray<string>;
}

export interface ContributeParams {
  readonly allianceId: string;
  readonly dynastyId: string;
  readonly amount: bigint;
}

export interface AllianceEngineStats {
  readonly totalAlliances: number;
  readonly activeAlliances: number;
  readonly totalMembers: number;
  readonly totalTreasuryValue: bigint;
}

export interface AllianceEngine {
  readonly create: (params: CreateAllianceParams) => AllianceRecord;
  readonly invite: (allianceId: string, inviterId: string, inviteeId: string) => AllianceInvite;
  readonly acceptInvite: (inviteId: string) => AllianceRecord;
  readonly rejectInvite: (inviteId: string) => AllianceInvite;
  readonly ratify: (allianceId: string) => AllianceRecord;
  readonly expel: (allianceId: string, dynastyId: string) => AllianceRecord;
  readonly leave: (allianceId: string, dynastyId: string) => AllianceRecord;
  readonly dissolve: (allianceId: string) => AllianceRecord;
  readonly contribute: (params: ContributeParams) => AllianceRecord;
  readonly setResourceAgreement: (
    allianceId: string,
    agreement: ResourceAgreement,
  ) => AllianceRecord;
  readonly getAlliance: (allianceId: string) => AllianceRecord | undefined;
  readonly listByDynasty: (dynastyId: string) => ReadonlyArray<AllianceRecord>;
  readonly isMember: (allianceId: string, dynastyId: string) => boolean;
  readonly getStats: () => AllianceEngineStats;
}

export interface AllianceEngineDeps {
  readonly clock: AllianceClock;
  readonly idGenerator: AllianceIdGenerator;
  readonly notifications: AllianceNotificationPort;
}

// ── Constants ────────────────────────────────────────────────────

const MEMBER_LIMITS: Readonly<Record<AllianceType, number>> = {
  MUTUAL_DEFENSE: 5,
  TRADE_PACT: 10,
  RESEARCH_COALITION: 8,
  POLITICAL_BLOC: 20,
  GRAND_ALLIANCE: 50,
};

const MIN_MEMBERS_TO_RATIFY = 2;

// ── State ────────────────────────────────────────────────────────

interface MutableMember {
  readonly dynastyId: string;
  role: MemberRole;
  readonly joinedAt: number;
  contributionTotal: bigint;
}

interface MutableInvite {
  readonly inviteId: string;
  readonly allianceId: string;
  readonly inviterId: string;
  readonly inviteeId: string;
  status: InviteStatus;
  readonly createdAt: number;
}

interface MutableAlliance {
  readonly allianceId: string;
  readonly name: string;
  readonly allianceType: AllianceType;
  phase: AlliancePhase;
  readonly founderId: string;
  charter: string;
  readonly members: Map<string, MutableMember>;
  treasury: bigint;
  readonly resourceAgreements: Map<string, ResourceAgreement>;
  readonly createdAt: number;
  ratifiedAt: number;
  dissolvedAt: number;
}

interface EngineState {
  readonly deps: AllianceEngineDeps;
  readonly alliances: Map<string, MutableAlliance>;
  readonly invites: Map<string, MutableInvite>;
  readonly dynastyAlliances: Map<string, Set<string>>;
}

// ── Helpers ──────────────────────────────────────────────────────

function memberToReadonly(m: MutableMember): AllianceMember {
  return {
    dynastyId: m.dynastyId,
    role: m.role,
    joinedAt: m.joinedAt,
    contributionTotal: m.contributionTotal,
  };
}

function allianceToReadonly(a: MutableAlliance): AllianceRecord {
  const members: AllianceMember[] = [];
  for (const m of a.members.values()) {
    members.push(memberToReadonly(m));
  }
  return {
    allianceId: a.allianceId,
    name: a.name,
    allianceType: a.allianceType,
    phase: a.phase,
    founderId: a.founderId,
    charter: a.charter,
    members,
    treasury: a.treasury,
    resourceAgreements: Array.from(a.resourceAgreements.values()),
    createdAt: a.createdAt,
    ratifiedAt: a.ratifiedAt,
    dissolvedAt: a.dissolvedAt,
  };
}

function inviteToReadonly(inv: MutableInvite): AllianceInvite {
  return {
    inviteId: inv.inviteId,
    allianceId: inv.allianceId,
    inviterId: inv.inviterId,
    inviteeId: inv.inviteeId,
    status: inv.status,
    createdAt: inv.createdAt,
  };
}

function requireAlliance(state: EngineState, allianceId: string): MutableAlliance {
  const a = state.alliances.get(allianceId);
  if (!a) throw new Error('Alliance ' + allianceId + ' not found');
  return a;
}

function requireNotDissolved(a: MutableAlliance): void {
  if (a.phase === 'DISSOLVED') {
    throw new Error('Alliance ' + a.allianceId + ' is dissolved');
  }
}

function trackDynasty(state: EngineState, dynastyId: string, allianceId: string): void {
  let set = state.dynastyAlliances.get(dynastyId);
  if (!set) {
    set = new Set();
    state.dynastyAlliances.set(dynastyId, set);
  }
  set.add(allianceId);
}

function untrackDynasty(state: EngineState, dynastyId: string, allianceId: string): void {
  const set = state.dynastyAlliances.get(dynastyId);
  if (set) set.delete(allianceId);
}

function emitEvent(
  state: EngineState,
  kind: AllianceEventKind,
  allianceId: string,
  dynastyId: string,
): void {
  state.deps.notifications.notify(dynastyId, {
    kind,
    allianceId,
    dynastyId,
    timestamp: state.deps.clock.nowMicroseconds(),
  });
}

function memberLimit(allianceType: AllianceType): number {
  return MEMBER_LIMITS[allianceType];
}

// ── Operations ───────────────────────────────────────────────────

function createImpl(state: EngineState, params: CreateAllianceParams): AllianceRecord {
  const now = state.deps.clock.nowMicroseconds();
  const allianceId = state.deps.idGenerator.generate();
  const members = new Map<string, MutableMember>();
  members.set(params.founderId, {
    dynastyId: params.founderId,
    role: 'FOUNDER',
    joinedAt: now,
    contributionTotal: 0n,
  });
  const alliance: MutableAlliance = {
    allianceId,
    name: params.name,
    allianceType: params.allianceType,
    phase: 'FORMING',
    founderId: params.founderId,
    charter: params.charter,
    members,
    treasury: 0n,
    resourceAgreements: new Map(),
    createdAt: now,
    ratifiedAt: 0,
    dissolvedAt: 0,
  };
  state.alliances.set(allianceId, alliance);
  trackDynasty(state, params.founderId, allianceId);
  sendInitialInvites(state, alliance, params.initialMembers);
  return allianceToReadonly(alliance);
}

function sendInitialInvites(
  state: EngineState,
  alliance: MutableAlliance,
  initialMembers?: ReadonlyArray<string>,
): void {
  if (!initialMembers) return;
  for (const memberId of initialMembers) {
    if (memberId === alliance.founderId) continue;
    inviteImpl(state, alliance.allianceId, alliance.founderId, memberId);
  }
}

function inviteImpl(
  state: EngineState,
  allianceId: string,
  inviterId: string,
  inviteeId: string,
): AllianceInvite {
  const alliance = requireAlliance(state, allianceId);
  requireNotDissolved(alliance);
  if (!alliance.members.has(inviterId)) {
    throw new Error('Inviter ' + inviterId + ' is not a member');
  }
  if (alliance.members.has(inviteeId)) {
    throw new Error('Dynasty ' + inviteeId + ' is already a member');
  }
  if (alliance.members.size >= memberLimit(alliance.allianceType)) {
    throw new Error('Alliance has reached member limit');
  }
  const invite: MutableInvite = {
    inviteId: state.deps.idGenerator.generate(),
    allianceId,
    inviterId,
    inviteeId,
    status: 'PENDING',
    createdAt: state.deps.clock.nowMicroseconds(),
  };
  state.invites.set(invite.inviteId, invite);
  emitEvent(state, 'INVITED', allianceId, inviteeId);
  return inviteToReadonly(invite);
}

function acceptInviteImpl(state: EngineState, inviteId: string): AllianceRecord {
  const invite = state.invites.get(inviteId);
  if (!invite) throw new Error('Invite ' + inviteId + ' not found');
  if (invite.status !== 'PENDING') {
    throw new Error('Invite ' + inviteId + ' is not pending');
  }
  const alliance = requireAlliance(state, invite.allianceId);
  requireNotDissolved(alliance);
  if (alliance.members.size >= memberLimit(alliance.allianceType)) {
    throw new Error('Alliance has reached member limit');
  }
  invite.status = 'ACCEPTED';
  const now = state.deps.clock.nowMicroseconds();
  alliance.members.set(invite.inviteeId, {
    dynastyId: invite.inviteeId,
    role: 'MEMBER',
    joinedAt: now,
    contributionTotal: 0n,
  });
  trackDynasty(state, invite.inviteeId, alliance.allianceId);
  emitEvent(state, 'JOINED', alliance.allianceId, invite.inviteeId);
  return allianceToReadonly(alliance);
}

function rejectInviteImpl(state: EngineState, inviteId: string): AllianceInvite {
  const invite = state.invites.get(inviteId);
  if (!invite) throw new Error('Invite ' + inviteId + ' not found');
  if (invite.status !== 'PENDING') {
    throw new Error('Invite ' + inviteId + ' is not pending');
  }
  invite.status = 'REJECTED';
  return inviteToReadonly(invite);
}

function ratifyImpl(state: EngineState, allianceId: string): AllianceRecord {
  const alliance = requireAlliance(state, allianceId);
  if (alliance.phase !== 'FORMING') {
    throw new Error('Alliance ' + allianceId + ' is not in FORMING phase');
  }
  if (alliance.members.size < MIN_MEMBERS_TO_RATIFY) {
    throw new Error('Need at least ' + String(MIN_MEMBERS_TO_RATIFY) + ' members to ratify');
  }
  alliance.phase = 'RATIFIED';
  alliance.ratifiedAt = state.deps.clock.nowMicroseconds();
  alliance.phase = 'ACTIVE';
  for (const m of alliance.members.values()) {
    emitEvent(state, 'RATIFIED', allianceId, m.dynastyId);
  }
  return allianceToReadonly(alliance);
}

function expelImpl(state: EngineState, allianceId: string, dynastyId: string): AllianceRecord {
  const alliance = requireAlliance(state, allianceId);
  requireNotDissolved(alliance);
  if (dynastyId === alliance.founderId) {
    throw new Error('Cannot expel the founder');
  }
  if (!alliance.members.has(dynastyId)) {
    throw new Error('Dynasty ' + dynastyId + ' is not a member');
  }
  alliance.members.delete(dynastyId);
  untrackDynasty(state, dynastyId, allianceId);
  emitEvent(state, 'EXPELLED', allianceId, dynastyId);
  return allianceToReadonly(alliance);
}

function leaveImpl(state: EngineState, allianceId: string, dynastyId: string): AllianceRecord {
  const alliance = requireAlliance(state, allianceId);
  requireNotDissolved(alliance);
  if (dynastyId === alliance.founderId) {
    throw new Error('Founder cannot leave; dissolve the alliance instead');
  }
  if (!alliance.members.has(dynastyId)) {
    throw new Error('Dynasty ' + dynastyId + ' is not a member');
  }
  alliance.members.delete(dynastyId);
  untrackDynasty(state, dynastyId, allianceId);
  emitEvent(state, 'LEFT', allianceId, dynastyId);
  return allianceToReadonly(alliance);
}

function dissolveImpl(state: EngineState, allianceId: string): AllianceRecord {
  const alliance = requireAlliance(state, allianceId);
  requireNotDissolved(alliance);
  alliance.phase = 'DISSOLVED';
  alliance.dissolvedAt = state.deps.clock.nowMicroseconds();
  for (const m of alliance.members.values()) {
    untrackDynasty(state, m.dynastyId, allianceId);
    emitEvent(state, 'DISSOLVED', allianceId, m.dynastyId);
  }
  return allianceToReadonly(alliance);
}

function contributeImpl(state: EngineState, params: ContributeParams): AllianceRecord {
  const alliance = requireAlliance(state, params.allianceId);
  requireNotDissolved(alliance);
  if (params.amount <= 0n) {
    throw new Error('Contribution must be positive');
  }
  const member = alliance.members.get(params.dynastyId);
  if (!member) {
    throw new Error('Dynasty ' + params.dynastyId + ' is not a member');
  }
  alliance.treasury += params.amount;
  member.contributionTotal += params.amount;
  emitEvent(state, 'CONTRIBUTION_RECEIVED', params.allianceId, params.dynastyId);
  return allianceToReadonly(alliance);
}

function setResourceAgreementImpl(
  state: EngineState,
  allianceId: string,
  agreement: ResourceAgreement,
): AllianceRecord {
  const alliance = requireAlliance(state, allianceId);
  requireNotDissolved(alliance);
  if (agreement.sharePercentage < 0 || agreement.sharePercentage > 100) {
    throw new Error('Share percentage must be between 0 and 100');
  }
  alliance.resourceAgreements.set(agreement.resourceType, agreement);
  return allianceToReadonly(alliance);
}

function listByDynastyImpl(state: EngineState, dynastyId: string): AllianceRecord[] {
  const ids = state.dynastyAlliances.get(dynastyId);
  if (!ids) return [];
  const results: AllianceRecord[] = [];
  for (const id of ids) {
    const a = state.alliances.get(id);
    if (a) results.push(allianceToReadonly(a));
  }
  return results;
}

function isMemberImpl(state: EngineState, allianceId: string, dynastyId: string): boolean {
  const a = state.alliances.get(allianceId);
  return a ? a.members.has(dynastyId) : false;
}

function getStatsImpl(state: EngineState): AllianceEngineStats {
  let active = 0;
  let totalMembers = 0;
  let totalTreasury = 0n;
  for (const a of state.alliances.values()) {
    if (a.phase !== 'DISSOLVED') active++;
    totalMembers += a.members.size;
    totalTreasury += a.treasury;
  }
  return {
    totalAlliances: state.alliances.size,
    activeAlliances: active,
    totalMembers,
    totalTreasuryValue: totalTreasury,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createAllianceEngine(deps: AllianceEngineDeps): AllianceEngine {
  const state: EngineState = {
    deps,
    alliances: new Map(),
    invites: new Map(),
    dynastyAlliances: new Map(),
  };
  return {
    create: (p) => createImpl(state, p),
    invite: (aid, uid, tid) => inviteImpl(state, aid, uid, tid),
    acceptInvite: (iid) => acceptInviteImpl(state, iid),
    rejectInvite: (iid) => rejectInviteImpl(state, iid),
    ratify: (aid) => ratifyImpl(state, aid),
    expel: (aid, did) => expelImpl(state, aid, did),
    leave: (aid, did) => leaveImpl(state, aid, did),
    dissolve: (aid) => dissolveImpl(state, aid),
    contribute: (p) => contributeImpl(state, p),
    setResourceAgreement: (aid, ag) => setResourceAgreementImpl(state, aid, ag),
    getAlliance: (aid) => {
      const a = state.alliances.get(aid);
      return a ? allianceToReadonly(a) : undefined;
    },
    listByDynasty: (did) => listByDynastyImpl(state, did),
    isMember: (aid, did) => isMemberImpl(state, aid, did),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createAllianceEngine, MEMBER_LIMITS, MIN_MEMBERS_TO_RATIFY };
