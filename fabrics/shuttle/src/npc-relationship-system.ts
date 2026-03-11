/**
 * NPC Relationship System - Bidirectional relationship tracking for NPCs and players.
 *
 * Tracks relationships between any two entities with a score (-100 to 100),
 * a relationship type (ALLY, RIVAL, NEUTRAL, ENEMY, ROMANTIC_PARTNER, MENTOR, APPRENTICE),
 * and a full event history. Relationships are bidirectional — looking up (A,B) or (B,A)
 * returns the same record.
 *
 * Scores are clamped silently. Type only changes via explicit setType calls.
 * getSummary computes allies/rivals/enemies counts and averageScore for any entity.
 */

// ============================================================================
// PORTS
// ============================================================================

export type NpcRelationshipSystemClock = {
  now(): bigint;
};

export type NpcRelationshipSystemIdGen = {
  generate(): string;
};

export type NpcRelationshipSystemLogger = {
  info(message: string): void;
  error(message: string): void;
};

export type NpcRelationshipSystemDeps = {
  readonly clock: NpcRelationshipSystemClock;
  readonly idGen: NpcRelationshipSystemIdGen;
  readonly logger: NpcRelationshipSystemLogger;
};

// ============================================================================
// TYPES
// ============================================================================

export type EntityId = string;

export type RelationshipType =
  | 'ALLY'
  | 'RIVAL'
  | 'NEUTRAL'
  | 'ENEMY'
  | 'ROMANTIC_PARTNER'
  | 'MENTOR'
  | 'APPRENTICE';

export type RelationshipError =
  | 'relationship-not-found'
  | 'self-relationship'
  | 'invalid-score'
  | 'already-exists';

export type Relationship = {
  readonly relationshipId: string;
  readonly entityAId: EntityId;
  readonly entityBId: EntityId;
  type: RelationshipType;
  score: number; // -100 to 100
  lastInteractionAt: bigint;
  interactionCount: number;
};

export type RelationshipEvent = {
  readonly eventId: string;
  readonly relationshipId: string;
  readonly scoreDelta: number;
  readonly reason: string;
  readonly occurredAt: bigint;
};

export type RelationshipSummary = {
  readonly entityId: EntityId;
  readonly totalRelationships: number;
  readonly allies: number;
  readonly rivals: number;
  readonly enemies: number;
  readonly averageScore: number;
};

// ============================================================================
// STATE
// ============================================================================

export type NpcRelationshipSystemState = {
  readonly deps: NpcRelationshipSystemDeps;
  // canonical key: orderedKey(A, B) → Relationship
  readonly relationships: Map<string, Relationship>;
  // eventsByRelId: relationshipId → RelationshipEvent[]
  readonly events: Map<string, RelationshipEvent[]>;
};

// ============================================================================
// FACTORY
// ============================================================================

export function createNpcRelationshipState(
  deps: NpcRelationshipSystemDeps,
): NpcRelationshipSystemState {
  return {
    deps,
    relationships: new Map(),
    events: new Map(),
  };
}

// ============================================================================
// CREATE RELATIONSHIP
// ============================================================================

export function createRelationship(
  state: NpcRelationshipSystemState,
  entityAId: EntityId,
  entityBId: EntityId,
  initialScore: number = 0,
): Relationship | RelationshipError {
  if (entityAId === entityBId) return 'self-relationship';
  const key = orderedKey(entityAId, entityBId);
  if (state.relationships.has(key)) return 'already-exists';
  const clamped = clampScore(initialScore);
  const rel: Relationship = {
    relationshipId: state.deps.idGen.generate(),
    entityAId,
    entityBId,
    type: 'NEUTRAL',
    score: clamped,
    lastInteractionAt: state.deps.clock.now(),
    interactionCount: 0,
  };
  state.relationships.set(key, rel);
  state.events.set(rel.relationshipId, []);
  state.deps.logger.info(
    'npc-relationship-system: created relationship ' + entityAId + ' <-> ' + entityBId,
  );
  return rel;
}

// ============================================================================
// ADJUST SCORE
// ============================================================================

export function adjustRelationshipScore(
  state: NpcRelationshipSystemState,
  entityAId: EntityId,
  entityBId: EntityId,
  delta: number,
  reason: string,
): { success: true; relationship: Relationship } | { success: false; error: RelationshipError } {
  const key = orderedKey(entityAId, entityBId);
  const rel = state.relationships.get(key);
  if (rel === undefined) return { success: false, error: 'relationship-not-found' };
  rel.score = clampScore(rel.score + delta);
  rel.interactionCount++;
  rel.lastInteractionAt = state.deps.clock.now();
  const event: RelationshipEvent = {
    eventId: state.deps.idGen.generate(),
    relationshipId: rel.relationshipId,
    scoreDelta: delta,
    reason,
    occurredAt: rel.lastInteractionAt,
  };
  state.events.get(rel.relationshipId)?.push(event);
  return { success: true, relationship: rel };
}

// ============================================================================
// SET TYPE
// ============================================================================

export function setRelationshipType(
  state: NpcRelationshipSystemState,
  entityAId: EntityId,
  entityBId: EntityId,
  type: RelationshipType,
): { success: true } | { success: false; error: RelationshipError } {
  const key = orderedKey(entityAId, entityBId);
  const rel = state.relationships.get(key);
  if (rel === undefined) return { success: false, error: 'relationship-not-found' };
  rel.type = type;
  return { success: true };
}

// ============================================================================
// QUERIES
// ============================================================================

export function getRelationship(
  state: NpcRelationshipSystemState,
  entityAId: EntityId,
  entityBId: EntityId,
): Relationship | undefined {
  return state.relationships.get(orderedKey(entityAId, entityBId));
}

export function getRelationshipEvents(
  state: NpcRelationshipSystemState,
  entityAId: EntityId,
  entityBId: EntityId,
  limit: number,
): ReadonlyArray<RelationshipEvent> {
  const rel = state.relationships.get(orderedKey(entityAId, entityBId));
  if (rel === undefined) return [];
  const allEvents = state.events.get(rel.relationshipId) ?? [];
  return allEvents.slice(-limit);
}

export function getRelationshipSummary(
  state: NpcRelationshipSystemState,
  entityId: EntityId,
): RelationshipSummary {
  const matches = listRelationships(state, entityId);
  if (matches.length === 0) {
    return { entityId, totalRelationships: 0, allies: 0, rivals: 0, enemies: 0, averageScore: 0 };
  }
  let allies = 0;
  let rivals = 0;
  let enemies = 0;
  let totalScore = 0;
  for (const rel of matches) {
    if (rel.type === 'ALLY') allies++;
    if (rel.type === 'RIVAL') rivals++;
    if (rel.type === 'ENEMY') enemies++;
    totalScore += rel.score;
  }
  return {
    entityId,
    totalRelationships: matches.length,
    allies,
    rivals,
    enemies,
    averageScore: totalScore / matches.length,
  };
}

export function listRelationships(
  state: NpcRelationshipSystemState,
  entityId: EntityId,
): ReadonlyArray<Relationship> {
  const results: Relationship[] = [];
  for (const rel of state.relationships.values()) {
    if (rel.entityAId === entityId || rel.entityBId === entityId) {
      results.push(rel);
    }
  }
  return results;
}

// ============================================================================
// HELPERS
// ============================================================================

function orderedKey(a: EntityId, b: EntityId): string {
  return a < b ? a + ':' + b : b + ':' + a;
}

function clampScore(value: number): number {
  if (value < -100) return -100;
  if (value > 100) return 100;
  return value;
}
