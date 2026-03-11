/**
 * threat-scorer.ts — Connection-level threat assessment.
 *
 * Accumulates threat signals (failed auth, rate violations, suspicious
 * patterns) per connection and produces a composite threat score.
 * Scores decay over time to forgive transient issues.
 */

// ── Ports ────────────────────────────────────────────────────────

interface ThreatClock {
  readonly nowMicroseconds: () => number;
}

interface ThreatIdGenerator {
  readonly next: () => string;
}

interface ThreatScorerDeps {
  readonly clock: ThreatClock;
  readonly idGenerator: ThreatIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type ThreatCategory =
  | 'auth_failure'
  | 'rate_violation'
  | 'invalid_input'
  | 'protocol_abuse'
  | 'brute_force';

interface ThreatSignal {
  readonly signalId: string;
  readonly connectionId: string;
  readonly category: ThreatCategory;
  readonly weight: number;
  readonly recordedAt: number;
}

interface RecordSignalParams {
  readonly connectionId: string;
  readonly category: ThreatCategory;
  readonly weight: number;
}

interface ThreatAssessment {
  readonly connectionId: string;
  readonly score: number;
  readonly level: ThreatLevel;
  readonly signalCount: number;
  readonly dominantCategory: ThreatCategory | undefined;
}

type ThreatLevel = 'safe' | 'elevated' | 'high' | 'critical';

interface ThreatScorerConfig {
  readonly decayRateMicroPerPoint: number;
  readonly elevatedThreshold: number;
  readonly highThreshold: number;
  readonly criticalThreshold: number;
}

interface ThreatScorerStats {
  readonly trackedConnections: number;
  readonly totalSignals: number;
  readonly criticalConnections: number;
}

interface ThreatScorer {
  readonly recordSignal: (params: RecordSignalParams) => ThreatSignal;
  readonly assess: (connectionId: string) => ThreatAssessment;
  readonly getSignals: (connectionId: string) => readonly ThreatSignal[];
  readonly clearConnection: (connectionId: string) => boolean;
  readonly getStats: () => ThreatScorerStats;
}

// ── Constants ────────────────────────────────────────────────────

const ONE_MINUTE_MICRO = 60_000_000;

const DEFAULT_THREAT_CONFIG: ThreatScorerConfig = {
  decayRateMicroPerPoint: ONE_MINUTE_MICRO * 5,
  elevatedThreshold: 10,
  highThreshold: 25,
  criticalThreshold: 50,
};

// ── State ────────────────────────────────────────────────────────

interface ThreatState {
  readonly deps: ThreatScorerDeps;
  readonly config: ThreatScorerConfig;
  readonly signals: Map<string, ThreatSignal[]>;
}

// ── Helpers ──────────────────────────────────────────────────────

function classifyLevel(score: number, config: ThreatScorerConfig): ThreatLevel {
  if (score >= config.criticalThreshold) return 'critical';
  if (score >= config.highThreshold) return 'high';
  if (score >= config.elevatedThreshold) return 'elevated';
  return 'safe';
}

function computeDecayedScore(
  signals: readonly ThreatSignal[],
  now: number,
  config: ThreatScorerConfig,
): number {
  let total = 0;
  for (const signal of signals) {
    const elapsed = now - signal.recordedAt;
    const decay = elapsed / config.decayRateMicroPerPoint;
    const remaining = signal.weight - decay;
    if (remaining > 0) total += remaining;
  }
  return total;
}

function findDominantCategory(signals: readonly ThreatSignal[]): ThreatCategory | undefined {
  if (signals.length === 0) return undefined;
  const counts = new Map<ThreatCategory, number>();
  for (const s of signals) {
    counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  }
  let best: ThreatCategory | undefined;
  let bestCount = 0;
  for (const [cat, count] of counts) {
    if (count > bestCount) {
      best = cat;
      bestCount = count;
    }
  }
  return best;
}

// ── Operations ───────────────────────────────────────────────────

function recordSignalImpl(state: ThreatState, params: RecordSignalParams): ThreatSignal {
  const signal: ThreatSignal = {
    signalId: state.deps.idGenerator.next(),
    connectionId: params.connectionId,
    category: params.category,
    weight: params.weight,
    recordedAt: state.deps.clock.nowMicroseconds(),
  };
  let list = state.signals.get(params.connectionId);
  if (!list) {
    list = [];
    state.signals.set(params.connectionId, list);
  }
  list.push(signal);
  return signal;
}

function assessImpl(state: ThreatState, connectionId: string): ThreatAssessment {
  const signals = state.signals.get(connectionId) ?? [];
  const now = state.deps.clock.nowMicroseconds();
  const score = computeDecayedScore(signals, now, state.config);
  return {
    connectionId,
    score,
    level: classifyLevel(score, state.config),
    signalCount: signals.length,
    dominantCategory: findDominantCategory(signals),
  };
}

function getStatsImpl(state: ThreatState): ThreatScorerStats {
  let totalSignals = 0;
  let criticalCount = 0;
  const now = state.deps.clock.nowMicroseconds();
  for (const [, signals] of state.signals) {
    totalSignals += signals.length;
    const score = computeDecayedScore(signals, now, state.config);
    if (score >= state.config.criticalThreshold) criticalCount++;
  }
  return {
    trackedConnections: state.signals.size,
    totalSignals,
    criticalConnections: criticalCount,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createThreatScorer(
  deps: ThreatScorerDeps,
  config?: Partial<ThreatScorerConfig>,
): ThreatScorer {
  const state: ThreatState = {
    deps,
    config: { ...DEFAULT_THREAT_CONFIG, ...config },
    signals: new Map(),
  };
  return {
    recordSignal: (p) => recordSignalImpl(state, p),
    assess: (id) => assessImpl(state, id),
    getSignals: (id) => state.signals.get(id) ?? [],
    clearConnection: (id) => state.signals.delete(id),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createThreatScorer, DEFAULT_THREAT_CONFIG };
export type {
  ThreatScorer,
  ThreatScorerDeps,
  ThreatScorerConfig,
  ThreatCategory,
  ThreatSignal,
  RecordSignalParams,
  ThreatAssessment,
  ThreatLevel,
  ThreatScorerStats,
};
