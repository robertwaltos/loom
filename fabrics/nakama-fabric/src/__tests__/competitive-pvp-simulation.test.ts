/**
 * Competitive PvP Engine - Simulation Tests
 *
 * Exercises ranked matchmaking, territory warfare, siege lifecycle,
 * war economy primitives, replay persistence, smurf detection, and stats.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createCompetitivePvpEngine,
  type CompetitivePvpDeps,
  type TerritoryZone,
  type CombatReplay,
} from '../competitive-pvp.js';

function makeHarness() {
  let now = 1_000_000n;
  let idCounter = 0;

  const zones = new Map<string, TerritoryZone>();
  const replays = new Map<string, CombatReplay>();
  const elo = new Map<string, number>();

  const info = vi.fn();
  const warn = vi.fn();
  const error = vi.fn();
  const emit = vi.fn();

  const deps: CompetitivePvpDeps = {
    clock: { now: () => now },
    id: { next: () => `pvp-${++idCounter}` },
    log: { info, warn, error },
    events: { emit },
    matchmaking: {
      findOpponents: async (_playerId, mode) => {
        if (mode === '1v1') return ['op-1'];
        if (mode === '2v2') return ['op-1', 'op-2', 'op-3'];
        if (mode === '5v5') return ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
        return Array.from({ length: 19 }, (_, idx) => `d-${idx + 1}`);
      },
      getPlayerElo: async (playerId) => elo.get(playerId) ?? 1200,
      savePlayerElo: async (playerId, value) => {
        elo.set(playerId, value);
      },
    },
    territories: {
      getZone: async (zoneId) => zones.get(zoneId),
      saveZone: async (zone) => {
        zones.set(zone.zoneId, zone);
      },
      getWorldZones: async (worldId) => [...zones.values()].filter((zone) => zone.worldId === worldId),
    },
    replays: {
      saveReplay: async (replay) => {
        replays.set(replay.replayId, replay);
      },
      getReplay: async (replayId) => replays.get(replayId),
      getPlayerReplays: async (playerId, limit) =>
        [...replays.values()]
          .filter((replay) => replay.participants.includes(playerId))
          .slice(0, limit),
    },
  };

  const engine = createCompetitivePvpEngine(deps, {
    defaultElo: 1200,
    eloKFactor: 32,
    eloMatchRange: 150,
    smurfConfidenceThreshold: 0.75,
    ceasefirePenaltyKalon: 5555,
    warBondInterestRate: 0.09,
  });

  return {
    engine,
    zones,
    replays,
    elo,
    info,
    warn,
    error,
    emit,
    step: (delta: bigint) => {
      now += delta;
    },
  };
}

function makeZone(overrides: Partial<TerritoryZone> = {}): TerritoryZone {
  return {
    zoneId: 'zone-1',
    worldId: 'world-a',
    name: 'Emerald Vale',
    status: 'neutral',
    controllingDynastyId: undefined,
    contestingDynastyId: undefined,
    captureProgress: 0,
    resourceBonus: 12,
    cycleEndsAt: 2_000_000n,
    ...overrides,
  };
}

describe('CompetitivePvpEngine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('computes division tiers from elo thresholds', () => {
    const { engine } = makeHarness();
    expect(engine.getDivision(100)).toBe('bronze');
    expect(engine.getDivision(1200)).toBe('silver');
    expect(engine.getDivision(1400)).toBe('gold');
    expect(engine.getDivision(2200)).toBe('legend');
  });

  it('returns profile with current elo, division, and timestamp', async () => {
    const { engine, elo } = makeHarness();
    elo.set('player-1', 1650);

    const profile = await engine.getProfile('player-1');

    expect(profile.playerId).toBe('player-1');
    expect(profile.elo).toBe(1650);
    expect(profile.division).toBe('platinum');
    expect(profile.lastMatchAt).toBe(1_000_000n);
  });

  it('queues 1v1 match with one player per side', async () => {
    const { engine, info } = makeHarness();

    const match = await engine.queueMatch('me', '1v1');

    expect(match.mode).toBe('1v1');
    expect(match.teamA).toEqual(['me']);
    expect(match.teamB).toEqual(['op-1']);
    expect(match.winningSide).toBeUndefined();
    expect(info).toHaveBeenCalledWith('match-queued', expect.any(Object));
  });

  it('queues 2v2 match with expected team sizes', async () => {
    const { engine } = makeHarness();
    const match = await engine.queueMatch('captain', '2v2');

    expect(match.teamA.length).toBe(2);
    expect(match.teamB.length).toBe(2);
  });

  it('resolves match and assigns symmetric elo deltas for winners and losers', async () => {
    const { engine } = makeHarness();
    const match = await engine.queueMatch('p1', '1v1');

    const resolved = engine.resolveMatch(match.matchId, 'A');

    expect(resolved.winningSide).toBe('A');
    expect(resolved.endedAt).toBe(1_000_000n);
    expect(resolved.eloChanges.get('p1')).toBeGreaterThan(0);
    expect(resolved.eloChanges.get('op-1')).toBeLessThan(0);
  });

  it('resolves draw without elo changes', async () => {
    const { engine } = makeHarness();
    const match = await engine.queueMatch('p1', '1v1');

    const resolved = engine.resolveMatch(match.matchId, 'draw');

    expect(resolved.eloChanges.size).toBe(0);
  });

  it('throws when resolving unknown match id', () => {
    const { engine } = makeHarness();
    expect(() => engine.resolveMatch('no-match', 'A')).toThrow('Match no-match not found');
  });

  it('contests a territory zone and resets capture progress', async () => {
    const { engine, zones } = makeHarness();
    zones.set('zone-1', makeZone({ status: 'controlled', controllingDynastyId: 'dyn-a', captureProgress: 0.5 }));

    const contested = await engine.contestZone('zone-1', 'dyn-b');

    expect(contested.status).toBe('contested');
    expect(contested.contestingDynastyId).toBe('dyn-b');
    expect(contested.captureProgress).toBe(0);
  });

  it('advances capture and flips control when progress reaches threshold', async () => {
    const { engine, zones } = makeHarness();
    zones.set('zone-1', makeZone({
      status: 'contested',
      controllingDynastyId: 'dyn-a',
      contestingDynastyId: 'dyn-b',
      captureProgress: 0.7,
    }));

    const captured = await engine.advanceCapture('zone-1', 0.4);

    expect(captured.status).toBe('controlled');
    expect(captured.controllingDynastyId).toBe('dyn-b');
    expect(captured.contestingDynastyId).toBeUndefined();
    expect(captured.captureProgress).toBe(0);
  });

  it('throws when contesting or advancing a missing zone', async () => {
    const { engine } = makeHarness();
    await expect(engine.contestZone('missing-zone', 'dyn')).rejects.toThrow('Zone missing-zone not found');
    await expect(engine.advanceCapture('missing-zone', 0.1)).rejects.toThrow('Zone missing-zone not found');
  });

  it('returns world territories filtered by world id', async () => {
    const { engine, zones } = makeHarness();
    zones.set('a', makeZone({ zoneId: 'a', worldId: 'world-a' }));
    zones.set('b', makeZone({ zoneId: 'b', worldId: 'world-b' }));

    const worldA = await engine.getWorldTerritories('world-a');
    expect(worldA.map((zone) => zone.zoneId)).toEqual(['a']);
  });

  it('declares and resolves sieges with configured time windows', () => {
    const { engine } = makeHarness();

    const siege = engine.declareSiege('att', 'def', 'estate-1');
    expect(siege.phase).toBe('declared');
    expect(siege.battleStartsAt).toBeGreaterThan(siege.declaredAt);
    expect(siege.battleEndsAt).toBeGreaterThan(siege.battleStartsAt);

    const resolved = engine.resolveSiege(siege.siegeId, 'att');
    expect(resolved.phase).toBe('resolved');
    expect(resolved.winnerId).toBe('att');
  });

  it('throws when resolving unknown siege', () => {
    const { engine } = makeHarness();
    expect(() => engine.resolveSiege('missing-siege', 'x')).toThrow('Siege missing-siege not found');
  });

  it('issues and purchases war bonds with interest and buyer checks', () => {
    const { engine } = makeHarness();

    const bond = engine.issueWarBond('dyn-issuer', 10_000);
    expect(bond.interestRate).toBe(0.09);
    expect(bond.buyerId).toBeUndefined();

    const bought = engine.buyWarBond(bond.bondId, 'dyn-buyer');
    expect(bought.buyerId).toBe('dyn-buyer');

    expect(() => engine.buyWarBond('missing-bond', 'x')).toThrow('Bond missing-bond not found');
    expect(() => engine.buyWarBond(bond.bondId, 'another')).toThrow('Bond already purchased');
  });

  it('creates mercenary contracts and ceasefire violation penalties', () => {
    const { engine } = makeHarness();

    const contract = engine.hireMercenary('merc-1', 'dyn-1', 500, 'Defend north gate');
    expect(contract.kalonFee).toBe(500);
    expect(contract.completed).toBe(false);

    const violation = engine.recordViolation('dyn-2', 'spy-activity');
    expect(violation.penaltyKalon).toBe(5555);
    expect(violation.violationType).toBe('spy-activity');
  });

  it('stores and fetches combat replay records', async () => {
    const { engine } = makeHarness();

    const match = await engine.queueMatch('p1', '1v1');
    const replay = await engine.storeReplay(match.matchId, ['p1', 'op-1'], 180, 350, 1200000);

    const fetched = await engine.getReplay(replay.replayId);
    expect(fetched?.matchId).toBe(match.matchId);
    expect(fetched?.mode).toBe('1v1');
  });

  it('detects high-confidence smurfs and low-confidence normal accounts', () => {
    const { engine } = makeHarness();

    const restrict = engine.detectSmurf('new-god', 2 * 24 * 60 * 60 * 1000, 0.95, 80);
    expect(restrict.recommendation).toBe('restrict');
    expect(restrict.confidence).toBeGreaterThanOrEqual(0.75);

    const allow = engine.detectSmurf('steady-player', 60 * 24 * 60 * 60 * 1000, 0.52, 12);
    expect(allow.recommendation).toBe('allow');
    expect(allow.confidence).toBeLessThan(0.5);
  });

  it('returns stats counters reflecting performed operations', async () => {
    const { engine, zones } = makeHarness();

    const m1 = await engine.queueMatch('r1', '1v1');
    engine.resolveMatch(m1.matchId, 'A');

    zones.set('zone-1', makeZone({ status: 'neutral' }));
    await engine.contestZone('zone-1', 'dyn-x');

    const siege = engine.declareSiege('a', 'b', 'estate');
    engine.resolveSiege(siege.siegeId, 'a');

    const bond = engine.issueWarBond('a', 1000);
    engine.buyWarBond(bond.bondId, 'b');

    engine.hireMercenary('m', 'e', 100, 'Scout');
    engine.recordViolation('v', 'attack-during-peace');

    await engine.storeReplay(m1.matchId, ['r1', 'op-1'], 120, 80, 1024);

    engine.detectSmurf('sus', 2 * 24 * 60 * 60 * 1000, 0.96, 90);

    const stats = engine.getStats();
    expect(stats.matchesPlayed).toBe(1);
    expect(stats.activeArenas).toBe(1);
    expect(stats.territoriesContested).toBe(1);
    expect(stats.siegesDeclared).toBe(1);
    expect(stats.warBondsIssued).toBe(1);
    expect(stats.mercenaryContracts).toBe(1);
    expect(stats.ceasefireViolations).toBe(1);
    expect(stats.replaysStored).toBe(1);
    expect(stats.smurfsDetected).toBe(1);
  });
});
