// loot-table.ts — Item drop tables, rarity tiers, loot pools

interface LootClockPort {
  readonly nowMicroseconds: () => bigint;
}

interface LootIdPort {
  readonly generate: () => string;
}

interface LootLoggerPort {
  readonly info: (msg: string, ctx: Record<string, unknown>) => void;
  readonly warn: (msg: string, ctx: Record<string, unknown>) => void;
}

export interface LootDeps {
  readonly clock: LootClockPort;
  readonly idGen: LootIdPort;
  readonly logger: LootLoggerPort;
}

export type RarityTier = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'ARTIFACT';

export interface LootEntry {
  readonly itemId: string;
  readonly itemName: string;
  readonly rarity: RarityTier;
  readonly weight: number;
  readonly minQuantity: number;
  readonly maxQuantity: number;
}

export interface LootPool {
  readonly poolId: string;
  readonly name: string;
  readonly entries: ReadonlyArray<LootEntry>;
  readonly dropChance: number;
  readonly minDrops: number;
  readonly maxDrops: number;
}

export interface LootTable {
  readonly tableId: string;
  readonly name: string;
  readonly context: string;
  readonly pools: ReadonlyArray<LootPool>;
  readonly guaranteedItems: ReadonlyArray<string>;
}

export interface DroppedItem {
  readonly itemId: string;
  readonly itemName: string;
  readonly rarity: RarityTier;
  readonly quantity: number;
}

export interface LootRoll {
  readonly rollId: string;
  readonly tableId: string;
  readonly seed: bigint;
  readonly items: ReadonlyArray<DroppedItem>;
  readonly rolledAtMicros: bigint;
}

export interface LootTableModule {
  readonly createTable: (
    name: string,
    context: string,
    guaranteedItems: ReadonlyArray<string>,
  ) => string;
  readonly addPool: (tableId: string, pool: LootPool) => string | { error: string };
  readonly rollLoot: (tableId: string, seed?: bigint) => LootRoll | { error: string };
  readonly setDropRate: (
    tableId: string,
    poolId: string,
    rate: number,
  ) => string | { error: string };
  readonly getTableStats: (tableId: string) => TableStats | { error: string };
  readonly previewDrops: (tableId: string, iterations: number) => DropPreview;
  readonly removePool: (tableId: string, poolId: string) => string | { error: string };
  readonly getTable: (tableId: string) => LootTable | { error: string };
  readonly listTables: () => ReadonlyArray<LootTable>;
  readonly deleteTable: (tableId: string) => string | { error: string };
}

export interface TableStats {
  readonly tableId: string;
  readonly totalPools: number;
  readonly totalEntries: number;
  readonly rarityDistribution: Record<RarityTier, number>;
  readonly averageDropsPerRoll: number;
}

export interface DropPreview {
  readonly iterations: number;
  readonly itemFrequency: Record<string, number>;
  readonly rarityFrequency: Record<RarityTier, number>;
  readonly averageDropCount: number;
}

interface ModuleState {
  readonly tables: Map<string, LootTable>;
  readonly rollHistory: Map<string, LootRoll>;
}

export function createLootTableModule(deps: LootDeps): LootTableModule {
  const state: ModuleState = {
    tables: new Map(),
    rollHistory: new Map(),
  };

  return {
    createTable: (name, context, guaranteedItems) =>
      createTable(state, deps, name, context, guaranteedItems),
    addPool: (tableId, pool) => addPool(state, deps, tableId, pool),
    rollLoot: (tableId, seed) => rollLoot(state, deps, tableId, seed),
    setDropRate: (tableId, poolId, rate) => setDropRate(state, deps, tableId, poolId, rate),
    getTableStats: (tableId) => getTableStats(state, tableId),
    previewDrops: (tableId, iterations) => previewDrops(state, deps, tableId, iterations),
    removePool: (tableId, poolId) => removePool(state, deps, tableId, poolId),
    getTable: (tableId) => getTable(state, tableId),
    listTables: () => listTables(state),
    deleteTable: (tableId) => deleteTable(state, deps, tableId),
  };
}

function createTable(
  state: ModuleState,
  deps: LootDeps,
  name: string,
  context: string,
  guaranteedItems: ReadonlyArray<string>,
): string {
  const tableId = deps.idGen.generate();

  const table: LootTable = {
    tableId,
    name,
    context,
    pools: [],
    guaranteedItems,
  };

  state.tables.set(tableId, table);

  deps.logger.info('loot_table_created', { tableId, name, context });

  return tableId;
}

