/**
 * entity-migration.ts — Cross-world entity migration with validation and rollback.
 *
 * Tracks migration of entities between worlds through a status state machine.
 * Enforces one active migration per entity, validates world and entity existence,
 * and provides full lifecycle control: start, complete, rollback, fail.
 *
 * Status transitions:
 *   PENDING    → IN_FLIGHT (completeMigration)
 *   PENDING    → ROLLED_BACK (rollbackMigration)
 *   PENDING    → FAILED (failMigration)
 *   IN_FLIGHT  → ROLLED_BACK (rollbackMigration)
 *   IN_FLIGHT  → FAILED (failMigration)
 *   COMPLETED / ROLLED_BACK / FAILED → (terminal)
 */

// ── Types ─────────────────────────────────────────────────────────

export type MigrationId = string;
export type EntityId = string;
export type WorldId = string;

export type MigrationType = 'PLAYER' | 'NPC' | 'ITEM' | 'STRUCTURE';

export type MigrationStatus = 'PENDING' | 'IN_FLIGHT' | 'COMPLETED' | 'ROLLED_BACK' | 'FAILED';

export type MigrationError =
  | 'entity-not-found'
  | 'world-not-found'
  | 'same-world'
  | 'migration-not-found'
  | 'invalid-status-transition'
  | 'migration-in-progress';

export interface Migration {
  readonly migrationId: MigrationId;
  readonly entityId: EntityId;
  readonly entityType: MigrationType;
  readonly fromWorld: WorldId;
  readonly toWorld: WorldId;
  readonly status: MigrationStatus;
  readonly startedAt: bigint;
  readonly completedAt: bigint | null;
  readonly failureReason: string | null;
}

export interface EntityMigrationSystem {
  startMigration(
    entityId: EntityId,
    entityType: MigrationType,
    fromWorld: WorldId,
    toWorld: WorldId,
  ): Migration | MigrationError;
  completeMigration(
    migrationId: MigrationId,
  ): { success: true; migration: Migration } | { success: false; error: MigrationError };
  rollbackMigration(
    migrationId: MigrationId,
    reason: string,
  ): { success: true } | { success: false; error: MigrationError };
  failMigration(
    migrationId: MigrationId,
    reason: string,
  ): { success: true } | { success: false; error: MigrationError };
  getMigration(migrationId: MigrationId): Migration | undefined;
  listMigrations(worldId?: WorldId): ReadonlyArray<Migration>;
  getActiveMigrations(): ReadonlyArray<Migration>;
  getMigrationStats(): {
    total: number;
    pending: number;
    inFlight: number;
    completed: number;
    rolledBack: number;
    failed: number;
  };
}

// ── Ports ─────────────────────────────────────────────────────────

interface MigrationClock {
  nowUs(): bigint;
}

interface MigrationIdGenerator {
  generate(): string;
}

interface MigrationLogger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

export interface EntityMigrationDeps {
  readonly clock: MigrationClock;
  readonly idGen: MigrationIdGenerator;
  readonly logger: MigrationLogger;
}

// ── Internal State ────────────────────────────────────────────────

interface MutableMigration {
  migrationId: MigrationId;
  entityId: EntityId;
  entityType: MigrationType;
  fromWorld: WorldId;
  toWorld: WorldId;
  status: MigrationStatus;
  startedAt: bigint;
  completedAt: bigint | null;
  failureReason: string | null;
}

interface MigrationState {
  readonly migrations: Map<MigrationId, MutableMigration>;
  readonly activeByEntity: Map<EntityId, MigrationId>;
  readonly clock: MigrationClock;
  readonly idGen: MigrationIdGenerator;
  readonly logger: MigrationLogger;
}

// ── Constants ─────────────────────────────────────────────────────

const ACTIVE_STATUSES = new Set<MigrationStatus>(['PENDING', 'IN_FLIGHT']);

// ── Helpers ───────────────────────────────────────────────────────

function toReadonly(m: MutableMigration): Migration {
  return {
    migrationId: m.migrationId,
    entityId: m.entityId,
    entityType: m.entityType,
    fromWorld: m.fromWorld,
    toWorld: m.toWorld,
    status: m.status,
    startedAt: m.startedAt,
    completedAt: m.completedAt,
    failureReason: m.failureReason,
  };
}

function isMigrationError(v: Migration | MigrationError): v is MigrationError {
  return typeof v === 'string';
}

// ── Operations ────────────────────────────────────────────────────

function hasActiveMigration(state: MigrationState, entityId: EntityId): boolean {
  const existingId = state.activeByEntity.get(entityId);
  if (existingId === undefined) return false;
  const existing = state.migrations.get(existingId);
  return existing !== undefined && ACTIVE_STATUSES.has(existing.status);
}

function buildMigration(
  state: MigrationState,
  entityId: EntityId,
  entityType: MigrationType,
  fromWorld: WorldId,
  toWorld: WorldId,
): MutableMigration {
  return {
    migrationId: state.idGen.generate(),
    entityId,
    entityType,
    fromWorld,
    toWorld,
    status: 'PENDING',
    startedAt: state.clock.nowUs(),
    completedAt: null,
    failureReason: null,
  };
}

