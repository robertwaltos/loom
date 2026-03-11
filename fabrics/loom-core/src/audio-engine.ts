/**
 * Dynamic Audio Engine — Context-aware soundscape orchestration.
 *
 * Drives the audio layer based on world state:
 *   - Biome-specific ambient loops with crossfade transitions
 *   - Mood-reactive music system (combat, exploration, trade, ceremony)
 *   - Weather-driven audio layers (rain, wind, thunder)
 *   - Economy/event audio cues (market crash, trade completion, milestones)
 *   - Spatial positioning hints for 3D audio
 *   - Silfen Weave transit soundscape progression
 *
 * The engine produces AudioDirectives consumed by bridge-loom-ue5.
 * It runs in the Loom tick and never touches the UE5 frame budget.
 */

import type { BiomeType } from './biome-engine.js';
import type { WeatherType } from './weather-system.js';

// ── Ports ────────────────────────────────────────────────────────

export interface AudioClockPort {
  readonly nowMicroseconds: () => number;
}

export interface AudioLogPort {
  readonly info: (ctx: Readonly<Record<string, unknown>>, msg: string) => void;
}

// ── Types ────────────────────────────────────────────────────────

export type MusicMood =
  | 'exploration'
  | 'combat'
  | 'combat-epic'
  | 'trade'
  | 'ceremony'
  | 'stealth'
  | 'danger'
  | 'peaceful'
  | 'melancholy'
  | 'triumph'
  | 'weave-transit'
  | 'silence';

export type AudioLayer =
  | 'ambient'
  | 'music'
  | 'weather'
  | 'economy'
  | 'event'
  | 'spatial'
  | 'voice';

export type CueType =
  | 'trade-complete'
  | 'market-crash'
  | 'kalon-milestone'
  | 'war-declared'
  | 'peace-signed'
  | 'election-result'
  | 'festival-start'
  | 'dynasty-achievement'
  | 'weave-entry'
  | 'weave-exit'
  | 'level-up'
  | 'death';

