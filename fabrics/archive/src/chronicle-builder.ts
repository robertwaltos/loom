/**
 * chronicle-builder.ts -- World history compilation and era tracking.
 *
 * Manages per-world timelines with era declarations, milestone
 * recording, chronological entry tracking, and summary generation.
 *
 * "Each world writes its own story. The Chronicle Builder
 *  binds them into volumes the Loom can read."
 */

// -- Ports ----------------------------------------------------------------

interface ChronicleClock {
  readonly nowMicroseconds: () => number;
}

interface ChronicleIdGenerator {
  readonly generate: () => string;
}

interface ChronicleDeps {
  readonly clock: ChronicleClock;
  readonly idGenerator: ChronicleIdGenerator;
}

// -- Types ----------------------------------------------------------------

type EraType = 'founding' | 'expansion' | 'conflict' | 'golden_age' | 'decline' | 'renaissance';

type MilestoneType =
  | 'first_settlement'
  | 'population_threshold'
  | 'technology_breakthrough'
  | 'diplomatic_achievement'
  | 'military_victory'
  | 'cultural_landmark'
  | 'economic_milestone'
  | 'catastrophe_survived';

interface ChronicleEntry {
  readonly entryId: string;
  readonly worldId: string;
  readonly content: string;
  readonly recordedAt: number;
  readonly eraId: string | null;
  readonly isMilestone: boolean;
  readonly milestoneType: MilestoneType | null;
  readonly tags: ReadonlyArray<string>;
}

interface Era {
  readonly eraId: string;
  readonly worldId: string;
  readonly eraType: EraType;
  readonly name: string;
  readonly startedAt: number;
  readonly endedAt: number | null;
  readonly endReason: string | null;
  readonly entryCount: number;
}

interface ChronicleTimeline {
  readonly worldId: string;
  readonly createdAt: number;
  readonly entryCount: number;
  readonly eraCount: number;
  readonly currentEraId: string | null;
}

interface AddEntryParams {
  readonly content: string;
  readonly tags?: ReadonlyArray<string>;
}

interface DeclareEraParams {
  readonly eraType: EraType;
  readonly name: string;
}

interface ChronicleQuery {
  readonly eraId?: string;
  readonly fromTime?: number;
  readonly toTime?: number;
  readonly milestoneOnly?: boolean;
  readonly tag?: string;
}

interface ChronicleStats {
  readonly totalWorlds: number;
  readonly totalEntries: number;
  readonly totalEras: number;
  readonly totalMilestones: number;
}

// -- Constants ------------------------------------------------------------

const MAX_ENTRIES_PER_WORLD = 10_000;
const ERA_MINIMUM_DURATION_US = 60_000_000;

// -- State ----------------------------------------------------------------

interface WorldState {
  readonly entries: ChronicleEntry[];
  readonly eras: Era[];
  currentEraId: string | null;
  readonly createdAt: number;
  milestoneCount: number;
}

interface BuilderState {
  readonly deps: ChronicleDeps;
  readonly worlds: Map<string, WorldState>;
}

// -- Public Interface -----------------------------------------------------

interface ChronicleBuilder {
  readonly createChronicle: (worldId: string) => ChronicleTimeline;
  readonly addEntry: (worldId: string, params: AddEntryParams) => ChronicleEntry;
  readonly declareEra: (worldId: string, params: DeclareEraParams) => Era | string;
  readonly endCurrentEra: (worldId: string, reason: string) => Era | string;
  readonly recordMilestone: (
    worldId: string,
    milestone: MilestoneType,
    description: string,
  ) => ChronicleEntry;
  readonly query: (worldId: string, q: ChronicleQuery) => ReadonlyArray<ChronicleEntry>;
  readonly getCurrentEra: (worldId: string) => Era | undefined;
  readonly getTimeline: (worldId: string) => ChronicleTimeline | undefined;
  readonly getEraHistory: (worldId: string) => ReadonlyArray<Era>;
  readonly generateSummary: (worldId: string, fromUs: number, toUs: number) => string;
  readonly getStats: () => ChronicleStats;
}

// -- Factory --------------------------------------------------------------

function createChronicleBuilder(deps: ChronicleDeps): ChronicleBuilder {
  const state: BuilderState = {
    deps,
    worlds: new Map(),
  };

  return {
    createChronicle: (worldId) => createChronicleImpl(state, worldId),
    addEntry: (worldId, params) => addEntryImpl(state, worldId, params),
    declareEra: (worldId, params) => declareEraImpl(state, worldId, params),
    endCurrentEra: (worldId, reason) => endCurrentEraImpl(state, worldId, reason),
    recordMilestone: (worldId, m, d) => recordMilestoneImpl(state, worldId, m, d),
    query: (worldId, q) => queryImpl(state, worldId, q),
    getCurrentEra: (worldId) => getCurrentEraImpl(state, worldId),
    getTimeline: (worldId) => getTimelineImpl(state, worldId),
    getEraHistory: (worldId) => getEraHistoryImpl(state, worldId),
    generateSummary: (worldId, f, t) => generateSummaryImpl(state, worldId, f, t),
    getStats: () => getStatsImpl(state),
  };
}

