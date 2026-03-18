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

export interface PgLuminanceRepository {
  /** Load all persisted world luminance rows — keyed by worldId */
  loadAll(): Promise<Map<string, WorldLuminance>>;
  /** Upsert a single world's luminance state */
  save(wl: WorldLuminance): Promise<void>;
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
  };
}
