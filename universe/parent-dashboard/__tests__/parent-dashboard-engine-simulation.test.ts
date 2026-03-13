/**
 * Parent Dashboard Engine — Simulation Tests
 *
 * Tests the handler logic for all parent dashboard operations: ownership
 * guards, child add/remove, time controls, session history pagination,
 * worlds map aggregation, progress reports, and COPPA-safe error paths.
 *
 * Thread: silk/universe/parent-dashboard-engine-sim
 * Tier: 1
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createDashboardEngine,
  type DashboardDeps,
  type DashboardQueries,
  type ChildDetailData,
  type ProgressReportData,
} from '../engine.js';
import type {
  ChildSummary,
  SessionSummaryPublic,
  WorldMapEntry,
} from '../api.js';

// ─── Helpers ──────────────────────────────────────────────────────

let idCounter = 0;
const FIXED_NOW = 1_620_000_000_000;

function makeDeps(): DashboardDeps {
  idCounter = 0;
  return {
    generateId: () => `kid-${++idCounter}`,
    now: () => FIXED_NOW,
    log: vi.fn(),
  };
}

function makeChildSummary(overrides?: Partial<ChildSummary>): ChildSummary {
  return {
    kindlerId: 'k1',
    displayName: 'Aria',
    ageTier: 1,
    avatarId: 'avatar-rabbit',
    sparkLevel: 0.5,
    sparkTrend: 'growing',
    currentChapter: 'first_light',
    worldsRestored: 2,
    lastSessionAt: FIXED_NOW - 3600_000,
    streakDays: 3,
    ...overrides,
  };
}

function makeDetailData(overrides?: Partial<ChildDetailData>): ChildDetailData {
  return {
    kindlerId: 'k1',
    displayName: 'Aria',
    ageTier: 1,
    avatarId: 'avatar-rabbit',
    sparkState: { level: 0.5, trend: 'growing', streakDays: 3 },
    worldsMap: [],
    recentSessions: [],
    subjectBreakdown: [],
    guidesMet: [],
    ...overrides,
  };
}

function makeProgressData(overrides?: Partial<ProgressReportData>): ProgressReportData {
  return {
    kindlerId: 'k1',
    displayName: 'Aria',
    sessionsCount: 10,
    totalMinutes: 150,
    entriesCompleted: 25,
    worldsRestored: 3,
    sparkChange: 0.15,
    topSubjects: ['biology', 'math'],
    curriculumStandardsMet: ['CCSS.MATH.K-1'],
    teacherReadySummary: 'Aria made strong progress this week.',
    ...overrides,
  };
}

function makeSession(startedAt: number): SessionSummaryPublic {
  return {
    sessionId: `sess-${startedAt}`,
    startedAt,
    durationMinutes: 20,
    worldsVisited: ['cloud-kingdom'],
    entriesCompleted: 3,
    sparkDelta: 0.04,
    summary: null,
  };
}

function makeWorldEntry(worldId: string, restored = false, visited = true): WorldMapEntry {
  return { worldId, worldName: worldId, realm: 'discovery', restored, visited };
}

/**
 * Build a fully-wired mock queries object. Individual test functions
 * override only the methods they care about.
 */
function makeQueries(overrides?: Partial<DashboardQueries>): DashboardQueries {
  return {
    getParentSubscription: vi.fn().mockResolvedValue({ status: 'active' }),
    getChildrenForParent: vi.fn().mockResolvedValue([makeChildSummary()]),
    getChildDetail: vi.fn().mockResolvedValue(makeDetailData()),
    getSessionHistory: vi.fn().mockResolvedValue({ sessions: [], total: 0 }),
    getWorldsMap: vi.fn().mockResolvedValue([]),
    getProgressReport: vi.fn().mockResolvedValue(makeProgressData()),
    updateTimeControls: vi.fn().mockResolvedValue(true),
    createChild: vi.fn().mockResolvedValue(true),
    deleteChild: vi.fn().mockResolvedValue(true),
    isChildOwnedByParent: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makeEngine(queriesOverrides?: Partial<DashboardQueries>) {
  return createDashboardEngine(makeDeps(), makeQueries(queriesOverrides));
}

// ─── getOverview ──────────────────────────────────────────────────

describe('getOverview', () => {
  it('returns ok with children when parent exists', async () => {
    const engine = makeEngine();
    const res = await engine.getOverview('parent-1');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.parentId).toBe('parent-1');
    expect(res.data.children.length).toBe(1);
  });

  it('returns NOT_FOUND when parent subscription is null', async () => {
    const engine = makeEngine({
      getParentSubscription: vi.fn().mockResolvedValue(null),
    });
    const res = await engine.getOverview('unknown-parent');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe('NOT_FOUND');
  });

  it('surfaces subscription status', async () => {
    const engine = makeEngine({
      getParentSubscription: vi.fn().mockResolvedValue({ status: 'cancelled' }),
    });
    const res = await engine.getOverview('parent-1');
    if (!res.ok) return;
    expect(res.data.subscriptionStatus).toBe('cancelled');
  });
});

// ─── getChildDetail ───────────────────────────────────────────────

describe('getChildDetail', () => {
  it('returns ok with child data when ownership confirmed', async () => {
    const engine = makeEngine();
    const res = await engine.getChildDetail('parent-1', 'k1');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.kindlerId).toBe('k1');
  });

  it('returns FORBIDDEN when child not owned by parent', async () => {
    const engine = makeEngine({
      isChildOwnedByParent: vi.fn().mockResolvedValue(false),
    });
    const res = await engine.getChildDetail('bad-parent', 'k1');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe('FORBIDDEN');
  });

  it('returns NOT_FOUND when child detail query returns null', async () => {
    const engine = makeEngine({
      getChildDetail: vi.fn().mockResolvedValue(null),
    });
    const res = await engine.getChildDetail('parent-1', 'k1');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe('NOT_FOUND');
  });
});

