/**
 * discord-stats-api.ts ΓÇö Discord Bot Stats API for The Concord.
 *
 * Provides world stats, economy snapshots, player activity, and server
 * health in a Discord-friendly format. Designed to be called by a
 * Discord bot's slash commands or scheduled status updates.
 *
 * All functions are pure data transformers (no I/O) ΓÇö callers inject
 * the live data via the port interfaces.
 *
 * Thread: silk
 * Tier: 1
 */

// ΓöÇΓöÇΓöÇ Discord Embed Types ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface DiscordEmbedField {
  readonly name: string;
  readonly value: string;
  readonly inline: boolean;
}

export interface DiscordEmbed {
  readonly title: string;
  readonly description: string;
  readonly color: number;
  readonly fields: readonly DiscordEmbedField[];
  readonly footer: string;
  readonly timestamp: string;
}

// ΓöÇΓöÇΓöÇ Stats Data Ports ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface ServerStatus {
  readonly isOnline: boolean;
  readonly uptime: string;
  readonly version: string;
  readonly region: string;
  readonly activePlayers: number;
  readonly totalConnections: number;
  readonly healthScore: number;
}

export interface WorldSnapshot {
  readonly worldId: string;
  readonly displayName: string;
  readonly activePlayers: number;
  readonly dynastyCount: number;
  readonly kalonCirculating: number;
  readonly recentEvents: readonly string[];
  readonly status: 'ONLINE' | 'RESTRICTED' | 'OFFLINE';
}

export interface EconomySnapshot {
  readonly totalKalonSupply: number;
  readonly kalonMintedToday: number;
  readonly kalonBurnedToday: number;
  readonly activeTraders: number;
  readonly totalTradesThisHour: number;
  readonly inflationIndex: number;
  readonly topTradedResourceId: string;
}

export interface AssemblyStatus {
  readonly activeProposalCount: number;
  readonly openVoteCount: number;
  readonly dynastiesVotedThisSession: number;
  readonly nextSessionInGameYear: number;
  readonly recentlyEnactedLaw: string | null;
}

export interface ChronicleActivity {
  readonly newEntriesThisHour: number;
  readonly totalEntries: number;
  readonly mostActiveWorldId: string;
  readonly mostActiveDynastyId: string;
}

// ΓöÇΓöÇΓöÇ Ports ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface DiscordStatsServerPort {
  readonly getStatus: () => ServerStatus;
}

export interface DiscordStatsWorldPort {
  readonly getTopWorlds: (limit: number) => readonly WorldSnapshot[];
  readonly getWorld: (worldId: string) => WorldSnapshot | undefined;
}

export interface DiscordStatsEconomyPort {
  readonly getSnapshot: () => EconomySnapshot;
}

export interface DiscordStatsAssemblyPort {
  readonly getStatus: () => AssemblyStatus;
}

export interface DiscordStatsChroniclePort {
  readonly getActivity: () => ChronicleActivity;
}

export interface DiscordStatsDeps {
  readonly server: DiscordStatsServerPort;
  readonly worlds: DiscordStatsWorldPort;
  readonly economy: DiscordStatsEconomyPort;
  readonly assembly: DiscordStatsAssemblyPort;
  readonly chronicle: DiscordStatsChroniclePort;
  readonly gameTitle: string;
  readonly timestampFn: () => string;
}

// ΓöÇΓöÇΓöÇ Color Constants ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const COLOR_GREEN = 0x2ecc71;
const COLOR_YELLOW = 0xf39c12;
const COLOR_RED = 0xe74c3c;
const COLOR_BLUE = 0x3498db;
const COLOR_PURPLE = 0x9b59b6;
const COLOR_GOLD = 0xf1c40f;

// ΓöÇΓöÇΓöÇ Formatting Helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatHealth(score: number): string {
  if (score >= 90) return `Γ£à Excellent (${score}%)`;
  if (score >= 70) return `ΓÜá∩╕Å Degraded (${score}%)`;
  return `Γ¥î Critical (${score}%)`;
}

function statusColor(isOnline: boolean, healthScore: number): number {
  if (!isOnline) return COLOR_RED;
  if (healthScore < 70) return COLOR_YELLOW;
  return COLOR_GREEN;
}

// ΓöÇΓöÇΓöÇ Embed Builders ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export function buildServerStatusEmbed(deps: DiscordStatsDeps): DiscordEmbed {
  const status = deps.server.getStatus();
  return {
    title: `ΓÜÖ∩╕Å ${deps.gameTitle} ΓÇö Server Status`,
    description: status.isOnline ? '**The Concord is online.**' : '**Server is offline.**',
    color: statusColor(status.isOnline, status.healthScore),
    fields: [
      { name: 'Status', value: status.isOnline ? '≡ƒƒó Online' : '≡ƒö┤ Offline', inline: true },
      { name: 'Version', value: status.version, inline: true },
      { name: 'Region', value: status.region, inline: true },
      { name: 'Active Players', value: formatNumber(status.activePlayers), inline: true },
      { name: 'Uptime', value: status.uptime, inline: true },
      { name: 'Health', value: formatHealth(status.healthScore), inline: true },
    ],
    footer: `The Concord ΓÇó ${deps.gameTitle}`,
    timestamp: deps.timestampFn(),
  };
}

