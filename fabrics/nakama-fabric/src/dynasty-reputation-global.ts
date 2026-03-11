/**
 * Dynasty Reputation Global — Cross-world reputation aggregation.
 *
 * Aggregates per-world reputation scores into a unified global score for
 * each dynasty. Individual world scores are weighted by world tier and
 * activity recency. Global score informs diplomatic standing, trade
 * access, and Assembly voting weight modifiers.
 *
 * Scoring model:
 *   - Each world score in [-1000, 1000] (normalized from world-reputation)
 *   - World weight = worldTierWeight × recencyDecay(lastUpdatedAt)
 *   - Global score = Σ(worldScore × weight) / Σ(weight), clamped [-1000, 1000]
 *   - Recency decay: weight halves every 90 days of inactivity
 *
 * Global tiers:
 *   exalted      [750, 1000]
 *   honoured     [400,  750)
 *   respected    [100,  400)
 *   neutral      [-100, 100)
 *   distrusted   [-400, -100)
 *   reviled      [-1000, -400)
 *
 * "A dynasty's name travels faster than any ship in the Silfen Weave."
 */

// ─── Port Interfaces ─────────────────────────────────────────────────

export interface GlobalRepClockPort {
  readonly nowMicroseconds: () => number;
}

export interface GlobalRepIdGeneratorPort {
  readonly next: () => string;
}

export interface GlobalRepDeps {
  readonly clock: GlobalRepClockPort;
  readonly idGenerator: GlobalRepIdGeneratorPort;
}

// ─── Constants ────────────────────────────────────────────────────────

export const SCORE_MIN = -1000;
export const SCORE_MAX = 1000;
export const RECENCY_HALF_LIFE_US = 90 * 24 * 60 * 60 * 1_000_000; // 90 days in microseconds

// World tier weights (1=fringe, 5=core)
export const WORLD_TIER_WEIGHTS: Readonly<Record<number, number>> = {
  1: 0.5,
  2: 0.75,
  3: 1.0,
  4: 1.5,
  5: 2.0,
};

// ─── Types ───────────────────────────────────────────────────────────

export type GlobalReputationTier =
  | 'exalted'
  | 'honoured'
  | 'respected'
  | 'neutral'
  | 'distrusted'
  | 'reviled';

export interface WorldReputationEntry {
  readonly entryId: string;
  readonly dynastyId: string;
  readonly worldId: string;
  readonly score: number;
  readonly worldTier: number;
  readonly recordedAt: number;
  readonly updatedAt: number;
}

export interface GlobalReputationScore {
  readonly dynastyId: string;
  readonly globalScore: number;
  readonly globalTier: GlobalReputationTier;
  readonly worldCount: number;
  readonly computedAt: number;
}

export interface ReputationAggregate {
  readonly dynastyId: string;
  readonly worldEntries: ReadonlyArray<WorldReputationEntry>;
  readonly globalScore: GlobalReputationScore;
  readonly history: ReadonlyArray<GlobalReputationScore>;
}

export interface TopDynastyEntry {
  readonly rank: number;
  readonly dynastyId: string;
  readonly globalScore: number;
  readonly globalTier: GlobalReputationTier;
}

export interface ReputationStats {
  readonly totalDynasties: number;
  readonly totalWorldEntries: number;
  readonly averageGlobalScore: number;
  readonly tierDistribution: Readonly<Record<GlobalReputationTier, number>>;
}

// ─── Module Interface ─────────────────────────────────────────────────

export interface DynastyReputationGlobalEngine {
  readonly recordWorldReputation: (params: RecordWorldRepParams) => WorldReputationEntry | string;
  readonly computeGlobalScore: (dynastyId: string) => GlobalReputationScore | string;
  readonly getTopDynasties: (limit: number) => ReadonlyArray<TopDynastyEntry>;
  readonly getReputationHistory: (dynastyId: string) => ReadonlyArray<GlobalReputationScore>;
  readonly getAggregate: (dynastyId: string) => ReputationAggregate | string;
  readonly getWorldEntry: (dynastyId: string, worldId: string) => WorldReputationEntry | undefined;
  readonly getStats: () => ReputationStats;
}

