/**
 * Faction History
 *
 * Chronicles faction rise and fall: founding events, membership peaks, wars, treaties,
 * and dissolution. Tracks faction influence over time and historical relationships.
 */

// Ports
export interface Clock {
  now(): bigint;
}

export interface IdGenerator {
  generate(): string;
}

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

// Types
export type HistoricalEventType =
  | 'FOUNDING'
  | 'WAR_DECLARED'
  | 'WAR_WON'
  | 'WAR_LOST'
  | 'TREATY_SIGNED'
  | 'ALLIANCE_FORMED'
  | 'ALLIANCE_BROKEN'
  | 'MEMBER_PEAK'
  | 'MEMBER_DECLINE'
  | 'TERRITORY_GAINED'
  | 'TERRITORY_LOST'
  | 'LEADER_CHANGE'
  | 'DISSOLUTION';

export interface FactionHistoryRecord {
  readonly factionId: string;
  readonly name: string;
  readonly foundedAt: bigint;
  dissolvedAt?: bigint;
  currentInfluence: bigint; // 0-100
  totalEvents: number;
}

export interface FactionEra {
  readonly eraName: string;
  readonly startTime: bigint;
  readonly endTime: bigint;
  readonly description: string;
}

export interface HistoricalEvent {
  readonly id: string;
  readonly factionId: string;
  readonly timestamp: bigint;
  readonly eventType: HistoricalEventType;
  readonly description: string;
  readonly influenceChange: bigint;
  readonly participants: readonly string[];
}

export interface AllianceRecord {
  readonly id: string;
  readonly faction1Id: string;
  readonly faction2Id: string;
  readonly formedAt: bigint;
  readonly brokenAt?: bigint;
  readonly reason: string;
}

export interface InfluenceTimeline {
  readonly factionId: string;
  readonly dataPoints: readonly InfluenceDataPoint[];
}

export interface InfluenceDataPoint {
  readonly timestamp: bigint;
  readonly influence: bigint;
  readonly eventId?: string;
}

export interface FactionLegacy {
  readonly factionId: string;
  readonly legacyScore: bigint;
  readonly yearsActive: bigint;
  readonly majorEvents: number;
  readonly alliances: number;
  readonly wars: number;
  readonly peakInfluence: bigint;
}

export interface FactionHistoryState {
  readonly factions: Map<string, FactionHistoryRecord>;
  readonly events: Map<string, HistoricalEvent>;
  readonly alliances: Map<string, AllianceRecord>;
  readonly eras: FactionEra[];
  readonly influenceTimelines: Map<string, InfluenceDataPoint[]>;
}

// Error types
export type FactionHistoryError =
  | 'faction-not-found'
  | 'event-not-found'
  | 'alliance-not-found'
  | 'faction-exists'
  | 'invalid-influence'
  | 'already-dissolved'
  | 'invalid-era';

// Factory
export function createFactionHistoryState(): FactionHistoryState {
  return {
    factions: new Map(),
    events: new Map(),
    alliances: new Map(),
    eras: [],
    influenceTimelines: new Map(),
  };
}

// Core Functions

export function recordFounding(
  state: FactionHistoryState,
  clock: Clock,
  idGen: IdGenerator,
  logger: Logger,
  factionId: string,
  name: string,
  initialInfluence: bigint,
  founderIds: readonly string[],
): 'success' | FactionHistoryError {
  const existing = state.factions.get(factionId);
  if (existing !== undefined) {
    logger.error('Faction already exists: ' + factionId);
    return 'faction-exists';
  }

  if (initialInfluence < 0n || initialInfluence > 100n) {
    logger.error('Invalid initial influence');
    return 'invalid-influence';
  }

  const now = clock.now();

  const record: FactionHistoryRecord = {
    factionId,
    name,
    foundedAt: now,
    currentInfluence: initialInfluence,
    totalEvents: 1,
  };

  state.factions.set(factionId, record);

  const eventId = idGen.generate();
  const event: HistoricalEvent = {
    id: eventId,
    factionId,
    timestamp: now,
    eventType: 'FOUNDING',
    description: 'Faction ' + name + ' was founded',
    influenceChange: initialInfluence,
    participants: [...founderIds],
  };

  state.events.set(eventId, event);

  recordInfluencePoint(state, factionId, now, initialInfluence, eventId);

  logger.info('Recorded faction founding: ' + name);

  return 'success';
}

