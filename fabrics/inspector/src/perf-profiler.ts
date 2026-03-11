/**
 * Performance Profiler — Nested timing spans with budget tracking.
 *
 * Features:
 *   - Named timing spans (start/stop)
 *   - Nested spans (parent-child relationships)
 *   - Span aggregation (average, p95, p99 per named span)
 *   - Budget tracking (warn if span exceeds time budget)
 *   - Frame budget monitor (track total tick time)
 *   - Hot path identification (which spans take most time)
 *
 * "The Loom must be invisible to the frame budget: < 0.5ms per tick."
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface PerfSpanEntry {
  readonly spanId: string;
  readonly name: string;
  readonly parentSpanId: string | null;
  readonly durationUs: number;
  readonly startedAt: number;
  readonly endedAt: number;
  readonly budgetExceeded: boolean;
}

export interface PerfSpanAggregation {
  readonly name: string;
  readonly count: number;
  readonly totalUs: number;
  readonly avgUs: number;
  readonly minUs: number;
  readonly maxUs: number;
  readonly p95Us: number;
  readonly p99Us: number;
}

export interface PerfBudget {
  readonly name: string;
  readonly budgetUs: number;
}

export interface PerfBudgetViolation {
  readonly spanId: string;
  readonly name: string;
  readonly durationUs: number;
  readonly budgetUs: number;
  readonly exceededByUs: number;
}

export interface PerfHotPath {
  readonly name: string;
  readonly totalUs: number;
  readonly percentOfTotal: number;
  readonly count: number;
}

export interface PerfFrameReport {
  readonly totalFrameUs: number;
  readonly budgetUs: number;
  readonly withinBudget: boolean;
  readonly spanCount: number;
}

export interface PerfProfilerStats {
  readonly trackedSpanNames: number;
  readonly totalCompletedSpans: number;
  readonly activeSpans: number;
  readonly budgetViolationCount: number;
}

// ─── Ports ──────────────────────────────────────────────────────────

export interface PerfProfilerDeps {
  readonly clock: { nowMicroseconds(): number };
  readonly idGenerator: { next(): string };
}

// ─── Public Interface ───────────────────────────────────────────────

export interface PerfProfiler {
  readonly setBudget: (name: string, budgetUs: number) => void;
  readonly setFrameBudget: (budgetUs: number) => void;
  readonly beginSpan: (name: string, parentSpanId?: string) => string;
  readonly endSpan: (spanId: string) => PerfSpanEntry | undefined;
  readonly getAggregation: (name: string) => PerfSpanAggregation | undefined;
  readonly listAggregations: () => ReadonlyArray<PerfSpanAggregation>;
  readonly getViolations: (limit: number) => ReadonlyArray<PerfBudgetViolation>;
  readonly getHotPaths: (limit: number) => ReadonlyArray<PerfHotPath>;
  readonly getChildSpans: (parentSpanId: string) => ReadonlyArray<PerfSpanEntry>;
  readonly beginFrame: () => string;
  readonly endFrame: (frameSpanId: string) => PerfFrameReport | undefined;
  readonly getRecentSpans: (limit: number) => ReadonlyArray<PerfSpanEntry>;
  readonly reset: () => void;
  readonly getStats: () => PerfProfilerStats;
}

// ─── Internal State ─────────────────────────────────────────────────

interface ActiveSpan {
  readonly spanId: string;
  readonly name: string;
  readonly parentSpanId: string | null;
  readonly startedAt: number;
}

interface MutableAgg {
  readonly name: string;
  readonly durations: number[];
  totalUs: number;
  minUs: number;
  maxUs: number;
  count: number;
}

interface ProfilerState {
  readonly active: Map<string, ActiveSpan>;
  readonly completed: PerfSpanEntry[];
  readonly aggregations: Map<string, MutableAgg>;
  readonly budgets: Map<string, number>;
  readonly violations: PerfBudgetViolation[];
  readonly deps: PerfProfilerDeps;
  readonly maxEntries: number;
  frameBudgetUs: number;
  violationCount: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createPerfProfiler(deps: PerfProfilerDeps, maxEntries?: number): PerfProfiler {
  const state: ProfilerState = {
    active: new Map(),
    completed: [],
    aggregations: new Map(),
    budgets: new Map(),
    violations: [],
    deps,
    maxEntries: maxEntries ?? 1000,
    frameBudgetUs: 500,
    violationCount: 0,
  };

  return {
    setBudget: (n, b) => {
      state.budgets.set(n, b);
    },
    setFrameBudget: (b) => {
      state.frameBudgetUs = b;
    },
    beginSpan: (n, p) => beginSpanImpl(state, n, p),
    endSpan: (id) => endSpanImpl(state, id),
    getAggregation: (n) => getAggImpl(state, n),
    listAggregations: () => listAggsImpl(state),
    getViolations: (n) => recentViolations(state, n),
    getHotPaths: (n) => hotPathsImpl(state, n),
    getChildSpans: (pid) => childSpansImpl(state, pid),
    beginFrame: () => beginSpanImpl(state, '__frame__', undefined),
    endFrame: (fid) => endFrameImpl(state, fid),
    getRecentSpans: (n) => recentSpansImpl(state, n),
    reset: () => {
      resetImpl(state);
    },
    getStats: () => computeStats(state),
  };
}

// ─── Span Lifecycle ─────────────────────────────────────────────────

function beginSpanImpl(state: ProfilerState, name: string, parentSpanId?: string): string {
  const spanId = state.deps.idGenerator.next();
  state.active.set(spanId, {
    spanId,
    name,
    parentSpanId: parentSpanId ?? null,
    startedAt: state.deps.clock.nowMicroseconds(),
  });
  return spanId;
}

function endSpanImpl(state: ProfilerState, spanId: string): PerfSpanEntry | undefined {
  const span = state.active.get(spanId);
  if (span === undefined) return undefined;
  state.active.delete(spanId);

  const endedAt = state.deps.clock.nowMicroseconds();
  const durationUs = endedAt - span.startedAt;
  const budgetUs = state.budgets.get(span.name);
  const budgetExceeded = budgetUs !== undefined && durationUs > budgetUs;

  const entry: PerfSpanEntry = {
    spanId: span.spanId,
    name: span.name,
    parentSpanId: span.parentSpanId,
    durationUs,
    startedAt: span.startedAt,
    endedAt,
    budgetExceeded,
  };

  recordCompleted(state, entry);
  updateAggregation(state, span.name, durationUs);
  if (budgetUs !== undefined && durationUs > budgetUs) {
    recordViolation(state, entry, budgetUs);
  }

  return entry;
}

// ─── Recording ──────────────────────────────────────────────────────

function recordCompleted(state: ProfilerState, entry: PerfSpanEntry): void {
  state.completed.push(entry);
  if (state.completed.length > state.maxEntries) {
    state.completed.shift();
  }
}

function updateAggregation(state: ProfilerState, name: string, durationUs: number): void {
  let agg = state.aggregations.get(name);
  if (agg === undefined) {
    agg = { name, durations: [], totalUs: 0, minUs: durationUs, maxUs: durationUs, count: 0 };
    state.aggregations.set(name, agg);
  }
  agg.durations.push(durationUs);
  agg.totalUs += durationUs;
  agg.count += 1;
  if (durationUs < agg.minUs) agg.minUs = durationUs;
  if (durationUs > agg.maxUs) agg.maxUs = durationUs;
}

function recordViolation(state: ProfilerState, entry: PerfSpanEntry, budgetUs: number): void {
  state.violationCount += 1;
  state.violations.push({
    spanId: entry.spanId,
    name: entry.name,
    durationUs: entry.durationUs,
    budgetUs,
    exceededByUs: entry.durationUs - budgetUs,
  });
  if (state.violations.length > state.maxEntries) {
    state.violations.shift();
  }
}

// ─── Aggregation Queries ────────────────────────────────────────────

function getAggImpl(state: ProfilerState, name: string): PerfSpanAggregation | undefined {
  const agg = state.aggregations.get(name);
  if (agg === undefined) return undefined;
  return toAggregation(agg);
}

function listAggsImpl(state: ProfilerState): ReadonlyArray<PerfSpanAggregation> {
  const result: PerfSpanAggregation[] = [];
  for (const agg of state.aggregations.values()) {
    result.push(toAggregation(agg));
  }
  return result;
}

function toAggregation(agg: MutableAgg): PerfSpanAggregation {
  const sorted = [...agg.durations].sort((a, b) => a - b);
  return {
    name: agg.name,
    count: agg.count,
    totalUs: agg.totalUs,
    avgUs: agg.count > 0 ? agg.totalUs / agg.count : 0,
    minUs: agg.minUs,
    maxUs: agg.maxUs,
    p95Us: percentileOf(sorted, 95),
    p99Us: percentileOf(sorted, 99),
  };
}

function percentileOf(sorted: ReadonlyArray<number>, p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  const clamped = Math.max(0, Math.min(sorted.length - 1, idx));
  return sorted[clamped] ?? 0;
}

// ─── Hot Paths ──────────────────────────────────────────────────────

function hotPathsImpl(state: ProfilerState, limit: number): ReadonlyArray<PerfHotPath> {
  let totalAll = 0;
  for (const agg of state.aggregations.values()) {
    totalAll += agg.totalUs;
  }
  if (totalAll === 0) return [];

  const paths: PerfHotPath[] = [];
  for (const agg of state.aggregations.values()) {
    paths.push({
      name: agg.name,
      totalUs: agg.totalUs,
      percentOfTotal: (agg.totalUs / totalAll) * 100,
      count: agg.count,
    });
  }

  paths.sort((a, b) => b.totalUs - a.totalUs);
  return paths.slice(0, limit);
}

// ─── Frame Budget ───────────────────────────────────────────────────

function endFrameImpl(state: ProfilerState, frameSpanId: string): PerfFrameReport | undefined {
  const entry = endSpanImpl(state, frameSpanId);
  if (entry === undefined) return undefined;

  const childCount = countChildSpans(state, frameSpanId);
  return {
    totalFrameUs: entry.durationUs,
    budgetUs: state.frameBudgetUs,
    withinBudget: entry.durationUs <= state.frameBudgetUs,
    spanCount: childCount,
  };
}

function countChildSpans(state: ProfilerState, parentId: string): number {
  let count = 0;
  for (const e of state.completed) {
    if (e.parentSpanId === parentId) count += 1;
  }
  return count;
}

// ─── Child Queries ──────────────────────────────────────────────────

function childSpansImpl(state: ProfilerState, parentSpanId: string): ReadonlyArray<PerfSpanEntry> {
  const result: PerfSpanEntry[] = [];
  for (const e of state.completed) {
    if (e.parentSpanId === parentSpanId) result.push(e);
  }
  return result;
}

// ─── Violations ─────────────────────────────────────────────────────

function recentViolations(state: ProfilerState, limit: number): ReadonlyArray<PerfBudgetViolation> {
  const start = Math.max(0, state.violations.length - limit);
  return state.violations.slice(start);
}

// ─── Recent Spans ───────────────────────────────────────────────────

function recentSpansImpl(state: ProfilerState, limit: number): ReadonlyArray<PerfSpanEntry> {
  const start = Math.max(0, state.completed.length - limit);
  return state.completed.slice(start);
}

// ─── Reset ──────────────────────────────────────────────────────────

function resetImpl(state: ProfilerState): void {
  state.active.clear();
  state.completed.length = 0;
  state.aggregations.clear();
  state.violations.length = 0;
  state.violationCount = 0;
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: ProfilerState): PerfProfilerStats {
  let totalSpans = 0;
  for (const agg of state.aggregations.values()) {
    totalSpans += agg.count;
  }
  return {
    trackedSpanNames: state.aggregations.size,
    totalCompletedSpans: totalSpans,
    activeSpans: state.active.size,
    budgetViolationCount: state.violationCount,
  };
}