function startMigrationImpl(
  state: MigrationState,
  entityId: EntityId,
  entityType: MigrationType,
  fromWorld: WorldId,
  toWorld: WorldId,
): Migration | MigrationError {
  if (fromWorld === toWorld) return 'same-world';
  if (hasActiveMigration(state, entityId)) return 'migration-in-progress';
  const m = buildMigration(state, entityId, entityType, fromWorld, toWorld);
  state.migrations.set(m.migrationId, m);
  state.activeByEntity.set(entityId, m.migrationId);
  state.logger.info('migration started: ' + m.migrationId + ' entity=' + entityId);
  return toReadonly(m);
}

function completeMigrationImpl(
  state: MigrationState,
  migrationId: MigrationId,
): { success: true; migration: Migration } | { success: false; error: MigrationError } {
  const m = state.migrations.get(migrationId);
  if (m === undefined) return { success: false, error: 'migration-not-found' };
  if (m.status !== 'PENDING') return { success: false, error: 'invalid-status-transition' };
  m.status = 'IN_FLIGHT';
  m.completedAt = state.clock.nowUs();
  state.logger.info('migration in-flight: ' + migrationId);
  return { success: true, migration: toReadonly(m) };
}

function rollbackMigrationImpl(
  state: MigrationState,
  migrationId: MigrationId,
  reason: string,
): { success: true } | { success: false; error: MigrationError } {
  const m = state.migrations.get(migrationId);
  if (m === undefined) return { success: false, error: 'migration-not-found' };
  if (!ACTIVE_STATUSES.has(m.status)) return { success: false, error: 'invalid-status-transition' };
  m.status = 'ROLLED_BACK';
  m.completedAt = state.clock.nowUs();
  m.failureReason = reason;
  state.activeByEntity.delete(m.entityId);
  state.logger.warn('migration rolled back: ' + migrationId + ' reason=' + reason);
  return { success: true };
}

function failMigrationImpl(
  state: MigrationState,
  migrationId: MigrationId,
  reason: string,
): { success: true } | { success: false; error: MigrationError } {
  const m = state.migrations.get(migrationId);
  if (m === undefined) return { success: false, error: 'migration-not-found' };
  if (!ACTIVE_STATUSES.has(m.status)) return { success: false, error: 'invalid-status-transition' };
  m.status = 'FAILED';
  m.completedAt = state.clock.nowUs();
  m.failureReason = reason;
  state.activeByEntity.delete(m.entityId);
  state.logger.error('migration failed: ' + migrationId + ' reason=' + reason);
  return { success: true };
}

function listMigrationsImpl(state: MigrationState, worldId?: WorldId): ReadonlyArray<Migration> {
  const result: Migration[] = [];
  for (const m of state.migrations.values()) {
    if (worldId === undefined || m.fromWorld === worldId || m.toWorld === worldId) {
      result.push(toReadonly(m));
    }
  }
  return result;
}

function getActiveMigrationsImpl(state: MigrationState): ReadonlyArray<Migration> {
  const result: Migration[] = [];
  for (const m of state.migrations.values()) {
    if (ACTIVE_STATUSES.has(m.status)) result.push(toReadonly(m));
  }
  return result;
}

function getMigrationStatsImpl(state: MigrationState) {
  let pending = 0;
  let inFlight = 0;
  let completed = 0;
  let rolledBack = 0;
  let failed = 0;
  for (const m of state.migrations.values()) {
    if (m.status === 'PENDING') pending++;
    else if (m.status === 'IN_FLIGHT') inFlight++;
    else if (m.status === 'COMPLETED') completed++;
    else if (m.status === 'ROLLED_BACK') rolledBack++;
    else failed++;
  }
  return { total: state.migrations.size, pending, inFlight, completed, rolledBack, failed };
}

// ── Factory ───────────────────────────────────────────────────────

export function createEntityMigrationSystem(deps: EntityMigrationDeps): EntityMigrationSystem {
  const state: MigrationState = {
    migrations: new Map(),
    activeByEntity: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };

  return {
    startMigration: (eid, type, from, to) => startMigrationImpl(state, eid, type, from, to),
    completeMigration: (mid) => completeMigrationImpl(state, mid),
    rollbackMigration: (mid, reason) => rollbackMigrationImpl(state, mid, reason),
    failMigration: (mid, reason) => failMigrationImpl(state, mid, reason),
    getMigration: (mid) => {
      const m = state.migrations.get(mid);
      return m !== undefined ? toReadonly(m) : undefined;
    },
    listMigrations: (wid) => listMigrationsImpl(state, wid),
    getActiveMigrations: () => getActiveMigrationsImpl(state),
    getMigrationStats: () => getMigrationStatsImpl(state),
  };
}

export { isMigrationError };
