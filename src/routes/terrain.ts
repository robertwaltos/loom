import type { FastifyAppLike } from '@loom/selvage';
import type { TerrainEngineSystem, Biome } from '../../fabrics/loom-core/src/terrain-engine.js';

interface Deps {
  terrainEngine: TerrainEngineSystem;
}

function serializeChunk(v: unknown): unknown {
  if (typeof v === 'bigint') return v.toString();
  if (Array.isArray(v)) return v.map(serializeChunk);
  if (v !== null && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, serializeChunk(val)]),
    );
  }
  return v;
}


function r(req: unknown): { body: Record<string, unknown>; params: Record<string, any>; query: Record<string, string | undefined> } {
  return req as never;
}

export function registerTerrainRoutes(app: FastifyAppLike, deps: Deps): void {
  const { terrainEngine } = deps;

  // Register world
  app.post('/v1/terrain/worlds/:worldId/register', (req, reply) => {
    const { worldId } = r(req).params;
    const result = terrainEngine.registerWorld(worldId);
    if (!result.success) {
      const code = result.error === 'already-exists' ? 409 : 422;
      return reply.code(code).send({ ok: false, error: result.error, code: 'UNPROCESSABLE' });
    }
    return reply.code(201).send({ ok: true, worldId });
  });

  // Biome distribution for a world
  app.get('/v1/terrain/worlds/:worldId/biomes', (req, reply) => {
    const { worldId } = r(req).params;
    const distribution = terrainEngine.getBiomeDistribution(worldId);
    return reply.send({ ok: true, distribution });
  });

  // List chunks in a world (optional ?biome= filter)
  app.get('/v1/terrain/worlds/:worldId/chunks', (req, reply) => {
    const { worldId } = r(req).params;
    const q = r(req).query;
    const biome = q['biome'] as Biome | undefined;
    const chunks = terrainEngine.listChunks(worldId, biome);
    return reply.send({ ok: true, total: chunks.length, chunks: serializeChunk(chunks) });
  });

  // Generate a chunk
  app.post('/v1/terrain/worlds/:worldId/chunks', (req, reply) => {
    const { worldId } = r(req).params;
    const b = r(req).body;
    const coords = { chunkX: Number(b['chunkX'] ?? 0), chunkZ: Number(b['chunkZ'] ?? 0) };
    const biome = (b['biome'] ?? 'PLAINS') as Biome;
    const elevation = Number(b['elevation'] ?? 0);
    const moisture = Number(b['moisture'] ?? 0.5);
    const temperature = Number(b['temperature'] ?? 15);
    const result = terrainEngine.generateChunk(worldId, coords, biome, elevation, moisture, temperature);
    if (typeof result === 'string') {
      const code = result === 'world-not-found' ? 404 : 422;
      return reply.code(code).send({ ok: false, error: result, code: 'UNPROCESSABLE' });
    }
    return reply.code(201).send({ ok: true, chunk: serializeChunk(result) });
  });

  // Get chunk at coords
  app.get('/v1/terrain/worlds/:worldId/chunk-at', (req, reply) => {
    const { worldId } = r(req).params;
    const q = r(req).query;
    const chunkX = Number(q['chunkX'] ?? '0');
    const chunkZ = Number(q['chunkZ'] ?? '0');
    const chunk = terrainEngine.getChunkAt(worldId, { chunkX, chunkZ });
    if (chunk === undefined) {
      return reply.code(404).send({ ok: false, error: 'chunk-not-found', code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, chunk: serializeChunk(chunk) });
  });

  // Get neighbors of a chunk
  app.get('/v1/terrain/chunks/:chunkId/neighbors', (req, reply) => {
    const { chunkId } = r(req).params;
    const neighbors = terrainEngine.getNeighbors(chunkId);
    return reply.send({ ok: true, total: neighbors.length, neighbors: serializeChunk(neighbors) });
  });

  // Get a single chunk
  app.get('/v1/terrain/chunks/:chunkId', (req, reply) => {
    const { chunkId } = r(req).params;
    const chunk = terrainEngine.getChunk(chunkId);
    if (chunk === undefined) {
      return reply.code(404).send({ ok: false, error: 'chunk-not-found', code: 'NOT_FOUND' });
    }
    return reply.send({ ok: true, chunk: serializeChunk(chunk) });
  });

  // Update chunk (moisture / temperature / resourceDensity)
  app.patch('/v1/terrain/chunks/:chunkId', (req, reply) => {
    const { chunkId } = r(req).params;
    const b = r(req).body;
    const updates: Record<string, number> = {};
    if (typeof b['moisture'] === 'number') updates['moisture'] = b['moisture'];
    if (typeof b['temperature'] === 'number') updates['temperature'] = b['temperature'];
    if (typeof b['resourceDensity'] === 'number') updates['resourceDensity'] = b['resourceDensity'];
    const result = terrainEngine.updateChunk(chunkId, updates);
    if (!result.success) {
      const code = result.error === 'chunk-not-found' ? 404 : 422;
      return reply.code(code).send({ ok: false, error: result.error, code: 'UNPROCESSABLE' });
    }
    return reply.send({ ok: true, updated: true, chunkId });
  });
}

