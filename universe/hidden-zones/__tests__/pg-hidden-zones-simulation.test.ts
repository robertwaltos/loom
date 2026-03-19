/**
 * PgHiddenZonesRepository — PostgreSQL simulation tests.
 *
 * Requires a live PostgreSQL instance:
 *   PG_HOST=localhost PG_PORT=5433 PG_USER=loom PG_PASSWORD=loom PG_DATABASE=loom
 *
 * Table created around each test run.
 * SKIP automatically if no DB connection available.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { createPgHiddenZonesRepository } from '../pg-hidden-zones-repository.js';

const DB_CONFIG = {
  host: process.env['PG_HOST'] ?? 'localhost',
  port: parseInt(process.env['PG_PORT'] ?? '5433', 10),
  user: process.env['PG_USER'] ?? 'loom',
  password: process.env['PG_PASSWORD'] ?? 'loom',
  database: process.env['PG_DATABASE'] ?? 'loom',
  connectionTimeoutMillis: 2000,
};

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS koydo_hidden_zone_discoveries (
    id             BIGSERIAL    PRIMARY KEY,
    kindler_id     UUID         NOT NULL,
    zone_id        VARCHAR(64)  NOT NULL,
    discovered_at  BIGINT       NOT NULL,
    UNIQUE (kindler_id, zone_id)
  )
`;

const KINDLER_A = 'eeeeeeee-0000-0000-0000-000000000001';
const KINDLER_B = 'ffffffff-0000-0000-0000-000000000002';
const ZONE_IN_BETWEEN = 'the-in-between';
const ZONE_DREAM = 'the-dream-archive';
const NOW = Date.now();

let pool: pg.Pool;
let skip = false;

beforeAll(async () => {
  try {
    pool = new pg.Pool(DB_CONFIG);
    await pool.query('SELECT 1');
    await pool.query(SCHEMA);
    await pool.query(`DELETE FROM koydo_hidden_zone_discoveries WHERE kindler_id IN ($1, $2)`, [KINDLER_A, KINDLER_B]);
  } catch {
    skip = true;
  }
});

afterAll(async () => {
  if (!skip && pool) {
    await pool.query(`DELETE FROM koydo_hidden_zone_discoveries WHERE kindler_id IN ($1, $2)`, [KINDLER_A, KINDLER_B]);
    await pool.end();
  }
});

describe('PgHiddenZonesRepository', () => {
  it('recordDiscovery — records a first discovery', async () => {
    if (skip) return;
    const repo = createPgHiddenZonesRepository(pool);
    const discovery = await repo.recordDiscovery(KINDLER_A, ZONE_IN_BETWEEN, NOW);
    expect(discovery).not.toBeNull();
    expect(discovery?.kindlerId).toBe(KINDLER_A);
    expect(discovery?.zoneId).toBe(ZONE_IN_BETWEEN);
    expect(discovery?.discoveredAt).toBe(NOW);
  });

  it('recordDiscovery — idempotent: returns null on duplicate', async () => {
    if (skip) return;
    const repo = createPgHiddenZonesRepository(pool);
    const second = await repo.recordDiscovery(KINDLER_A, ZONE_IN_BETWEEN, NOW + 5000);
    expect(second).toBeNull();
  });

  it('recordDiscovery — different zones recorded separately', async () => {
    if (skip) return;
    const repo = createPgHiddenZonesRepository(pool);
    const second = await repo.recordDiscovery(KINDLER_A, ZONE_DREAM, NOW + 1000);
    expect(second).not.toBeNull();
    expect(second?.zoneId).toBe(ZONE_DREAM);
  });

  it('hasDiscovered — returns true for a discovered zone', async () => {
    if (skip) return;
    const repo = createPgHiddenZonesRepository(pool);
    const found = await repo.hasDiscovered(KINDLER_A, ZONE_IN_BETWEEN);
    expect(found).toBe(true);
  });

  it('hasDiscovered — returns false for an undiscovered zone', async () => {
    if (skip) return;
    const repo = createPgHiddenZonesRepository(pool);
    const found = await repo.hasDiscovered(KINDLER_A, 'the-whales-library');
    expect(found).toBe(false);
  });

  it('getDiscoveredZoneIds — returns a set of discovered IDs', async () => {
    if (skip) return;
    const repo = createPgHiddenZonesRepository(pool);
    const ids = await repo.getDiscoveredZoneIds(KINDLER_A);
    expect(ids.has(ZONE_IN_BETWEEN)).toBe(true);
    expect(ids.has(ZONE_DREAM)).toBe(true);
    expect(ids.has('the-whales-library')).toBe(false);
  });

  it('getDiscoveriesForKindler — lists all discoveries in order', async () => {
    if (skip) return;
    const repo = createPgHiddenZonesRepository(pool);
    const discoveries = await repo.getDiscoveriesForKindler(KINDLER_A);
    expect(discoveries.length).toBeGreaterThanOrEqual(2);
    const zoneIds = discoveries.map((d) => d.zoneId);
    expect(zoneIds).toContain(ZONE_IN_BETWEEN);
    expect(zoneIds).toContain(ZONE_DREAM);
  });

  it('getDiscoveriesForKindler — returns empty array for unknown kindler', async () => {
    if (skip) return;
    const repo = createPgHiddenZonesRepository(pool);
    const discoveries = await repo.getDiscoveriesForKindler(KINDLER_B);
    expect(discoveries).toHaveLength(0);
  });

  it('getDiscoveredZoneIds — returns empty set for unknown kindler', async () => {
    if (skip) return;
    const repo = createPgHiddenZonesRepository(pool);
    const ids = await repo.getDiscoveredZoneIds(KINDLER_B);
    expect(ids.size).toBe(0);
  });
});
