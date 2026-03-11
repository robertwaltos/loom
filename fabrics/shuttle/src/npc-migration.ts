/**
 * npc-migration.ts — NPC population movement between worlds.
 *
 * Models NPC migration decisions based on economic conditions, faction
 * pressure, safety, and opportunity. Tracks migration waves and population
 * flows between worlds. Migration reasons are categorized and evaluated
 * with push-pull factor scoring.
 */

// -- Ports ────────────────────────────────────────────────────────

interface MigrationClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface MigrationIdGeneratorPort {
  readonly next: () => string;
}

interface MigrationLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
}

interface NpcMigrationDeps {
  readonly clock: MigrationClockPort;
  readonly idGenerator: MigrationIdGeneratorPort;
  readonly logger: MigrationLoggerPort;
}

// -- Types ────────────────────────────────────────────────────────

type MigrationReason = 'ECONOMIC' | 'FACTION' | 'SAFETY' | 'OPPORTUNITY' | 'FORCED';

type MigrationStatus = 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

interface MigrationRecord {
  readonly migrationId: string;
  readonly npcId: string;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly reason: MigrationReason;
  readonly status: MigrationStatus;
  readonly initiatedAt: bigint;
  readonly completedAt: bigint | undefined;
}

interface MigrationWave {
  readonly waveId: string;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly npcCount: number;
  readonly dominantReason: MigrationReason;
  readonly startedAt: bigint;
}

interface PopulationDelta {
  readonly worldId: string;
  readonly inflow: number;
  readonly outflow: number;
  readonly netChange: number;
}

interface PushPullFactors {
  readonly worldId: string;
  readonly pushScore: number;
  readonly pullScore: number;
  readonly netScore: number;
}

interface MigrationDecision {
  readonly npcId: string;
  readonly currentWorldId: string;
  readonly targetWorldId: string | undefined;
  readonly shouldMigrate: boolean;
  readonly primaryReason: MigrationReason;
  readonly confidence: number;
}

interface MigrationStats {
  readonly totalMigrations: number;
  readonly pending: number;
  readonly inTransit: number;
  readonly completed: number;
  readonly totalWaves: number;
  readonly mostActiveWorld: string | undefined;
}

type RecordMigrationError = 'duplicate_migration' | 'invalid_world';
type CompleteMigrationError = 'migration_not_found' | 'already_completed';
type EvaluateMigrationError = 'npc_not_found' | 'world_not_found';

// -- Constants ────────────────────────────────────────────────────

const WAVE_THRESHOLD = 5;
const WAVE_TIME_WINDOW_US = 3_600_000_000n;
const ECONOMIC_WEIGHT = 0.35;
const SAFETY_WEIGHT = 0.3;
const OPPORTUNITY_WEIGHT = 0.2;
const FACTION_WEIGHT = 0.15;
const MIGRATION_CONFIDENCE_THRESHOLD = 0.3;

// -- State ────────────────────────────────────────────────────────

interface MutableMigrationRecord {
  readonly migrationId: string;
  readonly npcId: string;
  readonly fromWorldId: string;
  readonly toWorldId: string;
  readonly reason: MigrationReason;
  status: MigrationStatus;
  readonly initiatedAt: bigint;
  completedAt: bigint | undefined;
}

interface NpcMigrationState {
  readonly deps: NpcMigrationDeps;
  readonly migrations: Map<string, MutableMigrationRecord>;
  readonly npcMigrations: Map<string, string>;
  readonly worldPopulation: Map<string, number>;
  readonly waves: MigrationWave[];
}

// -- Helpers ──────────────────────────────────────────────────────

function toMigrationRecord(m: MutableMigrationRecord): MigrationRecord {
  return {
    migrationId: m.migrationId,
    npcId: m.npcId,
    fromWorldId: m.fromWorldId,
    toWorldId: m.toWorldId,
    reason: m.reason,
    status: m.status,
    initiatedAt: m.initiatedAt,
    completedAt: m.completedAt,
  };
}

function getPopulation(state: NpcMigrationState, worldId: string): number {
  return state.worldPopulation.get(worldId) ?? 0;
}

function adjustPopulation(state: NpcMigrationState, worldId: string, delta: number): void {
  const current = getPopulation(state, worldId);
  const next = Math.max(0, current + delta);
  state.worldPopulation.set(worldId, next);
}

function countMigrationsByStatus(state: NpcMigrationState, status: MigrationStatus): number {
  let count = 0;
  for (const m of state.migrations.values()) {
    if (m.status === status) count++;
  }
  return count;
}

