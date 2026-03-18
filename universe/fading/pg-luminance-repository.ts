/**
 * Fading — PG Luminance Repository
 *
 * Persists WorldLuminance state to/from the world_luminance PostgreSQL table.
 * Uses UPSERT so each world always has at most one row.
 *
 * Consumed by src/main.ts to:
 *   1. hydrate the in-memory luminanceStore at boot
 *   2. persist luminance updates whenever a Kindler completes an entry
 */

import type { Pool } from 'pg';
import type { WorldLuminance } from '../worlds/types.js';
import type { WorldLuminanceRow } from '../db/row-types.js';
import { worldLuminanceFromRow, worldLuminanceToRow } from '../db/mappers.js';

export interface LuminanceLogEntry {
  readonly id: string;
  readonly worldId: string;
  readonly luminance: number;
  readonly stage: string;
  readonly delta: number;
  readonly cause: 'kindler_progress' | 'natural_decay' | 'collaborative_quest' | 'deep_fade_event';
  readonly timestamp: number;
}

export interface PgLuminanceRepository {
  /** Load all persisted world luminance rows — keyed by worldId */
  loadAll(): Promise<Map<string, WorldLuminance>>;
  /** Upsert a single world's luminance state */
  save(wl: WorldLuminance): Promise<void>;
  /** Load luminance change history for a world, newest first */
  loadHistory(worldId: string, limit?: number, offset?: number): Promise<readonly LuminanceLogEntry[]>;
}

export function createPgLuminanceRepository(pool: Pool): PgLuminanceRepository {
  return {
    async loadAll() {
      const result = await pool.query<WorldLuminanceRow>('SELECT * FROM world_luminance');
      const map = new Map<string, WorldLuminance>();
      for (const row of result.rows) {
        const wl = worldLuminanceFromRow(row);
        map.set(wl.worldId, wl);
      }
      return map;
    },

    async save(wl) {
      const row = worldLuminanceToRow(wl);
      await pool.query(
        `INSERT INTO world_luminance
           (world_id, luminance, stage, last_restored_at,
            total_kindlers_contributed, active_kindler_count)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (world_id) DO UPDATE SET
           luminance                    = EXCLUDED.luminance,
           stage                        = EXCLUDED.stage,
           last_restored_at             = EXCLUDED.last_restored_at,
           total_kindlers_contributed   = EXCLUDED.total_kindlers_contributed,
           active_kindler_count         = EXCLUDED.active_kindler_count`,
        [
          row.world_id,
          row.luminance,
          row.stage,
          row.last_restored_at,
          row.total_kindlers_contributed,
          row.active_kindler_count,
        ],
      );
    },

    async loadHistory(worldId, limit = 50, offset = 0) {
      const result = await pool.query<{
        id: string;
        world_id: string;
        luminance: number;
        stage: string;
        delta: number;
        cause: string;
        timestamp: string;
      }>(
        `SELECT id, world_id, luminance, stage, delta, cause, timestamp
         FROM world_luminance_log
         WHERE world_id = $1
         ORDER BY timestamp DESC
         LIMIT $2 OFFSET $3`,
        [worldId, limit, offset],
      );
      return result.rows.map(r => ({
        id: r.id,
        worldId: r.world_id,
        luminance: r.luminance,
        stage: r.stage,
        delta: r.delta,
        cause: r.cause as LuminanceLogEntry['cause'],
        timestamp: parseInt(r.timestamp, 10),
      }));
    },
  };
}
