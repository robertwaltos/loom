/**
 * Leaderboard Routes
 *
 * HTTP endpoints for Koydo leaderboard snapshots.
 * Backed by loom_leaderboard_snapshots (see db/migrations/0005_leaderboard_snapshots.sql).
 *
 * COPPA note: display names are avatar names — never real names or emails.
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { PgLeaderboardRepository } from '../../universe/leaderboard/pg-repository.js';
import type { KindlerRepository } from '../../universe/kindler/repository.js';
import { sparkLevelToScore } from '../../universe/leaderboard/types.js';

// ─── Deps ──────────────────────────────────────────────────────────

export interface LeaderboardRoutesDeps {
  readonly repo: KindlerRepository;
  readonly leaderboardRepo: PgLeaderboardRepository;
  readonly now: () => number;
  readonly log: (level: 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) => void;
  /** Required for DELETE endpoints (operations use cases). */
  readonly moderationSecret?: string;
}

// ─── Route Registration ────────────────────────────────────────────

export function registerLeaderboardRoutes(
  app: FastifyAppLike,
  deps: LeaderboardRoutesDeps,
): void {
  // GET /v1/leaderboard/:boardId
  // Returns the top 100 scores for a board (latest per player, ranked).
  app.get('/v1/leaderboard/:boardId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const query = (req as unknown as { query: Record<string, unknown> }).query ?? {};

    const boardId = typeof params['boardId'] === 'string' ? params['boardId'] : null;
    const rawLimit = query['limit'];
    const limit = typeof rawLimit === 'string' ? Math.min(100, Math.max(1, parseInt(rawLimit, 10))) : 100;

    if (boardId === null) {
      return reply.status(422).send({ ok: false, error: 'Invalid boardId' });
    }

    try {
      const [entries, playerCount] = await Promise.all([
        deps.leaderboardRepo.getTopScores(boardId, limit),
        deps.leaderboardRepo.getPlayerCount(boardId),
      ]);
      return reply.send({ ok: true, boardId, playerCount, entries });
    } catch (err) {
      deps.log('error', 'leaderboard:get_failed', { boardId, error: String(err) });
      return reply.status(500).send({ ok: false, error: 'Failed to load leaderboard' });
    }
  });

  // GET /v1/leaderboard/:boardId/player/:playerId
  // Returns the most recent snapshot for a specific player.
  app.get('/v1/leaderboard/:boardId/player/:playerId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const boardId = typeof params['boardId'] === 'string' ? params['boardId'] : null;
    const playerId = typeof params['playerId'] === 'string' ? params['playerId'] : null;

    if (boardId === null || playerId === null) {
      return reply.status(422).send({ ok: false, error: 'boardId and playerId are required' });
    }

    try {
      const snapshot = await deps.leaderboardRepo.getPlayerRank(boardId, playerId);
      if (snapshot === null) {
        return reply.status(404).send({ ok: false, error: 'Player not found on this leaderboard' });
      }
      return reply.send({ ok: true, snapshot });
    } catch (err) {
      deps.log('error', 'leaderboard:player_rank_failed', { boardId, playerId, error: String(err) });
      return reply.status(500).send({ ok: false, error: 'Failed to load player rank' });
    }
  });

  // POST /v1/leaderboard/:boardId/snapshot
  // Records a new leaderboard snapshot for a player from their current spark level.
  // Body: { playerId }
  app.post('/v1/leaderboard/:boardId/snapshot', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const body = (req as unknown as { body: Record<string, unknown> }).body ?? {};

    const boardId = typeof params['boardId'] === 'string' ? params['boardId'] : null;
    const playerId = typeof body['playerId'] === 'string' ? body['playerId'] : null;

    if (boardId === null || playerId === null) {
      return reply.status(422).send({ ok: false, error: 'boardId and playerId are required' });
    }

    // Load kindler to get current sparkLevel and displayName
    const profile = await deps.repo.findById(playerId).catch(() => null);
    if (profile === null) {
      return reply.status(404).send({ ok: false, error: 'Kindler not found', code: 'NOT_FOUND' });
    }

    const score = sparkLevelToScore(profile.sparkLevel);

    // Determine rank by counting players with a higher score on this board
    const topEntries = await deps.leaderboardRepo.getTopScores(boardId, 1000).catch(() => []);
    const rank = topEntries.filter(e => e.score > score).length + 1;

    try {
      const snapshot = await deps.leaderboardRepo.saveSnapshot({
        boardId,
        playerId,
        displayName: profile.displayName,
        score,
        rank,
        snapshotAt: deps.now(),
      });

      deps.log('info', 'leaderboard:snapshot_saved', { boardId, playerId, score, rank });
      return reply.status(201).send({ ok: true, snapshot });
    } catch (err) {
      deps.log('error', 'leaderboard:snapshot_failed', { boardId, playerId, error: String(err) });
      return reply.status(500).send({ ok: false, error: 'Failed to save snapshot' });
    }
  });

  // DELETE /v1/leaderboard/:boardId/player/:playerId (ops, secret-guarded)
  // Removes all snapshot rows for a player from a board.
  app.delete('/v1/leaderboard/:boardId/player/:playerId', async (req, reply) => {
    const headers = (req as unknown as { headers: Record<string, string | string[] | undefined> }).headers;
    const secret = headers['x-moderation-secret'];
    if (!deps.moderationSecret || secret !== deps.moderationSecret) {
      return reply.status(403).send({ ok: false, error: 'Forbidden', code: 'FORBIDDEN' });
    }

    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const boardId = typeof params['boardId'] === 'string' ? params['boardId'] : null;
    const playerId = typeof params['playerId'] === 'string' ? params['playerId'] : null;

    if (boardId === null || playerId === null) {
      return reply.status(422).send({ ok: false, error: 'boardId and playerId are required' });
    }

    try {
      const deleted = await deps.leaderboardRepo.deletePlayerScores(boardId, playerId);
      deps.log('info', 'leaderboard:player_deleted', { boardId, playerId, deleted });
      return reply.send({ ok: true, deleted });
    } catch (err) {
      deps.log('error', 'leaderboard:delete_failed', { boardId, playerId, error: String(err) });
      return reply.status(500).send({ ok: false, error: 'Failed to delete player scores' });
    }
  });
}
