/**
 * guild-system.ts — Guild management with membership, ranks, and collective treasury.
 *
 * Guilds are player organisations tied to a world with a shared KALON treasury.
 * Members hold ranks (INITIATE → LEADER) that govern treasury access.
 * Only OFFICER and LEADER ranks may withdraw from treasury.
 * Leaders cannot be removed — the guild must be disbanded instead.
 *
 * All KALON amounts stored as micro-KALON (bigint, 10^6 precision).
 * All timestamps stored as microseconds (bigint).
 */

// ── Types ────────────────────────────────────────────────────────

export type GuildId = string;
export type MemberId = string;

export type GuildRank = 'INITIATE' | 'MEMBER' | 'VETERAN' | 'OFFICER' | 'LEADER';

export type GuildError =
  | 'guild-not-found'
  | 'member-not-found'
  | 'already-member'
  | 'not-member'
  | 'insufficient-rank'
  | 'invalid-amount'
  | 'insufficient-funds'
  | 'cannot-remove-leader'
  | 'guild-name-taken';

export interface GuildMember {
  readonly memberId: MemberId;
  readonly guildId: GuildId;
  readonly rank: GuildRank;
  readonly joinedAt: bigint;
  readonly contributionKalon: bigint;
}

export interface Guild {
  readonly guildId: GuildId;
  readonly name: string;
  readonly leaderId: MemberId;
  readonly members: Map<MemberId, GuildMember>;
  readonly treasuryKalon: bigint;
  readonly createdAt: bigint;
  readonly worldId: string;
}

export interface GuildActivity {
  readonly activityId: string;
  readonly guildId: GuildId;
  readonly type: 'JOIN' | 'LEAVE' | 'RANK_CHANGE' | 'DEPOSIT' | 'WITHDRAWAL';
  readonly memberId: MemberId | null;
  readonly details: string;
  readonly occurredAt: bigint;
}

export interface GuildStats {
  readonly guildId: GuildId;
  readonly memberCount: number;
  readonly totalContributions: bigint;
  readonly treasury: bigint;
  readonly averageRank: number;
}

// ── System Interface ─────────────────────────────────────────────

export interface GuildSystem {
  createGuild(
    name: string,
    leaderId: MemberId,
    worldId: string,
    initialTreasury?: bigint,
  ): Guild | GuildError;
  addMember(
    guildId: GuildId,
    memberId: MemberId,
  ):
    | { readonly success: true; readonly member: GuildMember }
    | { readonly success: false; readonly error: GuildError };
  removeMember(
    guildId: GuildId,
    memberId: MemberId,
  ): { readonly success: true } | { readonly success: false; readonly error: GuildError };
  changeRank(
    guildId: GuildId,
    memberId: MemberId,
    newRank: GuildRank,
  ): { readonly success: true } | { readonly success: false; readonly error: GuildError };
  depositToTreasury(
    guildId: GuildId,
    memberId: MemberId,
    amountKalon: bigint,
  ): { readonly success: true } | { readonly success: false; readonly error: GuildError };
  withdrawFromTreasury(
    guildId: GuildId,
    memberId: MemberId,
    amountKalon: bigint,
  ): { readonly success: true } | { readonly success: false; readonly error: GuildError };
  getGuild(guildId: GuildId): Guild | undefined;
  getMember(guildId: GuildId, memberId: MemberId): GuildMember | undefined;
  getActivityLog(guildId: GuildId, limit: number): ReadonlyArray<GuildActivity>;
  getGuildStats(guildId: GuildId): GuildStats | undefined;
}

// ── Ports ────────────────────────────────────────────────────────

interface GuildSystemClock {
  nowMicroseconds(): bigint;
}

interface GuildSystemIdGen {
  generateId(): string;
}

interface GuildSystemLogger {
  info(message: string, meta?: Record<string, unknown>): void;
}

export interface GuildSystemDeps {
  readonly clock: GuildSystemClock;
  readonly idGen: GuildSystemIdGen;
  readonly logger: GuildSystemLogger;
}

// ── Constants ────────────────────────────────────────────────────

const RANK_VALUES: Record<GuildRank, number> = {
  INITIATE: 1,
  MEMBER: 2,
  VETERAN: 3,
  OFFICER: 4,
  LEADER: 5,
};

const WITHDRAWAL_MIN_RANK: GuildRank = 'OFFICER';

// ── Internal State ───────────────────────────────────────────────

interface MutableGuildMember {
  readonly memberId: MemberId;
  readonly guildId: GuildId;
  rank: GuildRank;
  readonly joinedAt: bigint;
  contributionKalon: bigint;
}

interface MutableGuild {
  readonly guildId: GuildId;
  readonly name: string;
  leaderId: MemberId;
  readonly members: Map<MemberId, MutableGuildMember>;
  treasuryKalon: bigint;
  readonly createdAt: bigint;
  readonly worldId: string;
}

