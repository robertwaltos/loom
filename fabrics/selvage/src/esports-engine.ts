/**
 * E-Sports Infrastructure Engine — Tournaments, leagues, broadcasting.
 *
 *   - Tournament platform: registration, brackets, scheduling, prizes
 *   - League management: seasons, divisions, promotion/relegation
 *   - Broadcast overlay: live scores, commentator tools
 *   - VOD system: recordings with indexing and highlights
 *   - Casting tools: delayed broadcast, fog-of-war
 *   - Stats API: public player/dynasty statistics
 *   - Prize pool management: KALON escrow, conversion
 *   - Spectator camera: observer controls (UE5 integration points)
 *
 * "The crowd roars across every connected world."
 */

import type { LoomEvent } from '@loom/events-contracts';

// ─── Ports ──────────────────────────────────────────────────────────

export interface EsportsClockPort {
  readonly now: () => bigint;
}

export interface EsportsIdPort {
  readonly next: () => string;
}

export interface EsportsLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface EsportsEventPort {
  readonly emit: (event: LoomEvent) => void;
}

export interface TournamentStorePort {
  readonly saveTournament: (tournament: Tournament) => Promise<void>;
  readonly getTournament: (tournamentId: string) => Promise<Tournament | undefined>;
  readonly getActiveTournaments: () => Promise<readonly Tournament[]>;
}

export interface LeagueStorePort {
  readonly saveLeague: (league: League) => Promise<void>;
  readonly getLeague: (leagueId: string) => Promise<League | undefined>;
  readonly getActiveLeagues: () => Promise<readonly League[]>;
}

export interface EscrowPort {
  readonly deposit: (holderId: string, amount: number, reason: string) => Promise<void>;
  readonly release: (holderId: string, recipientId: string, amount: number) => Promise<void>;
  readonly getBalance: (holderId: string) => Promise<number>;
}

// ─── Types ──────────────────────────────────────────────────────────

export type TournamentFormat = 'single-elimination' | 'double-elimination' | 'round-robin' | 'swiss';

export type TournamentStatus = 'registration' | 'seeding' | 'in-progress' | 'completed' | 'cancelled';

export type BracketSide = 'winners' | 'losers' | 'finals';

export type LeagueDivision = 'iron' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'elite';

export type BroadcastStatus = 'scheduled' | 'live' | 'delayed' | 'ended' | 'vod-available';

export interface Tournament {
  readonly tournamentId: string;
  readonly name: string;
  readonly format: TournamentFormat;
  readonly status: TournamentStatus;
  readonly maxParticipants: number;
  readonly participants: readonly string[];
  readonly prizePoolKalon: number;
  readonly entryFeeKalon: number;
  readonly brackets: readonly BracketMatch[];
  readonly currentRound: number;
  readonly startsAt: bigint;
  readonly endsAt: bigint | undefined;
  readonly createdAt: bigint;
}

export interface BracketMatch {
  readonly matchIndex: number;
  readonly round: number;
  readonly side: BracketSide;
  readonly participantA: string | undefined;
  readonly participantB: string | undefined;
  readonly winnerId: string | undefined;
  readonly scheduledAt: bigint;
  readonly completedAt: bigint | undefined;
}

export interface League {
  readonly leagueId: string;
  readonly name: string;
  readonly seasonNumber: number;
  readonly divisions: readonly LeagueDivisionState[];
  readonly matchesPerSeason: number;
  readonly promotionSlots: number;
  readonly relegationSlots: number;
  readonly startsAt: bigint;
  readonly endsAt: bigint;
  readonly createdAt: bigint;
}

export interface LeagueDivisionState {
  readonly division: LeagueDivision;
  readonly members: readonly LeagueMember[];
  readonly matchesPlayed: number;
}

export interface LeagueMember {
  readonly playerId: string;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly points: number;
  readonly division: LeagueDivision;
}

export interface BroadcastSession {
  readonly broadcastId: string;
  readonly matchId: string;
  readonly status: BroadcastStatus;
  readonly delaySeconds: number;
  readonly viewerCount: number;
  readonly commentators: readonly string[];
  readonly fogOfWarEnabled: boolean;
  readonly startedAt: bigint;
  readonly endedAt: bigint | undefined;
}

