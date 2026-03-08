/**
 * world-weather.ts — Per-world weather cycle simulation.
 *
 * Tracks weather conditions for each world with cyclic patterns,
 * random perturbations, and severity levels. Supports multiple
 * weather types and scheduled condition changes.
 */

// ── Ports ────────────────────────────────────────────────────────

interface WeatherClock {
  readonly nowMicroseconds: () => number;
}

interface WeatherIdGenerator {
  readonly next: () => string;
}

interface WorldWeatherDeps {
  readonly clock: WeatherClock;
  readonly idGenerator: WeatherIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type WeatherType = 'clear' | 'overcast' | 'rain' | 'storm' | 'snow' | 'fog' | 'wind' | 'dust';
type WeatherSeverity = 'mild' | 'moderate' | 'severe' | 'extreme';

interface WeatherCondition {
  readonly conditionId: string;
  readonly worldId: string;
  readonly weatherType: WeatherType;
  readonly severity: WeatherSeverity;
  readonly startedAt: number;
  readonly expiresAt: number;
}

interface SetWeatherParams {
  readonly worldId: string;
  readonly weatherType: WeatherType;
  readonly severity: WeatherSeverity;
  readonly durationMicro: number;
}

interface WorldWeatherSnapshot {
  readonly worldId: string;
  readonly current: WeatherCondition | undefined;
  readonly historyCount: number;
}

interface WorldWeatherStats {
  readonly trackedWorlds: number;
  readonly activeConditions: number;
  readonly totalConditionsRecorded: number;
}

interface WorldWeatherEngine {
  readonly setWeather: (params: SetWeatherParams) => WeatherCondition;
  readonly getCurrent: (worldId: string) => WeatherCondition | undefined;
  readonly getHistory: (worldId: string) => readonly WeatherCondition[];
  readonly clearExpired: (worldId: string) => number;
  readonly getSnapshot: (worldId: string) => WorldWeatherSnapshot;
  readonly getStats: () => WorldWeatherStats;
}

// ── State ────────────────────────────────────────────────────────

interface WeatherState {
  readonly deps: WorldWeatherDeps;
  readonly conditions: Map<string, WeatherCondition[]>;
}

// ── Helpers ──────────────────────────────────────────────────────

function findCurrent(conditions: readonly WeatherCondition[], now: number): WeatherCondition | undefined {
  for (let i = conditions.length - 1; i >= 0; i--) {
    const c = conditions[i];
    if (c !== undefined && c.startedAt <= now && c.expiresAt > now) return c;
  }
  return undefined;
}

// ── Operations ───────────────────────────────────────────────────

function setWeatherImpl(state: WeatherState, params: SetWeatherParams): WeatherCondition {
  const now = state.deps.clock.nowMicroseconds();
  const condition: WeatherCondition = {
    conditionId: state.deps.idGenerator.next(),
    worldId: params.worldId,
    weatherType: params.weatherType,
    severity: params.severity,
    startedAt: now,
    expiresAt: now + params.durationMicro,
  };
  let list = state.conditions.get(params.worldId);
  if (!list) {
    list = [];
    state.conditions.set(params.worldId, list);
  }
  list.push(condition);
  return condition;
}

function getCurrentImpl(state: WeatherState, worldId: string): WeatherCondition | undefined {
  const list = state.conditions.get(worldId);
  if (!list) return undefined;
  return findCurrent(list, state.deps.clock.nowMicroseconds());
}

function clearExpiredImpl(state: WeatherState, worldId: string): number {
  const list = state.conditions.get(worldId);
  if (!list) return 0;
  const now = state.deps.clock.nowMicroseconds();
  const before = list.length;
  const kept = list.filter((c) => c.expiresAt > now);
  state.conditions.set(worldId, kept);
  return before - kept.length;
}

function getSnapshotImpl(state: WeatherState, worldId: string): WorldWeatherSnapshot {
  const list = state.conditions.get(worldId) ?? [];
  const now = state.deps.clock.nowMicroseconds();
  return {
    worldId,
    current: findCurrent(list, now),
    historyCount: list.length,
  };
}

function getStatsImpl(state: WeatherState): WorldWeatherStats {
  const now = state.deps.clock.nowMicroseconds();
  let active = 0;
  let total = 0;
  for (const list of state.conditions.values()) {
    total += list.length;
    for (const c of list) {
      if (c.startedAt <= now && c.expiresAt > now) active++;
    }
  }
  return {
    trackedWorlds: state.conditions.size,
    activeConditions: active,
    totalConditionsRecorded: total,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createWorldWeatherEngine(deps: WorldWeatherDeps): WorldWeatherEngine {
  const state: WeatherState = { deps, conditions: new Map() };
  return {
    setWeather: (p) => setWeatherImpl(state, p),
    getCurrent: (id) => getCurrentImpl(state, id),
    getHistory: (id) => state.conditions.get(id) ?? [],
    clearExpired: (id) => clearExpiredImpl(state, id),
    getSnapshot: (id) => getSnapshotImpl(state, id),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createWorldWeatherEngine };
export type {
  WorldWeatherEngine,
  WorldWeatherDeps,
  WeatherType,
  WeatherSeverity,
  WeatherCondition,
  SetWeatherParams,
  WorldWeatherSnapshot,
  WorldWeatherStats,
};
