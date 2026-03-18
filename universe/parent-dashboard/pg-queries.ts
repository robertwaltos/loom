/**
 * Parent Dashboard — PostgreSQL Query Adapters
 *
 * Implements DashboardQueries using a pg Pool + world registry data.
 * All queries are read-only except updateTimeControls, createChild, deleteChild.
 *
 * COPPA INVARIANTS:
 * - No AI conversation transcripts are returned here
 * - Session summaries are drawn from session_reports (curated) only
 * - No child email / real name ever stored or returned
 */

import type { Pool } from 'pg';
import type {
  AddChildRequest,
  ChildSummary,
  SessionSummaryPublic,
  SubjectProgress,
  WorldMapEntry,
  WorldProgressSummary,
  SparkStatePublic,
  TimeControlsUpdateRequest,
} from './api.js';
import type {
  DashboardQueries,
  ChildDetailData,
  ProgressReportData,
} from './engine.js';
import type { WorldDefinition, WorldLuminance } from '../worlds/types.js';
import type {
  KindlerProfileRow,
  KindlerSessionRow,
  KindlerSparkLogRow,
  KindlerProgressRow,
  SessionReportRow,
  ParentAccountRow,
} from '../db/row-types.js';

// ─── Helpers ────────────────────────────────────────────────────────

