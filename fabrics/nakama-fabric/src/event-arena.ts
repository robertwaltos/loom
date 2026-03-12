/**
 * Event Arena System — Instanced competitive spaces with spectator mode.
 *
 * NEXT-STEPS Phase 8.4: "Event arena system: instanced competitive spaces
 * with spectator mode."
 *
 * Arenas are ephemeral instanced zones for structured competition:
 *   - TOURNAMENT: bracket elimination, seeded or random
 *   - DUEL: 1v1 ranked challenge
 *   - EXHIBITION: scored performance (no elimination)
 *
 * Lifecycle: SCHEDULING → OPEN → IN_PROGRESS → CONCLUDED → ARCHIVED
 */

// ─── Types ───────────────────────────────────────────────────────

export type ArenaType = 'TOURNAMENT' | 'DUEL' | 'EXHIBITION';

export type ArenaPhase = 'SCHEDULING' | 'OPEN' | 'IN_PROGRESS' | 'CONCLUDED' | 'ARCHIVED';

export type ParticipantStatus = 'REGISTERED' | 'ACTIVE' | 'ELIMINATED' | 'WITHDRAWN' | 'WINNER';

export type SpectatorStatus = 'WATCHING' | 'LEFT';

export interface ArenaParticipant {
  readonly dynastyId: string;
  readonly displayName: string;
  readonly status: ParticipantStatus;
  readonly seed: number;
  readonly score: number;
  readonly joinedAt: number;
}

export interface ArenaSpectator {
  readonly dynastyId: string;
  readonly status: SpectatorStatus;
  readonly joinedAt: number;
}

export interface ArenaMatch {
  readonly matchId: string;
  readonly arenaId: string;
  readonly round: number;
  readonly participantA: string;
  readonly participantB: string;
  readonly winnerId: string | null;
  readonly scoreA: number;
  readonly scoreB: number;
  readonly startedAt: number;
  readonly concludedAt: number | null;
}

export interface ArenaEvent {
  readonly arenaId: string;
  readonly worldId: string;
  readonly name: string;
  readonly arenaType: ArenaType;
  readonly phase: ArenaPhase;
  readonly createdAt: number;
  readonly opensAt: number;
  readonly startsAt: number;
  readonly maxParticipants: number;
  readonly participants: ReadonlyArray<ArenaParticipant>;
  readonly spectators: ReadonlyArray<ArenaSpectator>;
  readonly matches: ReadonlyArray<ArenaMatch>;
  readonly currentRound: number;
  readonly winnerId: string | null;
  readonly prizePool: bigint;
}

// ─── Params ──────────────────────────────────────────────────────

export interface CreateArenaParams {
  readonly worldId: string;
  readonly name: string;
  readonly arenaType: ArenaType;
  readonly maxParticipants: number;
  readonly opensAt: number;
  readonly startsAt: number;
  readonly prizePool: bigint;
}

export interface ReportMatchParams {
  readonly arenaId: string;
  readonly matchId: string;
  readonly winnerId: string;
  readonly scoreA: number;
  readonly scoreB: number;
}

// ─── Ports ───────────────────────────────────────────────────────

export interface ArenaSystemDeps {
  readonly clock: { readonly nowMicroseconds: () => number };
  readonly idGenerator: { readonly next: () => string };
}

// ─── Config ──────────────────────────────────────────────────────

export interface ArenaSystemConfig {
  readonly maxSpectatorsPerArena: number;
  readonly minParticipantsToStart: number;
}

export const DEFAULT_ARENA_CONFIG: ArenaSystemConfig = {
  maxSpectatorsPerArena: 500,
  minParticipantsToStart: 2,
};

// ─── Stats ───────────────────────────────────────────────────────

export interface ArenaSystemStats {
  readonly totalArenas: number;
  readonly activeArenas: number;
  readonly totalMatches: number;
  readonly totalSpectators: number;
}

// ─── Public Interface ────────────────────────────────────────────

export interface EventArenaSystem {
  readonly createArena: (params: CreateArenaParams) => ArenaEvent;
  readonly registerParticipant: (arenaId: string, dynastyId: string, displayName: string) => ArenaEvent;
  readonly withdrawParticipant: (arenaId: string, dynastyId: string) => ArenaEvent;
  readonly joinAsSpectator: (arenaId: string, dynastyId: string) => ArenaEvent;
  readonly leaveAsSpectator: (arenaId: string, dynastyId: string) => ArenaEvent;
  readonly startArena: (arenaId: string) => ArenaEvent;
  readonly generateMatches: (arenaId: string) => ReadonlyArray<ArenaMatch>;
  readonly reportMatch: (params: ReportMatchParams) => ArenaMatch;
  readonly concludeArena: (arenaId: string) => ArenaEvent;
  readonly archiveArena: (arenaId: string) => ArenaEvent;
  readonly getArena: (arenaId: string) => ArenaEvent;
  readonly getActiveArenas: (worldId: string) => ReadonlyArray<ArenaEvent>;
  readonly getStats: () => ArenaSystemStats;
}

