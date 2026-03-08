/**
 * transit-cooldown.ts — Transit cooldown tracker.
 *
 * Enforces cooldown periods between world transits for entities.
 * Prevents rapid-fire world hopping, tracks cooldown state,
 * and supports configurable per-entity cooldown durations.
 */

// ── Ports ────────────────────────────────────────────────────────

interface CooldownClock {
  readonly nowMicroseconds: () => number;
}

interface TransitCooldownDeps {
  readonly clock: CooldownClock;
}

// ── Types ────────────────────────────────────────────────────────

interface CooldownRecord {
  readonly entityId: string;
  readonly lastTransitAt: number;
  readonly cooldownEndsAt: number;
  readonly transitCount: number;
}

interface StartCooldownParams {
  readonly entityId: string;
  readonly cooldownUs: number;
}

interface CooldownConfig {
  readonly defaultCooldownUs: number;
}

interface CooldownStats {
  readonly totalEntities: number;
  readonly entitiesOnCooldown: number;
  readonly totalTransits: number;
}

interface TransitCooldownTracker {
  readonly startCooldown: (params: StartCooldownParams) => CooldownRecord;
  readonly isOnCooldown: (entityId: string) => boolean;
  readonly getRemainingUs: (entityId: string) => number;
  readonly getRecord: (entityId: string) => CooldownRecord | undefined;
  readonly clearCooldown: (entityId: string) => boolean;
  readonly listOnCooldown: () => readonly CooldownRecord[];
  readonly getStats: () => CooldownStats;
}

// ── Constants ────────────────────────────────────────────────────

const DEFAULT_COOLDOWN_CONFIG: CooldownConfig = {
  defaultCooldownUs: 60_000_000,
};

// ── State ────────────────────────────────────────────────────────

interface MutableCooldownRecord {
  readonly entityId: string;
  lastTransitAt: number;
  cooldownEndsAt: number;
  transitCount: number;
}

interface CooldownState {
  readonly deps: TransitCooldownDeps;
  readonly config: CooldownConfig;
  readonly records: Map<string, MutableCooldownRecord>;
}

// ── Helpers ──────────────────────────────────────────────────────

function toReadonly(record: MutableCooldownRecord): CooldownRecord {
  return { ...record };
}

// ── Operations ───────────────────────────────────────────────────

function startCooldownImpl(
  state: CooldownState,
  params: StartCooldownParams,
): CooldownRecord {
  const now = state.deps.clock.nowMicroseconds();
  const existing = state.records.get(params.entityId);
  if (existing) {
    existing.lastTransitAt = now;
    existing.cooldownEndsAt = now + params.cooldownUs;
    existing.transitCount += 1;
    return toReadonly(existing);
  }
  const record: MutableCooldownRecord = {
    entityId: params.entityId,
    lastTransitAt: now,
    cooldownEndsAt: now + params.cooldownUs,
    transitCount: 1,
  };
  state.records.set(params.entityId, record);
  return toReadonly(record);
}

function isOnCooldownImpl(state: CooldownState, entityId: string): boolean {
  const record = state.records.get(entityId);
  if (!record) return false;
  return state.deps.clock.nowMicroseconds() < record.cooldownEndsAt;
}

function getRemainingImpl(state: CooldownState, entityId: string): number {
  const record = state.records.get(entityId);
  if (!record) return 0;
  const remaining = record.cooldownEndsAt - state.deps.clock.nowMicroseconds();
  return Math.max(0, remaining);
}

function clearCooldownImpl(state: CooldownState, entityId: string): boolean {
  return state.records.delete(entityId);
}

function listOnCooldownImpl(state: CooldownState): CooldownRecord[] {
  const now = state.deps.clock.nowMicroseconds();
  const result: CooldownRecord[] = [];
  for (const record of state.records.values()) {
    if (now < record.cooldownEndsAt) {
      result.push(toReadonly(record));
    }
  }
  return result;
}

function getStatsImpl(state: CooldownState): CooldownStats {
  const now = state.deps.clock.nowMicroseconds();
  let onCooldown = 0;
  let totalTransits = 0;
  for (const record of state.records.values()) {
    if (now < record.cooldownEndsAt) onCooldown += 1;
    totalTransits += record.transitCount;
  }
  return {
    totalEntities: state.records.size,
    entitiesOnCooldown: onCooldown,
    totalTransits,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createTransitCooldownTracker(
  deps: TransitCooldownDeps,
  config?: Partial<CooldownConfig>,
): TransitCooldownTracker {
  const state: CooldownState = {
    deps,
    config: { ...DEFAULT_COOLDOWN_CONFIG, ...config },
    records: new Map(),
  };
  return {
    startCooldown: (p) => startCooldownImpl(state, p),
    isOnCooldown: (id) => isOnCooldownImpl(state, id),
    getRemainingUs: (id) => getRemainingImpl(state, id),
    getRecord: (id) => {
      const r = state.records.get(id);
      return r ? toReadonly(r) : undefined;
    },
    clearCooldown: (id) => clearCooldownImpl(state, id),
    listOnCooldown: () => listOnCooldownImpl(state),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createTransitCooldownTracker, DEFAULT_COOLDOWN_CONFIG };
export type {
  TransitCooldownTracker,
  TransitCooldownDeps,
  CooldownConfig,
  CooldownRecord,
  StartCooldownParams,
  CooldownStats,
};