// -- Create Chronicle -----------------------------------------------------

function createChronicleImpl(state: BuilderState, worldId: string): ChronicleTimeline {
  const existing = state.worlds.get(worldId);
  if (existing !== undefined) {
    return buildTimeline(worldId, existing);
  }

  const now = state.deps.clock.nowMicroseconds();
  const worldState: WorldState = {
    entries: [],
    eras: [],
    currentEraId: null,
    createdAt: now,
    milestoneCount: 0,
  };

  state.worlds.set(worldId, worldState);
  return buildTimeline(worldId, worldState);
}

// -- Add Entry ------------------------------------------------------------

function addEntryImpl(
  state: BuilderState,
  worldId: string,
  params: AddEntryParams,
): ChronicleEntry {
  const world = getOrCreateWorld(state, worldId);
  return appendEntry(state, world, worldId, params.content, false, null, params.tags ?? []);
}

function appendEntry(
  state: BuilderState,
  world: WorldState,
  worldId: string,
  content: string,
  isMilestone: boolean,
  milestoneType: MilestoneType | null,
  tags: ReadonlyArray<string>,
): ChronicleEntry {
  if (world.entries.length >= MAX_ENTRIES_PER_WORLD) {
    world.entries.splice(0, 1);
  }

  const entry: ChronicleEntry = {
    entryId: state.deps.idGenerator.generate(),
    worldId,
    content,
    recordedAt: state.deps.clock.nowMicroseconds(),
    eraId: world.currentEraId,
    isMilestone,
    milestoneType,
    tags,
  };

  world.entries.push(entry);
  if (isMilestone) {
    world.milestoneCount++;
  }
  incrementEraEntryCount(world);
  return entry;
}

function incrementEraEntryCount(world: WorldState): void {
  if (world.currentEraId === null) return;
  const era = world.eras.find((e) => e.eraId === world.currentEraId);
  if (era === undefined) return;
  const mutable = era as { entryCount: number };
  mutable.entryCount++;
}

// -- Declare Era ----------------------------------------------------------

function declareEraImpl(
  state: BuilderState,
  worldId: string,
  params: DeclareEraParams,
): Era | string {
  const world = getOrCreateWorld(state, worldId);

  if (world.currentEraId !== null) {
    return 'era_already_active';
  }

  const now = state.deps.clock.nowMicroseconds();
  const era: Era = {
    eraId: state.deps.idGenerator.generate(),
    worldId,
    eraType: params.eraType,
    name: params.name,
    startedAt: now,
    endedAt: null,
    endReason: null,
    entryCount: 0,
  };

  world.eras.push(era);
  world.currentEraId = era.eraId;
  return era;
}

// -- End Current Era ------------------------------------------------------

function endCurrentEraImpl(state: BuilderState, worldId: string, reason: string): Era | string {
  const world = state.worlds.get(worldId);
  if (world === undefined) return 'world_not_found';
  if (world.currentEraId === null) return 'no_active_era';

  const eraIndex = world.eras.findIndex((e) => e.eraId === world.currentEraId);
  if (eraIndex === -1) return 'no_active_era';

  const current = world.eras[eraIndex];
  if (current === undefined) return 'no_active_era';

  const now = state.deps.clock.nowMicroseconds();
  if (now - current.startedAt < ERA_MINIMUM_DURATION_US) {
    return 'era_too_short';
  }

  const ended = buildEndedEra(current, now, reason);
  world.eras[eraIndex] = ended;
  world.currentEraId = null;
  return ended;
}

function buildEndedEra(current: Era, endedAt: number, reason: string): Era {
  return {
    eraId: current.eraId,
    worldId: current.worldId,
    eraType: current.eraType,
    name: current.name,
    startedAt: current.startedAt,
    endedAt,
    endReason: reason,
    entryCount: current.entryCount,
  };
}

// -- Record Milestone -----------------------------------------------------

function recordMilestoneImpl(
  state: BuilderState,
  worldId: string,
  milestone: MilestoneType,
  description: string,
): ChronicleEntry {
  const world = getOrCreateWorld(state, worldId);
  return appendEntry(state, world, worldId, description, true, milestone, ['milestone']);
}

// -- Query ----------------------------------------------------------------

