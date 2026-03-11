/**
 * NPC Social Network — Social graph and influence propagation.
 *
 * Tracks typed relationships between NPCs with strength values,
 * supports social graph queries (friends-of-friends, cliques),
 * relationship lifecycle events, and influence propagation.
 *
 * Relationship types:
 *   FAMILY, FRIEND, RIVAL, MENTOR, APPRENTICE, ROMANTIC, ENEMY, COLLEAGUE
 *
 * Relationship strength: -1.0 to 1.0
 *   +1.0  deep bond (family, soulmate)
 *    0.0  neutral acquaintance
 *   -1.0  bitter enmity
 *
 * "No thread weaves alone."
 */

// ── Ports ────────────────────────────────────────────────────────

interface SocialClock {
  readonly nowMicroseconds: () => number;
}

interface SocialIdGenerator {
  readonly next: () => string;
}

interface SocialDeps {
  readonly clock: SocialClock;
  readonly idGenerator: SocialIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type SocialRelationshipType =
  | 'family'
  | 'friend'
  | 'rival'
  | 'mentor'
  | 'apprentice'
  | 'romantic'
  | 'enemy'
  | 'colleague';

interface SocialRelationship {
  readonly relationshipId: string;
  readonly fromNpcId: string;
  readonly toNpcId: string;
  readonly relationshipType: SocialRelationshipType;
  readonly strength: number;
  readonly formedAt: number;
  readonly lastInteractionAt: number;
  readonly interactionCount: number;
}

interface FormSocialRelParams {
  readonly fromNpcId: string;
  readonly toNpcId: string;
  readonly relationshipType: SocialRelationshipType;
  readonly initialStrength?: number;
}

type SocialEventKind = 'meeting' | 'conflict' | 'gift' | 'betrayal' | 'cooperation' | 'insult';

interface SocialEvent {
  readonly eventId: string;
  readonly fromNpcId: string;
  readonly toNpcId: string;
  readonly kind: SocialEventKind;
  readonly strengthDelta: number;
  readonly createdAt: number;
}

interface RecordSocialEventParams {
  readonly fromNpcId: string;
  readonly toNpcId: string;
  readonly kind: SocialEventKind;
}

interface SocialInfluence {
  readonly opinion: string;
  readonly strength: number;
}

interface PropagateInfluenceParams {
  readonly sourceNpcId: string;
  readonly opinion: string;
  readonly strength: number;
  readonly maxDepth: number;
}

interface PropagateInfluenceResult {
  readonly reachedNpcs: ReadonlyArray<string>;
  readonly totalInfluenced: number;
}

interface SocialClique {
  readonly members: ReadonlyArray<string>;
  readonly averageStrength: number;
}

interface SocialStats {
  readonly totalRelationships: number;
  readonly totalEvents: number;
  readonly averageStrength: number;
  readonly isolatedNpcs: ReadonlyArray<string>;
}

interface NpcSocialNetwork {
  readonly formRelationship: (params: FormSocialRelParams) => SocialRelationship;
  readonly getRelationship: (fromId: string, toId: string) => SocialRelationship | undefined;
  readonly adjustStrength: (fromId: string, toId: string, delta: number) => number;
  readonly changeType: (fromId: string, toId: string, newType: SocialRelationshipType) => boolean;
  readonly removeRelationship: (fromId: string, toId: string) => boolean;
  readonly removeAllFor: (npcId: string) => number;
  readonly recordEvent: (params: RecordSocialEventParams) => SocialEvent;
  readonly getConnections: (npcId: string) => ReadonlyArray<SocialRelationship>;
  readonly getFriendsOfFriends: (npcId: string) => ReadonlyArray<string>;
  readonly findCliques: (minStrength: number) => ReadonlyArray<SocialClique>;
  readonly getIsolated: (knownNpcIds: ReadonlyArray<string>) => ReadonlyArray<string>;
  readonly propagateInfluence: (params: PropagateInfluenceParams) => PropagateInfluenceResult;
  readonly getInfluences: (npcId: string) => ReadonlyArray<SocialInfluence>;
  readonly getStats: () => SocialStats;
}

// ── Event Strength Deltas ────────────────────────────────────────

const EVENT_STRENGTH_DELTAS: Readonly<Record<SocialEventKind, number>> = {
  meeting: 0.05,
  cooperation: 0.15,
  gift: 0.2,
  conflict: -0.15,
  insult: -0.1,
  betrayal: -0.4,
};

// ── State ────────────────────────────────────────────────────────

interface MutableSocialRel {
  readonly relationshipId: string;
  readonly fromNpcId: string;
  readonly toNpcId: string;
  relationshipType: SocialRelationshipType;
  strength: number;
  readonly formedAt: number;
  lastInteractionAt: number;
  interactionCount: number;
}

interface SocialState {
  readonly deps: SocialDeps;
  readonly relationships: Map<string, MutableSocialRel>;
  readonly events: SocialEvent[];
  readonly influences: Map<string, SocialInfluence[]>;
}

// ── Operations ───────────────────────────────────────────────────

function formRelImpl(state: SocialState, params: FormSocialRelParams): SocialRelationship {
  const key = relKey(params.fromNpcId, params.toNpcId);
  const existing = state.relationships.get(key);
  if (existing !== undefined) return toReadonlyRel(existing);

  const now = state.deps.clock.nowMicroseconds();
  const rel: MutableSocialRel = {
    relationshipId: state.deps.idGenerator.next(),
    fromNpcId: params.fromNpcId,
    toNpcId: params.toNpcId,
    relationshipType: params.relationshipType,
    strength: clampStrength(params.initialStrength ?? 0),
    formedAt: now,
    lastInteractionAt: now,
    interactionCount: 0,
  };
  state.relationships.set(key, rel);
  return toReadonlyRel(rel);
}

function adjustStrengthImpl(
  state: SocialState,
  fromId: string,
  toId: string,
  delta: number,
): number {
  const rel = state.relationships.get(relKey(fromId, toId));
  if (rel === undefined) return 0;
  rel.strength = clampStrength(rel.strength + delta);
  rel.lastInteractionAt = state.deps.clock.nowMicroseconds();
  rel.interactionCount++;
  return rel.strength;
}

function recordEventImpl(state: SocialState, params: RecordSocialEventParams): SocialEvent {
  const delta = EVENT_STRENGTH_DELTAS[params.kind];
  const key = relKey(params.fromNpcId, params.toNpcId);
  const rel = state.relationships.get(key);
  if (rel !== undefined) {
    rel.strength = clampStrength(rel.strength + delta);
    rel.lastInteractionAt = state.deps.clock.nowMicroseconds();
    rel.interactionCount++;
  }
  const event: SocialEvent = {
    eventId: state.deps.idGenerator.next(),
    fromNpcId: params.fromNpcId,
    toNpcId: params.toNpcId,
    kind: params.kind,
    strengthDelta: delta,
    createdAt: state.deps.clock.nowMicroseconds(),
  };
  state.events.push(event);
  return event;
}

function getConnectionsImpl(state: SocialState, npcId: string): ReadonlyArray<SocialRelationship> {
  const results: SocialRelationship[] = [];
  for (const rel of state.relationships.values()) {
    if (rel.fromNpcId === npcId || rel.toNpcId === npcId) {
      results.push(toReadonlyRel(rel));
    }
  }
  return results;
}

function getFriendsOfFriendsImpl(state: SocialState, npcId: string): ReadonlyArray<string> {
  const directFriends = new Set<string>();
  for (const rel of state.relationships.values()) {
    if (rel.fromNpcId === npcId && rel.strength > 0) directFriends.add(rel.toNpcId);
    if (rel.toNpcId === npcId && rel.strength > 0) directFriends.add(rel.fromNpcId);
  }
  const fof = new Set<string>();
  for (const friend of directFriends) {
    for (const rel of state.relationships.values()) {
      if (rel.fromNpcId === friend && rel.strength > 0) fof.add(rel.toNpcId);
      if (rel.toNpcId === friend && rel.strength > 0) fof.add(rel.fromNpcId);
    }
  }
  fof.delete(npcId);
  for (const f of directFriends) {
    fof.delete(f);
  }
  return [...fof];
}

function findCliquesImpl(state: SocialState, minStrength: number): ReadonlyArray<SocialClique> {
  const adjacency = buildAdjacency(state, minStrength);
  const visited = new Set<string>();
  const cliques: SocialClique[] = [];

  for (const npcId of adjacency.keys()) {
    if (visited.has(npcId)) continue;
    const members = bfsComponent(adjacency, npcId, visited);
    if (members.length >= 2) {
      const avgStrength = computeAverageStrength(state, members, minStrength);
      cliques.push({ members, averageStrength: avgStrength });
    }
  }
  return cliques;
}

function buildAdjacency(state: SocialState, minStrength: number): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const rel of state.relationships.values()) {
    if (rel.strength < minStrength) continue;
    ensureSet(adj, rel.fromNpcId).add(rel.toNpcId);
    ensureSet(adj, rel.toNpcId).add(rel.fromNpcId);
  }
  return adj;
}

