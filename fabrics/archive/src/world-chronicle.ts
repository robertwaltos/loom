/**
 * World Chronicle - Automated world-level chronicle generation from events
 *
 * Groups events into eras by significance clustering, generates era summaries,
 * tracks turning points (high-significance events), and provides chronicle queries.
 */

// ============================================================================
// PORTS
// ============================================================================

export type Clock = {
  now(): bigint;
};

export type IdGenerator = {
  generate(): string;
};

export type Logger = {
  info(message: string): void;
  error(message: string): void;
};

// ============================================================================
// TYPES
// ============================================================================

export type EventCategory =
  | 'POLITICAL'
  | 'MILITARY'
  | 'ECONOMIC'
  | 'CULTURAL'
  | 'TECHNOLOGICAL'
  | 'ENVIRONMENTAL'
  | 'DIPLOMATIC';

export type ChronicleEntry = {
  id: string;
  worldId: string;
  category: EventCategory;
  description: string;
  significance: number; // 0-100
  timestamp: bigint;
  participants: string[]; // dynastyIds
  metadata: Map<string, string>;
};

export type WorldEra = {
  id: string;
  worldId: string;
  name: string;
  startTimestamp: bigint;
  endTimestamp: bigint | null; // null if current era
  entries: string[]; // entry IDs
  averageSignificance: number;
  dominantCategory: EventCategory;
  createdAt: bigint;
};

export type TurningPoint = {
  id: string;
  worldId: string;
  entryId: string;
  significance: number; // >= 80
  impact: string;
  eraId: string;
  recordedAt: bigint;
};

export type EraSummary = {
  eraId: string;
  worldId: string;
  eraName: string;
  duration: bigint; // microseconds
  totalEvents: number;
  turningPoints: number;
  categoryCounts: Map<EventCategory, number>;
  topParticipants: string[]; // dynastyIds
  narrativeSummary: string;
  generatedAt: bigint;
};

export type ChronicleQuery = {
  worldId?: string;
  eraId?: string;
  category?: EventCategory;
  minSignificance?: number;
  startTime?: bigint;
  endTime?: bigint;
  participantId?: string;
  limit?: number;
};

export type ChronicleReport = {
  worldId: string;
  totalEntries: number;
  totalEras: number;
  currentEra: WorldEra | null;
  turningPointCount: number;
  mostSignificantEntry: ChronicleEntry | null;
  categoryCounts: Map<EventCategory, number>;
  generatedAt: bigint;
};

export type ChronicleState = {
  entries: Map<string, ChronicleEntry>;
  eras: Map<string, WorldEra>;
  turningPoints: Map<string, TurningPoint>;
  currentEraByWorld: Map<string, string>; // worldId -> eraId
};

export type ChronicleError =
  | 'invalid-world'
  | 'invalid-category'
  | 'invalid-significance'
  | 'invalid-timestamp'
  | 'invalid-era'
  | 'invalid-entry'
  | 'entry-not-found'
  | 'era-not-found'
  | 'turning-point-not-found'
  | 'no-current-era';

// ============================================================================
// FACTORY
// ============================================================================

export function createChronicleState(): ChronicleState {
  return {
    entries: new Map(),
    eras: new Map(),
    turningPoints: new Map(),
    currentEraByWorld: new Map(),
  };
}

// ============================================================================
// CHRONICLE ENTRIES
// ============================================================================

export function addChronicleEntry(
  state: ChronicleState,
  worldId: string,
  category: EventCategory,
  description: string,
  significance: number,
  timestamp: bigint,
  participants: string[],
  metadata: Map<string, string>,
  idGen: IdGenerator,
  clock: Clock,
  logger: Logger,
): ChronicleEntry | ChronicleError {
  if (!worldId || worldId.length === 0) return 'invalid-world';
  if (!isValidCategory(category)) return 'invalid-category';
  if (significance < 0 || significance > 100) return 'invalid-significance';
  if (timestamp < 0n) return 'invalid-timestamp';

  const entry: ChronicleEntry = {
    id: idGen.generate(),
    worldId,
    category,
    description,
    significance,
    timestamp,
    participants,
    metadata,
  };

  state.entries.set(entry.id, entry);

  const currentEraId = state.currentEraByWorld.get(worldId);
  if (currentEraId) {
    const era = state.eras.get(currentEraId);
    if (era) {
      era.entries.push(entry.id);
    }
  }

  if (significance >= 80) {
    recordTurningPoint(state, worldId, entry.id, significance, currentEraId || '', idGen, clock);
  }

  const msg =
    'Chronicle entry added: ' + worldId + ' - ' + category + ' (sig ' + String(significance) + ')';
  logger.info(msg);

  return entry;
}