function recordInfluencePoint(
  state: FactionHistoryState,
  factionId: string,
  timestamp: bigint,
  influence: bigint,
  eventId?: string,
): void {
  let timeline = state.influenceTimelines.get(factionId);

  if (timeline === undefined) {
    timeline = [];
    state.influenceTimelines.set(factionId, timeline);
  }

  const dataPoint: InfluenceDataPoint = {
    timestamp,
    influence,
    eventId,
  };

  timeline.push(dataPoint);
}

export function recordEvent(
  state: FactionHistoryState,
  clock: Clock,
  idGen: IdGenerator,
  logger: Logger,
  factionId: string,
  eventType: HistoricalEventType,
  description: string,
  influenceChange: bigint,
  participants: readonly string[],
): string | FactionHistoryError {
  const faction = state.factions.get(factionId);
  if (faction === undefined) {
    logger.error('Faction not found: ' + factionId);
    return 'faction-not-found';
  }

  if (faction.dissolvedAt !== undefined) {
    logger.error('Cannot record event for dissolved faction');
    return 'already-dissolved';
  }

  const now = clock.now();
  const eventId = idGen.generate();

  const event: HistoricalEvent = {
    id: eventId,
    factionId,
    timestamp: now,
    eventType,
    description,
    influenceChange,
    participants: [...participants],
  };

  state.events.set(eventId, event);

  const newInfluence = calculateNewInfluence(faction.currentInfluence, influenceChange);

  faction.currentInfluence = newInfluence;
  faction.totalEvents = faction.totalEvents + 1;

  recordInfluencePoint(state, factionId, now, newInfluence, eventId);

  logger.info('Recorded event for faction ' + factionId + ': ' + eventType);

  return eventId;
}

function calculateNewInfluence(current: bigint, change: bigint): bigint {
  const newValue = current + change;
  if (newValue < 0n) return 0n;
  if (newValue > 100n) return 100n;
  return newValue;
}

export function recordAlliance(
  state: FactionHistoryState,
  clock: Clock,
  idGen: IdGenerator,
  logger: Logger,
  faction1Id: string,
  faction2Id: string,
  reason: string,
): string | FactionHistoryError {
  const faction1 = state.factions.get(faction1Id);
  if (faction1 === undefined) {
    return 'faction-not-found';
  }

  const faction2 = state.factions.get(faction2Id);
  if (faction2 === undefined) {
    return 'faction-not-found';
  }

  const now = clock.now();
  const allianceId = idGen.generate();

  const alliance: AllianceRecord = {
    id: allianceId,
    faction1Id,
    faction2Id,
    formedAt: now,
    reason,
  };

  state.alliances.set(allianceId, alliance);

  recordEvent(
    state,
    clock,
    idGen,
    logger,
    faction1Id,
    'ALLIANCE_FORMED',
    'Alliance formed with ' + faction2.name,
    5n,
    [faction2Id],
  );

  recordEvent(
    state,
    clock,
    idGen,
    logger,
    faction2Id,
    'ALLIANCE_FORMED',
    'Alliance formed with ' + faction1.name,
    5n,
    [faction1Id],
  );

  logger.info('Recorded alliance: ' + faction1.name + ' + ' + faction2.name);

  return allianceId;
}

export function breakAlliance(
  state: FactionHistoryState,
  clock: Clock,
  idGen: IdGenerator,
  logger: Logger,
  allianceId: string,
  reason: string,
): 'success' | FactionHistoryError {
  const alliance = state.alliances.get(allianceId);
  if (alliance === undefined) {
    logger.error('Alliance not found: ' + allianceId);
    return 'alliance-not-found';
  }

  if (alliance.brokenAt !== undefined) {
    logger.error('Alliance already broken');
    return 'alliance-not-found';
  }

  const broken = { ...alliance, brokenAt: clock.now() };
  state.alliances.set(allianceId, broken);

  const faction1 = state.factions.get(broken.faction1Id);
  const faction2 = state.factions.get(alliance.faction2Id);

  if (faction1 === undefined || faction2 === undefined) {
    return 'faction-not-found';
  }

  recordEvent(
    state,
    clock,
    idGen,
    logger,
    alliance.faction1Id,
    'ALLIANCE_BROKEN',
    'Alliance broken with ' + faction2.name + ': ' + reason,
    -5n,
    [alliance.faction2Id],
  );

  recordEvent(
    state,
    clock,
    idGen,
    logger,
    alliance.faction2Id,
    'ALLIANCE_BROKEN',
    'Alliance broken with ' + faction1.name + ': ' + reason,
    -5n,
    [alliance.faction1Id],
  );

  logger.info('Broke alliance: ' + allianceId);

  return 'success';
}

