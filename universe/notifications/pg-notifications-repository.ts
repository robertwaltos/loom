/**
 * Notifications — PG Repository
 *
 * Delivers async messages to kindlers and parents.
 * COPPA-safe: no personal data; IDs only; auto-expiry enforced.
 * Table: koydo_notifications (see db/migrations/0017_notifications.sql)
 */

import type { Pool } from 'pg';

// ─── Domain Types ──────────────────────────────────────────────────

export type NotificationType =
  | 'achievement_unlock'
  | 'world_event'
  | 'quest_complete'
  | 'system';

export interface Notification {
  readonly id: string;
  readonly recipientId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly read: boolean;
  readonly createdAt: number;
  readonly expiresAt: number | null;
}

export interface CreateNotificationInput {
  readonly recipientId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly expiresAt?: number;
}

// ─── Public Interface ──────────────────────────────────────────────

export interface PgNotificationsRepository {
  /** Create a notification for a recipient. */
  create(input: CreateNotificationInput, now: number): Promise<Notification>;
  /** List notifications for a recipient (newest first). Optionally filter unread only. */
  list(recipientId: string, unreadOnly?: boolean, limit?: number): Promise<readonly Notification[]>;
  /** Mark a single notification as read. Returns false if not found. */
  markRead(id: string): Promise<boolean>;
  /** Mark all unread notifications as read for a recipient. Returns count updated. */
  markAllRead(recipientId: string): Promise<number>;
  /** Hard-delete a notification. Returns false if not found. */
  delete(id: string): Promise<boolean>;
  /** Purge expired notifications (for scheduled cleanup). Returns count deleted. */
  purgeExpired(now: number): Promise<number>;
}

// ─── Factory ──────────────────────────────────────────────────────

export function createPgNotificationsRepository(pool: Pool): PgNotificationsRepository {
  return {
    async create(input, now) {
      // COPPA auto-expiry: 30 days from creation if not set
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const expiresAt = input.expiresAt ?? now + THIRTY_DAYS_MS;
      const result = await pool.query<NotifRow>(
        `INSERT INTO koydo_notifications
           (recipient_id, type, title, body, read, created_at, expires_at)
         VALUES ($1, $2, $3, $4, false, $5, $6)
         RETURNING *`,
        [input.recipientId, input.type, input.title, input.body, now, expiresAt],
      );
      const row = result.rows[0];
      if (row === undefined) throw new Error('create notification failed');
      return rowToNotif(row);
    },

    async list(recipientId, unreadOnly = false, limit = 50) {
      const result = await pool.query<NotifRow>(
        unreadOnly
          ? `SELECT * FROM koydo_notifications
             WHERE recipient_id = $1 AND read = false AND (expires_at IS NULL OR expires_at > $2)
             ORDER BY created_at DESC LIMIT $3`
          : `SELECT * FROM koydo_notifications
             WHERE recipient_id = $1 AND (expires_at IS NULL OR expires_at > $2)
             ORDER BY created_at DESC LIMIT $3`,
        [recipientId, Date.now(), limit],
      );
      return result.rows.map(rowToNotif);
    },

    async markRead(id) {
      const result = await pool.query(
        `UPDATE koydo_notifications SET read = true WHERE id = $1 AND read = false`,
        [id],
      );
      return (result.rowCount ?? 0) > 0;
    },

    async markAllRead(recipientId) {
      const result = await pool.query(
        `UPDATE koydo_notifications SET read = true WHERE recipient_id = $1 AND read = false`,
        [recipientId],
      );
      return result.rowCount ?? 0;
    },

    async delete(id) {
      const result = await pool.query(
        `DELETE FROM koydo_notifications WHERE id = $1`,
        [id],
      );
      return (result.rowCount ?? 0) > 0;
    },

    async purgeExpired(now) {
      const result = await pool.query(
        `DELETE FROM koydo_notifications WHERE expires_at IS NOT NULL AND expires_at <= $1`,
        [now],
      );
      return result.rowCount ?? 0;
    },
  };
}

// ─── Row Type + Mapper ─────────────────────────────────────────────

type NotifRow = {
  id: string;
  recipient_id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  expires_at: string | null;
};

function rowToNotif(r: NotifRow): Notification {
  return {
    id: r.id,
    recipientId: r.recipient_id,
    type: r.type as NotificationType,
    title: r.title,
    body: r.body,
    read: r.read,
    createdAt: parseInt(r.created_at, 10),
    expiresAt: r.expires_at !== null ? parseInt(r.expires_at, 10) : null,
  };
}