function findRecentWave(
  state: NpcMigrationState,
  fromWorldId: string,
  toWorldId: string,
  now: bigint,
): MigrationWave | undefined {
  const cutoff = now - WAVE_TIME_WINDOW_US;
  for (const w of state.waves) {
    if (w.fromWorldId !== fromWorldId) continue;
    if (w.toWorldId !== toWorldId) continue;
    if (w.startedAt < cutoff) continue;
    return w;
  }
  return undefined;
}

function countRecentMigrations(
  state: NpcMigrationState,
  fromWorldId: string,
  toWorldId: string,
  now: bigint,
): number {
  const cutoff = now - WAVE_TIME_WINDOW_US;
  let count = 0;
  for (const m of state.migrations.values()) {
    if (m.fromWorldId !== fromWorldId) continue;
    if (m.toWorldId !== toWorldId) continue;
    if (m.initiatedAt < cutoff) continue;
    count++;
  }
  return count;
}

function determineDominantReason(
  state: NpcMigrationState,
  fromWorldId: string,
  toWorldId: string,
  now: bigint,
): MigrationReason {
  const cutoff = now - WAVE_TIME_WINDOW_US;
  const counts: Record<MigrationReason, number> = {
    ECONOMIC: 0,
    FACTION: 0,
    SAFETY: 0,
    OPPORTUNITY: 0,
    FORCED: 0,
  };
  for (const m of state.migrations.values()) {
    if (m.fromWorldId !== fromWorldId) continue;
    if (m.toWorldId !== toWorldId) continue;
    if (m.initiatedAt < cutoff) continue;
    counts[m.reason]++;
  }
  return findMaxReason(counts);
}

function findMaxReason(counts: Record<MigrationReason, number>): MigrationReason {
  let max = 0;
  let reason: MigrationReason = 'ECONOMIC';
  for (const r of Object.keys(counts) as MigrationReason[]) {
    if (counts[r] > max) {
      max = counts[r];
      reason = r;
    }
  }
  return reason;
}

function createWave(
  state: NpcMigrationState,
  fromWorldId: string,
  toWorldId: string,
  count: number,
  reason: MigrationReason,
  now: bigint,
): MigrationWave {
  const wave: MigrationWave = {
    waveId: state.deps.idGenerator.next(),
    fromWorldId,
    toWorldId,
    npcCount: count,
    dominantReason: reason,
    startedAt: now,
  };
  state.waves.push(wave);
  state.deps.logger.info('migration wave detected', {
    waveId: wave.waveId,
    from: fromWorldId,
    to: toWorldId,
    count,
    reason,
  });
  return wave;
}

function findMostActiveWorld(state: NpcMigrationState): string | undefined {
  const activity = new Map<string, number>();
  for (const m of state.migrations.values()) {
    const from = activity.get(m.fromWorldId) ?? 0;
    const to = activity.get(m.toWorldId) ?? 0;
    activity.set(m.fromWorldId, from + 1);
    activity.set(m.toWorldId, to + 1);
  }
  let max = 0;
  let worldId: string | undefined = undefined;
  for (const [wid, count] of activity.entries()) {
    if (count > max) {
      max = count;
      worldId = wid;
    }
  }
  return worldId;
}

function computeNetScore(
  push: number,
  pull: number,
  _economicFactor: number,
  _safetyFactor: number,
  _opportunityFactor: number,
  _factionFactor: number,
): number {
  return pull - push;
}

// -- Operations ───────────────────────────────────────────────────

function recordMigrationImpl(
  state: NpcMigrationState,
  npcId: string,
  fromWorldId: string,
  toWorldId: string,
  reason: MigrationReason,
): MigrationRecord | RecordMigrationError {
  if (state.npcMigrations.has(npcId)) {
    return 'duplicate_migration';
  }
  if (fromWorldId === toWorldId) {
    return 'invalid_world';
  }
  const now = state.deps.clock.nowMicroseconds();
  const migrationId = state.deps.idGenerator.next();
  const record: MutableMigrationRecord = {
    migrationId,
    npcId,
    fromWorldId,
    toWorldId,
    reason,
    status: 'PENDING',
    initiatedAt: now,
    completedAt: undefined,
  };
  state.migrations.set(migrationId, record);
  state.npcMigrations.set(npcId, migrationId);
  checkForWave(state, fromWorldId, toWorldId, now);
  return toMigrationRecord(record);
}

function checkForWave(
  state: NpcMigrationState,
  fromWorldId: string,
  toWorldId: string,
  now: bigint,
): void {
  const existing = findRecentWave(state, fromWorldId, toWorldId, now);
  if (existing) return;
  const count = countRecentMigrations(state, fromWorldId, toWorldId, now);
  if (count < WAVE_THRESHOLD) return;
  const reason = determineDominantReason(state, fromWorldId, toWorldId, now);
  createWave(state, fromWorldId, toWorldId, count, reason, now);
}

