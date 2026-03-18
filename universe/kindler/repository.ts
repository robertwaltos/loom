/**
 * Koydo Worlds — Kindler Repository
 *
 * Supabase persistence adapter for Kindler profiles, progress, sessions,
 * and spark logs. All I/O goes through this layer — the KindlerEngine is
 * always in-memory and synced here at session boundaries.
 *
 * Thread: silk/game-characters
 * Tier: 1
 */

import type {
  KindlerProfile,
  KindlerProgress,
  KindlerSession,
  SessionReport,
  SparkLogEntry,
} from './types.js';

import {
  kindlerProfileFromRow,
  kindlerProfileToRow,
  kindlerProgressFromRow,
  kindlerProgressToRow,
  sparkLogFromRow,
  sparkLogToRow,
  kindlerSessionFromRow,
  kindlerSessionToRow,
  sessionReportFromRow,
  sessionReportToRow,
} from '../db/mappers.js';

// ─── Supabase Client Shape ─────────────────────────────────────────
// Minimal duck-typed interface so we don't depend on the supabase package
// at compile time. Pass `createClient(url, key)` at runtime.

export interface SupabaseSelect {
  eq(col: string, val: unknown): SupabaseSelect;
  order(col: string, opts?: { ascending?: boolean }): SupabaseSelect;
  limit(n: number): SupabaseSelect;
  single(): Promise<{ data: unknown; error: unknown }>;
  then(resolve: (val: { data: unknown; error: unknown }) => void): void;
}

export interface SupabaseFrom {
  select(cols?: string): SupabaseSelect;
  insert(rows: unknown): Promise<{ data: unknown; error: unknown }>;
  update(row: unknown): SupabaseSelect;
  upsert(row: unknown): Promise<{ data: unknown; error: unknown }>;
  delete(): SupabaseSelect;
}

export interface SupabaseClient {
  from(table: string): SupabaseFrom;
}

// ─── Repository Interface ──────────────────────────────────────────

export interface KindlerRepository {
  findById(kindlerId: string): Promise<KindlerProfile | null>;
  findByParentId(parentAccountId: string): Promise<readonly KindlerProfile[]>;
  save(profile: KindlerProfile): Promise<void>;

  loadProgress(kindlerId: string): Promise<readonly KindlerProgress[]>;
  saveProgress(progress: KindlerProgress): Promise<void>;

  loadSparkLog(kindlerId: string, limit?: number): Promise<readonly SparkLogEntry[]>;
  appendSparkEntry(entry: SparkLogEntry): Promise<void>;

  saveSession(session: KindlerSession): Promise<void>;
  loadSession(sessionId: string): Promise<KindlerSession | null>;
  saveSessionReport(report: SessionReport): Promise<void>;
}

// ─── Internal Helpers ──────────────────────────────────────────────

function assertOk(error: unknown, context: string): void {
  if (error !== null && error !== undefined) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    throw new Error(`KindlerRepository.${context}: ${msg}`);
  }
}

// ─── Factory ───────────────────────────────────────────────────────

