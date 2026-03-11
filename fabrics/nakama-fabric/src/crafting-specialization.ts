/**
 * crafting-specialization.ts — Crafting profession specialization trees.
 *
 * Dynasties can specialize in crafting professions, gaining bonuses
 * to specific categories. Specialization unlocks unique recipes,
 * reduces material costs, and improves quality outcomes.
 *
 * Each dynasty can hold up to 2 primary and 3 secondary specializations.
 * Primary specs get full bonuses, secondary specs get 50% bonuses.
 */

// ── Types ────────────────────────────────────────────────────────

export type SpecializationId =
  | 'blacksmith'
  | 'alchemist'
  | 'artificer'
  | 'weaver'
  | 'architect'
  | 'enchanter'
  | 'engineer'
  | 'apothecary';

export type SpecializationTier =
  | 'novice'
  | 'apprentice'
  | 'journeyman'
  | 'expert'
  | 'master'
  | 'grandmaster';

export type SpecializationSlot = 'primary' | 'secondary';

export interface SpecializationNode {
  readonly id: string;
  readonly specId: SpecializationId;
  readonly tier: SpecializationTier;
  readonly name: string;
  readonly description: string;
  readonly prerequisiteNodes: readonly string[];
  readonly qualityBonus: number;
  readonly costReduction: number;
  readonly speedBonus: number;
  readonly unlockRecipes: readonly string[];
}

export interface DynastySpecialization {
  readonly dynastyId: string;
  readonly specId: SpecializationId;
  readonly slot: SpecializationSlot;
  readonly tier: SpecializationTier;
  readonly experience: number;
  readonly unlockedNodes: ReadonlySet<string>;
  readonly activatedAtMicroseconds: number;
}

export interface SpecializationBonus {
  readonly qualityBonus: number;
  readonly costReduction: number;
  readonly speedBonus: number;
  readonly additionalRecipes: readonly string[];
}

export interface ActivateSpecParams {
  readonly dynastyId: string;
  readonly specId: SpecializationId;
  readonly slot: SpecializationSlot;
}

export interface UnlockNodeParams {
  readonly dynastyId: string;
  readonly specId: SpecializationId;
  readonly nodeId: string;
}

export interface SpecializationStats {
  readonly totalSpecializations: number;
  readonly primaryCount: number;
  readonly secondaryCount: number;
  readonly masteryCount: number;
}

// ── Port Interfaces ──────────────────────────────────────────────

export interface SpecializationClock {
  readonly nowMicroseconds: () => number;
}

// ── Deps ─────────────────────────────────────────────────────────

export interface SpecializationDeps {
  readonly clock: SpecializationClock;
}

// ── Constants ────────────────────────────────────────────────────

const MAX_PRIMARY = 2;
const MAX_SECONDARY = 3;
const SLOT_MULTIPLIER: Record<SpecializationSlot, number> = {
  primary: 1.0,
  secondary: 0.5,
};

const TIER_THRESHOLDS: readonly {
  readonly tier: SpecializationTier;
  readonly xpRequired: number;
}[] = [
  { tier: 'grandmaster', xpRequired: 10000 },
  { tier: 'master', xpRequired: 5000 },
  { tier: 'expert', xpRequired: 2000 },
  { tier: 'journeyman', xpRequired: 800 },
  { tier: 'apprentice', xpRequired: 200 },
  { tier: 'novice', xpRequired: 0 },
];

export { MAX_PRIMARY, MAX_SECONDARY };

// ── State ────────────────────────────────────────────────────────

interface SpecializationState {
  readonly deps: SpecializationDeps;
  readonly nodes: Map<string, SpecializationNode>;
  readonly dynastySpecs: Map<string, MutableDynastySpec[]>;
}

interface MutableDynastySpec {
  readonly dynastyId: string;
  readonly specId: SpecializationId;
  readonly slot: SpecializationSlot;
  tier: SpecializationTier;
  experience: number;
  readonly unlockedNodes: Set<string>;
  readonly activatedAtMicroseconds: number;
}

// ── Tier Calculation ─────────────────────────────────────────────

function tierFromExperience(xp: number): SpecializationTier {
  for (const threshold of TIER_THRESHOLDS) {
    if (xp >= threshold.xpRequired) return threshold.tier;
  }
  return 'novice';
}

