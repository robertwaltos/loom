import { describe, it, expect, vi } from 'vitest';
import { createAudioEngine } from '../audio-engine.js';
import type { AudioEngineDeps } from '../audio-engine.js';
import type { BiomeType } from '../biome-engine.js';
import type { WeatherType } from '../weather-system.js';

// ── Helpers ────────────────────────────────────────────────────

let idSeq = 0;
function makeDeps(nowUs = 0): AudioEngineDeps {
  return {
    clock: { nowMicroseconds: () => nowUs },
    idGenerator: { generate: () => { idSeq++; return `dir-${String(idSeq)}`; } },
    logger: { info: vi.fn() },
  };
}

// ── createAudioEngine ──────────────────────────────────────────

describe('createAudioEngine — initial state', () => {
  it('reports silence mood and no biome or weather', () => {
    const engine = createAudioEngine(makeDeps());
    const stats = engine.getStats();
    expect(stats.currentMood).toBe('silence');
    expect(stats.currentBiome).toBeNull();
    expect(stats.currentWeather).toBeNull();
    expect(stats.activeLayers).toBe(0);
    expect(stats.totalDirectivesEmitted).toBe(0);
  });
});

// ── setBiome ───────────────────────────────────────────────────

describe('setBiome', () => {
  it('returns ambient crossfade directive on first biome set', () => {
    const engine = createAudioEngine(makeDeps());
    const directives = engine.setBiome('FOREST' as BiomeType);
    expect(directives.length).toBeGreaterThan(0);
    const crossfade = directives.find((d) => d.action === 'crossfade' && d.layer === 'ambient');
    expect(crossfade).toBeDefined();
    expect(crossfade?.soundId).toBe('amb_forest_day');
  });

  it('updates currentBiome in stats', () => {
    const engine = createAudioEngine(makeDeps());
    engine.setBiome('DESERT' as BiomeType);
    expect(engine.getStats().currentBiome).toBe('DESERT');
  });

  it('returns empty array when same biome set again', () => {
    const engine = createAudioEngine(makeDeps());
    engine.setBiome('FOREST' as BiomeType);
    const directives = engine.setBiome('FOREST' as BiomeType);
    expect(directives).toHaveLength(0);
  });

  it('stops previous loop when switching biomes', () => {
    const engine = createAudioEngine(makeDeps());
    engine.setBiome('FOREST' as BiomeType);
    const directives = engine.setBiome('DESERT' as BiomeType);
    const stop = directives.find((d) => d.action === 'stop' && d.layer === 'ambient');
    expect(stop).toBeDefined();
  });
});

// ── setMood ────────────────────────────────────────────────────

describe('setMood', () => {
  it('returns crossfade directive for non-silence mood', () => {
    const engine = createAudioEngine(makeDeps());
    const directives = engine.setMood('combat');
    const crossfade = directives.find((d) => d.action === 'crossfade' && d.layer === 'music');
    expect(crossfade).toBeDefined();
    expect(crossfade?.soundId).toBe('music_combat');
  });

  it('updates currentMood in stats', () => {
    const engine = createAudioEngine(makeDeps());
    engine.setMood('exploration');
    expect(engine.getStats().currentMood).toBe('exploration');
  });

  it('returns empty array when same mood set again', () => {
    const engine = createAudioEngine(makeDeps());
    engine.setMood('combat');
    expect(engine.setMood('combat')).toHaveLength(0);
  });

  it('setting silence stops previous music track', () => {
    const engine = createAudioEngine(makeDeps());
    engine.setMood('combat');
    const directives = engine.setMood('silence');
    const stop = directives.find((d) => d.action === 'stop' && d.layer === 'music');
    expect(stop).toBeDefined();
  });

  it('uses registered track id when track is registered', () => {
    const engine = createAudioEngine(makeDeps());
    engine.registerMusicTrack({ trackId: 'my_combat_01', mood: 'combat', durationMs: 60_000, loopable: true, intensity: 0.8 });
    const directives = engine.setMood('combat');
    const crossfade = directives.find((d) => d.action === 'crossfade');
    expect(crossfade?.soundId).toBe('my_combat_01');
  });
});

// ── setWeather ─────────────────────────────────────────────────

describe('setWeather', () => {
  it('returns a crossfade weather directive', () => {
    const engine = createAudioEngine(makeDeps());
    const directives = engine.setWeather('RAIN' as WeatherType, 0.5);
    const crossfade = directives.find((d) => d.layer === 'weather' && d.action === 'crossfade');
    expect(crossfade).toBeDefined();
    expect(crossfade?.soundId).toBe('weather_rain');
  });

  it('updates currentWeather in stats', () => {
    const engine = createAudioEngine(makeDeps());
    engine.setWeather('STORM' as WeatherType, 1.0);
    expect(engine.getStats().currentWeather).toBe('STORM');
  });

  it('issues a volume directive when same weather intensity changes', () => {
    const engine = createAudioEngine(makeDeps());
    engine.setWeather('RAIN' as WeatherType, 0.5);
    const directives = engine.setWeather('RAIN' as WeatherType, 0.9);
    const vol = directives.find((d) => d.action === 'volume' && d.layer === 'weather');
    expect(vol).toBeDefined();
  });
});

// ── clearWeather ───────────────────────────────────────────────

