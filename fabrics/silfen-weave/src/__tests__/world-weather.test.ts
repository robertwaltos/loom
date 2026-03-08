import { describe, it, expect } from 'vitest';
import { createWorldWeatherEngine } from '../world-weather.js';
import type { WorldWeatherDeps } from '../world-weather.js';

function createDeps(startTime = 1000): WorldWeatherDeps {
  let time = startTime;
  let id = 0;
  return {
    clock: { nowMicroseconds: () => time++ },
    idGenerator: { next: () => 'ww-' + String(id++) },
  };
}

function createTimedDeps(timeFn: () => number): WorldWeatherDeps {
  let id = 0;
  return {
    clock: { nowMicroseconds: timeFn },
    idGenerator: { next: () => 'ww-' + String(id++) },
  };
}

const HOUR = 3_600_000_000;

describe('WorldWeatherEngine — setWeather', () => {
  it('creates a weather condition for a world', () => {
    const engine = createWorldWeatherEngine(createDeps());
    const cond = engine.setWeather({
      worldId: 'terra',
      weatherType: 'rain',
      severity: 'moderate',
      durationMicro: 2 * HOUR,
    });
    expect(cond.conditionId).toBe('ww-0');
    expect(cond.worldId).toBe('terra');
    expect(cond.weatherType).toBe('rain');
    expect(cond.severity).toBe('moderate');
    expect(cond.expiresAt).toBeGreaterThan(cond.startedAt);
  });

  it('records multiple conditions for a world', () => {
    const engine = createWorldWeatherEngine(createDeps());
    engine.setWeather({ worldId: 'terra', weatherType: 'rain', severity: 'mild', durationMicro: HOUR });
    engine.setWeather({ worldId: 'terra', weatherType: 'storm', severity: 'severe', durationMicro: HOUR });
    expect(engine.getHistory('terra')).toHaveLength(2);
  });
});

describe('WorldWeatherEngine — getCurrent', () => {
  it('returns current active weather condition', () => {
    const engine = createWorldWeatherEngine(createDeps(100));
    engine.setWeather({ worldId: 'terra', weatherType: 'fog', severity: 'mild', durationMicro: HOUR });
    const current = engine.getCurrent('terra');
    expect(current).toBeDefined();
    expect(current?.weatherType).toBe('fog');
  });

  it('returns undefined for world with no weather', () => {
    const engine = createWorldWeatherEngine(createDeps());
    expect(engine.getCurrent('empty')).toBeUndefined();
  });

  it('returns undefined when all conditions expired', () => {
    let time = 100;
    const engine = createWorldWeatherEngine(createTimedDeps(() => time));
    engine.setWeather({ worldId: 'terra', weatherType: 'rain', severity: 'mild', durationMicro: 1000 });
    time = 200_000;
    expect(engine.getCurrent('terra')).toBeUndefined();
  });
});

describe('WorldWeatherEngine — clearExpired', () => {
  it('removes expired conditions and returns count', () => {
    let time = 100;
    const engine = createWorldWeatherEngine(createTimedDeps(() => time));
    engine.setWeather({ worldId: 'terra', weatherType: 'rain', severity: 'mild', durationMicro: 500 });
    engine.setWeather({ worldId: 'terra', weatherType: 'storm', severity: 'severe', durationMicro: HOUR });
    time = 1000;
    const cleared = engine.clearExpired('terra');
    expect(cleared).toBe(1);
    expect(engine.getHistory('terra')).toHaveLength(1);
  });

  it('returns zero when nothing to clear', () => {
    const engine = createWorldWeatherEngine(createDeps());
    expect(engine.clearExpired('missing')).toBe(0);
  });
});

describe('WorldWeatherEngine — getSnapshot / getStats', () => {
  it('returns snapshot for a world', () => {
    const engine = createWorldWeatherEngine(createDeps(100));
    engine.setWeather({ worldId: 'terra', weatherType: 'snow', severity: 'extreme', durationMicro: HOUR });
    const snap = engine.getSnapshot('terra');
    expect(snap.worldId).toBe('terra');
    expect(snap.current).toBeDefined();
    expect(snap.historyCount).toBe(1);
  });

  it('returns empty snapshot for unknown world', () => {
    const engine = createWorldWeatherEngine(createDeps());
    const snap = engine.getSnapshot('void');
    expect(snap.current).toBeUndefined();
    expect(snap.historyCount).toBe(0);
  });

  it('reports overall statistics', () => {
    const engine = createWorldWeatherEngine(createDeps(100));
    engine.setWeather({ worldId: 'terra', weatherType: 'rain', severity: 'mild', durationMicro: HOUR });
    engine.setWeather({ worldId: 'mars', weatherType: 'dust', severity: 'severe', durationMicro: HOUR });
    const stats = engine.getStats();
    expect(stats.trackedWorlds).toBe(2);
    expect(stats.activeConditions).toBe(2);
    expect(stats.totalConditionsRecorded).toBe(2);
  });
});
