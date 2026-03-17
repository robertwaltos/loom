/**
 * matchmaking.ts — ELO-based player matchmaking engine for Koydo bracket play.
 *
 * Players enqueue into one of four bracket types. The `tick()` method is called
 * periodically to form matches from players within ±200 ELO of each other
 * (max spread of 400 points across a group).
 *
 * Brackets:
 *   solo_1v1  — 2 players per match
 *   duo_2v2   — 4 players per match
 *   squad_4v4 — 8 players per match
 *   open_world — 1 player; assigned immediately to least-populated world
 */

// ─── Bracket Types ────────────────────────────────────────────────────────────

export type BracketType = 'solo_1v1' | 'duo_2v2' | 'squad_4v4' | 'open_world';

/** Players required to form one match per ELO bracket. */
export const BRACKET_SIZES: Readonly<Record<Exclude<BracketType, 'open_world'>, number>> = {
  solo_1v1: 2,
  duo_2v2: 4,
  squad_4v4: 8,
};

/**
 * Maximum ELO spread within a match group.
 * "within ±200 ELO" → the lowest and highest rated players may differ by at most 400.
 */
export const ELO_SPREAD_LIMIT = 400;

// ─── Port Interfaces ──────────────────────────────────────────────────────────

export interface MatchClock {
  readonly nowMs: () => number;
}

export interface MatchIdGenerator {
  readonly generate: () => string;
}

export interface MatchLogger {
  readonly info: (message: string) => void;
}

export interface WorldRosterPort {
  readonly getActivePlayerCount: (worldId: string) => number;
}

export interface MatchmakingDeps {
  readonly clock: MatchClock;
  readonly idGenerator: MatchIdGenerator;
  readonly logger: MatchLogger;
  readonly worldRoster: WorldRosterPort;
  readonly worldIds: ReadonlyArray<string>;
}

// ─── Queue Entry ──────────────────────────────────────────────────────────────

export interface QueueEntry {
  readonly playerId: string;
  readonly bracketType: BracketType;
  /** ELO-style integer 0–3000; default 1500. */
  readonly skillRating: number;
  readonly queuedAt: number;
  readonly preferredWorldIds: ReadonlyArray<string>;
}

// ─── Match Result ─────────────────────────────────────────────────────────────