// ─── getSessionHistory ────────────────────────────────────────────

describe('getSessionHistory', () => {
  it('returns sessions and total', async () => {
    const sessions = [makeSession(1000), makeSession(2000)];
    const engine = makeEngine({
      getSessionHistory: vi.fn().mockResolvedValue({ sessions, total: 2 }),
    });
    const res = await engine.getSessionHistory('parent-1', {
      kindlerId: 'k1',
      pageSize: 10,
      cursor: null,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.total).toBe(2);
    expect(res.data.sessions.length).toBe(2);
  });

  it('sets nextCursor when results equal pageSize', async () => {
    const sessions = [makeSession(1000), makeSession(2000)];
    const engine = makeEngine({
      getSessionHistory: vi.fn().mockResolvedValue({ sessions, total: 5 }),
    });
    const res = await engine.getSessionHistory('parent-1', {
      kindlerId: 'k1',
      pageSize: 2,
      cursor: null,
    });
    if (!res.ok) return;
    expect(res.data.nextCursor).toBe(String(2000));
  });

  it('sets nextCursor to null when results are fewer than pageSize', async () => {
    const sessions = [makeSession(1000)];
    const engine = makeEngine({
      getSessionHistory: vi.fn().mockResolvedValue({ sessions, total: 1 }),
    });
    const res = await engine.getSessionHistory('parent-1', {
      kindlerId: 'k1',
      pageSize: 10,
      cursor: null,
    });
    if (!res.ok) return;
    expect(res.data.nextCursor).toBeNull();
  });

  it('clamps pageSize to 50', async () => {
    const mockQuery = vi.fn().mockResolvedValue({ sessions: [], total: 0 });
    const engine = makeEngine({ getSessionHistory: mockQuery });
    await engine.getSessionHistory('parent-1', {
      kindlerId: 'k1',
      pageSize: 200,
      cursor: null,
    });
    const [, pageSize] = mockQuery.mock.calls[0] as [string, number, string | null];
    expect(pageSize).toBe(50);
  });

  it('returns FORBIDDEN when child not owned by parent', async () => {
    const engine = makeEngine({
      isChildOwnedByParent: vi.fn().mockResolvedValue(false),
    });
    const res = await engine.getSessionHistory('bad-parent', {
      kindlerId: 'k1',
      pageSize: 10,
      cursor: null,
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe('FORBIDDEN');
  });
});

// ─── getWorldsMap ─────────────────────────────────────────────────

describe('getWorldsMap', () => {
  it('returns world list with aggregated counts', async () => {
    const worlds: WorldMapEntry[] = [
      makeWorldEntry('cloud-kingdom', true),
      makeWorldEntry('savanna-workshop', false),
      makeWorldEntry('coral-library', false, false),
    ];
    const engine = makeEngine({ getWorldsMap: vi.fn().mockResolvedValue(worlds) });
    const res = await engine.getWorldsMap('parent-1', 'k1');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.totalRestored).toBe(1);
    expect(res.data.totalVisited).toBe(2);
    expect(res.data.worlds.length).toBe(3);
  });

  it('returns FORBIDDEN when child not owned by parent', async () => {
    const engine = makeEngine({
      isChildOwnedByParent: vi.fn().mockResolvedValue(false),
    });
    const res = await engine.getWorldsMap('bad-parent', 'k1');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe('FORBIDDEN');
  });
});

// ─── getProgressReport ────────────────────────────────────────────

describe('getProgressReport', () => {
  it('returns report for valid time range', async () => {
    const engine = makeEngine();
    const res = await engine.getProgressReport('parent-1', 'k1', 1000, 999_999);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.sessionsCount).toBe(10);
    expect(res.data.period.from).toBe(1000);
    expect(res.data.period.to).toBe(999_999);
  });

  it('returns VALIDATION_ERROR when fromEpoch >= toEpoch', async () => {
    const engine = makeEngine();
    const res = await engine.getProgressReport('parent-1', 'k1', 5000, 5000);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe('VALIDATION_ERROR');
  });

  it('returns NOT_FOUND when query returns null', async () => {
    const engine = makeEngine({
      getProgressReport: vi.fn().mockResolvedValue(null),
    });
    const res = await engine.getProgressReport('parent-1', 'k1', 1000, 2000);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe('NOT_FOUND');
  });

  it('includes teacherReadySummary in response', async () => {
    const engine = makeEngine();
    const res = await engine.getProgressReport('parent-1', 'k1', 1000, 999_999);
    if (!res.ok) return;
    expect(res.data.teacherReadySummary).toContain('Aria');
  });
});

// ─── updateTimeControls ───────────────────────────────────────────

describe('updateTimeControls', () => {
  it('returns updated controls on success', async () => {
    const engine = makeEngine();
    const res = await engine.updateTimeControls('parent-1', 'k1', {
      maxDailyMinutes: 30,
      bedtimeCutoff: '20:00',
      notificationsEnabled: true,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.updatedControls.maxDailyMinutes).toBe(30);
    expect(res.data.updatedAt).toBe(FIXED_NOW);
  });

  it('returns VALIDATION_ERROR for invalid bedtime format', async () => {
    const engine = makeEngine();
    const res = await engine.updateTimeControls('parent-1', 'k1', {
      maxDailyMinutes: 30,
      bedtimeCutoff: 'not-a-time',
      notificationsEnabled: true,
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe('VALIDATION_ERROR');
  });

  it('returns FORBIDDEN when child not owned by parent', async () => {
    const engine = makeEngine({
      isChildOwnedByParent: vi.fn().mockResolvedValue(false),
    });
    const res = await engine.updateTimeControls('bad-parent', 'k1', {
      maxDailyMinutes: 30,
      bedtimeCutoff: null,
      notificationsEnabled: false,
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe('FORBIDDEN');
  });

  it('returns NOT_FOUND when updateTimeControls query returns false', async () => {
    const engine = makeEngine({
      updateTimeControls: vi.fn().mockResolvedValue(false),
    });
    const res = await engine.updateTimeControls('parent-1', 'k1', {
      maxDailyMinutes: 30,
      bedtimeCutoff: null,
      notificationsEnabled: false,
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe('NOT_FOUND');
  });
});

// ─── addChild ─────────────────────────────────────────────────────

describe('addChild', () => {
  it('creates a child with generated kindlerId', async () => {
    const engine = makeEngine();
    const res = await engine.addChild('parent-1', {
      displayName: 'Zara',
      ageTier: 2,
      avatarId: 'avatar-fox',
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.kindlerId).toBeTruthy();
    expect(res.data.displayName).toBe('Zara');
    expect(res.data.ageTier).toBe(2);
    expect(res.data.createdAt).toBe(FIXED_NOW);
  });

  it('trims displayName whitespace', async () => {
    const engine = makeEngine();
    const res = await engine.addChild('parent-1', {
      displayName: '  Leo  ',
      ageTier: 1,
      avatarId: 'avatar-owl',
    });
    if (!res.ok) return;
    expect(res.data.displayName).toBe('Leo');
  });

  it('returns VALIDATION_ERROR for empty display name', async () => {
    const engine = makeEngine();
    const res = await engine.addChild('parent-1', {
      displayName: '',
      ageTier: 1,
      avatarId: 'avatar-owl',
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe('VALIDATION_ERROR');
  });

  it('returns INTERNAL_ERROR when createChild query fails', async () => {
    const engine = makeEngine({ createChild: vi.fn().mockResolvedValue(false) });
    const res = await engine.addChild('parent-1', {
      displayName: 'Kai',
      ageTier: 3,
      avatarId: 'avatar-bear',
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe('INTERNAL_ERROR');
  });
});

// ─── removeChild ──────────────────────────────────────────────────

describe('removeChild', () => {
  it('returns deletion confirmation on success', async () => {
    const engine = makeEngine();
    const res = await engine.removeChild('parent-1', 'k1');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.kindlerId).toBe('k1');
    expect(res.data.dataDeletedPermanently).toBe(true);
    expect(res.data.deletedAt).toBe(FIXED_NOW);
  });

  it('returns FORBIDDEN when child not owned by parent', async () => {
    const engine = makeEngine({
      isChildOwnedByParent: vi.fn().mockResolvedValue(false),
    });
    const res = await engine.removeChild('bad-parent', 'k1');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe('FORBIDDEN');
  });

  it('returns NOT_FOUND when deleteChild query returns false', async () => {
    const engine = makeEngine({ deleteChild: vi.fn().mockResolvedValue(false) });
    const res = await engine.removeChild('parent-1', 'missing-kid');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.code).toBe('NOT_FOUND');
  });
});
