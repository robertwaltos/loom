import { describe, expect, it } from 'vitest';
import { createWorldWeatherEngine } from '../world-weather.js';

describe('world-weather simulation', () => {
  it('evolves weather timeline and clears expired conditions', () => {
    let now = 100;
    let id = 0;
    const weather = createWorldWeatherEngine({
      clock: { nowMicroseconds: () => now },
      idGenerator: { next: () => `wx-${++id}` },
    });

    weather.setWeather({ worldId: 'terra', weatherType: 'rain', severity: 'mild', durationMicro: 50 });
    now = 120;
    weather.setWeather({ worldId: 'terra', weatherType: 'storm', severity: 'severe', durationMicro: 200 });

    expect(weather.getCurrent('terra')?.weatherType).toBe('storm');

    now = 400;
    expect(weather.clearExpired('terra')).toBe(2);
    expect(weather.getSnapshot('terra').historyCount).toBe(0);
  });
});
