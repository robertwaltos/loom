/**
 * Weather System Routes — Dynamic atmospheric simulation per world location.
 *
 * POST /v1/weather/:locationId/initialize         — Initialize weather { biome, season, altitude, stellarActivity, seed }
 * GET  /v1/weather/:locationId                    — Current weather state
 * POST /v1/weather/:locationId/tick               — Advance weather { deltaMs, ...WeatherInput }
 * GET  /v1/weather/types/:weatherType/effects     — Effects for a weather type
 * GET  /v1/weather/types/:weatherType/duration    — Duration range
 * GET  /v1/weather/types/:weatherType/transitions — Possible transitions
 * GET  /v1/weather/seasonal-patterns/:seasonIndex — Seasonal pattern (0–3)
 * GET  /v1/weather/stats                          — System stats
 *
 * Thread: silk/worlds
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { WeatherSystem, WeatherType, WeatherInput } from '../../fabrics/loom-core/src/weather-system.js';

const VALID_WEATHER_TYPES: ReadonlySet<string> = new Set([
  'CLEAR', 'CLOUDY', 'RAIN', 'STORM', 'SNOW', 'FOG',
  'DUST_STORM', 'SOLAR_FLARE', 'ACID_RAIN', 'AURORA',
]);

export interface WeatherRoutesDeps {
  readonly weatherSystem: WeatherSystem;
}

export function registerWeatherRoutes(app: FastifyAppLike, deps: WeatherRoutesDeps): void {
  const { weatherSystem } = deps;

  // GET /v1/weather/stats — before /:locationId
  app.get('/v1/weather/stats', async (_req, reply) => {
    return reply.send({ ok: true, stats: weatherSystem.getStats() });
  });

  // GET /v1/weather/types/:weatherType/effects — before /:locationId
  app.get('/v1/weather/types/:weatherType/effects', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const wt = typeof params['weatherType'] === 'string' ? params['weatherType'].toUpperCase() : '';
    if (!VALID_WEATHER_TYPES.has(wt)) {
      return reply.code(400).send({ ok: false, error: `weatherType must be one of: ${[...VALID_WEATHER_TYPES].join(', ')}`, code: 'INVALID_INPUT' });
    }
    const effects = weatherSystem.getEffects(wt as WeatherType);
    return reply.send({ ok: true, weatherType: wt, effects });
  });

  // GET /v1/weather/types/:weatherType/duration
  app.get('/v1/weather/types/:weatherType/duration', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const wt = typeof params['weatherType'] === 'string' ? params['weatherType'].toUpperCase() : '';
    if (!VALID_WEATHER_TYPES.has(wt)) {
      return reply.code(400).send({ ok: false, error: `weatherType must be one of: ${[...VALID_WEATHER_TYPES].join(', ')}`, code: 'INVALID_INPUT' });
    }
    const duration = weatherSystem.getDuration(wt as WeatherType);
    const isExtreme = weatherSystem.isExtremeWeather(wt as WeatherType);
    return reply.send({ ok: true, weatherType: wt, duration, isExtreme });
  });

  // GET /v1/weather/types/:weatherType/transitions
  app.get('/v1/weather/types/:weatherType/transitions', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const wt = typeof params['weatherType'] === 'string' ? params['weatherType'].toUpperCase() : '';
    if (!VALID_WEATHER_TYPES.has(wt)) {
      return reply.code(400).send({ ok: false, error: `weatherType must be one of: ${[...VALID_WEATHER_TYPES].join(', ')}`, code: 'INVALID_INPUT' });
    }
    const transitions = weatherSystem.getTransitions(wt as WeatherType);
    return reply.send({ ok: true, weatherType: wt, transitions, total: transitions.length });
  });

  // GET /v1/weather/seasonal-patterns/:seasonIndex
  app.get('/v1/weather/seasonal-patterns/:seasonIndex', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const idx = typeof params['seasonIndex'] === 'string' ? parseInt(params['seasonIndex'], 10) : NaN;
    if (isNaN(idx) || idx < 0 || idx > 3) {
      return reply.code(400).send({ ok: false, error: 'seasonIndex must be 0–3', code: 'INVALID_INPUT' });
    }
    const pattern = weatherSystem.getSeasonalPattern(idx);
    return reply.send({ ok: true, seasonIndex: idx, pattern });
  });

  // POST /v1/weather/:locationId/initialize
  app.post('/v1/weather/:locationId/initialize', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const locationId = typeof params['locationId'] === 'string' ? params['locationId'] : null;
    if (locationId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid locationId', code: 'INVALID_INPUT' });
    }
    if (typeof body !== 'object' || body === null) {
      return reply.code(400).send({ ok: false, error: 'Body required', code: 'INVALID_INPUT' });
    }
    const b = body as Record<string, unknown>;
    const input: WeatherInput = {
      biome: typeof b['biome'] === 'string' ? b['biome'] : 'GRASSLAND',
      season: typeof b['season'] === 'number' ? b['season'] : 0,
      altitude: typeof b['altitude'] === 'number' ? b['altitude'] : 0,
      stellarActivity: typeof b['stellarActivity'] === 'number' ? b['stellarActivity'] : 0.5,
      seed: typeof b['seed'] === 'number' ? b['seed'] : Math.floor(Math.random() * 1000000),
    };
    const state = weatherSystem.initializeWeather(locationId, input);
    return reply.code(201).send({ ok: true, locationId, state });
  });

  // GET /v1/weather/:locationId
  app.get('/v1/weather/:locationId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const locationId = typeof params['locationId'] === 'string' ? params['locationId'] : null;
    if (locationId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid locationId', code: 'INVALID_INPUT' });
    }
    const state = weatherSystem.getWeather(locationId);
    if (state === undefined) {
      return reply.code(404).send({ ok: false, error: 'Location weather not initialized', code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, locationId, state });
  });

  // POST /v1/weather/:locationId/tick
  app.post('/v1/weather/:locationId/tick', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body;
    const locationId = typeof params['locationId'] === 'string' ? params['locationId'] : null;
    if (locationId === null) {
      return reply.code(400).send({ ok: false, error: 'Invalid locationId', code: 'INVALID_INPUT' });
    }
    const b = typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
    const deltaMs = typeof b['deltaMs'] === 'number' ? b['deltaMs'] : 60000;
    const input: WeatherInput = {
      biome: typeof b['biome'] === 'string' ? b['biome'] : 'GRASSLAND',
      season: typeof b['season'] === 'number' ? b['season'] : 0,
      altitude: typeof b['altitude'] === 'number' ? b['altitude'] : 0,
      stellarActivity: typeof b['stellarActivity'] === 'number' ? b['stellarActivity'] : 0.5,
      seed: typeof b['seed'] === 'number' ? b['seed'] : Math.floor(Math.random() * 1000000),
    };
    const state = weatherSystem.tickWeather(locationId, deltaMs, input);
    if (state === undefined) {
      return reply.code(404).send({ ok: false, error: 'Location weather not initialized', code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, locationId, state });
  });
}
