/**
 * Worlds Routes — World discovery, luminance state, and entry access.
 *
 * GET  /v1/worlds                      — List all 50 worlds (optional ?realm= filter)
 * GET  /v1/worlds/realm/:realm         — Worlds filtered by realm
 * GET  /v1/worlds/:worldId             — World detail + current luminance
 * GET  /v1/worlds/:worldId/entries     — Published entries for a world
 *
 * Thread: silk/worlds-api
 * Tier: 1
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { WorldsEngine } from '../../universe/worlds/engine.js';
import type { ContentEngine } from '../../universe/content/engine.js';
import type { WorldLuminance, WorldDefinition, Realm } from '../../universe/worlds/types.js';
import type { RealWorldEntry, DifficultyTier } from '../../universe/content/types.js';
import type { PgLuminanceRepository, LuminanceLogEntry } from '../../universe/fading/pg-luminance-repository.js';

// ─── Deps ──────────────────────────────────────────────────────────

export interface WorldsRoutesDeps {
  readonly worldsEngine: WorldsEngine;
  readonly contentEngine: ContentEngine;
  /** Mutable in-memory store — updated by session complete-entry */
  readonly luminanceStore: Map<string, WorldLuminance>;
  /** Optional: enables luminance history endpoint */
  readonly pgLuminanceRepo?: PgLuminanceRepository;
  /** Optional: called when a kindler triggers a manual world restore */
  readonly onRestoreEvent?: (worldId: string, kindlerId: string, tier: DifficultyTier) => void;
}

// ─── Response shapes ──────────────────────────────────────────────

interface WorldSummary {
  readonly id: string;
  readonly name: string;
  readonly realm: Realm;
  readonly subject: string;
  readonly guideId: string;
  readonly description: string;
  readonly colorPalette: WorldDefinition['colorPalette'];
  readonly luminance: number;
  readonly stage: WorldLuminance['stage'];
  readonly totalKindlersContributed: number;
}

interface WorldDetail extends WorldSummary {
  readonly lightingMood: string;
  readonly biomeKit: string;
  readonly entryCount: number;
  readonly threadwayConnections: readonly string[];
  readonly lastRestoredAt: number;
  readonly activeKindlerCount: number;
}

interface EntrySummary {
  readonly id: string;
  readonly type: RealWorldEntry['type'];
  readonly title: string;
  readonly year: number | null;
  readonly era: RealWorldEntry['era'];
  readonly continent: RealWorldEntry['continent'];
  readonly difficultyTier: RealWorldEntry['difficultyTier'];
  readonly adventureType: RealWorldEntry['adventureType'];
  readonly subjectTags: readonly string[];
  readonly funFact: string;
  readonly guideId: string;
}

interface WorldsListResponse {
  readonly ok: true;
  readonly worlds: readonly WorldSummary[];
  readonly total: number;
}

interface WorldDetailResponse {
  readonly ok: true;
  readonly world: WorldDetail;
}

interface WorldEntriesResponse {
  readonly ok: true;
  readonly worldId: string;
  readonly entries: readonly EntrySummary[];
  readonly total: number;
}

interface LuminanceHistoryResponse {
  readonly ok: true;
  readonly worldId: string;
  readonly history: readonly LuminanceLogEntry[];
  readonly total: number;
}

interface RestoreResponse {
  readonly ok: true;
  readonly worldId: string;
  readonly kindlerId: string;
  readonly queued: boolean;
}

interface ErrorResponse {
  readonly ok: false;
  readonly error: string;
  readonly code: string;
}

// ─── Helpers ──────────────────────────────────────────────────────

const REALMS: readonly Realm[] = ['discovery', 'expression', 'exchange', 'crossroads'];

function isRealm(value: unknown): value is Realm {
  return typeof value === 'string' && (REALMS as readonly string[]).includes(value);
}

