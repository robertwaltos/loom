/**
 * crafting-engine.ts — Core crafting system for dynasty item production.
 *
 * Manages recipes, material requirements, crafting queues, and
 * quality outcomes. Dynasties discover recipes through exploration
 * and research, then produce items using gathered resources.
 *
 * Quality is determined by crafter skill, material quality, and
 * optional catalyst items. Higher quality items have better stats
 * and greater trade value.
 */

// ── Types ────────────────────────────────────────────────────────

export type CraftingCategory =
  | 'weapons'
  | 'armor'
  | 'tools'
  | 'consumables'
  | 'materials'
  | 'structures'
  | 'vehicles'
  | 'artifacts';

export type CraftingQuality = 'crude' | 'common' | 'fine' | 'superior' | 'masterwork' | 'legendary';

export type CraftingJobStatus =
  | 'queued'
  | 'in_progress'
  | 'quality_check'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface MaterialRequirement {
  readonly resourceId: string;
  readonly quantity: number;
  readonly minQuality: number;
}

export interface CraftingRecipe {
  readonly id: string;
  readonly name: string;
  readonly category: CraftingCategory;
  readonly materials: readonly MaterialRequirement[];
  readonly catalystSlots: number;
  readonly baseDurationMicroseconds: number;
  readonly baseSuccessRate: number;
  readonly minSkillLevel: number;
  readonly outputItemId: string;
  readonly outputQuantity: number;
  readonly discoveredBy: string | null;
  readonly discoveredAtMicroseconds: number;
}

export interface CraftingJob {
  readonly id: string;
  readonly recipeId: string;
  readonly dynastyId: string;
  readonly worldId: string;
  readonly status: CraftingJobStatus;
  readonly startedAtMicroseconds: number;
  readonly completesAtMicroseconds: number;
  readonly materialsConsumed: readonly MaterialConsumed[];
  readonly catalysts: readonly string[];
  readonly qualityRoll: number;
  readonly resultQuality: CraftingQuality | null;
  readonly resultItemId: string | null;
}

export interface MaterialConsumed {
  readonly resourceId: string;
  readonly quantity: number;
  readonly quality: number;
}

export interface CrafterProfile {
  readonly dynastyId: string;
  readonly skillLevels: ReadonlyMap<CraftingCategory, number>;
  readonly totalItemsCrafted: number;
  readonly totalFailures: number;
  readonly discoveredRecipes: ReadonlySet<string>;
}

export interface CraftingResult {
  readonly jobId: string;
  readonly success: boolean;
  readonly quality: CraftingQuality | null;
  readonly itemId: string | null;
  readonly experienceGained: number;
}

export interface StartCraftingParams {
  readonly dynastyId: string;
  readonly recipeId: string;
  readonly worldId: string;
  readonly catalysts?: readonly string[];
}

export interface CraftingStats {
  readonly totalRecipes: number;
  readonly totalActiveJobs: number;
  readonly totalCompletedJobs: number;
  readonly totalFailedJobs: number;
  readonly crafterCount: number;
}

// ── Port Interfaces ──────────────────────────────────────────────

export interface CraftingClock {
  readonly nowMicroseconds: () => number;
}

export interface CraftingIdGenerator {
  readonly generate: () => string;
}

export interface CraftingMaterialPort {
  readonly hasMaterials: (dynastyId: string, materials: readonly MaterialRequirement[]) => boolean;
  readonly consumeMaterials: (
    dynastyId: string,
    materials: readonly MaterialRequirement[],
  ) => readonly MaterialConsumed[];
  readonly returnMaterials: (dynastyId: string, materials: readonly MaterialConsumed[]) => void;
}

export interface CraftingOutputPort {
  readonly grantItem: (
    dynastyId: string,
    itemId: string,
    quantity: number,
    quality: CraftingQuality,
  ) => void;
}

export interface CraftingEngineDeps {
  readonly clock: CraftingClock;
  readonly idGenerator: CraftingIdGenerator;
  readonly materials: CraftingMaterialPort;
  readonly output: CraftingOutputPort;
}

// ── State ────────────────────────────────────────────────────────

