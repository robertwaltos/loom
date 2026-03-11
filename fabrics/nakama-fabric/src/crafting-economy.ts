/**
 * crafting-economy.ts — Recipe-based crafting economy with material tracking.
 *
 * Manages crafting recipes, crafter inventories, and production records.
 * Crafters consume materials to produce goods and earn KALON based on
 * recipe base cost, output quantity, and batch size.
 *
 * All KALON amounts stored as micro-KALON (bigint, 10^6 precision).
 * All timestamps stored as microseconds (bigint).
 */

// ── Types ────────────────────────────────────────────────────────

export type RecipeId = string;
export type MaterialId = string;
export type CrafterId = string;
export type WorldId = string;

export type RecipeError =
  | 'recipe-not-found'
  | 'insufficient-materials'
  | 'invalid-quantity'
  | 'crafter-not-found'
  | 'already-registered';

export interface Recipe {
  readonly recipeId: RecipeId;
  readonly name: string;
  readonly materials: ReadonlyArray<{ readonly materialId: MaterialId; readonly quantity: bigint }>;
  readonly outputQuantity: bigint;
  readonly baseCostKalon: bigint;
  readonly craftTimeUs: bigint;
}

export interface CrafterInventory {
  readonly crafterId: CrafterId;
  readonly worldId: WorldId;
  readonly materials: Map<MaterialId, bigint>;
  readonly kalonBalance: bigint;
}

export interface CraftingRecord {
  readonly recordId: string;
  readonly crafterId: CrafterId;
  readonly recipeId: RecipeId;
  readonly worldId: WorldId;
  readonly materialsConsumed: ReadonlyArray<{
    readonly materialId: MaterialId;
    readonly quantity: bigint;
  }>;
  readonly outputQuantity: bigint;
  readonly kalonEarned: bigint;
  readonly craftedAt: bigint;
}

export interface ProductionStats {
  readonly worldId: WorldId;
  readonly totalRecipes: number;
  readonly totalCrafts: number;
  readonly totalKalonCirculated: bigint;
  readonly mostCraftedRecipeId: string | null;
}

// ── System Interface ─────────────────────────────────────────────

export interface CraftingEconomySystem {
  registerRecipe(
    name: string,
    materials: ReadonlyArray<{ readonly materialId: MaterialId; readonly quantity: bigint }>,
    outputQuantity: bigint,
    baseCostKalon: bigint,
    craftTimeUs: bigint,
  ): Recipe;
  registerCrafter(
    crafterId: CrafterId,
    worldId: WorldId,
    initialKalon: bigint,
  ): { readonly success: true } | { readonly success: false; readonly error: RecipeError };
  addMaterial(
    crafterId: CrafterId,
    materialId: MaterialId,
    quantity: bigint,
  ): { readonly success: true } | { readonly success: false; readonly error: RecipeError };
  craft(
    crafterId: CrafterId,
    recipeId: RecipeId,
    quantity: bigint,
  ):
    | { readonly success: true; readonly record: CraftingRecord }
    | { readonly success: false; readonly error: RecipeError };
  getRecipe(recipeId: RecipeId): Recipe | undefined;
  getCrafter(crafterId: CrafterId): CrafterInventory | undefined;
  getCraftingHistory(crafterId: CrafterId, limit: number): ReadonlyArray<CraftingRecord>;
  getProductionStats(worldId: WorldId): ProductionStats;
}

// ── Ports ────────────────────────────────────────────────────────

interface CraftingEconomyClock {
  nowMicroseconds(): bigint;
}

interface CraftingEconomyIdGen {
  generateId(): string;
}

interface CraftingEconomyLogger {
  info(message: string, meta?: Record<string, unknown>): void;
}

export interface CraftingEconomyDeps {
  readonly clock: CraftingEconomyClock;
  readonly idGen: CraftingEconomyIdGen;
  readonly logger: CraftingEconomyLogger;
}

// ── Internal State ───────────────────────────────────────────────

interface MutableCrafterInventory {
  readonly crafterId: CrafterId;
  readonly worldId: WorldId;
  readonly materials: Map<MaterialId, bigint>;
  kalonBalance: bigint;
}