function buildLuminanceSummary(
  world: WorldDefinition,
  store: Map<string, WorldLuminance>,
): { luminance: number; stage: WorldLuminance['stage']; totalKindlersContributed: number } {
  const lum = store.get(world.id);
  return {
    luminance: lum?.luminance ?? 0.5,
    stage: lum?.stage ?? 'dimming',
    totalKindlersContributed: lum?.totalKindlersContributed ?? 0,
  };
}

function worldToSummary(world: WorldDefinition, store: Map<string, WorldLuminance>): WorldSummary {
  const { luminance, stage, totalKindlersContributed } = buildLuminanceSummary(world, store);
  return {
    id: world.id,
    name: world.name,
    realm: world.realm,
    subject: world.subject,
    guideId: world.guideId,
    description: world.description,
    colorPalette: world.colorPalette,
    luminance,
    stage,
    totalKindlersContributed,
  };
}

function worldToDetail(
  world: WorldDefinition,
  store: Map<string, WorldLuminance>,
  entryCount: number,
): WorldDetail {
  const lum = store.get(world.id);
  return {
    ...worldToSummary(world, store),
    lightingMood: world.lightingMood,
    biomeKit: world.biomeKit,
    entryCount,
    threadwayConnections: world.threadwayConnections,
    lastRestoredAt: lum?.lastRestoredAt ?? 0,
    activeKindlerCount: lum?.activeKindlerCount ?? 0,
  };
}

function entryToSummary(entry: RealWorldEntry): EntrySummary {
  return {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    year: entry.year,
    era: entry.era,
    continent: entry.continent,
    difficultyTier: entry.difficultyTier,
    adventureType: entry.adventureType,
    subjectTags: entry.subjectTags,
    funFact: entry.funFact,
    guideId: entry.guideId,
  };
}

// ─── Route Registration ────────────────────────────────────────────