export interface RecordWorldRepParams {
  readonly dynastyId: string;
  readonly worldId: string;
  readonly score: number;
  readonly worldTier: number;
}

// ─── State ────────────────────────────────────────────────────────────

interface GlobalRepState {
  readonly worldEntries: Map<string, WorldReputationEntry>;
  readonly dynastyWorlds: Map<string, Set<string>>;
  readonly globalScores: Map<string, GlobalReputationScore>;
  readonly history: Map<string, GlobalReputationScore[]>;
}

function entryKey(dynastyId: string, worldId: string): string {
  return dynastyId + '::' + worldId;
}

// ─── Factory ─────────────────────────────────────────────────────────

export function createDynastyReputationGlobalEngine(
  deps: GlobalRepDeps,
): DynastyReputationGlobalEngine {
  const state: GlobalRepState = {
    worldEntries: new Map(),
    dynastyWorlds: new Map(),
    globalScores: new Map(),
    history: new Map(),
  };

  return {
    recordWorldReputation: (params) => recordWorldReputation(state, deps, params),
    computeGlobalScore: (dynastyId) => computeGlobalScore(state, deps, dynastyId),
    getTopDynasties: (limit) => getTopDynasties(state, deps, limit),
    getReputationHistory: (dynastyId) => state.history.get(dynastyId) ?? [],
    getAggregate: (dynastyId) => getAggregate(state, deps, dynastyId),
    getWorldEntry: (dynastyId, worldId) => state.worldEntries.get(entryKey(dynastyId, worldId)),
    getStats: () => getStats(state),
  };
}

// ─── recordWorldReputation ────────────────────────────────────────────

function recordWorldReputation(
  state: GlobalRepState,
  deps: GlobalRepDeps,
  params: RecordWorldRepParams,
): WorldReputationEntry | string {
  if (params.score < SCORE_MIN || params.score > SCORE_MAX) {
    return 'score must be in range [' + String(SCORE_MIN) + ', ' + String(SCORE_MAX) + ']';
  }
  if (params.worldTier < 1 || params.worldTier > 5) {
    return 'worldTier must be between 1 and 5';
  }

  const key = entryKey(params.dynastyId, params.worldId);
  const now = deps.clock.nowMicroseconds();
  const existing = state.worldEntries.get(key);

  const entry: WorldReputationEntry = {
    entryId: existing?.entryId ?? deps.idGenerator.next(),
    dynastyId: params.dynastyId,
    worldId: params.worldId,
    score: params.score,
    worldTier: params.worldTier,
    recordedAt: existing?.recordedAt ?? now,
    updatedAt: now,
  };

  state.worldEntries.set(key, entry);
  registerDynastyWorld(state, params.dynastyId, params.worldId);

  return entry;
}

function registerDynastyWorld(state: GlobalRepState, dynastyId: string, worldId: string): void {
  const worlds = state.dynastyWorlds.get(dynastyId) ?? new Set<string>();
  worlds.add(worldId);
  state.dynastyWorlds.set(dynastyId, worlds);
}

// ─── computeGlobalScore ───────────────────────────────────────────────

function computeGlobalScore(
  state: GlobalRepState,
  deps: GlobalRepDeps,
  dynastyId: string,
): GlobalReputationScore | string {
  const worldIds = state.dynastyWorlds.get(dynastyId);
  if (worldIds === undefined || worldIds.size === 0) {
    return 'no world reputation data found for dynasty ' + dynastyId;
  }

  const now = deps.clock.nowMicroseconds();
  const { weightedSum, totalWeight } = aggregateWeightedScores(state, dynastyId, worldIds, now);

  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const globalScore = Math.max(SCORE_MIN, Math.min(SCORE_MAX, Math.round(rawScore)));

  const score: GlobalReputationScore = {
    dynastyId,
    globalScore,
    globalTier: scoreToTier(globalScore),
    worldCount: worldIds.size,
    computedAt: now,
  };

  state.globalScores.set(dynastyId, score);
  pushHistory(state, dynastyId, score);

  return score;
}

