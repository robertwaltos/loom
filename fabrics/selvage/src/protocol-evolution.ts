/**
 * protocol-evolution.ts — Protocol Versioning + Backward Compatibility (Phase 17.3)
 *
 * Provides schema registration, validation, and migration chaining for
 * protocol message types across versions. Supports multi-hop migrations via BFS.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export type ProtocolVersion = {
  major: number;
  minor: number;
  patch: number;
};

export type MessageSchema = {
  type: string;
  version: ProtocolVersion;
  requiredFields: string[];
  optionalFields: string[];
  deprecatedFields: string[];
};

export type MigrationFn<T> = (
  msg: T,
  fromVersion: ProtocolVersion,
  toVersion: ProtocolVersion,
) => T;

export type ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type ProtocolRegistry = {
  registerSchema(schema: MessageSchema): void;
  registerMigration<T>(
    msgType: string,
    fromVersion: ProtocolVersion,
    toVersion: ProtocolVersion,
    migrate: MigrationFn<T>,
  ): void;
  validate(
    msgType: string,
    version: ProtocolVersion,
    msg: Record<string, unknown>,
  ): ValidationResult;
  migrate<T>(msgType: string, msg: T, targetVersion: ProtocolVersion): T;
  isCompatible(client: ProtocolVersion, server: ProtocolVersion): boolean;
  getLatestVersion(msgType: string): ProtocolVersion | undefined;
  getSupportedVersions(msgType: string): ProtocolVersion[];
};

// ── Version Helpers ──────────────────────────────────────────────────────────

export function parseVersion(s: string): ProtocolVersion {
  const cleaned = s.startsWith('v') ? s.slice(1) : s;
  const parts = cleaned.split('.');
  const major = parseInt(parts[0] ?? '', 10);
  const minor = parseInt(parts[1] ?? '', 10);
  const patch = parseInt(parts[2] ?? '', 10);
  if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
    throw new Error(`Invalid version string: "${s}"`);
  }
  return { major, minor, patch };
}

export function formatVersion(v: ProtocolVersion): string {
  return `${v.major}.${v.minor}.${v.patch}`;
}

export function compareVersions(a: ProtocolVersion, b: ProtocolVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

// ── Internal State ───────────────────────────────────────────────────────────

interface MigrationEntry {
  msgType: string;
  fromVersion: ProtocolVersion;
  toVersion: ProtocolVersion;
  fn: MigrationFn<unknown>;
}

interface RegistryState {
  schemas: Map<string, MessageSchema[]>;
  migrations: MigrationEntry[];
}

function versionKey(v: ProtocolVersion): string {
  return formatVersion(v);
}

function schemaKey(msgType: string, version: ProtocolVersion): string {
  return `${msgType}@${versionKey(version)}`;
}

// ── Migration Path Finding (BFS) ─────────────────────────────────────────────

type PathEntry = {
  from: ProtocolVersion;
  to: ProtocolVersion;
  fn: MigrationFn<unknown>;
};

function findMigrationPath(
  state: RegistryState,
  msgType: string,
  from: ProtocolVersion,
  to: ProtocolVersion,
): PathEntry[] | null {
  const fromKey = versionKey(from);
  const toKey = versionKey(to);

  if (fromKey === toKey) return [];

  const relevant = state.migrations.filter((m) => m.msgType === msgType);

  type BfsNode = { version: ProtocolVersion; path: PathEntry[] };
  const queue: BfsNode[] = [{ version: from, path: [] }];
  const visited = new Set<string>([fromKey]);

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) break;

    const currentKey = versionKey(node.version);

    for (const m of relevant) {
      if (versionKey(m.fromVersion) !== currentKey) continue;
      const nextKey = versionKey(m.toVersion);
      const entry: PathEntry = { from: m.fromVersion, to: m.toVersion, fn: m.fn };

      if (nextKey === toKey) {
        return [...node.path, entry];
      }

      if (!visited.has(nextKey)) {
        visited.add(nextKey);
        queue.push({ version: m.toVersion, path: [...node.path, entry] });
      }
    }
  }

  return null;
}

// ── Factory ──────────────────────────────────────────────────────────────────

export function createProtocolRegistry(): ProtocolRegistry {
  const state: RegistryState = {
    schemas: new Map(),
    migrations: [],
  };

  const registeredKeys = new Set<string>();

  return {
    registerSchema(schema: MessageSchema): void {
      const key = schemaKey(schema.type, schema.version);
      if (registeredKeys.has(key)) {
        throw new Error(
          `Schema already registered: ${schema.type} v${formatVersion(schema.version)}`,
        );
      }
      registeredKeys.add(key);
      const list = state.schemas.get(schema.type) ?? [];
      list.push(schema);
      state.schemas.set(schema.type, list);
    },

    registerMigration<T>(
      msgType: string,
      fromVersion: ProtocolVersion,
      toVersion: ProtocolVersion,
      migrate: MigrationFn<T>,
    ): void {
      state.migrations.push({
        msgType,
        fromVersion,
        toVersion,
        fn: migrate as MigrationFn<unknown>,
      });
    },

    validate(
      msgType: string,
      version: ProtocolVersion,
      msg: Record<string, unknown>,
    ): ValidationResult {
      const key = schemaKey(msgType, version);
      if (!registeredKeys.has(key)) {
        return {
          valid: false,
          errors: [`No schema registered for ${msgType} v${formatVersion(version)}`],
          warnings: [],
        };
      }

      const list = state.schemas.get(msgType) ?? [];
      const schema = list.find((s) => compareVersions(s.version, version) === 0);
      if (!schema) {
        return {
          valid: false,
          errors: [`No schema registered for ${msgType} v${formatVersion(version)}`],
          warnings: [],
        };
      }

      const errors: string[] = [];
      const warnings: string[] = [];

      for (const field of schema.requiredFields) {
        if (!(field in msg)) {
          errors.push(`Missing required field: "${field}"`);
        }
      }

      for (const field of schema.deprecatedFields) {
        if (field in msg) {
          warnings.push(`Field "${field}" is deprecated`);
        }
      }

      return { valid: errors.length === 0, errors, warnings };
    },

    migrate<T>(msgType: string, msg: T, targetVersion: ProtocolVersion): T {
      const raw = msg as Record<string, unknown>;
      const versionRaw = raw['version'];
      if (
        !versionRaw ||
        typeof versionRaw !== 'object' ||
        !('major' in versionRaw) ||
        !('minor' in versionRaw) ||
        !('patch' in versionRaw)
      ) {
        throw new Error(
          'Message must have a valid { major, minor, patch } version field to migrate',
        );
      }
      const currentVersion = versionRaw as ProtocolVersion;

      if (compareVersions(currentVersion, targetVersion) === 0) {
        return msg;
      }

      const path = findMigrationPath(state, msgType, currentVersion, targetVersion);
      if (path === null) {
        throw new Error(
          `No migration path for "${msgType}" from ${formatVersion(currentVersion)} to ${formatVersion(targetVersion)}`,
        );
      }

      let current: unknown = msg;
      for (const entry of path) {
        current = entry.fn(current, entry.from, entry.to);
      }
      return current as T;
    },

    isCompatible(client: ProtocolVersion, server: ProtocolVersion): boolean {
      return client.major === server.major && client.minor <= server.minor;
    },

    getLatestVersion(msgType: string): ProtocolVersion | undefined {
      const list = state.schemas.get(msgType);
      if (!list || list.length === 0) return undefined;
      let latest = list[0];
      if (!latest) return undefined;
      for (const schema of list) {
        if (compareVersions(schema.version, latest.version) > 0) {
          latest = schema;
        }
      }
      return latest.version;
    },

    getSupportedVersions(msgType: string): ProtocolVersion[] {
      const list = state.schemas.get(msgType) ?? [];
      return list.map((s) => s.version).sort(compareVersions);
    },
  };
}
