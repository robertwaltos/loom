/**
 * Weather Forecast — Weather prediction and storm tracking system
 *
 * Manages per-world weather conditions, short-term forecasts, storm systems,
 * seasonal patterns, and weather impacts on entities.
 */

// --- Ports (defined locally) ---

export interface Clock {
  nowMicros(): bigint;
}

export interface IdGenerator {
  nextId(): string;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// --- Types ---

export type WeatherCondition =
  | 'CLEAR'
  | 'CLOUDY'
  | 'RAIN'
  | 'STORM'
  | 'BLIZZARD'
  | 'DROUGHT'
  | 'FOG'
  | 'SANDSTORM'
  | 'HEATWAVE'
  | 'FROST';

export interface WeatherForecast {
  readonly worldId: string;
  readonly forecastId: string;
  readonly currentCondition: WeatherCondition;
  readonly nextConditions: Array<{
    condition: WeatherCondition;
    startTimeMicros: bigint;
    endTimeMicros: bigint;
    intensity: number;
  }>;
  readonly generatedAt: bigint;
  readonly validUntil: bigint;
}

export interface StormSystem {
  readonly stormId: string;
  readonly worldId: string;
  readonly type: 'TROPICAL' | 'THUNDERSTORM' | 'BLIZZARD' | 'SANDSTORM' | 'TYPHOON';
  readonly centerX: number;
  readonly centerY: number;
  readonly radius: number;
  readonly intensity: number;
  readonly movementX: number;
  readonly movementY: number;
  readonly createdAt: bigint;
  readonly dissipatesAt: bigint;
}

export interface SeasonalPattern {
  readonly worldId: string;
  readonly season: 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER';
  readonly seasonStartMicros: bigint;
  readonly seasonEndMicros: bigint;
  readonly baseCondition: WeatherCondition;
  readonly conditionWeights: Record<WeatherCondition, number>;
  readonly temperatureModifier: number;
}

export interface WeatherImpact {
  readonly condition: WeatherCondition;
  readonly movementSpeedModifier: number;
  readonly visibilityModifier: number;
  readonly staminaDrainModifier: number;
  readonly damageModifier: number;
}

export interface WeatherReport {
  readonly worldId: string;
  readonly currentCondition: WeatherCondition;
  readonly currentIntensity: number;
  readonly activeStorms: number;
  readonly nextConditionChange: bigint;
  readonly seasonalInfo: string;
  readonly impactSummary: WeatherImpact;
  readonly generatedAt: bigint;
}

export interface WeatherForecastState {
  readonly forecasts: Map<string, WeatherForecast>;
  readonly storms: Map<string, StormSystem>;
  readonly patterns: Map<string, SeasonalPattern>;
  readonly currentWeather: Map<string, WeatherCondition>;
  readonly clock: Clock;
  readonly idGen: IdGenerator;
  readonly logger: Logger;
}

export type WeatherForecastError =
  | 'forecast-not-found'
  | 'world-not-found'
  | 'storm-not-found'
  | 'invalid-intensity'
  | 'invalid-condition'
  | 'invalid-time-range'
  | 'pattern-not-found'
  | 'invalid-season'
  | 'forecast-expired';

// --- Factory ---

export function createWeatherForecastState(
  clock: Clock,
  idGen: IdGenerator,
  logger: Logger,
): WeatherForecastState {
  return {
    forecasts: new Map(),
    storms: new Map(),
    patterns: new Map(),
    currentWeather: new Map(),
    clock,
    idGen,
    logger,
  };
}

// --- Core Functions ---

export function setCurrentWeather(
  state: WeatherForecastState,
  worldId: string,
  condition: WeatherCondition,
): 'ok' | WeatherForecastError {
  const validation = validateCondition(condition);
  if (validation !== 'ok') {
    return validation;
  }

  state.currentWeather.set(worldId, condition);
  state.logger.info('Set weather for ' + worldId + ': ' + condition);

  return 'ok';
}

function validateCondition(condition: WeatherCondition): 'ok' | WeatherForecastError {
  const valid: WeatherCondition[] = [
    'CLEAR',
    'CLOUDY',
    'RAIN',
    'STORM',
    'BLIZZARD',
    'DROUGHT',
    'FOG',
    'SANDSTORM',
    'HEATWAVE',
    'FROST',
  ];
  if (!valid.includes(condition)) {
    return 'invalid-condition';
  }
  return 'ok';
}

export function generateForecast(
  state: WeatherForecastState,
  worldId: string,
  hoursAhead: number,
): WeatherForecast | WeatherForecastError {
  if (hoursAhead <= 0 || hoursAhead > 24) {
    return 'invalid-time-range';
  }

  const currentCondition = state.currentWeather.get(worldId) || 'CLEAR';
  const now = state.clock.nowMicros();
  const validUntil = now + BigInt(hoursAhead * 3600 * 1000000);
  const forecastId = state.idGen.nextId();

  const pattern = state.patterns.get(worldId);
  const nextConditions = computeNextConditions(currentCondition, pattern, now, hoursAhead);

  const forecast: WeatherForecast = {
    worldId,
    forecastId,
    currentCondition,
    nextConditions,
    generatedAt: now,
    validUntil,
  };

  state.forecasts.set(forecastId, forecast);
  state.logger.info('Generated forecast: ' + forecastId);

  return forecast;
}

function computeNextConditions(
  currentCondition: WeatherCondition,
  pattern: SeasonalPattern | undefined,
  startTimeMicros: bigint,
  hoursAhead: number,
): Array<{
  condition: WeatherCondition;
  startTimeMicros: bigint;
  endTimeMicros: bigint;
  intensity: number;
}> {
  const conditions: Array<{
    condition: WeatherCondition;
    startTimeMicros: bigint;
    endTimeMicros: bigint;
    intensity: number;
  }> = [];

  let currentTime = startTimeMicros;
  let current = currentCondition;

  const hourMicros = BigInt(3600 * 1000000);
  const totalMicros = BigInt(hoursAhead) * hourMicros;

  while (currentTime < startTimeMicros + totalMicros) {
    const duration = hourMicros + BigInt(Math.floor(Math.random() * 3600 * 1000000));
    const endTime = currentTime + duration;

    const next = pickNextCondition(current, pattern);
    const intensity = Math.random() * 0.5 + 0.5;

    conditions.push({
      condition: next,
      startTimeMicros: currentTime,
      endTimeMicros: endTime,
      intensity,
    });

    currentTime = endTime;
    current = next;
  }

  return conditions;
}

function pickNextCondition(
  current: WeatherCondition,
  pattern: SeasonalPattern | undefined,
): WeatherCondition {
  if (pattern !== undefined) {
    const weights = pattern.conditionWeights;
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);

    if (total > 0) {
      let rand = Math.random() * total;
      for (const [cond, weight] of Object.entries(weights)) {
        rand -= weight;
        if (rand <= 0) {
          return cond as WeatherCondition;
        }
      }
    }
  }

