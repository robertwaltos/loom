/**
 * world-history.ts -- Per-world event log and discovery records.
 *
 * Records significant events (battles, treaties, discoveries) for
 * each world, tracks discovery records with discoverers and
 * coordinates, supports significance-based filtering, and
 * provides per-world statistics.
 *
 * "What happened on each world is not just data.
 *  It is the soil from which all futures grow."
 */

// -- Ports ----------------------------------------------------------------

interface WorldHistoryClock {
  readonly nowMicroseconds: () => number;
}

interface WorldHistoryIdGenerator {
  readonly generate: () => string;
}

interface WorldHistoryDeps {
  readonly clock: WorldHistoryClock;
  readonly idGenerator: WorldHistoryIdGenerator;
}

// -- Types ----------------------------------------------------------------

type HistoryEventType =
  | 'DISCOVERY'
  | 'BATTLE'
  | 'TREATY'
  | 'FOUNDING'
  | 'CATASTROPHE'
  | 'MIGRATION'
  | 'INNOVATION';

type SignificanceLevel = 'minor' | 'notable' | 'major' | 'legendary';

interface HistoryEvent {
  readonly eventId: string;
  readonly worldId: string;
  readonly eventType: HistoryEventType;
  readonly title: string;
  readonly description: string;
  readonly significance: SignificanceLevel;
  readonly occurredAt: number;
  readonly recordedAt: number;
  readonly participants: ReadonlyArray<string>;
  readonly locationId: string | null;
  readonly sequenceNumber: number;
}

interface RecordEventParams {
  readonly eventType: HistoryEventType;
  readonly title: string;
  readonly description: string;
  readonly significance: SignificanceLevel;
  readonly participants?: ReadonlyArray<string>;
  readonly locationId?: string;
}

interface DiscoveryRecord {
  readonly discoveryId: string;
  readonly worldId: string;
  readonly discovererIds: ReadonlyArray<string>;
  readonly title: string;
  readonly description: string;
  readonly significance: SignificanceLevel;
  readonly discoveredAt: number;
  readonly recordedAt: number;
  readonly coordinates: DiscoveryCoordinates | null;
  readonly category: DiscoveryCategory;
}

type DiscoveryCategory =
  | 'terrain'
  | 'resource'
  | 'species'
  | 'artifact'
  | 'phenomenon'
  | 'structure';

