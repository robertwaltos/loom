/**
 * Player Event Engine — Player-driven festivals, tournaments, and expeditions.
 *
 * Players can propose and run community events:
 *   - Festivals: temporary trade bonuses, crafting boosts, NPC celebrations
 *   - Tournaments: bracket-based competitive events (single/double elimination, Swiss)
 *   - Expeditions: cooperative exploration missions (cross-world via Silfen Weave)
 *   - Ceremonies: dynasty milestones, coronations, memorials
 *   - Market Fairs: pop-up marketplaces with special trade rules
 *
 * Events follow a lifecycle:
 *   PROPOSED → APPROVED → SCHEDULED → ACTIVE → CONCLUDED → ARCHIVED
 *
 * NPC participation: Tier 3 NPCs attend and react to events.
 * Festival economy: temporary world parameter boosts.
 * Remembrance: milestone events become permanent history.
 */

// ── Ports ────────────────────────────────────────────────────────

export interface EventClockPort {
  readonly nowMicroseconds: () => number;
}

export interface EventIdPort {
  readonly generate: () => string;
}

export interface EventLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
  readonly warn: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

export interface EventWorldPort {
  readonly applyTemporaryBoost: (
    worldId: string,
    boosts: Readonly<Record<string, number>>,
    durationMs: number,
  ) => void;
}

export interface EventNotificationPort {
  readonly notifyWorld: (worldId: string, notification: EventNotification) => void;
  readonly notifyPlayer: (playerId: string, notification: EventNotification) => void;
}

export interface EventRemembrancePort {
  readonly recordEvent: (eventRecord: PlayerEventRecord) => void;
  readonly recordTournamentResult: (tournament: TournamentBracket) => void;
}

export interface EventNotification {
  readonly type: string;
  readonly title: string;
  readonly details: Readonly<Record<string, unknown>>;
}

// ── Types ────────────────────────────────────────────────────────

export type PlayerEventType =
  | 'festival'
  | 'tournament'
  | 'expedition'
  | 'ceremony'
  | 'market-fair';

export type PlayerEventPhase =
  | 'PROPOSED'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'CONCLUDED'
  | 'ARCHIVED'
  | 'REJECTED';

export type BracketType =
  | 'single-elimination'
  | 'double-elimination'
  | 'swiss'
  | 'round-robin';

// ── Event Records ────────────────────────────────────────────────

export interface PlayerEventRecord {
  readonly eventId: string;
  readonly worldId: string;
  readonly proposerId: string;
  readonly eventType: PlayerEventType;
  readonly title: string;
  readonly description: string;
  readonly phase: PlayerEventPhase;
  readonly scheduledStartAt: number;
  readonly scheduledEndAt: number;
  readonly actualStartAt: number;
  readonly actualEndAt: number;
  readonly maxParticipants: number;
  readonly participants: ReadonlyArray<EventParticipant>;
  readonly economyBoosts: Readonly<Record<string, number>>;
  readonly createdAt: number;
}

export interface EventParticipant {
  readonly playerId: string;
  readonly role: 'organiser' | 'participant' | 'spectator' | 'vendor';
  readonly joinedAt: number;
  readonly score: number;
}

export interface ProposeEventParams {
  readonly worldId: string;
  readonly proposerId: string;
  readonly eventType: PlayerEventType;
  readonly title: string;
  readonly description: string;
  readonly scheduledStartAt: number;
  readonly scheduledEndAt: number;
  readonly maxParticipants: number;
  readonly economyBoosts?: Readonly<Record<string, number>>;
}

// ── Tournament ───────────────────────────────────────────────────

export interface TournamentBracket {
  readonly tournamentId: string;
  readonly eventId: string;
  readonly bracketType: BracketType;
  readonly rounds: ReadonlyArray<TournamentRound>;
  readonly currentRound: number;
  readonly winnerId: string | null;
  readonly completed: boolean;
}

export interface TournamentRound {
  readonly roundNumber: number;
  readonly matches: ReadonlyArray<TournamentMatch>;
}

export interface TournamentMatch {
  readonly matchId: string;
  readonly roundNumber: number;
  readonly player1Id: string;
  readonly player2Id: string | null;
  readonly winnerId: string | null;
  readonly loserId: string | null;
  readonly score1: number;
  readonly score2: number;
  readonly status: 'pending' | 'in-progress' | 'completed' | 'bye';
}

