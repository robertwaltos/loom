/**
 * NPC Relationship Tracker — Inter-entity relationship state for AI agents.
 *
 * Tracks directional relationships between entities (NPC↔NPC, NPC↔Player)
 * with disposition scoring, relationship types, and interaction history.
 * Feeds into NPC Decision Engine to shape behavior based on social context.
 *
 * Disposition range: [-100, +100]
 *   +100   → devotion (will sacrifice for this entity)
 *   +50    → ally (actively helpful)
 *    0     → neutral (indifferent)
 *   -50    → hostile (will interfere)
 *   -100   → nemesis (dedicated opposition)
 */

// ─── Types ───────────────────────────────────────────────────────────

export type RelationshipType =
  | 'ally'
  | 'rival'
  | 'mentor'
  | 'ward'
  | 'trading_partner'
  | 'stranger'
  | 'nemesis';

export interface Relationship {
  readonly fromEntityId: string;
  readonly toEntityId: string;
  readonly type: RelationshipType;
  readonly disposition: number;
  readonly interactionCount: number;
  readonly lastInteractionAt: number;
  readonly formedAt: number;
  readonly tags: ReadonlyArray<string>;
}

export interface FormRelationshipParams {
  readonly fromEntityId: string;
  readonly toEntityId: string;
  readonly type: RelationshipType;
  readonly initialDisposition?: number;
  readonly tags?: ReadonlyArray<string>;
}

export interface DispositionChange {
  readonly fromEntityId: string;
  readonly toEntityId: string;
  readonly previousDisposition: number;
  readonly newDisposition: number;
  readonly delta: number;
}

export interface RelationshipTrackerDeps {
  readonly clock: { nowMicroseconds(): number };
  readonly maxDisposition?: number;
  readonly minDisposition?: number;
}

export interface RelationshipStats {
  readonly totalRelationships: number;
  readonly totalInteractions: number;
  readonly averageDisposition: number;
}

export interface RelationshipTracker {
  form(params: FormRelationshipParams): Relationship;
  adjustDisposition(
    fromId: string,
    toId: string,
    delta: number,
  ): DispositionChange;
  recordInteraction(fromId: string, toId: string): boolean;
  setType(fromId: string, toId: string, type: RelationshipType): boolean;
  getRelationship(fromId: string, toId: string): Relationship | undefined;
  getRelationshipsFrom(entityId: string): ReadonlyArray<Relationship>;
  getRelationshipsTo(entityId: string): ReadonlyArray<Relationship>;
  getMutualRelationships(entityId: string): ReadonlyArray<Relationship>;
  removeRelationship(fromId: string, toId: string): boolean;
  removeAllForEntity(entityId: string): number;
  getStats(): RelationshipStats;
}

// ─── Constants ───────────────────────────────────────────────────────

const DEFAULT_MAX_DISPOSITION = 100;
const DEFAULT_MIN_DISPOSITION = -100;

// ─── State ───────────────────────────────────────────────────────────

interface MutableRelationship {
  readonly fromEntityId: string;
  readonly toEntityId: string;
  type: RelationshipType;
  disposition: number;
  interactionCount: number;
  lastInteractionAt: number;
  readonly formedAt: number;
  tags: string[];
}

interface TrackerState {
  readonly relationships: Map<string, MutableRelationship>;
  readonly clock: { nowMicroseconds(): number };
  readonly maxDisposition: number;
  readonly minDisposition: number;
  totalInteractions: number;
}

// ─── Factory ─────────────────────────────────────────────────────────

export function createRelationshipTracker(
  deps: RelationshipTrackerDeps,
): RelationshipTracker {
  const state: TrackerState = {
    relationships: new Map(),
    clock: deps.clock,
    maxDisposition: deps.maxDisposition ?? DEFAULT_MAX_DISPOSITION,
    minDisposition: deps.minDisposition ?? DEFAULT_MIN_DISPOSITION,
    totalInteractions: 0,
  };

  return {
    form: (p) => formImpl(state, p),
    adjustDisposition: (f, t, d) => adjustImpl(state, f, t, d),
    recordInteraction: (f, t) => interactionImpl(state, f, t),
    setType: (f, t, ty) => setTypeImpl(state, f, t, ty),
    getRelationship: (f, t) => getImpl(state, f, t),
    getRelationshipsFrom: (eid) => fromImpl(state, eid),
    getRelationshipsTo: (eid) => toImpl(state, eid),
    getMutualRelationships: (eid) => mutualImpl(state, eid),
    removeRelationship: (f, t) => removeImpl(state, f, t),
    removeAllForEntity: (eid) => removeAllImpl(state, eid),
    getStats: () => computeStats(state),
  };
}

// ─── Form ───────────────────────────────────────────────────────────