  const transitions: Record<WeatherCondition, WeatherCondition[]> = {
    CLEAR: ['CLEAR', 'CLOUDY', 'FOG'],
    CLOUDY: ['CLOUDY', 'RAIN', 'CLEAR'],
    RAIN: ['RAIN', 'STORM', 'CLOUDY'],
    STORM: ['STORM', 'RAIN', 'CLEAR'],
    BLIZZARD: ['BLIZZARD', 'FROST', 'CLOUDY'],
    DROUGHT: ['DROUGHT', 'HEATWAVE', 'CLEAR'],
    FOG: ['FOG', 'CLEAR', 'CLOUDY'],
    SANDSTORM: ['SANDSTORM', 'CLEAR', 'DROUGHT'],
    HEATWAVE: ['HEATWAVE', 'DROUGHT', 'CLEAR'],
    FROST: ['FROST', 'CLEAR', 'CLOUDY'],
  };

  const options = transitions[current];
  if (options === undefined || options.length === 0) {
    return current;
  }

  const index = Math.floor(Math.random() * options.length);
  const next = options[index];
  return next || current;
}

export function trackStorm(
  state: WeatherForecastState,
  worldId: string,
  type: StormSystem['type'],
  centerX: number,
  centerY: number,
  radius: number,
  intensity: number,
  movementX: number,
  movementY: number,
  durationHours: number,
): StormSystem | WeatherForecastError {
  if (intensity < 0 || intensity > 1) {
    return 'invalid-intensity';
  }

  if (durationHours <= 0) {
    return 'invalid-time-range';
  }

  const now = state.clock.nowMicros();
  const dissipatesAt = now + BigInt(durationHours * 3600 * 1000000);
  const stormId = state.idGen.nextId();

  const storm: StormSystem = {
    stormId,
    worldId,
    type,
    centerX,
    centerY,
    radius,
    intensity,
    movementX,
    movementY,
    createdAt: now,
    dissipatesAt,
  };

  state.storms.set(stormId, storm);
  state.logger.warn('Storm tracked: ' + stormId + ' (' + type + ')');

  return storm;
}