interface GuildSystemState {
  readonly guilds: Map<GuildId, MutableGuild>;
  readonly nameIndex: Set<string>;
  readonly activityLog: GuildActivity[];
  readonly deps: GuildSystemDeps;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonlyMember(member: MutableGuildMember): GuildMember {
  return {
    memberId: member.memberId,
    guildId: member.guildId,
    rank: member.rank,
    joinedAt: member.joinedAt,
    contributionKalon: member.contributionKalon,
  };
}

function toReadonlyGuild(guild: MutableGuild): Guild {
  const members = new Map<MemberId, GuildMember>();
  for (const [id, m] of guild.members) {
    members.set(id, toReadonlyMember(m));
  }
  return {
    guildId: guild.guildId,
    name: guild.name,
    leaderId: guild.leaderId,
    members,
    treasuryKalon: guild.treasuryKalon,
    createdAt: guild.createdAt,
    worldId: guild.worldId,
  };
}

function recordActivity(
  state: GuildSystemState,
  guildId: GuildId,
  type: GuildActivity['type'],
  memberId: MemberId | null,
  details: string,
): void {
  state.activityLog.push({
    activityId: state.deps.idGen.generateId(),
    guildId,
    type,
    memberId,
    details,
    occurredAt: state.deps.clock.nowMicroseconds(),
  });
}

function canWithdraw(rank: GuildRank): boolean {
  return RANK_VALUES[rank] >= RANK_VALUES[WITHDRAWAL_MIN_RANK];
}

// ── Guild Creation ───────────────────────────────────────────────

function buildLeaderMember(leaderId: MemberId, guildId: GuildId, now: bigint): MutableGuildMember {
  return { memberId: leaderId, guildId, rank: 'LEADER', joinedAt: now, contributionKalon: 0n };
}

function buildGuild(
  guildId: GuildId,
  name: string,
  leaderId: MemberId,
  worldId: string,
  initialTreasury: bigint,
  now: bigint,
): MutableGuild {
  const leaderMember = buildLeaderMember(leaderId, guildId, now);
  return {
    guildId,
    name,
    leaderId,
    members: new Map([[leaderId, leaderMember]]),
    treasuryKalon: initialTreasury,
    createdAt: now,
    worldId,
  };
}

function createGuildImpl(
  state: GuildSystemState,
  name: string,
  leaderId: MemberId,
  worldId: string,
  initialTreasury: bigint,
): Guild | GuildError {
  if (state.nameIndex.has(name)) return 'guild-name-taken';
  const guildId = state.deps.idGen.generateId();
  const guild = buildGuild(
    guildId,
    name,
    leaderId,
    worldId,
    initialTreasury,
    state.deps.clock.nowMicroseconds(),
  );
  state.guilds.set(guildId, guild);
  state.nameIndex.add(name);
  recordActivity(state, guildId, 'JOIN', leaderId, 'guild-founded');
  state.deps.logger.info('guild-created', { guildId, name, leaderId });
  return toReadonlyGuild(guild);
}

// ── Membership Operations ────────────────────────────────────────

function addMemberImpl(
  state: GuildSystemState,
  guildId: GuildId,
  memberId: MemberId,
):
  | { readonly success: true; readonly member: GuildMember }
  | { readonly success: false; readonly error: GuildError } {
  const guild = state.guilds.get(guildId);
  if (guild === undefined) return { success: false, error: 'guild-not-found' };
  if (guild.members.has(memberId)) return { success: false, error: 'already-member' };
  const member: MutableGuildMember = {
    memberId,
    guildId,
    rank: 'INITIATE',
    joinedAt: state.deps.clock.nowMicroseconds(),
    contributionKalon: 0n,
  };
  guild.members.set(memberId, member);
  recordActivity(state, guildId, 'JOIN', memberId, 'member-joined');
  return { success: true, member: toReadonlyMember(member) };
}

function removeMemberImpl(
  state: GuildSystemState,
  guildId: GuildId,
  memberId: MemberId,
): { readonly success: true } | { readonly success: false; readonly error: GuildError } {
  const guild = state.guilds.get(guildId);
  if (guild === undefined) return { success: false, error: 'guild-not-found' };
  const member = guild.members.get(memberId);
  if (member === undefined) return { success: false, error: 'not-member' };
  if (member.rank === 'LEADER') return { success: false, error: 'cannot-remove-leader' };
  guild.members.delete(memberId);
  recordActivity(state, guildId, 'LEAVE', memberId, 'member-removed');
  return { success: true };
}

function changeRankImpl(
  state: GuildSystemState,
  guildId: GuildId,
  memberId: MemberId,
  newRank: GuildRank,
): { readonly success: true } | { readonly success: false; readonly error: GuildError } {
  const guild = state.guilds.get(guildId);
  if (guild === undefined) return { success: false, error: 'guild-not-found' };
  const member = guild.members.get(memberId);
  if (member === undefined) return { success: false, error: 'not-member' };
  const oldRank = member.rank;
  member.rank = newRank;
  if (newRank === 'LEADER') guild.leaderId = memberId;
  recordActivity(state, guildId, 'RANK_CHANGE', memberId, `${oldRank}->${newRank}`);
  return { success: true };
}

// ── Treasury Operations ──────────────────────────────────────────

function depositToTreasuryImpl(
  state: GuildSystemState,
  guildId: GuildId,
  memberId: MemberId,
  amountKalon: bigint,
): { readonly success: true } | { readonly success: false; readonly error: GuildError } {
  if (amountKalon < 1n) return { success: false, error: 'invalid-amount' };
  const guild = state.guilds.get(guildId);
  if (guild === undefined) return { success: false, error: 'guild-not-found' };
  const member = guild.members.get(memberId);
  if (member === undefined) return { success: false, error: 'not-member' };
  guild.treasuryKalon += amountKalon;
  member.contributionKalon += amountKalon;
  recordActivity(state, guildId, 'DEPOSIT', memberId, String(amountKalon));
  return { success: true };
}

function withdrawFromTreasuryImpl(
  state: GuildSystemState,
  guildId: GuildId,
  memberId: MemberId,
  amountKalon: bigint,
): { readonly success: true } | { readonly success: false; readonly error: GuildError } {
  if (amountKalon < 1n) return { success: false, error: 'invalid-amount' };
  const guild = state.guilds.get(guildId);
  if (guild === undefined) return { success: false, error: 'guild-not-found' };
  const member = guild.members.get(memberId);
  if (member === undefined) return { success: false, error: 'not-member' };
  if (!canWithdraw(member.rank)) return { success: false, error: 'insufficient-rank' };
  if (guild.treasuryKalon < amountKalon) return { success: false, error: 'insufficient-funds' };
  guild.treasuryKalon -= amountKalon;
  recordActivity(state, guildId, 'WITHDRAWAL', memberId, String(amountKalon));
  return { success: true };
}

// ── Queries ──────────────────────────────────────────────────────

function getGuildImpl(state: GuildSystemState, guildId: GuildId): Guild | undefined {
  const guild = state.guilds.get(guildId);
  return guild === undefined ? undefined : toReadonlyGuild(guild);
}

function getMemberImpl(
  state: GuildSystemState,
  guildId: GuildId,
  memberId: MemberId,
): GuildMember | undefined {
  const guild = state.guilds.get(guildId);
  if (guild === undefined) return undefined;
  const member = guild.members.get(memberId);
  return member === undefined ? undefined : toReadonlyMember(member);
}

function getActivityLogImpl(
  state: GuildSystemState,
  guildId: GuildId,
  limit: number,
): ReadonlyArray<GuildActivity> {
  const filtered = state.activityLog.filter((a) => a.guildId === guildId);
  return filtered.slice(-limit);
}

function getGuildStatsImpl(state: GuildSystemState, guildId: GuildId): GuildStats | undefined {
  const guild = state.guilds.get(guildId);
  if (guild === undefined) return undefined;
  let totalContributions = 0n;
  let totalRankValue = 0;
  for (const member of guild.members.values()) {
    totalContributions += member.contributionKalon;
    totalRankValue += RANK_VALUES[member.rank];
  }
  const memberCount = guild.members.size;
  const averageRank = memberCount > 0 ? totalRankValue / memberCount : 0;
  return {
    guildId,
    memberCount,
    totalContributions,
    treasury: guild.treasuryKalon,
    averageRank,
  };
}

// ── Factory ──────────────────────────────────────────────────────

export function createGuildSystem(deps: GuildSystemDeps): GuildSystem {
  const state: GuildSystemState = {
    guilds: new Map(),
    nameIndex: new Set(),
    activityLog: [],
    deps,
  };

  return {
    createGuild: (name, leaderId, worldId, initialTreasury = 0n) =>
      createGuildImpl(state, name, leaderId, worldId, initialTreasury),
    addMember: (guildId, memberId) => addMemberImpl(state, guildId, memberId),
    removeMember: (guildId, memberId) => removeMemberImpl(state, guildId, memberId),
    changeRank: (guildId, memberId, newRank) => changeRankImpl(state, guildId, memberId, newRank),
    depositToTreasury: (guildId, memberId, amountKalon) =>
      depositToTreasuryImpl(state, guildId, memberId, amountKalon),
    withdrawFromTreasury: (guildId, memberId, amountKalon) =>
      withdrawFromTreasuryImpl(state, guildId, memberId, amountKalon),
    getGuild: (guildId) => getGuildImpl(state, guildId),
    getMember: (guildId, memberId) => getMemberImpl(state, guildId, memberId),
    getActivityLog: (guildId, limit) => getActivityLogImpl(state, guildId, limit),
    getGuildStats: (guildId) => getGuildStatsImpl(state, guildId),
  };
}