// ─── Mutable State ───────────────────────────────────────────────

interface MutableParticipant {
  readonly dynastyId: string;
  readonly displayName: string;
  status: ParticipantStatus;
  seed: number;
  score: number;
  readonly joinedAt: number;
}

interface MutableSpectator {
  readonly dynastyId: string;
  status: SpectatorStatus;
  readonly joinedAt: number;
}

interface MutableMatch {
  readonly matchId: string;
  readonly arenaId: string;
  readonly round: number;
  readonly participantA: string;
  readonly participantB: string;
  winnerId: string | null;
  scoreA: number;
  scoreB: number;
  readonly startedAt: number;
  concludedAt: number | null;
}

interface MutableArena {
  readonly arenaId: string;
  readonly worldId: string;
  readonly name: string;
  readonly arenaType: ArenaType;
  phase: ArenaPhase;
  readonly createdAt: number;
  readonly opensAt: number;
  readonly startsAt: number;
  readonly maxParticipants: number;
  readonly participants: Map<string, MutableParticipant>;
  readonly spectators: Map<string, MutableSpectator>;
  readonly matches: MutableMatch[];
  currentRound: number;
  winnerId: string | null;
  readonly prizePool: bigint;
}

// ─── Factory ─────────────────────────────────────────────────────

export function createEventArenaSystem(
  deps: ArenaSystemDeps,
  config?: Partial<ArenaSystemConfig>,
): EventArenaSystem {
  const cfg: ArenaSystemConfig = { ...DEFAULT_ARENA_CONFIG, ...config };
  const arenas = new Map<string, MutableArena>();

  return {
    createArena: (params) => freezeArena(createArenaImpl(deps, arenas, params)),
    registerParticipant: (aid, did, name) => freezeArena(registerImpl(deps, cfg, arenas, aid, did, name)),
    withdrawParticipant: (aid, did) => freezeArena(withdrawImpl(deps, arenas, aid, did)),
    joinAsSpectator: (aid, did) => freezeArena(spectateImpl(deps, cfg, arenas, aid, did)),
    leaveAsSpectator: (aid, did) => freezeArena(leaveSpectateImpl(arenas, aid, did)),
    startArena: (aid) => freezeArena(startImpl(deps, cfg, arenas, aid)),
    generateMatches: (aid) => generateMatchesImpl(deps, arenas, aid),
    reportMatch: (params) => reportMatchImpl(deps, arenas, params),
    concludeArena: (aid) => freezeArena(concludeImpl(deps, arenas, aid)),
    archiveArena: (aid) => freezeArena(archiveImpl(arenas, aid)),
    getArena: (aid) => freezeArena(getOrThrow(arenas, aid)),
    getActiveArenas: (wid) => getActiveImpl(arenas, wid),
    getStats: () => computeStats(arenas),
  };
}

// ─── Create ──────────────────────────────────────────────────────

function createArenaImpl(
  deps: ArenaSystemDeps,
  arenas: Map<string, MutableArena>,
  params: CreateArenaParams,
): MutableArena {
  const arena: MutableArena = {
    arenaId: deps.idGenerator.next(),
    worldId: params.worldId,
    name: params.name,
    arenaType: params.arenaType,
    phase: 'SCHEDULING',
    createdAt: deps.clock.nowMicroseconds(),
    opensAt: params.opensAt,
    startsAt: params.startsAt,
    maxParticipants: params.maxParticipants,
    participants: new Map(),
    spectators: new Map(),
    matches: [],
    currentRound: 0,
    winnerId: null,
    prizePool: params.prizePool,
  };

  arenas.set(arena.arenaId, arena);
  return arena;
}

// ─── Registration ────────────────────────────────────────────────

function registerImpl(
  deps: ArenaSystemDeps,
  cfg: ArenaSystemConfig,
  arenas: Map<string, MutableArena>,
  arenaId: string,
  dynastyId: string,
  displayName: string,
): MutableArena {
  const arena = getOrThrow(arenas, arenaId);
  assertArenaPhase(arena, ['SCHEDULING', 'OPEN']);

  if (arena.participants.has(dynastyId)) {
    throw new Error(`Dynasty ${dynastyId} already registered`);
  }
  if (arena.participants.size >= arena.maxParticipants) {
    throw new Error('Arena is full');
  }

  arena.participants.set(dynastyId, {
    dynastyId,
    displayName,
    status: 'REGISTERED',
    seed: arena.participants.size + 1,
    score: 0,
    joinedAt: deps.clock.nowMicroseconds(),
  });

  if (arena.phase === 'SCHEDULING') arena.phase = 'OPEN';

  return arena;
}

