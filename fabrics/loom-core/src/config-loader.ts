/**
 * config-loader.ts — Typed configuration loader with hot-reload tracking.
 *
 * Stores typed config values (string | number | boolean | bigint) by key
 * and scope. Tracks change history per key, enforces read-only protection,
 * versions each entry, and provides scope-filtered snapshots.
 *
 * Designed for runtime configuration without filesystem I/O — callers
 * push values in; the loader validates, versions, and records changes.
 */

// ── Types ─────────────────────────────────────────────────────────

export type ConfigKey = string;
export type ConfigScope = 'GLOBAL' | 'WORLD' | 'PLAYER' | 'SYSTEM';
export type ConfigValue = string | number | boolean | bigint;

export interface ConfigEntry {
  readonly key: ConfigKey;
  readonly scope: ConfigScope;
  readonly value: ConfigValue;
  readonly lastUpdated: bigint;
  readonly version: number;
}

export interface ConfigChange {
  readonly changeId: string;
  readonly key: ConfigKey;
  readonly oldValue: ConfigValue | null;
  readonly newValue: ConfigValue;
  readonly changedAt: bigint;
}

export interface ConfigSnapshot {
  readonly snapshotId: string;
  readonly scope: ConfigScope;
  readonly entries: ReadonlyArray<ConfigEntry>;
  readonly takenAt: bigint;
}

export type ConfigError = 'key-not-found' | 'invalid-value' | 'scope-mismatch' | 'read-only';

export interface ConfigLoaderSystem {
  setConfig(
    key: ConfigKey,
    scope: ConfigScope,
    value: ConfigValue,
  ): { success: true; entry: ConfigEntry } | { success: false; error: ConfigError };
  getConfig(key: ConfigKey): ConfigEntry | undefined;
  getConfigByScope(scope: ConfigScope): ReadonlyArray<ConfigEntry>;
  markReadOnly(key: ConfigKey): { success: true } | { success: false; error: ConfigError };
  updateConfig(
    key: ConfigKey,
    value: ConfigValue,
  ): { success: true; entry: ConfigEntry } | { success: false; error: ConfigError };
  deleteConfig(key: ConfigKey): { success: true } | { success: false; error: ConfigError };
  getChangeHistory(key: ConfigKey, limit: number): ReadonlyArray<ConfigChange>;
  takeSnapshot(scope: ConfigScope): ConfigSnapshot;
  getSnapshot(snapshotId: string): ConfigSnapshot | undefined;
}

// ── Ports ─────────────────────────────────────────────────────────

interface ConfigClock {
  nowUs(): bigint;
}

interface ConfigIdGenerator {
  generate(): string;
}

interface ConfigLogger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

export interface ConfigLoaderDeps {
  readonly clock: ConfigClock;
  readonly idGen: ConfigIdGenerator;
  readonly logger: ConfigLogger;
}

// ── Internal State ────────────────────────────────────────────────

interface MutableEntry {
  key: ConfigKey;
  scope: ConfigScope;
  value: ConfigValue;
  lastUpdated: bigint;
  version: number;
  readOnly: boolean;
}

interface ConfigLoaderState {
  readonly entries: Map<ConfigKey, MutableEntry>;
  readonly history: Map<ConfigKey, ConfigChange[]>;
  readonly snapshots: Map<string, ConfigSnapshot>;
  readonly clock: ConfigClock;
  readonly idGen: ConfigIdGenerator;
  readonly logger: ConfigLogger;
}

// ── Helpers ───────────────────────────────────────────────────────

function toReadonlyEntry(e: MutableEntry): ConfigEntry {
  return {
    key: e.key,
    scope: e.scope,
    value: e.value,
    lastUpdated: e.lastUpdated,
    version: e.version,
  };
}

function recordChange(
  state: ConfigLoaderState,
  key: ConfigKey,
  oldValue: ConfigValue | null,
  newValue: ConfigValue,
): void {
  const change: ConfigChange = {
    changeId: state.idGen.generate(),
    key,
    oldValue,
    newValue,
    changedAt: state.clock.nowUs(),
  };
  const existing = state.history.get(key);
  if (existing !== undefined) {
    existing.push(change);
  } else {
    state.history.set(key, [change]);
  }
}

// ── Operations ────────────────────────────────────────────────────