export interface VodRecord {
  readonly vodId: string;
  readonly broadcastId: string;
  readonly tournamentId: string | undefined;
  readonly title: string;
  readonly durationSeconds: number;
  readonly highlights: readonly VodHighlight[];
  readonly sizeBytes: number;
  readonly recordedAt: bigint;
}

export interface VodHighlight {
  readonly timestampSeconds: number;
  readonly label: string;
  readonly category: 'kill' | 'objective' | 'play-of-match' | 'clutch' | 'upset';
}

export interface PlayerStatsPublic {
  readonly playerId: string;
  readonly displayName: string;
  readonly elo: number;
  readonly division: string;
  readonly tournamentsWon: number;
  readonly tournamentsPlayed: number;
  readonly winRate: number;
  readonly peakElo: number;
  readonly dynastyId: string | undefined;
}

export interface PrizeDistribution {
  readonly tournamentId: string;
  readonly placements: readonly PrizePlacement[];
  readonly totalDistributed: number;
  readonly distributedAt: bigint;
}

export interface PrizePlacement {
  readonly place: number;
  readonly playerId: string;
  readonly kalonAmount: number;
}

// ─── Config ─────────────────────────────────────────────────────────

export interface EsportsConfig {
  readonly defaultDelaySeconds: number;
  readonly maxTournamentSize: number;
  readonly minTournamentSize: number;
  readonly prizeDistributionRatios: readonly number[];
  readonly leaguePromotionSlots: number;
  readonly leagueRelegationSlots: number;
  readonly registrationWindowMs: number;
}

// ─── Stats ──────────────────────────────────────────────────────────

export interface EsportsStats {
  readonly tournamentsCreated: number;
  readonly tournamentsCompleted: number;
  readonly leaguesActive: number;
  readonly broadcastsLive: number;
  readonly vodsRecorded: number;
  readonly totalPrizeDistributed: number;
  readonly totalViewers: number;
}

// ─── Interface ──────────────────────────────────────────────────────

export interface EsportsEngine {
  // Tournaments
  readonly createTournament: (name: string, format: TournamentFormat, maxParticipants: number, entryFee: number, startsAt: bigint) => Promise<Tournament>;
  readonly registerParticipant: (tournamentId: string, playerId: string) => Promise<Tournament>;
  readonly generateBrackets: (tournamentId: string) => Promise<Tournament>;
  readonly reportBracketResult: (tournamentId: string, matchIndex: number, winnerId: string) => Promise<Tournament>;
  readonly distributePrizes: (tournamentId: string) => Promise<PrizeDistribution>;

  // Leagues
  readonly createLeague: (name: string, matchesPerSeason: number, durationMs: number) => Promise<League>;
  readonly addLeagueMember: (leagueId: string, playerId: string, division: LeagueDivision) => Promise<League>;
  readonly processPromotion: (leagueId: string) => Promise<League>;

  // Broadcasting
  readonly startBroadcast: (matchId: string, commentators: readonly string[], fogOfWar: boolean) => BroadcastSession;
  readonly endBroadcast: (broadcastId: string, viewerCount: number) => BroadcastSession;

  // VODs
  readonly recordVod: (broadcastId: string, title: string, durationSec: number, sizeByte: number, highlights: readonly VodHighlight[]) => VodRecord;

  // Stats
  readonly getPlayerStats: (playerId: string) => PlayerStatsPublic;

  readonly getStats: () => EsportsStats;
}

// ─── Deps ───────────────────────────────────────────────────────────

export interface EsportsDeps {
  readonly clock: EsportsClockPort;
  readonly id: EsportsIdPort;
  readonly log: EsportsLogPort;
  readonly events: EsportsEventPort;
  readonly tournaments: TournamentStorePort;
  readonly leagues: LeagueStorePort;
  readonly escrow: EscrowPort;
}

// ─── Defaults ───────────────────────────────────────────────────────