export function registerWorldsRoutes(app: FastifyAppLike, deps: WorldsRoutesDeps): void {
  const { worldsEngine, contentEngine, luminanceStore, pgLuminanceRepo, onRestoreEvent } = deps;

  // GET /v1/worlds — list all worlds (optional ?realm= query param)
  app.get('/v1/worlds', async (req, reply) => {
    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const realmFilter = typeof query['realm'] === 'string' ? query['realm'] : null;

    let worlds: readonly WorldDefinition[];
    if (realmFilter !== null) {
      if (!isRealm(realmFilter)) {
        const err: ErrorResponse = {
          ok: false,
          error: `Invalid realm '${realmFilter}'. Must be one of: discovery, expression, exchange, crossroads`,
          code: 'INVALID_INPUT',
        };
        return reply.code(400).send(err);
      }
      worlds = worldsEngine.getWorldsByRealm(realmFilter);
    } else {
      const stats = worldsEngine.getStats();
      worlds = [
        ...worldsEngine.getWorldsByRealm('discovery'),
        ...worldsEngine.getWorldsByRealm('expression'),
        ...worldsEngine.getWorldsByRealm('exchange'),
        ...worldsEngine.getWorldsByRealm('crossroads'),
      ];
      void stats;
    }

    const res: WorldsListResponse = {
      ok: true,
      worlds: worlds.map(w => worldToSummary(w, luminanceStore)),
      total: worlds.length,
    };
    return reply.send(res);
  });

  // GET /v1/worlds/realm/:realm — worlds by realm (convenience endpoint)
  app.get('/v1/worlds/realm/:realm', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const realm = params['realm'];

    if (!isRealm(realm)) {
      const err: ErrorResponse = {
        ok: false,
        error: `Invalid realm. Must be one of: discovery, expression, exchange, crossroads`,
        code: 'INVALID_INPUT',
      };
      return reply.code(400).send(err);
    }

    const worlds = worldsEngine.getWorldsByRealm(realm);
    const res: WorldsListResponse = {
      ok: true,
      worlds: worlds.map(w => worldToSummary(w, luminanceStore)),
      total: worlds.length,
    };
    return reply.send(res);
  });

  // GET /v1/worlds/:worldId/luminance/history — luminance change log
  // Registered BEFORE /:worldId to avoid Fastify route conflict
  app.get('/v1/worlds/:worldId/luminance/history', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;
    if (worldId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    if (pgLuminanceRepo === undefined) {
      const err: ErrorResponse = { ok: false, error: 'History unavailable', code: 'UNAVAILABLE' };
      return reply.code(503).send(err);
    }
    const rawLimit = typeof query['limit'] === 'string' ? parseInt(query['limit'], 10) : 50;
    const rawOffset = typeof query['offset'] === 'string' ? parseInt(query['offset'], 10) : 0;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50;
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
    const history = await pgLuminanceRepo.loadHistory(worldId, limit, offset);
    const res: LuminanceHistoryResponse = { ok: true, worldId, history, total: history.length };
    return reply.send(res);
  });

  // POST /v1/worlds/:worldId/restore — kindler triggers world restore
  // Registered BEFORE /:worldId to avoid Fastify route conflict
  app.post('/v1/worlds/:worldId/restore', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body as Record<string, unknown> | null | undefined;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;
    if (worldId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const world = worldsEngine.getWorldById(worldId);
    if (world === undefined) {
      const err: ErrorResponse = { ok: false, error: `World '${worldId}' not found`, code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }
    const kindlerId = typeof body?.['kindlerId'] === 'string' ? body['kindlerId'] : null;
    if (kindlerId === null || kindlerId.length === 0) {
      const err: ErrorResponse = { ok: false, error: 'kindlerId is required', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const rawTier = typeof body?.['difficultyTier'] === 'number' ? body['difficultyTier'] : 1;
    const tier: DifficultyTier = rawTier === 1 || rawTier === 2 || rawTier === 3 ? rawTier : 1;
    if (onRestoreEvent !== undefined) {
      onRestoreEvent(worldId, kindlerId, tier);
    }
    const res: RestoreResponse = { ok: true, worldId, kindlerId, queued: true };
    return reply.send(res);
  });

  // GET /v1/worlds/:worldId/luminance — dedicated luminance snapshot
  // Registered BEFORE /:worldId to avoid Fastify route conflict
  app.get('/v1/worlds/:worldId/luminance', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;
    if (worldId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const world = worldsEngine.getWorldById(worldId);
    if (world === undefined) {
      const err: ErrorResponse = { ok: false, error: `World '${worldId}' not found`, code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }
    const lum = luminanceStore.get(worldId);
    return reply.send({
      ok: true,
      worldId,
      luminance: lum?.luminance ?? 0.5,
      stage: lum?.stage ?? 'dimming',
      lastRestoredAt: lum?.lastRestoredAt ?? 0,
      totalKindlersContributed: lum?.totalKindlersContributed ?? 0,
      activeKindlerCount: lum?.activeKindlerCount ?? 0,
    });
  });

  // GET /v1/worlds/:worldId — world detail + current luminance
  app.get('/v1/worlds/:worldId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;

    if (worldId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    // Skip sub-routes that are registered separately
    if (worldId === 'realm') {
      const err: ErrorResponse = { ok: false, error: 'Not found', code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }

    const world = worldsEngine.getWorldById(worldId);
    if (world === undefined) {
      const err: ErrorResponse = { ok: false, error: `World '${worldId}' not found`, code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }

    const entries = contentEngine.getEntriesForWorld(worldId);
    const res: WorldDetailResponse = {
      ok: true,
      world: worldToDetail(world, luminanceStore, entries.length),
    };
    return reply.send(res);
  });

  // GET /v1/worlds/:worldId/entries — published entries for a world
  app.get('/v1/worlds/:worldId/entries', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const worldId = typeof params['worldId'] === 'string' ? params['worldId'] : null;

    if (worldId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid worldId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const world = worldsEngine.getWorldById(worldId);
    if (world === undefined) {
      const err: ErrorResponse = { ok: false, error: `World '${worldId}' not found`, code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }

    const entries = contentEngine.getEntriesForWorld(worldId);
    const res: WorldEntriesResponse = {
      ok: true,
      worldId,
      entries: entries.map(entryToSummary),
      total: entries.length,
    };
    return reply.send(res);
  });
}
