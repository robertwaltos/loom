import { describe, it, expect } from 'vitest';
import {
  createDiscordBot,
  type DiscordBot,
  type DiscordBotDeps,
  type DevStatus,
  type FabricHealth,
  type WorldStats,
} from '../index.js';

// ── Test doubles ──────────────────────────────────────────────────────

const STATUS: DevStatus = {
  currentPhase: 'Phase 16',
  completedPhases: 16,
  totalPhases: 20,
  latestMilestone: 'DevPortal launched',
};

const HEALTH: FabricHealth[] = [
  { fabric: 'loom-core', healthy: true, latencyMs: 3 },
  { fabric: 'selvage', healthy: false, latencyMs: 999 },
];

const WORLDS: WorldStats = {
  totalWorlds: 600,
  activeWorlds: 142,
  onlinePlayers: 9800,
  topWorldName: 'Aethermoor',
};

function makeDeps(): DiscordBotDeps {
  return {
    clock: { nowMs: () => 1_700_000_000 },
    status: { getDevStatus: () => STATUS },
    health: { getFabricHealth: () => HEALTH },
    worlds: { getWorldStats: () => WORLDS },
  };
}

function makeBot(): DiscordBot {
  return createDiscordBot(makeDeps());
}

// ── !status ───────────────────────────────────────────────────────────

describe('dispatch !status', () => {
  it('returns a BotResponse with status text', () => {
    const bot = makeBot();
    const r = bot.dispatch('!status');
    if (typeof r === 'string') throw new Error('Expected BotResponse');
    expect(r.command).toBe('status');
    expect(r.text).toContain('Phase 16');
    expect(r.text).toContain('80%');
  });

  it('works without leading !', () => {
    const bot = makeBot();
    const r = bot.dispatch('status');
    if (typeof r === 'string') throw new Error('Expected BotResponse');
    expect(r.text).toContain('DevPortal launched');
  });
});

// ── !api ──────────────────────────────────────────────────────────────

describe('dispatch !api', () => {
  it('renders health lines for each fabric', () => {
    const bot = makeBot();
    const r = bot.dispatch('!api');
    if (typeof r === 'string') throw new Error('Expected BotResponse');
    expect(r.text).toContain('loom-core');
    expect(r.text).toContain('selvage');
    expect(r.text).toContain('999ms');
  });
});

// ── !worlds ───────────────────────────────────────────────────────────

describe('dispatch !worlds', () => {
  it('includes world and player counts', () => {
    const bot = makeBot();
    const r = bot.dispatch('!worlds');
    if (typeof r === 'string') throw new Error('Expected BotResponse');
    expect(r.text).toContain('9800');
    expect(r.text).toContain('Aethermoor');
  });
});

// ── !help ─────────────────────────────────────────────────────────────

describe('dispatch !help', () => {
  it('lists all commands', () => {
    const bot = makeBot();
    const r = bot.dispatch('!help');
    if (typeof r === 'string') throw new Error('Expected BotResponse');
    expect(r.text).toContain('!status');
    expect(r.text).toContain('!worlds');
  });
});

// ── unknown command ───────────────────────────────────────────────────

describe('dispatch unknown command', () => {
  it('returns unknown-command error', () => {
    const bot = makeBot();
    expect(bot.dispatch('!foobar')).toBe('unknown-command');
  });

  it('increments error count', () => {
    const bot = makeBot();
    bot.dispatch('!bad');
    expect(bot.getStats().errorCount).toBe(1);
  });
});

// ── getStats ──────────────────────────────────────────────────────────

describe('getStats', () => {
  it('tracks total dispatch calls including errors', () => {
    const bot = makeBot();
    bot.dispatch('!status');
    bot.dispatch('!api');
    bot.dispatch('!unknown');
    const s = bot.getStats();
    expect(s.totalDispatched).toBe(3);
    expect(s.errorCount).toBe(1);
  });
});
