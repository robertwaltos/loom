/**
 * api-versioning.ts — API version management for the Selvage gateway.
 *
 * Tracks registered API versions, deprecation schedules, migration
 * paths between versions, and negotiates the best version from
 * client-supplied headers. Sunset dates trigger warnings and
 * eventual rejection of deprecated versions.
 *
 * "Each version is a thread in the weave of compatibility."
 */

// ── Ports ────────────────────────────────────────────────────────

interface VersioningClock {
  readonly nowMicroseconds: () => number;
}

interface VersioningLogPort {
  readonly info: (message: string, context: Record<string, unknown>) => void;
  readonly warn: (message: string, context: Record<string, unknown>) => void;
}

interface ApiVersioningDeps {
  readonly clock: VersioningClock;
  readonly log: VersioningLogPort;
}

// ── Types ────────────────────────────────────────────────────────

type VersionStatus = 'active' | 'deprecated' | 'sunset';

interface VersionEntry {
  readonly version: string;
  readonly releasedAt: number;
  readonly status: VersionStatus;
  readonly deprecatedAt: number | undefined;
  readonly sunsetAt: number | undefined;
  readonly description: string;
}

interface RegisterVersionParams {
  readonly version: string;
  readonly releasedAt: number;
  readonly description: string;
}

interface DeprecateParams {
  readonly version: string;
  readonly sunsetAt: number;
}

interface MigrationPath {
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly description: string;
  readonly addedAt: number;
}

interface RegisterMigrationParams {
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly description: string;
}

type NegotiateOutcome = 'matched' | 'fallback' | 'unavailable';

interface NegotiateResult {
  readonly outcome: NegotiateOutcome;
  readonly resolvedVersion: string | undefined;
  readonly isDeprecated: boolean;
  readonly sunsetAt: number | undefined;
  readonly warnings: readonly string[];
}

interface VersioningStats {
  readonly totalVersions: number;
  readonly activeVersions: number;
  readonly deprecatedVersions: number;
  readonly sunsetVersions: number;
  readonly totalMigrations: number;
  readonly totalNegotiations: number;
}

interface ApiVersioningService {
  readonly registerVersion: (params: RegisterVersionParams) => boolean;
  readonly removeVersion: (version: string) => boolean;
  readonly deprecateVersion: (params: DeprecateParams) => boolean;
  readonly getVersion: (version: string) => VersionEntry | undefined;
  readonly listVersions: () => readonly VersionEntry[];
  readonly getActiveVersions: () => readonly VersionEntry[];
  readonly registerMigration: (params: RegisterMigrationParams) => boolean;
  readonly getMigrationPath: (from: string, to: string) => MigrationPath | undefined;
  readonly listMigrations: () => readonly MigrationPath[];
  readonly negotiate: (requestedVersion: string | undefined) => NegotiateResult;
  readonly sweepSunset: () => number;
  readonly getStats: () => VersioningStats;
}

// ── State ────────────────────────────────────────────────────────

interface MutableVersionEntry {
  readonly version: string;
  readonly releasedAt: number;
  status: VersionStatus;
  deprecatedAt: number | undefined;
  sunsetAt: number | undefined;
  readonly description: string;
}