function ensureSet(map: Map<string, Set<string>>, key: string): Set<string> {
  let set = map.get(key);
  if (set === undefined) {
    set = new Set<string>();
    map.set(key, set);
  }
  return set;
}

function bfsComponent(
  adjacency: Map<string, Set<string>>,
  start: string,
  visited: Set<string>,
): string[] {
  const queue = [start];
  const members: string[] = [];
  visited.add(start);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    members.push(current);
    const neighbors = adjacency.get(current);
    if (neighbors === undefined) continue;
    for (const n of neighbors) {
      if (!visited.has(n)) {
        visited.add(n);
        queue.push(n);
      }
    }
  }
  return members;
}

function computeAverageStrength(
  state: SocialState,
  members: readonly string[],
  minStrength: number,
): number {
  const memberSet = new Set(members);
  let sum = 0;
  let count = 0;
  for (const rel of state.relationships.values()) {
    if (!memberSet.has(rel.fromNpcId) || !memberSet.has(rel.toNpcId)) continue;
    if (rel.strength < minStrength) continue;
    sum += rel.strength;
    count++;
  }
  return count > 0 ? sum / count : 0;
}

function propagateImpl(
  state: SocialState,
  params: PropagateInfluenceParams,
): PropagateInfluenceResult {
  const reached = new Set<string>();
  const queue: Array<{
    readonly npcId: string;
    readonly depth: number;
    readonly strength: number;
  }> = [];
  queue.push({ npcId: params.sourceNpcId, depth: 0, strength: params.strength });
  reached.add(params.sourceNpcId);
  addInfluence(state, params.sourceNpcId, params.opinion, params.strength);

  while (queue.length > 0) {
    const item = queue.shift();
    if (item === undefined) break;
    if (item.depth >= params.maxDepth) continue;
    propagateToNeighbors(state, item, params.opinion, reached, queue);
  }

  reached.delete(params.sourceNpcId);
  return { reachedNpcs: [...reached], totalInfluenced: reached.size };
}

