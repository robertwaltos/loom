/**
 * npc-crafting-ai.ts — NPC crafting decisions and resource gathering.
 *
 * Models NPC crafting behavior: recipe evaluation, resource gathering,
 * production decisions, and profitability scoring. NPCs choose recipes
 * based on skill level, available resources, market demand, and profit
 * potential. Tracks crafting history and resource consumption.
 */

// -- Ports ────────────────────────────────────────────────────────

interface CraftingClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface CraftingIdGeneratorPort {
  readonly next: () => string;
}

interface CraftingLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
}

interface NpcCraftingDeps {
  readonly clock: CraftingClockPort;
  readonly idGenerator: CraftingIdGeneratorPort;
  readonly logger: CraftingLoggerPort;
}

// -- Types ────────────────────────────────────────────────────────

type CraftingStatus = 'PLANNED' | 'GATHERING' | 'CRAFTING' | 'COMPLETED' | 'FAILED';

interface ResourceRequirement {
  readonly resourceId: string;
  readonly quantity: number;
}

interface Recipe {
  readonly recipeId: string;
  readonly name: string;
  readonly outputId: string;
  readonly outputQuantity: number;
  readonly requirements: readonly ResourceRequirement[];
  readonly skillRequired: number;
  readonly craftTimeUs: bigint;
  readonly baseValue: bigint;
}

interface RecipeEvaluation {
  readonly recipeId: string;
  readonly profitability: number;
  readonly feasibility: number;
  readonly priority: number;
  readonly missingResources: readonly string[];
}

interface ResourceGathering {
  readonly gatheringId: string;
  readonly npcId: string;
  readonly resourceId: string;
  readonly targetQuantity: number;
  readonly gatheredQuantity: number;
  readonly startedAt: bigint;
  readonly completedAt: bigint | undefined;
}

interface CraftingDecision {
  readonly decisionId: string;
  readonly npcId: string;
  readonly recipeId: string;
  readonly status: CraftingStatus;
  readonly skillLevel: number;
  readonly expectedProfit: bigint;
  readonly startedAt: bigint;
  readonly completedAt: bigint | undefined;
}

interface CraftingHistory {
  readonly npcId: string;
  readonly totalCrafted: number;
  readonly totalProfit: bigint;
  readonly successRate: number;
  readonly favoriteRecipe: string | undefined;
}

interface ProfitabilityScore {
  readonly recipeId: string;
  readonly revenue: bigint;
  readonly cost: bigint;
  readonly profit: bigint;
  readonly margin: number;
}

interface CraftingStats {
  readonly totalDecisions: number;
  readonly planned: number;
  readonly gathering: number;
  readonly crafting: number;
  readonly completed: number;
  readonly failed: number;
  readonly totalGatherings: number;
}

type EvaluateRecipeError = 'recipe_not_found' | 'skill_too_low';
type DecideToCraftError = 'recipe_not_found' | 'insufficient_resources';
type GatherResourceError = 'resource_not_found';
type ExecuteCraftError = 'decision_not_found' | 'not_ready';

// -- Constants ────────────────────────────────────────────────────

const PROFITABILITY_WEIGHT = 0.4;
const FEASIBILITY_WEIGHT = 0.35;
const SKILL_MATCH_WEIGHT = 0.25;
const MIN_PRIORITY_THRESHOLD = 0.5;
const RESOURCE_GATHERING_TIME_US = 600_000_000n;

// -- State ────────────────────────────────────────────────────────

interface MutableResourceGathering {
  readonly gatheringId: string;
  readonly npcId: string;
  readonly resourceId: string;
  readonly targetQuantity: number;
  gatheredQuantity: number;
  readonly startedAt: bigint;
  completedAt: bigint | undefined;
}

interface MutableCraftingDecision {
  readonly decisionId: string;
  readonly npcId: string;
  readonly recipeId: string;
  status: CraftingStatus;
  readonly skillLevel: number;
  readonly expectedProfit: bigint;
  readonly startedAt: bigint;
  completedAt: bigint | undefined;
}

interface NpcCraftingState {
  readonly deps: NpcCraftingDeps;
  readonly recipes: Map<string, Recipe>;
  readonly decisions: Map<string, MutableCraftingDecision>;
  readonly gatherings: Map<string, MutableResourceGathering>;
  readonly inventory: Map<string, Map<string, number>>;
  readonly craftingCounts: Map<string, number>;
}