// ── Node Registration ────────────────────────────────────────────

function registerNode(state: SpecializationState, node: SpecializationNode): void {
  state.nodes.set(node.id, node);
}

function getNode(state: SpecializationState, nodeId: string): SpecializationNode | undefined {
  return state.nodes.get(nodeId);
}

function getNodesForSpec(
  state: SpecializationState,
  specId: SpecializationId,
): readonly SpecializationNode[] {
  const result: SpecializationNode[] = [];
  for (const node of state.nodes.values()) {
    if (node.specId === specId) result.push(node);
  }
  return result;
}

// ── Specialization Management ────────────────────────────────────

function getDynastySpecs(state: SpecializationState, dynastyId: string): MutableDynastySpec[] {
  let specs = state.dynastySpecs.get(dynastyId);
  if (specs === undefined) {
    specs = [];
    state.dynastySpecs.set(dynastyId, specs);
  }
  return specs;
}

function countBySlot(specs: readonly MutableDynastySpec[], slot: SpecializationSlot): number {
  let count = 0;
  for (const s of specs) {
    if (s.slot === slot) count += 1;
  }
  return count;
}

function activateSpecialization(
  state: SpecializationState,
  params: ActivateSpecParams,
): DynastySpecialization | string {
  const specs = getDynastySpecs(state, params.dynastyId);
  const existing = specs.find((s) => s.specId === params.specId);
  if (existing !== undefined) return 'already_specialized';
  const maxSlots = params.slot === 'primary' ? MAX_PRIMARY : MAX_SECONDARY;
  if (countBySlot(specs, params.slot) >= maxSlots) return 'slot_limit_reached';
  return createDynastySpec(state, specs, params);
}

function createDynastySpec(
  state: SpecializationState,
  specs: MutableDynastySpec[],
  params: ActivateSpecParams,
): DynastySpecialization {
  const now = state.deps.clock.nowMicroseconds();
  const spec: MutableDynastySpec = {
    dynastyId: params.dynastyId,
    specId: params.specId,
    slot: params.slot,
    tier: 'novice',
    experience: 0,
    unlockedNodes: new Set(),
    activatedAtMicroseconds: now,
  };
  specs.push(spec);
  return toReadonlySpec(spec);
}

function gainExperience(
  state: SpecializationState,
  dynastyId: string,
  specId: SpecializationId,
  amount: number,
): DynastySpecialization | string {
  const specs = getDynastySpecs(state, dynastyId);
  const spec = specs.find((s) => s.specId === specId);
  if (spec === undefined) return 'not_specialized';
  spec.experience += amount;
  spec.tier = tierFromExperience(spec.experience);
  return toReadonlySpec(spec);
}

function unlockNode(
  state: SpecializationState,
  params: UnlockNodeParams,
): DynastySpecialization | string {
  const specs = getDynastySpecs(state, params.dynastyId);
  const spec = specs.find((s) => s.specId === params.specId);
  if (spec === undefined) return 'not_specialized';
  const node = state.nodes.get(params.nodeId);
  if (node === undefined) return 'node_not_found';
  if (node.specId !== params.specId) return 'wrong_specialization';
  if (spec.unlockedNodes.has(params.nodeId)) return 'already_unlocked';
  if (!hasNodePrerequisites(spec, node)) return 'missing_prerequisites';
  spec.unlockedNodes.add(params.nodeId);
  return toReadonlySpec(spec);
}

function hasNodePrerequisites(spec: MutableDynastySpec, node: SpecializationNode): boolean {
  for (const prereq of node.prerequisiteNodes) {
    if (!spec.unlockedNodes.has(prereq)) return false;
  }
  return true;
}

// ── Bonus Calculation ────────────────────────────────────────────

function calculateBonus(
  state: SpecializationState,
  dynastyId: string,
  specId: SpecializationId,
): SpecializationBonus {
  const specs = getDynastySpecs(state, dynastyId);
  const spec = specs.find((s) => s.specId === specId);
  if (spec === undefined) {
    return { qualityBonus: 0, costReduction: 0, speedBonus: 0, additionalRecipes: [] };
  }
  return aggregateNodeBonuses(state, spec);
}

