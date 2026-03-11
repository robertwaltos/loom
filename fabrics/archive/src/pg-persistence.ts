/**
 * PostgreSQL Persistence Adapter — Production storage for Archive.
 *
 * Implements database-backed storage for chronicle entries and
 * event streams. Uses pg connection pooling with parameterised
 * queries to prevent SQL injection.
 *
 * Thread: steel/archive/postgres-persistence
 * Tier: 0
 */

import type { Pool, PoolConfig, QueryResult } from 'pg';
import type { ChronicleEntry, ChronicleCategory, ChronicleFilter } from './chronicle.js';

// ─── Configuration ──────────────────────────────────────────────

export interface PostgresConfig {
  readonly connectionString?: string;
  readonly host?: string;
  readonly port?: number;
  readonly database?: string;
  readonly user?: string;
  readonly password?: string;
  readonly maxConnections?: number;
  readonly idleTimeoutMs?: number;
  readonly ssl?: boolean;
}

// ─── Chronicle Store ────────────────────────────────────────────

export interface PgChronicleStore {
  insertEntry(entry: ChronicleEntry): Promise<void>;
  getById(entryId: string): Promise<ChronicleEntry | undefined>;
  getByIndex(index: number): Promise<ChronicleEntry | undefined>;
  query(filter: ChronicleFilter): Promise<ReadonlyArray<ChronicleEntry>>;
  latest(): Promise<ChronicleEntry | undefined>;
  count(): Promise<number>;
}

// ─── Event Store ────────────────────────────────────────────────

export interface DomainEventRow {
  readonly eventId: string;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly eventType: string;
  readonly version: number;
  readonly payload: string;
  readonly occurredAt: bigint;
}

export interface PgEventStore {
  appendEvent(event: DomainEventRow): Promise<void>;
  getEventsByAggregate(aggregateId: string, fromVersion?: number): Promise<ReadonlyArray<DomainEventRow>>;
  getLatestVersion(aggregateId: string): Promise<number>;
}

// ─── Connection Pool Factory ────────────────────────────────────

export async function createPgPool(config: PostgresConfig): Promise<Pool> {
  const { default: pg } = await import('pg');

  const poolConfig: PoolConfig = {
    connectionString: config.connectionString,
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    max: config.maxConnections ?? 10,
    idleTimeoutMillis: config.idleTimeoutMs ?? 30_000,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
  };

  const pool = new pg.Pool(poolConfig);
  return pool;
}

// ─── Schema Migration ───────────────────────────────────────────

export async function migrateSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chronicle_entries (
      entry_id TEXT PRIMARY KEY,
      index_num INTEGER NOT NULL UNIQUE,
      timestamp_micros BIGINT NOT NULL,
      category TEXT NOT NULL,
      world_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      content TEXT NOT NULL,
      hash TEXT NOT NULL,
      previous_hash TEXT NOT NULL
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_chronicle_category
    ON chronicle_entries (category)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_chronicle_world
    ON chronicle_entries (world_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_chronicle_subject
    ON chronicle_entries (subject_id)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS domain_events (
      event_id TEXT PRIMARY KEY,
      aggregate_id TEXT NOT NULL,
      aggregate_type TEXT NOT NULL,
      event_type TEXT NOT NULL,
      version INTEGER NOT NULL,
      payload JSONB NOT NULL,
      occurred_at BIGINT NOT NULL,
      UNIQUE (aggregate_id, version)
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_events_aggregate
    ON domain_events (aggregate_id, version)
  `);
}

// ─── Chronicle Store Implementation ─────────────────────────────

export function createPgChronicleStore(pool: Pool): PgChronicleStore {
  return {
    insertEntry: (entry) => insertChronicleEntry(pool, entry),
    getById: (entryId) => getChronicleById(pool, entryId),
    getByIndex: (index) => getChronicleByIndex(pool, index),
    query: (filter) => queryChronicle(pool, filter),
    latest: () => getLatestChronicle(pool),
    count: () => countChronicle(pool),
  };
}

async function insertChronicleEntry(pool: Pool, entry: ChronicleEntry): Promise<void> {
  await pool.query(
    `INSERT INTO chronicle_entries
     (entry_id, index_num, timestamp_micros, category, world_id, subject_id, content, hash, previous_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      entry.entryId,
      entry.index,
      entry.timestamp,
      entry.category,
      entry.worldId,
      entry.subjectId,
      entry.content,
      entry.hash,
      entry.previousHash,
    ],
  );
}

async function getChronicleById(pool: Pool, entryId: string): Promise<ChronicleEntry | undefined> {
  const result = await pool.query(
    'SELECT * FROM chronicle_entries WHERE entry_id = $1',
    [entryId],
  );
  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row ? mapChronicleRow(row) : undefined;
}

async function getChronicleByIndex(pool: Pool, index: number): Promise<ChronicleEntry | undefined> {
  const result = await pool.query(
    'SELECT * FROM chronicle_entries WHERE index_num = $1',
    [index],
  );
  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row ? mapChronicleRow(row) : undefined;
}

async function queryChronicle(
  pool: Pool,
  filter: ChronicleFilter,
): Promise<ReadonlyArray<ChronicleEntry>> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filter.category !== undefined) {
    conditions.push(`category = $${String(paramIndex)}`);
    params.push(filter.category);
    paramIndex += 1;
  }

  if (filter.worldId !== undefined) {
    conditions.push(`world_id = $${String(paramIndex)}`);
    params.push(filter.worldId);
    paramIndex += 1;
  }

  if (filter.subjectId !== undefined) {
    conditions.push(`subject_id = $${String(paramIndex)}`);
    params.push(filter.subjectId);
    paramIndex += 1;
  }

  if (filter.fromIndex !== undefined) {
    conditions.push(`index_num >= $${String(paramIndex)}`);
    params.push(filter.fromIndex);
    paramIndex += 1;
  }

  if (filter.toIndex !== undefined) {
    conditions.push(`index_num <= $${String(paramIndex)}`);
    params.push(filter.toIndex);
    paramIndex += 1;
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const result: QueryResult = await pool.query(
    `SELECT * FROM chronicle_entries ${where} ORDER BY index_num ASC`,
    params,
  );

  return (result.rows as Array<Record<string, unknown>>).map(mapChronicleRow);
}