function startTransitImpl(state: NpcMigrationState, migrationId: string): MigrationRecord | string {
  const migration = state.migrations.get(migrationId);
  if (!migration) return 'migration_not_found';
  if (migration.status !== 'PENDING') {
    return 'not_pending';
  }
  migration.status = 'IN_TRANSIT';
  adjustPopulation(state, migration.fromWorldId, -1);
  return toMigrationRecord(migration);
}

function completeMigrationImpl(
  state: NpcMigrationState,
  migrationId: string,
): MigrationRecord | CompleteMigrationError {
  const migration = state.migrations.get(migrationId);
  if (!migration) return 'migration_not_found';
  if (migration.completedAt !== undefined) {
    return 'already_completed';
  }
  migration.status = 'COMPLETED';
  migration.completedAt = state.deps.clock.nowMicroseconds();
  adjustPopulation(state, migration.toWorldId, 1);
  state.npcMigrations.delete(migration.npcId);
  return toMigrationRecord(migration);
}

function cancelMigrationImpl(
  state: NpcMigrationState,
  migrationId: string,
): MigrationRecord | string {
  const migration = state.migrations.get(migrationId);
  if (!migration) return 'migration_not_found';
  if (migration.status === 'COMPLETED') {
    return 'already_completed';
  }
  if (migration.status === 'IN_TRANSIT') {
    adjustPopulation(state, migration.fromWorldId, 1);
  }
  migration.status = 'CANCELLED';
  state.npcMigrations.delete(migration.npcId);
  return toMigrationRecord(migration);
}

function evaluateMigrationImpl(
  state: NpcMigrationState,
  npcId: string,
  currentWorldId: string,
  targetWorldId: string,
  economicFactor: number,
  safetyFactor: number,
  opportunityFactor: number,
  factionFactor: number,
): MigrationDecision {
  const pushScore = 1 - economicFactor;
  const pullScore = safetyFactor + opportunityFactor + factionFactor;
  const netScore = computeNetScore(
    pushScore,
    pullScore,
    economicFactor,
    safetyFactor,
    opportunityFactor,
    factionFactor,
  );
  const shouldMigrate = netScore > 0 && netScore >= MIGRATION_CONFIDENCE_THRESHOLD;
  const primaryReason = selectPrimaryReason(
    economicFactor,
    safetyFactor,
    opportunityFactor,
    factionFactor,
  );
  return {
    npcId,
    currentWorldId,
    targetWorldId: shouldMigrate ? targetWorldId : undefined,
    shouldMigrate,
    primaryReason,
    confidence: Math.min(1, Math.max(0, netScore)),
  };
}

function selectPrimaryReason(
  economic: number,
  safety: number,
  opportunity: number,
  faction: number,
): MigrationReason {
  const scores = [
    { reason: 'ECONOMIC' as MigrationReason, score: economic },
    { reason: 'SAFETY' as MigrationReason, score: safety },
    { reason: 'OPPORTUNITY' as MigrationReason, score: opportunity },
    { reason: 'FACTION' as MigrationReason, score: faction },
  ];
  let max = scores[0];
  for (const s of scores) {
    if (max === undefined || s.score > max.score) {
      max = s;
    }
  }
  return max !== undefined ? max.reason : 'ECONOMIC';
}

function getMigrationWavesImpl(
  state: NpcMigrationState,
  worldId: string | undefined,
): readonly MigrationWave[] {
  if (worldId === undefined) return [...state.waves];
  return state.waves.filter((w) => {
    return w.fromWorldId === worldId || w.toWorldId === worldId;
  });
}

function getPopulationFlowImpl(state: NpcMigrationState, worldId: string): PopulationDelta {
  let inflow = 0;
  let outflow = 0;
  for (const m of state.migrations.values()) {
    if (m.status !== 'COMPLETED') continue;
    if (m.toWorldId === worldId) inflow++;
    if (m.fromWorldId === worldId) outflow++;
  }
  return {
    worldId,
    inflow,
    outflow,
    netChange: inflow - outflow,
  };
}

function computePushPullFactorsImpl(
  state: NpcMigrationState,
  worldId: string,
  economicScore: number,
  safetyScore: number,
  opportunityScore: number,
): PushPullFactors {
  const pushScore = 1 - economicScore;
  const pullScore = safetyScore + opportunityScore;
  const netScore = pullScore - pushScore;
  return {
    worldId,
    pushScore,
    pullScore,
    netScore,
  };
}

