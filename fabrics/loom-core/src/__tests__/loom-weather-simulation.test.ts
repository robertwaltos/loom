import { describe, expect, it } from 'vitest';
import { createLoomWeatherSystem } from '../loom-weather.js';

describe('loom-weather simulation', () => {
  it('simulates weather registration, transitions, effects, and reporting', () => {
    let now = 1_000_000_000n;
    let id = 0;
    const weather = createLoomWeatherSystem({
      clock: { nowUs: () => (now += 1_000_000n) },
      idGen: { generate: () => `weather-${++id}` },
      logger: {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    });

    weather.registerWorld('earth');
    const rain = weather.startWeather('earth', 'RAIN', 0.7, 3_600_000_000n, 60);
    const storm = weather.startWeather('earth', 'STORM', 0.9, 1_800_000_000n, 90);
    if (typeof rain === 'string' || typeof storm === 'string') throw new Error('expected weather');

    const effects = weather.computeEffects(storm.weatherId);
    const report = weather.getWeatherReport('earth');

    expect(effects.some((effect) => effect.type === 'VISIBILITY_REDUCTION')).toBe(true);
    expect(typeof report).toBe('object');
    if (typeof report === 'object') {
      expect(report.dominantType).toBe('STORM');
      expect(report.currentConditions).toHaveLength(2);
    }
  });
});