export function buildTopWorldsEmbed(deps: DiscordStatsDeps, limit = 5): DiscordEmbed {
  const worlds = deps.worlds.getTopWorlds(limit);
  const fields: DiscordEmbedField[] = worlds.map((w) => ({
    name: `≡ƒîì ${w.displayName}`,
    value: [
      `Players: **${w.activePlayers}**`,
      `Dynasties: **${w.dynastyCount}**`,
      `KALON: **${formatNumber(w.kalonCirculating)}**`,
      w.recentEvents.length > 0 ? `_"${w.recentEvents[0]}"_` : '',
    ].filter(Boolean).join(' ┬╖ '),
    inline: false,
  }));

  return {
    title: `≡ƒîî ${deps.gameTitle} ΓÇö Active Worlds`,
    description: `Top ${worlds.length} worlds by player activity`,
    color: COLOR_BLUE,
    fields,
    footer: 'The Concord ΓÇó World Report',
    timestamp: deps.timestampFn(),
  };
}

export function buildEconomyEmbed(deps: DiscordStatsDeps): DiscordEmbed {
  const eco = deps.economy.getSnapshot();
  const netFlow = eco.kalonMintedToday - eco.kalonBurnedToday;
  const netStr = netFlow >= 0 ? `+${formatNumber(netFlow)}` : formatNumber(netFlow);

  return {
    title: `≡ƒÆ░ ${deps.gameTitle} ΓÇö Economy Report`,
    description: 'Current KALON economy snapshot.',
    color: COLOR_GOLD,
    fields: [
      { name: 'Total Supply', value: formatNumber(eco.totalKalonSupply), inline: true },
      { name: "Today's Minted", value: formatNumber(eco.kalonMintedToday), inline: true },
      { name: "Today's Burned", value: formatNumber(eco.kalonBurnedToday), inline: true },
      { name: 'Net Flow (24h)', value: netStr, inline: true },
      { name: 'Active Traders', value: formatNumber(eco.activeTraders), inline: true },
      { name: 'Trades/Hour', value: formatNumber(eco.totalTradesThisHour), inline: true },
      { name: 'Inflation Index', value: `${eco.inflationIndex.toFixed(2)}%`, inline: true },
      { name: 'Top Resource', value: eco.topTradedResourceId, inline: true },
    ],
    footer: 'The Concord ΓÇó Economy Bureau',
    timestamp: deps.timestampFn(),
  };
}

export function buildAssemblyEmbed(deps: DiscordStatsDeps): DiscordEmbed {
  const asm = deps.assembly.getStatus();
  return {
    title: `ΓÜû∩╕Å ${deps.gameTitle} ΓÇö Assembly Status`,
    description: 'Current Concord Assembly session.',
    color: COLOR_PURPLE,
    fields: [
      { name: 'Active Proposals', value: String(asm.activeProposalCount), inline: true },
      { name: 'Open Votes', value: String(asm.openVoteCount), inline: true },
      { name: 'Dynasties Voted', value: String(asm.dynastiesVotedThisSession), inline: true },
      { name: 'Next Session Year', value: `Year ${asm.nextSessionInGameYear}`, inline: true },
      ...(asm.recentlyEnactedLaw ? [{ name: 'Latest Law', value: asm.recentlyEnactedLaw, inline: false }] : []),
    ],
    footer: 'The Concord ΓÇó Assembly Chamber',
    timestamp: deps.timestampFn(),
  };
}

export function buildChronicleEmbed(deps: DiscordStatsDeps): DiscordEmbed {
  const ch = deps.chronicle.getActivity();
  return {
    title: `≡ƒô£ ${deps.gameTitle} ΓÇö Chronicle Activity`,
    description: 'What is being remembered this hour.',
    color: COLOR_BLUE,
    fields: [
      { name: 'New Entries (1h)', value: String(ch.newEntriesThisHour), inline: true },
      { name: 'Total Entries', value: formatNumber(ch.totalEntries), inline: true },
      { name: 'Most Active World', value: ch.mostActiveWorldId, inline: true },
      { name: 'Most Active Dynasty', value: ch.mostActiveDynastyId, inline: true },
    ],
    footer: 'The Concord ΓÇó Chronicle Office',
    timestamp: deps.timestampFn(),
  };
}

// ΓöÇΓöÇΓöÇ Full Dashboard ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface DiscordDashboard {
  readonly server: DiscordEmbed;
  readonly worlds: DiscordEmbed;
  readonly economy: DiscordEmbed;
  readonly assembly: DiscordEmbed;
  readonly chronicle: DiscordEmbed;
}

export function buildFullDashboard(deps: DiscordStatsDeps): DiscordDashboard {
  return {
    server: buildServerStatusEmbed(deps),
    worlds: buildTopWorldsEmbed(deps),
    economy: buildEconomyEmbed(deps),
    assembly: buildAssemblyEmbed(deps),
    chronicle: buildChronicleEmbed(deps),
  };
}

// ΓöÇΓöÇΓöÇ Discord Stats API Factory ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export interface DiscordStatsApi {
  readonly getServerStatus: () => DiscordEmbed;
  readonly getTopWorlds: (limit?: number) => DiscordEmbed;
  readonly getEconomy: () => DiscordEmbed;
  readonly getAssembly: () => DiscordEmbed;
  readonly getChronicle: () => DiscordEmbed;
  readonly getDashboard: () => DiscordDashboard;
}

export function createDiscordStatsApi(deps: DiscordStatsDeps): DiscordStatsApi {
  return {
    getServerStatus: () => buildServerStatusEmbed(deps),
    getTopWorlds: (limit = 5) => buildTopWorldsEmbed(deps, limit),
    getEconomy: () => buildEconomyEmbed(deps),
    getAssembly: () => buildAssemblyEmbed(deps),
    getChronicle: () => buildChronicleEmbed(deps),
    getDashboard: () => buildFullDashboard(deps),
  };
}
