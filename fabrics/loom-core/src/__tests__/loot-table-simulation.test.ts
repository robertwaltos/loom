import { describe, expect, it } from 'vitest';
import { createLootTableModule } from '../loot-table.js';

describe('loot-table simulation', () => {
  it('simulates table authoring and deterministic loot rolling', () => {
    let id = 0;
    const module = createLootTableModule({
      clock: { nowMicroseconds: () => 1_000_000n },
      idGen: { generate: () => `table-${++id}` },
      logger: {
        info: () => undefined,
        warn: () => undefined,
      },
    });

    const tableId = module.createTable('Dungeon Chest', 'dungeon', ['gold']);
    module.addPool(tableId, {
      poolId: 'pool-main',
      name: 'Main Pool',
      dropChance: 1,
      minDrops: 1,
      maxDrops: 1,
      entries: [
        {
          itemId: 'sword',
          itemName: 'Bronze Sword',
          rarity: 'COMMON',
          weight: 100,
          minQuantity: 1,
          maxQuantity: 1,
        },
      ],
    });

    const rollA = module.rollLoot(tableId, 12345n);
    const rollB = module.rollLoot(tableId, 12345n);
    if ('error' in rollA || 'error' in rollB) throw new Error('expected loot result');

    expect(rollA.items.length).toBeGreaterThan(0);
    expect(rollA.items[0]?.itemId).toBe(rollB.items[0]?.itemId);
  });
});