export function recordDissolution(
  state: FactionHistoryState,
  clock: Clock,
  idGen: IdGenerator,
  logger: Logger,
  factionId: string,
  reason: string,
): 'success' | FactionHistoryError {
  const faction = state.factions.get(factionId);
  if (faction === undefined) {
    return 'faction-not-found';
  }

  if (faction.dissolvedAt !== undefined) {
    return 'already-dissolved';
  }

  const now = clock.now();
  const influenceChange = 0n - faction.currentInfluence;

  recordEvent(
    state,
    clock,
    idGen,
    logger,
    factionId,
    'DISSOLUTION',
    'Faction dissolved: ' + reason,
    influenceChange,
    [],
  );

  faction.dissolvedAt = now;
  faction.currentInfluence = 0n;

  logger.warn('Recorded faction dissolution: ' + faction.name);

  return 'success';
}

export function getInfluenceTimeline(
  state: FactionHistoryState,
  factionId: string,
): InfluenceTimeline | FactionHistoryError {
  const faction = state.factions.get(factionId);
  if (faction === undefined) {
    return 'faction-not-found';
  }

  const dataPoints = state.influenceTimelines.get(factionId);

  return {
    factionId,
    dataPoints: dataPoints !== undefined ? [...dataPoints] : [],
  };
}

export function queryByEra(
  state: FactionHistoryState,
  eraName: string,
): readonly HistoricalEvent[] {
  const era = findEra(state, eraName);
  if (era === undefined) {
    return [];
  }

  const results: HistoricalEvent[] = [];
  const events = state.events.values();

  for (const event of events) {
    if (event.timestamp >= era.startTime && event.timestamp <= era.endTime) {
      results.push(event);
    }
  }

  return results;
}

function findEra(state: FactionHistoryState, eraName: string): FactionEra | undefined {
  for (let i = 0; i < state.eras.length; i = i + 1) {
    const era = state.eras[i];
    if (era === undefined) continue;
    if (era.eraName === eraName) {
      return era;
    }
  }

  return undefined;
}

export function defineEra(
  state: FactionHistoryState,
  logger: Logger,
  eraName: string,
  startTime: bigint,
  endTime: bigint,
  description: string,
): 'success' | FactionHistoryError {
  if (endTime <= startTime) {
    logger.error('Invalid era time range');
    return 'invalid-era';
  }

  const existing = findEra(state, eraName);
  if (existing !== undefined) {
    logger.error('Era already exists: ' + eraName);
    return 'invalid-era';
  }

  const era: FactionEra = {
    eraName,
    startTime,
    endTime,
    description,
  };

  state.eras.push(era);
  logger.info('Defined era: ' + eraName);

  return 'success';
}

export function computeLegacyScore(
  state: FactionHistoryState,
  factionId: string,
): FactionLegacy | FactionHistoryError {
  const faction = state.factions.get(factionId);
  if (faction === undefined) {
    return 'faction-not-found';
  }

  const events = getEventsForFaction(state, factionId);
  const alliances = getAlliancesForFaction(state, factionId);

  const majorEvents = countMajorEvents(events);
  const wars = countWars(events);
  const peakInfluence = calculatePeakInfluence(state, factionId);

  const yearsActive = calculateYearsActive(faction);

  const legacyScore = calculateLegacy(
    yearsActive,
    majorEvents,
    alliances.length,
    wars,
    peakInfluence,
  );

  return {
    factionId,
    legacyScore,
    yearsActive,
    majorEvents,
    alliances: alliances.length,
    wars,
    peakInfluence,
  };
}