function getMigrationRecordImpl(
  state: NpcMigrationState,
  migrationId: string,
): MigrationRecord | undefined {
  const m = state.migrations.get(migrationId);
  return m ? toMigrationRecord(m) : undefined;
}

function getMigrationsByNpcImpl(
  state: NpcMigrationState,
  npcId: string,
): readonly MigrationRecord[] {
  const result: MigrationRecord[] = [];
  for (const m of state.migrations.values()) {
    if (m.npcId === npcId) {
      result.push(toMigrationRecord(m));
    }
  }
  return result;
}

function getMigrationStatsImpl(state: NpcMigrationState): MigrationStats {
  return {
    totalMigrations: state.migrations.size,
    pending: countMigrationsByStatus(state, 'PENDING'),
    inTransit: countMigrationsByStatus(state, 'IN_TRANSIT'),
    completed: countMigrationsByStatus(state, 'COMPLETED'),
    totalWaves: state.waves.length,
    mostActiveWorld: findMostActiveWorld(state),
  };
}

// -- Public API ───────────────────────────────────────────────────

interface NpcMigrationSystem {
  readonly recordMigration: (
    npcId: string,
    fromWorldId: string,
    toWorldId: string,
    reason: MigrationReason,
  ) => MigrationRecord | RecordMigrationError;
  readonly startTransit: (migrationId: string) => MigrationRecord | string;
  readonly completeMigration: (migrationId: string) => MigrationRecord | CompleteMigrationError;
  readonly cancelMigration: (migrationId: string) => MigrationRecord | string;
  readonly evaluateMigration: (
    npcId: string,
    currentWorldId: string,
    targetWorldId: string,
    economicFactor: number,
    safetyFactor: number,
    opportunityFactor: number,
    factionFactor: number,
  ) => MigrationDecision;
  readonly getMigrationWaves: (worldId: string | undefined) => readonly MigrationWave[];
  readonly getPopulationFlow: (worldId: string) => PopulationDelta;
  readonly computePushPullFactors: (
    worldId: string,
    economicScore: number,
    safetyScore: number,
    opportunityScore: number,
  ) => PushPullFactors;
  readonly getMigrationRecord: (migrationId: string) => MigrationRecord | undefined;
  readonly getMigrationsByNpc: (npcId: string) => readonly MigrationRecord[];
  readonly getStats: () => MigrationStats;
}

// -- Factory ──────────────────────────────────────────────────────

function createNpcMigrationSystem(deps: NpcMigrationDeps): NpcMigrationSystem {
  const state: NpcMigrationState = {
    deps,
    migrations: new Map(),
    npcMigrations: new Map(),
    worldPopulation: new Map(),
    waves: [],
  };
  return {
    recordMigration: (npc, from, to, reason) => recordMigrationImpl(state, npc, from, to, reason),
    startTransit: (mid) => startTransitImpl(state, mid),
    completeMigration: (mid) => completeMigrationImpl(state, mid),
    cancelMigration: (mid) => cancelMigrationImpl(state, mid),
    evaluateMigration: (npc, cur, tgt, econ, safe, opp, fact) =>
      evaluateMigrationImpl(state, npc, cur, tgt, econ, safe, opp, fact),
    getMigrationWaves: (wid) => getMigrationWavesImpl(state, wid),
    getPopulationFlow: (wid) => getPopulationFlowImpl(state, wid),
    computePushPullFactors: (wid, econ, safe, opp) =>
      computePushPullFactorsImpl(state, wid, econ, safe, opp),
    getMigrationRecord: (mid) => getMigrationRecordImpl(state, mid),
    getMigrationsByNpc: (npc) => getMigrationsByNpcImpl(state, npc),
    getStats: () => getMigrationStatsImpl(state),
  };
}

// -- Exports ──────────────────────────────────────────────────────

export { createNpcMigrationSystem };
export {
  WAVE_THRESHOLD,
  WAVE_TIME_WINDOW_US,
  ECONOMIC_WEIGHT,
  SAFETY_WEIGHT,
  OPPORTUNITY_WEIGHT,
  FACTION_WEIGHT,
  MIGRATION_CONFIDENCE_THRESHOLD,
};
export type {
  NpcMigrationSystem,
  NpcMigrationDeps,
  MigrationReason,
  MigrationStatus,
  MigrationRecord,
  MigrationWave,
  PopulationDelta,
  PushPullFactors,
  MigrationDecision,
  MigrationStats,
  RecordMigrationError,
  CompleteMigrationError,
  EvaluateMigrationError,
};
