/**
 * Loom Weather System Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createLoomWeatherSystem,
  type LoomWeatherSystem,
  type WeatherError,
  type LoomWeatherType,
} from '../loom-weather.js';

class TestClock {
  private currentUs = 1_000_000_000n;
  nowUs(): bigint {
    return this.currentUs;
  }
  advance(deltaUs: bigint): void {
    this.currentUs = this.currentUs + deltaUs;
  }
}

class TestIdGenerator {
  private counter = 0;
  generate(): string {
    this.counter += 1;
    return 'id-' + String(this.counter);
  }
}

class TestLogger {
  debug(_msg: string): void {}
  info(_msg: string): void {}
  warn(_msg: string): void {}
  error(_msg: string): void {}
}

function makeDeps() {
  return { clock: new TestClock(), idGen: new TestIdGenerator(), logger: new TestLogger() };
}

describe('LoomWeather — registerWorld', () => {
  let weather: LoomWeatherSystem;

  beforeEach(() => {
    weather = createLoomWeatherSystem(makeDeps());
  });

  it('registers a new world successfully', () => {
    expect(weather.registerWorld('world-1')).toEqual({ success: true });
  });

  it('returns already-registered when registering same world twice', () => {
    weather.registerWorld('world-1');
    const result = weather.registerWorld('world-1');
    expect(result).toEqual({ success: false, error: 'already-registered' satisfies WeatherError });
  });
});

describe('LoomWeather — startWeather', () => {
  let weather: LoomWeatherSystem;

  beforeEach(() => {
    weather = createLoomWeatherSystem(makeDeps());
    weather.registerWorld('world-1');
  });

  it('starts a weather condition successfully', () => {
    const result = weather.startWeather('world-1', 'RAIN', 0.6, 3600_000_000n, 50);
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') return;
    expect(result.type).toBe('RAIN');
    expect(result.intensity).toBe(0.6);
    expect(result.active).toBe(true);
  });

  it('returns world-not-found for unregistered world', () => {
    const result = weather.startWeather('ghost', 'STORM', 0.8, 1000n, 30);
    expect(result).toBe('world-not-found' satisfies WeatherError);
  });

  it('returns invalid-intensity when intensity < 0', () => {
    const result = weather.startWeather('world-1', 'FOG', -0.1, 1000n, 20);
    expect(result).toBe('invalid-intensity' satisfies WeatherError);
  });

  it('returns invalid-intensity when intensity > 1', () => {
    const result = weather.startWeather('world-1', 'STORM', 1.1, 1000n, 20);
    expect(result).toBe('invalid-intensity' satisfies WeatherError);
  });

  it('returns invalid-duration when durationUs < 1', () => {
    const result = weather.startWeather('world-1', 'CLEAR', 0.5, 0n, 20);
    expect(result).toBe('invalid-duration' satisfies WeatherError);
  });

  it('allows intensity of exactly 0 and 1', () => {
    const r1 = weather.startWeather('world-1', 'CLEAR', 0, 1000n, 10);
    const r2 = weather.startWeather('world-1', 'STORM', 1, 1000n, 20);
    expect(typeof r1).not.toBe('string');
    expect(typeof r2).not.toBe('string');
  });
});

describe('LoomWeather — endWeather', () => {
  let weather: LoomWeatherSystem;

  beforeEach(() => {
    weather = createLoomWeatherSystem(makeDeps());
    weather.registerWorld('world-1');
  });

  it('ends an active weather condition', () => {
    const cond = weather.startWeather('world-1', 'RAIN', 0.5, 1000n, 30);
    if (typeof cond === 'string') return;
    const result = weather.endWeather(cond.weatherId);
    expect(result).toEqual({ success: true });
  });

  it('condition is no longer active after endWeather', () => {
    const cond = weather.startWeather('world-1', 'FOG', 0.7, 1000n, 40);
    if (typeof cond === 'string') return;
    weather.endWeather(cond.weatherId);
    const active = weather.getActiveWeather('world-1');
    expect(active.find((c) => c.weatherId === cond.weatherId)).toBeUndefined();
  });

  it('returns weather-not-found for unknown weatherId', () => {
    const result = weather.endWeather('ghost');
    expect(result).toEqual({ success: false, error: 'weather-not-found' satisfies WeatherError });
  });
});

describe('LoomWeather — getActiveWeather and getWeatherReport', () => {
  let weather: LoomWeatherSystem;

  beforeEach(() => {
    weather = createLoomWeatherSystem(makeDeps());
    weather.registerWorld('world-1');
  });

  it('getActiveWeather returns only active conditions', () => {
    const c1 = weather.startWeather('world-1', 'RAIN', 0.6, 1000n, 50);
    const c2 = weather.startWeather('world-1', 'FOG', 0.4, 1000n, 30);
    if (typeof c1 === 'string' || typeof c2 === 'string') return;
    weather.endWeather(c1.weatherId);
    const active = weather.getActiveWeather('world-1');
    expect(active).toHaveLength(1);
    expect(active[0]?.weatherId).toBe(c2.weatherId);
  });

  it('getWeatherReport returns world-not-found for unknown world', () => {
    const result = weather.getWeatherReport('ghost');
    expect(result).toBe('world-not-found' satisfies WeatherError);
  });

  it('dominantType is type with highest intensity sum', () => {
    weather.startWeather('world-1', 'RAIN', 0.3, 1000n, 50);
    weather.startWeather('world-1', 'STORM', 0.9, 1000n, 30);
    const report = weather.getWeatherReport('world-1');
    if (typeof report === 'string') return;
    expect(report.dominantType).toBe('STORM');
  });

  it('dominantType is null when no active conditions', () => {
    const report = weather.getWeatherReport('world-1');
    if (typeof report === 'string') return;
    expect(report.dominantType).toBeNull();
  });

  it('averageIntensity is 0 when no active conditions', () => {
    const report = weather.getWeatherReport('world-1');
    if (typeof report === 'string') return;
    expect(report.averageIntensity).toBe(0);
  });
});

describe('LoomWeather — computeEffects', () => {
  let weather: LoomWeatherSystem;

  beforeEach(() => {
    weather = createLoomWeatherSystem(makeDeps());
    weather.registerWorld('world-1');
  });

  it('STORM produces 3 effects', () => {
    const cond = weather.startWeather('world-1', 'STORM', 0.8, 1000n, 50);
    if (typeof cond === 'string') return;
    const effects = weather.computeEffects(cond.weatherId);
    expect(effects).toHaveLength(3);
  });

  it('STORM effects include VISIBILITY_REDUCTION', () => {
    const cond = weather.startWeather('world-1', 'STORM', 0.8, 1000n, 50);
    if (typeof cond === 'string') return;
    const effects = weather.computeEffects(cond.weatherId);
    expect(effects.some((e) => e.type === 'VISIBILITY_REDUCTION')).toBe(true);
  });

  it('RAIN produces HARVEST_BONUS and MOVEMENT_PENALTY', () => {
    const cond = weather.startWeather('world-1', 'RAIN', 0.5, 1000n, 40);
    if (typeof cond === 'string') return;
    const effects = weather.computeEffects(cond.weatherId);
    expect(effects.some((e) => e.type === 'HARVEST_BONUS')).toBe(true);
    expect(effects.some((e) => e.type === 'MOVEMENT_PENALTY')).toBe(true);
  });

  it('BLIZZARD produces VISIBILITY_REDUCTION with magnitude 0.9', () => {
    const cond = weather.startWeather('world-1', 'BLIZZARD', 1.0, 1000n, 60);
    if (typeof cond === 'string') return;
    const effects = weather.computeEffects(cond.weatherId);
    const vis = effects.find((e) => e.type === 'VISIBILITY_REDUCTION');
    expect(vis?.magnitude).toBe(0.9);
  });

  it('DROUGHT produces HARVEST_PENALTY', () => {
    const cond = weather.startWeather('world-1', 'DROUGHT', 0.6, 1000n, 70);
    if (typeof cond === 'string') return;
    const effects = weather.computeEffects(cond.weatherId);
    expect(effects.some((e) => e.type === 'HARVEST_PENALTY')).toBe(true);
  });

  it('CLEAR produces no effects', () => {
    const cond = weather.startWeather('world-1', 'CLEAR', 1.0, 1000n, 100);
    if (typeof cond === 'string') return;
    expect(weather.computeEffects(cond.weatherId)).toHaveLength(0);
  });

  it('CLOUDY produces no effects', () => {
    const cond = weather.startWeather('world-1', 'CLOUDY', 0.5, 1000n, 50);
    if (typeof cond === 'string') return;
    expect(weather.computeEffects(cond.weatherId)).toHaveLength(0);
  });

  it('FOG produces VISIBILITY_REDUCTION', () => {
    const cond = weather.startWeather('world-1', 'FOG', 0.7, 1000n, 30);
    if (typeof cond === 'string') return;
    const effects = weather.computeEffects(cond.weatherId);
    expect(effects[0]?.type).toBe('VISIBILITY_REDUCTION');
  });

  it('returns empty array for unknown weatherId', () => {
    expect(weather.computeEffects('ghost')).toHaveLength(0);
  });
});

describe('LoomWeather — getWeatherHistory', () => {
  let weather: LoomWeatherSystem;

  beforeEach(() => {
    weather = createLoomWeatherSystem(makeDeps());
    weather.registerWorld('world-1');
  });

  it('returns history including inactive conditions', () => {
    const c1 = weather.startWeather('world-1', 'RAIN', 0.5, 1000n, 50);
    if (typeof c1 === 'string') return;
    weather.endWeather(c1.weatherId);
    const history = weather.getWeatherHistory('world-1', 10);
    expect(history).toHaveLength(1);
  });

  it('respects the limit parameter', () => {
    const types: LoomWeatherType[] = ['RAIN', 'FOG', 'STORM', 'CLEAR', 'DROUGHT'];
    for (const t of types) {
      weather.startWeather('world-1', t, 0.5, 1000n, 30);
    }
    const history = weather.getWeatherHistory('world-1', 3);
    expect(history).toHaveLength(3);
  });
});