function getEventsForFaction(state: FactionHistoryState, factionId: string): HistoricalEvent[] {
  const results: HistoricalEvent[] = [];
  const events = state.events.values();

  for (const event of events) {
    if (event.factionId === factionId) {
      results.push(event);
    }
  }

  return results;
}

function getAlliancesForFaction(state: FactionHistoryState, factionId: string): AllianceRecord[] {
  const results: AllianceRecord[] = [];
  const alliances = state.alliances.values();

  for (const alliance of alliances) {
    if (alliance.faction1Id === factionId || alliance.faction2Id === factionId) {
      results.push(alliance);
    }
  }

  return results;
}

function countMajorEvents(events: HistoricalEvent[]): number {
  let count = 0;
  const majorTypes: HistoricalEventType[] = [
    'WAR_WON',
    'WAR_LOST',
    'TREATY_SIGNED',
    'TERRITORY_GAINED',
    'TERRITORY_LOST',
    'DISSOLUTION',
  ];

  for (let i = 0; i < events.length; i = i + 1) {
    const event = events[i];
    if (event === undefined) continue;

    for (let j = 0; j < majorTypes.length; j = j + 1) {
      const majorType = majorTypes[j];
      if (majorType === event.eventType) {
        count = count + 1;
        break;
      }
    }
  }

  return count;
}

function countWars(events: HistoricalEvent[]): number {
  let count = 0;

  for (let i = 0; i < events.length; i = i + 1) {
    const event = events[i];
    if (event === undefined) continue;

    if (
      event.eventType === 'WAR_DECLARED' ||
      event.eventType === 'WAR_WON' ||
      event.eventType === 'WAR_LOST'
    ) {
      count = count + 1;
    }
  }

  return count;
}

function calculatePeakInfluence(state: FactionHistoryState, factionId: string): bigint {
  const timeline = state.influenceTimelines.get(factionId);
  if (timeline === undefined) return 0n;

  let peak = 0n;

  for (let i = 0; i < timeline.length; i = i + 1) {
    const point = timeline[i];
    if (point === undefined) continue;
    if (point.influence > peak) {
      peak = point.influence;
    }
  }

  return peak;
}

function calculateYearsActive(faction: FactionHistoryRecord): bigint {
  const endTime = faction.dissolvedAt !== undefined ? faction.dissolvedAt : 0n;

  const duration = endTime > faction.foundedAt ? endTime - faction.foundedAt : 0n;

  const yearsInMicroseconds = 31536000000000n;
  return duration / yearsInMicroseconds;
}

function calculateLegacy(
  yearsActive: bigint,
  majorEvents: number,
  alliances: number,
  wars: number,
  peakInfluence: bigint,
): bigint {
  const yearScore = yearsActive * 10n;
  const eventScore = BigInt(majorEvents) * 5n;
  const allianceScore = BigInt(alliances) * 3n;
  const warScore = BigInt(wars) * 2n;
  const influenceScore = peakInfluence;

  return yearScore + eventScore + allianceScore + warScore + influenceScore;
}

export function getFactionHistory(
  state: FactionHistoryState,
  factionId: string,
): FactionHistoryRecord | FactionHistoryError {
  const faction = state.factions.get(factionId);
  if (faction === undefined) {
    return 'faction-not-found';
  }
  return faction;
}

export function getAllFactions(state: FactionHistoryState): readonly FactionHistoryRecord[] {
  return Array.from(state.factions.values());
}

export function getActiveFactions(state: FactionHistoryState): readonly FactionHistoryRecord[] {
  const results: FactionHistoryRecord[] = [];
  const factions = state.factions.values();

  for (const faction of factions) {
    if (faction.dissolvedAt === undefined) {
      results.push(faction);
    }
  }

  return results;
}

export function getDissolvedFactions(state: FactionHistoryState): readonly FactionHistoryRecord[] {
  const results: FactionHistoryRecord[] = [];
  const factions = state.factions.values();

  for (const faction of factions) {
    if (faction.dissolvedAt !== undefined) {
      results.push(faction);
    }
  }

  return results;
}

export function getEvent(
  state: FactionHistoryState,
  eventId: string,
): HistoricalEvent | FactionHistoryError {
  const event = state.events.get(eventId);
  if (event === undefined) {
    return 'event-not-found';
  }
  return event;
}

