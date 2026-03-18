/**
 * Parent Dashboard — PG Repository
 *
 * Write-path for parent_accounts table (reads go through pg-queries.ts / DashboardEngine).
 * Table: parent_accounts (see db/migrations/0008_parent_accounts.sql)
 *
 * COPPA: all operations keyed by parentId (opaque UUID from auth provider — no PII stored here).
 */

import type { Pool } from 'pg';
import type { ConsentMethod, ParentAccount, ParentTimeControls, SubscriptionStatus } from './api.js';

// ─── Public Interface ──────────────────────────────────────────────

export interface PgParentRepository {
  findById(parentId: string): Promise<ParentAccount | null>;
  /** INSERT parent account — idempotent via ON CONFLICT DO NOTHING. */
  create(parentId: string, timeControls?: Partial<ParentTimeControls>): Promise<ParentAccount>;
  /** Mark consent verified. Returns false if parent not found. */
  updateConsent(parentId: string, method: ConsentMethod, verifiedAt: number): Promise<boolean>;
  /** Update subscription status. Returns false if parent not found. */
  updateSubscriptionStatus(parentId: string, status: SubscriptionStatus): Promise<boolean>;
  /** Update time controls. Returns false if parent not found. */
  updateTimeControls(parentId: string, controls: Partial<ParentTimeControls>): Promise<boolean>;
}

// ─── Factory ──────────────────────────────────────────────────────

export function createPgParentRepository(pool: Pool): PgParentRepository {
  return {
    async findById(parentId) {
      const result = await pool.query<ParentAccountRow>(
        `SELECT * FROM parent_accounts WHERE id = $1`,
        [parentId],
      );
      return result.rows[0] !== undefined ? rowToAccount(result.rows[0]) : null;
    },

    async create(parentId, timeControls = {}) {
      const defaultControls: ParentTimeControls = {
        maxDailyMinutes: timeControls.maxDailyMinutes ?? null,
        bedtimeCutoff: timeControls.bedtimeCutoff ?? null,
        notificationsEnabled: timeControls.notificationsEnabled ?? true,
      };
      const now = Date.now();

      const result = await pool.query<ParentAccountRow>(
        `INSERT INTO parent_accounts
           (id, consent_verified, consent_verified_at, consent_method,
            subscription_status, time_controls, created_at)
         VALUES ($1, false, NULL, NULL, 'trial', $2, $3)
         ON CONFLICT (id) DO UPDATE
           SET id = parent_accounts.id   -- no-op update so RETURNING works
         RETURNING *`,
        [parentId, JSON.stringify(defaultControls), now],
      );
      const row = result.rows[0];
      if (row === undefined) throw new Error(`create parent account failed for ${parentId}`);
      return rowToAccount(row);
    },

    async updateConsent(parentId, method, verifiedAt) {
      const result = await pool.query(
        `UPDATE parent_accounts
         SET consent_verified = true,
             consent_verified_at = $2,
             consent_method = $3
         WHERE id = $1`,
        [parentId, verifiedAt, method],
      );
      return (result.rowCount ?? 0) > 0;
    },

    async updateSubscriptionStatus(parentId, status) {
      const result = await pool.query(
        `UPDATE parent_accounts SET subscription_status = $2 WHERE id = $1`,
        [parentId, status],
      );
      return (result.rowCount ?? 0) > 0;
    },

    async updateTimeControls(parentId, controls) {
      const result = await pool.query(
        `UPDATE parent_accounts
         SET time_controls = time_controls || $2::jsonb
         WHERE id = $1`,
        [parentId, JSON.stringify(controls)],
      );
      return (result.rowCount ?? 0) > 0;
    },
  };
}

// ─── Row Type + Mapper ─────────────────────────────────────────────

type ParentAccountRow = {
  id: string;
  consent_verified: boolean;
  consent_verified_at: string | null;
  consent_method: string | null;
  subscription_status: string;
  time_controls: unknown;
  created_at: string;
};

function rowToAccount(r: ParentAccountRow): ParentAccount {
  const controls = (r.time_controls ?? {}) as Record<string, unknown>;
  const timeControls: ParentTimeControls = {
    maxDailyMinutes: typeof controls['maxDailyMinutes'] === 'number' ? controls['maxDailyMinutes'] : null,
    bedtimeCutoff: typeof controls['bedtimeCutoff'] === 'string' ? controls['bedtimeCutoff'] : null,
    notificationsEnabled: controls['notificationsEnabled'] !== false,
  };
  return {
    id: r.id,
    consentVerified: r.consent_verified,
    consentVerifiedAt: r.consent_verified_at !== null ? parseInt(r.consent_verified_at, 10) : null,
    consentMethod: (r.consent_method as ConsentMethod | null),
    subscriptionStatus: r.subscription_status as SubscriptionStatus,
    timeControls,
    createdAt: parseInt(r.created_at, 10),
  };
}