function isValidCategory(category: EventCategory): boolean {
  const valid: EventCategory[] = [
    'POLITICAL',
    'MILITARY',
    'ECONOMIC',
    'CULTURAL',
    'TECHNOLOGICAL',
    'ENVIRONMENTAL',
    'DIPLOMATIC',
  ];
  return valid.includes(category);
}

export function getEntry(state: ChronicleState, entryId: string): ChronicleEntry | ChronicleError {
  if (!entryId || entryId.length === 0) return 'invalid-entry';
  const entry = state.entries.get(entryId);
  if (!entry) return 'entry-not-found';
  return entry;
}

// ============================================================================
// ERA MANAGEMENT
// ============================================================================

export function createEra(
  state: ChronicleState,
  worldId: string,
  name: string,
  startTimestamp: bigint,
  idGen: IdGenerator,
  clock: Clock,
  logger: Logger,
): WorldEra | ChronicleError {
  if (!worldId || worldId.length === 0) return 'invalid-world';
  if (startTimestamp < 0n) return 'invalid-timestamp';

  const currentEraId = state.currentEraByWorld.get(worldId);
  if (currentEraId) {
    const currentEra = state.eras.get(currentEraId);
    if (currentEra && currentEra.endTimestamp === null) {
      currentEra.endTimestamp = startTimestamp - 1n;
    }
  }

  const era: WorldEra = {
    id: idGen.generate(),
    worldId,
    name,
    startTimestamp,
    endTimestamp: null,
    entries: [],
    averageSignificance: 0,
    dominantCategory: 'POLITICAL',
    createdAt: clock.now(),
  };

  state.eras.set(era.id, era);
  state.currentEraByWorld.set(worldId, era.id);

  const msg = 'New era created: ' + name + ' for world ' + worldId;
  logger.info(msg);

  return era;
}

export function detectEraTransition(
  state: ChronicleState,
  worldId: string,
  recentEntryCount: number,
  significanceThreshold: number,
  idGen: IdGenerator,
  clock: Clock,
  logger: Logger,
): WorldEra | null | ChronicleError {
  if (!worldId || worldId.length === 0) return 'invalid-world';

  const currentEraId = state.currentEraByWorld.get(worldId);
  if (!currentEraId) return null;

  const currentEra = state.eras.get(currentEraId);
  if (!currentEra) return null;

  const recentEntries = getRecentEntriesForWorld(state, worldId, recentEntryCount);
  if (recentEntries.length < recentEntryCount) return null;

  let highSigCount = 0;
  for (const entry of recentEntries) {
    if (entry.significance >= significanceThreshold) {
      highSigCount = highSigCount + 1;
    }
  }

  const ratio = highSigCount / recentEntries.length;
  if (ratio >= 0.6) {
    const last = recentEntries[recentEntries.length - 1];
    if (!last) return null;

    const newEraName = 'Era of ' + last.category;
    return createEra(state, worldId, newEraName, last.timestamp, idGen, clock, logger);
  }

  return null;
}

function getRecentEntriesForWorld(
  state: ChronicleState,
  worldId: string,
  count: number,
): ChronicleEntry[] {
  const entries: ChronicleEntry[] = [];
  for (const [id, entry] of state.entries) {
    if (entry.worldId === worldId) {
      entries.push(entry);
    }
  }
  entries.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));
  return entries.slice(0, count);
}

export function getLatestEra(state: ChronicleState, worldId: string): WorldEra | ChronicleError {
  if (!worldId || worldId.length === 0) return 'invalid-world';
  const eraId = state.currentEraByWorld.get(worldId);
  if (!eraId) return 'no-current-era';
  const era = state.eras.get(eraId);
  if (!era) return 'era-not-found';
  return era;
}

export function endEra(
  state: ChronicleState,
  eraId: string,
  endTimestamp: bigint,
  clock: Clock,
): WorldEra | ChronicleError {
  if (!eraId || eraId.length === 0) return 'invalid-era';
  if (endTimestamp < 0n) return 'invalid-timestamp';

  const era = state.eras.get(eraId);
  if (!era) return 'era-not-found';

  era.endTimestamp = endTimestamp;
  updateEraStatistics(state, era);

  return era;
}

