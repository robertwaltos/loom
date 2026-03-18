/**
 * Koydo Worlds — Analytics PG Repository
 *
 * Emits non-PII game telemetry to loom_analytics_events.
 * COPPA constraint: player_id is the kindler UUID (opaque identifier),
 * never a real name or contact info. server_time is auto-set by PG default.
 *
 * Table: loom_analytics_events (see db/migrations/0006_analytics_events.sql)
 */

import type { Pool } from 'pg';

// ─── Domain Types ──────────────────────────────────────────────────

export interface AnalyticsEvent {
  readonly id: number;
  readonly eventType: string;
  readonly playerId: string | null;
  readonly worldId: string | null;
  readonly sessionId: string | null;
  readonly properties: Record<string, unknown>;
  readonly serverTimeMs: number;
  readonly clientTimeMs: number | null;
}

export interface AnalyticsEmitPayload {
  readonly eventType: string;
  readonly playerId?: string | null;
  readonly worldId?: string | null;
  readonly sessionId?: string | null;
  readonly properties?: Record<string, unknown>;
  readonly clientTimeMs?: number | null;
}

// ─── Public Interface ──────────────────────────────────────────────

export interface AnalyticsEventTypeStat {
  readonly eventType: string;
  readonly count: number;
}

/** Fire-and-forget emitter interface — routes depend on this, not the full PgAnalyticsRepository. */
export interface AnalyticsEmitter {
  emit(event: AnalyticsEmitPayload): void;
}

export interface PgAnalyticsRepository {
  /** Fire-and-forget: insert one analytics event row. */
  emit(event: AnalyticsEmitPayload): Promise<void>;
  /** Fetch the most recent N events (ops/debug use only). Paginated with offset. */
  getRecent(limit?: number, offset?: number): Promise<readonly AnalyticsEvent[]>;
  /** Fetch events for a specific player (parent dashboard use). */
  getByPlayer(playerId: string, limit?: number): Promise<readonly AnalyticsEvent[]>;
  /** Event counts grouped by event_type — ops health check. */
  getStats(): Promise<readonly AnalyticsEventTypeStat[]>;
}

// ─── Factory ──────────────────────────────────────────────────────

export function createPgAnalyticsRepository(pool: Pool): PgAnalyticsRepository {
  return {
    async emit(event) {
      await pool.query(
        `INSERT INTO loom_analytics_events
           (event_type, player_id, world_id, session_id, properties, client_time)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          event.eventType,
          event.playerId ?? null,
          event.worldId ?? null,
          event.sessionId ?? null,
          JSON.stringify(event.properties ?? {}),
          event.clientTimeMs !== undefined && event.clientTimeMs !== null
            ? new Date(event.clientTimeMs).toISOString()
            : null,
        ],
      );
    },

    async getRecent(limit = 100, offset = 0) {
      const result = await pool.query<{
        id: string;
        event_type: string;
        player_id: string | null;
        world_id: string | null;
        session_id: string | null;
        properties: Record<string, unknown>;
        server_time: Date;
        client_time: Date | null;
      }>(
        `SELECT id, event_type, player_id, world_id, session_id,
                properties, server_time, client_time
         FROM loom_analytics_events
         ORDER BY server_time DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
      return result.rows.map(rowToEvent);
    },

    async getByPlayer(playerId, limit = 200) {
      const result = await pool.query<{
        id: string;
        event_type: string;
        player_id: string | null;
        world_id: string | null;
        session_id: string | null;
        properties: Record<string, unknown>;
        server_time: Date;
        client_time: Date | null;
      }>(
        `SELECT id, event_type, player_id, world_id, session_id,
                properties, server_time, client_time
         FROM loom_analytics_events
         WHERE player_id = $1
         ORDER BY server_time DESC
         LIMIT $2`,
        [playerId, limit],
      );
      return result.rows.map(rowToEvent);
    },

    async getStats() {
      const result = await pool.query<{ event_type: string; count: string }>(
        `SELECT event_type, COUNT(*) AS count
         FROM loom_analytics_events
         GROUP BY event_type
         ORDER BY count DESC`,
      );
      return result.rows.map(r => ({
        eventType: r.event_type,
        count: parseInt(r.count, 10),
      }));
    },
  };
}

// ─── Row Mapper ────────────────────────────────────────────────────

function rowToEvent(row: {
  id: string;
  event_type: string;
  player_id: string | null;
  world_id: string | null;
  session_id: string | null;
  properties: Record<string, unknown>;
  server_time: Date;
  client_time: Date | null;
}): AnalyticsEvent {
  return {
    id: parseInt(row.id, 10),
    eventType: row.event_type,
    playerId: row.player_id,
    worldId: row.world_id,
    sessionId: row.session_id,
    properties: row.properties,
    serverTimeMs: new Date(row.server_time).getTime(),
    clientTimeMs: row.client_time !== null ? new Date(row.client_time).getTime() : null,
  };
}
