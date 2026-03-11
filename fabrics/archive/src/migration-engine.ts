/**
 * migration-engine.ts — Schema and data version migration.
 *
 * Registers versioned migrations and applies them in order.
 * Tracks applied versions, supports dry-run validation, and
 * maintains a migration history log for rollback planning.
 */

// ── Ports ────────────────────────────────────────────────────────

interface MigrationClock {
  readonly nowMicroseconds: () => number;
}

interface MigrationIdGenerator {
  readonly next: () => string;
}

interface MigrationEngineDeps {
  readonly clock: MigrationClock;
  readonly idGenerator: MigrationIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type MigrationDirection = 'up' | 'down';

interface MigrationDefinition {
  readonly version: number;
  readonly name: string;
  readonly up: () => boolean;
  readonly down: () => boolean;
}

interface RegisterMigrationParams {
  readonly version: number;
  readonly name: string;
  readonly up: () => boolean;
  readonly down: () => boolean;
}

interface MigrationRecord {
  readonly recordId: string;
  readonly version: number;
  readonly name: string;
  readonly direction: MigrationDirection;
  readonly appliedAt: number;
  readonly success: boolean;
}

interface MigrationResult {
  readonly applied: readonly MigrationRecord[];
  readonly currentVersion: number;
}

interface MigrationEngineStats {
  readonly registeredMigrations: number;
  readonly appliedCount: number;
  readonly currentVersion: number;
}

interface MigrationEngine {
  readonly register: (params: RegisterMigrationParams) => boolean;
  readonly migrateUp: () => MigrationResult;
  readonly migrateDown: () => MigrationRecord | undefined;
  readonly getCurrentVersion: () => number;
  readonly getPending: () => readonly MigrationDefinition[];
  readonly getHistory: () => readonly MigrationRecord[];
  readonly getStats: () => MigrationEngineStats;
}

// ── State ────────────────────────────────────────────────────────

interface MigrationState {
  readonly deps: MigrationEngineDeps;
  readonly migrations: Map<number, MigrationDefinition>;
  readonly appliedVersions: Set<number>;
  readonly history: MigrationRecord[];
  currentVersion: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function getSortedVersions(state: MigrationState): number[] {
  return [...state.migrations.keys()].sort((a, b) => a - b);
}

function recordMigration(
  state: MigrationState,
  version: number,
  name: string,
  direction: MigrationDirection,
  success: boolean,
): MigrationRecord {
  const record: MigrationRecord = {
    recordId: state.deps.idGenerator.next(),
    version,
    name,
    direction,
    appliedAt: state.deps.clock.nowMicroseconds(),
    success,
  };
  state.history.push(record);
  return record;
}

// ── Operations ───────────────────────────────────────────────────

function registerImpl(state: MigrationState, params: RegisterMigrationParams): boolean {
  if (state.migrations.has(params.version)) return false;
  state.migrations.set(params.version, {
    version: params.version,
    name: params.name,
    up: params.up,
    down: params.down,
  });
  return true;
}

function migrateUpImpl(state: MigrationState): MigrationResult {
  const versions = getSortedVersions(state);
  const applied: MigrationRecord[] = [];
  for (const ver of versions) {
    if (state.appliedVersions.has(ver)) continue;
    const migration = state.migrations.get(ver);
    if (!migration) continue;
    const success = migration.up();
    const record = recordMigration(state, ver, migration.name, 'up', success);
    applied.push(record);
    if (success) {
      state.appliedVersions.add(ver);
      state.currentVersion = ver;
    } else {
      break;
    }
  }
  return { applied, currentVersion: state.currentVersion };
}

function migrateDownImpl(state: MigrationState): MigrationRecord | undefined {
  if (state.currentVersion === 0) return undefined;
  const migration = state.migrations.get(state.currentVersion);
  if (!migration) return undefined;
  const success = migration.down();
  const record = recordMigration(state, state.currentVersion, migration.name, 'down', success);
  if (success) {
    state.appliedVersions.delete(state.currentVersion);
    const remaining = [...state.appliedVersions];
    state.currentVersion = remaining.length > 0 ? Math.max(...remaining) : 0;
  }
  return record;
}

function getPendingImpl(state: MigrationState): MigrationDefinition[] {
  const versions = getSortedVersions(state);
  return versions
    .filter((v) => !state.appliedVersions.has(v))
    .map((v) => state.migrations.get(v))
    .filter((m): m is MigrationDefinition => m !== undefined);
}

// ── Factory ──────────────────────────────────────────────────────

function createMigrationEngine(deps: MigrationEngineDeps): MigrationEngine {
  const state: MigrationState = {
    deps,
    migrations: new Map(),
    appliedVersions: new Set(),
    history: [],
    currentVersion: 0,
  };
  return {
    register: (p) => registerImpl(state, p),
    migrateUp: () => migrateUpImpl(state),
    migrateDown: () => migrateDownImpl(state),
    getCurrentVersion: () => state.currentVersion,
    getPending: () => getPendingImpl(state),
    getHistory: () => [...state.history],
    getStats: () => ({
      registeredMigrations: state.migrations.size,
      appliedCount: state.appliedVersions.size,
      currentVersion: state.currentVersion,
    }),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createMigrationEngine };
export type {
  MigrationEngine,
  MigrationEngineDeps,
  MigrationDefinition,
  MigrationDirection,
  RegisterMigrationParams,
  MigrationRecord,
  MigrationResult,
  MigrationEngineStats,
};