interface VersioningState {
  readonly deps: ApiVersioningDeps;
  readonly versions: Map<string, MutableVersionEntry>;
  readonly migrations: Map<string, MigrationPath>;
  totalNegotiations: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function migrationKey(from: string, to: string): string {
  return from + '->' + to;
}

function toReadonlyEntry(entry: MutableVersionEntry): VersionEntry {
  return {
    version: entry.version,
    releasedAt: entry.releasedAt,
    status: entry.status,
    deprecatedAt: entry.deprecatedAt,
    sunsetAt: entry.sunsetAt,
    description: entry.description,
  };
}

function findLatestActive(state: VersioningState): MutableVersionEntry | undefined {
  let latest: MutableVersionEntry | undefined;
  for (const entry of state.versions.values()) {
    if (entry.status !== 'active') continue;
    if (!latest || entry.releasedAt > latest.releasedAt) {
      latest = entry;
    }
  }
  return latest;
}

function countByStatus(state: VersioningState, target: VersionStatus): number {
  let count = 0;
  for (const entry of state.versions.values()) {
    if (entry.status === target) count += 1;
  }
  return count;
}

// ── Operations ───────────────────────────────────────────────────

function registerVersionImpl(state: VersioningState, params: RegisterVersionParams): boolean {
  if (state.versions.has(params.version)) return false;
  state.versions.set(params.version, {
    version: params.version,
    releasedAt: params.releasedAt,
    status: 'active',
    deprecatedAt: undefined,
    sunsetAt: undefined,
    description: params.description,
  });
  return true;
}

function deprecateImpl(state: VersioningState, params: DeprecateParams): boolean {
  const entry = state.versions.get(params.version);
  if (!entry) return false;
  if (entry.status === 'sunset') return false;
  entry.status = 'deprecated';
  entry.deprecatedAt = state.deps.clock.nowMicroseconds();
  entry.sunsetAt = params.sunsetAt;
  return true;
}

function registerMigrationImpl(state: VersioningState, params: RegisterMigrationParams): boolean {
  const key = migrationKey(params.fromVersion, params.toVersion);
  if (state.migrations.has(key)) return false;
  if (!state.versions.has(params.fromVersion)) return false;
  if (!state.versions.has(params.toVersion)) return false;
  state.migrations.set(key, {
    fromVersion: params.fromVersion,
    toVersion: params.toVersion,
    description: params.description,
    addedAt: state.deps.clock.nowMicroseconds(),
  });
  return true;
}

function negotiateImpl(
  state: VersioningState,
  requestedVersion: string | undefined,
): NegotiateResult {
  state.totalNegotiations += 1;
  if (requestedVersion === undefined) {
    return negotiateFallback(state);
  }
  const entry = state.versions.get(requestedVersion);
  if (!entry) {
    return negotiateFallback(state);
  }
  return negotiateForEntry(state, entry);
}

function negotiateFallback(state: VersioningState): NegotiateResult {
  const latest = findLatestActive(state);
  if (!latest) {
    return {
      outcome: 'unavailable',
      resolvedVersion: undefined,
      isDeprecated: false,
      sunsetAt: undefined,
      warnings: ['No active API versions available'],
    };
  }
  return {
    outcome: 'fallback',
    resolvedVersion: latest.version,
    isDeprecated: false,
    sunsetAt: undefined,
    warnings: [],
  };
}

function negotiateForEntry(state: VersioningState, entry: MutableVersionEntry): NegotiateResult {
  if (entry.status === 'sunset') {
    return negotiateSunsetFallback(state, entry);
  }
  const warnings: string[] = [];
  if (entry.status === 'deprecated') {
    warnings.push('Version ' + entry.version + ' is deprecated');
    if (entry.sunsetAt !== undefined) {
      warnings.push('Sunset scheduled at ' + String(entry.sunsetAt));
    }
  }
  return {
    outcome: 'matched',
    resolvedVersion: entry.version,
    isDeprecated: entry.status === 'deprecated',
    sunsetAt: entry.sunsetAt,
    warnings,
  };
}

function negotiateSunsetFallback(
  state: VersioningState,
  entry: MutableVersionEntry,
): NegotiateResult {
  const latest = findLatestActive(state);
  if (!latest) {
    return {
      outcome: 'unavailable',
      resolvedVersion: undefined,
      isDeprecated: false,
      sunsetAt: undefined,
      warnings: ['Version ' + entry.version + ' is sunset and no active version available'],
    };
  }
  return {
    outcome: 'fallback',
    resolvedVersion: latest.version,
    isDeprecated: false,
    sunsetAt: undefined,
    warnings: ['Version ' + entry.version + ' is sunset, falling back to ' + latest.version],
  };
}

function sweepSunsetImpl(state: VersioningState): number {
  const now = state.deps.clock.nowMicroseconds();
  let swept = 0;
  for (const entry of state.versions.values()) {
    if (entry.status !== 'deprecated') continue;
    if (entry.sunsetAt === undefined) continue;
    if (now >= entry.sunsetAt) {
      entry.status = 'sunset';
      swept += 1;
    }
  }
  return swept;
}

function getStatsImpl(state: VersioningState): VersioningStats {
  return {
    totalVersions: state.versions.size,
    activeVersions: countByStatus(state, 'active'),
    deprecatedVersions: countByStatus(state, 'deprecated'),
    sunsetVersions: countByStatus(state, 'sunset'),
    totalMigrations: state.migrations.size,
    totalNegotiations: state.totalNegotiations,
  };
}

// ── Accessors ────────────────────────────────────────────────────

function getVersionImpl(state: VersioningState, version: string): VersionEntry | undefined {
  const e = state.versions.get(version);
  return e ? toReadonlyEntry(e) : undefined;
}

function getActiveVersionsImpl(state: VersioningState): readonly VersionEntry[] {
  const active: VersionEntry[] = [];
  for (const e of state.versions.values()) {
    if (e.status === 'active') active.push(toReadonlyEntry(e));
  }
  return active;
}

// ── Factory ──────────────────────────────────────────────────────

function createApiVersioningService(deps: ApiVersioningDeps): ApiVersioningService {
  const state: VersioningState = {
    deps,
    versions: new Map(),
    migrations: new Map(),
    totalNegotiations: 0,
  };
  return {
    registerVersion: (p) => registerVersionImpl(state, p),
    removeVersion: (v) => state.versions.delete(v),
    deprecateVersion: (p) => deprecateImpl(state, p),
    getVersion: (v) => getVersionImpl(state, v),
    listVersions: () => [...state.versions.values()].map(toReadonlyEntry),
    getActiveVersions: () => getActiveVersionsImpl(state),
    registerMigration: (p) => registerMigrationImpl(state, p),
    getMigrationPath: (from, to) => state.migrations.get(migrationKey(from, to)),
    listMigrations: () => [...state.migrations.values()],
    negotiate: (v) => negotiateImpl(state, v),
    sweepSunset: () => sweepSunsetImpl(state),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createApiVersioningService };
export type {
  ApiVersioningService,
  ApiVersioningDeps,
  VersioningClock,
  VersioningLogPort,
  VersionStatus,
  VersionEntry,
  RegisterVersionParams,
  DeprecateParams,
  MigrationPath,
  RegisterMigrationParams,
  NegotiateOutcome,
  NegotiateResult,
  VersioningStats,
};
