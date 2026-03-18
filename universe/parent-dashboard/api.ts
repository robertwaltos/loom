/**
 * Parent Dashboard — API Request/Response Types and Route Definitions
 *
 * The parent dashboard is a server-side-rendered web app built on Supabase.
 * Parents authenticate via Supabase Auth; child data is fetched via
 * Row-Level Security (RLS) policies keyed to parent_account_id.
 *
 * COPPA CONSTRAINTS:
 * - No child PII in API responses (display name only, no full name)
 * - AI conversation transcripts are NOT available to parents (ephemeral by design)
 * - All times are in UTC; never infer child location from time
 * - Rate limiting on all endpoints: 60 req/min per parent session
 */

// ─── Shared Response Envelope ──────────────────────────────────────

// ─── Parent Account Domain Types ──────────────────────────────────

export type SubscriptionStatus = 'trial' | 'active' | 'cancelled' | 'expired';
export type ConsentMethod = 'credit_card_micro' | 'email_plus1' | 'phone_verification' | 'manual_review';

export interface ParentTimeControls {
  readonly maxDailyMinutes: number | null;
  readonly bedtimeCutoff: string | null; // "HH:MM" local
  readonly notificationsEnabled: boolean;
}

/** COPPA-compliant parent account record. No child PII ever stored here. */
export interface ParentAccount {
  readonly id: string;                      // opaque UUID from auth provider
  readonly consentVerified: boolean;
  readonly consentVerifiedAt: number | null; // epoch ms
  readonly consentMethod: ConsentMethod | null;
  readonly subscriptionStatus: SubscriptionStatus;
  readonly timeControls: ParentTimeControls;
  readonly createdAt: number;               // epoch ms
}

// ─── Shared Response Envelope ──────────────────────────────────────

export interface ApiSuccess<T> {
  readonly ok: true;
  readonly data: T;
}