describe('clearWeather', () => {
  it('stops the active weather loop', () => {
    const engine = createAudioEngine(makeDeps());
    engine.setWeather('RAIN' as WeatherType, 0.5);
    const directives = engine.clearWeather();
    const stop = directives.find((d) => d.action === 'stop' && d.layer === 'weather');
    expect(stop).toBeDefined();
  });

  it('clears currentWeather in stats', () => {
    const engine = createAudioEngine(makeDeps());
    engine.setWeather('RAIN' as WeatherType, 0.5);
    engine.clearWeather();
    expect(engine.getStats().currentWeather).toBeNull();
  });

  it('returns empty when no weather active', () => {
    const engine = createAudioEngine(makeDeps());
    expect(engine.clearWeather()).toHaveLength(0);
  });
});

// ── playCue ────────────────────────────────────────────────────

describe('playCue', () => {
  it('returns a single event directive with cue sound id', () => {
    const engine = createAudioEngine(makeDeps());
    const d = engine.playCue('trade-complete');
    expect(d.layer).toBe('event');
    expect(d.action).toBe('play');
    expect(d.soundId).toBe('cue_trade_chime');
  });

  it('includes cue in metadata', () => {
    const engine = createAudioEngine(makeDeps());
    const d = engine.playCue('kalon-milestone');
    expect(d.metadata['cue']).toBe('kalon-milestone');
  });

  it('uses provided position', () => {
    const engine = createAudioEngine(makeDeps());
    const pos = { x: 10, y: 0, z: 5, radius: 20 };
    const d = engine.playCue('trade-complete', pos);
    expect(d.position).toEqual(pos);
  });
});

// ── weave transit ──────────────────────────────────────────────

describe('enterWeaveTransit', () => {
  it('starts weave ambient loop', () => {
    const engine = createAudioEngine(makeDeps());
    const directives = engine.enterWeaveTransit();
    const crossfade = directives.find((d) => d.soundId === 'amb_weave_corridor');
    expect(crossfade).toBeDefined();
  });

  it('switches mood to weave-transit', () => {
    const engine = createAudioEngine(makeDeps());
    engine.enterWeaveTransit();
    expect(engine.getStats().currentMood).toBe('weave-transit');
  });
});

describe('exitWeaveTransit', () => {
  it('stops weave corridor ambient', () => {
    const engine = createAudioEngine(makeDeps());
    engine.enterWeaveTransit();
    const directives = engine.exitWeaveTransit();
    const stop = directives.find((d) => d.soundId === 'amb_weave_corridor' && d.action === 'stop');
    expect(stop).toBeDefined();
  });

  it('restores exploration mood on exit', () => {
    const engine = createAudioEngine(makeDeps());
    engine.enterWeaveTransit();
    engine.exitWeaveTransit();
    expect(engine.getStats().currentMood).toBe('exploration');
  });
});

// ── volume controls ────────────────────────────────────────────

describe('setMasterVolume', () => {
  it('directive volume is scaled by master volume', () => {
    const engine = createAudioEngine(makeDeps());
    engine.setMasterVolume(0.5);
    const d = engine.playCue('death');
    expect(d.volume).toBeCloseTo(0.5);
  });

  it('clamps below zero to zero', () => {
    const engine = createAudioEngine(makeDeps());
    engine.setMasterVolume(-1);
    const d = engine.playCue('death');
    expect(d.volume).toBe(0);
  });
});

// ── getStats ───────────────────────────────────────────────────

describe('getStats — active layers', () => {
  it('increments active layers with biome, mood, and weather', () => {
    const engine = createAudioEngine(makeDeps());
    engine.setBiome('OCEAN' as BiomeType);
    engine.setMood('peaceful');
    engine.setWeather('RAIN' as WeatherType, 0.3);
    expect(engine.getStats().activeLayers).toBe(3);
  });

  it('counts directives emitted', () => {
    const engine = createAudioEngine(makeDeps());
    engine.setBiome('FOREST' as BiomeType);
    engine.playCue('death');
    expect(engine.getStats().totalDirectivesEmitted).toBeGreaterThanOrEqual(2);
  });
});

// ── tick one-shot ──────────────────────────────────────────────

describe('tick', () => {
  it('returns empty when no biome is set', () => {
    const engine = createAudioEngine(makeDeps(0));
    expect(engine.tick()).toHaveLength(0);
  });

  it('returns empty before one-shot interval has elapsed', () => {
    let nowUs = 0;
    const deps = { ...makeDeps(0), clock: { nowMicroseconds: () => nowUs } };
    const engine = createAudioEngine(deps);
    engine.setBiome('FOREST' as BiomeType);
    nowUs = 10_000; // 10ms — well below 12_000ms interval
    expect(engine.tick()).toHaveLength(0);
  });

  it('emits an ambient one-shot after interval elapses', () => {
    let nowUs = 0;
    const deps = { ...makeDeps(0), clock: { nowMicroseconds: () => nowUs } };
    const engine = createAudioEngine(deps);
    engine.setBiome('FOREST' as BiomeType);
    nowUs = 13_000_000; // 13_000ms > 12_000ms interval
    const directives = engine.tick();
    expect(directives.length).toBeGreaterThan(0);
    expect(directives[0]?.action).toBe('play');
    expect(directives[0]?.layer).toBe('ambient');
  });
});