// -- Helpers ──────────────────────────────────────────────────────

function toResourceGathering(g: MutableResourceGathering): ResourceGathering {
  return {
    gatheringId: g.gatheringId,
    npcId: g.npcId,
    resourceId: g.resourceId,
    targetQuantity: g.targetQuantity,
    gatheredQuantity: g.gatheredQuantity,
    startedAt: g.startedAt,
    completedAt: g.completedAt,
  };
}

function toCraftingDecision(d: MutableCraftingDecision): CraftingDecision {
  return {
    decisionId: d.decisionId,
    npcId: d.npcId,
    recipeId: d.recipeId,
    status: d.status,
    skillLevel: d.skillLevel,
    expectedProfit: d.expectedProfit,
    startedAt: d.startedAt,
    completedAt: d.completedAt,
  };
}

function getInventory(state: NpcCraftingState, npcId: string): Map<string, number> {
  let inv = state.inventory.get(npcId);
  if (!inv) {
    inv = new Map();
    state.inventory.set(npcId, inv);
  }
  return inv;
}

function getResourceCount(state: NpcCraftingState, npcId: string, resourceId: string): number {
  const inv = getInventory(state, npcId);
  return inv.get(resourceId) ?? 0;
}

function adjustResourceCount(
  state: NpcCraftingState,
  npcId: string,
  resourceId: string,
  delta: number,
): void {
  const inv = getInventory(state, npcId);
  const current = inv.get(resourceId) ?? 0;
  const next = Math.max(0, current + delta);
  inv.set(resourceId, next);
}

function hasRequiredResources(state: NpcCraftingState, npcId: string, recipe: Recipe): boolean {
  for (const req of recipe.requirements) {
    const available = getResourceCount(state, npcId, req.resourceId);
    if (available < req.quantity) return false;
  }
  return true;
}

function findMissingResources(state: NpcCraftingState, npcId: string, recipe: Recipe): string[] {
  const missing: string[] = [];
  for (const req of recipe.requirements) {
    const available = getResourceCount(state, npcId, req.resourceId);
    if (available < req.quantity) {
      missing.push(req.resourceId);
    }
  }
  return missing;
}

function computeFeasibility(
  state: NpcCraftingState,
  npcId: string,
  recipe: Recipe,
  skillLevel: number,
): number {
  const skillFactor = skillLevel >= recipe.skillRequired ? 1 : 0.5;
  const resourceFactor = hasRequiredResources(state, npcId, recipe) ? 1 : 0.3;
  return skillFactor * resourceFactor;
}

function computePriority(profitability: number, feasibility: number, skillMatch: number): number {
  const weighted =
    profitability * PROFITABILITY_WEIGHT +
    feasibility * FEASIBILITY_WEIGHT +
    skillMatch * SKILL_MATCH_WEIGHT;
  return Math.min(1, Math.max(0, weighted));
}

function countDecisionsByStatus(state: NpcCraftingState, status: CraftingStatus): number {
  let count = 0;
  for (const d of state.decisions.values()) {
    if (d.status === status) count++;
  }
  return count;
}

function findFavoriteRecipe(state: NpcCraftingState, npcId: string): string | undefined {
  const counts = new Map<string, number>();
  for (const d of state.decisions.values()) {
    if (d.npcId !== npcId) continue;
    if (d.status !== 'COMPLETED') continue;
    const current = counts.get(d.recipeId) ?? 0;
    counts.set(d.recipeId, current + 1);
  }
  let max = 0;
  let recipeId: string | undefined = undefined;
  for (const [rid, count] of counts.entries()) {
    if (count > max) {
      max = count;
      recipeId = rid;
    }
  }
  return recipeId;
}

function computeTotalProfit(state: NpcCraftingState, npcId: string): bigint {
  let total = 0n;
  for (const d of state.decisions.values()) {
    if (d.npcId !== npcId) continue;
    if (d.status === 'COMPLETED') {
      total = total + d.expectedProfit;
    }
  }
  return total;
}