export function createKindlerRepository(db: SupabaseClient): KindlerRepository {
  return {
    async findById(kindlerId) {
      const { data, error } = await db
        .from('kindler_profiles')
        .select()
        .eq('id', kindlerId)
        .single();
      if (error !== null) return null;
      if (data === null || data === undefined) return null;
      return kindlerProfileFromRow(data as Parameters<typeof kindlerProfileFromRow>[0]);
    },

    async findByParentId(parentAccountId) {
      const result: { data: unknown; error: unknown } = await new Promise((resolve) => {
        db
          .from('kindler_profiles')
          .select()
          .eq('parent_account_id', parentAccountId)
          .then(resolve);
      });
      assertOk(result.error, 'findByParentId');
      const rows = Array.isArray(result.data) ? result.data : [];
      return rows.map((r) => kindlerProfileFromRow(r as Parameters<typeof kindlerProfileFromRow>[0]));
    },

    async save(profile) {
      const row = kindlerProfileToRow(profile);
      const { error } = await db.from('kindler_profiles').upsert(row);
      assertOk(error, 'save');
    },

    async loadProgress(kindlerId) {
      const result: { data: unknown; error: unknown } = await new Promise((resolve) => {
        db
          .from('kindler_progress')
          .select()
          .eq('kindler_id', kindlerId)
          .order('completed_at', { ascending: false })
          .then(resolve);
      });
      assertOk(result.error, 'loadProgress');
      const rows = Array.isArray(result.data) ? result.data : [];
      return rows.map((r) => kindlerProgressFromRow(r as Parameters<typeof kindlerProgressFromRow>[0]));
    },

    async saveProgress(progress) {
      const row = kindlerProgressToRow(progress);
      const { error } = await db.from('kindler_progress').upsert(row);
      assertOk(error, 'saveProgress');
    },

    async loadSparkLog(kindlerId, limit = 100) {
      const result: { data: unknown; error: unknown } = await new Promise((resolve) => {
        db
          .from('kindler_spark_log')
          .select()
          .eq('kindler_id', kindlerId)
          .order('timestamp', { ascending: false })
          .limit(limit)
          .then(resolve);
      });
      assertOk(result.error, 'loadSparkLog');
      const rows = Array.isArray(result.data) ? result.data : [];
      return rows.map((r) => sparkLogFromRow(r as Parameters<typeof sparkLogFromRow>[0]));
    },

    async appendSparkEntry(entry) {
      const row = sparkLogToRow(entry);
      const { error } = await db.from('kindler_spark_log').insert(row);
      assertOk(error, 'appendSparkEntry');
    },

    async saveSession(session) {
      const row = kindlerSessionToRow(session);
      const { error } = await db.from('kindler_sessions').upsert(row);
      assertOk(error, 'saveSession');
    },

    async loadSession(sessionId) {
      const { data, error } = await db
        .from('kindler_sessions')
        .select()
        .eq('id', sessionId)
        .single();
      if (error !== null) return null;
      if (data === null || data === undefined) return null;
      return kindlerSessionFromRow(data as Parameters<typeof kindlerSessionFromRow>[0]);
    },

    async saveSessionReport(report) {
      const row = sessionReportToRow(report);
      const { error } = await db.from('session_reports').upsert(row);
      assertOk(error, 'saveSessionReport');
    },
  };
}

// ─── In-Memory Mock (for testing) ─────────────────────────────────

export function createMockKindlerRepository(): KindlerRepository & {
  _profiles: Map<string, KindlerProfile>;
  _progress: Map<string, KindlerProgress[]>;
  _sparkLogs: Map<string, SparkLogEntry[]>;
  _sessions: Map<string, KindlerSession>;
  _reports: Map<string, SessionReport>;
} {
  const _profiles = new Map<string, KindlerProfile>();
  const _progress = new Map<string, KindlerProgress[]>();
  const _sparkLogs = new Map<string, SparkLogEntry[]>();
  const _sessions = new Map<string, KindlerSession>();
  const _reports = new Map<string, SessionReport>();

  return {
    _profiles, _progress, _sparkLogs, _sessions, _reports,

    async findById(id) { return _profiles.get(id) ?? null; },

    async findByParentId(parentId) {
      return [..._profiles.values()].filter((p) => p.parentAccountId === parentId);
    },

    async save(profile) { _profiles.set(profile.id, profile); },

    async loadProgress(kindlerId) { return _progress.get(kindlerId) ?? []; },

    async saveProgress(progress) {
      const list = _progress.get(progress.kindlerId) ?? [];
      list.push(progress);
      _progress.set(progress.kindlerId, list);
    },

    async loadSparkLog(kindlerId, limit = 100) {
      return (_sparkLogs.get(kindlerId) ?? []).slice(0, limit);
    },

    async appendSparkEntry(entry) {
      const list = _sparkLogs.get(entry.kindlerId) ?? [];
      list.push(entry);
      _sparkLogs.set(entry.kindlerId, list);
    },

    async saveSession(session) { _sessions.set(session.id, session); },

    async loadSession(id) { return _sessions.get(id) ?? null; },

    async saveSessionReport(report) { _reports.set(report.id, report); },
  };
}