// ── Config ───────────────────────────────────────────────────────

export interface PlayerEventEngineConfig {
  readonly maxActiveEventsPerWorld: number;
  readonly minParticipantsForStart: number;
  readonly defaultFestivalDurationMs: number;
  readonly maxEconomyBoostMultiplier: number;
  readonly approvalRequired: boolean;
}

const DEFAULT_CONFIG: PlayerEventEngineConfig = {
  maxActiveEventsPerWorld: 5,
  minParticipantsForStart: 3,
  defaultFestivalDurationMs: 4 * 60 * 60 * 1_000,
  maxEconomyBoostMultiplier: 1.5,
  approvalRequired: true,
};

// ── Stats ────────────────────────────────────────────────────────

export interface PlayerEventEngineStats {
  readonly totalEvents: number;
  readonly activeEvents: number;
  readonly totalParticipants: number;
  readonly totalTournaments: number;
  readonly completedTournaments: number;
}

// ── Public API ───────────────────────────────────────────────────

export interface PlayerEventEngine {
  // Event lifecycle
  readonly proposeEvent: (params: ProposeEventParams) => PlayerEventRecord;
  readonly approveEvent: (eventId: string) => PlayerEventRecord;
  readonly rejectEvent: (eventId: string) => PlayerEventRecord;
  readonly startEvent: (eventId: string) => PlayerEventRecord;
  readonly concludeEvent: (eventId: string) => PlayerEventRecord;

  // Participation
  readonly joinEvent: (
    eventId: string,
    playerId: string,
    role: 'participant' | 'spectator' | 'vendor',
  ) => PlayerEventRecord;
  readonly leaveEvent: (eventId: string, playerId: string) => PlayerEventRecord;

  // Tournaments
  readonly createTournament: (
    eventId: string,
    bracketType: BracketType,
    participantIds: ReadonlyArray<string>,
  ) => TournamentBracket;
  readonly reportMatchResult: (
    tournamentId: string,
    matchId: string,
    winnerId: string,
    score1: number,
    score2: number,
  ) => TournamentBracket;
  readonly advanceTournament: (tournamentId: string) => TournamentBracket;

  // Queries
  readonly getEvent: (eventId: string) => PlayerEventRecord | undefined;
  readonly getActiveEvents: (worldId: string) => ReadonlyArray<PlayerEventRecord>;
  readonly getTournament: (tournamentId: string) => TournamentBracket | undefined;

  // Lifecycle
  readonly tick: () => void;
  readonly getStats: () => PlayerEventEngineStats;
}

// ── Deps ─────────────────────────────────────────────────────────

export interface PlayerEventEngineDeps {
  readonly clock: EventClockPort;
  readonly idGenerator: EventIdPort;
  readonly logger: EventLogPort;
  readonly world: EventWorldPort;
  readonly notifications: EventNotificationPort;
  readonly remembrance: EventRemembrancePort;
}

// ── Mutable State ────────────────────────────────────────────────

interface MutableEvent {
  readonly eventId: string;
  readonly worldId: string;
  readonly proposerId: string;
  readonly eventType: PlayerEventType;
  readonly title: string;
  readonly description: string;
  phase: PlayerEventPhase;
  readonly scheduledStartAt: number;
  readonly scheduledEndAt: number;
  actualStartAt: number;
  actualEndAt: number;
  readonly maxParticipants: number;
  readonly participants: Map<string, MutableParticipant>;
  readonly economyBoosts: Readonly<Record<string, number>>;
  readonly createdAt: number;
}

interface MutableParticipant {
  readonly playerId: string;
  readonly role: 'organiser' | 'participant' | 'spectator' | 'vendor';
  readonly joinedAt: number;
  score: number;
}

interface MutableTournament {
  readonly tournamentId: string;
  readonly eventId: string;
  readonly bracketType: BracketType;
  readonly rounds: MutableRound[];
  currentRound: number;
  winnerId: string | null;
  completed: boolean;
}

interface MutableMatch {
  readonly matchId: string;
  roundNumber: number;
  readonly player1Id: string;
  player2Id: string | null;
  winnerId: string | null;
  loserId: string | null;
  score1: number;
  score2: number;
  status: 'pending' | 'in-progress' | 'completed' | 'bye';
}

// ── Factory ──────────────────────────────────────────────────────

