/**
 * Weather System — Dynamic atmospheric simulation per world.
 *
 * Weather flows through a state machine driven by biome, season,
 * altitude, and stellar activity. Each weather type carries gameplay
 * effects on movement, visibility, morale, and resource gathering.
 * Extreme events are rare but devastating.
 */

// ─── Types ──────────────────────────────────────────────────────────

export type WeatherType =
  | 'CLEAR'
  | 'CLOUDY'
  | 'RAIN'
  | 'STORM'
  | 'SNOW'
  | 'FOG'
  | 'DUST_STORM'
  | 'SOLAR_FLARE'
  | 'ACID_RAIN'
  | 'AURORA';

export interface WeatherEffects {
  readonly movementSpeedMod: number;
  readonly visibilityMod: number;
  readonly moraleMod: number;
  readonly gatheringMod: number;
}

export interface WeatherDuration {
  readonly minMs: number;
  readonly maxMs: number;
}

export interface WeatherState {
  readonly currentWeather: WeatherType;
  readonly startedAt: number;
  readonly durationMs: number;
  readonly intensity: number;
  readonly effects: WeatherEffects;
}

export interface WeatherTransition {
  readonly from: WeatherType;
  readonly to: WeatherType;
  readonly probability: number;
}

export interface SeasonalPattern {
  readonly season: string;
  readonly dominantWeather: ReadonlyArray<WeatherType>;
  readonly temperatureModifier: number;
}

export interface WeatherInput {
  readonly biome: string;
  readonly season: number;
  readonly altitude: number;
  readonly stellarActivity: number;
  readonly seed: number;
}

export interface WeatherSystemStats {
  readonly totalTransitions: number;
  readonly extremeEvents: number;
  readonly currentStatesCount: number;
}

export interface WeatherSystem {
  initializeWeather(locationId: string, input: WeatherInput): WeatherState;
  getWeather(locationId: string): WeatherState | undefined;
  tickWeather(locationId: string, deltaMs: number, input: WeatherInput): WeatherState | undefined;
  getEffects(weatherType: WeatherType): WeatherEffects;
  getDuration(weatherType: WeatherType): WeatherDuration;
  getTransitions(weatherType: WeatherType): ReadonlyArray<WeatherTransition>;
  isExtremeWeather(weatherType: WeatherType): boolean;
  getSeasonalPattern(seasonIndex: number): SeasonalPattern;
  getStats(): WeatherSystemStats;
}

// ─── Constants ──────────────────────────────────────────────────────

const WEATHER_EFFECTS: Record<WeatherType, WeatherEffects> = {
  CLEAR: { movementSpeedMod: 1.0, visibilityMod: 1.0, moraleMod: 0.05, gatheringMod: 1.0 },
  CLOUDY: { movementSpeedMod: 1.0, visibilityMod: 0.85, moraleMod: 0.0, gatheringMod: 0.95 },
  RAIN: { movementSpeedMod: 0.8, visibilityMod: 0.6, moraleMod: -0.05, gatheringMod: 0.7 },
  STORM: { movementSpeedMod: 0.5, visibilityMod: 0.3, moraleMod: -0.15, gatheringMod: 0.3 },
  SNOW: { movementSpeedMod: 0.6, visibilityMod: 0.5, moraleMod: -0.1, gatheringMod: 0.4 },
  FOG: { movementSpeedMod: 0.7, visibilityMod: 0.2, moraleMod: -0.05, gatheringMod: 0.8 },
  DUST_STORM: { movementSpeedMod: 0.4, visibilityMod: 0.15, moraleMod: -0.2, gatheringMod: 0.2 },
  SOLAR_FLARE: { movementSpeedMod: 0.9, visibilityMod: 0.7, moraleMod: -0.25, gatheringMod: 0.5 },
  ACID_RAIN: { movementSpeedMod: 0.6, visibilityMod: 0.5, moraleMod: -0.3, gatheringMod: 0.1 },
  AURORA: { movementSpeedMod: 1.0, visibilityMod: 0.9, moraleMod: 0.2, gatheringMod: 1.0 },
};

