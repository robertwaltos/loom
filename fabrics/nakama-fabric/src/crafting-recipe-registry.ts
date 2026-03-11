/**
 * crafting-recipe-registry.ts — Recipe discovery, storage, and progression.
 *
 * Manages the universe of available crafting recipes, tracks which
 * dynasties have discovered which recipes, and handles recipe
 * research progression. Recipes can be discovered through exploration,
 * research, trading, or as quest rewards.
 */

// ── Types ────────────────────────────────────────────────────────

export type RecipeDiscoveryMethod =
  | 'exploration'
  | 'research'
  | 'trade'
  | 'quest_reward'
  | 'mentor'
  | 'experimentation'
  | 'ancient_artifact';

export type ResearchStatus = 'not_started' | 'in_progress' | 'completed' | 'abandoned';

export interface RecipeResearchProject {
  readonly id: string;
  readonly dynastyId: string;
  readonly targetRecipeId: string;
  readonly status: ResearchStatus;
  readonly progressPercent: number;
  readonly startedAtMicroseconds: number;
  readonly completedAtMicroseconds: number | null;
  readonly investedKalon: bigint;
  readonly requiredKalon: bigint;
}

export interface RecipeDiscoveryRecord {
  readonly dynastyId: string;
  readonly recipeId: string;
  readonly method: RecipeDiscoveryMethod;
  readonly discoveredAtMicroseconds: number;
  readonly worldId: string;
}

export interface RecipeUnlockRequirement {
  readonly recipeId: string;
  readonly prerequisiteRecipes: readonly string[];
  readonly minCrafterSkill: number;
  readonly researchCostKalon: bigint;
  readonly researchDurationMicroseconds: number;
}

export interface StartResearchParams {
  readonly dynastyId: string;
  readonly recipeId: string;
  readonly worldId: string;
}

export interface RecipeRegistryStats {
  readonly totalRecipes: number;
  readonly totalDiscoveries: number;
  readonly activeResearchProjects: number;
  readonly completedResearchProjects: number;
}

// ── Port Interfaces ──────────────────────────────────────────────

export interface RecipeRegistryClock {
  readonly nowMicroseconds: () => number;
}

export interface RecipeRegistryIdGenerator {
  readonly generate: () => string;
}

export interface RecipeKalonPort {
  readonly debit: (dynastyId: string, amount: bigint) => boolean;
  readonly refund: (dynastyId: string, amount: bigint) => void;
}

// ── Deps ─────────────────────────────────────────────────────────

export interface RecipeRegistryDeps {
  readonly clock: RecipeRegistryClock;
  readonly idGenerator: RecipeRegistryIdGenerator;
  readonly kalon: RecipeKalonPort;
}

// ── State ────────────────────────────────────────────────────────

interface RecipeRegistryState {
  readonly deps: RecipeRegistryDeps;
  readonly unlockRequirements: Map<string, RecipeUnlockRequirement>;
  readonly discoveries: RecipeDiscoveryRecord[];
  readonly dynastyDiscoveries: Map<string, Set<string>>;
  readonly researchProjects: Map<string, MutableResearchProject>;
}

interface MutableResearchProject {
  readonly id: string;
  readonly dynastyId: string;
  readonly targetRecipeId: string;
  status: ResearchStatus;
  progressPercent: number;
  readonly startedAtMicroseconds: number;
  completedAtMicroseconds: number | null;
  investedKalon: bigint;
  readonly requiredKalon: bigint;
}

// ── Unlock Requirements ──────────────────────────────────────────

function registerUnlockRequirement(state: RecipeRegistryState, req: RecipeUnlockRequirement): void {
  state.unlockRequirements.set(req.recipeId, req);
}

function hasPrerequisites(
  state: RecipeRegistryState,
  dynastyId: string,
  recipeId: string,
): boolean {
  const req = state.unlockRequirements.get(recipeId);
  if (req === undefined) return true;
  const dynastyRecipes = state.dynastyDiscoveries.get(dynastyId);
  if (dynastyRecipes === undefined) return req.prerequisiteRecipes.length === 0;
  for (const prereq of req.prerequisiteRecipes) {
    if (!dynastyRecipes.has(prereq)) return false;
  }
  return true;
}

