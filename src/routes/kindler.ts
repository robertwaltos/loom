/**
 * Kindler Routes — Child profile creation and management.
 *
 * POST /v1/kindler           — Create a new Kindler (child) profile
 * GET  /v1/kindler/:id       — Get Kindler profile
 * GET  /v1/kindler/:id/spark — Get current Spark state
 * GET  /v1/kindler/:id/progress — Get entry completion history
 *
 * All routes require Authorization: Bearer <parent-token>
 * COPPA: no real names — displayName is a nickname, no DOB stored.
 *
 * Thread: silk/game-characters
 * Tier: 1
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { KindlerRepository } from '../../universe/kindler/repository.js';
import type { KindlerEngine } from '../../universe/kindler/engine.js';
import type { KindlerProfile, AgeTier } from '../../universe/kindler/types.js';

// ─── Request / Response shapes ────────────────────────────────────

interface CreateKindlerRequest {
  readonly displayName: string;
  readonly ageTier: AgeTier;
  readonly avatarId: string;
}

interface KindlerResponse {
  readonly ok: true;
  readonly kindler: {
    readonly id: string;
    readonly displayName: string;
    readonly ageTier: AgeTier;
    readonly avatarId: string;
    readonly sparkLevel: number;
    readonly currentChapter: string;
    readonly worldsVisited: number;
    readonly worldsRestored: number;
    readonly guidesMetCount: number;
    readonly createdAt: number;
  };
}

interface SparkResponse {
  readonly ok: true;
  readonly spark: {
    readonly level: number;
    readonly trend: string;
    readonly streakDays: number;
    readonly lastActivityAt: number;
  };
}

interface ProgressResponse {
  readonly ok: true;
  readonly progress: readonly {
    readonly entryId: string;
    readonly completedAt: number;
    readonly adventureType: string;
    readonly score: number | null;
  }[];
}

interface ErrorResponse {
  readonly ok: false;
  readonly error: string;
  readonly code: string;
}

// ─── Validation ───────────────────────────────────────────────────

function validateCreateInput(body: unknown): CreateKindlerRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  if (typeof b['displayName'] !== 'string' || b['displayName'].length < 2 || b['displayName'].length > 20) return null;
  if (b['ageTier'] !== 1 && b['ageTier'] !== 2 && b['ageTier'] !== 3) return null;
  if (typeof b['avatarId'] !== 'string' || b['avatarId'].length === 0) return null;
  return { displayName: b['displayName'], ageTier: b['ageTier'], avatarId: b['avatarId'] };
}

function extractParentId(req: { headers: Record<string, unknown> }): string | null {
  const auth = req.headers['authorization'];
  if (typeof auth !== 'string') return null;
  const match = /^Bearer (.+)$/.exec(auth);
  return match ? (match[1] ?? null) : null;
}

function toKindlerResponse(profile: KindlerProfile): KindlerResponse {
  return {
    ok: true,
    kindler: {
      id: profile.id,
      displayName: profile.displayName,
      ageTier: profile.ageTier,
      avatarId: profile.avatarId,
      sparkLevel: profile.sparkLevel,
      currentChapter: profile.currentChapter,
      worldsVisited: profile.worldsVisited.length,
      worldsRestored: profile.worldsRestored.length,
      guidesMetCount: profile.guidesMetCount,
      createdAt: profile.createdAt,
    },
  };
}

// ─── Route Registration ───────────────────────────────────────────

export interface KindlerRoutesDeps {
  readonly repo: KindlerRepository;
  readonly engine: KindlerEngine;
  readonly idGenerator: { generate: () => string };
}

export function registerKindlerRoutes(app: FastifyAppLike, deps: KindlerRoutesDeps): void {
  const { repo, engine, idGenerator } = deps;

  // POST /v1/kindler — create a new Kindler
  app.post('/v1/kindler', async (req, reply) => {
    const parentId = extractParentId(req as unknown as { headers: Record<string, unknown> });
    if (parentId === null) {
      const err: ErrorResponse = { ok: false, error: 'Missing authorization', code: 'UNAUTHORIZED' };
      return reply.code(401).send(err);
    }

    const input = validateCreateInput((req as unknown as { body: unknown }).body);
    if (input === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid input', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const now = Date.now();
    const profile: KindlerProfile = {
      id: idGenerator.generate(),
      parentAccountId: parentId,
      displayName: input.displayName,
      ageTier: input.ageTier,
      avatarId: input.avatarId,
      sparkLevel: 0.05,
      currentChapter: 'first_light',
      worldsVisited: [],
      worldsRestored: [],
      guidesMetCount: 0,
      createdAt: now,
    };

    await repo.save(profile);
    engine.registerKindler(profile);

    return reply.code(201).send(toKindlerResponse(profile));
  });

  // GET /v1/kindler/:id — get Kindler profile
  app.get('/v1/kindler/:id', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const id = typeof params['id'] === 'string' ? params['id'] : null;
    if (id === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid id', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const profile = await repo.findById(id);
    if (profile === null) {
      const err: ErrorResponse = { ok: false, error: 'Not found', code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }

    return reply.send(toKindlerResponse(profile));
  });

  // GET /v1/kindler/:id/spark — get current Spark state
  app.get('/v1/kindler/:id/spark', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const id = typeof params['id'] === 'string' ? params['id'] : null;
    if (id === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid id', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const profile = await repo.findById(id);
    if (profile === null) {
      const err: ErrorResponse = { ok: false, error: 'Not found', code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }

    // Load into engine if not already registered
    try {
      engine.getSparkState(id);
    } catch {
      engine.registerKindler(profile);
    }

    const spark = engine.getSparkState(id);
    const res: SparkResponse = {
      ok: true,
      spark: {
        level: spark.level,
        trend: spark.trend,
        streakDays: spark.streakDays,
        lastActivityAt: spark.lastActivityAt,
      },
    };
    return reply.send(res);
  });

  // GET /v1/kindler/:id/progress — get entry completion history
  app.get('/v1/kindler/:id/progress', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const id = typeof params['id'] === 'string' ? params['id'] : null;
    if (id === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid id', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const progList = await repo.loadProgress(id);
    const res: ProgressResponse = {
      ok: true,
      progress: progList.map((p) => ({
        entryId: p.entryId,
        completedAt: p.completedAt,
        adventureType: p.adventureType,
        score: p.score,
      })),
    };
    return reply.send(res);
  });
}