const WEATHER_DURATIONS: Record<WeatherType, WeatherDuration> = {
  CLEAR: { minMs: 60000, maxMs: 300000 },
  CLOUDY: { minMs: 30000, maxMs: 180000 },
  RAIN: { minMs: 20000, maxMs: 120000 },
  STORM: { minMs: 10000, maxMs: 60000 },
  SNOW: { minMs: 30000, maxMs: 150000 },
  FOG: { minMs: 15000, maxMs: 90000 },
  DUST_STORM: { minMs: 20000, maxMs: 100000 },
  SOLAR_FLARE: { minMs: 5000, maxMs: 30000 },
  ACID_RAIN: { minMs: 10000, maxMs: 60000 },
  AURORA: { minMs: 15000, maxMs: 45000 },
};

const EXTREME_WEATHER: ReadonlyArray<WeatherType> = [
  'STORM',
  'DUST_STORM',
  'SOLAR_FLARE',
  'ACID_RAIN',
];

const BASE_TRANSITIONS: ReadonlyArray<WeatherTransition> = [
  { from: 'CLEAR', to: 'CLOUDY', probability: 0.4 },
  { from: 'CLEAR', to: 'FOG', probability: 0.1 },
  { from: 'CLEAR', to: 'AURORA', probability: 0.05 },
  { from: 'CLOUDY', to: 'CLEAR', probability: 0.3 },
  { from: 'CLOUDY', to: 'RAIN', probability: 0.35 },
  { from: 'CLOUDY', to: 'SNOW', probability: 0.1 },
  { from: 'RAIN', to: 'STORM', probability: 0.2 },
  { from: 'RAIN', to: 'CLOUDY', probability: 0.4 },
  { from: 'RAIN', to: 'CLEAR', probability: 0.15 },
  { from: 'STORM', to: 'RAIN', probability: 0.5 },
  { from: 'STORM', to: 'CLOUDY', probability: 0.3 },
  { from: 'SNOW', to: 'CLOUDY', probability: 0.4 },
  { from: 'SNOW', to: 'CLEAR', probability: 0.2 },
  { from: 'FOG', to: 'CLEAR', probability: 0.5 },
  { from: 'FOG', to: 'CLOUDY', probability: 0.3 },
  { from: 'DUST_STORM', to: 'CLEAR', probability: 0.4 },
  { from: 'DUST_STORM', to: 'CLOUDY', probability: 0.3 },
  { from: 'SOLAR_FLARE', to: 'CLEAR', probability: 0.6 },
  { from: 'SOLAR_FLARE', to: 'AURORA', probability: 0.2 },
  { from: 'ACID_RAIN', to: 'CLOUDY', probability: 0.5 },
  { from: 'ACID_RAIN', to: 'RAIN', probability: 0.2 },
  { from: 'AURORA', to: 'CLEAR', probability: 0.6 },
  { from: 'AURORA', to: 'CLOUDY', probability: 0.2 },
];

const SEASONAL_PATTERNS: ReadonlyArray<SeasonalPattern> = [
  { season: 'spring', dominantWeather: ['RAIN', 'CLOUDY', 'CLEAR'], temperatureModifier: 0.0 },
  { season: 'summer', dominantWeather: ['CLEAR', 'DUST_STORM'], temperatureModifier: 0.2 },
  { season: 'autumn', dominantWeather: ['CLOUDY', 'FOG', 'RAIN'], temperatureModifier: -0.05 },
  { season: 'winter', dominantWeather: ['SNOW', 'STORM', 'FOG'], temperatureModifier: -0.2 },
];

// ─── Internal State ─────────────────────────────────────────────────

interface MutableWeatherState {
  currentWeather: WeatherType;
  startedAt: number;
  durationMs: number;
  intensity: number;
  effects: WeatherEffects;
}

