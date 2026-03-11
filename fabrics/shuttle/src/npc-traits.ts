/**
 * npc-traits.ts — NPC personality traits and trait inheritance.
 *
 * Defines a trait system for NPCs with typed trait categories,
 * numeric intensity values, trait compatibility scoring, and
 * inheritance rules for offspring trait derivation.
 */

// ── Ports ────────────────────────────────────────────────────────

interface TraitClock {
  readonly nowMicroseconds: () => number;
}

interface TraitIdGenerator {
  readonly next: () => string;
}

interface TraitSystemDeps {
  readonly clock: TraitClock;
  readonly idGenerator: TraitIdGenerator;
}

// ── Types ────────────────────────────────────────────────────────

type TraitCategory = 'temperament' | 'intellect' | 'social' | 'physical' | 'spiritual';

interface Trait {
  readonly traitId: string;
  readonly name: string;
  readonly category: TraitCategory;
  readonly intensity: number;
  readonly assignedAt: number;
}

interface AssignTraitParams {
  readonly npcId: string;
  readonly name: string;
  readonly category: TraitCategory;
  readonly intensity: number;
}

interface TraitProfile {
  readonly npcId: string;
  readonly traits: readonly Trait[];
  readonly dominantCategory: TraitCategory | undefined;
}

interface TraitCompatibility {
  readonly npcA: string;
  readonly npcB: string;
  readonly score: number;
}

interface InheritTraitsParams {
  readonly parentAId: string;
  readonly parentBId: string;
  readonly childNpcId: string;
}

interface TraitSystemStats {
  readonly trackedNpcs: number;
  readonly totalTraits: number;
  readonly averageTraitsPerNpc: number;
}

interface TraitSystem {
  readonly assign: (params: AssignTraitParams) => Trait;
  readonly remove: (npcId: string, traitId: string) => boolean;
  readonly getProfile: (npcId: string) => TraitProfile;
  readonly getTraitsByCategory: (npcId: string, category: TraitCategory) => readonly Trait[];
  readonly compatibility: (npcA: string, npcB: string) => TraitCompatibility;
  readonly inherit: (params: InheritTraitsParams) => readonly Trait[];
  readonly getStats: () => TraitSystemStats;
}

// ── State ────────────────────────────────────────────────────────

interface TraitSystemState {
  readonly deps: TraitSystemDeps;
  readonly npcTraits: Map<string, Trait[]>;
}

// ── Helpers ──────────────────────────────────────────────────────

function findDominant(traits: readonly Trait[]): TraitCategory | undefined {
  if (traits.length === 0) return undefined;
  const sums = new Map<TraitCategory, number>();
  for (const t of traits) {
    sums.set(t.category, (sums.get(t.category) ?? 0) + t.intensity);
  }
  let best: TraitCategory | undefined;
  let bestSum = 0;
  for (const [cat, sum] of sums) {
    if (sum > bestSum) {
      best = cat;
      bestSum = sum;
    }
  }
  return best;
}

function computeCompatibility(traitsA: readonly Trait[], traitsB: readonly Trait[]): number {
  if (traitsA.length === 0 || traitsB.length === 0) return 0;
  let shared = 0;
  for (const a of traitsA) {
    for (const b of traitsB) {
      if (a.category === b.category) shared++;
    }
  }
  const maxPossible = Math.max(traitsA.length, traitsB.length);
  return maxPossible > 0 ? shared / maxPossible : 0;
}

// ── Operations ───────────────────────────────────────────────────

function assignImpl(state: TraitSystemState, params: AssignTraitParams): Trait {
  const trait: Trait = {
    traitId: state.deps.idGenerator.next(),
    name: params.name,
    category: params.category,
    intensity: Math.max(0, Math.min(1, params.intensity)),
    assignedAt: state.deps.clock.nowMicroseconds(),
  };
  let list = state.npcTraits.get(params.npcId);
  if (!list) {
    list = [];
    state.npcTraits.set(params.npcId, list);
  }
  list.push(trait);
  return trait;
}

function removeImpl(state: TraitSystemState, npcId: string, traitId: string): boolean {
  const list = state.npcTraits.get(npcId);
  if (!list) return false;
  const idx = list.findIndex((t) => t.traitId === traitId);
  if (idx < 0) return false;
  list.splice(idx, 1);
  return true;
}

function inheritImpl(state: TraitSystemState, params: InheritTraitsParams): Trait[] {
  const parentA = state.npcTraits.get(params.parentAId) ?? [];
  const parentB = state.npcTraits.get(params.parentBId) ?? [];
  const combined = [...parentA, ...parentB];
  const byCategory = new Map<TraitCategory, Trait[]>();
  for (const t of combined) {
    let catList = byCategory.get(t.category);
    if (!catList) {
      catList = [];
      byCategory.set(t.category, catList);
    }
    catList.push(t);
  }
  const inherited: Trait[] = [];
  for (const [category, catTraits] of byCategory) {
    const avgIntensity = catTraits.reduce((s, t) => s + t.intensity, 0) / catTraits.length;
    const first = catTraits[0];
    if (first === undefined) continue;
    const trait: Trait = {
      traitId: state.deps.idGenerator.next(),
      name: first.name,
      category,
      intensity: Math.max(0, Math.min(1, avgIntensity)),
      assignedAt: state.deps.clock.nowMicroseconds(),
    };
    inherited.push(trait);
  }
  state.npcTraits.set(params.childNpcId, inherited);
  return inherited;
}

function getStatsImpl(state: TraitSystemState): TraitSystemStats {
  let totalTraits = 0;
  for (const list of state.npcTraits.values()) {
    totalTraits += list.length;
  }
  const count = state.npcTraits.size;
  return {
    trackedNpcs: count,
    totalTraits,
    averageTraitsPerNpc: count > 0 ? totalTraits / count : 0,
  };
}

// ── Factory ──────────────────────────────────────────────────────

function createTraitSystem(deps: TraitSystemDeps): TraitSystem {
  const state: TraitSystemState = {
    deps,
    npcTraits: new Map(),
  };
  return {
    assign: (p) => assignImpl(state, p),
    remove: (npcId, traitId) => removeImpl(state, npcId, traitId),
    getProfile: (npcId) => {
      const traits = state.npcTraits.get(npcId) ?? [];
      return { npcId, traits, dominantCategory: findDominant(traits) };
    },
    getTraitsByCategory: (npcId, cat) => {
      const traits = state.npcTraits.get(npcId) ?? [];
      return traits.filter((t) => t.category === cat);
    },
    compatibility: (a, b) => {
      const traitsA = state.npcTraits.get(a) ?? [];
      const traitsB = state.npcTraits.get(b) ?? [];
      return { npcA: a, npcB: b, score: computeCompatibility(traitsA, traitsB) };
    },
    inherit: (p) => inheritImpl(state, p),
    getStats: () => getStatsImpl(state),
  };
}

// ── Exports ──────────────────────────────────────────────────────

export { createTraitSystem };
export type {
  TraitSystem,
  TraitSystemDeps,
  TraitCategory,
  Trait,
  AssignTraitParams,
  TraitProfile,
  TraitCompatibility,
  InheritTraitsParams,
  TraitSystemStats,
};
