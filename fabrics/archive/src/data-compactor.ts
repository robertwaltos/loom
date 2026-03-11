/**
 * data-compactor.ts — Data compaction service.
 *
 * Registers data sources with entry counts, runs compaction
 * passes that merge or prune entries below a threshold, and
 * tracks compaction history.
 */

// ── Ports ────────────────────────────────────────────────────────

interface CompactorClock {
  readonly nowMicroseconds: () => number;
}

interface CompactorIdGenerator {
  readonly next: () => string;
}

interface DataCompactorDeps {
  readonly clock: CompactorClock;
  readonly idGenerator: CompactorIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

interface CompactorSource {
  readonly sourceId: string;
  readonly name: string;
  entryCount: number;
}

interface RegisterSourceParams {
  readonly name: string;
  readonly entryCount: number;
}

interface CompactionRun {
  readonly runId: string;
  readonly sourceId: string;
  readonly beforeCount: number;
  readonly afterCount: number;
  readonly removedCount: number;
  readonly ranAt: number;
}

interface CompactionConfig {
  readonly minEntries: number;
  readonly targetRatio: number;
}

interface DataCompactorStats {
  readonly totalSources: number;
  readonly totalRuns: number;
  readonly totalRemoved: number;
}

interface DataCompactorService {
  readonly registerSource: (params: RegisterSourceParams) => string;
  readonly compact: (sourceId: string, config: CompactionConfig) => CompactionRun | undefined;
  readonly updateCount: (sourceId: string, count: number) => boolean;
  readonly getHistory: (sourceId: string) => readonly CompactionRun[];
  readonly getStats: () => DataCompactorStats;
}

// ── State ────────────────────────────────────────────────────────

interface CompactorState {
  readonly deps: DataCompactorDeps;
  readonly sources: Map<string, CompactorSource>;
  readonly runs: CompactionRun[];
  totalRemoved: number;
}

// ── Operations ───────────────────────────────────────────────────

function compactImpl(
  state: CompactorState,
  sourceId: string,
  config: CompactionConfig,
): CompactionRun | undefined {
  const src = state.sources.get(sourceId);
  if (!src) return undefined;
  if (src.entryCount < config.minEntries) return undefined;
  const targetCount = Math.ceil(src.entryCount * config.targetRatio);
  const removed = src.entryCount - targetCount;
  const run: CompactionRun = {
    runId: state.deps.idGenerator.next(),
    sourceId,
    beforeCount: src.entryCount,
    afterCount: targetCount,
    removedCount: removed,
    ranAt: state.deps.clock.nowMicroseconds(),
  };
  src.entryCount = targetCount;
  state.runs.push(run);
  state.totalRemoved += removed;
  return run;
}

function getHistoryImpl(state: CompactorState, sourceId: string): readonly CompactionRun[] {
  return state.runs.filter((r) => r.sourceId === sourceId);
}

// ── Factory ──────────────────────────────────────────────────────

function createDataCompactor(deps: DataCompactorDeps): DataCompactorService {
  const state: CompactorState = { deps, sources: new Map(), runs: [], totalRemoved: 0 };
  return {
    registerSource: (p) => {
      const id = deps.idGenerator.next();
      state.sources.set(id, { sourceId: id, name: p.name, entryCount: p.entryCount });
      return id;
    },
    compact: (id, cfg) => compactImpl(state, id, cfg),
    updateCount: (id, count) => {
      const s = state.sources.get(id);
      if (!s) return false;
      s.entryCount = count;
      return true;
    },
    getHistory: (id) => getHistoryImpl(state, id),
    getStats: () => ({
      totalSources: state.sources.size,
      totalRuns: state.runs.length,
      totalRemoved: state.totalRemoved,
    }),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createDataCompactor };
export type {
  DataCompactorService,
  DataCompactorDeps,
  CompactorSource,
  RegisterSourceParams as CompactorRegisterParams,
  CompactionRun,
  CompactionConfig,
  DataCompactorStats,
};
