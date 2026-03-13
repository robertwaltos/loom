/**
 * protocol-evolution.ts — Versioned wire format registry with backward-
 * compatible extension points.
 *
 * NEXT-STEPS Phase 17.3: "Protocol evolution: versioned wire format,
 * backward compatible extension."
 *
 * Design:
 *   - A SchemaRegistry maps numeric `schemaVersion` → codec description.
 *   - Versions are immutable once published (no edit, only append).
 *   - `resolveCodec(version)` returns the codec for that version, or
 *     a `MigrationPath` to upgrade old messages to the current schema.
 *   - `canRead(incoming, current)` checks whether current software can
 *     parse a message produced at `incoming` version without data loss.
 *
 * Thread: cotton/contracts/protocols/evolution
 * Tier: 0
 */

// ── Types ─────────────────────────────────────────────────────────────

/** Monotonically increasing schema version counter (integer) */
export type SchemaVersion = number & { readonly __brand: 'SchemaVersion' };

export function schemaVersion(n: number): SchemaVersion {
  if (!Number.isInteger(n) || n < 1) throw new RangeError(`Invalid schema version: ${String(n)}`);
  return n as SchemaVersion;
}

export type CompatibilityClass = 'full' | 'read-forward' | 'breaking';

export interface SchemaDescriptor {
  readonly version: SchemaVersion;
  /** Short description of what changed in this version */
  readonly changelog: string;
  /** Minimum version this descriptor can decode without data loss */
  readonly minimumReadableVersion: SchemaVersion;
  readonly compatibilityClass: CompatibilityClass;
  readonly publishedAt: number;
}

export interface MigrationStep {
  readonly fromVersion: SchemaVersion;
  readonly toVersion: SchemaVersion;
  /** Transform a raw message payload to the newer schema */
  readonly migrate: (payload: Uint8Array) => Uint8Array;
}

export interface MigrationPath {
  readonly steps: readonly MigrationStep[];
  readonly targetVersion: SchemaVersion;
}

export type EvolutionError =
  | 'version-not-registered'
  | 'version-already-registered'
  | 'breaking-change-no-migration'
  | 'non-monotonic-version'
  | 'migration-already-registered';

export interface SchemaRegistry {
  readonly register: (descriptor: SchemaDescriptor) => EvolutionError | undefined;
  readonly addMigration: (step: MigrationStep) => EvolutionError | undefined;
  readonly canRead: (incomingVersion: SchemaVersion, readerVersion: SchemaVersion) => boolean;
  readonly resolveMigrationPath: (fromVersion: SchemaVersion) => MigrationPath | EvolutionError;
  readonly currentVersion: () => SchemaVersion;
  readonly listDescriptors: () => readonly SchemaDescriptor[];
}

// ── Internal store ────────────────────────────────────────────────────

type EvolutionStore = {
  descriptors: Map<number, SchemaDescriptor>;
  migrations: Map<number, MigrationStep>;
  latest: SchemaVersion | undefined;
};

// ── Helpers ───────────────────────────────────────────────────────────

function validateNewDescriptor(store: EvolutionStore, desc: SchemaDescriptor): EvolutionError | undefined {
  if (store.descriptors.has(desc.version)) return 'version-already-registered';
  if (store.latest !== undefined && desc.version <= store.latest) return 'non-monotonic-version';
  return undefined;
}

function buildMigrationPath(store: EvolutionStore, from: SchemaVersion, to: SchemaVersion): MigrationPath | EvolutionError {
  if (from === to) return { steps: [], targetVersion: to };
  const steps: MigrationStep[] = [];
  let cursor = from as number;
  while (cursor < (to as number)) {
    const step = store.migrations.get(cursor);
    if (step === undefined) return 'breaking-change-no-migration';
    steps.push(step);
    cursor = step.toVersion as number;
  }
  return { steps: Object.freeze(steps), targetVersion: to };
}

// ── Builder functions ─────────────────────────────────────────────────

function makeRegister(store: EvolutionStore) {
  return function register(descriptor: SchemaDescriptor): EvolutionError | undefined {
    const err = validateNewDescriptor(store, descriptor);
    if (err !== undefined) return err;
    store.descriptors.set(descriptor.version as number, descriptor);
    store.latest = descriptor.version;
    return undefined;
  };
}

function makeAddMigration(store: EvolutionStore) {
  return function addMigration(step: MigrationStep): EvolutionError | undefined {
    if (store.migrations.has(step.fromVersion as number)) return 'migration-already-registered';
    if (!store.descriptors.has(step.fromVersion as number)) return 'version-not-registered';
    if (!store.descriptors.has(step.toVersion as number)) return 'version-not-registered';
    store.migrations.set(step.fromVersion as number, step);
    return undefined;
  };
}

function makeCanRead(store: EvolutionStore) {
  return function canRead(incoming: SchemaVersion, reader: SchemaVersion): boolean {
    const readerDesc = store.descriptors.get(reader as number);
    if (readerDesc === undefined) return false;
    return (incoming as number) >= (readerDesc.minimumReadableVersion as number);
  };
}

function makeResolvePath(store: EvolutionStore) {
  return function resolveMigrationPath(from: SchemaVersion): MigrationPath | EvolutionError {
    if (!store.descriptors.has(from as number)) return 'version-not-registered';
    if (store.latest === undefined) return 'version-not-registered';
    return buildMigrationPath(store, from, store.latest);
  };
}

// ── Factory ───────────────────────────────────────────────────────────

export function createSchemaRegistry(): SchemaRegistry {
  const store: EvolutionStore = { descriptors: new Map(), migrations: new Map(), latest: undefined };
  return {
    register: makeRegister(store),
    addMigration: makeAddMigration(store),
    canRead: makeCanRead(store),
    resolveMigrationPath: makeResolvePath(store),
    currentVersion: () => { if (store.latest === undefined) throw new Error('No versions registered'); return store.latest; },
    listDescriptors: () => Object.freeze([...store.descriptors.values()].sort((a, b) => (a.version as number) - (b.version as number))),
  };
}