export function createPlayerEventEngine(
  deps: PlayerEventEngineDeps,
  config?: Partial<PlayerEventEngineConfig>,
): PlayerEventEngine {
  const cfg: PlayerEventEngineConfig = { ...DEFAULT_CONFIG, ...config };
  const events = new Map<string, MutableEvent>();
  const tournaments = new Map<string, MutableTournament>();

  function proposeEvent(params: ProposeEventParams): PlayerEventRecord {
    const now = deps.clock.nowMicroseconds();
    const eventId = deps.idGenerator.generate();

    // Validate economy boosts
    const boosts = params.economyBoosts ?? {};
    for (const value of Object.values(boosts)) {
      if (value > cfg.maxEconomyBoostMultiplier) {
        throw new Error(`Economy boost ${value} exceeds max ${cfg.maxEconomyBoostMultiplier}`);
      }
    }

    const event: MutableEvent = {
      eventId,
      worldId: params.worldId,
      proposerId: params.proposerId,
      eventType: params.eventType,
      title: params.title,
      description: params.description,
      phase: cfg.approvalRequired ? 'PROPOSED' : 'SCHEDULED',
      scheduledStartAt: params.scheduledStartAt,
      scheduledEndAt: params.scheduledEndAt,
      actualStartAt: 0,
      actualEndAt: 0,
      maxParticipants: params.maxParticipants,
      participants: new Map(),
      economyBoosts: boosts,
      createdAt: now,
    };



    events.set(eventId, event);
    deps.logger.info(
      { eventId, eventType: params.eventType, worldId: params.worldId },
      'player.event.proposed',
    );
    return eventToReadonly(event);
  }

  function approveEvent(eventId: string): PlayerEventRecord {
    const event = requireEvent(eventId);
    if (event.phase !== 'PROPOSED') throw new Error(`Event ${eventId} not proposed`);
    event.phase = 'SCHEDULED';
    deps.notifications.notifyWorld(event.worldId, {
      type: 'event.approved',
      title: event.title,
      details: { eventId, eventType: event.eventType },
    });
    return eventToReadonly(event);
  }

  function rejectEvent(eventId: string): PlayerEventRecord {
    const event = requireEvent(eventId);
    if (event.phase !== 'PROPOSED') throw new Error(`Event ${eventId} not proposed`);
    event.phase = 'REJECTED';
    return eventToReadonly(event);
  }

  function startEvent(eventId: string): PlayerEventRecord {
    const event = requireEvent(eventId);
    if (event.phase !== 'SCHEDULED') throw new Error(`Event ${eventId} not scheduled`);

    const worldEvents = getActiveEvents(event.worldId);
    if (worldEvents.length >= cfg.maxActiveEventsPerWorld) {
      throw new Error(`World ${event.worldId} has too many active events`);
    }

    event.phase = 'ACTIVE';
    event.actualStartAt = deps.clock.nowMicroseconds();

    // Apply economy boosts for festivals
    if (event.eventType === 'festival' || event.eventType === 'market-fair') {
      const durationMs = (event.scheduledEndAt - event.scheduledStartAt) / 1_000;
      deps.world.applyTemporaryBoost(event.worldId, event.economyBoosts, durationMs);
    }

    deps.notifications.notifyWorld(event.worldId, {
      type: 'event.started',
      title: event.title,
      details: { eventId, participants: event.participants.size },
    });

    return eventToReadonly(event);
  }

  function concludeEvent(eventId: string): PlayerEventRecord {
    const event = requireEvent(eventId);
    if (event.phase !== 'ACTIVE') throw new Error(`Event ${eventId} not active`);

    event.phase = 'CONCLUDED';
    event.actualEndAt = deps.clock.nowMicroseconds();

    deps.remembrance.recordEvent(eventToReadonly(event));
    deps.logger.info(
      { eventId, participants: event.participants.size },
      'player.event.concluded',
    );
    return eventToReadonly(event);
  }

  function joinEvent(
    eventId: string,
    playerId: string,
    role: 'participant' | 'spectator' | 'vendor',
  ): PlayerEventRecord {
    const event = requireEvent(eventId);
    if (event.phase !== 'SCHEDULED' && event.phase !== 'ACTIVE') {
      throw new Error(`Event ${eventId} not joinable`);
    }
    if (event.participants.has(playerId)) {
      throw new Error(`Player ${playerId} already in event`);
    }
    if (role === 'participant' && event.participants.size >= event.maxParticipants) {
      throw new Error('Event is full');
    }

    event.participants.set(playerId, {
      playerId,
      role,
      joinedAt: deps.clock.nowMicroseconds(),
      score: 0,
    });

    return eventToReadonly(event);
  }

  function leaveEvent(eventId: string, playerId: string): PlayerEventRecord {
    const event = requireEvent(eventId);
    event.participants.delete(playerId);
    return eventToReadonly(event);
  }

  // ── Tournaments ──────────────────────────────────────────────

  function createTournament(
    eventId: string,
    bracketType: BracketType,
    participantIds: ReadonlyArray<string>,
  ): TournamentBracket {
    const tournamentId = deps.idGenerator.generate();

    const round1 = generateFirstRound(deps.idGenerator, participantIds, bracketType);
    const tournament: MutableTournament = {
      tournamentId,
      eventId,
      bracketType,
      rounds: [round1],
      currentRound: 1,
      winnerId: null,
      completed: false,
    };

    tournaments.set(tournamentId, tournament);
    deps.logger.info(
      { tournamentId, bracketType, participants: participantIds.length },
      'tournament.created',
    );
    return tournamentToReadonly(tournament);
  }

  function reportMatchResult(
    tournamentId: string,
    matchId: string,
    winnerId: string,
    score1: number,
    score2: number,
  ): TournamentBracket {
    const tournament = requireTournament(tournamentId);
    const match = findMatch(tournament, matchId);
    if (!match) throw new Error(`Match ${matchId} not found`);
    if (match.status === 'completed') throw new Error(`Match ${matchId} already completed`);

    match.winnerId = winnerId;
    match.loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;
    match.score1 = score1;
    match.score2 = score2;
    match.status = 'completed';

    return tournamentToReadonly(tournament);
  }

  function advanceTournament(tournamentId: string): TournamentBracket {
    const tournament = requireTournament(tournamentId);
    const currentRound = tournament.rounds[tournament.currentRound - 1]!;

    // Check all matches in current round are completed
    const allCompleted = currentRound.matches.every(
      (m) => m.status === 'completed' || m.status === 'bye',
    );
    if (!allCompleted) throw new Error('Not all matches in current round completed');

    // Collect winners
    const winners: string[] = [];
    for (const match of currentRound.matches) {
      if (match.winnerId) winners.push(match.winnerId);
    }

    // Check if tournament is over
    if (winners.length <= 1) {
      tournament.winnerId = winners[0] ?? null;
      tournament.completed = true;
      deps.remembrance.recordTournamentResult(tournamentToReadonly(tournament));
      return tournamentToReadonly(tournament);
    }

    // Generate next round
    const nextRound = generateFirstRound(
      deps.idGenerator,
      winners,
      tournament.bracketType,
    );
    nextRound.roundNumber = tournament.currentRound + 1;
    for (const match of nextRound.matches) {
      (match as MutableMatch).roundNumber = nextRound.roundNumber;
    }
    tournament.rounds.push(nextRound);
    tournament.currentRound++;

    return tournamentToReadonly(tournament);
  }

  function getEvent(eventId: string): PlayerEventRecord | undefined {
    const e = events.get(eventId);
    return e ? eventToReadonly(e) : undefined;
  }

  function getActiveEvents(worldId: string): ReadonlyArray<PlayerEventRecord> {
    const result: PlayerEventRecord[] = [];
    for (const event of events.values()) {
      if (event.worldId === worldId && event.phase === 'ACTIVE') {
        result.push(eventToReadonly(event));
      }
    }
    return result;
  }

  function getTournament(tournamentId: string): TournamentBracket | undefined {
    const t = tournaments.get(tournamentId);
    return t ? tournamentToReadonly(t) : undefined;
  }

  function tick(): void {
    const now = deps.clock.nowMicroseconds();
    const nowMs = now / 1_000;

    for (const event of events.values()) {
      if (event.phase === 'SCHEDULED' && nowMs >= event.scheduledStartAt / 1_000) {
        if (event.participants.size >= cfg.minParticipantsForStart) {
          event.phase = 'ACTIVE';
          event.actualStartAt = now;
        }
      }
      if (event.phase === 'ACTIVE' && nowMs >= event.scheduledEndAt / 1_000) {
        event.phase = 'CONCLUDED';
        event.actualEndAt = now;
        deps.remembrance.recordEvent(eventToReadonly(event));
      }
    }
  }

  function getStats(): PlayerEventEngineStats {
    let activeEvents = 0;
    let totalParticipants = 0;
    let completedTournaments = 0;

    for (const event of events.values()) {
      if (event.phase === 'ACTIVE') activeEvents++;
      totalParticipants += event.participants.size;
    }
    for (const t of tournaments.values()) {
      if (t.completed) completedTournaments++;
    }

    return {
      totalEvents: events.size,
      activeEvents,
      totalParticipants,
      totalTournaments: tournaments.size,
      completedTournaments,
    };
  }

  function requireEvent(id: string): MutableEvent {
    const e = events.get(id);
    if (!e) throw new Error(`Event ${id} not found`);
    return e;
  }

  function requireTournament(id: string): MutableTournament {
    const t = tournaments.get(id);
    if (!t) throw new Error(`Tournament ${id} not found`);
    return t;
  }

  return {
    proposeEvent,
    approveEvent,
    rejectEvent,
    startEvent,
    concludeEvent,
    joinEvent,
    leaveEvent,
    createTournament,
    reportMatchResult,
    advanceTournament,
    getEvent,
    getActiveEvents,
    getTournament,
    tick,
    getStats,
  };
}