function addPool(
  state: ModuleState,
  deps: LootDeps,
  tableId: string,
  pool: LootPool,
): string | { error: string } {
  const table = state.tables.get(tableId);

  if (table === undefined) {
    return { error: 'TABLE_NOT_FOUND' };
  }

  if (pool.dropChance < 0 || pool.dropChance > 1) {
    return { error: 'INVALID_DROP_CHANCE' };
  }

  if (pool.minDrops < 0 || pool.maxDrops < pool.minDrops) {
    return { error: 'INVALID_DROP_RANGE' };
  }

  if (pool.entries.length === 0) {
    return { error: 'EMPTY_POOL' };
  }

  const existingPool = table.pools.find((p) => p.poolId === pool.poolId);
  if (existingPool !== undefined) {
    return { error: 'POOL_ALREADY_EXISTS' };
  }

  const updated: LootTable = {
    ...table,
    pools: [...table.pools, pool],
  };

  state.tables.set(tableId, updated);

  deps.logger.info('loot_pool_added', { tableId, poolId: pool.poolId });

  return pool.poolId;
}

function rollLoot(
  state: ModuleState,
  deps: LootDeps,
  tableId: string,
  seed?: bigint,
): LootRoll | { error: string } {
  const table = state.tables.get(tableId);

  if (table === undefined) {
    return { error: 'TABLE_NOT_FOUND' };
  }

  const now = deps.clock.nowMicroseconds();
  const actualSeed = seed !== undefined ? seed : now;
  const rng = createSeededRng(actualSeed);

  const droppedItems: DroppedItem[] = [];

  for (const itemId of table.guaranteedItems) {
    droppedItems.push({
      itemId,
      itemName: itemId,
      rarity: 'COMMON',
      quantity: 1,
    });
  }

  for (const pool of table.pools) {
    const roll = rng();
    if (roll >= pool.dropChance) {
      continue;
    }

    const dropCount = pool.minDrops + Math.floor(rng() * (pool.maxDrops - pool.minDrops + 1));

    for (let i = 0; i < dropCount; i = i + 1) {
      const entry = selectWeightedEntry(pool.entries, rng);
      if (entry === null) {
        continue;
      }

      const quantity =
        entry.minQuantity + Math.floor(rng() * (entry.maxQuantity - entry.minQuantity + 1));

      droppedItems.push({
        itemId: entry.itemId,
        itemName: entry.itemName,
        rarity: entry.rarity,
        quantity,
      });
    }
  }

  const rollId = deps.idGen.generate();

  const roll: LootRoll = {
    rollId,
    tableId,
    seed: actualSeed,
    items: droppedItems,
    rolledAtMicros: now,
  };

  state.rollHistory.set(rollId, roll);

  deps.logger.info('loot_rolled', { rollId, tableId, itemCount: droppedItems.length });

  return roll;
}

function createSeededRng(seed: bigint): () => number {
  let state = seed;

  return () => {
    state = (state * 1103515245n + 12345n) & 0x7fffffffn;
    return Number(state) / 0x7fffffff;
  };
}

function selectWeightedEntry(
  entries: ReadonlyArray<LootEntry>,
  rng: () => number,
): LootEntry | null {
  if (entries.length === 0) {
    return null;
  }

  let totalWeight = 0;
  for (const entry of entries) {
    totalWeight = totalWeight + entry.weight;
  }

  if (totalWeight === 0) {
    const randomIndex = Math.floor(rng() * entries.length);
    const selected = entries[randomIndex];
    return selected !== undefined ? selected : null;
  }

  const roll = rng() * totalWeight;
  let accumulated = 0;

  for (const entry of entries) {
    accumulated = accumulated + entry.weight;
    if (roll < accumulated) {
      return entry;
    }
  }

  const last = entries[entries.length - 1];
  return last !== undefined ? last : null;
}

