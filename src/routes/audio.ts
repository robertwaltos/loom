import type { FastifyAppLike } from '@loom/selvage';
import type {
  AudioEngine,
  BiomeSoundscape,
  MusicTrack,
  MusicMood,
  CueType,
  AudioLayer,
  AudioPosition,
} from '../../fabrics/loom-core/src/audio-engine.js';
import type { BiomeType } from '../../fabrics/loom-core/src/biome-engine.js';
import type { WeatherType } from '../../fabrics/loom-core/src/weather-system.js';

interface Deps {
  audioEngine: AudioEngine;
}


function r(req: unknown): { body: Record<string, unknown>; params: Record<string, any>; query: Record<string, string | undefined> } {
  return req as never;
}

export function registerAudioRoutes(app: FastifyAppLike, deps: Deps): void {
  const { audioEngine } = deps;

  // Set biome → returns audio directives
  app.post('/v1/audio/biome', (req, reply) => {
    const b = r(req).body;
    const biome = (b['biome'] ?? 'FOREST') as BiomeType;
    const directives = audioEngine.setBiome(biome);
    return reply.send({ ok: true, directives });
  });

  // Set mood → returns audio directives
  app.post('/v1/audio/mood', (req, reply) => {
    const b = r(req).body;
    const mood = (b['mood'] ?? 'exploration') as MusicMood;
    const directives = audioEngine.setMood(mood);
    return reply.send({ ok: true, directives });
  });

  // Set weather → returns audio directives
  app.post('/v1/audio/weather', (req, reply) => {
    const b = r(req).body;
    const weather = (b['weather'] ?? 'CLEAR') as WeatherType;
    const intensity = Number(b['intensity'] ?? 0.5);
    const directives = audioEngine.setWeather(weather, intensity);
    return reply.send({ ok: true, directives });
  });

  // Clear weather → returns audio directives
  app.delete('/v1/audio/weather', (_req, reply) => {
    const directives = audioEngine.clearWeather();
    return reply.send({ ok: true, directives });
  });

  // Play a cue
  app.post('/v1/audio/cues', (req, reply) => {
    const b = r(req).body;
    const cue = (b['cue'] ?? 'trade-complete') as CueType;
    const position = b['position'] as AudioPosition | undefined;
    const directive = audioEngine.playCue(cue, position);
    return reply.code(201).send({ ok: true, directive });
  });

  // Enter weave transit
  app.post('/v1/audio/weave-transit/enter', (_req, reply) => {
    const directives = audioEngine.enterWeaveTransit();
    return reply.send({ ok: true, directives });
  });

  // Exit weave transit
  app.post('/v1/audio/weave-transit/exit', (_req, reply) => {
    const directives = audioEngine.exitWeaveTransit();
    return reply.send({ ok: true, directives });
  });

  // Set master volume
  app.patch('/v1/audio/volume', (req, reply) => {
    const b = r(req).body;
    const volume = Number(b['volume'] ?? 1.0);
    audioEngine.setMasterVolume(volume);
    return reply.send({ ok: true, volume });
  });

  // Set layer volume
  app.patch('/v1/audio/layers/:layer/volume', (req, reply) => {
    const { layer } = r(req).params;
    const b = r(req).body;
    const volume = Number(b['volume'] ?? 1.0);
    audioEngine.setLayerVolume(layer as AudioLayer, volume);
    return reply.send({ ok: true, layer, volume });
  });

  // Register biome soundscape
  app.post('/v1/audio/soundscapes', (req, reply) => {
    const b = r(req).body;
    const soundscape = b as unknown as BiomeSoundscape;
    audioEngine.registerBiomeSoundscape(soundscape);
    return reply.code(201).send({ ok: true, registered: true });
  });

  // Register music track
  app.post('/v1/audio/tracks', (req, reply) => {
    const b = r(req).body;
    const track = b as unknown as MusicTrack;
    audioEngine.registerMusicTrack(track);
    return reply.code(201).send({ ok: true, registered: true });
  });

  // Tick the audio engine
  app.post('/v1/audio/tick', (_req, reply) => {
    const directives = audioEngine.tick();
    return reply.send({ ok: true, directives });
  });

  // Stats
  app.get('/v1/audio/stats', (_req, reply) => {
    const stats = audioEngine.getStats();
    return reply.send({ ok: true, stats });
  });
}
