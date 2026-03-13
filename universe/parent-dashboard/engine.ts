/**
 * Parent Dashboard — Engine
 *
 * Handler logic for the parent dashboard API.
 * All data is fetched through injected query functions (port adapters)
 * so this engine has zero infrastructure dependencies.
 *
 * COPPA INVARIANTS:
 * - No child PII beyond display name
 * - AI conversation transcripts never surfaced (ephemeral)
 * - All timestamps are UTC epoch ms
 * - Rate limiting enforced at the gateway (selvage), not here
 */

import type {
  AddChildRequest,
  AddChildResponse,
  ApiErrorCode,
  ApiResponse,
  ChildDetailResponse,
  ChildSummary,
  DashboardOverviewResponse,
  ProgressReportResponse,
  RemoveChildResponse,
  SessionHistoryRequest,
  SessionHistoryResponse,
  SessionSummaryPublic,
  SparkStatePublic,
  SubjectProgress,
  TimeControlsUpdateRequest,
  TimeControlsUpdateResponse,
  WorldMapEntry,
  WorldProgressSummary,
  WorldsMapResponse,
} from './api.js';
import { validateAddChildRequest, validateTimeControlsUpdate } from './api.js';

// ─── Error Helpers ─────────────────────────────────────────────────

function fail(code: ApiErrorCode, message: string): ApiResponse<never> {
  return { ok: false, code, message };
}

function succeed<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}

// ─── Dependencies (Ports) ──────────────────────────────────────────

export interface DashboardDeps {
  readonly generateId: () => string;
  readonly now: () => number;
  readonly log: (
    level: 'info' | 'warn' | 'error',
    msg: string,
    meta?: Record<string, unknown>,
  ) => void;
}

/**
 * Query adapters — each function maps to a single data-access concern.
 * Implementations live in the persistence layer (archive / Supabase).
 */
export interface DashboardQueries {
  readonly getParentSubscription: (
    parentId: string,
  ) => Promise<{ status: string } | null>;

  readonly getChildrenForParent: (
    parentId: string,
  ) => Promise<readonly ChildSummary[]>;

  readonly getChildDetail: (
    parentId: string,
    kindlerId: string,
  ) => Promise<ChildDetailData | null>;

  readonly getSessionHistory: (
    kindlerId: string,
    pageSize: number,
    cursor: string | null,
  ) => Promise<{ sessions: readonly SessionSummaryPublic[]; total: number }>;

  readonly getWorldsMap: (
    kindlerId: string,
  ) => Promise<readonly WorldMapEntry[]>;

  readonly getProgressReport: (
    kindlerId: string,
    fromEpoch: number,
    toEpoch: number,
  ) => Promise<ProgressReportData | null>;

  readonly updateTimeControls: (
    parentId: string,
    kindlerId: string,
    controls: TimeControlsUpdateRequest,
  ) => Promise<boolean>;

  readonly createChild: (
    parentId: string,
    req: AddChildRequest,
    kindlerId: string,
    createdAt: number,
  ) => Promise<boolean>;

  readonly deleteChild: (
    parentId: string,
    kindlerId: string,
  ) => Promise<boolean>;

  readonly isChildOwnedByParent: (
    parentId: string,
    kindlerId: string,
  ) => Promise<boolean>;
}

// ─── Internal Data Shapes ──────────────────────────────────────────

export interface ChildDetailData {
  readonly kindlerId: string;
  readonly displayName: string;
  readonly ageTier: 1 | 2 | 3;
  readonly avatarId: string;
  readonly sparkState: SparkStatePublic;
  readonly worldsMap: readonly WorldProgressSummary[];
  readonly recentSessions: readonly SessionSummaryPublic[];
  readonly subjectBreakdown: readonly SubjectProgress[];
  readonly guidesMet: readonly string[];
}

export interface ProgressReportData {
  readonly kindlerId: string;
  readonly displayName: string;
  readonly sessionsCount: number;
  readonly totalMinutes: number;
  readonly entriesCompleted: number;
  readonly worldsRestored: number;
  readonly sparkChange: number;
  readonly topSubjects: readonly string[];
  readonly curriculumStandardsMet: readonly string[];
  readonly teacherReadySummary: string;
}

// ─── Public Interface ──────────────────────────────────────────────