export function getAllEvents(state: FactionHistoryState): readonly HistoricalEvent[] {
  return Array.from(state.events.values());
}

export function getEventsByType(
  state: FactionHistoryState,
  eventType: HistoricalEventType,
): readonly HistoricalEvent[] {
  const results: HistoricalEvent[] = [];
  const events = state.events.values();

  for (const event of events) {
    if (event.eventType === eventType) {
      results.push(event);
    }
  }

  return results;
}

export function getAlliance(
  state: FactionHistoryState,
  allianceId: string,
): AllianceRecord | FactionHistoryError {
  const alliance = state.alliances.get(allianceId);
  if (alliance === undefined) {
    return 'alliance-not-found';
  }
  return alliance;
}

export function getAllAlliances(state: FactionHistoryState): readonly AllianceRecord[] {
  return Array.from(state.alliances.values());
}

export function getActiveAlliances(state: FactionHistoryState): readonly AllianceRecord[] {
  const results: AllianceRecord[] = [];
  const alliances = state.alliances.values();

  for (const alliance of alliances) {
    if (alliance.brokenAt === undefined) {
      results.push(alliance);
    }
  }

  return results;
}

export function getBrokenAlliances(state: FactionHistoryState): readonly AllianceRecord[] {
  const results: AllianceRecord[] = [];
  const alliances = state.alliances.values();

  for (const alliance of alliances) {
    if (alliance.brokenAt !== undefined) {
      results.push(alliance);
    }
  }

  return results;
}

export function getAllEras(state: FactionHistoryState): readonly FactionEra[] {
  return [...state.eras];
}

export function getEra(
  state: FactionHistoryState,
  eraName: string,
): FactionEra | FactionHistoryError {
  const era = findEra(state, eraName);
  if (era === undefined) {
    return 'faction-not-found';
  }
  return era;
}

export function getFactionCount(state: FactionHistoryState): number {
  return state.factions.size;
}

export function getEventCount(state: FactionHistoryState): number {
  return state.events.size;
}

export function getAllianceCount(state: FactionHistoryState): number {
  return state.alliances.size;
}

export function getEraCount(state: FactionHistoryState): number {
  return state.eras.length;
}

export function getFactionsByInfluence(
  state: FactionHistoryState,
  minInfluence: bigint,
): readonly FactionHistoryRecord[] {
  const results: FactionHistoryRecord[] = [];
  const factions = state.factions.values();

  for (const faction of factions) {
    if (faction.currentInfluence >= minInfluence) {
      results.push(faction);
    }
  }

  return results;
}

export function getTopFactions(
  state: FactionHistoryState,
  limit: number,
): readonly FactionHistoryRecord[] {
  const factions = Array.from(state.factions.values());

  factions.sort((a, b) => {
    if (a.currentInfluence > b.currentInfluence) return -1;
    if (a.currentInfluence < b.currentInfluence) return 1;
    return 0;
  });

  return factions.slice(0, limit);
}

export function getRecentEvents(
  state: FactionHistoryState,
  since: bigint,
): readonly HistoricalEvent[] {
  const results: HistoricalEvent[] = [];
  const events = state.events.values();

  for (const event of events) {
    if (event.timestamp >= since) {
      results.push(event);
    }
  }

  return results;
}

export function getEventsInRange(
  state: FactionHistoryState,
  startTime: bigint,
  endTime: bigint,
): readonly HistoricalEvent[] {
  const results: HistoricalEvent[] = [];
  const events = state.events.values();

  for (const event of events) {
    if (event.timestamp >= startTime && event.timestamp <= endTime) {
      results.push(event);
    }
  }

  return results;
}

export function getRelatedFactions(
  state: FactionHistoryState,
  factionId: string,
): readonly string[] {
  const relatedSet = new Set<string>();
  const alliances = state.alliances.values();

  for (const alliance of alliances) {
    if (alliance.faction1Id === factionId) {
      relatedSet.add(alliance.faction2Id);
    } else if (alliance.faction2Id === factionId) {
      relatedSet.add(alliance.faction1Id);
    }
  }

  return Array.from(relatedSet);
}