function aggregateWeightedScores(
  state: GlobalRepState,
  dynastyId: string,
  worldIds: Set<string>,
  nowUs: number,
): { weightedSum: number; totalWeight: number } {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const worldId of worldIds) {
    const entry = state.worldEntries.get(entryKey(dynastyId, worldId));
    if (entry === undefined) {
      continue;
    }
    const tierWeight = WORLD_TIER_WEIGHTS[entry.worldTier] ?? 1.0;
    const ageUs = nowUs - entry.updatedAt;
    const recencyDecay = Math.pow(0.5, ageUs / RECENCY_HALF_LIFE_US);
    const weight = tierWeight * recencyDecay;
    weightedSum += entry.score * weight;
    totalWeight += weight;
  }

  return { weightedSum, totalWeight };
}

function pushHistory(state: GlobalRepState, dynastyId: string, score: GlobalReputationScore): void {
  const hist = state.history.get(dynastyId) ?? [];
  hist.push(score);
  state.history.set(dynastyId, hist);
}

// ─── scoreToTier ──────────────────────────────────────────────────────

function scoreToTier(score: number): GlobalReputationTier {
  if (score >= 750) return 'exalted';
  if (score >= 400) return 'honoured';
  if (score >= 100) return 'respected';
  if (score >= -100) return 'neutral';
  if (score >= -400) return 'distrusted';
  return 'reviled';
}

// ─── getTopDynasties ──────────────────────────────────────────────────

function getTopDynasties(
  state: GlobalRepState,
  deps: GlobalRepDeps,
  limit: number,
): ReadonlyArray<TopDynastyEntry> {
  const dynastyIds = Array.from(state.dynastyWorlds.keys());
  const scored: Array<{ dynastyId: string; globalScore: number; tier: GlobalReputationTier }> = [];

  for (const dynastyId of dynastyIds) {
    const result = computeGlobalScore(state, deps, dynastyId);
    if (typeof result === 'string') {
      continue;
    }
    scored.push({ dynastyId, globalScore: result.globalScore, tier: result.globalTier });
  }

  scored.sort((a, b) => b.globalScore - a.globalScore);
  const capped = scored.slice(0, limit);

  return capped.map((entry, index) => ({
    rank: index + 1,
    dynastyId: entry.dynastyId,
    globalScore: entry.globalScore,
    globalTier: entry.tier,
  }));
}

// ─── getAggregate ─────────────────────────────────────────────────────

function getAggregate(
  state: GlobalRepState,
  deps: GlobalRepDeps,
  dynastyId: string,
): ReputationAggregate | string {
  const worldIds = state.dynastyWorlds.get(dynastyId);
  if (worldIds === undefined || worldIds.size === 0) {
    return 'no reputation data found for dynasty ' + dynastyId;
  }

  const worldEntries: WorldReputationEntry[] = [];
  for (const worldId of worldIds) {
    const entry = state.worldEntries.get(entryKey(dynastyId, worldId));
    if (entry !== undefined) {
      worldEntries.push(entry);
    }
  }

  const scoreResult = computeGlobalScore(state, deps, dynastyId);
  if (typeof scoreResult === 'string') {
    return scoreResult;
  }

  return {
    dynastyId,
    worldEntries,
    globalScore: scoreResult,
    history: state.history.get(dynastyId) ?? [],
  };
}

// ─── getStats ─────────────────────────────────────────────────────────

function getStats(state: GlobalRepState): ReputationStats {
  const scores = Array.from(state.globalScores.values());
  const avgScore =
    scores.length > 0 ? scores.reduce((sum, s) => sum + s.globalScore, 0) / scores.length : 0;

  const tierDistribution: Record<GlobalReputationTier, number> = {
    exalted: 0,
    honoured: 0,
    respected: 0,
    neutral: 0,
    distrusted: 0,
    reviled: 0,
  };
  for (const score of scores) {
    tierDistribution[score.globalTier] += 1;
  }

  return {
    totalDynasties: state.dynastyWorlds.size,
    totalWorldEntries: state.worldEntries.size,
    averageGlobalScore: Math.round(avgScore),
    tierDistribution,
  };
}
