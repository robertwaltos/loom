/**
 * Biome Engine Routes — Biome classification, metadata, and habitability.
 *
 * POST /v1/biome/classify         — Classify a biome from environmental inputs
 * GET  /v1/biome/metadata         — All biome metadata table
 * GET  /v1/biome/metadata/:biome  — Single biome metadata
 * POST /v1/biome/climate-zone     — Compute climate zone { latitude, axialTilt }
 * POST /v1/biome/habitability     — Compute habitability { biome, waterAccess }
 * POST /v1/biome/danger-level     — Compute danger level { biome, stellarActivity }
 * POST /v1/biome/transition       — Compute biome transition { a, b, t }
 * POST /v1/biome/map              — Generate full biome map (small grid only)
 *
 * Thread: silk/worlds
 * Tier: 2
 */

import type { FastifyAppLike } from '@loom/selvage';
import type {
  BiomeEngine,
  BiomeType,
  BiomeClassificationInput,
} from '../../fabrics/loom-core/src/biome-engine.js';

const VALID_BIOMES: ReadonlySet<string> = new Set([
  'OCEAN', 'COAST', 'DESERT', 'GRASSLAND', 'FOREST', 'JUNGLE',
  'TUNDRA', 'MOUNTAIN', 'VOLCANIC', 'SWAMP', 'ARCTIC', 'SAVANNA',
  'REEF', 'CAVE_SYSTEM', 'CRYSTAL_FORMATION',
]);

export interface BiomeRoutesDeps {
  readonly biomeEngine: BiomeEngine;
}

export function registerBiomeRoutes(app: FastifyAppLike, deps: BiomeRoutesDeps): void {
  const { biomeEngine } = deps;

  // GET /v1/biome/metadata — all biome metadata (before /:biome)
  app.get('/v1/biome/metadata', async (_req, reply) => {
    const metadata = [...VALID_BIOMES].map(b => biomeEngine.getBiomeMetadata(b as BiomeType));
    return reply.send({ ok: true, metadata, total: metadata.length });
  });

  // POST /v1/biome/classify
  app.post('/v1/biome/classify', async (req, reply) => {
    const body = (req as unknown as { body: unknown }).body;
    if (typeof body !== 'object' || body === null) {
      return reply.code(400).send({ ok: false, error: 'Body required', code: 'INVALID_INPUT' });
    }
    const b = body as Record<string, unknown>;
    const input: BiomeClassificationInput = {
      temperature: typeof b['temperature'] === 'number' ? b['temperature'] : 15,
      precipitation: typeof b['precipitation'] === 'number' ? b['precipitation'] : 500,
      elevation: typeof b['elevation'] === 'number' ? b['elevation'] : 100,
      latitude: typeof b['latitude'] === 'number' ? b['latitude'] : 45,
    };
    const biome = biomeEngine.classifyBiome(input);
    const metadata = biomeEngine.getBiomeMetadata(biome);
    return reply.send({ ok: true, biome, metadata, input });
  });

  // POST /v1/biome/climate-zone
  app.post('/v1/biome/climate-zone', async (req, reply) => {
    const body = (req as unknown as { body: unknown }).body;
    if (typeof body !== 'object' || body === null) {
      return reply.code(400).send({ ok: false, error: 'Body required', code: 'INVALID_INPUT' });
    }
    const b = body as Record<string, unknown>;
    const latitude = typeof b['latitude'] === 'number' ? b['latitude'] : 0;
    const axialTilt = typeof b['axialTilt'] === 'number' ? b['axialTilt'] : 23.5;
    const zone = biomeEngine.getClimateZone(latitude, axialTilt);
    return reply.send({ ok: true, latitude, axialTilt, climateZone: zone });
  });

  // POST /v1/biome/habitability
  app.post('/v1/biome/habitability', async (req, reply) => {
    const body = (req as unknown as { body: unknown }).body;
    if (typeof body !== 'object' || body === null) {
      return reply.code(400).send({ ok: false, error: 'Body required', code: 'INVALID_INPUT' });
    }
    const b = body as Record<string, unknown>;
    const biome = String(b['biome'] ?? '');
    if (!VALID_BIOMES.has(biome)) {
      return reply.code(400).send({ ok: false, error: `biome must be one of: ${[...VALID_BIOMES].join(', ')}`, code: 'INVALID_INPUT' });
    }
    const waterAccess = typeof b['waterAccess'] === 'boolean' ? b['waterAccess'] : false;
    const habitability = biomeEngine.computeHabitability(biome as BiomeType, waterAccess);
    return reply.send({ ok: true, biome, waterAccess, habitability });
  });

  // POST /v1/biome/danger-level
  app.post('/v1/biome/danger-level', async (req, reply) => {
    const body = (req as unknown as { body: unknown }).body;
    if (typeof body !== 'object' || body === null) {
      return reply.code(400).send({ ok: false, error: 'Body required', code: 'INVALID_INPUT' });
    }
    const b = body as Record<string, unknown>;
    const biome = String(b['biome'] ?? '');
    if (!VALID_BIOMES.has(biome)) {
      return reply.code(400).send({ ok: false, error: `biome must be one of: ${[...VALID_BIOMES].join(', ')}`, code: 'INVALID_INPUT' });
    }
    const stellarActivity = typeof b['stellarActivity'] === 'number' ? b['stellarActivity'] : 0.5;
    const dangerLevel = biomeEngine.computeDangerLevel(biome as BiomeType, stellarActivity);
    return reply.send({ ok: true, biome, stellarActivity, dangerLevel });
  });

  // POST /v1/biome/transition
  app.post('/v1/biome/transition', async (req, reply) => {
    const body = (req as unknown as { body: unknown }).body;
    if (typeof body !== 'object' || body === null) {
      return reply.code(400).send({ ok: false, error: 'Body required', code: 'INVALID_INPUT' });
    }
    const b = body as Record<string, unknown>;
    const a = String(b['a'] ?? '');
    const bBiome = String(b['b'] ?? '');
    if (!VALID_BIOMES.has(a) || !VALID_BIOMES.has(bBiome)) {
      return reply.code(400).send({ ok: false, error: 'a and b must be valid BiomeType values', code: 'INVALID_INPUT' });
    }
    const t = typeof b['t'] === 'number' ? Math.max(0, Math.min(1, b['t'])) : 0.5;
    const transition = biomeEngine.computeTransition(a as BiomeType, bBiome as BiomeType, t);
    return reply.send({ ok: true, transition });
  });

  // GET /v1/biome/metadata/:biome
  app.get('/v1/biome/metadata/:biome', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const biome = typeof params['biome'] === 'string' ? params['biome'].toUpperCase() : '';
    if (!VALID_BIOMES.has(biome)) {
      return reply.code(404).send({ ok: false, error: 'Biome not found', code: 'NOT_FOUND' });
    }
    const metadata = biomeEngine.getBiomeMetadata(biome as BiomeType);
    return reply.send({ ok: true, metadata });
  });
}