function setConfigImpl(
  state: ConfigLoaderState,
  key: ConfigKey,
  scope: ConfigScope,
  value: ConfigValue,
): { success: true; entry: ConfigEntry } | { success: false; error: ConfigError } {
  const existing = state.entries.get(key);
  const now = state.clock.nowUs();
  if (existing !== undefined) {
    if (existing.readOnly) return { success: false, error: 'read-only' };
    const oldValue = existing.value;
    existing.value = value;
    existing.scope = scope;
    existing.lastUpdated = now;
    existing.version++;
    recordChange(state, key, oldValue, value);
    state.logger.debug('config updated via setConfig: ' + key);
    return { success: true, entry: toReadonlyEntry(existing) };
  }
  const entry: MutableEntry = { key, scope, value, lastUpdated: now, version: 1, readOnly: false };
  state.entries.set(key, entry);
  recordChange(state, key, null, value);
  state.logger.info('config set: ' + key + ' scope=' + scope);
  return { success: true, entry: toReadonlyEntry(entry) };
}

function updateConfigImpl(
  state: ConfigLoaderState,
  key: ConfigKey,
  value: ConfigValue,
): { success: true; entry: ConfigEntry } | { success: false; error: ConfigError } {
  const entry = state.entries.get(key);
  if (entry === undefined) return { success: false, error: 'key-not-found' };
  if (entry.readOnly) return { success: false, error: 'read-only' };
  const oldValue = entry.value;
  entry.value = value;
  entry.lastUpdated = state.clock.nowUs();
  entry.version++;
  recordChange(state, key, oldValue, value);
  state.logger.debug('config updated: ' + key + ' v' + String(entry.version));
  return { success: true, entry: toReadonlyEntry(entry) };
}

function deleteConfigImpl(
  state: ConfigLoaderState,
  key: ConfigKey,
): { success: true } | { success: false; error: ConfigError } {
  const entry = state.entries.get(key);
  if (entry === undefined) return { success: false, error: 'key-not-found' };
  if (entry.readOnly) return { success: false, error: 'read-only' };
  state.entries.delete(key);
  state.logger.info('config deleted: ' + key);
  return { success: true };
}

function markReadOnlyImpl(
  state: ConfigLoaderState,
  key: ConfigKey,
): { success: true } | { success: false; error: ConfigError } {
  const entry = state.entries.get(key);
  if (entry === undefined) return { success: false, error: 'key-not-found' };
  entry.readOnly = true;
  return { success: true };
}

function getConfigByScopeImpl(
  state: ConfigLoaderState,
  scope: ConfigScope,
): ReadonlyArray<ConfigEntry> {
  const result: ConfigEntry[] = [];
  for (const e of state.entries.values()) {
    if (e.scope === scope) result.push(toReadonlyEntry(e));
  }
  return result;
}

function getChangeHistoryImpl(
  state: ConfigLoaderState,
  key: ConfigKey,
  limit: number,
): ReadonlyArray<ConfigChange> {
  const changes = state.history.get(key) ?? [];
  if (limit <= 0) return [];
  return changes.slice(-limit);
}

function takeSnapshotImpl(state: ConfigLoaderState, scope: ConfigScope): ConfigSnapshot {
  const entries = getConfigByScopeImpl(state, scope);
  const snapshot: ConfigSnapshot = {
    snapshotId: state.idGen.generate(),
    scope,
    entries,
    takenAt: state.clock.nowUs(),
  };
  state.snapshots.set(snapshot.snapshotId, snapshot);
  state.logger.info('config snapshot taken: ' + snapshot.snapshotId + ' scope=' + scope);
  return snapshot;
}

// ── Factory ───────────────────────────────────────────────────────

export function createConfigLoaderSystem(deps: ConfigLoaderDeps): ConfigLoaderSystem {
  const state: ConfigLoaderState = {
    entries: new Map(),
    history: new Map(),
    snapshots: new Map(),
    clock: deps.clock,
    idGen: deps.idGen,
    logger: deps.logger,
  };

  return {
    setConfig: (k, s, v) => setConfigImpl(state, k, s, v),
    getConfig: (k) => {
      const e = state.entries.get(k);
      return e !== undefined ? toReadonlyEntry(e) : undefined;
    },
    getConfigByScope: (s) => getConfigByScopeImpl(state, s),
    markReadOnly: (k) => markReadOnlyImpl(state, k),
    updateConfig: (k, v) => updateConfigImpl(state, k, v),
    deleteConfig: (k) => deleteConfigImpl(state, k),
    getChangeHistory: (k, limit) => getChangeHistoryImpl(state, k, limit),
    takeSnapshot: (s) => takeSnapshotImpl(state, s),
    getSnapshot: (id) => state.snapshots.get(id),
  };
}