export interface DashboardEngine {
  getOverview(parentId: string): Promise<ApiResponse<DashboardOverviewResponse>>;
  getChildDetail(
    parentId: string,
    kindlerId: string,
  ): Promise<ApiResponse<ChildDetailResponse>>;
  getSessionHistory(
    parentId: string,
    req: SessionHistoryRequest,
  ): Promise<ApiResponse<SessionHistoryResponse>>;
  getWorldsMap(
    parentId: string,
    kindlerId: string,
  ): Promise<ApiResponse<WorldsMapResponse>>;
  getProgressReport(
    parentId: string,
    kindlerId: string,
    fromEpoch: number,
    toEpoch: number,
  ): Promise<ApiResponse<ProgressReportResponse>>;
  updateTimeControls(
    parentId: string,
    kindlerId: string,
    req: TimeControlsUpdateRequest,
  ): Promise<ApiResponse<TimeControlsUpdateResponse>>;
  addChild(
    parentId: string,
    req: AddChildRequest,
  ): Promise<ApiResponse<AddChildResponse>>;
  removeChild(
    parentId: string,
    kindlerId: string,
  ): Promise<ApiResponse<RemoveChildResponse>>;
}

// ─── Ownership Guard ───────────────────────────────────────────────

async function assertOwnership(
  queries: DashboardQueries,
  parentId: string,
  kindlerId: string,
): Promise<ApiResponse<never> | null> {
  const owned = await queries.isChildOwnedByParent(parentId, kindlerId);
  if (!owned) return fail('FORBIDDEN', 'Child does not belong to this parent');
  return null;
}

// ─── Handler Implementations ───────────────────────────────────────

async function handleGetOverview(
  deps: DashboardDeps,
  queries: DashboardQueries,
  parentId: string,
): Promise<ApiResponse<DashboardOverviewResponse>> {
  const sub = await queries.getParentSubscription(parentId);
  if (sub === null) return fail('NOT_FOUND', 'Parent account not found');

  const children = await queries.getChildrenForParent(parentId);
  deps.log('info', 'dashboard_overview', {
    parentId,
    childCount: children.length,
  });

  return succeed({
    parentId,
    subscriptionStatus: sub.status,
    children,
  });
}

async function handleGetChildDetail(
  deps: DashboardDeps,
  queries: DashboardQueries,
  parentId: string,
  kindlerId: string,
): Promise<ApiResponse<ChildDetailResponse>> {
  const denied = await assertOwnership(queries, parentId, kindlerId);
  if (denied !== null) return denied;

  const detail = await queries.getChildDetail(parentId, kindlerId);
  if (detail === null) return fail('NOT_FOUND', 'Child profile not found');

  deps.log('info', 'dashboard_child_detail', { parentId, kindlerId });
  return succeed(detail);
}

async function handleGetSessionHistory(
  deps: DashboardDeps,
  queries: DashboardQueries,
  parentId: string,
  req: SessionHistoryRequest,
): Promise<ApiResponse<SessionHistoryResponse>> {
  const denied = await assertOwnership(queries, parentId, req.kindlerId);
  if (denied !== null) return denied;

  const pageSize = Math.min(Math.max(req.pageSize, 1), 50);
  const result = await queries.getSessionHistory(
    req.kindlerId,
    pageSize,
    req.cursor,
  );

  const nextCursor =
    result.sessions.length === pageSize
      ? String(result.sessions[result.sessions.length - 1].startedAt)
      : null;

  deps.log('info', 'dashboard_session_history', {
    parentId,
    kindlerId: req.kindlerId,
    returned: result.sessions.length,
    total: result.total,
  });

  return succeed({
    sessions: result.sessions,
    nextCursor,
    total: result.total,
  });
}

async function handleGetWorldsMap(
  deps: DashboardDeps,
  queries: DashboardQueries,
  parentId: string,
  kindlerId: string,
): Promise<ApiResponse<WorldsMapResponse>> {
  const denied = await assertOwnership(queries, parentId, kindlerId);
  if (denied !== null) return denied;

  const worlds = await queries.getWorldsMap(kindlerId);

  deps.log('info', 'dashboard_worlds_map', {
    parentId,
    kindlerId,
    worldCount: worlds.length,
  });

  return succeed({
    worlds,
    totalRestored: worlds.filter((w) => w.restored).length,
    totalVisited: worlds.filter((w) => w.visited).length,
  });
}

function toProgressReportResponse(
  report: ProgressReportData,
  fromEpoch: number,
  toEpoch: number,
): ProgressReportResponse {
  return {
    kindlerId: report.kindlerId,
    displayName: report.displayName,
    period: { from: fromEpoch, to: toEpoch },
    sessionsCount: report.sessionsCount,
    totalMinutes: report.totalMinutes,
    entriesCompleted: report.entriesCompleted,
    worldsRestored: report.worldsRestored,
    sparkChange: report.sparkChange,
    topSubjects: report.topSubjects,
    curriculumStandardsMet: report.curriculumStandardsMet,
    teacherReadySummary: report.teacherReadySummary,
  };
}

