/**
 * PostgreSQL Event Archive — Append-only event persistence with replay.
 *
 * Implements durable event storage backed by PostgreSQL. Events are
 * written to an append-only table with sequence numbers for ordering,
 * enabling full state reconstruction via replay.
 *
 * This complements the in-memory EventArchive in the archive fabric
 * by providing actual database persistence.
 *
 * Thread: steel/archive/pg-event-archive
 * Tier: 1
 */

import type { Pool, QueryResult } from 'pg';

// ─── Types ──────────────────────────────────────────────────────

export interface ArchivedEventRow {
  readonly event_id: string;
  readonly event_type: string;
  readonly world_id: string;
  readonly entity_id: string | null;
  readonly payload: string;
  readonly occurred_at: string;
  readonly archived_at: string;
  readonly sequence_number: string;
}

export interface ArchiveEventParams {
  readonly eventId: string;
  readonly eventType: string;
  readonly worldId: string;
  readonly entityId?: string | undefined;
  readonly payload: string;
  readonly occurredAt: number;
}

export interface TimeRangeQueryParams {
  readonly eventType?: string | undefined;
  readonly worldId?: string | undefined;
  readonly entityId?: string | undefined;
  readonly startTime?: number | undefined;
  readonly endTime?: number | undefined;
  readonly limit?: number | undefined;
}

export interface ReplaySequenceResult {
  readonly events: ReadonlyArray<ReplayEvent>;
  readonly eventCount: number;
}

export interface ReplayEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly worldId: string;
  readonly entityId: string | null;
  readonly payload: unknown;
  readonly occurredAt: number;
  readonly sequenceNumber: number;
}

// ─── PostgreSQL Event Archive ───────────────────────────────────

export interface PgEventArchive {
  readonly append: (event: ArchiveEventParams) => Promise<number>;
  readonly query: (params: TimeRangeQueryParams) => Promise<ReadonlyArray<ReplayEvent>>;
  readonly replay: (worldId: string, fromSequence?: number) => Promise<ReplaySequenceResult>;
  readonly getLatestSequence: () => Promise<number>;
  readonly count: () => Promise<number>;
}

// ─── Schema Migration ───────────────────────────────────────────

export async function migrateEventArchiveSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_archive (
      sequence_number BIGSERIAL PRIMARY KEY,
      event_id TEXT NOT NULL UNIQUE,
      event_type TEXT NOT NULL,
      world_id TEXT NOT NULL,
      entity_id TEXT,
      payload JSONB NOT NULL,
      occurred_at BIGINT NOT NULL,
      archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_event_archive_type
    ON event_archive (event_type)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_event_archive_world
    ON event_archive (world_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_event_archive_entity
    ON event_archive (entity_id) WHERE entity_id IS NOT NULL
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_event_archive_occurred
    ON event_archive (occurred_at)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_event_archive_world_seq
    ON event_archive (world_id, sequence_number)
  `);
}

// ─── Factory ────────────────────────────────────────────────────

export function createPgEventArchive(pool: Pool): PgEventArchive {
  return {
    append: (event) => appendEvent(pool, event),
    query: (params) => queryEvents(pool, params),
    replay: (worldId, fromSequence) => replayEvents(pool, worldId, fromSequence),
    getLatestSequence: () => getLatestSequence(pool),
    count: () => countEvents(pool),
  };
}

// ─── Append ─────────────────────────────────────────────────────

async function appendEvent(pool: Pool, event: ArchiveEventParams): Promise<number> {
  const result: QueryResult<{ sequence_number: string }> = await pool.query(
    `INSERT INTO event_archive (event_id, event_type, world_id, entity_id, payload, occurred_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)
     RETURNING sequence_number`,
    [
      event.eventId,
      event.eventType,
      event.worldId,
      event.entityId ?? null,
      event.payload,
      event.occurredAt,
    ],
  );
  const row = result.rows[0];
  if (row === undefined) {
    throw new Error('Insert returned no sequence number');
  }
  return Number(row.sequence_number);
}

// ─── Query ──────────────────────────────────────────────────────

async function queryEvents(
  pool: Pool,
  params: TimeRangeQueryParams,
): Promise<ReadonlyArray<ReplayEvent>> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (params.eventType !== undefined) {
    conditions.push(`event_type = $${paramIndex++}`);
    values.push(params.eventType);
  }
  if (params.worldId !== undefined) {
    conditions.push(`world_id = $${paramIndex++}`);
    values.push(params.worldId);
  }
  if (params.entityId !== undefined) {
    conditions.push(`entity_id = $${paramIndex++}`);
    values.push(params.entityId);
  }
  if (params.startTime !== undefined) {
    conditions.push(`occurred_at >= $${paramIndex++}`);
    values.push(params.startTime);
  }
  if (params.endTime !== undefined) {
    conditions.push(`occurred_at <= $${paramIndex++}`);
    values.push(params.endTime);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitClause = params.limit !== undefined ? `LIMIT $${paramIndex++}` : '';
  if (params.limit !== undefined) {
    values.push(params.limit);
  }

  const result: QueryResult<ArchivedEventRow> = await pool.query(
    `SELECT event_id, event_type, world_id, entity_id, payload::text, occurred_at, archived_at, sequence_number::text
     FROM event_archive
     ${whereClause}
     ORDER BY sequence_number ASC
     ${limitClause}`,
    values,
  );

  return result.rows.map(rowToReplayEvent);
}

// ─── Replay ─────────────────────────────────────────────────────

async function replayEvents(
  pool: Pool,
  worldId: string,
  fromSequence?: number,
): Promise<ReplaySequenceResult> {
  const conditions = ['world_id = $1'];
  const values: unknown[] = [worldId];

  if (fromSequence !== undefined) {
    conditions.push('sequence_number >= $2');
    values.push(fromSequence);
  }

  const result: QueryResult<ArchivedEventRow> = await pool.query(
    `SELECT event_id, event_type, world_id, entity_id, payload::text, occurred_at, archived_at, sequence_number::text
     FROM event_archive
     WHERE ${conditions.join(' AND ')}
     ORDER BY sequence_number ASC`,
    values,
  );

  const events = result.rows.map(rowToReplayEvent);
  return { events, eventCount: events.length };
}

// ─── Helpers ────────────────────────────────────────────────────

async function getLatestSequence(pool: Pool): Promise<number> {
  const result: QueryResult<{ max: string | null }> = await pool.query(
    'SELECT MAX(sequence_number)::text AS max FROM event_archive',
  );
  const row = result.rows[0];
  return row?.max !== null && row?.max !== undefined ? Number(row.max) : 0;
}

async function countEvents(pool: Pool): Promise<number> {
  const result: QueryResult<{ count: string }> = await pool.query(
    'SELECT COUNT(*)::text AS count FROM event_archive',
  );
  const row = result.rows[0];
  return row !== undefined ? Number(row.count) : 0;
}

function rowToReplayEvent(row: ArchivedEventRow): ReplayEvent {
  return {
    eventId: row.event_id,
    eventType: row.event_type,
    worldId: row.world_id,
    entityId: row.entity_id,
    payload: JSON.parse(row.payload) as unknown,
    occurredAt: Number(row.occurred_at),
    sequenceNumber: Number(row.sequence_number),
  };
}