interface SystemState {
  readonly locations: Map<string, MutableWeatherState>;
  totalTransitions: number;
  extremeEvents: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createWeatherSystem(): WeatherSystem {
  const state: SystemState = {
    locations: new Map(),
    totalTransitions: 0,
    extremeEvents: 0,
  };

  return {
    initializeWeather: (locId, input) => initImpl(state, locId, input),
    getWeather: (locId) => state.locations.get(locId),
    tickWeather: (locId, dt, input) => tickImpl(state, locId, dt, input),
    getEffects: (type) => WEATHER_EFFECTS[type],
    getDuration: (type) => WEATHER_DURATIONS[type],
    getTransitions: (type) => transitionsFrom(type),
    isExtremeWeather: (type) => EXTREME_WEATHER.includes(type),
    getSeasonalPattern: (idx) =>
      SEASONAL_PATTERNS[idx % SEASONAL_PATTERNS.length] as SeasonalPattern,
    getStats: () => buildStats(state),
  };
}

// ─── Initialize ─────────────────────────────────────────────────────

function initImpl(state: SystemState, locationId: string, input: WeatherInput): WeatherState {
  const initial = pickInitialWeather(input);
  const duration = rollDuration(initial, input.seed);
  const intensity = computeIntensity(input.stellarActivity, input.altitude);

  const ws: MutableWeatherState = {
    currentWeather: initial,
    startedAt: 0,
    durationMs: duration,
    intensity,
    effects: WEATHER_EFFECTS[initial],
  };
  state.locations.set(locationId, ws);
  return ws;
}

function pickInitialWeather(input: WeatherInput): WeatherType {
  const pattern = SEASONAL_PATTERNS[input.season % SEASONAL_PATTERNS.length] as SeasonalPattern;
  const rng = seededRandom(input.seed);
  const idx = Math.floor(rng() * pattern.dominantWeather.length);
  return pattern.dominantWeather[idx] as WeatherType;
}

// ─── Tick ───────────────────────────────────────────────────────────

function tickImpl(
  state: SystemState,
  locationId: string,
  deltaMs: number,
  input: WeatherInput,
): WeatherState | undefined {
  const ws = state.locations.get(locationId);
  if (ws === undefined) return undefined;

  const elapsed = deltaMs;
  if (elapsed < ws.durationMs) {
    ws.durationMs -= elapsed;
    return ws;
  }

  return transitionWeather(state, ws, input);
}

function transitionWeather(
  state: SystemState,
  ws: MutableWeatherState,
  input: WeatherInput,
): WeatherState {
  const next = pickNextWeather(ws.currentWeather, input);
  ws.currentWeather = next;
  ws.durationMs = rollDuration(next, input.seed + state.totalTransitions);
  ws.intensity = computeIntensity(input.stellarActivity, input.altitude);
  ws.effects = WEATHER_EFFECTS[next];

  state.totalTransitions += 1;
  if (EXTREME_WEATHER.includes(next)) state.extremeEvents += 1;
  return ws;
}

function pickNextWeather(current: WeatherType, input: WeatherInput): WeatherType {
  const transitions = transitionsFrom(current);
  if (transitions.length === 0) return 'CLEAR';

  const rng = seededRandom(input.seed + input.season * 1000);
  const roll = rng();
  let cumulative = 0;

  for (const t of transitions) {
    const adjusted = adjustProbability(t, input);
    cumulative += adjusted;
    if (roll < cumulative) return t.to;
  }
  const last = transitions[transitions.length - 1] as WeatherTransition;
  return last.to;
}

function adjustProbability(transition: WeatherTransition, input: WeatherInput): number {
  let prob = transition.probability;
  if (transition.to === 'DUST_STORM' && input.biome === 'DESERT') prob *= 2.0;
  if (transition.to === 'SNOW' && input.altitude > 0.7) prob *= 1.5;
  if (transition.to === 'SOLAR_FLARE' && input.stellarActivity > 0.5) prob *= 2.0;
  if (transition.to === 'ACID_RAIN' && input.biome === 'VOLCANIC') prob *= 3.0;
  return prob;
}

// ─── Helpers ────────────────────────────────────────────────────────

function transitionsFrom(type: WeatherType): ReadonlyArray<WeatherTransition> {
  return BASE_TRANSITIONS.filter((t) => t.from === type);
}

function rollDuration(type: WeatherType, seed: number): number {
  const dur = WEATHER_DURATIONS[type];
  const rng = seededRandom(seed);
  return dur.minMs + Math.floor(rng() * (dur.maxMs - dur.minMs));
}

function computeIntensity(stellarActivity: number, altitude: number): number {
  return Math.min(1.0, 0.3 + stellarActivity * 0.3 + altitude * 0.2);
}

function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1103515245 + 12345) | 0;
    return Math.abs(s) / 2147483647;
  };
}

// ─── Stats ──────────────────────────────────────────────────────────

function buildStats(state: SystemState): WeatherSystemStats {
  return {
    totalTransitions: state.totalTransitions,
    extremeEvents: state.extremeEvents,
    currentStatesCount: state.locations.size,
  };
}
