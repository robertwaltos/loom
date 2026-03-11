import { describe, it, expect, beforeEach } from 'vitest';
import {
  createWeatherForecastState,
  setCurrentWeather,
  generateForecast,
  trackStorm,
  setSeasonalPattern,
  getWeatherImpact,
  advanceWeather,
  getWeatherReport,
  getForecast,
  getStorm,
  advanceStorm,
  dissipateStorm,
  getCurrentWeather,
  getSeasonalPattern,
  getActiveStorms,
  isStormAtLocation,
  updateStormIntensity,
  getAllWeatherConditions,
  getForecastByWorld,
  cleanupExpiredForecasts,
  cleanupDissipatedStorms,
  type Clock,
  type IdGenerator,
  type Logger,
  type WeatherForecastState,
} from '../weather-forecast.js';

// --- Test Doubles ---

class TestClock implements Clock {
  private time = 1000000000000n;

  nowMicros(): bigint {
    return this.time;
  }

  advance(micros: bigint): void {
    this.time += micros;
  }
}

class TestIdGenerator implements IdGenerator {
  private counter = 0;

  nextId(): string {
    this.counter += 1;
    return 'id-' + String(this.counter);
  }
}

class TestLogger implements Logger {
  logs: string[] = [];

  info(message: string): void {
    this.logs.push('INFO: ' + message);
  }

  warn(message: string): void {
    this.logs.push('WARN: ' + message);
  }

  error(message: string): void {
    this.logs.push('ERROR: ' + message);
  }
}

// --- Helper Functions ---

function createTestState(): WeatherForecastState {
  return createWeatherForecastState(new TestClock(), new TestIdGenerator(), new TestLogger());
}

// --- Tests ---