interface DiscoveryCoordinates {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

interface RecordDiscoveryParams {
  readonly discovererIds: ReadonlyArray<string>;
  readonly title: string;
  readonly description: string;
  readonly significance: SignificanceLevel;
  readonly coordinates?: DiscoveryCoordinates;
  readonly category: DiscoveryCategory;
}

interface HistoryQuery {
  readonly eventType?: HistoryEventType;
  readonly fromTime?: number;
  readonly toTime?: number;
  readonly significance?: SignificanceLevel;
  readonly participantId?: string;
  readonly locationId?: string;
}

interface WorldHistoryStats {
  readonly totalWorlds: number;
  readonly totalEvents: number;
  readonly totalDiscoveries: number;
  readonly eventsByType: Readonly<Record<HistoryEventType, number>>;
}

// -- Constants ------------------------------------------------------------

const MAX_EVENTS_PER_WORLD = 50_000;

const SIGNIFICANCE_WEIGHTS: Readonly<Record<SignificanceLevel, number>> = {
  minor: 1,
  notable: 3,
  major: 7,
  legendary: 15,
};

// -- State ----------------------------------------------------------------

interface PerWorldState {
  readonly events: HistoryEvent[];
  readonly discoveries: DiscoveryRecord[];
  nextSequence: number;
}

interface HistoryState {
  readonly deps: WorldHistoryDeps;
  readonly worlds: Map<string, PerWorldState>;
}

// -- Public Interface -----------------------------------------------------

interface WorldHistory {
  readonly initializeWorld: (worldId: string) => void;
  readonly recordEvent: (worldId: string, params: RecordEventParams) => HistoryEvent;
  readonly recordDiscovery: (worldId: string, params: RecordDiscoveryParams) => DiscoveryRecord;
  readonly queryEvents: (worldId: string, q: HistoryQuery) => ReadonlyArray<HistoryEvent>;
  readonly getDiscoveries: (worldId: string) => ReadonlyArray<DiscoveryRecord>;
  readonly getRecentEvents: (worldId: string, count: number) => ReadonlyArray<HistoryEvent>;
  readonly getEventsByType: (
    worldId: string,
    eventType: HistoryEventType,
  ) => ReadonlyArray<HistoryEvent>;
  readonly getEventCount: (worldId: string) => number;
  readonly getSignificantEvents: (
    worldId: string,
    minLevel: SignificanceLevel,
  ) => ReadonlyArray<HistoryEvent>;
  readonly getStats: () => WorldHistoryStats;
}

// -- Factory --------------------------------------------------------------

function createWorldHistory(deps: WorldHistoryDeps): WorldHistory {
  const state: HistoryState = {
    deps,
    worlds: new Map(),
  };

  return {
    initializeWorld: (wId) => {
      initializeWorldImpl(state, wId);
    },
    recordEvent: (wId, p) => recordEventImpl(state, wId, p),
    recordDiscovery: (wId, p) => recordDiscoveryImpl(state, wId, p),
    queryEvents: (wId, q) => queryEventsImpl(state, wId, q),
    getDiscoveries: (wId) => getDiscoveriesImpl(state, wId),
    getRecentEvents: (wId, n) => getRecentEventsImpl(state, wId, n),
    getEventsByType: (wId, t) => getEventsByTypeImpl(state, wId, t),
    getEventCount: (wId) => getEventCountImpl(state, wId),
    getSignificantEvents: (wId, l) => getSignificantEventsImpl(state, wId, l),
    getStats: () => getStatsImpl(state),
  };
}

// -- Initialize World -----------------------------------------------------

function initializeWorldImpl(state: HistoryState, worldId: string): void {
  if (state.worlds.has(worldId)) return;
  state.worlds.set(worldId, {
    events: [],
    discoveries: [],
    nextSequence: 0,
  });
}

// -- Record Event ---------------------------------------------------------

function recordEventImpl(
  state: HistoryState,
  worldId: string,
  params: RecordEventParams,
): HistoryEvent {
  const world = getOrCreateWorld(state, worldId);
  enforceEventLimit(world);

  const now = state.deps.clock.nowMicroseconds();
  const event: HistoryEvent = {
    eventId: state.deps.idGenerator.generate(),
    worldId,
    eventType: params.eventType,
    title: params.title,
    description: params.description,
    significance: params.significance,
    occurredAt: now,
    recordedAt: now,
    participants: params.participants ?? [],
    locationId: params.locationId ?? null,
    sequenceNumber: world.nextSequence,
  };

  world.events.push(event);
  world.nextSequence++;
  return event;
}

function enforceEventLimit(world: PerWorldState): void {
  if (world.events.length >= MAX_EVENTS_PER_WORLD) {
    world.events.splice(0, 1);
  }
}

// -- Record Discovery -----------------------------------------------------

function recordDiscoveryImpl(
  state: HistoryState,
  worldId: string,
  params: RecordDiscoveryParams,
): DiscoveryRecord {
  const world = getOrCreateWorld(state, worldId);
  const now = state.deps.clock.nowMicroseconds();

  const discovery: DiscoveryRecord = {
    discoveryId: state.deps.idGenerator.generate(),
    worldId,
    discovererIds: [...params.discovererIds],
    title: params.title,
    description: params.description,
    significance: params.significance,
    discoveredAt: now,
    recordedAt: now,
    coordinates: params.coordinates ?? null,
    category: params.category,
  };

  world.discoveries.push(discovery);
  return discovery;
}

// -- Query Events ---------------------------------------------------------

function queryEventsImpl(
  state: HistoryState,
  worldId: string,
  q: HistoryQuery,
): ReadonlyArray<HistoryEvent> {
  const world = state.worlds.get(worldId);
  if (world === undefined) return [];
  return world.events.filter((event) => matchesHistoryQuery(event, q));
}

function matchesHistoryQuery(event: HistoryEvent, q: HistoryQuery): boolean {
  if (q.eventType !== undefined && event.eventType !== q.eventType) return false;
  if (q.fromTime !== undefined && event.occurredAt < q.fromTime) return false;
  if (q.toTime !== undefined && event.occurredAt > q.toTime) return false;
  if (q.significance !== undefined && event.significance !== q.significance) return false;
  if (q.participantId !== undefined && !event.participants.includes(q.participantId)) return false;
  if (q.locationId !== undefined && event.locationId !== q.locationId) return false;
  return true;
}

// -- Get Discoveries ------------------------------------------------------

function getDiscoveriesImpl(state: HistoryState, worldId: string): ReadonlyArray<DiscoveryRecord> {
  const world = state.worlds.get(worldId);
  if (world === undefined) return [];
  return [...world.discoveries];
}

// -- Get Recent Events ----------------------------------------------------

function getRecentEventsImpl(
  state: HistoryState,
  worldId: string,
  count: number,
): ReadonlyArray<HistoryEvent> {
  const world = state.worlds.get(worldId);
  if (world === undefined) return [];
  const start = Math.max(0, world.events.length - count);
  return world.events.slice(start);
}

// -- Get Events By Type ---------------------------------------------------

function getEventsByTypeImpl(
  state: HistoryState,
  worldId: string,
  eventType: HistoryEventType,
): ReadonlyArray<HistoryEvent> {
  const world = state.worlds.get(worldId);
  if (world === undefined) return [];
  return world.events.filter((e) => e.eventType === eventType);
}

// -- Get Event Count ------------------------------------------------------

function getEventCountImpl(state: HistoryState, worldId: string): number {
  const world = state.worlds.get(worldId);
  if (world === undefined) return 0;
  return world.events.length;
}

// -- Get Significant Events -----------------------------------------------

function getSignificantEventsImpl(
  state: HistoryState,
  worldId: string,
  minLevel: SignificanceLevel,
): ReadonlyArray<HistoryEvent> {
  const world = state.worlds.get(worldId);
  if (world === undefined) return [];
  const minWeight = SIGNIFICANCE_WEIGHTS[minLevel];
  return world.events.filter((e) => SIGNIFICANCE_WEIGHTS[e.significance] >= minWeight);
}

// -- Stats ----------------------------------------------------------------

function getStatsImpl(state: HistoryState): WorldHistoryStats {
  let totalEvents = 0;
  let totalDiscoveries = 0;
  const eventsByType: Record<HistoryEventType, number> = {
    DISCOVERY: 0,
    BATTLE: 0,
    TREATY: 0,
    FOUNDING: 0,
    CATASTROPHE: 0,
    MIGRATION: 0,
    INNOVATION: 0,
  };

  for (const world of state.worlds.values()) {
    totalEvents += world.events.length;
    totalDiscoveries += world.discoveries.length;
    for (const event of world.events) {
      eventsByType[event.eventType]++;
    }
  }

  return {
    totalWorlds: state.worlds.size,
    totalEvents,
    totalDiscoveries,
    eventsByType,
  };
}

// -- Helpers --------------------------------------------------------------

function getOrCreateWorld(state: HistoryState, worldId: string): PerWorldState {
  const existing = state.worlds.get(worldId);
  if (existing !== undefined) return existing;

  const world: PerWorldState = {
    events: [],
    discoveries: [],
    nextSequence: 0,
  };
  state.worlds.set(worldId, world);
  return world;
}

// -- Exports --------------------------------------------------------------

export { createWorldHistory, MAX_EVENTS_PER_WORLD, SIGNIFICANCE_WEIGHTS };
export type {
  WorldHistory,
  WorldHistoryDeps,
  WorldHistoryClock,
  WorldHistoryIdGenerator,
  HistoryEventType,
  SignificanceLevel,
  HistoryEvent,
  RecordEventParams,
  DiscoveryRecord,
  DiscoveryCoordinates,
  DiscoveryCategory,
  RecordDiscoveryParams,
  HistoryQuery,
  WorldHistoryStats,
};