/** Convert guide ID (kebab-case) to a display name. */
function guideIdToName(guideId: string): string {
  return guideId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Derive spark trend from an ordered list of recent spark log entries (newest first). */
function deriveTrend(
  entries: readonly KindlerSparkLogRow[],
): 'growing' | 'stable' | 'dimming' {
  const recent = entries.slice(0, 5);
  if (recent.length < 2) return 'stable';
  const netDelta = recent.reduce((sum, e) => sum + e.delta, 0);
  if (netDelta > 0.05) return 'growing';
  if (netDelta < -0.05) return 'dimming';
  return 'stable';
}

/**
 * Calculate streak days: how many consecutive calendar days (UTC) up to today
 * have at least one session started.
 */
function calcStreak(sessionStartsMs: readonly number[]): number {
  if (sessionStartsMs.length === 0) return 0;
  const daySet = new Set(
    sessionStartsMs.map((ms) => {
      const d = new Date(ms);
      return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    }),
  );
  const today = new Date();
  let streak = 0;
  for (let offset = 0; offset < 365; offset++) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - offset);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    if (daySet.has(key)) {
      streak++;
    } else if (offset > 0) {
      break; // first miss after today breaks the streak
    }
  }
  return streak;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createPgDashboardQueries(
  pool: Pool,
  allWorlds: readonly WorldDefinition[],
  getLuminance: (worldId: string) => WorldLuminance | undefined,
  getWorldEntriesTotal: (worldId: string) => number,
): DashboardQueries {
  const worldById = new Map(allWorlds.map((w) => [w.id, w]));

  // ─── getParentSubscription ───────────────────────────────────

  async function getParentSubscription(parentId: string) {
    const result = await pool.query<Pick<ParentAccountRow, 'subscription_status'>>(
      'SELECT subscription_status FROM parent_accounts WHERE id = $1',
      [parentId],
    );
    const row = result.rows[0];
    return row !== undefined ? { status: row.subscription_status } : null;
  }

  // ─── getChildrenForParent ────────────────────────────────────

  async function getChildrenForParent(parentId: string): Promise<readonly ChildSummary[]> {
    const profilesResult = await pool.query<KindlerProfileRow>(
      'SELECT * FROM kindler_profiles WHERE parent_account_id = $1',
      [parentId],
    );

    if (profilesResult.rows.length === 0) return [];

    const summaries: ChildSummary[] = [];

    for (const p of profilesResult.rows) {
      const [lastSessionResult, sparkLogResult, sessionsResult] = await Promise.all([
        pool.query<{ started_at: number }>(
          'SELECT started_at FROM kindler_sessions WHERE kindler_id = $1 ORDER BY started_at DESC LIMIT 1',
          [p.id],
        ),
        pool.query<KindlerSparkLogRow>(
          'SELECT * FROM kindler_spark_log WHERE kindler_id = $1 ORDER BY timestamp DESC LIMIT 10',
          [p.id],
        ),
        pool.query<Pick<KindlerSessionRow, 'started_at'>>(
          'SELECT started_at FROM kindler_sessions WHERE kindler_id = $1',
          [p.id],
        ),
      ]);

      const trend = deriveTrend(sparkLogResult.rows);
      const lastSessionAt = lastSessionResult.rows[0]?.started_at ?? null;
      const streakDays = calcStreak(sessionsResult.rows.map((r) => r.started_at));

      summaries.push({
        kindlerId: p.id,
        displayName: p.display_name,
        ageTier: p.age_tier,
        avatarId: p.avatar_id,
        sparkLevel: p.spark_level,
        sparkTrend: trend,
        currentChapter: p.current_chapter,
        worldsRestored: p.worlds_restored.length,
        lastSessionAt,
        streakDays,
      });
    }

    return summaries;
  }

  // ─── getChildDetail ──────────────────────────────────────────

  async function getChildDetail(
    parentId: string,
    kindlerId: string,
  ): Promise<ChildDetailData | null> {
    const profileResult = await pool.query<KindlerProfileRow>(
      'SELECT * FROM kindler_profiles WHERE id = $1 AND parent_account_id = $2',
      [kindlerId, parentId],
    );
    const profile = profileResult.rows[0];
    if (profile === undefined) return null;

    const [recentSessionsResult, sparkLogResult, progressResult] = await Promise.all([
      pool.query<KindlerSessionRow>(
        `SELECT ks.*, sr.summary
           FROM kindler_sessions ks
           LEFT JOIN session_reports sr ON sr.session_id = ks.id
          WHERE ks.kindler_id = $1
          ORDER BY ks.started_at DESC
          LIMIT 5`,
        [kindlerId],
      ),
      pool.query<KindlerSparkLogRow>(
        'SELECT * FROM kindler_spark_log WHERE kindler_id = $1 ORDER BY timestamp DESC LIMIT 10',
        [kindlerId],
      ),
      pool.query<KindlerProgressRow>(
        'SELECT * FROM kindler_progress WHERE kindler_id = $1',
        [kindlerId],
      ),
    ]);

    const trend = deriveTrend(sparkLogResult.rows);
    const sparkState: SparkStatePublic = {
      level: profile.spark_level,
      trend,
      streakDays: calcStreak(
        recentSessionsResult.rows.map((r) => r.started_at),
      ),
    };

    const recentSessions: readonly SessionSummaryPublic[] = recentSessionsResult.rows.map(
      (row) => {
        const durationMs = (row.ended_at ?? row.started_at + 60_000) - row.started_at;
        return {
          sessionId: row.id,
          startedAt: row.started_at,
          durationMinutes: Math.round(durationMs / 60_000),
          worldsVisited: row.worlds_visited,
          entriesCompleted: row.entries_completed.length,
          sparkDelta: row.spark_delta,
          summary: (row as unknown as { summary: string | null }).summary ?? null,
        };
      },
    );

    // Build worlds progress from kindler_progress + world definitions
    const completedByWorld = new Map<string, number>();
    for (const p of progressResult.rows) {
      // Each entry_id encodes the world — look it up from world.entryIds
      for (const world of allWorlds) {
        if (world.entryIds.includes(p.entry_id)) {
          completedByWorld.set(world.id, (completedByWorld.get(world.id) ?? 0) + 1);
          break;
        }
      }
    }

    const visitedSet = new Set(profile.worlds_visited);
    const worldsMap: readonly WorldProgressSummary[] = allWorlds
      .filter((w) => visitedSet.has(w.id))
      .map((w) => {
        const lum = getLuminance(w.id);
        return {
          worldId: w.id,
          worldName: w.name,
          realm: w.realm,
          luminance: lum?.luminance ?? 0.5,
          fadingStage: lum?.stage ?? 'dimming',
          entriesCompleted: completedByWorld.get(w.id) ?? 0,
          entriesTotal: getWorldEntriesTotal(w.id),
          lastVisitedAt: null,
        };
      });

    // Subject breakdown
    const subjectMap = new Map<string, { subject: string; realm: string; completed: number }>();
    for (const p of progressResult.rows) {
      for (const world of allWorlds) {
        if (world.entryIds.includes(p.entry_id)) {
          const key = world.subject;
          const existing = subjectMap.get(key);
          if (existing !== undefined) {
            subjectMap.set(key, { ...existing, completed: existing.completed + 1 });
          } else {
            subjectMap.set(key, { subject: world.subject, realm: world.realm, completed: 1 });
          }
          break;
        }
      }
    }
    const subjectBreakdown: readonly SubjectProgress[] = [...subjectMap.values()].map((s) => ({
      subject: s.subject,
      realm: s.realm,
      entriesCompleted: s.completed,
      entriesTotal: allWorlds
        .filter((w) => w.subject === s.subject)
        .reduce((sum, w) => sum + getWorldEntriesTotal(w.id), 0),
      curriculumStandardsMet: [],
    }));

    // Guides met: all unique guides from recent sessions
    const guidesMet = [
      ...new Set(recentSessionsResult.rows.flatMap((r) => r.guides_interacted)),
    ];

    return {
      kindlerId: profile.id,
      displayName: profile.display_name,
      ageTier: profile.age_tier,
      avatarId: profile.avatar_id,
      sparkState,
      worldsMap,
      recentSessions,
      subjectBreakdown,
      guidesMet,
    };
  }

  // ─── getSessionHistory ───────────────────────────────────────

  async function getSessionHistory(
    kindlerId: string,
    pageSize: number,
    cursor: string | null,
  ): Promise<{ sessions: readonly SessionSummaryPublic[]; total: number }> {
    const cursorMs = cursor !== null ? new Date(cursor).getTime() : null;

    const [sessionsResult, countResult] = await Promise.all([
      pool.query<KindlerSessionRow & { summary: string | null }>(
        `SELECT ks.*, sr.summary
           FROM kindler_sessions ks
           LEFT JOIN session_reports sr ON sr.session_id = ks.id
          WHERE ks.kindler_id = $1
            ${cursorMs !== null ? 'AND ks.started_at < $3' : ''}
          ORDER BY ks.started_at DESC
          LIMIT $2`,
        cursorMs !== null ? [kindlerId, pageSize, cursorMs] : [kindlerId, pageSize],
      ),
      pool.query<{ count: string }>(
        'SELECT COUNT(*) AS count FROM kindler_sessions WHERE kindler_id = $1',
        [kindlerId],
      ),
    ]);

    const sessions: readonly SessionSummaryPublic[] = sessionsResult.rows.map((row) => {
      const durationMs = (row.ended_at ?? row.started_at + 60_000) - row.started_at;
      return {
        sessionId: row.id,
        startedAt: row.started_at,
        durationMinutes: Math.round(durationMs / 60_000),
        worldsVisited: row.worlds_visited,
        entriesCompleted: row.entries_completed.length,
        sparkDelta: row.spark_delta,
        summary: row.summary,
      };
    });

    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);
    return { sessions, total };
  }

  // ─── getWorldsMap ────────────────────────────────────────────

  async function getWorldsMap(kindlerId: string): Promise<readonly WorldMapEntry[]> {
    const [profileResult, progressResult] = await Promise.all([
      pool.query<Pick<KindlerProfileRow, 'worlds_visited' | 'worlds_restored'>>(
        'SELECT worlds_visited, worlds_restored FROM kindler_profiles WHERE id = $1',
        [kindlerId],
      ),
      pool.query<KindlerProgressRow>(
        'SELECT * FROM kindler_progress WHERE kindler_id = $1',
        [kindlerId],
      ),
    ]);

    const profile = profileResult.rows[0];
    if (profile === undefined) return [];

    const visitedSet = new Set(profile.worlds_visited);
    const restoredSet = new Set(profile.worlds_restored);

    const completedByWorld = new Map<string, number>();
    for (const p of progressResult.rows) {
      for (const world of allWorlds) {
        if (world.entryIds.includes(p.entry_id)) {
          completedByWorld.set(world.id, (completedByWorld.get(world.id) ?? 0) + 1);
          break;
        }
      }
    }

    return allWorlds.map((w) => {
      const lum = getLuminance(w.id);
      return {
        worldId: w.id,
        worldName: w.name,
        realm: w.realm,
        guideId: w.guideId,
        guideName: guideIdToName(w.guideId),
        subject: w.subject,
        luminance: lum?.luminance ?? 0.5,
        fadingStage: lum?.stage ?? 'dimming',
        visited: visitedSet.has(w.id),
        restored: restoredSet.has(w.id),
        entriesCompleted: completedByWorld.get(w.id) ?? 0,
        entriesTotal: getWorldEntriesTotal(w.id),
      };
    });
  }

  // ─── getProgressReport ───────────────────────────────────────

  async function getProgressReport(
    kindlerId: string,
    fromEpoch: number,
    toEpoch: number,
  ): Promise<ProgressReportData | null> {
    const profileResult = await pool.query<KindlerProfileRow>(
      'SELECT * FROM kindler_profiles WHERE id = $1',
      [kindlerId],
    );
    const profile = profileResult.rows[0];
    if (profile === undefined) return null;

    const [sessionsResult, progressResult, sparkLogResult] = await Promise.all([
      pool.query<KindlerSessionRow>(
        `SELECT * FROM kindler_sessions
          WHERE kindler_id = $1 AND started_at >= $2 AND started_at <= $3`,
        [kindlerId, fromEpoch, toEpoch],
      ),
      pool.query<KindlerProgressRow>(
        `SELECT * FROM kindler_progress
          WHERE kindler_id = $1 AND completed_at >= $2 AND completed_at <= $3`,
        [kindlerId, fromEpoch, toEpoch],
      ),
      pool.query<KindlerSparkLogRow>(
        `SELECT * FROM kindler_spark_log
          WHERE kindler_id = $1 AND timestamp >= $2 AND timestamp <= $3`,
        [kindlerId, fromEpoch, toEpoch],
      ),
    ]);

    const sessions = sessionsResult.rows;
    const sessionsCount = sessions.length;
    const totalMinutes = Math.round(
      sessions.reduce((sum, s) => {
        const durationMs = (s.ended_at ?? s.started_at + 60_000) - s.started_at;
        return sum + durationMs;
      }, 0) / 60_000,
    );
    const entriesCompleted = progressResult.rows.length;
    const sparkChange = sparkLogResult.rows.reduce((sum, e) => sum + e.delta, 0);

    // Count worlds restored in period (sessions that have worlds in worlds_restored)
    const worldsRestoredInPeriod = new Set(
      sessions.flatMap((s) => s.worlds_visited.filter((w) => profile.worlds_restored.includes(w))),
    ).size;

    // Top subjects from completed entries
    const subjectCounts = new Map<string, number>();
    for (const p of progressResult.rows) {
      for (const world of allWorlds) {
        if (world.entryIds.includes(p.entry_id)) {
          subjectCounts.set(world.subject, (subjectCounts.get(world.subject) ?? 0) + 1);
          break;
        }
      }
    }
    const topSubjects = [...subjectCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([s]) => s);

    // Curriculum standards met — query from entry_curriculum_map
    let curriculumStandardsMet: readonly string[] = [];
    if (progressResult.rows.length > 0) {
      const entryIds = progressResult.rows.map((p) => p.entry_id);
      const stdResult = await pool.query<{ standard_code: string }>(
        `SELECT DISTINCT standard_code FROM entry_curriculum_map
          WHERE entry_id = ANY($1)`,
        [entryIds],
      );
      curriculumStandardsMet = stdResult.rows.map((r) => r.standard_code);
    }

    const teacherReadySummary =
      sessionsCount === 0
        ? `${profile.display_name} did not have any recorded sessions during this period.`
        : `${profile.display_name} completed ${sessionsCount} learning session${sessionsCount === 1 ? '' : 's'} ` +
          `(${totalMinutes} minutes total) and finished ${entriesCompleted} entr${entriesCompleted === 1 ? 'y' : 'ies'}. ` +
          (topSubjects.length > 0
            ? `Top subjects explored: ${topSubjects.join(', ')}. `
            : '') +
          (curriculumStandardsMet.length > 0
            ? `Curriculum standards touched: ${curriculumStandardsMet.slice(0, 5).join(', ')}.`
            : '');

    return {
      kindlerId,
      displayName: profile.display_name,
      sessionsCount,
      totalMinutes,
      entriesCompleted,
      worldsRestored: worldsRestoredInPeriod,
      sparkChange: Math.round(sparkChange * 1000) / 1000,
      topSubjects,
      curriculumStandardsMet,
      teacherReadySummary,
    };
  }

  // ─── updateTimeControls ──────────────────────────────────────

  async function updateTimeControls(
    parentId: string,
    _kindlerId: string,
    controls: TimeControlsUpdateRequest,
  ): Promise<boolean> {
    const result = await pool.query(
      `UPDATE parent_accounts
          SET time_controls = $2
        WHERE id = $1`,
      [parentId, JSON.stringify(controls)],
    );
    return (result.rowCount ?? 0) > 0;
  }

  // ─── createChild ─────────────────────────────────────────────

  async function createChild(
    parentId: string,
    req: AddChildRequest,
    kindlerId: string,
    createdAt: number,
  ): Promise<boolean> {
    try {
      await pool.query(
        `INSERT INTO kindler_profiles
           (id, parent_account_id, display_name, age_tier, avatar_id,
            spark_level, current_chapter, worlds_visited, worlds_restored,
            guides_met_count, created_at)
         VALUES ($1, $2, $3, $4, $5, 0.0, 'first_light', '{}', '{}', 0, $6)`,
        [kindlerId, parentId, req.displayName, req.ageTier, req.avatarId, createdAt],
      );
      return true;
    } catch {
      return false;
    }
  }

  // ─── deleteChild ─────────────────────────────────────────────

  async function deleteChild(parentId: string, kindlerId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM kindler_profiles WHERE id = $1 AND parent_account_id = $2',
      [kindlerId, parentId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  // ─── isChildOwnedByParent ────────────────────────────────────

  async function isChildOwnedByParent(parentId: string, kindlerId: string): Promise<boolean> {
    const result = await pool.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM kindler_profiles WHERE id = $1 AND parent_account_id = $2',
      [kindlerId, parentId],
    );
    return parseInt(result.rows[0]?.count ?? '0', 10) > 0;
  }

  // ─── Public Interface ────────────────────────────────────────

  return {
    getParentSubscription,
    getChildrenForParent,
    getChildDetail,
    getSessionHistory,
    getWorldsMap,
    getProgressReport,
    updateTimeControls,
    createChild,
    deleteChild,
    isChildOwnedByParent,
  };
}