function aggregateNodeBonuses(
  state: SpecializationState,
  spec: MutableDynastySpec,
): SpecializationBonus {
  let quality = 0;
  let cost = 0;
  let speed = 0;
  const recipes: string[] = [];
  const multiplier = SLOT_MULTIPLIER[spec.slot];
  for (const nodeId of spec.unlockedNodes) {
    const node = state.nodes.get(nodeId);
    if (node === undefined) continue;
    quality += node.qualityBonus * multiplier;
    cost += node.costReduction * multiplier;
    speed += node.speedBonus * multiplier;
    for (const r of node.unlockRecipes) recipes.push(r);
  }
  return {
    qualityBonus: quality,
    costReduction: cost,
    speedBonus: speed,
    additionalRecipes: recipes,
  };
}

// ── Queries ──────────────────────────────────────────────────────

function getSpecializations(
  state: SpecializationState,
  dynastyId: string,
): readonly DynastySpecialization[] {
  const specs = getDynastySpecs(state, dynastyId);
  return specs.map(toReadonlySpec);
}

function getSpecialization(
  state: SpecializationState,
  dynastyId: string,
  specId: SpecializationId,
): DynastySpecialization | undefined {
  const specs = getDynastySpecs(state, dynastyId);
  const found = specs.find((s) => s.specId === specId);
  if (found === undefined) return undefined;
  return toReadonlySpec(found);
}

function getStats(state: SpecializationState): SpecializationStats {
  let total = 0;
  let primary = 0;
  let secondary = 0;
  let mastery = 0;
  for (const specs of state.dynastySpecs.values()) {
    for (const spec of specs) {
      total += 1;
      if (spec.slot === 'primary') primary += 1;
      else secondary += 1;
      if (spec.tier === 'master' || spec.tier === 'grandmaster') mastery += 1;
    }
  }
  return {
    totalSpecializations: total,
    primaryCount: primary,
    secondaryCount: secondary,
    masteryCount: mastery,
  };
}

function toReadonlySpec(spec: MutableDynastySpec): DynastySpecialization {
  return {
    dynastyId: spec.dynastyId,
    specId: spec.specId,
    slot: spec.slot,
    tier: spec.tier,
    experience: spec.experience,
    unlockedNodes: new Set(spec.unlockedNodes),
    activatedAtMicroseconds: spec.activatedAtMicroseconds,
  };
}

// ── Public API ──────────────────────────────────────────────────

export interface SpecializationEngine {
  readonly registerNode: (node: SpecializationNode) => void;
  readonly getNode: (nodeId: string) => SpecializationNode | undefined;
  readonly getNodesForSpec: (specId: SpecializationId) => readonly SpecializationNode[];
  readonly activateSpecialization: (params: ActivateSpecParams) => DynastySpecialization | string;
  readonly gainExperience: (
    dynastyId: string,
    specId: SpecializationId,
    amount: number,
  ) => DynastySpecialization | string;
  readonly unlockNode: (params: UnlockNodeParams) => DynastySpecialization | string;
  readonly calculateBonus: (dynastyId: string, specId: SpecializationId) => SpecializationBonus;
  readonly getSpecializations: (dynastyId: string) => readonly DynastySpecialization[];
  readonly getSpecialization: (
    dynastyId: string,
    specId: SpecializationId,
  ) => DynastySpecialization | undefined;
  readonly getStats: () => SpecializationStats;
}

// ── Factory ─────────────────────────────────────────────────────

function createSpecializationEngine(deps: SpecializationDeps): SpecializationEngine {
  const state: SpecializationState = {
    deps,
    nodes: new Map(),
    dynastySpecs: new Map(),
  };

  return {
    registerNode: (node) => registerNode(state, node),
    getNode: (nodeId) => getNode(state, nodeId),
    getNodesForSpec: (specId) => getNodesForSpec(state, specId),
    activateSpecialization: (params) => activateSpecialization(state, params),
    gainExperience: (dynastyId, specId, amount) => gainExperience(state, dynastyId, specId, amount),
    unlockNode: (params) => unlockNode(state, params),
    calculateBonus: (dynastyId, specId) => calculateBonus(state, dynastyId, specId),
    getSpecializations: (dynastyId) => getSpecializations(state, dynastyId),
    getSpecialization: (dynastyId, specId) => getSpecialization(state, dynastyId, specId),
    getStats: () => getStats(state),
  };
}

// ── Exports ─────────────────────────────────────────────────────

export { createSpecializationEngine };