function computeSuccessRate(state: NpcCraftingState, npcId: string): number {
  let completed = 0;
  let failed = 0;
  for (const d of state.decisions.values()) {
    if (d.npcId !== npcId) continue;
    if (d.status === 'COMPLETED') completed++;
    if (d.status === 'FAILED') failed++;
  }
  const total = completed + failed;
  if (total === 0) return 1;
  return completed / total;
}

// -- Operations ───────────────────────────────────────────────────

function registerRecipeImpl(
  state: NpcCraftingState,
  name: string,
  outputId: string,
  outputQuantity: number,
  requirements: readonly ResourceRequirement[],
  skillRequired: number,
  craftTimeUs: bigint,
  baseValue: bigint,
): Recipe {
  const recipe: Recipe = {
    recipeId: state.deps.idGenerator.next(),
    name,
    outputId,
    outputQuantity,
    requirements,
    skillRequired,
    craftTimeUs,
    baseValue,
  };
  state.recipes.set(recipe.recipeId, recipe);
  return recipe;
}

function evaluateRecipeImpl(
  state: NpcCraftingState,
  npcId: string,
  recipeId: string,
  skillLevel: number,
  demandMultiplier: number,
): RecipeEvaluation | EvaluateRecipeError {
  const recipe = state.recipes.get(recipeId);
  if (!recipe) return 'recipe_not_found';
  if (skillLevel < recipe.skillRequired) {
    return 'skill_too_low';
  }
  const feasibility = computeFeasibility(state, npcId, recipe, skillLevel);
  const profitability = (Number(recipe.baseValue) * demandMultiplier) / 1000;
  const skillMatch = skillLevel / recipe.skillRequired;
  const priority = computePriority(profitability, feasibility, skillMatch);
  const missing = findMissingResources(state, npcId, recipe);
  return {
    recipeId,
    profitability,
    feasibility,
    priority,
    missingResources: missing,
  };
}

function decideToCraftImpl(
  state: NpcCraftingState,
  npcId: string,
  recipeId: string,
  skillLevel: number,
): CraftingDecision | DecideToCraftError {
  const recipe = state.recipes.get(recipeId);
  if (!recipe) return 'recipe_not_found';
  if (!hasRequiredResources(state, npcId, recipe)) {
    return 'insufficient_resources';
  }
  const decision: MutableCraftingDecision = {
    decisionId: state.deps.idGenerator.next(),
    npcId,
    recipeId,
    status: 'PLANNED',
    skillLevel,
    expectedProfit: recipe.baseValue,
    startedAt: state.deps.clock.nowMicroseconds(),
    completedAt: undefined,
  };
  state.decisions.set(decision.decisionId, decision);
  return toCraftingDecision(decision);
}

function gatherResourcesImpl(
  state: NpcCraftingState,
  npcId: string,
  resourceId: string,
  quantity: number,
): ResourceGathering {
  const gathering: MutableResourceGathering = {
    gatheringId: state.deps.idGenerator.next(),
    npcId,
    resourceId,
    targetQuantity: quantity,
    gatheredQuantity: 0,
    startedAt: state.deps.clock.nowMicroseconds(),
    completedAt: undefined,
  };
  state.gatherings.set(gathering.gatheringId, gathering);
  return toResourceGathering(gathering);
}

function completeGatheringImpl(
  state: NpcCraftingState,
  gatheringId: string,
  amountGathered: number,
): ResourceGathering | string {
  const gathering = state.gatherings.get(gatheringId);
  if (!gathering) return 'gathering_not_found';
  gathering.gatheredQuantity = amountGathered;
  gathering.completedAt = state.deps.clock.nowMicroseconds();
  const npcId = gathering.npcId;
  const resourceId = gathering.resourceId;
  adjustResourceCount(state, npcId, resourceId, amountGathered);
  return toResourceGathering(gathering);
}

function executeCraftImpl(
  state: NpcCraftingState,
  decisionId: string,
): CraftingDecision | ExecuteCraftError {
  const decision = state.decisions.get(decisionId);
  if (!decision) return 'decision_not_found';
  if (decision.status !== 'PLANNED') {
    return 'not_ready';
  }
  const recipe = state.recipes.get(decision.recipeId);
  if (!recipe) return 'decision_not_found';
  if (!hasRequiredResources(state, decision.npcId, recipe)) {
    return 'not_ready';
  }
  return startCrafting(state, decision, recipe);
}