async function getLatestChronicle(pool: Pool): Promise<ChronicleEntry | undefined> {
  const result = await pool.query(
    'SELECT * FROM chronicle_entries ORDER BY index_num DESC LIMIT 1',
  );
  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row ? mapChronicleRow(row) : undefined;
}

async function countChronicle(pool: Pool): Promise<number> {
  const result = await pool.query('SELECT COUNT(*) as count FROM chronicle_entries');
  const row = result.rows[0] as { count: string } | undefined;
  return row ? Number(row.count) : 0;
}

function mapChronicleRow(row: Record<string, unknown>): ChronicleEntry {
  return {
    entryId: String(row['entry_id']),
    index: Number(row['index_num']),
    timestamp: Number(row['timestamp_micros']),
    category: String(row['category']) as ChronicleCategory,
    worldId: String(row['world_id']),
    subjectId: String(row['subject_id']),
    content: String(row['content']),
    hash: String(row['hash']),
    previousHash: String(row['previous_hash']),
  };
}

// ─── Event Store Implementation ─────────────────────────────────

export function createPgEventStore(pool: Pool): PgEventStore {
  return {
    appendEvent: (event) => appendDomainEvent(pool, event),
    getEventsByAggregate: (aggregateId, fromVersion) =>
      getEventsForAggregate(pool, aggregateId, fromVersion),
    getLatestVersion: (aggregateId) => getAggregateVersion(pool, aggregateId),
  };
}

async function appendDomainEvent(pool: Pool, event: DomainEventRow): Promise<void> {
  await pool.query(
    `INSERT INTO domain_events
     (event_id, aggregate_id, aggregate_type, event_type, version, payload, occurred_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      event.eventId,
      event.aggregateId,
      event.aggregateType,
      event.eventType,
      event.version,
      event.payload,
      event.occurredAt.toString(),
    ],
  );
}

async function getEventsForAggregate(
  pool: Pool,
  aggregateId: string,
  fromVersion?: number,
): Promise<ReadonlyArray<DomainEventRow>> {
  const from = fromVersion ?? 0;
  const result = await pool.query(
    `SELECT * FROM domain_events
     WHERE aggregate_id = $1 AND version >= $2
     ORDER BY version ASC`,
    [aggregateId, from],
  );

  return (result.rows as Array<Record<string, unknown>>).map(mapEventRow);
}

async function getAggregateVersion(pool: Pool, aggregateId: string): Promise<number> {
  const result = await pool.query(
    'SELECT MAX(version) as max_version FROM domain_events WHERE aggregate_id = $1',
    [aggregateId],
  );
  const row = result.rows[0] as { max_version: number | null } | undefined;
  return row?.max_version ?? 0;
}

function mapEventRow(row: Record<string, unknown>): DomainEventRow {
  return {
    eventId: String(row['event_id']),
    aggregateId: String(row['aggregate_id']),
    aggregateType: String(row['aggregate_type']),
    eventType: String(row['event_type']),
    version: Number(row['version']),
    payload: typeof row['payload'] === 'string'
      ? row['payload']
      : JSON.stringify(row['payload']),
    occurredAt: BigInt(String(row['occurred_at'])),
  };
}
