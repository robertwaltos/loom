/**
 * npc-faction.ts — NPC faction affinity tracking.
 *
 * Tracks NPC affinity values toward factions (Ascendancy, Foundation,
 * The Drift, or custom). Affinity is a numeric value [-100, 100]
 * where negative is hostile, zero is neutral, and positive is allied.
 * Supports adjustments, threshold queries, and dominant faction lookup.
 */

// ── Types ────────────────────────────────────────────────────────

interface FactionAffinity {
  readonly entityId: string;
  readonly factionId: string;
  readonly value: number;
}

type AffinityLevel = 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'allied';

interface AdjustAffinityParams {
  readonly entityId: string;
  readonly factionId: string;
  readonly delta: number;
}

interface FactionStats {
  readonly trackedEntities: number;
  readonly totalAdjustments: number;
}

// ── Constants ────────────────────────────────────────────────────

const AFFINITY_MIN = -100;
const AFFINITY_MAX = 100;

// ── Public API ───────────────────────────────────────────────────

interface NpcFactionTracker {
  readonly setAffinity: (entityId: string, factionId: string, value: number) => FactionAffinity;
  readonly adjustAffinity: (params: AdjustAffinityParams) => FactionAffinity;
  readonly getAffinity: (entityId: string, factionId: string) => number;
  readonly getAffinityLevel: (entityId: string, factionId: string) => AffinityLevel;
  readonly getAllAffinities: (entityId: string) => readonly FactionAffinity[];
  readonly getDominantFaction: (entityId: string) => string | undefined;
  readonly removeEntity: (entityId: string) => boolean;
  readonly getStats: () => FactionStats;
}

// ── State ────────────────────────────────────────────────────────

interface FactionState {
  readonly affinities: Map<string, Map<string, number>>;
  totalAdjustments: number;
}

// ── Helpers ──────────────────────────────────────────────────────

function clampAffinity(value: number): number {
  return Math.max(AFFINITY_MIN, Math.min(AFFINITY_MAX, value));
}

function classifyAffinity(value: number): AffinityLevel {
  if (value <= -50) return 'hostile';
  if (value < -10) return 'unfriendly';
  if (value <= 10) return 'neutral';
  if (value < 50) return 'friendly';
  return 'allied';
}

function getEntityMap(state: FactionState, entityId: string): Map<string, number> {
  let map = state.affinities.get(entityId);
  if (!map) {
    map = new Map();
    state.affinities.set(entityId, map);
  }
  return map;
}

// ── Operations ───────────────────────────────────────────────────

function setAffinityImpl(
  state: FactionState,
  entityId: string,
  factionId: string,
  value: number,
): FactionAffinity {
  const clamped = clampAffinity(value);
  getEntityMap(state, entityId).set(factionId, clamped);
  return { entityId, factionId, value: clamped };
}

function adjustAffinityImpl(state: FactionState, params: AdjustAffinityParams): FactionAffinity {
  const map = getEntityMap(state, params.entityId);
  const current = map.get(params.factionId) ?? 0;
  const clamped = clampAffinity(current + params.delta);
  map.set(params.factionId, clamped);
  state.totalAdjustments++;
  return {
    entityId: params.entityId,
    factionId: params.factionId,
    value: clamped,
  };
}

function getAllAffinitiesImpl(state: FactionState, entityId: string): readonly FactionAffinity[] {
  const map = state.affinities.get(entityId);
  if (!map) return [];
  const results: FactionAffinity[] = [];
  for (const [factionId, value] of map) {
    results.push({ entityId, factionId, value });
  }
  return results;
}

function getDominantFactionImpl(state: FactionState, entityId: string): string | undefined {
  const map = state.affinities.get(entityId);
  if (!map || map.size === 0) return undefined;
  let best: string | undefined;
  let bestValue = -Infinity;
  for (const [factionId, value] of map) {
    if (value > bestValue) {
      bestValue = value;
      best = factionId;
    }
  }
  return best;
}

// ── Factory ──────────────────────────────────────────────────────

function createNpcFactionTracker(): NpcFactionTracker {
  const state: FactionState = {
    affinities: new Map(),
    totalAdjustments: 0,
  };
  return {
    setAffinity: (eid, fid, v) => setAffinityImpl(state, eid, fid, v),
    adjustAffinity: (p) => adjustAffinityImpl(state, p),
    getAffinity: (eid, fid) => state.affinities.get(eid)?.get(fid) ?? 0,
    getAffinityLevel: (eid, fid) => classifyAffinity(state.affinities.get(eid)?.get(fid) ?? 0),
    getAllAffinities: (eid) => getAllAffinitiesImpl(state, eid),
    getDominantFaction: (eid) => getDominantFactionImpl(state, eid),
    removeEntity: (eid) => state.affinities.delete(eid),
    getStats: () => ({
      trackedEntities: state.affinities.size,
      totalAdjustments: state.totalAdjustments,
    }),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createNpcFactionTracker, AFFINITY_MIN, AFFINITY_MAX };
export type {
  NpcFactionTracker,
  FactionAffinity,
  AffinityLevel,
  AdjustAffinityParams,
  FactionStats,
};
