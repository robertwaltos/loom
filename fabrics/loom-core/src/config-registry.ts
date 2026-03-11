/**
 * config-registry.ts — Typed configuration registry.
 *
 * Stores runtime configuration values by namespace and key.
 * Supports typed getters (string, number, boolean), defaults,
 * bulk loading, and change tracking. Configurations are
 * hierarchical: namespace.key format.
 */

// ── Types ────────────────────────────────────────────────────────

interface ConfigEntry {
  readonly namespace: string;
  readonly key: string;
  readonly value: string;
  readonly setAt: number;
}

interface SetConfigParams {
  readonly namespace: string;
  readonly key: string;
  readonly value: string;
}

interface ConfigStats {
  readonly totalEntries: number;
  readonly namespaces: number;
  readonly totalSets: number;
}

// ── Ports ────────────────────────────────────────────────────────

interface ConfigClock {
  readonly nowMicroseconds: () => number;
}

// ── Public API ───────────────────────────────────────────────────

interface ConfigRegistry {
  readonly set: (params: SetConfigParams) => ConfigEntry;
  readonly get: (namespace: string, key: string) => string | undefined;
  readonly getNumber: (namespace: string, key: string) => number | undefined;
  readonly getBoolean: (namespace: string, key: string) => boolean | undefined;
  readonly getOrDefault: (namespace: string, key: string, defaultValue: string) => string;
  readonly has: (namespace: string, key: string) => boolean;
  readonly remove: (namespace: string, key: string) => boolean;
  readonly listNamespace: (namespace: string) => readonly ConfigEntry[];
  readonly loadBulk: (entries: readonly SetConfigParams[]) => number;
  readonly getStats: () => ConfigStats;
}

interface ConfigRegistryDeps {
  readonly clock: ConfigClock;
}

// ── State ────────────────────────────────────────────────────────

interface ConfigState {
  readonly entries: Map<string, MutableEntry>;
  readonly deps: ConfigRegistryDeps;
  totalSets: number;
}

interface MutableEntry {
  readonly namespace: string;
  readonly key: string;
  value: string;
  setAt: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function composeKey(namespace: string, key: string): string {
  return namespace + '.' + key;
}

function toEntry(e: MutableEntry): ConfigEntry {
  return { ...e };
}

// ── Operations ───────────────────────────────────────────────────

function setImpl(state: ConfigState, params: SetConfigParams): ConfigEntry {
  const ck = composeKey(params.namespace, params.key);
  const now = state.deps.clock.nowMicroseconds();
  const existing = state.entries.get(ck);
  if (existing) {
    existing.value = params.value;
    existing.setAt = now;
    state.totalSets++;
    return toEntry(existing);
  }
  const entry: MutableEntry = {
    namespace: params.namespace,
    key: params.key,
    value: params.value,
    setAt: now,
  };
  state.entries.set(ck, entry);
  state.totalSets++;
  return toEntry(entry);
}

function getImpl(state: ConfigState, namespace: string, key: string): string | undefined {
  return state.entries.get(composeKey(namespace, key))?.value;
}

function getNumberImpl(state: ConfigState, namespace: string, key: string): number | undefined {
  const val = getImpl(state, namespace, key);
  if (val === undefined) return undefined;
  const num = Number(val);
  return Number.isNaN(num) ? undefined : num;
}

function getBooleanImpl(state: ConfigState, namespace: string, key: string): boolean | undefined {
  const val = getImpl(state, namespace, key);
  if (val === 'true') return true;
  if (val === 'false') return false;
  return undefined;
}

function removeImpl(state: ConfigState, namespace: string, key: string): boolean {
  return state.entries.delete(composeKey(namespace, key));
}

function listNamespaceImpl(state: ConfigState, namespace: string): readonly ConfigEntry[] {
  const results: ConfigEntry[] = [];
  for (const entry of state.entries.values()) {
    if (entry.namespace === namespace) results.push(toEntry(entry));
  }
  return results;
}

function loadBulkImpl(state: ConfigState, entries: readonly SetConfigParams[]): number {
  let count = 0;
  for (const params of entries) {
    setImpl(state, params);
    count++;
  }
  return count;
}

function getStatsImpl(state: ConfigState): ConfigStats {
  const namespaces = new Set<string>();
  for (const e of state.entries.values()) {
    namespaces.add(e.namespace);
  }
  return {
    totalEntries: state.entries.size,
    namespaces: namespaces.size,
    totalSets: state.totalSets,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createConfigRegistry(deps: ConfigRegistryDeps): ConfigRegistry {
  const state: ConfigState = {
    entries: new Map(),
    deps,
    totalSets: 0,
  };
  return {
    set: (p) => setImpl(state, p),
    get: (ns, k) => getImpl(state, ns, k),
    getNumber: (ns, k) => getNumberImpl(state, ns, k),
    getBoolean: (ns, k) => getBooleanImpl(state, ns, k),
    getOrDefault: (ns, k, d) => getImpl(state, ns, k) ?? d,
    has: (ns, k) => state.entries.has(composeKey(ns, k)),
    remove: (ns, k) => removeImpl(state, ns, k),
    listNamespace: (ns) => listNamespaceImpl(state, ns),
    loadBulk: (entries) => loadBulkImpl(state, entries),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createConfigRegistry };
export type { ConfigRegistry, ConfigRegistryDeps, ConfigEntry, SetConfigParams, ConfigStats };