// ── Bracket Generation ───────────────────────────────────────────

interface MutableRound {
  roundNumber: number;
  readonly matches: MutableMatch[];
}

interface IdGen {
  readonly generate: () => string;
}

function generateFirstRound(
  idGen: IdGen,
  participantIds: ReadonlyArray<string>,
  _bracketType: BracketType,
): MutableRound {
  const matches: MutableMatch[] = [];
  const padded = [...participantIds];

  // Pad to even number (byes for odd count)
  if (padded.length % 2 !== 0) {
    padded.push('__BYE__');
  }

  for (let i = 0; i < padded.length; i += 2) {
    const p1 = padded[i]!;
    const p2 = padded[i + 1]!;
    const isBye = p2 === '__BYE__';

    matches.push({
      matchId: idGen.generate(),
      roundNumber: 1,
      player1Id: p1,
      player2Id: isBye ? null : p2,
      winnerId: isBye ? p1 : null,
      loserId: null,
      score1: 0,
      score2: 0,
      status: isBye ? 'bye' : 'pending',
    });
  }

  return { roundNumber: 1, matches };
}

// ── Helpers ──────────────────────────────────────────────────────

function findMatch(
  tournament: MutableTournament,
  matchId: string,
): MutableMatch | undefined {
  for (const round of tournament.rounds) {
    for (const match of round.matches) {
      if (match.matchId === matchId) return match;
    }
  }
  return undefined;
}

