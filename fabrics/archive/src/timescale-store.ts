/**
 * TimescaleDB Event Store — Hypertable-based event storage for
 * high-throughput time-series game events and analytics.
 *
 * Extends the pg-event-archive with TimescaleDB-specific features:
 *   - Hypertables with automatic partitioning by time
 *   - Continuous aggregates for real-time dashboards
 *   - Compression policies for older data
 *   - Retention policies for data lifecycle
 *
 * Thread: carbon/archive/timescale
 * Tier: 2
 */

import type { Pool } from 'pg';

// ─── Configuration ──────────────────────────────────────────────

export interface TimescaleConfig {
  readonly chunkIntervalHours: number;
  readonly compressionAfterDays: number;
  readonly retentionDays: number;
  readonly enableContinuousAggregates: boolean;
}

export const DEFAULT_TIMESCALE_CONFIG: TimescaleConfig = {
  chunkIntervalHours: 6,
  compressionAfterDays: 7,
  retentionDays: 365,
  enableContinuousAggregates: true,
};

// ─── Migration ──────────────────────────────────────────────────

export async function migrateTimescale(
  pool: Pool,
  config: TimescaleConfig = DEFAULT_TIMESCALE_CONFIG,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Enable TimescaleDB extension
    await client.query('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE');

    // ── Game Events Hypertable ────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS game_events (
        event_id    TEXT NOT NULL,
        event_type  TEXT NOT NULL,
        entity_id   TEXT,
        world_id    TEXT NOT NULL,
        dynasty_id  TEXT,
        payload     JSONB NOT NULL DEFAULT '{}',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        server_id   TEXT NOT NULL,
        sequence    BIGINT NOT NULL
      )
    `);

    // Convert to hypertable (idempotent check)
    await client.query(`
      SELECT create_hypertable('game_events', 'created_at',
        chunk_time_interval => INTERVAL '${config.chunkIntervalHours} hours',
        if_not_exists => TRUE
      )
    `);

    // Indexes for common query patterns
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_game_events_type
        ON game_events (event_type, created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_game_events_entity
        ON game_events (entity_id, created_at DESC)
        WHERE entity_id IS NOT NULL
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_game_events_world
        ON game_events (world_id, created_at DESC)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_game_events_dynasty
        ON game_events (dynasty_id, created_at DESC)
        WHERE dynasty_id IS NOT NULL
    `);

    // ── Player Metrics Hypertable ─────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS player_metrics (
        dynasty_id    TEXT NOT NULL,
        world_id      TEXT NOT NULL,
        metric_type   TEXT NOT NULL,
        value         DOUBLE PRECISION NOT NULL,
        recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      SELECT create_hypertable('player_metrics', 'recorded_at',
        chunk_time_interval => INTERVAL '${config.chunkIntervalHours} hours',
        if_not_exists => TRUE
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_player_metrics_dynasty
        ON player_metrics (dynasty_id, recorded_at DESC)
    `);

    // ── Economy Metrics Hypertable ────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS economy_metrics (
        world_id          TEXT NOT NULL,
        metric_type       TEXT NOT NULL,
        total_kalon       BIGINT NOT NULL DEFAULT 0,
        transaction_count BIGINT NOT NULL DEFAULT 0,
        active_accounts   INT NOT NULL DEFAULT 0,
        recorded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      SELECT create_hypertable('economy_metrics', 'recorded_at',
        chunk_time_interval => INTERVAL '${config.chunkIntervalHours} hours',
        if_not_exists => TRUE
      )
    `);

    // ── Server Performance Hypertable ─────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS server_metrics (
        server_id       TEXT NOT NULL,
        region          TEXT NOT NULL,
        cpu_percent     DOUBLE PRECISION NOT NULL,
        memory_mb       DOUBLE PRECISION NOT NULL,
        connections     INT NOT NULL DEFAULT 0,
        tick_duration_us BIGINT NOT NULL DEFAULT 0,
        event_throughput INT NOT NULL DEFAULT 0,
        recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      SELECT create_hypertable('server_metrics', 'recorded_at',
        chunk_time_interval => INTERVAL '1 hour',
        if_not_exists => TRUE
      )
    `);

    // ── Compression Policies ──────────────────────────────────
    if (config.compressionAfterDays > 0) {
      // Enable compression on older chunks
      await client.query(`
        ALTER TABLE game_events SET (
          timescaledb.compress,
          timescaledb.compress_segmentby = 'world_id, event_type'
        )
      `).catch(() => { /* already set */ });

      await client.query(`
        SELECT add_compression_policy('game_events',
          INTERVAL '${config.compressionAfterDays} days',
          if_not_exists => TRUE
        )
      `);

      await client.query(`
        ALTER TABLE player_metrics SET (
          timescaledb.compress,
          timescaledb.compress_segmentby = 'dynasty_id, metric_type'
        )
      `).catch(() => { /* already set */ });

      await client.query(`
        SELECT add_compression_policy('player_metrics',
          INTERVAL '${config.compressionAfterDays} days',
          if_not_exists => TRUE
        )
      `);

      await client.query(`
        ALTER TABLE server_metrics SET (
          timescaledb.compress,
          timescaledb.compress_segmentby = 'server_id, region'
        )
      `).catch(() => { /* already set */ });

      await client.query(`
        SELECT add_compression_policy('server_metrics',
          INTERVAL '${config.compressionAfterDays} days',
          if_not_exists => TRUE
        )
      `);
    }

    // ── Retention Policies ────────────────────────────────────
    if (config.retentionDays > 0) {
      await client.query(`
        SELECT add_retention_policy('server_metrics',
          INTERVAL '${config.retentionDays} days',
          if_not_exists => TRUE
        )
      `);
    }

    // ── Continuous Aggregates ─────────────────────────────────
    if (config.enableContinuousAggregates) {
      // Hourly event counts by type and world
      await client.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_event_counts
        WITH (timescaledb.continuous) AS
        SELECT
          time_bucket('1 hour', created_at) AS bucket,
          world_id,
          event_type,
          COUNT(*) AS event_count
        FROM game_events
        GROUP BY bucket, world_id, event_type
        WITH NO DATA
      `);

      await client.query(`
        SELECT add_continuous_aggregate_policy('hourly_event_counts',
          start_offset => INTERVAL '3 hours',
          end_offset => INTERVAL '1 hour',
          schedule_interval => INTERVAL '1 hour',
          if_not_exists => TRUE
        )
      `);

      // Hourly economy summary
      await client.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_economy
        WITH (timescaledb.continuous) AS
        SELECT
          time_bucket('1 hour', recorded_at) AS bucket,
          world_id,
          SUM(total_kalon) AS total_kalon_flow,
          SUM(transaction_count) AS total_transactions,
          MAX(active_accounts) AS peak_active_accounts
        FROM economy_metrics
        GROUP BY bucket, world_id
        WITH NO DATA
      `);

      await client.query(`
        SELECT add_continuous_aggregate_policy('hourly_economy',
          start_offset => INTERVAL '3 hours',
          end_offset => INTERVAL '1 hour',
          schedule_interval => INTERVAL '1 hour',
          if_not_exists => TRUE
        )
      `);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Adapter ────────────────────────────────────────────────────

export interface TimescaleEventStore {
  readonly insertEvent: (event: GameEvent) => Promise<void>;
  readonly insertBatch: (events: ReadonlyArray<GameEvent>) => Promise<void>;
  readonly insertPlayerMetric: (metric: PlayerMetric) => Promise<void>;
  readonly insertServerMetric: (metric: ServerMetric) => Promise<void>;
  readonly queryEventsByType: (worldId: string, eventType: string, hours: number) => Promise<ReadonlyArray<GameEvent>>;
  readonly getHourlyEventCounts: (worldId: string, hours: number) => Promise<ReadonlyArray<HourlyCount>>;
}

export interface GameEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly entityId?: string;
  readonly worldId: string;
  readonly dynastyId?: string;
  readonly payload: Record<string, unknown>;
  readonly serverId: string;
  readonly sequence: bigint;
}

export interface PlayerMetric {
  readonly dynastyId: string;
  readonly worldId: string;
  readonly metricType: string;
  readonly value: number;
}

export interface ServerMetric {
  readonly serverId: string;
  readonly region: string;
  readonly cpuPercent: number;
  readonly memoryMb: number;
  readonly connections: number;
  readonly tickDurationUs: bigint;
  readonly eventThroughput: number;
}

export interface HourlyCount {
  readonly bucket: Date;
  readonly worldId: string;
  readonly eventType: string;
  readonly count: number;
}

export function createTimescaleEventStore(pool: Pool): TimescaleEventStore {
  return {
    async insertEvent(event) {
      await pool.query(
        `INSERT INTO game_events (event_id, event_type, entity_id, world_id, dynasty_id, payload, server_id, sequence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [event.eventId, event.eventType, event.entityId ?? null, event.worldId,
         event.dynastyId ?? null, JSON.stringify(event.payload), event.serverId, event.sequence],
      );
    },

    async insertBatch(events) {
      if (events.length === 0) return;
      const values: unknown[] = [];
      const placeholders: string[] = [];
      let idx = 1;
      for (const e of events) {
        placeholders.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7})`);
        values.push(e.eventId, e.eventType, e.entityId ?? null, e.worldId,
          e.dynastyId ?? null, JSON.stringify(e.payload), e.serverId, e.sequence);
        idx += 8;
      }
      await pool.query(
        `INSERT INTO game_events (event_id, event_type, entity_id, world_id, dynasty_id, payload, server_id, sequence)
         VALUES ${placeholders.join(', ')}`,
        values,
      );
    },

    async insertPlayerMetric(metric) {
      await pool.query(
        `INSERT INTO player_metrics (dynasty_id, world_id, metric_type, value) VALUES ($1, $2, $3, $4)`,
        [metric.dynastyId, metric.worldId, metric.metricType, metric.value],
      );
    },

    async insertServerMetric(metric) {
      await pool.query(
        `INSERT INTO server_metrics (server_id, region, cpu_percent, memory_mb, connections, tick_duration_us, event_throughput)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [metric.serverId, metric.region, metric.cpuPercent, metric.memoryMb,
         metric.connections, metric.tickDurationUs, metric.eventThroughput],
      );
    },

    async queryEventsByType(worldId, eventType, hours) {
      const result = await pool.query(
        `SELECT event_id, event_type, entity_id, world_id, dynasty_id, payload, server_id, sequence, created_at
         FROM game_events
         WHERE world_id = $1 AND event_type = $2 AND created_at > NOW() - INTERVAL '1 hour' * $3
         ORDER BY created_at DESC
         LIMIT 1000`,
        [worldId, eventType, hours],
      );
      return result.rows.map(toGameEvent);
    },

    async getHourlyEventCounts(worldId, hours) {
      const result = await pool.query(
        `SELECT bucket, world_id, event_type, event_count AS count
         FROM hourly_event_counts
         WHERE world_id = $1 AND bucket > NOW() - INTERVAL '1 hour' * $2
         ORDER BY bucket DESC`,
        [worldId, hours],
      );
      return result.rows.map((r: Record<string, unknown>) => ({
        bucket: new Date(String(r['bucket'])),
        worldId: String(r['world_id']),
        eventType: String(r['event_type']),
        count: Number(r['count']),
      }));
    },
  };
}

function toGameEvent(row: Record<string, unknown>): GameEvent {
  return {
    eventId: String(row['event_id']),
    eventType: String(row['event_type']),
    entityId: row['entity_id'] !== null ? String(row['entity_id']) : undefined,
    worldId: String(row['world_id']),
    dynastyId: row['dynasty_id'] !== null ? String(row['dynasty_id']) : undefined,
    payload: (typeof row['payload'] === 'object' && row['payload'] !== null ? row['payload'] : {}) as Record<string, unknown>,
    serverId: String(row['server_id']),
    sequence: BigInt(String(row['sequence'] ?? '0')),
  };
}