function withdrawImpl(
  deps: ArenaSystemDeps,
  arenas: Map<string, MutableArena>,
  arenaId: string,
  dynastyId: string,
): MutableArena {
  const arena = getOrThrow(arenas, arenaId);
  const participant = arena.participants.get(dynastyId);
  if (participant === undefined) throw new Error(`Dynasty ${dynastyId} not registered`);
  if (participant.status === 'ELIMINATED' || participant.status === 'WINNER') {
    throw new Error('Cannot withdraw after match concluded');
  }

  participant.status = 'WITHDRAWN';
  return arena;
}

// ─── Spectators ──────────────────────────────────────────────────

function spectateImpl(
  deps: ArenaSystemDeps,
  cfg: ArenaSystemConfig,
  arenas: Map<string, MutableArena>,
  arenaId: string,
  dynastyId: string,
): MutableArena {
  const arena = getOrThrow(arenas, arenaId);
  const activeSpectators = [...arena.spectators.values()].filter(s => s.status === 'WATCHING').length;

  if (activeSpectators >= cfg.maxSpectatorsPerArena) {
    throw new Error('Spectator capacity reached');
  }

  arena.spectators.set(dynastyId, {
    dynastyId,
    status: 'WATCHING',
    joinedAt: deps.clock.nowMicroseconds(),
  });

  return arena;
}

function leaveSpectateImpl(
  arenas: Map<string, MutableArena>,
  arenaId: string,
  dynastyId: string,
): MutableArena {
  const arena = getOrThrow(arenas, arenaId);
  const spectator = arena.spectators.get(dynastyId);
  if (spectator === undefined) throw new Error(`Dynasty ${dynastyId} not spectating`);
  spectator.status = 'LEFT';
  return arena;
}

// ─── Match Generation ────────────────────────────────────────────

function startImpl(
  deps: ArenaSystemDeps,
  cfg: ArenaSystemConfig,
  arenas: Map<string, MutableArena>,
  arenaId: string,
): MutableArena {
  const arena = getOrThrow(arenas, arenaId);
  assertArenaPhase(arena, ['OPEN']);

  const active = getActiveParticipants(arena);
  if (active.length < cfg.minParticipantsToStart) {
    throw new Error(`Need at least ${cfg.minParticipantsToStart} participants`);
  }

  arena.phase = 'IN_PROGRESS';
  arena.currentRound = 1;

  for (const p of active) p.status = 'ACTIVE';

  return arena;
}

function generateMatchesImpl(
  deps: ArenaSystemDeps,
  arenas: Map<string, MutableArena>,
  arenaId: string,
): ReadonlyArray<ArenaMatch> {
  const arena = getOrThrow(arenas, arenaId);
  assertArenaPhase(arena, ['IN_PROGRESS']);

  const active = getActiveParticipants(arena);
  const newMatches: ArenaMatch[] = [];
  const now = deps.clock.nowMicroseconds();

  for (let i = 0; i + 1 < active.length; i += 2) {
    const match: MutableMatch = {
      matchId: deps.idGenerator.next(),
      arenaId,
      round: arena.currentRound,
      participantA: active[i].dynastyId,
      participantB: active[i + 1].dynastyId,
      winnerId: null,
      scoreA: 0,
      scoreB: 0,
      startedAt: now,
      concludedAt: null,
    };

    arena.matches.push(match);
    newMatches.push(freezeMatch(match));
  }

  // Bye: odd participant advances automatically
  if (active.length % 2 === 1) {
    const byeParticipant = active[active.length - 1];
    byeParticipant.score += 1; // bye win
  }

  return newMatches;
}

function reportMatchImpl(
  deps: ArenaSystemDeps,
  arenas: Map<string, MutableArena>,
  params: ReportMatchParams,
): ArenaMatch {
  const arena = getOrThrow(arenas, params.arenaId);
  const match = arena.matches.find(m => m.matchId === params.matchId);
  if (match === undefined) throw new Error(`Unknown match: ${params.matchId}`);
  if (match.concludedAt !== null) throw new Error('Match already concluded');

  if (params.winnerId !== match.participantA && params.winnerId !== match.participantB) {
    throw new Error('Winner must be a participant of the match');
  }

  match.winnerId = params.winnerId;
  match.scoreA = params.scoreA;
  match.scoreB = params.scoreB;
  match.concludedAt = deps.clock.nowMicroseconds();

  const loserId = params.winnerId === match.participantA
    ? match.participantB
    : match.participantA;

  const winner = arena.participants.get(params.winnerId);
  const loser = arena.participants.get(loserId);
  if (winner !== undefined) winner.score += 1;
  if (loser !== undefined && arena.arenaType === 'TOURNAMENT') loser.status = 'ELIMINATED';

  return freezeMatch(match);
}