function propagateToNeighbors(
  state: SocialState,
  item: { readonly npcId: string; readonly depth: number; readonly strength: number },
  opinion: string,
  reached: Set<string>,
  queue: Array<{ readonly npcId: string; readonly depth: number; readonly strength: number }>,
): void {
  for (const rel of state.relationships.values()) {
    const neighbor = getNeighbor(rel, item.npcId);
    if (neighbor === null || reached.has(neighbor)) continue;
    if (rel.strength <= 0) continue;
    const propagated = item.strength * rel.strength * 0.5;
    if (Math.abs(propagated) < 0.01) continue;
    reached.add(neighbor);
    addInfluence(state, neighbor, opinion, propagated);
    queue.push({ npcId: neighbor, depth: item.depth + 1, strength: propagated });
  }
}

function getNeighbor(rel: MutableSocialRel, npcId: string): string | null {
  if (rel.fromNpcId === npcId) return rel.toNpcId;
  if (rel.toNpcId === npcId) return rel.fromNpcId;
  return null;
}

function addInfluence(state: SocialState, npcId: string, opinion: string, strength: number): void {
  let list = state.influences.get(npcId);
  if (list === undefined) {
    list = [];
    state.influences.set(npcId, list);
  }
  list.push({ opinion, strength });
}

function getStatsImpl(state: SocialState): SocialStats {
  let totalStrength = 0;
  const count = state.relationships.size;
  const connected = new Set<string>();
  for (const rel of state.relationships.values()) {
    totalStrength += rel.strength;
    connected.add(rel.fromNpcId);
    connected.add(rel.toNpcId);
  }
  return {
    totalRelationships: count,
    totalEvents: state.events.length,
    averageStrength: count > 0 ? totalStrength / count : 0,
    isolatedNpcs: [],
  };
}