interface CraftingEconomyState {
  readonly recipes: Map<RecipeId, Recipe>;
  readonly crafters: Map<CrafterId, MutableCrafterInventory>;
  readonly records: CraftingRecord[];
  readonly deps: CraftingEconomyDeps;
}

// ── Recipe Operations ────────────────────────────────────────────

function registerRecipeImpl(
  state: CraftingEconomyState,
  name: string,
  materials: ReadonlyArray<{ readonly materialId: MaterialId; readonly quantity: bigint }>,
  outputQuantity: bigint,
  baseCostKalon: bigint,
  craftTimeUs: bigint,
): Recipe {
  const recipeId = state.deps.idGen.generateId();
  const recipe: Recipe = { recipeId, name, materials, outputQuantity, baseCostKalon, craftTimeUs };
  state.recipes.set(recipeId, recipe);
  state.deps.logger.info('recipe-registered', { recipeId, name });
  return recipe;
}

function getRecipeImpl(state: CraftingEconomyState, recipeId: RecipeId): Recipe | undefined {
  return state.recipes.get(recipeId);
}

// ── Crafter Operations ───────────────────────────────────────────

function registerCrafterImpl(
  state: CraftingEconomyState,
  crafterId: CrafterId,
  worldId: WorldId,
  initialKalon: bigint,
): { readonly success: true } | { readonly success: false; readonly error: RecipeError } {
  if (state.crafters.has(crafterId)) {
    return { success: false, error: 'already-registered' };
  }
  const crafter: MutableCrafterInventory = {
    crafterId,
    worldId,
    materials: new Map(),
    kalonBalance: initialKalon,
  };
  state.crafters.set(crafterId, crafter);
  state.deps.logger.info('crafter-registered', { crafterId, worldId });
  return { success: true };
}

function addMaterialImpl(
  state: CraftingEconomyState,
  crafterId: CrafterId,
  materialId: MaterialId,
  quantity: bigint,
): { readonly success: true } | { readonly success: false; readonly error: RecipeError } {
  const crafter = state.crafters.get(crafterId);
  if (crafter === undefined) {
    return { success: false, error: 'crafter-not-found' };
  }
  const current = crafter.materials.get(materialId) ?? 0n;
  crafter.materials.set(materialId, current + quantity);
  return { success: true };
}

function getCrafterImpl(
  state: CraftingEconomyState,
  crafterId: CrafterId,
): CrafterInventory | undefined {
  const crafter = state.crafters.get(crafterId);
  if (crafter === undefined) return undefined;
  return {
    crafterId: crafter.crafterId,
    worldId: crafter.worldId,
    materials: new Map(crafter.materials),
    kalonBalance: crafter.kalonBalance,
  };
}

// ── Crafting Operations ──────────────────────────────────────────

function checkMaterials(
  crafter: MutableCrafterInventory,
  recipe: Recipe,
  quantity: bigint,
): boolean {
  for (const req of recipe.materials) {
    const held = crafter.materials.get(req.materialId) ?? 0n;
    if (held < req.quantity * quantity) return false;
  }
  return true;
}

function deductMaterials(
  crafter: MutableCrafterInventory,
  recipe: Recipe,
  quantity: bigint,
): ReadonlyArray<{ readonly materialId: MaterialId; readonly quantity: bigint }> {
  const consumed: Array<{ readonly materialId: MaterialId; readonly quantity: bigint }> = [];
  for (const req of recipe.materials) {
    const needed = req.quantity * quantity;
    const held = crafter.materials.get(req.materialId) ?? 0n;
    crafter.materials.set(req.materialId, held - needed);
    consumed.push({ materialId: req.materialId, quantity: needed });
  }
  return consumed;
}

type CraftResult =
  | { readonly success: true; readonly record: CraftingRecord }
  | { readonly success: false; readonly error: RecipeError };

