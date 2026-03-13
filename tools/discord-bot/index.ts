/**
 * discord-bot/index.ts — Discord bot for Koydo Loom development status,
 * API health, and world statistics.
 *
 * NEXT-STEPS Phase 16.4: "Discord bot: development status, API status,
 * world stats."
 *
 * Implements a command-dispatch model. Adapters (not included) connect
 * actual Discord.js events to the `dispatch()` entry point.
 *
 * Supported commands:
 *   !status      — development milestones, phase completion
 *   !api         — per-fabric health summary
 *   !worlds      — live world count, population, top worlds
 *   !help        — list available commands
 *
 * Thread: cotton/tools/discord-bot
 * Tier: 1
 */

// ── Ports ─────────────────────────────────────────────────────────────

export interface BotClockPort {
  readonly nowMs: () => number;
}

export interface StatusProviderPort {
  readonly getDevStatus: () => DevStatus;
}

export interface ApiHealthPort {
  readonly getFabricHealth: () => readonly FabricHealth[];
}

export interface WorldStatsPort {
  readonly getWorldStats: () => WorldStats;
}

// ── Types ─────────────────────────────────────────────────────────────

export type BotCommandName = 'status' | 'api' | 'worlds' | 'help';

export type BotError = 'unknown-command' | 'provider-unavailable';

export interface DevStatus {
  readonly currentPhase: string;
  readonly completedPhases: number;
  readonly totalPhases: number;
  readonly latestMilestone: string;
}

export interface FabricHealth {
  readonly fabric: string;
  readonly healthy: boolean;
  readonly latencyMs: number;
}

export interface WorldStats {
  readonly totalWorlds: number;
  readonly activeWorlds: number;
  readonly onlinePlayers: number;
  readonly topWorldName: string;
}

export interface BotResponse {
  readonly command: string;
  readonly text: string;
  readonly generatedAt: number;
}

export interface BotStats {
  readonly totalDispatched: number;
  readonly errorCount: number;
}

export interface DiscordBot {
  readonly dispatch: (rawCommand: string) => BotResponse | BotError;
  readonly getStats: () => BotStats;
}

export type DiscordBotDeps = {
  readonly clock: BotClockPort;
  readonly status: StatusProviderPort;
  readonly health: ApiHealthPort;
  readonly worlds: WorldStatsPort;
};

// ── Internal store ────────────────────────────────────────────────────

type BotStore = { dispatched: number; errors: number };

// ── Formatters ────────────────────────────────────────────────────────

function formatStatus(s: DevStatus): string {
  const pct = String(Math.round((s.completedPhases / s.totalPhases) * 100));
  return (
    `**Loom Dev Status** (${s.currentPhase})\n` +
    `Progress: ${String(s.completedPhases)}/${String(s.totalPhases)} phases (${pct}%)\n` +
    `Latest: ${s.latestMilestone}`
  );
}

function formatHealth(fabrics: readonly FabricHealth[]): string {
  const lines = fabrics.map(
    (f) => `${f.healthy ? '✅' : '❌'} **${f.fabric}** — ${String(f.latencyMs)}ms`,
  );
  return `**API Health**\n${lines.join('\n')}`;
}

function formatWorlds(w: WorldStats): string {
  return (
    `**World Stats**\n` +
    `Worlds: ${String(w.activeWorlds)}/${String(w.totalWorlds)} active\n` +
    `Players online: ${String(w.onlinePlayers)}\n` +
    `Top world: ${w.topWorldName}`
  );
}

function formatHelp(): string {
  return (
    '**Loom Bot Commands**\n' +
    '`!status` — development phase progress\n' +
    '`!api` — per-fabric health status\n' +
    '`!worlds` — live world and player counts\n' +
    '`!help` — this message'
  );
}

// ── Builder functions ─────────────────────────────────────────────────

function makeDispatch(store: BotStore, deps: DiscordBotDeps) {
  return function dispatch(rawCommand: string): BotResponse | BotError {
    const cmd = rawCommand.trim().replace(/^!/, '') as BotCommandName;
    const now = deps.clock.nowMs();
    store.dispatched++;
    const text = resolveText(cmd, deps);
    if (text === null) { store.errors++; return 'unknown-command'; }
    return Object.freeze({ command: cmd, text, generatedAt: now });
  };
}

function resolveText(cmd: string, deps: DiscordBotDeps): string | null {
  if (cmd === 'status') return formatStatus(deps.status.getDevStatus());
  if (cmd === 'api') return formatHealth(deps.health.getFabricHealth());
  if (cmd === 'worlds') return formatWorlds(deps.worlds.getWorldStats());
  if (cmd === 'help') return formatHelp();
  return null;
}

function makeGetStats(store: BotStore) {
  return function getStats(): BotStats {
    return Object.freeze({ totalDispatched: store.dispatched, errorCount: store.errors });
  };
}

// ── Factory ───────────────────────────────────────────────────────────

export function createDiscordBot(deps: DiscordBotDeps): DiscordBot {
  const store: BotStore = { dispatched: 0, errors: 0 };
  return {
    dispatch: makeDispatch(store, deps),
    getStats: makeGetStats(store),
  };
}