function formImpl(
  state: TrackerState,
  params: FormRelationshipParams,
): Relationship {
  const key = relationshipKey(params.fromEntityId, params.toEntityId);
  const existing = state.relationships.get(key);
  if (existing !== undefined) {
    return toReadonly(existing);
  }
  const disposition = clampDisposition(
    state,
    params.initialDisposition ?? 0,
  );
  const now = state.clock.nowMicroseconds();
  const rel: MutableRelationship = {
    fromEntityId: params.fromEntityId,
    toEntityId: params.toEntityId,
    type: params.type,
    disposition,
    interactionCount: 0,
    lastInteractionAt: now,
    formedAt: now,
    tags: params.tags !== undefined ? [...params.tags] : [],
  };
  state.relationships.set(key, rel);
  return toReadonly(rel);
}

// ─── Disposition ────────────────────────────────────────────────────

function adjustImpl(
  state: TrackerState,
  fromId: string,
  toId: string,
  delta: number,
): DispositionChange {
  const key = relationshipKey(fromId, toId);
  const rel = state.relationships.get(key);
  if (rel === undefined) {
    throw new Error('Relationship ' + fromId + ' -> ' + toId + ' not found');
  }
  const previous = rel.disposition;
  rel.disposition = clampDisposition(state, previous + delta);
  return {
    fromEntityId: fromId,
    toEntityId: toId,
    previousDisposition: previous,
    newDisposition: rel.disposition,
    delta,
  };
}

// ─── Interaction ────────────────────────────────────────────────────

function interactionImpl(
  state: TrackerState,
  fromId: string,
  toId: string,
): boolean {
  const key = relationshipKey(fromId, toId);
  const rel = state.relationships.get(key);
  if (rel === undefined) return false;
  rel.interactionCount++;
  rel.lastInteractionAt = state.clock.nowMicroseconds();
  state.totalInteractions++;
  return true;
}

// ─── Type ───────────────────────────────────────────────────────────

function setTypeImpl(
  state: TrackerState,
  fromId: string,
  toId: string,
  type: RelationshipType,
): boolean {
  const key = relationshipKey(fromId, toId);
  const rel = state.relationships.get(key);
  if (rel === undefined) return false;
  rel.type = type;
  return true;
}

// ─── Queries ────────────────────────────────────────────────────────

function getImpl(
  state: TrackerState,
  fromId: string,
  toId: string,
): Relationship | undefined {
  const key = relationshipKey(fromId, toId);
  const rel = state.relationships.get(key);
  return rel !== undefined ? toReadonly(rel) : undefined;
}

function fromImpl(
  state: TrackerState,
  entityId: string,
): ReadonlyArray<Relationship> {
  const results: Relationship[] = [];
  for (const rel of state.relationships.values()) {
    if (rel.fromEntityId === entityId) {
      results.push(toReadonly(rel));
    }
  }
  return results;
}

function toImpl(
  state: TrackerState,
  entityId: string,
): ReadonlyArray<Relationship> {
  const results: Relationship[] = [];
  for (const rel of state.relationships.values()) {
    if (rel.toEntityId === entityId) {
      results.push(toReadonly(rel));
    }
  }
  return results;
}

function mutualImpl(
  state: TrackerState,
  entityId: string,
): ReadonlyArray<Relationship> {
  const results: Relationship[] = [];
  for (const rel of state.relationships.values()) {
    const involved = rel.fromEntityId === entityId
      || rel.toEntityId === entityId;
    if (involved) {
      results.push(toReadonly(rel));
    }
  }
  return results;
}

// ─── Remove ─────────────────────────────────────────────────────────

function removeImpl(
  state: TrackerState,
  fromId: string,
  toId: string,
): boolean {
  return state.relationships.delete(relationshipKey(fromId, toId));
}

function removeAllImpl(state: TrackerState, entityId: string): number {
  let removed = 0;
  const toDelete: string[] = [];
  for (const [key, rel] of state.relationships) {
    if (rel.fromEntityId === entityId || rel.toEntityId === entityId) {
      toDelete.push(key);
    }
  }
  for (const key of toDelete) {
    state.relationships.delete(key);
    removed++;
  }
  return removed;
}

// ─── Stats ──────────────────────────────────────────────────────────

function computeStats(state: TrackerState): RelationshipStats {
  let totalDisposition = 0;
  for (const rel of state.relationships.values()) {
    totalDisposition += rel.disposition;
  }
  const count = state.relationships.size;
  return {
    totalRelationships: count,
    totalInteractions: state.totalInteractions,
    averageDisposition: count > 0 ? totalDisposition / count : 0,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function relationshipKey(fromId: string, toId: string): string {
  return fromId + ':' + toId;
}

function clampDisposition(state: TrackerState, value: number): number {
  if (value < state.minDisposition) return state.minDisposition;
  if (value > state.maxDisposition) return state.maxDisposition;
  return value;
}

function toReadonly(rel: MutableRelationship): Relationship {
  return {
    fromEntityId: rel.fromEntityId,
    toEntityId: rel.toEntityId,
    type: rel.type,
    disposition: rel.disposition,
    interactionCount: rel.interactionCount,
    lastInteractionAt: rel.lastInteractionAt,
    formedAt: rel.formedAt,
    tags: [...rel.tags],
  };
}