interface CraftingState {
  readonly deps: CraftingEngineDeps;
  readonly recipes: Map<string, CraftingRecipe>;
  readonly jobs: Map<string, CraftingJob>;
  readonly crafters: Map<string, MutableCrafterProfile>;
}

interface MutableCrafterProfile {
  readonly dynastyId: string;
  readonly skillLevels: Map<CraftingCategory, number>;
  totalItemsCrafted: number;
  totalFailures: number;
  readonly discoveredRecipes: Set<string>;
}

// ── Quality Classification ───────────────────────────────────────

const QUALITY_THRESHOLDS: readonly { readonly min: number; readonly quality: CraftingQuality }[] = [
  { min: 0.95, quality: 'legendary' },
  { min: 0.85, quality: 'masterwork' },
  { min: 0.7, quality: 'superior' },
  { min: 0.5, quality: 'fine' },
  { min: 0.25, quality: 'common' },
  { min: 0.0, quality: 'crude' },
];

function classifyQuality(score: number): CraftingQuality {
  for (const threshold of QUALITY_THRESHOLDS) {
    if (score >= threshold.min) return threshold.quality;
  }
  return 'crude';
}

// ── Skill & Success Calculation ──────────────────────────────────

function getSkillLevel(crafter: MutableCrafterProfile, category: CraftingCategory): number {
  return crafter.skillLevels.get(category) ?? 0;
}

function calculateSuccessRate(baseRate: number, skillLevel: number, minSkill: number): number {
  const skillBonus = Math.max(0, skillLevel - minSkill) * 0.02;
  return Math.min(1.0, baseRate + skillBonus);
}

function calculateQualityScore(
  skillLevel: number,
  materialQuality: number,
  catalystCount: number,
): number {
  const skillFactor = Math.min(1.0, skillLevel / 100);
  const catalystBonus = catalystCount * 0.05;
  const raw = skillFactor * 0.5 + materialQuality * 0.3 + catalystBonus + Math.random() * 0.2;
  return Math.min(1.0, Math.max(0.0, raw));
}

function averageMaterialQuality(consumed: readonly MaterialConsumed[]): number {
  if (consumed.length === 0) return 0.5;
  let total = 0;
  for (const m of consumed) {
    total += m.quality;
  }
  return total / consumed.length;
}

// ── Experience Calculation ───────────────────────────────────────

function calculateExperience(recipe: CraftingRecipe, quality: CraftingQuality): number {
  const baseXp = recipe.minSkillLevel + 5;
  const qualityMultipliers: Record<CraftingQuality, number> = {
    crude: 0.5,
    common: 1.0,
    fine: 1.5,
    superior: 2.0,
    masterwork: 3.0,
    legendary: 5.0,
  };
  return Math.floor(baseXp * qualityMultipliers[quality]);
}

function applyExperience(
  crafter: MutableCrafterProfile,
  category: CraftingCategory,
  xp: number,
): void {
  const current = crafter.skillLevels.get(category) ?? 0;
  const newLevel = Math.min(100, current + Math.floor(xp / 10));
  crafter.skillLevels.set(category, newLevel);
}

// ── Recipe Management ────────────────────────────────────────────

function registerRecipe(state: CraftingState, recipe: CraftingRecipe): void {
  state.recipes.set(recipe.id, recipe);
}

function discoverRecipe(state: CraftingState, dynastyId: string, recipeId: string): boolean {
  const recipe = state.recipes.get(recipeId);
  if (recipe === undefined) return false;
  const crafter = ensureCrafter(state, dynastyId);
  if (crafter.discoveredRecipes.has(recipeId)) return false;
  crafter.discoveredRecipes.add(recipeId);
  return true;
}

function getRecipe(state: CraftingState, recipeId: string): CraftingRecipe | undefined {
  return state.recipes.get(recipeId);
}

function getRecipesByCategory(
  state: CraftingState,
  category: CraftingCategory,
): readonly CraftingRecipe[] {
  const result: CraftingRecipe[] = [];
  for (const recipe of state.recipes.values()) {
    if (recipe.category === category) result.push(recipe);
  }
  return result;
}

