/**
 * Resource Distribution — Mineral veins, energy deposits, and exotic matter.
 *
 * Resources exist in deposits with quantity and quality, influenced by
 * biome type, geological activity, and stellar classification. Deposits
 * deplete as they are extracted and remain hidden until surveyed.
 */

// ─── Types ──────────────────────────────────────────────────────────

export type ResourceType =
  | 'MINERALS'
  | 'ENERGY'
  | 'ORGANIC'
  | 'WATER'
  | 'RARE_EARTH'
  | 'EXOTIC_MATTER'
  | 'CRYSTAL'
  | 'GAS';

export type RarityTier = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface ResourceDeposit {
  readonly depositId: string;
  readonly resourceType: ResourceType;
  readonly rarity: RarityTier;
  readonly quality: number;
  readonly maxQuantity: number;
  readonly currentQuantity: number;
  readonly discovered: boolean;
  readonly x: number;
  readonly y: number;
  readonly biome: string;
}

export interface DepositPlacementInput {
  readonly seed: number;
  readonly biome: string;
  readonly x: number;
  readonly y: number;
  readonly stellarClass: string;
  readonly geologicalActivity: number;
}

export interface DistributionConfig {
  readonly depositsPerCell: number;
  readonly baseQuality: number;
  readonly rarityWeights: ReadonlyArray<number>;
}

export interface ExtractionResult {
  readonly extracted: number;
  readonly remaining: number;
  readonly depleted: boolean;
}

export interface DepositFilter {
  readonly resourceType?: ResourceType;
  readonly rarity?: RarityTier;
  readonly discoveredOnly?: boolean;
  readonly minQuality?: number;
}

export interface DistributionStats {
  readonly totalDeposits: number;
  readonly discoveredDeposits: number;
  readonly depletedDeposits: number;
  readonly byType: ReadonlyArray<{ readonly type: ResourceType; readonly count: number }>;
  readonly byRarity: ReadonlyArray<{ readonly tier: RarityTier; readonly count: number }>;
}

export interface ResourceDistribution {
  addDeposit(input: DepositPlacementInput): ResourceDeposit;
  getDeposit(depositId: string): ResourceDeposit | undefined;
  discoverDeposit(depositId: string): boolean;
  extractFromDeposit(depositId: string, amount: number): ExtractionResult | undefined;
  queryDeposits(filter: DepositFilter): ReadonlyArray<ResourceDeposit>;
  getStats(): DistributionStats;
  generateDepositsForCell(input: DepositPlacementInput): ReadonlyArray<ResourceDeposit>;
}

// ─── Constants ──────────────────────────────────────────────────────

const RARITY_TIERS: ReadonlyArray<RarityTier> = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];

const DEFAULT_RARITY_WEIGHTS: ReadonlyArray<number> = [0.45, 0.3, 0.15, 0.08, 0.02];

const RESOURCE_TYPES: ReadonlyArray<ResourceType> = [
  'MINERALS',
  'ENERGY',
  'ORGANIC',
  'WATER',
  'RARE_EARTH',
  'EXOTIC_MATTER',
  'CRYSTAL',
  'GAS',
];

const BIOME_RESOURCE_AFFINITY: Record<string, ReadonlyArray<ResourceType>> = {
  OCEAN: ['WATER', 'ORGANIC'],
  COAST: ['WATER', 'ORGANIC'],
  DESERT: ['MINERALS', 'ENERGY'],
  GRASSLAND: ['ORGANIC', 'WATER'],
  FOREST: ['ORGANIC', 'WATER'],
  JUNGLE: ['ORGANIC', 'WATER', 'GAS'],
  TUNDRA: ['MINERALS', 'GAS'],
  MOUNTAIN: ['MINERALS', 'CRYSTAL'],
  VOLCANIC: ['MINERALS', 'ENERGY', 'CRYSTAL'],
  SWAMP: ['ORGANIC', 'GAS'],
  ARCTIC: ['WATER', 'GAS'],
  SAVANNA: ['ORGANIC', 'MINERALS'],
  REEF: ['ORGANIC', 'CRYSTAL'],
  CAVE_SYSTEM: ['MINERALS', 'CRYSTAL'],
  CRYSTAL_FORMATION: ['CRYSTAL', 'ENERGY', 'EXOTIC_MATTER'],
};