export interface AudioDirective {
  readonly directiveId: string;
  readonly timestamp: number;
  readonly layer: AudioLayer;
  readonly action: 'play' | 'stop' | 'crossfade' | 'volume' | 'pitch';
  readonly soundId: string;
  readonly volume: number;
  readonly fadeDurationMs: number;
  readonly position: AudioPosition | null;
  readonly priority: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface AudioPosition {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly radius: number;
}

export interface BiomeSoundscape {
  readonly biome: BiomeType;
  readonly ambientLoops: ReadonlyArray<string>;
  readonly ambientOneShots: ReadonlyArray<string>;
  readonly oneShotIntervalMs: number;
}

export interface WeatherSoundMapping {
  readonly weather: WeatherType;
  readonly loopSoundId: string;
  readonly intensityMin: number;
  readonly intensityMax: number;
}

export interface MusicTrack {
  readonly trackId: string;
  readonly mood: MusicMood;
  readonly durationMs: number;
  readonly loopable: boolean;
  readonly intensity: number;
}

// ── Config ───────────────────────────────────────────────────────

export interface AudioEngineConfig {
  readonly ambientCrossfadeMs: number;
  readonly musicCrossfadeMs: number;
  readonly weatherCrossfadeMs: number;
  readonly cueFadeMs: number;
  readonly maxConcurrentLayers: number;
  readonly maxDirectivesPerTick: number;
  readonly oneShotBaseIntervalMs: number;
  readonly weaveTransitPhasesCount: number;
}

const DEFAULT_CONFIG: AudioEngineConfig = {
  ambientCrossfadeMs: 3_000,
  musicCrossfadeMs: 5_000,
  weatherCrossfadeMs: 2_000,
  cueFadeMs: 500,
  maxConcurrentLayers: 8,
  maxDirectivesPerTick: 16,
  oneShotBaseIntervalMs: 15_000,
  weaveTransitPhasesCount: 5,
};

// ── Stats ────────────────────────────────────────────────────────

export interface AudioEngineStats {
  readonly totalDirectivesEmitted: number;
  readonly activeLayers: number;
  readonly currentBiome: BiomeType | null;
  readonly currentMood: MusicMood;
  readonly currentWeather: WeatherType | null;
}

// ── Public API ───────────────────────────────────────────────────

export interface AudioEngine {
  readonly setBiome: (biome: BiomeType) => ReadonlyArray<AudioDirective>;
  readonly setMood: (mood: MusicMood) => ReadonlyArray<AudioDirective>;
  readonly setWeather: (weather: WeatherType, intensity: number) => ReadonlyArray<AudioDirective>;
  readonly clearWeather: () => ReadonlyArray<AudioDirective>;
  readonly playCue: (cue: CueType, position?: AudioPosition) => AudioDirective;
  readonly enterWeaveTransit: () => ReadonlyArray<AudioDirective>;
  readonly exitWeaveTransit: () => ReadonlyArray<AudioDirective>;
  readonly setMasterVolume: (volume: number) => void;
  readonly setLayerVolume: (layer: AudioLayer, volume: number) => void;
  readonly registerBiomeSoundscape: (soundscape: BiomeSoundscape) => void;
  readonly registerMusicTrack: (track: MusicTrack) => void;
  readonly tick: () => ReadonlyArray<AudioDirective>;
  readonly getStats: () => AudioEngineStats;
}

// ── Deps ─────────────────────────────────────────────────────────

export interface AudioEngineDeps {
  readonly clock: AudioClockPort;
  readonly logger: AudioLogPort;
  readonly idGenerator: { readonly generate: () => string };
}

// ── Biome → Sound Mappings ───────────────────────────────────────

const DEFAULT_BIOME_SOUNDSCAPES: ReadonlyArray<BiomeSoundscape> = [
  { biome: 'FOREST', ambientLoops: ['amb_forest_day', 'amb_forest_night'], ambientOneShots: ['bird_chirp', 'branch_crack', 'wind_leaves'], oneShotIntervalMs: 12_000 },
  { biome: 'DESERT', ambientLoops: ['amb_desert_wind'], ambientOneShots: ['sand_shift', 'desert_bird'], oneShotIntervalMs: 20_000 },
  { biome: 'OCEAN', ambientLoops: ['amb_ocean_waves'], ambientOneShots: ['seagull', 'wave_crash'], oneShotIntervalMs: 8_000 },
  { biome: 'CAVE_SYSTEM', ambientLoops: ['amb_cave_drip'], ambientOneShots: ['echo_drop', 'bat_flutter'], oneShotIntervalMs: 10_000 },
  { biome: 'MOUNTAIN', ambientLoops: ['amb_mountain_wind'], ambientOneShots: ['rock_tumble', 'eagle_cry'], oneShotIntervalMs: 18_000 },
  { biome: 'JUNGLE', ambientLoops: ['amb_jungle_dense'], ambientOneShots: ['monkey_call', 'insect_buzz', 'parrot'], oneShotIntervalMs: 6_000 },
  { biome: 'TUNDRA', ambientLoops: ['amb_tundra_silence'], ambientOneShots: ['ice_crack', 'wind_howl'], oneShotIntervalMs: 25_000 },
  { biome: 'SWAMP', ambientLoops: ['amb_swamp_bubbles'], ambientOneShots: ['frog_croak', 'splash'], oneShotIntervalMs: 8_000 },
  { biome: 'ARCTIC', ambientLoops: ['amb_arctic_wind'], ambientOneShots: ['ice_groan', 'snow_crunch'], oneShotIntervalMs: 20_000 },
  { biome: 'SAVANNA', ambientLoops: ['amb_savanna_grass'], ambientOneShots: ['lion_distant', 'grass_rustle'], oneShotIntervalMs: 14_000 },
  { biome: 'COAST', ambientLoops: ['amb_coast_surf'], ambientOneShots: ['shell_clatter', 'gull'], oneShotIntervalMs: 10_000 },
  { biome: 'VOLCANIC', ambientLoops: ['amb_volcanic_rumble'], ambientOneShots: ['lava_pop', 'steam_vent'], oneShotIntervalMs: 8_000 },
  { biome: 'GRASSLAND', ambientLoops: ['amb_grassland_breeze'], ambientOneShots: ['cricket', 'meadowlark'], oneShotIntervalMs: 12_000 },
  { biome: 'REEF', ambientLoops: ['amb_reef_underwater'], ambientOneShots: ['bubble_stream', 'whale_song'], oneShotIntervalMs: 15_000 },
  { biome: 'CRYSTAL_FORMATION', ambientLoops: ['amb_crystal_hum'], ambientOneShots: ['crystal_chime', 'resonance_ping'], oneShotIntervalMs: 10_000 },
];

const WEATHER_SOUND_MAP: ReadonlyArray<WeatherSoundMapping> = [
  { weather: 'RAIN', loopSoundId: 'weather_rain', intensityMin: 0.3, intensityMax: 1.0 },
  { weather: 'STORM', loopSoundId: 'weather_storm', intensityMin: 0.6, intensityMax: 1.0 },
  { weather: 'SNOW', loopSoundId: 'weather_snow_wind', intensityMin: 0.2, intensityMax: 0.7 },
  { weather: 'FOG', loopSoundId: 'weather_fog_muffled', intensityMin: 0.1, intensityMax: 0.4 },
  { weather: 'DUST_STORM', loopSoundId: 'weather_dust', intensityMin: 0.5, intensityMax: 1.0 },
  { weather: 'SOLAR_FLARE', loopSoundId: 'weather_solar_crackle', intensityMin: 0.4, intensityMax: 0.9 },
  { weather: 'ACID_RAIN', loopSoundId: 'weather_acid_hiss', intensityMin: 0.3, intensityMax: 0.8 },
  { weather: 'AURORA', loopSoundId: 'weather_aurora_hum', intensityMin: 0.1, intensityMax: 0.5 },
];

const CUE_SOUND_MAP: Readonly<Record<CueType, string>> = {
  'trade-complete': 'cue_trade_chime',
  'market-crash': 'cue_market_klaxon',
  'kalon-milestone': 'cue_kalon_fanfare',
  'war-declared': 'cue_war_horn',
  'peace-signed': 'cue_peace_bells',
  'election-result': 'cue_election_gavel',
  'festival-start': 'cue_festival_fanfare',
  'dynasty-achievement': 'cue_achievement_sting',
  'weave-entry': 'cue_weave_open',
  'weave-exit': 'cue_weave_close',
  'level-up': 'cue_level_up',
  'death': 'cue_death_toll',
};

// ── Factory ──────────────────────────────────────────────────────

export function createAudioEngine(
  deps: AudioEngineDeps,
  config?: Partial<AudioEngineConfig>,
): AudioEngine {
  const cfg: AudioEngineConfig = { ...DEFAULT_CONFIG, ...config };

  const biomeSoundscapes = new Map<BiomeType, BiomeSoundscape>();
  for (const s of DEFAULT_BIOME_SOUNDSCAPES) {
    biomeSoundscapes.set(s.biome, s);
  }

  const musicTracks = new Map<MusicMood, MusicTrack[]>();
  const layerVolumes = new Map<AudioLayer, number>();
  let masterVolume = 1.0;

  let currentBiome: BiomeType | null = null;
  let currentMood: MusicMood = 'silence';
  let currentWeather: WeatherType | null = null;
  let currentWeatherIntensity = 0;

  let activeBiomeLoop: string | null = null;
  let activeMusicTrack: string | null = null;
  let activeWeatherLoop: string | null = null;

  let lastOneShotAt = 0;
  let totalDirectivesEmitted = 0;
  let inWeaveTransit = false;

  function makeDirective(
    layer: AudioLayer,
    action: AudioDirective['action'],
    soundId: string,
    opts?: {
      volume?: number;
      fadeDurationMs?: number;
      position?: AudioPosition | null;
      priority?: number;
      metadata?: Readonly<Record<string, unknown>>;
    },
  ): AudioDirective {
    totalDirectivesEmitted++;
    return {
      directiveId: deps.idGenerator.generate(),
      timestamp: deps.clock.nowMicroseconds(),
      layer,
      action,
      soundId,
      volume: (opts?.volume ?? 1.0) * masterVolume * (layerVolumes.get(layer) ?? 1.0),
      fadeDurationMs: opts?.fadeDurationMs ?? 0,
      position: opts?.position ?? null,
      priority: opts?.priority ?? 5,
      metadata: opts?.metadata ?? {},
    };
  }

  function setBiome(biome: BiomeType): ReadonlyArray<AudioDirective> {
    if (biome === currentBiome) return [];
    const directives: AudioDirective[] = [];

    if (activeBiomeLoop) {
      directives.push(makeDirective('ambient', 'stop', activeBiomeLoop, { fadeDurationMs: cfg.ambientCrossfadeMs }));
    }

    const soundscape = biomeSoundscapes.get(biome);
    if (soundscape && soundscape.ambientLoops.length > 0) {
      const loop = soundscape.ambientLoops[0]!;
      directives.push(makeDirective('ambient', 'crossfade', loop, { fadeDurationMs: cfg.ambientCrossfadeMs }));
      activeBiomeLoop = loop;
    }

    const prevBiome = currentBiome;
    currentBiome = biome;
    deps.logger.info({ biome, prevBiome }, 'biome_audio_transition');
    return directives;
  }

  function setMood(mood: MusicMood): ReadonlyArray<AudioDirective> {
    if (mood === currentMood) return [];
    const directives: AudioDirective[] = [];

    if (activeMusicTrack) {
      directives.push(makeDirective('music', 'stop', activeMusicTrack, { fadeDurationMs: cfg.musicCrossfadeMs }));
    }

    if (mood !== 'silence') {
      const tracks = musicTracks.get(mood);
      const trackId = tracks && tracks.length > 0
        ? tracks[0]!.trackId
        : `music_${mood}`;
      directives.push(makeDirective('music', 'crossfade', trackId, { fadeDurationMs: cfg.musicCrossfadeMs }));
      activeMusicTrack = trackId;
    } else {
      activeMusicTrack = null;
    }

    currentMood = mood;
    return directives;
  }

  function setWeather(weather: WeatherType, intensity: number): ReadonlyArray<AudioDirective> {
    const directives: AudioDirective[] = [];
    const clampedIntensity = Math.max(0, Math.min(1, intensity));

    if (activeWeatherLoop && weather !== currentWeather) {
      directives.push(makeDirective('weather', 'stop', activeWeatherLoop, { fadeDurationMs: cfg.weatherCrossfadeMs }));
      activeWeatherLoop = null;
    }

    const mapping = WEATHER_SOUND_MAP.find(m => m.weather === weather);
    if (mapping) {
      const vol = mapping.intensityMin + (mapping.intensityMax - mapping.intensityMin) * clampedIntensity;
      if (weather !== currentWeather) {
        directives.push(makeDirective('weather', 'crossfade', mapping.loopSoundId, {
          volume: vol,
          fadeDurationMs: cfg.weatherCrossfadeMs,
        }));
        activeWeatherLoop = mapping.loopSoundId;
      } else {
        directives.push(makeDirective('weather', 'volume', mapping.loopSoundId, { volume: vol }));
      }
    }

    currentWeather = weather;
    currentWeatherIntensity = clampedIntensity;
    return directives;
  }

  function clearWeather(): ReadonlyArray<AudioDirective> {
    const directives: AudioDirective[] = [];
    if (activeWeatherLoop) {
      directives.push(makeDirective('weather', 'stop', activeWeatherLoop, { fadeDurationMs: cfg.weatherCrossfadeMs }));
      activeWeatherLoop = null;
    }
    currentWeather = null;
    currentWeatherIntensity = 0;
    return directives;
  }

  function playCue(cue: CueType, position?: AudioPosition): AudioDirective {
    const soundId = CUE_SOUND_MAP[cue];
    return makeDirective('event', 'play', soundId, {
      fadeDurationMs: cfg.cueFadeMs,
      position: position ?? null,
      priority: 8,
      metadata: { cue },
    });
  }

  function enterWeaveTransit(): ReadonlyArray<AudioDirective> {
    inWeaveTransit = true;
    const directives: AudioDirective[] = [];

    if (activeBiomeLoop) {
      directives.push(makeDirective('ambient', 'stop', activeBiomeLoop, { fadeDurationMs: cfg.ambientCrossfadeMs }));
    }

    directives.push(makeDirective('ambient', 'crossfade', 'amb_weave_corridor', {
      fadeDurationMs: cfg.ambientCrossfadeMs,
      metadata: { phase: 0, totalPhases: cfg.weaveTransitPhasesCount },
    }));

    directives.push(...setMood('weave-transit'));
    return directives;
  }

  function exitWeaveTransit(): ReadonlyArray<AudioDirective> {
    inWeaveTransit = false;
    const directives: AudioDirective[] = [];

    directives.push(makeDirective('ambient', 'stop', 'amb_weave_corridor', { fadeDurationMs: cfg.ambientCrossfadeMs }));

    if (currentBiome) {
      const soundscape = biomeSoundscapes.get(currentBiome);
      if (soundscape && soundscape.ambientLoops.length > 0) {
        const loop = soundscape.ambientLoops[0]!;
        directives.push(makeDirective('ambient', 'crossfade', loop, { fadeDurationMs: cfg.ambientCrossfadeMs }));
        activeBiomeLoop = loop;
      }
    }

    directives.push(...setMood('exploration'));
    return directives;
  }

  function tick(): ReadonlyArray<AudioDirective> {
    const now = deps.clock.nowMicroseconds();
    const directives: AudioDirective[] = [];

    if (inWeaveTransit || !currentBiome) return directives;

    const soundscape = biomeSoundscapes.get(currentBiome);
    if (!soundscape || soundscape.ambientOneShots.length === 0) return directives;

    const intervalUs = soundscape.oneShotIntervalMs * 1_000;
    if (now - lastOneShotAt >= intervalUs) {
      const oneShots = soundscape.ambientOneShots;
      const idx = Math.floor(Math.random() * oneShots.length);
      const soundId = oneShots[idx]!;
      directives.push(makeDirective('ambient', 'play', soundId, {
        priority: 2,
        metadata: { oneShot: true, biome: currentBiome },
      }));
      lastOneShotAt = now;
    }

    return directives;
  }

  return {
    setBiome,
    setMood,
    setWeather,
    clearWeather,
    playCue,
    enterWeaveTransit,
    exitWeaveTransit,
    setMasterVolume: (v: number) => { masterVolume = Math.max(0, Math.min(1, v)); },
    setLayerVolume: (layer: AudioLayer, v: number) => { layerVolumes.set(layer, Math.max(0, Math.min(1, v))); },
    registerBiomeSoundscape: (s: BiomeSoundscape) => { biomeSoundscapes.set(s.biome, s); },
    registerMusicTrack: (t: MusicTrack) => {
      const existing = musicTracks.get(t.mood) ?? [];
      existing.push(t);
      musicTracks.set(t.mood, existing);
    },
    tick,
    getStats: (): AudioEngineStats => ({
      totalDirectivesEmitted,
      activeLayers: [activeBiomeLoop, activeMusicTrack, activeWeatherLoop].filter(Boolean).length,
      currentBiome,
      currentMood,
      currentWeather,
    }),
  };
}
