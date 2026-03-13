import { describe, expect, it } from 'vitest';
import { createWeatherSystem } from '../weather-system.js';

describe('weather-system simulation', () => {
  it('simulates seasonal weather evolution and transition stats across repeated ticks', () => {
    const weather = createWeatherSystem();
    const input = {
      biome: 'VOLCANIC',
      season: 2,
      altitude: 0.8,
      stellarActivity: 0.7,
      seed: 42,
    };

    const initial = weather.initializeWeather('loc-1', input);
    let current = initial;
    for (let i = 0; i < 8; i++) {
      current = weather.tickWeather('loc-1', current.durationMs + 1, { ...input, seed: 42 + i }) ?? current;
    }

    const stats = weather.getStats();
    const effects = weather.getEffects(current.currentWeather);

    expect(stats.totalTransitions).toBeGreaterThan(0);
    expect(stats.currentStatesCount).toBe(1);
    expect(effects.visibilityMod).toBeGreaterThan(0);
    expect(weather.getSeasonalPattern(2).season).toBeDefined();
  });
});
