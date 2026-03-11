/**
 * Performance Profiler — Execution timing for systems and operations.
 *
 * Tracks how long named operations take to execute, maintaining
 * per-operation statistics (min, max, average, count). Used to
 * ensure The Loom stays under 0.5ms per game thread tick.
 *
 * Operations are identified by name (e.g., "tick-loop", "entity-query").
 * Each measurement records start/end via the injected clock.
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface ProfileEntry {
  readonly operationName: string;
  readonly durationUs: number;
  readonly startedAt: number;
  readonly endedAt: number;
}

export interface OperationProfile {
  readonly operationName: string;
  readonly totalCalls: number;
  readonly totalDurationUs: number;
  readonly minDurationUs: number;
  readonly maxDurationUs: number;
  readonly averageDurationUs: number;
}

export interface ProfilerStats {
  readonly trackedOperations: number;
  readonly totalMeasurements: number;
  readonly totalEntries: number;
}

// ─── Ports ──────────────────────────────────────────────────────────

export interface PerformanceProfilerDeps {
  readonly clock: { nowMicroseconds(): number };
}

// ─── Public Interface ───────────────────────────────────────────────

export interface PerformanceProfiler {
  begin(operationName: string): string;
  end(token: string): ProfileEntry | undefined;
  getProfile(operationName: string): OperationProfile | undefined;
  listProfiles(): ReadonlyArray<OperationProfile>;
  getRecentEntries(limit: number): ReadonlyArray<ProfileEntry>;
  reset(operationName: string): boolean;
  resetAll(): void;
  getStats(): ProfilerStats;
}

// ─── Internal State ─────────────────────────────────────────────────

interface ActiveMeasurement {
  readonly token: string;
  readonly operationName: string;
  readonly startedAt: number;
}

interface MutableProfile {
  operationName: string;
  totalCalls: number;
  totalDurationUs: number;
  minDurationUs: number;
  maxDurationUs: number;
}

interface ProfilerState {
  readonly active: Map<string, ActiveMeasurement>;
  readonly profiles: Map<string, MutableProfile>;
  readonly entries: ProfileEntry[];
  readonly deps: PerformanceProfilerDeps;
  readonly maxEntries: number;
  tokenCounter: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createPerformanceProfiler(
  deps: PerformanceProfilerDeps,
  maxEntries?: number,
): PerformanceProfiler {
  const state: ProfilerState = {
    active: new Map(),
    profiles: new Map(),
    entries: [],
    deps,
    maxEntries: maxEntries ?? 1000,
    tokenCounter: 0,
  };

  return {
    begin: (name) => beginImpl(state, name),
    end: (token) => endImpl(state, token),
    getProfile: (name) => readProfile(state, name),
    listProfiles: () => listProfilesImpl(state),
    getRecentEntries: (n) => recentEntries(state, n),
    reset: (name) => resetImpl(state, name),
    resetAll: () => {
      resetAllImpl(state);
    },
    getStats: () => computeStats(state),
  };
}

// ─── Begin / End ────────────────────────────────────────────────────

function beginImpl(state: ProfilerState, operationName: string): string {
  state.tokenCounter += 1;
  const token = 'prof-' + String(state.tokenCounter);
  state.active.set(token, {
    token,
    operationName,
    startedAt: state.deps.clock.nowMicroseconds(),
  });
  return token;
}

function endImpl(state: ProfilerState, token: string): ProfileEntry | undefined {
  const measurement = state.active.get(token);
  if (measurement === undefined) return undefined;
  state.active.delete(token);
  const endedAt = state.deps.clock.nowMicroseconds();
  const durationUs = endedAt - measurement.startedAt;
  const entry: ProfileEntry = {
    operationName: measurement.operationName,
    durationUs,
    startedAt: measurement.startedAt,
    endedAt,
  };
  recordEntry(state, entry);
  updateProfile(state, measurement.operationName, durationUs);
  return entry;
}

// ─── Recording ──────────────────────────────────────────────────────

function recordEntry(state: ProfilerState, entry: ProfileEntry): void {
  state.entries.push(entry);
  if (state.entries.length > state.maxEntries) {
    state.entries.shift();
  }
}

function updateProfile(state: ProfilerState, name: string, durationUs: number): void {
  const existing = state.profiles.get(name);
  if (existing !== undefined) {
    existing.totalCalls += 1;
    existing.totalDurationUs += durationUs;
    if (durationUs < existing.minDurationUs) existing.minDurationUs = durationUs;
    if (durationUs > existing.maxDurationUs) existing.maxDurationUs = durationUs;
  } else {
    state.profiles.set(name, {
      operationName: name,
      totalCalls: 1,
      totalDurationUs: durationUs,
      minDurationUs: durationUs,
      maxDurationUs: durationUs,
    });
  }
}

// ─── Queries ────────────────────────────────────────────────────────

function readProfile(state: ProfilerState, name: string): OperationProfile | undefined {
  const p = state.profiles.get(name);
  if (p === undefined) return undefined;
  return {
    ...p,
    averageDurationUs: p.totalCalls > 0 ? p.totalDurationUs / p.totalCalls : 0,
  };
}

function listProfilesImpl(state: ProfilerState): ReadonlyArray<OperationProfile> {
  const result: OperationProfile[] = [];
  for (const p of state.profiles.values()) {
    result.push({
      ...p,
      averageDurationUs: p.totalCalls > 0 ? p.totalDurationUs / p.totalCalls : 0,
    });
  }
  return result;
}

function recentEntries(state: ProfilerState, limit: number): ReadonlyArray<ProfileEntry> {
  const start = Math.max(0, state.entries.length - limit);
  return state.entries.slice(start);
}

// ─── Reset ──────────────────────────────────────────────────────────

function resetImpl(state: ProfilerState, name: string): boolean {
  return state.profiles.delete(name);
}

function resetAllImpl(state: ProfilerState): void {
  state.profiles.clear();
  state.entries.length = 0;
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: ProfilerState): ProfilerStats {
  let totalMeasurements = 0;
  for (const p of state.profiles.values()) {
    totalMeasurements += p.totalCalls;
  }
  return {
    trackedOperations: state.profiles.size,
    totalMeasurements,
    totalEntries: state.entries.length,
  };
}