function startCrafting(
  state: NpcCraftingState,
  decision: MutableCraftingDecision,
  recipe: Recipe,
): CraftingDecision {
  for (const req of recipe.requirements) {
    adjustResourceCount(state, decision.npcId, req.resourceId, -req.quantity);
  }
  decision.status = 'CRAFTING';
  state.deps.logger.info('crafting started', {
    decisionId: decision.decisionId,
    npcId: decision.npcId,
    recipe: recipe.name,
  });
  return toCraftingDecision(decision);
}

function completeCraftImpl(
  state: NpcCraftingState,
  decisionId: string,
  success: boolean,
): CraftingDecision | string {
  const decision = state.decisions.get(decisionId);
  if (!decision) return 'decision_not_found';
  if (decision.status !== 'CRAFTING') {
    return 'not_crafting';
  }
  decision.status = success ? 'COMPLETED' : 'FAILED';
  decision.completedAt = state.deps.clock.nowMicroseconds();
  if (success) {
    const recipe = state.recipes.get(decision.recipeId);
    if (recipe) {
      const npcId = decision.npcId;
      const outputId = recipe.outputId;
      const outputQty = recipe.outputQuantity;
      adjustResourceCount(state, npcId, outputId, outputQty);
      const count = state.craftingCounts.get(npcId) ?? 0;
      state.craftingCounts.set(npcId, count + 1);
    }
  }
  return toCraftingDecision(decision);
}

function evaluateRecipesImpl(
  state: NpcCraftingState,
  npcId: string,
  skillLevel: number,
  demandMultiplier: number,
): readonly RecipeEvaluation[] {
  const results: RecipeEvaluation[] = [];
  for (const recipe of state.recipes.values()) {
    const evaluation = evaluateRecipeImpl(
      state,
      npcId,
      recipe.recipeId,
      skillLevel,
      demandMultiplier,
    );
    if (typeof evaluation === 'object') {
      if (evaluation.priority >= MIN_PRIORITY_THRESHOLD) {
        results.push(evaluation);
      }
    }
  }
  results.sort((a, b) => b.priority - a.priority);
  return results;
}

function getCraftingHistoryImpl(state: NpcCraftingState, npcId: string): CraftingHistory {
  const totalCrafted = state.craftingCounts.get(npcId) ?? 0;
  return {
    npcId,
    totalCrafted,
    totalProfit: computeTotalProfit(state, npcId),
    successRate: computeSuccessRate(state, npcId),
    favoriteRecipe: findFavoriteRecipe(state, npcId),
  };
}

function computeProfitabilityImpl(
  state: NpcCraftingState,
  recipeId: string,
  resourcePrices: Map<string, bigint>,
): ProfitabilityScore | string {
  const recipe = state.recipes.get(recipeId);
  if (!recipe) return 'recipe_not_found';
  let cost = 0n;
  for (const req of recipe.requirements) {
    const price = resourcePrices.get(req.resourceId) ?? 0n;
    cost = cost + price * BigInt(req.quantity);
  }
  const revenue = recipe.baseValue * BigInt(recipe.outputQuantity);
  const profit = revenue - cost;
  const margin = revenue > 0n ? Number(profit) / Number(revenue) : 0;
  return {
    recipeId,
    revenue,
    cost,
    profit,
    margin,
  };
}

function getCraftingDecisionImpl(
  state: NpcCraftingState,
  decisionId: string,
): CraftingDecision | undefined {
  const d = state.decisions.get(decisionId);
  return d ? toCraftingDecision(d) : undefined;
}

function getDecisionsByNpcImpl(
  state: NpcCraftingState,
  npcId: string,
): readonly CraftingDecision[] {
  const results: CraftingDecision[] = [];
  for (const d of state.decisions.values()) {
    if (d.npcId === npcId) {
      results.push(toCraftingDecision(d));
    }
  }
  return results;
}

function getCraftingStatsImpl(state: NpcCraftingState): CraftingStats {
  return {
    totalDecisions: state.decisions.size,
    planned: countDecisionsByStatus(state, 'PLANNED'),
    gathering: countDecisionsByStatus(state, 'GATHERING'),
    crafting: countDecisionsByStatus(state, 'CRAFTING'),
    completed: countDecisionsByStatus(state, 'COMPLETED'),
    failed: countDecisionsByStatus(state, 'FAILED'),
    totalGatherings: state.gatherings.size,
  };
}

