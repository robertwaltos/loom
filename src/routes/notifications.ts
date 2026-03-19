/**
 * Notifications Routes — Async message delivery for kindlers and parents.
 *
 * POST   /v1/notifications                    — Create notification (secret-guarded, internal use)
 * GET    /v1/notifications/:recipientId       — List notifications for a recipient
 * PATCH  /v1/notifications/:id/read           — Mark one as read
 * PATCH  /v1/notifications/:recipientId/read-all — Mark all as read
 * DELETE /v1/notifications/:id                — Delete a notification
 *
 * COPPA: No PII in body; auto-expires at 30 days; recipient is UUID only.
 * Thread: silk/notifications
 * Tier: 1
 */

import type { FastifyAppLike } from '@loom/selvage';
import type { PgNotificationsRepository, CreateNotificationInput, NotificationType } from '../../universe/notifications/pg-notifications-repository.js';

// ─── Deps ──────────────────────────────────────────────────────────

export interface NotificationsRoutesDeps {
  readonly pgNotifRepo: PgNotificationsRepository;
  /** Secret required to create notifications (internal service calls only) */
  readonly moderationSecret?: string;
  readonly now?: () => number;
}

// ─── Constants ────────────────────────────────────────────────────

const VALID_TYPES: ReadonlySet<string> = new Set<NotificationType>([
  'achievement_unlock', 'world_event', 'quest_complete', 'system',
]);

// ─── Response Shapes ──────────────────────────────────────────────

interface ErrorResponse {
  readonly ok: false;
  readonly error: string;
  readonly code: string;
}

// ─── Route Registration ────────────────────────────────────────────

export function registerNotificationsRoutes(app: FastifyAppLike, deps: NotificationsRoutesDeps): void {
  const { pgNotifRepo, moderationSecret, now = () => Date.now() } = deps;

  // POST /v1/notifications — create (internal, secret-guarded)
  app.post('/v1/notifications', async (req, reply) => {
    const headers = (req as unknown as { headers: Record<string, string | string[] | undefined> }).headers;
    const body = (req as unknown as { body: unknown }).body as Record<string, unknown> | null | undefined;

    if (moderationSecret !== undefined) {
      const provided = headers['x-moderation-secret'];
      const secret = Array.isArray(provided) ? provided[0] : provided;
      if (secret !== moderationSecret) {
        const err: ErrorResponse = { ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' };
        return reply.code(401).send(err);
      }
    }

    const recipientId = typeof body?.['recipientId'] === 'string' ? body['recipientId'] : null;
    const type = typeof body?.['type'] === 'string' ? body['type'] : null;
    const title = typeof body?.['title'] === 'string' ? body['title'].slice(0, 128) : null;
    const bodyText = typeof body?.['body'] === 'string' ? body['body'].slice(0, 512) : null;
    const rawExpiry = typeof body?.['expiresAt'] === 'number' ? body['expiresAt'] : undefined;

    if (recipientId === null || type === null || title === null || bodyText === null) {
      const err: ErrorResponse = { ok: false, error: 'recipientId, type, title and body are required', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    if (!VALID_TYPES.has(type)) {
      const err: ErrorResponse = { ok: false, error: `type must be one of: ${[...VALID_TYPES].join(', ')}`, code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }

    const input: CreateNotificationInput = {
      recipientId,
      type: type as NotificationType,
      title,
      body: bodyText,
      ...(rawExpiry !== undefined ? { expiresAt: rawExpiry } : {}),
    };
    const notif = await pgNotifRepo.create(input, now());
    return reply.code(201).send({ ok: true, notification: notif });
  });

  // GET /v1/notifications/:recipientId — list (optional ?unreadOnly=true)
  app.get('/v1/notifications/:recipientId', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const query = (req as unknown as { query: Record<string, unknown> }).query;
    const recipientId = typeof params['recipientId'] === 'string' ? params['recipientId'] : null;
    if (recipientId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid recipientId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const unreadOnly = query['unreadOnly'] === 'true';
    const rawLimit = typeof query['limit'] === 'string' ? parseInt(query['limit'], 10) : 50;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 50;
    const notifications = await pgNotifRepo.list(recipientId, unreadOnly, limit);
    return reply.send({ ok: true, recipientId, notifications, total: notifications.length, unreadOnly });
  });

  // PATCH /v1/notifications/:recipientId/read-all — must be before /:id
  app.patch('/v1/notifications/:recipientId/read-all', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const recipientId = typeof params['recipientId'] === 'string' ? params['recipientId'] : null;
    if (recipientId === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid recipientId', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const count = await pgNotifRepo.markAllRead(recipientId);
    return reply.send({ ok: true, recipientId, markedRead: count });
  });

  // PATCH /v1/notifications/:id/read — mark one as read
  app.patch('/v1/notifications/:id/read', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const id = typeof params['id'] === 'string' ? params['id'] : null;
    if (id === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid id', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const found = await pgNotifRepo.markRead(id);
    if (!found) {
      const err: ErrorResponse = { ok: false, error: 'Notification not found or already read', code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }
    return reply.send({ ok: true, id });
  });

  // DELETE /v1/notifications/:id
  app.delete('/v1/notifications/:id', async (req, reply) => {
    const params = (req as unknown as { params: Record<string, unknown> }).params;
    const id = typeof params['id'] === 'string' ? params['id'] : null;
    if (id === null) {
      const err: ErrorResponse = { ok: false, error: 'Invalid id', code: 'INVALID_INPUT' };
      return reply.code(400).send(err);
    }
    const found = await pgNotifRepo.delete(id);
    if (!found) {
      const err: ErrorResponse = { ok: false, error: 'Notification not found', code: 'NOT_FOUND' };
      return reply.code(404).send(err);
    }
    return reply.code(204).send();
  });
}