const STELLAR_EXOTIC_BOOST: Record<string, number> = {
  O: 0.3,
  B: 0.2,
  A: 0.1,
  F: 0.05,
  G: 0.02,
  K: 0.01,
  M: 0.005,
};

const RARITY_QUANTITY_MULTIPLIER: Record<RarityTier, number> = {
  COMMON: 1.0,
  UNCOMMON: 0.7,
  RARE: 0.4,
  EPIC: 0.2,
  LEGENDARY: 0.08,
};

const DEFAULT_CONFIG: DistributionConfig = {
  depositsPerCell: 3,
  baseQuality: 0.5,
  rarityWeights: DEFAULT_RARITY_WEIGHTS,
};

// ─── State ──────────────────────────────────────────────────────────

interface MutableDeposit {
  readonly depositId: string;
  readonly resourceType: ResourceType;
  readonly rarity: RarityTier;
  readonly quality: number;
  readonly maxQuantity: number;
  currentQuantity: number;
  discovered: boolean;
  readonly x: number;
  readonly y: number;
  readonly biome: string;
}

interface DistributionState {
  readonly config: DistributionConfig;
  readonly deposits: Map<string, MutableDeposit>;
  nextId: number;
}

// ─── Factory ────────────────────────────────────────────────────────

export function createResourceDistribution(
  config: Partial<DistributionConfig> = {},
): ResourceDistribution {
  const state: DistributionState = {
    config: { ...DEFAULT_CONFIG, ...config },
    deposits: new Map(),
    nextId: 1,
  };

  return {
    addDeposit: (input) => addDepositImpl(state, input),
    getDeposit: (id) => state.deposits.get(id),
    discoverDeposit: (id) => discoverImpl(state, id),
    extractFromDeposit: (id, amt) => extractImpl(state, id, amt),
    queryDeposits: (filter) => queryImpl(state, filter),
    getStats: () => buildStats(state),
    generateDepositsForCell: (input) => generateForCell(state, input),
  };
}

// ─── Seeded Random ──────────────────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1103515245 + 12345) | 0;
    return Math.abs(s) / 2147483647;
  };
}

// ─── Add Deposit ────────────────────────────────────────────────────

function addDepositImpl(state: DistributionState, input: DepositPlacementInput): ResourceDeposit {
  const rng = seededRandom(input.seed);
  const resourceType = pickResourceType(rng, input.biome, input.stellarClass);
  const rarity = pickRarity(rng, state.config.rarityWeights);
  const quality = computeQuality(rng, state.config.baseQuality, input.geologicalActivity);
  const maxQuantity = computeMaxQuantity(rarity, quality);
  const deposit = buildDeposit(state, input, resourceType, rarity, quality, maxQuantity);

  state.deposits.set(deposit.depositId, deposit);
  return deposit;
}

function buildDeposit(
  state: DistributionState,
  input: DepositPlacementInput,
  resourceType: ResourceType,
  rarity: RarityTier,
  quality: number,
  maxQuantity: number,
): MutableDeposit {
  const id = 'dep-' + String(state.nextId);
  state.nextId += 1;

  return {
    depositId: id,
    resourceType,
    rarity,
    quality,
    maxQuantity,
    currentQuantity: maxQuantity,
    discovered: false,
    x: input.x,
    y: input.y,
    biome: input.biome,
  };
}

// ─── Resource Selection ─────────────────────────────────────────────

function pickResourceType(rng: () => number, biome: string, stellarClass: string): ResourceType {
  const exoticChance = STELLAR_EXOTIC_BOOST[stellarClass] ?? 0;
  if (rng() < exoticChance) return 'EXOTIC_MATTER';

  const affinity = BIOME_RESOURCE_AFFINITY[biome];
  if (affinity !== undefined && affinity.length > 0) {
    const idx = Math.floor(rng() * affinity.length);
    return affinity[idx] as ResourceType;
  }
  const idx = Math.floor(rng() * RESOURCE_TYPES.length);
  return RESOURCE_TYPES[idx] as ResourceType;
}

