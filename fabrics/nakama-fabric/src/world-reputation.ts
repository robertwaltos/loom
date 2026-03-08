/**
 * world-reputation.ts — Per-world dynasty reputation tracking.
 *
 * Tracks reputation scores for dynasties within specific worlds.
 * Reputation changes from actions, events, and faction relationships.
 * Supports queries by dynasty, world, and reputation tier classification.
 */

// ── Ports ────────────────────────────────────────────────────────

interface ReputationClock {
  readonly nowMicroseconds: () => number;
}

interface ReputationDeps {
  readonly clock: ReputationClock;
}

// ── Types ────────────────────────────────────────────────────────

type ReputationTier = 'reviled' | 'distrusted' | 'neutral' | 'respected' | 'honoured' | 'exalted';

interface ReputationRecord {
  readonly dynastyId: string;
  readonly worldId: string;
  readonly score: number;
  readonly tier: ReputationTier;
  readonly lastChangedAt: number;
}

interface ChangeReputationParams {
  readonly dynastyId: string;
  readonly worldId: string;
  readonly delta: number;
  readonly reason: string;
}

interface ReputationChange {
  readonly dynastyId: string;
  readonly worldId: string;
  readonly previousScore: number;
  readonly newScore: number;
  readonly previousTier: ReputationTier;
  readonly newTier: ReputationTier;
}

interface ReputationConfig {
  readonly minScore: number;
  readonly maxScore: number;
  readonly defaultScore: number;
}

interface ReputationStats {
  readonly trackedPairs: number;
  readonly averageScore: number;
}

interface WorldReputationService {
  readonly change: (params: ChangeReputationParams) => ReputationChange;
  readonly getReputation: (dynastyId: string, worldId: string) => ReputationRecord;
  readonly listByDynasty: (dynastyId: string) => readonly ReputationRecord[];
  readonly listByWorld: (worldId: string) => readonly ReputationRecord[];
  readonly getStats: () => ReputationStats;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_REPUTATION_CONFIG: ReputationConfig = {
  minScore: -1000,
  maxScore: 1000,
  defaultScore: 0,
};

// ── State ────────────────────────────────────────────────────────

interface MutableReputation {
  readonly dynastyId: string;
  readonly worldId: string;
  score: number;
  lastChangedAt: number;
}

interface ReputationState {
  readonly deps: ReputationDeps;
  readonly config: ReputationConfig;
  readonly records: Map<string, MutableReputation>;
}

// ── Helpers ──────────────────────────────────────────────────────

function pairKey(dynastyId: string, worldId: string): string {
  return dynastyId + '::' + worldId;
}

function classifyTier(score: number): ReputationTier {
  if (score <= -500) return 'reviled';
  if (score <= -200) return 'distrusted';
  if (score < 200) return 'neutral';
  if (score < 500) return 'respected';
  if (score < 800) return 'honoured';
  return 'exalted';
}

function toReadonly(rep: MutableReputation): ReputationRecord {
  return {
    dynastyId: rep.dynastyId,
    worldId: rep.worldId,
    score: rep.score,
    tier: classifyTier(rep.score),
    lastChangedAt: rep.lastChangedAt,
  };
}

function getOrCreate(state: ReputationState, dynastyId: string, worldId: string): MutableReputation {
  const key = pairKey(dynastyId, worldId);
  let rep = state.records.get(key);
  if (!rep) {
    rep = {
      dynastyId,
      worldId,
      score: state.config.defaultScore,
      lastChangedAt: state.deps.clock.nowMicroseconds(),
    };
    state.records.set(key, rep);
  }
  return rep;
}

// ── Operations ───────────────────────────────────────────────────

function changeImpl(state: ReputationState, params: ChangeReputationParams): ReputationChange {
  const rep = getOrCreate(state, params.dynastyId, params.worldId);
  const previousScore = rep.score;
  const previousTier = classifyTier(previousScore);
  const raw = rep.score + params.delta;
  rep.score = Math.max(state.config.minScore, Math.min(state.config.maxScore, raw));
  rep.lastChangedAt = state.deps.clock.nowMicroseconds();
  return {
    dynastyId: params.dynastyId,
    worldId: params.worldId,
    previousScore,
    newScore: rep.score,
    previousTier,
    newTier: classifyTier(rep.score),
  };
}

function listByDynastyImpl(state: ReputationState, dynastyId: string): ReputationRecord[] {
  const result: ReputationRecord[] = [];
  for (const rep of state.records.values()) {
    if (rep.dynastyId === dynastyId) result.push(toReadonly(rep));
  }
  return result;
}

function listByWorldImpl(state: ReputationState, worldId: string): ReputationRecord[] {
  const result: ReputationRecord[] = [];
  for (const rep of state.records.values()) {
    if (rep.worldId === worldId) result.push(toReadonly(rep));
  }
  return result;
}

function getStatsImpl(state: ReputationState): ReputationStats {
  if (state.records.size === 0) return { trackedPairs: 0, averageScore: 0 };
  let total = 0;
  for (const rep of state.records.values()) {
    total += rep.score;
  }
  return {
    trackedPairs: state.records.size,
    averageScore: total / state.records.size,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createWorldReputationService(
  deps: ReputationDeps,
  config?: Partial<ReputationConfig>,
): WorldReputationService {
  const state: ReputationState = {
    deps,
    config: { ...DEFAULT_REPUTATION_CONFIG, ...config },
    records: new Map(),
  };
  return {
    change: (p) => changeImpl(state, p),
    getReputation: (did, wid) => toReadonly(getOrCreate(state, did, wid)),
    listByDynasty: (did) => listByDynastyImpl(state, did),
    listByWorld: (wid) => listByWorldImpl(state, wid),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createWorldReputationService, DEFAULT_REPUTATION_CONFIG };
export type {
  WorldReputationService,
  ReputationDeps as WorldReputationDeps,
  ReputationConfig as WorldReputationConfig,
  ReputationTier,
  ReputationRecord,
  ChangeReputationParams,
  ReputationChange,
  ReputationStats as WorldReputationStats,
};
