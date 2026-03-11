import { describe, it, expect, beforeEach } from 'vitest';
import {
  createLootTableModule,
  type LootDeps,
  type LootPool,
  type LootEntry,
  type RarityTier,
} from '../loot-table.js';

function createMockDeps(): LootDeps {
  let counter = 0;
  let now = 1000000000n;

  return {
    clock: {
      nowMicroseconds: () => now,
    },
    idGen: {
      generate: () => {
        counter = counter + 1;
        return 'id-' + String(counter);
      },
    },
    logger: {
      info: () => {},
      warn: () => {},
    },
  };
}

function createTestEntry(id: string, rarity: RarityTier, weight: number): LootEntry {
  return {
    itemId: id,
    itemName: 'Item ' + id,
    rarity,
    weight,
    minQuantity: 1,
    maxQuantity: 1,
  };
}

function createTestPool(id: string, entries: ReadonlyArray<LootEntry>): LootPool {
  return {
    poolId: id,
    name: 'Pool ' + id,
    entries,
    dropChance: 1.0,
    minDrops: 1,
    maxDrops: 1,
  };
}

describe('LootTableModule', () => {
  let deps: LootDeps;

  beforeEach(() => {
    deps = createMockDeps();
  });

  describe('createTable', () => {
    it('should create a new loot table', () => {
      const module = createLootTableModule(deps);

      const tableId = module.createTable('Dungeon Loot', 'dungeon', []);

      expect(tableId).toBe('id-1');
    });

    it('should create table with guaranteed items', () => {
      const module = createLootTableModule(deps);

      const tableId = module.createTable('Boss Loot', 'boss', ['gold', 'key']);
      const table = module.getTable(tableId);

      if ('error' in table) {
        throw new Error('Unexpected error');
      }

      expect(table.guaranteedItems).toEqual(['gold', 'key']);
    });

    it('should initialize table with empty pools', () => {
      const module = createLootTableModule(deps);

      const tableId = module.createTable('Test', 'test', []);
      const table = module.getTable(tableId);

      if ('error' in table) {
        throw new Error('Unexpected error');
      }

      expect(table.pools).toHaveLength(0);
    });

    it('should store table context', () => {
      const module = createLootTableModule(deps);

      const tableId = module.createTable('World Boss', 'world-boss', []);
      const table = module.getTable(tableId);

      if ('error' in table) {
        throw new Error('Unexpected error');
      }

      expect(table.context).toBe('world-boss');
    });
  });

  describe('addPool', () => {
    it('should add pool to table', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool = createTestPool('pool-1', [createTestEntry('item-1', 'COMMON', 100)]);

      const result = module.addPool(tableId, pool);

      expect(result).toBe('pool-1');
    });

    it('should reject pool for non-existent table', () => {
      const module = createLootTableModule(deps);

      const pool = createTestPool('pool-1', [createTestEntry('item-1', 'COMMON', 100)]);

      const result = module.addPool('invalid-id', pool);

      expect(result).toEqual({ error: 'TABLE_NOT_FOUND' });
    });

    it('should reject pool with invalid drop chance', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool: LootPool = {
        ...createTestPool('pool-1', [createTestEntry('item-1', 'COMMON', 100)]),
        dropChance: 1.5,
      };

      const result = module.addPool(tableId, pool);

      expect(result).toEqual({ error: 'INVALID_DROP_CHANCE' });
    });

    it('should reject pool with negative drop chance', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool: LootPool = {
        ...createTestPool('pool-1', [createTestEntry('item-1', 'COMMON', 100)]),
        dropChance: -0.1,
      };

      const result = module.addPool(tableId, pool);

      expect(result).toEqual({ error: 'INVALID_DROP_CHANCE' });
    });

    it('should reject pool with invalid drop range', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool: LootPool = {
        ...createTestPool('pool-1', [createTestEntry('item-1', 'COMMON', 100)]),
        minDrops: 5,
        maxDrops: 3,
      };

      const result = module.addPool(tableId, pool);

      expect(result).toEqual({ error: 'INVALID_DROP_RANGE' });
    });

    it('should reject empty pool', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool = createTestPool('pool-1', []);

      const result = module.addPool(tableId, pool);

      expect(result).toEqual({ error: 'EMPTY_POOL' });
    });

    it('should reject duplicate pool ID', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool = createTestPool('pool-1', [createTestEntry('item-1', 'COMMON', 100)]);

      module.addPool(tableId, pool);
      const result = module.addPool(tableId, pool);

      expect(result).toEqual({ error: 'POOL_ALREADY_EXISTS' });
    });
  });

  describe('rollLoot', () => {
    it('should roll loot and return items', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool = createTestPool('pool-1', [createTestEntry('sword', 'COMMON', 100)]);

      module.addPool(tableId, pool);

      const result = module.rollLoot(tableId);

      expect(result).not.toHaveProperty('error');
      if ('error' in result) {
        return;
      }

      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should return error for non-existent table', () => {
      const module = createLootTableModule(deps);

      const result = module.rollLoot('invalid-id');

      expect(result).toEqual({ error: 'TABLE_NOT_FOUND' });
    });

    it('should include guaranteed items in roll', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', ['gold', 'key']);

      const result = module.rollLoot(tableId);

      if ('error' in result) {
        throw new Error('Unexpected error');
      }

      const itemIds = result.items.map((i) => i.itemId);
      expect(itemIds).toContain('gold');
      expect(itemIds).toContain('key');
    });

    it('should use provided seed for deterministic rolls', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool = createTestPool('pool-1', [
        createTestEntry('item-1', 'COMMON', 50),
        createTestEntry('item-2', 'RARE', 50),
      ]);

      module.addPool(tableId, pool);

      const roll1 = module.rollLoot(tableId, 12345n);
      const roll2 = module.rollLoot(tableId, 12345n);

      if ('error' in roll1 || 'error' in roll2) {
        throw new Error('Unexpected error');
      }

      expect(roll1.items.length).toBe(roll2.items.length);
      expect(roll1.items[0]?.itemId).toBe(roll2.items[0]?.itemId);
    });

    it('should respect pool drop chance', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool: LootPool = {
        ...createTestPool('pool-1', [createTestEntry('rare-item', 'RARE', 100)]),
        dropChance: 0.0,
      };

      module.addPool(tableId, pool);

      const result = module.rollLoot(tableId);

      if ('error' in result) {
        throw new Error('Unexpected error');
      }

      expect(result.items).toHaveLength(0);
    });

    it('should drop multiple items when maxDrops > 1', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool: LootPool = {
        ...createTestPool('pool-1', [createTestEntry('coin', 'COMMON', 100)]),
        minDrops: 3,
        maxDrops: 3,
      };

      module.addPool(tableId, pool);

      const result = module.rollLoot(tableId);

      if ('error' in result) {
        throw new Error('Unexpected error');
      }

      expect(result.items.length).toBe(3);
    });

    it('should handle item quantity ranges', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const entry: LootEntry = {
        itemId: 'gold',
        itemName: 'Gold Coins',
        rarity: 'COMMON',
        weight: 100,
        minQuantity: 10,
        maxQuantity: 20,
      };

      const pool = createTestPool('pool-1', [entry]);

      module.addPool(tableId, pool);

      const result = module.rollLoot(tableId);

      if ('error' in result) {
        throw new Error('Unexpected error');
      }

      const goldDrop = result.items.find((i) => i.itemId === 'gold');
      expect(goldDrop).toBeDefined();
      if (goldDrop === undefined) {
        return;
      }

      expect(goldDrop.quantity).toBeGreaterThanOrEqual(10);
      expect(goldDrop.quantity).toBeLessThanOrEqual(20);
    });
  });

  describe('setDropRate', () => {
    it('should update pool drop rate', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool = createTestPool('pool-1', [createTestEntry('item-1', 'COMMON', 100)]);

      module.addPool(tableId, pool);

      const result = module.setDropRate(tableId, 'pool-1', 0.5);

      expect(result).toBe('pool-1');
    });

    it('should return error for non-existent table', () => {
      const module = createLootTableModule(deps);

      const result = module.setDropRate('invalid-id', 'pool-1', 0.5);

      expect(result).toEqual({ error: 'TABLE_NOT_FOUND' });
    });

    it('should return error for non-existent pool', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const result = module.setDropRate(tableId, 'invalid-pool', 0.5);

      expect(result).toEqual({ error: 'POOL_NOT_FOUND' });
    });

    it('should reject invalid drop rate', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool = createTestPool('pool-1', [createTestEntry('item-1', 'COMMON', 100)]);

      module.addPool(tableId, pool);

      const result = module.setDropRate(tableId, 'pool-1', 1.5);

      expect(result).toEqual({ error: 'INVALID_DROP_RATE' });
    });

    it('should affect subsequent rolls', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool = createTestPool('pool-1', [createTestEntry('item-1', 'COMMON', 100)]);

      module.addPool(tableId, pool);
      module.setDropRate(tableId, 'pool-1', 0.0);

      const result = module.rollLoot(tableId);

      if ('error' in result) {
        throw new Error('Unexpected error');
      }

      expect(result.items).toHaveLength(0);
    });
  });

  describe('getTableStats', () => {
    it('should return stats for table', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool = createTestPool('pool-1', [
        createTestEntry('item-1', 'COMMON', 100),
        createTestEntry('item-2', 'RARE', 50),
      ]);

      module.addPool(tableId, pool);

      const result = module.getTableStats(tableId);

      expect(result).not.toHaveProperty('error');
      if ('error' in result) {
        return;
      }

      expect(result.totalPools).toBe(1);
      expect(result.totalEntries).toBe(2);
    });

    it('should return error for non-existent table', () => {
      const module = createLootTableModule(deps);

      const result = module.getTableStats('invalid-id');

      expect(result).toEqual({ error: 'TABLE_NOT_FOUND' });
    });

    it('should count rarity distribution', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool = createTestPool('pool-1', [
        createTestEntry('item-1', 'COMMON', 100),
        createTestEntry('item-2', 'COMMON', 50),
        createTestEntry('item-3', 'RARE', 25),
        createTestEntry('item-4', 'LEGENDARY', 10),
      ]);

      module.addPool(tableId, pool);

      const result = module.getTableStats(tableId);

      if ('error' in result) {
        throw new Error('Unexpected error');
      }

      expect(result.rarityDistribution.COMMON).toBe(2);
      expect(result.rarityDistribution.RARE).toBe(1);
      expect(result.rarityDistribution.LEGENDARY).toBe(1);
    });

    it('should calculate average drops per roll', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', ['guaranteed-item']);

      const pool: LootPool = {
        ...createTestPool('pool-1', [createTestEntry('item-1', 'COMMON', 100)]),
        dropChance: 1.0,
        minDrops: 2,
        maxDrops: 4,
      };

      module.addPool(tableId, pool);

      const result = module.getTableStats(tableId);

      if ('error' in result) {
        throw new Error('Unexpected error');
      }

      expect(result.averageDropsPerRoll).toBe(4);
    });
  });

  describe('previewDrops', () => {
    it('should preview drop frequencies', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool = createTestPool('pool-1', [createTestEntry('common-item', 'COMMON', 100)]);

      module.addPool(tableId, pool);

      const preview = module.previewDrops(tableId, 100);

      expect(preview.iterations).toBe(100);
      expect(preview.itemFrequency['common-item']).toBeGreaterThan(0);
    });

    it('should track rarity frequency', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool = createTestPool('pool-1', [
        createTestEntry('common-item', 'COMMON', 100),
        createTestEntry('rare-item', 'RARE', 10),
      ]);

      module.addPool(tableId, pool);

      const preview = module.previewDrops(tableId, 100);

      expect(preview.rarityFrequency.COMMON).toBeGreaterThan(0);
    });

    it('should calculate average drop count', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', ['guaranteed']);

      const pool = createTestPool('pool-1', [createTestEntry('item-1', 'COMMON', 100)]);

      module.addPool(tableId, pool);

      const preview = module.previewDrops(tableId, 50);

      expect(preview.averageDropCount).toBeGreaterThan(0);
    });
  });

  describe('removePool', () => {
    it('should remove pool from table', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool = createTestPool('pool-1', [createTestEntry('item-1', 'COMMON', 100)]);

      module.addPool(tableId, pool);

      const result = module.removePool(tableId, 'pool-1');

      expect(result).toBe('pool-1');
    });

    it('should return error for non-existent table', () => {
      const module = createLootTableModule(deps);

      const result = module.removePool('invalid-id', 'pool-1');

      expect(result).toEqual({ error: 'TABLE_NOT_FOUND' });
    });

    it('should return error for non-existent pool', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const result = module.removePool(tableId, 'invalid-pool');

      expect(result).toEqual({ error: 'POOL_NOT_FOUND' });
    });

    it('should affect table stats after removal', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool = createTestPool('pool-1', [createTestEntry('item-1', 'COMMON', 100)]);

      module.addPool(tableId, pool);
      module.removePool(tableId, 'pool-1');

      const stats = module.getTableStats(tableId);

      if ('error' in stats) {
        throw new Error('Unexpected error');
      }

      expect(stats.totalPools).toBe(0);
    });
  });

  describe('getTable', () => {
    it('should return table details', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Boss Chest', 'boss', ['key']);

      const result = module.getTable(tableId);

      expect(result).not.toHaveProperty('error');
      if ('error' in result) {
        return;
      }

      expect(result.name).toBe('Boss Chest');
      expect(result.context).toBe('boss');
    });

    it('should return error for non-existent table', () => {
      const module = createLootTableModule(deps);

      const result = module.getTable('invalid-id');

      expect(result).toEqual({ error: 'TABLE_NOT_FOUND' });
    });
  });

  describe('listTables', () => {
    it('should return empty array when no tables', () => {
      const module = createLootTableModule(deps);

      const tables = module.listTables();

      expect(tables).toHaveLength(0);
    });

    it('should return all tables', () => {
      const module = createLootTableModule(deps);

      module.createTable('Table 1', 'ctx1', []);
      module.createTable('Table 2', 'ctx2', []);
      module.createTable('Table 3', 'ctx3', []);

      const tables = module.listTables();

      expect(tables).toHaveLength(3);
    });
  });

  describe('deleteTable', () => {
    it('should delete table', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const result = module.deleteTable(tableId);

      expect(result).toBe(tableId);
    });

    it('should return error for non-existent table', () => {
      const module = createLootTableModule(deps);

      const result = module.deleteTable('invalid-id');

      expect(result).toEqual({ error: 'TABLE_NOT_FOUND' });
    });

    it('should remove table from list', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      module.deleteTable(tableId);

      const tables = module.listTables();

      expect(tables).toHaveLength(0);
    });
  });

  describe('weighted selection', () => {
    it('should select items based on weight', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool = createTestPool('pool-1', [
        createTestEntry('common', 'COMMON', 900),
        createTestEntry('rare', 'RARE', 100),
      ]);

      module.addPool(tableId, pool);

      const preview = module.previewDrops(tableId, 1000);

      expect(preview.itemFrequency['common']).toBeGreaterThan(preview.itemFrequency['rare'] ?? 0);
    });

    it('should handle zero weights uniformly', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool = createTestPool('pool-1', [
        createTestEntry('item-1', 'COMMON', 0),
        createTestEntry('item-2', 'COMMON', 0),
        createTestEntry('item-3', 'COMMON', 0),
      ]);

      module.addPool(tableId, pool);

      const result = module.rollLoot(tableId);

      if ('error' in result) {
        throw new Error('Unexpected error');
      }

      expect(result.items.length).toBe(1);
    });
  });

  describe('rarity tiers', () => {
    it('should support COMMON rarity', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool = createTestPool('pool-1', [createTestEntry('common-item', 'COMMON', 100)]);

      module.addPool(tableId, pool);

      const roll = module.rollLoot(tableId);

      if ('error' in roll) {
        throw new Error('Unexpected error');
      }

      expect(roll.items[0]?.rarity).toBe('COMMON');
    });

    it('should support UNCOMMON rarity', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool = createTestPool('pool-1', [createTestEntry('uncommon-item', 'UNCOMMON', 100)]);

      module.addPool(tableId, pool);

      const roll = module.rollLoot(tableId);

      if ('error' in roll) {
        throw new Error('Unexpected error');
      }

      expect(roll.items[0]?.rarity).toBe('UNCOMMON');
    });

    it('should support RARE rarity', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool = createTestPool('pool-1', [createTestEntry('rare-item', 'RARE', 100)]);

      module.addPool(tableId, pool);

      const roll = module.rollLoot(tableId);

      if ('error' in roll) {
        throw new Error('Unexpected error');
      }

      expect(roll.items[0]?.rarity).toBe('RARE');
    });

    it('should support EPIC rarity', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool = createTestPool('pool-1', [createTestEntry('epic-item', 'EPIC', 100)]);

      module.addPool(tableId, pool);

      const roll = module.rollLoot(tableId);

      if ('error' in roll) {
        throw new Error('Unexpected error');
      }

      expect(roll.items[0]?.rarity).toBe('EPIC');
    });

    it('should support LEGENDARY rarity', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool = createTestPool('pool-1', [createTestEntry('legendary-item', 'LEGENDARY', 100)]);

      module.addPool(tableId, pool);

      const roll = module.rollLoot(tableId);

      if ('error' in roll) {
        throw new Error('Unexpected error');
      }

      expect(roll.items[0]?.rarity).toBe('LEGENDARY');
    });

    it('should support ARTIFACT rarity', () => {
      const module = createLootTableModule(deps);
      const tableId = module.createTable('Test', 'test', []);

      const pool = createTestPool('pool-1', [createTestEntry('artifact-item', 'ARTIFACT', 100)]);

      module.addPool(tableId, pool);

      const roll = module.rollLoot(tableId);

      if ('error' in roll) {
        throw new Error('Unexpected error');
      }

      expect(roll.items[0]?.rarity).toBe('ARTIFACT');
    });
  });
});
