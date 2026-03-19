/**
 * PgNotificationsRepository — PostgreSQL simulation tests.
 *
 * Requires a live PostgreSQL instance:
 *   PG_HOST=localhost PG_PORT=5433 PG_USER=loom PG_PASSWORD=loom PG_DATABASE=loom
 *
 * Table created/dropped around each test run.
 * SKIP automatically if no DB connection available.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { createPgNotificationsRepository } from '../pg-notifications-repository.js';

const DB_CONFIG = {
  host: process.env['PG_HOST'] ?? 'localhost',
  port: parseInt(process.env['PG_PORT'] ?? '5433', 10),
  user: process.env['PG_USER'] ?? 'loom',
  password: process.env['PG_PASSWORD'] ?? 'loom',
  database: process.env['PG_DATABASE'] ?? 'loom',
  connectionTimeoutMillis: 2000,
};

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS koydo_notifications (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id  UUID         NOT NULL,
    type          VARCHAR(32)  NOT NULL,
    title         VARCHAR(128) NOT NULL,
    body          TEXT         NOT NULL,
    read          BOOLEAN      NOT NULL DEFAULT false,
    created_at    BIGINT       NOT NULL,
    expires_at    BIGINT
  )
`;

const RECIPIENT_A = 'cccccccc-0000-0000-0000-000000000001';
const RECIPIENT_B = 'dddddddd-0000-0000-0000-000000000002';
const NOW = Date.now();
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

let pool: pg.Pool;
let skip = false;

beforeAll(async () => {
  try {
    pool = new pg.Pool(DB_CONFIG);
    await pool.query('SELECT 1');
    await pool.query(SCHEMA);
    await pool.query(`DELETE FROM koydo_notifications WHERE recipient_id IN ($1, $2)`, [RECIPIENT_A, RECIPIENT_B]);
  } catch {
    skip = true;
  }
});

afterAll(async () => {
  if (!skip && pool) {
    await pool.query(`DELETE FROM koydo_notifications WHERE recipient_id IN ($1, $2)`, [RECIPIENT_A, RECIPIENT_B]);
    await pool.end();
  }
});

describe('PgNotificationsRepository', () => {
  it('create — inserts a notification with auto-expiry', async () => {
    if (skip) return;
    const repo = createPgNotificationsRepository(pool);
    const notif = await repo.create(
      { recipientId: RECIPIENT_A, type: 'achievement_unlock', title: 'First Star!', body: 'You earned your first star.' },
      NOW,
    );
    expect(notif.id).toBeTruthy();
    expect(notif.recipientId).toBe(RECIPIENT_A);
    expect(notif.type).toBe('achievement_unlock');
    expect(notif.read).toBe(false);
    expect(notif.createdAt).toBe(NOW);
    expect(notif.expiresAt).toBe(NOW + THIRTY_DAYS_MS);
  });

  it('create — allows custom expiresAt override', async () => {
    if (skip) return;
    const repo = createPgNotificationsRepository(pool);
    const customExpiry = NOW + 7 * 24 * 60 * 60 * 1000;
    const notif = await repo.create(
      { recipientId: RECIPIENT_A, type: 'system', title: 'Maintenance', body: 'Short notice.', expiresAt: customExpiry },
      NOW,
    );
    expect(notif.expiresAt).toBe(customExpiry);
  });

  it('list — returns notifications newest first', async () => {
    if (skip) return;
    const repo = createPgNotificationsRepository(pool);
    await repo.create({ recipientId: RECIPIENT_A, type: 'world_event', title: 'Event A', body: 'Body A' }, NOW + 1000);
    await repo.create({ recipientId: RECIPIENT_A, type: 'world_event', title: 'Event B', body: 'Body B' }, NOW + 2000);
    const list = await repo.list(RECIPIENT_A);
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list[0]!.createdAt).toBeGreaterThanOrEqual(list[1]!.createdAt);
  });

  it('list — unreadOnly filter returns only unread', async () => {
    if (skip) return;
    const repo = createPgNotificationsRepository(pool);
    const unread = await repo.list(RECIPIENT_A, true);
    expect(unread.every((n) => !n.read)).toBe(true);
  });

  it('markRead — marks a specific notification as read', async () => {
    if (skip) return;
    const repo = createPgNotificationsRepository(pool);
    const notif = await repo.create(
      { recipientId: RECIPIENT_B, type: 'quest_complete', title: 'Quest Done!', body: 'You finished a quest.' },
      NOW,
    );
    const ok = await repo.markRead(notif.id);
    expect(ok).toBe(true);
    const list = await repo.list(RECIPIENT_B);
    const found = list.find((n) => n.id === notif.id);
    expect(found?.read).toBe(true);
  });

  it('markRead — returns false for unknown id', async () => {
    if (skip) return;
    const repo = createPgNotificationsRepository(pool);
    const ok = await repo.markRead('00000000-dead-beef-0000-000000000000');
    expect(ok).toBe(false);
  });

  it('markAllRead — marks all unread for a recipient', async () => {
    if (skip) return;
    const repo = createPgNotificationsRepository(pool);
    await repo.create({ recipientId: RECIPIENT_A, type: 'system', title: 'Notice 1', body: 'body' }, NOW + 5000);
    await repo.create({ recipientId: RECIPIENT_A, type: 'system', title: 'Notice 2', body: 'body' }, NOW + 6000);
    const count = await repo.markAllRead(RECIPIENT_A);
    expect(count).toBeGreaterThan(0);
    const unread = await repo.list(RECIPIENT_A, true);
    expect(unread).toHaveLength(0);
  });

  it('delete — removes a notification', async () => {
    if (skip) return;
    const repo = createPgNotificationsRepository(pool);
    const notif = await repo.create(
      { recipientId: RECIPIENT_B, type: 'system', title: 'To Delete', body: 'ephemeral' },
      NOW,
    );
    const ok = await repo.delete(notif.id);
    expect(ok).toBe(true);
    const list = await repo.list(RECIPIENT_B);
    expect(list.find((n) => n.id === notif.id)).toBeUndefined();
  });

  it('delete — returns false for unknown id', async () => {
    if (skip) return;
    const repo = createPgNotificationsRepository(pool);
    const ok = await repo.delete('00000000-dead-beef-0000-000000000000');
    expect(ok).toBe(false);
  });

  it('purgeExpired — removes notifications past their expiry', async () => {
    if (skip) return;
    const repo = createPgNotificationsRepository(pool);
    const past = NOW - 1000;
    await repo.create(
      { recipientId: RECIPIENT_A, type: 'system', title: 'Old Notice', body: 'expired', expiresAt: past },
      NOW - 10000,
    );
    const purged = await repo.purgeExpired(NOW);
    expect(purged).toBeGreaterThan(0);
  });

  it('list — returns empty array for unknown recipient', async () => {
    if (skip) return;
    const repo = createPgNotificationsRepository(pool);
    const list = await repo.list('ffffffff-ffff-ffff-ffff-ffffffffffff');
    expect(list).toHaveLength(0);
  });
});