function canResearch(state: RecipeRegistryState, dynastyId: string, recipeId: string): boolean {
  if (!hasPrerequisites(state, dynastyId, recipeId)) return false;
  const dynastyRecipes = state.dynastyDiscoveries.get(dynastyId);
  if (dynastyRecipes !== undefined && dynastyRecipes.has(recipeId)) return false;
  return true;
}

// ── Discovery ────────────────────────────────────────────────────

function recordDiscovery(
  state: RecipeRegistryState,
  dynastyId: string,
  recipeId: string,
  method: RecipeDiscoveryMethod,
  worldId: string,
): boolean {
  let dynastySet = state.dynastyDiscoveries.get(dynastyId);
  if (dynastySet === undefined) {
    dynastySet = new Set();
    state.dynastyDiscoveries.set(dynastyId, dynastySet);
  }
  if (dynastySet.has(recipeId)) return false;
  dynastySet.add(recipeId);
  const record: RecipeDiscoveryRecord = {
    dynastyId,
    recipeId,
    method,
    discoveredAtMicroseconds: state.deps.clock.nowMicroseconds(),
    worldId,
  };
  state.discoveries.push(record);
  return true;
}

function hasDiscovered(state: RecipeRegistryState, dynastyId: string, recipeId: string): boolean {
  const dynastySet = state.dynastyDiscoveries.get(dynastyId);
  if (dynastySet === undefined) return false;
  return dynastySet.has(recipeId);
}

function getDiscoveries(
  state: RecipeRegistryState,
  dynastyId: string,
): readonly RecipeDiscoveryRecord[] {
  return state.discoveries.filter((d) => d.dynastyId === dynastyId);
}

// ── Research Projects ────────────────────────────────────────────

function startResearch(
  state: RecipeRegistryState,
  params: StartResearchParams,
): RecipeResearchProject | string {
  if (!canResearch(state, params.dynastyId, params.recipeId)) {
    return 'cannot_research';
  }
  const req = state.unlockRequirements.get(params.recipeId);
  const cost = req !== undefined ? req.researchCostKalon : 0n;
  if (cost > 0n && !state.deps.kalon.debit(params.dynastyId, cost)) {
    return 'insufficient_kalon';
  }
  return createResearchProject(state, params, cost);
}

function createResearchProject(
  state: RecipeRegistryState,
  params: StartResearchParams,
  cost: bigint,
): RecipeResearchProject {
  const id = state.deps.idGenerator.generate();
  const now = state.deps.clock.nowMicroseconds();
  const project: MutableResearchProject = {
    id,
    dynastyId: params.dynastyId,
    targetRecipeId: params.recipeId,
    status: 'in_progress',
    progressPercent: 0,
    startedAtMicroseconds: now,
    completedAtMicroseconds: null,
    investedKalon: cost,
    requiredKalon: cost,
  };
  state.researchProjects.set(id, project);
  return toReadonlyProject(project);
}

function advanceResearch(
  state: RecipeRegistryState,
  projectId: string,
  progressDelta: number,
): RecipeResearchProject | string {
  const project = state.researchProjects.get(projectId);
  if (project === undefined) return 'project_not_found';
  if (project.status !== 'in_progress') return 'project_not_active';
  project.progressPercent = Math.min(100, project.progressPercent + progressDelta);
  if (project.progressPercent >= 100) {
    return completeResearch(state, project);
  }
  return toReadonlyProject(project);
}

function completeResearch(
  state: RecipeRegistryState,
  project: MutableResearchProject,
): RecipeResearchProject {
  project.status = 'completed';
  project.progressPercent = 100;
  project.completedAtMicroseconds = state.deps.clock.nowMicroseconds();
  recordDiscovery(state, project.dynastyId, project.targetRecipeId, 'research', '');
  return toReadonlyProject(project);
}

function abandonResearch(
  state: RecipeRegistryState,
  projectId: string,
): RecipeResearchProject | string {
  const project = state.researchProjects.get(projectId);
  if (project === undefined) return 'project_not_found';
  if (project.status !== 'in_progress') return 'project_not_active';
  project.status = 'abandoned';
  const refundAmount = project.investedKalon / 2n;
  if (refundAmount > 0n) {
    state.deps.kalon.refund(project.dynastyId, refundAmount);
  }
  return toReadonlyProject(project);
}

