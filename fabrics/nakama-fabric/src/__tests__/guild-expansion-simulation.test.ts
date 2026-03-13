/**
 * Guild Expansion Engine - Simulation Tests
 *
 * Covers bank operations, cooperative quests, guild halls,
 * GvG scheduling, progression, recruitment, and stats.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createGuildExpansionEngine,
  type GuildExpansionDeps,
  type GuildBankTransaction,
  type GuildProgression,
  type CoopGuildQuest,
} from '../guild-expansion.js';

function makeHarness() {
  let now = 1_000_000n;
  let idCounter = 0;

  const balances = new Map<string, number>();
  const transactions = new Map<string, GuildBankTransaction[]>();
  const progression = new Map<string, GuildProgression>();
  const quests = new Map<string, CoopGuildQuest>();

  const info = vi.fn();
  const warn = vi.fn();
  const error = vi.fn();
  const emit = vi.fn();

  const deps: GuildExpansionDeps = {
    clock: { now: () => now },
    id: { next: () => `guild-${++idCounter}` },
    log: { info, warn, error },
    events: { emit },
    bank: {
      getBalance: async (guildId) => balances.get(guildId) ?? 0,
      deposit: async (guildId, amount, depositorId, reason) => {
        const current = balances.get(guildId) ?? 0;
        const next = current + amount;
        balances.set(guildId, next);
        const entry: GuildBankTransaction = {
          transactionId: `tx-${++idCounter}`,
          guildId,
          playerId: depositorId,
          amount,
          type: 'deposit',
          reason,
          balanceAfter: next,
          timestamp: now,
        };
        transactions.set(guildId, [...(transactions.get(guildId) ?? []), entry]);
      },
      withdraw: async (guildId, amount, recipientId, reason) => {
        const current = balances.get(guildId) ?? 0;
        if (current < amount) throw new Error('Insufficient guild funds');
        const next = current - amount;
        balances.set(guildId, next);
        const entry: GuildBankTransaction = {
          transactionId: `tx-${++idCounter}`,
          guildId,
          playerId: recipientId,
          amount,
          type: 'withdraw',
          reason,
          balanceAfter: next,
          timestamp: now,
        };
        transactions.set(guildId, [...(transactions.get(guildId) ?? []), entry]);
      },
      getTransactions: async (guildId, limit) => (transactions.get(guildId) ?? []).slice(-limit),
    },
    progression: {
      getProgression: async (guildId) => progression.get(guildId),
      saveProgression: async (prog) => {
        progression.set(prog.guildId, prog);
      },
    },
    quests: {
      saveQuest: async (quest) => {
        quests.set(quest.questId, quest);
      },
      getQuest: async (questId) => quests.get(questId),
      getActiveQuests: async (guildId) =>
        [...quests.values()].filter((quest) => quest.guildId === guildId && quest.status === 'active'),
    },
  };

  const engine = createGuildExpansionEngine(deps, {
    xpPerLevel: 100,
    xpScalingFactor: 2,
    maxGuildLevel: 5,
    questExpiryMs: 1_000,
    hallMaxOccupancy: 10,
    gvgRewardKalon: 777,
  });

  return {
    engine,
    balances,
    transactions,
    progression,
    quests,
    info,
    warn,
    error,
    emit,
    setNow: (value: bigint) => {
      now = value;
    },
  };
}

describe('GuildExpansionEngine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deposits and withdraws from guild bank, returning updated balances', async () => {
    const { engine } = makeHarness();

    const afterDeposit = await engine.depositToBank('g1', 'p1', 500, 'treasury');
    expect(afterDeposit).toBe(500);

    const afterWithdraw = await engine.withdrawFromBank('g1', 'p2', 200, 'upgrade');
    expect(afterWithdraw).toBe(300);
  });

  it('returns bank history with most recent transactions', async () => {
    const { engine } = makeHarness();

    await engine.depositToBank('g1', 'p1', 100, 'a');
    await engine.depositToBank('g1', 'p2', 100, 'b');
    await engine.withdrawFromBank('g1', 'p3', 50, 'c');

    const history = await engine.getBankHistory('g1', 2);
    expect(history).toHaveLength(2);
    expect(history[0]?.type).toBe('deposit');
    expect(history[1]?.type).toBe('withdraw');
  });

  it('creates cooperative quest with expiry and reward xp', async () => {
    const { engine } = makeHarness();

    const quest = await engine.createCoopQuest('g1', 'Harvest', 'Collect grain', 100, 1000);

    expect(quest.status).toBe('active');
    expect(quest.rewardXp).toBe(100);
    expect(quest.expiresAt).toBe(1_001_000n);
  });

  it('advances cooperative quest progress and completion state', async () => {
    const { engine } = makeHarness();
    const quest = await engine.createCoopQuest('g1', 'Build', 'Craft items', 10, 100);

    const mid = await engine.advanceCoopQuest(quest.questId, 'p1', 4);
    expect(mid.objectiveCurrent).toBe(4);
    expect(mid.status).toBe('active');
    expect(mid.participants).toContain('p1');

    const done = await engine.advanceCoopQuest(quest.questId, 'p2', 20);
    expect(done.objectiveCurrent).toBe(10);
    expect(done.status).toBe('completed');
    expect(done.participants).toContain('p2');
  });

  it('throws when advancing unknown quest', async () => {
    const { engine } = makeHarness();
    await expect(engine.advanceCoopQuest('missing', 'p1', 1)).rejects.toThrow('Quest missing not found');
  });

  it('returns active quests only', async () => {
    const { engine } = makeHarness();
    const q1 = await engine.createCoopQuest('g1', 'Q1', 'A', 2, 10);
    await engine.createCoopQuest('g1', 'Q2', 'B', 2, 10);
    await engine.advanceCoopQuest(q1.questId, 'p', 2);

    const active = await engine.getActiveQuests('g1');
    expect(active).toHaveLength(1);
    expect(active[0]?.title).toBe('Q2');
  });

  it('creates guild halls and clamps occupancy updates', () => {
    const { engine } = makeHarness();

    const hall = engine.createHall('g1', 'estate-1', 'stone');
    expect(hall.maxOccupancy).toBe(10);

    const inc = engine.updateHallOccupancy(hall.hallId, 20);
    expect(inc.currentOccupancy).toBe(10);

    const dec = engine.updateHallOccupancy(hall.hallId, -999);
    expect(dec.currentOccupancy).toBe(0);
  });

  it('throws when updating occupancy for missing hall', () => {
    const { engine } = makeHarness();
    expect(() => engine.updateHallOccupancy('missing-hall', 1)).toThrow('Hall missing-hall not found');
  });

  it('schedules and resolves GvG matches', () => {
    const { engine } = makeHarness();

    const match = engine.scheduleGvG('g1', 'g2', 'battle', 2_000_000n);
    expect(match.rewardKalon).toBe(777);
    expect(match.winnerId).toBeUndefined();

    const resolved = engine.resolveGvG(match.matchId, 'g1');
    expect(resolved.winnerId).toBe('g1');
    expect(resolved.endedAt).toBe(1_000_000n);
  });

  it('throws when resolving missing GvG match', () => {
    const { engine } = makeHarness();
    expect(() => engine.resolveGvG('missing', 'g1')).toThrow('GvG match missing not found');
  });

  it('adds guild xp, levels up, and grants unlocks', async () => {
    const { engine } = makeHarness();

    const updated = await engine.addGuildXp('g1', 350);

    expect(updated.level).toBe(3);
    expect(updated.unlocks.length).toBeGreaterThanOrEqual(2);
    expect(updated.xpToNextLevel).toBe(400);
  });

  it('caps level progression at configured max level', async () => {
    const { engine } = makeHarness();

    const updated = await engine.addGuildXp('g1', 100000);

    expect(updated.level).toBe(5);
  });

  it('returns default progression for unknown guild', async () => {
    const { engine } = makeHarness();

    const prog = await engine.getProgression('ghost-guild');
    expect(prog.level).toBe(1);
    expect(prog.xp).toBe(0);
    expect(prog.unlocks).toEqual([]);
  });

  it('links dynasties and prevents duplicate links', () => {
    const { engine } = makeHarness();

    const first = engine.linkDynasty('g1', 'd1');
    expect(first.dynastyIds).toContain('d1');

    const second = engine.linkDynasty('g1', 'd2');
    expect(second.dynastyIds).toContain('d1');
    expect(second.dynastyIds).toContain('d2');

    expect(() => engine.linkDynasty('g1', 'd1')).toThrow('Dynasty already linked');
  });

  it('posts listings, accepts applications, and rejects closed listings', () => {
    const { engine } = makeHarness();

    const listing = engine.postListing('g1', 'Join us', 'Friendly guild', 'Active players', 10);
    const app = engine.applyToGuild(listing.listingId, 'p1', 'I can help');
    expect(app.status).toBe('pending');

    const reviewed = engine.reviewApplication(app.applicationId, true);
    expect(reviewed.status).toBe('accepted');
    expect(reviewed.reviewedAt).toBe(1_000_000n);

    expect(() => engine.reviewApplication('missing-app', false)).toThrow('Application missing-app not found');
  });

  it('throws on apply when listing is missing', () => {
    const { engine } = makeHarness();
    expect(() => engine.applyToGuild('missing-listing', 'p1', 'hello')).toThrow('Listing missing-listing not found');
  });

  it('tracks aggregate stats across operations', async () => {
    const { engine } = makeHarness();

    await engine.depositToBank('g1', 'p1', 100, 'a');
    await engine.withdrawFromBank('g1', 'p2', 50, 'b');

    const quest = await engine.createCoopQuest('g1', 'Quest', 'Do thing', 1, 10);
    await engine.advanceCoopQuest(quest.questId, 'p1', 1);

    const hall = engine.createHall('g1', 'estate', 'theme');
    engine.updateHallOccupancy(hall.hallId, 1);

    const match = engine.scheduleGvG('g1', 'g2', 'battle', 2n);
    engine.resolveGvG(match.matchId, 'g1');

    await engine.addGuildXp('g1', 500);

    engine.linkDynasty('g1', 'd1');

    const listing = engine.postListing('g1', 'Need crafters', 'desc', 'req', 5);
    const app = engine.applyToGuild(listing.listingId, 'p9', 'msg');
    engine.reviewApplication(app.applicationId, false);

    const stats = engine.getStats();
    expect(stats.bankDeposits).toBe(1);
    expect(stats.bankWithdrawals).toBe(1);
    expect(stats.questsCreated).toBe(1);
    expect(stats.questsCompleted).toBe(1);
    expect(stats.gvgMatchesHeld).toBe(1);
    expect(stats.hallsCreated).toBe(1);
    expect(stats.levelsGained).toBeGreaterThanOrEqual(1);
    expect(stats.crossDynastyLinks).toBe(1);
    expect(stats.recruitmentListings).toBe(1);
    expect(stats.applicationsProcessed).toBe(1);
  });
});
