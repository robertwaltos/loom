/**
 * Hidden Zones — PG Repository
 *
 * Persists per-kindler hidden zone discovery records.
 * Table: koydo_hidden_zone_discoveries (see db/migrations/0018_hidden_zone_discoveries.sql)
 *
 * Discovery granting is handled in the route layer (append log entry + update kindler spark).
 */

import type { Pool } from 'pg';

// ─── Domain Types ──────────────────────────────────────────────────

export interface HiddenZoneDiscovery {
  readonly id: number;
  readonly kindlerId: string;
  readonly zoneId: string;
  readonly discoveredAt: number;
}

// ─── Public Interface ──────────────────────────────────────────────

export interface PgHiddenZonesRepository {
  /** Record a zone discovery for a kindler. Idempotent — returns false if already discovered. */
  recordDiscovery(kindlerId: string, zoneId: string, discoveredAt: number): Promise<HiddenZoneDiscovery | null>;
  /** Get all zone discoveries for a kindler. */
  getDiscoveriesForKindler(kindlerId: string): Promise<readonly HiddenZoneDiscovery[]>;
  /** Check whether a kindler has already discovered a specific zone. */
  hasDiscovered(kindlerId: string, zoneId: string): Promise<boolean>;
  /** Get the set of discovered zone IDs for a kindler (efficient for eligibility checks). */
  getDiscoveredZoneIds(kindlerId: string): Promise<ReadonlySet<string>>;
}

// ─── Internal Row Shape ────────────────────────────────────────────

interface DiscoveryRow {
  id: string;
  kindler_id: string;
  zone_id: string;
  discovered_at: string;
}

function rowToDiscovery(row: DiscoveryRow): HiddenZoneDiscovery {
  return {
    id: parseInt(row.id, 10),
    kindlerId: row.kindler_id,
    zoneId: row.zone_id,
    discoveredAt: parseInt(row.discovered_at, 10),
  };
}

// ─── Factory ──────────────────────────────────────────────────────

export function createPgHiddenZonesRepository(pool: Pool): PgHiddenZonesRepository {
  return {
    async recordDiscovery(kindlerId, zoneId, discoveredAt) {
      const result = await pool.query<DiscoveryRow>(
        `INSERT INTO koydo_hidden_zone_discoveries (kindler_id, zone_id, discovered_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (kindler_id, zone_id) DO NOTHING
         RETURNING *`,
        [kindlerId, zoneId, discoveredAt],
      );
      const row = result.rows[0];
      return row !== undefined ? rowToDiscovery(row) : null;
    },

    async getDiscoveriesForKindler(kindlerId) {
      const result = await pool.query<DiscoveryRow>(
        'SELECT * FROM koydo_hidden_zone_discoveries WHERE kindler_id = $1 ORDER BY discovered_at ASC',
        [kindlerId],
      );
      return result.rows.map(rowToDiscovery);
    },

    async hasDiscovered(kindlerId, zoneId) {
      const result = await pool.query<{ exists: boolean }>(
        'SELECT EXISTS(SELECT 1 FROM koydo_hidden_zone_discoveries WHERE kindler_id = $1 AND zone_id = $2) AS exists',
        [kindlerId, zoneId],
      );
      return result.rows[0]?.exists === true;
    },

    async getDiscoveredZoneIds(kindlerId) {
      const result = await pool.query<{ zone_id: string }>(
        'SELECT zone_id FROM koydo_hidden_zone_discoveries WHERE kindler_id = $1',
        [kindlerId],
      );
      return new Set(result.rows.map(r => r.zone_id));
    },
  };
}
