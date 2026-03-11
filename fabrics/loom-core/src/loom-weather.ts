/**
 * loom-weather.ts — Dynamic weather system with storm tracking and world effects.
 *
 * Weather conditions are started on registered worlds with intensity, duration,
 * and area coverage. Each weather type generates typed gameplay effects.
 * History is retained for all conditions including inactive ones.
 */

// ── Types ─────────────────────────────────────────────────────────

export type WeatherId = string;
export type LoomWorldId = string;

export type LoomWeatherType =
  | 'CLEAR'
  | 'CLOUDY'
  | 'RAIN'
  | 'STORM'
  | 'BLIZZARD'
  | 'DROUGHT'
  | 'FOG'
  | 'HEATWAVE';

export type WeatherError =
  | 'world-not-found'
  | 'weather-not-found'
  | 'already-registered'
  | 'invalid-intensity'
  | 'invalid-duration';

export type WeatherEffectType =
  | 'VISIBILITY_REDUCTION'
  | 'MOVEMENT_PENALTY'
  | 'HARVEST_BONUS'
  | 'HARVEST_PENALTY'
  | 'COMBAT_MODIFIER';

export interface WeatherCondition {
  readonly weatherId: WeatherId;
  readonly worldId: LoomWorldId;
  readonly type: LoomWeatherType;
  readonly intensity: number;
  readonly startedAt: bigint;
  readonly durationUs: bigint;
  readonly affectedArea: number;
  readonly active: boolean;
}

export interface WeatherEffect {
  readonly effectId: string;
  readonly weatherId: WeatherId;
  readonly worldId: LoomWorldId;
  readonly type: WeatherEffectType;
  readonly magnitude: number;
}

export interface WeatherReport {
  readonly worldId: LoomWorldId;
  readonly currentConditions: ReadonlyArray<WeatherCondition>;
  readonly dominantType: LoomWeatherType | null;
  readonly averageIntensity: number;
}

export interface LoomWeatherSystem {
  registerWorld(worldId: LoomWorldId): { success: true } | { success: false; error: WeatherError };
  startWeather(
    worldId: LoomWorldId,
    type: LoomWeatherType,
    intensity: number,
    durationUs: bigint,
    affectedArea: number,
  ): WeatherCondition | WeatherError;
  endWeather(weatherId: WeatherId): { success: true } | { success: false; error: WeatherError };
  getActiveWeather(worldId: LoomWorldId): ReadonlyArray<WeatherCondition>;
  getWeatherReport(worldId: LoomWorldId): WeatherReport | WeatherError;
  computeEffects(weatherId: WeatherId): ReadonlyArray<WeatherEffect>;
  getWeatherHistory(worldId: LoomWorldId, limit: number): ReadonlyArray<WeatherCondition>;
}

// ── Ports ─────────────────────────────────────────────────────────

interface WeatherClock {
  nowUs(): bigint;
}

interface WeatherIdGenerator {
  generate(): string;
}

interface WeatherLogger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

export interface LoomWeatherDeps {
  readonly clock: WeatherClock;
  readonly idGen: WeatherIdGenerator;
  readonly logger: WeatherLogger;
}

// ── Internal State ────────────────────────────────────────────────

interface MutableCondition {
  weatherId: WeatherId;
  worldId: LoomWorldId;
  type: LoomWeatherType;
  intensity: number;
  startedAt: bigint;
  durationUs: bigint;
  affectedArea: number;
  active: boolean;
}

interface LoomWeatherState {
  readonly worlds: Set<LoomWorldId>;
  readonly conditions: Map<WeatherId, MutableCondition>;
  readonly clock: WeatherClock;
  readonly idGen: WeatherIdGenerator;
  readonly logger: WeatherLogger;
}

// ── Helpers ───────────────────────────────────────────────────────

function toReadonlyCondition(c: MutableCondition): WeatherCondition {
  return {
    weatherId: c.weatherId,
    worldId: c.worldId,
    type: c.type,
    intensity: c.intensity,
    startedAt: c.startedAt,
    durationUs: c.durationUs,
    affectedArea: c.affectedArea,
    active: c.active,
  };
}

function makeEffect(
  state: LoomWeatherState,
  condition: MutableCondition,
  type: WeatherEffectType,
  magnitude: number,
): WeatherEffect {
  return {
    effectId: state.idGen.generate(),
    weatherId: condition.weatherId,
    worldId: condition.worldId,
    type,
    magnitude,
  };
}

function computeStormRainBlizzardEffects(
  state: LoomWeatherState,
  condition: MutableCondition,
): ReadonlyArray<WeatherEffect> | null {
  const { type, intensity } = condition;
  if (type === 'STORM') {
    return [
      makeEffect(state, condition, 'VISIBILITY_REDUCTION', intensity * 0.8),
      makeEffect(state, condition, 'MOVEMENT_PENALTY', intensity * 0.5),
      makeEffect(state, condition, 'HARVEST_PENALTY', intensity * 0.3),
    ];
  }
  if (type === 'RAIN') {
    return [
      makeEffect(state, condition, 'HARVEST_BONUS', intensity * 0.4),
      makeEffect(state, condition, 'MOVEMENT_PENALTY', intensity * 0.2),
    ];
  }
  if (type === 'BLIZZARD') {
    return [
      makeEffect(state, condition, 'VISIBILITY_REDUCTION', 0.9),
      makeEffect(state, condition, 'MOVEMENT_PENALTY', 0.8),
      makeEffect(state, condition, 'COMBAT_MODIFIER', -intensity * 0.5),
    ];
  }
  return null;
}