function updateEraStatistics(state: ChronicleState, era: WorldEra): void {
  if (era.entries.length === 0) return;

  let totalSig = 0;
  const categoryCounts = new Map<EventCategory, number>();

  for (const entryId of era.entries) {
    const entry = state.entries.get(entryId);
    if (!entry) continue;

    totalSig = totalSig + entry.significance;

    const count = categoryCounts.get(entry.category) || 0;
    categoryCounts.set(entry.category, count + 1);
  }

  era.averageSignificance = totalSig / era.entries.length;

  let maxCount = 0;
  let dominant: EventCategory = 'POLITICAL';
  for (const [cat, count] of categoryCounts) {
    if (count > maxCount) {
      maxCount = count;
      dominant = cat;
    }
  }
  era.dominantCategory = dominant;
}

// ============================================================================
// TURNING POINTS
// ============================================================================

function recordTurningPoint(
  state: ChronicleState,
  worldId: string,
  entryId: string,
  significance: number,
  eraId: string,
  idGen: IdGenerator,
  clock: Clock,
): TurningPoint {
  const entry = state.entries.get(entryId);
  const impact = entry ? deriveImpact(entry) : 'Unknown impact';

  const tp: TurningPoint = {
    id: idGen.generate(),
    worldId,
    entryId,
    significance,
    impact,
    eraId,
    recordedAt: clock.now(),
  };

  state.turningPoints.set(tp.id, tp);
  return tp;
}

function deriveImpact(entry: ChronicleEntry): string {
  if (entry.category === 'MILITARY') return 'Major military shift';
  if (entry.category === 'POLITICAL') return 'Political transformation';
  if (entry.category === 'TECHNOLOGICAL') return 'Technological breakthrough';
  if (entry.category === 'ENVIRONMENTAL') return 'Environmental crisis';
  if (entry.category === 'ECONOMIC') return 'Economic revolution';
  if (entry.category === 'DIPLOMATIC') return 'Diplomatic realignment';
  return 'Cultural shift';
}

export function identifyTurningPoints(
  state: ChronicleState,
  worldId: string,
  minSignificance: number,
): TurningPoint[] {
  const results: TurningPoint[] = [];
  for (const [id, tp] of state.turningPoints) {
    if (tp.worldId === worldId && tp.significance >= minSignificance) {
      results.push(tp);
    }
  }
  results.sort((a, b) => (a.significance > b.significance ? -1 : 1));
  return results;
}

export function getTurningPoint(
  state: ChronicleState,
  turningPointId: string,
): TurningPoint | ChronicleError {
  if (!turningPointId || turningPointId.length === 0) return 'invalid-entry';
  const tp = state.turningPoints.get(turningPointId);
  if (!tp) return 'turning-point-not-found';
  return tp;
}

// ============================================================================
// ERA SUMMARIES
// ============================================================================

export function generateEraSummary(
  state: ChronicleState,
  eraId: string,
  clock: Clock,
): EraSummary | ChronicleError {
  if (!eraId || eraId.length === 0) return 'invalid-era';
  const era = state.eras.get(eraId);
  if (!era) return 'era-not-found';

  const categoryCounts = new Map<EventCategory, number>();
  const participantCounts = new Map<string, number>();

  for (const entryId of era.entries) {
    const entry = state.entries.get(entryId);
    if (!entry) continue;

    const catCount = categoryCounts.get(entry.category) || 0;
    categoryCounts.set(entry.category, catCount + 1);

    for (const participantId of entry.participants) {
      const pCount = participantCounts.get(participantId) || 0;
      participantCounts.set(participantId, pCount + 1);
    }
  }

  const topParticipants = getTopParticipants(participantCounts, 5);
  const tps = state.turningPoints;
  let turningPointCount = 0;
  for (const [id, tp] of tps) {
    if (tp.eraId === eraId) {
      turningPointCount = turningPointCount + 1;
    }
  }

  const duration = era.endTimestamp
    ? era.endTimestamp - era.startTimestamp
    : clock.now() - era.startTimestamp;
  const narrative = buildNarrative(era, categoryCounts, turningPointCount);

  return {
    eraId,
    worldId: era.worldId,
    eraName: era.name,
    duration,
    totalEvents: era.entries.length,
    turningPoints: turningPointCount,
    categoryCounts,
    topParticipants,
    narrativeSummary: narrative,
    generatedAt: clock.now(),
  };
}

function getTopParticipants(counts: Map<string, number>, limit: number): string[] {
  const sorted = Array.from(counts.entries()).sort((a, b) => (a[1] > b[1] ? -1 : 1));
  return sorted.slice(0, limit).map((entry) => entry[0]);
}

