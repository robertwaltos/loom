/**
 * PG Dashboard Queries — Simulation Tests
 *
 * Verifies createPgDashboardQueries behavior using a mock pg Pool.
 * Each method is tested for correct SQL, parameter passing, and return shape.
 *
 * Thread: silk/universe/parent-dashboard/pg-queries-sim
 * Tier: 1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPgDashboardQueries } from '../pg-queries.js';
import type { WorldDefinition, WorldLuminance } from '../../worlds/types.js';
import type { AddChildRequest } from '../api.js';

// ─── Helpers ──────────────────────────────────────────────────────

const FIXED_NOW = 1_700_000_000_000;
const KINDLER_ID = 'k-test-001';
const PARENT_ID = 'parent-test-001';

const WORLD_A: WorldDefinition = {
  id: 'cloud-kingdom',
  name: 'Cloud Kingdom',
  realm: 'discovery',
  subject: 'Earth Science / Weather',
  guideId: 'professor-nimbus',
  description: 'A realm above the clouds.',
  colorPalette: { primary: '#adf', secondary: '#cef', accent: '#9df', fadedVariant: '#ddd', restoredVariant: '#fff' },
  lightingMood: 'overcast',
  biomeKit: 'sky',
  entryIds: ['entry-barometer', 'entry-cumulus', 'entry-stratus'],
  threadwayConnections: [],
};

const WORLD_B: WorldDefinition = {
  id: 'river-delta',
  name: 'River Delta',
  realm: 'discovery',
  subject: 'Geography',
  guideId: 'old-rowan',
  description: 'Where rivers meet the sea.',
  colorPalette: { primary: '#4a8', secondary: '#2a6', accent: '#3b7', fadedVariant: '#888', restoredVariant: '#9fa' },
  lightingMood: 'warm',
  biomeKit: 'wetlands',
  entryIds: ['entry-delta', 'entry-sediment'],
  threadwayConnections: [],
};

const ALL_WORLDS: readonly WorldDefinition[] = [WORLD_A, WORLD_B];

function makeLuminance(worldId: string): WorldLuminance {
  return {
    worldId,
    luminance: 0.6,
    stage: 'glowing',
    lastRestoredAt: FIXED_NOW - 3_600_000,
    totalKindlersContributed: 5,
    activeKindlerCount: 2,
  };
}

function getLuminance(worldId: string): WorldLuminance | undefined {
  return makeLuminance(worldId);
}

function getWorldEntriesTotal(worldId: string): number {
  return ALL_WORLDS.find(w => w.id === worldId)?.entryIds.length ?? 0;
}

// ─── Mock Pool factory ─────────────────────────────────────────────

type QueryResult = { rows: object[]; rowCount?: number };

function makePool(responses: QueryResult[]) {
  let callIndex = 0;
  return {
    query: vi.fn().mockImplementation(() => {
      const resp = responses[callIndex] ?? { rows: [], rowCount: 0 };
      callIndex++;
      return Promise.resolve(resp);
    }),
  };
}

function makeQueries(pool: ReturnType<typeof makePool>) {
  return createPgDashboardQueries(pool as never, ALL_WORLDS, getLuminance, getWorldEntriesTotal);
}

// ─── Fixtures ─────────────────────────────────────────────────────

function makeProfileRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: KINDLER_ID,
    parent_account_id: PARENT_ID,
    display_name: 'Aria',
    age_tier: 2,
    avatar_id: 'avatar-rabbit',
    spark_level: 0.4,
    current_chapter: 'first_light',
    worlds_visited: ['cloud-kingdom'],
    worlds_restored: [],
    guides_met_count: 2,
    created_at: FIXED_NOW - 86_400_000,
    ...overrides,
  };
}

function makeSessionRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'sess-001',
    kindler_id: KINDLER_ID,
    started_at: FIXED_NOW - 3_600_000,
    ended_at: FIXED_NOW - 1_800_000,
    worlds_visited: ['cloud-kingdom'],
    guides_interacted: ['professor-nimbus'],
    entries_completed: ['entry-barometer'],
    spark_delta: 0.1,
    summary: null,
    ...overrides,
  };
}

function makeSparkLogRow(delta = 0.05) {
  return {
    id: 'spark-001',
    kindler_id: KINDLER_ID,
    spark_level: 0.4,
    delta,
    cause: 'lesson_completed',
    timestamp: FIXED_NOW - 1_000,
  };
}

// ─── Tests ────────────────────────────────────────────────────────

describe('createPgDashboardQueries', () => {

  // ─── getParentSubscription ────────────────────────────────────

  describe('getParentSubscription', () => {
    it('returns subscription status when row found', async () => {
      const pool = makePool([{ rows: [{ subscription_status: 'active' }] }]);
      const q = makeQueries(pool);
      const result = await q.getParentSubscription(PARENT_ID);
      expect(result).toEqual({ status: 'active' });
    });

    it('returns null when parent not found', async () => {
      const pool = makePool([{ rows: [] }]);
      const q = makeQueries(pool);
      const result = await q.getParentSubscription('unknown-parent');
      expect(result).toBeNull();
    });

    it('queries parent_accounts table with parentId param', async () => {
      const pool = makePool([{ rows: [] }]);
      const q = makeQueries(pool);
      await q.getParentSubscription(PARENT_ID);
      const [sql, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(sql.toLowerCase()).toContain('parent_accounts');
      expect(params[0]).toBe(PARENT_ID);
    });
  });

  // ─── isChildOwnedByParent ─────────────────────────────────────

  describe('isChildOwnedByParent', () => {
    it('returns true when count > 0', async () => {
      const pool = makePool([{ rows: [{ count: '1' }] }]);
      const q = makeQueries(pool);
      const result = await q.isChildOwnedByParent(PARENT_ID, KINDLER_ID);
      expect(result).toBe(true);
    });

    it('returns false when count is 0', async () => {
      const pool = makePool([{ rows: [{ count: '0' }] }]);
      const q = makeQueries(pool);
      const result = await q.isChildOwnedByParent(PARENT_ID, KINDLER_ID);
      expect(result).toBe(false);
    });

    it('queries kindler_profiles with both id and parent_account_id', async () => {
      const pool = makePool([{ rows: [{ count: '0' }] }]);
      const q = makeQueries(pool);
      await q.isChildOwnedByParent(PARENT_ID, KINDLER_ID);
      const [sql, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(sql.toLowerCase()).toContain('kindler_profiles');
      expect(params).toContain(KINDLER_ID);
      expect(params).toContain(PARENT_ID);
    });
  });

  // ─── createChild ─────────────────────────────────────────────

  describe('createChild', () => {
    it('returns true on successful insert', async () => {
      const pool = makePool([{ rows: [] }]);
      const q = makeQueries(pool);
      const req: AddChildRequest = { displayName: 'Ember', ageTier: 1, avatarId: 'avatar-flame' };
      const result = await q.createChild(PARENT_ID, req, 'new-kid', FIXED_NOW);
      expect(result).toBe(true);
    });

    it('returns false if insert throws (duplicate)', async () => {
      const pool = { query: vi.fn().mockRejectedValue(new Error('duplicate key')) };
      const q = createPgDashboardQueries(pool as never, ALL_WORLDS, getLuminance, getWorldEntriesTotal);
      const req: AddChildRequest = { displayName: 'Ember', ageTier: 1, avatarId: 'avatar-flame' };
      const result = await q.createChild(PARENT_ID, req, 'dup-kid', FIXED_NOW);
      expect(result).toBe(false);
    });

    it('inserts into kindler_profiles with correct initial values', async () => {
      const pool = makePool([{ rows: [] }]);
      const q = makeQueries(pool);
      const req: AddChildRequest = { displayName: 'Spark', ageTier: 3, avatarId: 'avatar-star' };
      await q.createChild(PARENT_ID, req, 'kid-xyz', FIXED_NOW);
      const [sql, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(sql.toLowerCase()).toContain('kindler_profiles');
      expect(params).toContain('kid-xyz');
      expect(params).toContain(PARENT_ID);
      expect(params).toContain('Spark');
      expect(params).toContain(3);
    });
  });

  // ─── deleteChild ─────────────────────────────────────────────

  describe('deleteChild', () => {
    it('returns true when row was deleted', async () => {
      const pool = makePool([{ rows: [], rowCount: 1 }]);
      const q = makeQueries(pool);
      const result = await q.deleteChild(PARENT_ID, KINDLER_ID);
      expect(result).toBe(true);
    });

    it('returns false when no row matched', async () => {
      const pool = makePool([{ rows: [], rowCount: 0 }]);
      const q = makeQueries(pool);
      const result = await q.deleteChild(PARENT_ID, 'nonexistent');
      expect(result).toBe(false);
    });

    it('DELETEs from kindler_profiles checking both id and parent_account_id', async () => {
      const pool = makePool([{ rows: [], rowCount: 1 }]);
      const q = makeQueries(pool);
      await q.deleteChild(PARENT_ID, KINDLER_ID);
      const [sql, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(sql.toUpperCase()).toContain('DELETE');
      expect(sql.toLowerCase()).toContain('kindler_profiles');
      expect(params).toContain(KINDLER_ID);
      expect(params).toContain(PARENT_ID);
    });
  });

  // ─── updateTimeControls ───────────────────────────────────────

  describe('updateTimeControls', () => {
    it('returns true when rowCount is 1', async () => {
      const pool = makePool([{ rows: [], rowCount: 1 }]);
      const q = makeQueries(pool);
      const result = await q.updateTimeControls(PARENT_ID, KINDLER_ID, {
        maxDailyMinutes: 30,
        bedtimeCutoff: '21:00',
        notificationsEnabled: true,
      });
      expect(result).toBe(true);
    });

    it('returns false when no row matched', async () => {
      const pool = makePool([{ rows: [], rowCount: 0 }]);
      const q = makeQueries(pool);
      const result = await q.updateTimeControls('unknown-parent', KINDLER_ID, {
        maxDailyMinutes: null,
        bedtimeCutoff: null,
        notificationsEnabled: false,
      });
      expect(result).toBe(false);
    });

    it('UPDATEs parent_accounts time_controls column', async () => {
      const pool = makePool([{ rows: [], rowCount: 1 }]);
      const q = makeQueries(pool);
      await q.updateTimeControls(PARENT_ID, KINDLER_ID, {
        maxDailyMinutes: 45,
        bedtimeCutoff: '20:00',
        notificationsEnabled: false,
      });
      const [sql, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(sql.toUpperCase()).toContain('UPDATE');
      expect(sql.toLowerCase()).toContain('parent_accounts');
      expect(params[0]).toBe(PARENT_ID);
    });
  });

  // ─── getChildrenForParent ─────────────────────────────────────

  describe('getChildrenForParent', () => {
    it('returns empty array when no profiles found', async () => {
      const pool = makePool([{ rows: [] }]);
      const q = makeQueries(pool);
      const result = await q.getChildrenForParent(PARENT_ID);
      expect(result).toHaveLength(0);
    });

    it('returns one ChildSummary per profile row', async () => {
      const pool = makePool([
        { rows: [makeProfileRow()] },                         // profiles
        { rows: [{ started_at: FIXED_NOW - 3600 }] },        // last session
        { rows: [makeSparkLogRow(0.05), makeSparkLogRow(0.03)] }, // spark log
        { rows: [{ started_at: FIXED_NOW }] },               // sessions for streak
      ]);
      const q = makeQueries(pool);
      const result = await q.getChildrenForParent(PARENT_ID);
      expect(result).toHaveLength(1);
      const child = result[0]!;
      expect(child.kindlerId).toBe(KINDLER_ID);
      expect(child.displayName).toBe('Aria');
      expect(child.ageTier).toBe(2);
      expect(child.sparkLevel).toBe(0.4);
    });

    it('sets sparkTrend to growing when net delta > 0.05', async () => {
      const pool = makePool([
        { rows: [makeProfileRow()] },
        { rows: [] },                                          // no last session
        { rows: [makeSparkLogRow(0.1), makeSparkLogRow(0.05)] }, // positive delta
        { rows: [] },
      ]);
      const q = makeQueries(pool);
      const result = await q.getChildrenForParent(PARENT_ID);
      expect(result[0]?.sparkTrend).toBe('growing');
    });
  });

  // ─── getSessionHistory ────────────────────────────────────────

  describe('getSessionHistory', () => {
    it('returns sessions with correct shape', async () => {
      const pool = makePool([
        { rows: [makeSessionRow()] },
        { rows: [{ count: '1' }] },
      ]);
      const q = makeQueries(pool);
      const result = await q.getSessionHistory(KINDLER_ID, 10, null);
      expect(result.total).toBe(1);
      expect(result.sessions).toHaveLength(1);
      const sess = result.sessions[0]!;
      expect(sess.sessionId).toBe('sess-001');
      expect(sess.entriesCompleted).toBe(1);
      expect(sess.durationMinutes).toBe(30);
    });

    it('returns empty when no sessions', async () => {
      const pool = makePool([
        { rows: [] },
        { rows: [{ count: '0' }] },
      ]);
      const q = makeQueries(pool);
      const result = await q.getSessionHistory(KINDLER_ID, 10, null);
      expect(result.sessions).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('uses cursor parameter in SQL when provided', async () => {
      const pool = makePool([
        { rows: [] },
        { rows: [{ count: '0' }] },
      ]);
      const q = makeQueries(pool);
      const cursor = new Date(FIXED_NOW).toISOString();
      await q.getSessionHistory(KINDLER_ID, 5, cursor);
      const [sql, params] = (pool.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
      expect(sql.toLowerCase()).toContain('started_at');
      expect(params).toContain(KINDLER_ID);
    });
  });

  // ─── getWorldsMap ─────────────────────────────────────────────

  describe('getWorldsMap', () => {
    it('returns null-like empty array when profile not found', async () => {
      const pool = makePool([
        { rows: [] },   // no profile
        { rows: [] },   // no progress
      ]);
      const q = makeQueries(pool);
      const result = await q.getWorldsMap(KINDLER_ID);
      expect(result).toHaveLength(0);
    });

    it('returns one entry per world in allWorlds', async () => {
      const pool = makePool([
        { rows: [{ worlds_visited: ['cloud-kingdom'], worlds_restored: [] }] },
        { rows: [] }, // no progress
      ]);
      const q = makeQueries(pool);
      const result = await q.getWorldsMap(KINDLER_ID);
      expect(result).toHaveLength(ALL_WORLDS.length);
    });

    it('marks visited=true for worlds in worlds_visited', async () => {
      const pool = makePool([
        { rows: [{ worlds_visited: ['cloud-kingdom'], worlds_restored: [] }] },
        { rows: [] },
      ]);
      const q = makeQueries(pool);
      const result = await q.getWorldsMap(KINDLER_ID);
      const cloudEntry = result.find(w => w.worldId === 'cloud-kingdom');
      expect(cloudEntry?.visited).toBe(true);
      const deltaEntry = result.find(w => w.worldId === 'river-delta');
      expect(deltaEntry?.visited).toBe(false);
    });

    it('marks restored=true for worlds in worlds_restored', async () => {
      const pool = makePool([
        { rows: [{ worlds_visited: ['cloud-kingdom'], worlds_restored: ['cloud-kingdom'] }] },
        { rows: [] },
      ]);
      const q = makeQueries(pool);
      const result = await q.getWorldsMap(KINDLER_ID);
      const cloudEntry = result.find(w => w.worldId === 'cloud-kingdom');
      expect(cloudEntry?.restored).toBe(true);
    });

    it('derives guideName from guideId (kebab-case to Title Case)', async () => {
      const pool = makePool([
        { rows: [{ worlds_visited: [], worlds_restored: [] }] },
        { rows: [] },
      ]);
      const q = makeQueries(pool);
      const result = await q.getWorldsMap(KINDLER_ID);
      const cloud = result.find(w => w.worldId === 'cloud-kingdom');
      expect(cloud?.guideName).toBe('Professor Nimbus');
    });

    it('uses live luminance from getLuminance callback', async () => {
      const pool = makePool([
        { rows: [{ worlds_visited: [], worlds_restored: [] }] },
        { rows: [] },
      ]);
      const q = makeQueries(pool);
      const result = await q.getWorldsMap(KINDLER_ID);
      const cloud = result.find(w => w.worldId === 'cloud-kingdom');
      expect(cloud?.luminance).toBe(0.6);
      expect(cloud?.fadingStage).toBe('glowing');
    });

    it('counts entriesCompleted from kindler_progress entries matching world.entryIds', async () => {
      const pool = makePool([
        { rows: [{ worlds_visited: ['cloud-kingdom'], worlds_restored: [] }] },
        { rows: [
          { id: 'p1', kindler_id: KINDLER_ID, entry_id: 'entry-barometer', completed_at: FIXED_NOW, adventure_type: 'field_trip', score: 90 },
          { id: 'p2', kindler_id: KINDLER_ID, entry_id: 'entry-cumulus', completed_at: FIXED_NOW, adventure_type: 'field_trip', score: 85 },
        ]},
      ]);
      const q = makeQueries(pool);
      const result = await q.getWorldsMap(KINDLER_ID);
      const cloud = result.find(w => w.worldId === 'cloud-kingdom');
      expect(cloud?.entriesCompleted).toBe(2);
      expect(cloud?.entriesTotal).toBe(3); // WORLD_A.entryIds.length
    });
  });

  // ─── getProgressReport ────────────────────────────────────────

  describe('getProgressReport', () => {
    it('returns null when kindler not found', async () => {
      const pool = makePool([{ rows: [] }]);
      const q = makeQueries(pool);
      const result = await q.getProgressReport('nobody', 0, FIXED_NOW);
      expect(result).toBeNull();
    });

    it('returns zero counts when no sessions or progress in window', async () => {
      const pool = makePool([
        { rows: [makeProfileRow()] },  // profile
        { rows: [] },                  // sessions
        { rows: [] },                  // progress
        { rows: [] },                  // spark log
      ]);
      const q = makeQueries(pool);
      const result = await q.getProgressReport(KINDLER_ID, 0, FIXED_NOW);
      expect(result?.sessionsCount).toBe(0);
      expect(result?.totalMinutes).toBe(0);
      expect(result?.entriesCompleted).toBe(0);
    });

    it('returns correct sessionsCount and totalMinutes', async () => {
      const sessionRow = makeSessionRow({
        started_at: FIXED_NOW - 3_600_000,
        ended_at: FIXED_NOW - 1_800_000,
      });
      const pool = makePool([
        { rows: [makeProfileRow()] },
        { rows: [sessionRow] },
        { rows: [] },
        { rows: [] },
      ]);
      const q = makeQueries(pool);
      const result = await q.getProgressReport(KINDLER_ID, 0, FIXED_NOW);
      expect(result?.sessionsCount).toBe(1);
      expect(result?.totalMinutes).toBe(30);
    });

    it('returns displayName from profile', async () => {
      const pool = makePool([
        { rows: [makeProfileRow({ display_name: 'Aria' })] },
        { rows: [] },
        { rows: [] },
        { rows: [] },
      ]);
      const q = makeQueries(pool);
      const result = await q.getProgressReport(KINDLER_ID, 0, FIXED_NOW);
      expect(result?.displayName).toBe('Aria');
    });

    it('includes a non-empty teacherReadySummary', async () => {
      const pool = makePool([
        { rows: [makeProfileRow()] },
        { rows: [makeSessionRow()] },
        { rows: [{ id: 'p1', kindler_id: KINDLER_ID, entry_id: 'entry-barometer', completed_at: FIXED_NOW, adventure_type: 'field_trip', score: 90 }] },
        { rows: [makeSparkLogRow(0.05)] },
        { rows: [] }, // curriculum standards
      ]);
      const q = makeQueries(pool);
      const result = await q.getProgressReport(KINDLER_ID, 0, FIXED_NOW);
      expect(result?.teacherReadySummary.length).toBeGreaterThan(10);
    });
  });
});