// ── Queries ──────────────────────────────────────────────────────

function getResearchProjects(
  state: RecipeRegistryState,
  dynastyId: string,
): readonly RecipeResearchProject[] {
  const result: RecipeResearchProject[] = [];
  for (const project of state.researchProjects.values()) {
    if (project.dynastyId === dynastyId) {
      result.push(toReadonlyProject(project));
    }
  }
  return result;
}

function getActiveResearch(
  state: RecipeRegistryState,
  dynastyId: string,
): readonly RecipeResearchProject[] {
  const result: RecipeResearchProject[] = [];
  for (const project of state.researchProjects.values()) {
    if (project.dynastyId === dynastyId && project.status === 'in_progress') {
      result.push(toReadonlyProject(project));
    }
  }
  return result;
}

function getStats(state: RecipeRegistryState): RecipeRegistryStats {
  let active = 0;
  let completed = 0;
  for (const project of state.researchProjects.values()) {
    if (project.status === 'in_progress') active += 1;
    else if (project.status === 'completed') completed += 1;
  }
  return {
    totalRecipes: state.unlockRequirements.size,
    totalDiscoveries: state.discoveries.length,
    activeResearchProjects: active,
    completedResearchProjects: completed,
  };
}

function toReadonlyProject(project: MutableResearchProject): RecipeResearchProject {
  return {
    id: project.id,
    dynastyId: project.dynastyId,
    targetRecipeId: project.targetRecipeId,
    status: project.status,
    progressPercent: project.progressPercent,
    startedAtMicroseconds: project.startedAtMicroseconds,
    completedAtMicroseconds: project.completedAtMicroseconds,
    investedKalon: project.investedKalon,
    requiredKalon: project.requiredKalon,
  };
}

// ── Public API ──────────────────────────────────────────────────

export interface RecipeRegistry {
  readonly registerUnlockRequirement: (req: RecipeUnlockRequirement) => void;
  readonly canResearch: (dynastyId: string, recipeId: string) => boolean;
  readonly recordDiscovery: (
    dynastyId: string,
    recipeId: string,
    method: RecipeDiscoveryMethod,
    worldId: string,
  ) => boolean;
  readonly hasDiscovered: (dynastyId: string, recipeId: string) => boolean;
  readonly getDiscoveries: (dynastyId: string) => readonly RecipeDiscoveryRecord[];
  readonly startResearch: (params: StartResearchParams) => RecipeResearchProject | string;
  readonly advanceResearch: (
    projectId: string,
    progressDelta: number,
  ) => RecipeResearchProject | string;
  readonly abandonResearch: (projectId: string) => RecipeResearchProject | string;
  readonly getResearchProjects: (dynastyId: string) => readonly RecipeResearchProject[];
  readonly getActiveResearch: (dynastyId: string) => readonly RecipeResearchProject[];
  readonly getStats: () => RecipeRegistryStats;
}

// ── Factory ─────────────────────────────────────────────────────

function createRecipeRegistry(deps: RecipeRegistryDeps): RecipeRegistry {
  const state: RecipeRegistryState = {
    deps,
    unlockRequirements: new Map(),
    discoveries: [],
    dynastyDiscoveries: new Map(),
    researchProjects: new Map(),
  };

  return {
    registerUnlockRequirement: (req) => registerUnlockRequirement(state, req),
    canResearch: (dynastyId, recipeId) => canResearch(state, dynastyId, recipeId),
    recordDiscovery: (dynastyId, recipeId, method, worldId) =>
      recordDiscovery(state, dynastyId, recipeId, method, worldId),
    hasDiscovered: (dynastyId, recipeId) => hasDiscovered(state, dynastyId, recipeId),
    getDiscoveries: (dynastyId) => getDiscoveries(state, dynastyId),
    startResearch: (params) => startResearch(state, params),
    advanceResearch: (projectId, delta) => advanceResearch(state, projectId, delta),
    abandonResearch: (projectId) => abandonResearch(state, projectId),
    getResearchProjects: (dynastyId) => getResearchProjects(state, dynastyId),
    getActiveResearch: (dynastyId) => getActiveResearch(state, dynastyId),
    getStats: () => getStats(state),
  };
}

// ── Exports ─────────────────────────────────────────────────────

export { createRecipeRegistry };
