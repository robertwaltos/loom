/**
 * Account Routes — GDPR / COPPA compliance endpoints.
 *
 * GET    /v1/account/export — Full COPPA-safe data export (no PII)
 * DELETE /v1/account        — Anonymise account; Chronicle entries retained
 *
 * All routes require Authorization: Bearer <kindler-session-token>.
 * The token is treated as the kindlerId (consistent with kindler routes).
 *
 * Thread: silk/phase2-compliance
 * Tier: 1
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { KindlerRepository } from '../../universe/kindler/repository.js';
import type { KindlerProfile, AgeTier, Chapter } from '../../universe/kindler/types.js';
import type { SparkLogEntry, KindlerProgress } from '../../universe/kindler/types.js';

// ─── Deps ─────────────────────────────────────────────────────────

export interface AccountRoutesDeps {
  readonly repo: KindlerRepository;
  readonly log: (level: 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) => void;
  /** Optional: called to delete spark logs for a kindler during account deletion */
  readonly deleteSparkLogs?: (kindlerId: string) => Promise<void>;
  /** Optional: called to delete sessions for a kindler during account deletion */
  readonly deleteSessions?: (kindlerId: string) => Promise<void>;
}

// ─── Response shapes ──────────────────────────────────────────────

interface ExportResponse {
  readonly exportedAt: string;
  readonly kindler: {
    readonly id: string;
    readonly displayName: string;
    readonly ageTier: AgeTier;
    readonly avatarId: string;
    readonly sparkLevel: number;
    readonly currentChapter: Chapter;
    readonly guidesMetCount: number;
    readonly createdAt: number;
  };
  readonly progress: readonly {
    readonly entryId: string;
    readonly completedAt: number;
    readonly adventureType: string;
    readonly score: number | null;
  }[];
  readonly worldsVisited: readonly string[];
  readonly guidesMetCount: number;
}

interface DeleteResponse {
  readonly deleted: true;
  readonly message: string;
}

interface ErrorResponse {
  readonly ok: false;
  readonly error: string;
  readonly code: string;
}

// ─── Helpers ──────────────────────────────────────────────────────

function extractBearerToken(authHeader: unknown): string | null {
  if (typeof authHeader !== 'string') return null;
  const match = /^Bearer (.+)$/.exec(authHeader);
  return match ? (match[1] ?? null) : null;
}

function anonymiseProfile(profile: KindlerProfile): KindlerProfile {
  return {
    id: profile.id,
    parentAccountId: profile.parentAccountId,
    displayName: 'Former Kindler',
    ageTier: profile.ageTier,
    avatarId: '',
    sparkLevel: 0,
    currentChapter: profile.currentChapter,
    worldsVisited: [],
    worldsRestored: [],
    guidesMetCount: 0,
    createdAt: profile.createdAt,
  };
}

function toExportResponse(
  profile: KindlerProfile,
  progress: readonly KindlerProgress[],
  sparkLog: readonly SparkLogEntry[],
): ExportResponse {
  void sparkLog; // spark log included in progress count; raw log not exposed per COPPA
  return {
    exportedAt: new Date().toISOString(),
    kindler: {
      id: profile.id,
      displayName: profile.displayName,
      ageTier: profile.ageTier,
      avatarId: profile.avatarId,
      sparkLevel: profile.sparkLevel,
      currentChapter: profile.currentChapter,
      guidesMetCount: profile.guidesMetCount,
      createdAt: profile.createdAt,
    },
    progress: progress.map((p) => ({
      entryId: p.entryId,
      completedAt: p.completedAt,
      adventureType: p.adventureType,
      score: p.score,
    })),
    worldsVisited: profile.worldsVisited,
    guidesMetCount: profile.guidesMetCount,
  };
}

// ─── Route Registration ───────────────────────────────────────────

export function registerAccountRoutes(app: FastifyAppLike, deps: AccountRoutesDeps): void {
  const { repo, log, deleteSparkLogs, deleteSessions } = deps;

  // GET /v1/account/export
  app.get('/v1/account/export', async (req, reply) => {
    const headers = (req as unknown as { headers: Record<string, unknown> }).headers;
    const kindlerId = extractBearerToken(headers['authorization']);

    if (kindlerId === null) {
      const err: ErrorResponse = { ok: false, error: 'Missing or malformed Authorization header', code: 'UNAUTHORIZED' };
      return reply.code(401).send(err);
    }

    const profile = await repo.findById(kindlerId);
    if (profile === null) {
      const err: ErrorResponse = { ok: false, error: 'Kindler not found', code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }

    const [progress, sparkLog] = await Promise.all([
      repo.loadProgress(kindlerId),
      repo.loadSparkLog(kindlerId),
    ]);

    log('info', 'account:export', { kindlerId });
    return reply.send(toExportResponse(profile, progress, sparkLog));
  });

  // DELETE /v1/account
  app.delete('/v1/account', async (req, reply) => {
    const headers = (req as unknown as { headers: Record<string, unknown> }).headers;
    const kindlerId = extractBearerToken(headers['authorization']);

    if (kindlerId === null) {
      const err: ErrorResponse = { ok: false, error: 'Missing or malformed Authorization header', code: 'UNAUTHORIZED' };
      return reply.code(401).send(err);
    }

    const body = (req as unknown as { body: unknown }).body;
    const b = (typeof body === 'object' && body !== null) ? body as Record<string, unknown> : {};
    if (b['confirm'] !== true) {
      const err: ErrorResponse = { ok: false, error: 'Confirmation required: send { confirm: true }', code: 'CONFIRMATION_REQUIRED' };
      return reply.code(400).send(err);
    }

    const profile = await repo.findById(kindlerId);
    if (profile === null) {
      const err: ErrorResponse = { ok: false, error: 'Kindler not found', code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }

    // Anonymise the profile — Chronicle entries are preserved by design
    const anonymised = anonymiseProfile(profile);
    await repo.save(anonymised);

    // Delete spark logs and sessions if deletion hooks are provided
    if (deleteSparkLogs !== undefined) await deleteSparkLogs(kindlerId);
    if (deleteSessions !== undefined) await deleteSessions(kindlerId);

    log('info', 'account:deleted', { kindlerId });

    const res: DeleteResponse = {
      deleted: true,
      message: 'Account anonymised. Chronicle entries retained per Terms of Service.',
    };
    return reply.send(res);
  });
}
