/**
 * Kindler Routes — Child profile creation and management.
 *
 * POST /v1/kindler              — Create a new Kindler (child) profile
 * GET  /v1/kindler/:id         — Get Kindler profile
 * GET  /v1/kindler/:id/spark   — Get current Spark state
 * GET  /v1/kindler/:id/progress — Get entry completion history
 * GET  /v1/kindler/:id/chapter  — Get current chapter info and progress toward next
 * GET  /v1/kindler/:id/dashboard — Get dashboard summary (spark, chapter, worlds)
 * POST /v1/kindler/:id/spark/redeem — Redeem spark for a cosmetic item
 *
 * All routes require Authorization: Bearer <parent-token>
 * COPPA: no real names — displayName is a nickname, no DOB stored.
 *
 * Thread: silk/game-characters
 * Tier: 1
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { KindlerRepository } from '../../universe/kindler/repository.js';
import { CHAPTER_THRESHOLDS } from '../../universe/kindler/engine.js';
import type { KindlerEngine } from '../../universe/kindler/engine.js';
import type { KindlerProfile, AgeTier, Chapter } from '../../universe/kindler/types.js';

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

// ─── Chapter helpers ──────────────────────────────────────────────

const CHAPTER_ORDER: readonly Chapter[] = [
  'first_light', 'threadways_open', 'deep_fade', 'the_source', 'kindlers_legacy',
];

interface ChapterInfo {
  readonly current: Chapter;
  readonly nextChapter: Chapter | null;
  readonly thresholdForNext: number | null;
  readonly worldsRestored: number;
  readonly worldsNeeded: number;
  readonly isMaxChapter: boolean;
}

function buildChapterInfo(profile: KindlerProfile): ChapterInfo {
  const currentIdx = CHAPTER_ORDER.indexOf(profile.currentChapter);
  const nextChapter = CHAPTER_ORDER[currentIdx + 1] ?? null;
  const thresholdForNext = nextChapter !== null ? CHAPTER_THRESHOLDS[nextChapter] : null;
  const worldsRestored = profile.worldsRestored.length;
  const worldsNeeded = thresholdForNext !== null ? Math.max(0, thresholdForNext - worldsRestored) : 0;
  return {
    current: profile.currentChapter,
    nextChapter,
    thresholdForNext,
    worldsRestored,
    worldsNeeded,
    isMaxChapter: nextChapter === null,
  };
}

interface ChapterResponse {
  readonly ok: true;
  readonly chapter: ChapterInfo;
}

interface DashboardResponse {
  readonly ok: true;
  readonly dashboard: {
    readonly kindlerId: string;
    readonly displayName: string;
    readonly ageTier: AgeTier;
    readonly entriesCompleted: number;
    readonly spark: {
      readonly level: number;
      readonly trend: string;
      readonly streakDays: number;
    };
    readonly chapter: {
      readonly current: Chapter;
      readonly nextChapter: Chapter | null;
      readonly worldsNeeded: number;
    };
    readonly worlds: {
      readonly visited: number;
      readonly restored: number;
    };
  };
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

interface PatchKindlerFields {
  readonly displayName?: string;
  readonly ageTier?: AgeTier;
  readonly avatarId?: string;
}

/** Returns null if body is invalid/empty. */
function parsePatch(body: unknown): PatchKindlerFields | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;

  let displayName: string | undefined;
  let ageTier: AgeTier | undefined;
  let avatarId: string | undefined;

  if ('displayName' in b) {
    if (typeof b['displayName'] !== 'string' || b['displayName'].length < 2 || b['displayName'].length > 20) return null;
    displayName = b['displayName'];
  }
  if ('ageTier' in b) {
    if (b['ageTier'] !== 1 && b['ageTier'] !== 2 && b['ageTier'] !== 3) return null;
    ageTier = b['ageTier'] as AgeTier;
  }
  if ('avatarId' in b) {
    if (typeof b['avatarId'] !== 'string' || b['avatarId'].length === 0) return null;
    avatarId = b['avatarId'];
  }

  if (displayName === undefined && ageTier === undefined && avatarId === undefined) return null;
  const result: { displayName?: string; ageTier?: AgeTier; avatarId?: string } = {};
  if (displayName !== undefined) result.displayName = displayName;
  if (ageTier !== undefined) result.ageTier = ageTier;
  if (avatarId !== undefined) result.avatarId = avatarId;
  return result;
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

  // PATCH /v1/kindler/:id — update displayName, ageTier, or avatarId
  app.patch('/v1/kindler/:id', async (req, reply) => {
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

    const patch = parsePatch((req as unknown as { body: unknown }).body);
    if (patch === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid or empty patch', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const updated: KindlerProfile = {
      ...profile,
      displayName: patch.displayName !== undefined ? patch.displayName : profile.displayName,
      ageTier: patch.ageTier !== undefined ? patch.ageTier : profile.ageTier,
      avatarId: patch.avatarId !== undefined ? patch.avatarId : profile.avatarId,
    };

    await repo.save(updated);
    engine.registerKindler(updated);
    return reply.send(toKindlerResponse(updated));
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

  // GET /v1/kindler/:id/chapter — get current chapter info
  app.get('/v1/kindler/:id/chapter', async (req, reply) => {
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

    const res: ChapterResponse = { ok: true, chapter: buildChapterInfo(profile) };
    return reply.send(res);
  });

  // GET /v1/kindler/:id/dashboard — get dashboard summary
  app.get('/v1/kindler/:id/dashboard', async (req, reply) => {
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

    try {
      engine.getSparkState(id);
    } catch {
      engine.registerKindler(profile);
    }

    const spark = engine.getSparkState(id);
    const progList = await repo.loadProgress(id);
    const chapterInfo = buildChapterInfo(profile);

    const res: DashboardResponse = {
      ok: true,
      dashboard: {
        kindlerId: profile.id,
        displayName: profile.displayName,
        ageTier: profile.ageTier,
        entriesCompleted: progList.length,
        spark: {
          level: spark.level,
          trend: spark.trend,
          streakDays: spark.streakDays,
        },
        chapter: {
          current: chapterInfo.current,
          nextChapter: chapterInfo.nextChapter,
          worldsNeeded: chapterInfo.worldsNeeded,
        },
        worlds: {
          visited: profile.worldsVisited.length,
          restored: profile.worldsRestored.length,
        },
      },
    };
    return reply.send(res);
  });

  // POST /v1/kindler/:id/spark/redeem — spend spark on a cosmetic/reward
  app.post('/v1/kindler/:id/spark/redeem', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: unknown }).body as Record<string, unknown> | null | undefined;
    const id = typeof params['id'] === 'string' ? params['id'] : null;
    if (id === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid id', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const rawCost = typeof body?.['cost'] === 'number' ? body['cost'] : null;
    const itemId = typeof body?.['itemId'] === 'string' ? body['itemId'] : null;
    const itemType = typeof body?.['itemType'] === 'string' ? body['itemType'] : null;
    if (rawCost === null || rawCost <= 0 || rawCost > 1.0) {
      const err: ErrorResponse = { ok: false, error: 'cost must be between 0 and 1.0 (spark fraction)', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    if (itemId === null || itemType === null) {
      const err: ErrorResponse = { ok: false, error: 'itemId and itemType are required', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const profile = await repo.findById(id);
    if (profile === null) {
      const err: ErrorResponse = { ok: false, error: `Kindler '${id}' not found`, code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }
    if (profile.sparkLevel < rawCost) {
      const err: ErrorResponse = { ok: false, error: 'Insufficient spark', code: 'INSUFFICIENT_SPARK' };
      return reply.code(422).send(err);
    }
    const newSparkLevel = Math.max(0, parseFloat((profile.sparkLevel - rawCost).toFixed(4)));
    const updated: typeof profile = { ...profile, sparkLevel: newSparkLevel };
    await repo.save(updated);
    await repo.appendSparkEntry({
      id: crypto.randomUUID(),
      kindlerId: id,
      sparkLevel: newSparkLevel,
      delta: -rawCost,
      cause: 'item_redeemed',
      timestamp: Date.now(),
    });
    return reply.send({ ok: true, kindlerId: id, sparkLevel: newSparkLevel, cost: rawCost, itemId, itemType });
  });
}