export function setSeasonalPattern(
  state: WeatherForecastState,
  worldId: string,
  season: SeasonalPattern['season'],
  seasonStartMicros: bigint,
  seasonEndMicros: bigint,
  baseCondition: WeatherCondition,
  conditionWeights: Record<WeatherCondition, number>,
  temperatureModifier: number,
): SeasonalPattern | WeatherForecastError {
  if (seasonEndMicros <= seasonStartMicros) {
    return 'invalid-time-range';
  }

  const validation = validateCondition(baseCondition);
  if (validation !== 'ok') {
    return validation;
  }

  const pattern: SeasonalPattern = {
    worldId,
    season,
    seasonStartMicros,
    seasonEndMicros,
    baseCondition,
    conditionWeights,
    temperatureModifier,
  };

  state.patterns.set(worldId, pattern);
  state.logger.info('Set seasonal pattern for ' + worldId + ': ' + season);

  return pattern;
}

export function getWeatherImpact(
  state: WeatherForecastState,
  condition: WeatherCondition,
): WeatherImpact | WeatherForecastError {
  const validation = validateCondition(condition);
  if (validation !== 'ok') {
    return validation;
  }

  const impacts: Record<WeatherCondition, WeatherImpact> = {
    CLEAR: {
      condition: 'CLEAR',
      movementSpeedModifier: 1.0,
      visibilityModifier: 1.0,
      staminaDrainModifier: 1.0,
      damageModifier: 1.0,
    },
    CLOUDY: {
      condition: 'CLOUDY',
      movementSpeedModifier: 0.95,
      visibilityModifier: 0.9,
      staminaDrainModifier: 1.0,
      damageModifier: 1.0,
    },
    RAIN: {
      condition: 'RAIN',
      movementSpeedModifier: 0.85,
      visibilityModifier: 0.7,
      staminaDrainModifier: 1.2,
      damageModifier: 1.0,
    },
    STORM: {
      condition: 'STORM',
      movementSpeedModifier: 0.7,
      visibilityModifier: 0.5,
      staminaDrainModifier: 1.5,
      damageModifier: 1.2,
    },
    BLIZZARD: {
      condition: 'BLIZZARD',
      movementSpeedModifier: 0.6,
      visibilityModifier: 0.3,
      staminaDrainModifier: 2.0,
      damageModifier: 1.3,
    },
    DROUGHT: {
      condition: 'DROUGHT',
      movementSpeedModifier: 0.9,
      visibilityModifier: 0.8,
      staminaDrainModifier: 1.4,
      damageModifier: 1.0,
    },
    FOG: {
      condition: 'FOG',
      movementSpeedModifier: 0.8,
      visibilityModifier: 0.4,
      staminaDrainModifier: 1.1,
      damageModifier: 1.0,
    },
    SANDSTORM: {
      condition: 'SANDSTORM',
      movementSpeedModifier: 0.65,
      visibilityModifier: 0.2,
      staminaDrainModifier: 1.8,
      damageModifier: 1.1,
    },
    HEATWAVE: {
      condition: 'HEATWAVE',
      movementSpeedModifier: 0.75,
      visibilityModifier: 0.9,
      staminaDrainModifier: 1.6,
      damageModifier: 1.0,
    },
    FROST: {
      condition: 'FROST',
      movementSpeedModifier: 0.8,
      visibilityModifier: 0.85,
      staminaDrainModifier: 1.3,
      damageModifier: 1.0,
    },
  };

  const impact = impacts[condition];
  if (impact === undefined) {
    return 'invalid-condition';
  }

  return impact;
}