// ── Crafter Management ───────────────────────────────────────────

function ensureCrafter(state: CraftingState, dynastyId: string): MutableCrafterProfile {
  const existing = state.crafters.get(dynastyId);
  if (existing !== undefined) return existing;
  const profile: MutableCrafterProfile = {
    dynastyId,
    skillLevels: new Map(),
    totalItemsCrafted: 0,
    totalFailures: 0,
    discoveredRecipes: new Set(),
  };
  state.crafters.set(dynastyId, profile);
  return profile;
}

function getCrafterProfile(state: CraftingState, dynastyId: string): CrafterProfile | undefined {
  const profile = state.crafters.get(dynastyId);
  if (profile === undefined) return undefined;
  return {
    dynastyId: profile.dynastyId,
    skillLevels: new Map(profile.skillLevels),
    totalItemsCrafted: profile.totalItemsCrafted,
    totalFailures: profile.totalFailures,
    discoveredRecipes: new Set(profile.discoveredRecipes),
  };
}

// ── Job Management ───────────────────────────────────────────────

function startCrafting(state: CraftingState, params: StartCraftingParams): CraftingResult | string {
  const recipe = state.recipes.get(params.recipeId);
  if (recipe === undefined) return 'recipe_not_found';
  const crafter = ensureCrafter(state, params.dynastyId);
  const skill = getSkillLevel(crafter, recipe.category);
  if (skill < recipe.minSkillLevel) return 'insufficient_skill';
  if (!state.deps.materials.hasMaterials(params.dynastyId, recipe.materials)) {
    return 'insufficient_materials';
  }
  return executeJob(state, recipe, crafter, params);
}

function executeJob(
  state: CraftingState,
  recipe: CraftingRecipe,
  crafter: MutableCrafterProfile,
  params: StartCraftingParams,
): CraftingResult {
  const consumed = state.deps.materials.consumeMaterials(params.dynastyId, recipe.materials);
  const catalysts = params.catalysts ?? [];
  const skill = getSkillLevel(crafter, recipe.category);
  const successRate = calculateSuccessRate(recipe.baseSuccessRate, skill, recipe.minSkillLevel);
  const success = Math.random() < successRate;
  return finalizeCraftingJob(state, recipe, crafter, params, consumed, catalysts, skill, success);
}

function finalizeCraftingJob(
  state: CraftingState,
  recipe: CraftingRecipe,
  crafter: MutableCrafterProfile,
  params: StartCraftingParams,
  consumed: readonly MaterialConsumed[],
  catalysts: readonly string[],
  skill: number,
  success: boolean,
): CraftingResult {
  const jobId = state.deps.idGenerator.generate();
  const now = state.deps.clock.nowMicroseconds();
  if (!success) {
    return recordFailure(state, jobId, recipe, crafter, params, consumed, catalysts, now);
  }
  return recordSuccess(state, jobId, recipe, crafter, params, consumed, catalysts, skill, now);
}

function recordFailure(
  state: CraftingState,
  jobId: string,
  recipe: CraftingRecipe,
  crafter: MutableCrafterProfile,
  params: StartCraftingParams,
  consumed: readonly MaterialConsumed[],
  catalysts: readonly string[],
  now: number,
): CraftingResult {
  crafter.totalFailures += 1;
  const job: CraftingJob = {
    id: jobId,
    recipeId: recipe.id,
    dynastyId: params.dynastyId,
    worldId: params.worldId,
    status: 'failed',
    startedAtMicroseconds: now,
    completesAtMicroseconds: now,
    materialsConsumed: consumed,
    catalysts,
    qualityRoll: 0,
    resultQuality: null,
    resultItemId: null,
  };
  state.jobs.set(jobId, job);
  return { jobId, success: false, quality: null, itemId: null, experienceGained: 1 };
}

