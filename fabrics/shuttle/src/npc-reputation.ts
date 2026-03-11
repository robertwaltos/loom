/**
 * npc-reputation.ts — NPC reputation tracker.
 *
 * Tracks per-NPC reputation scores with other entities. Reputation
 * changes are bounded [-100, 100], with adjustments and decay
 * toward neutral over time.
 */

// ── Ports ────────────────────────────────────────────────────────

interface ReputationClock {
  readonly nowMicroseconds: () => number;
}

interface NpcReputationDeps {
  readonly clock: ReputationClock;
}

// ── Types ────────────────────────────────────────────────────────

interface ReputationEntry {
  readonly npcId: string;
  readonly targetId: string;
  score: number;
  lastUpdatedAt: number;
}

interface AdjustReputationParams {
  readonly npcId: string;
  readonly targetId: string;
  readonly delta: number;
}

type ReputationLevel = 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'allied';

interface NpcReputationStats {
  readonly totalEntries: number;
}

interface NpcReputationService {
  readonly adjust: (params: AdjustReputationParams) => number;
  readonly getScore: (npcId: string, targetId: string) => number;
  readonly getLevel: (npcId: string, targetId: string) => ReputationLevel;
  readonly getRelations: (npcId: string) => readonly ReputationEntry[];
  readonly decay: (amount: number) => number;
  readonly getStats: () => NpcReputationStats;
}

// ── Constants ────────────────────────────────────────────────────

const REPUTATION_MIN = -100;
const REPUTATION_MAX = 100;

// ── State ────────────────────────────────────────────────────────

interface ReputationState {
  readonly deps: NpcReputationDeps;
  readonly entries: Map<string, ReputationEntry>;
}

// ── Helpers ──────────────────────────────────────────────────────

function entryKey(npcId: string, targetId: string): string {
  return npcId + ':' + targetId;
}

function clampScore(score: number): number {
  return Math.max(REPUTATION_MIN, Math.min(REPUTATION_MAX, score));
}

function scoreToLevel(score: number): ReputationLevel {
  if (score <= -60) return 'hostile';
  if (score <= -20) return 'unfriendly';
  if (score < 20) return 'neutral';
  if (score < 60) return 'friendly';
  return 'allied';
}

// ── Operations ───────────────────────────────────────────────────

function adjustImpl(state: ReputationState, params: AdjustReputationParams): number {
  const key = entryKey(params.npcId, params.targetId);
  let entry = state.entries.get(key);
  if (!entry) {
    entry = {
      npcId: params.npcId,
      targetId: params.targetId,
      score: 0,
      lastUpdatedAt: state.deps.clock.nowMicroseconds(),
    };
    state.entries.set(key, entry);
  }
  entry.score = clampScore(entry.score + params.delta);
  entry.lastUpdatedAt = state.deps.clock.nowMicroseconds();
  return entry.score;
}

function getRelationsImpl(state: ReputationState, npcId: string): readonly ReputationEntry[] {
  const results: ReputationEntry[] = [];
  for (const entry of state.entries.values()) {
    if (entry.npcId === npcId) results.push(entry);
  }
  return results;
}

function decayImpl(state: ReputationState, amount: number): number {
  let decayed = 0;
  for (const entry of state.entries.values()) {
    if (entry.score === 0) continue;
    const direction = entry.score > 0 ? -1 : 1;
    const change = Math.min(Math.abs(entry.score), amount);
    entry.score = clampScore(entry.score + direction * change);
    decayed++;
  }
  return decayed;
}

// ── Factory ──────────────────────────────────────────────────────

function createNpcReputationService(deps: NpcReputationDeps): NpcReputationService {
  const state: ReputationState = { deps, entries: new Map() };
  return {
    adjust: (p) => adjustImpl(state, p),
    getScore: (npcId, targetId) => state.entries.get(entryKey(npcId, targetId))?.score ?? 0,
    getLevel: (npcId, targetId) =>
      scoreToLevel(state.entries.get(entryKey(npcId, targetId))?.score ?? 0),
    getRelations: (npcId) => getRelationsImpl(state, npcId),
    decay: (amount) => decayImpl(state, amount),
    getStats: () => ({ totalEntries: state.entries.size }),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createNpcReputationService, REPUTATION_MIN, REPUTATION_MAX };
export type {
  NpcReputationService,
  NpcReputationDeps,
  ReputationEntry,
  AdjustReputationParams,
  ReputationLevel,
  NpcReputationStats,
};