export function advanceWeather(
  state: WeatherForecastState,
  worldId: string,
): WeatherCondition | WeatherForecastError {
  const current = state.currentWeather.get(worldId);
  if (current === undefined) {
    return 'world-not-found';
  }

  const pattern = state.patterns.get(worldId);
  const next = pickNextCondition(current, pattern);

  state.currentWeather.set(worldId, next);
  state.logger.info('Weather advanced for ' + worldId + ': ' + next);

  return next;
}

export function getWeatherReport(
  state: WeatherForecastState,
  worldId: string,
): WeatherReport | WeatherForecastError {
  const currentCondition = state.currentWeather.get(worldId);
  if (currentCondition === undefined) {
    return 'world-not-found';
  }

  const now = state.clock.nowMicros();
  const pattern = state.patterns.get(worldId);

  const activeStorms = Array.from(state.storms.values()).filter(
    (s) => s.worldId === worldId && s.dissipatesAt > now,
  ).length;

  const impact = getWeatherImpact(state, currentCondition);
  if (typeof impact === 'string') {
    return impact;
  }

  const seasonalInfo = pattern
    ? pattern.season + ' (temp: ' + String(pattern.temperatureModifier) + ')'
    : 'No seasonal pattern';

  const nextConditionChange = now + BigInt(3600 * 1000000);

  const report: WeatherReport = {
    worldId,
    currentCondition,
    currentIntensity: 0.8,
    activeStorms,
    nextConditionChange,
    seasonalInfo,
    impactSummary: impact,
    generatedAt: now,
  };

  return report;
}

export function getForecast(
  state: WeatherForecastState,
  forecastId: string,
): WeatherForecast | WeatherForecastError {
  const forecast = state.forecasts.get(forecastId);
  if (forecast === undefined) {
    return 'forecast-not-found';
  }

  const now = state.clock.nowMicros();
  if (now > forecast.validUntil) {
    return 'forecast-expired';
  }

  return forecast;
}

export function getStorm(
  state: WeatherForecastState,
  stormId: string,
): StormSystem | WeatherForecastError {
  const storm = state.storms.get(stormId);
  if (storm === undefined) {
    return 'storm-not-found';
  }

  return storm;
}

export function advanceStorm(
  state: WeatherForecastState,
  stormId: string,
  elapsedHours: number,
): StormSystem | WeatherForecastError {
  const storm = state.storms.get(stormId);
  if (storm === undefined) {
    return 'storm-not-found';
  }

  const now = state.clock.nowMicros();
  if (now >= storm.dissipatesAt) {
    state.storms.delete(stormId);
    state.logger.info('Storm dissipated: ' + stormId);
    return 'storm-not-found';
  }

  const newCenterX = storm.centerX + storm.movementX * elapsedHours;
  const newCenterY = storm.centerY + storm.movementY * elapsedHours;

  const updated: StormSystem = {
    ...storm,
    centerX: newCenterX,
    centerY: newCenterY,
  };

  state.storms.set(stormId, updated);
  state.logger.info('Storm advanced: ' + stormId);

  return updated;
}

