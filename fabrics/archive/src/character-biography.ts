/**
 * Character Biography
 *
 * Full biography tracking for notable characters (NPCs and player dynasties):
 * birth/death, key decisions, achievements, relationships, and reputation arcs.
 * Legacy score computed at death.
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
export type EventType =
  | 'BIRTH'
  | 'DEATH'
  | 'MARRIAGE'
  | 'ACHIEVEMENT'
  | 'BETRAYAL'
  | 'EXILE'
  | 'CORONATION'
  | 'DEFEAT';

export type RelationshipType =
  | 'PARENT'
  | 'CHILD'
  | 'SPOUSE'
  | 'ALLY'
  | 'ENEMY'
  | 'MENTOR'
  | 'APPRENTICE';

export interface CharacterBiography {
  readonly characterId: string;
  readonly name: string;
  readonly bornAt: bigint;
  diedAt?: bigint;
  currentReputation: bigint; // -100 to 100
  totalEvents: number;
  legacyScore?: bigint;
}

export interface LifeEvent {
  readonly id: string;
  readonly characterId: string;
  readonly timestamp: bigint;
  readonly eventType: EventType;
  readonly description: string;
  readonly reputationChange: bigint;
  readonly location?: string;
}

export interface RelationshipRecord {
  readonly id: string;
  readonly characterId: string;
  readonly relatedCharacterId: string;
  readonly relationshipType: RelationshipType;
  readonly establishedAt: bigint;
  readonly endedAt?: bigint;
  readonly notes: string;
}

export interface ReputationArc {
  readonly characterId: string;
  readonly dataPoints: readonly ReputationDataPoint[];
}

export interface ReputationDataPoint {
  readonly timestamp: bigint;
  readonly reputation: bigint;
  readonly eventId?: string;
}

export interface LegacyScore {
  readonly characterId: string;
  readonly totalScore: bigint;
  readonly lifespan: bigint;
  readonly achievements: number;
  readonly peakReputation: bigint;
  readonly relationships: number;
}

export interface CharacterBiographyState {
  readonly biographies: Map<string, CharacterBiography>;
  readonly events: Map<string, LifeEvent>;
  readonly relationships: Map<string, RelationshipRecord>;
  readonly reputationArcs: Map<string, ReputationDataPoint[]>;
}

// Error types
export type BiographyError =
  | 'character-not-found'
  | 'event-not-found'
  | 'relationship-not-found'
  | 'character-exists'
  | 'invalid-reputation'
  | 'already-deceased'
  | 'not-deceased';

// Factory
export function createBiographyState(): CharacterBiographyState {
  return {
    biographies: new Map(),
    events: new Map(),
    relationships: new Map(),
    reputationArcs: new Map(),
  };
}

// Core Functions

export function createBiography(
  state: CharacterBiographyState,
  clock: Clock,
  idGen: IdGenerator,
  logger: Logger,
  characterId: string,
  name: string,
  initialReputation: bigint,
  location?: string,
): 'success' | BiographyError {
  const existing = state.biographies.get(characterId);
  if (existing !== undefined) {
    logger.error('Character biography already exists: ' + characterId);
    return 'character-exists';
  }

  if (initialReputation < -100n || initialReputation > 100n) {
    logger.error('Invalid initial reputation');
    return 'invalid-reputation';
  }

  const now = clock.now();

  const biography: CharacterBiography = {
    characterId,
    name,
    bornAt: now,
    currentReputation: initialReputation,
    totalEvents: 1,
  };

  state.biographies.set(characterId, biography);

  const eventId = idGen.generate();
  const birthEvent: LifeEvent = {
    id: eventId,
    characterId,
    timestamp: now,
    eventType: 'BIRTH',
    description: name + ' was born',
    reputationChange: initialReputation,
    location,
  };

  state.events.set(eventId, birthEvent);

  recordReputationPoint(state, characterId, now, initialReputation, eventId);

  logger.info('Created biography for: ' + name);

  return 'success';
}

function recordReputationPoint(
  state: CharacterBiographyState,
  characterId: string,
  timestamp: bigint,
  reputation: bigint,
  eventId?: string,
): void {
  let arc = state.reputationArcs.get(characterId);

  if (arc === undefined) {
    arc = [];
    state.reputationArcs.set(characterId, arc);
  }

  const dataPoint: ReputationDataPoint = {
    timestamp,
    reputation,
    eventId,
  };

  arc.push(dataPoint);
}

export function recordLifeEvent(
  state: CharacterBiographyState,
  clock: Clock,
  idGen: IdGenerator,
  logger: Logger,
  characterId: string,
  eventType: EventType,
  description: string,
  reputationChange: bigint,
  location?: string,
): string | BiographyError {
  const biography = state.biographies.get(characterId);
  if (biography === undefined) {
    logger.error('Character not found: ' + characterId);
    return 'character-not-found';
  }

  if (biography.diedAt !== undefined) {
    logger.error('Cannot record event for deceased character');
    return 'already-deceased';
  }

  const now = clock.now();
  const eventId = idGen.generate();

  const event: LifeEvent = {
    id: eventId,
    characterId,
    timestamp: now,
    eventType,
    description,
    reputationChange,
    location,
  };

  state.events.set(eventId, event);

  const newReputation = calculateNewReputation(biography.currentReputation, reputationChange);

  biography.currentReputation = newReputation;
  biography.totalEvents = biography.totalEvents + 1;

  recordReputationPoint(state, characterId, now, newReputation, eventId);

  logger.info('Recorded event for ' + characterId + ': ' + eventType);

  return eventId;
}

function calculateNewReputation(current: bigint, change: bigint): bigint {
  const newValue = current + change;
  if (newValue < -100n) return -100n;
  if (newValue > 100n) return 100n;
  return newValue;
}

export function recordDeath(
  state: CharacterBiographyState,
  clock: Clock,
  idGen: IdGenerator,
  logger: Logger,
  characterId: string,
  description: string,
  location?: string,
): 'success' | BiographyError {
  const biography = state.biographies.get(characterId);
  if (biography === undefined) {
    return 'character-not-found';
  }

  if (biography.diedAt !== undefined) {
    return 'already-deceased';
  }

  const now = clock.now();

  const eventId = recordLifeEvent(
    state,
    clock,
    idGen,
    logger,
    characterId,
    'DEATH',
    description,
    0n,
    location,
  );

  biography.diedAt = now;

  if (typeof eventId === 'string' && eventId !== 'already-deceased') {
    const legacy = calculateLegacyForCharacter(state, characterId);
    biography.legacyScore = legacy;

    endAllRelationships(state, clock, characterId);

    logger.warn('Recorded death for: ' + biography.name);
  }

  return 'success';
}

function calculateLegacyForCharacter(state: CharacterBiographyState, characterId: string): bigint {
  const biography = state.biographies.get(characterId);
  if (biography === undefined) return 0n;

  const events = getEventsForCharacter(state, characterId);
  const relationships = getRelationshipsForCharacter(state, characterId);

  const achievements = countAchievements(events);
  const peakReputation = calculatePeakReputation(state, characterId);
  const lifespan = calculateLifespan(biography);

  return calculateLegacy(lifespan, achievements, peakReputation, relationships.length);
}

function getEventsForCharacter(state: CharacterBiographyState, characterId: string): LifeEvent[] {
  const results: LifeEvent[] = [];
  const events = state.events.values();

  for (const event of events) {
    if (event.characterId === characterId) {
      results.push(event);
    }
  }

  return results;
}

function getRelationshipsForCharacter(
  state: CharacterBiographyState,
  characterId: string,
): RelationshipRecord[] {
  const results: RelationshipRecord[] = [];
  const relationships = state.relationships.values();

  for (const rel of relationships) {
    if (rel.characterId === characterId) {
      results.push(rel);
    }
  }

  return results;
}

function countAchievements(events: LifeEvent[]): number {
  let count = 0;

  for (let i = 0; i < events.length; i = i + 1) {
    const event = events[i];
    if (event === undefined) continue;

    if (event.eventType === 'ACHIEVEMENT' || event.eventType === 'CORONATION') {
      count = count + 1;
    }
  }

  return count;
}

function calculatePeakReputation(state: CharacterBiographyState, characterId: string): bigint {
  const arc = state.reputationArcs.get(characterId);
  if (arc === undefined) return 0n;

  let peak = -100n;

  for (let i = 0; i < arc.length; i = i + 1) {
    const point = arc[i];
    if (point === undefined) continue;

    const absReputation = point.reputation >= 0n ? point.reputation : 0n - point.reputation;

    if (absReputation > peak) {
      peak = absReputation;
    }
  }

  return peak;
}

function calculateLifespan(biography: CharacterBiography): bigint {
  if (biography.diedAt === undefined) return 0n;

  const duration = biography.diedAt - biography.bornAt;
  const yearsInMicroseconds = 31536000000000n;

  return duration / yearsInMicroseconds;
}

function calculateLegacy(
  lifespan: bigint,
  achievements: number,
  peakReputation: bigint,
  relationships: number,
): bigint {
  const lifespanScore = lifespan * 5n;
  const achievementScore = BigInt(achievements) * 20n;
  const reputationScore = peakReputation * 2n;
  const relationshipScore = BigInt(relationships) * 3n;

  return lifespanScore + achievementScore + reputationScore + relationshipScore;
}

function endAllRelationships(
  state: CharacterBiographyState,
  clock: Clock,
  characterId: string,
): void {
  const now = clock.now();
  const relationships = state.relationships.values();

  for (const rel of relationships) {
    if (
      (rel.characterId === characterId || rel.relatedCharacterId === characterId) &&
      rel.endedAt === undefined
    ) {
      state.relationships.set(rel.id, { ...rel, endedAt: now });
    }
  }
}

export function addRelationship(
  state: CharacterBiographyState,
  clock: Clock,
  idGen: IdGenerator,
  logger: Logger,
  characterId: string,
  relatedCharacterId: string,
  relationshipType: RelationshipType,
  notes: string,
): string | BiographyError {
  const biography = state.biographies.get(characterId);
  if (biography === undefined) {
    logger.error('Character not found: ' + characterId);
    return 'character-not-found';
  }

  const relatedBio = state.biographies.get(relatedCharacterId);
  if (relatedBio === undefined) {
    logger.error('Related character not found: ' + relatedCharacterId);
    return 'character-not-found';
  }

  const relationshipId = idGen.generate();
  const now = clock.now();

  const relationship: RelationshipRecord = {
    id: relationshipId,
    characterId,
    relatedCharacterId,
    relationshipType,
    establishedAt: now,
    notes,
  };

  state.relationships.set(relationshipId, relationship);

  logger.info('Added relationship: ' + characterId + ' -> ' + relatedCharacterId);

  return relationshipId;
}

export function endRelationship(
  state: CharacterBiographyState,
  clock: Clock,
  logger: Logger,
  relationshipId: string,
): 'success' | BiographyError {
  const relationship = state.relationships.get(relationshipId);
  if (relationship === undefined) {
    logger.error('Relationship not found: ' + relationshipId);
    return 'relationship-not-found';
  }

  if (relationship.endedAt !== undefined) {
    logger.error('Relationship already ended');
    return 'relationship-not-found';
  }

  state.relationships.set(relationship.id, { ...relationship, endedAt: clock.now() });

  logger.info('Ended relationship: ' + relationshipId);

  return 'success';
}

export function computeLegacy(
  state: CharacterBiographyState,
  characterId: string,
): LegacyScore | BiographyError {
  const biography = state.biographies.get(characterId);
  if (biography === undefined) {
    return 'character-not-found';
  }

  if (biography.diedAt === undefined) {
    return 'not-deceased';
  }

  const events = getEventsForCharacter(state, characterId);
  const relationships = getRelationshipsForCharacter(state, characterId);

  const achievements = countAchievements(events);
  const peakReputation = calculatePeakReputation(state, characterId);
  const lifespan = calculateLifespan(biography);

  const totalScore =
    biography.legacyScore !== undefined
      ? biography.legacyScore
      : calculateLegacy(lifespan, achievements, peakReputation, relationships.length);

  return {
    characterId,
    totalScore,
    lifespan,
    achievements,
    peakReputation,
    relationships: relationships.length,
  };
}

export function getReputationArc(
  state: CharacterBiographyState,
  characterId: string,
): ReputationArc | BiographyError {
  const biography = state.biographies.get(characterId);
  if (biography === undefined) {
    return 'character-not-found';
  }

  const dataPoints = state.reputationArcs.get(characterId);

  return {
    characterId,
    dataPoints: dataPoints !== undefined ? [...dataPoints] : [],
  };
}

export function getLifeTimeline(
  state: CharacterBiographyState,
  characterId: string,
): readonly LifeEvent[] | BiographyError {
  const biography = state.biographies.get(characterId);
  if (biography === undefined) {
    return 'character-not-found';
  }

  const events = getEventsForCharacter(state, characterId);

  events.sort((a, b) => {
    if (a.timestamp < b.timestamp) return -1;
    if (a.timestamp > b.timestamp) return 1;
    return 0;
  });

  return events;
}

export function queryRelationships(
  state: CharacterBiographyState,
  characterId: string,
  relationshipType?: RelationshipType,
): readonly RelationshipRecord[] {
  const results: RelationshipRecord[] = [];
  const relationships = state.relationships.values();

  for (const rel of relationships) {
    if (rel.characterId === characterId) {
      if (relationshipType === undefined || rel.relationshipType === relationshipType) {
        results.push(rel);
      }
    }
  }

  return results;
}

export function getBiography(
  state: CharacterBiographyState,
  characterId: string,
): CharacterBiography | BiographyError {
  const biography = state.biographies.get(characterId);
  if (biography === undefined) {
    return 'character-not-found';
  }
  return biography;
}

export function getAllBiographies(state: CharacterBiographyState): readonly CharacterBiography[] {
  return Array.from(state.biographies.values());
}

export function getLivingCharacters(state: CharacterBiographyState): readonly CharacterBiography[] {
  const results: CharacterBiography[] = [];
  const biographies = state.biographies.values();

  for (const bio of biographies) {
    if (bio.diedAt === undefined) {
      results.push(bio);
    }
  }

  return results;
}

export function getDeceasedCharacters(
  state: CharacterBiographyState,
): readonly CharacterBiography[] {
  const results: CharacterBiography[] = [];
  const biographies = state.biographies.values();

  for (const bio of biographies) {
    if (bio.diedAt !== undefined) {
      results.push(bio);
    }
  }

  return results;
}

export function getEvent(
  state: CharacterBiographyState,
  eventId: string,
): LifeEvent | BiographyError {
  const event = state.events.get(eventId);
  if (event === undefined) {
    return 'event-not-found';
  }
  return event;
}

export function getAllEvents(state: CharacterBiographyState): readonly LifeEvent[] {
  return Array.from(state.events.values());
}

export function getEventsByType(
  state: CharacterBiographyState,
  eventType: EventType,
): readonly LifeEvent[] {
  const results: LifeEvent[] = [];
  const events = state.events.values();

  for (const event of events) {
    if (event.eventType === eventType) {
      results.push(event);
    }
  }

  return results;
}

export function getRelationship(
  state: CharacterBiographyState,
  relationshipId: string,
): RelationshipRecord | BiographyError {
  const relationship = state.relationships.get(relationshipId);
  if (relationship === undefined) {
    return 'relationship-not-found';
  }
  return relationship;
}

export function getAllRelationships(state: CharacterBiographyState): readonly RelationshipRecord[] {
  return Array.from(state.relationships.values());
}

export function getActiveRelationships(
  state: CharacterBiographyState,
): readonly RelationshipRecord[] {
  const results: RelationshipRecord[] = [];
  const relationships = state.relationships.values();

  for (const rel of relationships) {
    if (rel.endedAt === undefined) {
      results.push(rel);
    }
  }

  return results;
}

export function getEndedRelationships(
  state: CharacterBiographyState,
): readonly RelationshipRecord[] {
  const results: RelationshipRecord[] = [];
  const relationships = state.relationships.values();

  for (const rel of relationships) {
    if (rel.endedAt !== undefined) {
      results.push(rel);
    }
  }

  return results;
}

export function getBiographyCount(state: CharacterBiographyState): number {
  return state.biographies.size;
}

export function getEventCount(state: CharacterBiographyState): number {
  return state.events.size;
}

export function getRelationshipCount(state: CharacterBiographyState): number {
  return state.relationships.size;
}

export function getCharactersByReputation(
  state: CharacterBiographyState,
  minReputation: bigint,
): readonly CharacterBiography[] {
  const results: CharacterBiography[] = [];
  const biographies = state.biographies.values();

  for (const bio of biographies) {
    if (bio.currentReputation >= minReputation) {
      results.push(bio);
    }
  }

  return results;
}

export function getTopLegacies(
  state: CharacterBiographyState,
  limit: number,
): readonly CharacterBiography[] {
  const deceased: CharacterBiography[] = [];
  const biographies = state.biographies.values();

  for (const bio of biographies) {
    if (bio.diedAt !== undefined && bio.legacyScore !== undefined) {
      deceased.push(bio);
    }
  }

  deceased.sort((a, b) => {
    const aScore = a.legacyScore ?? 0n;
    const bScore = b.legacyScore ?? 0n;

    if (aScore > bScore) return -1;
    if (aScore < bScore) return 1;
    return 0;
  });

  return deceased.slice(0, limit);
}

export function getRecentEvents(
  state: CharacterBiographyState,
  since: bigint,
): readonly LifeEvent[] {
  const results: LifeEvent[] = [];
  const events = state.events.values();

  for (const event of events) {
    if (event.timestamp >= since) {
      results.push(event);
    }
  }

  return results;
}

export function getEventsInRange(
  state: CharacterBiographyState,
  startTime: bigint,
  endTime: bigint,
): readonly LifeEvent[] {
  const results: LifeEvent[] = [];
  const events = state.events.values();

  for (const event of events) {
    if (event.timestamp >= startTime && event.timestamp <= endTime) {
      results.push(event);
    }
  }

  return results;
}

export function getRelatedCharacters(
  state: CharacterBiographyState,
  characterId: string,
): readonly string[] {
  const relatedSet = new Set<string>();
  const relationships = state.relationships.values();

  for (const rel of relationships) {
    if (rel.characterId === characterId) {
      relatedSet.add(rel.relatedCharacterId);
    } else if (rel.relatedCharacterId === characterId) {
      relatedSet.add(rel.characterId);
    }
  }

  return Array.from(relatedSet);
}

export function getEventsAtLocation(
  state: CharacterBiographyState,
  location: string,
): readonly LifeEvent[] {
  const results: LifeEvent[] = [];
  const events = state.events.values();

  for (const event of events) {
    if (event.location === location) {
      results.push(event);
    }
  }

  return results;
}

export function getMutualRelationships(
  state: CharacterBiographyState,
  character1Id: string,
  character2Id: string,
): readonly RelationshipRecord[] {
  const results: RelationshipRecord[] = [];
  const relationships = state.relationships.values();

  for (const rel of relationships) {
    if (
      (rel.characterId === character1Id && rel.relatedCharacterId === character2Id) ||
      (rel.characterId === character2Id && rel.relatedCharacterId === character1Id)
    ) {
      results.push(rel);
    }
  }

  return results;
}