async function handleGetProgressReport(
  deps: DashboardDeps,
  queries: DashboardQueries,
  parentId: string,
  kindlerId: string,
  fromEpoch: number,
  toEpoch: number,
): Promise<ApiResponse<ProgressReportResponse>> {
  const denied = await assertOwnership(queries, parentId, kindlerId);
  if (denied !== null) return denied;

  if (fromEpoch >= toEpoch) {
    return fail('VALIDATION_ERROR', 'fromEpoch must be before toEpoch');
  }

  const report = await queries.getProgressReport(kindlerId, fromEpoch, toEpoch);
  if (report === null) {
    return fail('NOT_FOUND', 'No data available for this period');
  }

  deps.log('info', 'dashboard_progress_report', {
    parentId,
    kindlerId,
    periodDays: Math.round((toEpoch - fromEpoch) / 86_400_000),
  });

  return succeed(toProgressReportResponse(report, fromEpoch, toEpoch));
}

async function handleUpdateTimeControls(
  deps: DashboardDeps,
  queries: DashboardQueries,
  parentId: string,
  kindlerId: string,
  req: TimeControlsUpdateRequest,
): Promise<ApiResponse<TimeControlsUpdateResponse>> {
  const denied = await assertOwnership(queries, parentId, kindlerId);
  if (denied !== null) return denied;

  const validationError = validateTimeControlsUpdate(req);
  if (validationError !== null) {
    return fail('VALIDATION_ERROR', validationError);
  }

  const updated = await queries.updateTimeControls(parentId, kindlerId, req);
  if (!updated) return fail('NOT_FOUND', 'Child profile not found');

  const now = deps.now();
  deps.log('info', 'dashboard_time_controls_updated', {
    parentId,
    kindlerId,
    maxDailyMinutes: req.maxDailyMinutes,
    bedtimeCutoff: req.bedtimeCutoff,
  });

  return succeed({
    kindlerId,
    updatedControls: req,
    updatedAt: now,
  });
}

async function handleAddChild(
  deps: DashboardDeps,
  queries: DashboardQueries,
  parentId: string,
  req: AddChildRequest,
): Promise<ApiResponse<AddChildResponse>> {
  const validationError = validateAddChildRequest(req);
  if (validationError !== null) {
    return fail('VALIDATION_ERROR', validationError);
  }

  const kindlerId = deps.generateId();
  const createdAt = deps.now();
  const created = await queries.createChild(parentId, req, kindlerId, createdAt);
  if (!created) return fail('INTERNAL_ERROR', 'Failed to create child profile');

  deps.log('info', 'dashboard_child_added', {
    parentId,
    kindlerId,
    ageTier: req.ageTier,
  });

  return succeed({
    kindlerId,
    displayName: req.displayName.trim(),
    ageTier: req.ageTier,
    avatarId: req.avatarId,
    createdAt,
  });
}

async function handleRemoveChild(
  deps: DashboardDeps,
  queries: DashboardQueries,
  parentId: string,
  kindlerId: string,
): Promise<ApiResponse<RemoveChildResponse>> {
  const denied = await assertOwnership(queries, parentId, kindlerId);
  if (denied !== null) return denied;

  const deleted = await queries.deleteChild(parentId, kindlerId);
  if (!deleted) return fail('NOT_FOUND', 'Child profile not found');

  const deletedAt = deps.now();
  deps.log('warn', 'dashboard_child_removed', {
    parentId,
    kindlerId,
    deletedAt,
    permanent: true,
  });

  return succeed({
    kindlerId,
    deletedAt,
    dataDeletedPermanently: true,
  });
}

// ─── Factory ───────────────────────────────────────────────────────

export function createDashboardEngine(
  deps: DashboardDeps,
  queries: DashboardQueries,
): DashboardEngine {
  return {
    getOverview: (parentId) =>
      handleGetOverview(deps, queries, parentId),
    getChildDetail: (parentId, kindlerId) =>
      handleGetChildDetail(deps, queries, parentId, kindlerId),
    getSessionHistory: (parentId, req) =>
      handleGetSessionHistory(deps, queries, parentId, req),
    getWorldsMap: (parentId, kindlerId) =>
      handleGetWorldsMap(deps, queries, parentId, kindlerId),
    getProgressReport: (parentId, kindlerId, fromEpoch, toEpoch) =>
      handleGetProgressReport(deps, queries, parentId, kindlerId, fromEpoch, toEpoch),
    updateTimeControls: (parentId, kindlerId, req) =>
      handleUpdateTimeControls(deps, queries, parentId, kindlerId, req),
    addChild: (parentId, req) =>
      handleAddChild(deps, queries, parentId, req),
    removeChild: (parentId, kindlerId) =>
      handleRemoveChild(deps, queries, parentId, kindlerId),
  };
}