export interface ApiError {
  readonly ok: false;
  readonly code: ApiErrorCode;
  readonly message: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

// ─── GET /dashboard — Parent Overview ─────────────────────────────

export interface DashboardOverviewResponse {
  readonly parentId: string;
  readonly subscriptionStatus: string;
  readonly children: readonly ChildSummary[];
}

export interface ChildSummary {
  readonly kindlerId: string;
  readonly displayName: string;
  readonly ageTier: 1 | 2 | 3;
  readonly avatarId: string;
  readonly sparkLevel: number;
  readonly sparkTrend: 'growing' | 'stable' | 'dimming';
  readonly currentChapter: string;
  readonly worldsRestored: number;
  readonly lastSessionAt: number | null;
  readonly streakDays: number;
}

// ─── GET /dashboard/child/:kindlerId — Child Detail ────────────────

export interface ChildDetailResponse {
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

/** Public-safe subset of SparkState — no timestamps that could infer location */
export interface SparkStatePublic {
  readonly level: number;
  readonly trend: 'growing' | 'stable' | 'dimming';
  readonly streakDays: number;
}

export interface WorldProgressSummary {
  readonly worldId: string;
  readonly worldName: string;
  readonly realm: string;
  readonly luminance: number;
  readonly fadingStage: string;
  readonly entriesCompleted: number;
  readonly entriesTotal: number;
  readonly lastVisitedAt: number | null;
}

export interface SessionSummaryPublic {
  readonly sessionId: string;
  readonly startedAt: number;
  readonly durationMinutes: number;
  readonly worldsVisited: readonly string[];
  readonly entriesCompleted: number;
  readonly sparkDelta: number;
  /** AI-generated summary — no raw conversation content */
  readonly summary: string | null;
}

export interface SubjectProgress {
  readonly subject: string;
  readonly realm: string;
  readonly entriesCompleted: number;
  readonly entriesTotal: number;
  readonly curriculumStandardsMet: readonly string[];
}

// ─── GET /dashboard/child/:kindlerId/sessions — Session History ────

export interface SessionHistoryRequest {
  readonly kindlerId: string;
  readonly pageSize: number;
  readonly cursor: string | null;   // ISO timestamp — cursor pagination
}

export interface SessionHistoryResponse {
  readonly sessions: readonly SessionSummaryPublic[];
  readonly nextCursor: string | null;
  readonly total: number;
}

// ─── GET /dashboard/child/:kindlerId/worlds-map ─────────────────────

export interface WorldsMapResponse {
  readonly worlds: readonly WorldMapEntry[];
  readonly totalRestored: number;
  readonly totalVisited: number;
}

export interface WorldMapEntry {
  readonly worldId: string;
  readonly worldName: string;
  readonly realm: string;
  readonly guideId: string;
  readonly guideName: string;
  readonly subject: string;
  readonly luminance: number;
  readonly fadingStage: string;
  readonly visited: boolean;
  readonly restored: boolean;
  readonly entriesCompleted: number;
  readonly entriesTotal: number;
}

// ─── PATCH /dashboard/child/:kindlerId/time-controls ───────────────

export interface TimeControlsUpdateRequest {
  readonly maxDailyMinutes: 15 | 30 | 45 | 60 | null;
  readonly bedtimeCutoff: string | null;   // HH:mm 24-hour format
  readonly notificationsEnabled: boolean;
}

/** Validates time controls update request. Returns first validation error or null. */
export function validateTimeControlsUpdate(req: TimeControlsUpdateRequest): string | null {
  if (req.maxDailyMinutes !== null) {
    const allowed: ReadonlyArray<15 | 30 | 45 | 60> = [15, 30, 45, 60];
    if (!allowed.includes(req.maxDailyMinutes)) {
      return 'maxDailyMinutes must be 15, 30, 45, 60, or null';
    }
  }
  if (req.bedtimeCutoff !== null) {
    const bedtimePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!bedtimePattern.test(req.bedtimeCutoff)) {
      return 'bedtimeCutoff must be HH:mm in 24-hour format (e.g., "21:00")';
    }
  }
  return null;
}

export interface TimeControlsUpdateResponse {
  readonly kindlerId: string;
  readonly updatedControls: TimeControlsUpdateRequest;
  readonly updatedAt: number;
}

// ─── GET /dashboard/reports/:kindlerId — Progress Reports ──────────

export interface ProgressReportRequest {
  readonly kindlerId: string;
  readonly fromEpoch: number;
  readonly toEpoch: number;
}

export interface ProgressReportResponse {
  readonly kindlerId: string;
  readonly displayName: string;
  readonly period: { readonly from: number; readonly to: number };
  readonly sessionsCount: number;
  readonly totalMinutes: number;
  readonly entriesCompleted: number;
  readonly worldsRestored: number;
  readonly sparkChange: number;
  readonly topSubjects: readonly string[];
  readonly curriculumStandardsMet: readonly string[];
  readonly teacherReadySummary: string;   // 1 paragraph, suitable for teacher sharing
}

// ─── POST /dashboard/child — Add Child Profile ─────────────────────

export interface AddChildRequest {
  readonly displayName: string;    // Not real name — just Koydo display name
  readonly ageTier: 1 | 2 | 3;
  readonly avatarId: string;
}

/** Validates add-child request. Returns first validation error or null. */
export function validateAddChildRequest(req: AddChildRequest): string | null {
  if (!req.displayName || req.displayName.trim().length < 2) {
    return 'displayName must be at least 2 characters';
  }
  if (req.displayName.trim().length > 20) {
    return 'displayName must be 20 characters or less';
  }
  // Reject any displayName that looks like a real forename + surname
  const fullNamePattern = /^[A-Z][a-z]+ [A-Z][a-z]+$/;
  if (fullNamePattern.test(req.displayName.trim())) {
    return 'displayName should be a nickname or Koydo name, not a full real name';
  }
  if (![1, 2, 3].includes(req.ageTier)) {
    return 'ageTier must be 1 (ages 5-6), 2 (ages 7-8), or 3 (ages 9-10)';
  }
  return null;
}

export interface AddChildResponse {
  readonly kindlerId: string;
  readonly displayName: string;
  readonly ageTier: 1 | 2 | 3;
  readonly avatarId: string;
  readonly createdAt: number;
}

// ─── DELETE /dashboard/child/:kindlerId — Remove Child Profile ──────

export interface RemoveChildResponse {
  readonly kindlerId: string;
  readonly deletedAt: number;
  readonly dataDeletedPermanently: true;  // Literal — no recovery
}

// ─── Route Manifest ─────────────────────────────────────────────────

export const DASHBOARD_ROUTES = {
  OVERVIEW:          'GET  /api/dashboard',
  CHILD_DETAIL:      'GET  /api/dashboard/child/:kindlerId',
  CHILD_SESSIONS:    'GET  /api/dashboard/child/:kindlerId/sessions',
  CHILD_WORLDS_MAP:  'GET  /api/dashboard/child/:kindlerId/worlds-map',
  CHILD_REPORT:      'GET  /api/dashboard/child/:kindlerId/report',
  TIME_CONTROLS:     'PATCH /api/dashboard/child/:kindlerId/time-controls',
  ADD_CHILD:         'POST /api/dashboard/child',
  REMOVE_CHILD:      'DELETE /api/dashboard/child/:kindlerId',
} as const;