describe('WeatherForecast', () => {
  let state: WeatherForecastState;

  beforeEach(() => {
    state = createTestState();
  });

  describe('createWeatherForecastState', () => {
    it('should create initial state', () => {
      expect(state.forecasts.size).toBe(0);
      expect(state.storms.size).toBe(0);
      expect(state.patterns.size).toBe(0);
      expect(state.currentWeather.size).toBe(0);
      expect(state.clock).toBeDefined();
      expect(state.idGen).toBeDefined();
      expect(state.logger).toBeDefined();
    });

    it('should accept custom ports', () => {
      const customClock = new TestClock();
      const customIdGen = new TestIdGenerator();
      const customLogger = new TestLogger();

      const custom = createWeatherForecastState(customClock, customIdGen, customLogger);

      expect(custom.clock).toBe(customClock);
      expect(custom.idGen).toBe(customIdGen);
      expect(custom.logger).toBe(customLogger);
    });
  });

  describe('setCurrentWeather', () => {
    it('should set weather condition', () => {
      const result = setCurrentWeather(state, 'world-1', 'RAIN');

      expect(result).toBe('ok');

      const current = getCurrentWeather(state, 'world-1');
      expect(current).toBe('RAIN');
    });

    it('should return error for invalid condition', () => {
      const result = setCurrentWeather(state, 'world-1', 'INVALID' as never);

      expect(result).toBe('invalid-condition');
    });

    it('should log weather change', () => {
      const logger = state.logger as TestLogger;
      setCurrentWeather(state, 'world-1', 'STORM');

      const hasLog = logger.logs.some((log) => log.includes('Set weather'));
      expect(hasLog).toBe(true);
    });

    it('should support all weather conditions', () => {
      setCurrentWeather(state, 'world-1', 'CLEAR');
      setCurrentWeather(state, 'world-2', 'CLOUDY');
      setCurrentWeather(state, 'world-3', 'RAIN');
      setCurrentWeather(state, 'world-4', 'STORM');
      setCurrentWeather(state, 'world-5', 'BLIZZARD');
      setCurrentWeather(state, 'world-6', 'DROUGHT');
      setCurrentWeather(state, 'world-7', 'FOG');
      setCurrentWeather(state, 'world-8', 'SANDSTORM');
      setCurrentWeather(state, 'world-9', 'HEATWAVE');
      setCurrentWeather(state, 'world-10', 'FROST');

      expect(getCurrentWeather(state, 'world-1')).toBe('CLEAR');
      expect(getCurrentWeather(state, 'world-10')).toBe('FROST');
    });
  });

  describe('generateForecast', () => {
    beforeEach(() => {
      setCurrentWeather(state, 'world-1', 'CLEAR');
    });

    it('should generate a forecast', () => {
      const result = generateForecast(state, 'world-1', 6);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.worldId).toBe('world-1');
      expect(result.forecastId).toBeDefined();
      expect(result.currentCondition).toBe('CLEAR');
      expect(result.nextConditions.length).toBeGreaterThan(0);
    });

    it('should return error for invalid hours', () => {
      const result = generateForecast(state, 'world-1', 0);

      expect(result).toBe('invalid-time-range');
    });

    it('should return error for too many hours', () => {
      const result = generateForecast(state, 'world-1', 25);

      expect(result).toBe('invalid-time-range');
    });

    it('should generate unique forecast IDs', () => {
      const forecast1 = generateForecast(state, 'world-1', 6);
      const forecast2 = generateForecast(state, 'world-1', 6);

      expect(typeof forecast1).not.toBe('string');
      expect(typeof forecast2).not.toBe('string');
      if (typeof forecast1 === 'string' || typeof forecast2 === 'string') return;

      expect(forecast1.forecastId).not.toBe(forecast2.forecastId);
    });

    it('should set valid until time', () => {
      const result = generateForecast(state, 'world-1', 6);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.validUntil).toBeGreaterThan(result.generatedAt);
    });

    it('should log forecast generation', () => {
      const logger = state.logger as TestLogger;
      generateForecast(state, 'world-1', 6);

      const hasLog = logger.logs.some((log) => log.includes('Generated forecast'));
      expect(hasLog).toBe(true);
    });

    it('should use default condition if not set', () => {
      const result = generateForecast(state, 'world-99', 6);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.currentCondition).toBe('CLEAR');
    });

    it('should include intensity for conditions', () => {
      const result = generateForecast(state, 'world-1', 6);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      const first = result.nextConditions[0];
      expect(first).toBeDefined();
      if (first === undefined) return;

      expect(first.intensity).toBeGreaterThan(0);
      expect(first.intensity).toBeLessThanOrEqual(1);
    });

    it('should respect seasonal patterns', () => {
      setSeasonalPattern(
        state,
        'world-1',
        'WINTER',
        1000000000000n,
        2000000000000n,
        'FROST',
        { FROST: 0.7, BLIZZARD: 0.2, CLOUDY: 0.1 } as never,
        -10,
      );

      const result = generateForecast(state, 'world-1', 6);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.nextConditions.length).toBeGreaterThan(0);
    });
  });

  describe('trackStorm', () => {
    it('should track a storm', () => {
      const result = trackStorm(state, 'world-1', 'THUNDERSTORM', 100, 200, 50, 0.8, 5, 10, 3);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.worldId).toBe('world-1');
      expect(result.type).toBe('THUNDERSTORM');
      expect(result.centerX).toBe(100);
      expect(result.centerY).toBe(200);
      expect(result.radius).toBe(50);
      expect(result.intensity).toBe(0.8);
      expect(result.movementX).toBe(5);
      expect(result.movementY).toBe(10);
    });

    it('should return error for invalid intensity', () => {
      const result = trackStorm(state, 'world-1', 'THUNDERSTORM', 100, 200, 50, 1.5, 5, 10, 3);

      expect(result).toBe('invalid-intensity');
    });

    it('should return error for invalid duration', () => {
      const result = trackStorm(state, 'world-1', 'THUNDERSTORM', 100, 200, 50, 0.8, 5, 10, 0);

      expect(result).toBe('invalid-time-range');
    });

    it('should log storm tracking', () => {
      const logger = state.logger as TestLogger;
      trackStorm(state, 'world-1', 'BLIZZARD', 0, 0, 100, 0.9, 0, 0, 5);

      const hasLog = logger.logs.some((log) => log.includes('Storm tracked'));
      expect(hasLog).toBe(true);
    });

    it('should support all storm types', () => {
      trackStorm(state, 'world-1', 'TROPICAL', 0, 0, 50, 0.5, 1, 1, 2);
      trackStorm(state, 'world-2', 'THUNDERSTORM', 0, 0, 30, 0.7, 2, 2, 2);
      trackStorm(state, 'world-3', 'BLIZZARD', 0, 0, 60, 0.9, 3, 3, 2);
      trackStorm(state, 'world-4', 'SANDSTORM', 0, 0, 40, 0.6, 4, 4, 2);
      trackStorm(state, 'world-5', 'TYPHOON', 0, 0, 80, 0.95, 5, 5, 2);

      expect(state.storms.size).toBe(5);
    });

    it('should set dissipation time', () => {
      const result = trackStorm(state, 'world-1', 'TROPICAL', 0, 0, 50, 0.5, 1, 1, 3);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.dissipatesAt).toBeGreaterThan(result.createdAt);
    });
  });

  describe('setSeasonalPattern', () => {
    it('should set seasonal pattern', () => {
      const result = setSeasonalPattern(
        state,
        'world-1',
        'SUMMER',
        1000000000000n,
        2000000000000n,
        'CLEAR',
        { CLEAR: 0.6, CLOUDY: 0.3, RAIN: 0.1 } as never,
        5,
      );

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.worldId).toBe('world-1');
      expect(result.season).toBe('SUMMER');
      expect(result.baseCondition).toBe('CLEAR');
      expect(result.temperatureModifier).toBe(5);
    });

    it('should return error for invalid time range', () => {
      const result = setSeasonalPattern(
        state,
        'world-1',
        'SUMMER',
        2000000000000n,
        1000000000000n,
        'CLEAR',
        {} as never,
        5,
      );

      expect(result).toBe('invalid-time-range');
    });

    it('should return error for invalid condition', () => {
      const result = setSeasonalPattern(
        state,
        'world-1',
        'SUMMER',
        1000000000000n,
        2000000000000n,
        'INVALID' as never,
        {} as never,
        5,
      );

      expect(result).toBe('invalid-condition');
    });

    it('should log pattern setting', () => {
      const logger = state.logger as TestLogger;
      setSeasonalPattern(
        state,
        'world-1',
        'AUTUMN',
        1000000000000n,
        2000000000000n,
        'CLOUDY',
        {} as never,
        0,
      );

      const hasLog = logger.logs.some((log) => log.includes('Set seasonal pattern'));
      expect(hasLog).toBe(true);
    });

    it('should support all seasons', () => {
      setSeasonalPattern(
        state,
        'world-1',
        'SPRING',
        1000000000000n,
        2000000000000n,
        'RAIN',
        {} as never,
        2,
      );
      setSeasonalPattern(
        state,
        'world-2',
        'SUMMER',
        1000000000000n,
        2000000000000n,
        'CLEAR',
        {} as never,
        8,
      );
      setSeasonalPattern(
        state,
        'world-3',
        'AUTUMN',
        1000000000000n,
        2000000000000n,
        'CLOUDY',
        {} as never,
        3,
      );
      setSeasonalPattern(
        state,
        'world-4',
        'WINTER',
        1000000000000n,
        2000000000000n,
        'FROST',
        {} as never,
        -5,
      );

      expect(state.patterns.size).toBe(4);
    });
  });

  describe('getWeatherImpact', () => {
    it('should get impact for CLEAR weather', () => {
      const result = getWeatherImpact(state, 'CLEAR');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.condition).toBe('CLEAR');
      expect(result.movementSpeedModifier).toBe(1.0);
      expect(result.visibilityModifier).toBe(1.0);
      expect(result.staminaDrainModifier).toBe(1.0);
      expect(result.damageModifier).toBe(1.0);
    });

    it('should get impact for STORM weather', () => {
      const result = getWeatherImpact(state, 'STORM');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.condition).toBe('STORM');
      expect(result.movementSpeedModifier).toBeLessThan(1.0);
      expect(result.visibilityModifier).toBeLessThan(1.0);
      expect(result.staminaDrainModifier).toBeGreaterThan(1.0);
    });

    it('should return error for invalid condition', () => {
      const result = getWeatherImpact(state, 'INVALID' as never);

      expect(result).toBe('invalid-condition');
    });

    it('should have impacts for all conditions', () => {
      const conditions = [
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
      ] as const;

      for (const cond of conditions) {
        const result = getWeatherImpact(state, cond);
        expect(typeof result).not.toBe('string');
        if (typeof result === 'string') continue;
        expect(result.condition).toBe(cond);
      }
    });

    it('should have severe impacts for BLIZZARD', () => {
      const result = getWeatherImpact(state, 'BLIZZARD');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.movementSpeedModifier).toBeLessThan(0.7);
      expect(result.visibilityModifier).toBeLessThan(0.5);
      expect(result.staminaDrainModifier).toBeGreaterThan(1.5);
    });

    it('should have visibility impact for FOG', () => {
      const result = getWeatherImpact(state, 'FOG');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.visibilityModifier).toBeLessThan(0.5);
    });
  });

  describe('advanceWeather', () => {
    beforeEach(() => {
      setCurrentWeather(state, 'world-1', 'CLEAR');
    });

    it('should advance weather', () => {
      const result = advanceWeather(state, 'world-1');

      expect(typeof result).toBe('string');
      if (typeof result !== 'string') return;

      const current = getCurrentWeather(state, 'world-1');
      expect(current).toBe(result);
    });

    it('should return error for non-existent world', () => {
      const result = advanceWeather(state, 'fake-world');

      expect(result).toBe('world-not-found');
    });

    it('should log weather advance', () => {
      const logger = state.logger as TestLogger;
      advanceWeather(state, 'world-1');

      const hasLog = logger.logs.some((log) => log.includes('Weather advanced'));
      expect(hasLog).toBe(true);
    });
  });

  describe('getWeatherReport', () => {
    beforeEach(() => {
      setCurrentWeather(state, 'world-1', 'RAIN');
    });

    it('should generate weather report', () => {
      const result = getWeatherReport(state, 'world-1');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.worldId).toBe('world-1');
      expect(result.currentCondition).toBe('RAIN');
      expect(result.currentIntensity).toBeGreaterThan(0);
      expect(result.activeStorms).toBe(0);
      expect(result.impactSummary).toBeDefined();
    });

    it('should return error for non-existent world', () => {
      const result = getWeatherReport(state, 'fake-world');

      expect(result).toBe('world-not-found');
    });

    it('should include active storm count', () => {
      trackStorm(state, 'world-1', 'THUNDERSTORM', 0, 0, 50, 0.8, 0, 0, 5);

      const result = getWeatherReport(state, 'world-1');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.activeStorms).toBe(1);
    });

    it('should include seasonal info', () => {
      setSeasonalPattern(
        state,
        'world-1',
        'SPRING',
        1000000000000n,
        2000000000000n,
        'RAIN',
        {} as never,
        2,
      );

      const result = getWeatherReport(state, 'world-1');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.seasonalInfo).toContain('SPRING');
    });
  });

  describe('getForecast', () => {
    it('should retrieve a forecast', () => {
      setCurrentWeather(state, 'world-1', 'CLEAR');
      const forecast = generateForecast(state, 'world-1', 6);
      expect(typeof forecast).not.toBe('string');
      if (typeof forecast === 'string') return;

      const result = getForecast(state, forecast.forecastId);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.forecastId).toBe(forecast.forecastId);
    });

    it('should return error for non-existent forecast', () => {
      const result = getForecast(state, 'fake-forecast');

      expect(result).toBe('forecast-not-found');
    });

    it('should return error for expired forecast', () => {
      const clock = state.clock as TestClock;
      setCurrentWeather(state, 'world-1', 'CLEAR');
      const forecast = generateForecast(state, 'world-1', 1);
      expect(typeof forecast).not.toBe('string');
      if (typeof forecast === 'string') return;

      clock.advance(5000000000n);

      const result = getForecast(state, forecast.forecastId);

      expect(result).toBe('forecast-expired');
    });
  });

  describe('getStorm', () => {
    it('should retrieve a storm', () => {
      const storm = trackStorm(state, 'world-1', 'TYPHOON', 0, 0, 100, 0.9, 1, 2, 5);
      expect(typeof storm).not.toBe('string');
      if (typeof storm === 'string') return;

      const result = getStorm(state, storm.stormId);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.stormId).toBe(storm.stormId);
    });

    it('should return error for non-existent storm', () => {
      const result = getStorm(state, 'fake-storm');

      expect(result).toBe('storm-not-found');
    });
  });

  describe('advanceStorm', () => {
    it('should advance storm position', () => {
      const storm = trackStorm(state, 'world-1', 'TROPICAL', 0, 0, 50, 0.8, 5, 10, 10);
      expect(typeof storm).not.toBe('string');
      if (typeof storm === 'string') return;

      const result = advanceStorm(state, storm.stormId, 2);

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.centerX).toBe(10);
      expect(result.centerY).toBe(20);
    });

    it('should return error for non-existent storm', () => {
      const result = advanceStorm(state, 'fake-storm', 1);

      expect(result).toBe('storm-not-found');
    });

    it('should dissipate expired storm', () => {
      const clock = state.clock as TestClock;
      const storm = trackStorm(state, 'world-1', 'THUNDERSTORM', 0, 0, 30, 0.7, 1, 1, 1);
      expect(typeof storm).not.toBe('string');
      if (typeof storm === 'string') return;

      clock.advance(5000000000n);

      const result = advanceStorm(state, storm.stormId, 1);

      expect(result).toBe('storm-not-found');
    });

    it('should log storm advance', () => {
      const logger = state.logger as TestLogger;
      const storm = trackStorm(state, 'world-1', 'BLIZZARD', 0, 0, 60, 0.9, 2, 3, 5);
      expect(typeof storm).not.toBe('string');
      if (typeof storm === 'string') return;

      advanceStorm(state, storm.stormId, 1);

      const hasLog = logger.logs.some((log) => log.includes('Storm advanced'));
      expect(hasLog).toBe(true);
    });
  });

  describe('dissipateStorm', () => {
    it('should dissipate a storm', () => {
      const storm = trackStorm(state, 'world-1', 'SANDSTORM', 0, 0, 40, 0.6, 0, 0, 3);
      expect(typeof storm).not.toBe('string');
      if (typeof storm === 'string') return;

      const result = dissipateStorm(state, storm.stormId);

      expect(result).toBe('ok');

      const check = getStorm(state, storm.stormId);
      expect(check).toBe('storm-not-found');
    });

    it('should return error for non-existent storm', () => {
      const result = dissipateStorm(state, 'fake-storm');

      expect(result).toBe('storm-not-found');
    });

    it('should log dissipation', () => {
      const logger = state.logger as TestLogger;
      const storm = trackStorm(state, 'world-1', 'TROPICAL', 0, 0, 50, 0.5, 0, 0, 2);
      expect(typeof storm).not.toBe('string');
      if (typeof storm === 'string') return;

      dissipateStorm(state, storm.stormId);

      const hasLog = logger.logs.some((log) => log.includes('Storm manually dissipated'));
      expect(hasLog).toBe(true);
    });
  });

  describe('getCurrentWeather', () => {
    it('should get current weather', () => {
      setCurrentWeather(state, 'world-1', 'BLIZZARD');

      const result = getCurrentWeather(state, 'world-1');

      expect(result).toBe('BLIZZARD');
    });

    it('should return error for non-existent world', () => {
      const result = getCurrentWeather(state, 'fake-world');

      expect(result).toBe('world-not-found');
    });
  });

  describe('getSeasonalPattern', () => {
    it('should get seasonal pattern', () => {
      setSeasonalPattern(
        state,
        'world-1',
        'WINTER',
        1000000000000n,
        2000000000000n,
        'FROST',
        {} as never,
        -8,
      );

      const result = getSeasonalPattern(state, 'world-1');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.worldId).toBe('world-1');
      expect(result.season).toBe('WINTER');
    });

    it('should return error for non-existent pattern', () => {
      const result = getSeasonalPattern(state, 'fake-world');

      expect(result).toBe('pattern-not-found');
    });
  });

  describe('getActiveStorms', () => {
    it('should get active storms for world', () => {
      trackStorm(state, 'world-1', 'THUNDERSTORM', 0, 0, 30, 0.7, 1, 1, 5);
      trackStorm(state, 'world-1', 'BLIZZARD', 100, 100, 40, 0.8, 2, 2, 5);
      trackStorm(state, 'world-2', 'TROPICAL', 50, 50, 60, 0.9, 3, 3, 5);

      const result = getActiveStorms(state, 'world-1');

      expect(result.length).toBe(2);
    });

    it('should return empty for no storms', () => {
      const result = getActiveStorms(state, 'world-1');

      expect(result.length).toBe(0);
    });

    it('should filter expired storms', () => {
      const clock = state.clock as TestClock;
      trackStorm(state, 'world-1', 'SANDSTORM', 0, 0, 40, 0.6, 0, 0, 1);

      clock.advance(5000000000n);

      const result = getActiveStorms(state, 'world-1');

      expect(result.length).toBe(0);
    });
  });

  describe('isStormAtLocation', () => {
    it('should detect location in storm', () => {
      const storm = trackStorm(state, 'world-1', 'TYPHOON', 100, 100, 50, 0.9, 0, 0, 5);
      expect(typeof storm).not.toBe('string');
      if (typeof storm === 'string') return;

      const result = isStormAtLocation(state, storm.stormId, 110, 110);

      expect(result).toBe(true);
    });

    it('should detect location outside storm', () => {
      const storm = trackStorm(state, 'world-1', 'TROPICAL', 100, 100, 50, 0.8, 0, 0, 5);
      expect(typeof storm).not.toBe('string');
      if (typeof storm === 'string') return;

      const result = isStormAtLocation(state, storm.stormId, 200, 200);

      expect(result).toBe(false);
    });

    it('should return error for non-existent storm', () => {
      const result = isStormAtLocation(state, 'fake-storm', 0, 0);

      expect(result).toBe('storm-not-found');
    });

    it('should detect edge of storm', () => {
      const storm = trackStorm(state, 'world-1', 'BLIZZARD', 0, 0, 50, 0.9, 0, 0, 5);
      expect(typeof storm).not.toBe('string');
      if (typeof storm === 'string') return;

      const result = isStormAtLocation(state, storm.stormId, 50, 0);

      expect(result).toBe(true);
    });
  });

  describe('updateStormIntensity', () => {
    it('should update storm intensity', () => {
      const storm = trackStorm(state, 'world-1', 'THUNDERSTORM', 0, 0, 30, 0.5, 0, 0, 5);
      expect(typeof storm).not.toBe('string');
      if (typeof storm === 'string') return;

      const result = updateStormIntensity(state, storm.stormId, 0.9);

      expect(result).toBe('ok');

      const updated = getStorm(state, storm.stormId);
      expect(typeof updated).not.toBe('string');
      if (typeof updated === 'string') return;

      expect(updated.intensity).toBe(0.9);
    });

    it('should return error for non-existent storm', () => {
      const result = updateStormIntensity(state, 'fake-storm', 0.8);

      expect(result).toBe('storm-not-found');
    });

    it('should return error for invalid intensity', () => {
      const storm = trackStorm(state, 'world-1', 'TROPICAL', 0, 0, 50, 0.8, 0, 0, 5);
      expect(typeof storm).not.toBe('string');
      if (typeof storm === 'string') return;

      const result = updateStormIntensity(state, storm.stormId, 1.5);

      expect(result).toBe('invalid-intensity');
    });

    it('should log intensity update', () => {
      const logger = state.logger as TestLogger;
      const storm = trackStorm(state, 'world-1', 'SANDSTORM', 0, 0, 40, 0.6, 0, 0, 3);
      expect(typeof storm).not.toBe('string');
      if (typeof storm === 'string') return;

      updateStormIntensity(state, storm.stormId, 0.7);

      const hasLog = logger.logs.some((log) => log.includes('Storm intensity updated'));
      expect(hasLog).toBe(true);
    });
  });

  describe('getAllWeatherConditions', () => {
    it('should get all weather conditions', () => {
      setCurrentWeather(state, 'world-1', 'CLEAR');
      setCurrentWeather(state, 'world-2', 'RAIN');
      setCurrentWeather(state, 'world-3', 'STORM');

      const result = getAllWeatherConditions(state);

      expect(result.length).toBe(3);
      expect(result.some((c) => c.worldId === 'world-1')).toBe(true);
      expect(result.some((c) => c.worldId === 'world-2')).toBe(true);
      expect(result.some((c) => c.worldId === 'world-3')).toBe(true);
    });

    it('should return empty for no weather', () => {
      const result = getAllWeatherConditions(state);

      expect(result.length).toBe(0);
    });
  });

  describe('getForecastByWorld', () => {
    it('should get forecast for world', () => {
      setCurrentWeather(state, 'world-1', 'CLEAR');
      generateForecast(state, 'world-1', 6);

      const result = getForecastByWorld(state, 'world-1');

      expect(typeof result).not.toBe('string');
      if (typeof result === 'string') return;

      expect(result.worldId).toBe('world-1');
    });

    it('should return error for no forecast', () => {
      const result = getForecastByWorld(state, 'fake-world');

      expect(result).toBe('forecast-not-found');
    });

    it('should skip expired forecasts', () => {
      const clock = state.clock as TestClock;
      setCurrentWeather(state, 'world-1', 'CLEAR');
      generateForecast(state, 'world-1', 1);

      clock.advance(5000000000n);

      const result = getForecastByWorld(state, 'world-1');

      expect(result).toBe('forecast-not-found');
    });
  });

  describe('cleanupExpiredForecasts', () => {
    it('should clean up expired forecasts', () => {
      const clock = state.clock as TestClock;
      setCurrentWeather(state, 'world-1', 'CLEAR');
      generateForecast(state, 'world-1', 1);
      generateForecast(state, 'world-1', 1);

      clock.advance(5000000000n);

      const result = cleanupExpiredForecasts(state);

      expect(result).toBe(2);
      expect(state.forecasts.size).toBe(0);
    });

    it('should return zero for no expired forecasts', () => {
      setCurrentWeather(state, 'world-1', 'CLEAR');
      generateForecast(state, 'world-1', 6);

      const result = cleanupExpiredForecasts(state);

      expect(result).toBe(0);
    });

    it('should log cleanup', () => {
      const clock = state.clock as TestClock;
      const logger = state.logger as TestLogger;
      setCurrentWeather(state, 'world-1', 'CLEAR');
      generateForecast(state, 'world-1', 1);

      clock.advance(5000000000n);
      cleanupExpiredForecasts(state);

      const hasLog = logger.logs.some((log) => log.includes('Cleaned up'));
      expect(hasLog).toBe(true);
    });
  });

  describe('cleanupDissipatedStorms', () => {
    it('should clean up dissipated storms', () => {
      const clock = state.clock as TestClock;
      trackStorm(state, 'world-1', 'TROPICAL', 0, 0, 50, 0.8, 0, 0, 1);
      trackStorm(state, 'world-2', 'BLIZZARD', 0, 0, 60, 0.9, 0, 0, 1);

      clock.advance(5000000000n);

      const result = cleanupDissipatedStorms(state);

      expect(result).toBe(2);
      expect(state.storms.size).toBe(0);
    });

    it('should return zero for no dissipated storms', () => {
      trackStorm(state, 'world-1', 'THUNDERSTORM', 0, 0, 30, 0.7, 0, 0, 10);

      const result = cleanupDissipatedStorms(state);

      expect(result).toBe(0);
    });

    it('should log cleanup', () => {
      const clock = state.clock as TestClock;
      const logger = state.logger as TestLogger;
      trackStorm(state, 'world-1', 'SANDSTORM', 0, 0, 40, 0.6, 0, 0, 1);

      clock.advance(5000000000n);
      cleanupDissipatedStorms(state);

      const hasLog = logger.logs.some((log) => log.includes('Cleaned up'));
      expect(hasLog).toBe(true);
    });
  });
});