function getIsolatedImpl(
  state: SocialState,
  knownNpcIds: ReadonlyArray<string>,
): ReadonlyArray<string> {
  const connected = new Set<string>();
  for (const rel of state.relationships.values()) {
    connected.add(rel.fromNpcId);
    connected.add(rel.toNpcId);
  }
  return knownNpcIds.filter((id) => !connected.has(id));
}

// ── Helpers ──────────────────────────────────────────────────────

function relKey(from: string, to: string): string {
  return from + ':' + to;
}

function clampStrength(value: number): number {
  if (value < -1) return -1;
  if (value > 1) return 1;
  return value;
}

function toReadonlyRel(rel: MutableSocialRel): SocialRelationship {
  return {
    relationshipId: rel.relationshipId,
    fromNpcId: rel.fromNpcId,
    toNpcId: rel.toNpcId,
    relationshipType: rel.relationshipType,
    strength: rel.strength,
    formedAt: rel.formedAt,
    lastInteractionAt: rel.lastInteractionAt,
    interactionCount: rel.interactionCount,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createNpcSocialNetwork(deps: SocialDeps): NpcSocialNetwork {
  const state: SocialState = {
    deps,
    relationships: new Map(),
    events: [],
    influences: new Map(),
  };

  return {
    formRelationship: (params) => formRelImpl(state, params),
    getRelationship: (f, t) => {
      const r = state.relationships.get(relKey(f, t));
      return r !== undefined ? toReadonlyRel(r) : undefined;
    },
    adjustStrength: (f, t, d) => adjustStrengthImpl(state, f, t, d),
    changeType: (f, t, newType) => {
      const r = state.relationships.get(relKey(f, t));
      if (r === undefined) return false;
      r.relationshipType = newType;
      return true;
    },
    removeRelationship: (f, t) => state.relationships.delete(relKey(f, t)),
    removeAllFor: (npcId) => removeAllForImpl(state, npcId),
    recordEvent: (params) => recordEventImpl(state, params),
    getConnections: (npcId) => getConnectionsImpl(state, npcId),
    getFriendsOfFriends: (npcId) => getFriendsOfFriendsImpl(state, npcId),
    findCliques: (min) => findCliquesImpl(state, min),
    getIsolated: (ids) => getIsolatedImpl(state, ids),
    propagateInfluence: (params) => propagateImpl(state, params),
    getInfluences: (npcId) => state.influences.get(npcId) ?? [],
    getStats: () => getStatsImpl(state),
  };
}

function removeAllForImpl(state: SocialState, npcId: string): number {
  let removed = 0;
  const toDelete: string[] = [];
  for (const [key, rel] of state.relationships) {
    if (rel.fromNpcId === npcId || rel.toNpcId === npcId) toDelete.push(key);
  }
  for (const key of toDelete) {
    state.relationships.delete(key);
    removed++;
  }
  return removed;
}

// ── Exports ──────────────────────────────────────────────────────

export { createNpcSocialNetwork, EVENT_STRENGTH_DELTAS };
export type {
  NpcSocialNetwork,
  SocialDeps,
  SocialRelationshipType,
  SocialRelationship,
  FormSocialRelParams,
  SocialEventKind,
  SocialEvent,
  RecordSocialEventParams,
  SocialInfluence,
  PropagateInfluenceParams,
  PropagateInfluenceResult,
  SocialClique,
  SocialStats,
};
