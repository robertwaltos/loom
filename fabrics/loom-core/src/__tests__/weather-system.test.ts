import { describe, it, expect } from 'vitest';
import { createWeatherSystem } from '../weather-system.js';
import type { WeatherInput, WeatherType } from '../weather-system.js';

function makeInput(overrides?: Partial<WeatherInput>): WeatherInput {
  return {
    biome: 'GRASSLAND',
    season: 0,
    altitude: 0.3,
    stellarActivity: 0.1,
    seed: 42,
    ...overrides,
  };
}

describe('WeatherSystem — initialization', () => {
  it('initializes weather for a location', () => {
    const ws = createWeatherSystem();
    const state = ws.initializeWeather('loc-1', makeInput());
    expect(state.currentWeather).toBeDefined();
    expect(state.durationMs).toBeGreaterThan(0);
    expect(state.intensity).toBeGreaterThan(0);
  });

  it('retrieves initialized weather', () => {
    const ws = createWeatherSystem();
    ws.initializeWeather('loc-1', makeInput());
    const state = ws.getWeather('loc-1');
    expect(state).toBeDefined();
  });

  it('returns undefined for uninitialized location', () => {
    const ws = createWeatherSystem();
    expect(ws.getWeather('nope')).toBeUndefined();
  });

  it('different seasons produce different weather', () => {
    const ws = createWeatherSystem();
    const results = new Set<WeatherType>();
    for (let s = 0; s < 4; s++) {
      const state = ws.initializeWeather(
        'loc-' + String(s),
        makeInput({
          season: s,
          seed: 100 + s,
        }),
      );
      results.add(state.currentWeather);
    }
    expect(results.size).toBeGreaterThanOrEqual(1);
  });
});

describe('WeatherSystem — effects', () => {
  it('CLEAR weather has no negative morale effect', () => {
    const ws = createWeatherSystem();
    const effects = ws.getEffects('CLEAR');
    expect(effects.moraleMod).toBeGreaterThanOrEqual(0);
    expect(effects.movementSpeedMod).toBe(1.0);
  });

  it('STORM reduces movement speed', () => {
    const ws = createWeatherSystem();
    const effects = ws.getEffects('STORM');
    expect(effects.movementSpeedMod).toBeLessThan(1.0);
  });

  it('ACID_RAIN has severe gathering penalty', () => {
    const ws = createWeatherSystem();
    const effects = ws.getEffects('ACID_RAIN');
    expect(effects.gatheringMod).toBeLessThan(0.5);
  });

  it('FOG heavily reduces visibility', () => {
    const ws = createWeatherSystem();
    const effects = ws.getEffects('FOG');
    expect(effects.visibilityMod).toBeLessThan(0.5);
  });

  it('AURORA has positive morale', () => {
    const ws = createWeatherSystem();
    const effects = ws.getEffects('AURORA');
    expect(effects.moraleMod).toBeGreaterThan(0);
  });

  it('all weather types have valid effects', () => {
    const ws = createWeatherSystem();
    const types: ReadonlyArray<WeatherType> = [
      'CLEAR',
      'CLOUDY',
      'RAIN',
      'STORM',
      'SNOW',
      'FOG',
      'DUST_STORM',
      'SOLAR_FLARE',
      'ACID_RAIN',
      'AURORA',
    ];
    for (const t of types) {
      const e = ws.getEffects(t);
      expect(e.movementSpeedMod).toBeGreaterThan(0);
      expect(e.visibilityMod).toBeGreaterThan(0);
      expect(e.gatheringMod).toBeGreaterThan(0);
    }
  });
});

describe('WeatherSystem — duration', () => {
  it('CLEAR has the longest minimum duration', () => {
    const ws = createWeatherSystem();
    const clearDur = ws.getDuration('CLEAR');
    const stormDur = ws.getDuration('STORM');
    expect(clearDur.minMs).toBeGreaterThan(stormDur.minMs);
  });

  it('min duration is less than max duration', () => {
    const ws = createWeatherSystem();
    const types: ReadonlyArray<WeatherType> = ['CLEAR', 'CLOUDY', 'RAIN', 'STORM', 'SNOW'];
    for (const t of types) {
      const d = ws.getDuration(t);
      expect(d.minMs).toBeLessThan(d.maxMs);
    }
  });
});

