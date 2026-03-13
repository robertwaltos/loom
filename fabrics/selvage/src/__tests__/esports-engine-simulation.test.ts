import { describe, it, expect, vi, afterEach } from 'vitest';
import { createEsportsEngine } from '../esports-engine.js';
import type {
  EsportsDeps,
  Tournament,
  League,
  LeagueDivision,
} from '../esports-engine.js';

interface StoreMemory {
  readonly tournaments: Map<string, Tournament>;
  readonly leagues: Map<string, League>;
  readonly deposits: Array<{ holderId: string; amount: number; reason: string }>;
  readonly releases: Array<{ holderId: string; recipientId: string; amount: number }>;
}

function makeDeps(): { deps: EsportsDeps; memory: StoreMemory } {
  let now = 10_000n;
  let idCounter = 0;
  const memory: StoreMemory = {
    tournaments: new Map(),
    leagues: new Map(),
    deposits: [],
    releases: [],
  };

  const deps: EsportsDeps = {
    clock: { now: () => {
      now += 100n;
      return now;
    } },
    id: { next: () => {
      idCounter += 1;
      return `id-${String(idCounter)}`;
    } },
    log: { info: () => {}, warn: () => {}, error: () => {} },
    events: { emit: () => {} },
    tournaments: {
      saveTournament: async (t) => {
        memory.tournaments.set(t.tournamentId, t);
      },
      getTournament: async (id) => memory.tournaments.get(id),
      getActiveTournaments: async () => Array.from(memory.tournaments.values()),
    },
    leagues: {
      saveLeague: async (l) => {
        memory.leagues.set(l.leagueId, l);
      },
      getLeague: async (id) => memory.leagues.get(id),
      getActiveLeagues: async () => Array.from(memory.leagues.values()),
    },
    escrow: {
      deposit: async (holderId, amount, reason) => {
        memory.deposits.push({ holderId, amount, reason });
      },
      release: async (holderId, recipientId, amount) => {
        memory.releases.push({ holderId, recipientId, amount });
      },
      getBalance: async () => 0,
    },
  };

  return { deps, memory };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Esports Engine Simulation', () => {
  it('clamps tournament size and tracks creation stat', async () => {
    const { deps } = makeDeps();
    const engine = createEsportsEngine(deps, { minTournamentSize: 4, maxTournamentSize: 16 });

    const tournament = await engine.createTournament(
      'Spring Open',
      'single-elimination',
      2,
      0,
      1_000n,
    );

    expect(tournament.maxParticipants).toBe(4);
    expect(engine.getStats().tournamentsCreated).toBe(1);
  });

  it('registers participants, deposits entry fees, and rejects duplicates', async () => {
    const { deps, memory } = makeDeps();
    const engine = createEsportsEngine(deps);

    const tournament = await engine.createTournament('Fee Cup', 'single-elimination', 8, 25, 2_000n);
    const withA = await engine.registerParticipant(tournament.tournamentId, 'player-a');
    const withB = await engine.registerParticipant(tournament.tournamentId, 'player-b');

    expect(withA.prizePoolKalon).toBe(25);
    expect(withB.prizePoolKalon).toBe(50);
    expect(memory.deposits).toHaveLength(2);

    await expect(
      engine.registerParticipant(tournament.tournamentId, 'player-a'),
    ).rejects.toThrow('Already registered');
  });

  it('generates round one brackets and advances rounds when results are reported', async () => {
    const { deps } = makeDeps();
    const engine = createEsportsEngine(deps);

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const tournament = await engine.createTournament('Playoffs', 'single-elimination', 8, 0, 3_000n);

    await engine.registerParticipant(tournament.tournamentId, 'p1');
    await engine.registerParticipant(tournament.tournamentId, 'p2');
    await engine.registerParticipant(tournament.tournamentId, 'p3');
    await engine.registerParticipant(tournament.tournamentId, 'p4');

    const bracketed = await engine.generateBrackets(tournament.tournamentId);
    expect(bracketed.status).toBe('in-progress');
    expect(bracketed.brackets.length).toBe(2);
    expect(bracketed.currentRound).toBe(1);

    const afterFirst = await engine.reportBracketResult(tournament.tournamentId, 0, 'p1');
    expect(afterFirst.currentRound).toBe(1);

    const afterSecond = await engine.reportBracketResult(tournament.tournamentId, 1, 'p3');
    expect(afterSecond.currentRound).toBe(2);
    expect(afterSecond.brackets.some((m) => m.round === 2)).toBe(true);

    randomSpy.mockRestore();
  });

  it('completes tournament and distributes prizes through escrow releases', async () => {
    const { deps, memory } = makeDeps();
    const engine = createEsportsEngine(deps, { prizeDistributionRatios: [0.6, 0.4] });

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const tournament = await engine.createTournament('Finals', 'single-elimination', 4, 100, 4_000n);
    await engine.registerParticipant(tournament.tournamentId, 'p1');
    await engine.registerParticipant(tournament.tournamentId, 'p2');
    await engine.registerParticipant(tournament.tournamentId, 'p3');
    await engine.registerParticipant(tournament.tournamentId, 'p4');
    await engine.generateBrackets(tournament.tournamentId);

    await engine.reportBracketResult(tournament.tournamentId, 0, 'p1');
    await engine.reportBracketResult(tournament.tournamentId, 1, 'p3');
    const beforeFinal = await engine.reportBracketResult(tournament.tournamentId, 2, 'p1');

    expect(beforeFinal.status).toBe('completed');

    const distribution = await engine.distributePrizes(tournament.tournamentId);
    expect(distribution.totalDistributed).toBe(400);
    expect(distribution.placements).toHaveLength(2);
    expect(memory.releases).toHaveLength(2);

    randomSpy.mockRestore();
  });

  it('creates league, adds members, and processes promotion by points sort', async () => {
    const { deps } = makeDeps();
    const engine = createEsportsEngine(deps);

    const league = await engine.createLeague('Season One', 10, 1_000_000);
    const withA = await engine.addLeagueMember(league.leagueId, 'p1', 'silver');
    const withB = await engine.addLeagueMember(league.leagueId, 'p2', 'silver');

    expect(withA.divisions.find((d) => d.division === 'silver')?.members.length).toBe(1);
    expect(withB.divisions.find((d) => d.division === 'silver')?.members.length).toBe(2);

    const promoted = await engine.processPromotion(league.leagueId);
    expect(promoted.seasonNumber).toBe(2);
  });

  it('manages broadcast lifecycle and VOD recording in stats', () => {
    const { deps } = makeDeps();
    const engine = createEsportsEngine(deps, { defaultDelaySeconds: 15 });

    const started = engine.startBroadcast('match-1', ['caster-a'], true);
    expect(started.status).toBe('live');
    expect(started.delaySeconds).toBe(15);

    const vod = engine.recordVod(started.broadcastId, 'Grand Final', 300, 1024, [
      { timestampSeconds: 42, label: 'First blood', category: 'kill' },
    ]);
    expect(vod.durationSeconds).toBe(300);

    const ended = engine.endBroadcast(started.broadcastId, 2500);
    expect(ended.status).toBe('ended');

    const stats = engine.getStats();
    expect(stats.broadcastsLive).toBe(0);
    expect(stats.vodsRecorded).toBe(1);
    expect(stats.totalViewers).toBe(2500);
  });

  it('returns stable public player stats shape', () => {
    const { deps } = makeDeps();
    const engine = createEsportsEngine(deps);

    const stats = engine.getPlayerStats('player-9');
    expect(stats.playerId).toBe('player-9');
    expect(stats.elo).toBe(1200);
    expect(stats.division).toBe('bronze');
  });
});