export interface MatchResult {
  readonly matchId: string;
  readonly bracketType: BracketType;
  readonly playerIds: ReadonlyArray<string>;
  readonly assignedWorldId: string;
  readonly estimatedStartMs: number;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface BracketStats {
  readonly depth: number;
  readonly averageWaitMs: number;
}

export type MatchmakingStats = Readonly<Record<BracketType, BracketStats>>;

// ─── Engine Interface ─────────────────────────────────────────────────────────

export interface MatchmakingEngine {
  enqueue(entry: QueueEntry): void;
  dequeue(playerId: string): void;
  tick(): MatchResult[];
  getQueueDepth(bracket: BracketType): number;
  getStats(): MatchmakingStats;
}

// ─── Internal State ───────────────────────────────────────────────────────────

type BracketQueue = Map<string, QueueEntry>;

interface EngineState {
  readonly queues: Record<BracketType, BracketQueue>;
  readonly deps: MatchmakingDeps;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createMatchmakingEngine(deps: MatchmakingDeps): MatchmakingEngine {
  const state: EngineState = {
    queues: {
      solo_1v1: new Map(),
      duo_2v2: new Map(),
      squad_4v4: new Map(),
      open_world: new Map(),
    },
    deps,
  };

  return {
    enqueue: (entry) => enqueueImpl(state, entry),
    dequeue: (playerId) => dequeueImpl(state, playerId),
    tick: () => tickImpl(state),
    getQueueDepth: (bracket) => state.queues[bracket].size,
    getStats: () => computeStats(state),
  };
}

// ─── Enqueue ──────────────────────────────────────────────────────────────────

function enqueueImpl(state: EngineState, entry: QueueEntry): void {
  state.queues[entry.bracketType].set(entry.playerId, entry);
  state.deps.logger.info(
    'enqueue player=' + entry.playerId + ' bracket=' + entry.bracketType + ' elo=' + String(entry.skillRating),
  );
}

// ─── Dequeue ──────────────────────────────────────────────────────────────────

function dequeueImpl(state: EngineState, playerId: string): void {
  for (const bracket of ['solo_1v1', 'duo_2v2', 'squad_4v4', 'open_world'] as const) {
    state.queues[bracket].delete(playerId);
  }
}

// ─── Tick ─────────────────────────────────────────────────────────────────────

function tickImpl(state: EngineState): MatchResult[] {
  const results: MatchResult[] = [];
  processOpenWorld(state, results);
  for (const bracket of ['solo_1v1', 'duo_2v2', 'squad_4v4'] as const) {
    processEloBracket(state, bracket, results);
  }
  return results;
}

// ─── Open World ───────────────────────────────────────────────────────────────

function processOpenWorld(state: EngineState, results: MatchResult[]): void {
  const queue = state.queues.open_world;
  const now = state.deps.clock.nowMs();
  for (const entry of queue.values()) {
    const worldId = leastPopulatedWorldId(state);
    const match: MatchResult = {
      matchId: state.deps.idGenerator.generate(),
      bracketType: 'open_world',
      playerIds: [entry.playerId],
      assignedWorldId: worldId,
      estimatedStartMs: now,
    };
    results.push(match);
    state.deps.logger.info('open_world match=' + match.matchId + ' player=' + entry.playerId + ' world=' + worldId);
  }
  queue.clear();
}

// ─── ELO Bracket ─────────────────────────────────────────────────────────────

function processEloBracket(
  state: EngineState,
  bracket: Exclude<BracketType, 'open_world'>,
  results: MatchResult[],
): void {
  const queue = state.queues[bracket];
  const size = BRACKET_SIZES[bracket];
  const sorted = [...queue.values()].sort((a, b) => a.skillRating - b.skillRating);
  const matched = new Set<string>();
  const now = state.deps.clock.nowMs();

  for (let i = 0; i < sorted.length; i++) {
    const anchor = sorted[i];
    if (anchor === undefined || matched.has(anchor.playerId)) continue;

    const group: QueueEntry[] = [anchor];
    for (let j = i + 1; j < sorted.length && group.length < size; j++) {
      const candidate = sorted[j];
      if (candidate === undefined || matched.has(candidate.playerId)) continue;
      if (candidate.skillRating - anchor.skillRating > ELO_SPREAD_LIMIT) break;
      group.push(candidate);
    }

    if (group.length < size) continue;

    const worldId = selectWorldForGroup(state, group);
    const match: MatchResult = {
      matchId: state.deps.idGenerator.generate(),
      bracketType: bracket,
      playerIds: group.map((e) => e.playerId),
      assignedWorldId: worldId,
      estimatedStartMs: now,
    };
    results.push(match);

    for (const entry of group) {
      matched.add(entry.playerId);
      queue.delete(entry.playerId);
    }
    state.deps.logger.info('match=' + match.matchId + ' bracket=' + bracket);
  }
}

// ─── World Selection ──────────────────────────────────────────────────────────

function leastPopulatedWorldId(state: EngineState): string {
  const { worldIds, worldRoster } = state.deps;
  if (worldIds.length === 0) return 'default';

  let bestId = worldIds[0] ?? 'default';
  let bestCount = worldRoster.getActivePlayerCount(bestId);

  for (let i = 1; i < worldIds.length; i++) {
    const wid = worldIds[i];
    if (wid === undefined) continue;
    const count = worldRoster.getActivePlayerCount(wid);
    if (count < bestCount) {
      bestCount = count;
      bestId = wid;
    }
  }
  return bestId;
}

function selectWorldForGroup(state: EngineState, group: ReadonlyArray<QueueEntry>): string {
  const { worldIds, worldRoster } = state.deps;
  const preferredSet = new Set<string>();
  for (const entry of group) {
    for (const wid of entry.preferredWorldIds) {
      preferredSet.add(wid);
    }
  }

  const candidates = worldIds.filter((wid) => preferredSet.has(wid));
  if (candidates.length > 0) {
    let bestId = candidates[0] ?? 'default';
    let bestCount = worldRoster.getActivePlayerCount(bestId);
    for (const wid of candidates) {
      const count = worldRoster.getActivePlayerCount(wid);
      if (count < bestCount) {
        bestCount = count;
        bestId = wid;
      }
    }
    return bestId;
  }

  return leastPopulatedWorldId(state);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function bracketStats(state: EngineState, bracket: BracketType): BracketStats {
  const queue = state.queues[bracket];
  const depth = queue.size;
  if (depth === 0) return { depth: 0, averageWaitMs: 0 };

  const now = state.deps.clock.nowMs();
  let totalWaitMs = 0;
  for (const entry of queue.values()) {
    totalWaitMs += now - entry.queuedAt;
  }
  return { depth, averageWaitMs: totalWaitMs / depth };
}

function computeStats(state: EngineState): MatchmakingStats {
  return {
    solo_1v1: bracketStats(state, 'solo_1v1'),
    duo_2v2: bracketStats(state, 'duo_2v2'),
    squad_4v4: bracketStats(state, 'squad_4v4'),
    open_world: bracketStats(state, 'open_world'),
  };
}