function eventToReadonly(e: MutableEvent): PlayerEventRecord {
  const participants: EventParticipant[] = [];
  for (const p of e.participants.values()) {
    participants.push({
      playerId: p.playerId,
      role: p.role,
      joinedAt: p.joinedAt,
      score: p.score,
    });
  }
  return {
    eventId: e.eventId,
    worldId: e.worldId,
    proposerId: e.proposerId,
    eventType: e.eventType,
    title: e.title,
    description: e.description,
    phase: e.phase,
    scheduledStartAt: e.scheduledStartAt,
    scheduledEndAt: e.scheduledEndAt,
    actualStartAt: e.actualStartAt,
    actualEndAt: e.actualEndAt,
    maxParticipants: e.maxParticipants,
    participants,
    economyBoosts: e.economyBoosts,
    createdAt: e.createdAt,
  };
}

function tournamentToReadonly(t: MutableTournament): TournamentBracket {
  return {
    tournamentId: t.tournamentId,
    eventId: t.eventId,
    bracketType: t.bracketType,
    rounds: t.rounds.map((r) => ({
      roundNumber: r.roundNumber,
      matches: r.matches.map((m) => ({
        matchId: m.matchId,
        roundNumber: m.roundNumber,
        player1Id: m.player1Id,
        player2Id: m.player2Id,
        winnerId: m.winnerId,
        loserId: m.loserId,
        score1: m.score1,
        score2: m.score2,
        status: m.status,
      })),
    })),
    currentRound: t.currentRound,
    winnerId: t.winnerId,
    completed: t.completed,
  };
}