export function dissipateStorm(
  state: WeatherForecastState,
  stormId: string,
): 'ok' | WeatherForecastError {
  const storm = state.storms.get(stormId);
  if (storm === undefined) {
    return 'storm-not-found';
  }

  state.storms.delete(stormId);
  state.logger.info('Storm manually dissipated: ' + stormId);

  return 'ok';
}

export function getCurrentWeather(
  state: WeatherForecastState,
  worldId: string,
): WeatherCondition | WeatherForecastError {
  const condition = state.currentWeather.get(worldId);
  if (condition === undefined) {
    return 'world-not-found';
  }

  return condition;
}

export function getSeasonalPattern(
  state: WeatherForecastState,
  worldId: string,
): SeasonalPattern | WeatherForecastError {
  const pattern = state.patterns.get(worldId);
  if (pattern === undefined) {
    return 'pattern-not-found';
  }

  return pattern;
}

export function getActiveStorms(state: WeatherForecastState, worldId: string): StormSystem[] {
  const now = state.clock.nowMicros();

  const storms = Array.from(state.storms.values()).filter(
    (s) => s.worldId === worldId && s.dissipatesAt > now,
  );

  return storms;
}

export function isStormAtLocation(
  state: WeatherForecastState,
  stormId: string,
  x: number,
  y: number,
): boolean | WeatherForecastError {
  const storm = state.storms.get(stormId);
  if (storm === undefined) {
    return 'storm-not-found';
  }

  const dx = x - storm.centerX;
  const dy = y - storm.centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance <= storm.radius;
}

export function updateStormIntensity(
  state: WeatherForecastState,
  stormId: string,
  newIntensity: number,
): 'ok' | WeatherForecastError {
  const storm = state.storms.get(stormId);
  if (storm === undefined) {
    return 'storm-not-found';
  }

  if (newIntensity < 0 || newIntensity > 1) {
    return 'invalid-intensity';
  }

  const updated: StormSystem = {
    ...storm,
    intensity: newIntensity,
  };

  state.storms.set(stormId, updated);
  state.logger.info('Storm intensity updated: ' + stormId);

  return 'ok';
}

export function getAllWeatherConditions(
  state: WeatherForecastState,
): Array<{ worldId: string; condition: WeatherCondition }> {
  const conditions: Array<{ worldId: string; condition: WeatherCondition }> = [];

  for (const [worldId, condition] of state.currentWeather) {
    conditions.push({ worldId, condition });
  }

  return conditions;
}

export function getForecastByWorld(
  state: WeatherForecastState,
  worldId: string,
): WeatherForecast | WeatherForecastError {
  const now = state.clock.nowMicros();

  for (const forecast of state.forecasts.values()) {
    if (forecast.worldId === worldId && forecast.validUntil > now) {
      return forecast;
    }
  }

  return 'forecast-not-found';
}

export function cleanupExpiredForecasts(state: WeatherForecastState): number {
  const now = state.clock.nowMicros();
  let removed = 0;

  for (const [forecastId, forecast] of state.forecasts) {
    if (forecast.validUntil <= now) {
      state.forecasts.delete(forecastId);
      removed++;
    }
  }

  if (removed > 0) {
    state.logger.info('Cleaned up ' + String(removed) + ' expired forecasts');
  }

  return removed;
}

export function cleanupDissipatedStorms(state: WeatherForecastState): number {
  const now = state.clock.nowMicros();
  let removed = 0;

  for (const [stormId, storm] of state.storms) {
    if (storm.dissipatesAt <= now) {
      state.storms.delete(stormId);
      removed++;
    }
  }

  if (removed > 0) {
    state.logger.info('Cleaned up ' + String(removed) + ' dissipated storms');
  }

  return removed;
}
