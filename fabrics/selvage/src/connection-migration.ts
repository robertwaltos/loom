/**
 * connection-migration.ts — Seamless server handoff during Weave transit.
 *
 * NEXT-STEPS Phase 17.7: "Connection migration: seamless handoff between
 * servers during Weave transit."
 *
 * When a player traverses a Silfen Weave corridor they move from one
 * server region to another.  This module orchestrates the handoff:
 *
 *   1. `initiateMigration(playerId, toServerId)` — source server prepares
 *      a migration token, freezes buffered inputs, starts a timer.
 *   2. `completeMigration(token)` — target server validates the token,
 *      restores buffered inputs, marks migration done.
 *   3. `cancelMigration(token)` — migration failed / timed out; re-open
 *      old connection so the player stays on the source server.
 *   4. `cleanupExpiredMigrations()` — janitor: remove timed-out pending.
 *
 * Thread: steel/selvage/connection-migration
 * Tier: 1
 */

// ── Types ──────────────────────────────────────────────────────────────

export type PlayerId = string;
export type ServerId = string;
export type MigrationToken = string;

export type MigrationStatus = 'pending' | 'completed' | 'cancelled' | 'expired';

export interface MigrationRecord {
  readonly token: MigrationToken;
  readonly playerId: PlayerId;
  readonly fromServerId: ServerId;
  readonly toServerId: ServerId;
  readonly initiatedAt: number;
  readonly expiresAt: number;
  readonly status: MigrationStatus;
  /** Buffered inputs frozen at migration initiation */
  readonly bufferedInputs: readonly unknown[];
}

export interface InitiateResult {
  readonly token: MigrationToken;
  readonly record: MigrationRecord;
}

export interface CompleteResult {
  readonly record: MigrationRecord;
  readonly bufferedInputs: readonly unknown[];
}

export interface MigrationStats {
  readonly initiated: number;
  readonly completed: number;
  readonly cancelled: number;
  readonly expired: number;
  readonly pending: number;
}

// ── Config ─────────────────────────────────────────────────────────────

export interface MigrationConfig {
  readonly tokenTtlMs: number;
}

export const DEFAULT_MIGRATION_CONFIG: MigrationConfig = Object.freeze({
  tokenTtlMs: 10_000, // 10 s window to complete migration
});

// ── Ports ──────────────────────────────────────────────────────────────

export interface MigrationClockPort { readonly nowMs: () => number; }
export interface MigrationIdPort { readonly next: () => string; }
export interface MigrationLogPort {
  readonly info: (msg: string, ctx?: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx?: Record<string, unknown>) => void;
}

export interface ConnectionMigrationDeps {
  readonly clock: MigrationClockPort;
  readonly id: MigrationIdPort;
  readonly log: MigrationLogPort;
  readonly config?: Partial<MigrationConfig>;
}

// ── Public interface ───────────────────────────────────────────────────

export interface ConnectionMigration {
  readonly initiateMigration: (
    playerId: PlayerId,
    fromServerId: ServerId,
    toServerId: ServerId,
    bufferedInputs: readonly unknown[],
  ) => InitiateResult;
  readonly completeMigration: (token: MigrationToken) => CompleteResult;
  readonly cancelMigration: (token: MigrationToken) => MigrationRecord;
  readonly cleanupExpiredMigrations: () => number;
  readonly getMigration: (token: MigrationToken) => MigrationRecord | undefined;
  readonly getStats: () => MigrationStats;
}

// ── Internal state ─────────────────────────────────────────────────────

interface Internals {
  records: Map<MigrationToken, MigrationRecord>;
  initiated: number;
  completed: number;
  cancelled: number;
  expired: number;
}

// ── Helpers ────────────────────────────────────────────────────────────

function resolveConfig(partial?: Partial<MigrationConfig>): MigrationConfig {
  return Object.freeze({ ...DEFAULT_MIGRATION_CONFIG, ...partial });
}

function mustGetPending(records: Map<MigrationToken, MigrationRecord>, token: MigrationToken): MigrationRecord {
  const rec = records.get(token);
  if (rec === undefined) throw new Error(`Migration token not found: ${token}`);
  if (rec.status !== 'pending') throw new Error(`Migration ${token} is already ${rec.status}`);
  return rec;
}

function makeInitiate(state: Internals, deps: ConnectionMigrationDeps, cfg: MigrationConfig) {
  return function initiateMigration(
    playerId: PlayerId,
    fromServerId: ServerId,
    toServerId: ServerId,
    bufferedInputs: readonly unknown[],
  ): InitiateResult {
    const now = deps.clock.nowMs();
    const token = deps.id.next();
    const record: MigrationRecord = Object.freeze({
      token,
      playerId,
      fromServerId,
      toServerId,
      initiatedAt: now,
      expiresAt: now + cfg.tokenTtlMs,
      status: 'pending',
      bufferedInputs,
    });
    state.records.set(token, record);
    state.initiated++;
    deps.log.info('Migration initiated', { token, playerId, from: fromServerId, to: toServerId });
    return { token, record };
  };
}

function makeComplete(state: Internals, deps: ConnectionMigrationDeps) {
  return function completeMigration(token: MigrationToken): CompleteResult {
    const rec = mustGetPending(state.records, token);
    const now = deps.clock.nowMs();
    if (now > rec.expiresAt) throw new Error(`Migration token ${token} has expired`);
    const updated: MigrationRecord = Object.freeze({ ...rec, status: 'completed' });
    state.records.set(token, updated);
    state.completed++;
    deps.log.info('Migration completed', { token, playerId: rec.playerId });
    return { record: updated, bufferedInputs: rec.bufferedInputs };
  };
}

function makeCancel(state: Internals, deps: ConnectionMigrationDeps) {
  return function cancelMigration(token: MigrationToken): MigrationRecord {
    const rec = mustGetPending(state.records, token);
    const updated: MigrationRecord = Object.freeze({ ...rec, status: 'cancelled' });
    state.records.set(token, updated);
    state.cancelled++;
    deps.log.warn('Migration cancelled', { token, playerId: rec.playerId });
    return updated;
  };
}

function makeCleanup(state: Internals, deps: ConnectionMigrationDeps) {
  return function cleanupExpiredMigrations(): number {
    const now = deps.clock.nowMs();
    let count = 0;
    for (const [token, rec] of state.records.entries()) {
      if (rec.status === 'pending' && now > rec.expiresAt) {
        state.records.set(token, Object.freeze({ ...rec, status: 'expired' }));
        state.expired++;
        count++;
      }
    }
    if (count > 0) deps.log.warn('Expired migrations cleaned up', { count });
    return count;
  };
}

// ── Factory ────────────────────────────────────────────────────────────

export function createConnectionMigration(deps: ConnectionMigrationDeps): ConnectionMigration {
  const cfg = resolveConfig(deps.config);
  const state: Internals = { records: new Map(), initiated: 0, completed: 0, cancelled: 0, expired: 0 };

  return Object.freeze({
    initiateMigration: makeInitiate(state, deps, cfg),
    completeMigration: makeComplete(state, deps),
    cancelMigration: makeCancel(state, deps),
    cleanupExpiredMigrations: makeCleanup(state, deps),
    getMigration: (token: MigrationToken) => state.records.get(token),
    getStats: () => Object.freeze({
      initiated: state.initiated,
      completed: state.completed,
      cancelled: state.cancelled,
      expired: state.expired,
      pending: [...state.records.values()].filter((r) => r.status === 'pending').length,
    }),
  });
}
