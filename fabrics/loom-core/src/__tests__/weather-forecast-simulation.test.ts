import { describe, expect, it } from 'vitest';
import {
  createWeatherForecastState,
  setCurrentWeather,
  setSeasonalPattern,
  generateForecast,
  trackStorm,
  getWeatherImpact,
} from '../weather-forecast.js';

describe('weather-forecast simulation', () => {
  it('simulates forecast generation with seasonal bias, storm tracking, and impact lookup', () => {
    let now = 1_000_000n;
    let id = 0;
    const state = createWeatherForecastState(
      { nowMicros: () => now },
      { nextId: () => 'w-' + String(++id) },
      { info: () => undefined, warn: () => undefined, error: () => undefined },
    );

    setCurrentWeather(state, 'earth', 'CLOUDY');
    setSeasonalPattern(
      state,
      'earth',
      'WINTER',
      now,
      now + 10_000_000n,
      'FROST',
      {
        CLEAR: 0.05,
        CLOUDY: 0.25,
        RAIN: 0.05,
        STORM: 0.05,
        BLIZZARD: 0.35,
        DROUGHT: 0,
        FOG: 0.15,
        SANDSTORM: 0,
        HEATWAVE: 0,
        FROST: 0.1,
      },
      -8,
    );

    const forecast = generateForecast(state, 'earth', 6);
    const storm = trackStorm(state, 'earth', 'BLIZZARD', 100, 200, 60, 0.8, 2, 1, 3);
    const impact = getWeatherImpact(state, 'BLIZZARD');

    expect(typeof forecast).toBe('object');
    if (typeof forecast === 'string') return;
    expect(forecast.nextConditions.length).toBeGreaterThan(0);
    expect(typeof storm).toBe('object');
    expect(typeof impact).toBe('object');
    if (typeof impact === 'string') return;
    expect(impact.movementSpeedModifier).toBeLessThan(1);
    expect(state.storms.size).toBe(1);
  });
});