// ─── Conclude ────────────────────────────────────────────────────

function concludeImpl(
  deps: ArenaSystemDeps,
  arenas: Map<string, MutableArena>,
  arenaId: string,
): MutableArena {
  const arena = getOrThrow(arenas, arenaId);
  assertArenaPhase(arena, ['IN_PROGRESS']);

  const active = getActiveParticipants(arena);
  if (active.length === 1) {
    active[0].status = 'WINNER';
    arena.winnerId = active[0].dynastyId;
  } else if (active.length > 0) {
    // Exhibition or incomplete tournament — highest score wins
    const sorted = [...active].sort((a, b) => b.score - a.score);
    sorted[0].status = 'WINNER';
    arena.winnerId = sorted[0].dynastyId;
  }

  arena.phase = 'CONCLUDED';
  return arena;
}

function archiveImpl(
  arenas: Map<string, MutableArena>,
  arenaId: string,
): MutableArena {
  const arena = getOrThrow(arenas, arenaId);
  assertArenaPhase(arena, ['CONCLUDED']);
  arena.phase = 'ARCHIVED';
  return arena;
}

// ─── Queries ─────────────────────────────────────────────────────

function getActiveImpl(
  arenas: Map<string, MutableArena>,
  worldId: string,
): ReadonlyArray<ArenaEvent> {
  const result: ArenaEvent[] = [];
  for (const a of arenas.values()) {
    if (a.worldId === worldId && a.phase !== 'ARCHIVED' && a.phase !== 'CONCLUDED') {
      result.push(freezeArena(a));
    }
  }
  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────

function getOrThrow(arenas: Map<string, MutableArena>, id: string): MutableArena {
  const arena = arenas.get(id);
  if (arena === undefined) throw new Error(`Unknown arena: ${id}`);
  return arena;
}

function assertArenaPhase(arena: MutableArena, allowed: ReadonlyArray<ArenaPhase>): void {
  if (!allowed.includes(arena.phase)) {
    throw new Error(`Arena ${arena.arenaId} in phase ${arena.phase}; expected: ${allowed.join(', ')}`);
  }
}

function getActiveParticipants(arena: MutableArena): MutableParticipant[] {
  return [...arena.participants.values()].filter(
    p => p.status === 'ACTIVE' || p.status === 'REGISTERED',
  );
}

function freezeMatch(m: MutableMatch): ArenaMatch {
  return {
    matchId: m.matchId,
    arenaId: m.arenaId,
    round: m.round,
    participantA: m.participantA,
    participantB: m.participantB,
    winnerId: m.winnerId,
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    startedAt: m.startedAt,
    concludedAt: m.concludedAt,
  };
}

function freezeArena(a: MutableArena): ArenaEvent {
  return {
    arenaId: a.arenaId,
    worldId: a.worldId,
    name: a.name,
    arenaType: a.arenaType,
    phase: a.phase,
    createdAt: a.createdAt,
    opensAt: a.opensAt,
    startsAt: a.startsAt,
    maxParticipants: a.maxParticipants,
    participants: [...a.participants.values()].map(p => ({
      dynastyId: p.dynastyId,
      displayName: p.displayName,
      status: p.status,
      seed: p.seed,
      score: p.score,
      joinedAt: p.joinedAt,
    })),
    spectators: [...a.spectators.values()].map(s => ({
      dynastyId: s.dynastyId,
      status: s.status,
      joinedAt: s.joinedAt,
    })),
    matches: a.matches.map(freezeMatch),
    currentRound: a.currentRound,
    winnerId: a.winnerId,
    prizePool: a.prizePool,
  };
}

function computeStats(arenas: Map<string, MutableArena>): ArenaSystemStats {
  let activeArenas = 0;
  let totalMatches = 0;
  let totalSpectators = 0;

  for (const a of arenas.values()) {
    if (a.phase === 'OPEN' || a.phase === 'IN_PROGRESS') activeArenas += 1;
    totalMatches += a.matches.length;
    totalSpectators += [...a.spectators.values()].filter(s => s.status === 'WATCHING').length;
  }

  return { totalArenas: arenas.size, activeArenas, totalMatches, totalSpectators };
}