function recordSuccess(
  state: CraftingState,
  jobId: string,
  recipe: CraftingRecipe,
  crafter: MutableCrafterProfile,
  params: StartCraftingParams,
  consumed: readonly MaterialConsumed[],
  catalysts: readonly string[],
  skill: number,
  now: number,
): CraftingResult {
  const matQuality = averageMaterialQuality(consumed);
  const qualityScore = calculateQualityScore(skill, matQuality, catalysts.length);
  const quality = classifyQuality(qualityScore);
  state.deps.output.grantItem(
    params.dynastyId,
    recipe.outputItemId,
    recipe.outputQuantity,
    quality,
  );
  crafter.totalItemsCrafted += 1;
  const xp = calculateExperience(recipe, quality);
  applyExperience(crafter, recipe.category, xp);
  const job: CraftingJob = buildCompletedJob(
    jobId,
    recipe,
    params,
    consumed,
    catalysts,
    qualityScore,
    quality,
    now,
  );
  state.jobs.set(jobId, job);
  return { jobId, success: true, quality, itemId: recipe.outputItemId, experienceGained: xp };
}

function buildCompletedJob(
  jobId: string,
  recipe: CraftingRecipe,
  params: StartCraftingParams,
  consumed: readonly MaterialConsumed[],
  catalysts: readonly string[],
  qualityScore: number,
  quality: CraftingQuality,
  now: number,
): CraftingJob {
  return {
    id: jobId,
    recipeId: recipe.id,
    dynastyId: params.dynastyId,
    worldId: params.worldId,
    status: 'completed',
    startedAtMicroseconds: now,
    completesAtMicroseconds: now + recipe.baseDurationMicroseconds,
    materialsConsumed: consumed,
    catalysts,
    qualityRoll: qualityScore,
    resultQuality: quality,
    resultItemId: recipe.outputItemId,
  };
}

// ── Queries ──────────────────────────────────────────────────────

function getJobsByDynasty(state: CraftingState, dynastyId: string): readonly CraftingJob[] {
  const result: CraftingJob[] = [];
  for (const job of state.jobs.values()) {
    if (job.dynastyId === dynastyId) result.push(job);
  }
  return result;
}

function getStats(state: CraftingState): CraftingStats {
  let active = 0;
  let completed = 0;
  let failed = 0;
  for (const job of state.jobs.values()) {
    if (job.status === 'in_progress' || job.status === 'queued') active += 1;
    else if (job.status === 'completed') completed += 1;
    else if (job.status === 'failed') failed += 1;
  }
  return {
    totalRecipes: state.recipes.size,
    totalActiveJobs: active,
    totalCompletedJobs: completed,
    totalFailedJobs: failed,
    crafterCount: state.crafters.size,
  };
}

// ── Public API ──────────────────────────────────────────────────

export interface CraftingEngine {
  readonly registerRecipe: (recipe: CraftingRecipe) => void;
  readonly discoverRecipe: (dynastyId: string, recipeId: string) => boolean;
  readonly getRecipe: (recipeId: string) => CraftingRecipe | undefined;
  readonly getRecipesByCategory: (category: CraftingCategory) => readonly CraftingRecipe[];
  readonly startCrafting: (params: StartCraftingParams) => CraftingResult | string;
  readonly getCrafterProfile: (dynastyId: string) => CrafterProfile | undefined;
  readonly getJobsByDynasty: (dynastyId: string) => readonly CraftingJob[];
  readonly getStats: () => CraftingStats;
}

// ── Factory ─────────────────────────────────────────────────────

function createCraftingEngine(deps: CraftingEngineDeps): CraftingEngine {
  const state: CraftingState = {
    deps,
    recipes: new Map(),
    jobs: new Map(),
    crafters: new Map(),
  };

  return {
    registerRecipe: (recipe) => registerRecipe(state, recipe),
    discoverRecipe: (dynastyId, recipeId) => discoverRecipe(state, dynastyId, recipeId),
    getRecipe: (recipeId) => getRecipe(state, recipeId),
    getRecipesByCategory: (cat) => getRecipesByCategory(state, cat),
    startCrafting: (params) => startCrafting(state, params),
    getCrafterProfile: (dynastyId) => getCrafterProfile(state, dynastyId),
    getJobsByDynasty: (dynastyId) => getJobsByDynasty(state, dynastyId),
    getStats: () => getStats(state),
  };
}

// ── Exports ─────────────────────────────────────────────────────

export { createCraftingEngine };
