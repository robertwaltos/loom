/**
 * Koydo Worlds — Feature Flags PG Repository
 *
 * Read/write feature flags from loom_feature_flags.
 * Supports: global on/off, percentage rollout, and player allowlist.
 *
 * Table: loom_feature_flags (see db/migrations/0007_feature_flags.sql)
 */

import type { Pool } from 'pg';

// ─── Domain Types ──────────────────────────────────────────────────

export interface FeatureFlag {
  readonly flagName: string;
  readonly enabled: boolean;
  readonly rolloutPct: number;            // 0-100
  readonly allowedPlayers: readonly string[] | null;
  readonly description: string | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

// ─── Public Interface ──────────────────────────────────────────────

export interface PgFeatureFlagsRepository {
  getFlag(flagName: string): Promise<FeatureFlag | null>;
  getAllFlags(): Promise<readonly FeatureFlag[]>;
  upsertFlag(flag: {
    flagName: string;
    enabled: boolean;
    rolloutPct: number;
    allowedPlayers?: readonly string[] | null;
    description?: string | null;
  }): Promise<FeatureFlag>;
  /**
   * Returns true if this flag is active for playerId.
   * Resolution order:
   *   1. Flag missing or disabled → false
   *   2. allowedPlayers includes playerId → true
   *   3. rolloutPct >= 100 → true
   *   4. rolloutPct === 0 → false
   *   5. deterministic hash of playerId % 100 < rolloutPct → true
   */
  isEnabled(flagName: string, playerId?: string): Promise<boolean>;
}

// ─── Rollout Hash ──────────────────────────────────────────────────

function stableHash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(h) % 100;
}

// ─── Factory ──────────────────────────────────────────────────────

export function createPgFeatureFlagsRepository(pool: Pool): PgFeatureFlagsRepository {
  return {
    async getFlag(flagName) {
      const result = await pool.query<{
        flag_name: string;
        enabled: boolean;
        rollout_pct: number;
        allowed_players: string[] | null;
        description: string | null;
        created_at: Date;
        updated_at: Date;
      }>(
        'SELECT * FROM loom_feature_flags WHERE flag_name = $1',
        [flagName],
      );
      const row = result.rows[0];
      return row !== undefined ? rowToFlag(row) : null;
    },

    async getAllFlags() {
      const result = await pool.query<{
        flag_name: string;
        enabled: boolean;
        rollout_pct: number;
        allowed_players: string[] | null;
        description: string | null;
        created_at: Date;
        updated_at: Date;
      }>('SELECT * FROM loom_feature_flags ORDER BY flag_name ASC');
      return result.rows.map(rowToFlag);
    },

    async upsertFlag(flag) {
      const result = await pool.query<{
        flag_name: string;
        enabled: boolean;
        rollout_pct: number;
        allowed_players: string[] | null;
        description: string | null;
        created_at: Date;
        updated_at: Date;
      }>(
        `INSERT INTO loom_feature_flags
           (flag_name, enabled, rollout_pct, allowed_players, description, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (flag_name) DO UPDATE SET
           enabled         = EXCLUDED.enabled,
           rollout_pct     = EXCLUDED.rollout_pct,
           allowed_players = EXCLUDED.allowed_players,
           description     = EXCLUDED.description,
           updated_at      = NOW()
         RETURNING *`,
        [
          flag.flagName,
          flag.enabled,
          flag.rolloutPct,
          flag.allowedPlayers ?? null,
          flag.description ?? null,
        ],
      );
      return rowToFlag(result.rows[0]!);
    },

    async isEnabled(flagName, playerId) {
      const flag = await this.getFlag(flagName);
      if (flag === null || !flag.enabled) return false;
      if (playerId !== undefined && flag.allowedPlayers !== null && flag.allowedPlayers.includes(playerId)) return true;
      if (flag.rolloutPct >= 100) return true;
      if (flag.rolloutPct <= 0) return false;
      if (playerId === undefined) return false;
      return stableHash(`${flagName}:${playerId}`) < flag.rolloutPct;
    },
  };
}

// ─── Row Mapper ────────────────────────────────────────────────────

function rowToFlag(row: {
  flag_name: string;
  enabled: boolean;
  rollout_pct: number;
  allowed_players: string[] | null;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}): FeatureFlag {
  return {
    flagName: row.flag_name,
    enabled: row.enabled,
    rolloutPct: row.rollout_pct,
    allowedPlayers: row.allowed_players,
    description: row.description,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}