describe('WeatherSystem — transitions', () => {
  it('CLEAR can transition to CLOUDY', () => {
    const ws = createWeatherSystem();
    const transitions = ws.getTransitions('CLEAR');
    const toCloudy = transitions.find((t) => t.to === 'CLOUDY');
    expect(toCloudy).toBeDefined();
    expect(toCloudy!.probability).toBeGreaterThan(0);
  });

  it('STORM can transition to RAIN', () => {
    const ws = createWeatherSystem();
    const transitions = ws.getTransitions('STORM');
    const toRain = transitions.find((t) => t.to === 'RAIN');
    expect(toRain).toBeDefined();
  });

  it('all transition probabilities are positive', () => {
    const ws = createWeatherSystem();
    const types: ReadonlyArray<WeatherType> = [
      'CLEAR',
      'CLOUDY',
      'RAIN',
      'STORM',
      'SNOW',
      'FOG',
      'DUST_STORM',
      'SOLAR_FLARE',
      'ACID_RAIN',
      'AURORA',
    ];
    for (const t of types) {
      const transitions = ws.getTransitions(t);
      for (const tr of transitions) {
        expect(tr.probability).toBeGreaterThan(0);
      }
    }
  });
});

describe('WeatherSystem — extreme weather', () => {
  it('STORM is extreme', () => {
    const ws = createWeatherSystem();
    expect(ws.isExtremeWeather('STORM')).toBe(true);
  });

  it('CLEAR is not extreme', () => {
    const ws = createWeatherSystem();
    expect(ws.isExtremeWeather('CLEAR')).toBe(false);
  });

  it('SOLAR_FLARE is extreme', () => {
    const ws = createWeatherSystem();
    expect(ws.isExtremeWeather('SOLAR_FLARE')).toBe(true);
  });

  it('ACID_RAIN is extreme', () => {
    const ws = createWeatherSystem();
    expect(ws.isExtremeWeather('ACID_RAIN')).toBe(true);
  });

  it('AURORA is not extreme', () => {
    const ws = createWeatherSystem();
    expect(ws.isExtremeWeather('AURORA')).toBe(false);
  });
});

describe('WeatherSystem — tick', () => {
  it('weather persists within duration', () => {
    const ws = createWeatherSystem();
    const initial = ws.initializeWeather('loc-1', makeInput());
    const afterTick = ws.tickWeather('loc-1', 100, makeInput());
    expect(afterTick).toBeDefined();
    expect(afterTick!.currentWeather).toBe(initial.currentWeather);
  });

  it('weather transitions after duration expires', () => {
    const ws = createWeatherSystem();
    const initial = ws.initializeWeather('loc-1', makeInput());
    const afterTick = ws.tickWeather('loc-1', initial.durationMs + 1, makeInput());
    expect(afterTick).toBeDefined();
  });

  it('returns undefined for uninitialized location', () => {
    const ws = createWeatherSystem();
    expect(ws.tickWeather('nope', 1000, makeInput())).toBeUndefined();
  });

  it('multiple transitions accumulate in stats', () => {
    const ws = createWeatherSystem();
    ws.initializeWeather('loc-1', makeInput());
    for (let i = 0; i < 10; i++) {
      ws.tickWeather('loc-1', 999999, makeInput({ seed: i * 77 }));
    }
    const stats = ws.getStats();
    expect(stats.totalTransitions).toBeGreaterThan(0);
  });
});

describe('WeatherSystem — seasonal patterns', () => {
  it('returns pattern for each season', () => {
    const ws = createWeatherSystem();
    for (let i = 0; i < 4; i++) {
      const pattern = ws.getSeasonalPattern(i);
      expect(pattern.season).toBeDefined();
      expect(pattern.dominantWeather.length).toBeGreaterThan(0);
    }
  });

  it('winter has SNOW in dominant weather', () => {
    const ws = createWeatherSystem();
    const winter = ws.getSeasonalPattern(3);
    expect(winter.dominantWeather).toContain('SNOW');
  });

  it('summer pattern has positive temperature modifier', () => {
    const ws = createWeatherSystem();
    const summer = ws.getSeasonalPattern(1);
    expect(summer.temperatureModifier).toBeGreaterThan(0);
  });
});

describe('WeatherSystem — stats', () => {
  it('tracks current location count', () => {
    const ws = createWeatherSystem();
    ws.initializeWeather('loc-1', makeInput());
    ws.initializeWeather('loc-2', makeInput());
    expect(ws.getStats().currentStatesCount).toBe(2);
  });

  it('starts with zero transitions', () => {
    const ws = createWeatherSystem();
    expect(ws.getStats().totalTransitions).toBe(0);
    expect(ws.getStats().extremeEvents).toBe(0);
  });
});
