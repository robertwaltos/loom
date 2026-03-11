/**
 * guild-registry.ts — Dynasty guild management.
 *
 * Creates and manages guilds (player organisations) with
 * membership lifecycle, capacity limits, and aggregate statistics.
 * Guilds are scoped to worlds and enforce unique membership.
 */

// ── Ports ────────────────────────────────────────────────────────

interface GuildClock {
  readonly nowMicroseconds: () => number;
}

interface GuildIdGenerator {
  readonly next: () => string;
}

interface GuildRegistryDeps {
  readonly clock: GuildClock;
  readonly idGenerator: GuildIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

interface Guild {
  readonly guildId: string;
  readonly name: string;
  readonly worldId: string;
  readonly leaderId: string;
  readonly memberCount: number;
  readonly createdAt: number;
}

interface CreateGuildParams {
  readonly name: string;
  readonly worldId: string;
  readonly leaderId: string;
}

interface GuildConfig {
  readonly maxMembers: number;
}

interface GuildStats {
  readonly totalGuilds: number;
  readonly totalMembers: number;
  readonly largestGuild: number;
}

interface GuildRegistry {
  readonly create: (params: CreateGuildParams) => Guild;
  readonly disband: (guildId: string) => boolean;
  readonly join: (guildId: string, dynastyId: string) => boolean;
  readonly leave: (guildId: string, dynastyId: string) => boolean;
  readonly isMember: (guildId: string, dynastyId: string) => boolean;
  readonly getGuild: (guildId: string) => Guild | undefined;
  readonly listByWorld: (worldId: string) => readonly Guild[];
  readonly getDynastyGuild: (dynastyId: string) => string | undefined;
  readonly getStats: () => GuildStats;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_GUILD_CONFIG: GuildConfig = {
  maxMembers: 50,
};

// ── State ────────────────────────────────────────────────────────

interface MutableGuild {
  readonly guildId: string;
  readonly name: string;
  readonly worldId: string;
  readonly leaderId: string;
  readonly members: Set<string>;
  readonly createdAt: number;
}

interface GuildState {
  readonly deps: GuildRegistryDeps;
  readonly config: GuildConfig;
  readonly guilds: Map<string, MutableGuild>;
  readonly dynastyToGuild: Map<string, string>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(guild: MutableGuild): Guild {
  return {
    guildId: guild.guildId,
    name: guild.name,
    worldId: guild.worldId,
    leaderId: guild.leaderId,
    memberCount: guild.members.size,
    createdAt: guild.createdAt,
  };
}

// ── Operations ───────────────────────────────────────────────────

function createGuildImpl(state: GuildState, params: CreateGuildParams): Guild {
  const guild: MutableGuild = {
    guildId: state.deps.idGenerator.next(),
    name: params.name,
    worldId: params.worldId,
    leaderId: params.leaderId,
    members: new Set([params.leaderId]),
    createdAt: state.deps.clock.nowMicroseconds(),
  };
  state.guilds.set(guild.guildId, guild);
  state.dynastyToGuild.set(params.leaderId, guild.guildId);
  return toReadonly(guild);
}

function disbandImpl(state: GuildState, guildId: string): boolean {
  const guild = state.guilds.get(guildId);
  if (!guild) return false;
  for (const member of guild.members) {
    state.dynastyToGuild.delete(member);
  }
  return state.guilds.delete(guildId);
}

function joinImpl(state: GuildState, guildId: string, dynastyId: string): boolean {
  const guild = state.guilds.get(guildId);
  if (!guild) return false;
  if (guild.members.has(dynastyId)) return false;
  if (state.dynastyToGuild.has(dynastyId)) return false;
  if (guild.members.size >= state.config.maxMembers) return false;
  guild.members.add(dynastyId);
  state.dynastyToGuild.set(dynastyId, guildId);
  return true;
}

function leaveImpl(state: GuildState, guildId: string, dynastyId: string): boolean {
  const guild = state.guilds.get(guildId);
  if (!guild) return false;
  if (!guild.members.has(dynastyId)) return false;
  guild.members.delete(dynastyId);
  state.dynastyToGuild.delete(dynastyId);
  return true;
}

function isMemberImpl(state: GuildState, guildId: string, dynastyId: string): boolean {
  const g = state.guilds.get(guildId);
  return g ? g.members.has(dynastyId) : false;
}

function listByWorldImpl(state: GuildState, worldId: string): Guild[] {
  const result: Guild[] = [];
  for (const g of state.guilds.values()) {
    if (g.worldId === worldId) result.push(toReadonly(g));
  }
  return result;
}

function getStatsImpl(state: GuildState): GuildStats {
  let totalMembers = 0;
  let largest = 0;
  for (const guild of state.guilds.values()) {
    totalMembers += guild.members.size;
    if (guild.members.size > largest) largest = guild.members.size;
  }
  return {
    totalGuilds: state.guilds.size,
    totalMembers,
    largestGuild: largest,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createGuildRegistry(
  deps: GuildRegistryDeps,
  config?: Partial<GuildConfig>,
): GuildRegistry {
  const state: GuildState = {
    deps,
    config: { ...DEFAULT_GUILD_CONFIG, ...config },
    guilds: new Map(),
    dynastyToGuild: new Map(),
  };
  return {
    create: (p) => createGuildImpl(state, p),
    disband: (id) => disbandImpl(state, id),
    join: (gid, did) => joinImpl(state, gid, did),
    leave: (gid, did) => leaveImpl(state, gid, did),
    isMember: (gid, did) => isMemberImpl(state, gid, did),
    getGuild: (id) => {
      const g = state.guilds.get(id);
      return g ? toReadonly(g) : undefined;
    },
    listByWorld: (wid) => listByWorldImpl(state, wid),
    getDynastyGuild: (did) => state.dynastyToGuild.get(did),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createGuildRegistry, DEFAULT_GUILD_CONFIG };
export type { GuildRegistry, GuildRegistryDeps, Guild, CreateGuildParams, GuildConfig, GuildStats };