function setDropRate(
  state: ModuleState,
  deps: LootDeps,
  tableId: string,
  poolId: string,
  rate: number,
): string | { error: string } {
  const table = state.tables.get(tableId);

  if (table === undefined) {
    return { error: 'TABLE_NOT_FOUND' };
  }

  if (rate < 0 || rate > 1) {
    return { error: 'INVALID_DROP_RATE' };
  }

  const poolIndex = table.pools.findIndex((p) => p.poolId === poolId);

  if (poolIndex === -1) {
    return { error: 'POOL_NOT_FOUND' };
  }

  const pool = table.pools[poolIndex];

  if (pool === undefined) {
    return { error: 'POOL_NOT_FOUND' };
  }

  const updatedPool: LootPool = {
    ...pool,
    dropChance: rate,
  };

  const updatedPools = [...table.pools];
  updatedPools[poolIndex] = updatedPool;

  const updatedTable: LootTable = {
    ...table,
    pools: updatedPools,
  };

  state.tables.set(tableId, updatedTable);

  deps.logger.info('drop_rate_updated', { tableId, poolId, rate });

  return poolId;
}

function getTableStats(state: ModuleState, tableId: string): TableStats | { error: string } {
  const table = state.tables.get(tableId);

  if (table === undefined) {
    return { error: 'TABLE_NOT_FOUND' };
  }

  let totalEntries = 0;
  const rarityDistribution: Record<RarityTier, number> = {
    COMMON: 0,
    UNCOMMON: 0,
    RARE: 0,
    EPIC: 0,
    LEGENDARY: 0,
    ARTIFACT: 0,
  };

  for (const pool of table.pools) {
    totalEntries = totalEntries + pool.entries.length;

    for (const entry of pool.entries) {
      rarityDistribution[entry.rarity] = rarityDistribution[entry.rarity] + 1;
    }
  }

  let expectedDrops = table.guaranteedItems.length;

  for (const pool of table.pools) {
    const avgDropsFromPool = pool.dropChance * ((pool.minDrops + pool.maxDrops) / 2);
    expectedDrops = expectedDrops + avgDropsFromPool;
  }

  return {
    tableId,
    totalPools: table.pools.length,
    totalEntries,
    rarityDistribution,
    averageDropsPerRoll: expectedDrops,
  };
}

function previewDrops(
  state: ModuleState,
  deps: LootDeps,
  tableId: string,
  iterations: number,
): DropPreview {
  const itemFrequency: Record<string, number> = {};
  const rarityFrequency: Record<RarityTier, number> = {
    COMMON: 0,
    UNCOMMON: 0,
    RARE: 0,
    EPIC: 0,
    LEGENDARY: 0,
    ARTIFACT: 0,
  };

  let totalDrops = 0;

  for (let i = 0; i < iterations; i = i + 1) {
    const seed = deps.clock.nowMicroseconds() + BigInt(i);
    const roll = rollLoot(state, deps, tableId, seed);

    if ('error' in roll) {
      continue;
    }

    totalDrops = totalDrops + roll.items.length;

    for (const item of roll.items) {
      const currentCount = itemFrequency[item.itemId] ?? 0;
      itemFrequency[item.itemId] = currentCount + item.quantity;

      rarityFrequency[item.rarity] = rarityFrequency[item.rarity] + 1;
    }
  }

  return {
    iterations,
    itemFrequency,
    rarityFrequency,
    averageDropCount: iterations > 0 ? totalDrops / iterations : 0,
  };
}

function removePool(
  state: ModuleState,
  deps: LootDeps,
  tableId: string,
  poolId: string,
): string | { error: string } {
  const table = state.tables.get(tableId);

  if (table === undefined) {
    return { error: 'TABLE_NOT_FOUND' };
  }

  const poolIndex = table.pools.findIndex((p) => p.poolId === poolId);

  if (poolIndex === -1) {
    return { error: 'POOL_NOT_FOUND' };
  }

  const updatedPools = table.pools.filter((p) => p.poolId !== poolId);

  const updatedTable: LootTable = {
    ...table,
    pools: updatedPools,
  };

  state.tables.set(tableId, updatedTable);

  deps.logger.info('loot_pool_removed', { tableId, poolId });

  return poolId;
}

function getTable(state: ModuleState, tableId: string): LootTable | { error: string } {
  const table = state.tables.get(tableId);

  if (table === undefined) {
    return { error: 'TABLE_NOT_FOUND' };
  }

  return table;
}

function listTables(state: ModuleState): ReadonlyArray<LootTable> {
  return Array.from(state.tables.values());
}

function deleteTable(
  state: ModuleState,
  deps: LootDeps,
  tableId: string,
): string | { error: string } {
  const table = state.tables.get(tableId);

  if (table === undefined) {
    return { error: 'TABLE_NOT_FOUND' };
  }

  state.tables.delete(tableId);

  deps.logger.info('loot_table_deleted', { tableId });

  return tableId;
}