// ─── Rarity Selection ───────────────────────────────────────────────

function pickRarity(rng: () => number, weights: ReadonlyArray<number>): RarityTier {
  const roll = rng();
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i] ?? 0;
    if (roll < cumulative) return RARITY_TIERS[i] as RarityTier;
  }
  return 'COMMON';
}

// ─── Quality & Quantity ─────────────────────────────────────────────

function computeQuality(
  rng: () => number,
  baseQuality: number,
  geologicalActivity: number,
): number {
  const raw = baseQuality + (rng() - 0.5) * 0.4 + geologicalActivity * 0.1;
  return Math.max(0, Math.min(1, raw));
}

function computeMaxQuantity(rarity: RarityTier, quality: number): number {
  const base = 1000;
  const mult = RARITY_QUANTITY_MULTIPLIER[rarity];
  return Math.floor(base * mult * (0.5 + quality));
}

// ─── Discovery ──────────────────────────────────────────────────────

function discoverImpl(state: DistributionState, depositId: string): boolean {
  const deposit = state.deposits.get(depositId);
  if (deposit === undefined) return false;
  if (deposit.discovered) return false;
  deposit.discovered = true;
  return true;
}

// ─── Extraction ─────────────────────────────────────────────────────

function extractImpl(
  state: DistributionState,
  depositId: string,
  amount: number,
): ExtractionResult | undefined {
  const deposit = state.deposits.get(depositId);
  if (deposit === undefined) return undefined;
  if (deposit.currentQuantity <= 0) {
    return { extracted: 0, remaining: 0, depleted: true };
  }

  const extracted = Math.min(amount, deposit.currentQuantity);
  deposit.currentQuantity -= extracted;
  return {
    extracted,
    remaining: deposit.currentQuantity,
    depleted: deposit.currentQuantity <= 0,
  };
}

// ─── Query ──────────────────────────────────────────────────────────

function queryImpl(
  state: DistributionState,
  filter: DepositFilter,
): ReadonlyArray<ResourceDeposit> {
  const results: ResourceDeposit[] = [];
  for (const deposit of state.deposits.values()) {
    if (matchesFilter(deposit, filter)) results.push(deposit);
  }
  return results;
}

function matchesFilter(deposit: MutableDeposit, filter: DepositFilter): boolean {
  if (filter.resourceType !== undefined && deposit.resourceType !== filter.resourceType)
    return false;
  if (filter.rarity !== undefined && deposit.rarity !== filter.rarity) return false;
  if (filter.discoveredOnly === true && !deposit.discovered) return false;
  if (filter.minQuality !== undefined && deposit.quality < filter.minQuality) return false;
  return true;
}

// ─── Batch Generation ───────────────────────────────────────────────

function generateForCell(
  state: DistributionState,
  input: DepositPlacementInput,
): ReadonlyArray<ResourceDeposit> {
  const deposits: ResourceDeposit[] = [];
  for (let i = 0; i < state.config.depositsPerCell; i++) {
    const cellSeed = input.seed + i * 7727;
    const cellInput = { ...input, seed: cellSeed };
    deposits.push(addDepositImpl(state, cellInput));
  }
  return deposits;
}

// ─── Stats ──────────────────────────────────────────────────────────

function buildStats(state: DistributionState): DistributionStats {
  const typeCounts = new Map<ResourceType, number>();
  const rarityCounts = new Map<RarityTier, number>();
  let discovered = 0;
  let depleted = 0;

  for (const dep of state.deposits.values()) {
    typeCounts.set(dep.resourceType, (typeCounts.get(dep.resourceType) ?? 0) + 1);
    rarityCounts.set(dep.rarity, (rarityCounts.get(dep.rarity) ?? 0) + 1);
    if (dep.discovered) discovered++;
    if (dep.currentQuantity <= 0) depleted++;
  }

  return {
    totalDeposits: state.deposits.size,
    discoveredDeposits: discovered,
    depletedDeposits: depleted,
    byType: RESOURCE_TYPES.map((t) => ({ type: t, count: typeCounts.get(t) ?? 0 })),
    byRarity: RARITY_TIERS.map((r) => ({ tier: r, count: rarityCounts.get(r) ?? 0 })),
  };
}
