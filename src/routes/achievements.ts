/**
 * Achievements Routes
 *
 * HTTP endpoints for unlocking and querying player achievements.
 * Backed by loom_achievements table (see db/migrations/0004_achievements.sql).
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { PgAchievementsRepository } from '../../universe/achievements/pg-repository.js';
import type { KindlerRepository } from '../../universe/kindler/repository.js';

// ─── Deps ──────────────────────────────────────────────────────────

export interface AchievementsRoutesDeps {
  readonly repo: KindlerRepository;
  readonly achievementsRepo: PgAchievementsRepository;
  readonly now: () => number;
  readonly log: (level: 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) => void;
}

// ─── Route Registration ────────────────────────────────────────────

export function registerAchievementsRoutes(
  app: FastifyAppLike,
  deps: AchievementsRoutesDeps,
): void {
  // GET /v1/achievements/:playerId
  app.get('/v1/achievements/:playerId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const playerId = typeof params['playerId'] === 'string' ? params['playerId'] : null;

    if (playerId === null) {
      return reply.status(422).send({ ok: false, error: 'Invalid playerId' });
    }

    try {
      const achievements = await deps.achievementsRepo.getByPlayer(playerId);
      return reply.send({ ok: true, playerId, count: achievements.length, achievements });
    } catch (err) {
      deps.log('error', 'achievements:get_failed', { playerId, error: String(err) });
      return reply.status(500).send({ ok: false, error: 'Failed to load achievements' });
    }
  });

  // POST /v1/achievements/unlock
  // Body: { achievementId, playerId, progress?, metadata? }
  app.post('/v1/achievements/unlock', async (req, reply) => {
    const body = (req as unknown as { body: Record<string, unknown> }).body ?? {};

    const achievementId = typeof body['achievementId'] === 'string' ? body['achievementId'] : null;
    const playerId = typeof body['playerId'] === 'string' ? body['playerId'] : null;
    const progress = typeof body['progress'] === 'number' ? Math.min(100, Math.max(0, body['progress'])) : 100;
    const metadata = body['metadata'] !== undefined && typeof body['metadata'] === 'object' && body['metadata'] !== null
      ? body['metadata'] as Record<string, unknown>
      : null;

    if (achievementId === null || playerId === null) {
      return reply.status(422).send({ ok: false, error: 'achievementId and playerId are required' });
    }

    // Verify kindler exists
    const profile = await deps.repo.findById(playerId).catch(() => null);
    if (profile === null) {
      return reply.status(404).send({ ok: false, error: 'Kindler not found', code: 'NOT_FOUND' });
    }

    const achievement = {
      achievementId,
      playerId,
      unlockedAt: deps.now(),
      progress,
      metadata,
    };

    try {
      await deps.achievementsRepo.save(achievement);
      deps.log('info', 'achievements:unlocked', { achievementId, playerId, progress });
      return reply.status(201).send({ ok: true, achievement });
    } catch (err) {
      deps.log('error', 'achievements:unlock_failed', { achievementId, playerId, error: String(err) });
      return reply.status(500).send({ ok: false, error: 'Failed to save achievement' });
    }
  });

  // PATCH /v1/achievements/:achievementId/progress
  // Body: { playerId, progress }
  app.patch('/v1/achievements/:achievementId/progress', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: Record<string, unknown> }).body ?? {};

    const achievementId = typeof params['achievementId'] === 'string' ? params['achievementId'] : null;
    const playerId = typeof body['playerId'] === 'string' ? body['playerId'] : null;
    const progress = typeof body['progress'] === 'number' ? body['progress'] : null;

    if (achievementId === null || playerId === null || progress === null) {
      return reply.status(422).send({ ok: false, error: 'achievementId, playerId, and progress are required' });
    }

    if (progress < 0 || progress > 100) {
      return reply.status(422).send({ ok: false, error: 'progress must be 0-100' });
    }

    try {
      await deps.achievementsRepo.updateProgress(achievementId, playerId, progress);
      return reply.send({ ok: true, achievementId, playerId, progress });
    } catch (err) {
      deps.log('warn', 'achievements:progress_update_failed', { achievementId, playerId, error: String(err) });
      return reply.status(500).send({ ok: false, error: 'Failed to update progress' });
    }
  });
}