function computeEffectsForCondition(
  state: LoomWeatherState,
  condition: MutableCondition,
): ReadonlyArray<WeatherEffect> {
  const primary = computeStormRainBlizzardEffects(state, condition);
  if (primary !== null) return primary;
  const { type, intensity } = condition;
  if (type === 'DROUGHT') {
    return [makeEffect(state, condition, 'HARVEST_PENALTY', intensity * 0.7)];
  }
  if (type === 'HEATWAVE') {
    return [
      makeEffect(state, condition, 'MOVEMENT_PENALTY', intensity * 0.3),
      makeEffect(state, condition, 'COMBAT_MODIFIER', -intensity * 0.2),
    ];
  }
  if (type === 'FOG') {
    return [makeEffect(state, condition, 'VISIBILITY_REDUCTION', intensity * 0.9)];
  }
  return [];
}

// ── Operations ────────────────────────────────────────────────────

function registerWorldImpl(
  state: LoomWeatherState,
  worldId: LoomWorldId,
): { success: true } | { success: false; error: WeatherError } {
  if (state.worlds.has(worldId)) return { success: false, error: 'already-registered' };
  state.worlds.add(worldId);
  state.logger.info('loom-weather-world-registered worldId=' + worldId);
  return { success: true };
}

function startWeatherImpl(
  state: LoomWeatherState,
  worldId: LoomWorldId,
  type: LoomWeatherType,
  intensity: number,
  durationUs: bigint,
  affectedArea: number,
): WeatherCondition | WeatherError {
  if (!state.worlds.has(worldId)) return 'world-not-found';
  if (intensity < 0 || intensity > 1) return 'invalid-intensity';
  if (durationUs < 1n) return 'invalid-duration';

  const weatherId = state.idGen.generate();
  const condition: MutableCondition = {
    weatherId,
    worldId,
    type,
    intensity,
    startedAt: state.clock.nowUs(),
    durationUs,
    affectedArea,
    active: true,
  };
  state.conditions.set(weatherId, condition);
  state.logger.info('loom-weather-started weatherId=' + weatherId + ' type=' + type);
  return toReadonlyCondition(condition);
}

function endWeatherImpl(
  state: LoomWeatherState,
  weatherId: WeatherId,
): { success: true } | { success: false; error: WeatherError } {
  const condition = state.conditions.get(weatherId);
  if (condition === undefined) return { success: false, error: 'weather-not-found' };
  condition.active = false;
  state.logger.info('loom-weather-ended weatherId=' + weatherId);
  return { success: true };
}

function getActiveWeatherImpl(
  state: LoomWeatherState,
  worldId: LoomWorldId,
): ReadonlyArray<WeatherCondition> {
  const result: WeatherCondition[] = [];
  for (const [, c] of state.conditions) {
    if (c.worldId === worldId && c.active) result.push(toReadonlyCondition(c));
  }
  return result;
}

function getWeatherReportImpl(
  state: LoomWeatherState,
  worldId: LoomWorldId,
): WeatherReport | WeatherError {
  if (!state.worlds.has(worldId)) return 'world-not-found';
  const active = getActiveWeatherImpl(state, worldId);
  const dominantType = computeDominantType(active);
  const averageIntensity =
    active.length === 0 ? 0 : active.reduce((sum, c) => sum + c.intensity, 0) / active.length;
  return { worldId, currentConditions: active, dominantType, averageIntensity };
}

function computeDominantType(conditions: ReadonlyArray<WeatherCondition>): LoomWeatherType | null {
  if (conditions.length === 0) return null;
  const sums = new Map<LoomWeatherType, number>();
  for (const c of conditions) {
    sums.set(c.type, (sums.get(c.type) ?? 0) + c.intensity);
  }
  let dominant: LoomWeatherType | null = null;
  let maxSum = -1;
  for (const [type, sum] of sums) {
    if (sum > maxSum) {
      maxSum = sum;
      dominant = type;
    }
  }
  return dominant;
}

function getWeatherHistoryImpl(
  state: LoomWeatherState,
  worldId: LoomWorldId,
  limit: number,
): ReadonlyArray<WeatherCondition> {
  const all: WeatherCondition[] = [];
  for (const [, c] of state.conditions) {
    if (c.worldId === worldId) all.push(toReadonlyCondition(c));
  }
  return all.slice(-limit);
}

// ── Factory ───────────────────────────────────────────────────────

export function createLoomWeatherSystem(deps: LoomWeatherDeps): LoomWeatherSystem {
  const state: LoomWeatherState = {
    worlds: new Set(),
    conditions: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };

  return {
    registerWorld: (worldId) => registerWorldImpl(state, worldId),
    startWeather: (worldId, type, intensity, durationUs, affectedArea) =>
      startWeatherImpl(state, worldId, type, intensity, durationUs, affectedArea),
    endWeather: (weatherId) => endWeatherImpl(state, weatherId),
    getActiveWeather: (worldId) => getActiveWeatherImpl(state, worldId),
    getWeatherReport: (worldId) => getWeatherReportImpl(state, worldId),
    computeEffects: (weatherId) => {
      const condition = state.conditions.get(weatherId);
      if (condition === undefined) return [];
      return computeEffectsForCondition(state, condition);
    },
    getWeatherHistory: (worldId, limit) => getWeatherHistoryImpl(state, worldId, limit),
  };
}