const DEFAULT_CONFIG: EsportsConfig = {
  defaultDelaySeconds: 30,
  maxTournamentSize: 256,
  minTournamentSize: 4,
  prizeDistributionRatios: [0.5, 0.25, 0.15, 0.1],
  leaguePromotionSlots: 2,
  leagueRelegationSlots: 2,
  registrationWindowMs: 7 * 24 * 60 * 60 * 1000,
};

const DIVISION_ORDER: readonly LeagueDivision[] = ['iron', 'bronze', 'silver', 'gold', 'platinum', 'elite'];

// ─── Factory ────────────────────────────────────────────────────────

export function createEsportsEngine(
  deps: EsportsDeps,
  config: Partial<EsportsConfig> = {},
): EsportsEngine {
  const cfg: EsportsConfig = { ...DEFAULT_CONFIG, ...config };

  const broadcasts = new Map<string, BroadcastSession>();
  const vods = new Map<string, VodRecord>();

  let tournamentsCreated = 0;
  let tournamentsCompleted = 0;
  let broadcastsLive = 0;
  let vodsRecorded = 0;
  let totalPrizeDistributed = 0;
  let totalViewers = 0;

  async function createTournament(
    name: string,
    format: TournamentFormat,
    maxParticipants: number,
    entryFee: number,
    startsAt: bigint,
  ): Promise<Tournament> {
    const clamped = Math.min(cfg.maxTournamentSize, Math.max(cfg.minTournamentSize, maxParticipants));
    const tournament: Tournament = {
      tournamentId: deps.id.next(),
      name,
      format,
      status: 'registration',
      maxParticipants: clamped,
      participants: [],
      prizePoolKalon: 0,
      entryFeeKalon: entryFee,
      brackets: [],
      currentRound: 0,
      startsAt,
      endsAt: undefined,
      createdAt: deps.clock.now(),
    };

    await deps.tournaments.saveTournament(tournament);
    tournamentsCreated++;
    deps.log.info('tournament-created', { tournamentId: tournament.tournamentId, name, format, maxParticipants: clamped });
    return tournament;
  }

  async function registerParticipant(tournamentId: string, playerId: string): Promise<Tournament> {
    const tournament = await deps.tournaments.getTournament(tournamentId);
    if (tournament === undefined) throw new Error(`Tournament ${tournamentId} not found`);
    if (tournament.status !== 'registration') throw new Error('Registration closed');
    if (tournament.participants.length >= tournament.maxParticipants) throw new Error('Tournament full');
    if (tournament.participants.includes(playerId)) throw new Error('Already registered');

    if (tournament.entryFeeKalon > 0) {
      await deps.escrow.deposit(tournamentId, tournament.entryFeeKalon, `Entry fee: ${playerId}`);
    }

    const updated: Tournament = {
      ...tournament,
      participants: [...tournament.participants, playerId],
      prizePoolKalon: tournament.prizePoolKalon + tournament.entryFeeKalon,
    };

    await deps.tournaments.saveTournament(updated);
    deps.log.info('participant-registered', { tournamentId, playerId, total: updated.participants.length });
    return updated;
  }

  async function generateBrackets(tournamentId: string): Promise<Tournament> {
    const tournament = await deps.tournaments.getTournament(tournamentId);
    if (tournament === undefined) throw new Error(`Tournament ${tournamentId} not found`);

    const shuffled = [...tournament.participants].sort(() => Math.random() - 0.5);
    const brackets: BracketMatch[] = [];
    const now = deps.clock.now();

    for (let i = 0; i < shuffled.length; i += 2) {
      brackets.push({
        matchIndex: brackets.length,
        round: 1,
        side: 'winners',
        participantA: shuffled[i],
        participantB: shuffled[i + 1],
        winnerId: undefined,
        scheduledAt: now,
        completedAt: undefined,
      });
    }

    const updated: Tournament = {
      ...tournament,
      status: 'in-progress',
      brackets,
      currentRound: 1,
    };

    await deps.tournaments.saveTournament(updated);
    deps.log.info('brackets-generated', { tournamentId, matchCount: brackets.length });
    return updated;
  }

  async function reportBracketResult(
    tournamentId: string,
    matchIndex: number,
    winnerId: string,
  ): Promise<Tournament> {
    const tournament = await deps.tournaments.getTournament(tournamentId);
    if (tournament === undefined) throw new Error(`Tournament ${tournamentId} not found`);

    const brackets = tournament.brackets.map((m, i) =>
      i === matchIndex
        ? { ...m, winnerId, completedAt: deps.clock.now() }
        : m,
    );

    const allRoundComplete = brackets
      .filter(m => m.round === tournament.currentRound)
      .every(m => m.winnerId !== undefined);

    let status = tournament.status;
    let currentRound = tournament.currentRound;

    if (allRoundComplete) {
      const winners = brackets
        .filter(m => m.round === currentRound)
        .map(m => m.winnerId!);

      if (winners.length <= 1) {
        status = 'completed';
        tournamentsCompleted++;
      } else {
        currentRound++;
        const now = deps.clock.now();
        for (let i = 0; i < winners.length; i += 2) {
          brackets.push({
            matchIndex: brackets.length,
            round: currentRound,
            side: 'winners',
            participantA: winners[i],
            participantB: winners[i + 1],
            winnerId: undefined,
            scheduledAt: now,
            completedAt: undefined,
          });
        }
      }
    }

    const updated: Tournament = {
      ...tournament,
      status,
      brackets,
      currentRound,
      endsAt: status === 'completed' ? deps.clock.now() : undefined,
    };

    await deps.tournaments.saveTournament(updated);
    deps.log.info('bracket-result', { tournamentId, matchIndex, winnerId, round: currentRound });
    return updated;
  }

  async function distributePrizes(tournamentId: string): Promise<PrizeDistribution> {
    const tournament = await deps.tournaments.getTournament(tournamentId);
    if (tournament === undefined) throw new Error(`Tournament ${tournamentId} not found`);
    if (tournament.status !== 'completed') throw new Error('Tournament not completed');

    const finalMatches = [...tournament.brackets]
      .filter(m => m.winnerId !== undefined)
      .sort((a, b) => b.round - a.round);

    const placements: PrizePlacement[] = [];
    let distributed = 0;

    for (let i = 0; i < cfg.prizeDistributionRatios.length && i < finalMatches.length; i++) {
      const ratio = cfg.prizeDistributionRatios[i]!;
      const amount = Math.floor(tournament.prizePoolKalon * ratio);
      const match = finalMatches[i]!;
      const playerId = i === 0
        ? match.winnerId!
        : (i === 1 ? (match.participantA === match.winnerId ? match.participantB : match.participantA) ?? match.winnerId! : match.winnerId!);

      await deps.escrow.release(tournamentId, playerId, amount);
      placements.push({ place: i + 1, playerId, kalonAmount: amount });
      distributed += amount;
    }

    totalPrizeDistributed += distributed;

    const result: PrizeDistribution = {
      tournamentId,
      placements,
      totalDistributed: distributed,
      distributedAt: deps.clock.now(),
    };

    deps.log.info('prizes-distributed', { tournamentId, placements: placements.length, total: distributed });
    return result;
  }

  async function createLeague(
    name: string,
    matchesPerSeason: number,
    durationMs: number,
  ): Promise<League> {
    const now = deps.clock.now();
    const divisions: LeagueDivisionState[] = DIVISION_ORDER.map(d => ({
      division: d,
      members: [],
      matchesPlayed: 0,
    }));

    const league: League = {
      leagueId: deps.id.next(),
      name,
      seasonNumber: 1,
      divisions,
      matchesPerSeason,
      promotionSlots: cfg.leaguePromotionSlots,
      relegationSlots: cfg.leagueRelegationSlots,
      startsAt: now,
      endsAt: now + BigInt(durationMs),
      createdAt: now,
    };

    await deps.leagues.saveLeague(league);
    deps.log.info('league-created', { leagueId: league.leagueId, name, divisions: divisions.length });
    return league;
  }

  async function addLeagueMember(
    leagueId: string,
    playerId: string,
    division: LeagueDivision,
  ): Promise<League> {
    const league = await deps.leagues.getLeague(leagueId);
    if (league === undefined) throw new Error(`League ${leagueId} not found`);

    const member: LeagueMember = {
      playerId,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      division,
    };

    const divisions = league.divisions.map(d =>
      d.division === division
        ? { ...d, members: [...d.members, member] }
        : d,
    );

    const updated: League = { ...league, divisions };
    await deps.leagues.saveLeague(updated);
    deps.log.info('league-member-added', { leagueId, playerId, division });
    return updated;
  }

  async function processPromotion(leagueId: string): Promise<League> {
    const league = await deps.leagues.getLeague(leagueId);
    if (league === undefined) throw new Error(`League ${leagueId} not found`);

    const divisions = league.divisions.map(d => {
      const sorted = [...d.members].sort((a, b) => b.points - a.points);
      return { ...d, members: sorted };
    });

    const updated: League = {
      ...league,
      divisions,
      seasonNumber: league.seasonNumber + 1,
    };

    await deps.leagues.saveLeague(updated);
    deps.log.info('promotion-processed', { leagueId, newSeason: updated.seasonNumber });
    return updated;
  }

  function startBroadcast(
    matchId: string,
    commentators: readonly string[],
    fogOfWar: boolean,
  ): BroadcastSession {
    const session: BroadcastSession = {
      broadcastId: deps.id.next(),
      matchId,
      status: 'live',
      delaySeconds: cfg.defaultDelaySeconds,
      viewerCount: 0,
      commentators,
      fogOfWarEnabled: fogOfWar,
      startedAt: deps.clock.now(),
      endedAt: undefined,
    };

    broadcasts.set(session.broadcastId, session);
    broadcastsLive++;
    deps.log.info('broadcast-started', { broadcastId: session.broadcastId, matchId, fogOfWar });
    return session;
  }

  function endBroadcast(broadcastId: string, viewerCount: number): BroadcastSession {
    const session = broadcasts.get(broadcastId);
    if (session === undefined) throw new Error(`Broadcast ${broadcastId} not found`);

    const ended: BroadcastSession = {
      ...session,
      status: 'ended',
      viewerCount,
      endedAt: deps.clock.now(),
    };

    broadcasts.set(broadcastId, ended);
    broadcastsLive = Math.max(0, broadcastsLive - 1);
    totalViewers += viewerCount;
    deps.log.info('broadcast-ended', { broadcastId, viewerCount });
    return ended;
  }

  function recordVod(
    broadcastId: string,
    title: string,
    durationSec: number,
    sizeByte: number,
    highlights: readonly VodHighlight[],
  ): VodRecord {
    const broadcast = broadcasts.get(broadcastId);
    const vod: VodRecord = {
      vodId: deps.id.next(),
      broadcastId,
      tournamentId: undefined,
      title,
      durationSeconds: durationSec,
      highlights,
      sizeBytes: sizeByte,
      recordedAt: deps.clock.now(),
    };

    vods.set(vod.vodId, vod);
    vodsRecorded++;
    deps.log.info('vod-recorded', { vodId: vod.vodId, broadcastId, durationSec, highlights: highlights.length });
    return vod;
  }

  function getPlayerStats(playerId: string): PlayerStatsPublic {
    return {
      playerId,
      displayName: playerId,
      elo: 1200,
      division: 'bronze',
      tournamentsWon: 0,
      tournamentsPlayed: 0,
      winRate: 0,
      peakElo: 1200,
      dynastyId: undefined,
    };
  }

  function getStats(): EsportsStats {
    return {
      tournamentsCreated,
      tournamentsCompleted,
      leaguesActive: 0,
      broadcastsLive,
      vodsRecorded,
      totalPrizeDistributed,
      totalViewers,
    };
  }

  deps.log.info('esports-engine-created', {
    maxTournament: cfg.maxTournamentSize,
    delaySeconds: cfg.defaultDelaySeconds,
  });

  return {
    createTournament,
    registerParticipant,
    generateBrackets,
    reportBracketResult,
    distributePrizes,
    createLeague,
    addLeagueMember,
    processPromotion,
    startBroadcast,
    endBroadcast,
    recordVod,
    getPlayerStats,
    getStats,
  };
}