// -- Public API ───────────────────────────────────────────────────

interface NpcCraftingSystem {
  readonly registerRecipe: (
    name: string,
    outputId: string,
    outputQuantity: number,
    requirements: readonly ResourceRequirement[],
    skillRequired: number,
    craftTimeUs: bigint,
    baseValue: bigint,
  ) => Recipe;
  readonly evaluateRecipe: (
    npcId: string,
    recipeId: string,
    skillLevel: number,
    demandMultiplier: number,
  ) => RecipeEvaluation | EvaluateRecipeError;
  readonly evaluateRecipes: (
    npcId: string,
    skillLevel: number,
    demandMultiplier: number,
  ) => readonly RecipeEvaluation[];
  readonly decideToCraft: (
    npcId: string,
    recipeId: string,
    skillLevel: number,
  ) => CraftingDecision | DecideToCraftError;
  readonly gatherResources: (
    npcId: string,
    resourceId: string,
    quantity: number,
  ) => ResourceGathering;
  readonly completeGathering: (
    gatheringId: string,
    amountGathered: number,
  ) => ResourceGathering | string;
  readonly executeCraft: (decisionId: string) => CraftingDecision | ExecuteCraftError;
  readonly completeCraft: (decisionId: string, success: boolean) => CraftingDecision | string;
  readonly getCraftingHistory: (npcId: string) => CraftingHistory;
  readonly computeProfitability: (
    recipeId: string,
    resourcePrices: Map<string, bigint>,
  ) => ProfitabilityScore | string;
  readonly getCraftingDecision: (decisionId: string) => CraftingDecision | undefined;
  readonly getDecisionsByNpc: (npcId: string) => readonly CraftingDecision[];
  readonly getStats: () => CraftingStats;
}

// -- Factory ──────────────────────────────────────────────────────

function createNpcCraftingSystem(deps: NpcCraftingDeps): NpcCraftingSystem {
  const state: NpcCraftingState = {
    deps,
    recipes: new Map(),
    decisions: new Map(),
    gatherings: new Map(),
    inventory: new Map(),
    craftingCounts: new Map(),
  };
  return {
    registerRecipe: (name, out, qty, reqs, skill, time, val) =>
      registerRecipeImpl(state, name, out, qty, reqs, skill, time, val),
    evaluateRecipe: (npc, rid, skill, demand) => evaluateRecipeImpl(state, npc, rid, skill, demand),
    evaluateRecipes: (npc, skill, demand) => evaluateRecipesImpl(state, npc, skill, demand),
    decideToCraft: (npc, rid, skill) => decideToCraftImpl(state, npc, rid, skill),
    gatherResources: (npc, rid, qty) => gatherResourcesImpl(state, npc, rid, qty),
    completeGathering: (gid, amt) => completeGatheringImpl(state, gid, amt),
    executeCraft: (did) => executeCraftImpl(state, did),
    completeCraft: (did, success) => completeCraftImpl(state, did, success),
    getCraftingHistory: (npc) => getCraftingHistoryImpl(state, npc),
    computeProfitability: (rid, prices) => computeProfitabilityImpl(state, rid, prices),
    getCraftingDecision: (did) => getCraftingDecisionImpl(state, did),
    getDecisionsByNpc: (npc) => getDecisionsByNpcImpl(state, npc),
    getStats: () => getCraftingStatsImpl(state),
  };
}

// -- Exports ──────────────────────────────────────────────────────

export { createNpcCraftingSystem };
export {
  PROFITABILITY_WEIGHT,
  FEASIBILITY_WEIGHT,
  SKILL_MATCH_WEIGHT,
  MIN_PRIORITY_THRESHOLD,
  RESOURCE_GATHERING_TIME_US,
};
export type {
  NpcCraftingSystem,
  NpcCraftingDeps,
  CraftingStatus,
  ResourceRequirement,
  Recipe,
  RecipeEvaluation,
  ResourceGathering,
  CraftingDecision,
  CraftingHistory,
  ProfitabilityScore,
  CraftingStats,
  EvaluateRecipeError,
  DecideToCraftError,
  GatherResourceError,
  ExecuteCraftError,
};
