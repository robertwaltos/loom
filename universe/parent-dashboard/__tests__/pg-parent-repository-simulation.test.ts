/**
 * PgParentRepository — Simulation Tests
 *
 * Runs against a real Postgres database using the loom pool env vars.
 * Creates an isolated table, runs CRUD through the repository, then tears down.
 *
 * Covers: create, findById, updateConsent, updateSubscriptionStatus, updateTimeControls.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { createPgParentRepository } from '../pg-parent-repository.js';

// ─── Helpers ──────────────────────────────────────────────────────

const MIGRATION = `
CREATE TABLE IF NOT EXISTS parent_accounts (
  id                  UUID          PRIMARY KEY,
  consent_verified    BOOLEAN       NOT NULL DEFAULT false,
  consent_verified_at BIGINT,
  consent_method      VARCHAR(32),
  subscription_status VARCHAR(32)   NOT NULL DEFAULT 'trial',
  time_controls       JSONB         NOT NULL DEFAULT '{}',
  created_at          BIGINT        NOT NULL
);
`;

function poolFromEnv(): pg.Pool {
  return new pg.Pool({
    host: process.env['PG_HOST'] ?? 'localhost',
    port: parseInt(process.env['PG_PORT'] ?? '5433', 10),
    user: process.env['PG_USER'] ?? 'loom',
    password: process.env['PG_PASSWORD'] ?? 'loom',
    database: process.env['PG_DATABASE'] ?? 'loom',
    max: 3,
  });
}

const PARENT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PARENT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

// ─── Test Suite ───────────────────────────────────────────────────

describe('PgParentRepository (simulation)', () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    pool = poolFromEnv();
    await pool.query('DROP TABLE IF EXISTS parent_accounts CASCADE');
    await pool.query(MIGRATION);
  });

  afterAll(async () => {
    await pool.query('DROP TABLE IF EXISTS parent_accounts CASCADE');
    await pool.end();
  });

  it('create inserts a new parent account with trial status', async () => {
    const repo = createPgParentRepository(pool);
    const account = await repo.create(PARENT_A);

    expect(account.id).toBe(PARENT_A);
    expect(account.subscriptionStatus).toBe('trial');
    expect(account.consentVerified).toBe(false);
    expect(account.consentVerifiedAt).toBeNull();
    expect(account.consentMethod).toBeNull();
    expect(account.timeControls.notificationsEnabled).toBe(true);
    expect(account.timeControls.maxDailyMinutes).toBeNull();
  });

  it('create accepts custom time controls', async () => {
    const repo = createPgParentRepository(pool);
    const account = await repo.create(PARENT_B, { maxDailyMinutes: 60, bedtimeCutoff: '20:00' });

    expect(account.timeControls.maxDailyMinutes).toBe(60);
    expect(account.timeControls.bedtimeCutoff).toBe('20:00');
  });

  it('create is idempotent — calling twice returns existing record', async () => {
    const repo = createPgParentRepository(pool);
    const second = await repo.create(PARENT_A);
    expect(second.id).toBe(PARENT_A);
    expect(second.subscriptionStatus).toBe('trial');
  });

  it('findById returns the account', async () => {
    const repo = createPgParentRepository(pool);
    const account = await repo.findById(PARENT_A);
    expect(account).not.toBeNull();
    expect(account?.id).toBe(PARENT_A);
  });

  it('findById returns null for unknown parent', async () => {
    const repo = createPgParentRepository(pool);
    const account = await repo.findById('00000000-0000-0000-0000-000000000000');
    expect(account).toBeNull();
  });

  it('updateConsent marks consent verified and records method', async () => {
    const repo = createPgParentRepository(pool);
    const now = Date.now();
    const updated = await repo.updateConsent(PARENT_A, 'credit_card_micro', now);
    expect(updated).toBe(true);

    const account = await repo.findById(PARENT_A);
    expect(account?.consentVerified).toBe(true);
    expect(account?.consentVerifiedAt).toBe(now);
    expect(account?.consentMethod).toBe('credit_card_micro');
  });

  it('updateConsent returns false for unknown parent', async () => {
    const repo = createPgParentRepository(pool);
    const result = await repo.updateConsent('00000000-0000-0000-0000-000000000000', 'email_plus1', Date.now());
    expect(result).toBe(false);
  });

  it('updateSubscriptionStatus transitions status', async () => {
    const repo = createPgParentRepository(pool);
    const updated = await repo.updateSubscriptionStatus(PARENT_B, 'active');
    expect(updated).toBe(true);

    const account = await repo.findById(PARENT_B);
    expect(account?.subscriptionStatus).toBe('active');
  });

  it('updateSubscriptionStatus returns false for unknown parent', async () => {
    const repo = createPgParentRepository(pool);
    const result = await repo.updateSubscriptionStatus('00000000-0000-0000-0000-000000000000', 'cancelled');
    expect(result).toBe(false);
  });

  it('updateTimeControls patches time controls via JSONB merge', async () => {
    const repo = createPgParentRepository(pool);
    const updated = await repo.updateTimeControls(PARENT_A, { maxDailyMinutes: 45 });
    expect(updated).toBe(true);

    const account = await repo.findById(PARENT_A);
    expect(account?.timeControls.maxDailyMinutes).toBe(45);
  });

  it('updateTimeControls returns false for unknown parent', async () => {
    const repo = createPgParentRepository(pool);
    const result = await repo.updateTimeControls('00000000-0000-0000-0000-000000000000', { maxDailyMinutes: 30 });
    expect(result).toBe(false);
  });
});