function queryImpl(
  state: BuilderState,
  worldId: string,
  q: ChronicleQuery,
): ReadonlyArray<ChronicleEntry> {
  const world = state.worlds.get(worldId);
  if (world === undefined) return [];
  return world.entries.filter((entry) => matchesQuery(entry, q));
}

function matchesQuery(entry: ChronicleEntry, q: ChronicleQuery): boolean {
  if (q.eraId !== undefined && entry.eraId !== q.eraId) return false;
  if (q.fromTime !== undefined && entry.recordedAt < q.fromTime) return false;
  if (q.toTime !== undefined && entry.recordedAt > q.toTime) return false;
  if (q.milestoneOnly === true && !entry.isMilestone) return false;
  if (q.tag !== undefined && !entry.tags.includes(q.tag)) return false;
  return true;
}

// -- Get Current Era ------------------------------------------------------

function getCurrentEraImpl(state: BuilderState, worldId: string): Era | undefined {
  const world = state.worlds.get(worldId);
  if (world === undefined) return undefined;
  if (world.currentEraId === null) return undefined;
  return world.eras.find((e) => e.eraId === world.currentEraId);
}

// -- Get Timeline ---------------------------------------------------------

function getTimelineImpl(state: BuilderState, worldId: string): ChronicleTimeline | undefined {
  const world = state.worlds.get(worldId);
  if (world === undefined) return undefined;
  return buildTimeline(worldId, world);
}

function buildTimeline(worldId: string, world: WorldState): ChronicleTimeline {
  return {
    worldId,
    createdAt: world.createdAt,
    entryCount: world.entries.length,
    eraCount: world.eras.length,
    currentEraId: world.currentEraId,
  };
}

// -- Get Era History ------------------------------------------------------

function getEraHistoryImpl(state: BuilderState, worldId: string): ReadonlyArray<Era> {
  const world = state.worlds.get(worldId);
  if (world === undefined) return [];
  return [...world.eras];
}

// -- Generate Summary -----------------------------------------------------

function generateSummaryImpl(
  state: BuilderState,
  worldId: string,
  fromUs: number,
  toUs: number,
): string {
  const world = state.worlds.get(worldId);
  if (world === undefined) return 'No chronicle found for world ' + worldId;

  const entries = world.entries.filter((e) => e.recordedAt >= fromUs && e.recordedAt <= toUs);
  const milestones = entries.filter((e) => e.isMilestone);
  const erasInRange = findErasInRange(world, fromUs, toUs);

  const parts: string[] = [];
  parts.push('Chronicle Summary for ' + worldId);
  parts.push('Period: ' + String(fromUs) + ' - ' + String(toUs));
  parts.push('Entries: ' + String(entries.length));
  parts.push('Milestones: ' + String(milestones.length));
  parts.push('Eras: ' + String(erasInRange.length));

  for (const era of erasInRange) {
    parts.push('Era: ' + era.name + ' (' + era.eraType + ')');
  }

  for (const ms of milestones) {
    parts.push('Milestone: ' + String(ms.milestoneType) + ' - ' + ms.content);
  }

  return parts.join('\n');
}

function findErasInRange(world: WorldState, fromUs: number, toUs: number): ReadonlyArray<Era> {
  return world.eras.filter((era) => {
    if (era.endedAt !== null && era.endedAt < fromUs) return false;
    if (era.startedAt > toUs) return false;
    return true;
  });
}

// -- Stats ----------------------------------------------------------------

function getStatsImpl(state: BuilderState): ChronicleStats {
  let totalEntries = 0;
  let totalEras = 0;
  let totalMilestones = 0;

  for (const world of state.worlds.values()) {
    totalEntries += world.entries.length;
    totalEras += world.eras.length;
    totalMilestones += world.milestoneCount;
  }

  return {
    totalWorlds: state.worlds.size,
    totalEntries,
    totalEras,
    totalMilestones,
  };
}

// -- Helpers --------------------------------------------------------------

function getOrCreateWorld(state: BuilderState, worldId: string): WorldState {
  const existing = state.worlds.get(worldId);
  if (existing !== undefined) return existing;

  const now = state.deps.clock.nowMicroseconds();
  const worldState: WorldState = {
    entries: [],
    eras: [],
    currentEraId: null,
    createdAt: now,
    milestoneCount: 0,
  };
  state.worlds.set(worldId, worldState);
  return worldState;
}

// -- Exports --------------------------------------------------------------

export { createChronicleBuilder, MAX_ENTRIES_PER_WORLD, ERA_MINIMUM_DURATION_US };
export type {
  ChronicleBuilder,
  ChronicleDeps,
  ChronicleClock,
  ChronicleIdGenerator,
  EraType,
  MilestoneType,
  ChronicleEntry,
  Era,
  ChronicleTimeline,
  AddEntryParams,
  DeclareEraParams,
  ChronicleQuery,
  ChronicleStats,
};