function buildCraftingRecord(
  state: CraftingEconomyState,
  crafter: MutableCrafterInventory,
  recipe: Recipe,
  quantity: bigint,
): CraftingRecord {
  const materialsConsumed = deductMaterials(crafter, recipe, quantity);
  const outputQuantity = recipe.outputQuantity * quantity;
  const kalonEarned = recipe.baseCostKalon * outputQuantity;
  crafter.kalonBalance += kalonEarned;
  return {
    recordId: state.deps.idGen.generateId(),
    crafterId: crafter.crafterId,
    recipeId: recipe.recipeId,
    worldId: crafter.worldId,
    materialsConsumed,
    outputQuantity,
    kalonEarned,
    craftedAt: state.deps.clock.nowMicroseconds(),
  };
}

function craftImpl(
  state: CraftingEconomyState,
  crafterId: CrafterId,
  recipeId: RecipeId,
  quantity: bigint,
): CraftResult {
  if (quantity < 1n) return { success: false, error: 'invalid-quantity' };
  const crafter = state.crafters.get(crafterId);
  if (crafter === undefined) return { success: false, error: 'crafter-not-found' };
  const recipe = state.recipes.get(recipeId);
  if (recipe === undefined) return { success: false, error: 'recipe-not-found' };
  if (!checkMaterials(crafter, recipe, quantity)) {
    return { success: false, error: 'insufficient-materials' };
  }
  const record = buildCraftingRecord(state, crafter, recipe, quantity);
  state.records.push(record);
  state.deps.logger.info('craft-completed', {
    crafterId,
    recipeId,
    kalonEarned: String(record.kalonEarned),
  });
  return { success: true, record };
}

// ── Query Operations ─────────────────────────────────────────────

function getCraftingHistoryImpl(
  state: CraftingEconomyState,
  crafterId: CrafterId,
  limit: number,
): ReadonlyArray<CraftingRecord> {
  const filtered = state.records.filter((r) => r.crafterId === crafterId);
  return filtered.slice(-limit);
}

function findMostCraftedRecipeId(records: CraftingRecord[], worldId: WorldId): string | null {
  const totals = new Map<string, bigint>();
  for (const r of records) {
    if (r.worldId !== worldId) continue;
    const current = totals.get(r.recipeId) ?? 0n;
    totals.set(r.recipeId, current + r.outputQuantity);
  }
  let topId: string | null = null;
  let topQty = 0n;
  for (const [id, qty] of totals) {
    if (qty > topQty) {
      topQty = qty;
      topId = id;
    }
  }
  return topId;
}

function getProductionStatsImpl(state: CraftingEconomyState, worldId: WorldId): ProductionStats {
  const worldRecords = state.records.filter((r) => r.worldId === worldId);
  const totalKalonCirculated = worldRecords.reduce((acc, r) => acc + r.kalonEarned, 0n);
  return {
    worldId,
    totalRecipes: state.recipes.size,
    totalCrafts: worldRecords.length,
    totalKalonCirculated,
    mostCraftedRecipeId: findMostCraftedRecipeId(state.records, worldId),
  };
}

// ── Factory ──────────────────────────────────────────────────────

export function createCraftingEconomySystem(deps: CraftingEconomyDeps): CraftingEconomySystem {
  const state: CraftingEconomyState = {
    recipes: new Map(),
    crafters: new Map(),
    records: [],
    deps,
  };

  return {
    registerRecipe: (name, materials, outputQuantity, baseCostKalon, craftTimeUs) =>
      registerRecipeImpl(state, name, materials, outputQuantity, baseCostKalon, craftTimeUs),
    registerCrafter: (crafterId, worldId, initialKalon) =>
      registerCrafterImpl(state, crafterId, worldId, initialKalon),
    addMaterial: (crafterId, materialId, quantity) =>
      addMaterialImpl(state, crafterId, materialId, quantity),
    craft: (crafterId, recipeId, quantity) => craftImpl(state, crafterId, recipeId, quantity),
    getRecipe: (recipeId) => getRecipeImpl(state, recipeId),
    getCrafter: (crafterId) => getCrafterImpl(state, crafterId),
    getCraftingHistory: (crafterId, limit) => getCraftingHistoryImpl(state, crafterId, limit),
    getProductionStats: (worldId) => getProductionStatsImpl(state, worldId),
  };
}