function buildNarrative(
  era: WorldEra,
  categoryCounts: Map<EventCategory, number>,
  turningPointCount: number,
): string {
  const dominant = era.dominantCategory;
  const eventCount = era.entries.length;

  let narrative = 'The ' + era.name + ' witnessed ' + String(eventCount) + ' significant events. ';
  narrative = narrative + 'This era was dominated by ' + dominant.toLowerCase() + ' developments. ';

  if (turningPointCount > 0) {
    narrative = narrative + String(turningPointCount) + ' turning points reshaped the world. ';
  }

  if (era.averageSignificance >= 70) {
    narrative = narrative + 'An age of profound transformation.';
  } else if (era.averageSignificance >= 50) {
    narrative = narrative + 'A time of notable change.';
  } else {
    narrative = narrative + 'A period of relative stability.';
  }

  return narrative;
}

// ============================================================================
// CHRONICLE QUERIES
// ============================================================================

export function queryChronicle(state: ChronicleState, query: ChronicleQuery): ChronicleEntry[] {
  const results: ChronicleEntry[] = [];

  for (const [id, entry] of state.entries) {
    if (!matchesQuery(entry, query, state)) continue;
    results.push(entry);
  }

  results.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));

  if (query.limit && query.limit > 0) {
    return results.slice(0, query.limit);
  }

  return results;
}

function matchesQuery(
  entry: ChronicleEntry,
  query: ChronicleQuery,
  state: ChronicleState,
): boolean {
  if (query.worldId && entry.worldId !== query.worldId) return false;
  if (query.category && entry.category !== query.category) return false;
  if (query.minSignificance !== undefined && entry.significance < query.minSignificance)
    return false;
  if (query.startTime && entry.timestamp < query.startTime) return false;
  if (query.endTime && entry.timestamp > query.endTime) return false;

  if (query.participantId) {
    const found = entry.participants.includes(query.participantId);
    if (!found) return false;
  }

  if (query.eraId) {
    const era = state.eras.get(query.eraId);
    if (!era) return false;
    if (!era.entries.includes(entry.id)) return false;
  }

  return true;
}

export function queryByCategory(
  state: ChronicleState,
  worldId: string,
  category: EventCategory,
  limit: number,
): ChronicleEntry[] {
  return queryChronicle(state, { worldId, category, limit });
}

export function queryBySignificance(
  state: ChronicleState,
  worldId: string,
  minSignificance: number,
  limit: number,
): ChronicleEntry[] {
  return queryChronicle(state, { worldId, minSignificance, limit });
}

export function queryByParticipant(
  state: ChronicleState,
  worldId: string,
  participantId: string,
  limit: number,
): ChronicleEntry[] {
  return queryChronicle(state, { worldId, participantId, limit });
}

export function queryByTimeRange(
  state: ChronicleState,
  worldId: string,
  startTime: bigint,
  endTime: bigint,
  limit: number,
): ChronicleEntry[] {
  return queryChronicle(state, { worldId, startTime, endTime, limit });
}

// ============================================================================
// REPORTING
// ============================================================================

export function getChronicleReport(
  state: ChronicleState,
  worldId: string,
  clock: Clock,
): ChronicleReport | ChronicleError {
  if (!worldId || worldId.length === 0) return 'invalid-world';

  const worldEntries: ChronicleEntry[] = [];
  const categoryCounts = new Map<EventCategory, number>();
  let mostSignificant: ChronicleEntry | null = null;
  let maxSig = -1;

  for (const [id, entry] of state.entries) {
    if (entry.worldId !== worldId) continue;

    worldEntries.push(entry);

    const count = categoryCounts.get(entry.category) || 0;
    categoryCounts.set(entry.category, count + 1);

    if (entry.significance > maxSig) {
      maxSig = entry.significance;
      mostSignificant = entry;
    }
  }

  const worldEras: WorldEra[] = [];
  for (const [id, era] of state.eras) {
    if (era.worldId === worldId) {
      worldEras.push(era);
    }
  }

  const currentEraId = state.currentEraByWorld.get(worldId);
  const currentEra = currentEraId ? state.eras.get(currentEraId) || null : null;

  let turningPointCount = 0;
  for (const [id, tp] of state.turningPoints) {
    if (tp.worldId === worldId) {
      turningPointCount = turningPointCount + 1;
    }
  }

  return {
    worldId,
    totalEntries: worldEntries.length,
    totalEras: worldEras.length,
    currentEra,
    turningPointCount,
    mostSignificantEntry: mostSignificant,
    categoryCounts,
    generatedAt: clock.now(),
  };
}

export function getAllEras(state: ChronicleState, worldId: string): WorldEra[] {
  const results: WorldEra[] = [];
  for (const [id, era] of state.eras) {
    if (era.worldId === worldId) {
      results.push(era);
    }
  }
  results.sort((a, b) => (a.startTimestamp > b.startTimestamp ? 1 : -1));
  return results;
}
