import { describe, expect, it, vi } from 'vitest';
import { createAudioEngine } from '../audio-engine.js';

describe('audio-engine simulation', () => {
  it('simulates biome, mood, and weather layering during an encounter', () => {
    const engine = createAudioEngine({
      clock: { nowMicroseconds: () => 1_000_000 },
      idGenerator: { generate: () => 'dir-1' },
      logger: { info: vi.fn() },
    });

    const biome = engine.setBiome('FOREST');
    const mood = engine.setMood('combat');
    const weather = engine.setWeather('RAIN', 0.6);

    expect(biome.length).toBeGreaterThan(0);
    expect(mood.some((d) => d.layer === 'music')).toBe(true);
    expect(weather.some((d) => d.layer === 'weather')).toBe(true);
    expect(engine.getStats().activeLayers).toBeGreaterThan(0);
  });
});
